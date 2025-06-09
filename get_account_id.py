import yaml
from py3cw.request import Py3CW

def get_accounts():
    # Load config
    with open('config.yaml', 'r') as f:
        config = yaml.safe_load(f)
    
    # Initialize 3Commas client
    p3cw = Py3CW(
        key=config['3commas']['api_key'],
        secret=config['3commas']['api_secret']
    )
    
    # Get accounts
    error, accounts = p3cw.request(
        entity='accounts',
        action=''
    )
    
    if error:
        print(f"Error: {error}")
        return
    
    print("\nAvailable Accounts:")
    print("------------------")
    for account in accounts:
        print(f"Account ID: {account['id']}")
        print(f"Name: {account['name']}")
        print(f"Type: {account['type']}")
        print(f"Market: {account.get('market_code', 'N/A')}")
        print(f"Status: {account['status']}")
        print("------------------")

if __name__ == "__main__":
    get_accounts()
