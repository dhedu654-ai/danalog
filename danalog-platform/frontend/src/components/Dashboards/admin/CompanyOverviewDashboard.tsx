import React, { useState, useMemo } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, BarChart, Bar
} from 'recharts';
import {
    ShoppingBag, Ticket, Truck, Banknote, Activity, Clock,
    TrendingUp, AlertTriangle, Users
} from 'lucide-react';
import { TransportTicket } from '../../../types';
import { KPICard } from '../shared/KPICard';
import { DashboardFilters, createDefaultFilters, FilterState } from '../shared/DashboardFilters';
import { format, subDays, isSameDay } from 'date-fns';

interface Props {
    tickets: TransportTicket[];
    onNavigate?: (tab: string, focusId?: string) => void;
}

export const CompanyOverviewDashboard: React.FC<Props> = ({ tickets, onNavigate }) => {
    const [filters, setFilters] = useState<FilterState>(createDefaultFilters('this_month'));

    // Compute unique filters
    const customers = useMemo(() => {
        const set = new Set(tickets.map(t => t.customerCode).filter(Boolean));
        return [...set].map(c => ({ id: c, name: c }));
    }, [tickets]);
    
    const routes = useMemo(() => {
        const set = new Set(tickets.map(t => t.route).filter(Boolean));
        return [...set].map(r => ({ id: r, name: r.length > 40 ? r.slice(0, 40) + '...' : r }));
    }, [tickets]);

    // Apply basic filters here if needed. For now, use all tickets as 'real data'
    const filteredTickets = useMemo(() => {
        let result = tickets;
        if (filters.customerCode) {
            result = result.filter(t => t.customerCode === filters.customerCode);
        }
        if (filters.route) {
            result = result.filter(t => t.route === filters.route);
        }
        return result;
    }, [tickets, filters]);

    // Compute Summary Real Data
    const summary = useMemo(() => {
        const completed = filteredTickets.filter(t => t.dispatchStatus === 'COMPLETED' || t.status === 'APPROVED' || t.status === 'DONE');
        const uniqueOrders = new Set(filteredTickets.map(t => t.orderId || t.orderCode || t.id)).size;
        const totalRevenue = filteredTickets.reduce((s, t) => s + (t.revenue || 0), 0);
        
        const activeVehicles = new Set(filteredTickets.map(t => t.licensePlate).filter(Boolean)).size;
        
        return {
            totalOrders: uniqueOrders,
            totalTickets: filteredTickets.length,
            completedTrips: completed.length,
            totalRevenue,
            fleetActive: activeVehicles,
        };
    }, [filteredTickets]);

    // Compute Daily Real Data (Last 14 days for clearer charts)
    const dailyMetrics = useMemo(() => {
        const metrics = [];
        const now = new Date();
        for (let i = 13; i >= 0; i--) {
            const targetDate = subDays(now, i);
            const dateStr = format(targetDate, 'yyyy-MM-dd');
            
            const dayTickets = filteredTickets.filter(t => {
                const tDate = t.dateEnd || t.dateStart;
                if (!tDate) return false;
                return tDate.startsWith(dateStr);
            });

            const dayRevenue = dayTickets.reduce((s, t) => s + (t.revenue || 0), 0);

            metrics.push({
                date: dateStr,
                trips: dayTickets.length,
                revenue: dayRevenue,
            });
        }
        return metrics;
    }, [filteredTickets]);

    return (
        <div className="space-y-5">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Tổng Quan Công Ty</h2>
                <p className="text-sm text-slate-500 mt-0.5">Giám sát toàn bộ hoạt động vận hành (Số liệu thực tế)</p>
            </div>

            {/* Filters */}
            <DashboardFilters
                filters={filters}
                onFilterChange={setFilters}
                showCustomer
                showRoute
                showDatePresets={false}
                showComparison={false}
                customers={customers}
                routes={routes}
            />

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <KPICard
                    label="Tổng Đơn hàng"
                    value={summary.totalOrders}
                    icon={<ShoppingBag size={20} />}
                    color="blue"
                    onClick={onNavigate ? () => onNavigate('order_list') : undefined}
                />
                <KPICard
                    label="Phiếu vận chuyển"
                    value={summary.totalTickets}
                    icon={<Ticket size={20} />}
                    color="indigo"
                    onClick={onNavigate ? () => onNavigate('cs_check') : undefined}
                />
                <KPICard
                    label="Chuyến hoàn thành"
                    value={summary.completedTrips}
                    icon={<Truck size={20} />}
                    color="emerald"
                    onClick={onNavigate ? () => onNavigate('dispatch_board') : undefined}
                />
                <KPICard
                    label="Doanh thu tạm tính"
                    value={summary.totalRevenue}
                    format="currency"
                    unit="đ"
                    icon={<Banknote size={20} />}
                    color="amber"
                    onClick={onNavigate ? () => onNavigate('revenue_customer') : undefined}
                />
                <KPICard
                    label="Xe hoạt động"
                    value={summary.fleetActive}
                    icon={<Activity size={20} />}
                    color="cyan"
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Revenue Trend */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                        <Banknote size={16} className="text-emerald-500" />
                        Doanh thu 14 ngày qua
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={dailyMetrics}>
                            <defs>
                                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => v.slice(5)} />
                            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `${(v / 1_000_000).toFixed(0)}M`} />
                            <Tooltip
                                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                                formatter={(v: number) => [`${(v / 1_000_000).toFixed(1)}M đ`, 'Doanh thu']}
                                labelFormatter={v => `Ngày ${v}`}
                            />
                            <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fill="url(#revGrad)" name="Doanh thu" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Trips Trend */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                        <TrendingUp size={16} className="text-blue-500" />
                        Số lượng chuyến / ngày
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={dailyMetrics}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => v.slice(5)} />
                            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                            <Tooltip
                                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                                labelFormatter={v => `Ngày ${v}`}
                            />
                            <Bar dataKey="trips" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Chuyến vận chuyển" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

