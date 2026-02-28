# WebSocket handlers for Socket.IO
import asyncio
from model_service import classifier, preprocess_image


async def setup_websocket_handlers(sio):
    @sio.on('enter_queue')
    async def enter_queue(sid, data):
        # TODO: Implement matchmaking queue logic
        raise NotImplementedError("Player queue entry is not yet implemented.")

    @sio.on('draw_made')
    async def draw_made(sid, data):
        """Classify a player's submitted hand-sign snapshot.

        Expected payload:
            {
                "image":       "<base64-encoded frame>",
                "target_sign": "A",          # the letter to match
                "room_id":     "<match room id>"
            }

        Emits 'classification_result' back to the sender:
            {
                "matches":        bool,
                "detected_sign":  str,
                "confidence":     float,
                "player_id":      str   (the socket id)
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

        # Run blocking Gemini call off the event loop
        loop = asyncio.get_event_loop()
        try:
            image_bytes = preprocess_image(image_b64)
            result = await loop.run_in_executor(
                None, classifier.classify, image_bytes, target_sign
            )
        except Exception as exc:
            await sio.emit(
                "classification_error",
                {"error": str(exc)},
                to=sid,
            )
            return

        result["player_id"] = sid
        result["room_id"] = room_id

        # Send result back to the player; teammate 3's game logic can then
        # broadcast ROUND_RESULT to the whole room after deciding the winner.
        await sio.emit("classification_result", result, to=sid)

    @sio.on('leave_queue')
    async def leave_queue(sid, data):
        # TODO: Implement leave queue logic
        pass
