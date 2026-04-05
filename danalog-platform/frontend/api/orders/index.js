import { supabase } from '../_supabase.js';
import crypto from 'crypto';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const orderData = req.body;
        orderData.id = 'ORD-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        orderData.status = 'NEW';
        orderData.createdAt = new Date().toISOString();
        orderData.ticketsGenerated = true; // Auto generated

        // Save Order
        const { error: orderError } = await supabase.from('Orders').insert([orderData]);
        if (orderError) throw new Error(orderError.message);

        // Generate tickets
        let tickets = [];
        let count = parseInt(orderData.containerCount || 1);
        for (let i = 0; i < count; i++) {
            let containerObj = (orderData.containers && orderData.containers[i]) ? orderData.containers[i] : null;
            let containerNo = containerObj ? containerObj.containerNo : null;
            
            // fetch default values from route config
            const { data: routeData } = await supabase.from('RouteConfigs').select('*').eq('id', orderData.routeId).single();
            let defSal = 0, rev = 0, baseQuota = 0;
            if (routeData) {
                defSal = routeData.salary?.driverSalary || 500000;
                baseQuota = routeData.fuel?.quota || 0;
                let sizeKey = orderData.containerSize === '20' ? 'price20' : 'price40';
                let feKey = orderData.fe === 'F' ? 'F' : 'E';
                rev = routeData.revenue?.[sizeKey + feKey] || 0;
            }

            tickets.push({
                id: 'TK-' + orderData.id.replace('ORD-', '') + '-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
                orderId: orderData.id,
                route: orderData.routeName,
                customerCode: orderData.customerName,
                dateStart: orderData.pickupDate,
                dateEnd: orderData.deliveryDate,
                containerNo: containerNo,
                size: orderData.containerSize,
                fe: orderData.fe,
                revenue: rev,
                defaultSalary: defSal,
                status: 'DRAFT',
                dispatchStatus: 'WAITING_AUTO',
                statusHistory: [{ status: 'CS_CREATED', timestamp: new Date().toISOString() }],
                createdAt: new Date().toISOString(),
                defaultQuota: baseQuota,
            });
        }

        const { error: ticketError } = await supabase.from('Tickets').insert(tickets);
        if (ticketError) throw new Error(ticketError.message);

        return res.status(201).json(orderData);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
