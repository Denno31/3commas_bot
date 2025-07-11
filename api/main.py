import logging
import os
from fastapi import FastAPI, Depends, HTTPException, status, Response, BackgroundTasks, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from py3cw.request import Py3CW
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, validator
from typing import List, Optional
from datetime import datetime, timedelta
from database import get_db, Bot as DBBot, ApiConfig as DBApiConfig, SystemConfig as DBSystemConfig, PriceHistory as DBPriceHistory, Trade as DBTrade, LogEntry as DBLogEntry, User
from auth import get_current_active_user, get_current_active_superuser, create_access_token
from sqlalchemy import desc
from models import ApiConfigCreate, Bot, ApiConfig, PriceHistory, SystemConfig

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Pydantic models for request/response
class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str

class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str

class Account(BaseModel):
    id: str
    name: str
    type: str
    balance: float

class BotResponse(BaseModel):
    id: int
    name: str
    enabled: bool
    coins: List[str]
    threshold_percentage: float
    check_interval: int
    initial_coin: Optional[str]
    current_coin: Optional[str]
    account_id: str
    last_check_time: Optional[datetime]
    active_trade_id: Optional[str]
    user_id: int
    created_at: datetime
    updated_at: datetime

    @validator('coins', pre=True)
    def split_coins(cls, v):
        if isinstance(v, str):
            return v.split(',')
        return v

    class Config:
        from_attributes = True

class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    is_active: bool
    is_superuser: bool
    created_at: datetime

    class Config:
        orm_mode = True

class Token(BaseModel):
    access_token: str
    token_type: str

app = FastAPI()

