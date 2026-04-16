import { supabase } from '../_supabase.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { ticketId, dispatcherUsername } = req.body;
        // Mock Auto Assign: just randomly pick the first driver
        const { data: drivers } = await supabase.from('Users').select('*').eq('role', 'DRIVER');
        
        let driver = drivers.length ? drivers[Math.floor(Math.random() * drivers.length)] : null;
        if (!driver) return res.status(400).json({ error: 'No drivers available' });

        const assignRes = await fetch(`${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3002'}/api/dispatch/assign`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticketId, driverId: driver.username, assignType: 'auto', reason: 'Tự động gán', dispatcherUsername: dispatcherUsername || 'system' })
        });
        
        if (!assignRes.ok) throw new Error('Assign failed');
        return res.json({ success: true, assignedDriver: driver.username });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
