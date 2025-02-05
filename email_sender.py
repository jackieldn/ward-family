import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from flask import jsonify
from report_utils import report_data


SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587  # Change from 465 to 587 for STARTTLS
SENDER_EMAIL = "jackcward24@gmail.com"
SENDER_PASSWORD = "eiqb czqp rxci scjx"

def send_budget_report(email, year, month):
    try:
        print(f"📧 Sending email to: {email} for {month}/{year}")

        # Fetch report data
        response = report_data(year, month)
        report = response.get_json()

        if not report:
            print("🚨 No report data available!")
            return jsonify({"success": False, "message": "No report data available"}), 400

        # Construct email content
        subject = f"Budget Report - {month}/{year}"
        body = f"""
        <h2>Budget Report - {month}/{year}</h2>
        <p><strong>Jack Transfer:</strong> £{report['jack_transfer']}</p>
        <p><strong>Richard Transfer:</strong> £{report['richard_transfer']}</p>
        <p><strong>Overall Total:</strong> £{report['overall_total']}</p>
        <p><strong>Total Savings:</strong> £{report['total_savings']}</p>
        <h3>Expenses:</h3>
        <ul>
        """
        for expense in report['expenses']:
            body += f"<li>{expense['title']} - £{expense['amount']} ({expense['category']})</li>"
        body += "</ul>"

        # Set up the email
        msg = MIMEMultipart()
        msg['From'] = SENDER_EMAIL
        msg['To'] = email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, "html"))

        # Sending Email using Gmail SMTP
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()  # Use STARTTLS for security
            print("🔐 Logging in to Gmail SMTP...")
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            print("✅ Login successful! Sending email...")
            server.sendmail(SENDER_EMAIL, email, msg.as_string())
            print("📨 Email sent successfully!")

        return jsonify({"success": True, "message": "Report sent successfully!"})

    except smtplib.SMTPAuthenticationError as auth_error:
        print(f"❌ SMTP Authentication Error: {auth_error}")
        return jsonify({"error": "Authentication failed, check App Password."}), 500
    except smtplib.SMTPException as smtp_error:
        print(f"❌ SMTP Error: {smtp_error}")
        return jsonify({"error": "SMTP error occurred."}), 500
    except Exception as e:
        print(f"❌ General Error: {e}")
        return jsonify({"error": str(e)}), 500

