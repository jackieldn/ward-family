import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

SECRET_KEY = "your_secret_key_here"

# SQLite database URI (Make sure the path is correct)
SQLALCHEMY_DATABASE_URI = f"sqlite:///{os.path.join(BASE_DIR, 'users.db')}"

# Disable modification tracking to avoid warnings
SQLALCHEMY_TRACK_MODIFICATIONS = False


SECRET_KEY = os.getenv('SECRET_KEY', 'fallback_secret')


TFL_API_BASE_URL = "https://api.tfl.gov.uk"
TFL_TUBE_STATUS_ENDPOINT = "/Line/Mode/tube/Status"