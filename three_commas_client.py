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

    def get_market_prices(self, coins: List[str]) -> Dict[str, float]:
        """Get current market prices for the given coins using 3Commas API.
        
        Args:
            coins: List of coin symbols (e.g., "BTC", "ETH")
            
        Returns:
            Dictionary of coin symbols to USD prices
        """
        prices = {}
        
        # Try to get prices from 3Commas API
        try:
            # First try to get all cryptocurrency market pairs
            error, all_markets = self.client.request(
                entity='accounts',
                action='market_pairs'
            )
            
            if error:
                logger.warning(f"Failed to get market pairs: {error}")
                return prices
                
            # Attempt to get exchange tickers for the coins we're interested in
            for coin in coins:
                try:
                    # Look for pairs with USDT (most common stable pair)
                    pair = f"{coin}_USDT"
                    
                    # Make API call to get ticker info
                    error, ticker_data = self.client.request(
                        entity='accounts',
                        action='currency_rate',
                        payload={
                            'pair': pair
                        }
                    )
                    
                    if error:
                        logger.warning(f"Error getting price for {coin}: {error}")
                        continue
                        
                    # Extract last price from response
                    if ticker_data and isinstance(ticker_data, dict):
                        last_price = ticker_data.get('last')
                        if last_price:
                            try:
                                price_value = float(last_price)
                                if price_value > 0:
                                    prices[coin] = price_value
                                    logger.info(f"Got price for {coin}: {price_value}")
                                else:
                                    logger.warning(f"Zero or negative price for {coin}: {price_value}")
                            except (ValueError, TypeError) as e:
                                logger.warning(f"Invalid price format for {coin}: {e}")
                        else:
                            logger.warning(f"No 'last' price in response for {coin}")
                    else:
                        logger.warning(f"Invalid response for {coin}")
                            
                except Exception as e:
                    logger.error(f"Error processing {coin}: {str(e)}")
                    continue
                    
        except Exception as e:
            logger.error(f"Error fetching market data: {str(e)}")
            logger.debug(f"Full error: {repr(e)}")
            
        if not prices:
            logger.error("Failed to get any valid prices")
            
        return prices

    def execute_trade(self, from_coin: str, to_coin: str, account_id: str) -> Optional[str]:
        """Execute a trade between two coins."""
        self._rate_limit()
        
        logger.info(f"Preparing to execute trade: {from_coin} -> {to_coin}")
        logger.info(f"Mode: {'Paper' if self.mode == 'paper' else 'Real'} Trading")
        
        # Convert pair format (e.g., SOL_USDT -> SOLUSDT)
        from_pair = from_coin.replace('_', '')
        to_pair = to_coin.replace('_', '')
        
        # Prepare trade payload
        payload = {
            "account_id": account_id,
            "pair": from_pair,  # Base pair (e.g., SOLUSDT)
            "instant": True,  # Execute immediately
            "skip_enter_step": True,  # Skip confirmation
            "leverage": {
                "enabled": False,
                "type": "custom",
                "value": 1
            },
            "position": {
                "type": "sell",  # Sell the from_coin
                "order_type": "market",
                "units": {
                    "value": 100  # Amount in USD
                },
                "price": {
                    "value": 0  # Market price
                }
            },
            "take_profit": {
                "enabled": False
            },
            "stop_loss": {
                "enabled": False
            },
            "note": f"Rebalancing trade: {from_coin} -> {to_coin}"
        }
        
        logger.info(f"Sending trade request with payload: {payload}")
        
        error, data = self.client.request(
            entity="smart_trades_v2",
            action="new",
            payload=payload
        )

        if error:
            logger.error(f"Error creating smart trade: {error}")
            return None

        trade_id = data.get("id")
        if trade_id:
            logger.info(f"Trade successfully created with ID: {trade_id}")
        else:
            logger.error("Trade created but no ID returned")

        return trade_id

    def create_smart_trade(self, account_id: str, from_coin: str, to_coin: str, amount: float, pair: str) -> Optional[str]:
        """Create a smart trade."""
        try:
            error, data = self.client.request(
                entity='smart_trades_v2',
                action='new',
                payload={
                    'account_id': account_id,
                    'pair': pair,
                    'position': {
                        'type': 'buy',
                        'units': {
                            'value': amount
                        },
                        'order_type': 'market'
                    },
                    'take_profit': {
                        'enabled': 'false'  # We don't use take profit in rebalancing
                    },
                    'stop_loss': {
                        'enabled': 'false'  # We don't use stop loss in rebalancing
                    }
                }
            )
            if error:
                logger.error(f"Error creating smart trade: {error}")
                return None
                
            return data['id']
            
        except Exception as e:
            logger.error(f"Error creating smart trade: {e}")
            return None

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
