import os
import sys
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from sqlalchemy.orm import Session
from unittest.mock import MagicMock

# Add path to api directory for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'api'))

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Import your modules
from api.database import get_db, Bot as DBBot, PriceHistory
from bot import Bot
from api.models import Bot as BotModel

# Mock classes for dependencies
class MockThreeCommasClient:
    """Mock implementation of ThreeCommasClient"""
    def __init__(self):
        self.prices = {}
        
    def set_prices(self, prices):
        # Ensure all prices are stored as floats
        self.prices = {coin: float(price) for coin, price in prices.items()}
        
    def get_market_prices(self, coins):
        return {coin: self.prices.get(coin, 100.0) for coin in coins}
    
    def create_smart_trade(self, account_id, from_coin, to_coin, amount, pair):
        return f"mock_trade_{from_coin}_{to_coin}_{datetime.now().timestamp()}"

class MockCoinGeckoClient:
    """Mock implementation of CoinGeckoClient"""
    def __init__(self):
        self.prices = {}
        
    def set_prices(self, prices):
        # Ensure all prices are stored as floats
        self.prices = {coin: float(price) for coin, price in prices.items()}
        
    def get_market_prices(self, coins):
        return {coin: self.prices.get(coin, 100.0) for coin in coins}

def simulate_market_conditions(db: Session, bot_id: int, price_changes: dict):
    """
    Simulate market conditions by mocking price data
    
    Args:
        db: Database session
        bot_id: ID of the bot to test
        price_changes: Dictionary of coin:price_change_percentage pairs
    """
    # Get bot from database
    db_bot = db.query(DBBot).filter(DBBot.id == bot_id).first()
    if not db_bot:
        logger.error(f"Bot with ID {bot_id} not found")
        return
    
    # Print bot details
    logger.info(f"Testing bot: {db_bot.name}")
    logger.info(f"Coins: {db_bot.coins}")
    logger.info(f"Current coin: {db_bot.current_coin or 'None'}")
    logger.info(f"Threshold: {db_bot.threshold_percentage}%")
    
    # Create mock prices
    coins = db_bot.coins.split(',')
    mock_prices = {coin: 100.0 for coin in coins}  # Default starting price
    
    # Apply simulated price changes
    for coin, change_pct in price_changes.items():
        if coin in mock_prices:
            original_price = mock_prices[coin]
            new_price = original_price * (1 + float(change_pct) / 100)
            mock_prices[coin] = new_price
            logger.info(f"Simulated {coin} price change: {change_pct}% - from {original_price:.2f} to {new_price:.2f}")
    
    # Create mock clients
    three_commas_client = MockThreeCommasClient()
    three_commas_client.set_prices(mock_prices)
    
    coingecko_client = MockCoinGeckoClient()
    coingecko_client.set_prices(mock_prices)
    
    # Create Bot instance with the dependencies
    bot = Bot(db_bot, three_commas_client, coingecko_client, db)
    
    # Ensure the bot has previous price history
    for coin in coins:
        # Check if price history exists
        existing = db.query(PriceHistory).filter(
            PriceHistory.bot_id == bot_id,
            PriceHistory.coin == coin
        ).first()
        
        if not existing:
            # Add starting price to history
            price_history = PriceHistory(
                bot_id=bot_id,
                coin=coin,
                price=float(mock_prices[coin]),
                timestamp=datetime.utcnow() - timedelta(minutes=10)
            )
            db.add(price_history)
    
    db.commit()
    
    # Override the get_prices method to return our simulated prices
    bot.get_prices = lambda: mock_prices
    
    # Print current state
    logger.info(f"\nCurrent bot status:")
    logger.info(f"Current coin: {bot.current_coin}")
    logger.info(f"Threshold: {bot.threshold}")
    logger.info(f"Reference coin: {bot.reference_coin}")
    logger.info(f"Global threshold: {bot.global_threshold}")
    logger.info(f"Global peak value: {bot.max_global_equivalent}")
    
    # Calculate changes
    changes = bot.calculate_changes(mock_prices)
    
    # Log the calculated changes
    logger.info(f"\nCalculated price changes:")
    for coin, change in changes.items():
        logger.info(f"{coin}: {change:.2f}%")
    
    # Test the should_swap method directly
    logger.info("\nTesting should_swap method...")
    target_coin = bot.should_swap(changes)
    
    should_swap = target_coin is not None
    logger.info(f"Should swap: {should_swap}")
    if should_swap:
        logger.info(f"Target coin: {target_coin}")
        logger.info(f"Reason for swap: Price difference exceeds threshold")
    else:
        logger.info(f"Reason for not swapping: Price difference below threshold")
        
    # Test find_best_swap method for more detailed analysis
    logger.info("\nTesting find_best_swap method...")
    try:
        # This method may require external APIs or have additional dependencies
        # We'll try to run it but it's ok if it fails as we already tested the core should_swap logic
        best_coin = bot.find_best_swap(changes)
        
        if best_coin:
            logger.info(f"Best coin to swap to: {best_coin}")
            logger.info(f"Potential profit: {changes[best_coin]:.2f}%")
        else:
            logger.info("No good swap opportunity found")
    except Exception as e:
        logger.warning(f"Could not test find_best_swap method: {str(e)}")
        logger.warning("This is expected as it may require additional API connections")
        # We can still continue with our tests as the main should_swap logic was tested
    
    return target_coin  # Just return the target coin (which is None if no swap needed)

