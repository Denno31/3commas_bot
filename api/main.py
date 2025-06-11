from fastapi import FastAPI, HTTPException, Depends, Response
from fastapi.middleware.cors import CORSMiddleware
import json
import os
import shutil
from datetime import datetime, timedelta
import logging
from sqlalchemy.orm import Session
from sqlalchemy import desc
from database import (
    get_db, Bot as DBBot, ApiConfig as DBApiConfig, SystemConfig as DBSystemConfig, PriceHistory as DBPriceHistory,
    Trade as DBTrade, ApiConfig as DBApiConfig, LogEntry as DBLogEntry
)
from models import (
    Bot, ApiConfig, ApiConfigCreate, SystemConfig, SystemConfigCreate,
    PriceHistory, Trade, Account, LogEntry
)
from typing import List, Optional
from py3cw.request import Py3CW

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_3commas_client(db: Session) -> Py3CW:
    print("Getting 3commas client...")
    config = db.query(DBApiConfig).filter(DBApiConfig.name == '3commas').first()
    if not config:
        print("No 3commas config found in database")
        raise HTTPException(status_code=404, detail="3Commas API configuration not found")
    
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
    return DBBot(
        name=bot.name,
        enabled=bot.enabled,
        coins=','.join(bot.coins),
        threshold_percentage=bot.threshold_percentage,
        check_interval=bot.check_interval,
        initial_coin=bot.initial_coin,
        account_id=str(bot.account_id),
        last_check_time=bot.last_check_time,
        active_trade_id=bot.active_trade_id
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
        active_trade_id=db_bot.active_trade_id
    )

@app.get("/api/bots")
def get_bots(db: Session = Depends(get_db)):
    """Get all configured bots"""
    try:
        print("in get bots")
        # Check if table exists
        from sqlalchemy import inspect
        inspector = inspect(db.get_bind())
        print(f"Tables in DB: {inspector.get_table_names()}")
        
        # Get all bots
        db_bots = db.query(DBBot).all()
        print(f"Found {len(db_bots)} bots")
        for bot in db_bots:
            print(f"Bot: {bot.name} (ID: {bot.id})")
        return [db_to_bot(bot) for bot in db_bots]
    except Exception as e:
        logger.error(f"Error getting bots: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/bots")
def create_bot(bot: Bot, db: Session = Depends(get_db)):
    """Create a new bot"""
    try:
        # Check for duplicate name
        if db.query(DBBot).filter(DBBot.name == bot.name).first():
            raise HTTPException(status_code=400, detail="Bot name already exists")
        
        db_bot = bot_to_db(bot)
        db.add(db_bot)
        db.commit()
        db.refresh(db_bot)
        return db_to_bot(db_bot)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating bot: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/bots/{bot_id}")
def update_bot(bot_id: int, bot: Bot, db: Session = Depends(get_db)):
    """Update bot configuration"""
    try:
        db_bot = db.query(DBBot).filter(DBBot.id == bot_id).first()
        if not db_bot:
            raise HTTPException(status_code=404, detail="Bot not found")
        
        # Update fields
        for key, value in bot.dict(exclude_unset=True).items():
            if key == 'coins':
                setattr(db_bot, key, ','.join(value))
            else:
                setattr(db_bot, key, value)
        
        db.commit()
        db.refresh(db_bot)
        return db_to_bot(db_bot)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating bot: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/bots/{bot_id}")
def delete_bot(bot_id: int, db: Session = Depends(get_db)):
    """Delete a bot"""
    try:
        db_bot = db.query(DBBot).filter(DBBot.id == bot_id).first()
        if not db_bot:
            raise HTTPException(status_code=404, detail="Bot not found")
        
        db.delete(db_bot)
        db.commit()
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Error deleting bot: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/bots/{bot_id}/toggle")
def toggle_bot(bot_id: int, db: Session = Depends(get_db)):
    """Toggle bot enabled/disabled state"""
    try:
        db_bot = db.query(DBBot).filter(DBBot.id == bot_id).first()
        if not db_bot:
            raise HTTPException(status_code=404, detail="Bot not found")
        
        db_bot.enabled = not db_bot.enabled
        db.commit()
        return {"enabled": db_bot.enabled}
    except Exception as e:
        logger.error(f"Error toggling bot: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/bots/{bot_id}/prices")
