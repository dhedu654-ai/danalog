import { supabase } from '../_supabase.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { ticketId, driverId, assignType, reason, dispatcherUsername, version } = req.body;
        
        // 1. Fetch Ticket
        const { data: ticket, error: ticErr } = await supabase.from('Tickets').select('*').eq('id', ticketId).single();
        if (ticErr || !ticket) return res.status(404).json({ error: 'Ticket not found' });
        
        if (version !== undefined && ticket.dispatchVersion !== version) {
            return res.status(409).json({ error: 'CONFLICT: Ticket modified', currentStatus: ticket.dispatchStatus });
        }

        // 2. Fetch Driver
        const { data: driver, error: drvErr } = await supabase.from('Users').select('*').eq('username', driverId).single();
        if (drvErr || !driver) return res.status(404).json({ error: 'Driver not found' });

        // 3. Create Dispatch Log
        const logId = 'LG-' + Date.now().toString(36);
        const logData = {
            id: logId,
            ticketId: ticketId,
            ticketRoute: ticket.route,
            assignedDriverId: driverId,
            assignedDriverName: driver.name,
            assignType: assignType || 'manual',
            overrideNote: reason || '',
            dispatcherUsername: dispatcherUsername || 'system',
            responseStatus: 'WAITING',
            timestamp: new Date().toISOString()
        };
        await supabase.from('DispatchLogs').insert([logData]);

        // 4. Update Ticket
        let newStatusHist = ticket.statusHistory || [];
        newStatusHist.push({
            status: 'ASSIGNED',
            actor: dispatcherUsername || 'system',
            driver: driverId,
            timestamp: new Date().toISOString()
        });

        const ticketUpdate = {
            driverUsername: driverId,
            driverName: driver.name,
            licensePlate: driver.licensePlate || null,
            dispatchStatus: 'DRIVER_ASSIGNED',
            statusHistory: newStatusHist,
            dispatchVersion: (ticket.dispatchVersion || 0) + 1,
            updatedAt: new Date().toISOString()
        };
        
        const { error: updErr } = await supabase.from('Tickets').update(ticketUpdate).eq('id', ticketId);
        if (updErr) throw new Error(updErr.message);

        // 5. Build Notification
        await supabase.from('Notifications').insert([
            { type: 'INFO', message: `Bạn được phân công lệnh mới: ${ticketId}`, to: driverId, targetRole: 'DRIVER', relatedId: ticketId },
            { type: 'INFO', message: `Đã phân công ${driverId} cho phiếu ${ticketId}`, targetRole: 'DISPATCHER', relatedId: ticketId }
        ]);

        return res.status(200).json({ success: true });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
