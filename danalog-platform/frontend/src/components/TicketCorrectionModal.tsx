import { useState } from 'react';
import { TransportTicket } from '../types';
import { X, MessageSquare, Link, Send } from 'lucide-react';
import { api } from '../services/api';

interface TicketCorrectionModalProps {
    isOpen: boolean;
    ticket: TransportTicket | null;
    currentUser: any;
    onClose: () => void;
    onSuccess: () => void;
}

export function TicketCorrectionModal({ isOpen, ticket, currentUser, onClose, onSuccess }: TicketCorrectionModalProps) {
    const [reason, setReason] = useState('');
    const [attachmentUrl, setAttachmentUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen || !ticket) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason.trim()) {
            alert('Vui lòng nhập lý do thay đổi');
            return;
        }

        setIsSubmitting(true);
        try {
            await api.requestTicketCorrection(ticket.id, {
                ticketRoute: ticket.route,
                customerCode: ticket.customerCode,
                requestedBy: currentUser?.username || 'Unknown',
                reason: reason,
                attachmentUrl: attachmentUrl
            });
            alert('Đã gửi yêu cầu thay đổi thành công!');
            onSuccess();
            onClose();
            setReason('');
            setAttachmentUrl('');
        } catch (error) {
            console.error('Lỗi khi gửi yêu cầu:', error);
            alert('Có lỗi xảy ra khi gửi yêu cầu. Vui lòng thử lại.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 bg-white flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Yêu Cầu Chỉnh Sửa Tờ Phiếu</h3>
                        <p className="text-sm text-slate-500 mt-1">Phiếu số: {ticket.id}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                            <p className="text-sm text-amber-800 font-medium">
                                Phiếu này đã được duyệt. Mọi yêu cầu thay đổi (phí nâng hạ, quá cảnh, biển số xe...) sẽ được gửi đến Trưởng phòng CS (CS_LEAD) để xem xét.
                            </p>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                                <MessageSquare size={14} /> Lý do / Nội dung cần thay đổi <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all resize-none h-28"
                                placeholder="VD: Xin sửa phí nâng hạ thành 500,000đ do nhầm lẫn..."
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                                <Link size={14} /> Link chứng từ đính kèm (Nếu có)
                            </label>
                            <input
                                type="text"
                                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                                placeholder="https://..."
                                value={attachmentUrl}
                                onChange={(e) => setAttachmentUrl(e.target.value)}
                            />
                        </div>

                        <div className="pt-4 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-600 hover:bg-slate-50 transition-colors text-sm"
                            >
                                Hủy Bỏ
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || !reason.trim()}
                                className="px-5 py-2.5 rounded-xl bg-blue-600 font-bold text-white hover:bg-blue-700 transition-colors text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? 'Đang gửi...' : (
                                    <>
                                        <Send size={16} /> Gửi Yêu Cầu
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
