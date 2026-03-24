import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv("backend/.env")
url = os.environ.get("SUPABASE_URL")
role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
anon_key = os.environ.get("SUPABASE_KEY")

print(f"Role Key starts with: {role_key[:10] if role_key else None}")
print(f"Anon Key starts with: {anon_key[:10] if anon_key else None}")

supabase_role = create_client(url, role_key)
chats_role = supabase_role.table("chats").select("*").execute()
print(f"Role Key Chats: {len(chats_role.data)}")

supabase_anon = create_client(url, anon_key)
chats_anon = supabase_anon.table("chats").select("*").execute()
print(f"Anon Key Chats: {len(chats_anon.data)}")
