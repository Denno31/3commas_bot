#!/usr/bin/env python3
"""
Test script to try different pair formats with 3Commas API
"""
import sys
import logging
import yaml
import json
from typing import Dict, Any, List
from three_commas_client import ThreeCommasClient

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def load_config(config_path: str = 'config.local.yaml') -> Dict[str, Any]:
    """Load configuration from YAML file."""
    try:
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)
        
        logger.info(f"Config loaded from {config_path}")
        return config
    except Exception as e:
        logger.error(f"Error loading config: {e}")
        sys.exit(1)

def get_api_credentials(config: Dict[str, Any]):
    """Extract API credentials from config."""
    if '3commas' in config and isinstance(config['3commas'], dict):
        api_key = config['3commas'].get('api_key')
        api_secret = config['3commas'].get('api_secret')
        
        if api_key and api_secret:
            return api_key, api_secret
    
    logger.error("API credentials not found in config")
    sys.exit(1)

def test_pair_formats(client, account_id, base_currency="ADA", quote_currency="USDT"):
    """Test different pair format combinations."""
    formats = [
        f"{base_currency}_{quote_currency}",  # ADA_USDT
        f"{base_currency}{quote_currency}",   # ADAUSDT
        f"{base_currency.lower()}_{quote_currency.lower()}",  # ada_usdt
        f"{base_currency.lower()}{quote_currency.lower()}",   # adausdt
        f"{base_currency}/{quote_currency}",  # ADA/USDT
        f"{base_currency.lower()}/{quote_currency.lower()}"  # ada/usdt
    ]
    
    for pair_format in formats:
        logger.info(f"\nTesting pair format: {pair_format}")
        
        try:
            error, data = client.client.request(
                entity='smart_trades_v2',
                action='new',
                payload={
                    'account_id': account_id,
                    'pair': pair_format,
                    'position': {
                        'type': 'buy',
                        'units': {
                            'value': "5"
                        },
                        'order_type': 'market'
                    },
                    'take_profit': {
                        'enabled': 'false'
                    },
                    'stop_loss': {
                        'enabled': 'false'
                    }
                }
            )
            
            if error:
                logger.info(f"Error: {error}")
            else:
                logger.info(f"Success with format: {pair_format}")
                logger.info(f"Response: {json.dumps(data, indent=2)}")
                return pair_format  # Return successful format
                
        except Exception as e:
            logger.error(f"Exception with format {pair_format}: {e}")
    
    # Test some known major pairs
    other_pairs = ["BTC_USDT", "BTCUSDT", "ETH_USDT", "ETHUSDT"]
    for pair in other_pairs:
        logger.info(f"\nTesting standard pair: {pair}")
        try:
            error, data = client.client.request(
                entity='smart_trades_v2',
                action='new',
                payload={
                    'account_id': account_id,
                    'pair': pair,
                    'position': {
                        'type': 'buy',
                        'units': {
                            'value': "0.0001"
                        },
                        'order_type': 'market'
                    },
                    'take_profit': {
                        'enabled': 'false'
                    },
                    'stop_loss': {
                        'enabled': 'false'
                    }
                }
            )
            
            if error:
                logger.info(f"Error: {error}")
            else:
                logger.info(f"Success with pair: {pair}")
                logger.info(f"Response: {json.dumps(data, indent=2)}")
                return pair
                
        except Exception as e:
            logger.error(f"Exception with pair {pair}: {e}")
    
    return None

def get_market_pairs(client, account_id):
    """Attempt to get market pairs directly."""
    try:
        logger.info("Attempting to get market pairs directly from account...")
        
        # First try account_table_data
        error, data = client.client.request(
            entity='accounts',
            action='account_table_data',
            action_id=str(account_id)
        )
        
        if error:
            logger.info(f"Error getting account_table_data: {error}")
        else:
            coins = [item.get('currency_code') for item in data if item.get('currency_code')]
            logger.info(f"Available coins from account_table_data: {coins}")
        
        # Try to get currency list
        error, data = client.client.request(
            entity='accounts',
            action='currencies',
            action_id=str(account_id)
        )
        
        if error:
            logger.info(f"Error getting currencies: {error}")
        else:
            logger.info(f"Currencies response: {data[:10] if isinstance(data, list) else data}")
        
    except Exception as e:
        logger.error(f"Error getting market pairs: {e}")

def main():
    """Main function."""
    logger.info("Starting 3Commas pair format test")
    
    # Load config
    config = load_config()
    
    # Get API credentials
    api_key, api_secret = get_api_credentials(config)
    
    # Create client
    client = ThreeCommasClient(api_key, api_secret)
    
    # Get accounts
    accounts = client.get_accounts()
    if not accounts:
        logger.error("No accounts found")
        sys.exit(1)
    
    # Use first account
    account = accounts[0]
    account_id = account['id']
    logger.info(f"Using account: {account.get('name', 'Unknown')} (ID: {account_id})")
    
    # Try to get market pairs directly
    get_market_pairs(client, account_id)
    
    # Test different pair formats
    successful_format = test_pair_formats(client, account_id)
    
    if successful_format:
        logger.info(f"\nFound working pair format: {successful_format}")
    else:
        logger.info("\nCould not find a working pair format")
        logger.info("You may need to check your API key permissions or available pairs on 3Commas")

if __name__ == "__main__":
    main()
