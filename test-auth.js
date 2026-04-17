const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = "https://gamujnfxalzycmjwoccr.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhbXVqbmZ4YWx6eWNtandvY2NyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NDAzNDksImV4cCI6MjA4OTIxNjM0OX0.8yDOzvOtrISHX9BteEpWLWINdn_lGQC9qUKhhx45cfk";
const supabase = createClient(supabaseUrl, supabaseKey);

async function testAuth() {
  const { data, error } = await supabase.auth.signInWithOtp({
    phone: '+919999999999',
  });
  console.log("Error:", error);
}
testAuth();
