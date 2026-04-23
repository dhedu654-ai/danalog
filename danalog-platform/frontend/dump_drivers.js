const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = "https://nmtuclcfzmxshighzqql.supabase.co";
const SUPABASE_KEY = "sb_publishable_v6r7HO9sgpFDN6KX3eN1bg_6BRakt8M";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    const { data: users } = await supabase.from('Users').select('username,fullName,licensePlate').eq('role', 'DRIVER');
    fs.writeFileSync('drivers_dump.json', JSON.stringify(users, null, 2));
    
    // Also let's update the FuelTickets
    // Wait, first let's just dump the users.
}
run();
