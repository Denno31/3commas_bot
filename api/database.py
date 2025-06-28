import os
from sqlalchemy import create_engine, Column, Integer, String, Boolean, Float, DateTime, ForeignKey, JSON, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
from passlib.context import CryptContext
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# HARDCODED PostgreSQL connection - replace with your actual credentials
DATABASE_URL = "postgresql://postgres:dennis@localhost:5432/crypto_rebalancer"
logger.info(f"Using hardcoded PostgreSQL connection")

# PostgreSQL connection
if DATABASE_URL.startswith('postgres://'):
    # Replace postgres:// with postgresql:// for SQLAlchemy
    DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)
logger.info(f"Connecting to PostgreSQL database")
engine = create_engine(DATABASE_URL)

print(f"Using database at: {DATABASE_URL}")

# Create declarative base
Base = declarative_base()

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Database initialization function
def init_db():
    """Initialize the database by creating all tables"""
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database schema created successfully")

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class ApiConfig(Base):
    __tablename__ = "api_config"

    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True)  # e.g., '3commas', 'coingecko'
    api_key = Column(String, nullable=True)
    api_secret = Column(String, nullable=True)
    mode = Column(String, default='paper')  # paper/real for 3commas
    user_id = Column(Integer, ForeignKey('users.id'))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship
    user = relationship("User", back_populates="api_configs")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    bots = relationship("Bot", back_populates="user")
    api_configs = relationship("ApiConfig", back_populates="user")

    @property
    def is_authenticated(self):
        return True

    def verify_password(self, plain_password):
        return pwd_context.verify(plain_password, self.hashed_password)

    @staticmethod
    def get_password_hash(password):
        return pwd_context.hash(password)



class Bot(Base):
    __tablename__ = "bots"

    id = Column(Integer, primary_key=True)
    name = Column(String, index=True)
    enabled = Column(Boolean, default=True)
    coins = Column(String)  # Stored as comma-separated string
    threshold_percentage = Column(Float)
    check_interval = Column(Integer)
    initial_coin = Column(String, nullable=True)
    current_coin = Column(String, nullable=True)
    account_id = Column(String, nullable=False)
    last_check_time = Column(DateTime, nullable=True)
    active_trade_id = Column(String, nullable=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    # Fields for global profit protection
    reference_coin = Column(String, nullable=True)  # The coin used as reference for global value tracking
    max_global_equivalent = Column(Float, default=1.0)  # Highest portfolio value (in reference coin units)
    global_threshold_percentage = Column(Float, default=10.0)  # Global loss threshold (default 10%)
    # New fields for enhanced trading logic
    global_peak_value = Column(Float, default=0.0)  # Highest portfolio value ever reached (in reference_coin)
    min_acceptable_value = Column(Float, default=0.0)  # Minimum acceptable value (90% of peak)

    # Relationships
    user = relationship("User", back_populates="bots")
    price_history = relationship("PriceHistory", back_populates="bot")
    trades = relationship("Trade", back_populates="bot")
    logs = relationship("LogEntry", back_populates="bot")
    coin_units = relationship("CoinUnitTracker", back_populates="bot")

class PriceHistory(Base):
    __tablename__ = "price_history"

    id = Column(Integer, primary_key=True)
    bot_id = Column(Integer, ForeignKey("bots.id"))
    coin = Column(String, index=True)
    price = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow)

    # Relationship
    bot = relationship("Bot", back_populates="price_history")

class Trade(Base):
    __tablename__ = "trades"

    id = Column(Integer, primary_key=True, index=True)
    bot_id = Column(Integer, ForeignKey('bots.id'))
    trade_id = Column(String, unique=True)  # 3commas trade ID
    from_coin = Column(String)
    to_coin = Column(String)
    amount = Column(Float)
    price_change = Column(Float)
    status = Column(String)  # pending, completed, failed
    executed_at = Column(DateTime, default=datetime.utcnow)

    # Relationship
    bot = relationship("Bot", back_populates="trades")

class CoinUnitTracker(Base):
    __tablename__ = "coin_unit_tracker"
    
    id = Column(Integer, primary_key=True, index=True)
    bot_id = Column(Integer, ForeignKey('bots.id'))
    coin = Column(String)
    units = Column(Float)  # Number of units last held
    last_updated = Column(DateTime, default=datetime.utcnow)
    
    # Relationship
    bot = relationship("Bot", back_populates="coin_units")
    
    class Config:
        unique_together = ("bot_id", "coin")  # Each coin should have one entry per bot


class CoinSnapshot(Base):
    __tablename__ = "coin_snapshots"
    
    id = Column(Integer, primary_key=True, index=True)
    bot_id = Column(Integer, ForeignKey('bots.id'))
    coin = Column(String, index=True)
    initial_price = Column(Float)  # Initial price when snapshot was created
    snapshot_timestamp = Column(DateTime, default=datetime.utcnow)
    units_held = Column(Float, default=0.0)  # Number of units currently held (0 if not holding)
    eth_equivalent_value = Column(Float, default=0.0)  # Value in ETH or reference coin
    was_ever_held = Column(Boolean, default=False)  # Flag if coin was ever held
    max_units_reached = Column(Float, default=0.0)  # Maximum number of units ever held
    
    # Relationship
    bot = relationship("Bot", backref="coin_snapshots")
    
    # Unique constraint to ensure only one snapshot per coin per bot
    __table_args__ = (
        UniqueConstraint('bot_id', 'coin', name='uix_bot_coin'),
    )


class LogEntry(Base):
    __tablename__ = "logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    level = Column(String)
    message = Column(String)
    bot_id = Column(Integer, ForeignKey('bots.id'), nullable=True)

    bot = relationship("Bot", back_populates="logs")

    @classmethod
    def log(cls, db, level: str, message: str, bot_id: int = None):
        entry = cls(level=level, message=message, bot_id=bot_id)
        db.add(entry)
        db.commit()
        logger.log(getattr(logging, level.upper()), message)

class SystemConfig(Base):
    __tablename__ = "system_config"

    id = Column(Integer, primary_key=True)
    pricing_source = Column(String, default='3commas')
    fallback_source = Column(String, default='coingecko')
    update_interval = Column(Integer, default=1)
    websocket_enabled = Column(Boolean, default=True)
    analytics_enabled = Column(Boolean, default=True)
    analytics_save_interval = Column(Integer, default=60)
    user_id = Column(Integer, ForeignKey('users.id'))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship
    user = relationship("User", backref="system_config")

# Create tables
Base.metadata.create_all(bind=engine)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
