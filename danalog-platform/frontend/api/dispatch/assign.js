import { supabase } from '../_supabase.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { ticketId, driverId, assignType, reason, dispatcherUsername, version } = req.body;
        
        // 1. Fetch Ticket
        const { data: ticket, error: ticErr } = await supabase.from('Tickets').select('*').eq('id', ticketId).single();
        if (ticErr || !ticket) return res.status(404).json({ error: 'Ticket not found' });
        
        // GUARD: Prevent double-assignment — if ticket is already assigned to a driver, reject
        const alreadyAssignedStatuses = ['DRIVER_ASSIGNED', 'DRIVER_ACCEPTED', 'IN_PROGRESS', 'ĐANG VẬN CHUYỂN'];
        if (alreadyAssignedStatuses.includes(ticket.dispatchStatus)) {
            return res.status(409).json({ 
                error: 'CONFLICT: Phiếu này đã được gán cho lái xe khác rồi. Vui lòng refresh lại trang.', 
                currentStatus: ticket.dispatchStatus,
                currentDriver: ticket.driverName || ticket.driverUsername
            });
        }

        // Optimistic locking check
        if (version !== undefined && ticket.dispatchVersion !== undefined && ticket.dispatchVersion !== version) {
            return res.status(409).json({ error: 'CONFLICT: Ticket modified', currentStatus: ticket.dispatchStatus });
        }

        // 2. Fetch Driver by username
        const { data: driver, error: drvErr } = await supabase.from('Users').select('*').eq('username', driverId).single();
        if (drvErr || !driver) {
            // Fallback: try finding by id column (UUID)
            const { data: driverById, error: drvErr2 } = await supabase.from('Users').select('*').eq('id', driverId).single();
            if (drvErr2 || !driverById) {
                return res.status(404).json({ error: `Driver not found: ${driverId}` });
            }
            // Use the found driver
            return await doAssign(req, res, ticket, driverById, ticketId, assignType, reason, dispatcherUsername);
        }

        return await doAssign(req, res, ticket, driver, ticketId, assignType, reason, dispatcherUsername);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

async function doAssign(req, res, ticket, driver, ticketId, assignType, reason, dispatcherUsername) {
    // 2.5 Revoke any existing 'WAITING' logs for this ticket
    await supabase.from('DispatchLogs')
        .update({ 
            responseStatus: 'REVOKED_SYSTEM',
            responseReason: 'Hệ thống tự động thu hồi do Điều vận gán cho tài xế khác',
            respondedAt: new Date().toISOString()
        })
        .eq('ticketId', ticketId)
        .eq('responseStatus', 'WAITING');

    // 3. Create Dispatch Log
    const logId = 'LG-' + Date.now().toString(36);
    const logData = {
        id: logId,
        ticketId: ticketId,
        ticketRoute: ticket.route,
        assignedDriverId: driver.username,
        assignedDriverName: driver.name,
        assignType: assignType || 'manual',
        overrideNote: reason || '',
        dispatcherUsername: dispatcherUsername || 'system',
        responseStatus: 'WAITING',
        timestamp: new Date().toISOString()
    };
    await supabase.from('DispatchLogs').insert([logData]);

    // 4. Update Ticket - including main status!
    let newStatusHist = ticket.statusHistory || [];
    if (typeof newStatusHist === 'string') {
        try { newStatusHist = JSON.parse(newStatusHist); } catch { newStatusHist = []; }
    }
    newStatusHist.push({
        status: 'ĐÃ ĐIỀU XE',
        action: assignType === 'auto' ? 'Tự động phân công xe' : 'Phân công xe',
        actor: dispatcherUsername || 'system',
        user: dispatcherUsername || 'system',
        driver: driver.username,
        driverName: driver.name,
        timestamp: new Date().toISOString()
    });

    const ticketUpdate = {
        driverUsername: driver.username,
        driverName: driver.name,
        licensePlate: driver.licensePlate || null,
        status: 'ĐÃ ĐIỀU XE',                    // Update main status!
        dispatchStatus: 'DRIVER_ASSIGNED',
        statusHistory: newStatusHist,
        dispatchVersion: (ticket.dispatchVersion || 0) + 1,
        updatedAt: new Date().toISOString()
    };
    
    const { error: updErr } = await supabase.from('Tickets').update(ticketUpdate).eq('id', ticketId);
    if (updErr) throw new Error(updErr.message);

    // 5. Build Notifications
    await supabase.from('Notifications').insert([
        { id: 'N-' + Date.now().toString(36) + 'a', type: 'INFO', message: `Bạn được phân công lệnh mới: ${ticketId} - ${ticket.route}`, to: driver.username, targetRole: 'DRIVER', relatedId: ticketId, createdAt: new Date().toISOString() },
        { id: 'N-' + Date.now().toString(36) + 'b', type: 'INFO', message: `Đã phân công ${driver.name} (${driver.licensePlate || ''}) cho phiếu ${ticketId}`, targetRole: 'DISPATCHER', relatedId: ticketId, createdAt: new Date().toISOString() }
    ]);

    return res.status(200).json({ success: true, ticketId, driver: driver.name });
}
