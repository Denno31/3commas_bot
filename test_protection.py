import os
import time
import datetime
from loguru import logger
from sqlalchemy.orm import Session

from api.database import SessionLocal, Bot as DBBot, CoinUnitTracker, PriceHistory
from bot import Bot, CryptoRebalancer
from three_commas_client import ThreeCommasClient
from coingecko_client import CoinGeckoClient

# Configure logging
logger.remove()
logger.add(lambda msg: print(msg), level="INFO")

def main():
    """Test the 3-layer protection system with simulated scenarios."""
    print("Testing 3-layer protection system...")
    
    # Initialize database session
    db = SessionLocal()
    
    # Get the first bot from the database or create a test bot
    db_bot = db.query(DBBot).first()
    if not db_bot:
        print("No bot found in database. Please create one first.")
        return
    
    print(f"Testing with bot: {db_bot.name}")
    
    # Create dummy clients (we'll mock their behavior)
    three_commas = ThreeCommasClient("dummy", "dummy")
    coingecko = CoinGeckoClient()
    
    # Create bot instance
    bot = Bot(db_bot, three_commas, coingecko, db)
    
    # Define test coins and prices
    coins = bot.coins
    print(f"Bot is configured with coins: {coins}")
    
    if not coins or len(coins) < 3:
        print("Bot needs at least 3 coins for meaningful tests")
        return
    
    # Test 1: Per-coin unit protection
    print("\n=== TEST 1: PER-COIN UNIT PROTECTION ===")
    
    # Set up initial state
    current_coin = coins[0]
    target_coin = coins[1]
    bot.current_coin = current_coin
    
    # Initial prices
    prices = {coin: 100.0 for coin in coins}
    bot.update_prices(prices)
    
    print(f"Current coin: {current_coin}")
    print(f"Target coin: {target_coin}")
    
    # Store previous unit amount for target coin (e.g. 10 units)
    previous_units = 10.0
    bot.update_held_units(target_coin, previous_units)
    print(f"Saved previous units for {target_coin}: {previous_units}")
    
    # Scenario 1A: Try to swap with fewer units (should be rejected)
    print("\nScenario 1A: Target would give fewer units (should REJECT)")
    
    # Update prices to create a situation where we'd get fewer units
    prices[target_coin] = 150.0  # Price increased, so would get fewer units
    bot.update_prices(prices, store_as_last=False)  # Don't update last_prices yet
    
    # Calculate how many units we'd get
    estimated_units = bot.estimate_units_to_receive(current_coin, target_coin, 1.0, prices)
    print(f"Would receive {estimated_units:.2f} units (previous: {previous_units:.2f})")
    
    # Try to find best swap
    changes = {coin: 0.1 for coin in coins if coin != current_coin}  # All coins 10% "better"
    changes[target_coin] = 0.2  # Target coin 20% "better"
    
    result = bot.find_best_swap(changes)
    if result is None:
        print("✅ PASS: Swap was correctly rejected due to unit protection")
    else:
        print(f"❌ FAIL: Swap was incorrectly allowed to {result}")
    
    # Scenario 1B: Try to swap with more units (should be allowed)
    print("\nScenario 1B: Target would give more units (should ALLOW)")
    
    # Update prices to create a situation where we'd get more units
    prices[target_coin] = 50.0  # Price decreased, so would get more units
    bot.update_prices(prices, store_as_last=True)  # Update last_prices
    
    # Calculate how many units we'd get
    estimated_units = bot.estimate_units_to_receive(current_coin, target_coin, 1.0, prices)
    print(f"Would receive {estimated_units:.2f} units (previous: {previous_units:.2f})")
    
    # Try to find best swap
    result = bot.find_best_swap(changes)
    if result == target_coin:
        print(f"✅ PASS: Swap was correctly allowed to {result}")
    else:
        print(f"❌ FAIL: Swap was incorrectly rejected, got {result}")
    
    # Test 2: Global accumulated profit protection
    print("\n=== TEST 2: GLOBAL PROFIT PROTECTION ===")
    
    # Set up the test with a simulated peak portfolio value
    bot.reference_coin = coins[0]
    bot.max_global_equivalent = 2.0  # We've doubled our portfolio at peak
    bot.global_threshold = 0.1  # 10% maximum allowed loss
    
    print(f"Current global maximum: {bot.max_global_equivalent} {bot.reference_coin}")
    print(f"Maximum allowed loss: {bot.global_threshold*100:.0f}%")
    
    # Scenario 2A: Try a swap that loses too much global value (should reject)
    print("\nScenario 2A: Would lose too much global value (should REJECT)")
    
    # Set a different current coin
    current_coin = coins[1]
    target_coin = coins[2]
    bot.current_coin = current_coin
    
    # Create a situation where global value would drop too much
    prices = {coin: 100.0 for coin in coins}
    prices[target_coin] = 50.0  # Target coin is cheap
    
    # But after conversion to reference coin, it's worth much less
    prices[bot.reference_coin] = 200.0  # Reference coin has gone up a lot
    bot.update_prices(prices)
    
    # Calculate global equivalent for the target position
    amount = 2.0  # We'd get 2.0 units of the target
    global_value = bot.calculate_global_equivalent(target_coin, amount, prices)
    min_required = bot.max_global_equivalent * (1 - bot.global_threshold)
    
    print(f"Global value would be {global_value:.2f} (minimum required: {min_required:.2f})")
    
    # Try to find best swap
    changes = {coin: 0.1 for coin in coins if coin != current_coin}
    changes[target_coin] = 0.2  # Target coin 20% "better"
    
    result = bot.find_best_swap(changes)
    if result is None:
        print("✅ PASS: Swap was correctly rejected due to global value protection")
    else:
        print(f"❌ FAIL: Swap was incorrectly allowed to {result}")
    
    # Scenario 2B: Try a swap that preserves enough value (should allow)
    print("\nScenario 2B: Preserves enough global value (should ALLOW)")
    
    # Adjust prices so global value is preserved
    prices[bot.reference_coin] = 100.0  # Reference coin back to normal
    prices[target_coin] = 80.0  # Still a good deal
    bot.update_prices(prices)
    
    # Recalculate global value
    amount = 1.25  # We'd get more units of the target
    global_value = bot.calculate_global_equivalent(target_coin, amount, prices)
    min_required = bot.max_global_equivalent * (1 - bot.global_threshold)
    
    print(f"Global value would be {global_value:.2f} (minimum required: {min_required:.2f})")
    
    # Try to find best swap
    result = bot.find_best_swap(changes)
    if result == target_coin:
        print(f"✅ PASS: Swap was correctly allowed to {result}")
    else:
        print(f"❌ FAIL: Swap was incorrectly rejected, got {result}")
    
    print("\nTesting complete!")
    
if __name__ == "__main__":
    main()
