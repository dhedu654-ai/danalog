/**
 * Dashboard Mock Data Generator
 * Generates realistic analytics data from existing tickets for dashboard visualizations.
 */
import { TransportTicket } from '../../../types';

// ===== TIME SERIES DATA =====

export interface DailyMetric {
    date: string;
    trips: number;
    revenue: number;
    slaCompliance: number;
    avgAssignTime: number;
    autoAssignRate: number;
    driverResponseSLA: number;
    ticketsReviewed: number;
    avgReviewTime: number;
    fuelCost: number;
}

export function generateDailyMetrics(tickets: TransportTicket[], days: number = 30): DailyMetric[] {
    const metrics: DailyMetric[] = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];

        // Filter tickets for this day
        const dayTickets = tickets.filter(t => {
            const td = t.dateStart || t.dateEnd;
            return td && td.startsWith(dateStr);
        });

        const baseTrips = dayTickets.length || Math.floor(Math.random() * 12 + 5);
        const baseRevenue = dayTickets.reduce((s, t) => s + (t.revenue || 0), 0) || (baseTrips * (1_500_000 + Math.random() * 500_000));
        
        metrics.push({
            date: dateStr,
            trips: baseTrips,
            revenue: Math.round(baseRevenue),
            slaCompliance: Math.min(100, Math.round(85 + Math.random() * 15)),
            avgAssignTime: Math.round(8 + Math.random() * 12),
            autoAssignRate: Math.round(20 + Math.random() * 30),
            driverResponseSLA: Math.min(100, Math.round(80 + Math.random() * 20)),
            ticketsReviewed: Math.floor(baseTrips * (0.7 + Math.random() * 0.3)),
            avgReviewTime: Math.round(15 + Math.random() * 25),
            fuelCost: Math.round(baseTrips * (150_000 + Math.random() * 100_000)),
        });
    }
    return metrics;
}

// ===== FLEET ANALYTICS =====

export interface VehicleStats {
    vehicleId: string;
    licensePlate: string;
    trips: number;
    revenue: number;
    idleHours: number;
    fuelCost: number;
    fuelLiters: number;
    utilization: number;
    driverName: string;
}

export function generateFleetStats(tickets: TransportTicket[]): VehicleStats[] {
    const vehicleMap = new Map<string, VehicleStats>();

    tickets.forEach(t => {
        const plate = t.licensePlate;
        if (!plate) return;
        if (!vehicleMap.has(plate)) {
            vehicleMap.set(plate, {
                vehicleId: `V-${plate}`,
                licensePlate: plate,
                trips: 0,
                revenue: 0,
                idleHours: Math.round(Math.random() * 6 * 10) / 10,
                fuelCost: 0,
                fuelLiters: 0,
                utilization: 0,
                driverName: t.driverName || 'N/A',
            });
        }
        const v = vehicleMap.get(plate)!;
        v.trips += 1;
        v.revenue += t.revenue || 0;
        v.fuelLiters += Math.round(35 + Math.random() * 20);
        v.fuelCost += Math.round(v.fuelLiters * 21000);
    });

    // Calculate utilization (trips / max possible trips)
    vehicleMap.forEach(v => {
        v.utilization = Math.min(100, Math.round((v.trips / Math.max(1, 30)) * 100));
    });

    return Array.from(vehicleMap.values()).sort((a, b) => b.trips - a.trips);
}

// ===== CS ANALYTICS =====

export interface CSPersonStats {
    name: string;
    ticketsReviewed: number;
    reviewSLA: number;
    avgReviewTime: number;
    backlog: number;
    exceptionRate: number;
    dataErrorRate: number;
}

const CS_NAMES = ['Nguyễn Thị Hoa', 'Trần Văn Minh', 'Lê Thị Thu', 'Phạm Văn Đức', 'Hoàng Thị Mai'];

export function generateCSStats(tickets: TransportTicket[]): CSPersonStats[] {
    return CS_NAMES.map(name => ({
        name,
        ticketsReviewed: Math.floor(30 + Math.random() * 90),
        reviewSLA: Math.min(100, Math.round(75 + Math.random() * 25)),
        avgReviewTime: Math.round(10 + Math.random() * 30),
        backlog: Math.floor(Math.random() * 15),
        exceptionRate: Math.round(Math.random() * 10),
        dataErrorRate: Math.round(Math.random() * 8),
    }));
}

// ===== DISPATCHER ANALYTICS =====

export interface DispatcherStats {
    name: string;
    ticketsAssigned: number;
    assignSLA: number;
    overrideRate: number;
    reassignRate: number;
    avgAssignTime: number;
}

const DISPATCHER_NAMES = ['Nguyễn Văn An', 'Trần Đức Thắng', 'Lê Minh Trí'];

