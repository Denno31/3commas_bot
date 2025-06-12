import os
from sqlalchemy import create_engine, Column, Integer, String, Boolean, Float, DateTime, ForeignKey, JSON
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

print(os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'crypto_rebalancer.db'))
# Create SQLite engine with configurable path
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'crypto_rebalancer.db')
print(f"Using database at: {os.path.abspath(DB_PATH)}")
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})

# Create declarative base
Base = declarative_base()

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class ApiConfig(Base):
    __tablename__ = "api_configs"

    id = Column(Integer, primary_key=True)
    name = Column(String)
    api_key = Column(String)
    api_secret = Column(String)
    mode = Column(String, default='paper')
    user_id = Column(Integer, ForeignKey('users.id'))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
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

    # Relationships
    user = relationship("User", back_populates="bots")
    price_history = relationship("PriceHistory", back_populates="bot")
    trades = relationship("Trade", back_populates="bot")
    logs = relationship("LogEntry", back_populates="bot")

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
