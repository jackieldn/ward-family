from flask import Flask, render_template, redirect, url_for, session, request, jsonify
import os
import sqlite3
import requests
from auth import auth
from config import SECRET_KEY, TFL_API_BASE_URL, TFL_TUBE_STATUS_ENDPOINT
from email_sender import send_budget_report
from report_utils import report_data
from savings import savings_bp, init_savings_db
from flask_sqlalchemy import SQLAlchemy
from create_db import ensure_db
from werkzeug.middleware.proxy_fix import ProxyFix
from datetime import datetime

app = Flask(__name__)
app.secret_key = SECRET_KEY
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_port=1, x_prefix=1)

# Ensure database exists before running
ensure_db()
db = SQLAlchemy(app)

# Register blueprints
app.register_blueprint(auth)
app.register_blueprint(savings_bp)

# Utility function for database connection
def connect_db():
    return sqlite3.connect("database.db")

# Routes
@app.route('/')
def index():
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    return render_template('index.html')

@app.route('/tfl-updates')
def tfl_updates():
    return render_template('tfl-updates.html')

@app.route('/get-tfl-status')
def get_tfl_status():
    response = requests.get(f"{TFL_API_BASE_URL}{TFL_TUBE_STATUS_ENDPOINT}")
    if response.status_code == 200:
        return jsonify(response.json())
    return jsonify({"error": "Failed to fetch data from TfL API"}), response.status_code

# APIs
@app.route("/add-weight", methods=["POST"])
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
def get_weights(cat_name):
    conn = connect_db()
    cursor = conn.cursor()
    cursor.execute("SELECT date, weight FROM weight_logs WHERE cat_name = ? ORDER BY date DESC LIMIT 10", (cat_name,))
    weights = cursor.fetchall()
    conn.close()
    return jsonify([{"date": row[0], "weight": row[1]} for row in weights])

# House Equity Data
INITIAL_MORTGAGE = 342000
@app.route('/add-equity', methods=['POST'])
def add_equity():
    try:
        data = request.get_json()
        conn = connect_db()
        cursor = conn.cursor()
        cursor.execute("SELECT remaining_mortgage FROM house_equity ORDER BY date DESC LIMIT 1")
        last_entry = cursor.fetchone()
        previous_remaining = last_entry[0] if last_entry else INITIAL_MORTGAGE
        new_remaining_mortgage = previous_remaining - float(data.get('principal_payment'))
        cursor.execute("""
            INSERT INTO house_equity (date, current_valuation, principal_payment, remaining_mortgage)
            VALUES (?, ?, ?, ?)
        """, (data.get('date'), float(data.get('current_valuation')), float(data.get('principal_payment')), new_remaining_mortgage))
        conn.commit()
        conn.close()
        return jsonify({"success": True, "message": "House equity data saved successfully!"})
    except Exception as e:
        return jsonify({"error": "Database error", "message": str(e)}), 500

@app.route('/get-equity', methods=['GET'])
def get_equity():
    try:
        conn = connect_db()
        cursor = conn.cursor()
        cursor.execute("SELECT id, date, current_valuation, principal_payment, remaining_mortgage FROM house_equity ORDER BY date ASC")
        records = cursor.fetchall()
        conn.close()
        return jsonify([{ "id": row[0], "date": row[1], "current_valuation": row[2], "principal_payment": row[3], "remaining_mortgage": row[4] } for row in records])
    except Exception as e:
        return jsonify({"error": "Database error", "message": str(e)}), 500

# Fetch Report Data
@app.route('/report-data/<year>/<month>')
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
