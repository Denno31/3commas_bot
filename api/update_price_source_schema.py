import os
import sys
import logging
from sqlalchemy import create_engine, Column, String, text, inspect
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from database import Base, PriceHistory, Bot

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    # Get database URL from environment variable or use SQLite as fallback
    DATABASE_URL = os.getenv('DATABASE_URL')

    if DATABASE_URL and DATABASE_URL.startswith('postgres://'):
        # Replace postgres:// with postgresql:// for SQLAlchemy
        DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)
        engine = create_engine(DATABASE_URL)
    else:
        # Use SQLite for local development
        DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'crypto_rebalancer.db')
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        DATABASE_URL = f"sqlite:///{DB_PATH}"
        engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

    logger.info(f"Using database at: {DATABASE_URL}")
    
    # Create session
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Check if source column exists in price_history table
        inspector = inspect(engine)
        columns = [col['name'] for col in inspector.get_columns('price_history')]
        
        if 'source' not in columns:
            logger.info("Adding 'source' column to price_history table")
            
            # Add source column
            if engine.name == 'sqlite':
                # SQLite has limited ALTER TABLE support
                # We need to create a new table, copy data, drop old table, and rename
                db.execute(text("""
                    ALTER TABLE price_history ADD COLUMN source VARCHAR
                """))
            else:
                # PostgreSQL or other DBMS
                db.execute(text("""
                    ALTER TABLE price_history ADD COLUMN source VARCHAR
                """))
            
            # Set default value for existing records
            db.execute(text("""
                UPDATE price_history SET source = 'three_commas'
            """))
            
            # Commit changes
            db.commit()
            logger.info("Schema updated successfully!")
        else:
            logger.info("The 'source' column already exists in price_history table")

        # Ensure price_source field exists in bots table
        columns = [col['name'] for col in inspect(engine).get_columns('bots')]
        if 'price_source' not in columns:
            logger.info("Adding 'price_source' column to bots table")
            
            if engine.name == 'sqlite':
                db.execute(text("""
                    ALTER TABLE bots ADD COLUMN price_source VARCHAR DEFAULT 'three_commas'
                """))
            else:
                db.execute(text("""
                    ALTER TABLE bots ADD COLUMN price_source VARCHAR DEFAULT 'three_commas'
                """))
            
            # Commit changes
            db.commit()
            logger.info("Added price_source column to bots table")
        else:
            logger.info("The 'price_source' column already exists in bots table")
            
    except Exception as e:
        logger.error(f"Error updating schema: {str(e)}")
        db.rollback()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    main()
