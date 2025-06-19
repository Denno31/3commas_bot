import os
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

from api.database import init_db, engine, Base
from sqlalchemy import inspect

def check_and_create_tables():
    """Check if our new tables exist and create them if not"""
    print("Checking database schema for new tables...")
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    
    if "coin_snapshots" not in existing_tables:
        print("Creating 'coin_snapshots' table...")
        # This approach avoids recreating existing tables
        # We're only creating the new tables that don't exist
        Base.metadata.create_all(bind=engine, tables=[Base.metadata.tables['coin_snapshots']])
        print("'coin_snapshots' table created successfully!")
    else:
        print("'coin_snapshots' table already exists.")
    
    # Check for new columns in existing tables
    print("Checking for new columns in 'bots' table...")
    columns = [col['name'] for col in inspector.get_columns('bots')]
    
    if 'global_peak_value' not in columns or 'min_acceptable_value' not in columns:
        print("Need to add new columns to 'bots' table...")
        print("Please use the following SQL:")
        print("ALTER TABLE bots ADD COLUMN global_peak_value FLOAT DEFAULT 0.0;")
        print("ALTER TABLE bots ADD COLUMN min_acceptable_value FLOAT DEFAULT 0.0;")
        print("\nYou can run these commands with a database tool like pgAdmin or DBeaver.")
    else:
        print("All required columns exist in 'bots' table.")
        
    print("\nSchema check completed!")

if __name__ == "__main__":
    check_and_create_tables()
