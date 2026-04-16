import { supabase } from './_supabase.js';
import { randomUUID } from 'crypto';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const ticketId = req.query.id || req.body?.ticketId;
        if (!ticketId) return res.status(400).json({ error: 'Missing ticket ID' });
        
        const requestData = req.body;

        const { data: ticket, error: ticketErr } = await supabase.from('Tickets').select('*').eq('id', ticketId).single();
        if (ticketErr) return res.status(500).json({ error: 'Ticket fetch error: ' + ticketErr.message });
        if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

        const crId = randomUUID();
        const { data: crRecords, error: crError } = await supabase.from('TicketCorrections').insert([{
            id: crId,
            ticketId: ticketId,
            ticketRoute: ticket.route,
            customerCode: ticket.customerCode,
            requestedBy: requestData.requestedBy,
            reason: requestData.reason,
            attachmentUrl: requestData.attachmentUrl,
            status: 'PENDING'
        }]).select();

        if (crError) return res.status(500).json({ error: 'CR insert error: ' + crError.message });
        const reqId = crRecords[0].id;

        let newHist = ticket.statusHistory ? [...ticket.statusHistory] : [];
        newHist.push({ status: 'CORRECTION_REQUESTED', actor: requestData.requestedBy, timestamp: new Date().toISOString() });
        
        const { error: updErr } = await supabase.from('Tickets').update({ 
            statusHistory: newHist
        }).eq('id', ticketId);
        
        if (updErr) return res.status(500).json({ error: 'Ticket upd error: ' + updErr.message });

        const { error: notiErr } = await supabase.from('Notifications').insert([{ type: 'INFO', message: `Yêu cầu sửa phiếu ${ticketId}`, targetRole: 'CS_LEAD', relatedId: reqId }]);
        
        if (notiErr) return res.status(500).json({ error: 'Noti insert error: ' + notiErr.message });

        return res.status(201).json({ id: reqId, success: true });
    } catch (err) {
        return res.status(500).json({ error: 'Catch error: ' + err.message, stack: err.stack });
    }
}
