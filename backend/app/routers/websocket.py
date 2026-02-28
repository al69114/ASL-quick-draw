import asyncio
import logging

from app.core.duel_engine import DuelEngine
from app.core.elo_matchmaker import EloMatchmaker
from app.models.showdown_state import QueueTicket
from model_service import classifier, preprocess_image

logger = logging.getLogger(__name__)

# Accumulate per-round classification results here so handle_draw can be called
# once we have the detected_sign from the classifier.
# Structure: room_id → {player_id: {"matches": bool, "detected_sign": str}}
_pending_results: dict = {}


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

            # Wait for both clients to mount their MatchPage and register
            # socket listeners before firing the first round_start.
            await asyncio.sleep(1.0)

            room = duel_engine.start_round(room.room_id)
            round_payload = {
                "room_id": room.room_id,
                "round_number": room.round_number,
                "target_sign": room.target_sign,
            }
            await sio.emit("round_start", round_payload, to=t1.sid)
            await sio.emit("round_start", round_payload, to=t2.sid)
            logger.info(
                f"Round {room.round_number} started in room {room.room_id}: sign={room.target_sign}"
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

        After both players in the room have submitted, emits 'round_result'
        to both players:
            {
                "room_id":        str,
                "winner_id":      str | null,
                "player_results": {player_id: {"matches": bool, "detected_sign": str}},
                "scores":         {player_id: int},
                "is_replay":      bool
            }
        If the match is over, additionally emits 'match_complete':
            {
                "room_id":       str,
                "winner_id":     str,
                "final_scores":  {player_id: int}
            }
        """
        image_b64: str = data.get("image", "")
        target_sign: str = data.get("target_sign", "")
        room_id: str = data.get("room_id", "")
        # Prefer the player_id sent in the payload; fall back to the SID lookup.
        player_id: str = data.get("player_id") or sid_to_player.get(sid, sid)

        if not image_b64 or not target_sign:
            await sio.emit(
                "classification_error",
                {"error": "Missing 'image' or 'target_sign' in payload"},
                to=sid,
            )
            return

        loop = asyncio.get_event_loop()
        try:
            image_bytes = preprocess_image(image_b64)
            result = await loop.run_in_executor(
                None, classifier.classify, image_bytes, target_sign
            )
            print(result)
        except Exception as exc:
            logger.error(f"Classification error for {sid}: {exc}")
            await sio.emit("classification_error", {"error": str(exc)}, to=sid)
            return

        logger.info(
            f"Player {player_id} in room {room_id}: "
            f"detected={result['detected_sign']} matches={result['matches']}"
        )

        # Accumulate results for this round.
        if room_id not in _pending_results:
            _pending_results[room_id] = {}
        _pending_results[room_id][player_id] = {
            "matches": result["matches"],
            "detected_sign": result["detected_sign"],
        }

        # Delegate scoring once we have both players' results.
        outcome = duel_engine.handle_draw(
            room_id, player_id, result["matches"], result["detected_sign"]
        )
        if outcome is None:
            # Still waiting for the other player — nothing more to do.
            return

        # Clear pending accumulator for this room.
        _pending_results.pop(room_id, None)

        room = duel_engine.get_room(room_id)
        if room is None:
            return

        round_result_payload = {
            "room_id": room_id,
            "winner_id": outcome["winner_id"],
            "player_results": outcome["player_results"],
            "scores": outcome["scores"],
            "is_replay": outcome["is_replay"],
        }
        await sio.emit("round_result", round_result_payload, to=room.player1_sid)
        await sio.emit("round_result", round_result_payload, to=room.player2_sid)
        logger.info(
            f"Round result in room {room_id}: winner={outcome['winner_id']} "
            f"scores={outcome['scores']} replay={outcome['is_replay']}"
        )

        if outcome["match_over"]:
            match_complete_payload = {
                "room_id": room_id,
                "winner_id": outcome["match_winner_id"],
                "final_scores": outcome["scores"],
            }
            await sio.emit("match_complete", match_complete_payload, to=room.player1_sid)
            await sio.emit("match_complete", match_complete_payload, to=room.player2_sid)
            logger.info(
                f"Match complete in room {room_id}: winner={outcome['match_winner_id']}"
            )
            duel_engine.close_room(room_id)

    @sio.on("player_ready")
    async def player_ready(sid, data):
        """Signal that a player has clicked 'Continue' after a round result.

        Expected payload: { "room_id": str, "player_id": str }

        When both players in the room are ready, emits 'round_start' to both.
        """
        room_id: str = data.get("room_id", "")
        player_id: str = data.get("player_id") or sid_to_player.get(sid, sid)

        both_ready = duel_engine.handle_player_ready(room_id, player_id)
        logger.info(f"Player {player_id} ready in room {room_id} (both={both_ready})")

        if both_ready:
            room = duel_engine.start_round(room_id)
            if room is None:
                return
            round_payload = {
                "room_id": room.room_id,
                "round_number": room.round_number,
                "target_sign": room.target_sign,
            }
            await sio.emit("round_start", round_payload, to=room.player1_sid)
            await sio.emit("round_start", round_payload, to=room.player2_sid)
            logger.info(
                f"Round {room.round_number} started in room {room_id}: sign={room.target_sign}"
            )
