import os
import time
from functools import lru_cache

from auth0.authentication import GetToken
from auth0.management import Auth0

from app.models.showdown_state import PlayerElo as PlayerStats


@lru_cache()
def get_management_config() -> tuple[str, str, str]:
    domain = os.environ["AUTH0_DOMAIN"].strip().replace("https://", "").rstrip("/")
    client_id = os.environ["AUTH0_M2M_CLIENT_ID"].strip()
    client_secret = os.environ["AUTH0_M2M_CLIENT_SECRET"].strip()
    return domain, client_id, client_secret


class Auth0Service:
    def __init__(self):
        self._client: Auth0 | None = None
        self._expires_at = 0.0

    def _management_client(self) -> Auth0:
        now = time.time()
        if self._client is not None and now < self._expires_at - 60:
            return self._client

        domain, client_id, client_secret = get_management_config()
        token_response = GetToken(
            domain,
            client_id,
            client_secret=client_secret,
        ).client_credentials(f"https://{domain}/api/v2/")

        self._client = Auth0(domain, token_response["access_token"])
        self._expires_at = now + int(token_response.get("expires_in", 86400))
        return self._client

    def get_user_stats(self, user_id: str) -> PlayerStats:
        user = self._management_client().users.get(user_id)
        stats = ((user.get("app_metadata") or {}).get("stats") or {})

        return PlayerStats(
            player_id=user_id,
            elo=int(stats.get("elo", 1200)),
            wins=int(stats.get("wins", 0)),
            losses=int(stats.get("losses", 0)),
        )

    def update_player_stats(self, user_id: str, elo: int, wins: int, losses: int) -> PlayerStats:
        stats = PlayerStats(player_id=user_id, elo=elo, wins=wins, losses=losses)
        self._management_client().users.update(
            user_id,
            {
                "app_metadata": {
                    "stats": {
                        "elo": stats.elo,
                        "wins": stats.wins,
                        "losses": stats.losses,
                    }
                }
            },
        )
        return stats

    def update_user_stats(self, user_id: str, stats: PlayerStats) -> PlayerStats:
        return self.update_player_stats(user_id, stats.elo, stats.wins, stats.losses)
