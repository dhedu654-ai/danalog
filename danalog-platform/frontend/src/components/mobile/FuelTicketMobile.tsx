import React, { useState, useEffect, useMemo } from 'react';
import { FileText, CheckCircle, Clock, Fuel, ArrowLeft, AlertTriangle } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export const FuelTicketMobile: React.FC = () => {
    const { user } = useAuth();
    const [tickets, setTickets] = useState<any[]>([]);
    const [stations, setStations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'list' | 'create' | 'detail'>('list');
    const [selectedTicket, setSelectedTicket] = useState<any>(null);

    // Filters
    const [filterType, setFilterType] = useState<'month'|'range'>('month');
    const [selectedMonths, setSelectedMonths] = useState<number[]>([new Date().getMonth() + 1]);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedStations, setSelectedStations] = useState<string[]>([]);
    const [isStationDropdownOpen, setIsStationDropdownOpen] = useState(false);

    // Form state — simplified: only liters, station, image, note
    const [formData, setFormData] = useState({
        totalVolume: '',
        pumpName: '',
        location: '',  // Used as note
        fuelImage: ''
    });

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, fuelImage: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const loadTickets = async () => {
        setLoading(true);
        try {
            const data = await api.getFuelTickets(user?.username);
            setTickets(data);
        } catch (err) {
            console.error('Failed to load fuel tickets', err);
        }
        setLoading(false);
    };

    const loadStations = async () => {
        try {
            const data = await api.getFuelStations();
            setStations(data.filter((s: any) => s.active));
        } catch (err) {
            console.error('Failed to load stations', err);
            // Fallback to empty
            setStations([]);
        }
    };

    useEffect(() => {
        loadTickets();
        loadStations();
    }, [user]);

    // Get driver's fuel capacity from their profile (set by admin)
    const fuelCapacity = user?.fuelCapacity ? Number(user.fuelCapacity) : 0; // 0 = not set yet

    const uniqueStations = useMemo(() => {
        return Array.from(new Set(tickets.map(t => t.pumpName).filter(Boolean)));
    }, [tickets]);

    const filteredTickets = useMemo(() => {
        return tickets.filter(t => {
            const dateStr = t.timestamp || '';
            if (!dateStr) return true;
            const d = new Date(dateStr);
            if (filterType === 'month') {
                if (selectedYear !== 0 && d.getFullYear() !== selectedYear) return false;
                if (selectedMonths.length > 0 && !selectedMonths.includes(d.getMonth() + 1)) return false;
            } else {
                const dateOnly = dateStr.slice(0, 10);
                if (startDate && dateOnly < startDate) return false;
                if (endDate && dateOnly > endDate) return false;
            }
            if (selectedStations.length > 0 && !selectedStations.includes(t.pumpName)) return false;
            return true;
        }).sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [tickets, filterType, selectedMonths, selectedYear, startDate, endDate, selectedStations]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const volume = Number(formData.totalVolume);
        if (!volume || volume <= 0) {
            alert('Vui lòng nhập số lít hợp lệ.');
            return;
        }
        if (fuelCapacity > 0 && volume > fuelCapacity) {
            alert(`Số lít vượt quá dung tích bình xe (${fuelCapacity}L). Vui lòng kiểm tra lại.`);
            return;
        }
        if (!formData.pumpName) {
            alert('Vui lòng chọn cây xăng.');
            return;
        }

        try {
            const ticketId = `FUEL-${Date.now()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
            await api.createFuelTicket({
                id: ticketId,
                driverUsername: user?.username,
                licensePlate: user?.licensePlate || '',
                totalVolume: volume,
                pumpName: formData.pumpName || null,
                location: formData.location || null,
                fuelImage: formData.fuelImage || null,
                status: 'PENDING'
            });
            setViewMode('list');
            setFormData({ totalVolume: '', pumpName: '', location: '', fuelImage: '' });
            loadTickets();
        } catch (err) {
            console.error('Failed to create fuel ticket', err);
            alert('Có lỗi xảy ra khi tạo phiếu: ' + (err instanceof Error ? err.message : ''));
        }
    };

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'APPROVED': return { label: 'Đã duyệt', bg: 'bg-emerald-100', text: 'text-emerald-700', icon: <CheckCircle size={14} className="text-emerald-500" /> };
            default: return { label: 'Chờ duyệt', bg: 'bg-amber-100', text: 'text-amber-700', icon: <Clock size={14} className="text-amber-500" /> };
        }
    };

    // =================== CREATE VIEW ===================
    if (viewMode === 'create') {
        return (
            <div className="absolute inset-0 z-[60] flex flex-col bg-slate-50 animate-slide-up w-full h-full">
                <header className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-4 flex items-center gap-3 shrink-0 shadow-md">
                    <button onClick={() => setViewMode('list')} className="p-1 hover:bg-white/20 rounded-full transition-colors -ml-1">
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h2 className="font-bold text-sm leading-tight">Tạo Phiếu Nhiên Liệu</h2>
                    </div>
                </header>
                
                <div className="flex-1 overflow-y-auto p-4">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-4">
                            {/* Fuel capacity warning */}
                            {fuelCapacity > 0 ? (
                                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
                                    <AlertTriangle size={16} className="text-blue-500 shrink-0" />
                                    <span className="text-xs text-blue-700 font-medium">
                                        Dung tích bình xe: <strong>{fuelCapacity}L</strong> — Không được nhập vượt quá.
                                    </span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
                                    <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                                    <span className="text-xs text-amber-700 font-medium">
                                        Dung tích bình chưa được cài đặt. Liên hệ Admin để cập nhật.
                                    </span>
                                </div>
                            )}

                            {/* Số lít */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Số lượng (Lít) *</label>
                                <input 
                                    type="number" 
                                    required
                                    max={fuelCapacity > 0 ? fuelCapacity : undefined}
                                    value={formData.totalVolume}
                                    onChange={e => setFormData({ ...formData, totalVolume: e.target.value })}
                                    placeholder={fuelCapacity > 0 ? `Tối đa ${fuelCapacity}L` : 'Nhập số lít'}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-lg font-bold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-mono"
                                />
                                {fuelCapacity > 0 && Number(formData.totalVolume) > fuelCapacity && (
                                    <p className="text-xs text-red-500 font-bold mt-1">⚠ Vượt quá dung tích bình xe!</p>
                                )}
                            </div>

                            {/* Cây xăng - từ DB */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Cây Xăng *</label>
                                <select 
                                    required
                                    value={formData.pumpName}
                                    onChange={e => setFormData({ ...formData, pumpName: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none"
                                >
                                    <option value="" disabled>Chọn cây xăng...</option>
                                    {stations.map((s: any) => (
                                        <option key={s.id} value={s.name}>{s.name}</option>
                                    ))}
                                </select>
                                {stations.length === 0 && (
                                    <p className="text-xs text-amber-500 mt-1">Đang tải danh sách cây xăng...</p>
                                )}
                            </div>

                            {/* Ghi chú */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Ghi chú (nếu có)</label>
                                <textarea 
                                    value={formData.location}
                                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                                    placeholder="Nhập ghi chú..."
                                    rows={2}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none"
                                />
                            </div>

                            {/* Ảnh chứng từ */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Ảnh chứng từ</label>
                                <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center bg-slate-50 relative overflow-hidden focus-within:border-blue-500 active:bg-slate-100 transition-all">
                                    {formData.fuelImage ? (
                                        <img src={formData.fuelImage} alt="Chứng từ" className="w-full h-32 object-contain" />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-4 text-slate-400">
                                            <FileText size={32} className="mb-2 opacity-50" />
                                            <span className="text-xs font-medium">Nhấn để chụp ảnh hoặc tải lên</span>
                                        </div>
                                    )}
                                    <input type="file" accept="image/*" capture="environment" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                </div>
                            </div>
                        </div>

                        <button 
                            type="submit"
                            disabled={fuelCapacity > 0 && Number(formData.totalVolume) > fuelCapacity}
                            className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold flex justify-center items-center gap-2 shadow-lg hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <CheckCircle size={20} />
                            NỘP PHIẾU
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // =================== DETAIL VIEW ===================
    if (viewMode === 'detail' && selectedTicket) {
        const status = getStatusInfo(selectedTicket.status);
        return (
            <div className="absolute inset-0 z-[60] flex flex-col bg-slate-50 animate-slide-up w-full h-full">
                <header className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-4 flex justify-between items-center shrink-0 shadow-md">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setViewMode('list')} className="p-1 hover:bg-white/20 rounded-full transition-colors -ml-1">
                            <ArrowLeft size={24} />
                        </button>
                        <div>
                            <h2 className="font-bold text-sm leading-tight">Chi tiết Phiếu</h2>
                            <p className="text-[10px] text-blue-200 font-mono mt-0.5">{selectedTicket.id}</p>
                        </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${status.bg} ${status.text} flex items-center gap-1`}>
                        {status.icon} {status.label}
                    </span>
                </header>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Số lượng</p>
                                <p className="text-lg font-bold text-slate-800">{selectedTicket.totalVolume || 0} <span className="text-sm font-medium">Lít</span></p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Cây xăng</p>
                                <p className="text-sm font-bold text-slate-700">{selectedTicket.pumpName || '-'}</p>
                            </div>
                        </div>
                        {selectedTicket.location && (
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Ghi chú</p>
                                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                    <p className="text-sm text-slate-700">{selectedTicket.location}</p>
                                </div>
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Ngày tạo</p>
                                <p className="text-sm font-bold text-slate-700">
                                    {new Date(selectedTicket.timestamp).toLocaleDateString('vi-VN')}
                                </p>
                            </div>
                            {selectedTicket.approvedBy && (
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Người duyệt</p>
                                    <p className="text-sm font-bold text-emerald-600">{selectedTicket.approvedBy}</p>
                                </div>
                            )}
                        </div>
                        
                        {selectedTicket.fuelImage && (
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Ảnh chứng từ</p>
                                <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex justify-center p-2 text-center">
                                    <img src={selectedTicket.fuelImage} alt="Chứng từ" className="max-w-full max-h-[30vh] object-contain rounded-lg" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // =================== LIST VIEW ===================
    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Fuel size={20} className="text-blue-600" />
                        Phiếu Nhiên Liệu
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">Tổng: {filteredTickets.length} phiếu</p>
                </div>
                <button
                    onClick={() => setViewMode('create')}
                    className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
                >
                    <Fuel size={16} />
                    Tạo phiếu
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm space-y-2">
                <div className="flex gap-2">
                    <select
                        className="flex-1 bg-slate-50 border border-slate-200 text-xs rounded-lg p-2 font-bold outline-none"
                        value={filterType}
                        onChange={e => setFilterType(e.target.value as 'month'|'range')}
                    >
                        <option value="month">Theo tháng</option>
                        <option value="range">Khoảng ngày</option>
                    </select>
                    {filterType === 'month' ? (
                        <>
                            <div className="relative flex-1">
                                <div 
                                    className="bg-slate-50 border border-slate-200 text-xs rounded-lg p-2 font-bold cursor-pointer truncate"
                                    onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}
                                >
                                    {selectedMonths.length === 0 ? 'Chọn tháng' : `T${selectedMonths.join(', ')}`}
                                </div>
                                {isMonthDropdownOpen && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setIsMonthDropdownOpen(false)}></div>
                                        <div className="absolute top-full mt-1 left-0 w-40 bg-white border shadow-xl rounded-xl z-20 p-2 grid grid-cols-1 gap-1 max-h-48 overflow-y-auto">
                                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                                <label key={m} className={`flex items-center gap-1 px-2 py-1 cursor-pointer rounded-lg text-xs ${selectedMonths.includes(m) ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'}`}>
                                                    <input 
                                                        type="checkbox" 
                                                        className="rounded border-slate-300 text-blue-600"
                                                        checked={selectedMonths.includes(m)}
                                                        onChange={e => {
                                                            if (e.target.checked) setSelectedMonths(prev => [...prev, m].sort((a,b)=>a-b));
                                                            else setSelectedMonths(prev => prev.filter(x => x !== m));
                                                        }}
                                                    />
                                                    <span className="font-semibold">T{m}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                            <select className="bg-slate-50 border border-slate-200 text-xs rounded-lg p-2 font-bold outline-none" value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}>
                                {[2025, 2026].map(y => (<option key={y} value={y}>{y}</option>))}
                            </select>
                        </>
                    ) : (
                        <div className="flex items-center gap-1 flex-1">
                            <input type="date" className="flex-1 bg-slate-50 border border-slate-200 text-xs rounded-lg p-2 font-bold outline-none" value={startDate} onChange={e => setStartDate(e.target.value)} />
                            <span className="text-slate-300">-</span>
                            <input type="date" className="flex-1 bg-slate-50 border border-slate-200 text-xs rounded-lg p-2 font-bold outline-none" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </div>
                    )}
                </div>
                {uniqueStations.length > 0 && (
                    <div className="relative">
                        <div 
                            className="bg-slate-50 border border-slate-200 text-xs rounded-lg p-2 font-bold cursor-pointer truncate"
                            onClick={() => setIsStationDropdownOpen(!isStationDropdownOpen)}
                        >
                            {selectedStations.length === 0 ? 'Tất cả cây xăng' : selectedStations.join(', ')}
                        </div>
                        {isStationDropdownOpen && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setIsStationDropdownOpen(false)}></div>
                                <div className="absolute top-full mt-1 left-0 right-0 bg-white border shadow-xl rounded-xl z-20 p-2 max-h-48 overflow-y-auto">
                                    {uniqueStations.map(s => (
                                        <label key={s} className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded-lg text-xs ${selectedStations.includes(s) ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'}`}>
                                            <input 
                                                type="checkbox" 
                                                className="rounded"
                                                checked={selectedStations.includes(s)}
                                                onChange={e => {
                                                    if (e.target.checked) setSelectedStations(prev => [...prev, s]);
                                                    else setSelectedStations(prev => prev.filter(x => x !== s));
                                                }}
                                            />
                                            <span className="font-semibold">{s}</span>
                                        </label>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Ticket List */}
            {loading ? (
                <div className="text-center py-8 text-slate-400 text-sm">Đang tải...</div>
            ) : filteredTickets.length === 0 ? (
                <div className="text-center py-12">
                    <Fuel size={40} className="mx-auto text-slate-200 mb-3" />
                    <p className="text-slate-400 text-sm">Chưa có phiếu nhiên liệu nào</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filteredTickets.map((ticket: any) => {
                        const status = getStatusInfo(ticket.status);
                        return (
                            <div
                                key={ticket.id}
                                onClick={() => { setSelectedTicket(ticket); setViewMode('detail'); }}
                                className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm active:scale-[0.98] transition-all cursor-pointer"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                                            <Fuel size={18} />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-sm font-bold text-slate-800">
                                                {ticket.totalVolume || 0} Lít — {ticket.pumpName || 'N/A'}
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-medium">{new Date(ticket.timestamp).toLocaleDateString('vi-VN')}</div>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${status.bg} ${status.text} flex items-center gap-1 shrink-0`}>
                                        {status.icon} {status.label}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
