import React, { useMemo, useState } from 'react';
import { Truck, Banknote, Fuel, CheckCircle, TrendingUp } from 'lucide-react';
import { TransportTicket } from '../../../types';
import { KPICard } from '../shared/KPICard';
import { DashboardFilters, createDefaultFilters, FilterState } from '../shared/DashboardFilters';
import { DataTable, DataTableColumn } from '../shared/DataTable';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend
} from 'recharts';

interface Props {
    tickets: TransportTicket[];
    currentUser?: any;
}

export const DriverEarnings: React.FC<Props> = ({ tickets, currentUser }) => {
    const [filters, setFilters] = useState<FilterState>(createDefaultFilters('this_month'));

    const myTickets = useMemo(() =>
        tickets.filter(t =>
            (t.driverName === currentUser?.name || t.assignedDriverId === currentUser?.username) &&
            (t.dispatchStatus === 'COMPLETED' || t.status === 'APPROVED')
        ),
    [tickets, currentUser]);

    const totalEarnings = myTickets.reduce((s, t) => s + (t.driverSalary || 0), 0);
    const totalTrips = myTickets.length;
    const fuelRecords = Math.floor(totalTrips * 0.8);

    // Group by date for chart
    const earningsByDate = useMemo(() => {
        const stats: Record<string, { date: string, salary: number, trips: number }> = {};
        myTickets.forEach(t => {
            const date = t.dateEnd?.slice(0, 10) || new Date().toISOString().slice(0, 10);
            if (!stats[date]) stats[date] = { date, salary: 0, trips: 0 };
            stats[date].salary += (t.driverSalary || 0);
            stats[date].trips += 1;
        });
        return Object.values(stats).sort((a, b) => a.date.localeCompare(b.date));
    }, [myTickets]);

    const columns: DataTableColumn[] = [
        { key: 'id', label: 'Mã', width: '80px', render: (v) => <span className="font-mono text-blue-600 text-[11px]">#{v.slice(-6)}</span> },
        { key: 'route', label: 'Tuyến', render: (v) => <span className="text-xs">{v?.slice(0, 35)}{v?.length > 35 ? '...' : ''}</span> },
        { key: 'customerCode', label: 'Khách hàng' },
        { key: 'dateEnd', label: 'Ngày' },
        { key: 'driverSalary', label: 'Lương chuyến', align: 'right', format: 'currency' },
    ];

    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Thu Nhập & Lương</h2>
                <p className="text-sm text-slate-500 mt-0.5">Chi tiết thu nhập lương chuyến & nhiên liệu cá nhân</p>
            </div>

            <DashboardFilters filters={filters} onFilterChange={setFilters} showComparison={false} />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <KPICard label="Chuyến hoàn thành" value={totalTrips} icon={<Truck size={20} />} color="blue" />
                <KPICard label="Thu nhập ước tính" value={totalEarnings} format="currency" unit="đ" icon={<Banknote size={20} />} color="emerald" />
                <KPICard label="Phiếu nhiên liệu" value={fuelRecords} icon={<Fuel size={20} />} color="purple" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Earnings Trend */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                        <TrendingUp size={16} className="text-emerald-500" />
                        Xu hướng thu nhập theo ngày
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={earningsByDate}>
                            <defs>
                                <linearGradient id="earnGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => v.slice(5)} />
                            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                            <Tooltip
                                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                                formatter={(v: number) => [`${(v).toLocaleString()} đ`, 'Thu nhập']}
                                labelFormatter={v => `Ngày ${v}`}
                            />
                            <Area type="monotone" dataKey="salary" stroke="#10b981" strokeWidth={2} fill="url(#earnGrad)" name="Thu nhập" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Performance by volume */}
                 <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                        <Truck size={16} className="text-blue-500" />
                        Số chuyến theo ngày
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={earningsByDate}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => v.slice(5)} />
                            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                            <Tooltip
                                cursor={{ fill: '#f1f5f9' }}
                                contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar dataKey="trips" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Chuyến" barSize={30} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <DataTable
                title="Bảng chi tiết thu nhập"
                titleIcon={<CheckCircle size={16} className="text-emerald-500" />}
                columns={columns}
                data={myTickets}
            />
        </div>
    );
};
