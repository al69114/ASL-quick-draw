import random
from typing import Dict, Optional

from app.models.showdown_state import DuelRoom, QueueTicket

SIGNS = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")


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

    def start_round(self, room_id: str) -> DuelRoom:
        """Pick a new target sign and reset per-round tracking."""
        room = self._rooms[room_id]
        room.target_sign = random.choice(SIGNS)
        room.round_results = {}
        room.detected_signs = {}
        room.ready_players = []
        return room

    def handle_draw(
        self, room_id: str, player_id: str, is_correct: bool, detected_sign: str
    ) -> Optional[dict]:
        """Record a player's classification result.

        Returns a round outcome dict once both players have submitted, else None.
        Outcome keys: winner_id, player_results, scores, is_replay, match_over,
                      match_winner_id, round_number.
        """
        room = self._rooms.get(room_id)
        if room is None:
            return None

        room.round_results[player_id] = is_correct
        room.detected_signs[player_id] = detected_sign

        if len(room.round_results) < 2:
            return None  # waiting for the second player

        p1, p2 = room.player1_id, room.player2_id
        p1_correct = room.round_results.get(p1, False)
        p2_correct = room.round_results.get(p2, False)
        s1, s2 = room.scores[p1], room.scores[p2]

        is_replay = False
        winner_id = None

        if not p1_correct and not p2_correct:
            is_replay = True
        elif p1_correct and p2_correct:
            if s1 == 2 and s2 == 2:
                is_replay = True  # 2-2 tie — replay rather than 3-3 draw
            else:
                room.scores[p1] += 1
                room.scores[p2] += 1
        elif p1_correct:
            room.scores[p1] += 1
            winner_id = p1
        else:
            room.scores[p2] += 1
            winner_id = p2

        if not is_replay:
            room.round_number += 1

        match_over = room.scores[p1] >= 3 or room.scores[p2] >= 3
        match_winner_id = (
            p1 if room.scores[p1] >= 3 else (p2 if room.scores[p2] >= 3 else None)
        )
        if match_over:
            room.status = "finished"

        return {
            "winner_id": winner_id,
            "player_results": {
                p1: {"matches": p1_correct, "detected_sign": room.detected_signs.get(p1, "UNKNOWN")},
                p2: {"matches": p2_correct, "detected_sign": room.detected_signs.get(p2, "UNKNOWN")},
            },
            "scores": dict(room.scores),
            "is_replay": is_replay,
            "match_over": match_over,
            "match_winner_id": match_winner_id,
            "round_number": room.round_number,
        }

    def handle_player_ready(self, room_id: str, player_id: str) -> bool:
        """Mark a player as ready for the next round.

        Returns True when both players in the room are ready.
        """
        room = self._rooms.get(room_id)
        if room is None:
            return False
        if player_id not in room.ready_players:
            room.ready_players.append(player_id)
        return len(room.ready_players) >= 2
