import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { User, ShieldAlert, KeyRound, Save, Mail, User as UserIcon, Phone, FileText, Smartphone, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { ProfileUpdateRequest } from '../types';

interface UserProfileProps {
    currentUser: any;
    onRefreshUser: () => void;
}

export function UserProfile({ currentUser, onRefreshUser }: UserProfileProps) {
    const [activeTab, setActiveTab] = useState<'info' | 'password'>('info');
    
    // Info State
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState({
        name: currentUser?.name || '',
        phone: currentUser?.phone || '',
        email: currentUser?.email || '',
        licensePlate: currentUser?.licensePlate || '',
    });
    const [pendingRequest, setPendingRequest] = useState<ProfileUpdateRequest | null>(null);
    const [loading, setLoading] = useState(false);
    
    // Password State
    const [pwdData, setPwdData] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [pwdLoading, setPwdLoading] = useState(false);

    useEffect(() => {
        fetchMyRequests();
    }, [currentUser]);

    const fetchMyRequests = async () => {
        try {
            const reqs: ProfileUpdateRequest[] = await api.getProfileUpdateRequests(undefined, currentUser.username);
            const pending = reqs.find(r => r.status === 'PENDING');
            setPendingRequest(pending || null);
        } catch (e) {
            console.error("Lỗi tải yêu cầu cập nhật", e);
        }
    };

    const handleInfoSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Find changes
            const changes: any = {};
            if (formData.name !== currentUser.name) changes.name = formData.name;
            if (formData.phone !== currentUser.phone) changes.phone = formData.phone;
            if (formData.email !== currentUser.email) changes.email = formData.email;
            if (formData.licensePlate !== currentUser.licensePlate) changes.licensePlate = formData.licensePlate;

            if (Object.keys(changes).length === 0) {
                alert("Không có thay đổi nào!");
                setLoading(false);
                setEditMode(false);
                return;
            }

            await api.submitProfileUpdateRequest({
                username: currentUser.username,
                fieldsToUpdate: changes
            });
            alert("Đã gửi yêu cầu thay đổi thông tin. Vui lòng chờ phê duyệt!");
            setEditMode(false);
            fetchMyRequests();
        } catch (e: any) {
            alert(e.message || "Lỗi gửi yêu cầu.");
        }
        setLoading(false);
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (pwdData.newPassword !== pwdData.confirmPassword) {
            alert("Mật khẩu mới và Nhập lại mật khẩu không khớp!");
            return;
        }
        if (pwdData.newPassword.length < 6) {
            alert("Mật khẩu mới phải có ít nhất 6 ký tự!");
            return;
        }

        setPwdLoading(true);
        try {
            await api.changePassword({
                username: currentUser.username,
                oldPassword: pwdData.oldPassword,
                newPassword: pwdData.newPassword
            });
            alert("Đổi mật khẩu thành công!");
            setPwdData({ oldPassword: '', newPassword: '', confirmPassword: '' });
        } catch (e: any) {
            alert(e.message || "Đổi mật khẩu thất bại.");
        }
        setPwdLoading(false);
    };

    return (
        <div className="max-w-4xl mx-auto py-6 space-y-6">
            <div className="flex items-center gap-3 mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg text-white font-bold text-2xl">
                    {currentUser?.name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{currentUser?.name}</h1>
                    <p className="text-sm text-slate-500">Tài khoản: <span className="font-mono text-slate-700">{currentUser?.username}</span> • Vai trò: <span className="font-medium text-blue-600">{currentUser?.role}</span></p>
                </div>
            </div>

            {/* TABS */}
            <div className="flex gap-4 border-b border-slate-200">
                <button 
                    className={`pb-3 px-2 font-medium text-sm transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'info' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    onClick={() => setActiveTab('info')}
                >
                    <UserIcon size={16} /> Thông tin hồ sơ
                </button>
                <button 
                    className={`pb-3 px-2 font-medium text-sm transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'password' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    onClick={() => setActiveTab('password')}
                >
                    <ShieldAlert size={16} /> Đổi mật khẩu
                </button>
            </div>

            {/* TAB CONTENT: INFO */}
            {activeTab === 'info' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    {pendingRequest && (
                        <div className="bg-amber-50 border-b border-amber-200 p-4 flex items-start gap-3">
                            <Clock className="text-amber-500 mt-0.5 shrink-0" size={18} />
                            <div>
                                <h4 className="font-bold text-amber-800 text-sm">Đang có yêu cầu chờ duyệt</h4>
                                <p className="text-xs text-amber-700 mt-1">Bạn đã gửi yêu cầu thay đổi thông tin vào <span className="font-medium">{new Date(pendingRequest.requestedAt).toLocaleString('vi-VN')}</span>. Vui lòng chờ duyệt viên xử lý trước khi có thể chỉnh sửa tiếp.</p>
                                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                    {Object.entries(pendingRequest.fieldsToUpdate).map(([key, val]) => (
                                        <span key={key} className="bg-amber-100 text-amber-800 px-2 py-1 rounded border border-amber-200">
                                            {key}: <span className="font-bold">{val as string}</span>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleInfoSubmit} className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Họ và tên</label>
                                    <input 
                                        type="text" 
                                        disabled={!editMode || !!pendingRequest}
                                        value={formData.name}
                                        onChange={e => setFormData({...formData, name: e.target.value})}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-70 disabled:bg-slate-100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Số điện thoại</label>
                                    <input 
                                        type="text" 
                                        disabled={!editMode || !!pendingRequest}
                                        value={formData.phone}
                                        onChange={e => setFormData({...formData, phone: e.target.value})}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-70 disabled:bg-slate-100"
                                    />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Email</label>
                                    <input 
                                        type="email" 
                                        disabled={!editMode || !!pendingRequest}
                                        value={formData.email}
                                        onChange={e => setFormData({...formData, email: e.target.value})}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-70 disabled:bg-slate-100"
                                    />
                                </div>
                                {currentUser?.role === 'DRIVER' && (
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Biển số xe / Phương tiện</label>
                                        <input 
                                            type="text" 
                                            disabled={!editMode || !!pendingRequest}
                                            value={formData.licensePlate}
                                            onChange={e => setFormData({...formData, licensePlate: e.target.value})}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-70 disabled:bg-slate-100"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-100">
                            {!editMode ? (
                                <button
                                    type="button"
                                    onClick={() => setEditMode(true)}
                                    disabled={!!pendingRequest}
                                    className="px-5 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors disabled:opacity-50"
                                >
                                    Chỉnh sửa thông tin
                                </button>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditMode(false);
                                            setFormData({
                                                name: currentUser?.name || '',
                                                phone: currentUser?.phone || '',
                                                email: currentUser?.email || '',
                                                licensePlate: currentUser?.licensePlate || '',
                                            });
                                        }}
                                        className="px-5 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors"
                                    >
                                        Hủy bỏ
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
                                    >
                                        {loading ? <Clock size={16} className="animate-spin" /> : <Save size={16} />}
                                        Gửi yêu cầu phê duyệt
                                    </button>
                                </>
                            )}
                        </div>
                    </form>
                </div>
            )}

            {/* TAB CONTENT: PASSWORD */}
            {activeTab === 'password' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-6 max-w-xl">
                    <div className="flex items-start gap-4 mb-6">
                        <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                            <KeyRound size={20} className="text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">Đổi mật khẩu trực tiếp</h3>
                            <p className="text-sm text-slate-500 mt-1">Hành động này sẽ có hiệu lực ngay lập tức mà không cần phê duyệt. Hãy ghi nhớ mật khẩu mới của bạn.</p>
                        </div>
                    </div>

                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Mật khẩu hiện tại</label>
                            <input 
                                type="password" 
                                required
                                value={pwdData.oldPassword}
                                onChange={e => setPwdData({...pwdData, oldPassword: e.target.value})}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Mật khẩu mới</label>
                            <input 
                                type="password" 
                                required
                                minLength={6}
                                value={pwdData.newPassword}
                                onChange={e => setPwdData({...pwdData, newPassword: e.target.value})}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Xác nhận mật khẩu mới</label>
                            <input 
                                type="password" 
                                required
                                minLength={6}
                                value={pwdData.confirmPassword}
                                onChange={e => setPwdData({...pwdData, confirmPassword: e.target.value})}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>

                        <div className="pt-4 flex justify-end">
                            <button
                                type="submit"
                                disabled={pwdLoading}
                                className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {pwdLoading ? <Clock size={16} className="animate-spin" /> : <Save size={16} />} 
                                Cập nhật mật khẩu
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