export function generateDispatcherStats(): DispatcherStats[] {
    return DISPATCHER_NAMES.map(name => ({
        name,
        ticketsAssigned: Math.floor(40 + Math.random() * 60),
        assignSLA: Math.min(100, Math.round(80 + Math.random() * 20)),
        overrideRate: Math.round(Math.random() * 15),
        reassignRate: Math.round(Math.random() * 12),
        avgAssignTime: Math.round(5 + Math.random() * 15),
    }));
}

// ===== REVENUE ANALYTICS =====

export interface CustomerRevenue {
    customerCode: string;
    customerName: string;
    trips: number;
    revenue: number;
    pendingTickets: number;
    approvedTickets: number;
}

export function generateCustomerRevenue(tickets: TransportTicket[]): CustomerRevenue[] {
    const map = new Map<string, CustomerRevenue>();

    tickets.forEach(t => {
        const code = t.customerCode || 'OTHER';
        if (!map.has(code)) {
            map.set(code, {
                customerCode: code,
                customerName: code,
                trips: 0,
                revenue: 0,
                pendingTickets: 0,
                approvedTickets: 0,
            });
        }
        const c = map.get(code)!;
        c.trips += 1;
        c.revenue += t.revenue || 0;
        if (t.status === 'APPROVED') c.approvedTickets++;
        else c.pendingTickets++;
    });

    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
}

export interface DriverRevenueStat {
    driverName: string;
    licensePlate: string;
    trips: number;
    revenue: number;
    salary: number;
}

export function generateDriverRevenue(tickets: TransportTicket[]): DriverRevenueStat[] {
    const map = new Map<string, DriverRevenueStat>();

    tickets.forEach(t => {
        const name = t.driverName || 'N/A';
        if (!map.has(name)) {
            map.set(name, {
                driverName: name,
                licensePlate: t.licensePlate || '',
                trips: 0,
                revenue: 0,
                salary: 0,
            });
        }
        const d = map.get(name)!;
        d.trips += 1;
        d.revenue += t.revenue || 0;
        d.salary += t.driverSalary || 0;
    });

    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
}

// ===== FUEL ANALYTICS =====

export interface FuelVehicleStat {
    licensePlate: string;
    fuelLiters: number;
    fuelCost: number;
    trips: number;
    avgLitersPerTrip: number;
    variance: number; // % variance from quota
}

export function generateFuelStats(tickets: TransportTicket[]): FuelVehicleStat[] {
    const map = new Map<string, FuelVehicleStat>();

    tickets.forEach(t => {
        const plate = t.licensePlate;
        if (!plate) return;
        if (!map.has(plate)) {
            map.set(plate, {
                licensePlate: plate,
                fuelLiters: 0,
                fuelCost: 0,
                trips: 0,
                avgLitersPerTrip: 0,
                variance: 0,
            });
        }
        const f = map.get(plate)!;
        f.trips += 1;
        const liters = Math.round(30 + Math.random() * 25);
        f.fuelLiters += liters;
        f.fuelCost += Math.round(liters * 21500);
    });

    map.forEach(f => {
        f.avgLitersPerTrip = f.trips > 0 ? Math.round(f.fuelLiters / f.trips * 10) / 10 : 0;
        f.variance = Math.round((Math.random() * 14) - 4); // -4% to +10%
    });

    return Array.from(map.values()).sort((a, b) => b.fuelCost - a.fuelCost);
}

// ===== DATA QUALITY STATS =====

export interface DataQualityStats {
    missingPhotos: number;
    missingContainerInfo: number;
    incorrectData: number;
    exceptionApprovals: number;
    errorsByCustomer: { customer: string; errors: number }[];
    errorsByRoute: { route: string; errors: number }[];
}

export function generateDataQualityStats(tickets: TransportTicket[]): DataQualityStats {
    const uniqueCustomers = [...new Set(tickets.map(t => t.customerCode))].filter(Boolean);
    const uniqueRoutes = [...new Set(tickets.map(t => t.route))].filter(Boolean);

    return {
        missingPhotos: Math.floor(Math.random() * 8),
        missingContainerInfo: Math.floor(Math.random() * 5),
        incorrectData: Math.floor(Math.random() * 3),
        exceptionApprovals: Math.floor(Math.random() * 6),
        errorsByCustomer: uniqueCustomers.slice(0, 6).map(c => ({
            customer: c,
            errors: Math.floor(Math.random() * 8),
        })),
        errorsByRoute: uniqueRoutes.slice(0, 6).map(r => ({
            route: r.length > 30 ? r.slice(0, 30) + '...' : r,
            errors: Math.floor(Math.random() * 6),
        })),
    };
}

// ===== AGGREGATE SUMMARY =====

