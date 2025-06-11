from database import SessionLocal, Trade
from datetime import datetime

db = SessionLocal()

# Get all trades
trades = db.query(Trade).order_by(Trade.executed_at.desc()).all()

print("\nTrades in database:")
for trade in trades:
    print(f"\nTrade ID: {trade.trade_id}")
    print(f"  Bot ID: {trade.bot_id}")
    print(f"  From: {trade.from_coin} -> To: {trade.to_coin}")
    print(f"  Amount: {trade.amount}")
    print(f"  Price Change: {trade.price_change:.2%}")
    print(f"  Status: {trade.status}")
    print(f"  Executed At: {trade.executed_at}")
