import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, CheckCircle, XCircle, Truck, MapPin, FileText, Edit, Calendar, Package } from 'lucide-react';
import { api } from '../../services/api';
import { DriverResponse, TransportTicket } from '../../types';
import { CreateTicketMobile } from './CreateTicketMobile';

interface HomeMobileProps {
    tickets: any[];
    currentUser: any;
    routeConfigs?: any[];
    onRefresh: () => void;
    onNavigate: (tab: string) => void;
    onUpdateTickets?: (tickets: any[]) => void;
    onUpdateSingleTicket?: (ticket: any) => Promise<void>;
}

export const HomeMobile: React.FC<HomeMobileProps> = ({ tickets, routeConfigs, currentUser, onRefresh, onNavigate, onUpdateTickets, onUpdateSingleTicket }) => {
    const [pendingResponses, setPendingResponses] = useState<DriverResponse[]>([]);
    const [respondingTo, setRespondingTo] = useState<string | null>(null);
    const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState<string>('');
    const [customRejectReason, setCustomRejectReason] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [editingTicket, setEditingTicket] = useState<TransportTicket | null>(null);

    const onUpdateTicketsRef = useRef(onUpdateTickets);
    useEffect(() => {
        onUpdateTicketsRef.current = onUpdateTickets;
    }, [onUpdateTickets]);

    const loadResponses = useCallback(async () => {
        try {
            const allResponses = await api.getDriverResponses();
            const mine = allResponses.filter((r: any) => 
                r.driverId === currentUser?.username && 
                r.response !== 'REVOKED_SYSTEM'
            ) as unknown as DriverResponse[];
            setPendingResponses(mine);
            
            // Also refresh tickets to get updated dispatchStatus
            if (onUpdateTicketsRef.current) {
                const freshTickets = await api.getTickets({ username: currentUser?.username, role: currentUser?.role });
                onUpdateTicketsRef.current(freshTickets || []);
            }
        } catch (err) {
            console.error('Failed to load responses/tickets:', err);
        }
        setLoading(false);
    }, [currentUser]);    useEffect(() => { 
        loadResponses(); 
        // Auto-refresh responses every 30 seconds
        const interval = setInterval(loadResponses, 30000);
        return () => clearInterval(interval);
    }, [loadResponses]);

    const handleAccept = async (ticketId: string) => {
        setRespondingTo(ticketId);
        try {
            await api.respondToDispatch(ticketId, 'ACCEPT', undefined, undefined, currentUser?.username);
            await loadResponses();
            onRefresh();
        } catch (err: any) {
            console.error('Accept failed:', err);
            alert('Lỗi nhận lệnh: ' + err.message);
        }
        setRespondingTo(null);
    };

    const handleReject = async (ticketId: string) => {
        setRespondingTo(ticketId);
        try {
            await api.respondToDispatch(ticketId, 'REJECT', undefined, rejectReason || 'Không có lý do', currentUser?.username);
            setShowRejectModal(null);
            setRejectReason('');
            await loadResponses();
            onRefresh();
        } catch (err: any) {
            console.error('Reject failed:', err);
            alert('Lỗi từ chối lệnh: ' + err.message);
        }
        setRespondingTo(null);
    };

    const handleUpdateStatus = async (ticket: any, newStatus: string) => {
        if (!onUpdateTickets) return;
        setRespondingTo(ticket.id);
        
        try {
            const fieldsToUpdate: any = { dispatchStatus: newStatus };
            const nowISO = new Date().toISOString();

            // Build new statusHistory entry
            const historyEntry: any = {
                timestamp: nowISO,
                user: currentUser?.name || currentUser?.username || 'Lái xe',
            };

            if (newStatus === 'IN_PROGRESS') {
                fieldsToUpdate.status = 'ĐANG VẬN CHUYỂN';
                fieldsToUpdate.dateStart = nowISO;
                historyEntry.status = 'IN_PROGRESS';
                historyEntry.action = 'Bắt đầu chuyến đi';
            } else if (newStatus === 'COMPLETED') {
                fieldsToUpdate.status = 'COMPLETED';
                fieldsToUpdate.dateEnd = nowISO;
                historyEntry.status = 'COMPLETED';
                historyEntry.action = 'Kết thúc chuyến đi';
            }

            // Prepend to statusHistory
            const existingHistory = Array.isArray(ticket.statusHistory) ? ticket.statusHistory : [];
            fieldsToUpdate.statusHistory = [historyEntry, ...existingHistory];

            // Optimistic update
            const updatedTicket = { ...ticket, ...fieldsToUpdate };
            onUpdateTickets(tickets.map(t => t.id === ticket.id ? updatedTicket : t));
            
            await api.updateTicket(ticket.id, fieldsToUpdate);
            
            // Auto-redirect to edit page when completed
            if (newStatus === 'COMPLETED') {
                setEditingTicket(updatedTicket);
            }
        } catch (err) {
            console.error('Update status failed:', err);
            // Rollback optimistic update on error by refetching
            onRefresh();
            alert("Lỗi khi cập nhật trạng thái. Vui lòng thử lại.");
        }
        setRespondingTo(null);
    };

    // Filter pending responses: only show PENDING (i.e. WAITING logs mapped to PENDING)
    // that belong to this driver. After accept/reject the backend changes responseStatus
    // so they will no longer be PENDING on next refresh.
    const pending = pendingResponses.filter(r => {
        if (r.response !== 'PENDING') return false;
        // Only show if this driver is the assigned driver in the log
        if (r.driverId !== currentUser?.username) return false;
        return true;
    });
    
    // Find active trip: Ticket assigned to this user with an accepted/in-progress status
    const activeTrip = tickets.find(t => 
        t.driverUsername === currentUser?.username && 
        (
            ['DRIVER_ACCEPTED', 'ACCEPTED', 'ON_THE_WAY', 'IN_PROGRESS', 'ARRIVED', 'ĐANG VẬN CHUYỂN'].includes(t.status || '') ||
            ['DRIVER_ACCEPTED', 'ACCEPTED', 'ON_THE_WAY', 'IN_PROGRESS', 'ARRIVED', 'ĐANG VẬN CHUYỂN'].includes(t.dispatchStatus || '')
        )
    );

    let pickupLocation = activeTrip?.pickupLocation || '-';
    let deliveryLocation = activeTrip?.deliveryLocation || '-';
    if (activeTrip?.route && activeTrip.route.includes(' - ')) {
        const parts = activeTrip.route.split(' - ');
        if (pickupLocation === '-') pickupLocation = parts[0];
        if (deliveryLocation === '-') deliveryLocation = parts[1];
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
        );
    }
    
    if (editingTicket) {
        return (
            <div className="fixed inset-0 z-[60] bg-slate-50 overflow-y-auto p-4 pb-20">
                <CreateTicketMobile
                    tickets={tickets}
                    onUpdateTickets={onUpdateTickets || (() => {})}
                    onUpdateSingleTicket={onUpdateSingleTicket}
                    routeConfigs={routeConfigs || []}
                    onComplete={() => setEditingTicket(null)}
                    ticketToEdit={editingTicket}
                />
            </div>
        );
    }

    return (
        <div className="space-y-4">
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
                                    <div className="text-sm text-slate-700 font-medium">{pickupLocation}</div>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <MapPin size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                                <div>
                                    <div className="text-xs text-slate-400 uppercase font-bold">Điểm giao hàng</div>
                                    <div className="text-sm text-slate-700 font-medium">{deliveryLocation}</div>
                                </div>
                            </div>
                            {/* Trip Details Grid */}
                            <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-100">
                                <div className="text-center">
                                    <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-center gap-1"><Calendar size={10} />Bắt đầu</div>
                                    <div className="text-xs font-bold text-slate-700 mt-0.5">{activeTrip.dateStart ? new Date(activeTrip.dateStart).toLocaleDateString('vi-VN') : '-'}</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-center gap-1"><Calendar size={10} />Kết thúc</div>
                                    <div className="text-xs font-bold text-slate-700 mt-0.5">{activeTrip.dateEnd ? new Date(activeTrip.dateEnd).toLocaleDateString('vi-VN') : '-'}</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-center gap-1"><Package size={10} />Cont</div>
                                    <div className="text-xs font-bold text-slate-700 mt-0.5">{activeTrip.size ? `${activeTrip.size}'` : '-'}</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-[10px] text-slate-400 uppercase font-bold">F/E</div>
                                    <div className={`text-xs font-bold mt-0.5 ${activeTrip.fe === 'F' ? 'text-blue-600' : 'text-amber-600'}`}>{activeTrip.fe === 'F' ? 'Full' : activeTrip.fe === 'E' ? 'Empty' : '-'}</div>
                                </div>
                            </div>
                            <div className="mt-4 pt-3 border-t border-blue-500/30 flex gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                                {((['DRIVER_ACCEPTED'].includes(activeTrip.dispatchStatus || '')) || (['DRIVER_ACCEPTED'].includes(activeTrip.status || ''))) && (
                                    <button 
                                        disabled={respondingTo === activeTrip.id}
                                        onClick={() => handleUpdateStatus(activeTrip, 'IN_PROGRESS')}
                                        className="flex-1 py-2.5 bg-white text-blue-600 rounded-lg text-sm font-bold shadow-md hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                                    >
                                        {respondingTo === activeTrip.id ? <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /> : <Truck size={16} />} 
                                        Bắt đầu chuyến
                                    </button>
                                )}
                                {((['IN_PROGRESS', 'ĐANG VẬN CHUYỂN'].includes(activeTrip.dispatchStatus || '')) || (['ĐANG VẬN CHUYỂN', 'IN_PROGRESS'].includes(activeTrip.status || ''))) && (
                                    <>
                                        <button
                                            disabled={respondingTo === activeTrip.id}
                                            onClick={() => setEditingTicket(activeTrip)}
                                            className="flex-1 py-2.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-bold shadow-md hover:bg-blue-200 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Edit size={16} /> Cập nhật
                                        </button>
                                        <button
                                            disabled={respondingTo === activeTrip.id}
                                            onClick={() => handleUpdateStatus(activeTrip, 'COMPLETED')}
                                            className="flex-1 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-bold shadow-md hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                                        >
                                            {respondingTo === activeTrip.id ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle size={16} />} 
                                            Báo Hoàn Thành
                                        </button>
                                    </>
                                )}
                                {['COMPLETED'].includes(activeTrip.dispatchStatus || activeTrip.status || '') && !activeTrip.submittedToCS && (
                                    <div className="flex-1 text-center py-1">
                                        <span className="text-xs text-blue-100 font-medium font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"><FileText size={14}/> Ấn vào phiếu để Gửi thẻ CS</span>
                                    </div>
                                )}
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
                                            {/* Full route details */}
                                            <div className="flex items-start gap-3">
                                                <MapPin size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                                                <div>
                                                    <div className="text-xs text-slate-500 uppercase font-bold">Lấy hàng</div>
                                                    <div className="text-sm text-slate-800 font-medium">{ticket.pickupLocation || (ticket.route?.split(' - ')?.[0]) || '-'}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <MapPin size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                                                <div>
                                                    <div className="text-xs text-slate-500 uppercase font-bold">Giao hàng</div>
                                                    <div className="text-sm text-slate-800 font-medium">{ticket.deliveryLocation || (ticket.route?.split(' - ')?.[1]) || '-'}</div>
                                                </div>
                                            </div>
                                            {/* Date + Container details */}
                                            <div className="grid grid-cols-4 gap-2 mt-2 border-t border-amber-200/50 pt-2">
                                                <div className="text-center">
                                                    <div className="text-[10px] text-slate-400 uppercase font-bold">Bắt đầu</div>
                                                    <div className="text-xs font-bold text-slate-700">{ticket.dateStart ? new Date(ticket.dateStart).toLocaleDateString('vi-VN') : '-'}</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-[10px] text-slate-400 uppercase font-bold">Kết thúc</div>
                                                    <div className="text-xs font-bold text-slate-700">{ticket.dateEnd ? new Date(ticket.dateEnd).toLocaleDateString('vi-VN') : '-'}</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-[10px] text-slate-400 uppercase font-bold">Cont</div>
                                                    <div className="text-xs font-bold text-slate-700">{ticket.size ? `${ticket.size}'` : '-'}</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-[10px] text-slate-400 uppercase font-bold">F/E</div>
                                                    <div className={`text-xs font-bold ${ticket.fe === 'F' ? 'text-blue-600' : 'text-amber-600'}`}>{ticket.fe === 'F' ? 'Full' : ticket.fe === 'E' ? 'Empty' : '-'}</div>
                                                </div>
                                            </div>
                                            {/* Customer + extra info */}
                                            <div className="grid grid-cols-2 gap-2 border-t border-amber-200/50 pt-2">
                                                <div className="text-center">
                                                    <div className="text-[10px] text-slate-400 uppercase font-bold">Khách hàng</div>
                                                    <div className="text-xs font-bold text-slate-700 truncate">{ticket.customerCode || '-'}</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-[10px] text-slate-400 uppercase font-bold">Biển số</div>
                                                    <div className="text-xs font-bold text-slate-700">{ticket.licensePlate || '-'}</div>
                                                </div>
                                            </div>
                                            {/* Driver salary info */}
                                            {(ticket.driverSalary || ticket.driverPrice) && (
                                                <div className="border-t border-amber-200/50 pt-2 mt-1">
                                                    <div className="bg-emerald-50 rounded-lg px-3 py-2 flex items-center justify-between">
                                                        <span className="text-[10px] text-emerald-600 uppercase font-bold tracking-wider">Lương chuyến này</span>
                                                        <span className="text-sm font-black text-emerald-700">
                                                            {(ticket.driverSalary || (ticket.driverPrice * (ticket.trips || 1))).toLocaleString('vi-VN')} đ
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
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
                                                value={customRejectReason}
                                                onChange={(e) => setCustomRejectReason(e.target.value)}
                                            />
                                        )}
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => { setShowRejectModal(null); setRejectReason(''); setCustomRejectReason(''); }}
                                                className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold"
                                            >Hủy</button>
                                            <button
                                                onClick={() => handleReject(r.ticketId)}
                                                disabled={!rejectReason || (rejectReason === 'Khác' && !customRejectReason) || respondingTo === r.ticketId}
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
