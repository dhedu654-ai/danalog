import { supabase } from './supabaseClient';
import { TransportTicket, TransportOrder } from '../types';

const API_URL = '/api'; // fallback for serverless functions

export const api = {
    // Orders (Direct Supabase)
    getOrders: async () => {
        const { data, error } = await supabase.from('Orders').select('*');
        if (error) throw new Error(error.message);
        return data.map(d => ({...d, containers: typeof d.containers === 'string' ? JSON.parse(d.containers) : d.containers}));
    },
    // Keep createOrder logic hitting our Vercel backend so it handles ticket creation securely
    createOrder: (order: any) => fetch(`${API_URL}/orders`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(order)
    }).then(r => r.json()),
    
    updateOrder: async (id: string, updates: any) => {
        const { data, error } = await supabase.from('Orders').update(updates).eq('id', id).select();
        if (error) throw new Error(error.message);
        return data?.[0];
    },

    // Tickets
    getTickets: async (userInfo?: { username?: string, role?: string }) => {
        let query = supabase.from('Tickets').select('*');
        if (userInfo?.username && userInfo?.role === 'DRIVER') query = query.eq('driverUsername', userInfo.username);
        const { data, error } = await query;
        if (error) throw new Error(error.message);
        return data.map(t => ({...t, statusHistory: typeof t.statusHistory === 'string' ? JSON.parse(t.statusHistory) : t.statusHistory}));
    },
    saveTickets: async (tickets: any[]) => {
        // Bulk save
        const { data, error } = await supabase.from('Tickets').upsert(tickets).select();
        if (error) throw new Error(error.message);
        return data;
    },
    updateTicket: async (id: string, updates: any) => {
        const { data, error } = await supabase.from('Tickets').update(updates).eq('id', id).select();
        if(error) throw new Error(error.message);
        return data?.[0];
    },

    // Route Configs
    getRouteConfigs: async () => {
        const { data, error } = await supabase.from('RouteConfigs').select('*');
        if(error) throw new Error(error.message);
        return data;
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

    // Users
    getUsers: async () => {
        const { data, error } = await supabase.from('Users').select('*');
        if(error) throw new Error(error.message);
        return data;
    },
    updateUser: async (username: string, updates: any) => {
        const { data, error } = await supabase.from('Users').update(updates).eq('username', username).select();
        if(error) throw new Error(error.message);
        return data?.[0];
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

    // VERCEL SERVERLESS APIS (Keep fetching for complex logics)
    dispatchSuggest: (ticketId: string) => fetch(`${API_URL}/dispatch/suggest`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticketId })
    }).then(r => r.json()),

    dispatchAssign: (ticketId: string, driverId: string, assignType: string = 'manual', reason?: string, dispatcherUsername?: string, version?: number) =>
        fetch(`${API_URL}/dispatch/assign`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticketId, driverId, assignType, reason, dispatcherUsername, version })
        }).then(r => { if (r.status === 409) throw new Error('CONFLICT'); return r.json(); }),

    dispatchAutoAssign: (ticketId: string) => fetch(`${API_URL}/dispatch/auto-assign`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticketId })
    }).then(r => r.json()),

    respondToDispatch: (ticketId: string, response: string, rejectReasonCode?: string, reason?: string, driverUsername?: string) =>
        fetch(`${API_URL}/dispatch/driver-response`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticketId, response, rejectReasonCode, reason, driverUsername })
        }).then(r => r.json()),

    getDashboardStats: () => fetch(`${API_URL}/dashboard/stats`).then(r => r.json()),
    
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
        // Fallback for driver responses since migration moved them directly to Tickets and DispatchLogs status.
        return [];
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
    deleteAllNotifications: async (targetIdentifier?: string) => {
        let query = supabase.from('Notifications').delete();
        if (targetIdentifier) {
            // If it looks like a role, filter by targetRole, otherwise by target username (message/to)
            if (['ADMIN', 'CS', 'DISPATCHER', 'DRIVER'].includes(targetIdentifier)) {
                query = query.eq('targetRole', targetIdentifier);
            } else {
                // Approximate for driver username if we don't have a direct column yet (should ideally be targetUsername)
                query = query.ilike('message', `%${targetIdentifier}%`);
            }
        } else {
            query = query.neq('id', 0);
        }
        const { error } = await query;
        if(error) throw new Error(error.message);
        return { success: true };
    },

    getFuelTickets: async (username?: string) => {
        let query = supabase.from('FuelTickets').select('*');
        if(username) query = query.eq('driverUsername', username);
        const { data, error } = await query;
        if(error) throw new Error(error.message);
        return data;
    },

    getPublishedSalaries: async () => {
        const { data, error } = await supabase.from('PublishedSalaries').select('*');
        if(error) throw new Error(error.message);
        return data.map(d => ({...d, items: typeof d.items === 'string' ? JSON.parse(d.items) : d.items}));
    },
    publishSalary: (publication: any) => fetch(`${API_URL}/published-salaries`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(publication)
    }).then(r => r.json()),

    // Ticket corrections
    getTicketCorrections: async () => {
        const { data, error } = await supabase.from('TicketCorrections').select('*');
        if(error) throw new Error(error.message);
        return data;
    },
    requestTicketCorrection: (id: string, requestData: any) => fetch(`${API_URL}/tickets/${id}/correction-request`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestData)
    }).then(r => r.json()),
    reviewTicketCorrection: (id: string, reviewData: any) => fetch(`${API_URL}/ticket-corrections/${id}/review`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(reviewData)
    }).then(r => r.json()),

    // Fuel and Profile additions missing from migration
    createFuelTicket: async (ticket: any) => {
        const { data, error } = await supabase.from('FuelTickets').insert([ticket]).select();
        if(error) throw new Error(error.message);
        return data?.[0];
    },
    getProfileUpdateRequests: async (status?: string, username?: string) => {
        let query = supabase.from('ProfileUpdateRequests').select('*');
        if(status) query = query.eq('status', status);
        if(username) query = query.eq('username', username);
        const { data, error } = await query;
        if(error) return []; // safe fallback
        return data || [];
    },
    submitProfileUpdateRequest: async (request: any) => {
        const { data, error } = await supabase.from('ProfileUpdateRequests').insert([request]).select();
        if(error) throw new Error(error.message);
        return data?.[0];
    },
    changePassword: async (request: any) => {
        return fetch(`${API_URL}/users/change-password`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request)
        }).then(r => r.json());
    },
    updateProfileRequestStatus: async (requestId: string, status: string, approverUsername: string, notes?: string) => {
        const { data, error } = await supabase.from('ProfileUpdateRequests').update({ status, approverUsername, approverNotes: notes }).eq('id', requestId).select();
        if(error) throw new Error(error.message);
        return data?.[0];
    },

};
