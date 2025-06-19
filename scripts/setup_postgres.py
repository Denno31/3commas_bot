import os
import sys
import psycopg2
import dotenv
import subprocess
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

# Load environment variables
dotenv.load_dotenv()

def create_database():
    """Create the PostgreSQL database if it doesn't exist"""
    # Extract connection parameters from DATABASE_URL
    db_url = os.getenv('DATABASE_URL')
    
    if not db_url:
        print("ERROR: DATABASE_URL not found in .env file")
        return False
        
    # Parse connection parameters
    if db_url.startswith('postgres://'):
        # Format: postgres://user:password@host:port/dbname
        db_url = db_url.replace('postgres://', '', 1)
    elif db_url.startswith('postgresql://'):
        # Format: postgresql://user:password@host:port/dbname
        db_url = db_url.replace('postgresql://', '', 1)
    else:
        print(f"ERROR: Unsupported database URL format: {db_url}")
        return False
    
    try:
        # Extract connection parts
        credentials, rest = db_url.split('@', 1)
        user_pass = credentials.split(':')
        user = user_pass[0]
        password = user_pass[1] if len(user_pass) > 1 else ''
        
        host_port_db = rest.split('/')
        host_port = host_port_db[0].split(':')
        host = host_port[0]
        port = host_port[1] if len(host_port) > 1 else '5432'
        dbname = host_port_db[1] if len(host_port_db) > 1 else ''
        
        # Connect to PostgreSQL server
        print(f"Connecting to PostgreSQL server at {host}:{port} as {user}...")
        conn = psycopg2.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            dbname='postgres'  # Connect to default postgres database first
        )
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Check if database exists
        cursor.execute(f"SELECT 1 FROM pg_database WHERE datname = '{dbname}'")
        exists = cursor.fetchone()
        
        if not exists:
            print(f"Creating database '{dbname}'...")
            cursor.execute(f"CREATE DATABASE {dbname}")
            print(f"Database '{dbname}' created successfully!")
        else:
            print(f"Database '{dbname}' already exists.")
            
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"Error creating database: {str(e)}")
        return False

def initialize_schema():
    """Initialize database schema"""
    try:
        from api.database import init_db
        
        print("Initializing database schema...")
        init_db()
        print("Database schema initialized successfully!")
        return True
    except Exception as e:
        print(f"Error initializing schema: {str(e)}")
        return False

def install_requirements():
    """Ensure all required packages are installed"""
    try:
        print("Installing required Python packages...")
        subprocess.check_call([
            sys.executable, "-m", "pip", "install", 
            "psycopg2-binary", "python-dotenv", "pandas"
        ])
        print("Packages installed successfully!")
        return True
    except Exception as e:
        print(f"Error installing packages: {str(e)}")
        return False

def main():
    print("===== PostgreSQL Setup for Crypto Rebalancer =====")
    
    # Ensure requirements are installed
    if not install_requirements():
        return
    
    # Create database
    if not create_database():
        return
    
    # Initialize schema
    if not initialize_schema():
        return
    
    print("\n===== Setup Complete =====")
    print("PostgreSQL database is ready to use!")
    
    # Ask if user wants to migrate data
    migrate = input("\nWould you like to migrate data from SQLite to PostgreSQL? (y/n): ")
    if migrate.lower() == 'y':
        print("\nStarting migration process...")
        try:
            from export_data import migrate_from_sqlite_to_postgres
            success = migrate_from_sqlite_to_postgres()
            if success:
                print("Migration completed successfully!")
            else:
                print("Migration failed. Please check the logs.")
        except Exception as e:
            print(f"Error during migration: {str(e)}")
    
    print("\nSetup process finished!")

if __name__ == "__main__":
    main()
