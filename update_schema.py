import os
import sys
from sqlalchemy import create_engine, Column, Integer, String, Boolean, Float, DateTime, ForeignKey, MetaData, inspect
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from loguru import logger

# Get the database path
db_path = os.path.join(os.path.dirname(__file__), 'data', 'crypto_rebalancer.db')
if not os.path.exists(db_path):
    print(f"Database not found at: {db_path}")
    sys.exit(1)

# Connect to database
DATABASE_URL = f"sqlite:///{db_path}"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def update_schema():
    """Update the database schema to add new columns."""
    print(f"Updating schema for database at: {db_path}")
    
    # Use direct connection for executing SQL
    conn = engine.raw_connection()
    cursor = conn.cursor()
    
    try:
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(bots)")
        columns = [col[1] for col in cursor.fetchall()]
        
        # Add reference_coin column if it doesn't exist
        if 'reference_coin' not in columns:
            print("Adding column 'reference_coin' to bots table...")
            cursor.execute("ALTER TABLE bots ADD COLUMN reference_coin VARCHAR")
        else:
            print("Column 'reference_coin' already exists.")
            
        # Add max_global_equivalent column if it doesn't exist
        if 'max_global_equivalent' not in columns:
            print("Adding column 'max_global_equivalent' to bots table...")
            cursor.execute("ALTER TABLE bots ADD COLUMN max_global_equivalent FLOAT DEFAULT 1.0")
        else:
            print("Column 'max_global_equivalent' already exists.")
            
        # Add global_threshold_percentage column if it doesn't exist
        if 'global_threshold_percentage' not in columns:
            print("Adding column 'global_threshold_percentage' to bots table...")
            cursor.execute("ALTER TABLE bots ADD COLUMN global_threshold_percentage FLOAT DEFAULT 10.0")
        else:
            print("Column 'global_threshold_percentage' already exists.")
        
        # Check if coin_unit_tracker table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='coin_unit_tracker'")
        if not cursor.fetchone():
            print("Creating coin_unit_tracker table...")
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS coin_unit_tracker (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                bot_id INTEGER,
                coin VARCHAR,
                units FLOAT,
                last_updated TIMESTAMP,
                FOREIGN KEY(bot_id) REFERENCES bots(id)
            )
            """)
        else:
            print("Table 'coin_unit_tracker' already exists.")
            
        # Commit the changes
        conn.commit()
        
        print("Schema update completed successfully!")
        
    except Exception as e:
        print(f"Error updating schema: {e}")
        conn.rollback()  # Rollback on error
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    update_schema()
