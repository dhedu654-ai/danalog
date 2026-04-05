import { supabase } from '../_supabase.js';

export default async function handler(req, res) {
    if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const idMatch = req.url.match(/\/api\/ticket-corrections\/(.*)\/review/);
        const crId = idMatch ? idMatch[1] : req.query.id;
        
        const { status, reviewedBy, reviewNote, ticketUpdates } = req.body;

        const { data: cr } = await supabase.from('TicketCorrections').select('*').eq('id', crId).single();
        if (!cr) return res.status(404).json({ error: 'Correction Request not found' });

        await supabase.from('TicketCorrections').update({
            status: status,
            reviewedBy: reviewedBy,
            reviewNote: reviewNote,
            updatedAt: new Date().toISOString()
        }).eq('id', crId);

        if (status === 'APPROVED' && ticketUpdates) {
             const { data: ticket } = await supabase.from('Tickets').select('*').eq('id', cr.ticketId).single();
             if (ticket) {
                 let newHist = ticket.statusHistory || [];
                 newHist.push({ status: 'CORRECTION_APPROVED', actor: reviewedBy, timestamp: new Date().toISOString() });
                 await supabase.from('Tickets').update({
                     ...ticketUpdates,
                     statusHistory: newHist
                 }).eq('id', cr.ticketId);
             }
        }
        
        await supabase.from('Notifications').insert([{ type: 'INFO', message: `Yêu cầu sửa phiếu ${cr.ticketId} đã bị ${status}`, to: cr.requestedBy, targetRole: 'ALL' }]);

        return res.json({ success: true });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
