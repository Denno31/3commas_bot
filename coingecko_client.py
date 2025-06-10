from typing import Dict, List
from pycoingecko import CoinGeckoAPI
from loguru import logger
import time

class CoinGeckoClient:
    def __init__(self):
        """Initialize CoinGecko API client."""
        self.client = CoinGeckoAPI()
        self.id_cache = {}  # Cache for coin IDs
        self._last_call = 0
        self._rate_limit = 1.5  # Rate limit in seconds

    def _rate_limit_wait(self):
        """Implement rate limiting."""
        now = time.time()
        time_since_last = now - self._last_call
        if time_since_last < self._rate_limit:
            time.sleep(self._rate_limit - time_since_last)
        self._last_call = time.time()

    def _get_coin_id(self, symbol: str) -> str:
        """Get CoinGecko coin ID from symbol."""
        if symbol in self.id_cache:
            return self.id_cache[symbol]

        try:
            self._rate_limit_wait()
            coin_list = self.client.get_coins_list()
            for coin in coin_list:
                if coin['symbol'].upper() == symbol.upper():
                    self.id_cache[symbol] = coin['id']
                    return coin['id']
        except Exception as e:
            logger.error(f"Error getting coin ID for {symbol}: {e}")
        return None

    def get_market_prices(self, pairs: List[str]) -> Dict[str, float]:
        """Get current market prices for the given pairs using CoinGecko API."""
        prices = {}
        
        try:
            # Extract base currencies (e.g., BTC from BTC_USDT)
            symbols = [pair.split('_')[0] for pair in pairs]
            
            # Get coin IDs for all symbols
            coin_ids = []
            for symbol in symbols:
                coin_id = self._get_coin_id(symbol)
                if coin_id:
                    coin_ids.append(coin_id)
                else:
                    logger.warning(f"Could not find CoinGecko ID for {symbol}")
            
            if not coin_ids:
                logger.error("No valid coin IDs found")
                return prices
            
            # Get prices for all coins in one API call
            self._rate_limit_wait()
            market_data = self.client.get_price(
                ids=coin_ids,
                vs_currencies='usd'
            )
            
            # Process the response
            for pair in pairs:
                base = pair.split('_')[0]
                coin_id = self._get_coin_id(base)
                
                if coin_id and coin_id in market_data:
                    price = market_data[coin_id].get('usd')
                    if price:
                        prices[pair] = float(price)
                        logger.info(f"Got price for {pair}: {price}")
                    else:
                        logger.warning(f"No USD price for {pair}")
                else:
                    logger.warning(f"No market data for {pair}")
                    
        except Exception as e:
            logger.error(f"Error fetching CoinGecko prices: {str(e)}")
            logger.debug(f"Full error: {repr(e)}")
            
        if not prices:
            logger.error("Failed to get any valid prices from CoinGecko")
            
        return prices
