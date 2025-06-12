import os
import time
import yaml
import schedule
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
from loguru import logger
from concurrent.futures import ThreadPoolExecutor
from sqlalchemy.orm import Session
from three_commas_client import ThreeCommasClient
from coingecko_client import CoinGeckoClient
from analytics import BotAnalytics
from api.database import SessionLocal, Bot as DBBot, PriceHistory, Trade, SystemConfig
from api.database import ApiConfig as DatabaseApiConfig  # Rename to avoid conflicts

class Bot:
    def __init__(self, db_bot: DBBot, three_commas: ThreeCommasClient, coingecko: CoinGeckoClient, db: Session):
        """Initialize an individual trading bot instance from database model."""
        self.db = db
        self.coingecko = coingecko
        self.three_commas = three_commas
        
        # Map database fields
        self.name = db_bot.name
        self.enabled = db_bot.enabled
        self.coins = db_bot.coins.split(',')
        self.threshold = db_bot.threshold_percentage / 100
        self.check_interval = db_bot.check_interval
        self.account_id = db_bot.account_id
        self.current_coin = db_bot.current_coin or db_bot.initial_coin
        self.last_check_time = db_bot.last_check_time
        self.active_trade_id = db_bot.active_trade_id
        self.db_bot = db_bot  # Keep reference to db model
        
        # Get latest prices
        latest_prices = db.query(PriceHistory).filter(
            PriceHistory.bot_id == db_bot.id
        ).order_by(PriceHistory.timestamp.desc()).limit(len(self.coins)).all()
        
        self.last_prices = {p.coin: p.price for p in latest_prices}

    def should_check(self) -> bool:
        """Determine if it's time to check prices."""
        if not self.last_check_time:
            return True
        elapsed = (datetime.utcnow() - self.last_check_time).total_seconds()
        return elapsed >= (self.check_interval * 60)

    def update_prices(self, prices: Dict[str, float], store_as_last: bool = True) -> None:
        """Update current prices in database.
        Args:
            prices: New prices to store
            store_as_last: If True, also update last_prices (default). Set to False when simulating.
        """
        current_time = datetime.utcnow()
        
        # Update bot's last check time
        self.last_check_time = current_time
        self.db_bot.last_check_time = current_time
        
        # Store prices in history
        for coin, price in prices.items():
            price_history = PriceHistory(
                bot_id=self.db_bot.id,
                coin=coin,
                price=price,
                timestamp=current_time
            )
            self.db.add(price_history)
        
        if store_as_last:
            self.last_prices = prices.copy()
            
        self.db.commit()

    def calculate_changes(self, current_prices: Dict[str, float]) -> Dict[str, float]:
        """Calculate price changes for all coins relative to current holding."""
        logger.info(f"Calculating changes for {self.current_coin} with prices: {current_prices}")
        logger.info(f"Last prices: {self.last_prices}")
        
        if not self.current_coin:
            logger.warning("No current coin set")
            return {}
            
        if not self.last_prices:
            logger.warning("No last prices available")
            return {}

        changes = {}
        current_coin_price = current_prices[self.current_coin]
        last_coin_price = self.last_prices[self.current_coin]
        
        logger.info(f"Current {self.current_coin} price: {current_coin_price}")
        logger.info(f"Last {self.current_coin} price: {last_coin_price}")

        for coin in self.coins:
            if coin == self.current_coin:
                continue
            current_ratio = current_prices[coin] / current_coin_price
            last_ratio = self.last_prices[coin] / last_coin_price
            change = (current_ratio - last_ratio) / last_ratio
            changes[coin] = change
            logger.info(f"{coin}: current ratio = {current_ratio}, last ratio = {last_ratio}, change = {change}")

        return changes

    def should_swap(self, price_changes: Dict[str, float]) -> Optional[str]:
        """Determine if we should swap to a different coin based on price changes."""
        current_coin = self.current_coin
        if not current_coin:
            return None
            
        # Find coin with highest price increase
        best_coin = None
        best_change = float('-inf')
        current_change = price_changes.get(current_coin, 0)
        
        logger.info(f"Current coin {current_coin} change: {current_change:.2f}%")
        
        for coin, change in price_changes.items():
            logger.info(f"Checking {coin}: {change:.2f}% change")
            if coin != current_coin and change > best_change:
                best_coin = coin
                best_change = change
                logger.info(f"New best coin: {coin} with {change:.2f}% change")
                
        # Check if the price difference exceeds threshold
        if best_coin:
            price_difference = best_change - current_change
            logger.info(f"Price difference: {price_difference:.2f}% (threshold: {self.threshold}%)")
            
            if price_difference > self.threshold:
                logger.info(f"Swap triggered: {current_coin} -> {best_coin} ({price_difference:.2f}% > {self.threshold}%)")
                return best_coin
            else:
                logger.info(f"No swap: difference {price_difference:.2f}% below threshold {self.threshold}%")
                
        return None

    def find_best_swap(self, changes: Dict[str, float]) -> Optional[str]:
        """Find the best coin to swap to if threshold is met."""
        best_coin = None
        best_change = -float('inf')

        for coin, change in changes.items():
            if change > self.threshold and change > best_change:
                best_change = change
                best_coin = coin

        return best_coin
        
    def check_active_trade(self) -> None:
        """Check status of active trade and update if completed."""
        if not self.active_trade_id:
            return
            
        status, price = self.three_commas.get_trade_status(self.active_trade_id)
        
        # Update trade status in database
        trade = self.db.query(Trade).filter_by(trade_id=self.active_trade_id).first()
        if trade and trade.status != status:
            trade.status = status
            self.db.commit()
            logger.info(f"Updated trade {self.active_trade_id} status to {status}")
        
        # Clear active trade if completed
        if status in ['completed', 'failed', 'cancelled']:
            self.active_trade_id = None
            self.db_bot.active_trade_id = None
            self.db.commit()

