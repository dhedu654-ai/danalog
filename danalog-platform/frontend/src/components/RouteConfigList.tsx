import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { RouteConfig } from '../types';
import { Edit3, Trash2, Plus, Filter, Search, Eye, Clock, CalendarClock, XCircle } from 'lucide-react';
import { RouteConfigModal } from './RouteConfigModal';
import { RouteHistoryModal } from './RouteHistoryModal';
import { PendingChangesModal } from './PendingChangesModal';

interface RouteConfigListProps {
    configs: RouteConfig[];
    onUpdateConfigs: (configs: RouteConfig[]) => void;
    isReadOnly?: boolean;
}

export function RouteConfigList({ configs, onUpdateConfigs, isReadOnly }: RouteConfigListProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCustomer, setFilterCustomer] = useState('ALL');
    const [filterCargoType, setFilterCargoType] = useState('ALL');
    const [editingConfig, setEditingConfig] = useState<RouteConfig | null>(null);
    const [historyConfig, setHistoryConfig] = useState<RouteConfig | null>(null);
    const [pendingPreviewConfig, setPendingPreviewConfig] = useState<RouteConfig | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [customers, setCustomers] = useState<{ id: string; name: string; status: string }[]>([]);

    // Fetch customers for filter dropdown
    useEffect(() => {
        api.getCustomers().then(data => {
            setCustomers((data || []).filter((c: any) => c.status === 'ACTIVE'));
        }).catch(() => setCustomers([]));
    }, []);

    const handleCancelPending = async (configId: string) => {
        if (!window.confirm('Bạn có chắc chắn muốn hủy thay đổi đang chờ không?')) return;
        try {
            await api.cancelPendingChanges(configId);
            alert('Hủy thay đổi thành công');
            // Refresh list
            const updatedConfigs = await api.getRouteConfigs();
            onUpdateConfigs(updatedConfigs);
        } catch (error) {
            alert('Lỗi khi hủy thay đổi');
        }
    };

    // Refresh configs from server without saving
    const refreshConfigs = async () => {
        try {
            const updatedConfigs = await api.getRouteConfigs();
            onUpdateConfigs(updatedConfigs);
        } catch (error) {
            console.error('Failed to refresh configs', error);
        }
    };

    const filteredConfigs = configs.filter(config => {
        const matchesSearch =
            (config.routeName || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCustomer = filterCustomer === 'ALL' || config.customer === filterCustomer;
        const matchesCargoType = filterCargoType === 'ALL' || config.cargoType === filterCargoType;
        return matchesSearch && matchesCustomer && matchesCargoType;
    });

    const uniqueCargoTypes = Array.from(new Set(configs.map(c => c.cargoType)));

    const handleSaveConfig = (newConfig: RouteConfig) => {
        if (isReadOnly) return; // double check

        if (editingConfig) {
            // Update existing
            const updated = configs.map(c => c.id === newConfig.id ? newConfig : c);
            onUpdateConfigs(updated);
            setEditingConfig(null);
        } else {
            // Create new
            onUpdateConfigs([...configs, newConfig]);
            setIsCreateModalOpen(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (isReadOnly) return;

        const isConfirmed = window.confirm('BẠN CÓ CHẮC CHẮN MUỐN XÓA TUYẾN NÀY KHÔNG?\n\nHành động này không thể hoàn tác!');

        if (isConfirmed) {
            try {
                await api.deleteRouteConfig(id);
                // Update local list
                const newConfigs = configs.filter(c => c.id !== id);
                onUpdateConfigs(newConfigs);
                alert("Đã xóa tuyến đường thành công!");
            } catch (error) {
                console.error("Failed to delete config", error);
                alert("Lỗi khi xóa tuyến đường. Vui lòng thử lại.");
            }
        }
    };

    return (
        <div className="space-y-6 font-sans">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Cấu Hình Tuyến Đường</h2>
                    <p className="text-slate-500 mt-1">Quản lý định mức doanh thu, lương và nhiên liệu cho từng tuyến.</p>
                </div>
                {!isReadOnly && (
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-[#1e3a8a] text-white font-bold rounded-xl shadow-md hover:bg-blue-900 transition-all hover:shadow-lg active:scale-95"
                    >
                        <Plus size={20} />
                        Thêm Tuyến Mới
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2 text-slate-400 mr-4 border-r border-slate-200 pr-4">
                    <Filter size={20} />
                    <span className="font-bold text-xs uppercase">Bộ lọc</span>
                </div>

                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Tìm theo mã hoặc tên tuyến..."
                        className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64 transition-all"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <select
                    className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700 cursor-pointer"
                    value={filterCustomer}
                    onChange={e => setFilterCustomer(e.target.value)}
                >
                    <option value="ALL">Tất cả Khách Hàng</option>
                    {customers.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                </select>

                <select
                    className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700 cursor-pointer"
                    value={filterCargoType}
                    onChange={e => setFilterCargoType(e.target.value)}
                >
                    <option value="ALL">Tất cả Loại Hàng</option>
                    {uniqueCargoTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                    ))}
                </select>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredConfigs.map(config => (
                    <div key={config.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    {config.status === 'ACTIVE' ? (
                                        <span className="w-2 h-2 rounded-full bg-emerald-500" title="Active"></span>
                                    ) : (
                                        <span className="w-2 h-2 rounded-full bg-slate-300" title="Inactive"></span>
                                    )}
                                </div>
                                <h3 className="font-bold text-slate-800 line-clamp-1" title={config.routeName}>{config.routeName}</h3>
                                <div className="flex gap-2 mt-1">
                                    <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-md border border-slate-200 shadow-sm">
                                        {config.customer}
                                    </span>
                                    <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded-md border border-blue-200 shadow-sm">
                                        {(() => {
                                            const map: Record<string, string> = {
                                                'TR_C_NOI_BO': 'Trung chuyển NB',
                                                'TR_C_CHUYEN_GIAY': 'Trung chuyển Giấy',
                                                'KHO_CFS_40': 'Kho CFS 40\'',
                                                'KHO_CFS_20': 'Kho CFS 20\'',
                                                'VC_GIAY': 'Vận chuyển Giấy',
                                                'VC_BOT': 'Vận chuyển Bột',
                                                'VC_CONT': 'Vận chuyển Cont',
                                                'LUU_DEM': 'Lưu đêm'
                                            };
                                            return map[config.cargoType] || config.cargoType;
                                        })()}
                                    </span>
                                    {config.isNightStay && (
                                        <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100 flex items-center gap-1">
                                            <span className="w-1 h-1 bg-purple-500 rounded-full animate-pulse"></span>
                                            Lưu đêm ({config.nightStayLocation === 'INNER_CITY' ? 'Trong TP' : 'Ngoài TP'})
                                        </span>
                                    )}
                                    {config.pendingChanges && (
                                        <button
                                            onClick={() => setPendingPreviewConfig(config)}
                                            className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 flex items-center gap-1 cursor-pointer hover:bg-amber-100 transition-colors"
                                            title="Bấm để xem chi tiết thay đổi"
                                        >
                                            <CalendarClock size={10} />
                                            {(() => {
                                                const p = Array.isArray(config.pendingChanges) ? config.pendingChanges[0] : config.pendingChanges;
                                                const count = Array.isArray(config.pendingChanges) ? config.pendingChanges.length : 1;
                                                return `Chờ ${p?.effectiveDate}${count > 1 ? ` (+${count - 1})` : ''}`;
                                            })()}
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => setHistoryConfig(config)}
                                    className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                    title="Xem lịch sử"
                                >
                                    <Clock size={16} />
                                </button>
                                <button
                                    onClick={() => setEditingConfig(config)}
                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title={isReadOnly ? "Xem chi tiết" : "Chỉnh sửa"}
                                >
                                    {isReadOnly ? <Eye size={16} /> : <Edit3 size={16} />}
                                </button>
                                {!isReadOnly && (
                                    <button
                                        onClick={() => handleDelete(config.id)}
                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Xóa"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                                {!isReadOnly && config.pendingChanges && (
                                    <button
                                        onClick={() => handleCancelPending(config.id)}
                                        className="p-1.5 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                                        title="Hủy thay đổi đang chờ"
                                    >
                                        <XCircle size={16} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="p-5 space-y-4">
                            <div className="flex justify-between items-end">
                                <span className="text-xs font-semibold text-slate-400 uppercase">Doanh thu</span>
                                <span className="text-lg font-bold text-emerald-600">
                                    {config.revenue?.price40F?.toLocaleString() || 0} <span className="text-xs text-slate-400 font-normal">đ</span>
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium mt-1">(40' Full)</span>
                            </div>

                            <div className="flex justify-between items-end border-t border-dashed border-slate-100 pt-3">
                                <span className="text-xs font-semibold text-slate-400 uppercase">Lương LX</span>
                                <span className="text-base font-bold text-blue-600">
                                    {config.salary?.driverSalary?.toLocaleString() || 0} <span className="text-xs text-slate-400 font-normal">đ</span>
                                </span>
                            </div>

                            <div className="flex justify-between items-end border-t border-dashed border-slate-100 pt-3">
                                <div className="flex flex-col">
                                    <span className="text-xs font-semibold text-slate-400 uppercase">Nhiên liệu</span>
                                    <span className="text-[10px] text-slate-400 font-medium">({config.fuel?.truckType === 'TRACTOR' ? 'Đầu kéo' : 'Xe tải'})</span>
                                </div>
                                <span className="text-sm font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">
                                    {config.fuel?.quota || 0} <span className="text-xs text-slate-500 font-normal">Lít</span>
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <RouteConfigModal
                isOpen={isCreateModalOpen || !!editingConfig}
                config={editingConfig}
                isNew={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    setEditingConfig(null);
                }}
                onSave={handleSaveConfig}
                onRefresh={refreshConfigs}
                // Double protection: Check prop OR check localStorage role directly
                isReadOnly={isReadOnly || (localStorage.getItem('user_role') === '"CS"' || JSON.parse(localStorage.getItem('currentUser') || '{}').role === 'CS')}
            />

            <RouteHistoryModal
                isOpen={!!historyConfig}
                routeId={historyConfig?.id || null}
                routeName={historyConfig?.routeName || null}
                onClose={() => setHistoryConfig(null)}
            />

            <PendingChangesModal
                isOpen={!!pendingPreviewConfig}
                config={pendingPreviewConfig}
                onClose={() => setPendingPreviewConfig(null)}
            />
        </div>
    );
}
