import os
from urllib.parse import quote_plus
from dotenv import load_dotenv

load_dotenv()

class DatabaseConfig:
    def __init__(self):
        self.MYSQL_HOST = os.getenv('MYSQL_HOST', 'localhost')
        self.MYSQL_PORT = int(os.getenv('MYSQL_PORT', 3306))
        self.MYSQL_USER = os.getenv('MYSQL_USER')
        self.MYSQL_PASSWORD = os.getenv('MYSQL_PASSWORD')
        self.MYSQL_DATABASE = os.getenv('MYSQL_DATABASE', 'clinic_management')

        if not self.MYSQL_USER:
            raise ValueError("MYSQL_USER environment variable is required")
        if self.MYSQL_PASSWORD is None:
            raise ValueError("MYSQL_PASSWORD environment variable is required")

    @property
    def DATABASE_URL(self):
        user = quote_plus(self.MYSQL_USER)
        password = quote_plus(self.MYSQL_PASSWORD)
        return f"mysql+pymysql://{user}:{password}@{self.MYSQL_HOST}:{self.MYSQL_PORT}/{self.MYSQL_DATABASE}?charset=utf8mb4"

# Create a single instance
db_config = DatabaseConfig()