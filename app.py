from flask import Flask, render_template, request, redirect, url_for, session, request, jsonify
import os
import sqlite3
import requests
import re
from functools import wraps
from auth import auth
from config import SQLALCHEMY_DATABASE_URI
from config import SECRET_KEY, TFL_API_BASE_URL, TFL_TUBE_STATUS_ENDPOINT
from email_sender import send_budget_report
from report_utils import report_data
from catify import catify_bp
from savings import savings_bp, init_savings_db
from flask_sqlalchemy import SQLAlchemy
from create_db import ensure_db
from werkzeug.middleware.proxy_fix import ProxyFix
from datetime import datetime

app = Flask(__name__)
app.secret_key = SECRET_KEY
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_port=1, x_prefix=1)
app.config["SQLALCHEMY_DATABASE_URI"] = SQLALCHEMY_DATABASE_URI
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Ensure database exists before running
ensure_db()
db = SQLAlchemy(app)

# Register blueprints
app.register_blueprint(auth)
app.register_blueprint(savings_bp)
app.register_blueprint(catify_bp, url_prefix="/catify")

# Global login protection for the entire app
@app.before_request
def require_login():
    open_routes = ['auth.login', 'auth.register', 'static']
    if 'user_id' not in session and request.endpoint not in open_routes:
        return redirect(url_for('auth.login'))

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))  # Redirect to login if not logged in
        return f(*args, **kwargs)
    return decorated_function

# Utility function for database connection
def connect_db():
    return sqlite3.connect("database.db")

# Routes
@app.route('/')
@login_required
def index():
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    return render_template('index.html')

@app.route('/tfl-updates')
@login_required
def tfl_updates():
    return render_template('tfl-updates.html')

@app.route('/create')
@login_required
def create_budget():
    return render_template('create.html')

@app.route('/get-tfl-status')
@login_required
def get_tfl_status():
    response = requests.get(f"{TFL_API_BASE_URL}{TFL_TUBE_STATUS_ENDPOINT}")
    if response.status_code == 200:
        return jsonify(response.json())
    return jsonify({"error": "Failed to fetch data from TfL API"}), response.status_codes

@app.route('/get-station-arrivals')
@login_required
def get_station_arrivals():
    station_id = request.args.get('stationId')
    api_url = f"{TFL_API_BASE_URL}/StopPoint/{station_id}/Arrivals"
    response = requests.get(api_url)
    arrivals = response.json() if response.ok else []

    def clean_direction(platform_name):
        # Extract direction like 'westbound' or 'northbound' using regex
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

    print("Filtered Station Arrivals Data:", filtered)  # For debugging
    return jsonify(filtered)

@app.route('/report')
@login_required
def report_page():
    return render_template('report.html')

@app.route('/equity')
@login_required
def house_equity_page():
    return render_template('house_equity.html')

@app.route('/get-monthly-total-data', methods=['GET'])
@login_required
def get_monthly_total_data():
    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()
    
    cursor.execute("SELECT strftime('%Y-%m', date) AS month, SUM(amount) FROM expenses GROUP BY month")
    data = cursor.fetchall()
    conn.close()

    response = {
        "months": [row[0] for row in data],
        "totals": [row[1] for row in data]
    }
    
    return jsonify(response)

@app.route('/get-current-month-data', methods=['GET'])
@login_required
def get_current_month_data():
    current_month = datetime.now().strftime("%Y-%m")
    
    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()
    
    cursor.execute("SELECT category, SUM(amount) FROM expenses WHERE strftime('%Y-%m', date) = ? GROUP BY category", (current_month,))
    data = cursor.fetchall()
    conn.close()
    
    response = [{"category": row[0], "total": row[1]} for row in data]

    return jsonify(response)

# APIs
@app.route("/add-weight", methods=["POST"])
@login_required
def add_weight():
    data = request.get_json()
    conn = connect_db()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO weight_logs (cat_name, date, weight) VALUES (?, ?, ?)",
                   (data["cat_name"], data["date"], data["weight"]))
    conn.commit()
    conn.close()
    return jsonify({"message": "Weight saved successfully!"})

@app.route("/get-weights/<cat_name>", methods=["GET"])
@login_required
def get_weights(cat_name):
    conn = connect_db()
    cursor = conn.cursor()
    cursor.execute("SELECT date, weight FROM weight_logs WHERE cat_name = ? ORDER BY date DESC LIMIT 10", (cat_name,))
    weights = cursor.fetchall()
    conn.close()
    return jsonify([{"date": row[0], "weight": row[1]} for row in weights])

# Budget data save
@app.route('/get-categories')
@login_required
def get_categories():
    conn = connect_db()
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM categories ORDER BY id")
    categories = [row[0] for row in cursor.fetchall()]
    conn.close()
    return jsonify({"categories": categories})


@app.route('/get-titles')
@login_required
def get_titles():
    conn = connect_db()
    cursor = conn.cursor()
    cursor.execute("SELECT title FROM titles ORDER BY title")
    titles = [row[0] for row in cursor.fetchall()]
    conn.close()
    return jsonify({"titles": titles})


@app.route('/add', methods=["POST"])
@login_required
def add_budget():
    data = request.get_json()
    date = data["date"]
    expenses = data["expenses"]

    conn = connect_db()
    cursor = conn.cursor()

    for expense in expenses:
        cursor.execute("INSERT INTO expenses (date, category, title, amount) VALUES (?, ?, ?, ?)",
                       (date, expense["category"], expense["title"], expense["amount"]))

    conn.commit()
    conn.close()
    return jsonify({"message": "Budget saved successfully!"})

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
@app.route('/report-data/<year>/<month>')
@login_required
def report_data(year, month):
    conn = connect_db()
    cursor = conn.cursor()
    cursor.execute("SELECT category, title, amount FROM expenses WHERE date LIKE ?", (f"{year}-{month}-%",))
    expenses = cursor.fetchall()
    conn.close()
    return jsonify([{ "category": row[0], "title": row[1], "amount": float(row[2]) } for row in expenses])

# Ensure Flask runs correctly
if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0", port=5000)
