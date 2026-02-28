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


async def notify_match_found(sio, duel_engine, t1: QueueTicket, t2: QueueTicket):
    room = duel_engine.start_duel(t1, t2)
    logger.info(f"Match found: {t1.player_id} vs {t2.player_id} in room {room.room_id}")

    await sio.emit(
        "match_found",
        {
            "room_id": room.room_id,
            "opponent_id": t2.player_id,
            "opponent_elo": t2.elo,
            "is_initiator": true,
        },
        to=t1.sid,
    )
    await sio.emit(
        "match_found",
        {
            "room_id": room.room_id,
            "opponent_id": t1.player_id,
            "opponent_elo": t1.elo,
            "is_initiator": false,
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


async def start_background_matchmaker(sio, matchmaker: EloMatchmaker, duel_engine: DuelEngine):
    """Periodically check the queue for matches, enabling wait-time expansion to work."""
    while True:
        try:
            matches = matchmaker.find_all_matches()
            for t1, t2 in matches:
                asyncio.create_task(notify_match_found(sio, duel_engine, t1, t2))
        except Exception as e:
            logger.error(f"Background matchmaker error: {e}")
        await asyncio.sleep(5)  # check every 5 seconds


def setup_websocket_handlers(
    sio, matchmaker: EloMatchmaker, duel_engine: DuelEngine, sid_to_player: dict
):
    # Start the background task
    asyncio.create_task(start_background_matchmaker(sio, matchmaker, duel_engine))

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

        # Try to match immediately
        match = matchmaker.find_match(player_id)
        if match:
            t1, t2 = match
            await notify_match_found(sio, duel_engine, t1, t2)
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

        Waits for both players to submit before resolving the round:
          - Both miss      → replay (new round_start with fresh sign)
          - One correct    → that player wins the round (round_result)
          - Both correct   → draw, both get a point (round_result, winner_id=null)
          - Match over     → match_complete
        """
        image_b64: str = data.get("image", "")
        target_sign: str = data.get("target_sign", "")
        room_id: str = data.get("room_id", "")
        player_id: str = sid_to_player.get(sid)

        if not image_b64 or not target_sign:
            await sio.emit(
                "classification_error",
                {"error": "Missing 'image' or 'target_sign' in payload"},
                to=sid,
            )
            return

        if not player_id:
            await sio.emit("classification_error", {"error": "Unknown player session"}, to=sid)
            return

        room = duel_engine.get_room(room_id)
        if not room:
            await sio.emit("classification_error", {"error": f"Room {room_id} not found"}, to=sid)
            return

        # Ignore duplicate submissions for this round
        if player_id in _pending_results.get(room_id, {}):
            return

        try:
            image_bytes = await asyncio.to_thread(preprocess_image, image_b64)
            result = await classifier.classify(image_bytes, target_sign)
            logger.info(f"Classification for {player_id}: {result}")
        except Exception as exc:
            logger.error(f"Classification error for {sid}: {exc}")
            await sio.emit("classification_error", {"error": str(exc)}, to=sid)
            return

        await sio.emit(
            "classification_result",
            {**result, "player_id": player_id, "room_id": room_id},
            to=sid,
        )

        # Accumulate result and wait for both players
        if room_id not in _pending_results:
            _pending_results[room_id] = {}
        _pending_results[room_id][player_id] = {
            "matches": result["matches"],
            "detected_sign": result["detected_sign"],
        }

        if len(_pending_results[room_id]) < 2:
            return  # still waiting for the other player

        # Both submitted — resolve the round
        round_results = _pending_results.pop(room_id)
        p1_correct = round_results.get(room.player1_id, {}).get("matches", False)
        p2_correct = round_results.get(room.player2_id, {}).get("matches", False)

        if not p1_correct and not p2_correct:
            # Both missed — show replay result; player_ready will start the next round
            round_result_payload = {
                "room_id": room_id,
                "winner_id": None,
                "player_results": round_results,
                "scores": room.scores.copy(),
                "is_replay": True,
            }
            await sio.emit("round_result", round_result_payload, to=room.player1_sid)
            await sio.emit("round_result", round_result_payload, to=room.player2_sid)
            logger.info(f"Both missed in room {room_id} — showing replay result")
            return

        # At least one player correct — update scores via DuelEngine
        winner_id = None
        scores = room.scores.copy()

        for pid, correct in [(room.player1_id, p1_correct), (room.player2_id, p2_correct)]:
            if not correct:
                continue
            draw_state = duel_engine.handle_draw(room_id, pid, True)
            scores = draw_state["scores"]
            if draw_state["status"] == "match_finished":
                await sio.emit(
                    "match_complete",
                    {
                        "room_id": room_id,
                        "winner_id": draw_state["winner_id"],
                        "final_scores": draw_state["scores"],
                    },
                    to=room.player1_sid,
                )
                await sio.emit(
                    "match_complete",
                    {
                        "room_id": room_id,
                        "winner_id": draw_state["winner_id"],
                        "final_scores": draw_state["scores"],
                    },
                    to=room.player2_sid,
                )
                logger.info(f"Match finished in room {room_id}: winner={draw_state['winner_id']}")
                return
            winner_id = pid

        if p1_correct and p2_correct:
            winner_id = None  # draw — both got a point

        round_result_payload = {
            "room_id": room_id,
            "winner_id": winner_id,
            "player_results": round_results,
            "scores": scores,
            "is_replay": False,
        }
        await sio.emit("round_result", round_result_payload, to=room.player1_sid)
        await sio.emit("round_result", round_result_payload, to=room.player2_sid)
        logger.info(f"Round result in room {room_id}: winner={winner_id}, scores={scores}")

    @sio.on("player_ready")
    async def player_ready(sid, data):
        """Called when a player clicks Continue after seeing a round result.
        Fires round_start once both players are ready.
        """
        room_id: str = data.get("room_id", "")
        player_id: str = data.get("player_id") or sid_to_player.get(sid)

        room = duel_engine.get_room(room_id)
        if not room or not player_id:
            return

        if player_id not in room.ready_players:
            room.ready_players.append(player_id)

        if len(room.ready_players) < 2:
            return  # waiting for other player

        room.ready_players.clear()
        new_room = duel_engine.start_round(room_id)
        round_payload = {
            "room_id": room_id,
            "round_number": new_room.round_number,
            "target_sign": new_room.target_sign,
        }
        await sio.emit("round_start", round_payload, to=room.player1_sid)
        await sio.emit("round_start", round_payload, to=room.player2_sid)
        logger.info(f"Round {new_room.round_number} started in room {room_id}: sign={new_room.target_sign}")
