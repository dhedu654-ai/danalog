import React, { useState, useMemo } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar
} from 'recharts';
import {
    Activity, Clock, Users, Truck, AlertTriangle, TrendingUp,
    CheckCircle, Zap
} from 'lucide-react';
import { TransportTicket } from '../../../types';
import { KPICard } from '../shared/KPICard';
import { AlertPanel, DashboardAlert } from '../shared/AlertPanel';
import { DashboardFilters, createDefaultFilters, FilterState } from '../shared/DashboardFilters';
import { generateDailyMetrics, generateDashboardSummary, generateAlerts, generateCSStats } from '../shared/mockData';

interface Props {
    tickets: TransportTicket[];
    onNavigate?: (tab: string, focusId?: string) => void;
}

export const OperationsDashboard: React.FC<Props> = ({ tickets, onNavigate }) => {
    const [filters, setFilters] = useState<FilterState>(createDefaultFilters('this_week'));

    const summary = useMemo(() => generateDashboardSummary(tickets), [tickets]);
    const dailyMetrics = useMemo(() => generateDailyMetrics(tickets, 14), [tickets]);
    const rawAlerts = useMemo(() => generateAlerts(tickets), [tickets]);
    const csStats = useMemo(() => generateCSStats(tickets), [tickets]);

    // Bottleneck analysis
    const dispatchBottleneck = summary.assignSLA < 85;
    const csBottleneck = summary.reviewSLA < 80;
    const driverBottleneck = summary.driverResponseSLA < 75;

    const alerts: DashboardAlert[] = [
        ...(dispatchBottleneck ? [{
            id: 'bottleneck-dispatch',
            level: 'warning' as const,
            title: `Dispatch đang chậm — SLA ${summary.assignSLA}%`,
            onClick: onNavigate ? () => onNavigate('db_dispatch_mgr') : undefined,
        }] : []),
        ...(csBottleneck ? [{
            id: 'bottleneck-cs',
            level: 'warning' as const,
            title: `CS backlog cao — Review SLA ${summary.reviewSLA}%`,
            onClick: onNavigate ? () => onNavigate('db_cs_mgr') : undefined,
        }] : []),
        ...(driverBottleneck ? [{
            id: 'bottleneck-driver',
            level: 'warning' as const,
            title: `Tài xế phản hồi chậm — ${summary.driverResponseSLA}%`,
            onClick: onNavigate ? () => onNavigate('dispatch_responses') : undefined,
        }] : []),
        ...rawAlerts.map(a => ({
            id: a.id,
            level: a.severity,
            title: a.type === 'dispatch_sla' ? `Phiếu #${a.id.slice(-8)} — ${a.remainingMinutes}p` : a.route,
            onClick: onNavigate ? () => onNavigate('dispatch_board', a.id) : undefined,
        })),
    ];

    // CS workload bar data
    const csBarData = csStats.map(cs => ({
        name: cs.name.split(' ').slice(-2).join(' '),
        reviewed: cs.ticketsReviewed,
        backlog: cs.backlog,
    }));

    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Operations Dashboard</h2>
                <p className="text-sm text-slate-500 mt-0.5">Phân tích vận hành — Bottleneck & SLA</p>
            </div>

            <DashboardFilters
                filters={filters}
                onFilterChange={setFilters}
                showCustomer
                showRoute
                customers={useMemo(() => {
                    const set = new Set(tickets.map(t => t.customerCode).filter(Boolean));
                    return [...set].map(c => ({ id: c, name: c }));
                }, [tickets])}
                routes={useMemo(() => {
                    const set = new Set(tickets.map(t => t.route).filter(Boolean));
                    return [...set].map(r => ({ id: r, name: r.length > 40 ? r.slice(0, 40) + '...' : r }));
                }, [tickets])}
            />

            {/* Bottleneck Indicators */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KPICard
                    label="Dispatch SLA"
                    value={`${summary.assignSLA}%`}
                    icon={<Zap size={20} />}
                    color={summary.assignSLA < 85 ? 'red' : 'emerald'}
                    onClick={onNavigate ? () => onNavigate('db_dispatch_mgr') : undefined}
                />
                <KPICard
                    label="CS Review SLA"
                    value={`${summary.reviewSLA}%`}
                    icon={<CheckCircle size={20} />}
                    color={summary.reviewSLA < 80 ? 'red' : 'emerald'}
                    onClick={onNavigate ? () => onNavigate('db_cs_mgr') : undefined}
                />
                <KPICard
                    label="Driver Response"
                    value={`${summary.driverResponseSLA}%`}
                    icon={<Users size={20} />}
                    color={summary.driverResponseSLA < 75 ? 'red' : 'blue'}
                    onClick={onNavigate ? () => onNavigate('dispatch_responses') : undefined}
                />
                <KPICard
                    label="Fleet Utilization"
                    value={`${summary.fleetUtilization}%`}
                    icon={<Truck size={20} />}
                    color="cyan"
                    onClick={onNavigate ? () => onNavigate('db_fleet') : undefined}
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Multi-line SLA comparison */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                        <Activity size={16} className="text-indigo-500" />
                        SLA Comparison (Dispatch vs CS vs Driver)
                    </h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={dailyMetrics}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => v.slice(5)} />
                            <YAxis domain={[50, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} unit="%" />
                            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                            <Line type="monotone" dataKey="slaCompliance" stroke="#6366f1" strokeWidth={2} dot={false} name="Dispatch SLA" />
                            <Line type="monotone" dataKey="driverResponseSLA" stroke="#3b82f6" strokeWidth={2} dot={false} name="Driver Response" />
                            <Line type="monotone" dataKey="avgReviewTime" stroke="#10b981" strokeWidth={2} dot={false} name="CS Speed" />
                        </LineChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-4 mt-2 text-[10px]">
                        <span className="flex items-center gap-1"><div className="w-3 h-0.5 bg-indigo-500 rounded" /> Dispatch</span>
                        <span className="flex items-center gap-1"><div className="w-3 h-0.5 bg-blue-500 rounded" /> Driver</span>
                        <span className="flex items-center gap-1"><div className="w-3 h-0.5 bg-emerald-500 rounded" /> CS</span>
                    </div>
                </div>

                {/* CS Workload Distribution */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                        <Users size={16} className="text-emerald-500" />
                        CS Workload Distribution
                    </h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={csBarData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                            <Bar dataKey="reviewed" fill="#10b981" radius={[4, 4, 0, 0]} name="Đã duyệt" />
                            <Bar dataKey="backlog" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Backlog" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Alerts - Bottleneck Analysis */}
            <AlertPanel alerts={alerts} title="Phân tích Bottleneck & Rủi ro" />
        </div>
    );
};
