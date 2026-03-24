const { createClient } = require('@supabase/supabase-js');
const url = "https://gamujnfxalzycmjwoccr.supabase.co";
const key = "sb_secret_viTmJvf1jAoWkWBvk722Hg_Tk9oYBF2";

const supabase = createClient(url, key);

async function check() {
  const { data, error } = await supabase.from('chats').select('*');
  console.log("CHATS:", data);
  console.log("ERROR:", error);
}

check();
