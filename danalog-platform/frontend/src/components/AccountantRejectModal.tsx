import { useState } from 'react';
import { TransportTicket } from '../types';
import { X, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface AccountantRejectModalProps {
    isOpen: boolean;
    ticket: TransportTicket | null;
    currentUser: any;
    onClose: () => void;
    onSave: (rejectReason: string, deadline: string) => void;
}

export function AccountantRejectModal({ isOpen, ticket, currentUser, onClose, onSave }: AccountantRejectModalProps) {
    const [reason, setReason] = useState('');
    const [deadline, setDeadline] = useState('');

    if (!isOpen || !ticket) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.FlowPreventDefault?.();
        e.preventDefault();
        
        if (!reason.trim()) {
            alert("Vui lòng nhập lý do từ chối");
            return;
        }
        
        if (!deadline) {
            alert("Vui lòng chọn hạn chót xử lý");
            return;
        }

        onSave(reason, deadline);
        setReason('');
        setDeadline('');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 font-sans">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-rose-100 bg-rose-50 flex items-center justify-between sticky top-0 z-10 shrink-0">
                    <h2 className="text-lg font-bold text-rose-800">Kế toán Từ chối Phiếu</h2>
                    <button onClick={onClose} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-100 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Mã Phiếu</p>
                                <p className="font-mono text-slate-700 font-bold mt-1">{ticket.id.slice(0, 8)}...</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Lái xe</p>
                                <p className="font-bold text-slate-700 mt-1">{ticket.driverName}</p>
                            </div>
                            <div className="col-span-2">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tuyến đường</p>
                                <p className="font-medium text-slate-700 mt-1">{ticket.route}</p>
                            </div>
                        </div>
                    </div>

                    <form id="reject-form" onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Lý do từ chối (Gửi CS)</label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all placeholder:font-normal placeholder:text-slate-400 min-h-[100px] resize-y"
                                placeholder="Liệt kê các thông tin sai lệch cần CS làm việc lại với lái xe..."
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Hạn chót xử lý</label>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={deadline}
                                    min={new Date().toISOString().split('T')[0]}
                                    onChange={(e) => setDeadline(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all"
                                />
                                <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            </div>
                            <p className="text-xs text-rose-500 font-medium">Phiếu không được duyệt trước hạn chót sẽ bị loại khỏi bảng lương.</p>
                        </div>
                    </form>
                </div>

                <div className="p-6 border-t border-slate-100 flex justify-end gap-3 shrink-0 bg-slate-50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                        Hủy
                    </button>
                    <button
                        type="submit"
                        form="reject-form"
                        className="px-6 py-2.5 text-sm font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700 shadow-sm transition-colors"
                    >
                        Xác nhận Từ chối
                    </button>
                </div>
            </div>
        </div>
    );
}
