import React, { useState, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { Truck, Activity, Clock, TrendingUp, Fuel, Banknote } from 'lucide-react';
import { TransportTicket } from '../../../types';
import { KPICard } from '../shared/KPICard';
import { DashboardFilters, createDefaultFilters, FilterState } from '../shared/DashboardFilters';
import { DataTable, DataTableColumn } from '../shared/DataTable';
import { generateFleetStats, VehicleStats, generateDailyMetrics } from '../shared/mockData';

interface Props {
    tickets: TransportTicket[];
    onNavigate?: (tab: string, focusId?: string) => void;
}

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export const FleetDashboardNew: React.FC<Props> = ({ tickets, onNavigate }) => {
    const [filters, setFilters] = useState<FilterState>(createDefaultFilters('this_month'));

    const fleetStats = useMemo(() => generateFleetStats(tickets), [tickets]);
    const dailyMetrics = useMemo(() => generateDailyMetrics(tickets, 30), [tickets]);

    const totalVehicles = fleetStats.length;
    const activeVehicles = fleetStats.filter(v => v.trips > 0).length;
    const avgTripsPerVehicle = totalVehicles > 0 ? (fleetStats.reduce((s, v) => s + v.trips, 0) / totalVehicles).toFixed(1) : '0';
    const avgIdleTime = totalVehicles > 0 ? (fleetStats.reduce((s, v) => s + v.idleHours, 0) / totalVehicles).toFixed(1) : '0';
    const totalRevenue = fleetStats.reduce((s, v) => s + v.revenue, 0);

    // Top vehicles by trips for bar chart
    const topVehicles = fleetStats.slice(0, 10).map(v => ({
        name: v.licensePlate,
        trips: v.trips,
        revenue: v.revenue,
    }));

    // Distribution for pie chart
    const utilizationDist = [
        { name: 'Cao (>70%)', value: fleetStats.filter(v => v.utilization > 70).length },
        { name: 'TB (40-70%)', value: fleetStats.filter(v => v.utilization >= 40 && v.utilization <= 70).length },
        { name: 'Thấp (<40%)', value: fleetStats.filter(v => v.utilization < 40).length },
    ].filter(d => d.value > 0);

    const vehicles = useMemo(() =>
        fleetStats.map(v => ({ id: v.vehicleId, plate: v.licensePlate })),
    [fleetStats]);

    const columns: DataTableColumn<VehicleStats>[] = [
        {
            key: 'licensePlate', label: 'Biển số', width: '110px',
            render: (v) => <span className="font-mono font-bold text-blue-600">{v}</span>,
        },
        { key: 'driverName', label: 'Lái xe' },
        { key: 'trips', label: 'Chuyến', align: 'right', format: 'number', sortable: true },
        {
            key: 'idleHours', label: 'Idle Time', align: 'right',
            render: (v) => <span className={`font-medium ${v > 3 ? 'text-red-600' : v > 1.5 ? 'text-amber-600' : 'text-emerald-600'}`}>{v}h</span>,
        },
        { key: 'revenue', label: 'Doanh thu', align: 'right', format: 'currency', sortable: true },
        { key: 'fuelCost', label: 'Nhiên liệu', align: 'right', format: 'currency' },
        {
            key: 'utilization', label: 'Công suất', align: 'right',
            render: (v) => (
                <div className="flex items-center gap-2 justify-end">
                    <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${v > 70 ? 'bg-emerald-500' : v > 40 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${v}%` }} />
                    </div>
                    <span className="font-medium">{v}%</span>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Fleet Dashboard</h2>
                <p className="text-sm text-slate-500 mt-0.5">Hiệu suất và công suất đội xe</p>
            </div>

            <DashboardFilters
                filters={filters}
                onFilterChange={setFilters}
                showVehicle
                vehicles={vehicles}
            />

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KPICard label="Xe hoạt động" value={`${activeVehicles}/${totalVehicles}`} icon={<Truck size={20} />} color="blue" />
                <KPICard label="Chuyến / Xe" value={avgTripsPerVehicle} unit="chuyến" icon={<TrendingUp size={20} />} color="emerald" />
                <KPICard label="Idle Time TB" value={avgIdleTime} unit="giờ" icon={<Clock size={20} />} color={Number(avgIdleTime) > 2 ? 'red' : 'amber'} />
                <KPICard label="Tổng DT Fleet" value={totalRevenue} format="currency" unit="đ" icon={<Banknote size={20} />} color="indigo" onClick={onNavigate ? () => onNavigate('revenue_driver') : undefined} />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Trips per Vehicle Bar */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 lg:col-span-2">
                    <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                        <Truck size={16} className="text-blue-500" />
                        Chuyến / Xe (Top 10)
                    </h3>
                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={topVehicles} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} width={80} />
                            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                            <Bar dataKey="trips" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Chuyến" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Utilization Distribution Pie */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                        <Activity size={16} className="text-emerald-500" />
                        Phân bổ công suất
                    </h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie data={utilizationDist} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                                {utilizationDist.map((_, i) => (
                                    <Cell key={i} fill={['#10b981', '#f59e0b', '#ef4444'][i] || PIE_COLORS[i]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-4 mt-2">
                        {utilizationDist.map((d, i) => (
                            <div key={d.name} className="flex items-center gap-1 text-[10px]">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#10b981', '#f59e0b', '#ef4444'][i] }} />
                                <span className="text-slate-500">{d.name}</span>
                                <span className="font-bold text-slate-700">{d.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Fleet Table */}
            <DataTable
                title="Chi tiết đội xe"
                titleIcon={<Truck size={16} className="text-blue-500" />}
                columns={columns}
                data={fleetStats}
                maxRows={15}
                onRowClick={onNavigate ? (row) => onNavigate('fuel_management') : undefined}
            />
        </div>
    );
};
