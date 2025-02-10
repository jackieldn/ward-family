from flask import Flask, render_template, request, jsonify
import sqlite3
import requests
from config import TFL_API_BASE_URL, TFL_TUBE_STATUS_ENDPOINT
from email_sender import send_budget_report
from report_utils import report_data
from savings import savings_bp, init_savings_db

app = Flask(__name__)
app.register_blueprint(savings_bp)

#Allow external access
from werkzeug.middleware.proxy_fix import ProxyFix
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_port=1, x_prefix=1)

# Main Dashboard
@app.route('/')
def index():
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

# Database Connection
def connect_db():
    return sqlite3.connect("catify.db")

### Weight Tracking API ###
@app.route("/add-weight", methods=["POST"])
def add_weight():
    data = request.get_json()
    cat_name = data["cat_name"]
    date = data["date"]
    weight = data["weight"]

    conn = connect_db()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO weight_logs (cat_name, date, weight) VALUES (?, ?, ?)", (cat_name, date, weight))
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

### **MEDICATION API** ###
@app.route("/add-medication", methods=["POST"])
def add_medication():
    data = request.get_json()
    cat_name = data["cat_name"]
    name = data["name"]
    dosage = data["dosage"]
    frequency = data["frequency"]
    daily_count = data.get("daily_count", 1)  # Default to 1
    start_date = data.get("start_date")  # New field

    conn = connect_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO medications (cat_name, name, dosage, frequency, daily_count, start_date) 
        VALUES (?, ?, ?, ?, ?, ?)
    """, (cat_name, name, dosage, frequency, daily_count, start_date))
    conn.commit()
    conn.close()

    return jsonify({"message": "Medication saved successfully!"})

@app.route("/get-medications/<cat_name>", methods=["GET"])
def get_medications(cat_name):
    conn = connect_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, dosage, frequency, daily_count, start_date FROM medications WHERE cat_name = ?", (cat_name,))
    meds = cursor.fetchall()
    conn.close()

    return jsonify([{
        "id": row[0], 
        "name": row[1], 
        "dosage": row[2], 
        "frequency": row[3], 
        "daily_count": row[4], 
        "start_date": row[5]
    } for row in meds])

@app.route("/delete-medication/<int:med_id>", methods=["DELETE"])
def delete_medication(med_id):
    conn = connect_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM medications WHERE id = ?", (med_id,))
    conn.commit()
    conn.close()

    return jsonify({"message": "Medication deleted successfully!"})

### **APPOINTMENT API** ###
@app.route("/add-appointment", methods=["POST"])
def add_appointment():
    data = request.get_json()
    cat_name = data["cat_name"]
    title = data["title"]
    date = data["date"]
    time = data["time"]
    notes = data.get("notes")

    conn = connect_db()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO appointments (cat_name, title, date, time, notes) VALUES (?, ?, ?, ?, ?)", 
                   (cat_name, title, date, time, notes))
    conn.commit()
    conn.close()

    return jsonify({"message": "Appointment saved successfully!"})

@app.route("/get-appointments/<cat_name>", methods=["GET"])
def get_appointments(cat_name):
    conn = connect_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, title, date, time, notes FROM appointments WHERE cat_name = ?", (cat_name,))
    appts = cursor.fetchall()
    conn.close()

    return jsonify([{"id": row[0], "title": row[1], "date": row[2], "time": row[3], "notes": row[4]} for row in appts])

@app.route("/delete-appointment/<int:appt_id>", methods=["DELETE"])
def delete_appointment(appt_id):
    conn = connect_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM appointments WHERE id = ?", (appt_id,))
    conn.commit()
    conn.close()

    return jsonify({"message": "Appointment deleted successfully!"})

# Home route: Displays budget entries
@app.route('/create')
def home():
    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()
    
    cursor.execute("SELECT name FROM categories")
    categories = [row[0] for row in cursor.fetchall()]
    
    conn.close()
    return render_template("create.html", categories=categories)

# Report Page
@app.route('/report')
def report_page():
    return render_template("report.html")

# Cat Healthcare Tracker Page
@app.route('/catify')
def catify():
    return render_template('catify.html')

@app.route('/send-report', methods=['POST'])
def send_report():
    data = request.get_json()
    email = data.get("email")
    year = data.get("year")
    month = data.get("month")

    return send_budget_report(email, year, month)

# House Equity Page
@app.route('/equity')
def house_equity():
    return render_template("house_equity.html")

# Add House Equity Data (Now uses house_equity.db)
INITIAL_MORTGAGE = 342000  # Fixed initial mortgage

@app.route('/add-equity', methods=['POST'])
def add_equity():
    try:
        data = request.get_json()
        date = data.get('date')
        current_valuation = float(data.get('current_valuation'))
        principal_payment = float(data.get('principal_payment'))

        if not date or current_valuation <= 0 or principal_payment < 0:
            return jsonify({"success": False, "message": "Invalid data"}), 400

        conn = sqlite3.connect("house_equity.db")
        cursor = conn.cursor()

        # Get the last remaining mortgage snapshot
        cursor.execute("SELECT remaining_mortgage FROM house_equity ORDER BY date DESC LIMIT 1")
        last_entry = cursor.fetchone()

        previous_remaining = last_entry[0] if last_entry else INITIAL_MORTGAGE
        new_remaining_mortgage = previous_remaining - principal_payment

        # Insert the new record
        cursor.execute("""
            INSERT INTO house_equity (date, current_valuation, principal_payment, remaining_mortgage)
            VALUES (?, ?, ?, ?)
        """, (date, current_valuation, principal_payment, new_remaining_mortgage))

        conn.commit()
        conn.close()

        return jsonify({"success": True, "message": "House equity data saved successfully!"})
    except Exception as e:
        return jsonify({"error": "Database error", "message": str(e)}), 500


@app.route('/get-equity', methods=['GET'])
def get_equity():
    try:
        conn = sqlite3.connect("house_equity.db")
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id, date, current_valuation, principal_payment, remaining_mortgage 
            FROM house_equity 
            ORDER BY date ASC  -- Sorting ASC ensures we process payments chronologically
        """)
        records = cursor.fetchall()
        conn.close()

        total_principal_paid = 0
        total_interest_paid = 0
        monthly_interest_rate = 5.23 / 100 / 12  # 5.23% annual rate divided by 12 months
        previous_remaining_mortgage = INITIAL_MORTGAGE

        equity_data = []

        for row in records:
            principal_payment = row[3]
            total_principal_paid += principal_payment

            # Calculate interest paid (assumption: interest is based on the previous balance)
            monthly_interest = previous_remaining_mortgage * monthly_interest_rate
            total_interest_paid += monthly_interest

            remaining_mortgage = previous_remaining_mortgage - principal_payment
            previous_remaining_mortgage = remaining_mortgage  # Update for the next calculation

            equity_percent = round(((row[2] - remaining_mortgage) / row[2]) * 100, 2) if row[2] > 0 else 0

            equity_data.append({
                "id": row[0],
                "date": row[1],
                "current_valuation": row[2],
                "principal_payment": row[3],
                "remaining_mortgage": remaining_mortgage,
                "equity_percent": equity_percent
            })

        return jsonify({
            "equity_data": equity_data,
            "total_principal_paid": round(total_principal_paid, 2),
            "total_interest_paid": round(total_interest_paid, 2)
        })
    except Exception as e:
        return jsonify({"error": "Database error", "message": str(e)}), 500


