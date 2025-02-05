import sqlite3
from flask import jsonify

def report_data(year, month):
    date_filter = f"{year}-{month}-%"

    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()

    # ✅ Fetch `id` along with category, title, and amount
    cursor.execute("SELECT id, category, title, amount FROM expenses WHERE date LIKE ?", (date_filter,))
    expenses = cursor.fetchall()
    conn.close()

    expense_list = []
    for expense_id, category, title, amount in expenses:
        expense_list.append({
            "id": expense_id,  # ✅ Include ID
            "category": category,
            "title": title,
            "amount": float(amount)
        })

    # ✅ Fixed indentation
    for expense_id, category, title, amount in expenses:
        amount = float(amount)
        total_expenses += amount
        expense_list.append({"id": expense_id, "category": category, "title": title, "amount": amount})

        if category in ["Housing", "Food", "Utilities", "Pet", "Miscellaneous"]:
            shared_expenses += amount
        if title == "Joint Savings":
            joint_savings += amount
        if title == "Gift Pot":
            gift_pot += amount
        if title == "Jack Savings":
            jack_savings += amount
        if title == "Richard Savings":
            richard_savings += amount
        if category == "Savings":
            savings_total += amount

    shared_total = (shared_expenses + joint_savings + gift_pot) / 2
    jack_transfer = shared_total + jack_savings
    richard_transfer = shared_total + richard_savings

    return jsonify({
        "expenses": expense_list,
        "jack_transfer": round(jack_transfer, 2),
        "richard_transfer": round(richard_transfer, 2),
        "overall_total": round(total_expenses, 2),
        "total_savings": round(savings_total, 2)
    })
