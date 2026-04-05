import { supabase } from '../_supabase.js';

export default async function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    console.log("CRON: Running SLA Breach Check");
    try {
        const { data: tickets, error } = await supabase.from('Tickets')
            .select('*')
            .in('dispatchStatus', ['WAITING_AUTO', 'DRIVER_ASSIGNED', 'ESCALATED']);
        
        if (error) throw new Error(error.message);
        if (!tickets || tickets.length === 0) return res.json({ message: 'No tickets require SLA check' });

        const now = Date.now();
        const { data: c } = await supabase.from('Configs').select('value').eq('key', 'DEFAULT_SLA_CONFIG').single();
        const slaConfig = c?.value || { standardAssignTime: 15, driverResponseTime: 3, maxAssignmentCycles: 3 };
        
        let actions = [];

        for (const ticket of tickets) {
            
            // 1. driverResponseTime Timeout (DRIVER_ASSIGNED)
            if (ticket.dispatchStatus === 'DRIVER_ASSIGNED') {
                 // Get last log
                 const { data: logs } = await supabase.from('DispatchLogs')
                    .select('*').eq('ticketId', ticket.id).order('timestamp', { ascending: false }).limit(1);
                 
                 const log = logs && logs[0];
                 if (log && log.responseStatus === 'WAITING') {
                     const logTime = new Date(log.timestamp).getTime();
                     if (now - logTime > slaConfig.driverResponseTime * 60 * 1000) {
                         // Timeout! Revoke Assignment
                         await supabase.from('DispatchLogs').update({ responseStatus: 'TIMEOUT', reason: 'NO_RESPONSE' }).eq('id', log.id);
                         let newHist = ticket.statusHistory || [];
                         newHist.push({ status: 'TIMEOUT', actor: 'SYSTEM', timestamp: new Date().toISOString() });
                         
                         // Check cycles
                         const { data: allLogs } = await supabase.from('DispatchLogs').select('*').eq('ticketId', ticket.id);
                         const cycles = allLogs.filter(l => l.responseStatus === 'TIMEOUT' || l.responseStatus === 'REJECTED').length;
                         
                         let newStatus = 'WAITING_AUTO';
                         if (cycles >= slaConfig.maxAssignmentCycles) {
                             newStatus = 'ESCALATED'; // Trigger escalation
                             await supabase.from('Notifications').insert([
                                { type: 'ERROR', message: `PHIẾU ${ticket.id} VƯỢT QUÁ SỐ LẦN TỪ CHỐI MAX=3 (ESCALATED)`, targetRole: 'DISPATCHER', relatedId: ticket.id },
                                { type: 'ERROR', message: `BÁO ĐỘNG ĐỎ: Phiếu ${ticket.id} bị từ chối 3 lần!`, targetRole: 'DV_LEAD', relatedId: ticket.id }
                             ]);
                         } else {
                             await supabase.from('Notifications').insert([
                                { type: 'WARNING', message: `Thu hồi phiếu ${ticket.id} do lái xe ${ticket.driverUsername} hết giờ phản hồi`, targetRole: 'DISPATCHER', relatedId: ticket.id }
                             ]);
                         }

                         await supabase.from('Tickets').update({
                             driverUsername: null, driverName: null, licensePlate: null,
                             dispatchStatus: newStatus,
                             statusHistory: newHist,
                             updatedAt: new Date().toISOString()
                         }).eq('id', ticket.id);
                         
                         actions.push(`Revoked ticket ${ticket.id} due to timeout.`);
                     }
                 }
            }

            // 2. Auto-Assign Loop if WAITING_AUTO
            if (ticket.dispatchStatus === 'WAITING_AUTO') {
                 // In a fully working system, Vercel cron triggers Auto-Assign here.
                 // We will skip full scoring engine in this mock and just ping.
                 // But wait, the SLA loop auto-assigns if time passes.
                 const createdAt = new Date(ticket.createdAt).getTime();
                 if (now - createdAt > slaConfig.standardAssignTime * 60 * 1000) {
                     // Auto-assign is breached.
                     actions.push(`Ticket ${ticket.id} is breaching standard assign time.`);
                 }
            }
        }

        return res.json({ success: true, executedActions: actions });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.message });
    }
}
