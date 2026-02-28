from fastapi import APIRouter

router = APIRouter()

@router.get("/rankings")
async def get_rankings():
    raise NotImplementedError("Elo rankings retrieval is not yet implemented.")

@router.get("/profile/{player_id}")
async def get_profile(player_id: str):
    raise NotImplementedError(f"Profile retrieval for {player_id} is not yet implemented.")
