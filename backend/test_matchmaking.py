import socketio
import threading
import time

SERVER = "http://localhost:8000"


def make_player(name: str, elo: int) -> socketio.SimpleClient:
    """Connect a player and attach event logging."""
    client = socketio.SimpleClient()
    client.connect(SERVER)
    print(f"[{name}] connected (sid={client.sid})")
    return client


def enter_queue(client: socketio.SimpleClient, name: str, elo: int):
    client.emit("enter_queue", {"player_id": name, "elo": elo})
    print(f"[{name}] → enter_queue (elo={elo})")


def wait_for_event(client: socketio.SimpleClient, name: str, timeout: int = 5):
    """Block until any event arrives, then print it."""
    event = client.receive(timeout=timeout)
    print(f"[{name}] ← {event[0]}: {event[1]}")
    return event


# ── Test 1: basic match ──────────────────────────────────────────────────────
print("\n=== Test 1: Two players match ===")

alice = make_player("alice", elo=1000)
bob = make_player("bob", elo=1050)

enter_queue(alice, "alice", elo=1000)
wait_for_event(alice, "alice")  # expect: queue_joined

enter_queue(bob, "bob", elo=1050)
wait_for_event(bob, "bob")  # expect: match_found
wait_for_event(alice, "alice")  # expect: match_found

alice.disconnect()
bob.disconnect()


# ── Test 2: elo too far apart, no match ─────────────────────────────────────
print("\n=== Test 2: Elo gap > 150, no match ===")

carol = make_player("carol", elo=1000)
dave = make_player("dave", elo=1200)

enter_queue(carol, "carol", elo=1000)
wait_for_event(carol, "carol")  # expect: queue_joined

enter_queue(dave, "dave", elo=1200)
wait_for_event(dave, "dave")  # expect: queue_joined (no match)

carol.disconnect()
dave.disconnect()


# ── Test 3: guard against double-queueing ────────────────────────────────────
print("\n=== Test 3: Double-queue guard ===")

eve = make_player("eve", elo=1000)
enter_queue(eve, "eve", elo=1000)
wait_for_event(eve, "eve")  # expect: queue_joined

enter_queue(eve, "eve", elo=1000)
wait_for_event(eve, "eve")  # expect: queue_error (already in queue)

eve.disconnect()

print("\nDone.")
