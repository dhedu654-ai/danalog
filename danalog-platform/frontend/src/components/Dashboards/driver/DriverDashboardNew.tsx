import React, { useMemo, useState } from 'react';
import { Truck, Banknote, Clock, AlertCircle, CheckCircle, TrendingUp } from 'lucide-react';
import { TransportTicket } from '../../../types';
import { KPICard } from '../shared/KPICard';
import { DataTable, DataTableColumn } from '../shared/DataTable';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';

interface Props {
    tickets: TransportTicket[];
    currentUser?: any;
    onNavigate?: (tab: string, focusId?: string) => void;
}

export const DriverDashboardNew: React.FC<Props> = ({ tickets, currentUser, onNavigate }) => {
    const myTickets = useMemo(() =>
        tickets.filter(t => t.driverName === currentUser?.name || t.assignedDriverId === currentUser?.username),
    [tickets, currentUser]);

    const todayStr = new Date().toISOString().split('T')[0];
    const todayTrips = myTickets.filter(t => t.dateStart?.startsWith(todayStr)).length || myTickets.length;
    const pendingUpdates = myTickets.filter(t => t.dispatchStatus === 'ASSIGNED' || t.dispatchStatus === 'DRIVER_ACCEPTED').length;
    const estimatedEarnings = myTickets.reduce((s, t) => s + (t.driverSalary || 0), 0);

    // Trip lists
    const newTrips = myTickets.filter(t => t.dispatchStatus === 'ASSIGNED' || t.dispatchStatus === 'DRIVER_PENDING');
    const runningTrips = myTickets.filter(t => t.dispatchStatus === 'IN_PROGRESS' || t.dispatchStatus === 'DRIVER_ACCEPTED');
    const needUpdateTrips = myTickets.filter(t => t.dispatchStatus === 'COMPLETED' && !t.containerImage);

    // Weekly trips data
    const weeklyData = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() - 6);
        const map: Record<string, number> = {};
        for(let i=0; i<7; i++) {
            map[d.toISOString().split('T')[0]] = 0;
            d.setDate(d.getDate() + 1);
        }
        myTickets.forEach(t => {
            const date = t.dateEnd?.split('T')[0];
            if (date && map[date] !== undefined) {
                map[date]++;
            }
        });
        return Object.keys(map).map(k => ({ date: k, trips: map[k] }));
    }, [myTickets]);

    const tripColumns: DataTableColumn[] = [
        { key: 'id', label: 'Mã', width: '80px', render: (v) => <span className="font-mono text-blue-600 text-[11px]">#{v.slice(-6)}</span> },
        { key: 'route', label: 'Tuyến', render: (v) => <span className="text-xs">{v?.slice(0, 30)}{v?.length > 30 ? '...' : ''}</span> },
        { key: 'customerCode', label: 'KH' },
        {
            key: 'dispatchStatus', label: 'Trạng thái',
            render: (v) => {
                const colors: Record<string, string> = {
                    ASSIGNED: 'bg-blue-100 text-blue-700',
                    DRIVER_PENDING: 'bg-amber-100 text-amber-700',
                    DRIVER_ACCEPTED: 'bg-emerald-100 text-emerald-700',
                    IN_PROGRESS: 'bg-cyan-100 text-cyan-700',
                    COMPLETED: 'bg-green-100 text-green-700',
                };
                return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${colors[v] || 'bg-slate-100 text-slate-600'}`}>{v}</span>;
            },
        },
        { key: 'driverSalary', label: 'Lương', align: 'right', format: 'currency' },
    ];

    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Dashboard Lái xe</h2>
                <p className="text-sm text-slate-500 mt-0.5">Tổng quan chuyến & thu nhập</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <KPICard label="Chuyến hôm nay" value={todayTrips} icon={<Truck size={20} />} color="blue" />
                <KPICard label="Chờ cập nhật" value={pendingUpdates} icon={<Clock size={20} />} color={pendingUpdates > 2 ? 'amber' : 'emerald'} />
                <KPICard label="Thu nhập ước tính" value={estimatedEarnings} format="currency" unit="đ" icon={<Banknote size={20} />} color="emerald" />
            </div>

            {/* Chart and Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                        <TrendingUp size={16} className="text-blue-500" />
                        Chuyến đi 7 ngày qua
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={weeklyData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="date" tickFormatter={v => v.slice(5)} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                            <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                            <Bar dataKey="trips" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Số chuyến" barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="flex flex-col gap-5">
                    <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-5 flex-1">
                        <h3 className="font-bold text-amber-700 text-sm mb-3 flex items-center gap-2">
                            <AlertCircle size={16} className="text-amber-500" />
                            Cần cập nhật ({needUpdateTrips.length})
                        </h3>
                        <div className="space-y-2">
                            {needUpdateTrips.slice(0, 3).map(t => (
                                <div key={t.id} className="bg-amber-50 rounded-lg px-3 py-2 border border-amber-100">
                                    <div className="text-xs font-bold text-amber-800">{t.route?.slice(0, 30)}</div>
                                    <div className="text-[10px] text-amber-600 mt-0.5">#{t.id.slice(-6)} — Thiếu ảnh</div>
                                </div>
                            ))}
                            {needUpdateTrips.length === 0 && <p className="text-xs text-slate-400 py-3 text-center">Đã cập nhật đầy đủ ✅</p>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Trip Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* New Trips */}
                <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-5">
                    <h3 className="font-bold text-blue-700 text-sm mb-3 flex items-center gap-2">
                        <AlertCircle size={16} className="text-blue-500" />
                        Chuyến mới ({newTrips.length})
                    </h3>
                    <div className="space-y-2">
                        {newTrips.slice(0, 5).map(t => (
                            <div key={t.id} className="bg-blue-50 rounded-lg px-3 py-2">
                                <div className="text-xs font-bold text-blue-800">{t.route?.slice(0, 30)}</div>
                                <div className="text-[10px] text-blue-600 mt-0.5">{t.customerCode} — #{t.id.slice(-6)}</div>
                            </div>
                        ))}
                        {newTrips.length === 0 && <p className="text-xs text-slate-400 py-3 text-center">Không có chuyến mới</p>}
                    </div>
                </div>

                {/* Running Trips */}
                <div className="bg-white rounded-xl shadow-sm border border-emerald-200 p-5">
                    <h3 className="font-bold text-emerald-700 text-sm mb-3 flex items-center gap-2">
                        <Truck size={16} className="text-emerald-500" />
                        Đang chạy ({runningTrips.length})
                    </h3>
                    <div className="space-y-2">
                        {runningTrips.slice(0, 5).map(t => (
                            <div key={t.id} className="bg-emerald-50 rounded-lg px-3 py-2">
                                <div className="text-xs font-bold text-emerald-800">{t.route?.slice(0, 30)}</div>
                                <div className="text-[10px] text-emerald-600 mt-0.5">{t.customerCode}</div>
                            </div>
                        ))}
                        {runningTrips.length === 0 && <p className="text-xs text-slate-400 py-3 text-center">Không có chuyến đang chạy</p>}
                    </div>
                </div>
            </div>

            {/* All Trips Table */}
            <DataTable
                title="Danh sách chuyến"
                titleIcon={<CheckCircle size={16} className="text-blue-500" />}
                columns={tripColumns}
                data={myTickets}
                maxRows={10}
            />
        </div>
    );
};
