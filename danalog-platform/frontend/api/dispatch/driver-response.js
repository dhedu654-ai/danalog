import { supabase } from '../_supabase.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { ticketId, response, rejectReasonCode, reason, driverUsername } = req.body;
        
        if (!ticketId || !response) {
            return res.status(400).json({ error: 'Missing ticketId or response' });
        }

        // 1. Fetch ticket
        const { data: ticket, error: ticErr } = await supabase
            .from('Tickets').select('*').eq('id', ticketId).single();
        if (ticErr || !ticket) return res.status(404).json({ error: 'Ticket not found' });

        // 2. Validate: ticket must be in a state waiting for driver response
        //    Accept both DRIVER_ASSIGNED and ĐÃ ĐIỀU XE (which assign.js sets)
        const validStatuses = ['DRIVER_ASSIGNED', 'ĐÃ ĐIỀU XE'];
        if (!validStatuses.includes(ticket.dispatchStatus || '') && !validStatuses.includes(ticket.status || '')) {
            return res.status(400).json({ 
                error: `Phiếu không ở trạng thái chờ phản hồi (hiện tại: ${ticket.dispatchStatus || ticket.status})` 
            });
        }

        // 3. Fetch latest dispatch log for this ticket
        const { data: logs } = await supabase.from('DispatchLogs').select('*')
            .eq('ticketId', ticketId).order('timestamp', { ascending: false }).limit(1);
        const log = logs && logs.length > 0 ? logs[0] : null;

        // 4. Parse statusHistory safely (Supabase may store as string or array)
        let newStatusHist = ticket.statusHistory || [];
        if (typeof newStatusHist === 'string') {
            try { newStatusHist = JSON.parse(newStatusHist); } catch { newStatusHist = []; }
        }
        if (!Array.isArray(newStatusHist)) newStatusHist = [];

        const nowISO = new Date().toISOString();

        if (response === 'ACCEPT') {
            // Update dispatch log → ACCEPTED
            if (log) {
                const { error: logErr } = await supabase.from('DispatchLogs').update({ 
                    responseStatus: 'ACCEPTED',
                    respondedAt: nowISO
                }).eq('id', log.id);
                if (logErr) throw new Error('Error updating log: ' + logErr.message);
            }

            // Add to status history
            newStatusHist.push({ 
                status: 'DRIVER_ACCEPTED', 
                action: 'Lái xe đồng ý nhận lệnh',
                actor: driverUsername, 
                timestamp: nowISO 
            });

            // Update ticket
            const { error: updErr } = await supabase.from('Tickets').update({
                dispatchStatus: 'DRIVER_ACCEPTED',
                status: 'ĐÃ ĐIỀU XE',
                statusHistory: newStatusHist,
                updatedAt: nowISO,
                dispatchVersion: (ticket.dispatchVersion || 0) + 1
            }).eq('id', ticketId);

            if (updErr) throw new Error(updErr.message);

            // Notify dispatchers and CS
            const ts = Date.now().toString(36);
            await supabase.from('Notifications').insert([
                { id: 'N-' + ts + 'da', type: 'SUCCESS', message: `Lái xe ${driverUsername} đã nhận phiếu ${ticketId}`, targetRole: 'DISPATCHER', relatedId: ticketId, read: false, createdAt: nowISO },
                { id: 'N-' + ts + 'db', type: 'SUCCESS', message: `Lái xe ${driverUsername} đã nhận phiếu ${ticketId}`, targetRole: 'CS', relatedId: ticketId, read: false, createdAt: nowISO }
            ]);

            return res.json({ success: true, status: 'DRIVER_ACCEPTED' });

        } else if (response === 'REJECT') {
            const rejectNote = reason || rejectReasonCode || 'Không rõ lý do';

            // Update dispatch log → REJECTED
            if (log) {
                const { error: logErr } = await supabase.from('DispatchLogs').update({ 
                    responseStatus: 'REJECTED', 
                    reason: rejectNote,
                    respondedAt: nowISO
                }).eq('id', log.id);
                if (logErr) throw new Error('Error updating log: ' + logErr.message);
            }

            // Add to status history
            newStatusHist.push({ 
                status: 'DRIVER_REJECTED', 
                action: `Lái xe từ chối: ${rejectNote}`,
                actor: driverUsername, 
                reason: rejectNote, 
                timestamp: nowISO 
            });
            
            // Revert ticket back to waiting
            const { error: updErr } = await supabase.from('Tickets').update({
                driverUsername: null,
                driverName: null,
                licensePlate: null,
                status: 'CHƯA ĐIỀU XE',
                dispatchStatus: 'WAITING_DISPATCH',
                statusHistory: newStatusHist,
                updatedAt: nowISO,
                dispatchVersion: (ticket.dispatchVersion || 0) + 1
            }).eq('id', ticketId);

            if (updErr) throw new Error(updErr.message);

            // Notify dispatchers
            await supabase.from('Notifications').insert([
                { id: 'N-' + Date.now().toString(36) + 'dr', type: 'WARNING', message: `Lái xe ${driverUsername} đã từ chối phiếu ${ticketId}. Lý do: ${rejectNote}`, targetRole: 'DISPATCHER', relatedId: ticketId, read: false, createdAt: nowISO }
            ]);

            return res.json({ success: true, status: 'WAITING_DISPATCH' });
        }
        
        return res.status(400).json({ error: 'Invalid response type. Must be ACCEPT or REJECT.' });
    } catch (err) {
        console.error('driver-response error:', err);
        return res.status(500).json({ error: err.message });
    }
}
