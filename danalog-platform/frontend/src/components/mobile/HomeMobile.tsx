import React, { useState, useEffect, useCallback } from 'react';
import { Bell, CheckCircle, XCircle, Truck, Clock, MapPin, Package, FileText, AlertTriangle } from 'lucide-react';
import { api } from '../../services/api';
import { DriverResponse } from '../../types';

interface HomeMobileProps {
    tickets: any[];
    currentUser: any;
    onRefresh: () => void;
    onNavigate: (tab: string) => void;
}

export const HomeMobile: React.FC<HomeMobileProps> = ({ tickets, currentUser, onRefresh, onNavigate }) => {
    const [pendingResponses, setPendingResponses] = useState<DriverResponse[]>([]);
    const [respondingTo, setRespondingTo] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const loadResponses = useCallback(async () => {
        try {
            const allResponses = await api.getDriverResponses();
            const mine = allResponses.filter((r: DriverResponse) => r.driverId === currentUser?.username);
            setPendingResponses(mine);
        } catch (err) {
            console.error('Failed to load responses:', err);
        }
        setLoading(false);
    }, [currentUser]);

    useEffect(() => { loadResponses(); }, [loadResponses]);

    const handleAccept = async (ticketId: string) => {
        setRespondingTo(ticketId);
        try {
            await api.respondToDispatch(ticketId, 'ACCEPTED', undefined, currentUser?.username);
            await loadResponses();
            onRefresh();
        } catch (err) {
            console.error('Accept failed:', err);
        }
        setRespondingTo(null);
    };

    const handleReject = async (ticketId: string) => {
        setRespondingTo(ticketId);
        try {
            await api.respondToDispatch(ticketId, 'REJECTED', rejectReason || 'Không có lý do', currentUser?.username);
            setShowRejectModal(null);
            setRejectReason('');
            await loadResponses();
            onRefresh();
        } catch (err) {
            console.error('Reject failed:', err);
        }
        setRespondingTo(null);
    };

    const pending = pendingResponses.filter(r => r.response === 'PENDING');
    
    // Find active trip: Ticket assigned to user, not completed/cancelled
    const activeTrip = tickets.find(t => 
        t.assignedDriverId === currentUser?.username && 
        ['ACCEPTED', 'ON_THE_WAY', 'IN_PROGRESS', 'ARRIVED'].includes(t.status)
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                    onClick={() => onNavigate('fuel')}
                    className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center gap-2"
                >
                    <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                        <FileText size={24} />
                    </div>
                    <span className="font-bold text-slate-700 text-sm">Phiếu Nhiên Liệu</span>
                </button>

                <button
                    onClick={() => alert("Chức năng báo cáo sự cố đang phát triển.")}
                    className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center gap-2"
                >
                    <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                        <AlertTriangle size={24} />
                    </div>
                    <span className="font-bold text-slate-700 text-sm">Báo Sự Cố</span>
                </button>
            </div>

            {/* Active Trip */}
            {activeTrip ? (
                <div>
                    <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                        <Truck size={16} className="text-blue-500" />
                        Chuyến đi hiện tại đang chạy
                    </h3>
                    <div 
                        className="bg-white rounded-xl shadow border border-blue-500 overflow-hidden mb-3 cursor-pointer"
                        onClick={() => onNavigate('history')} // They will click to go to History/Detail to update it
                    >
                        <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex justify-between items-center">
                            <span className="font-bold text-lg truncate flex-1 pr-2">{activeTrip.route || 'Chuyến đi'}</span>
                            <span className="bg-white/20 px-2 py-1 rounded-full text-xs font-bold uppercase shrink-0">{activeTrip.status}</span>
                        </div>
                        <div className="p-4 space-y-3">
                            <div className="flex items-start gap-3">
                                <MapPin size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                                <div>
                                    <div className="text-xs text-slate-400 uppercase font-bold">Điểm lấy hàng</div>
                                    <div className="text-sm text-slate-700 font-medium">{activeTrip.pickupLocation || '-'}</div>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <MapPin size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                                <div>
                                    <div className="text-xs text-slate-400 uppercase font-bold">Điểm giao hàng</div>
                                    <div className="text-sm text-slate-700 font-medium">{activeTrip.deliveryLocation || '-'}</div>
                                </div>
                            </div>
                            <div className="mt-2 text-center">
                                <span className="text-xs text-blue-500 font-medium italic select-none">Nhấn để xem chi tiết hoặc cập nhật trạng thái...</span>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                !(pending.length > 0) && (
                    <div className="bg-white rounded-xl p-8 text-center border border-slate-200 shadow-sm mt-4">
                        <CheckCircle size={48} className="mx-auto mb-3 text-emerald-300" />
                        <h4 className="font-bold text-slate-700 mb-1">Đang rảnh / Chờ lệnh</h4>
                        <p className="text-xs text-slate-400">Chưa có chuyến đi nào đang chạy.</p>
                    </div>
                )
            )}

            {/* Pending Requests */}
            {pending.length > 0 && (
                <div>
                    <h3 className="text-sm font-bold text-amber-600 mb-3 flex items-center gap-2">
                        <Bell size={16} />
                        Lệnh mới cần phản hồi ({pending.length})
                    </h3>
                    {pending.map(r => {
                        const ticket = tickets.find(t => t.id === r.ticketId);
                        return (
                            <div key={r.id} className="bg-amber-50 rounded-xl shadow-sm border border-amber-200 overflow-hidden mb-3">
                                <div className="p-4 border-b border-amber-200/50">
                                    <div className="text-xs text-amber-600 font-bold mb-1">#{r.ticketId?.slice(-8)}</div>
                                    <div className="text-lg font-bold text-slate-800">
                                        {ticket?.route || r.route || 'Tuyến đường'}
                                    </div>
                                </div>

                                <div className="p-4 space-y-3">
                                    {ticket && (
                                        <>
                                            <div className="flex items-start gap-3">
                                                <MapPin size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                                                <div>
                                                    <div className="text-xs text-slate-500 uppercase font-bold">Lấy hàng</div>
                                                    <div className="text-sm text-slate-800 font-medium">{ticket.pickupLocation || '-'}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <MapPin size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                                                <div>
                                                    <div className="text-xs text-slate-500 uppercase font-bold">Giao hàng</div>
                                                    <div className="text-sm text-slate-800 font-medium">{ticket.deliveryLocation || '-'}</div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2 mt-2 border-t border-amber-200/50 pt-2">
                                                <div className="text-center">
                                                    <div className="text-[10px] text-slate-400 uppercase font-bold">Container</div>
                                                    <div className="text-sm font-bold text-slate-700">{ticket.size || '-'} {ticket.fe || ''}</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-[10px] text-slate-400 uppercase font-bold">Hàng hóa</div>
                                                    <div className="text-sm font-bold text-slate-700 truncate px-1">{ticket.cargoType || 'Khác'}</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-[10px] text-slate-400 uppercase font-bold">Ngày nhận</div>
                                                    <div className="text-sm font-bold text-slate-700">{ticket.dateStart ? new Date(ticket.dateStart).toLocaleDateString() : '-'}</div>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {/* Buttons */}
                                    <div className="flex gap-2 pt-2">
                                        <button
                                            onClick={() => setShowRejectModal(r.ticketId)}
                                            disabled={respondingTo === r.ticketId}
                                            className="flex-1 py-3 bg-white text-slate-600 border border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-50 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                        >
                                            <XCircle size={18} className="text-red-500" /> TỪ CHỐI
                                        </button>
                                        <button
                                            onClick={() => handleAccept(r.ticketId)}
                                            disabled={respondingTo === r.ticketId}
                                            className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                        >
                                            {respondingTo === r.ticketId ? (
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <><CheckCircle size={18} /> ĐỒNG Ý NHẬN</>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Reject Modal */}
                                {showRejectModal === r.ticketId && (
                                    <div className="p-4 border-t border-amber-200 bg-white">
                                        <label className="text-xs font-bold text-slate-700 uppercase mb-2 block">Lý do từ chối (bắt buộc)</label>
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {['Xe hỏng', 'Quá giờ làm việc', 'Sai loại xe', 'Khác'].map(reason => (
                                                <button
                                                    key={reason}
                                                    onClick={() => setRejectReason(reason)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${rejectReason === reason ? 'bg-red-50 text-red-700 border-red-500' : 'bg-slate-50 text-slate-600 border-slate-200'}`}
                                                >
                                                    {reason}
                                                </button>
                                            ))}
                                        </div>
                                        {rejectReason === 'Khác' && (
                                            <input
                                                type="text"
                                                placeholder="Nhập lý do chi tiết..."
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                onChange={(e) => setRejectReason(e.target.value)}
                                            />
                                        )}
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => { setShowRejectModal(null); setRejectReason(''); }}
                                                className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold"
                                            >Hủy</button>
                                            <button
                                                onClick={() => handleReject(r.ticketId)}
                                                disabled={!rejectReason || respondingTo === r.ticketId}
                                                className="flex-[2] py-2 bg-red-600 text-white rounded-lg text-xs font-bold disabled:opacity-50"
                                            >Chắc chắn từ chối</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
