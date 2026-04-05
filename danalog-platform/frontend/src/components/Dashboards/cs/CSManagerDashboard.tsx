import React, { useState, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, AreaChart, Area
} from 'recharts';
import {
    CheckCircle, Clock, AlertCircle, Layers, ShieldAlert, FileWarning,
    Users, TrendingUp
} from 'lucide-react';
import { TransportTicket } from '../../../types';
import { KPICard } from '../shared/KPICard';
import { AlertPanel, DashboardAlert } from '../shared/AlertPanel';
import { DashboardFilters, createDefaultFilters, FilterState } from '../shared/DashboardFilters';
import { DataTable, DataTableColumn } from '../shared/DataTable';
import { generateCSStats, CSPersonStats, generateDashboardSummary, generateDailyMetrics } from '../shared/mockData';

interface Props {
    tickets: TransportTicket[];
    onNavigate?: (tab: string, focusId?: string) => void;
}

export const CSManagerDashboard: React.FC<Props> = ({ tickets, onNavigate }) => {
    const [filters, setFilters] = useState<FilterState>(createDefaultFilters('this_month'));

    const summary = useMemo(() => generateDashboardSummary(tickets), [tickets]);
    const csStats = useMemo(() => generateCSStats(tickets), [tickets]);
    const dailyMetrics = useMemo(() => generateDailyMetrics(tickets, 30), [tickets]);

    const customers = useMemo(() => {
        const set = new Set(tickets.map(t => t.customerCode).filter(Boolean));
        return [...set].map(c => ({ id: c, name: c }));
    }, [tickets]);

    // Tickets nearing review SLA
    const nearSLATickets = tickets
        .filter(t => t.dispatchStatus === 'COMPLETED' && t.status !== 'APPROVED')
        .slice(0, 5);

    const alerts: DashboardAlert[] = [
        ...nearSLATickets.map(t => ({
            id: `sla-${t.id}`,
            level: 'warning' as const,
            title: `Phiếu #${t.id.slice(-8)} sắp quá SLA duyệt`,
            description: `${t.route?.slice(0, 40)} — ${t.customerCode}`,
            onClick: onNavigate ? () => onNavigate('cs_check', t.id) : undefined,
        })),
        // Missing data tickets
        ...tickets.filter(t => !t.containerNo || !t.containerImage).slice(0, 3).map(t => ({
            id: `missing-${t.id}`,
            level: 'info' as const,
            title: `Phiếu #${t.id.slice(-8)} thiếu ${!t.containerNo ? 'số container' : 'hình ảnh'}`,
            onClick: onNavigate ? () => onNavigate('cs_check', t.id) : undefined,
        })),
    ];

    // CS workload bar chart data
    const csBarData = csStats.map(cs => ({
        name: cs.name.split(' ').slice(-2).join(' '),
        tickets: cs.ticketsReviewed,
        sla: cs.reviewSLA,
        backlog: cs.backlog,
    }));

    const csColumns: DataTableColumn<CSPersonStats>[] = [
        {
            key: 'name', label: 'Nhân viên CS',
            render: (v) => <span className="font-semibold text-slate-800">{v}</span>,
        },
        { key: 'ticketsReviewed', label: 'Đã duyệt', align: 'right', format: 'number' },
        {
            key: 'reviewSLA', label: 'SLA', align: 'right',
            render: (v) => (
                <span className={`font-bold ${v >= 90 ? 'text-emerald-600' : v >= 75 ? 'text-amber-600' : 'text-red-600'}`}>
                    {v}%
                </span>
            ),
        },
        { key: 'avgReviewTime', label: 'TB (phút)', align: 'right' },
        {
            key: 'backlog', label: 'Backlog', align: 'right',
            render: (v) => (
                <span className={`font-bold ${v > 10 ? 'text-red-600' : v > 5 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {v}
                </span>
            ),
        },
        { key: 'exceptionRate', label: 'Ngoại lệ', align: 'right', render: (v) => `${v}%` },
        { key: 'dataErrorRate', label: 'Lỗi DL', align: 'right', render: (v) => `${v}%` },
    ];

    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">CS Manager Dashboard</h2>
                <p className="text-sm text-slate-500 mt-0.5">Hiệu suất xử lý phiếu & chất lượng dữ liệu</p>
            </div>

            <DashboardFilters
                filters={filters}
                onFilterChange={setFilters}
                showCustomer
                customers={customers}
            />

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                <KPICard
                    label="Phiếu đã duyệt"
                    value={summary.ticketsReviewed}
                    icon={<CheckCircle size={20} />}
                    color="emerald"
                    onClick={onNavigate ? () => onNavigate('cs_check') : undefined}
                />
                <KPICard
                    label="Review SLA"
                    value={`${summary.reviewSLA}%`}
                    icon={<Clock size={20} />}
                    color={summary.reviewSLA < 80 ? 'red' : 'blue'}
                />
                <KPICard
                    label="Thời gian duyệt TB"
                    value={summary.avgReviewTime}
                    unit="phút"
                    icon={<TrendingUp size={20} />}
                    color="indigo"
                />
                <KPICard
                    label="Backlog"
                    value={summary.backlog}
                    unit="phiếu"
                    icon={<Layers size={20} />}
                    color={summary.backlog > 15 ? 'red' : 'amber'}
                    onClick={onNavigate ? () => onNavigate('cs_check') : undefined}
                />
                <KPICard
                    label="Exception Rate"
                    value={`${summary.exceptionRate}%`}
                    icon={<ShieldAlert size={20} />}
                    color="purple"
                />
                <KPICard
                    label="Data Error Rate"
                    value={`${summary.dataErrorRate}%`}
                    icon={<FileWarning size={20} />}
                    color={summary.dataErrorRate > 5 ? 'red' : 'cyan'}
                    onClick={onNavigate ? () => onNavigate('db_cs_quality') : undefined}
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Tickets per CS Bar Chart */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                        <Users size={16} className="text-blue-500" />
                        Khối lượng xử lý / CS
                    </h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={csBarData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                            <Bar dataKey="tickets" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Phiếu đã duyệt" />
                            <Bar dataKey="backlog" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Backlog" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Review Time Trend */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                        <Clock size={16} className="text-indigo-500" />
                        Thời gian duyệt (trend)
                    </h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={dailyMetrics}>
                            <defs>
                                <linearGradient id="reviewGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => v.slice(5)} />
                            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} unit="p" />
                            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} formatter={(v: number) => [`${v} phút`, 'Thời gian duyệt']} />
                            <Area type="monotone" dataKey="avgReviewTime" stroke="#6366f1" strokeWidth={2} fill="url(#reviewGrad)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* CS Performance Table */}
            <DataTable
                title="Hiệu suất từng CS"
                titleIcon={<Users size={16} className="text-emerald-500" />}
                columns={csColumns}
                data={csStats}
            />

            {/* Alerts */}
            <AlertPanel
                alerts={alerts}
                title="Cảnh báo CS"
                onViewAll={onNavigate ? () => onNavigate('cs_check') : undefined}
            />
        </div>
    );
};
