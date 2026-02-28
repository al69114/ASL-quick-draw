from typing import Dict, Optional

from app.models.showdown_state import DuelRoom, QueueTicket


class DuelEngine:
    def __init__(self):
        self._rooms: Dict[str, DuelRoom] = {}  # room_id -> DuelRoom

    def start_duel(self, t1: QueueTicket, t2: QueueTicket) -> DuelRoom:
        room = DuelRoom(
            player1_id=t1.player_id,
            player2_id=t2.player_id,
            player1_sid=t1.sid,
            player2_sid=t2.sid,
            scores={t1.player_id: 0, t2.player_id: 0},
        )
        self._rooms[room.room_id] = room
        return room

    def get_room(self, room_id: str) -> Optional[DuelRoom]:
        return self._rooms.get(room_id)

    def close_room(self, room_id: str) -> None:
        self._rooms.pop(room_id, None)

    def handle_draw(self, room_id: str, player_id: str, is_correct: bool) -> str:
        # TODO: Implement scoring logic once ASL classifier is ready
        raise NotImplementedError("Draw result processing is not yet implemented.")