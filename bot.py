import os
import json
import time
import yaml
import schedule
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
from loguru import logger
from concurrent.futures import ThreadPoolExecutor
from three_commas_client import ThreeCommasClient
from analytics import BotAnalytics

class Bot:
    def __init__(self, name: str, config: Dict, three_commas: ThreeCommasClient):
        """Initialize an individual trading bot instance."""
        self.name = name
        self.config = config
        self.three_commas = three_commas
        self.enabled = config['enabled']
        self.coins = config['coins']
        self.threshold = config['threshold_percentage'] / 100
        self.check_interval = config['check_interval']
        self.account_id = config['account_id']
        self.current_coin = config.get('initial_coin')
        self.last_prices = {}
        self.last_check_time = None
        self.active_trade_id = None

    def should_check(self) -> bool:
        """Determine if it's time to check prices."""
        if not self.last_check_time:
            return True
        elapsed = (datetime.utcnow() - self.last_check_time).total_seconds()
        return elapsed >= (self.check_interval * 60)

    def update_prices(self, prices: Dict[str, float]) -> None:
        """Update current prices."""
        self.last_prices = prices
        self.last_check_time = datetime.utcnow()

    def calculate_changes(self, current_prices: Dict[str, float]) -> Dict[str, float]:
        """Calculate price changes for all coins relative to current holding."""
        if not self.current_coin or not self.last_prices:
            return {}

        changes = {}
        current_coin_price = current_prices[self.current_coin]
        last_coin_price = self.last_prices[self.current_coin]

        for coin in self.coins:
            if coin == self.current_coin:
                continue
            current_ratio = current_prices[coin] / current_coin_price
            last_ratio = self.last_prices[coin] / last_coin_price
            change = (current_ratio - last_ratio) / last_ratio
            changes[coin] = change

        return changes

    def find_best_swap(self, changes: Dict[str, float]) -> Optional[str]:
        """Find the best coin to swap to if threshold is met."""
        best_coin = None
        best_change = -float('inf')

        for coin, change in changes.items():
            if change > self.threshold and change > best_change:
                best_change = change
                best_coin = coin

        return best_coin

class CryptoRebalancer:
    def __init__(self, config_path: str = "config.yaml"):
        """Initialize the multi-bot rebalancing system."""
        self.load_config(config_path)
        self.setup_logging()
        self.setup_storage()
        
        # Initialize 3Commas client
        self.three_commas = ThreeCommasClient(
            api_key=self.config['3commas']['api_key'],
            api_secret=self.config['3commas']['api_secret'],
            mode=self.config['3commas']['mode']
        )
        
        # Initialize bots
        self.bots = {}
        self.setup_bots()
        
        # Initialize analytics
        self.analytics = {}
        self.setup_analytics()
        
        # Thread pool for parallel bot execution
        self.executor = ThreadPoolExecutor(max_workers=10)
        
        # Ensure required directories exist
        for dir_path in ['data', 'logs', 'data/bot_states', 'data/analytics']:
            Path(dir_path).mkdir(parents=True, exist_ok=True)

    def load_config(self, config_path: str) -> None:
        """Load configuration from YAML file."""
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)

    def setup_logging(self) -> None:
        """Configure logging with rotation."""
        log_config = self.config.get('logging', {})
        logger.add(
            log_config.get('file', 'logs/bot.log'),
            rotation=log_config.get('max_size', '10 MB'),
            retention=log_config.get('backup_count', 5),
            level=log_config.get('level', 'INFO')
        )

    def setup_storage(self) -> None:
        """Initialize storage directories."""
        self.state_dir = Path(self.config['storage']['state_dir'])
        self.state_dir.mkdir(parents=True, exist_ok=True)

    def setup_bots(self) -> None:
        """Initialize bot instances from configuration."""
        for bot_config in self.config['bots']:
            name = bot_config['name']
            if bot_config['enabled']:
                self.bots[name] = Bot(name, bot_config, self.three_commas)
                logger.info(f"Initialized bot: {name}")

    def setup_analytics(self) -> None:
        """Initialize analytics for each bot."""
        analytics_dir = self.config['storage']['analytics_dir']
        for bot_name in self.bots:
            self.analytics[bot_name] = BotAnalytics(bot_name, analytics_dir)

    def load_bot_state(self, bot_name: str) -> None:
        """Load state for a specific bot."""
        state_file = self.state_dir / f"{bot_name}_state.json"
        if state_file.exists():
            with open(state_file, 'r') as f:
                state = json.load(f)
                self.bots[bot_name].current_coin = state.get('current_coin')
                self.bots[bot_name].last_prices = state.get('last_prices', {})
                self.bots[bot_name].last_check_time = datetime.fromisoformat(
                    state['last_check_time']) if state.get('last_check_time') else None

    def save_bot_state(self, bot_name: str) -> None:
        """Save state for a specific bot."""
        bot = self.bots[bot_name]
        state = {
            'current_coin': bot.current_coin,
            'last_prices': bot.last_prices,
            'last_check_time': bot.last_check_time.isoformat() if bot.last_check_time else None
        }
        state_file = self.state_dir / f"{bot_name}_state.json"
        with open(state_file, 'w') as f:
            json.dump(state, f, indent=2)

    def check_and_rebalance_bot(self, bot_name: str) -> None:
        """Main rebalancing logic for a single bot."""
        bot = self.bots[bot_name]
        
        try:
            if not bot.should_check():
                return

            # Get current prices for all coins
            current_prices = self.three_commas.get_market_prices(bot.coins)
            if not current_prices:
                logger.error(f"[{bot_name}] Failed to get current prices")
                return

            # Update analytics
            self.analytics[bot_name].save_price_data(current_prices)

            # Calculate price changes
            changes = bot.calculate_changes(current_prices)
            
            # Find best swap opportunity
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
                    bot.active_trade_id = trade_id
                    # Record swap in analytics
                    self.analytics[bot_name].record_swap(
                        from_coin=bot.current_coin,
                        to_coin=target_coin,
                        price_change=changes[target_coin],
                        amount=1.0
                    )
                    # Update bot state
                    bot.current_coin = target_coin
                    bot.update_prices(current_prices)
                    self.save_bot_state(bot_name)
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
