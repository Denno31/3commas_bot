from database import SessionLocal, ApiConfig

def main():
    db = SessionLocal()
    try:
        config = db.query(ApiConfig).filter(ApiConfig.name == '3commas').first()
        if not config:
            config = ApiConfig(name='3commas')
            db.add(config)
        
        config.api_key = "7d7c8a1193cc4a6d9a507a4432969af2e4e2cd84f5fe478faea73616b29e4656"
        config.api_secret = "6736fac87d91a9590395127fc182cdb7226ce86c40f70e75a14bb86c24179e5864bd761e2ae010a84f16d97076aaeaf768a1853664f6cc634442f343aa48b4f704dba297c612ce5f6575d48fa6f1df92db7aad0fc19ee0d2016916d034c3e9e810753b5c"
        config.mode = "paper"
        
        db.commit()
        print("3commas API configuration updated successfully!")
        
    finally:
        db.close()

if __name__ == '__main__':
    main()
