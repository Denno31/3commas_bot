import os
import sys

# Add parent directory to path to import database
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine, Base
from sqlalchemy import Column, Float, Table, MetaData, text

def run_migration():
    print("Running migration to add global_peak_value and min_acceptable_value columns")
    
    # For modern SQLAlchemy, we need to use connections differently
    with engine.connect() as connection:
        try:
            # Check if columns exist using information_schema
            result = connection.execute(text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name='bots' AND column_name='global_peak_value'"
            ))
            if result.fetchone() is None:
                print("Adding global_peak_value column")
                connection.execute(text('ALTER TABLE bots ADD COLUMN global_peak_value FLOAT DEFAULT 0.0'))
            else:
                print("global_peak_value column already exists")
            
            result = connection.execute(text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name='bots' AND column_name='min_acceptable_value'"
            ))
            if result.fetchone() is None:
                print("Adding min_acceptable_value column")
                connection.execute(text('ALTER TABLE bots ADD COLUMN min_acceptable_value FLOAT DEFAULT 0.0'))
            else:
                print("min_acceptable_value column already exists")
            
            # Commit the transaction
            connection.commit()
            print("Migration completed successfully")
        except Exception as e:
            print(f"Error during migration: {str(e)}")
            connection.rollback()
            raise

if __name__ == "__main__":
    run_migration()
