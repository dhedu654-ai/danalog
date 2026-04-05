import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ProfileUpdateRequest } from '../types';
import { UserCheck, CheckCircle, XCircle, Clock, Search, ShieldAlert, Key } from 'lucide-react';

interface ProfileApprovalsProps {
    currentUser: any;
    onUserUpdated?: () => void;
}

export function ProfileApprovals({ currentUser, onUserUpdated }: ProfileApprovalsProps) {
    const [requests, setRequests] = useState<ProfileUpdateRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');

    useEffect(() => {
        fetchRequests();
    }, [currentUser]);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            // Only fetch for my role. Admin gets all. 
            const data = await api.getProfileUpdateRequests(currentUser.role === 'ADMIN' ? 'ADMIN' : currentUser.role);
            setRequests(data);
        } catch (e) {
            console.error("Lỗi lấy danh sách phê duyệt", e);
        }
        setLoading(false);
    };

    const handleAction = async (id: string, action: 'approve' | 'reject') => {
        const note = action === 'reject' ? window.prompt('Nhập lý do từ chối (có thể để trống):') : '';
        if (action === 'reject' && note === null) return; // User cancelled prompt

        if (action === 'approve') {
            if (!window.confirm("Bạn có chắc chắn PHÊ DUYỆT yêu cầu cập nhật này? Các thông tin mới sẽ ngay lập tức được áp dụng.")) return;
        }

        try {
            await api.actionProfileUpdateRequest(id, action, {
                reviewNote: note || '',
                reviewerUsername: currentUser.username
            });
            fetchRequests();
            if (action === 'approve' && onUserUpdated) {
                // If it might affect display names on dashboard, trigger a global refresh (optional)
                onUserUpdated();
            }
        } catch (e: any) {
            alert(e.message || "Xử lý thất bại");
        }
    };

    // Filter logic
    const filteredRequests = requests.filter(req => {
        if (statusFilter !== 'ALL' && req.status !== statusFilter) return false;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return req.username.toLowerCase().includes(q) || req.fullName.toLowerCase().includes(q);
        }
        return true;
    });

    const getApproveRoleName = (role: string) => {
        if (role === 'CS_LEAD') return 'Trưởng phòng CS';
        if (role === 'DV_LEAD') return 'Trưởng phòng Điều Vận';
        if (role === 'ADMIN') return 'Ban Giám Đốc';
        return role;
    };

    return (
        <div className="max-w-6xl mx-auto py-6 space-y-6">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                        <UserCheck className="text-blue-600" /> Phê duyệt hồ sơ nhân sự
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Thẩm quyền duyệt của bạn: <span className="font-bold text-slate-700">{getApproveRoleName(currentUser.role)}</span>
                    </p>
                </div>
                <button
                    onClick={fetchRequests}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                    Làm mới
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative w-full md:w-80">
                    <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Tìm theo user/tên..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    {(['PENDING', 'APPROVED', 'REJECTED', 'ALL']).map(status => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status as any)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${statusFilter === status ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                        >
                            {status === 'PENDING' ? 'Chờ duyệt' : status === 'APPROVED' ? 'Đã duyệt' : status === 'REJECTED' ? 'Từ chối' : 'Tất cả'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content List */}
            {loading ? (
                <div className="p-12 text-center text-slate-500"><Clock className="animate-spin mx-auto mb-2" /> Đang tải dữ liệu...</div>
            ) : filteredRequests.length === 0 ? (
                <div className="p-12 text-center text-slate-500 bg-white rounded-xl shadow-sm border border-slate-200">
                    <CheckCircle className="mx-auto mb-3 text-emerald-400" size={32} />
                    <p>Không có yêu cầu cập nhật hồ sơ nào cần xử lý</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredRequests.map(req => (
                        <div key={req.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-slate-200 to-slate-300 rounded-full flex items-center justify-center text-slate-600 font-bold">
                                        {req.fullName.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800">{req.fullName} <span className="text-xs font-mono text-slate-400 ml-1">({req.username})</span></div>
                                        <div className="text-xs text-slate-500 flex items-center gap-2">
                                            <span>Bộ phận: <b>{req.role}</b></span>
                                            <span>•</span>
                                            <span>Gửi lúc: {new Date(req.requestedAt).toLocaleString('vi-VN')}</span>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    {req.status === 'PENDING' && <span className="px-2.5 py-1 rounded bg-amber-100 text-amber-700 text-xs font-bold border border-amber-200 flex items-center gap-1"><Clock size={12}/> Chờ duyệt</span>}
                                    {req.status === 'APPROVED' && <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200 flex items-center gap-1"><CheckCircle size={12}/> Đã được duyệt</span>}
                                    {req.status === 'REJECTED' && <span className="px-2.5 py-1 rounded bg-red-100 text-red-700 text-xs font-bold border border-red-200 flex items-center gap-1"><XCircle size={12}/> Bị từ chối</span>}
                                </div>
                            </div>
                            
                            <div className="px-5 py-5">
                                <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Nội dung thay đổi</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {Object.entries(req.fieldsToUpdate).map(([key, val]) => {
                                        const keyLabels: Record<string, string> = {
                                            name: 'Họ và tên',
                                            phone: 'Số điện thoại',
                                            email: 'Email',
                                            licensePlate: 'Biển số xe',
                                        };
                                        return (
                                            <div key={key} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                                                <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">{keyLabels[key] || key}</div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-blue-600 block w-full truncate">{val as string}</span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                                
                                {req.status !== 'PENDING' && (
                                    <div className={`mt-4 p-3 rounded-lg text-xs flex gap-2 ${req.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
                                        <div className="font-bold">Người xử lý:</div>
                                        <div>{req.reviewedBy} (lúc {new Date(req.reviewedAt!).toLocaleString('vi-VN')})</div>
                                        {req.reviewNote && (
                                            <>
                                                <div className="mx-2 opacity-30">|</div>
                                                <div className="font-bold">Ghi chú:</div>
                                                <div>{req.reviewNote}</div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>

                            {req.status === 'PENDING' && (
                                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
                                    <button 
                                        onClick={() => handleAction(req.id, 'reject')}
                                        className="px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-bold hover:bg-red-50 transition-colors"
                                    >
                                        Từ chối
                                    </button>
                                    <button 
                                        onClick={() => handleAction(req.id, 'approve')}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm shadow-blue-200 transition-colors"
                                    >
                                        Phê duyệt áp dụng ngay
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
