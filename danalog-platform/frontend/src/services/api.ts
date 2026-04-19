import { supabase } from './supabaseClient';
// Types imported for reference only
// import { TransportTicket, TransportOrder } from '../types';

const API_URL = '/api'; // fallback for serverless functions

const fetchWithToken = async (url: string, options: any = {}) => {
    const token = localStorage.getItem('danalog_token') || sessionStorage.getItem('danalog_token');
    const headers = { ...options.headers };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, { ...options, headers });
};

function sanitizeTicketForDb(ticket: any) {
    let history = ticket.statusHistory;
    if (typeof history === 'string') {
        try { history = JSON.parse(history); } catch (e) { history = []; }
    }
    if (!history || !Array.isArray(history)) history = [];
    
    if (history.length > 0) {
        if (ticket.notes !== undefined) history[0].notes = ticket.notes;
        if (ticket.submittedAt !== undefined) history[0].submittedAt = ticket.submittedAt;
        if (ticket.trips !== undefined) history[0].trips = ticket.trips;
        if (ticket.routeId !== undefined) history[0].routeId = ticket.routeId;
    } else if (ticket.notes || ticket.submittedAt || ticket.trips || ticket.routeId) {
        history.push({
            status: ticket.status || 'NEW',
            timestamp: new Date().toISOString(),
            notes: ticket.notes,
            submittedAt: ticket.submittedAt,
            trips: ticket.trips,
            routeId: ticket.routeId
        });
    }

    const dbTicket: any = {
        id: ticket.id,
        orderId: ticket.orderId,
        route: ticket.route,
        customerCode: ticket.customerCode,
        dateStart: ticket.dateStart,
        dateEnd: ticket.dateEnd,
        containerNo: ticket.containerNo,
        imageUrl: ticket.imageUrl,
        size: ticket.size,
        fe: ticket.fe,
        revenue: ticket.revenue,
        defaultSalary: ticket.driverSalary !== undefined ? ticket.driverSalary : ticket.defaultSalary,
        status: ticket.status,
        dispatchStatus: ticket.dispatchStatus,
        statusHistory: JSON.stringify(history),
        driverUsername: ticket.driverUsername || ticket.createdBy,
        driverName: ticket.driverName,
        licensePlate: ticket.licensePlate,
        location: ticket.location,
        fuelId: ticket.fuelId,
        nightStay: ticket.nightStay,
        nightStayLocation: ticket.nightStayLocation,
        nightStayDays: ticket.nightStayDays,
        defaultQuota: ticket.defaultQuota,
        allocatedQuota: ticket.allocatedQuota,
        extraSurcharge: ticket.extraSurcharge,
        dispatchVersion: ticket.dispatchVersion,
        submittedToCS: ticket.submittedToCS,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt
    };

    Object.keys(dbTicket).forEach(key => {
        if (dbTicket[key] === undefined) {
            delete dbTicket[key];
        }
    });

    return dbTicket;
}

