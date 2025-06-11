import sys
import time
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from api.database import SessionLocal, Bot as DBBot, ApiConfig, Trade
from three_commas_client import ThreeCommasClient
from coingecko_client import CoinGeckoClient
from bot import Bot
from loguru import logger

def test_bot_swap():
    """Test the bot's swap functionality by simulating price changes."""
    db = SessionLocal()
    try:
        # Get API config
        api_config = db.query(ApiConfig).filter_by(name='3commas').first()
        if not api_config:
            raise ValueError("3commas API configuration not found in database")
        
        # Initialize API clients
        three_commas = ThreeCommasClient(
            api_key=api_config.api_key,
            api_secret=api_config.api_secret,
            mode=api_config.mode
        )
        coingecko = CoinGeckoClient()
        
        # Get test bot
        db_bot = db.query(DBBot).filter_by(name='Bot_2').first()
        if not db_bot:
            raise ValueError("Bot_2 not found in database")
            
        # Ensure initial coin is set to BTC
        if not db_bot.initial_coin or not db_bot.current_coin:
            db_bot.initial_coin = 'BTC'
            db_bot.current_coin = 'BTC'
            db.commit()
            logger.info(f"Set initial coin to {db_bot.initial_coin}")
        
        # Initialize bot instance
        bot = Bot(db_bot, three_commas, coingecko, db)
        logger.info(f"Bot current coin: {bot.current_coin}")
        
        # Set initial prices
        initial_prices = {
            'BTC': 30000.0,  # Base price in USD
            'SOL': 149.65,
            'ETH': 2768.43
        }
        logger.info(f"Initial prices: {initial_prices}")
        bot.update_prices(initial_prices, store_as_last=True)
        logger.info("Stored initial prices")
        
        # Wait a bit
        time.sleep(2)
        
        # Simulate price change by increasing ETH price by 15%
        new_prices = initial_prices.copy()
        new_prices['ETH'] *= 1.15  # 15% increase
        logger.info(f"Simulated new prices: {new_prices}")
        
        # Update with new prices but don't store as last prices
        bot.update_prices(new_prices, store_as_last=False)
        logger.info("Stored new prices")
        
        # Calculate price changes
        changes = bot.calculate_changes(new_prices)
        logger.info(f"Price changes: {changes}")
        
        # Find best swap opportunity
        target_coin = bot.find_best_swap(changes)
        if target_coin:
            logger.info(f"Swap opportunity detected: {bot.current_coin} → {target_coin}")
            
            # Create trade using bot's method
            trade_id = three_commas.create_smart_trade(
                account_id=bot.account_id,
                from_coin=bot.current_coin,
                to_coin=target_coin,
                amount=1.0,  # This should be configurable
                pair=f"{bot.current_coin}_{target_coin}"
            )
            
            if trade_id:
                # Store trade in database
                trade = Trade(
                    bot_id=bot.db_bot.id,
                    trade_id=trade_id,
                    from_coin=bot.current_coin,
                    to_coin=target_coin,
                    amount=1.0,
                    price_change=changes[target_coin],
                    status='pending'
                )
                db.add(trade)
                db.commit()
                
                logger.info(f"Created trade {trade_id}")
                
                # Monitor trade status using bot's method
                for _ in range(10):  # Check status for 10 iterations
                    status, price = three_commas.get_trade_status(trade_id)
                    logger.info(f"Trade status: {status}, Price: {price}")
                    
                    # Update trade status
                    trade = db.query(Trade).filter_by(trade_id=trade_id).first()
                    if trade and trade.status != status['type']:
                        trade.status = status['type']
                        db.commit()
                        logger.info(f"Updated trade {trade_id} status to {status['type']}")
                    
                    if status['type'] in ['completed', 'failed', 'cancelled']:
                        break
                        
                    time.sleep(5)  # Wait 5 seconds between checks
            else:
                logger.error("Failed to create trade")
        else:
            logger.info("No profitable swap opportunity found")
            
    finally:
        db.close()

if __name__ == "__main__":
    logger.add("logs/test_bot_swap.log", rotation="1 day")
    test_bot_swap()