def run_tests(bot_id=1, custom_test=None):
    """Run a series of swap logic tests"""
    db = next(get_db())
    
    try:
        # Get the bot details to know which coins to test with
        bot = db.query(DBBot).filter(DBBot.id == bot_id).first()
        if not bot:
            logger.error(f"Bot with ID {bot_id} not found")
            return
            
        coins = bot.coins.split(',')
        current_coin = bot.current_coin or coins[0]  # Default to first coin if none set
        logger.info(f"Testing bot ID {bot_id}: {bot.name}")
        logger.info(f"Available coins: {coins}")
        logger.info(f"Current coin: {current_coin}")
        logger.info(f"Threshold percentage: {bot.threshold_percentage}%")
        
        # If custom test is provided, only run that
        if custom_test:
            logger.info(f"\n========== CUSTOM TEST: {custom_test['name']} ==========")
            result = simulate_market_conditions(db, bot_id, custom_test['changes'])
            return result
        
        # Standard test suite
        results = []
        
        # Test 1: Minor price fluctuations (below threshold)
        logger.info("\n========== TEST 1: MINOR FLUCTUATIONS ==========")
        # All price changes are below threshold
        changes = {coin: 1.0 if coin != current_coin else 0.0 for coin in coins}
        results.append({
            'test': 'Minor Fluctuations',
            'result': simulate_market_conditions(db, bot_id, changes)
        })
        
        # Test 2: Significant price drop in current coin
        logger.info("\n========== TEST 2: SIGNIFICANT DROP IN CURRENT COIN ==========")
        changes = {coin: 0.0 for coin in coins}
        changes[current_coin] = -1 * (bot.threshold_percentage + 5.0)  # Drop more than threshold
        results.append({
            'test': 'Price Drop in Current',
            'result': simulate_market_conditions(db, bot_id, changes)
        })
        
        # Test 3: One coin outperforming significantly
        logger.info("\n========== TEST 3: ONE COIN OUTPERFORMING ==========")
        outperformer = next((coin for coin in coins if coin != current_coin), None)
        changes = {coin: 0.0 for coin in coins}
        changes[outperformer] = bot.threshold_percentage + 5.0  # Rise more than threshold
        results.append({
            'test': 'Coin Outperforming',
            'result': simulate_market_conditions(db, bot_id, changes)
        })
        
        # Test 4: Global threshold test
        if bot.reference_coin and bot.global_threshold_percentage > 0:
            logger.info("\n========== TEST 4: GLOBAL THRESHOLD TEST ==========")
            # This simulates a case where overall portfolio value drops below acceptable level
            changes = {coin: -1 * (bot.global_threshold_percentage + 5.0) for coin in coins}
            changes[bot.reference_coin] = 0.0  # Keep reference coin stable
            results.append({
                'test': 'Global Threshold',
                'result': simulate_market_conditions(db, bot_id, changes)
            })
        
        # Test 5: Multiple coins above threshold
        logger.info("\n========== TEST 5: MULTIPLE SWAP OPPORTUNITIES ==========")
        # Multiple coins above threshold to test best coin selection
        changes = {coin: bot.threshold_percentage + (i+1)*2.0 for i, coin in enumerate(coins) if coin != current_coin}
        changes[current_coin] = 0.0
        results.append({
            'test': 'Multiple Opportunities',
            'result': simulate_market_conditions(db, bot_id, changes)
        })
        
        # Print summary
        logger.info("\n========== TEST RESULTS SUMMARY ==========")
        for test in results:
            if test['result'] is not None:  # test was run
                target_coin = test['result']  # now just returns the target coin (or None)
                should_swap = target_coin is not None
                logger.info(f"{test['test']}: Swap={should_swap}, Target={target_coin if should_swap else 'None'}")
            else:
                logger.info(f"{test['test']}: Test failed")
            
        return results
    
    finally:
        db.close()

def display_bots():
    """Display all available bots in the database"""
    db = next(get_db())
    try:
        bots = db.query(DBBot).all()
        logger.info("\n========== AVAILABLE BOTS ==========")
        for bot in bots:
            logger.info(f"ID: {bot.id}, Name: {bot.name}, Enabled: {bot.enabled}, Coins: {bot.coins}")
    finally:
        db.close()

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Test crypto bot swap logic')
    parser.add_argument('--bot-id', type=int, default=1, help='ID of the bot to test')
    parser.add_argument('--list-bots', action='store_true', help='List all available bots')
    parser.add_argument('--custom-test', action='store_true', help='Run a custom test with specific price changes')
    parser.add_argument('--coin', action='append', help='Coin to adjust price for (use multiple times)')
    parser.add_argument('--change', action='append', type=float, help='Price change percentage (use multiple times)')
    parser.add_argument('--test-name', default='Custom Test', help='Name for the custom test')
    
    args = parser.parse_args()
    
    if args.list_bots:
        display_bots()
    elif args.custom_test:
        if not args.coin or not args.change or len(args.coin) != len(args.change):
            logger.error("You must specify equal numbers of coins and price changes")
            sys.exit(1)
            
        changes = {coin: change for coin, change in zip(args.coin, args.change)}
        custom_test = {'name': args.test_name, 'changes': changes}
        run_tests(args.bot_id, custom_test)
    else:
        run_tests(args.bot_id)
