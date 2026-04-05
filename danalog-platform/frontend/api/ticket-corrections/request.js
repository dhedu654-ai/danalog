import { supabase } from '../_supabase.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const idMatch = req.url.match(/\/api\/tickets\/(.*)\/correction-request/);
        const ticketId = idMatch ? idMatch[1] : req.query.id;
        
        const requestData = req.body;

        const { data: ticket } = await supabase.from('Tickets').select('*').eq('id', ticketId).single();
        if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

        const reqId = 'CR-' + Math.random().toString(36).substring(2, 10);
        
        await supabase.from('TicketCorrections').insert([{
            id: reqId,
            ticketId: ticketId,
            ticketRoute: ticket.route,
            customerCode: ticket.customerCode,
            requestedBy: requestData.requestedBy,
            reason: requestData.reason,
            attachmentUrl: requestData.attachmentUrl,
            status: 'PENDING'
        }]);

        let newHist = ticket.statusHistory || [];
        newHist.push({ status: 'CORRECTION_REQUESTED', actor: requestData.requestedBy, timestamp: new Date().toISOString() });
        
        await supabase.from('Tickets').update({ 
            statusHistory: newHist
        }).eq('id', ticketId);

        await supabase.from('Notifications').insert([{ type: 'INFO', message: `Yêu cầu sửa phiếu ${ticketId}`, targetRole: 'CS_LEAD', relatedId: ticketId }]);

        return res.status(201).json({ id: reqId });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
