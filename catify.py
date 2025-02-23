from flask import Blueprint, request, jsonify, session
from datetime import datetime
from functools import wraps
from app import db

catify_bp = Blueprint("catify_bp", __name__)

# Require Login Middleware
def require_login(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"error": "Authentication required"}), 401
        return f(*args, **kwargs)
    return decorated_function

from flask import Blueprint, render_template

@catify_bp.route("/", methods=["GET"])
@require_login
def catify_home():
    return render_template("catify.html") 

# Fetch Cat Profiles
@catify_bp.route("/get-cats", methods=["GET"])
@require_login
def get_cats():
    try:
        user_id = session.get("user_id")
        if not user_id:
            return jsonify({"error": "Unauthorized"}), 401

        cats_ref = db.collection("users").document("catify").collection("cats")
        cats_docs = cats_ref.stream()

        cats_data = {}
        for doc in cats_docs:
            cat = doc.to_dict()
            cats_data[doc.id] = cat

            # Fetch insurance if available
            insurance_ref = cats_ref.document(doc.id).collection("insurance").stream()
            for ins_doc in insurance_ref:
                cat["insurance"] = ins_doc.to_dict()
        
        return jsonify(cats_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Fetch Weights for a Cat
@catify_bp.route("/get-weights/<cat_id>", methods=["GET"])
@require_login
def get_weights(cat_id):
    try:
        user_id = session.get("user_id")
        if not user_id:
            return jsonify({"error": "Unauthorized"}), 401

        weight_ref = db.collection("users").document("catify").collection("cats").document(cat_id).collection("weight").stream()
        weight_data = [{"id": doc.id, **doc.to_dict()} for doc in weight_ref]

        return jsonify(weight_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Add Weight Entry
@catify_bp.route("/add-weight", methods=["POST"])
@require_login
def add_weight():
    try:
        user_id = session.get("user_id")
        if not user_id:
            return jsonify({"error": "Unauthorized"}), 401

        data = request.json
        cat_id = data.get("cat_id")
        weight = data.get("weight")
        date = data.get("date")

        if not cat_id or not weight or not date:
            return jsonify({"error": "Missing required fields"}), 400

        # Reference to the weight subcollection
        weight_ref = db.collection("users").document("catify").collection("cats").document(cat_id).collection("weight")
        new_weight = weight_ref.add({"weight": weight, "date": date})

        return jsonify({"message": "Weight added successfully", "weight_id": new_weight[1].id})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@catify_bp.route("/get-medications/<cat_id>", methods=["GET"])
@require_login
def get_medications(cat_id):
    """Fetches medication records for a cat."""
    try:
        meds_ref = db.collection("users").document("catify").collection("cats").document(cat_id).collection("medications").stream()
        medications = [{"id": doc.id, **doc.to_dict()} for doc in meds_ref]

        return jsonify(medications), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@catify_bp.route("/add-medication", methods=["POST"])
@require_login
def add_medication():
    """Adds a medication record for a cat."""
    try:
        data = request.get_json()
        cat_id = data.get("cat_id")
        medication_name = data.get("medication_name")
        dosage = data.get("dosage")
        frequency = data.get("frequency")
        next_application = data.get("next_application")

        if not cat_id or not medication_name or not dosage or not frequency or not next_application:
            return jsonify({"error": "Missing required fields"}), 400

        meds_ref = db.collection("users").document("catify").collection("cats").document(cat_id).collection("medications")
        new_med = meds_ref.add({
            "medication_name": medication_name,
            "dosage": float(dosage),
            "frequency": frequency,
            "next_application": next_application
        })

        return jsonify({"message": "Medication added successfully!", "medication_id": new_med[1].id}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@catify_bp.route("/delete-medication/<cat_id>/<medication_id>", methods=["DELETE"])
@require_login
def delete_medication(cat_id, medication_id):
    """Deletes a medication record for a cat."""
    try:
        med_ref = db.collection("users").document("catify").collection("cats").document(cat_id).collection("medications").document(medication_id)
        med_ref.delete()

        return jsonify({"message": "Medication deleted successfully!"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@catify_bp.route("/get-reminders/<cat_id>", methods=["GET"])
@require_login
def get_reminders(cat_id):
    """Fetches reminder records for a cat."""
    try:
        reminders_ref = db.collection("users").document("catify").collection("cats").document(cat_id).collection("reminders").stream()
        reminders = [{"id": doc.id, **doc.to_dict()} for doc in reminders_ref]

        return jsonify(reminders), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@catify_bp.route("/add-reminder", methods=["POST"])
@require_login
def add_reminder():
    """Adds a reminder for a cat."""
    try:
        data = request.get_json()
        cat_id = data.get("cat_id")
        name = data.get("name")
        notes = data.get("notes", "")
        next_date = data.get("next_date")

        if not cat_id or not name or not next_date:
            return jsonify({"error": "Missing required fields"}), 400

        reminders_ref = db.collection("users").document("catify").collection("cats").document(cat_id).collection("reminders")
        new_reminder = reminders_ref.add({
            "name": name,
            "notes": notes,
            "next_date": next_date
        })

        return jsonify({"message": "Reminder added successfully!", "reminder_id": new_reminder[1].id}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@catify_bp.route("/delete-reminder/<cat_id>/<reminder_id>", methods=["DELETE"])
@require_login
def delete_reminder(cat_id, reminder_id):
    """Deletes a reminder for a cat."""
    try:
        reminder_ref = db.collection("users").document("catify").collection("cats").document(cat_id).collection("reminders").document(reminder_id)
        reminder_ref.delete()

        return jsonify({"message": "Reminder deleted successfully!"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
