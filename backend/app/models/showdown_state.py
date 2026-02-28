from pydantic import BaseModel, Field
from typing import Dict, List, Optional
from datetime import datetime, timezone
import uuid


class PlayerElo(BaseModel):
    player_id: str
    elo: int = 1000
    wins: int = 0
    losses: int = 0
    elo_delta: int = 0  # change applied this match (positive for winner, negative for loser)


class QueueTicket(BaseModel):
    player_id: str
    sid: str
    elo: int = 1000
    joined_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DuelRoom(BaseModel):
    room_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    player1_id: str
    player2_id: str
    player1_sid: str
    player2_sid: str
    status: str = "active"  # active | finished
    scores: Dict[str, int] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    # Per-round tracking
    round_number: int = 1
    target_sign: str = ""
    round_results: Dict[str, Optional[bool]] = Field(default_factory=dict)  # player_id → correct bool
    detected_signs: Dict[str, str] = Field(default_factory=dict)  # player_id → detected letter
    ready_players: List[str] = Field(default_factory=list)
