from database import SessionLocal, ApiConfig

def main():
    db = SessionLocal()
    try:
        config = db.query(ApiConfig).filter(ApiConfig.name == '3commas').first()
        print(f'Config found: {config is not None}')
        if config:
            print(f'Config details:')
            print(f'  Name: {config.name}')
            print(f'  API Key: {config.api_key[:8]}...')
            print(f'  Mode: {config.mode}')
    finally:
        db.close()

if __name__ == '__main__':
    main()
