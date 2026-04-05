import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://nmtuclcfzmxshighzqql.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_v6r7HO9sgpFDN6KX3eN1bg_6BRakt8M';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const serverCode = fs.readFileSync('server.js', 'utf8');

function extractArr(varName) {
    const regex = new RegExp(`const ${varName} = (\\[\\s*[\\s\\S]*?\\n\\]);`);
    const match = serverCode.match(regex);
    if (!match) return [];
    try {
        // Evaluate the matched JS object array safely into JSON
        let ev = eval(`(${match[1]})`);
        return ev;
    } catch { return []; }
}
function extractObj(varName) {
    const regex = new RegExp(`const ${varName} = ({\\s*[\\s\\S]*?\\n});`);
    const match = serverCode.match(regex);
    if (!match) return {};
    try {
        let ev = eval(`(${match[1]})`);
        return ev;
    } catch { return {}; }
}

async function runSeed() {
    console.log("Seeding Database...");
    
    // Users
    const users = extractArr('DEFAULT_USERS');
    if (users.length) {
        let {error} = await supabase.from('Users').upsert(users.map(u => ({
            id: crypto.randomUUID(), username: u.username, password: u.password, role: u.role, name: u.name, licensePlate: u.licensePlate || null
        })), { onConflict: 'username' });
        console.log("Users:", error || "OK");
    }

    // Customers
    const customers = extractArr('DEFAULT_CUSTOMERS');
    if (customers.length) {
        let {error} = await supabase.from('Customers').upsert(customers.map(c => ({
            id: c.id, code: c.code, name: c.name, taxCode: c.taxCode || '', contractNo: c.contractNo || '', status: c.status
        })), { onConflict: 'code' });
        console.log("Customers:", error || "OK");
    }

    // Routes
    const routes = extractArr('DEFAULT_ROUTES');
    if (routes.length) {
        let {error} = await supabase.from('RouteConfigs').upsert(routes.map(r => ({
            id: r.id, routeName: r.routeName, customer: r.customer, cargoType: r.cargoType, isNightStay: r.isNightStay, 
            nightStayLocation: r.nightStayLocation || null, revenue: r.revenue, salary: r.salary, fuel: r.fuel, 
            effectiveDate: r.effectiveDate, status: r.status
        })));
        console.log("RouteConfigs:", error || "OK");
    }

    // Configs
    const dConf = extractObj('DEFAULT_DISPATCH_CONFIG');
    const sConf = extractObj('DEFAULT_SLA_CONFIG');
    if (Object.keys(dConf).length) await supabase.from('Configs').upsert({key: 'DEFAULT_DISPATCH_CONFIG', value: dConf});
    if (Object.keys(sConf).length) await supabase.from('Configs').upsert({key: 'DEFAULT_SLA_CONFIG', value: sConf});
    
    console.log("Seeding completed!");
}

runSeed().catch(console.error);
