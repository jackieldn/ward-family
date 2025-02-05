import sqlite3

# Connect to the house equity database
conn = sqlite3.connect("house_equity.db")
cursor = conn.cursor()

# Create House Equity Table
cursor.execute('''
    CREATE TABLE IF NOT EXISTS house_equity (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        current_valuation REAL NOT NULL,
        principal_payment REAL NOT NULL
    )
''')

print("House Equity database initialized successfully!")

# Close this connection
conn.commit()
conn.close()

# Connect to the main database
conn = sqlite3.connect("database.db")
cursor = conn.cursor()

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
default_categories = ['Housing', 'Food', 'Utilities', 'Transportation', 'Entertainment']
for category in default_categories:
    cursor.execute("INSERT OR IGNORE INTO categories (name) VALUES (?)", (category,))

print("Database initialized successfully with expenses and categories!")

conn.commit()
conn.close()
