import React, { useState, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area
} from 'recharts';
import { Fuel, TrendingUp, AlertTriangle, Truck } from 'lucide-react';
import { TransportTicket } from '../../../types';
import { KPICard } from '../shared/KPICard';
import { AlertPanel, DashboardAlert } from '../shared/AlertPanel';
import { DashboardFilters, createDefaultFilters, FilterState } from '../shared/DashboardFilters';
import { DataTable, DataTableColumn } from '../shared/DataTable';
import { generateFuelStats, FuelVehicleStat, generateDailyMetrics } from '../shared/mockData';

interface Props {
    tickets: TransportTicket[];
    onNavigate?: (tab: string, focusId?: string) => void;
}

export const FuelDashboard: React.FC<Props> = ({ tickets, onNavigate }) => {
    const [filters, setFilters] = useState<FilterState>(createDefaultFilters('this_month'));

    const fuelStats = useMemo(() => generateFuelStats(tickets), [tickets]);
    const dailyMetrics = useMemo(() => generateDailyMetrics(tickets, 30), [tickets]);

    const totalFuelCost = fuelStats.reduce((s, f) => s + f.fuelCost, 0);
    const totalLiters = fuelStats.reduce((s, f) => s + f.fuelLiters, 0);
    const highVariance = fuelStats.filter(f => f.variance > 5);

    const vehicles = useMemo(() =>
        fuelStats.map(f => ({ id: f.licensePlate, plate: f.licensePlate })),
    [fuelStats]);

    const alerts: DashboardAlert[] = highVariance.slice(0, 5).map(f => ({
        id: `fuel-${f.licensePlate}`,
        level: f.variance > 8 ? 'critical' as const : 'warning' as const,
        title: `Xe ${f.licensePlate} — vượt mức ${f.variance}%`,
        description: `${f.fuelLiters}L / ${f.trips} chuyến`,
        onClick: onNavigate ? () => onNavigate('fuel_management') : undefined,
    }));

    // Top vehicles fuel bar chart
    const fuelBarData = fuelStats.slice(0, 10).map(f => ({
        name: f.licensePlate,
        cost: f.fuelCost,
        liters: f.fuelLiters,
    }));

    const fuelColumns: DataTableColumn<FuelVehicleStat>[] = [
        {
            key: 'licensePlate', label: 'Biển số', width: '110px',
            render: (v) => <span className="font-mono font-bold text-blue-600">{v}</span>,
        },
        { key: 'trips', label: 'Chuyến', align: 'right', format: 'number' },
        { key: 'fuelLiters', label: 'Lít', align: 'right', format: 'number' },
        { key: 'fuelCost', label: 'Chi phí', align: 'right', format: 'currency' },
        { key: 'avgLitersPerTrip', label: 'L/chuyến', align: 'right' },
        {
            key: 'variance', label: 'Variance', align: 'right',
            render: (v) => (
                <span className={`font-bold ${v > 5 ? 'text-red-600' : v > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {v > 0 ? '+' : ''}{v}%
                </span>
            ),
        },
    ];

    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Fuel Dashboard</h2>
                <p className="text-sm text-slate-500 mt-0.5">Phân tích chi phí nhiên liệu & định mức</p>
            </div>

            <DashboardFilters
                filters={filters}
                onFilterChange={setFilters}
                showVehicle
                vehicles={vehicles}
            />

            {/* KPI Cards */}
            <div className="grid grid-cols-3 gap-3">
                <KPICard label="Tổng chi phí NL" value={totalFuelCost} format="currency" unit="đ" icon={<Fuel size={20} />} color="purple" onClick={onNavigate ? () => onNavigate('fuel_management') : undefined} />
                <KPICard label="Tổng lít" value={totalLiters} format="number" unit="lít" icon={<TrendingUp size={20} />} color="blue" />
                <KPICard label="Xe vượt mức" value={highVariance.length} icon={<AlertTriangle size={20} />} color={highVariance.length > 3 ? 'red' : 'amber'} />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Fuel Cost Trend */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                        <TrendingUp size={16} className="text-purple-500" />
                        Chi phí NL / ngày
                    </h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={dailyMetrics}>
                            <defs>
                                <linearGradient id="fuelGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} />
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => v.slice(5)} />
                            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `${(v / 1_000_000).toFixed(0)}M`} />
                            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} formatter={(v: number) => [`${(v / 1_000_000).toFixed(1)}M đ`, 'Chi phí']} />
                            <Area type="monotone" dataKey="fuelCost" stroke="#8b5cf6" strokeWidth={2} fill="url(#fuelGrad)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Fuel by Vehicle Bar */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                        <Truck size={16} className="text-blue-500" />
                        Chi phí / Xe (Top 10)
                    </h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={fuelBarData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `${(v / 1_000_000).toFixed(0)}M`} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} width={70} />
                            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`${(v / 1_000_000).toFixed(1)}M đ`, 'Chi phí']} />
                            <Bar dataKey="cost" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Chi phí" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Fuel Table */}
            <DataTable
                title="Chi tiết nhiên liệu theo xe"
                titleIcon={<Fuel size={16} className="text-purple-500" />}
                columns={fuelColumns}
                data={fuelStats}
                maxRows={15}
                onRowClick={onNavigate ? () => onNavigate('fuel_management') : undefined}
            />

            {/* Alerts */}
            <AlertPanel alerts={alerts} title="Cảnh báo nhiên liệu" />
        </div>
    );
};
