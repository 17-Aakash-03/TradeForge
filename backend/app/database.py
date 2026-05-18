from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_recycle=300,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    from app.models.stock import StockPrice
    from app.models.user import User
    from app.models.paper_trade import PaperTrade, PaperPortfolio
    StockPrice.__table__.create(bind=engine, checkfirst=True)
    User.__table__.create(bind=engine, checkfirst=True)
    PaperTrade.__table__.create(bind=engine, checkfirst=True)
    PaperPortfolio.__table__.create(bind=engine, checkfirst=True)