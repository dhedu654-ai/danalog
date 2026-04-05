import { supabase } from '../_supabase.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { ticketId } = req.body;
        // Fetch all drivers
        const { data: drivers } = await supabase.from('Users').select('*').eq('role', 'DRIVER');
        
        // Mock scoring logic: shuffle them for now, but usually would calculate availability, revenue, stats...
        let candidates = drivers.map(d => ({
            id: d.username,
            name: d.name,
            licensePlate: d.licensePlate,
            score: Math.floor(Math.random() * 100),
            reason: "Mock calculated score",
            stats: { 
                todayRevenue: Math.floor(Math.random() * 2000000), 
                ticketsCount: Math.floor(Math.random() * 5)
            }
        })).sort((a, b) => b.score - a.score);

        return res.json({ candidates });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
