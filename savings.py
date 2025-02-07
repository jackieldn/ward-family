import sqlite3
from flask import Blueprint, request, jsonify, render_template

savings_bp = Blueprint('savings', __name__)

# Database Connection for Savings
def connect_savings_db():
    return sqlite3.connect("savings.db")

# Initialize Savings Database
def init_savings_db():
    conn = connect_savings_db()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS savings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            month TEXT NOT NULL,
            account_name TEXT NOT NULL,
            current_balance REAL NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

# Add or Update Savings Balance
@savings_bp.route('/add-savings', methods=['POST'])
def add_savings():
    data = request.get_json()
    month = data.get('month')
    savings = data.get('savings', [])  # List of savings accounts with balances

    if not month or not savings:
        return jsonify({"success": False, "message": "Invalid data received"}), 400

    conn = connect_savings_db()
    cursor = conn.cursor()

    for account in savings:
        account_name = account["account_name"]
        current_balance = float(account["current_balance"])

        # Check if entry already exists
        cursor.execute("SELECT id FROM savings WHERE month = ? AND account_name = ?", (month, account_name))
        existing_entry = cursor.fetchone()

        if existing_entry:
            cursor.execute("UPDATE savings SET current_balance = ? WHERE id = ?", (current_balance, existing_entry[0]))
        else:
            cursor.execute("INSERT INTO savings (month, account_name, current_balance) VALUES (?, ?, ?)",
                           (month, account_name, current_balance))
    
    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": "Savings balances updated successfully!"})

# Get Savings Balance by Month
@savings_bp.route('/get-savings/<month>', methods=['GET'])
def get_savings(month):
    conn = connect_savings_db()
    cursor = conn.cursor()
    cursor.execute("SELECT account_name, current_balance FROM savings WHERE month = ?", (month,))
    savings = cursor.fetchall()
    conn.close()

    return jsonify([{"account_name": row[0], "current_balance": row[1]} for row in savings])

# Balances Page
@savings_bp.route('/balances')
def balances_page():
    return render_template('balances.html')
