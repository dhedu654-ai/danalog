import { supabase } from '../_supabase.js';
import crypto from 'crypto';

export default async function handler(req, res) {
    if (req.method === 'POST') {
        try {
            const orderData = req.body;
            orderData.id = 'ORD-' + Math.random().toString(36).substring(2, 8).toUpperCase();
            const initialStatus = orderData.status || 'NEW';
            orderData.status = initialStatus;
            orderData.createdAt = new Date().toISOString();
            orderData.ticketsGenerated = initialStatus !== 'DRAFT';
            if (initialStatus === 'DRAFT') orderData.ticketsGenerated = false;

            // Save Order
            const { error: orderError } = await supabase.from('Orders').insert([orderData]);
            if (orderError) throw new Error(orderError.message);

            // Generate tickets
            let tickets = [];
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
                    let feKey = (c.fe === 'F' || c.fe === 'Full') ? 'F' : 'E';
                    let rev = routeData?.revenue?.[sizeKey + feKey] || 0;

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
                        fe: c.fe === 'Full' ? 'F' : (c.fe === 'Empty' ? 'E' : c.fe),
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
    } else if (req.method === 'PUT') {
        try {
            const updates = req.body;
            const orderId = req.query.id;
            
            if (!orderId) {
                return res.status(400).json({ error: 'Missing order ID' });
            }

            // 1. Fetch current order
            const { data: currentOrder, error: fetchErr } = await supabase.from('Orders').select('*').eq('id', orderId).single();
            if (fetchErr) throw new Error(fetchErr.message);

            // 2. Update the order
            const { error: updateErr } = await supabase.from('Orders').update(updates).eq('id', orderId);
            if (updateErr) throw new Error(updateErr.message);

            // 3. Reconcile Tickets if containers changed
            if (updates.containers && Array.isArray(updates.containers)) {
                const { data: existingTickets, error: tkErr } = await supabase.from('Tickets').select('*').eq('orderId', orderId);
                if (tkErr) throw new Error(tkErr.message);

                const { data: routeData } = await supabase.from('RouteConfigs').select('*').eq('id', currentOrder.routeId).single();
                let defSal = routeData?.salary?.driverSalary || 500000;
                let baseQuota = routeData?.fuel?.quota || 0;

                let ticketsToAdd = [];

                for (let c of updates.containers) {
                    let targetCount = parseInt(c.count || 1);
                    let normalizedFe = c.fe === 'Full' ? 'F' : (c.fe === 'Empty' ? 'E' : c.fe);
                    
                    // Count existing tickets for this size & fe
                    let matchingTickets = existingTickets.filter(t => t.size === c.size && t.fe === normalizedFe);
                    
                    if (matchingTickets.length < targetCount) {
                        let diff = targetCount - matchingTickets.length;
                        for (let i = 0; i < diff; i++) {
                            let sizeKey = c.size === '20' ? 'price20' : 'price40';
                            let feKey = normalizedFe === 'F' ? 'F' : 'E';
                            let rev = routeData?.revenue?.[sizeKey + feKey] || 0;

                            ticketsToAdd.push({
                                id: 'TK-' + orderId.replace('ORD-', '') + '-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
                                orderId: orderId,
                                route: currentOrder.routeName,
                                customerCode: currentOrder.customerName,
                                dateStart: updates.pickupDate || currentOrder.pickupDate,
                                dateEnd: updates.deliveryDate || currentOrder.deliveryDate,
                                containerNo: c.containerNo || null,
                                size: c.size,
                                fe: normalizedFe,
                                revenue: rev,
                                defaultSalary: defSal,
                                status: 'MỚI TẠO',
                                dispatchStatus: 'WAITING_DISPATCH',
                                statusHistory: [{ status: 'CS_CREATED', timestamp: new Date().toISOString(), action: 'Tự động tạo thêm khi cập nhật đơn hàng' }],
                                createdAt: new Date().toISOString(),
                                defaultQuota: baseQuota,
                            });
                        }
                    }
                    // Optional: If matchingTickets.length > targetCount, we could delete the unassigned ones. 
                    // But for safety, we only ADD tickets automatically. The user can manually delete extra tickets.
                }

                if (ticketsToAdd.length > 0) {
                    const { error: insertErr } = await supabase.from('Tickets').insert(ticketsToAdd);
                    if (insertErr) throw new Error(insertErr.message);

                    // Notify
                    await supabase.from('Notifications').insert([{
                        id: crypto.randomUUID(),
                        targetRole: 'DISPATCHER',
                        type: 'INFO',
                        message: `Có thêm ${ticketsToAdd.length} phiếu vận tải bổ sung từ Đơn hàng ${orderId} cần điều phối.`,
                        relatedId: orderId,
                        createdAt: new Date().toISOString(),
                        read: false
                    }]);
                }
            }

            return res.status(200).json({ success: true });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    } else {
        return res.status(405).json({ error: 'Method not allowed' });
    }
}