# Fetch report data with corrected Jack & Richard Transfer calculations
@app.route('/report-data/<year>/<month>')
def report_data(year, month):
    date_filter = f"{year}-{month}-%"

    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()

    cursor.execute("SELECT category, title, amount FROM expenses WHERE date LIKE ?", (date_filter,))
    expenses = cursor.fetchall()
    conn.close()

    expense_list = []
    total_expenses = 0
    savings_total = 0
    shared_expenses = 0
    joint_savings = 0
    gift_pot = 0
    jack_savings = 0
    richard_savings = 0

    for category, title, amount in expenses:
        amount = float(amount)
        total_expenses += amount
        expense_list.append({"category": category, "title": title, "amount": amount})

        # Categories that are shared between Jack and Richard
        if category in ["Housing", "Food", "Utilities", "Pet", "Miscellaneous"]:
            shared_expenses += amount
        # Titles that are part of shared expenses
        if title == "Joint Savings":
            joint_savings += amount
        if title == "Gift Pot":
            gift_pot += amount
        # Individual savings
        if title == "Jack Savings":
            jack_savings += amount
        if title == "Richard Savings":
            richard_savings += amount
        # Total savings amount
        if category == "Savings":
            savings_total += amount

    # Compute Jack & Richard Transfers
    shared_total = (shared_expenses + joint_savings + gift_pot) / 2
    jack_transfer = shared_total + jack_savings  # Now includes Jack Savings
    richard_transfer = shared_total + richard_savings  # Now includes Richard Savings

    return jsonify({
        "expenses": expense_list,
        "jack_transfer": round(jack_transfer, 2),
        "richard_transfer": round(richard_transfer, 2),
        "overall_total": round(total_expenses, 2),
        "total_savings": round(savings_total, 2)
    })

