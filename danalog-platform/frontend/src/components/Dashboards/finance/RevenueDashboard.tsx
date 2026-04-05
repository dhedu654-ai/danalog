import React, { useState, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { Banknote, CheckCircle, Clock, Users, Truck, TrendingUp } from 'lucide-react';
import { TransportTicket } from '../../../types';
import { KPICard } from '../shared/KPICard';
import { AlertPanel, DashboardAlert } from '../shared/AlertPanel';
import { DashboardFilters, createDefaultFilters, FilterState } from '../shared/DashboardFilters';
import { DataTable, DataTableColumn } from '../shared/DataTable';
import { generateCustomerRevenue, CustomerRevenue, generateDailyMetrics, generateDriverRevenue, DriverRevenueStat } from '../shared/mockData';

interface Props {
    tickets: TransportTicket[];
    onNavigate?: (tab: string, focusId?: string) => void;
}

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#ef4444', '#64748b'];

export const RevenueDashboard: React.FC<Props> = ({ tickets, onNavigate }) => {
    const [filters, setFilters] = useState<FilterState>(createDefaultFilters('this_month'));
    const [view, setView] = useState<'customer' | 'driver'>('customer');

    const dailyMetrics = useMemo(() => generateDailyMetrics(tickets, 30), [tickets]);
    const customerRevenue = useMemo(() => generateCustomerRevenue(tickets), [tickets]);
    const driverRevenue = useMemo(() => generateDriverRevenue(tickets), [tickets]);

    const totalRevenue = customerRevenue.reduce((s, c) => s + c.revenue, 0);
    const approvedTickets = tickets.filter(t => t.status === 'APPROVED').length;
    const pendingTickets = tickets.filter(t => t.status !== 'APPROVED').length;

    const customers = useMemo(() => {
        const set = new Set(tickets.map(t => t.customerCode).filter(Boolean));
        return [...set].map(c => ({ id: c, name: c }));
    }, [tickets]);

    // Alerts: large pending tickets
    const alerts: DashboardAlert[] = tickets
        .filter(t => t.status !== 'APPROVED' && (t.revenue || 0) > 3_000_000)
        .slice(0, 5)
        .map(t => ({
            id: t.id,
            level: 'warning' as const,
            title: `Phiếu #${t.id.slice(-8)} — ${((t.revenue || 0) / 1_000_000).toFixed(1)}M đ chưa duyệt`,
            description: `${t.customerCode} — ${t.route?.slice(0, 30)}`,
            onClick: onNavigate ? () => onNavigate('cs_check', t.id) : undefined,
        }));

    // Revenue pie data (top 6 customers)
    const revenuePieData = customerRevenue.slice(0, 6).map(c => ({
        name: c.customerCode,
        value: c.revenue,
    }));

    const customerColumns: DataTableColumn<CustomerRevenue>[] = [
        {
            key: 'customerCode', label: 'Khách hàng',
            render: (v) => <span className="font-bold text-slate-800">{v}</span>,
        },
        { key: 'trips', label: 'Chuyến', align: 'right', format: 'number', sortable: true },
        { key: 'revenue', label: 'Doanh thu', align: 'right', format: 'currency', sortable: true },
        { key: 'approvedTickets', label: 'Đã duyệt', align: 'right', format: 'number' },
        {
            key: 'pendingTickets', label: 'Chờ duyệt', align: 'right',
            render: (v) => <span className={`font-medium ${v > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{v}</span>,
        },
    ];

    const driverColumns: DataTableColumn<DriverRevenueStat>[] = [
        {
            key: 'driverName', label: 'Lái xe',
            render: (v) => <span className="font-bold text-slate-800">{v}</span>,
        },
        { key: 'licensePlate', label: 'Biển số', render: (v) => <span className="font-mono text-blue-600">{v}</span> },
        { key: 'trips', label: 'Chuyến', align: 'right', format: 'number', sortable: true },
        { key: 'revenue', label: 'Doanh thu', align: 'right', format: 'currency', sortable: true },
        { key: 'salary', label: 'Lương', align: 'right', format: 'currency' },
    ];

    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Revenue Dashboard</h2>
                <p className="text-sm text-slate-500 mt-0.5">Phân tích doanh thu theo khách hàng & lái xe</p>
            </div>

            <DashboardFilters
                filters={filters}
                onFilterChange={setFilters}
                showCustomer
                customers={customers}
            />

            {/* KPI Cards */}
            <div className="grid grid-cols-3 gap-3">
                <KPICard label="Tổng doanh thu" value={totalRevenue} format="currency" unit="đ" icon={<Banknote size={20} />} color="emerald" onClick={onNavigate ? () => onNavigate('revenue_customer') : undefined} />
                <KPICard label="Phiếu đã duyệt" value={approvedTickets} icon={<CheckCircle size={20} />} color="blue" />
                <KPICard label="Phiếu chờ duyệt" value={pendingTickets} icon={<Clock size={20} />} color={pendingTickets > 10 ? 'red' : 'amber'} onClick={onNavigate ? () => onNavigate('cs_check') : undefined} />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Revenue Trend */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 lg:col-span-2">
                    <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                        <TrendingUp size={16} className="text-emerald-500" />
                        Doanh thu / ngày
                    </h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={dailyMetrics}>
                            <defs>
                                <linearGradient id="revGrad2" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => v.slice(5)} />
                            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `${(v / 1_000_000).toFixed(0)}M`} />
                            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} formatter={(v: number) => [`${(v / 1_000_000).toFixed(1)}M đ`, 'Doanh thu']} />
                            <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fill="url(#revGrad2)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Revenue by Customer Pie */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                        <Users size={16} className="text-blue-500" />
                        Tỷ trọng doanh thu
                    </h3>
                    <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                            <Pie data={revenuePieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={2}>
                                {revenuePieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} formatter={(v: number) => [`${(v / 1_000_000).toFixed(1)}M`, 'Doanh thu']} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap justify-center gap-2 mt-1">
                        {revenuePieData.map((d, i) => (
                            <div key={d.name} className="flex items-center gap-1 text-[10px]">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                                <span className="text-slate-500">{d.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* View Toggle + Table */}
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <button onClick={() => setView('customer')} className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${view === 'customer' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                        Theo Khách hàng
                    </button>
                    <button onClick={() => setView('driver')} className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${view === 'driver' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                        Theo Lái xe
                    </button>
                </div>
                {view === 'customer' ? (
                    <DataTable
                        title="Doanh thu theo Khách hàng"
                        titleIcon={<Users size={16} className="text-blue-500" />}
                        columns={customerColumns}
                        data={customerRevenue}
                        onRowClick={onNavigate ? () => onNavigate('revenue_customer') : undefined}
                    />
                ) : (
                    <DataTable
                        title="Doanh thu theo Lái xe"
                        titleIcon={<Truck size={16} className="text-emerald-500" />}
                        columns={driverColumns}
                        data={driverRevenue}
                        onRowClick={onNavigate ? () => onNavigate('revenue_driver') : undefined}
                    />
                )}
            </div>

            {/* Alerts */}
            <AlertPanel alerts={alerts} title="Phiếu lớn chờ duyệt" />
        </div>
    );
};
