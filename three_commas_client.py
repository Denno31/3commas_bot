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
        """Get current market prices for the given pairs using 3Commas API."""
        prices = {}
        
        try:
            for pair in pairs:
                try:
                    # Convert SOL_USDT to SOLUSDT format
                    market_code = pair.replace('_', '')
                    
                    # Create a dummy smart trade to get market info
                    error, data = self.client.request(
                        entity='smart_trades_v2',
                        action='get_market_prices',
                        payload={
                            'market_code': market_code,
                            'account_id': '0'  # Dummy account ID for paper trading
                        }
                    )
                    
                    if error:
                        logger.warning(f"Error getting price for {pair}: {error}")
                        continue
                        
                    if not data or not isinstance(data, dict):
                        logger.warning(f"Invalid response for {pair}")
                        continue
                    
                    # Extract price from response
                    bid = data.get('bid')
                    ask = data.get('ask')
                    
                    if bid and ask:
                        try:
                            # Use average of bid and ask
                            price_value = (float(bid) + float(ask)) / 2
                            if price_value > 0:
                                prices[pair] = price_value
                                logger.info(f"Got price for {pair}: {price_value}")
                            else:
                                logger.warning(f"Zero or negative price for {pair}: {price_value}")
                        except (ValueError, TypeError) as e:
                            logger.warning(f"Invalid price format for {pair}: {e}")
                    else:
                        logger.warning(f"No bid/ask data in response for {pair}")
                        
                except Exception as e:
                    logger.error(f"Error processing {pair}: {str(e)}")
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
