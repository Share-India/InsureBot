import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

URL = os.environ.get("SUPABASE_URL")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(URL, SERVICE_KEY)

def wipe_db():
    print("Starting database wipe...")
    
    # 1. Clear out public tables manually (Supabase doesn't easily allow DELETE without filters, so we eq an empty string to false or just delete with neq)
    print("Emptying messages...")
    supabase.table("messages").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    
    print("Emptying chats...")
    supabase.table("chats").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    
    print("Emptying profiles...")
    supabase.table("profiles").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()

    # 2. Delete all auth users (this will also cascade delete if foreign keys are set properly, but manual above is safe)
    print("Fetching auth users...")
    response = supabase.auth.admin.list_users()
    users = response.users if hasattr(response, 'users') else response

    print(f"Found {len(users)} users.")
    for user in users:
        print(f"Deleting user {user.email} ({user.id})")
        supabase.auth.admin.delete_user(user.id)

    print("Wipe complete!")

if __name__ == "__main__":
    wipe_db()
