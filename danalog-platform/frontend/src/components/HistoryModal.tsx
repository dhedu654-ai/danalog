import { Clock } from 'lucide-react';
import { TransportTicket } from '../types';

interface HistoryModalProps {
    ticket: TransportTicket | null;
    isOpen: boolean;
    onClose: () => void;
}

export function HistoryModal({ ticket, isOpen, onClose }: HistoryModalProps) {
    if (!isOpen || !ticket) return null;

    // Use ticket history or empty array
    const history = ticket.statusHistory || [];

    const getStatusStyle = (status: string) => {
        if (status === 'Đã duyệt' || status === 'APPROVED') return 'text-green-600 bg-green-50 border-green-200';
        if (status === 'Đã chỉnh sửa') return 'text-blue-600 bg-blue-50 border-blue-200';
        return 'text-slate-600 bg-slate-50 border-slate-200';
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100">
                    <h3 className="text-xl font-bold text-[#1e3a8a] uppercase">LỊCH SỬ THAO TÁC</h3>
                </div>

                <div className="p-8 relative max-h-[60vh] overflow-y-auto">
                    {/* Vertical Line */}
                    <div className="absolute left-[54px] top-8 bottom-8 w-px bg-slate-200"></div>

                    <div className="space-y-8">
                        {history.length === 0 && <p className="text-center text-slate-500 italic">Chưa có lịch sử.</p>}

                        {history.map((item, idx) => (
                            <div key={idx} className="relative flex gap-6">
                                {/* Timeline Icon */}
                                <div className="relative z-10 w-10 h-10 rounded-full border-2 border-slate-200 bg-white flex items-center justify-center text-slate-400 shrink-0">
                                    <Clock size={20} />
                                </div>

                                {/* Content Card */}
                                <div className={`flex-1 border rounded-2xl p-4 shadow-sm ${getStatusStyle(item.status)}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold">
                                            {item.status === 'PENDING' ? 'Mới tạo' :
                                                item.status === 'APPROVED' ? 'Đã duyệt' :
                                                    item.status === 'DRAFT' ? 'Bản nháp' :
                                                        item.status}
                                        </h4>
                                        <span className="text-xs opacity-70 ml-2">{item.timestamp}</span>
                                    </div>
                                    <div className="text-sm mb-1 opacity-90">
                                        Người thực hiện: <span className="font-semibold">{item.user}</span>
                                    </div>
                                    <div className="text-sm italic opacity-80">
                                        "{item.action}"
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-center">
                    <button
                        onClick={onClose}
                        className="w-full bg-slate-200 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-300 transition-colors"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
}
