const { createClient } = require('@supabase/supabase-js');
const url = "https://gamujnfxalzycmjwoccr.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhbXVqbmZ4YWx6eWNtandvY2NyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NDAzNDksImV4cCI6MjA4OTIxNjM0OX0.8yDOzvOtrISHX9BteEpWLWINdn_lGQC9qUKhhx45cfk";

const supabase = createClient(url, key);

async function testInsert() {
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'divyanshik30@gmail.com',
    password: '123456'
  });

  if (authErr) {
    console.error("Login Failed:", authErr.message);
    return;
  }
  
  const user = authData.user;
  console.log("Logged in! User ID:", user.id);

  // Attempt chat insert
  const { data: chatData, error: chatErr } = await supabase.from('chats').insert({
    user_id: user.id,
    title: 'Test Chat via Script'
  }).select('id');

  if (chatErr) {
    console.error("Chat Insert Failed:");
    console.dir(chatErr, { depth: null });
  } else {
    console.log("Chat Insert Succeeded! ID:", chatData);
  }
}

testInsert();
