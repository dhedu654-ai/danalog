import React, { createContext, useContext, useState, useEffect } from 'react';

import seedTickets from '../data/seedTickets.json';

const AppContext = createContext();

export function AppProvider({ children }) {
    // Load initial state from localStorage or use defaults (seed data)
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [publishedSalaries, setPublishedSalaries] = useState([]);

    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('user');
        return saved ? JSON.parse(saved) : null;
    });

    const [lastLicensePlate, setLastLicensePlate] = useState(() => {
        return localStorage.getItem('lastLicensePlate') || '';
    });

    // key: "username_MM-YYYY", value: true/timestamp
    const fetchAllData = async () => {
        try {
            setLoading(true);
            const [ticketsRes, salaryRes] = await Promise.all([
                fetch('/api/tickets').then(r => r.json()),
                fetch('/api/published-salaries').then(r => r.json())
            ]);
            setTickets(ticketsRes || []);
            setPublishedSalaries(salaryRes || []);
        } catch (err) {
            console.error("Failed to fetch data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    const publishSalary = (username, monthStr) => {
        const key = `${username}_${monthStr}`;
        setPublishedSalaries(prev => {
            const newState = { ...prev, [key]: new Date().toISOString() };
            localStorage.setItem('publishedSalaries', JSON.stringify(newState));
            return newState;
        });
    };

    const isSalaryPublished = (username, monthStr) => {
        // monthStr is typically YYYY-MM from our list logic
        const [year, month] = monthStr.split('-').map(Number);
        return publishedSalaries.some(ps =>
            ps.driverUsername === username &&
            ps.month === month &&
            ps.year === year
        );
    };

    const login = async (username, password) => {
        try {
            // driver-app backend usually runs on 3001
            // driver-app now proxies to 3000
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (response.ok) {
                const newUser = await response.json();
                setUser(newUser);
                localStorage.setItem('user', JSON.stringify(newUser));
                return true;
            }
        } catch (err) {
            console.error("Login failed:", err);
        }
        return false;
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('user');
    };

    const updateTicketStatus = async (id, status, note = '') => {
        const updates = {
            status: status,
            rejectionReason: note,
            approvedDate: status === 'approved' ? new Date().toISOString() : undefined // we can't easily get old date here without lookup, but API handles merge
        };

        // Optimistic
        setTickets(prev => prev.map(t =>
            t.id === id ? { ...t, ...updates, approvedDate: status === 'approved' ? updates.approvedDate : t.approvedDate } : t
        ));

        // API Call
        try {
            await fetch(`http://localhost:3001/api/tickets/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
        } catch (err) {
            console.error("Failed to update ticket status:", err);
        }
    };

    // Helper to calculate salary for a driver in a specific month
    const calculateDriverSalary = (driverUsername, monthStr) => { // monthStr format "MM-YYYY"
        if (!driverUsername) return null;

        const [month, year] = monthStr.split('-').map(Number);

        const relevantTickets = tickets.filter(t => {
            if (t.status !== 'approved') return false;
            // Assuming we pay based on the ticket creation date or approved date? 
            // Let's use ticket date (dep date) for simplicity as stored in 'date' field (YYYY-MM-DD)
            const ticketDate = new Date(t.date); // or t.startDate
            // Check if ticket owner is the driver
            // NOTE: CreateTicket currently doesn't save username. We need to fix that or assume current context.
            // For now, let's assume we will add 'createdBy' to ticket.
            return t.createdBy === driverUsername &&
                ticketDate.getMonth() + 1 === month &&
                ticketDate.getFullYear() === year;
        });

        const baseSalary = 8000000;
        const tripAllowance = relevantTickets.reduce((sum, t) => sum + (Number(t.price) || 0), 0);
        // Deduct insurance? Fixed for now
        const deductions = 500000;

        return {
            month: monthStr,
            base: baseSalary,
            tripAllowance,
            deductions,
            total: baseSalary + tripAllowance - deductions,
            details: [
                { name: 'Lương cơ bản', amount: baseSalary },
                { name: 'Phụ cấp chuyến', amount: tripAllowance },
                { name: 'Trừ bảo hiểm', amount: -deductions }
            ],
            tripCount: relevantTickets.length,
            ticketIds: relevantTickets.map(t => t.id)
        };
    };

    // LocalStorage sync removed for tickets (handled by API)

    useEffect(() => {
        if (lastLicensePlate) {
            localStorage.setItem('lastLicensePlate', lastLicensePlate);
        }
    }, [lastLicensePlate]);

    const addTicket = async (ticket) => {
        // Optimistic update
        const newTicket = {
            ...ticket,
            id: Date.now().toString(),
            createdAt: new Date().toISOString(),
            status: ticket.status || 'sent',
            createdBy: user ? user.username : 'unknown'
        };
        setTickets(prev => [newTicket, ...prev]);

        if (ticket.licensePlate) {
            setLastLicensePlate(ticket.licensePlate);
        }

        // API Call
        try {
            await fetch('/api/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTicket)
            });
            fetchAllData(); // Refresh list
        } catch (err) {
            console.error("Failed to save ticket:", err);
        }
    };

    const updateTicket = async (id, updates) => {
        setTickets(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));

        // API Call
        try {
            await fetch(`http://localhost:3001/api/tickets/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
        } catch (err) {
            console.error("Failed to update ticket:", err);
        }
    };

    const getTicketById = (id) => tickets.find(t => t.id === id);

    const [metadata, setMetadata] = useState(null);

    const fetchMetadata = async () => {
        try {
            const [customersRes, routesRes] = await Promise.all([
                fetch('http://localhost:3002/api/customers').then(r => r.json()),
                fetch('http://localhost:3002/api/route-configs').then(r => r.json())
            ]);

            const customers = customersRes || [];
            const routes = routesRes || [];

            // Map routes to customers
            const customersWithRoutes = customers.map(cust => {
                const custRoutes = routes.filter(r => 
                    r.status === 'ACTIVE' && (r.customer === cust.name || r.customer === cust.code)
                );
                return { ...cust, routes: custRoutes };
            });

            // Handle "General" or multi-customer routes if any? 
            // The mock data had 'cust_general' with 'Nhiều khách hàng'.
            // If they exist in DB, they should be covered.

            // Handle Manual hardcoded customers from mock if missing in DB?
            // For now, trust DB.

            setMetadata({
                customers: customersWithRoutes,
                overnightRates: {
                    in_city: 150000,
                    out_city: 200000
                }
            });
        } catch (err) {
            console.error("Failed to fetch metadata:", err);
            // Fallback to minimal or keep null
            setMetadata({
                customers: [],
                overnightRates: {
                    in_city: 150000,
                    out_city: 200000
                }
            });
        }
    };

    useEffect(() => {
        fetchAllData();
        fetchMetadata();
    }, []);

    // Alias for compatibility
    const mockMetadata = metadata;

    // Get unique drivers list for filtering
    const getDriversList = () => {
        const drivers = new Set(tickets.map(t => t.createdBy).filter(Boolean));
        return Array.from(drivers);
    };

    return (
        <AppContext.Provider value={{
            tickets,
            addTicket,
            updateTicket,
            getTicketById,
            lastLicensePlate,
            mockMetadata,
            user,
            login,
            logout,
            updateTicketStatus,
            calculateDriverSalary,
            getDriversList,
            publishedSalaries,
            publishSalary,
            isSalaryPublished
        }}>
            {children}
        </AppContext.Provider>
    );
}

export function useAppContext() {
    return useContext(AppContext);
}