class CryptoRebalancer:
    def __init__(self):
        """Initialize the multi-bot rebalancing system."""
        self.db = SessionLocal()
        self.setup_logging()
        
        # Load API config and initialize clients
        api_config = self.db.query(DatabaseApiConfig).filter_by(name='3commas').first()
        if not api_config:
            raise ValueError("3commas API configuration not found in database")
            
        self.three_commas = ThreeCommasClient(
            api_key=api_config.api_key,
            api_secret=api_config.api_secret,
            mode=api_config.mode
        )
        self.coingecko = CoinGeckoClient()
        
        # Initialize other components
        self.setup_bots()
        self.setup_analytics()
        self.executor = ThreadPoolExecutor(max_workers=10)
        
        # Ensure required directories exist
        for dir_path in ['data', 'logs', 'data/analytics']:
            Path(dir_path).mkdir(parents=True, exist_ok=True)



    def setup_logging(self) -> None:
        """Configure logging with rotation."""
        logger.add(
            'logs/bot.log',
            rotation='1 day',
            retention='7 days',
            level='INFO'
        )

    def setup_bots(self) -> None:
        """Initialize bot instances from database."""
        self.bots = {}
        db_bots = self.db.query(DBBot).all()
        for db_bot in db_bots:
            self.bots[db_bot.name] = Bot(db_bot, self.three_commas, self.coingecko, self.db)
            logger.info(f"Initialized bot: {db_bot.name}")

    def setup_analytics(self) -> None:
        """Initialize analytics for each bot."""
        analytics_dir = Path('data/analytics')
        analytics_dir.mkdir(parents=True, exist_ok=True)
        self.analytics = {}
        for bot_name in self.bots:
            self.analytics[bot_name] = BotAnalytics(bot_name, analytics_dir)

    def load_bot_state(self, bot_name: str) -> None:
        """Load state for a specific bot - no longer needed as state is in DB."""
        pass

    def save_bot_state(self, bot_name: str) -> None:
        """Save state for a specific bot to database."""
        bot = self.bots[bot_name]
        db_bot = bot.db_bot
        
        # Update database model
        db_bot.current_coin = bot.current_coin
        db_bot.last_check_time = bot.last_check_time
        db_bot.active_trade_id = bot.active_trade_id

        self.db.commit()

    def check_and_rebalance_bot(self, bot_name: str) -> None:
        """Check and rebalance a single bot."""
        bot = self.bots[bot_name]
        try:
            if not bot.should_check():
                return
            
            # Check active trade status first
            if bot.active_trade_id:
                logger.info(f"[{bot_name}] Checking active trade {bot.active_trade_id}")
                bot.check_active_trade()
                return  # Don't look for new trades while one is active
            
            # Get current prices
            current_prices = bot.coingecko.get_market_prices(bot.coins)
            if not current_prices:
                logger.error(f"[{bot_name}] Failed to get current prices")
                return
                
            # Always update prices in database
            bot.update_prices(current_prices)
            logger.info(f"[{bot_name}] Updated prices in database")
            
            # Update analytics
            self.analytics[bot_name].save_price_data(current_prices)
            
            # Set initial coin if needed
            if not bot.current_coin and bot.db_bot.initial_coin:
                bot.current_coin = bot.db_bot.initial_coin
                bot.db_bot.current_coin = bot.db_bot.initial_coin
                self.db.commit()
                logger.info(f"[{bot_name}] Set initial coin to {bot.current_coin}")
            
            # Calculate changes and find best swap
            if bot.current_coin:
                changes = bot.calculate_changes(current_prices)
                target_coin = bot.find_best_swap(changes)
                
                if target_coin:
                    logger.info(f"[{bot_name}] Swap opportunity detected: {bot.current_coin} → {target_coin}")
                    
                    # Create smart trade
                    trade_id = self.three_commas.create_smart_trade(
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
                        self.db.add(trade)
                        
                        # Update bot state
                        bot.active_trade_id = trade_id
                        self.analytics[bot_name].record_swap(
                            from_coin=bot.current_coin,
                            to_coin=target_coin,
                            price_change=changes[target_coin],
                            amount=1.0
                        )
                        bot.current_coin = target_coin
                        bot.db_bot.current_coin = target_coin
                        
                        # Save all changes
                        self.db.commit()
                        logger.info(f"[{bot_name}] Swap completed and state updated")
                        
        except Exception as e:
            logger.error(f"[{bot_name}] Error in rebalancing cycle: {e}")

    def run(self) -> None:
        """Run all bots with scheduled checks."""
        logger.info("Starting Crypto Rebalancing System...")

        
        # Load saved states
        for bot_name in self.bots:
            self.load_bot_state(bot_name)
        
        def check_all_bots():
            """Check and rebalance all bots in parallel."""
            futures = []
            for bot_name in self.bots:
                if self.bots[bot_name].enabled:
                    futures.append(
                        self.executor.submit(self.check_and_rebalance_bot, bot_name)
                    )
            for future in futures:
                future.result()  # Wait for all bots to complete

        # Schedule regular checks
        schedule.every(1).minutes.do(check_all_bots)
        
        try:
            while True:
                schedule.run_pending()
                time.sleep(1)
        except KeyboardInterrupt:
            logger.info("Shutting down...")
            self.executor.shutdown()

if __name__ == "__main__":
    rebalancer = CryptoRebalancer()
    rebalancer.run()
