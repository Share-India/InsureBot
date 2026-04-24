import sqlite3
import os
import uuid
import datetime

# Create a local SQLite database in the backend/data directory
db_path = os.path.join(os.path.dirname(__file__), "data", "insurebot_local.db")
os.makedirs(os.path.dirname(db_path), exist_ok=True)

def get_db_connection():
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    c = conn.cursor()
    # Create chats table
    c.execute('''
        CREATE TABLE IF NOT EXISTS chats (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            title TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    # Create messages table
    c.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chat_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (chat_id) REFERENCES chats (id) ON DELETE CASCADE
        )
    ''')
    conn.commit()
    conn.close()

init_db()

def create_chat(user_id, title):
    chat_id = str(uuid.uuid4())
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("INSERT INTO chats (id, user_id, title) VALUES (?, ?, ?)", (chat_id, user_id, title))
    conn.commit()
    conn.close()
    return chat_id

def insert_message(chat_id, role, content):
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("INSERT INTO messages (chat_id, role, content) VALUES (?, ?, ?)", (chat_id, role, content))
    conn.commit()
    conn.close()

def get_user_chats(user_id):
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT id, title, created_at FROM chats WHERE user_id = ? ORDER BY created_at DESC", (user_id,))
    rows = c.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_chat_messages(chat_id):
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT id, chat_id, role, content, created_at FROM messages WHERE chat_id = ? ORDER BY created_at ASC", (chat_id,))
    rows = c.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def delete_chat(chat_id):
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("DELETE FROM chats WHERE id = ?", (chat_id,))
    conn.commit()
    conn.close()
