from typing import Dict, List, Optional, Tuple
from py3cw.request import Py3CW
from loguru import logger
import time

class ThreeCommasClient:
    def __init__(self, api_key: str, api_secret: str, mode: str = "paper"):
        """Initialize 3Commas API client."""
        self.client = Py3CW(
            key=api_key,
            secret=api_secret,
            request_options={
                'request_timeout': 10,
                'nr_of_retries': 3
            }
        )
        self.mode = mode
        self._last_request_time = 0
        self._min_request_interval = 0.2  # 200ms between requests to avoid rate limits

    def _rate_limit(self):
        """Ensure we don't exceed rate limits."""
        current_time = time.time()
        time_since_last = current_time - self._last_request_time
        if time_since_last < self._min_request_interval:
            time.sleep(self._min_request_interval - time_since_last)
        self._last_request_time = time.time()

    def get_accounts(self) -> List[Dict]:
        """Get all accounts."""
        self._rate_limit()
        error, data = self.client.request(
            entity="accounts",
            action=""
        )
        if error:
            logger.error(f"Error getting accounts: {error}")
            return []
        return data

    def get_market_prices(self, pairs: List[str]) -> Dict[str, float]:
        """Get current market prices for the given pairs."""
        prices = {}
        
        for pair in pairs:
            try:
                error, data = self.client.request(
                    entity='marketplace',
                    action='currency_rates',
                    payload={
                        'market_code': pair
                    }
                )
                
                if error:
                    logger.error(f"Error getting market price for {pair}: {error}")
                    continue
                    
                if data and len(data) > 0:
                    price = float(data[0].get('last', 0))
                    if price > 0:
                        prices[pair] = price
                        
            except Exception as e:
                logger.error(f"Error processing {pair}: {e}")
                continue
                
        return prices

    def create_smart_trade(self, account_id: str, from_coin: str, to_coin: str, 
                         amount: float, pair: str) -> Optional[str]:
        """Create a smart trade to swap between coins."""
        self._rate_limit()
        
        # Prepare the smart trade parameters
        payload = {
            "account_id": account_id,
            "pair": pair,  # e.g., "BTC_USDT"
            "position": {
                "type": "buy",
                "units": {"value": amount},
                "order_type": "market"
            }
        }

        error, data = self.client.request(
            entity="smart_trades_v2",
            action="new",
            payload=payload
        )

        if error:
            logger.error(f"Error creating smart trade: {error}")
            return None

        return data.get("id")

    def get_trade_status(self, trade_id: str) -> Tuple[str, Optional[float]]:
        """Get the status of a smart trade."""
        self._rate_limit()
        error, data = self.client.request(
            entity="smart_trades_v2",
            action="get_by_id",
            action_id=str(trade_id)
        )

        if error:
            logger.error(f"Error getting trade status: {error}")
            return "error", None

        status = data.get("status", "unknown")
        filled_price = data.get("filled_price")
        
        return status, filled_price if filled_price else None

    def cancel_trade(self, trade_id: str) -> bool:
        """Cancel a smart trade."""
        self._rate_limit()
        error, data = self.client.request(
            entity="smart_trades_v2",
            action="cancel",
            action_id=str(trade_id)
        )

        if error:
            logger.error(f"Error canceling trade: {error}")
            return False

        return True
