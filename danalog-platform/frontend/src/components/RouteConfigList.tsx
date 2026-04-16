import { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { RouteConfig } from '../types';
import { Edit3, Trash2, Plus, Filter, Search, Eye, Clock, CalendarClock, XCircle, BarChart3, ChevronDown, ChevronUp, TrendingUp, TrendingDown, MapPin, ArrowUpDown, Layers } from 'lucide-react';
import { RouteConfigModal } from './RouteConfigModal';
import { RouteHistoryModal } from './RouteHistoryModal';
import { PendingChangesModal } from './PendingChangesModal';
import { ZONE_PRESETS, CARGO_TYPE_LABELS } from '../constants';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell, LabelList
} from 'recharts';

interface RouteConfigListProps {
    configs: RouteConfig[];
    onUpdateConfigs: (configs: RouteConfig[]) => void;
    isReadOnly?: boolean;
    tickets?: any[];
}

type SortField = 'routeName' | 'km' | 'customer' | 'cargoType' | 'trips' | 'actualRevenue' | 'profit';
type SortDir = 'asc' | 'desc';
type ViewTab = 'config' | 'performance';

const fmt = (n: number) => n.toLocaleString('vi-VN');
const fmtM = (n: number) => {
    if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'tr';
    if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(0) + 'k';
    return n.toLocaleString('vi-VN');
};

