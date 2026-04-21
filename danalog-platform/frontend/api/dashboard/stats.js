import { supabase } from '../_supabase.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { data: tickets } = await supabase.from('Tickets').select('status, dispatchStatus, assignedAt');
        
        let stats = {
            totalTickets: (tickets || []).length,
            waitingAuto: 0, driverAssigned: 0, overdue: 0,
            inProgress: 0, completed: 0, delayed: 0, totalFuelCost: 0, totalRevenue: 0
        };

        (tickets || []).forEach(t => {
             if (t.dispatchStatus === 'WAITING_DISPATCH' || t.dispatchStatus === 'WAITING_AUTO') stats.waitingAuto++;
             if (t.dispatchStatus === 'DRIVER_ASSIGNED' || t.dispatchStatus === 'DRIVER_ACCEPTED') {
                 stats.driverAssigned++;
                 if (t.dispatchStatus === 'DRIVER_ASSIGNED' && t.assignedAt) {
                     const elapsed = new Date().getTime() - new Date(t.assignedAt).getTime();
                     if (elapsed > 30 * 60000) stats.overdue++;
                 }
             }

             if (t.status === 'ĐANG VẬN CHUYỂN' || t.dispatchStatus === 'IN_PROGRESS') stats.inProgress++;
             if (t.status === 'COMPLETED' || t.status === 'APPROVED' || t.dispatchStatus === 'COMPLETED') stats.completed++;
        });

        return res.json(stats);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