# Get CORS origins from environment variable
cors_origins = os.getenv('CORS_ORIGINS', 'http://localhost:3000').split(',')

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Authentication endpoints
@app.post("/api/register", response_model=UserResponse)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    # Check if user exists
    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    if db.query(User).filter(User.username == user.username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # Create new user
    db_user = User(
        email=user.email,
        username=user.username,
        hashed_password=User.get_password_hash(user.password)
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/api/token", response_model=Token)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not user.verify_password(form_data.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

def get_3commas_client(db: Session, user_id: int) -> Py3CW:
    print("Getting 3commas client...")
    config = db.query(DBApiConfig).filter(
        DBApiConfig.name == '3commas',
        DBApiConfig.user_id == user_id
    ).first()
    if not config:
        print("No 3commas config found in database for this user")
        raise HTTPException(status_code=404, detail="3Commas API configuration not found for this user")
    
    print(f"Found config: api_key={config.api_key[:8]}..., mode={config.mode}")
    client = Py3CW(
        key=config.api_key,
        secret=config.api_secret,
        request_options={
            'request_timeout': 10,
            'nr_of_retries': 1
        }
    )
    print("3commas client created")
    return client

def bot_to_db(bot: Bot) -> DBBot:
    now = datetime.utcnow()
    return DBBot(
        name=bot.name,
        enabled=bot.enabled,
        coins=','.join(bot.coins),
        threshold_percentage=bot.threshold_percentage,
        check_interval=bot.check_interval,
        initial_coin=bot.initial_coin,
        account_id=str(bot.account_id),
        last_check_time=bot.last_check_time,
        active_trade_id=bot.active_trade_id,
        user_id=bot.user_id,
        created_at=now,
        updated_at=now
    )

def db_to_bot(db_bot: DBBot) -> Bot:
    coins = db_bot.coins.split(',') if db_bot.coins else []
    return Bot(
        id=db_bot.id,
        name=db_bot.name,
        enabled=db_bot.enabled,
        coins=coins,
        threshold_percentage=db_bot.threshold_percentage,
        check_interval=db_bot.check_interval,
        initial_coin=db_bot.initial_coin,
        current_coin=db_bot.current_coin,
        account_id=str(db_bot.account_id),
        last_check_time=db_bot.last_check_time,
        active_trade_id=db_bot.active_trade_id,
        user_id=db_bot.user_id
    )

@app.get("/api/bots", response_model=List[BotResponse])
def get_bots(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return db.query(DBBot).filter(DBBot.user_id == current_user.id).all()

@app.post("/api/bots", response_model=BotResponse)
def create_bot(bot: Bot, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    # Create a new dict with all bot data plus user_id
    bot_data = bot.dict()
    bot_data['user_id'] = current_user.id
    
    # Create a new Bot instance with the updated data
    new_bot = Bot(**bot_data)
    
    # Convert to DB model and save
    db_bot = bot_to_db(new_bot)
    db.add(db_bot)
    db.commit()
    db.refresh(db_bot)
    return db_to_bot(db_bot)

@app.put("/api/bots/{bot_id}", response_model=BotResponse)
def update_bot(bot_id: int, bot_update: Bot, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    db_bot = db.query(DBBot).filter(DBBot.id == bot_id, DBBot.user_id == current_user.id).first()
    if not db_bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    for key, value in bot_update.dict(exclude_unset=True).items():
        if key == 'coins':
            setattr(db_bot, key, ','.join(value))
        else:
            setattr(db_bot, key, value)
    
    db.commit()
    db.refresh(db_bot)
    return db_to_bot(db_bot)

@app.get("/api/bots/{bot_id}", response_model=BotResponse)
def get_bot(bot_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    db_bot = db.query(DBBot).filter(DBBot.id == bot_id, DBBot.user_id == current_user.id).first()
    if not db_bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    return db_to_bot(db_bot)

@app.delete("/api/bots/{bot_id}")
def delete_bot(bot_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    db_bot = db.query(DBBot).filter(DBBot.id == bot_id, DBBot.user_id == current_user.id).first()
    if not db_bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    db.delete(db_bot)
    db.commit()
    return {"message": "Bot deleted successfully"}

@app.post("/api/bots/{bot_id}/toggle")
def toggle_bot(bot_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    db_bot = db.query(DBBot).filter(DBBot.id == bot_id, DBBot.user_id == current_user.id).first()
    if not db_bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    db_bot.enabled = not db_bot.enabled
    db.commit()
    return {"enabled": db_bot.enabled}

@app.get("/api/bots/{bot_id}/prices")
def get_bot_prices(
    bot_id: int,
    from_time: Optional[datetime] = None,
    to_time: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(DBPriceHistory).filter(DBPriceHistory.bot_id == bot_id)
    
    if from_time:
        query = query.filter(DBPriceHistory.timestamp >= from_time)
    if to_time:
        query = query.filter(DBPriceHistory.timestamp <= to_time)
    
    prices = query.order_by(DBPriceHistory.timestamp.desc()).limit(1000).all()
    return [PriceHistory.model_validate(p) for p in prices]

@app.get("/api/bots/{bot_id}/trades")
def get_bot_trades(
    bot_id: int,
    status: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(DBTrade).filter(DBTrade.bot_id == bot_id)
    
    if status:
        query = query.filter(DBTrade.status == status)
    
    trades = query.order_by(DBTrade.executed_at.desc()).limit(limit).all()
    return [Trade.from_orm(t) for t in trades]

@app.get("/api/bots/{bot_id}/state")
def get_bot_state(bot_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    db_bot = db.query(DBBot).filter(DBBot.id == bot_id, DBBot.user_id == current_user.id).first()
    if not db_bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    bot_data = db_to_bot(db_bot)
    
    # Add additional price source information for the UI
    bot_state = bot_data.dict()
    bot_state["price_source"] = db_bot.price_source if hasattr(db_bot, "price_source") else "three_commas"
    bot_state["price_source_status"] = True  # Default to operational
    
    # Include information about the most recent price update
    latest_price = db.query(DBPriceHistory).filter(DBPriceHistory.bot_id == bot_id).order_by(desc(DBPriceHistory.timestamp)).first()
    if latest_price:
        bot_state["last_price_update"] = latest_price.timestamp
        bot_state["last_price_source"] = latest_price.source if hasattr(latest_price, "source") else bot_state["price_source"]
    else:
        bot_state["last_price_update"] = None
        bot_state["last_price_source"] = None
    
    return bot_state

@app.get("/api/accounts")
def get_accounts(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    print("\n=== Getting trading accounts ===")
    print(f"User ID: {current_user.id}")
    
    try:
        p3cw = get_3commas_client(db, current_user.id)
        
        print("Making request to 3commas API...")
        error, accounts = p3cw.request(
            entity="accounts",
            action=""
        )
        print(f"Error: {error}")
        print(f"Accounts response type: {type(accounts)}")
        print(f"Accounts: {accounts}")
        
        if error:
            print(f"3commas API error: {error}")
            raise HTTPException(status_code=500, detail=str(error))
                
        return [
            Account(
                id=str(acc['id']),
                name=f"{acc['name']} ({acc['exchange_name']})",
                type='3commas',
                balance=float(acc.get('balance_amount_in_usd') or 0)
            )
            for acc in accounts
        ]
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error getting trading accounts: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/config/system")
def get_system_config(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    config = db.query(DBSystemConfig).filter(DBSystemConfig.user_id == current_user.id).first()
    if not config:
        config = DBSystemConfig(user_id=current_user.id)
        db.add(config)
        db.commit()
        db.refresh(config)
    return config

@app.put("/api/config/system")
def update_system_config(config: SystemConfig, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    db_config = db.query(DBSystemConfig).filter(DBSystemConfig.user_id == current_user.id).first()
    if not db_config:
        db_config = DBSystemConfig(user_id=current_user.id)
        db.add(db_config)
    
    for key, value in config.dict().items():
        if key != 'user_id':  # Don't update user_id
            setattr(db_config, key, value)
    
    db.commit()
    db.refresh(db_config)
    return db_config

@app.get("/api/config/api")
def get_api_configs(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    configs = db.query(DBApiConfig).filter(DBApiConfig.user_id == current_user.id).all()
    return {config.name: {
        'api_key': config.api_key,
        'api_secret': config.api_secret,
        'mode': config.mode
    } for config in configs}

@app.put("/api/config/api")
def update_api_config(name: str, config: ApiConfigCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    # First check if this user already has a config with this name
    db_config = db.query(DBApiConfig).filter(
        DBApiConfig.name == name,
        DBApiConfig.user_id == current_user.id
    ).first()

    print(db_config)
    
    if not db_config:
        # Create new config for this user
        db_config = DBApiConfig(
            name=name,
            user_id=current_user.id,
            api_key=config.api_key,
            api_secret=config.api_secret,
            mode=config.mode
        )
        db.add(db_config)
    else:
        # Update existing config
        db_config.api_key = config.api_key
        db_config.api_secret = config.api_secret
        db_config.mode = config.mode
    
    db.commit()
    db.refresh(db_config)
    return db_config

@app.get("/api/bots/{bot_id}/logs")
def get_bot_logs(
    bot_id: int,
    limit: int = 100,
    level: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get bot's logs"""
    try:
        query = db.query(DBLogEntry).filter(DBLogEntry.bot_id == bot_id)
        
        if level:
            query = query.filter(DBLogEntry.level == level.upper())
            
        logs = query.order_by(desc(DBLogEntry.timestamp)).limit(limit).all()
        return [LogEntry.from_orm(log) for log in logs]
    except Exception as e:
        logger.error(f"Error getting bot logs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/database/backup")
def backup_database():
    """Create a database backup"""
    try:
        db_path = os.getenv('DB_PATH', '../data/crypto_rebalancer.db')
        backup_path = f"{db_path}.bak"
        
        # Create backup
        shutil.copy2(db_path, backup_path)
        
        # Return backup file
        return Response(
            open(backup_path, 'rb').read(),
            media_type='application/octet-stream',
            headers={
                'Content-Disposition': f'attachment; filename=crypto_rebalancer_backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}.db'
            }
        )
    except Exception as e:
        logger.error(f"Error creating database backup: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
