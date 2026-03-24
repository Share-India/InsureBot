import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables from .env
load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
service_role_key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    raise ValueError("Missing Supabase credentials in .env")

# Initialize the Supabase client (Anon - respects RLS)
supabase: Client = create_client(url, key)

# Initialize the Admin Supabase client (Bypasses RLS)
# Use service_role_key if available, otherwise fallback to anon key
supabase_admin: Client = create_client(url, service_role_key if service_role_key else key)
