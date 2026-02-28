from datetime import datetime, timezone
from typing import Dict, Optional, Tuple

from app.models.showdown_state import QueueTicket


class EloMatchmaker:
    def __init__(self, base_range: int = 150, expansion_rate: int = 50, expansion_interval: int = 10):
        self._queue: Dict[str, QueueTicket] = {}  # player_id -> QueueTicket
        self._base_range = base_range
        self._expansion_rate = expansion_rate        # elo points added per interval
        self._expansion_interval = expansion_interval  # seconds between expansions

    def add_to_queue(self, ticket: QueueTicket) -> None:
        self._queue[ticket.player_id] = ticket

    def remove_from_queue(self, player_id: str) -> None:
        self._queue.pop(player_id, None)

    def remove_by_sid(self, sid: str) -> None:
        player_id = next((pid for pid, t in self._queue.items() if t.sid == sid), None)
        if player_id:
            self._queue.pop(player_id)

    def is_in_queue(self, player_id: str) -> bool:
        return player_id in self._queue

    def queue_size(self) -> int:
        return len(self._queue)

    def _dynamic_range(self, ticket: QueueTicket) -> int:
        wait_seconds = (datetime.now(timezone.utc) - ticket.joined_at).total_seconds()
        expansions = int(wait_seconds // self._expansion_interval)
        return self._base_range + expansions * self._expansion_rate

    def find_all_matches(self) -> list[tuple[QueueTicket, QueueTicket]]:
        """Iterate through the queue and find all possible matches based on dynamic ranges.
        
        Returns a list of pairs (seeker, opponent). Players in matches are removed from the queue.
        """
        matches = []
        # Sort by joined_at to prioritize players who have been waiting longest
        sorted_players = sorted(self._queue.values(), key=lambda t: t.joined_at)
        processed_ids = set()

        for seeker in sorted_players:
            if seeker.player_id in processed_ids or seeker.player_id not in self._queue:
                continue

            allowed_range = self._dynamic_range(seeker)
            best_opponent = None
            min_diff = float("inf")

            for candidate in self._queue.values():
                if (candidate.player_id == seeker.player_id or 
                    candidate.player_id in processed_ids):
                    continue
                
                diff = abs(candidate.elo - seeker.elo)
                # Both must be within each other's allowed range for a fair match
                seeker_range = allowed_range
                candidate_range = self._dynamic_range(candidate)
                
                if diff <= seeker_range and diff <= candidate_range:
                    if diff < min_diff:
                        min_diff = diff
                        best_opponent = candidate

            if best_opponent:
                matches.append((seeker, best_opponent))
                processed_ids.add(seeker.player_id)
                processed_ids.add(best_opponent.player_id)
                self.remove_from_queue(seeker.player_id)
                self.remove_from_queue(best_opponent.player_id)

        return matches

    def find_match(self, player_id: str) -> Optional[Tuple[QueueTicket, QueueTicket]]:
        """Find the closest-elo opponent for the given player within the dynamic range.

        Removes both players from the queue if a match is found.
        Returns None if no suitable opponent exists yet.
        """
        if player_id not in self._queue:
            return None

        seeker = self._queue[player_id]
        allowed_range = self._dynamic_range(seeker)

        best: Optional[QueueTicket] = None
        best_diff = float("inf")

        for pid, candidate in self._queue.items():
            if pid == player_id:
                continue
            diff = abs(candidate.elo - seeker.elo)
            if diff <= allowed_range and diff < best_diff:
                best = candidate
                best_diff = diff

        if best is None:
            return None

        self.remove_from_queue(player_id)
        self.remove_from_queue(best.player_id)
        return (seeker, best)