import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Truck, Lock, User, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';

export const LoginPage = () => {
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [remember, setRemember] = useState(true);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Pre-fill username from previous login
    useEffect(() => {
        const lastUser = localStorage.getItem('danalog_last_username');
        if (lastUser) {
            setUsername(lastUser);
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            // Loại bỏ khoảng trắng thừa để tránh lỗi khi copy-paste
            const res = await login(username.trim(), password.trim(), remember);
            if (res.success) {
                // Save username for next time regardless of "remember me" flag
                localStorage.setItem('danalog_last_username', username);
            } else {
                alert(res.message || 'Tên đăng nhập hoặc mật khẩu không đúng');
                setError(res.message || 'Tên đăng nhập hoặc mật khẩu không đúng');
            }
        } catch (err) {
            setError('Đã có lỗi xảy ra. Vui lòng thử lại.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
                {/* Header Section */}
                <div className="bg-[#1e293b] p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-blue-600/10 z-0"></div>
                    <div className="relative z-10">
                        <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/20">
                            <Truck className="text-blue-400" size={32} />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">DANALOG Platform</h1>
                        <p className="text-slate-400 text-sm">Hệ thống Quản lý Vận tải & Logistics</p>
                    </div>
                </div>

                {/* Login Form */}
                <div className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Tên đăng nhập</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-slate-50 focus:bg-white"
                                    placeholder="Nhập tên đăng nhập"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Mật khẩu</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-slate-50 focus:bg-white"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center gap-2 text-sm animate-in fade-in slide-in-from-top-2">
                                <AlertCircle size={16} />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <input
                                    id="remember-me"
                                    name="remember-me"
                                    type="checkbox"
                                    checked={remember}
                                    onChange={(e) => setRemember(e.target.checked)}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded cursor-pointer"
                                />
                                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-700 cursor-pointer select-none">
                                    Ghi nhớ đăng nhập
                                </label>
                            </div>
                            <button
                                type="button"
                                onClick={() => alert("Hệ thống không thể tự động cấp lại mật khẩu.\n\nVui lòng liên hệ Trưởng bộ phận hoặc Admin Hệ thống (Zalo/SĐT: 09xx) để được hỗ trợ cấp lại mật khẩu mới.")}
                                className="text-sm font-medium text-blue-600 hover:text-blue-500 hover:underline"
                            >
                                Quên mật khẩu?
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-blue-600/30"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    <span>Đang đăng nhập...</span>
                                </>
                            ) : (
                                <>
                                    <span>Đăng nhập hệ thống</span>
                                    <ArrowRight size={20} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-xs text-slate-400">
                            2023 DANA Logistics. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
