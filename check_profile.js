const { createClient } = require('@supabase/supabase-js');
const url = "https://gamujnfxalzycmjwoccr.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhbXVqbmZ4YWx6eWNtandvY2NyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NDAzNDksImV4cCI6MjA4OTIxNjM0OX0.8yDOzvOtrISHX9BteEpWLWINdn_lGQC9qUKhhx45cfk";

const supabase = createClient(url, key);

async function checkProfile() {
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: 'divyanshik30@gmail.com',
    password: '123456'
  });

  const user = authData.user;
  const { data: prof, error } = await supabase.from('profiles').select('*').eq('id', user.id);
  console.log("Profiles:", prof);
  console.log("Error:", error);
  
  if (!prof || prof.length === 0) {
     console.log("Attempting to insert profile...");
     const { error: insErr } = await supabase.from('profiles').insert({ id: user.id, email: user.email });
     console.log("Insert profile error:", insErr);
  }
}
checkProfile();
