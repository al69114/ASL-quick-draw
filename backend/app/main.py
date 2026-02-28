from dotenv import load_dotenv
load_dotenv()  # Load .env before anything else imports os.environ

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.socket_manager import socket_app  # Move the mess here

app = FastAPI(title="Quick Draw ASL Showdown")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# This is the "Magic" that combines FastAPI and Socket.IO
app.mount("/", socket_app)

@app.get("/health")
async def health():
    return {"status": "High Noon Ready"}