import os
import sys
import yaml
from pathlib import Path

# Add parent directory to path so we can import from api
sys.path.append(str(Path(__file__).parent.parent))

from api.database import SessionLocal, ApiConfig, Bot, SystemConfig

def seed_config(config_path: str):
    """Seed the database with configuration from YAML file."""
    print(f"Reading config from {config_path}")
    
    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)
    
    db = SessionLocal()
    try:
        # Seed 3commas API config
        threec_config = config.get('3commas', {})
        api_config = ApiConfig(
            name='3commas',
            api_key=threec_config.get('api_key'),
            api_secret=threec_config.get('api_secret'),
            mode=threec_config.get('mode', 'paper')
        )
        db.merge(api_config)  # merge will update if exists, create if not
        
        # Seed bots
        for bot_config in config.get('bots', []):
            bot = Bot(
                name=bot_config['name'],
                enabled=bot_config.get('enabled', True),
                coins=','.join(bot_config['coins']),
                threshold_percentage=bot_config['threshold_percentage'],
                check_interval=bot_config['check_interval'],
                initial_coin=bot_config.get('initial_coin'),
                current_coin=bot_config.get('initial_coin'),  # Initially same as initial_coin
                account_id=bot_config['account_id']
            )
            db.merge(bot)
        
        # Seed system config
        pricing_config = config.get('pricing', {})
        analytics_config = config.get('analytics', {})
        
        system_config = SystemConfig(
            pricing_source=pricing_config.get('source', '3commas'),
            fallback_source=pricing_config.get('fallback_source', 'coingecko'),
            update_interval=pricing_config.get('update_interval', 1),
            websocket_enabled=pricing_config.get('websocket_enabled', True),
            analytics_enabled=analytics_config.get('enabled', True),
            analytics_save_interval=analytics_config.get('save_interval', 60)
        )
        db.merge(system_config)
        
        db.commit()
        print("Configuration successfully seeded to database")
        
    except Exception as e:
        print(f"Error seeding configuration: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description='Seed database with configuration')
    parser.add_argument('--config', type=str, default='config.yaml',
                      help='Path to configuration YAML file')
    args = parser.parse_args()
    
    seed_config(args.config)