export interface DashboardSummary {
    totalOrders: number;
    totalTickets: number;
    completedTrips: number;
    totalRevenue: number;
    fleetUtilization: number;
    dispatchSLA: number;
    // Dispatch specific
    assignSLA: number;
    autoAssignRate: number;
    driverResponseSLA: number;
    reassignRate: number;
    continuityRate: number;
    avgAssignTime: number;
    // CS specific
    ticketsReviewed: number;
    reviewSLA: number;
    avgReviewTime: number;
    backlog: number;
    exceptionRate: number;
    dataErrorRate: number;
    // Revenue
    approvedRevenue: number;
    pendingRevenue: number;
    // Fuel
    totalFuelCost: number;
    // Previous period for comparison
    prev: {
        totalOrders: number;
        totalTickets: number;
        completedTrips: number;
        totalRevenue: number;
        dispatchSLA: number;
        reviewSLA: number;
        backlog: number;
    };
}

export function generateDashboardSummary(tickets: TransportTicket[]): DashboardSummary {
    const completed = tickets.filter(t => t.dispatchStatus === 'COMPLETED' || t.status === 'APPROVED');
    const uniqueOrders = new Set(tickets.map(t => t.orderId || t.id)).size;
    const totalRevenue = tickets.reduce((s, t) => s + (t.revenue || 0), 0);
    const approvedRevenue = completed.reduce((s, t) => s + (t.revenue || 0), 0);
    const uniqueVehicles = new Set(tickets.map(t => t.licensePlate).filter(Boolean));
    const activeVehicles = new Set(completed.map(t => t.licensePlate).filter(Boolean));

    return {
        totalOrders: uniqueOrders,
        totalTickets: tickets.length,
        completedTrips: completed.length,
        totalRevenue,
        fleetUtilization: uniqueVehicles.size > 0 ? Math.round((activeVehicles.size / uniqueVehicles.size) * 100) : 0,
        dispatchSLA: Math.min(100, Math.round(85 + Math.random() * 15)),
        assignSLA: Math.min(100, Math.round(82 + Math.random() * 18)),
        autoAssignRate: Math.round(25 + Math.random() * 25),
        driverResponseSLA: Math.min(100, Math.round(78 + Math.random() * 22)),
        reassignRate: Math.round(5 + Math.random() * 10),
        continuityRate: Math.round(30 + Math.random() * 30),
        avgAssignTime: Math.round(8 + Math.random() * 10),
        ticketsReviewed: completed.length,
        reviewSLA: Math.min(100, Math.round(80 + Math.random() * 20)),
        avgReviewTime: Math.round(15 + Math.random() * 20),
        backlog: Math.floor(Math.random() * 20),
        exceptionRate: Math.round(Math.random() * 8),
        dataErrorRate: Math.round(Math.random() * 6),
        approvedRevenue,
        pendingRevenue: totalRevenue - approvedRevenue,
        totalFuelCost: Math.round(tickets.length * 180_000),
        prev: {
            totalOrders: Math.round(uniqueOrders * (0.85 + Math.random() * 0.3)),
            totalTickets: Math.round(tickets.length * (0.85 + Math.random() * 0.3)),
            completedTrips: Math.round(completed.length * (0.85 + Math.random() * 0.3)),
            totalRevenue: Math.round(totalRevenue * (0.85 + Math.random() * 0.3)),
            dispatchSLA: Math.min(100, Math.round(82 + Math.random() * 18)),
            reviewSLA: Math.min(100, Math.round(78 + Math.random() * 22)),
            backlog: Math.floor(Math.random() * 25),
        },
    };
}

// ===== HELPER: Generate alerts from ticket data =====

export interface TicketAlertData {
    id: string;
    route: string;
    remainingMinutes: number;
    type: 'dispatch_sla' | 'review_sla' | 'driver_reject' | 'vehicle_idle' | 'missing_data' | 'fuel_variance';
    severity: 'critical' | 'warning' | 'info';
}

export function generateAlerts(tickets: TransportTicket[]): TicketAlertData[] {
    const alerts: TicketAlertData[] = [];

    // Dispatch SLA alerts
    const pendingDispatch = tickets.filter(t =>
        t.dispatchStatus === 'WAITING_DISPATCH' || t.dispatchStatus === 'RECOMMENDED'
    );
    pendingDispatch.slice(0, 3).forEach(t => {
        const rem = Math.floor(Math.random() * 40);
        alerts.push({
            id: t.id,
            route: t.route?.slice(0, 40) || 'N/A',
            remainingMinutes: rem,
            type: 'dispatch_sla',
            severity: rem < 10 ? 'critical' : rem < 20 ? 'warning' : 'info',
        });
    });

    // Vehicle idle
    const uniquePlates = [...new Set(tickets.map(t => t.licensePlate).filter(Boolean))];
    uniquePlates.slice(0, 2).forEach(plate => {
        alerts.push({
            id: `idle-${plate}`,
            route: `Xe ${plate} nhàn rỗi > 2h`,
            remainingMinutes: 0,
            type: 'vehicle_idle',
            severity: 'warning',
        });
    });

    return alerts;
}
