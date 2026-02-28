import asyncio
import logging

from app.core.duel_engine import DuelEngine
from app.core.elo_matchmaker import EloMatchmaker
from app.models.showdown_state import QueueTicket
from model_service import classifier, preprocess_image

logger = logging.getLogger(__name__)


def setup_websocket_handlers(
    sio, matchmaker: EloMatchmaker, duel_engine: DuelEngine, sid_to_player: dict
):
    @sio.on("enter_queue")
    async def enter_queue(sid, data):
        player_id = data.get("player_id")
        elo = data.get("elo", 1000)

        if not player_id:
            await sio.emit("queue_error", {"message": "player_id is required"}, to=sid)
            return

        if matchmaker.is_in_queue(player_id):
            await sio.emit("queue_error", {"message": "Already in queue"}, to=sid)
            return

        ticket = QueueTicket(player_id=player_id, sid=sid, elo=elo)
        matchmaker.add_to_queue(ticket)
        sid_to_player[sid] = player_id
        logger.info(f"Player {player_id} (elo={elo}) entered queue")

        match = matchmaker.find_match(player_id)
        if match:
            t1, t2 = match
            room = duel_engine.start_duel(t1, t2)
            logger.info(
                f"Match found: {t1.player_id} vs {t2.player_id} in room {room.room_id}"
            )

            await sio.emit(
                "match_found",
                {
                    "room_id": room.room_id,
                    "opponent_id": t2.player_id,
                    "opponent_elo": t2.elo,
                    "is_initiator": True,
                },
                to=t1.sid,
            )
            await sio.emit(
                "match_found",
                {
                    "room_id": room.room_id,
                    "opponent_id": t1.player_id,
                    "opponent_elo": t1.elo,
                    "is_initiator": False,
                },
                to=t2.sid,
            )
        else:
            await sio.emit(
                "queue_joined", {"position": matchmaker.queue_size()}, to=sid
            )

    @sio.on("leave_queue")
    async def leave_queue(sid, data):
        player_id = data.get("player_id") or sid_to_player.get(sid)
        if player_id:
            matchmaker.remove_from_queue(player_id)
            sid_to_player.pop(sid, None)
            logger.info(f"Player {player_id} left queue")

    @sio.on("draw_made")
    async def draw_made(sid, data):
        """Classify a player's submitted hand-sign snapshot via Gemini.

        Expected payload:
            {
                "image":       "<base64-encoded frame>",
                "target_sign": "A",
                "room_id":     "<match room id>"
            }

        Emits 'classification_result' back to the sender:
            {
                "matches":        bool,
                "detected_sign":  str,
                "confidence":     float,
                "player_id":      str,
                "room_id":        str
            }
        """
        image_b64: str = data.get("image", "")
        target_sign: str = data.get("target_sign", "")
        room_id: str = data.get("room_id", "")

        if not image_b64 or not target_sign:
            await sio.emit(
                "classification_error",
                {"error": "Missing 'image' or 'target_sign' in payload"},
                to=sid,
            )
            return

        loop = asyncio.get_event_loop()
        player_id = sid_to_player.get(sid)
        room = duel_engine.get_room(room_id)

        if not player_id:
            await sio.emit(
                "classification_error",
                {"error": "Unknown player session"},
                to=sid,
            )
            return

        if not room:
            await sio.emit(
                "classification_error",
                {"error": f"Room {room_id} not found"},
                to=sid,
            )
            return

        try:
            image_bytes = preprocess_image(image_b64)
            result = await loop.run_in_executor(
                None, classifier.classify, image_bytes, target_sign
            )
        except Exception as exc:
            logger.error(f"Classification error for {sid}: {exc}")
            await sio.emit("classification_error", {"error": str(exc)}, to=sid)
            return

        result["player_id"] = player_id
        result["room_id"] = room_id
        await sio.emit("classification_result", result, to=sid)

        draw_state = await asyncio.to_thread(
            duel_engine.handle_draw,
            room_id,
            player_id,
            bool(result["matches"]),
        )

        if draw_state["status"] == "round_won":
            await sio.emit("round_result", draw_state, to=room.player1_sid)
            await sio.emit("round_result", draw_state, to=room.player2_sid)

        if draw_state["status"] == "match_finished":
            await sio.emit("match_result", draw_state, to=room.player1_sid)
            await sio.emit("match_result", draw_state, to=room.player2_sid)
