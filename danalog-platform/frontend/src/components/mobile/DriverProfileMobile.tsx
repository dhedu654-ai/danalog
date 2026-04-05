import React, { useState, useEffect } from 'react';
import { User, Key, Save, Phone, Truck, CheckCircle, Clock, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';

export const DriverProfileMobile: React.FC = () => {
    const { user, login, logout } = useAuth();
    const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
    
    // Profile Edit State
    const [profileForm, setProfileForm] = useState({
        phone: user?.phone || '',
        licensePlate: user?.licensePlate || '',
        licenseType: user?.licenseType || '',
    });
    const [profilePending, setProfilePending] = useState(false);
    
    // Password Edit State
    const [passForm, setPassForm] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [msg, setMsg] = useState({ type: '', text: '' });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Check if there are pending profile requests
        api.getProfileUpdateRequests(undefined, user?.username).then(requests => {
            const myPending = requests.filter((r: any) => r.status === 'PENDING');
            if (myPending.length > 0) {
                setProfilePending(true);
            }
        }).catch(err => console.error(err));
    }, [user]);

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.submitProfileUpdateRequest({
                username: user?.username,
                fieldsToUpdate: profileForm
            });
            setProfilePending(true);
            setMsg({ type: 'success', text: 'Đã gửi yêu cầu cập nhật chờ Điều vận trưởng phê duyệt.' });
        } catch (err: any) {
            setMsg({ type: 'error', text: err.message || 'Có lỗi xảy ra khi gửi yêu cầu.' });
        }
        setLoading(false);
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passForm.newPassword !== passForm.confirmPassword) {
            setMsg({ type: 'error', text: 'Mật khẩu mới không khớp!' });
            return;
        }
        setLoading(true);
        try {
            await api.changePassword({
                username: user?.username,
                oldPassword: passForm.oldPassword,
                newPassword: passForm.newPassword
            });
            setMsg({ type: 'success', text: 'Đổi mật khẩu thành công!' });
            setPassForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err: any) {
            setMsg({ type: 'error', text: err.message || 'Lỗi đổi mật khẩu.' });
        }
        setLoading(false);
    };

    return (
        <div className="space-y-4 pb-10 animate-slide-up">
            <header className="px-3 pt-2">
                <h2 className="text-xl font-bold text-slate-800">Tài Khoản</h2>
            </header>

            {/* Profile Card */}
            <div className="bg-white mx-3 rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center font-bold text-2xl text-blue-600 border border-blue-100 shrink-0">
                    {user?.name?.charAt(0)}
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-800 leading-tight mb-1">{user?.name}</h3>
                    <div className="flex gap-2 text-xs font-bold text-slate-400">
                        <span className="bg-slate-50 px-2 py-1 rounded border border-slate-100">{user?.username}</span>
                        <span className="bg-blue-50 px-2 py-1 rounded border border-blue-100 text-blue-600">{user?.role}</span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="mx-3 flex bg-slate-200/50 p-1 rounded-xl">
                <button
                    onClick={() => { setActiveTab('profile'); setMsg({ type: '', text: '' }); }}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'profile' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
                >
                    Hồ Sơ
                </button>
                <button
                    onClick={() => { setActiveTab('password'); setMsg({ type: '', text: '' }); }}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'password' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
                >
                    Đổi Mật Khẩu
                </button>
            </div>

            {/* Messages */}
            {msg.text && (
                <div className={`mx-3 p-3 rounded-xl text-sm font-bold flex items-start gap-2 ${msg.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                    {msg.type === 'error' ? <span className="mt-0.5"><Clock size={16} /></span> : <span className="mt-0.5"><CheckCircle size={16} /></span>}
                    {msg.text}
                </div>
            )}

            {/* Content */}
            <div className="mx-3">
                {activeTab === 'profile' ? (
                    <div className="space-y-4">
                        {profilePending && (
                            <div className="bg-amber-50 text-amber-700 p-3 rounded-xl text-sm font-medium border border-amber-200 flex gap-2">
                                <Clock size={20} className="shrink-0" />
                                <div>Hồ sơ của bạn đang có yêu cầu chờ Admin phê duyệt. Bạn vẫn có thể gửi lại yêu cầu mới nếu cần.</div>
                            </div>
                        )}
                        
                        <form onSubmit={handleProfileSubmit} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Số điện thoại</label>
                                <div className="relative">
                                    <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input 
                                        type="tel"
                                        value={profileForm.phone}
                                        onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/50"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Biển số xe thường chạy</label>
                                <div className="relative">
                                    <Truck size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input 
                                        type="text"
                                        value={profileForm.licensePlate}
                                        onChange={e => setProfileForm({ ...profileForm, licensePlate: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/50 uppercase font-mono"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Hạng bằng lái (GPLX)</label>
                                <div className="relative">
                                    <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <select
                                        value={profileForm.licenseType}
                                        onChange={e => setProfileForm({ ...profileForm, licenseType: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none"
                                    >
                                        <option value="">Chưa cập nhật</option>
                                        <option value="C">Hạng C</option>
                                        <option value="EC">Hạng EC</option>
                                        <option value="FC">Hạng FC</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full mt-4 py-3.5 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50"
                            >
                                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><Save size={18} /> Gửi Yêu Cầu Cập Nhật</>}
                            </button>
                        </form>
                    </div>
                ) : (
                    <form onSubmit={handlePasswordSubmit} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Mật khẩu cũ</label>
                            <input 
                                type="password"
                                required
                                value={passForm.oldPassword}
                                onChange={e => setPassForm({ ...passForm, oldPassword: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/50"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Mật khẩu mới</label>
                            <input 
                                type="password"
                                required
                                value={passForm.newPassword}
                                onChange={e => setPassForm({ ...passForm, newPassword: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/50"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Xác nhận mật khẩu mới</label>
                            <input 
                                type="password"
                                required
                                value={passForm.confirmPassword}
                                onChange={e => setPassForm({ ...passForm, confirmPassword: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/50"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !passForm.oldPassword || !passForm.newPassword || !passForm.confirmPassword}
                            className="w-full mt-4 py-3.5 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><Key size={18} /> Đổi Mật Khẩu</>}
                        </button>
                    </form>
                )}
            </div>

            {/* Logout Button */}
            <div className="mx-3 mt-8">
                <button
                    onClick={() => {
                        if (window.confirm('Bạn có chắc chắn muốn đăng xuất không?')) {
                            logout();
                        }
                    }}
                    className="w-full py-3.5 bg-red-50 text-red-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 active:bg-red-200 transition-colors border border-red-100/50"
                >
                    <LogOut size={18} /> Đăng xuất khỏi thiết bị
                </button>
            </div>
        </div>
    );
};
