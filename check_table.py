import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv("backend/.env")
url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
if not url:
    print("WARNING: NEXT_PUBLIC_SUPABASE_URL is missing")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
if not key:
    print("WARNING: SUPABASE_SERVICE_ROLE_KEY is missing")

if url and key:
    supabase = create_client(url, key)
    res = supabase.table('profiles').select('*').limit(1).execute()
    print("Profiles Data:")
    print(res.data)
else:
    print("Environment variables missing")
