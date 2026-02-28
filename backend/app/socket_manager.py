import logging

import socketio

from app.core.duel_engine import DuelEngine
from app.core.elo_matchmaker import EloMatchmaker
from app.routers.websocket import setup_websocket_handlers
from app.services.webrtc_relay import setup_webrtc_signaling

logger = logging.getLogger(__name__)

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins=[])
socket_app = socketio.ASGIApp(sio)

# Singletons shared across all socket events
matchmaker = EloMatchmaker()
duel_engine = DuelEngine()

# Maps sid -> player_id for disconnect cleanup
_sid_to_player: dict[str, str] = {}


@sio.event
async def connect(sid, environ):
    logger.info(f"Cowboy connected: {sid}")


@sio.event
async def disconnect(sid):
    player_id = _sid_to_player.pop(sid, None)
    if player_id:
        matchmaker.remove_from_queue(player_id)
        logger.info(f"Player {player_id} disconnected, removed from queue")
    logger.info(f"Cowboy left the saloon: {sid}")


# Wire up event handlers at import time
setup_websocket_handlers(sio, matchmaker, duel_engine, _sid_to_player)
setup_webrtc_signaling(sio)