export function RouteConfigList({ configs, onUpdateConfigs, isReadOnly, tickets: propTickets }: RouteConfigListProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCustomer, setFilterCustomer] = useState('ALL');
    const [filterCargoType, setFilterCargoType] = useState('ALL');
    const [filterZone, setFilterZone] = useState('ALL');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [editingConfig, setEditingConfig] = useState<RouteConfig | null>(null);
    const [historyConfig, setHistoryConfig] = useState<RouteConfig | null>(null);
    const [pendingPreviewConfig, setPendingPreviewConfig] = useState<RouteConfig | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [customers, setCustomers] = useState<{ id: string; name: string; status: string }[]>([]);
    const [tickets, setTickets] = useState<any[]>(propTickets || []);
    const [fuelStations, setFuelStations] = useState<any[]>([]);
    const [viewTab, setViewTab] = useState<ViewTab>('config');
    const [sortField, setSortField] = useState<SortField>('routeName');
    const [sortDir, setSortDir] = useState<SortDir>('asc');
    const [showCharts, setShowCharts] = useState(true);

    // Fetch data
    useEffect(() => {
        api.getCustomers().then(data => {
            setCustomers((data || []).filter((c: any) => c.status === 'ACTIVE'));
        }).catch(() => setCustomers([]));

        if (!propTickets) {
            api.getTickets().then(data => setTickets(data || [])).catch(() => setTickets([]));
        }

        api.getFuelStations().then(data => setFuelStations((data || []).filter((s: any) => s.active))).catch(() => setFuelStations([]));
    }, []);

    useEffect(() => {
        if (propTickets) setTickets(propTickets);
    }, [propTickets]);

    // Average fuel price from active stations
    const avgFuelPrice = useMemo(() => {
        if (fuelStations.length === 0) return 21000;
        return Math.round(fuelStations.reduce((sum: number, s: any) => sum + (s.unitPrice || 0), 0) / fuelStations.length);
    }, [fuelStations]);

    // Dynamic zones from existing data
    const allZones = useMemo(() => {
        const zonesFromData = new Set<string>();
        configs.forEach(c => { if (c.zone) zonesFromData.add(c.zone); });
        ZONE_PRESETS.forEach(z => zonesFromData.add(z));
        return Array.from(zonesFromData).sort();
    }, [configs]);

    // Unique values for filters
    const uniqueCargoTypes = useMemo(() => Array.from(new Set(configs.map(c => c.cargoType))), [configs]);
    const uniqueCustomers = useMemo(() => {
        const fromConfigs = Array.from(new Set(configs.map(c => c.customer).filter(Boolean)));
        const fromApi = customers.map(c => c.name);
        return Array.from(new Set([...fromConfigs, ...fromApi])).sort();
    }, [configs, customers]);

    // Ticket stats per route
    const routeStats = useMemo(() => {
        const stats: Record<string, { trips: number; totalRevenue: number; totalSalary: number; totalNightStayDays: number }> = {};
        const filteredTickets = tickets.filter(t => {
            if (t.status !== 'APPROVED' && t.status !== 'COMPLETED' && t.status !== 'PENDING') return false;
            if (dateFrom && t.dateStart < dateFrom) return false;
            if (dateTo && t.dateStart > dateTo) return false;
            return true;
        });
        filteredTickets.forEach(t => {
            const key = t.routeId || t.route;
            if (!key) return;
            if (!stats[key]) stats[key] = { trips: 0, totalRevenue: 0, totalSalary: 0, totalNightStayDays: 0 };
            stats[key].trips += (t.trips || 1);
            stats[key].totalRevenue += (t.revenue || 0);
            stats[key].totalSalary += (t.driverSalary || t.defaultSalary || 0);
            stats[key].totalNightStayDays += (t.nightStayDays || (t.nightStay ? 1 : 0));
        });
        return stats;
    }, [tickets, dateFrom, dateTo]);

    // Enriched configs with stats
    const enrichedConfigs = useMemo(() => {
        return configs.map(c => {
            const stat = routeStats[c.id] || routeStats[c.routeName] || { trips: 0, totalRevenue: 0, totalSalary: 0, totalNightStayDays: 0 };
            const fuelCost = (c.fuel?.quota || 0) * avgFuelPrice * stat.trips;
            
            const nightStayPerDay = c.nightStayLocation === 'INNER_CITY' ? 90000 : (c.nightStayLocation === 'OUTER_CITY' ? 120000 : 0);
            const totalNightStay = stat.totalNightStayDays * nightStayPerDay;
            
            const totalCost = stat.totalSalary + totalNightStay + fuelCost;
            const profit = stat.totalRevenue - totalCost;
            const profitPerTrip = stat.trips > 0 ? profit / stat.trips : 0;
            return { ...c, ...stat, fuelCost, totalNightStay, totalCost, profit, profitPerTrip };
        });
    }, [configs, routeStats, avgFuelPrice]);

    // Filter
    const filteredConfigs = useMemo(() => {
        return enrichedConfigs.filter(config => {
            const matchesSearch = (config.routeName || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCustomer = filterCustomer === 'ALL' || config.customer === filterCustomer;
            const matchesCargoType = filterCargoType === 'ALL' || config.cargoType === filterCargoType;
            const matchesZone = filterZone === 'ALL' || config.zone === filterZone;
            return matchesSearch && matchesCustomer && matchesCargoType && matchesZone;
        });
    }, [enrichedConfigs, searchTerm, filterCustomer, filterCargoType, filterZone]);

    // Sort
    const sortedConfigs = useMemo(() => {
        const sorted = [...filteredConfigs];
        sorted.sort((a, b) => {
            let va: any, vb: any;
            switch (sortField) {
                case 'routeName': va = a.routeName; vb = b.routeName; break;
                case 'km': va = a.km || 0; vb = b.km || 0; break;
                case 'customer': va = a.customer; vb = b.customer; break;
                case 'cargoType': va = a.cargoType; vb = b.cargoType; break;
                case 'trips': va = a.trips; vb = b.trips; break;
                case 'actualRevenue': va = a.totalRevenue; vb = b.totalRevenue; break;
                case 'profit': va = a.profit; vb = b.profit; break;
                default: va = a.routeName; vb = b.routeName;
            }
            if (typeof va === 'string') {
                return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
            }
            return sortDir === 'asc' ? va - vb : vb - va;
        });
        return sorted;
    }, [filteredConfigs, sortField, sortDir]);

    // Chart data
    const top5Best = useMemo(() => {
        return [...enrichedConfigs].filter(c => c.trips > 0).sort((a, b) => b.profitPerTrip - a.profitPerTrip).slice(0, 5).map(c => ({
            name: c.routeName.length > 35 ? c.routeName.slice(0, 35) + '...' : c.routeName,
            value: Math.round(c.profitPerTrip),
            fullName: c.routeName
        }));
    }, [enrichedConfigs]);

    const top5Worst = useMemo(() => {
        return [...enrichedConfigs].filter(c => c.trips > 0).sort((a, b) => a.profitPerTrip - b.profitPerTrip).slice(0, 5).map(c => ({
            name: c.routeName.length > 35 ? c.routeName.slice(0, 35) + '...' : c.routeName,
            value: Math.round(c.profitPerTrip),
            fullName: c.routeName
        }));
    }, [enrichedConfigs]);

    const tripFrequency = useMemo(() => {
        return [...enrichedConfigs].filter(c => c.trips > 0).sort((a, b) => b.trips - a.trips).slice(0, 10).map(c => ({
            name: c.routeName.length > 25 ? c.routeName.slice(0, 25) + '...' : c.routeName,
            trips: c.trips,
            fullName: c.routeName,
        }));
    }, [enrichedConfigs]);

    const handleCancelPending = async (configId: string) => {
        if (!window.confirm('Bạn có chắc chắn muốn hủy thay đổi đang chờ không?')) return;
        try {
            await api.cancelPendingChanges(configId);
            alert('Hủy thay đổi thành công');
            const updatedConfigs = await api.getRouteConfigs();
            onUpdateConfigs(updatedConfigs);
        } catch (error) {
            alert('Lỗi khi hủy thay đổi');
        }
    };

    const refreshConfigs = async () => {
        try {
            const updatedConfigs = await api.getRouteConfigs();
            onUpdateConfigs(updatedConfigs);
        } catch (error) {
            console.error('Failed to refresh configs', error);
        }
    };

    const handleSaveConfig = (newConfig: RouteConfig) => {
        if (isReadOnly) return;
        if (editingConfig) {
            const updated = configs.map(c => c.id === newConfig.id ? newConfig : c);
            onUpdateConfigs(updated);
            setEditingConfig(null);
        } else {
            onUpdateConfigs([...configs, newConfig]);
            setIsCreateModalOpen(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (isReadOnly) return;
        if (!window.confirm('BẠN CÓ CHẮC CHẮN MUỐN XÓA TUYẾN NÀY KHÔNG?\n\nHành động này không thể hoàn tác!')) return;
        try {
            await api.deleteRouteConfig(id);
            onUpdateConfigs(configs.filter(c => c.id !== id));
            alert("Đã xóa tuyến đường thành công!");
        } catch (error) {
            console.error("Failed to delete config", error);
            alert("Lỗi khi xóa tuyến đường. Vui lòng thử lại.");
        }
    };

    const toggleSort = (field: SortField) => {
        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortField(field); setSortDir('asc'); }
    };

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return <ArrowUpDown size={12} className="text-slate-300" />;
        return sortDir === 'asc' ? <ChevronUp size={14} className="text-blue-600" /> : <ChevronDown size={14} className="text-blue-600" />;
    };

    const cargoLabel = (type: string) => CARGO_TYPE_LABELS[type] || type;

    const CHART_COLORS_BEST = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5'];
    const CHART_COLORS_WORST = ['#ef4444', '#f87171', '#fca5a5', '#fecaca', '#fee2e2'];
    const CHART_COLORS_FREQ = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff', '#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff'];

    return (
        <div className="space-y-5 font-sans">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Quản Lý Tuyến Đường</h2>
                    <p className="text-slate-500 mt-1 text-sm">
                        {configs.length} tuyến • Giá xăng TB: {fmt(avgFuelPrice)}đ/lít
                        {fuelStations.length > 0 && <span className="text-green-600"> (cập nhật từ {fuelStations.length} cây xăng)</span>}
                    </p>
                </div>
                {!isReadOnly && (
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-[#1e3a8a] text-white font-bold rounded-xl shadow-md hover:bg-blue-900 transition-all hover:shadow-lg active:scale-95"
                    >
                        <Plus size={20} />
                        Thêm Tuyến Mới
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="sticky -top-4 lg:-top-8 z-40 bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.1)] border border-slate-200 transition-all">
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="flex items-center gap-2 text-slate-400 pr-3 border-r border-slate-200">
                        <Filter size={18} />
                        <span className="text-xs font-bold uppercase">Lọc</span>
                    </div>
                    <div className="relative flex-1 min-w-[200px] max-w-xs">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Tìm tuyến đường..."
                            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)}>
                        <option value="ALL">Tất cả KH</option>
                        {uniqueCustomers.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={filterCargoType} onChange={e => setFilterCargoType(e.target.value)}>
                        <option value="ALL">Tất cả loại hàng</option>
                        {uniqueCargoTypes.map(t => <option key={t} value={t}>{cargoLabel(t)}</option>)}
                    </select>
                    <select className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={filterZone} onChange={e => setFilterZone(e.target.value)}>
                        <option value="ALL">Tất cả vùng</option>
                        {allZones.map(z => <option key={z} value={z}>{z}</option>)}
                    </select>
                    <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
                        <span className="text-xs text-slate-400 font-medium">Thời gian:</span>
                        <input type="date" className="px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                        <span className="text-slate-300">→</span>
                        <input type="date" className="px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                    </div>
                </div>
            </div>

            {/* Charts Toggle */}
            <button onClick={() => setShowCharts(v => !v)} className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors">
                <BarChart3 size={16} />
                {showCharts ? 'Ẩn biểu đồ' : 'Hiện biểu đồ phân tích'}
                {showCharts ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {/* Charts */}
            {showCharts && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Top 5 Best/Worst */}
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                            <TrendingUp size={16} className="text-emerald-600" />
                            Top 5 Tuyến Hiệu Quả Nhất (LN/chuyến)
                        </h3>
                        {top5Best.length > 0 ? (
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={top5Best} layout="vertical" margin={{ left: 10, right: 30 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis type="number" tickFormatter={v => fmtM(v)} tick={{ fontSize: 11 }} />
                                    <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 10 }} />
                                    <Tooltip formatter={(v: number) => [fmt(v) + 'đ', 'LN/chuyến']} labelFormatter={(l: string, payload: any[]) => payload?.[0]?.payload?.fullName || l} />
                                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                                        {top5Best.map((_e, i) => <Cell key={i} fill={CHART_COLORS_BEST[i]} />)}
                                        <LabelList dataKey="value" position="right" formatter={(v: number) => fmtM(v)} style={{ fontSize: 10, fill: '#334155' }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <p className="text-sm text-slate-400 text-center py-8">Chưa có dữ liệu chuyến đi</p>}

                        <h3 className="text-sm font-bold text-slate-700 mb-4 mt-6 flex items-center gap-2">
                            <TrendingDown size={16} className="text-red-500" />
                            Top 5 Tuyến Kém Hiệu Quả Nhất (LN/chuyến)
                        </h3>
                        {top5Worst.length > 0 ? (
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={top5Worst} layout="vertical" margin={{ left: 10, right: 30 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis type="number" tickFormatter={v => fmtM(v)} tick={{ fontSize: 11 }} />
                                    <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 10 }} />
                                    <Tooltip formatter={(v: number) => [fmt(v) + 'đ', 'LN/chuyến']} labelFormatter={(l: string, payload: any[]) => payload?.[0]?.payload?.fullName || l} />
                                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                                        {top5Worst.map((_e, i) => <Cell key={i} fill={CHART_COLORS_WORST[i]} />)}
                                        <LabelList dataKey="value" position="right" formatter={(v: number) => fmtM(v)} style={{ fontSize: 10, fill: '#334155' }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <p className="text-sm text-slate-400 text-center py-8">Chưa có dữ liệu chuyến đi</p>}
                    </div>

                    {/* Trip Frequency */}
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                            <Layers size={16} className="text-indigo-600" />
                            Tần Suất Chạy Tuyến (Top 10)
                        </h3>
                        {tripFrequency.length > 0 ? (
                            <ResponsiveContainer width="100%" height={430}>
                                <BarChart data={tripFrequency} margin={{ left: 0, right: 10, bottom: 60 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" height={80} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip formatter={(v: number) => [v + ' chuyến', 'Số chuyến']} labelFormatter={(l: string, payload: any[]) => payload?.[0]?.payload?.fullName || l} />
                                    <Bar dataKey="trips" radius={[6, 6, 0, 0]}>
                                        {tripFrequency.map((_e, i) => <Cell key={i} fill={CHART_COLORS_FREQ[i]} />)}
                                        <LabelList dataKey="trips" position="top" style={{ fontSize: 11, fontWeight: 700, fill: '#334155' }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <p className="text-sm text-slate-400 text-center py-8">Chưa có dữ liệu chuyến đi</p>}
                    </div>
                </div>
            )}

            {/* View Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 w-fit">
                <button
                    onClick={() => setViewTab('config')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewTab === 'config' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <MapPin size={14} className="inline mr-1.5" />
                    Cấu Hình Tuyến
                </button>
                <button
                    onClick={() => setViewTab('performance')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewTab === 'performance' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <BarChart3 size={14} className="inline mr-1.5" />
                    Số Liệu Thực Tế
                </button>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-260px)]">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 z-30 shadow-[0_1px_0_0_#e2e8f0]">
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                                <th className="text-left px-3 py-3 text-xs font-bold uppercase tracking-wider sticky left-0 bg-slate-50 z-40 cursor-pointer hover:text-blue-600 shadow-[1px_0_0_0_#e2e8f0]" onClick={() => toggleSort('routeName')}>
                                    <span className="flex items-center gap-1">Tên tuyến <SortIcon field="routeName" /></span>
                                </th>
                                <th className="text-center px-2 py-3 text-xs font-bold uppercase cursor-pointer hover:text-blue-600 whitespace-nowrap bg-slate-50" onClick={() => toggleSort('km')}>
                                    <span className="flex items-center justify-center gap-1">KM <SortIcon field="km" /></span>
                                </th>
                                <th className="text-left px-2 py-3 text-xs font-bold uppercase whitespace-nowrap cursor-pointer hover:text-blue-600 bg-slate-50" onClick={() => toggleSort('cargoType')}>
                                    <span className="flex items-center gap-1">Loại hàng <SortIcon field="cargoType" /></span>
                                </th>
                                <th className="text-left px-2 py-3 text-xs font-bold uppercase whitespace-nowrap cursor-pointer hover:text-blue-600 bg-slate-50" onClick={() => toggleSort('customer')}>
                                    <span className="flex items-center gap-1">Khách hàng <SortIcon field="customer" /></span>
                                </th>

                                {viewTab === 'config' ? (
                                    <>
                                        <th className="text-right px-2 py-3 text-xs font-bold text-blue-600 uppercase whitespace-nowrap bg-slate-50">DT 20E</th>
                                        <th className="text-right px-2 py-3 text-xs font-bold text-blue-600 uppercase whitespace-nowrap bg-slate-50">DT 20F</th>
                                        <th className="text-right px-2 py-3 text-xs font-bold text-blue-600 uppercase whitespace-nowrap bg-slate-50">DT 40E</th>
                                        <th className="text-right px-2 py-3 text-xs font-bold text-blue-600 uppercase whitespace-nowrap bg-slate-50">DT 40F</th>
                                        <th className="text-right px-2 py-3 text-xs font-bold text-orange-600 uppercase whitespace-nowrap bg-slate-50">Lương LX</th>
                                        <th className="text-center px-2 py-3 text-xs font-bold text-amber-600 uppercase whitespace-nowrap bg-slate-50">NL (lít)</th>
                                        <th className="text-center px-2 py-3 text-xs font-bold text-purple-600 uppercase whitespace-nowrap bg-slate-50">Lưu đêm</th>
                                        <th className="text-center px-2 py-3 text-xs font-bold text-slate-500 uppercase whitespace-nowrap bg-slate-50">Hiệu lực</th>
                                    </>
                                ) : (
                                    <>
                                        <th className="text-center px-2 py-3 text-xs font-bold text-indigo-600 uppercase whitespace-nowrap cursor-pointer hover:text-blue-600 bg-slate-50" onClick={() => toggleSort('trips')}>
                                            <span className="flex items-center justify-center gap-1">Chuyến <SortIcon field="trips" /></span>
                                        </th>
                                        <th className="text-right px-2 py-3 text-xs font-bold text-emerald-600 uppercase whitespace-nowrap cursor-pointer hover:text-blue-600 bg-slate-50" onClick={() => toggleSort('actualRevenue')}>
                                            <span className="flex items-center justify-end gap-1">DT thực tế <SortIcon field="actualRevenue" /></span>
                                        </th>
                                        <th className="text-right px-2 py-3 text-xs font-bold text-orange-600 uppercase whitespace-nowrap bg-slate-50">CP Lương</th>
                                        <th className="text-right px-2 py-3 text-xs font-bold text-purple-600 uppercase whitespace-nowrap bg-slate-50">CP Lưu đêm</th>
                                        <th className="text-right px-2 py-3 text-xs font-bold text-amber-600 uppercase whitespace-nowrap bg-slate-50">CP NL</th>
                                        <th className="text-right px-2 py-3 text-xs font-bold text-red-600 uppercase whitespace-nowrap cursor-pointer hover:text-blue-600 bg-slate-50" onClick={() => toggleSort('profit')}>
                                            <span className="flex items-center justify-end gap-1">Lợi nhuận <SortIcon field="profit" /></span>
                                        </th>
                                    </>
                                )}
                                {viewTab === 'config' && (
                                    <th className="text-center px-2 py-3 text-xs font-bold text-slate-500 uppercase whitespace-nowrap w-20 bg-slate-50"></th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {sortedConfigs.length === 0 ? (
                                <tr><td colSpan={15} className="text-center py-12 text-slate-400">Không tìm thấy tuyến đường nào</td></tr>
                            ) : sortedConfigs.map((config, idx) => (
                                <tr key={config.id} className={`group border-b border-slate-100 hover:bg-blue-50/50 transition-colors cursor-pointer ${idx % 2 === 0 ? 'bg-white' : 'bg-[#f8fafc]'}`}
                                    onClick={() => setEditingConfig(config)}
                                >
                                    <td className={`px-3 py-2.5 sticky left-0 z-20 shadow-[1px_0_0_0_#e2e8f0] transition-colors group-hover:bg-blue-50/80 ${idx % 2 === 0 ? '!bg-white' : '!bg-[#f8fafc]'}`}>
                                        <div className="max-w-[280px]">
                                            <p className="font-semibold text-slate-800 truncate text-xs" title={config.routeName}>{config.routeName}</p>
                                            {config.pendingChanges && Array.isArray(config.pendingChanges) && config.pendingChanges.length > 0 && (
                                                <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full mt-0.5">
                                                    <CalendarClock size={10} /> {config.pendingChanges.length} thay đổi chờ
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="text-center px-2 py-2.5 text-xs font-medium text-slate-600">{config.km || '-'}</td>
                                    <td className="px-2 py-2.5">
                                        <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-600 whitespace-nowrap">{cargoLabel(config.cargoType)}</span>
                                    </td>
                                    <td className="px-2 py-2.5 text-xs text-slate-600 max-w-[120px] truncate" title={config.customer}>{config.customer}</td>
                                    {viewTab === 'config' ? (
                                        <>
                                            <td className="text-right px-2 py-2.5 text-xs font-mono text-blue-700">{fmt(config.revenue?.price20E || 0)}</td>
                                            <td className="text-right px-2 py-2.5 text-xs font-mono text-blue-700">{fmt(config.revenue?.price20F || 0)}</td>
                                            <td className="text-right px-2 py-2.5 text-xs font-mono text-blue-700">{fmt(config.revenue?.price40E || 0)}</td>
                                            <td className="text-right px-2 py-2.5 text-xs font-mono text-blue-700">{fmt(config.revenue?.price40F || 0)}</td>
                                            <td className="text-right px-2 py-2.5 text-xs font-mono text-orange-600">{fmt(config.salary?.driverSalary || 0)}</td>
                                            <td className="text-center px-2 py-2.5 text-xs font-mono text-amber-700">{config.fuel?.quota || 0}L</td>
                                            <td className="text-center px-2 py-2.5 text-xs">
                                                {config.nightStayLocation === 'INNER_CITY' ? (
                                                    <span className="inline-flex px-2 py-0.5 bg-purple-100 text-purple-700 rounded-md text-[10px] font-bold border border-purple-200">
                                                        Trong TP: 100k
                                                    </span>
                                                ) : config.nightStayLocation === 'OUTER_CITY' ? (
                                                    <span className="inline-flex px-2 py-0.5 bg-fuchsia-100 text-fuchsia-700 rounded-md text-[10px] font-bold border border-fuchsia-200">
                                                        Ngoài TP: 200k
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300">—</span>
                                                )}
                                            </td>
                                            <td className="text-center px-2 py-2.5 text-[10px] text-slate-400 whitespace-nowrap">{config.effectiveDate}</td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="text-center px-2 py-2.5 text-xs font-mono text-indigo-700">{fmt(config.trips)}</td>
                                            <td className="text-right px-2 py-2.5 font-bold text-emerald-700">{fmt(config.totalRevenue)}</td>
                                            <td className="text-right px-2 py-2.5 text-xs font-mono text-orange-600">{fmt(config.totalSalary)}</td>
                                            <td className="text-right px-2 py-2.5 text-xs font-mono text-purple-600">{fmt(config.totalNightStay)}</td>
                                            <td className="text-right px-2 py-2.5 text-xs font-mono text-amber-700">{fmt(config.fuelCost)}</td>
                                            <td className={`text-right px-2 py-2.5 font-bold text-sm ${config.profit >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                                                {fmt(config.profit)}
                                            </td>
                                        </>
                                    )}

                                    {viewTab === 'config' && (
                                        <td className="text-center px-2 py-2.5" onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center justify-center gap-1">
                                                <button onClick={() => setEditingConfig(config)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Chi tiết">
                                                    <Eye size={14} />
                                                </button>
                                                {!isReadOnly && (
                                                    <>
                                                        {config.pendingChanges && Array.isArray(config.pendingChanges) && config.pendingChanges.length > 0 && (
                                                            <>
                                                                <button onClick={() => setPendingPreviewConfig(config)} className="p-1.5 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors" title="Xem thay đổi chờ">
                                                                    <CalendarClock size={14} />
                                                                </button>
                                                                <button onClick={() => handleCancelPending(config.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Hủy thay đổi chờ">
                                                                    <XCircle size={14} />
                                                                </button>
                                                            </>
                                                        )}
                                                        <button onClick={() => setHistoryConfig(config)} className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Lịch sử">
                                                            <Clock size={14} />
                                                        </button>
                                                        <button onClick={() => handleDelete(config.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Xóa">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
                    Hiển thị {sortedConfigs.length} / {configs.length} tuyến đường
                    {viewTab === 'performance' && ` • Giá xăng TB: ${fmt(avgFuelPrice)}đ/lít`}
                    {(dateFrom || dateTo) && ` • Lọc: ${dateFrom || '...'} → ${dateTo || '...'}`}
                </div>
            </div>

            {/* Modals */}
            {editingConfig && (
                <RouteConfigModal
                    config={editingConfig}
                    isOpen={true}
                    onClose={() => setEditingConfig(null)}
                    onSave={handleSaveConfig}
                    onRefresh={refreshConfigs}
                    isReadOnly={isReadOnly}
                />
            )}
            {isCreateModalOpen && (
                <RouteConfigModal
                    config={null}
                    isOpen={true}
                    onClose={() => setIsCreateModalOpen(false)}
                    onSave={handleSaveConfig}
                    onRefresh={refreshConfigs}
                    isNew
                />
            )}
            {historyConfig && (
                <RouteHistoryModal
                    config={historyConfig}
                    isOpen={true}
                    onClose={() => setHistoryConfig(null)}
                />
            )}
            {pendingPreviewConfig && (
                <PendingChangesModal
                    config={pendingPreviewConfig}
                    isOpen={true}
                    onClose={() => setPendingPreviewConfig(null)}
                />
            )}
        </div>
    );
}