def get_bot_prices(
    bot_id: int,
    from_time: Optional[datetime] = None,
    to_time: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    """Get bot's price history"""
    try:
        query = db.query(DBPriceHistory).filter(DBPriceHistory.bot_id == bot_id)
        
        if from_time:
            query = query.filter(DBPriceHistory.timestamp >= from_time)
        if to_time:
            query = query.filter(DBPriceHistory.timestamp <= to_time)
        
        prices = query.order_by(DBPriceHistory.timestamp.desc()).limit(1000).all()
        return [PriceHistory.from_orm(p) for p in prices]
    except Exception as e:
        logger.error(f"Error getting bot prices: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/bots/{bot_id}/trades")
def get_bot_trades(
    bot_id: int,
    status: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get bot's trade history"""
    try:
        query = db.query(DBTrade).filter(DBTrade.bot_id == bot_id)
        
        if status:
            query = query.filter(DBTrade.status == status)
        
        trades = query.order_by(DBTrade.executed_at.desc()).limit(limit).all()
        return [Trade.from_orm(t) for t in trades]
    except Exception as e:
        logger.error(f"Error getting bot trades: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/bots/{bot_id}/state")
def get_bot_state(bot_id: int, db: Session = Depends(get_db)):
    """Get bot's current state"""
    try:
        bot = db.query(DBBot).filter(DBBot.id == bot_id).first()
        if not bot:
            raise HTTPException(status_code=404, detail="Bot not found")
        
        return {
            "current_coin": bot.current_coin,
            "last_check_time": bot.last_check_time,
            "active_trade_id": bot.active_trade_id
        }
    except Exception as e:
        logger.error(f"Error getting bot state: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/accounts")
def get_accounts(db: Session = Depends(get_db)):
    """Get available trading accounts"""
    try:
        print("\n=== Getting trading accounts ===")
        p3cw = get_3commas_client(db)
        
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
    except Exception as e:
        logger.error(f"Error getting accounts: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/config/system")
def get_system_config(db: Session = Depends(get_db)):
    """Get system configuration"""
    try:
        config = db.query(DBSystemConfig).first()
        if not config:
            config = DBSystemConfig()
            db.add(config)
            db.commit()
            db.refresh(config)
        return SystemConfig.from_orm(config)
    except Exception as e:
        logger.error(f"Error getting system config: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/config/system")
def update_system_config(config: SystemConfigCreate, db: Session = Depends(get_db)):
    """Update system configuration"""
    try:
        db_config = db.query(DBSystemConfig).first()
        if not db_config:
            db_config = DBSystemConfig()
            db.add(db_config)
        
        for key, value in config.dict().items():
            setattr(db_config, key, value)
        
        db.commit()
        db.refresh(db_config)
        return SystemConfig.from_orm(db_config)
    except Exception as e:
        logger.error(f"Error updating system config: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/config/api")
def get_api_configs(db: Session = Depends(get_db)):
    """Get API configurations"""
    try:
        configs = db.query(DBApiConfig).all()
        return {c.name: ApiConfig.from_orm(c) for c in configs}
    except Exception as e:
        logger.error(f"Error getting API configs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/config/api")
def update_api_config(name: str, config: ApiConfigCreate, db: Session = Depends(get_db)):
    """Update API configuration"""
    try:
        print("in api config")
        db_config = db.query(DBApiConfig).filter(DBApiConfig.name == name).first()
        if not db_config:
            db_config = DBApiConfig(name=name)
            db.add(db_config)
        
        for key, value in config.dict().items():
            setattr(db_config, key, value)
        
        db.commit()
        db.refresh(db_config)
        return ApiConfig.from_orm(db_config)
    except Exception as e:
        logger.error(f"Error updating API config: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

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
