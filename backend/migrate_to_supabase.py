import sqlite3
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

supabase: Client = create_client(url, key)

try:
    auth_response = supabase.auth.sign_in_with_password({"email": "divyanshik30@gmail.com", "password": "123456"})
    print("Logged in!")
except Exception as e:
    print("Auth failed:", e)

db_path = os.path.join(os.path.dirname(__file__), "data", "insurebot_local.db")
if not os.path.exists(db_path):
    print("No local DB found.")
    exit(0)

conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
c = conn.cursor()

# Get chats
c.execute("SELECT * FROM chats")
chats = c.fetchall()

for chat in chats:
    chat_dict = dict(chat)
    try:
        existing = supabase.table("chats").select("id").eq("id", chat_dict["id"]).execute()
        if not existing.data:
            supabase.table("chats").insert({
                "id": chat_dict["id"],
                "user_id": chat_dict["user_id"],
                "title": chat_dict["title"],
                "created_at": chat_dict["created_at"]
            }).execute()
            print(f"Migrated chat: {chat_dict['title']}")
    except Exception as e:
        print(f"Failed to migrate chat {chat_dict['id']}: {e}")

# Get messages
c.execute("SELECT * FROM messages ORDER BY created_at ASC")
messages = c.fetchall()

for msg in messages:
    msg_dict = dict(msg)
    try:
        # We don't include 'id' so Supabase generates a new serial/UUID ID to avoid sequence conflicts.
        supabase.table("messages").insert({
            "chat_id": msg_dict["chat_id"],
            "role": msg_dict["role"],
            "content": msg_dict["content"],
            "created_at": msg_dict["created_at"]
        }).execute()
        print(f"Migrated message for chat: {msg_dict['chat_id']}")
    except Exception as e:
        print(f"Failed to migrate message {msg_dict['id']}: {e}")

print("Migration Complete!")
