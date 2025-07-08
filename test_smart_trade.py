#!/usr/bin/env python3
"""
Test script for 3Commas smart trade creation
This will attempt to create a small test trade using the Python implementation
"""
import os
import sys
import logging
import json
import argparse
from typing import Dict, Any, Tuple, Optional

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Try to import the client from your existing implementation
try:
    from three_commas_client import ThreeCommasClient
except ImportError:
    logger.error("Could not import ThreeCommasClient. Make sure the module is available.")
    sys.exit(1)

def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='Test 3Commas smart trade creation')
    parser.add_argument('--key', '-k', required=True, help='3Commas API key')
    parser.add_argument('--secret', '-s', required=True, help='3Commas API secret')
    parser.add_argument('--execute', action='store_true', help='Execute a real trade (default: simulation mode)')
    parser.add_argument('--amount', type=float, default=0.0001, help='Amount to trade (default: 0.0001)')
    parser.add_argument('--from', dest='from_coin', default=None, help='Source coin (default: auto-detect)')
    parser.add_argument('--to', dest='to_coin', default='USDT', help='Target coin (default: USDT)')
    
    return parser.parse_args()

def get_account_id(client: ThreeCommasClient) -> str:
    """Get the first available account ID from 3Commas."""
    logger.info("Fetching available accounts...")
    error, accounts = client.request(entity='accounts', action='')
    
    if error:
        logger.error(f"Error fetching accounts: {error}")
        sys.exit(1)
    
    if not accounts:
        logger.error("No accounts found")
        sys.exit(1)
    
    logger.info(f"Found {len(accounts)} accounts")
    for i, account in enumerate(accounts):
        logger.info(f"Account {i+1}: ID={account['id']}, Name={account.get('name', 'Unknown')}, Type={account.get('type', 'Unknown')}")
    
    # Use the first account by default
    account_id = str(accounts[0]['id'])
    logger.info(f"Using account ID: {account_id}")
    return account_id

def get_account_balances(client: ThreeCommasClient, account_id: str) -> Dict[str, Any]:
    """Get account balances from 3Commas."""
    logger.info(f"Fetching balances for account ID: {account_id}")
    error, balances = client.request(
        entity='accounts',
        action=f'{account_id}/account_table_data',
        payload={},
        method='POST'
    )
    
    if error:
        logger.error(f"Error fetching balances: {error}")
        return {}
    
    coins_with_balance = []
    for coin in balances:
        if coin.get('currency_code') and float(coin.get('position', 0)) > 0:
            coins_with_balance.append({
                'coin': coin['currency_code'],
                'amount': float(coin['position']),
                'amount_in_usd': float(coin.get('usd_value', 0))
            })
    
    logger.info(f"Found {len(coins_with_balance)} coins with balances")
    for coin in coins_with_balance:
        logger.info(f"Balance: {coin['amount']} {coin['coin']} (${coin['amount_in_usd']:.2f})")
    
    return {'balances': coins_with_balance}

def find_tradable_coin(balances: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Find a coin with sufficient balance for a test trade."""
    if not balances or 'balances' not in balances:
        return None
    
    for coin in balances['balances']:
        # Skip stablecoins for trading from
        if coin['coin'] in ['USDT', 'USDC', 'BUSD', 'DAI']:
            continue
        
        if coin['amount'] > 0 and coin['amount_in_usd'] > 0.5:
            logger.info(f"Found tradable coin: {coin['coin']} with balance {coin['amount']}")
            return coin
    
    return None

def test_smart_trade(client: ThreeCommasClient, account_id: str, from_coin: str, to_coin: str, 
                     amount: float, simulation: bool = True) -> None:
    """Test creating a smart trade."""
    pair = f"{from_coin}_{to_coin}"
    logger.info(f"Creating test smart trade: {from_coin} → {to_coin}, Amount: {amount} {from_coin}, Pair: {pair}")
    
    if simulation:
        logger.warning("SIMULATION MODE: No real trade will be executed")
        logger.info("Payload that would be sent:")
        payload = {
            'account_id': account_id,
            'pair': pair,
            'position': {
                'type': 'buy',
                'units': {
                    'value': str(amount)
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
        logger.info(json.dumps(payload, indent=2))
        logger.info("Test completed successfully (simulation mode)")
        return
    
    # Create actual trade
    error, data = client.request(
        entity='smart_trades_v2',
        action='new',
        payload={
            'account_id': account_id,
            'pair': pair,
            'position': {
                'type': 'buy',
                'units': {
                    'value': str(amount)
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
        return
    
    logger.info(f"Smart trade created successfully: Trade ID = {data.get('id')}")
    logger.info(f"Trade status: {data.get('status')}")
    logger.info(f"Full response: {json.dumps(data, indent=2)}")

def main():
    """Main function to run the test."""
    logger.info("Starting 3Commas smart trade test")
    
    # Parse command line arguments
    args = parse_arguments()
    
    # Initialize client with command line credentials
    logger.info(f"Initializing ThreeCommasClient with provided API key")
    client = ThreeCommasClient(args.key, args.secret)
    
    # Get account ID
    account_id = get_account_id(client)
    
    # Get target coin
    to_coin = args.to_coin
    
    # If from_coin is specified, use it directly
    if args.from_coin:
        from_coin = args.from_coin
        # Use the specified amount
        test_amount = args.amount
        logger.info(f"Using specified coin: {from_coin} and amount: {test_amount}")
    else:
        # Get account balances and find a tradable coin
        balances = get_account_balances(client, account_id)
        tradable_coin = find_tradable_coin(balances)
        
        if not tradable_coin:
            logger.error("No suitable coin found for trading")
            sys.exit(1)
        
        from_coin = tradable_coin['coin']
        # Use a very small amount for testing (0.1% of available balance or the specified amount)
        test_amount = min(tradable_coin['amount'] * 0.001, args.amount)
        logger.info(f"Auto-detected coin: {from_coin} with amount: {test_amount}")
    
    logger.info(f"Will test trade {test_amount} {from_coin} to {to_coin}")
    
    # Check if running in simulation mode
    simulation = not args.execute
    if not simulation:
        logger.warning("!!! EXECUTING REAL TRADE !!!")
    
    # Test creating a smart trade
    test_smart_trade(client, account_id, from_coin, to_coin, test_amount, simulation)

if __name__ == "__main__":
    main()
