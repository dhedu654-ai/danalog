import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Plus, Edit3, Trash2, Search, Users, X, Save, Building2, Eye } from 'lucide-react';

interface Customer {
    id: string;
    code: string;
    name: string;
    taxCode?: string;
    contractNo?: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
    status: 'ACTIVE' | 'INACTIVE';
    createdAt: string;
    updatedAt: string;
}

interface CustomerModalProps {
    isOpen: boolean;
    customer: Customer | null;
    onClose: () => void;
    onSave: () => void;
    readOnly?: boolean;
}

function CustomerModal({ isOpen, customer, onClose, onSave, readOnly }: CustomerModalProps) {
    const [formData, setFormData] = useState<Partial<Customer>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (customer) {
            setFormData({ ...customer });
        } else {
            setFormData({ status: 'ACTIVE' });
        }
        setError('');
    }, [customer, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (readOnly) return;

        if (!formData.code || !formData.name) {
            setError('Mã và Tên khách hàng là bắt buộc');
            return;
        }

        setIsSaving(true);
        setError('');

        try {
            if (customer) {
                await api.updateCustomer(customer.id, formData);
            } else {
                await api.createCustomer(formData);
            }
            onSave();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Có lỗi xảy ra');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Building2 size={20} className="text-blue-600" />
                            {customer ? (readOnly ? 'Chi Tiết Khách Hàng' : 'Chỉnh Sửa Khách Hàng') : 'Thêm Khách Hàng Mới'}
                        </h3>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                                Mã khách hàng <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                disabled={readOnly}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50 disabled:text-slate-500"
                                value={formData.code || ''}
                                onChange={e => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                                placeholder="VD: QZY"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Trạng thái</label>
                            <select
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50 disabled:text-slate-500"
                                value={formData.status || 'ACTIVE'}
                                disabled={readOnly}
                                onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as 'ACTIVE' | 'INACTIVE' }))}
                            >
                                <option value="ACTIVE">Đang hoạt động</option>
                                <option value="INACTIVE">Ngừng hoạt động</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                            Tên khách hàng <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            disabled={readOnly}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none uppercase disabled:bg-slate-50 disabled:text-slate-500"
                            value={formData.name || ''}
                            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value.toUpperCase() }))}
                            placeholder="Tên đầy đủ của khách hàng"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mã số thuế</label>
                            <input
                                type="text"
                                disabled={readOnly}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50 disabled:text-slate-500"
                                value={formData.taxCode || ''}
                                onChange={e => setFormData(prev => ({ ...prev, taxCode: e.target.value }))}
                                placeholder="VD: 0123456789"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Số hợp đồng</label>
                            <input
                                type="text"
                                disabled={readOnly}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50 disabled:text-slate-500"
                                value={formData.contractNo || ''}
                                onChange={e => setFormData(prev => ({ ...prev, contractNo: e.target.value }))}
                                placeholder="VD: HD-2024-001"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Người liên hệ</label>
                            <input
                                type="text"
                                disabled={readOnly}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50 disabled:text-slate-500"
                                value={formData.contactPerson || ''}
                                onChange={e => setFormData(prev => ({ ...prev, contactPerson: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Số điện thoại</label>
                            <input
                                type="tel"
                                disabled={readOnly}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50 disabled:text-slate-500"
                                value={formData.phone || ''}
                                onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                        <input
                            type="email"
                            disabled={readOnly}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50 disabled:text-slate-500"
                            value={formData.email || ''}
                            onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Địa chỉ</label>
                        <textarea
                            rows={2}
                            disabled={readOnly}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none disabled:bg-slate-50 disabled:text-slate-500"
                            value={formData.address || ''}
                            onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        {readOnly ? (
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-2 rounded-lg font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                            >
                                Đóng
                            </button>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-5 py-2 rounded-lg font-medium text-slate-500 hover:bg-slate-100 transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-6 py-2 rounded-lg font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                    <Save size={16} />
                                    {isSaving ? 'Đang lưu...' : (customer ? 'Cập nhật' : 'Tạo mới')}
                                </button>
                            </>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}

export function CustomerManagement() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'ADMIN';

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const loadCustomers = async () => {
        try {
            const data = await api.getCustomers();
            setCustomers(data);
        } catch (error) {
            console.error('Failed to load customers', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadCustomers();
    }, []);

    const handleDelete = async (customer: Customer) => {
        if (!window.confirm(`Bạn có chắc chắn muốn xóa khách hàng "${customer.name}"?`)) return;

        try {
            await api.deleteCustomer(customer.id);
            loadCustomers();
        } catch (error) {
            alert('Lỗi khi xóa khách hàng');
        }
    };

    const filteredCustomers = customers.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.code.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'ALL' || c.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <Users className="text-blue-600" size={28} />
                        Quản Lý Khách Hàng
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Quản lý thông tin khách hàng trong hệ thống
                    </p>
                </div>
                {isAdmin && (
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                    >
                        <Plus size={18} />
                        Thêm Khách Hàng
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="flex gap-4 items-center">
                <div className="relative flex-1 max-w-md">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Tìm theo mã hoặc tên khách hàng..."
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <select
                    className="px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value as any)}
                >
                    <option value="ALL">Tất cả trạng thái</option>
                    <option value="ACTIVE">Đang hoạt động</option>
                    <option value="INACTIVE">Ngừng hoạt động</option>
                </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Mã</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Tên khách hàng</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Liên hệ</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">SĐT</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Trạng thái</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredCustomers.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                                    Không tìm thấy khách hàng nào.
                                </td>
                            </tr>
                        ) : (
                            filteredCustomers.map(customer => (
                                <tr key={customer.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <span className="font-mono font-bold text-sm text-slate-700 bg-slate-100 px-2 py-1 rounded">
                                            {customer.code}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-medium text-slate-800">{customer.name}</td>
                                    <td className="px-4 py-3 text-sm text-slate-600">{customer.contactPerson || '-'}</td>
                                    <td className="px-4 py-3 text-sm text-slate-600">{customer.phone || '-'}</td>
                                    <td className="px-4 py-3">
                                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${customer.status === 'ACTIVE'
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-slate-100 text-slate-500'
                                            }`}>
                                            {customer.status === 'ACTIVE' ? 'Hoạt động' : 'Ngừng HĐ'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {isAdmin ? (
                                            <>
                                                <button
                                                    onClick={() => setEditingCustomer(customer)}
                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Chỉnh sửa"
                                                >
                                                    <Edit3 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(customer)}
                                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-1"
                                                    title="Xóa"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => setEditingCustomer(customer)}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Xem chi tiết"
                                            >
                                                <Eye size={16} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Stats */}
            <div className="text-sm text-slate-500 text-right">
                Tổng cộng: <span className="font-bold text-slate-700">{customers.length}</span> khách hàng |
                Hoạt động: <span className="font-bold text-emerald-600">{customers.filter(c => c.status === 'ACTIVE').length}</span> |
                Ngừng HĐ: <span className="font-bold text-slate-500">{customers.filter(c => c.status === 'INACTIVE').length}</span>
            </div>

            {/* Modal */}
            <CustomerModal
                isOpen={isCreateModalOpen || !!editingCustomer}
                customer={editingCustomer}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    setEditingCustomer(null);
                }}
                onSave={loadCustomers}
                readOnly={!isAdmin}
            />
        </div>
    );
}
