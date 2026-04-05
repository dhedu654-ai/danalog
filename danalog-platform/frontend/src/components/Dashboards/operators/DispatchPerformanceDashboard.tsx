import React, { useState, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { CheckCircle, Clock, RefreshCw, ShieldAlert, Users } from 'lucide-react';
import { TransportTicket } from '../../../types';
import { KPICard } from '../shared/KPICard';
import { DashboardFilters, createDefaultFilters, FilterState } from '../shared/DashboardFilters';
import { DataTable, DataTableColumn } from '../shared/DataTable';
import { generateDispatcherStats, DispatcherStats } from '../shared/mockData';

interface Props {
    tickets: TransportTicket[];
    currentUser?: any;
    onNavigate?: (tab: string, focusId?: string) => void;
}

export const DispatchPerformanceDashboard: React.FC<Props> = ({ tickets, currentUser, onNavigate }) => {
    const [filters, setFilters] = useState<FilterState>(createDefaultFilters('this_month'));
    const dispatchers = useMemo(() => generateDispatcherStats(), []);

    // Personal KPIs (simulate for logged-in dispatcher)
    const myStats = dispatchers[0]; // First dispatcher as "me"
    const myAssigned = tickets.filter(t => t.assignedDriverId).length;

    const barData = dispatchers.map(d => ({
        name: d.name.split(' ').slice(-2).join(' '),
        tickets: d.ticketsAssigned,
        sla: d.assignSLA,
    }));

    const columns: DataTableColumn<DispatcherStats>[] = [
        { key: 'name', label: 'Điều vận viên', render: (v) => <span className="font-semibold text-slate-800">{v}</span> },
        { key: 'ticketsAssigned', label: 'Đã assign', align: 'right', format: 'number' },
        {
            key: 'assignSLA', label: 'SLA', align: 'right',
            render: (v) => <span className={`font-bold ${v >= 90 ? 'text-emerald-600' : v >= 75 ? 'text-amber-600' : 'text-red-600'}`}>{v}%</span>,
        },
        { key: 'overrideRate', label: 'Override', align: 'right', render: (v) => `${v}%` },
        { key: 'reassignRate', label: 'Reassign', align: 'right', render: (v) => `${v}%` },
        { key: 'avgAssignTime', label: 'TB (phút)', align: 'right' },
    ];

    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Dispatch Performance</h2>
                <p className="text-sm text-slate-500 mt-0.5">Hiệu suất cá nhân & nhóm điều vận</p>
            </div>

            <DashboardFilters filters={filters} onFilterChange={setFilters} />

            {/* My KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KPICard label="Phiếu đã assign" value={myStats?.ticketsAssigned || myAssigned} icon={<CheckCircle size={20} />} color="blue" onClick={onNavigate ? () => onNavigate('dispatch_board') : undefined} />
                <KPICard label="Assign SLA" value={`${myStats?.assignSLA || 95}%`} icon={<Clock size={20} />} color="emerald" />
                <KPICard label="Override Rate" value={`${myStats?.overrideRate || 0}%`} icon={<ShieldAlert size={20} />} color="amber" onClick={onNavigate ? () => onNavigate('dispatch_logs') : undefined} />
                <KPICard label="Reassign Rate" value={`${myStats?.reassignRate || 0}%`} icon={<RefreshCw size={20} />} color="red" />
            </div>

            {/* Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                    <Users size={16} className="text-blue-500" />
                    Phiếu assign / Điều vận viên
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={barData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                        <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                        <Bar dataKey="tickets" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Phiếu assigned" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Table */}
            <DataTable
                title="Bảng so sánh điều vận"
                titleIcon={<Users size={16} className="text-indigo-500" />}
                columns={columns}
                data={dispatchers}
            />
        </div>
    );
};
