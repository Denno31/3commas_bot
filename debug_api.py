#!/usr/bin/env python3
"""
Debug script to examine the API call structure in py3cw
"""
import sys
import logging
import traceback
import yaml
import json
from typing import Dict, Any
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

def inspect_client_request(client):
    """Inspect the client request method to understand how it works."""
    try:
        # Get the source code of the request method if possible
        if hasattr(client.client, 'request') and hasattr(client.client.request, '__code__'):
            logger.info(f"Request method code: {client.client.request.__code__}")
        else:
            logger.info("Cannot access request method code")
        
        # Print the structure of the client object
        logger.info(f"Client class: {client.__class__.__name__}")
        logger.info(f"Client attributes: {dir(client)}")
        logger.info(f"Client.client class: {client.client.__class__.__name__}")
        logger.info(f"Client.client attributes: {dir(client.client)}")
        
    except Exception as e:
        logger.error(f"Error inspecting client: {e}")

def try_various_api_formats(client, account_id):
    """Try various API call formats to see what works."""
    test_formats = [
        # Format 1: create_smart_trade in smart_trades
        {
            "entity": "smart_trades",
            "action": "create_smart_trade",
            "payload": {
                "account_id": account_id,
                "pair": "ADA_USDT",
                "from_currency_id": "ADA",
                "to_currency_id": "USDT",
                "quantity": "5"
            }
        },
        # Format 2: new in smart_trades_v2
        {
            "entity": "smart_trades_v2",
            "action": "new",
            "payload": {
                "account_id": account_id,
                "pair": "ADA_USDT",
                "position": {
                    "type": "buy",
                    "units": {
                        "value": "5"
                    },
                    "order_type": "market"
                },
                "take_profit": {
                    "enabled": "false"
                },
                "stop_loss": {
                    "enabled": "false"
                }
            }
        },
        # Format 3: smart_trades (v1 format) without action
        {
            "entity": "smart_trades",
            "action": "",
            "payload": {
                "account_id": account_id,
                "pair": "ADA_USDT",
                "from_currency": "ADA",
                "to_currency": "USDT",
                "quantity": "5"
            }
        }
    ]
    
    for i, test in enumerate(test_formats):
        try:
            logger.info(f"\nTesting format {i+1}:")
            logger.info(f"Entity: {test['entity']}")
            logger.info(f"Action: {test['action']}")
            logger.info(f"Payload: {json.dumps(test['payload'], indent=2)}")
            
            error, data = client.client.request(
                entity=test["entity"],
                action=test["action"],
                payload=test["payload"]
            )
            
            logger.info(f"Response error: {error}")
            logger.info(f"Response data: {json.dumps(data, indent=2) if data else None}")
            
        except Exception as e:
            logger.error(f"Error with format {i+1}: {e}")
            logger.error(traceback.format_exc())

def main():
    """Main function."""
    logger.info("Starting 3Commas API debug script")
    
    # Load config
    config = load_config()
    
    # Get API credentials
    api_key, api_secret = get_api_credentials(config)
    
    # Create client
    client = ThreeCommasClient(api_key, api_secret)
    
    # Inspect client
    inspect_client_request(client)
    
    # Get accounts
    accounts = client.get_accounts()
    if not accounts:
        logger.error("No accounts found")
        sys.exit(1)
    
    # Use first account
    account = accounts[0]
    account_id = account['id']
    logger.info(f"Using account: {account.get('name', 'Unknown')} (ID: {account_id})")
    
    # Try various API call formats
    try_various_api_formats(client, account_id)

if __name__ == "__main__":
    main()
