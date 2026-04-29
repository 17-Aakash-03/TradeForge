from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.config import settings
from app.models.stock import Base as StockBase
from app.models.user import Base as UserBase

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    echo=False
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

def create_tables():
    StockBase.metadata.create_all(bind=engine)
    UserBase.metadata.create_all(bind=engine)
    print("Tables created successfully")

def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()