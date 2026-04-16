import React, { useState } from 'react';
import { Calendar, Filter, X, ChevronDown } from 'lucide-react';

export type DatePreset = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom';
export type ComparisonMode = 'none' | 'previous_period' | 'previous_year';

export interface FilterState {
    datePreset: DatePreset;
    dateFrom: string;
    dateTo: string;
    comparison: ComparisonMode;
    customerId?: string;
    routeId?: string;
    vehicleId?: string;
    driverId?: string;
}

interface DashboardFiltersProps {
    filters: FilterState;
    onFilterChange: (filters: FilterState) => void;
    showCustomer?: boolean;
    showRoute?: boolean;
    showVehicle?: boolean;
    showDriver?: boolean;
    customers?: { id: string; name: string }[];
    routes?: { id: string; name: string }[];
    vehicles?: { id: string; plate: string }[];
    drivers?: { id: string; name: string }[];
    showComparison?: boolean;
    showDatePresets?: boolean;
}

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
    { value: 'today', label: 'Hôm nay' },
    { value: 'yesterday', label: 'Hôm qua' },
    { value: 'this_week', label: 'Tuần này' },
    { value: 'last_week', label: 'Tuần trước' },
    { value: 'this_month', label: 'Tháng này' },
    { value: 'last_month', label: 'Tháng trước' },
];

const COMPARISON_OPTIONS: { value: ComparisonMode; label: string }[] = [
    { value: 'none', label: 'Không so sánh' },
    { value: 'previous_period', label: 'So với kỳ trước' },
];

export function getDateRange(preset: DatePreset): { from: string; to: string } {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (preset) {
        case 'today':
            return { from: fmt(today), to: fmt(today) };
        case 'yesterday': {
            const y = new Date(today);
            y.setDate(y.getDate() - 1);
            return { from: fmt(y), to: fmt(y) };
        }
        case 'this_week': {
            const d = today.getDay();
            const start = new Date(today);
            start.setDate(start.getDate() - (d === 0 ? 6 : d - 1));
            return { from: fmt(start), to: fmt(today) };
        }
        case 'last_week': {
            const d = today.getDay();
            const thisWeekStart = new Date(today);
            thisWeekStart.setDate(thisWeekStart.getDate() - (d === 0 ? 6 : d - 1));
            const lastWeekStart = new Date(thisWeekStart);
            lastWeekStart.setDate(lastWeekStart.getDate() - 7);
            const lastWeekEnd = new Date(thisWeekStart);
            lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
            return { from: fmt(lastWeekStart), to: fmt(lastWeekEnd) };
        }
        case 'this_month':
            return { from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), to: fmt(today) };
        case 'last_month': {
            const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const end = new Date(now.getFullYear(), now.getMonth(), 0);
            return { from: fmt(start), to: fmt(end) };
        }
        default:
            return { from: fmt(today), to: fmt(today) };
    }
}

function fmt(d: Date): string {
    return d.toISOString().split('T')[0];
}

export const DashboardFilters: React.FC<DashboardFiltersProps> = ({
    filters, onFilterChange,
    showCustomer, showRoute, showVehicle, showDriver,
    customers = [], routes = [], vehicles = [], drivers = [],
    showComparison = true,
    showDatePresets = true,
}) => {
    const [showAdvanced, setShowAdvanced] = useState(false);
    const hasEntityFilters = showCustomer || showRoute || showVehicle || showDriver;
    const activeFilters = [
        filters.customerId ? 'Khách hàng' : null,
        filters.routeId ? 'Tuyến' : null,
        filters.vehicleId ? 'Xe' : null,
        filters.driverId ? 'Lái xe' : null,
    ].filter(Boolean);

    const handlePreset = (preset: DatePreset) => {
        const range = getDateRange(preset);
        onFilterChange({ ...filters, datePreset: preset, dateFrom: range.from, dateTo: range.to });
    };

    const clearEntityFilters = () => {
        onFilterChange({ ...filters, customerId: undefined, routeId: undefined, vehicleId: undefined, driverId: undefined });
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 px-4 py-3">
            <div className="flex items-center gap-3 flex-wrap">
                {/* Date Presets */}
                {showDatePresets && (
                    <div className="flex items-center gap-1">
                        <Calendar size={14} className="text-slate-400 mr-1" />
                        {DATE_PRESETS.map(p => (
                            <button
                                key={p.value}
                                onClick={() => handlePreset(p.value)}
                                className={`
                                    px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                                    ${filters.datePreset === p.value
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                    }
                                `}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Custom date range */}
                {showDatePresets && filters.datePreset === 'custom' && (
                    <div className="flex items-center gap-2 text-xs">
                        <input
                            type="date"
                            value={filters.dateFrom}
                            onChange={e => onFilterChange({ ...filters, dateFrom: e.target.value })}
                            className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
                        />
                        <span className="text-slate-400">→</span>
                        <input
                            type="date"
                            value={filters.dateTo}
                            onChange={e => onFilterChange({ ...filters, dateTo: e.target.value })}
                            className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
                        />
                    </div>
                )}

                {/* Comparison Mode */}
                {showComparison && (
                    <select
                        value={filters.comparison}
                        onChange={e => onFilterChange({ ...filters, comparison: e.target.value as ComparisonMode })}
                        className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 bg-white"
                    >
                        {COMPARISON_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                )}

                {/* Advanced Filters Toggle */}
                {hasEntityFilters && (
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            showAdvanced || activeFilters.length > 0
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                        <Filter size={12} />
                        Bộ lọc
                        {activeFilters.length > 0 && (
                            <span className="bg-indigo-600 text-white px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                                {activeFilters.length}
                            </span>
                        )}
                        <ChevronDown size={12} className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                    </button>
                )}

                {/* Active filter tags */}
                {activeFilters.length > 0 && (
                    <button onClick={clearEntityFilters} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium">
                        <X size={12} /> Xóa lọc
                    </button>
                )}
            </div>

            {/* Advanced Filter Row */}
            {showAdvanced && hasEntityFilters && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-3 flex-wrap">
                    {showCustomer && (
                        <select
                            value={filters.customerId || ''}
                            onChange={e => onFilterChange({ ...filters, customerId: e.target.value || undefined })}
                            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white min-w-[140px]"
                        >
                            <option value="">Tất cả khách hàng</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    )}
                    {showRoute && (
                        <select
                            value={filters.routeId || ''}
                            onChange={e => onFilterChange({ ...filters, routeId: e.target.value || undefined })}
                            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white min-w-[140px]"
                        >
                            <option value="">Tất cả tuyến</option>
                            {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                    )}
                    {showVehicle && (
                        <select
                            value={filters.vehicleId || ''}
                            onChange={e => onFilterChange({ ...filters, vehicleId: e.target.value || undefined })}
                            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white min-w-[140px]"
                        >
                            <option value="">Tất cả xe</option>
                            {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate}</option>)}
                        </select>
                    )}
                    {showDriver && (
                        <select
                            value={filters.driverId || ''}
                            onChange={e => onFilterChange({ ...filters, driverId: e.target.value || undefined })}
                            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white min-w-[140px]"
                        >
                            <option value="">Tất cả lái xe</option>
                            {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    )}
                </div>
            )}
        </div>
    );
};

// Utility: create default filter state
export function createDefaultFilters(preset: DatePreset = 'this_month'): FilterState {
    const range = getDateRange(preset);
    return {
        datePreset: preset,
        dateFrom: range.from,
        dateTo: range.to,
        comparison: 'none',
    };
}
