const token = "sb_secret_viTmJvf1jAoWkWBvk722Hg_Tk9oYBF2";
const ref = "gamujnfxalzycmjwoccr";

async function runSQL() {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: `
        SELECT policyname, permissive, roles, cmd, qual, with_check 
        FROM pg_policies 
        WHERE tablename = 'chats';
      `
    })
  });
  
  if (!res.ok) {
    console.error("Management API failed:", res.status, await res.text());
  } else {
    const data = await res.json();
    console.log("Policies:", data);
  }
}
runSQL();
