import { supabase } from '../_supabase.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { ticketId, dispatcherUsername } = req.body;

        if (!ticketId) return res.status(400).json({ error: 'Missing ticketId' });

        // 1. Fetch the ticket
        const { data: ticket, error: ticErr } = await supabase
            .from('Tickets')
            .select('*')
            .eq('id', ticketId)
            .single();

        if (ticErr || !ticket) return res.status(404).json({ error: 'Ticket not found' });

        // 2. Fetch the latest active dispatch log (WAITING status)
        const { data: logs } = await supabase
            .from('DispatchLogs')
            .select('*')
            .eq('ticketId', ticketId)
            .eq('responseStatus', 'WAITING')
            .order('timestamp', { ascending: false })
            .limit(1);

        const activeLog = logs && logs.length > 0 ? logs[0] : null;

        // 3. Calculate time since assignment
        let reason = 'DV điều lại xe';
        let minutesElapsed = 0;

        if (activeLog && activeLog.timestamp) {
            const sentTime = new Date(activeLog.timestamp).getTime();
            const now = new Date().getTime();
            minutesElapsed = Math.floor((now - sentTime) / (1000 * 60));

            if (minutesElapsed > 30) {
                reason = 'Không phản hồi';
            }
        }

        // 4. Update the old dispatch log → NO_RESPONSE / REVOKED
        if (activeLog) {
            await supabase.from('DispatchLogs').update({
                responseStatus: 'NO_RESPONSE',
                responseReason: reason,
                respondedAt: new Date().toISOString()
            }).eq('id', activeLog.id);
        }

        // Also revoke any other WAITING logs for this ticket
        await supabase.from('DispatchLogs')
            .update({
                responseStatus: 'NO_RESPONSE',
                responseReason: 'Hệ thống thu hồi do điều vận gán lại',
                respondedAt: new Date().toISOString()
            })
            .eq('ticketId', ticketId)
            .eq('responseStatus', 'WAITING');

        // 5. Reset the ticket back to WAITING_DISPATCH
        let newStatusHist = ticket.statusHistory || [];
        if (typeof newStatusHist === 'string') {
            try { newStatusHist = JSON.parse(newStatusHist); } catch { newStatusHist = []; }
        }

        newStatusHist.push({
            status: 'WAITING_DISPATCH',
            action: `Gán lại — ${reason} (${minutesElapsed} phút)`,
            actor: dispatcherUsername || 'system',
            user: dispatcherUsername || 'system',
            previousDriver: ticket.driverUsername || null,
            previousDriverName: ticket.driverName || null,
            timestamp: new Date().toISOString()
        });

        const ticketUpdate = {
            driverUsername: null,
            driverName: null,
            licensePlate: null,
            status: 'CHƯA ĐIỀU XE',
            dispatchStatus: 'WAITING_DISPATCH',
            statusHistory: newStatusHist,
            dispatchVersion: (ticket.dispatchVersion || 0) + 1,
            updatedAt: new Date().toISOString()
        };

        const { error: updErr } = await supabase
            .from('Tickets')
            .update(ticketUpdate)
            .eq('id', ticketId);

        if (updErr) throw new Error(updErr.message);

        // 6. Notify
        const previousDriverName = ticket.driverName || 'N/A';
        await supabase.from('Notifications').insert([
            {
                id: 'N-' + Date.now().toString(36) + 'r1',
                type: 'WARNING',
                message: `Phiếu ${ticketId} đã được gán lại. Lý do: ${reason}. LX trước: ${previousDriverName}`,
                targetRole: 'DISPATCHER',
                relatedId: ticketId,
                read: false,
                createdAt: new Date().toISOString()
            }
        ]);

        // Notify old driver that their assignment is revoked
        if (ticket.driverUsername) {
            await supabase.from('Notifications').insert([
                {
                    id: 'N-' + Date.now().toString(36) + 'r2',
                    type: 'WARNING',
                    message: `Lệnh ${ticketId} (${ticket.route || ''}) đã bị thu hồi. Lý do: ${reason}`,
                    to: ticket.driverUsername,
                    targetRole: 'DRIVER',
                    relatedId: ticketId,
                    read: false,
                    createdAt: new Date().toISOString()
                }
            ]);
        }

        return res.status(200).json({
            success: true,
            ticketId,
            reason,
            minutesElapsed,
            previousDriver: previousDriverName
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
