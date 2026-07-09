import os
from dotenv import load_dotenv

# Load environment variables from .env file for local/MySQL configuration.
# This keeps DB credentials out of source code and allows environment-specific overrides.
load_dotenv()

class DatabaseConfig:
    MYSQL_HOST = os.getenv('MYSQL_HOST', 'localhost')
    MYSQL_PORT = int(os.getenv('MYSQL_PORT', 3306))
    MYSQL_USER = os.getenv('MYSQL_USER', 'root')
    MYSQL_PASSWORD = os.getenv('MYSQL_PASSWORD', '')
    MYSQL_DATABASE = os.getenv('MYSQL_DATABASE', 'clinic_management')
    
    @property
    def DATABASE_URL(self):
        # Build the SQLAlchemy connection URL from the configured MySQL values.
        return f"mysql+pymysql://{self.MYSQL_USER}:{self.MYSQL_PASSWORD}@{self.MYSQL_HOST}:{self.MYSQL_PORT}/{self.MYSQL_DATABASE}?charset=utf8mb4"

# Create a single instance
db_config = DatabaseConfig()