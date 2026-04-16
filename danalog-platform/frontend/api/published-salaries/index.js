import { supabase } from '../_supabase.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const publication = req.body;
        
        let tickets = publication.items.map(i => i.ticketId);

        // Save
        const { error: pErr } = await supabase.from('PublishedSalaries').insert([{
             driverUsername: publication.driverUsername,
             month: publication.month,
             year: publication.year,
             items: publication.items,
             totalRevenue: publication.items.reduce((sum, item) => sum + (item.revenue || 0), 0),
             totalSalary: publication.items.reduce((sum, item) => sum + (item.driverSalary || 0), 0),
             status: 'PUBLISHED'
        }]);
        if (pErr) throw new Error(pErr.message);

        // Update tickets to SALARY_LOCKED
        await supabase.from('Tickets').update({ status: 'SALARY_LOCKED' }).in('id', tickets);
        
        // Notify
        await supabase.from('Notifications').insert([{ type: 'INFO', message: `Đã có bảng lương tháng ${publication.month}/${publication.year}`, to: publication.driverUsername, targetRole: 'DRIVER' }]);

        return res.status(200).json({ success: true });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
