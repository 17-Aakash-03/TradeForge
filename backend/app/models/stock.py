from sqlalchemy import Column, String, Float, BigInteger, DateTime
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class StockPrice(Base):
    __tablename__ = "stock_prices"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    ticker = Column(String, nullable=False)
    date = Column(DateTime, nullable=False)
    open = Column(Float)
    high = Column(Float)
    low = Column(Float)
    close = Column(Float)
    volume = Column(BigInteger)

    def __repr__(self):
        return f"<StockPrice {self.ticker} {self.date} close={self.close}>"