export const api = {
    // Orders (Direct Supabase)
    getOrders: async () => {
        const { data, error } = await supabase.from('Orders').select('*');
        if (error) throw new Error(error.message);
        return data.map(d => ({...d, containers: typeof d.containers === 'string' ? JSON.parse(d.containers) : d.containers}));
    },
    // Keep createOrder logic hitting our Vercel backend so it handles ticket creation securely
    createOrder: (order: any) => fetchWithToken(`${API_URL}/orders`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(order)
    }).then(r => r.json()),
    
    updateOrder: async (id: string, updates: any) => {
        const { data, error } = await supabase.from('Orders').update(updates).eq('id', id).select();
        if (error) throw new Error(error.message);
        return data?.[0];
    },

    // Tickets
    getTickets: async (userInfo?: { username?: string, role?: string }) => {
        let query = supabase.from('Tickets').select('*').order('dateStart', { ascending: false });
        if (userInfo?.username && userInfo?.role === 'DRIVER') query = query.eq('driverUsername', userInfo.username);
        const { data, error } = await query;
        if (error) throw new Error(error.message);

        // Fetch Orders to get true createdBy
        const { data: orders } = await supabase.from('Orders').select('id, createdBy');
        const orderMap = new Map();
        if (orders) orders.forEach(o => orderMap.set(o.id, o.createdBy));

        return data.map(t => {
            const hist = typeof t.statusHistory === 'string' ? JSON.parse(t.statusHistory) : (t.statusHistory || []);
            const latestNode = hist[0] || {};
            return {
                ...t, 
                statusHistory: hist,
                driverSalary: t.defaultSalary,
                createdBy: orderMap.get(t.orderId) || 'system',
                csUsername: orderMap.get(t.orderId) || 'system',
                notes: latestNode.notes,
                submittedAt: latestNode.submittedAt,
                trips: latestNode.trips,
                routeId: latestNode.routeId
            };
        });
    },
    saveTickets: async (tickets: any[]) => {
        // Bulk save
        const cleanTickets = tickets.map(sanitizeTicketForDb);
        const { data, error } = await supabase.from('Tickets').upsert(cleanTickets).select();
        if (error) throw new Error(error.message);
        return data;
    },
    updateTicket: async (id: string, updates: any) => {
        const cleanUpdates = sanitizeTicketForDb(updates);
        delete cleanUpdates.id; // avoid updating id
        const { data, error } = await supabase.from('Tickets').update(cleanUpdates).eq('id', id).select();
        if(error) throw new Error(error.message);

        // Notify CS when submitted
        if (updates.submittedToCS) {
            try {
                await supabase.from('Notifications').insert([{
                    type: 'INFO',
                    message: `Lái xe đã nộp chứng từ chờ duyệt cho lệnh số ${id.slice(-8)}`,
                    targetRole: 'CS',
                    relatedId: id,
                    read: false,
                    createdAt: new Date().toISOString()
                }]);
            } catch(e) { console.error(e); }
        }
        
        return data?.[0];
    },

    // Route Configs
    getRouteConfigs: async () => {
        const { data, error } = await supabase.from('RouteConfigs').select('*');
        if(error) throw new Error(error.message);
        
        // Deduplicate RouteConfigs by customer + routeName + cargoType
        const unique = new Map();
        (data || []).forEach(config => {
            const key = `${config.customer}-${config.routeName}-${config.cargoType || ''}`;
            const existing = unique.get(key);
            if (!existing) {
                unique.set(key, config);
            } else {
                // Prefer ACTIVE config
                if (config.status === 'ACTIVE' && existing.status !== 'ACTIVE') {
                    unique.set(key, config);
                } else if (config.status === existing.status) {
                    // Prefer latest updated
                    const d1 = new Date(config.updatedAt || 0).getTime();
                    const d2 = new Date(existing.updatedAt || 0).getTime();
                    if (d1 > d2) unique.set(key, config);
                }
            }
        });
        return Array.from(unique.values());
    },
    saveRouteConfigs: async (configs: any[]) => {
        const { data, error } = await supabase.from('RouteConfigs').upsert(configs).select();
        if(error) throw new Error(error.message);
        return data;
    },
    updateRouteConfig: async (id: string, updates: any) => {
         const { data, error } = await supabase.from('RouteConfigs').update(updates).eq('id', id).select();
         if(error) throw new Error(error.message);
         return data?.[0];
    },
    deleteRouteConfig: async (id: string) => {
        const { error } = await supabase.from('RouteConfigs').delete().eq('id', id);
        if(error) throw new Error(error.message);
        return { success: true };
    },
    savePendingChanges: async (id: string, pendingChanges: any[]) => {
        const { data, error } = await supabase.from('RouteConfigs').update({ pendingChanges }).eq('id', id).select();
        if(error) throw new Error(error.message);
        return data?.[0];
    },
    cancelPendingChanges: async (id: string) => {
        const { data, error } = await supabase.from('RouteConfigs').update({ pendingChanges: null }).eq('id', id).select();
        if(error) throw new Error(error.message);
        return data?.[0];
    },
    getRouteHistory: async (id: string) => {
        // Mock method to avoid runtime crashes
        return Promise.resolve([]);
    },

    // Users
    getUsers: async () => {
        const { data, error } = await supabase.from('Users').select('*');
        if(error) throw new Error(error.message);
        return data;
    },
    updateUser: async (username: string, updates: any) => {
        const payload = { ...updates };
        if (payload.password === '') {
            delete payload.password;
        }
        
        // Update via secure backend (which handles Supabase update)
        const r = await fetchWithToken(`${API_URL}/users/${username}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
        if (!r.ok) { const err = await r.json().catch(()=>({})); throw new Error(err.error || 'Failed to update user'); }
        return r.json();
    },
    createUser: async (userData: any) => {
        // Create via secure backend (which handles Supabase insert)
        const r = await fetchWithToken(`${API_URL}/users`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(userData)
        });
        if (!r.ok) { const err = await r.json().catch(()=>({})); throw new Error(err.error || 'Failed to create user'); }
        return r.json();
    },
    deleteUser: async (username: string) => {
        const r = await fetchWithToken(`${API_URL}/users/${username}`, { method: 'DELETE' });
        if (!r.ok) { const err = await r.json().catch(()=>({})); throw new Error(err.error || 'Failed to delete user securely'); }

        const { error } = await supabase.from('Users').delete().eq('username', username);
        if(error) throw new Error(error.message);
        return { success: true };
    },

    // Standard CRUD conversions ...
    getCustomers: async () => {
        const { data, error } = await supabase.from('Customers').select('*');
        if(error) throw new Error(error.message);
        return data;
    },
    createCustomer: async (customer: any) => {
         const { data, error } = await supabase.from('Customers').insert([customer]).select();
         if(error) throw new Error(error.message);
         return data?.[0];
    },
    updateCustomer: async (id: string, updates: any) => {
        const { data, error } = await supabase.from('Customers').update(updates).eq('id', id).select();
        if(error) throw new Error(error.message);
        return data?.[0];
    },
    deleteCustomer: async (id: string) => {
        const { error } = await supabase.from('Customers').delete().eq('id', id);
        if(error) throw new Error(error.message);
        return { success: true };
    },

    // VERCEL SERVERLESS APIS (Keep fetching for complex logics)
    dispatchSuggest: (ticketId: string) => fetchWithToken(`${API_URL}/dispatch/suggest`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticketId })
    }).then(r => r.json()),

    dispatchAssign: async (ticketId: string, driverId: string, assignType: string = 'manual', reason?: string, dispatcherUsername?: string, version?: number) => {
        const r = await fetchWithToken(`${API_URL}/dispatch/assign`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticketId, driverId, assignType, reason, dispatcherUsername, version })
        });
        if (r.status === 409) throw new Error('CONFLICT');
        const data = await r.json();
        
        try {
            await supabase.from('Notifications').insert([{
                type: 'INFO',
                message: `Bạn được giao một chuyến đi mới (Mã HĐ: ${ticketId.slice(-8)})`,
                to: driverId,
                targetRole: 'DRIVER',
                relatedId: ticketId,
                read: false,
                createdAt: new Date().toISOString()
            }]);
        } catch(e) { console.error(e); }
        
        return data;
    },

    dispatchAutoAssign: (ticketId: string, dispatcherUsername?: string) => fetchWithToken(`${API_URL}/dispatch/auto-assign`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticketId, dispatcherUsername })
    }).then(r => r.json()),

    respondToDispatch: async (ticketId: string, response: string, rejectReasonCode?: string, reason?: string, driverUsername?: string) => {
        const r = await fetchWithToken(`${API_URL}/dispatch/driver-response`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticketId, response, rejectReasonCode, reason, driverUsername })
        });
        const data = await r.json();
        
        if (driverUsername && response !== 'PENDING') {
            try {
                await supabase.from('Notifications').insert([{
                    type: response === 'ACCEPT' ? 'SUCCESS' : 'WARNING',
                    message: `Lái xe ${driverUsername} đã ${response === 'ACCEPT' ? 'ĐỒNG Ý NHẬN' : 'TỪ CHỐI'} lệnh ${ticketId.slice(-8)}${reason ? ` (Lý do: ${reason})` : ''}`,
                    targetRole: 'DISPATCHER',
                    relatedId: ticketId,
                    read: false,
                    createdAt: new Date().toISOString()
                }]);
            } catch(e) { console.error(e); }
        }
        return data;
    },

    getDashboardStats: () => fetchWithToken(`${API_URL}/dashboard/stats`).then(r => r.json()),
    
    getDispatchLogs: async () => {
        const { data, error } = await supabase.from('DispatchLogs').select('*');
        if(error) throw new Error(error.message);
        return data.map(d => ({
            ...d, 
            candidates: typeof d.candidates === 'string' ? JSON.parse(d.candidates) : d.candidates,
            rejectedCandidates: typeof d.rejectedCandidates === 'string' ? JSON.parse(d.rejectedCandidates) : d.rejectedCandidates
        }));
    },

    getDriverResponses: async () => {
        // Build driver response objects from DispatchLogs where responseStatus is WAITING
        const { data: logs, error } = await supabase.from('DispatchLogs').select('*').order('timestamp', { ascending: false });
        if (error) throw new Error(error.message);
        return (logs || []).map(log => ({
            id: log.id,
            ticketId: log.ticketId,
            driverId: log.assignedDriverId,
            driverName: log.assignedDriverName,
            licensePlate: log.licensePlate || '',
            route: log.ticketRoute,
            response: log.responseStatus === 'WAITING' ? 'PENDING' : log.responseStatus,
            rejectReasonCode: log.responseReason || '',
            reason: log.reason || log.overrideNote || '',
            sentAt: log.timestamp,          // When the assignment was made = when "sent" to driver
            respondedAt: log.respondedAt || null,  // When the driver responded
            timestamp: log.timestamp,
            assignType: log.assignType
        }));
    },
    
    getNotifications: async () => {
        const { data, error } = await supabase.from('Notifications').select('*').order('createdAt', { ascending: false });
        if(error) throw new Error(error.message);
        return data;
    },
    markNotificationRead: async (id: string) => {
        const { data, error } = await supabase.from('Notifications').update({ read: true }).eq('id', id).select();
        if(error) throw new Error(error.message);
        return data?.[0];
    },
    deleteNotification: async (id: string) => {
        const { error } = await supabase.from('Notifications').delete().eq('id', id);
        if(error) throw new Error(error.message);
        return { success: true };
    },
    deleteAllNotifications: async (ids?: string[]) => {
        if (ids !== undefined) {
            if (ids.length === 0) return { success: true };
            const { error } = await supabase.from('Notifications').delete().in('id', ids);
            if(error) throw new Error(error.message);
        } else {
            // Unsafe fallback to delete everything (not used usually)
            const { error } = await supabase.from('Notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            if(error) throw new Error(error.message);
        }
        return { success: true };
    },

    getFuelTickets: async (username?: string) => {
        let query = supabase.from('FuelTickets').select('*');
        if(username) query = query.eq('driverUsername', username);
        const { data, error } = await query;
        if(error) throw new Error(error.message);
        return data;
    },

    createNotification: async (payload: any) => {
        const { data, error } = await supabase.from('Notifications').insert([payload]).select();
        if(error) throw new Error(error.message);
        return data?.[0];
    },

    getPublishedSalaries: async () => {
        const { data, error } = await supabase.from('PublishedSalaries').select('*');
        if(error) throw new Error(error.message);
        return data.map(d => ({...d, items: typeof d.items === 'string' ? JSON.parse(d.items) : d.items}));
    },
    publishSalary: async (payload: any) => {
        const { data: existing } = await supabase.from('PublishedSalaries')
            .select('id')
            .eq('driverUsername', payload.driverUsername)
            .eq('month', payload.month)
            .eq('year', payload.year)
            .single();

        if (existing) {
            const { data, error } = await supabase.from('PublishedSalaries').update(payload).eq('id', existing.id).select();
            if(error) throw new Error(error.message);
            return data?.[0];
        } else {
            const { data, error } = await supabase.from('PublishedSalaries').insert([payload]).select();
            if(error) throw new Error(error.message);
            return data?.[0];
        }
    },

    // Ticket corrections
    getTicketCorrections: async () => {
        const { data, error } = await supabase.from('TicketCorrections').select('*');
        if(error) throw new Error(error.message);
        return data;
    },
    requestTicketCorrection: async (id: string, requestData: any) => {
        const r = await fetchWithToken(`${API_URL}/ticket-correction-request?id=${id}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestData)
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Server error');
        return data;
    },
    reviewTicketCorrection: async (id: string, reviewData: any) => {
        const r = await fetchWithToken(`${API_URL}/ticket-correction-review?id=${id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(reviewData)
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Server error');
        return data;
    },

    // Fuel and Profile additions missing from migration
    createFuelTicket: async (ticket: any) => {
        const { data, error } = await supabase.from('FuelTickets').insert([ticket]).select();
        if(error) throw new Error(error.message);
        
        try {
            await supabase.from('Notifications').insert([{
                type: 'WARNING',
                message: `Lái xe ${ticket.driverName || ticket.driverUsername} đã tạo phiếu xin tạm ứng nhiên liệu`,
                targetRole: 'ADMIN',
                relatedId: data?.[0]?.id || ticket.id,
                read: false,
                createdAt: new Date().toISOString()
            }]);
        } catch(e) { console.error(e); }
        
        return data?.[0];
    },
    getProfileUpdateRequests: async (_filterRole?: string, username?: string) => {
        let query = supabase.from('ProfileUpdateRequests').select('*').order('created_at', { ascending: false });
        if(username) query = query.eq('username', username);
        const { data, error } = await query;
        if(error) {
            console.error('getProfileUpdateRequests error:', error);
            return [];
        }
        return data || [];
    },
    submitProfileUpdateRequest: async (request: any) => {
        // 1. Check if there is already a PENDING request for this user to prevent duplicates
        const { data: existing } = await supabase.from('ProfileUpdateRequests')
            .select('*')
            .eq('username', request.username)
            .eq('status', 'PENDING');

        let createdOrUpdatedRequest;

        if (existing && existing.length > 0) {
            // Update the existing PENDING request to prevent stacking
            const { data, error } = await supabase.from('ProfileUpdateRequests')
                .update({ fieldsToUpdate: request.fieldsToUpdate })
                .eq('id', existing[0].id)
                .select();
            if(error) throw new Error(error.message);
            createdOrUpdatedRequest = data?.[0];
        } else {
            // Create a new request. Do NOT send 'id' so Supabase can generate the UUID
            const newRequest = {
                status: 'PENDING',
                username: request.username,
                fieldsToUpdate: request.fieldsToUpdate
            };
            const { data, error } = await supabase.from('ProfileUpdateRequests').insert([newRequest]).select();
            if(error) throw new Error(error.message);
            createdOrUpdatedRequest = data?.[0];
            
            // Notify ADMINs about new profile update request only if it's new
            try {
                await supabase.from('Notifications').insert([{
                    type: 'INFO',
                    message: `Có yêu cầu cập nhật hồ sơ mới từ user ${request.username}`,
                    targetRole: 'ADMIN',
                    relatedId: createdOrUpdatedRequest.id,
                    read: false,
                    createdAt: new Date().toISOString()
                }]);
            } catch (e) {
                console.error('Failed to send notification for new profile request', e);
            }
        }

        return createdOrUpdatedRequest;
    },
    actionProfileUpdateRequest: async (id: string, action: 'approve' | 'reject', details: { reviewNote?: string, reviewerUsername?: string }) => {
        const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';
        
        // Fetch the request first
        const { data: fetchReq, error: fetchErr } = await supabase.from('ProfileUpdateRequests').select('*').eq('id', id).single();
        if (fetchErr || !fetchReq) throw new Error(fetchErr?.message || 'Request not found');

        // 1. IMPORTANT: If approved, apply changes to Users table FIRST
        // This ensures tracking integrity. If Users table is missing columns (e.g. licenseType), this throws and aborts correctly.
        if (action === 'approve' && fetchReq.fieldsToUpdate) {
            const fields = typeof fetchReq.fieldsToUpdate === 'string' 
                ? JSON.parse(fetchReq.fieldsToUpdate) 
                : fetchReq.fieldsToUpdate;
            const { error: userErr } = await supabase.from('Users').update(fields).eq('username', fetchReq.username);
            if(userErr) throw new Error(userErr.message);
        }

        // 2. Safely Update the request record
        const { data: reqData, error: reqErr } = await supabase.from('ProfileUpdateRequests')
            .update({ 
                status: newStatus, 
                approverUsername: details.reviewerUsername || 'system',
                approverNotes: details.reviewNote || ''
            })
            .eq('id', id).select();
        if(reqErr) throw new Error(reqErr.message);
        
        const request = reqData?.[0];
        
        // 3. Send notification to the requestor
        try {
            const notifMsg = action === 'approve'
                ? `Yêu cầu cập nhật hồ sơ của bạn đã được PHÊ DUYỆT bởi ${details.reviewerUsername}`
                : `Yêu cầu cập nhật hồ sơ của bạn đã bị TỪ CHỐI bởi ${details.reviewerUsername}${details.reviewNote ? ` - Lý do: ${details.reviewNote}` : ''}`;
            
            await supabase.from('Notifications').insert([{
                type: action === 'approve' ? 'SUCCESS' : 'WARNING',
                message: notifMsg,
                to: request.username,
                targetRole: 'ALL',
                relatedId: id,
                read: false,
                createdAt: new Date().toISOString()
            }]);
        } catch (e) {
            console.error('Failed to send approval notification', e);
        }
        
        return request;
    },
    changePassword: async (request: any) => {
        const r = await fetchWithToken(`${API_URL}/profile/password`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request)
        });
        if (!r.ok) { const err = await r.json().catch(()=>({})); throw new Error(err.error || 'Đổi mật khẩu thất bại'); }
        return { success: true };
    },
    updateProfileRequestStatus: async (requestId: string, status: string, approverUsername: string, notes?: string) => {
        const { data, error } = await supabase.from('ProfileUpdateRequests').update({ status, approverUsername, approverNotes: notes }).eq('id', requestId).select();
        if(error) throw new Error(error.message);
        return data?.[0];
    },

    // Missing APIs added to fix flow crashes
    applyPendingChanges: async () => {
        // Implement logic or bypass
        // Just return true for now, since actual cron handles this later 
        return Promise.resolve(true); 
    },
    createTicket: async (ticket: any) => {
        const cleanTicket = sanitizeTicketForDb(ticket);
        const { data, error } = await supabase.from('Tickets').insert([cleanTicket]).select();
        if(error) throw new Error(error.message);
        return data?.[0];
    },
    dispatchOverride: async (ticketId: string, driverId: string, reasonCode: string, note?: string, dispatcherUsername?: string, version?: number) => {
        const r = await fetchWithToken(`${API_URL}/dispatch/assign`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticketId, driverId, assignType: 'override', reason: note || reasonCode, dispatcherUsername, version })
        });
        if (r.status === 409) throw new Error('CONFLICT');
        const data = await r.json();
        
        try {
            await supabase.from('Notifications').insert([{
                type: 'WARNING',
                message: `Lệnh số ${ticketId.slice(-8)} đã được GIAO ÉP cho bạn (Ghi chú: ${note || reasonCode})`,
                to: driverId,
                targetRole: 'DRIVER',
                relatedId: ticketId,
                read: false,
                createdAt: new Date().toISOString()
            }]);
        } catch(e) { console.error(e); }
        
        return data;
    },

    // ========== FUEL STATIONS MANAGEMENT ==========
    getFuelStations: async () => {
        const { data, error } = await supabase.from('FuelStations').select('*').order('name');
        if (error) throw new Error(error.message);
        return data || [];
    },
    createFuelStation: async (station: any) => {
        const { data, error } = await supabase.from('FuelStations').insert([station]).select();
        if (error) throw new Error(error.message);
        return data?.[0];
    },
    updateFuelStation: async (id: string, updates: any) => {
        const { data, error } = await supabase.from('FuelStations').update(updates).eq('id', id).select();
        if (error) throw new Error(error.message);
        return data?.[0];
    },
    deleteFuelStation: async (id: string) => {
        const { error } = await supabase.from('FuelStations').delete().eq('id', id);
        if (error) throw new Error(error.message);
    },

    // ========== FUEL TICKET APPROVAL ==========
    approveFuelTicket: async (id: string, approverUsername: string) => {
        const { data, error } = await supabase.from('FuelTickets')
            .update({ status: 'APPROVED', approvedBy: approverUsername, approvedAt: new Date().toISOString() })
            .eq('id', id).select();
        if (error) throw new Error(error.message);
        
        // Notify driver
        const ticket = data?.[0];
        if (ticket) {
            try {
                await supabase.from('Notifications').insert([{
                    type: 'SUCCESS',
                    message: `Phiếu nhiên liệu ${id.slice(-8)} đã được DUYỆT bởi ${approverUsername}`,
                    to: ticket.driverUsername,
                    targetRole: 'DRIVER',
                    relatedId: id,
                    read: false,
                    createdAt: new Date().toISOString()
                }]);
            } catch (e) { console.error(e); }
        }
        return ticket;
    },
    updateFuelTicket: async (id: string, updates: any) => {
        const { data, error } = await supabase.from('FuelTickets').update(updates).eq('id', id).select();
        if (error) throw new Error(error.message);
        return data?.[0];
    },

    // ========== DISPATCH REASSIGN ==========
    dispatchReassign: async (ticketId: string, dispatcherUsername?: string) => {
        const r = await fetchWithToken(`${API_URL}/dispatch/reassign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticketId, dispatcherUsername })
        });
        if (!r.ok) {
            const err = await r.json().catch(() => ({}));
            throw new Error(err.error || 'Reassign failed');
        }
        return r.json();
    },

};
