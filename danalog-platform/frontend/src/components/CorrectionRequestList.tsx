import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { TicketCorrectionRequest } from '../types';
import { MessageSquare, CheckCircle, XCircle, Search, Calendar, FileText, User } from 'lucide-react';
import { format } from 'date-fns';

export function CorrectionRequestList({ currentUser }: { currentUser: any }) {
    const [requests, setRequests] = useState<TicketCorrectionRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');

    const fetchRequests = async () => {
        setIsLoading(true);
        try {
            const data = await api.getTicketCorrections();
            setRequests(data || []);
        } catch (error) {
            console.error("Failed to fetch correction requests", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleReview = async (id: string, isApprove: boolean) => {
        const note = prompt(`Nhập ghi chú ${isApprove ? 'phê duyệt' : 'từ chối'} (Không bắt buộc):`);
        if (note === null) return; // User cancelled

        try {
            await api.reviewTicketCorrection(id, {
                status: isApprove ? 'APPROVED' : 'REJECTED',
                reviewedBy: currentUser?.username || 'Admin',
                reviewNote: note
            });
            fetchRequests();
        } catch (error) {
            console.error("Failed to review request", error);
            alert("Đã có lỗi xảy ra. Vui lòng thử lại.");
        }
    };

    const filteredRequests = requests.filter(r => statusFilter === 'ALL' || r.status === statusFilter);

    if (isLoading) {
        return <div className="p-8 text-center text-slate-500 font-medium animate-pulse">Đang tải danh sách yêu cầu...</div>;
    }

    return (
        <div className="space-y-6 font-sans">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Quản Lý Yêu Cầu Sửa Phiếu</h2>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((s) => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s as any)}
                            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${statusFilter === s ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {s === 'ALL' ? 'Tất cả' : s === 'PENDING' ? 'Chờ duyệt' : s === 'APPROVED' ? 'Đã duyệt' : 'Đã từ chối'}
                        </button>
                    ))}
                </div>
            </div>

            {filteredRequests.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MessageSquare className="text-slate-400" size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 mb-1">Không có dữ liệu</h3>
                    <p className="text-slate-500 text-sm">Chưa có yêu cầu thay đổi nào ở trạng thái này.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filteredRequests.map(request => (
                        <div key={request.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow relative overflow-hidden">
                            {request.status === 'PENDING' && (
                                <div className="absolute top-0 right-0 w-16 h-16 bg-amber-50 rounded-bl-full flex items-start justify-end p-3">
                                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                                </div>
                            )}
                            
                            <div className="flex flex-col md:flex-row justify-between gap-6">
                                <div className="flex-1 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold font-mono border border-blue-100">
                                                {request.ticketId}
                                            </span>
                                            {request.status === 'PENDING' ? (
                                                <span className="text-amber-600 text-xs font-bold uppercase tracking-wider">Đang chờ xử lý</span>
                                            ) : request.status === 'APPROVED' ? (
                                                <span className="text-emerald-600 text-xs font-bold uppercase tracking-wider">Đã chấp thuận</span>
                                            ) : (
                                                <span className="text-red-500 text-xs font-bold uppercase tracking-wider">Đã từ chối</span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <div className="flex flex-col">
                                                <span className="text-xs text-slate-400 uppercase font-semibold mb-1">Tuyến đường</span>
                                                <span className="text-sm font-semibold text-slate-800">{request.ticketRoute || 'N/A'}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs text-slate-400 uppercase font-semibold mb-1">Người yêu cầu</span>
                                                <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                                                    <User size={14} className="text-slate-400"/>
                                                    {request.requestedBy}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                             <div className="flex flex-col">
                                                <span className="text-xs text-slate-400 uppercase font-semibold mb-1">Thời gian gửi</span>
                                                <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                                                    <Calendar size={14} className="text-slate-400" />
                                                    {format(new Date(request.requestedAt), 'HH:mm - dd/MM/yyyy')}
                                                </div>
                                            </div>
                                            {request.attachmentUrl && (
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-slate-400 uppercase font-semibold mb-1">Đính kèm</span>
                                                    <a href={request.attachmentUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1">
                                                        <FileText size={14} /> Xem chứng từ
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                                        <h4 className="text-xs font-bold text-slate-500 mb-2 uppercase">Nội dung thay đổi</h4>
                                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{request.reason}</p>
                                    </div>

                                    {request.status !== 'PENDING' && (
                                         <div className={`mt-4 p-3 rounded-lg flex items-start gap-3 border ${request.status === 'APPROVED' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
                                            {request.status === 'APPROVED' ? <CheckCircle size={18} className="text-emerald-500 mt-0.5" /> : <XCircle size={18} className="text-red-500 mt-0.5" />}
                                            <div>
                                                <span className="text-xs font-bold uppercase mb-1 block">Xử lý bởi: {request.reviewedBy}</span>
                                                <span className="text-sm font-medium">{request.reviewNote || 'Không có ghi chú.'}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {request.status === 'PENDING' && (
                                    <div className="flex md:flex-col gap-3 justify-end items-end shrink-0 pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-slate-100 md:pl-6">
                                        <button 
                                            onClick={() => handleReview(request.id, true)}
                                            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-all w-full flex items-center justify-center gap-2 shadow-sm"
                                        >
                                            <CheckCircle size={16} /> Duyệt & Sửa Phiếu
                                        </button>
                                        <button 
                                            onClick={() => handleReview(request.id, false)}
                                            className="px-6 py-2.5 bg-white hover:bg-red-50 text-red-600 border border-slate-200 hover:border-red-200 text-sm font-bold rounded-xl transition-all w-full flex items-center justify-center gap-2"
                                        >
                                            <XCircle size={16} /> Từ chối
                                        </button>
                                        <p className="text-[10px] text-slate-400 mt-2 max-w-[150px] text-center hidden md:block">
                                            *Bạn cần mở lại phiếu (trong màn CS Kiểm tra) để sửa thông tin nếu chấp thuận.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
