import React, { useState, useEffect } from 'react';
import { FileText, PlusCircle, CreditCard, Calendar, CheckCircle, Clock, MapPin, Fuel, ArrowLeft } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export const FuelTicketMobile: React.FC = () => {
    const { user } = useAuth();
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'list' | 'create' | 'detail'>('list');
    const [selectedTicket, setSelectedTicket] = useState<any>(null);

    // Form state
    const [formData, setFormData] = useState({
        liters: '',
        totalPrice: '',
        gasStation: '',
        date: new Date().toISOString().slice(0, 10),
        notes: '',
        receiptImage: ''
    });

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, receiptImage: reader.result as string }));
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

    useEffect(() => {
        loadTickets();
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.createFuelTicket({
                ...formData,
                driverUsername: user?.username,
                driverName: user?.name,
                licensePlate: user?.licensePlate
            });
            setViewMode('list');
            setFormData({ liters: '', totalPrice: '', gasStation: '', date: new Date().toISOString().slice(0, 10), notes: '', receiptImage: '' });
            loadTickets();
        } catch (err) {
            console.error('Failed to create fuel ticket', err);
            alert('Có lỗi xảy ra khi tạo phiếu.');
        }
    };

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'APPROVED': return { label: 'Đã duyệt', bg: 'bg-emerald-100', text: 'text-emerald-700', icon: <CheckCircle size={14} className="text-emerald-500" /> };
            case 'REJECTED': return { label: 'Từ chối', bg: 'bg-red-100', text: 'text-red-700', icon: <Clock size={14} className="text-red-500" /> };
            case 'SUBMITTED':
            default: return { label: 'Chờ duyệt', bg: 'bg-blue-100', text: 'text-blue-700', icon: <Clock size={14} className="text-blue-500" /> };
        }
    };

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
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Số lượng (Lít)</label>
                                    <input 
                                        type="number" 
                                        required
                                        value={formData.liters}
                                        onChange={e => setFormData({ ...formData, liters: e.target.value })}
                                        placeholder="VD: 50"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Số Tiền (VNĐ)</label>
                                    <input 
                                        type="number" 
                                        required
                                        value={formData.totalPrice}
                                        onChange={e => setFormData({ ...formData, totalPrice: e.target.value })}
                                        placeholder="VD: 1000000"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-mono"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Cây Xăng</label>
                                <select 
                                    required
                                    value={formData.gasStation}
                                    onChange={e => setFormData({ ...formData, gasStation: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none"
                                >
                                    <option value="" disabled>Chọn cây xăng...</option>
                                    <option value="Petrolimex">Petrolimex</option>
                                    <option value="PVOil">PVOil</option>
                                    <option value="Mipec">Mipec</option>
                                    <option value="Comeco">Comeco</option>
                                    <option value="Sinopec">Sinopec</option>
                                    <option value="Khác">Cây xăng tư nhân / Khác</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Ngày đổ</label>
                                <input 
                                    type="date" 
                                    required
                                    value={formData.date}
                                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Ghi chú thêm</label>
                                <textarea 
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    rows={2}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none"
                                    placeholder="Nhập ghi chú..."
                                ></textarea>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Ảnh chứng từ / Hóa đơn (Tùy chọn)</label>
                                <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center bg-slate-50 relative overflow-hidden focus-within:border-blue-500 active:bg-slate-100 transition-all">
                                    {formData.receiptImage ? (
                                        <div className="relative">
                                            <img src={formData.receiptImage} alt="Chứng từ" className="w-full h-32 object-contain" />
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
                                                <span className="text-white text-xs font-bold">Đổi ảnh khác</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-2 text-slate-400">
                                            <FileText size={28} className="mb-2 opacity-50" />
                                            <span className="text-xs font-medium">Nhấn để chụp ảnh hoặc tải lên</span>
                                        </div>
                                    )}
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        capture="environment"
                                        onChange={handleImageUpload}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                </div>
                            </div>
                        </div>

                        <button 
                            type="submit"
                            className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold flex justify-center items-center gap-2 shadow-lg hover:bg-blue-700 active:scale-[0.98] transition-all"
                        >
                            <CheckCircle size={20} />
                            NỘP PHIẾU
                        </button>
                    </form>
                </div>
            </div>
        );
    }

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
                            <h2 className="font-bold text-sm leading-tight">Chi tiết phiếu</h2>
                            <div className="text-[10px] text-blue-200 uppercase tracking-widest font-semibold">{selectedTicket.id}</div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className={`p-4 ${status.bg} border-b border-slate-100 flex items-center justify-between`}>
                            <div className={`flex items-center gap-2 font-bold ${status.text}`}>
                                {status.icon}
                                {status.label}
                            </div>
                            <span className="text-xs text-slate-500 font-medium">
                                {new Date(selectedTicket.createdAt).toLocaleDateString('vi-VN')}
                            </span>
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Số lượng</p>
                                    <p className="text-lg font-bold text-slate-800">{selectedTicket.liters || 0} <span className="text-sm font-medium">Lít</span></p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Số tiền</p>
                                    <p className="text-lg font-bold text-emerald-600">{Number(selectedTicket.totalPrice || 0).toLocaleString()} <span className="text-sm font-medium">đ</span></p>
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Cây xăng</p>
                                <p className="text-sm font-bold text-slate-700">{selectedTicket.gasStation}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Ngày đổ</p>
                                <p className="text-sm font-bold text-slate-700">
                                    {new Date(selectedTicket.date).toLocaleDateString('vi-VN')}
                                </p>
                            </div>
                            {selectedTicket.notes && (
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Ghi chú</p>
                                    <p className="text-sm italic text-slate-600">{selectedTicket.notes}</p>
                                </div>
                            )}
                            
                            {selectedTicket.receiptImage && (
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Ảnh chứng từ</p>
                                    <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex justify-center p-2 text-center">
                                        <img src={selectedTicket.receiptImage} alt="Receipt" className="max-w-full max-h-[30vh] object-contain rounded-lg" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 pb-10 animate-slide-up">
            <header className="flex justify-between items-center px-1 pt-2">
                <h2 className="text-xl font-bold text-slate-800">Phiếu Nhiên Liệu</h2>
                <button
                    onClick={() => setViewMode('create')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-full text-xs font-bold shadow-sm shadow-blue-200 active:scale-95 transition-all"
                >
                    <PlusCircle size={16} /> Tạo phiếu
                </button>
            </header>

            <div className="space-y-3">
                {loading ? (
                    <div className="flex justify-center p-8"><div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div></div>
                ) : tickets.length > 0 ? (
                    tickets.map(ticket => {
                        const status = getStatusInfo(ticket.status);
                        return (
                            <div 
                                key={ticket.id} 
                                onClick={() => { setSelectedTicket(ticket); setViewMode('detail'); }}
                                className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 active:bg-slate-50 transition-colors cursor-pointer"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                                            <Fuel size={16} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-slate-800">
                                                {selectedTicket?.liters ?? ticket.liters} Lít - <span className="text-emerald-600">{Number(ticket.totalPrice || 0).toLocaleString()}đ</span>
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-medium">{new Date(ticket.date).toLocaleDateString('vi-VN')}</div>
                                        </div>
                                    </div>
                                    <div className={`px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 ${status.bg} ${status.text}`}>
                                        {status.icon}
                                        {status.label}
                                    </div>
                                </div>
                                <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                                    <MapPin size={12} className="text-red-400" />
                                    {ticket.gasStation}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="py-16 text-center">
                        <Fuel size={48} className="mx-auto text-slate-200 mb-2" />
                        <p className="text-sm text-slate-400 font-medium">Bạn chưa có phiếu nhiên liệu nào</p>
                    </div>
                )}
            </div>
        </div>
    );
};
