import React, { useState } from 'react';
import { Clock, CheckCircle, FileText, PlusCircle, Send } from 'lucide-react';
import { TransportTicket } from '../../types';
import { api } from '../../services/api';

interface TicketDetailMobileProps {
    ticket: TransportTicket;
    onBack: () => void;
    onSubmitted?: () => void;
}

const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="flex justify-between items-start py-3.5 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
        <span className="text-xs text-slate-400 font-medium shrink-0 pt-0.5">{label}</span>
        <span className="text-xs text-slate-700 font-bold text-right flex-1 ml-4 break-words">{value}</span>
    </div>
);

export const TicketDetailMobile: React.FC<TicketDetailMobileProps> = ({ ticket, onBack, onSubmitted }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear().toString().slice(-2)}`;
    };

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'APPROVED': return { color: 'text-emerald-600', bg: 'bg-emerald-50', icon: <CheckCircle size={14} />, label: 'Đã duyệt' };
            case 'DRAFT': return { color: 'text-slate-500', bg: 'bg-slate-100', icon: <FileText size={14} />, label: 'Bản nháp' };
            case 'PENDING':
            case 'SUBMITTED':
            case 'COMPLETED':
                return { color: 'text-orange-600', bg: 'bg-orange-50', icon: <Clock size={14} />, label: 'Chờ duyệt' };
            default: return { color: 'text-blue-600', bg: 'bg-blue-50', icon: <Clock size={14} />, label: 'Đang chạy' };
        }
    };

    // Check if ticket can be submitted to CS
    const canSubmitToCS = !ticket.submittedToCS && ticket.status !== 'PENDING' && ticket.status !== 'APPROVED';

    const handleSubmitToCS = async () => {
        if (!window.confirm('Gửi phiếu này cho CS duyệt? Sau khi gửi bạn sẽ không thể chỉnh sửa.')) return;
        setIsSubmitting(true);
        try {
            await api.updateTicket(ticket.id, {
                ...ticket,
                submittedToCS: true,
                status: 'PENDING',
                submittedAt: new Date().toISOString()
            });
            alert('Đã gửi phiếu cho CS duyệt thành công!');
            if (onSubmitted) onSubmitted();
            onBack();
        } catch (err) {
            console.error('Failed to submit to CS:', err);
            alert('Lỗi khi gửi phiếu. Vui lòng thử lại.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="absolute inset-0 z-[60] flex flex-col bg-white animate-slide-up overflow-hidden w-full h-full">
            <header className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-1">
                        <PlusCircle className="rotate-45" size={24} />
                    </button>
                    <h2 className="font-bold text-sm">Chi tiết phiếu vận chuyển</h2>
                </div>
                <div className={`px-3 py-1 rounded-full text-[10px] font-bold ${getStatusInfo(ticket.status).bg} ${getStatusInfo(ticket.status).color}`}>
                    {getStatusInfo(ticket.status).label}
                </div>
            </header>

            <div className="flex-1 overflow-y-auto px-3 py-4 custom-scrollbar overscroll-contain bg-white">
                <div className="flex justify-between items-start mb-6 gap-2">
                    <h3 className="text-xl font-bold text-slate-800 break-words flex-1">{ticket.route}</h3>
                    <div className={`px-3 py-1 rounded-full text-[10px] font-bold ${getStatusInfo(ticket.status).bg} ${getStatusInfo(ticket.status).color} shrink-0`}>
                        {getStatusInfo(ticket.status).label}
                    </div>
                </div>

                <div className="space-y-0.5">
                    <DetailRow label="Ngày bắt đầu" value={formatDate(ticket.dateStart)} />
                    <DetailRow label="Ngày kết thúc" value={formatDate(ticket.dateEnd || ticket.dateStart)} />
                    <DetailRow label="Khách hàng" value={ticket.customerCode} />
                    <DetailRow label="Biển số" value={ticket.licensePlate} />
                    <DetailRow label="Tuyến đường" value={ticket.route} />
                    <DetailRow label="Container No." value={`${ticket.containerNo} (${ticket.size}')`} />
                    <DetailRow label="Số chuyến" value={ticket.trips?.toString() || '1'} />
                    <DetailRow label="F/E" value={ticket.fe === 'E' ? 'Empty' : 'Full'} />
                    <DetailRow
                        label="Lưu đêm"
                        value={ticket.nightStay
                            ? `${ticket.nightStayDays} đêm (${ticket.nightStayLocation === 'INNER_CITY' ? 'Trong TP' : 'Ngoài TP'})`
                            : 'Không'}
                    />

                    <div className="mt-6">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Ghi chú</label>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm text-slate-600 italic">
                            {ticket.notes || 'Không có ghi chú'}
                        </div>
                    </div>

                    {ticket.imageUrl && (
                        <div className="mt-6">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Ảnh container / chứng từ</label>
                            <img src={ticket.imageUrl} alt="Container" className="w-full h-auto object-cover rounded-xl border border-slate-200" />
                        </div>
                    )}

                    {ticket.submittedToCS && (
                        <div className="mt-6 p-3 bg-blue-50 rounded-xl border border-blue-100">
                            <p className="text-xs font-bold text-blue-600 flex items-center gap-2">
                                <Send size={14} />
                                Đã gửi CS duyệt {ticket.submittedAt ? `lúc ${new Date(ticket.submittedAt).toLocaleString('vi-VN')}` : ''}
                            </p>
                        </div>
                    )}

                    {ticket.onChainStatus === 'VERIFIED' && (
                        <div className="mt-8 pt-6 border-t border-slate-50">
                            <label className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block mb-3">Xác minh On-Chain (Blockchain)</label>
                            <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                                <div className="flex items-center gap-2 text-blue-700 mb-2">
                                    <CheckCircle size={16} />
                                    <span className="text-xs font-bold">Chứng thực bởi Monad Network</span>
                                </div>
                                <p className="text-[8px] font-mono text-blue-400 break-all bg-white/50 p-2 rounded">
                                    TX: {ticket.onChainHash}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="p-4 border-t border-slate-100 shrink-0 space-y-2">
                {canSubmitToCS && (
                    <button
                        onClick={handleSubmitToCS}
                        disabled={isSubmitting}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 rounded-2xl active:from-blue-700 active:to-indigo-700 transition-all text-sm uppercase tracking-wide disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                    >
                        <Send size={18} />
                        {isSubmitting ? 'Đang gửi...' : 'Gửi CS Duyệt'}
                    </button>
                )}
                <button
                    onClick={onBack}
                    className="w-full bg-slate-800 text-white font-bold py-4 rounded-2xl active:bg-slate-900 transition-all text-sm uppercase tracking-wide"
                >
                    Đóng
                </button>
            </div>
        </div>
    );
};
