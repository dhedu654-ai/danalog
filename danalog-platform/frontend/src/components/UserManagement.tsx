import React, { useState, useEffect } from 'react';
import { User, UserRole, useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Plus, Edit2, Shield, Truck, Phone, Search, X, Check, Power, Lock, Trash2, Eye } from 'lucide-react';

interface UserManagementProps {
    users: User[];
    onRefresh: () => void;
}

const formatLicensePlate = (plate: string) => {
    if (!plate) return '';
    // Use Standard Format XXC-XXX.XX
    const clean = plate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (clean.length > 3) {
        let formatted = clean.slice(0, 3) + '-' + clean.slice(3);
        if (clean.length > 6) {
            // XXC-123.45 length > 6 means has dot part
            formatted = clean.slice(0, 3) + '-' + clean.slice(3, 6) + '.' + clean.slice(6, 8);
        }
        return formatted;
    }
    return clean;
};

export function UserManagement({ users, onRefresh }: UserManagementProps) {
    const { user: currentUser } = useAuth();
    const isAdmin = currentUser?.role === 'ADMIN';

    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Form State
    const [formData, setFormData] = useState<Partial<User>>({
        username: '',
        name: '',
        employeeCode: '',
        role: 'DRIVER',
        licensePlate: '',
        status: 'ACTIVE',
        password: '12345',
        email: '',
        phone: '',
        fuelCapacity: undefined
    });

    const resetForm = () => {
        setFormData({
            username: '',
            name: '',
            employeeCode: '',
            role: 'DRIVER',
            licensePlate: '',
            status: 'ACTIVE',
            password: '12345',
            email: '',
            phone: '',
            fuelCapacity: undefined
        });
        setEditingUser(null);
        setError('');
    };

    const handleOpenCreate = () => {
        resetForm();
        setIsModalOpen(true);
    };

    const handleOpenEdit = (user: User) => {
        setEditingUser(user);
        setFormData({
            ...user,
            password: '' // Don't show password
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            if (editingUser) {
                // Update
                await api.updateUser(editingUser.username, formData);
            } else {
                // Create
                await api.createUser(formData);
            }
            onRefresh();
            setIsModalOpen(false);
            resetForm();
        } catch (err: any) {
            console.error("Error saving user:", err);
            setError(err.message || 'Có lỗi xảy ra. Kiểm tra lại thông tin hoặc tên đăng nhập.');
        } finally {
            setIsLoading(false);
        }
    };

    const [filterRole, setFilterRole] = useState<'ALL' | UserRole>('ALL');
    const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

    const filteredUsers = users.filter(u => {
        const matchesSearch = u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = filterRole === 'ALL' || u.role === filterRole;
        const matchesStatus = filterStatus === 'ALL' || (u.status || 'ACTIVE') === filterStatus;
        return matchesSearch && matchesRole && matchesStatus;
    });

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Shield className="text-blue-600" />
                        Quản lý Tài khoản
                    </h2>
                    <p className="text-slate-500 mt-1">
                        Tổng số: <span className="font-bold text-blue-600">{users.length}</span> nhân viên
                        {filteredUsers.length !== users.length && ` (Đang hiển thị: ${filteredUsers.length})`}
                    </p>
                </div>
                {isAdmin && (
                    <button
                        onClick={handleOpenCreate}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                    >
                        <Plus size={20} />
                        Thêm tài khoản
                    </button>
                )}
            </div>

            {/* Filters & Search */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo tên hoặc username..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-4">
                        <select
                            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700"
                            value={filterRole}
                            onChange={e => setFilterRole(e.target.value as any)}
                        >
                            <option value="ALL">Tất cả vai trò</option>
                            <option value="DRIVER">Lái xe</option>
                            <option value="DISPATCHER">Điều vận</option>
                            <option value="DV_LEAD">Trưởng phòng Điều vận</option>
                            <option value="CS">CS (Văn phòng)</option>
                            <option value="CS_LEAD">Trưởng phòng CS</option>
                            <option value="ACCOUNTANT">Kế toán</option>
                            <option value="ADMIN">Quản trị viên</option>
                        </select>

                        <select
                            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700"
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value as any)}
                        >
                            <option value="ALL">Tất cả trạng thái</option>
                            <option value="ACTIVE">Hoạt động</option>
                            <option value="INACTIVE">Vô hiệu hóa</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-slate-600 text-sm font-bold uppercase">
                                <th className="p-4">Người dùng</th>
                                <th className="p-4">Vai trò</th>
                                <th className="p-4">Ngày gia nhập</th>
                                <th className="p-4">Thông tin thêm</th>
                                <th className="p-4 text-center">Trạng thái</th>
                                <th className="p-4 text-center">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredUsers.map(user => (
                                <tr key={user.username} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${user.role === 'ADMIN' ? 'bg-purple-500' :
                                                user.role === 'CS' ? 'bg-pink-500' : 'bg-blue-500'
                                                }`}>
                                                {user.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800">{user.name}</div>
                                                <div className="text-xs text-slate-500">@{user.username} {user.employeeCode ? `• ${user.employeeCode}` : ''}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                            user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                                            user.role === 'CS' || user.role === 'CS_LEAD' ? 'bg-pink-100 text-pink-700' :
                                            user.role === 'DISPATCHER' || user.role === 'DV_LEAD' ? 'bg-indigo-100 text-indigo-700' :
                                            user.role === 'ACCOUNTANT' ? 'bg-amber-100 text-amber-700' :
                                            'bg-blue-100 text-blue-700'
                                            }`}>
                                            {user.role === 'DRIVER' ? 'Lái xe' :
                                                user.role === 'CS' ? 'CS' :
                                                    user.role === 'CS_LEAD' ? 'TP. CS' :
                                                        user.role === 'DISPATCHER' ? 'Điều vận' :
                                                            user.role === 'DV_LEAD' ? 'TP. Điều vận' :
                                                                user.role === 'ACCOUNTANT' ? 'Kế toán' :
                                                                    user.role === 'ADMIN' ? 'Quản trị viên' : user.role}
                                        </span>
                                    </td>
                                    <td className="p-4 text-sm text-slate-600">
                                        {user.joinedAt ? new Date(user.joinedAt).toLocaleDateString('vi-VN') : '-'}
                                    </td>
                                    <td className="p-4">
                                        {user.role === 'DRIVER' && (
                                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                                <Truck size={16} />
                                                <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">{user.licensePlate ? formatLicensePlate(user.licensePlate) : '-'}</span>
                                                {(user as any).fuelCapacity && (
                                                    <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-xs font-bold">
                                                        {(user as any).fuelCapacity}L
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <span className={`flex w-fit items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${user.status === 'INACTIVE'
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-green-100 text-green-700'
                                            }`}>
                                            <span className={`w-2 h-2 rounded-full ${user.status === 'INACTIVE' ? 'bg-red-500' : 'bg-green-500'
                                                }`} />
                                            {user.status === 'INACTIVE' ? 'Vô hiệu hóa' : 'Hoạt động'}
                                        </span>
                                    </td>
                                    <td className="p-4 flex justify-center gap-2">
                                        {isAdmin ? (
                                            <>
                                                {user.status === 'INACTIVE' && (
                                                    <button
                                                        onClick={() => {
                                                            if (window.confirm('Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản này? Hành động này không thể hoàn tác.')) {
                                                                api.deleteUser(user.username)
                                                                    .then(() => {
                                                                        onRefresh();
                                                                    })
                                                                    .catch(err => {
                                                                        console.error("Failed to delete user", err);
                                                                        alert('Xóa thất bại');
                                                                    });
                                                            }
                                                        }}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                        title="Xóa vĩnh viễn"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleOpenEdit(user)}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                    title="Chỉnh sửa"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => handleOpenEdit(user)}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                title="Xem chi tiết"
                                            >
                                                <Eye size={18} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg text-slate-800">
                                {editingUser ? (!isAdmin ? 'Thông tin tài khoản' : 'Chỉnh sửa tài khoản') : 'Thêm tài khoản mới'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {error && (
                                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                                    <Search size={16} className="shrink-0" />
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Tên đăng nhập</label>
                                <input
                                    type="text"
                                    required
                                    disabled={!!editingUser}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-500"
                                    value={formData.username}
                                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Mã nhân viên (Tùy chọn)</label>
                                <input
                                    type="text"
                                    disabled={!isAdmin}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50 disabled:text-slate-500"
                                    placeholder="VD: NV-0123"
                                    value={formData.employeeCode || ''}
                                    onChange={e => setFormData({ ...formData, employeeCode: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Họ và tên</label>
                                <input
                                    type="text"
                                    required
                                    disabled={!isAdmin}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50 disabled:text-slate-500"
                                    placeholder="VD: Nguyễn Văn A"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        disabled={!isAdmin}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50 disabled:text-slate-500"
                                        placeholder="example@email.com"
                                        value={formData.email || ''}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Số điện thoại</label>
                                    <input
                                        type="tel"
                                        disabled={!isAdmin}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50 disabled:text-slate-500"
                                        placeholder="0901234567"
                                        value={formData.phone || ''}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Mật khẩu</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        required={!editingUser}
                                        disabled={!isAdmin}
                                        placeholder={editingUser ? "Để trống nếu không đổi mật khẩu" : "Nhập mật khẩu"}
                                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono text-slate-700 disabled:bg-slate-50 disabled:text-slate-500"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    />
                                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Vai trò</label>
                                    <select
                                        disabled={!isAdmin}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50 disabled:text-slate-500"
                                        value={formData.role}
                                        onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
                                    >
                                        <option value="DRIVER">Lái xe</option>
                                        <option value="DISPATCHER">Điều vận</option>
                                        <option value="DV_LEAD">Trưởng phòng Điều vận</option>
                                        <option value="CS">CS (Văn phòng)</option>
                                        <option value="CS_LEAD">Trưởng phòng CS</option>
                                        <option value="ACCOUNTANT">Kế toán</option>
                                        <option value="ADMIN">Quản trị viên</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Trạng thái</label>
                                    <select
                                        disabled={!isAdmin}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50 disabled:text-slate-500"
                                        value={formData.status || 'ACTIVE'}
                                        onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                                    >
                                        <option value="ACTIVE">Hoạt động</option>
                                        <option value="INACTIVE">Vô hiệu hóa</option>
                                    </select>
                                </div>
                            </div>

                            {formData.role === 'DRIVER' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Biển số xe (Tùy chọn)</label>
                                        <input
                                            type="text"
                                            disabled={!isAdmin}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none uppercase font-mono disabled:bg-slate-50 disabled:text-slate-500"
                                            placeholder="VD: 43C 12345"
                                            value={formData.licensePlate || ''}
                                            onChange={e => setFormData({ ...formData, licensePlate: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Dung tích bình NL (Lít)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="1"
                                            disabled={!isAdmin}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono disabled:bg-slate-50 disabled:text-slate-500"
                                            placeholder="VD: 300"
                                            value={formData.fuelCapacity || ''}
                                            onChange={e => setFormData({ ...formData, fuelCapacity: parseFloat(e.target.value) || undefined })}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4">
                                {!isAdmin ? (
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-6 py-2 rounded-xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                                    >
                                        Đóng
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => setIsModalOpen(false)}
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
                                            {editingUser ? 'Lưu thay đổi' : 'Tạo tài khoản'}
                                        </button>
                                    </>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
