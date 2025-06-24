import os
import sys
import datetime
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Import database models
from api.database import (
    Bot as DBBot,
    PriceHistory,
    CoinUnitTracker,
    ApiConfig,
    SystemConfig
)

# Get the database path
db_path = os.path.join(os.path.dirname(__file__), 'data', 'crypto_rebalancer.db')
if not os.path.exists(db_path):
    print(f"Database not found at: {db_path}")
    sys.exit(1)

# Connect to database
DATABASE_URL = f"sqlite:///{db_path}"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

def seed_test_data():
    """Seed the database with test data for protection system testing."""
    print(f"Seeding test data in database: {db_path}")
    
    # Check if we already have a bot
    existing_bot = db.query(DBBot).first()
    
    # Create a test bot if none exists
    if not existing_bot:
        print("Creating test bot...")
        test_bot = DBBot(
            name="Test Protection Bot",
            enabled=True,
            coins="BTC,ETH,ADA,DOT,LINK,XRP,LTC,SOL,AVAX,MATIC",
            threshold_percentage=5.0,
            check_interval=300,  # 5 minutes
            initial_coin="BTC",
            current_coin="BTC",
            account_id=12345,  # Dummy ID
            reference_coin="BTC",  # Use BTC as reference coin
            max_global_equivalent=1.0,  # Start with baseline
            global_threshold_percentage=10.0,  # 10% maximum loss
            price_source="three_commas",  # Default to three_commas as requested
            created_at=datetime.datetime.utcnow(),
            updated_at=datetime.datetime.utcnow()
        )
        db.add(test_bot)
        db.commit()
        bot_id = test_bot.id
        print(f"Created test bot with ID: {bot_id}")
    else:
        bot_id = existing_bot.id
        print(f"Using existing bot with ID: {bot_id}")
        
        # Update the bot with our protection fields if they're NULL
        if existing_bot.reference_coin is None:
            existing_bot.reference_coin = existing_bot.initial_coin or "BTC"
        if existing_bot.max_global_equivalent is None:
            existing_bot.max_global_equivalent = 1.0
        if existing_bot.global_threshold_percentage is None:
            existing_bot.global_threshold_percentage = 10.0
        db.commit()
    
    # Add some sample coin unit tracking data
    print("Adding sample coin unit tracking data...")
    
    # Define the coins from the bot
    coins = existing_bot.coins.split(',') if existing_bot else "BTC,ETH,ADA,DOT,LINK,XRP,LTC,SOL,AVAX,MATIC".split(',')
    
    # Sample unit amounts (arbitrary values for testing)
    unit_amounts = {
        "BTC": 0.05,
        "ETH": 1.2,
        "ADA": 1000,
        "DOT": 100,
        "LINK": 150,
        "XRP": 500,
        "LTC": 10,
        "SOL": 20,
        "AVAX": 30,
        "MATIC": 1500
    }
    
    # Add or update coin unit trackers
    for coin in coins:
        if coin in unit_amounts:
            # Check if tracker already exists
            tracker = db.query(CoinUnitTracker).filter(
                CoinUnitTracker.bot_id == bot_id,
                CoinUnitTracker.coin == coin
            ).first()
            
            if tracker:
                tracker.units = unit_amounts[coin]
                tracker.last_updated = datetime.datetime.utcnow()
                print(f"Updated {coin} unit tracker: {unit_amounts[coin]} units")
            else:
                tracker = CoinUnitTracker(
                    bot_id=bot_id,
                    coin=coin,
                    units=unit_amounts[coin],
                    last_updated=datetime.datetime.utcnow()
                )
                db.add(tracker)
                print(f"Created {coin} unit tracker: {unit_amounts[coin]} units")
    
    # Add some sample price history
    print("Adding sample price history data...")
    
    # Sample prices in USD (arbitrary values for testing)
    current_prices = {
        "BTC": 60000,
        "ETH": 3000,
        "ADA": 1.5,
        "DOT": 20,
        "LINK": 15,
        "XRP": 0.8,
        "LTC": 200,
        "SOL": 150,
        "AVAX": 80,
        "MATIC": 1.2
    }
    
    # Get the most recent price entry
    latest_price = db.query(PriceHistory).order_by(PriceHistory.timestamp.desc()).first()
    
    # Only add new prices if there are none or the latest is more than a day old
    if not latest_price or (datetime.datetime.utcnow() - latest_price.timestamp).days >= 1:
        timestamp = datetime.datetime.utcnow()
        
        for coin, price in current_prices.items():
            price_history = PriceHistory(
                coin=coin,
                price_usd=price,
                timestamp=timestamp
            )
            db.add(price_history)
            print(f"Added price for {coin}: ${price}")
    else:
        print("Recent price history already exists, skipping...")
    
    # Commit all changes
    db.commit()
    print("Database seeding completed successfully!")

if __name__ == "__main__":
    seed_test_data()
