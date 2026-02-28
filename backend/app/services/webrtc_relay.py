import logging

from app.core.duel_engine import DuelEngine

logger = logging.getLogger(__name__)


def setup_video_relay(sio, duel_engine: DuelEngine):
    """Relay video frames between the two players in a room.

    Each player captures JPEG frames from their local camera and emits
    'video_frame'. This handler looks up their opponent in the room and
    forwards the frame to them. No WebRTC negotiation needed.
    """

    def _peer_sid(room, sender_sid: str) -> str | None:
        """Return the other player's sid given one player's sid in a room."""
        if room.player1_sid == sender_sid:
            return room.player2_sid
        if room.player2_sid == sender_sid:
            return room.player1_sid
        return None

    @sio.on("video_frame")
    async def relay_video_frame(sid, data):
        room_id = data.get("room_id")
        frame = data.get("frame")
        room = duel_engine.get_room(room_id)
        if not room:
            return
        peer_sid = _peer_sid(room, sid)
        if peer_sid:
            await sio.emit("video_frame", {"frame": frame}, to=peer_sid)