from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from app.models.user import User
from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ACCESS_TOKEN_EXPIRE_MINUTES = 1440
REFRESH_TOKEN_EXPIRE_DAYS = 7

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.jwt_secret_key,
                      algorithm=settings.jwt_algorithm)

def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.jwt_secret_key,
                      algorithm=settings.jwt_algorithm)

def decode_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.jwt_secret_key,
                             algorithms=[settings.jwt_algorithm])
        return payload
    except JWTError:
        return None

def register_user(email: str, username: str,
                  password: str, db: Session) -> dict:
    existing = db.query(User).filter(
        (User.email == email) | (User.username == username)
    ).first()

    if existing:
        return {"error": "Email or username already exists"}

    user = User(
        email=email,
        username=username,
        hashed_password=hash_password(password),
        tier="free"
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_access_token({
        "sub": user.email,
        "username": user.username,
        "tier": user.tier
    })
    refresh_token = create_refresh_token({
        "sub": user.email
    })

    return {
        "message": "Account created successfully",
        "user": {
            "email": user.email,
            "username": user.username,
            "tier": user.tier
        },
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

def login_user(email: str, password: str, db: Session) -> dict:
    user = db.query(User).filter(User.email == email).first()

    if not user or not verify_password(password, user.hashed_password):
        return {"error": "Invalid email or password"}

    if not user.is_active:
        return {"error": "Account is deactivated"}

    access_token = create_access_token({
        "sub": user.email,
        "username": user.username,
        "tier": user.tier
    })
    refresh_token = create_refresh_token({
        "sub": user.email
    })

    return {
        "message": "Login successful",
        "user": {
            "email": user.email,
            "username": user.username,
            "tier": user.tier
        },
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

def get_current_user(token: str, db: Session) -> Optional[User]:
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        return None
    email = payload.get("sub")
    if not email:
        return None
    return db.query(User).filter(User.email == email).first()