const { createClient } = require('@supabase/supabase-js');
const url = "https://gamujnfxalzycmjwoccr.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhbXVqbmZ4YWx6eWNtandvY2NyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NDAzNDksImV4cCI6MjA4OTIxNjM0OX0.8yDOzvOtrISHX9BteEpWLWINdn_lGQC9qUKhhx45cfk";

const supabase = createClient(url, key);

async function checkMessagesSchema() {
  const { data, error } = await supabase.from('messages').select('*').limit(1);
  if (data && data.length > 0) {
     console.log("Columns:", Object.keys(data[0]));
  } else {
     console.log("Data empty or error:", error);
  }
}
checkMessagesSchema();
