import os
import sqlite3
import pandas as pd
import dotenv
from sqlalchemy import create_engine, text

# Load .env file
dotenv.load_dotenv()

def migrate_from_sqlite_to_postgres():
    """Migrate data from SQLite to PostgreSQL"""
    print("Starting migration from SQLite to PostgreSQL...")
    
    # SQLite DB path
    sqlite_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'crypto_rebalancer.db')
    
    # Check if SQLite DB exists
    if not os.path.exists(sqlite_path):
        print(f"SQLite database not found at {sqlite_path}")
        return False
        
    # PostgreSQL connection string
    pg_url = os.getenv('DATABASE_URL')
    
    if not pg_url:
        print("DATABASE_URL not found in .env file")
        return False
        
    if pg_url.startswith('postgres://'):
        # Replace postgres:// with postgresql:// for SQLAlchemy
        pg_url = pg_url.replace('postgres://', 'postgresql://', 1)
    
    try:
        # Connect to SQLite
        print(f"Connecting to SQLite database at {sqlite_path}...")
        sqlite_conn = sqlite3.connect(sqlite_path)
        
        # Get list of tables
        tables = pd.read_sql_query("SELECT name FROM sqlite_master WHERE type='table';", sqlite_conn)
        
        # Connect to PostgreSQL
        print(f"Connecting to PostgreSQL database...")
        pg_engine = create_engine(pg_url)
        
        # Drop tables in reverse order (to handle foreign key constraints)
        print("Creating tables in PostgreSQL...")
        with pg_engine.connect() as conn:
            # Import SQLAlchemy base and create tables
            from api.database import Base, engine
            Base.metadata.create_all(bind=engine)
        
        # Export each table
        for table in tables['name']:
            print(f"Migrating table: {table}")
            try:
                # Read data from SQLite
                df = pd.read_sql_query(f"SELECT * FROM {table}", sqlite_conn)
                
                # Skip if empty
                if len(df) == 0:
                    print(f"  Table {table} is empty, skipping")
                    continue
                
                # Write to PostgreSQL
                print(f"  Writing {len(df)} rows to PostgreSQL")
                df.to_sql(table, pg_engine, if_exists='append', index=False)
                print(f"  Successfully migrated {table}")
            except Exception as e:
                print(f"  Error migrating {table}: {str(e)}")
        
        sqlite_conn.close()
        print("Migration completed successfully!")
        return True
        
    except Exception as e:
        print(f"Migration failed: {str(e)}")
        return False

if __name__ == "__main__":
    migrate_from_sqlite_to_postgres()
