import { supabase } from './_supabase.js';

export default async function handler(req, res) {
    if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const crId = req.query.id || req.body?.crId;
        if (!crId) return res.status(400).json({ error: 'Missing Correction Request ID' });
        
        const { status, reviewedBy, reviewNote, ticketUpdates } = req.body;

        const { data: cr, error: crErr } = await supabase.from('TicketCorrections').select('*').eq('id', crId).single();
        if (crErr) return res.status(500).json({ error: 'Fetch CR error: ' + crErr.message });
        if (!cr) return res.status(404).json({ error: 'Correction Request not found' });

        const { error: updCrErr } = await supabase.from('TicketCorrections').update({
            status: status,
            reviewedBy: reviewedBy,
            reviewNote: reviewNote,
            updatedAt: new Date().toISOString()
        }).eq('id', crId);
        
        if (updCrErr) return res.status(500).json({ error: 'Update CR error: ' + updCrErr.message });

        if (status === 'APPROVED') {
             const { data: ticket, error: tErr } = await supabase.from('Tickets').select('*').eq('id', cr.ticketId).single();
             if (tErr) return res.status(500).json({ error: 'Fetch Ticket err: ' + tErr.message });
             
             if (ticket) {
                 let newHist = ticket.statusHistory ? [...ticket.statusHistory] : [];
                 newHist.push({ status: 'Mở lại phiếu', actor: reviewedBy, timestamp: new Date().toISOString() });
                 
                 const updatesObj = ticketUpdates || {};
                 const { error: updTErr } = await supabase.from('Tickets').update({
                     status: 'PENDING',
                     ...updatesObj,
                     statusHistory: newHist
                 }).eq('id', cr.ticketId);
                 
                 if (updTErr) return res.status(500).json({ error: 'Update Ticket err: ' + updTErr.message });
             }
        }
        
        const { error: notiErr } = await supabase.from('Notifications').insert([{ type: 'INFO', message: `Yêu cầu sửa phiếu ${cr.ticketId} đã bị ${status}`, to: cr.requestedBy, targetRole: 'ALL' }]);
        
        if (notiErr) return res.status(500).json({ error: 'Noti insert err: ' + notiErr.message });

        return res.json({ success: true });
    } catch (err) {
        return res.status(500).json({ error: 'Catch err: ' + err.message });
    }
}
