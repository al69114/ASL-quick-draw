import socketio

sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
socket_app = socketio.ASGIApp(sio)

@sio.event
async def connect(sid, environ):
    print(f"Cowboy connected: {sid}")

@sio.event
async def disconnect(sid):
    print(f"Cowboy left the saloon: {sid}")