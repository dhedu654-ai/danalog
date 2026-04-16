import { supabase } from '../_supabase.js';
import crypto from 'crypto';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const orderData = req.body;
        orderData.id = 'ORD-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        const initialStatus = orderData.status || 'NEW';
        orderData.status = initialStatus;
        orderData.createdAt = new Date().toISOString();
        orderData.ticketsGenerated = initialStatus !== 'DRAFT'; // DRAFT may not generate fully if handled elsewhere, but keeping true for consistency unless we want no tickets for drafting. Actually, OrderCreationForm says ticketsGenerated: false for DRAFT.
        if (initialStatus === 'DRAFT') orderData.ticketsGenerated = false;

        // Save Order
        const { error: orderError } = await supabase.from('Orders').insert([orderData]);
        if (orderError) throw new Error(orderError.message);

        // Generate tickets
        let tickets = [];
        
        // Fetch default values from route config once
        const { data: routeData } = await supabase.from('RouteConfigs').select('*').eq('id', orderData.routeId).single();
        let defSal = routeData?.salary?.driverSalary || 500000;
        let baseQuota = routeData?.fuel?.quota || 0;

        let containersArr = orderData.containers && Array.isArray(orderData.containers) && orderData.containers.length > 0 
            ? orderData.containers 
            : [{ size: orderData.containerSize || '40', fe: orderData.fe || 'F', count: parseInt(orderData.containerCount || 1) }];

        for (let c of containersArr) {
            let containerCount = parseInt(c.count || 1);
            for (let i = 0; i < containerCount; i++) {
                let sizeKey = c.size === '20' ? 'price20' : 'price40';
                let feKey = c.fe === 'F' ? 'F' : 'E';
                let rev = routeData?.revenue?.[sizeKey + feKey] || 0;

                // Determine ticket status based on order status
                let ticketStatus = initialStatus === 'DRAFT' ? 'DRAFT' : 'MỚI TẠO';

                tickets.push({
                    id: 'TK-' + orderData.id.replace('ORD-', '') + '-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
                    orderId: orderData.id,
                    route: orderData.routeName,
                    customerCode: orderData.customerName,
                    dateStart: orderData.pickupDate,
                    dateEnd: orderData.deliveryDate,
                    containerNo: c.containerNo || null,
                    size: c.size,
                    fe: c.fe,
                    revenue: rev,
                    defaultSalary: defSal,
                    status: ticketStatus,
                    dispatchStatus: 'WAITING_DISPATCH',
                    statusHistory: [{ status: 'CS_CREATED', timestamp: new Date().toISOString() }],
                    createdAt: new Date().toISOString(),
                    defaultQuota: baseQuota,
                });
            }
        }

        const { error: ticketError } = await supabase.from('Tickets').insert(tickets);
        if (ticketError) throw new Error(ticketError.message);

        // Notify Dispatcher
        if (tickets.length > 0 && initialStatus !== 'DRAFT') {
            await supabase.from('Notifications').insert([{
                id: crypto.randomUUID(),
                targetRole: 'DISPATCHER',
                type: 'INFO',
                message: `Có ${tickets.length} phiếu vận tải mới từ Đơn hàng ${orderData.id} cần điều phối.`,
                relatedId: orderData.id,
                createdAt: new Date().toISOString(),
                read: false
            }]);
        }

        return res.status(201).json(orderData);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
