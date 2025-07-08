#!/usr/bin/env python3
"""
Script to check available pairs on 3Commas for your account
"""
import sys
import logging
import yaml
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
    try:
        if '3commas' in config and isinstance(config['3commas'], dict):
            api_key = config['3commas'].get('api_key')
            api_secret = config['3commas'].get('api_secret')
            
            if api_key and api_secret:
                return api_key, api_secret
                
        logger.error("API credentials not found in config")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Error extracting API credentials: {e}")
        sys.exit(1)

def main():
    """Main function."""
    logger.info("Starting 3Commas pairs check")
    
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
    
    # Display accounts
    logger.info(f"Found {len(accounts)} accounts")
    for i, account in enumerate(accounts):
        logger.info(f"Account {i+1}: ID={account['id']}, Name={account.get('name', 'Unknown')}")
    
    # Use first account
    account = accounts[0]
    account_id = account['id']
    
    # Get market pairs
    try:
        logger.info(f"Fetching market pairs for account {account['name']} (ID: {account_id})")
        error, market_pairs = client.client.request(
            entity='accounts',
            action='market_pairs',
            action_id=str(account_id)
        )
        
        if error:
            logger.error(f"Error getting market pairs: {error}")
            return
        
        if isinstance(market_pairs, list):
            logger.info(f"Found {len(market_pairs)} market pairs")
            # Show first 10 pairs as examples
            for pair in market_pairs[:10]:
                logger.info(f"Pair: {pair}")
        else:
            logger.error(f"Unexpected response format: {market_pairs}")
            
    except Exception as e:
        logger.error(f"Error retrieving market pairs: {e}")

if __name__ == "__main__":
    main()
