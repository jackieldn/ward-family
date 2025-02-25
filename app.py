import os
from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv
from google.oauth2 import service_account
from google.cloud import firestore
from datetime import datetime
from functools import wraps
import firebase_admin
from firebase_admin import credentials as admin_credentials, auth as firebase_auth  # ✅ Ensure correct import
import requests
import re

# Initialize Flask App
app = Flask(__name__)
app.secret_key = "your_secret_key"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Load .env variables
load_dotenv()

# Firebase API keys from .env
FIREBASE_CONFIG = {
    "apiKey": os.getenv("FIREBASE_API_KEY"),
    "authDomain": os.getenv("FIREBASE_AUTH_DOMAIN"),
    "projectId": os.getenv("FIREBASE_PROJECT_ID"),
    "storageBucket": os.getenv("FIREBASE_STORAGE_BUCKET"),
    "messagingSenderId": os.getenv("FIREBASE_MESSAGING_SENDER_ID"),
    "appId": os.getenv("FIREBASE_APP_ID"),
    "measurementId": os.getenv("FIREBASE_MEASUREMENT_ID"),
}

# Determine Firebase credential paths based on environment
if os.getenv("FLASK_ENV") == "production":
    SERVICE_ACCOUNT_FILE = "/var/www/wardfamily/creds/service_account.json"
    FIREBASE_CREDENTIALS_PATH = "/etc/wardfamily/firebase-credentials.json"
else:
    SERVICE_ACCOUNT_FILE = "creds/service_account.json"
    FIREBASE_CREDENTIALS_PATH = "creds/firebase-credentials.json"

# ✅ Ensure Firestore service account file exists
if os.path.exists(SERVICE_ACCOUNT_FILE):
    firestore_credentials = service_account.Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE)
    db = firestore.Client(credentials=firestore_credentials)
    print("✅ Firestore initialized successfully")
else:
    db = None  # Avoid breaking app if Firestore file is missing
    print(f"❌ Firestore service account file not found: {SERVICE_ACCOUNT_FILE}")

# ✅ Initialize Firebase Admin SDK (Only If Not Initialized)
if not firebase_admin._apps:
    try:
        admin_cred = admin_credentials.Certificate(FIREBASE_CREDENTIALS_PATH)
        firebase_admin.initialize_app(admin_cred)
        print("✅ Firebase Admin initialized successfully")
    except FileNotFoundError:
        print(f"❌ Firebase credentials file not found: {FIREBASE_CREDENTIALS_PATH}")

# Register Blueprints
from catify import catify_bp 
app.register_blueprint(catify_bp, url_prefix="/catify")

# ✅ Ensure Firebase API key is passed to the frontend
@app.route('/login', methods=['GET'])
def login():
    return render_template("login.html", 
        firebase_api_key=os.getenv("FIREBASE_API_KEY"),
        firebase_auth_domain=os.getenv("FIREBASE_AUTH_DOMAIN"),
        firebase_project_id=os.getenv("FIREBASE_PROJECT_ID"),
        firebase_storage_bucket=os.getenv("FIREBASE_STORAGE_BUCKET"),
        firebase_messaging_sender_id=os.getenv("FIREBASE_MESSAGING_SENDER_ID"),
        firebase_app_id=os.getenv("FIREBASE_APP_ID"),
        firebase_measurement_id=os.getenv("FIREBASE_MEASUREMENT_ID")
    )


# Require Login Decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "user_id" not in session:
            return redirect(url_for("login"))
        return f(*args, **kwargs)
    return decorated_function

@app.route('/')
@login_required
def index():
    return render_template('index.html')

@app.route('/firebase-login', methods=['POST'])
def firebase_login():
    try:
        data = request.get_json()
        print("📌 Received login request:", data)  # ✅ Log received data

        if not data or "idToken" not in data:
            return jsonify({"success": False, "message": "Missing ID token"}), 400

        id_token = data["idToken"]
        print("🔑 Verifying Firebase token...")

        decoded_token = firebase_auth.verify_id_token(id_token)
        user_id = decoded_token["uid"]

        print(f"✅ Login successful for user: {user_id}")
        session["user_id"] = user_id

        return jsonify({"success": True, "message": "Login successful!"}), 200

    except Exception as e:
        print(f"❌ Firebase Auth Error: {str(e)}")  # ✅ Print exact error
        return jsonify({"success": False, "message": str(e)}), 400


@app.route('/tfl-updates')
@login_required
def tfl_updates():
    return render_template('tfl-updates.html')

