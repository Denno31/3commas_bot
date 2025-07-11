from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class ApiConfig(BaseModel):
    api_key: str
    api_secret: str
    mode: str = 'paper'
    user_id: Optional[int] = None

    class Config:
        from_attributes = True

class LogEntry(BaseModel):
    timestamp: datetime
    level: str
    message: str
    bot_id: Optional[int] = None

    class Config:
        orm_mode = True

class BotBase(BaseModel):
    name: str
    enabled: bool = True
    coins: List[str]
    threshold_percentage: float
    check_interval: int
    initial_coin: Optional[str] = None
    account_id: str
    user_id: Optional[int] = None

class Bot(BotBase):
    id: Optional[int] = None
    user_id: Optional[int] = None
    current_coin: Optional[str] = None
    last_check_time: Optional[datetime] = None
    active_trade_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    reference_coin: Optional[str] = None
    max_global_equivalent: float = 1.0
    global_threshold_percentage: float = 10.0
    price_source: Optional[str] = "three_commas"

    class Config:
        from_attributes = True

class ApiConfigBase(BaseModel):
    api_key: str
    api_secret: str
    mode: str = 'paper'

class ApiConfig(ApiConfigBase):
    name: str
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ApiConfigCreate(ApiConfigBase):
    pass

class ApiConfig(ApiConfigBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class SystemConfigBase(BaseModel):
    pricing_source: str = '3commas'
    fallback_source: str = 'coingecko'
    update_interval: int = 1
    websocket_enabled: bool = True
    analytics_enabled: bool = True
    analytics_save_interval: int = 60

class SystemConfigCreate(SystemConfigBase):
    pass

class SystemConfig(SystemConfigBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class PriceHistoryBase(BaseModel):
    coin: str
    price: float
    timestamp: datetime

class PriceHistory(PriceHistoryBase):
    id: int
    bot_id: int

    class Config:
        from_attributes = True

class TradeBase(BaseModel):
    trade_id: str
    from_coin: str
    to_coin: str
    amount: float
    price_change: float
    status: str
    executed_at: datetime

class Trade(TradeBase):
    id: int
    bot_id: int

    class Config:
        from_attributes = True

class CoinUnitTrackerBase(BaseModel):
    coin: str
    units: float
    last_updated: datetime = Field(default_factory=datetime.utcnow)


class CoinUnitTracker(CoinUnitTrackerBase):
    id: int
    bot_id: int
    
    class Config:
        from_attributes = True


class Account(BaseModel):
    id: str
    name: str
    type: str = '3commas'
    balance: Optional[float] = None
