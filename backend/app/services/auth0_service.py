import os
import time
from functools import lru_cache
from urllib.parse import quote

import httpx

from app.models.showdown_state import PlayerElo as PlayerStats


@lru_cache()
def get_management_config() -> tuple[str, str, str]:
    domain = os.environ["AUTH0_DOMAIN"].strip().strip('"\'').replace("https://", "").rstrip("/")
    client_id = os.environ["AUTH0_M2M_CLIENT_ID"].strip().strip('"\'')
    client_secret = os.environ["AUTH0_M2M_CLIENT_SECRET"].strip().strip('"\'')
    return domain, client_id, client_secret


class Auth0Service:
    def __init__(self):
        self._access_token: str | None = None
        self._expires_at = 0.0

    def _token(self) -> str:
        """Return a cached Management API access token, refreshing when near expiry."""
        now = time.time()
        if self._access_token and now < self._expires_at - 60:
            return self._access_token

        domain, client_id, client_secret = get_management_config()
        resp = httpx.post(
            f"https://{domain}/oauth/token",
            json={
                "client_id": client_id,
                "client_secret": client_secret,
                "audience": f"https://{domain}/api/v2/",
                "grant_type": "client_credentials",
            },
            timeout=10.0,
        )
        resp.raise_for_status()
        data = resp.json()
        self._access_token = data["access_token"]
        self._expires_at = now + int(data.get("expires_in", 86400))
        return self._access_token

    def _headers(self) -> dict:
        return {"Authorization": f"Bearer {self._token()}"}

    def _user_url(self, user_id: str) -> str:
        domain, _, _ = get_management_config()
        # Auth0 user IDs contain '|' which must be percent-encoded in the URL
        return f"https://{domain}/api/v2/users/{quote(user_id, safe='')}"

    def get_user_stats(self, user_id: str) -> PlayerStats:
        resp = httpx.get(self._user_url(user_id), headers=self._headers(), timeout=10.0)
        resp.raise_for_status()
        stats = ((resp.json().get("app_metadata") or {}).get("stats") or {})
        return PlayerStats(
            player_id=user_id,
            elo=int(stats.get("elo", 1200)),
            wins=int(stats.get("wins", 0)),
            losses=int(stats.get("losses", 0)),
        )

    def update_user_stats(self, user_id: str, stats: PlayerStats) -> PlayerStats:
        resp = httpx.patch(
            self._user_url(user_id),
            headers=self._headers(),
            json={
                "app_metadata": {
                    "stats": {
                        "elo": stats.elo,
                        "wins": stats.wins,
                        "losses": stats.losses,
                    }
                }
            },
            timeout=10.0,
        )
        resp.raise_for_status()
        return stats
