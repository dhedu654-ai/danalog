import React, { useState, useEffect, useMemo } from 'react';
import { Fuel, Edit2, Trash2, Search, X, Save, Settings, ArrowLeft, ArrowRight, CheckCircle, Clock, Eye, Image, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { format } from 'date-fns';
import * as XLSX from 'xlsx-js-style';

interface FuelStation {
    id: string;
    name: string;
    unitPrice: number;
    effectiveDate: string;
    active: boolean;
    createdAt: string;
}

export function FuelManagement({ users = [], tickets = [], routeConfigs = [] }: { users: any[], tickets?: any[], routeConfigs?: any[] }) {
    const { user: currentUser } = useAuth();
    const isAdmin = currentUser?.role === 'ADMIN';
    const canEdit = isAdmin || currentUser?.role === 'ACCOUNTANT';

    const [records, setRecords] = useState<any[]>([]);
    const [stations, setStations] = useState<FuelStation[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // View Mode
    const [viewMode, setViewMode] = useState<'DETAILS' | 'SUMMARY'>('DETAILS');

    // Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'month'|'range'>('month');
    const [selectedMonths, setSelectedMonths] = useState<number[]>([new Date().getMonth() + 1]);
    const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedStation, setSelectedStation] = useState('ALL');
    const [selectedDriver, setSelectedDriver] = useState('ALL');
    const [selectedStatus, setSelectedStatus] = useState('ALL');

    // Modal States
    const [isStationModalOpen, setIsStationModalOpen] = useState(false);
    const [isEditTicketOpen, setIsEditTicketOpen] = useState(false);
    const [editingTicket, setEditingTicket] = useState<any>(null);
    const [editingStation, setEditingStation] = useState<FuelStation | null>(null);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [imageModalSrc, setImageModalSrc] = useState('');
    const [newStation, setNewStation] = useState<Partial<FuelStation>>({ name: '', unitPrice: 0, effectiveDate: new Date().toISOString().split('T')[0], active: true });

    // Pagination
    const PAGE_SIZE = 15;
    const [currentPage, setCurrentPage] = useState(1);

    const drivers = users.filter(u => u.role === 'DRIVER');

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN').format(amount);
    };

    // Get station price for a ticket
    const getStationPrice = (pumpName: string): number => {
        const station = stations.find(s => s.name === pumpName);
        return station?.unitPrice || 0;
    };

    // Get driver display name
    const getDriverName = (username: string): string => {
        const driver = users.find(u => u.username === username);
        return driver?.name || username;
    };

    // Load data
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const [ticketsData, stationsData] = await Promise.all([
                    api.getFuelTickets(),
                    api.getFuelStations()
                ]);
                setRecords(ticketsData || []);
                setStations(stationsData || []);
            } catch (err) {
                console.error("Failed to load fuel data:", err);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    // Filter records
    const filteredRecords = useMemo(() => {
        return records.filter(record => {
            const timeStr = record.timestamp || '';
            const d = timeStr ? new Date(timeStr) : new Date();
            const dateStr = timeStr ? timeStr.substring(0, 10) : '';
            
            if (filterType === 'month') {
                if (!selectedMonths.includes(d.getMonth() + 1) || d.getFullYear() !== selectedYear) return false;
            } else {
                if (startDate && dateStr < startDate) return false;
                if (endDate && dateStr > endDate) return false;
            }

            if (selectedStation !== 'ALL' && record.pumpName !== selectedStation) return false;
            if (selectedDriver !== 'ALL' && record.driverUsername !== selectedDriver) return false;
            if (selectedStatus !== 'ALL' && record.status !== selectedStatus) return false;

            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const driverName = getDriverName(record.driverUsername).toLowerCase();
                const match =
                    driverName.includes(term) ||
                    record.driverUsername?.toLowerCase().includes(term) ||
                    record.licensePlate?.toLowerCase().includes(term) ||
                    record.pumpName?.toLowerCase().includes(term) ||
                    record.location?.toLowerCase().includes(term);
                if (!match) return false;
            }

            return true;
        }).sort((a: any, b: any) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
    }, [records, filterType, selectedMonths, selectedYear, startDate, endDate, selectedStation, selectedDriver, selectedStatus, searchTerm, users]);

    const totalPages = Math.ceil(filteredRecords.length / PAGE_SIZE);
    const paginatedRecords = filteredRecords.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    // Totals
    const totals = useMemo(() => {
        const qty = filteredRecords.reduce((s: number, r: any) => s + (r.totalVolume || 0), 0);
        const amount = filteredRecords.reduce((s: number, r: any) => {
            const price = getStationPrice(r.pumpName);
            return s + (r.totalVolume || 0) * price;
        }, 0);
        return { quantity: qty, totalAmount: amount };
    }, [filteredRecords, stations]);

    const uniqueDriverUsernames = useMemo(() => {
        return Array.from(new Set(records.map((r: any) => r.driverUsername).filter(Boolean)));
    }, [records]);

    const uniqueStationNames = useMemo(() => {
        const names = new Set(records.map((r: any) => r.pumpName).filter(Boolean));
        stations.forEach(s => names.add(s.name));
        return Array.from(names);
    }, [records, stations]);

    // Summary Data for Period-End Reporting
    const summaryData = useMemo(() => {
        const map = new Map<string, { driverName: string, licensePlates: Set<string>, totalQuantity: number, totalAmount: number, ticketsCount: number, quotaVolume: number, quotaTickets: number }>();
        
        filteredRecords.forEach((r: any) => {
            const driverName = getDriverName(r.driverUsername);
            const unitPrice = getStationPrice(r.pumpName);
            const amount = (r.totalVolume || 0) * unitPrice;
            
            if (!map.has(r.driverUsername)) {
                map.set(r.driverUsername, { driverName, licensePlates: new Set(), totalQuantity: 0, totalAmount: 0, ticketsCount: 0, quotaVolume: 0, quotaTickets: 0 });
            }
            const data = map.get(r.driverUsername)!;
            if (r.licensePlate) data.licensePlates.add(r.licensePlate.toUpperCase());
            data.totalQuantity += (r.totalVolume || 0);
            data.totalAmount += amount;
            data.ticketsCount += 1;
        });

        // Add Quota from Transport Tickets
        if (tickets && routeConfigs) {
            tickets.forEach(ticket => {
                if (ticket.status !== 'APPROVED') return; // Only count finalized trips
                const dateStr = ticket.dateEnd.substring(0, 10);
                
                let matchesDate = false;
                if (filterType === 'month') {
                    const d = new Date(ticket.dateEnd);
                    matchesDate = selectedMonths.includes(d.getMonth() + 1) && d.getFullYear() === selectedYear;
                } else {
                    matchesDate = (!startDate || dateStr >= startDate) && (!endDate || dateStr <= endDate);
                }

                if (matchesDate) {
                    const driverUser = ticket.driverUsername || ticket.driverName;
                    if (driverUser && (selectedDriver === 'ALL' || selectedDriver === ticket.driverUsername)) {
                        const route = routeConfigs.find(r => r.routeName === ticket.route);
                        const quota = route?.fuel?.quota || 0;
                        
                        const driverKey = ticket.driverUsername || ticket.driverName;
                        if (!map.has(driverKey)) {
                            map.set(driverKey, { driverName: getDriverName(driverKey), licensePlates: new Set(), totalQuantity: 0, totalAmount: 0, ticketsCount: 0, quotaVolume: 0, quotaTickets: 0 });
                        }
                        const data = map.get(driverKey)!;
                        data.quotaVolume += quota;
                        data.quotaTickets += 1;
                    }
                }
            });
        }
        
        return Array.from(map.values()).map(d => {
            const diff = d.quotaVolume - d.totalQuantity;
            const avgPrice = d.totalQuantity > 0 ? (d.totalAmount / d.totalQuantity) : 20000;
            const diffAmount = diff * avgPrice;
            return {
                ...d,
                licensePlates: Array.from(d.licensePlates).join(', '),
                difference: diff,
                differenceAmount: diffAmount
            };
        }).sort((a, b) => b.totalAmount - a.totalAmount);
    }, [filteredRecords, stations, users, tickets, routeConfigs, filterType, selectedMonths, selectedYear, startDate, endDate, selectedDriver]);

    // --- Handlers ---
    const handleApprove = async (record: any) => {
        if (!window.confirm(`Duyệt phiếu ${record.id.slice(-8)} — ${record.totalVolume}L tại ${record.pumpName}?`)) return;
        try {
            await api.approveFuelTicket(record.id, currentUser?.username || 'system');
            setRecords(prev => prev.map(r => r.id === record.id ? { ...r, status: 'APPROVED', approvedBy: currentUser?.username, approvedAt: new Date().toISOString() } : r));
        } catch (err) {
            console.error("Failed to approve:", err);
            alert('Lỗi duyệt phiếu.');
        }
    };

    const handleOpenEdit = (record: any) => {
        setEditingTicket({ ...record });
        setIsEditTicketOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!editingTicket) return;
        try {
            await api.updateFuelTicket(editingTicket.id, {
                totalVolume: editingTicket.totalVolume,
                pumpName: editingTicket.pumpName,
                location: editingTicket.location
            });
            setRecords(prev => prev.map(r => r.id === editingTicket.id ? { ...r, ...editingTicket } : r));
            setIsEditTicketOpen(false);
            setEditingTicket(null);
        } catch (err) {
            console.error("Failed to update:", err);
            alert('Lỗi cập nhật phiếu.');
        }
    };

    // Station management
    const handleAddStation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newStation.name || !newStation.unitPrice) { alert('Nhập đầy đủ tên và đơn giá.'); return; }
        
        try {
            if (editingStation) {
                const updated = await api.updateFuelStation(editingStation.id, {
                    name: newStation.name,
                    unitPrice: newStation.unitPrice,
                    effectiveDate: newStation.effectiveDate,
                    active: newStation.active !== false
                });
                setStations(prev => prev.map(s => s.id === editingStation.id ? { ...s, ...updated } : s));
                setEditingStation(null);
            } else {
                const id = 'STA-' + Date.now().toString(36).toUpperCase();
                const created = await api.createFuelStation({
                    id,
                    name: newStation.name,
                    unitPrice: newStation.unitPrice,
                    effectiveDate: newStation.effectiveDate,
                    active: true,
                    createdAt: new Date().toISOString()
                });
                setStations(prev => [...prev, created]);
            }
            setNewStation({ name: '', unitPrice: 0, effectiveDate: new Date().toISOString().split('T')[0], active: true });
        } catch (err) {
            console.error("Failed to save station:", err);
            alert('Lỗi lưu cây dầu.');
        }
    };

    const handleDeleteStation = async (id: string) => {
        if (!window.confirm('Xóa cây dầu này?')) return;
        try {
            await api.deleteFuelStation(id);
            setStations(prev => prev.filter(s => s.id !== id));
        } catch (err) {
            console.error("Failed to delete station:", err);
            alert('Lỗi xóa cây dầu.');
        }
    };

    const handleExportExcel = () => {
        try {
            const wb = XLSX.utils.book_new();

            if (viewMode === 'DETAILS') {
                const data = filteredRecords.map((r: any, idx: number) => ({
                    'STT': idx + 1,
                    'Ngày đổ': r.timestamp ? format(new Date(r.timestamp), 'dd/MM/yyyy') : '-',
                    'Lái xe': getDriverName(r.driverUsername),
                    'Biển số xe': r.licensePlate || '-',
                    'Cây dầu': r.pumpName || '-',
                    'Số lít': r.totalVolume || 0,
                    'Đơn giá': getStationPrice(r.pumpName),
                    'Thành tiền': (r.totalVolume || 0) * getStationPrice(r.pumpName),
                    'Trạng thái': r.status === 'APPROVED' ? 'Đã duyệt' : 'Chờ duyệt',
                    'Ghi chú': r.location || ''
                }));
                const ws = XLSX.utils.json_to_sheet(data);
                XLSX.utils.book_append_sheet(wb, ws, 'Chi Tiết');
            } else {
                const data = summaryData.map((d, idx) => ({
                    'STT': idx + 1,
                    'Lái xe': d.driverName,
                    'Số chuyến (Vận tải)': d.quotaTickets,
                    'Định mức (Lít)': d.quotaVolume,
                    'Số lần đổ (Phiếu)': d.ticketsCount,
                    'Thực đổ (Lít)': d.totalQuantity,
                    'Dư/Âm (Lít)': d.difference,
                    'Thành tiền (D/Â)': d.differenceAmount
                }));
                const ws = XLSX.utils.json_to_sheet(data);
                XLSX.utils.book_append_sheet(wb, ws, 'Tổng Hợp');
            }

            const fileName = `Bao_Cao_Nhien_Lieu_${viewMode}_${new Date().getTime()}.xlsx`;
            XLSX.writeFile(wb, fileName);
        } catch (error) {
            console.error("Export Excel failed:", error);
            alert("Có lỗi khi xuất Excel.");
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'APPROVED': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 flex items-center gap-1 w-fit"><CheckCircle size={12} /> Đã duyệt</span>;
            default: return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 flex items-center gap-1 w-fit"><Clock size={12} /> Chờ duyệt</span>;
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <Fuel className="text-orange-500" />
                            Quản lý Nhiên Liệu
                        </h2>
                        <p className="text-slate-500 mt-1">Duyệt phiếu xăng dầu — Quản lý cây dầu & đơn giá</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <select className="bg-slate-50 border border-slate-200 text-sm rounded-lg p-2.5 font-bold outline-none" value={filterType} onChange={e => { setFilterType(e.target.value as 'month'|'range'); setCurrentPage(1); }}>
                            <option value="month">Lọc theo tháng</option>
                            <option value="range">Khoảng thời gian</option>
                        </select>
                        {filterType === 'month' ? (
                            <>
                                <div className="relative">
                                    <div 
                                        className="bg-slate-50 border border-slate-200 text-sm rounded-lg py-2.5 px-3 font-bold outline-none cursor-pointer flex items-center justify-between min-w-[120px] max-w-[160px] truncate"
                                        onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}
                                    >
                                        <span>{selectedMonths.length === 0 ? 'Chọn tháng' : `Tháng ${selectedMonths.join(', ')}`}</span>
                                    </div>
                                    {isMonthDropdownOpen && (
                                        <>
                                            <div className="fixed inset-0 z-10" onClick={() => setIsMonthDropdownOpen(false)}></div>
                                            <div className="absolute top-full mt-1 left-0 min-w-[140px] bg-white border border-slate-200 shadow-xl rounded-xl z-20 p-2 grid grid-cols-1 gap-1 max-h-60 overflow-y-auto">
                                                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                                    <label key={m} className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded-lg transition-colors ${selectedMonths.includes(m) ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'}`}>
                                                        <input 
                                                            type="checkbox" 
                                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                            checked={selectedMonths.includes(m)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedMonths(prev => [...prev, m].sort((a,b)=>a-b));
                                                                } else {
                                                                    setSelectedMonths(prev => prev.filter(x => x !== m));
                                                                }
                                                                setCurrentPage(1);
                                                            }}
                                                        />
                                                        <span className="text-sm font-semibold">Tháng {m}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                                <select className="bg-slate-50 border border-slate-200 text-sm rounded-lg p-2.5 font-bold outline-none" value={selectedYear} onChange={e => { setSelectedYear(parseInt(e.target.value)); setCurrentPage(1); }}>
                                    {[2025, 2026].map(y => (
                                        <option key={y} value={y}>Năm {y}</option>
                                    ))}
                                </select>
                            </>
                        ) : (
                            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-1.5">
                                <input type="date" className="bg-transparent text-sm font-bold outline-none" value={startDate} onChange={e => {setStartDate(e.target.value); setCurrentPage(1)}} />
                                <span className="text-slate-400 font-medium">-</span>
                                <input type="date" className="bg-transparent text-sm font-bold outline-none" value={endDate} onChange={e => {setEndDate(e.target.value); setCurrentPage(1)}} />
                            </div>
                        )}
                        {canEdit && (
                            <div className="flex gap-2 ml-4 pl-4 border-l border-slate-200">
                                <button onClick={() => setIsStationModalOpen(true)} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-orange-500/20 active:scale-95">
                                    <Settings size={18} />
                                    <span className="hidden sm:inline">Quản lý Cây dầu</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-4 border-t border-slate-100">
                    <div className="relative md:col-span-2">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Tìm theo lái xe, biển số, ghi chú..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            value={searchTerm}
                            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        />
                    </div>
                    <select
                        className="bg-slate-50 border border-slate-200 text-sm rounded-lg px-3 py-2 font-medium outline-none"
                        value={selectedStation}
                        onChange={e => { setSelectedStation(e.target.value); setCurrentPage(1); }}
                    >
                        <option value="ALL">Tất cả cây dầu</option>
                        {uniqueStationNames.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select
                        className="bg-slate-50 border border-slate-200 text-sm rounded-lg px-3 py-2 font-medium outline-none"
                        value={selectedDriver}
                        onChange={e => { setSelectedDriver(e.target.value); setCurrentPage(1); }}
                    >
                        <option value="ALL">Tất cả lái xe</option>
                        {uniqueDriverUsernames.map(u => {
                            const name = getDriverName(u);
                            return <option key={u} value={u}>{name}</option>;
                        })}
                    </select>
                    <select
                        className="bg-slate-50 border border-slate-200 text-sm rounded-lg px-3 py-2 font-medium outline-none"
                        value={selectedStatus}
                        onChange={e => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
                    >
                        <option value="ALL">Tất cả trạng thái</option>
                        <option value="PENDING">Chờ duyệt</option>
                        <option value="APPROVED">Đã duyệt</option>
                    </select>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase">Số phiếu</p>
                    <p className="text-2xl font-bold text-slate-800 mt-1">{filteredRecords.length}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase">Tổng lít</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(totals.quantity)}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase">Tổng thành tiền</p>
                    <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(totals.totalAmount)} ₫</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase">Chờ duyệt</p>
                    <p className="text-2xl font-bold text-amber-600 mt-1">{filteredRecords.filter((r: any) => r.status === 'PENDING').length}</p>
                </div>
            </div>

            {/* View Mode Toggle & Export */}
            <div className="flex flex-col sm:flex-row justify-between items-center border-b border-slate-200 mb-4 pb-4">
                <div className="flex bg-white rounded-2xl overflow-hidden p-1 shadow-sm w-fit">
                    <button
                        onClick={() => setViewMode('DETAILS')}
                        className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${viewMode === 'DETAILS' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        Danh sách phiếu
                    </button>
                    <button
                        onClick={() => setViewMode('SUMMARY')}
                        className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${viewMode === 'SUMMARY' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        Bảng kê tổng hợp (Kế toán)
                    </button>
                </div>
                <button
                    onClick={handleExportExcel}
                    className="flex items-center gap-2 mt-4 sm:mt-0 px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-md transition-all active:scale-95"
                >
                    <FileSpreadsheet size={18} />
                    Xuất Excel
                </button>
            </div>

            {/* Data table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {viewMode === 'SUMMARY' ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                                    <th className="p-4 w-12 text-center">STT</th>
                                    <th className="p-4">Lái xe</th>
                                    <th className="p-4 text-center">C.Vận tải</th>
                                    <th className="p-4 text-right text-blue-700">Định mức</th>
                                    <th className="p-4 text-center">Lần đổ</th>
                                    <th className="p-4 text-right text-orange-700">Thực đổ</th>
                                    <th className="p-4 text-right text-purple-700">Dư/Âm</th>
                                    <th className="p-4 text-right">Thành tiền (D/Â)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {summaryData.length > 0 ? summaryData.map((data, idx) => (
                                    <tr key={data.driverName} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 text-center text-slate-400 font-medium">{idx + 1}</td>
                                        <td className="p-4 font-bold text-slate-800">{data.driverName}</td>
                                        <td className="p-4 text-center font-bold text-slate-700">{data.quotaTickets}</td>
                                        <td className="p-4 text-right font-mono font-bold text-blue-700">{Number(data.quotaVolume).toLocaleString()}</td>
                                        <td className="p-4 text-center font-bold text-slate-700">{data.ticketsCount}</td>
                                        <td className="p-4 text-right font-mono font-bold text-orange-700">{Number(data.totalQuantity).toLocaleString()}</td>
                                        <td className={`p-4 text-right font-mono font-bold ${data.difference < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                            {(data.difference > 0 ? '+' : '')}{Number(data.difference).toLocaleString()}
                                        </td>
                                        <td className={`p-4 text-right font-mono font-bold ${data.differenceAmount < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                                            {formatCurrency(data.differenceAmount)} ₫
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={8} className="text-center py-12 text-slate-400 italic">Không có dữ liệu tổng hợp</td>
                                    </tr>
                                )}
                            </tbody>
                            {summaryData.length > 0 && (
                                <tfoot className="bg-slate-50 border-t border-slate-200 font-bold text-sm">
                                    <tr>
                                        <td colSpan={2} className="p-4 text-right uppercase text-xs text-slate-500 tracking-wider">Tổng cộng</td>
                                        <td className="p-4 text-center font-bold text-slate-700">{summaryData.reduce((s, d) => s + d.quotaTickets, 0)}</td>
                                        <td className="p-4 text-right font-mono text-blue-700">{summaryData.reduce((s, d) => s + d.quotaVolume, 0).toLocaleString()}</td>
                                        <td className="p-4 text-center font-bold text-slate-700">{summaryData.reduce((s, d) => s + d.ticketsCount, 0)}</td>
                                        <td className="p-4 text-right font-mono text-orange-700">{summaryData.reduce((s, d) => s + d.totalQuantity, 0).toLocaleString()}</td>
                                        <td className={`p-4 text-right font-mono font-bold ${summaryData.reduce((s, d) => s + d.difference, 0) < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                            {summaryData.reduce((s, d) => s + d.difference, 0).toLocaleString()}
                                        </td>
                                        <td className={`p-4 text-right font-mono font-bold ${summaryData.reduce((s, d) => s + d.differenceAmount, 0) < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                                            {formatCurrency(summaryData.reduce((s, d) => s + d.differenceAmount, 0))} ₫
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                                <th className="p-4 w-12 text-center">STT</th>
                                <th className="p-4">Ngày đổ</th>
                                <th className="p-4">Lái xe</th>
                                <th className="p-4">Biển số xe</th>
                                <th className="p-4">Cây dầu</th>
                                <th className="p-4 text-right">Số lít</th>
                                <th className="p-4 text-right">Đơn giá</th>
                                <th className="p-4 text-right">Thành tiền</th>
                                <th className="p-4">Trạng thái</th>
                                <th className="p-4">Ảnh</th>
                                <th className="p-4">Ghi chú</th>
                                {canEdit && <th className="p-4 text-center">Thao tác</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedRecords.map((record: any, index: number) => {
                                const driverName = getDriverName(record.driverUsername);
                                const unitPrice = getStationPrice(record.pumpName);
                                const totalAmount = (record.totalVolume || 0) * unitPrice;
                                return (
                                    <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 text-center text-slate-400 font-medium">{(currentPage - 1) * PAGE_SIZE + index + 1}</td>
                                        <td className="p-4 font-mono text-slate-600">{record.timestamp ? format(new Date(record.timestamp), 'dd/MM/yyyy') : '-'}</td>
                                        <td className="p-4 font-bold text-slate-800">{driverName}</td>
                                        <td className="p-4 font-mono text-slate-600 uppercase">{record.licensePlate || '-'}</td>
                                        <td className="p-4 text-slate-600">{record.pumpName || '-'}</td>
                                        <td className="p-4 text-right font-mono font-bold text-blue-700">{Number(record.totalVolume || 0).toLocaleString()}</td>
                                        <td className="p-4 text-right font-mono text-slate-500">{unitPrice > 0 ? `${formatCurrency(unitPrice)} ₫` : '-'}</td>
                                        <td className="p-4 text-right font-mono font-bold text-red-700">{totalAmount > 0 ? `${formatCurrency(totalAmount)} ₫` : '-'}</td>
                                        <td className="p-4">{getStatusBadge(record.status)}</td>
                                        <td className="p-4">
                                            {record.fuelImage ? (
                                                <button 
                                                    onClick={() => { setImageModalSrc(record.fuelImage); setIsImageModalOpen(true); }}
                                                    className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-all" 
                                                    title="Xem ảnh"
                                                >
                                                    <Image size={16} />
                                                </button>
                                            ) : <span className="text-slate-300 text-xs">-</span>}
                                        </td>
                                        <td className="p-4 text-slate-400 text-xs max-w-[120px] truncate">{record.location || '-'}</td>
                                        {canEdit && (
                                            <td className="p-4 text-center">
                                                <div className="flex justify-center gap-1">
                                                    {record.status === 'PENDING' && (
                                                        <button 
                                                            onClick={() => handleApprove(record)} 
                                                            className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all font-bold text-xs flex items-center gap-1" 
                                                            title="Duyệt"
                                                        >
                                                            <CheckCircle size={16} />
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleOpenEdit(record)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Sửa">
                                                        <Edit2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                            {paginatedRecords.length === 0 && (
                                <tr>
                                    <td colSpan={canEdit ? 12 : 11} className="text-center py-12 text-slate-400 italic">
                                        {isLoading ? 'Đang tải...' : 'Không có phiếu nhiên liệu nào'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        {filteredRecords.length > 0 && (
                            <tfoot className="bg-slate-50 border-t border-slate-200 font-bold text-sm">
                                <tr>
                                    <td colSpan={5} className="p-4 text-right uppercase text-xs text-slate-500 tracking-wider">Tổng cộng</td>
                                    <td className="p-4 text-right font-mono text-blue-700">{formatCurrency(totals.quantity)}</td>
                                    <td className="p-4 text-right"></td>
                                    <td className="p-4 text-right font-mono text-red-700">{formatCurrency(totals.totalAmount)} ₫</td>
                                    <td colSpan={canEdit ? 4 : 3}></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between text-sm text-slate-500">
                        <span>Hiển thị <b className="text-slate-700">{paginatedRecords.length}</b> / <b className="text-slate-700">{filteredRecords.length}</b></span>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 border rounded-lg hover:bg-white disabled:opacity-50"><ArrowLeft size={16} /></button>
                            <span className="font-medium">Trang {currentPage}/{totalPages}</span>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 border rounded-lg hover:bg-white disabled:opacity-50"><ArrowRight size={16} /></button>
                        </div>
                    </div>
                )}
            </div>

            {/* Edit Ticket Modal */}
            {isEditTicketOpen && editingTicket && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]">
                        <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50 flex justify-between items-center shrink-0">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Edit2 size={20} className="text-blue-600" />
                                Sửa Phiếu Nhiên Liệu
                            </h3>
                            <button onClick={() => { setIsEditTicketOpen(false); setEditingTicket(null); }} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4 overflow-y-auto">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Lái xe</label>
                                <p className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700">{getDriverName(editingTicket.driverUsername)} ({editingTicket.licensePlate})</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Số lít</label>
                                    <input type="number" min="0" step="0.01"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold text-lg"
                                        value={editingTicket.totalVolume || ''} onChange={e => setEditingTicket({ ...editingTicket, totalVolume: parseFloat(e.target.value) || 0 })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cây dầu</label>
                                    <select className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                        value={editingTicket.pumpName || ''} onChange={e => setEditingTicket({ ...editingTicket, pumpName: e.target.value })}>
                                        <option value="">-- Chọn --</option>
                                        {stations.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ghi chú</label>
                                <textarea rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                                    value={editingTicket.location || ''} onChange={e => setEditingTicket({ ...editingTicket, location: e.target.value })} />
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => { setIsEditTicketOpen(false); setEditingTicket(null); }} className="px-5 py-2 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-50">Hủy</button>
                                <button onClick={handleSaveEdit} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm transition-colors flex items-center gap-2">
                                    <Save size={16} /> Lưu
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Preview Modal */}
            {isImageModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setIsImageModalOpen(false)}>
                    <div className="max-w-2xl max-h-[80vh] rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                        <img src={imageModalSrc} alt="Ảnh chứng từ" className="max-w-full max-h-[80vh] object-contain" />
                    </div>
                </div>
            )}

            {/* Station Management Modal */}
            {isStationModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
                        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center shrink-0">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Settings size={20} className="text-orange-600" />
                                Quản lý Cây dầu & Đơn giá
                            </h3>
                            <button onClick={() => { setIsStationModalOpen(false); setEditingStation(null); setNewStation({ name: '', unitPrice: 0, effectiveDate: new Date().toISOString().split('T')[0], active: true }); }} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-4">
                            {/* Add/Edit Form */}
                            <form onSubmit={handleAddStation} className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <p className="text-xs font-bold text-slate-500 uppercase">{editingStation ? 'Sửa cây dầu' : 'Thêm cây dầu mới'}</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <input
                                        type="text" placeholder="Tên cây dầu..."
                                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 col-span-2"
                                        value={newStation.name} onChange={e => setNewStation({ ...newStation, name: e.target.value })}
                                    />
                                    <input
                                        type="number" placeholder="Đơn giá (đ/L)"
                                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                        value={newStation.unitPrice || ''} onChange={e => setNewStation({ ...newStation, unitPrice: parseFloat(e.target.value) || 0 })}
                                    />
                                    <div>
                                        <label className="text-[10px] text-slate-400 font-bold uppercase">Ngày hiệu lực</label>
                                        <input
                                            type="date"
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                            value={newStation.effectiveDate || ''} onChange={e => setNewStation({ ...newStation, effectiveDate: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <button type="submit" className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors">
                                    {editingStation ? 'Cập nhật' : 'Thêm mới'}
                                </button>
                                {editingStation && (
                                    <button type="button" onClick={() => { setEditingStation(null); setNewStation({ name: '', unitPrice: 0, effectiveDate: new Date().toISOString().split('T')[0], active: true }); }} className="w-full px-4 py-2 bg-white border border-slate-300 text-slate-600 rounded-lg font-bold text-sm hover:bg-slate-50">
                                        Hủy sửa
                                    </button>
                                )}
                            </form>

                            {/* Station List */}
                            <div className="space-y-2">
                                {stations.map(s => (
                                    <div key={s.id} className={`flex items-center justify-between p-3 rounded-lg border ${s.active ? 'bg-white border-slate-100' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                                        <div>
                                            <p className="font-bold text-slate-700 text-sm">{s.name}</p>
                                            <div className="flex gap-3 mt-0.5">
                                                <p className="text-xs text-orange-600 font-bold">{formatCurrency(s.unitPrice)} ₫/L</p>
                                                <p className="text-xs text-slate-400">Hiệu lực: {s.effectiveDate || '-'}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <button onClick={() => { setEditingStation(s); setNewStation({ name: s.name, unitPrice: s.unitPrice, effectiveDate: s.effectiveDate, active: s.active }); }} className="p-1.5 text-slate-400 hover:text-blue-600 rounded"><Edit2 size={14} /></button>
                                            <button onClick={() => handleDeleteStation(s.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded"><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                ))}
                                {stations.length === 0 && (
                                    <p className="text-center text-slate-400 text-sm py-4 italic">Chưa có cây dầu nào</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
