#!/usr/bin/env python3
"""
Test script for 3Commas smart_trade creation
This uses your existing ThreeCommasClient class
"""
import sys
import logging
import argparse
from typing import Dict, Any, List
from three_commas_client import ThreeCommasClient

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='Test 3Commas smart trade creation')
    parser.add_argument('--key', '-k', required=True, help='3Commas API key')
    parser.add_argument('--secret', '-s', required=True, help='3Commas API secret')
    parser.add_argument('--execute', action='store_true', help='Execute a real trade (default: simulation mode)')
    parser.add_argument('--amount', type=float, default=0.0001, help='Amount to trade (default: 0.0001)')
    parser.add_argument('--from', dest='from_coin', default='BTC', help='Source coin (default: BTC)')
    parser.add_argument('--to', dest='to_coin', default='USDT', help='Target coin (default: USDT)')
    
    return parser.parse_args()

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
    
    # Create client
    client = ThreeCommasClient(args.key, args.secret)
    
    # Get account ID
    account = get_account(client)
    account_id = str(account['id'])
    logger.info(f"Using account: {account.get('name', 'Unknown')} (ID: {account_id})")
    
    # Set up trade parameters
    from_coin = args.from_coin
    to_coin = args.to_coin
    amount = args.amount
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
        trade_id = client.create_smart_trade(
            account_id=account_id,
            from_coin=from_coin,
            to_coin=to_coin,
            amount=amount,
            pair=pair
        )
        
        if trade_id:
            logger.info(f"Trade created successfully with ID: {trade_id}")
            
            # Get trade status
            status, price = client.get_trade_status(trade_id)
            logger.info(f"Trade status: {status}, Price: {price}")
        else:
            logger.error("Failed to create trade (no trade ID returned)")
    
    except Exception as e:
        logger.error(f"Error during trade execution: {e}")

if __name__ == "__main__":
    main()
