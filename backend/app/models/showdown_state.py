from pydantic import BaseModel, Field
from typing import Dict
from datetime import datetime, timezone
import uuid


class PlayerElo(BaseModel):
    player_id: str
    elo: int = 1000
    wins: int = 0
    losses: int = 0


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
