import os
import sqlite3

def ensure_db():
    """Ensures that the necessary databases and tables exist only if they are missing."""
    
    # Only print the message if the DB does not exist yet
    if not os.path.exists("house_equity.db"):
        conn = sqlite3.connect("house_equity.db")
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS house_equity (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                current_valuation REAL NOT NULL,
                principal_payment REAL NOT NULL
            )
        ''')
        conn.commit()
        conn.close()
        print("House Equity database initialized successfully!")

    # Check and create the main financial database if missing
    if not os.path.exists("database.db"):
        conn = sqlite3.connect("database.db")
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                category TEXT NOT NULL,
                title TEXT NOT NULL,
                amount REAL NOT NULL
            )
        ''')

    # Connect to the main database
    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS balances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        month TEXT NOT NULL,
        year TEXT NOT NULL,
        joint_savings REAL NOT NULL,
        jack_lisa REAL NOT NULL,
        richard_lisa REAL NOT NULL
    )
''')

    # ✅ Create Expenses Table with an ID Column
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            category TEXT NOT NULL,
            title TEXT NOT NULL,
            amount REAL NOT NULL
        )
    ''')

    # ✅ Create Unique Titles Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS titles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT UNIQUE NOT NULL
        )
    ''')

    # ✅ Create Categories Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL
        )
    ''')

    # ✅ Insert Default Categories
    default_categories = ['Housing', 'Shopping', 'Utilities', 'Pet', 'Miscellaneous', 'Savings', 'Debt']
    for category in default_categories:
        cursor.execute("INSERT OR IGNORE INTO categories (name) VALUES (?)", (category,))

    print("Database initialized successfully with expenses and categories!")

    conn.commit()
    conn.close()
