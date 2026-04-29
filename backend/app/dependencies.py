from fastapi import HTTPException, Header, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.auth import get_current_user
from app.models.user import User

def get_authenticated_user(
    authorization: str = Header(None),
    db: Session = Depends(get_db)
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Not authenticated. Please login first."
        )
    token = authorization.replace("Bearer ", "")
    user = get_current_user(token, db)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token. Please login again."
        )
    return user

def get_pro_user(user: User = Depends(get_authenticated_user)) -> User:
    if user.tier != "pro":
        raise HTTPException(
            status_code=403,
            detail="This feature requires a Pro account. Upgrade to access."
        )
    return user