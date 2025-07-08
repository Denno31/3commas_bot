#!/usr/bin/env python3
"""
Test script for 3Commas smart_trade creation
Reads API credentials from config.local.yaml
"""
import sys
import logging
import argparse
import yaml
from typing import Dict, Any, Tuple
from three_commas_client import ThreeCommasClient

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='Test 3Commas smart trade creation')
    parser.add_argument('--config', default='config.local.yaml', help='Path to config file')
    parser.add_argument('--execute', action='store_true', help='Execute a real trade (default: simulation mode)')
    parser.add_argument('--amount', type=float, default=0.0001, help='Amount to trade (default: 0.0001)')
    parser.add_argument('--from', dest='from_coin', default='BTC', help='Source coin (default: BTC)')
    parser.add_argument('--to', dest='to_coin', default='USDT', help='Target coin (default: USDT)')
    
    return parser.parse_args()

def load_config(config_path: str) -> Dict[str, Any]:
    """Load configuration from YAML file."""
    try:
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)
        
        logger.info(f"Config loaded from {config_path}")
        return config
    except Exception as e:
        logger.error(f"Error loading config: {e}")
        sys.exit(1)

def get_api_credentials(config: Dict[str, Any]) -> Tuple[str, str]:
    """Extract API credentials from config."""
    try:
        # Print config structure to understand its organization
        logger.info(f"Config keys: {list(config.keys())}")
        
        # Look in different possible locations for the API credentials
        api_key = None
        api_secret = None
        
        # Check for 3commas section (the key in your config)
        if '3commas' in config:
            three_commas = config['3commas']
            logger.info(f"3commas keys: {list(three_commas.keys()) if isinstance(three_commas, dict) else 'Not a dict'}")            
            if isinstance(three_commas, dict):
                api_key = three_commas.get('api_key') or three_commas.get('key')
                api_secret = three_commas.get('api_secret') or three_commas.get('secret')
        
        # Check for api section
        if 'api' in config and not (api_key and api_secret):
            api = config['api']
            logger.info(f"api keys: {list(api.keys()) if isinstance(api, dict) else 'Not a dict'}")
            
            if isinstance(api, dict):
                # Check if there's a three_commas section within api
                if 'three_commas' in api:
                    tc = api['three_commas']
                    if isinstance(tc, dict):
                        api_key = tc.get('key') or tc.get('api_key')
                        api_secret = tc.get('secret') or tc.get('api_secret')
                else:
                    # Try common key names
                    api_key = api.get('key') or api.get('api_key') or api.get('3commas_api_key')
                    api_secret = api.get('secret') or api.get('api_secret') or api.get('3commas_api_secret')
        
        # Check top level
        if not (api_key and api_secret):
            api_key = config.get('api_key') or config.get('3commas_api_key')
            api_secret = config.get('api_secret') or config.get('3commas_api_secret')
        
        if not api_key or not api_secret:
            logger.error("API key or secret not found in config")
            sys.exit(1)
        
        return api_key, api_secret
    except Exception as e:
        logger.error(f"Error extracting API credentials: {e}")
        sys.exit(1)

def get_account(client: ThreeCommasClient) -> Dict[str, Any]:
    """Get the first suitable account."""
    accounts = client.get_accounts()
    if not accounts:
        logger.error("No accounts found")
        sys.exit(1)
    
    logger.info(f"Found {len(accounts)} accounts")
    for i, account in enumerate(accounts):
        logger.info(f"Account {i+1}: ID={account['id']}, Name={account.get('name', 'Unknown')}, Type={account.get('type', 'Unknown')}")
    
    # Use the first account by default
    return accounts[0]

def main():
    """Main function to test smart trade creation."""
    logger.info("Starting 3Commas smart trade test")
    
    # Parse command line arguments
    args = parse_arguments()
    
    # Load config
    config = load_config(args.config)
    
    # Get API credentials
    api_key, api_secret = get_api_credentials(config)
    logger.info(f"Found API credentials in config")
    
    # Create client
    client = ThreeCommasClient(api_key, api_secret)
    
    # Get account ID
    account = get_account(client)
    account_id = str(account['id'])
    logger.info(f"Using account: {account.get('name', 'Unknown')} (ID: {account_id})")
    
    # Set up trade parameters
    from_coin = args.from_coin
    to_coin = args.to_coin
    amount = args.amount
    
    # For 3Commas API with this account, pair format should use underscore
    # Example: ADA_USDT not ADAUSDT
    pair = f"{from_coin}_{to_coin}"
    
    logger.info(f"Trade parameters: {from_coin} → {to_coin}, Amount: {amount}, Pair: {pair}")
    
    # Check if simulation mode
    if not args.execute:
        logger.warning("SIMULATION MODE: No real trade will be executed")
        logger.info("This is what would be executed:")
        logger.info(f"client.create_smart_trade(account_id='{account_id}', from_coin='{from_coin}', to_coin='{to_coin}', amount={amount}, pair='{pair}')")
        return
    
    # Execute the trade
    logger.warning("!!! EXECUTING REAL TRADE !!!")
    try:
        # Use a direct API call approach similar to what works in Node.js
        error, data = client.client.request(
            entity='smart_trades',
            action='create_smart_trade',
            payload={
                'account_id': account_id,
                'pair': pair,  # BTCUSDT format
                'from_currency_id': from_coin,
                'to_currency_id': to_coin,
                'quantity': str(amount)
            }
        )
        
        if error:
            logger.error(f"Error creating smart trade: {error}")
        elif data and 'id' in data:
            trade_id = data['id']
            logger.info(f"Trade created successfully with ID: {trade_id}")
            
            # Get trade status
            status, price = client.get_trade_status(trade_id) if hasattr(client, 'get_trade_status') else ("unknown", None)
            logger.info(f"Trade status: {status}, Price: {price}")
            logger.info(f"Full trade data: {data}")
        else:
            logger.error(f"Failed to create trade - unexpected response: {data}")
    
    except Exception as e:
        logger.error(f"Error during trade execution: {e}")

if __name__ == "__main__":
    main()