@app.route('/balances')
@login_required
def balances():
    return render_template('balances.html')

@app.route('/create')
@login_required
def create_budget():
    return render_template('create.html')

TFL_API_BASE_URL = "https://api.tfl.gov.uk"
TFL_TUBE_STATUS_ENDPOINT = "/Line/Mode/tube/Status"

@app.route('/get-tfl-status')
@login_required
def get_tfl_status():
    try:
        response = requests.get(f"{TFL_API_BASE_URL}{TFL_TUBE_STATUS_ENDPOINT}")
        if response.status_code == 200:
            return jsonify(response.json())
        else:
            return jsonify({"error": "Failed to fetch data from TfL API"}), response.status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/get-station-arrivals')
@login_required
def get_station_arrivals():
    station_id = request.args.get('stationId')
    api_url = f"{TFL_API_BASE_URL}/StopPoint/{station_id}/Arrivals"

    try:
        response = requests.get(api_url)
        arrivals = response.json() if response.ok else []

        def clean_direction(platform_name):
            match = re.search(r'(westbound|eastbound|northbound|southbound)', platform_name.lower())
            return match.group(0) if match else 'unknown'

        filtered = [
            {
                "line": a.get('lineName', 'Unknown'),
                "destination": a.get('destinationName', 'Unknown'),
                "direction": clean_direction(a.get('platformName', 'unknown')),
                "eta": round(a.get('timeToStation', 0) / 60)
            }
            for a in arrivals
        ]

        return jsonify(filtered)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/report')
@login_required
def report_page():
    return render_template('report.html')

@app.route('/equity')
@login_required
def house_equity_page():
    return render_template('house_equity.html')

@app.route('/logout')
def logout():
    session.clear()  # ✅ Clears all session data (logs the user out)
    return redirect(url_for("login"))  # ✅ Redirects to the login page

@app.route('/get-monthly-total-data', methods=['GET'])
@login_required
def get_monthly_total_data():
    user_id = session["user_id"]
    expenses_ref = db.collection("users").document(user_id).collection("expenses")
    
    expenses = expenses_ref.stream()
    
    monthly_totals = {}
    for doc in expenses:
        data = doc.to_dict()
        month = data["date"].strftime("%Y-%m")  # Convert timestamp to string format
        
        if month not in monthly_totals:
            monthly_totals[month] = 0
        monthly_totals[month] += data["amount"]
    
    return jsonify({
        "months": list(monthly_totals.keys()),
        "totals": list(monthly_totals.values())
    })

@app.route('/get-current-month-data', methods=['GET'])
@login_required
def get_current_month_data():
    user_id = session["user_id"]
    current_month = datetime.now().strftime("%Y-%m")

    expenses_ref = db.collection("users").document(user_id).collection("expenses")
    expenses = expenses_ref.stream()

    category_totals = {}
    for doc in expenses:
        data = doc.to_dict()
        expense_month = data["date"].strftime("%Y-%m")
        
        if expense_month == current_month:
            category = data["category"]
            if category not in category_totals:
                category_totals[category] = 0
            category_totals[category] += data["amount"]

    return jsonify([
        {"category": category, "total": total}
        for category, total in category_totals.items()
    ])


# Budget data save
@app.route('/get-categories')
@login_required
def get_categories():
    categories_ref = db.collection("categories")
    docs = categories_ref.stream()

    categories = []
    for doc in docs:
        data = doc.to_dict()
        if "name" in data:
            categories.append(data["name"])

    if not categories:
        return jsonify({"categories": []}), 200  # Return empty list if no categories found

    return jsonify({"categories": categories})


@app.route('/get-titles')
@login_required
def get_titles():
    titles_ref = db.collection("titles")
    docs = titles_ref.stream()
    
    titles = [doc.to_dict()["title"] for doc in docs]
    
    return jsonify({"titles": titles})


@app.route('/add', methods=["POST"])
@login_required
def add_budget():
    user_id = "user_id"
    data = request.get_json()

    print("📌 Received Budget Data:", data)  # Debugging Log

    budget_month = datetime.strptime(data["date"], "%Y-%m-%d").strftime("%Y-%m")

    expenses = data["expenses"]
    budget_ref = db.collection("users").document(user_id).collection("budgets").document(budget_month)

    for expense in expenses:
        expense["date"] = datetime.strptime(data["date"], "%Y-%m-%d")
        budget_ref.collection("expenses").add(expense)

    return jsonify({"message": f"Budget for {budget_month} saved successfully!"})


