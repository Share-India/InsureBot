const { createClient } = require('@supabase/supabase-js');
const url = "https://gamujnfxalzycmjwoccr.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhbXVqbmZ4YWx6eWNtandvY2NyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NDAzNDksImV4cCI6MjA4OTIxNjM0OX0.8yDOzvOtrISHX9BteEpWLWINdn_lGQC9qUKhhx45cfk";

const supabase = createClient(url, key);

async function testInsert() {
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: 'divyanshik30@gmail.com',
    password: '123456'
  });
  
  console.log("Logged in!", authData.user.id);
  
  const { data, error } = await supabase.from('chats').insert({
      user_id: authData.user.id,
      title: "Test RLS Fix No Select"
  });
  
  if (error) {
      console.log("Error:", error);
  } else {
      console.log("Success Insert Without Select!");
  }
}
testInsert();
