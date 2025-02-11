import os

SECRET_KEY = os.getenv('SECRET_KEY', 'fallback_secret')


TFL_API_BASE_URL = "https://api.tfl.gov.uk"
TFL_TUBE_STATUS_ENDPOINT = "/Line/Mode/tube/Status"