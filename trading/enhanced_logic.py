"""
Enhanced Trading Logic for Crypto Rebalancer
Implements the snapshot-based trading system with protection rules
"""
import os
import logging
from datetime import datetime
from sqlalchemy.orm import Session
from typing import Dict, Optional, List, Tuple

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import database models
from api.database import Bot, CoinSnapshot, PriceHistory, LogEntry, Trade

class EnhancedTradingLogic:
    """
    Implements the snapshot-based trading system with protection rules:
    1. Rule 1 (Deviation): Swap only if another coin dropped by X% or more relative to current
    2. Rule 2 (Re-entry): Only re-enter a coin if it gives more units than previously held
    3. Rule 3 (Global protection): No swap if below 90% of peak value
    """
    def __init__(self, db_session: Session, bot_id: int):
        """Initialize the enhanced trading logic"""
        self.db = db_session
        self.bot_id = bot_id
        self.bot = self._get_bot()
        self.coins = self._get_coins_list()
        
    def _get_bot(self) -> Bot:
        """Get the bot instance from the database"""
        bot = self.db.query(Bot).filter(Bot.id == self.bot_id).first()
        if not bot:
            raise ValueError(f"Bot with ID {self.bot_id} not found")
        return bot
    
    def _get_coins_list(self) -> List[str]:
        """Get the list of coins from the bot configuration"""
        if not self.bot.coins:
            return []
        return [coin.strip() for coin in self.bot.coins.split(",")]
    
    def initialize_snapshots(self, prices: Dict[str, float]) -> bool:
        """
        Create initial snapshots for all coins in the trading group
        
        Args:
            prices: Dictionary of current prices (coin -> price)
            
        Returns:
            bool: True if successful, False otherwise
        """
        # Check if we have a reference coin (ETH)
        reference_coin = self.bot.reference_coin or "ETH"
        reference_price = prices.get(reference_coin)
        
        if not reference_price:
            logger.error(f"Reference coin {reference_coin} price not available")
            return False
            
        logger.info(f"Initializing snapshots for bot {self.bot.name} with reference coin {reference_coin}")
        
        # Check which coin we currently hold
        current_coin = self.bot.current_coin
        if not current_coin:
            logger.warning("No current coin set for bot")
            return False
            
        # Create snapshots for all coins
        for coin in self.coins:
            if coin not in prices:
                logger.error(f"Price for {coin} not available")
                continue
                
            # Check if snapshot already exists
            existing = self.db.query(CoinSnapshot).filter(
                CoinSnapshot.bot_id == self.bot_id,
                CoinSnapshot.coin == coin
            ).first()
            
            if existing:
                logger.info(f"Snapshot for {coin} already exists, skipping")
                continue
                
            # Create new snapshot
            is_current = (coin == current_coin)
            snapshot = CoinSnapshot(
                bot_id=self.bot_id,
                coin=coin,
                initial_price=prices[coin],
                snapshot_timestamp=datetime.utcnow(),
                units_held=1.0 if is_current else 0.0,  # Start with 1.0 units of current coin
                eth_equivalent_value=(prices[coin] / reference_price) if is_current else 0.0,
                was_ever_held=is_current,
                max_units_reached=1.0 if is_current else 0.0
            )
            
            self.db.add(snapshot)
            logger.info(f"Created snapshot for {coin}: initial price {prices[coin]}")
        
        # Initialize global peak value if not set
        if not self.bot.global_peak_value or self.bot.global_peak_value == 0:
            current_price = prices.get(current_coin, 0)
            if current_price > 0:
                equivalent_value = current_price / reference_price
                self.bot.global_peak_value = equivalent_value
                self.bot.min_acceptable_value = equivalent_value * 0.9  # 90% of peak
                logger.info(f"Initialized global peak value to {equivalent_value} {reference_coin}")
            
        self.db.commit()
        return True
    
    def should_swap(self, prices: Dict[str, float]) -> Optional[str]:
        """
        Determine if a swap should occur based on the three rules
        
        Args:
            prices: Dictionary of current prices (coin -> price)
            
        Returns:
            Optional[str]: Symbol of coin to swap to, or None if no swap
        """
        # Check if we have necessary data
        if not self.bot.current_coin:
            logger.warning("No current coin set, cannot evaluate swap")
            return None
            
        current_coin = self.bot.current_coin
        reference_coin = self.bot.reference_coin or "ETH"
        
        if reference_coin not in prices:
            logger.error(f"Reference coin {reference_coin} price not available")
            return None
            
        if current_coin not in prices:
            logger.error(f"Current coin {current_coin} price not available")
            return None
        
        reference_price = prices[reference_coin]
        current_price = prices[current_coin]
        
        # Get current coin snapshot
        current_snapshot = self.db.query(CoinSnapshot).filter(
            CoinSnapshot.bot_id == self.bot_id, 
            CoinSnapshot.coin == current_coin
        ).first()
        
        if not current_snapshot:
            logger.error(f"No snapshot found for current coin {current_coin}")
            return None
        
        # Calculate current value in reference coin
        current_value = (current_price / reference_price) * current_snapshot.units_held
        
        # Rule 3 (Part 1): Update global peak if we've reached a new high
        if current_value > self.bot.global_peak_value:
            logger.info(f"New global peak reached: {current_value} {reference_coin}")
            self.bot.global_peak_value = current_value
            self.bot.min_acceptable_value = current_value * 0.9  # 90% of peak
            self.db.commit()
        
        # Find best coin to swap to based on deviation
        best_coin = None
        best_deviation = 0
        threshold = -abs(self.bot.threshold_percentage) / 100.0  # Convert percentage to decimal
        
        for coin in self.coins:
            if coin == current_coin:
                continue
                
            if coin not in prices:
                logger.warning(f"Price for {coin} not available, skipping")
                continue
                
            # Get snapshot for target coin
            target_snapshot = self.db.query(CoinSnapshot).filter(
                CoinSnapshot.bot_id == self.bot_id,
                CoinSnapshot.coin == coin
            ).first()
            
            if not target_snapshot:
                logger.warning(f"No snapshot for {coin}, skipping")
                continue
                
            # Calculate deviation using the formula:
            # deviation = (price_target_now / price_target_initial) / (price_current_now / price_current_initial) - 1
            try:
                deviation = ((prices[coin] / target_snapshot.initial_price) / 
                           (current_price / current_snapshot.initial_price)) - 1.0
            except ZeroDivisionError:
                logger.error(f"Division by zero when calculating deviation for {coin}")
                continue
            
            # Rule 1: Check if deviation meets threshold
            if deviation >= threshold:
                logger.debug(f"Coin {coin} deviation {deviation:.2%} does not meet threshold {threshold:.2%}")
                continue
                
            # Estimate units we would get after swap (simplified, no fees yet)
            estimated_units = (current_value * reference_price / prices[coin])
            
            # Rule 2: If coin was held before, only swap if we get more units
            if target_snapshot.was_ever_held and estimated_units <= target_snapshot.max_units_reached:
                logger.info(
                    f"Skipping {coin}: Would get {estimated_units:.6f} units, already had {target_snapshot.max_units_reached:.6f}"
                )
                continue
                
            # Estimate value after swap (with 1% fee estimation)
            fee_factor = 0.99  # Assuming 1% trading fee
            estimated_value = estimated_units * prices[coin] / reference_price * fee_factor
            
            # Rule 3 (Part 2): No swap if below minimum acceptable value
            if estimated_value < self.bot.min_acceptable_value:
                logger.info(
                    f"Skipping {coin}: Value {estimated_value:.6f} {reference_coin} below minimum {self.bot.min_acceptable_value:.6f}"
                )
                continue
                
            # This coin is a viable swap target - check if it's the best so far
            if best_coin is None or deviation < best_deviation:
                best_coin = coin
                best_deviation = deviation
                logger.info(f"New best swap candidate: {coin} with deviation {deviation:.2%}")
        
        return best_coin
    
    def update_after_swap(self, from_coin: str, to_coin: str, units_received: float, prices: Dict[str, float]) -> None:
        """
        Update snapshots and tracking after a successful swap
        
        Args:
            from_coin: The coin we swapped from
            to_coin: The coin we swapped to
            units_received: The number of units received
            prices: Dictionary of current prices
        """
        if not prices or to_coin not in prices:
            logger.error(f"Cannot update after swap: prices not available")
            return
            
        reference_coin = self.bot.reference_coin or "ETH"
        if reference_coin not in prices:
            logger.error(f"Reference coin {reference_coin} price not available")
            return
            
        # Update target coin snapshot
        target_snapshot = self.db.query(CoinSnapshot).filter(
            CoinSnapshot.bot_id == self.bot_id,
            CoinSnapshot.coin == to_coin
        ).first()
        
        if not target_snapshot:
            logger.error(f"No snapshot found for target coin {to_coin}")
            return
        
        # Update the snapshot
        target_snapshot.units_held = units_received
        target_snapshot.was_ever_held = True
        target_snapshot.eth_equivalent_value = (prices[to_coin] / prices[reference_coin]) * units_received
        
        if units_received > target_snapshot.max_units_reached:
            logger.info(f"New max units for {to_coin}: {units_received:.6f} (was {target_snapshot.max_units_reached:.6f})")
            target_snapshot.max_units_reached = units_received
        
        # Reset the units held for the source coin
        source_snapshot = self.db.query(CoinSnapshot).filter(
            CoinSnapshot.bot_id == self.bot_id,
            CoinSnapshot.coin == from_coin
        ).first()
        
        if source_snapshot:
            source_snapshot.units_held = 0.0
        
        # Update the bot's current coin
        self.bot.current_coin = to_coin
        
        # Log the swap
        LogEntry.log(
            self.db, 
            "INFO", 
            f"Swapped from {from_coin} to {to_coin}, received {units_received:.6f} units", 
            self.bot_id
        )
        
        # Commit the changes
        self.db.commit()
        
    def get_snapshot_status(self) -> Dict:
        """
        Get current status of all coin snapshots
        
        Returns:
            Dict: Status information including current values and deviations
        """
        result = {
            "current_coin": self.bot.current_coin,
            "global_peak": self.bot.global_peak_value,
            "min_acceptable": self.bot.min_acceptable_value,
            "snapshots": {},
        }
        
        # Get all snapshots
        snapshots = self.db.query(CoinSnapshot).filter(
            CoinSnapshot.bot_id == self.bot_id
        ).all()
        
        for snapshot in snapshots:
            result["snapshots"][snapshot.coin] = {
                "initial_price": snapshot.initial_price,
                "units_held": snapshot.units_held,
                "was_ever_held": snapshot.was_ever_held,
                "max_units": snapshot.max_units_reached,
                "equivalent_value": snapshot.eth_equivalent_value
            }
            
        return result
