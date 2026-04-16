import React, { useState } from 'react';
import { api } from '../services/api';
import { X, Lock, Save, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    username: string;
}

export function ChangePasswordModal({ isOpen, onClose, username }: ChangePasswordModalProps) {
    const { logout } = useAuth();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Mật khẩu xác nhận không khớp');
            return;
        }

        if (password.length < 5) {
            setError('Mật khẩu phải có ít nhất 5 ký tự');
            return;
        }

        setIsLoading(true);
        try {
            await api.updateUser(username, { password });
            alert('Đổi mật khẩu thành công! Vui lòng đăng nhập lại.');
            onClose();
            logout(); // Clear session to force re-login
        } catch (err) {
            console.error("Failed to change password", err);
            setError('Đổi mật khẩu thất bại. Vui lòng thử lại.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <Lock size={18} className="text-blue-600" />
                        Đổi Mật Khẩu
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                            <AlertCircle size={16} className="shrink-0" />
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Mật khẩu mới</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                className="w-full pl-10 pr-10 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono text-slate-700"
                                placeholder="Nhập mật khẩu mới"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Xác nhận mật khẩu</label>
                        <div className="relative">
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                required
                                className="w-full pl-10 pr-10 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono text-slate-700"
                                placeholder="Nhập lại mật khẩu"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                            />
                            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-6 py-2 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-md transition-all flex items-center gap-2"
                        >
                            {isLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                            Lưu
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
