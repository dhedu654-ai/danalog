import React, { useState, useMemo } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import {
    Clock, Zap, Users, RefreshCw, GitBranch, Timer,
    TrendingUp, AlertTriangle, Truck, ShieldCheck
} from 'lucide-react';
import { TransportTicket } from '../../../types';
import { KPICard } from '../shared/KPICard';
import { AlertPanel, DashboardAlert } from '../shared/AlertPanel';
import { DashboardFilters, createDefaultFilters, FilterState } from '../shared/DashboardFilters';
import { DataTable, DataTableColumn } from '../shared/DataTable';
import {
    generateDailyMetrics, generateDashboardSummary, generateAlerts, generateFleetStats, VehicleStats
} from '../shared/mockData';

interface Props {
    tickets: TransportTicket[];
    onNavigate?: (tab: string, focusId?: string) => void;
}

export const DispatchManagerDashboard: React.FC<Props> = ({ tickets, onNavigate }) => {
    const [filters, setFilters] = useState<FilterState>(createDefaultFilters('this_month'));

    const summary = useMemo(() => generateDashboardSummary(tickets), [tickets]);
    const dailyMetrics = useMemo(() => generateDailyMetrics(tickets, 30), [tickets]);
    const fleetStats = useMemo(() => generateFleetStats(tickets), [tickets]);
    const rawAlerts = useMemo(() => generateAlerts(tickets), [tickets]);

    const vehicles = useMemo(() => {
        const set = new Set(tickets.map(t => t.licensePlate).filter(Boolean));
        return [...set].map(p => ({ id: p, plate: p }));
    }, [tickets]);

    const drivers = useMemo(() => {
        const set = new Set(tickets.map(t => t.driverName).filter(Boolean));
        return [...set].map(d => ({ id: d!, name: d! }));
    }, [tickets]);

    const alerts: DashboardAlert[] = [
        ...rawAlerts.filter(a => a.type === 'dispatch_sla').map(a => ({
            id: a.id,
            level: a.severity,
            title: `Phiếu #${a.id.slice(-8)} chưa assign — ${a.remainingMinutes}p còn lại`,
            description: a.route,
            onClick: onNavigate ? () => onNavigate('dispatch_board', a.id) : undefined,
        })),
        ...rawAlerts.filter(a => a.type === 'vehicle_idle').map(a => ({
            id: a.id,
            level: a.severity,
            title: a.route,
            onClick: onNavigate ? () => onNavigate('db_fleet') : undefined,
        })),
        // Driver reject alerts
        ...tickets.filter(t => t.dispatchStatus === 'DRIVER_REJECTED').slice(0, 2).map(t => ({
            id: `reject-${t.id}`,
            level: 'warning' as const,
            title: `Lái xe ${t.assignedDriverName || 'N/A'} từ chối phiếu #${t.id.slice(-8)}`,
            onClick: onNavigate ? () => onNavigate('dispatch_responses') : undefined,
        })),
    ];

    const fleetColumns: DataTableColumn<VehicleStats>[] = [
        {
            key: 'licensePlate', label: 'Biển số', width: '120px',
            render: (v) => <span className="font-mono font-bold text-blue-600">{v}</span>,
        },
        { key: 'driverName', label: 'Lái xe' },
        { key: 'trips', label: 'Chuyến', align: 'right', format: 'number', sortable: true },
        {
            key: 'idleHours', label: 'Nhàn rỗi', align: 'right',
            render: (v) => (
                <span className={`font-medium ${v > 3 ? 'text-red-600' : v > 1 ? 'text-amber-600' : 'text-slate-600'}`}>
                    {v}h
                </span>
            ),
        },
        { key: 'revenue', label: 'Doanh thu', align: 'right', format: 'currency', sortable: true },
        {
            key: 'utilization', label: 'Công suất', align: 'right',
            render: (v) => (
                <div className="flex items-center gap-2 justify-end">
                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${v > 70 ? 'bg-emerald-500' : v > 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${v}%` }} />
                    </div>
                    <span className="font-medium text-xs">{v}%</span>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Dispatch Manager Dashboard</h2>
                <p className="text-sm text-slate-500 mt-0.5">Hiệu suất điều vận & phản hồi lái xe</p>
            </div>

            <DashboardFilters
                filters={filters}
                onFilterChange={setFilters}
                showVehicle
                showDriver
                vehicles={vehicles}
                drivers={drivers}
            />

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                <KPICard
                    label="Assign SLA"
                    value={`${summary.assignSLA}%`}
                    icon={<ShieldCheck size={20} />}
                    color={summary.assignSLA < 85 ? 'red' : 'emerald'}
                    onClick={onNavigate ? () => onNavigate('dispatch_board') : undefined}
                />
                <KPICard
                    label="Auto Assign Rate"
                    value={`${summary.autoAssignRate}%`}
                    icon={<Zap size={20} />}
                    color="indigo"
                    onClick={onNavigate ? () => onNavigate('dispatch_logs') : undefined}
                />
                <KPICard
                    label="Driver Response SLA"
                    value={`${summary.driverResponseSLA}%`}
                    icon={<Users size={20} />}
                    color="blue"
                    onClick={onNavigate ? () => onNavigate('dispatch_responses') : undefined}
                />
                <KPICard
                    label="Reassign Rate"
                    value={`${summary.reassignRate}%`}
                    icon={<RefreshCw size={20} />}
                    color={summary.reassignRate > 15 ? 'red' : 'amber'}
                    onClick={onNavigate ? () => onNavigate('dispatch_logs') : undefined}
                />
                <KPICard
                    label="Continuity Rate"
                    value={`${summary.continuityRate}%`}
                    icon={<GitBranch size={20} />}
                    color="purple"
                />
                <KPICard
                    label="Thời gian assign TB"
                    value={summary.avgAssignTime}
                    unit="phút"
                    icon={<Timer size={20} />}
                    color="cyan"
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Assign Time Trend */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                        <Timer size={16} className="text-cyan-500" />
                        Thời gian Assign (trend)
                    </h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={dailyMetrics}>
                            <defs>
                                <linearGradient id="assignGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.15} />
                                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => v.slice(5)} />
                            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} unit="p" />
                            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} formatter={(v: number) => [`${v} phút`, 'Thời gian']} />
                            <Area type="monotone" dataKey="avgAssignTime" stroke="#06b6d4" strokeWidth={2} fill="url(#assignGrad)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Auto Assign Trend */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                        <Zap size={16} className="text-indigo-500" />
                        Auto Assign Rate (trend)
                    </h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={dailyMetrics}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => v.slice(5)} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} unit="%" />
                            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} formatter={(v: number) => [`${v}%`, 'Auto Assign']} />
                            <Line type="monotone" dataKey="autoAssignRate" stroke="#6366f1" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Driver Response Trend */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                        <Users size={16} className="text-blue-500" />
                        Driver Response SLA (trend)
                    </h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={dailyMetrics}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => v.slice(5)} />
                            <YAxis domain={[50, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} unit="%" />
                            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} formatter={(v: number) => [`${v}%`, 'Response SLA']} />
                            <Line type="monotone" dataKey="driverResponseSLA" stroke="#3b82f6" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Fleet Table */}
            <DataTable
                title="Hiệu suất đội xe"
                titleIcon={<Truck size={16} className="text-blue-500" />}
                columns={fleetColumns}
                data={fleetStats}
                maxRows={10}
                onRowClick={onNavigate ? () => onNavigate('db_fleet') : undefined}
            />

            {/* Alerts */}
            <AlertPanel
                alerts={alerts}
                title="Cảnh báo Dispatch"
                onViewAll={onNavigate ? () => onNavigate('dispatch_board') : undefined}
            />
        </div>
    );
};
