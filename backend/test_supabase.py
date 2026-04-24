import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

print("URL:", url)
print("Anon Key length:", len(key) if key else 0)
print("Service Key:", service_role_key)

try:
    print("\n--- Trying with fallback logic ---")
    admin_key = service_role_key if service_role_key else key
    supabase_test = create_client(url, admin_key)
    res = supabase_test.table("chats").select("*").limit(1).execute()
    print("Select success!", res)
except Exception as e:
    print("Select Failed:", e)
