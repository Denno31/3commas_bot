import os
import sys

# Add parent directory to path to import database
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine, Base
from sqlalchemy import Column, Float, Table, MetaData

def run_migration():
    print("Running migration to add global_peak_value and min_acceptable_value columns")
    
    metadata = MetaData()
    bots = Table('bots', metadata, autoload_with=engine)
    
    try:
        # Check if columns already exist
        if 'global_peak_value' not in bots.columns:
            print("Adding global_peak_value column")
            engine.execute('ALTER TABLE bots ADD COLUMN global_peak_value FLOAT DEFAULT 0.0')
        else:
            print("global_peak_value column already exists")
        
        if 'min_acceptable_value' not in bots.columns:
            print("Adding min_acceptable_value column")
            engine.execute('ALTER TABLE bots ADD COLUMN min_acceptable_value FLOAT DEFAULT 0.0')
        else:
            print("min_acceptable_value column already exists")
            
        print("Migration completed successfully")
    except Exception as e:
        print(f"Error during migration: {str(e)}")
        raise

if __name__ == "__main__":
    run_migration()
