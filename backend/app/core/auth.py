from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from pydantic import BaseModel
import os
from functools import lru_cache
import httpx
import logging

logger = logging.getLogger(__name__)

security = HTTPBearer()


class TokenData(BaseModel):
    """Decoded JWT token data structure"""
    player_id: str
    sub: str  # Auth0 subject (unique identifier)
    email: str | None = None


class TokenConfig(BaseModel):
    """Auth0 configuration from environment"""
    auth0_domain: str
    auth0_audience: str
    algorithms: list[str] = ["RS256"]


@lru_cache()
def get_token_config() -> TokenConfig:
    """Load Auth0 configuration from environment variables"""
    return TokenConfig(
        auth0_domain=os.getenv("AUTH0_DOMAIN", "your-auth0-domain.auth0.com"),
        auth0_audience=os.getenv("AUTH0_AUDIENCE", "https://asl-quickdraw-api"),
    )


@lru_cache()
async def get_jwks():
    """Fetch JSON Web Key Set from Auth0"""
    config = get_token_config()
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://{config.auth0_domain}/.well-known/jwks.json",
            timeout=10.0
        )
        response.raise_for_status()
        return response.json()


def get_rsa_key(kid: str, jwks: dict):
    """Extract RSA public key from JWKS using key ID"""
    for key in jwks.get("keys", []):
        if key.get("kid") == kid:
            return key
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Unable to find a signing key that matches",
    )


async def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> TokenData:
    """
    Verify JWT token from Auth0 and return decoded token data.
    
    Args:
        credentials: Bearer token from request header
        
    Returns:
        TokenData with extracted player_id and user info
        
    Raises:
        HTTPException: If token is invalid, expired, or malformed
    """
    token = credentials.credentials
    config = get_token_config()

    try:
        # Get the unverified header to extract the key ID
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        
        if not kid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token missing key ID (kid) in header",
            )

        # Fetch JWKS from Auth0
        jwks = await get_jwks()
        rsa_key = get_rsa_key(kid, jwks)

        # Verify and decode the token
        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=config.algorithms,
            audience=config.auth0_audience,
            options={"verify_exp": True}
        )

        # Extract player_id from token (use 'sub' as fallback)
        player_id = payload.get("sub", payload.get("player_id", ""))
        email = payload.get("email")

        if not player_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token missing required player identifier",
            )

        return TokenData(
            player_id=player_id,
            sub=payload.get("sub"),
            email=email,
        )

    except JWTError as e:
        logger.error(f"JWT validation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except httpx.RequestError as e:
        logger.error(f"Failed to fetch JWKS from Auth0: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service temporarily unavailable",
        )
    except Exception as e:
        logger.error(f"Unexpected authentication error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during authentication",
        )


async def get_current_player(
    token_data: TokenData = Depends(verify_token),
) -> str:
    """
    Dependency to extract and return the current player ID from verified token.
    
    Usage in routes:
        @app.get("/protected")
        async def protected_route(player_id: str = Depends(get_current_player)):
            return {"player_id": player_id}
    """
    return token_data.player_id