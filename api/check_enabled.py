from database import SessionLocal, Bot

def main():
    db = SessionLocal()
    try:
        bots = db.query(Bot).all()
        for bot in bots:
            print(f"Bot: {bot.name}")
            print(f"  Enabled: {bot.enabled}")
            print(f"  Coins: {bot.coins}")
            print()
    finally:
        db.close()

if __name__ == "__main__":
    main()
