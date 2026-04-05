import React, { useState, useEffect, useMemo } from 'react';
import { Fuel, Plus, Edit2, Trash2, Search, X, Save, Settings, Truck, ArrowLeft, ArrowRight, Download, Filter } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { format } from 'date-fns';

interface FuelRecord {
    id: string;
    date: string;
    driverName: string;
    driverUsername: string;
    licensePlate: string;
    quantity: number;
    price: number;
    totalAmount: number;
    station: string;
    note: string;
    createdAt: string;
}

interface Station {
    id: string;
    name: string;
    price: number;
}

const DEFAULT_STATIONS: Station[] = [
    { id: '1', name: 'Cây dầu Hòa Khánh', price: 21500 },
    { id: '2', name: 'Cây dầu Hòa Cầm', price: 20800 },
    { id: '3', name: 'Cây dầu Petrolimex 01', price: 22000 },
];

export function FuelManagement({ users = [] }: { users: any[] }) {
    const { user: currentUser } = useAuth();
    const isAdmin = currentUser?.role === 'ADMIN';
    const canEdit = isAdmin || currentUser?.role === 'ACCOUNTANT';

    const [records, setRecords] = useState<FuelRecord[]>([]);
    const [stations, setStations] = useState<Station[]>(DEFAULT_STATIONS);
    const [isLoading, setIsLoading] = useState(true);

    // Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedStation, setSelectedStation] = useState('ALL');
    const [selectedDriver, setSelectedDriver] = useState('ALL');

    // Modal States
    const [isFuelModalOpen, setIsFuelModalOpen] = useState(false);
    const [isStationModalOpen, setIsStationModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<FuelRecord | null>(null);
    const [editingStation, setEditingStation] = useState<Station | null>(null);
    const [newStation, setNewStation] = useState<Partial<Station>>({ name: '', price: 0 });

    // Form State
    const [formData, setFormData] = useState<Partial<FuelRecord>>({
        date: new Date().toISOString().split('T')[0],
        driverName: '',
        driverUsername: '',
        licensePlate: '',
        quantity: 0,
        price: 0,
        totalAmount: 0,
        station: '',
        note: ''
    });

    // Pagination
    const PAGE_SIZE = 15;
    const [currentPage, setCurrentPage] = useState(1);

    const drivers = users.filter(u => u.role === 'DRIVER');

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN').format(amount);
    };

    // Load data
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const data = await api.getFuelTickets();
                setRecords(data || []);
            } catch (err) {
                console.error("Failed to load fuel records:", err);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    // Auto-calculate total
    useEffect(() => {
        if (formData.quantity && formData.price) {
            setFormData(prev => ({
                ...prev,
                totalAmount: (prev.quantity || 0) * (prev.price || 0)
            }));
        }
    }, [formData.quantity, formData.price]);

    // Filter records
    const filteredRecords = useMemo(() => {
        return records.filter(record => {
            // Month/Year
            const d = new Date(record.date);
            if ((d.getMonth() + 1) !== selectedMonth || d.getFullYear() !== selectedYear) return false;

            // Station
            if (selectedStation !== 'ALL' && record.station !== selectedStation) return false;

            // Driver
            if (selectedDriver !== 'ALL' && record.driverName !== selectedDriver && record.driverUsername !== selectedDriver) return false;

            // Search
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const match =
                    record.driverName?.toLowerCase().includes(term) ||
                    record.licensePlate?.toLowerCase().includes(term) ||
                    record.station?.toLowerCase().includes(term) ||
                    record.note?.toLowerCase().includes(term);
                if (!match) return false;
            }

            return true;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [records, selectedMonth, selectedYear, selectedStation, selectedDriver, searchTerm]);

    const totalPages = Math.ceil(filteredRecords.length / PAGE_SIZE);
    const paginatedRecords = filteredRecords.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    // Totals
    const totals = useMemo(() => ({
        quantity: filteredRecords.reduce((s, r) => s + r.quantity, 0),
        totalAmount: filteredRecords.reduce((s, r) => s + r.totalAmount, 0)
    }), [filteredRecords]);

    const uniqueDriverNames = useMemo(() => {
        const names = new Set(records.map(r => r.driverName).filter(Boolean));
        return Array.from(names);
    }, [records]);

    const uniqueStationNames = useMemo(() => {
        const names = new Set(records.map(r => r.station).filter(Boolean));
        stations.forEach(s => names.add(s.name));
        return Array.from(names);
    }, [records, stations]);

    // --- Handlers ---
    const handleOpenCreate = () => {
        setEditingRecord(null);
        setFormData({
            date: new Date().toISOString().split('T')[0],
            driverName: '',
            driverUsername: '',
            licensePlate: '',
            quantity: 0,
            price: 0,
            totalAmount: 0,
            station: '',
            note: ''
        });
        setIsFuelModalOpen(true);
    };

    const handleOpenEdit = (record: FuelRecord) => {
        setEditingRecord(record);
        setFormData({ ...record });
        setIsFuelModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa phiếu này?')) return;
        // For now, remove from local state (could add DELETE API endpoint)
        setRecords(prev => prev.filter(r => r.id !== id));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.driverName || !formData.station || !formData.quantity) {
            alert('Vui lòng nhập đầy đủ Tài xế, Cây dầu và Số lượng.');
            return;
        }

        try {
            if (editingRecord) {
                // Update existing
                const updated = { ...editingRecord, ...formData };
                setRecords(prev => prev.map(r => r.id === editingRecord.id ? updated as FuelRecord : r));
            } else {
                // Create new via API
                const newRecord = {
                    ...formData,
                    id: 'FUEL-' + Date.now(),
                    createdAt: new Date().toISOString(),
                    createdBy: currentUser?.username
                };
                await api.createFuelTicket(newRecord);
                setRecords(prev => [newRecord as FuelRecord, ...prev]);
            }
            setIsFuelModalOpen(false);
        } catch (err) {
            console.error("Failed to save fuel record:", err);
            alert('Lỗi khi lưu phiếu nhiên liệu.');
        }
    };

    const handleDriverSelect = (value: string) => {
        const match = drivers.find(d =>
            d.name === value || d.licensePlate === value || `${d.licensePlate} - ${d.name}` === value
        );
        if (match) {
            setFormData(prev => ({
                ...prev,
                driverName: match.name,
                driverUsername: match.username,
                licensePlate: match.licensePlate || ''
            }));
        } else {
            setFormData(prev => ({ ...prev, driverName: value }));
        }
    };

    const handleStationSelect = (stationName: string) => {
        const station = stations.find(s => s.name === stationName);
        setFormData(prev => ({
            ...prev,
            station: stationName,
            price: station ? station.price : prev.price
        }));
    };

    // Station management
    const handleAddStation = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newStation.name) return;
        if (editingStation) {
            setStations(prev => prev.map(s =>
                s.id === editingStation.id ? { ...s, name: newStation.name!, price: newStation.price || 0 } : s
            ));
            setEditingStation(null);
        } else {
            setStations(prev => [...prev, {
                id: Math.random().toString(36).substr(2, 9),
                name: newStation.name!,
                price: newStation.price || 0
            }]);
        }
        setNewStation({ name: '', price: 0 });
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
                        <p className="text-slate-500 mt-1">Nhật ký đổ nhiên liệu — Đối soát theo Cây dầu</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <select className="bg-slate-50 border border-slate-200 text-sm rounded-lg p-2.5 font-bold outline-none" value={selectedMonth} onChange={e => { setSelectedMonth(parseInt(e.target.value)); setCurrentPage(1); }}>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                <option key={m} value={m}>Tháng {m}</option>
                            ))}
                        </select>
                        <select className="bg-slate-50 border border-slate-200 text-sm rounded-lg p-2.5 font-bold outline-none" value={selectedYear} onChange={e => { setSelectedYear(parseInt(e.target.value)); setCurrentPage(1); }}>
                            {[2023, 2024, 2025, 2026].map(y => (
                                <option key={y} value={y}>Năm {y}</option>
                            ))}
                        </select>
                        {canEdit && (
                            <div className="flex gap-2 ml-4 pl-4 border-l border-slate-200">
                                <button onClick={() => setIsStationModalOpen(true)} className="p-2.5 text-slate-500 hover:bg-slate-50 hover:text-blue-600 rounded-xl transition-all" title="Quản lý Cây dầu">
                                    <Settings size={20} />
                                </button>
                                <button onClick={handleOpenCreate} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-orange-500/20 active:scale-95">
                                    <Plus size={20} />
                                    <span className="hidden sm:inline">Thêm phiếu</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
                    <div className="relative md:col-span-2">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Tìm theo tài xế, biển số, ghi chú..."
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
                        <option value="ALL">Tất cả tài xế</option>
                        {uniqueDriverNames.map(d => <option key={d} value={d}>{d}</option>)}
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
                    <p className="text-xs font-bold text-slate-400 uppercase">ĐG bình quân</p>
                    <p className="text-2xl font-bold text-orange-600 mt-1">
                        {totals.quantity > 0 ? formatCurrency(Math.round(totals.totalAmount / totals.quantity)) : '0'} ₫/L
                    </p>
                </div>
            </div>

            {/* Data table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                                <th className="p-4 w-12 text-center">STT</th>
                                <th className="p-4">Ngày đổ</th>
                                <th className="p-4">Tài xế</th>
                                <th className="p-4">Biển số xe</th>
                                <th className="p-4">Cây dầu</th>
                                <th className="p-4 text-right">Số lít</th>
                                <th className="p-4 text-right">Đơn giá</th>
                                <th className="p-4 text-right">Thành tiền</th>
                                <th className="p-4">Ghi chú</th>
                                {canEdit && <th className="p-4 text-center">Thao tác</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedRecords.map((record, index) => (
                                <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 text-center text-slate-400 font-medium">{(currentPage - 1) * PAGE_SIZE + index + 1}</td>
                                    <td className="p-4 font-mono text-slate-600">{record.date ? format(new Date(record.date), 'dd/MM/yyyy') : '-'}</td>
                                    <td className="p-4 font-bold text-slate-800">{record.driverName}</td>
                                    <td className="p-4 font-mono text-slate-600 uppercase">{record.licensePlate}</td>
                                    <td className="p-4 text-slate-600">{record.station}</td>
                                    <td className="p-4 text-right font-mono font-bold text-blue-700">{record.quantity?.toLocaleString()}</td>
                                    <td className="p-4 text-right font-mono text-slate-500">{formatCurrency(record.price)} ₫</td>
                                    <td className="p-4 text-right font-mono font-bold text-red-700">{formatCurrency(record.totalAmount)} ₫</td>
                                    <td className="p-4 text-slate-400 text-xs max-w-[150px] truncate">{record.note}</td>
                                    {canEdit && (
                                        <td className="p-4 text-center">
                                            <div className="flex justify-center gap-1">
                                                <button onClick={() => handleOpenEdit(record)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Sửa">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(record.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Xóa">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                            {paginatedRecords.length === 0 && (
                                <tr>
                                    <td colSpan={canEdit ? 10 : 9} className="text-center py-12 text-slate-400 italic">
                                        {isLoading ? 'Đang tải...' : 'Không có phiếu nhiên liệu nào trong tháng này'}
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
                                    <td colSpan={canEdit ? 2 : 1}></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>

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

            {/* Fuel Form Modal */}
            {isFuelModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-orange-50 to-amber-50 flex justify-between items-center shrink-0">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Fuel size={20} className="text-orange-600" />
                                {editingRecord ? 'Sửa Phiếu Nhiên Liệu' : 'Thêm Phiếu Mới'}
                            </h3>
                            <button onClick={() => setIsFuelModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ngày đổ</label>
                                    <input type="date" required className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
                                        value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cây dầu</label>
                                    <select required className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
                                        value={formData.station} onChange={e => handleStationSelect(e.target.value)}>
                                        <option value="">-- Chọn cây dầu --</option>
                                        {stations.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tài xế / Biển số</label>
                                <input list="drivers-list" type="text" required placeholder="Nhập tên hoặc biển số..."
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                                    value={formData.driverName} onChange={e => handleDriverSelect(e.target.value)} />
                                <datalist id="drivers-list">
                                    {drivers.map(d => (
                                        <option key={d.username} value={d.name}>{d.licensePlate} — {d.name}</option>
                                    ))}
                                </datalist>
                                {formData.licensePlate && (
                                    <p className="text-[10px] text-blue-600 font-bold mt-1 flex items-center gap-1">
                                        <Truck size={12} /> Biển số: {formData.licensePlate}
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Số lít</label>
                                    <input type="number" required min="0" step="0.01" placeholder="0"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 font-mono font-bold text-lg"
                                        value={formData.quantity || ''} onChange={e => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Đơn giá (₫/L)</label>
                                    <input type="number" required min="0" placeholder="0"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                                        value={formData.price || ''} onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Thành tiền</label>
                                    <div className="px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg font-mono font-bold text-orange-700 text-lg">
                                        {formatCurrency(formData.totalAmount || 0)} ₫
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ghi chú</label>
                                <textarea rows={2} placeholder="Ghi chú (nếu có)..."
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-sm resize-none"
                                    value={formData.note} onChange={e => setFormData({ ...formData, note: e.target.value })} />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setIsFuelModalOpen(false)} className="px-5 py-2 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-50">Hủy</button>
                                <button type="submit" className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg shadow-sm transition-colors flex items-center gap-2">
                                    <Save size={16} /> Lưu phiếu
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Station Management Modal */}
            {isStationModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
                        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center shrink-0">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Settings size={20} className="text-blue-600" />
                                Quản lý Cây dầu
                            </h3>
                            <button onClick={() => setIsStationModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-4">
                            {/* Add/Edit Form */}
                            <form onSubmit={handleAddStation} className="flex gap-2">
                                <input
                                    type="text" placeholder="Tên cây dầu..."
                                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                    value={newStation.name} onChange={e => setNewStation({ ...newStation, name: e.target.value })}
                                />
                                <input
                                    type="number" placeholder="Giá mặc định"
                                    className="w-28 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                    value={newStation.price || ''} onChange={e => setNewStation({ ...newStation, price: parseFloat(e.target.value) || 0 })}
                                />
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700">
                                    {editingStation ? 'Sửa' : 'Thêm'}
                                </button>
                            </form>

                            {/* Station List */}
                            <div className="space-y-2">
                                {stations.map(s => (
                                    <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                        <div>
                                            <p className="font-bold text-slate-700 text-sm">{s.name}</p>
                                            <p className="text-xs text-slate-400">Giá mặc định: {formatCurrency(s.price)} ₫/L</p>
                                        </div>
                                        <div className="flex gap-1">
                                            <button onClick={() => { setEditingStation(s); setNewStation({ name: s.name, price: s.price }); }} className="p-1.5 text-slate-400 hover:text-blue-600 rounded"><Edit2 size={14} /></button>
                                            <button onClick={() => { if (window.confirm('Xóa cây dầu này?')) setStations(prev => prev.filter(x => x.id !== s.id)); }} className="p-1.5 text-slate-400 hover:text-red-600 rounded"><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
