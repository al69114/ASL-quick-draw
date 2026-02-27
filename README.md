# Quick Draw ASL Showdown

**Quick Draw ASL Showdown** is a Wild West-themed, real-time multiplayer "quick draw" game where players compete head-to-head via webcam to be the _first_ to correctly perform ASL hand signs (A-Z) in a best-of-5 showdown. Automatic matchmaking queues players by Elo ranking for fair duels.

**Tech Stack Overview:**

- **Frontend**: React + TypeScript + WebRTC + Socket.IO-client
- **Backend**: FastAPI (Python) + WebSockets + Socket.IO-server
- **ASL Model**: Python (MediaPipe + custom classifier)
- **Deployment**: Everything on Render.com (Static Site for frontend, Web Service for backend/model) [render](https://render.com/docs/deploy-fastapi)

## Frontend Stack (React + WebRTC)

**Purpose**: Renders saloon-style UI with live duel video feeds, countdowns ("High Noon!"), and auto-queues for next showdown after each match.

### File Structure

```
frontend/
├── public/
│   ├── index.html          # Saloon-themed HTML template (dusty backgrounds, wanted posters)
│   └── cowboy-hat.ico      # Wild West favicon
├── src/
│   ├── components/
│   │   ├── DuelArena.tsx       # Side-by-side video showdown (self vs opponent), "DRAW!" overlay
│   │   ├── Scoreboard.tsx      # Best-of-5 bullets, Elo rank display, "Yer Dead!" animations
│   │   └── QueueLobby.tsx      # "Belly up to the bar" matchmaking screen, rank queue status
│   ├── hooks/
│   │   ├── useQuickDraw.ts     # WebRTC duel video + auto-frame capture at "DRAW!" signal
│   │   └── useDuelSocket.ts    # WebSocket for matchmaking, game events, Elo updates
│   ├── types/
│   │   └── showdown.types.ts   # TS interfaces: DuelState, EloRank, WebSocket payloads
│   ├── App.tsx                 # Root: wiring DuelArena + Scoreboard + Queue hooks
│   ├── index.tsx               # ReactDOM render with saloon CSS
│   └── socket.ts               # Socket.IO client with Render backend URL
├── package.json                # react, socket.io-client, webrtc-adapter, framer-motion (animations)
├── tsconfig.json               # Strict TypeScript config
└── vite.config.ts              # Vite for dev/prod builds
```

### Feature Implementation Status

| Feature                                                          | Status  | Details/Dependencies                                                                                                                                         |
| ---------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Saloon-themed webcam capture                                     | ⬜ TODO | Dusty UI, cowboy fonts, "Partner's feed" label                                                                                                               |
| WebRTC P2P duel video streaming                                  | ⬜ TODO | Low-latency opponent video via Render signaling [render](https://render.com/docs/websocket)                                                                  |
| Auto-frame capture at "DRAW!"                                    | ⬜ TODO | Canvas snapshot exactly on server countdown=0                                                                                                                |
| Elo rank display & queue status                                  | ⬜ TODO | "Rank #47 (1250 Elo)", "3 players waitin'..."                                                                                                                |
| Best-of-5 showdown scoreboard                                    | ⬜ TODO | Bullet holes for wins, "Quickest Draw Wins!"                                                                                                                 |
| High Noon countdown (5-4-3-2-1-DRAW!)                            | ⬜ TODO | Gunshot SFX, screen flash animation                                                                                                                          |
| ASL sign prompt ("Draw: Sign B!")                                | ⬜ TODO | Animated wanted poster with letter                                                                                                                           |
| Auto-queue for next match post-game                              | ⬜ TODO | Button: "Queue fer another?" → matchmaking                                                                                                                   |
| WebSocket to Render backend                                      | ⬜ TODO | Events: `DUEL_FOUND`, `DRAW_START`, `RESULT`                                                                                                                 |
| Victory/defeat screens ("Yer the fastest!", "Practice yer draw") | ⬜ TODO | Shareable match replay link?                                                                                                                                 |
| Responsive on mobile/desktop                                     | ⬜ TODO | Touch-friendly for hackathon demos                                                                                                                           |
| Render Static Site env vars                                      | ⬜ TODO | `REACT_APP_BACKEND_URL=https://api-quickdraw.onrender.com` [dev](https://dev.to/gilly7/part-2-deploying-your-fastapi-and-reactjs-crud-app-on-rendercom-3l50) |

## Backend Stack (FastAPI WebSockets on Render)

**Purpose**: Manages global player queue, Elo-based matchmaking, duel state, and routes "draw" snapshots to ASL model—all running as Render Web Service. [render](https://render.com/docs/deploy-fastapi)

### File Structure

```
backend/
├── app/
│   ├── main.py                   # FastAPI app, CORS for Render Static frontend, socketio mount
│   ├── models/
│   │   └── showdown_state.py     # Pydantic: PlayerElo, DuelRoom, QueueTicket
│   ├── routers/
│   │   ├── websocket.py          # `/ws` endpoint for duels + queue
│   │   └── api.py                # `/rankings`, `/profile/{player_id}`
│   ├── core/
│   │   ├── elo_matchmaker.py     # Queue + Elo pairing logic
│   │   └── duel_engine.py        # Showdown FSM, first-correct detection
│   └── services/
│   │   └── webrtc_relay.py       # Signaling for duel video P2P
├── requirements.txt               # fastapi[all], python-socketio, uvicorn[standard], pydantic-settings
├── render.yaml                    # Render blueprint for auto-deploy [web:23]
├── Dockerfile                     # Render Web Service build
└── .env.example                   # ELO_DB_URL=sqlite:///elo.db
```

### Feature Implementation Status

| Feature                            | Status  | Details/Dependencies                                                                                                    |
| ---------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------- |
| WebSocket `/ws` for queue + duels  | ⬜ TODO | Persistent Render connections, no hard limits [render](https://render.com/docs/websocket)                               |
| Global player queue (FIFO + Elo)   | ⬜ TODO | Players auto-added post-match, timeout after 60s                                                                        |
| Elo matchmaking (pair ±150 rating) | ⬜ TODO | Simple Elo formula: expected = 1/(1+10^((Rb-Ra)/400)) [news.ycombinator](https://news.ycombinator.com/item?id=26115665) |
| Duel room creation (2 players max) | ⬜ TODO | Notify both: `DUEL_FOUND {opponent_elo, target_sign}`                                                                   |
| Showdown state machine             | ⬜ TODO | QUEUED → PAIRED → COUNTDOWN → DRAW → JUDGING → RESULT                                                                   |
| Broadcast duel events              | ⬜ TODO | `HIGH_NOON`, `DRAW_NOW`, `WINNER_ANNOUNCED`                                                                             |
| Elo update post-match              | ⬜ TODO | Winner +20-32 pts, loser -20-32 based on rating gap                                                                     |
| WebRTC signaling relay             | ⬜ TODO | SDP/ICE via WebSocket for P2P video [render](https://render.com/docs/websocket)                                         |
| Persistent rankings (SQLite)       | ⬜ TODO | Render PostgreSQL free tier or SQLite file                                                                              |
| Rate limit snapshots (1-3/round)   | ⬜ TODO | Prevent spam draws                                                                                                      |
| Graceful disconnects               | ⬜ TODO | Forfeit match, return to queue                                                                                          |
| Render Web Service deploy          | ⬜ TODO | `start: uvicorn app.main:app --host 0.0.0.0 --port $PORT` [render](https://render.com/docs/deploy-fastapi)              |

## ASL Model Service (Integrated in Backend)

**Purpose**: Lightning-fast ASL classifier for "draw" snapshots, invoked by backend during judging phase.

### File Structure

```
model_service/  (subfolder of backend/)
├── classifier.py                 # MediaPipe hands + lightweight CNN for A-Z
├── preprocess.py                 # Frame → hand ROI → tensor
├── model.onnx                    # Optimized for <200ms inference
├── test_samples/                 # A-Z gesture PNGs for validation
└── __init__.py                   # Importable from duel_engine.py
```

### Feature Implementation Status

| Feature                       | Status  | Details/Dependencies                                |
| ----------------------------- | ------- | --------------------------------------------------- |
| A-Z ASL classifier (>90% acc) | ⬜ TODO | MediaPipe landmarks → 42D vector → MLP              |
| Base64 snapshot → prediction  | ⬜ TODO | Backend calls `classify(b64_image) -> {sign, conf}` |
| Hand detection + ROI crop     | ⬜ TODO | Ignore body/face, focus palms                       |
| <300ms inference (CPU OK)     | ⬜ TODO | ONNX Runtime for Render compatibility               |
| Confidence threshold 0.85     | ⬜ TODO | Low conf = invalid draw                             |
| Integrated backend endpoint   | ⬜ TODO | No separate service for Render simplicity           |
| Test accuracy on holdout set  | ⬜ TODO | Log false positives/negatives                       |

## Integration & Render Deployment

### Shared Message Contracts

```
Client → Server: {type: "enter_queue", player_id: "uuid"}
Server → Client: {type: "duel_found", opponent: {elo: 1250, name: "Billy"}, target: "G"}
Client → Server: {type: "draw_made", image_b64: "...", timestamp: 1234567890}
Server → Client: {type: "result", winner: "you", new_elo: 1285, next_queue: true}
```

### Render Deployment Plan (All-in-One Platform) [dev](https://dev.to/gilly7/part-2-deploying-your-fastapi-and-reactjs-crud-app-on-rendercom-3l50)

| Service         | Type            | Config                                                                                                    | Status  |
| --------------- | --------------- | --------------------------------------------------------------------------------------------------------- | ------- |
| Frontend        | Static Site     | Build: `npm run build`, Publish: `build/`                                                                 | ⬜ TODO |
| Backend + Model | Web Service     | Start: `uvicorn ... --port $PORT`, Free tier OK for hackathon [render](https://render.com/docs/websocket) | ⬜ TODO |
| Rankings DB     | PostgreSQL      | Free tier, `DATABASE_URL` env var                                                                         | ⬜ TODO |
| Auto-deploys    | GitHub → Render | Webhooks on push to main                                                                                  | ⬜ TODO |

## Quickstart (Local Hackathon Setup)

```bash
# Clone & Backend+Model
git clone ... && cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload  # http://localhost:8000/docs

# Frontend
cd ../frontend && npm i && npm run dev  # http://localhost:5173
```

**Hackathon Win Conditions:**

- ✅ Live duels with auto Elo queueing
- ✅ Render-deployed, public links for judges
- ✅ <1s from DRAW! to winner declared
- ✅ Wild West polish (SFX, animations)

_Updated: Feb 27, 2026 | Quick Draw or get buried!_
