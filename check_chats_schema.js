const { createClient } = require('@supabase/supabase-js');
const url = "https://gamujnfxalzycmjwoccr.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhbXVqbmZ4YWx6eWNtandvY2NyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NDAzNDksImV4cCI6MjA4OTIxNjM0OX0.8yDOzvOtrISHX9BteEpWLWINdn_lGQC9qUKhhx45cfk";

const supabase = createClient(url, key);

async function checkChatsSchema() {
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: 'divyanshik30@gmail.com',
    password: '123456'
  });
  
  // I can try a select if there's a SELECT policy.
  const { data, error } = await supabase.from('chats').select('*').limit(1);
  if (data && data.length > 0) {
     console.log("Chats Columns:", Object.keys(data[0]));
  } else {
     console.log("Data empty or error:", error);
     console.log("Raw data:", data);
  }
}
checkChatsSchema();
