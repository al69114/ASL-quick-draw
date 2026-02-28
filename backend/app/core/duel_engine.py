import logging
import random
from typing import Dict, Optional

logger = logging.getLogger(__name__)

from app.models.showdown_state import DuelRoom, QueueTicket, PlayerElo as PlayerStats
from app.services.auth0_service import Auth0Service

SIGNS = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")


class DuelEngine:
    def __init__(
        self,
        auth0_service: Auth0Service,
        wins_to_finish: int = 3,
        elo_delta: int = 25,
    ):
        self._rooms: Dict[str, DuelRoom] = {}  # room_id -> DuelRoom
        self._auth0_service = auth0_service
        self._wins_to_finish = wins_to_finish
        self._elo_delta = elo_delta

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

    def start_round(self, room_id: str) -> DuelRoom:
        room = self.get_room(room_id)
        if room is None:
            raise ValueError(f"Room {room_id} not found")
        if room.target_sign:  # already had at least one round
            room.round_number += 1
        room.target_sign = random.choice(SIGNS)
        return room

    def get_room(self, room_id: str) -> Optional[DuelRoom]:
        return self._rooms.get(room_id)

    def close_room(self, room_id: str) -> None:
        self._rooms.pop(room_id, None)

    def _get_opponent_id(self, room: DuelRoom, player_id: str) -> str:
        if player_id == room.player1_id:
            return room.player2_id
        if player_id == room.player2_id:
            return room.player1_id
        raise ValueError(f"Player {player_id} is not part of room {room.room_id}")

    def _calculate_elo_delta(self, winner_elo: int, loser_elo: int) -> int:
        """Standard Elo formula: expected = 1 / (1 + 10^((Rb - Ra) / 400)).
        Returns the amount to add to winner (and subtract from loser).
        """
        k_factor = 32
        expected_winner = 1 / (1 + 10 ** ((loser_elo - winner_elo) / 400))
        delta = round(k_factor * (1 - expected_winner))
        return max(5, delta)  # minimum gain of 5 points

    def _apply_match_result(
        self,
        winner_id: str,
        loser_id: str,
    ) -> tuple[PlayerStats, PlayerStats]:
        try:
            winner_stats = self._auth0_service.get_user_stats(winner_id)
            loser_stats = self._auth0_service.get_user_stats(loser_id)

            delta = self._calculate_elo_delta(winner_stats.elo, loser_stats.elo)

            winner_stats.wins += 1
            winner_stats.elo += delta

            loser_stats.losses += 1
            loser_stats.elo = max(100, loser_stats.elo - delta)

            self._auth0_service.update_user_stats(winner_id, winner_stats)
            self._auth0_service.update_user_stats(loser_id, loser_stats)

            return winner_stats, loser_stats
        except Exception as exc:
            logger.warning(f"Elo update skipped (Auth0 unavailable): {exc}")
            return (
                PlayerStats(player_id=winner_id, elo=1000, wins=0, losses=0),
                PlayerStats(player_id=loser_id, elo=1000, wins=0, losses=0),
            )

    def handle_draw(self, room_id: str, player_id: str, is_correct: bool) -> dict:
        room = self.get_room(room_id)
        if room is None:
            raise ValueError(f"Room {room_id} not found")

        if player_id not in room.scores:
            raise ValueError(f"Player {player_id} is not part of room {room_id}")

        if not is_correct:
            return {
                "status": "miss",
                "room_id": room_id,
                "scores": room.scores.copy(),
            }

        room.scores[player_id] += 1

        if room.scores[player_id] < self._wins_to_finish:
            return {
                "status": "round_won",
                "room_id": room_id,
                "round_winner_id": player_id,
                "scores": room.scores.copy(),
            }

        loser_id = self._get_opponent_id(room, player_id)
        winner_stats, loser_stats = self._apply_match_result(player_id, loser_id)

        room.status = "finished"

        result = {
            "status": "match_finished",
            "room_id": room_id,
            "winner_id": player_id,
            "loser_id": loser_id,
            "scores": room.scores.copy(),
            "winner_stats": winner_stats.model_dump(),
            "loser_stats": loser_stats.model_dump(),
        }

        self.close_room(room_id)
        return result