# House Equity Data
INITIAL_MORTGAGE = 342000
@app.route('/add-equity', methods=['POST'])
@login_required
def add_equity():
    try:
        data = request.get_json()
        print("Received data:", data)  # Debugging log

        if not data.get("date") or "current_valuation" not in data or "principal_payment" not in data:
            return jsonify({"error": "Missing required fields"}), 400  # Return error if any field is missing

        conn = sqlite3.connect("house_equity.db")
        cursor = conn.cursor()

        # Fetch total principal paid so far
        cursor.execute("SELECT SUM(principal_payment) FROM house_equity")
        total_principal_paid = cursor.fetchone()[0] or 0

        # Calculate remaining mortgage
        remaining_mortgage = INITIAL_MORTGAGE - (total_principal_paid + float(data["principal_payment"]))

        cursor.execute(
            "INSERT INTO house_equity (date, current_valuation, principal_payment, remaining_mortgage) VALUES (?, ?, ?, ?)",
            (
                data["date"],
                float(data["current_valuation"]),
                float(data["principal_payment"]),
                remaining_mortgage
            )
        )

        conn.commit()
        conn.close()

        return jsonify({"message": "Equity data added successfully!"}), 201
    except Exception as e:
        print("Error in /add-equity:", str(e))  # Log error
        return jsonify({"error": "Database error", "message": str(e)}), 500

@app.route('/get-equity', methods=['GET'])
@login_required
def get_equity():
    try:
        conn = sqlite3.connect("house_equity.db")
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Fetch all equity data
        cursor.execute("SELECT * FROM house_equity ORDER BY date DESC")
        equity_data = cursor.fetchall()

        # Fetch total principal payments
        cursor.execute("SELECT SUM(principal_payment) FROM house_equity")
        total_principal_paid = cursor.fetchone()[0] or 0

        # Fetch total interest paid
        cursor.execute("SELECT SUM((remaining_mortgage * 0.0524) / 12) FROM house_equity WHERE remaining_mortgage > 0")
        total_interest_paid = cursor.fetchone()[0] or 0

        # Calculate equity percentage for each entry
        formatted_equity_data = []
        for row in equity_data:
            remaining_mortgage = row["remaining_mortgage"]
            current_valuation = row["current_valuation"]
            equity_percent = (1 - (remaining_mortgage / current_valuation)) * 100 if current_valuation > 0 else 0

            formatted_equity_data.append({
                "date": row["date"],
                "current_valuation": row["current_valuation"],
                "principal_payment": row["principal_payment"],
                "remaining_mortgage": remaining_mortgage,
                "equity_percent": round(equity_percent, 2)  # Ensure it always exists
            })

        conn.close()

        return jsonify({
            "equity_data": formatted_equity_data,
            "total_principal_paid": total_principal_paid,
            "total_interest_paid": total_interest_paid
        })

    except Exception as e:
        return jsonify({"error": "Database error", "message": str(e)}), 500
    
# Fetch Report Data
@app.route('/report-data/<int:year>/<int:month>', methods=['GET'])
@login_required
def report_data(year, month):
    try:
        user_id = "jackward"  # Ensure we always fetch from 'jackward'

        # Format the month correctly (YYYY-MM)
        budget_month = f"{year}-{month:02d}"

        # Query Firestore for expenses within the selected budget month
        expenses_ref = (
            db.collection("users")
            .document(user_id)
            .collection("budgets")
            .document(budget_month)
            .collection("expenses")
        )

        query = expenses_ref.stream()

        expenses = []
        for doc in query:
            data = doc.to_dict()
            data["id"] = doc.id
            data["date"] = data["date"].strftime("%Y-%m-%d")
            expenses.append(data)

        return jsonify(expenses)

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route('/delete-title/<budget_month>/<expense_id>', methods=['DELETE'])
@login_required
def delete_title(budget_month, expense_id):
    try:
        user_id = "jackward"
        print(f"🔍 Attempting to delete: budget_month={budget_month}, expense_id={expense_id}")

        expense_ref = (
            db.collection("users")
            .document(user_id)
            .collection("budgets")
            .document(budget_month)
            .collection("expenses")
            .document(expense_id)
        )

        # Delete the expense from Firestore
        expense_ref.delete()
        print(f"✅ Deleted successfully: {expense_id}")

        return jsonify({"message": f"Title {expense_id} deleted successfully!"}), 200
    except Exception as e:
        print(f"❌ Error deleting: {str(e)}")
        return jsonify({"error": str(e)}), 500


# Ensure Flask runs correctly
if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0", port=5000)
