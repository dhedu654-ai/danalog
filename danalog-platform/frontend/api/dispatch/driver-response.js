import { supabase } from '../_supabase.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { ticketId, response, rejectReasonCode, reason, driverUsername } = req.body;
        
        const { data: ticket, error: ticErr } = await supabase.from('Tickets').select('*').eq('id', ticketId).single();
        if (ticErr || !ticket) return res.status(404).json({ error: 'Ticket not found' });

        if (ticket.dispatchStatus !== 'DRIVER_ASSIGNED' && ticket.dispatchStatus !== 'ESCALATED') {
             return res.status(400).json({ error: 'Ticket is not waiting for response' });
        }

        // Fetch latest dispatch log
        const { data: logs } = await supabase.from('DispatchLogs').select('*')
            .eq('ticketId', ticketId).order('timestamp', { ascending: false }).limit(1);
        const log = logs && logs.length > 0 ? logs[0] : null;

        let newStatusHist = ticket.statusHistory || [];
        
        if (response === 'ACCEPT') {
            if (log) {
                 await supabase.from('DispatchLogs').update({ responseStatus: 'ACCEPTED' }).eq('id', log.id);
            }
            newStatusHist.push({ status: 'ACCEPTED', actor: driverUsername, timestamp: new Date().toISOString() });
            await supabase.from('Tickets').update({
                dispatchStatus: 'DRIVER_ACCEPTED',
                statusHistory: newStatusHist,
                updatedAt: new Date().toISOString(),
                dispatchVersion: (ticket.dispatchVersion || 0) + 1
            }).eq('id', ticketId);

            await supabase.from('Notifications').insert([
                { type: 'SUCCESS', message: `Lái xe ${driverUsername} đã nhận phiếu ${ticketId}`, targetRole: 'DISPATCHER', relatedId: ticketId },
                { type: 'SUCCESS', message: `Lái xe ${driverUsername} đã nhận phiếu ${ticketId}`, targetRole: 'CS', relatedId: ticketId }
            ]);

            return res.json({ success: true, status: 'DRIVER_ACCEPTED' });

        } else if (response === 'REJECT') {
            if (log) {
                await supabase.from('DispatchLogs').update({ responseStatus: 'REJECTED', reason: reason || rejectReasonCode }).eq('id', log.id);
            }
            newStatusHist.push({ status: 'REJECTED', actor: driverUsername, reason: reason, timestamp: new Date().toISOString() });
            
            // Revert assignment
            await supabase.from('Tickets').update({
                driverUsername: null,
                driverName: null,
                licensePlate: null,
                dispatchStatus: 'WAITING_AUTO',
                statusHistory: newStatusHist,
                updatedAt: new Date().toISOString(),
                dispatchVersion: (ticket.dispatchVersion || 0) + 1
            }).eq('id', ticketId);

            await supabase.from('Notifications').insert([
                { type: 'WARNING', message: `Lái xe ${driverUsername} đã từ chối phiếu ${ticketId} vì ${reason}`, targetRole: 'DISPATCHER', relatedId: ticketId }
            ]);

            // Attempt auto-assign here as a cascade
            // But usually we just return status and let next manual or SLA do it.
            return res.json({ success: true, status: 'WAITING_AUTO' });
        }
        
        return res.status(400).json({ error: 'Invalid response type' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
