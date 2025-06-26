import os
import sys
import argparse
from loguru import logger
from sqlalchemy.orm import Session

from api.database import SessionLocal, Bot as DBBot
from three_commas_client import ThreeCommasClient
from coingecko_client import CoinGeckoClient

# Configure logging to show all messages
logger.remove()
logger.add(lambda msg: print(msg), level="INFO")

def main():
    """Test price fetching from both Three Commas and CoinGecko."""
    print("Testing price source selection...")
    
    # Parse arguments for API keys
    parser = argparse.ArgumentParser(description='Test cryptocurrency price sources')
    parser.add_argument('--api_key', default=os.environ.get('THREE_COMMAS_API_KEY'), 
                        help='Three Commas API Key (or set THREE_COMMAS_API_KEY env var)')
    parser.add_argument('--api_secret', default=os.environ.get('THREE_COMMAS_API_SECRET'),
                        help='Three Commas API Secret (or set THREE_COMMAS_API_SECRET env var)')
    args = parser.parse_args()
    
    # Check if we have API credentials
    if not args.api_key or not args.api_secret:
        print("WARNING: Three Commas API credentials not provided. Set via environment variables or command line.")
        print("         Will proceed with only CoinGecko tests.\n")
    
    # Initialize clients
    try:
        # Initialize the Three Commas client
        if args.api_key and args.api_secret:
            three_commas = ThreeCommasClient(args.api_key, args.api_secret)
            print("Three Commas client initialized with provided API credentials")
        else:
            three_commas = None
            print("Three Commas client not initialized due to missing credentials")
    except Exception as e:
        print(f"Error initializing Three Commas client: {e}")
        three_commas = None
    
    try:
        # Initialize the CoinGecko client
        coingecko = CoinGeckoClient()
        print("CoinGecko client initialized")
    except Exception as e:
        print(f"Error initializing CoinGecko client: {e}")
        coingecko = None
    
    if not three_commas and not coingecko:
        print("Failed to initialize any price source clients. Exiting.")
        return
        
    # Test coins to get prices for
    test_coins = ["BTC", "ETH", "ADA", "DOT", "LINK", "XRP", "LTC", "SOL", "AVAX", "MATIC"]
    
    # Test Three Commas price source
    if three_commas:
        print("\n=== Testing Three Commas Price Source ===")
        try:
            prices = three_commas.get_market_prices(test_coins)
            print(f"Successfully retrieved {len(prices)} prices from Three Commas:")
            for coin, price in prices.items():
                print(f"{coin}: ${price:.2f}")
        except Exception as e:
            print(f"Error fetching prices from Three Commas: {e}")
    
    # Test CoinGecko price source
    if coingecko:
        print("\n=== Testing CoinGecko Price Source ===")
        try:
            prices = coingecko.get_market_prices(test_coins)
            print(f"Successfully retrieved {len(prices)} prices from CoinGecko:")
            for coin, price in prices.items():
                print(f"{coin}: ${price:.2f}")
        except Exception as e:
            print(f"Error fetching prices from CoinGecko: {e}")
    
    # Compare prices if we have both sources
    if three_commas and coingecko:
        print("\n=== Comparing Prices from Both Sources ===")
        try:
            three_commas_prices = three_commas.get_market_prices(test_coins)
            coingecko_prices = coingecko.get_market_prices(test_coins)
            
            print(f"{'Coin':<6} {'Three Commas':<15} {'CoinGecko':<15} {'Diff %':<10}")
            print("-" * 50)
            
            for coin in test_coins:
                if coin in three_commas_prices and coin in coingecko_prices:
                    price_3c = three_commas_prices[coin]
                    price_cg = coingecko_prices[coin]
                    
                    # Calculate percentage difference
                    if price_cg != 0:
                        diff_pct = abs(price_3c - price_cg) / price_cg * 100
                    else:
                        diff_pct = 0
                        
                    print(f"{coin:<6} ${price_3c:<14.2f} ${price_cg:<14.2f} {diff_pct:<10.2f}%")
                else:
                    missing = []
                    if coin not in three_commas_prices:
                        missing.append("Three Commas")
                    if coin not in coingecko_prices:
                        missing.append("CoinGecko")
                    print(f"{coin:<6} {'Missing from: ' + ', '.join(missing)}")
        except Exception as e:
            print(f"Error comparing prices: {e}")
    
    print("\nTest completed!")

if __name__ == "__main__":
    main()
