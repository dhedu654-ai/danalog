import React, { useState, useMemo } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart
} from 'recharts';
import {
    ShoppingBag, Ticket, Truck, Banknote, Activity, Clock,
    TrendingUp, AlertTriangle, Users
} from 'lucide-react';
import { TransportTicket } from '../../../types';
import { KPICard } from '../shared/KPICard';
import { AlertPanel, DashboardAlert } from '../shared/AlertPanel';
import { DashboardFilters, createDefaultFilters, FilterState } from '../shared/DashboardFilters';
import {
    generateDailyMetrics, generateDashboardSummary, generateAlerts
} from '../shared/mockData';

interface Props {
    tickets: TransportTicket[];
    onNavigate?: (tab: string, focusId?: string) => void;
}

export const CompanyOverviewDashboard: React.FC<Props> = ({ tickets, onNavigate }) => {
    const [filters, setFilters] = useState<FilterState>(createDefaultFilters('this_month'));

    const summary = useMemo(() => generateDashboardSummary(tickets), [tickets]);
    const dailyMetrics = useMemo(() => generateDailyMetrics(tickets, 30), [tickets]);
    const rawAlerts = useMemo(() => generateAlerts(tickets), [tickets]);

    // Unique filter options
    const customers = useMemo(() => {
        const set = new Set(tickets.map(t => t.customerCode).filter(Boolean));
        return [...set].map(c => ({ id: c, name: c }));
    }, [tickets]);
    const routes = useMemo(() => {
        const set = new Set(tickets.map(t => t.route).filter(Boolean));
        return [...set].map(r => ({ id: r, name: r.length > 40 ? r.slice(0, 40) + '...' : r }));
    }, [tickets]);

    const getTrend = (curr: number, prev: number): { trend: 'up' | 'down' | 'flat'; value: string } => {
        if (prev === 0) return { trend: 'flat', value: '' };
        const pct = Math.round(((curr - prev) / prev) * 100);
        return { trend: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat', value: `${Math.abs(pct)}%` };
    };

    const alerts: DashboardAlert[] = rawAlerts.map(a => ({
        id: a.id,
        level: a.severity,
        title: a.type === 'dispatch_sla'
            ? `Phiếu ${a.id.slice(-8)} — ${a.remainingMinutes}p còn lại`
            : a.route,
        description: a.type === 'dispatch_sla' ? a.route : undefined,
        onClick: onNavigate ? () => onNavigate('dispatch_board', a.id) : undefined,
    }));

    return (
        <div className="space-y-5">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Tổng Quan Công Ty</h2>
                <p className="text-sm text-slate-500 mt-0.5">Giám sát toàn bộ hoạt động vận hành</p>
            </div>

            {/* Filters */}
            <DashboardFilters
                filters={filters}
                onFilterChange={setFilters}
                showCustomer
                showRoute
                customers={customers}
                routes={routes}
            />

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                <KPICard
                    label="Đơn hàng"
                    value={summary.totalOrders}
                    icon={<ShoppingBag size={20} />}
                    color="blue"
                    trend={getTrend(summary.totalOrders, summary.prev.totalOrders).trend}
                    trendValue={getTrend(summary.totalOrders, summary.prev.totalOrders).value}
                    trendLabel="vs kỳ trước"
                    onClick={onNavigate ? () => onNavigate('order_list') : undefined}
                />
                <KPICard
                    label="Phiếu vận chuyển"
                    value={summary.totalTickets}
                    icon={<Ticket size={20} />}
                    color="indigo"
                    trend={getTrend(summary.totalTickets, summary.prev.totalTickets).trend}
                    trendValue={getTrend(summary.totalTickets, summary.prev.totalTickets).value}
                    trendLabel="vs kỳ trước"
                    onClick={onNavigate ? () => onNavigate('cs_check') : undefined}
                />
                <KPICard
                    label="Chuyến hoàn thành"
                    value={summary.completedTrips}
                    icon={<Truck size={20} />}
                    color="emerald"
                    trend={getTrend(summary.completedTrips, summary.prev.completedTrips).trend}
                    trendValue={getTrend(summary.completedTrips, summary.prev.completedTrips).value}
                    trendLabel="vs kỳ trước"
                    onClick={onNavigate ? () => onNavigate('dispatch_tracking') : undefined}
                />
                <KPICard
                    label="Doanh thu"
                    value={summary.totalRevenue}
                    format="currency"
                    unit="đ"
                    icon={<Banknote size={20} />}
                    color="amber"
                    trend={getTrend(summary.totalRevenue, summary.prev.totalRevenue).trend}
                    trendValue={getTrend(summary.totalRevenue, summary.prev.totalRevenue).value}
                    trendLabel="vs kỳ trước"
                    onClick={onNavigate ? () => onNavigate('revenue_customer') : undefined}
                />
                <KPICard
                    label="Công suất xe"
                    value={`${summary.fleetUtilization}%`}
                    icon={<Activity size={20} />}
                    color="cyan"
                    onClick={onNavigate ? () => onNavigate('db_fleet') : undefined}
                />
                <KPICard
                    label="Dispatch SLA"
                    value={`${summary.dispatchSLA}%`}
                    icon={<Clock size={20} />}
                    color={summary.dispatchSLA < 90 ? 'red' : 'emerald'}
                    trend={getTrend(summary.dispatchSLA, summary.prev.dispatchSLA).trend}
                    trendValue={getTrend(summary.dispatchSLA, summary.prev.dispatchSLA).value}
                    onClick={onNavigate ? () => onNavigate('db_dispatch_mgr') : undefined}
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Trips Trend */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                        <TrendingUp size={16} className="text-blue-500" />
                        Số chuyến / ngày
                    </h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={dailyMetrics}>
                            <defs>
                                <linearGradient id="tripGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => v.slice(5)} />
                            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                            <Tooltip
                                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                                labelFormatter={v => `Ngày ${v}`}
                            />
                            <Area type="monotone" dataKey="trips" stroke="#3b82f6" strokeWidth={2} fill="url(#tripGrad)" name="Chuyến" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Revenue Trend */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                        <Banknote size={16} className="text-emerald-500" />
                        Doanh thu / ngày
                    </h3>
                    <ResponsiveContainer width="100%" height={200}>
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

                {/* SLA Trend */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                        <Clock size={16} className="text-indigo-500" />
                        SLA Compliance
                    </h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={dailyMetrics}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => v.slice(5)} />
                            <YAxis domain={[60, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `${v}%`} />
                            <Tooltip
                                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                                formatter={(v: number) => [`${v}%`, 'SLA']}
                            />
                            <Line type="monotone" dataKey="slaCompliance" stroke="#6366f1" strokeWidth={2} dot={false} name="SLA" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Alerts */}
            <AlertPanel
                alerts={alerts}
                title="Rủi ro vận hành"
                onViewAll={onNavigate ? () => onNavigate('dispatch_board') : undefined}
            />
        </div>
    );
};