# Dashboard Monthly Total Expenses
@app.route('/get-monthly-total-data')
def get_monthly_total_data():
    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()
    
    query = """
        SELECT strftime('%Y-%m', date) AS month, SUM(amount) 
        FROM expenses  
        GROUP BY month 
        ORDER BY month ASC
    """
    
    cursor.execute(query)
    data = cursor.fetchall()
    conn.close()
    
    monthly_data = {"months": [], "totals": []}
    for row in data:
        monthly_data["months"].append(row[0])
        monthly_data["totals"].append(row[1])

    return jsonify(monthly_data)

# Dashboard Monthly Total Savings
@app.route('/get-monthly-savings-data')
def get_monthly_savings_data():
    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()
    
    query = """
        SELECT strftime('%Y-%m', date) AS month, SUM(amount) 
        FROM expenses  
        WHERE category = 'Savings'
        GROUP BY month 
        ORDER BY month ASC
    """
    
    cursor.execute(query)
    data = cursor.fetchall()
    conn.close()
    
    monthly_data = {"months": [], "totals": []}
    for row in data:
        monthly_data["months"].append(row[0])
        monthly_data["totals"].append(row[1])

    return jsonify(monthly_data)

# Dashboard Current Month
from datetime import datetime

@app.route('/get-current-month-data')
def get_current_month_data():
    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()
    
    current_month = datetime.now().strftime('%Y-%m')

    query = """
        SELECT category, SUM(amount)
        FROM expenses
        WHERE strftime('%Y-%m', date) = ?
        GROUP BY category
        ORDER BY category
    """
    
    cursor.execute(query, (current_month,))
    data = cursor.fetchall()
    conn.close()

    category_data = [{"category": row[0], "total": row[1]} for row in data]

    return jsonify(category_data)

# Categories
@app.route('/get-categories')
def get_categories():
    try:
        conn = sqlite3.connect("database.db")
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM categories")
        categories = [row[0] for row in cursor.fetchall()]
        conn.close()
        return jsonify({"categories": categories})
    except Exception as e:
        print(f"❌ Error fetching categories: {e}")
        return jsonify({"error": "Database error"}), 500

# Add Expenses Route
@app.route('/add', methods=['POST'])
def add_expense():
    try:
        data = request.get_json()
        date = data.get('date')
        expenses = data.get('expenses', [])

        if not date or not expenses:
            return jsonify({"success": False, "message": "Invalid data received"}), 400

        conn = sqlite3.connect("database.db")
        cursor = conn.cursor()

        for expense in expenses:
            title = expense["title"]
            category = expense["category"]

            # ✅ Convert category to match database case
            cursor.execute("SELECT name FROM categories WHERE LOWER(name) = LOWER(?)", (category,))
            db_category = cursor.fetchone()

            if db_category:
                category = db_category[0]  # ✅ Use the proper case from the database

            amount = float(expense["amount"])

            cursor.execute("""
                INSERT INTO expenses (date, category, title, amount)
                VALUES (?, ?, ?, ?)
            """, (date, category, title, amount))

        conn.commit()
        conn.close()

        return jsonify({"success": True, "message": "Expenses saved successfully!"})
    except Exception as e:
        return jsonify({"error": "Database error", "message": str(e)}), 500

# Fetch Expense Titles
@app.route('/get-titles')
def get_titles():
    try:
        conn = sqlite3.connect("database.db")
        cursor = conn.cursor()
        cursor.execute("SELECT title FROM titles")
        titles = [row[0] for row in cursor.fetchall()]
        conn.close()

        return jsonify({"titles": titles})
    except Exception as e:
        print(f"❌ Error fetching titles: {e}")
        return jsonify({"error": "Database error"}), 500
    

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
