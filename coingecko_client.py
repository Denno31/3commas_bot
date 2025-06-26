from typing import Dict, List
from pycoingecko import CoinGeckoAPI
from loguru import logger
import time

class CoinGeckoClient:
    """Client for CoinGecko API."""
    
    def __init__(self):
        """Initialize CoinGecko client."""
        self.client = CoinGeckoAPI()
        # Pre-populate common coin mappings to avoid API lookups and ensure correct IDs
        self.id_cache = {
            'BTC': 'bitcoin',
            'ETH': 'ethereum',
            'USDT': 'tether',
            'USDC': 'usd-coin',
            'BNB': 'binancecoin',
            'XRP': 'ripple',
            'ADA': 'cardano',
            'SOL': 'solana',
            'SOLANA': 'solana',  # Add SOLANA as an alternative to SOL
            'DOGE': 'dogecoin',
            'DOT': 'polkadot',
        }
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
        # Normalize symbol to uppercase
        symbol = symbol.upper()
        
        if symbol in self.id_cache:
            logger.debug(f"Using cached coin ID for {symbol}: {self.id_cache[symbol]}")
            return self.id_cache[symbol]

        try:
            self._rate_limit_wait()
            logger.debug(f"Fetching coin list to find ID for symbol: {symbol}")
            coin_list = self.client.get_coins_list()
            
            # Create a list of matching coins
            matches = [coin for coin in coin_list if coin['symbol'].upper() == symbol]
            logger.debug(f"Found {len(matches)} coins with symbol {symbol}")
            
            if matches:
                # Try to find the most likely match (often the one with highest market cap)
                # For common coins, the ID often matches the name closely
                for coin in matches:
                    # Prefer exact name matches or IDs containing the symbol
                    if (coin['name'].upper() == symbol or 
                        symbol in coin['id'].upper() or 
                        coin['id'].upper() == symbol.lower()):
                        self.id_cache[symbol] = coin['id']
                        logger.debug(f"Found primary match for {symbol}: {coin['id']}")
                        return coin['id']
                
                # If no preferred match, use the first one but warn
                self.id_cache[symbol] = matches[0]['id']
                logger.warning(f"Using first match for {symbol}: {matches[0]['id']} - verify this is correct")
                return matches[0]['id']
        except Exception as e:
            logger.error(f"Error getting coin ID for {symbol}: {e}")
        return None

    def get_market_prices(self, symbols: List[str]) -> Dict[str, float]:
        """Get current market prices for multiple coins."""
        if not symbols:
            logger.warning("No symbols provided to get_market_prices")
            return {}
            
        # Map symbols to CoinGecko IDs
        ids = []
        id_to_symbol = {}
        for symbol in symbols:
            coin_id = self._get_coin_id(symbol)
            if coin_id:
                ids.append(coin_id)
                id_to_symbol[coin_id] = symbol
            else:
                logger.error(f"Failed to get CoinGecko ID for {symbol}")
                
        if not ids:
            logger.error("No valid CoinGecko IDs found for symbols")
            return {}
        
        logger.debug(f"Requesting prices for coins: {ids}")
        
        try:
            self._rate_limit_wait()
            market_data = self.client.get_price(ids=ids, vs_currencies='usd')
            logger.debug(f"Raw market data response: {market_data}")
            
            # Parse response
            prices = {}
            for coin_id, data in market_data.items():
                if 'usd' in data and data['usd'] is not None:
                    symbol = id_to_symbol[coin_id]
                    price = data['usd']
                    
                    # Validate prices (catch obviously wrong values)
                    if price < 0.00001 and coin_id not in ['dogecoin', 'shiba-inu']:
                        # Most major coins shouldn't have tiny values like this - could be wrong ID
                        logger.warning(f"⚠️ Suspicious price for {symbol} ({coin_id}): ${price:,.10f} USD - may be wrong coin ID")
                        
                        # If it's a main crypto with known typical price range, alert
                        if symbol in ['BTC', 'SOLANA', 'SOL', 'ETH'] and price < 1.0:
                            logger.error(f"🚨 INCORRECT PRICE: {symbol} price ${price} is far too low - likely wrong coin ID!")
                    
                    prices[symbol] = price
                    logger.info(f"Got price for {symbol}: {price}")
                    logger.debug(f"Price for {symbol} ({coin_id}): ${price:,.2f} USD")
                else:
                    logger.error(f"No USD price found for {coin_id}")
            
            return prices
        except Exception as e:
            logger.error(f"Error getting market prices: {e}")
            return {}
