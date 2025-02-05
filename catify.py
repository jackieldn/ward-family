from flask import Flask, request, jsonify
import sqlite3

app = Flask(__name__)

# Helper Function to Connect to Database
def connect_db():
    return sqlite3.connect("catify.db")

### **WEIGHT TRACKING API** ###
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
    daily_count = data.get("daily_count")

    conn = connect_db()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO medications (cat_name, name, dosage, frequency, daily_count) VALUES (?, ?, ?, ?, ?)", 
                   (cat_name, name, dosage, frequency, daily_count))
    conn.commit()
    conn.close()

    return jsonify({"message": "Medication saved successfully!"})

@app.route("/get-medications/<cat_name>", methods=["GET"])
def get_medications(cat_name):
    conn = connect_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, dosage, frequency, daily_count FROM medications WHERE cat_name = ?", (cat_name,))
    meds = cursor.fetchall()
    conn.close()

    return jsonify([{"id": row[0], "name": row[1], "dosage": row[2], "frequency": row[3], "daily_count": row[4]} for row in meds])

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

if __name__ == "__main__":
    app.run(debug=True)
