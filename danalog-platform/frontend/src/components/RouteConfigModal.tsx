import { useState, useEffect } from 'react';
import { RouteConfig } from '../types';
import { X, Save, DollarSign, Truck, Fuel, MapPin, Calendar, Activity } from 'lucide-react';
import { api } from '../services/api';

interface RouteConfigModalProps {
    config: RouteConfig | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (config: RouteConfig) => void;
    onRefresh?: () => void; // Refresh data from server without saving locally
    isNew?: boolean;
    isReadOnly?: boolean;
}

export function RouteConfigModal({ config, isOpen, onClose, onSave, onRefresh, isNew, isReadOnly }: RouteConfigModalProps) {
    const [formData, setFormData] = useState<Partial<RouteConfig>>({});
    const [activeTab, setActiveTab] = useState<'basic' | 'revenue' | 'salary' | 'fuel'>('basic');
    const [pendingEffectiveDate, setPendingEffectiveDate] = useState('');
    const [dateError, setDateError] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [customers, setCustomers] = useState<{ id: string; code: string; name: string; status: string }[]>([]);
    const [existingCargoTypes, setExistingCargoTypes] = useState<string[]>([]);

    useEffect(() => {
        if (config) {
            setFormData({ ...config });
            setPendingEffectiveDate('');
            setDateError('');
        } else if (isNew) {
            // For new routes, set tomorrow as min date
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            setFormData({
                id: `RT-${Date.now()}`,
                status: 'ACTIVE',
                cargoType: 'VC_CONT',
                isNightStay: false,
                revenue: {
                    price40F: 0, price40E: 0,
                    price20F: 0, price20E: 0,
                    liftDescFee: 0
                },
                salary: { driverSalary: 0, surcharge: 0 },
                fuel: { truckType: 'TRACTOR', quota: 0, gasStations: [] },
                effectiveDate: tomorrow.toISOString().split('T')[0]
            });
            setPendingEffectiveDate(tomorrow.toISOString().split('T')[0]);
            setDateError('');
        }
    }, [config, isNew, isOpen]);


    // Fetch customers and existing Cargo Types from API
    useEffect(() => {
        if (isOpen) {
            // Customers
            api.getCustomers().then(data => {
                setCustomers((data || []).filter((c: any) => c.status === 'ACTIVE'));
            }).catch(() => setCustomers([]));

            // Route Configs for Cargo Types
            api.getRouteConfigs().then((configs: RouteConfig[]) => {
                const types = new Set<string>();
                // Add standard presets
                types.add('TR_C_NOI_BO');
                types.add('TR_C_CHUYEN_GIAY');
                types.add('KHO_CFS_40');
                types.add('KHO_CFS_20');
                types.add('VC_GIAY');
                types.add('VC_BOT');
                types.add('VC_CONT');
                types.add('LUU_DEM');

                // Add existing types
                if (configs) {
                    configs.forEach(c => {
                        if (c.cargoType) types.add(c.cargoType);
                    });
                }
                setExistingCargoTypes(Array.from(types));
            }).catch(() => { });
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleChange = (field: keyof RouteConfig, value: any) => {
        if (isReadOnly) return;
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleNestedChange = (section: 'revenue' | 'salary' | 'fuel', field: string, value: any) => {
        if (isReadOnly) return;
        setFormData(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: value
            }
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isReadOnly) return;

        // Validate effective date
        const todayCommon = new Date().toLocaleDateString('en-CA');
        if (!pendingEffectiveDate) {
            setDateError('Vui lòng chọn ngày hiệu lực');
            return;
        }
        if (pendingEffectiveDate <= todayCommon) {
            setDateError('Ngày hiệu lực phải từ ngày mai trở đi (không được chọn hôm nay)');
            return;
        }

        // VALIDATION
        // 1. General Info
        if (!formData.customer || !formData.routeName || !formData.cargoType) {
            alert('Vui lòng điền đầy đủ: Khách hàng, Tên tuyến đường và Loại hàng/Dịch vụ');
            return;
        }

        // 2. Salary (Mandatory)
        if (!formData.salary?.driverSalary || formData.salary.driverSalary <= 0) {
            alert('Vui lòng nhập Lương chuyến hợp lệ (> 0 VNĐ)');
            setActiveTab('salary');
            return;
        }

        // 3. Revenue (Mandatory for all 4 types as requested)
        const rev: any = formData.revenue || {};
        const isInvalidPrice = (p: any) => p === undefined || p === null || p <= 0;

        if (
            isInvalidPrice(rev.price40F) ||
            isInvalidPrice(rev.price40E) ||
            isInvalidPrice(rev.price20F) ||
            isInvalidPrice(rev.price20E)
        ) {
            alert('Vui lòng nhập đầy đủ Doanh thu cho TẤT CẢ các loại container (20F, 20E, 40F, 40E) và phải lớn hơn 0');
            setActiveTab('revenue');
            return;
        }

        setIsSaving(true);
        setDateError('');

        try {
            if (isNew) {
                // For new routes, save directly with the effective date
                const newConfig = { ...formData, effectiveDate: pendingEffectiveDate } as RouteConfig;
                onSave(newConfig);
            } else {
                // For edits, save as pending changes
                const newPendingChange = {
                    effectiveDate: pendingEffectiveDate,
                    routeName: formData.routeName,
                    customer: formData.customer,
                    cargoType: formData.cargoType,
                    isNightStay: formData.isNightStay,
                    nightStayLocation: formData.nightStayLocation,
                    revenue: formData.revenue,
                    salary: formData.salary,
                    fuel: formData.fuel,
                    status: formData.status
                };

                // Get existing pending changes
                let currentPending: any[] = [];
                if (config && config.pendingChanges) {
                    if (Array.isArray(config.pendingChanges)) {
                        currentPending = [...config.pendingChanges];
                    } else {
                        currentPending = [config.pendingChanges];
                    }
                }

                // Check if same date exists
                const existingIndex = currentPending.findIndex((p: any) => p.effectiveDate === pendingEffectiveDate);

                if (existingIndex >= 0) {
                    // OVERWRITE: same date
                    currentPending[existingIndex] = newPendingChange;
                } else {
                    // ADD NEW: different date
                    currentPending.push(newPendingChange);
                }

                // Sort by date
                currentPending.sort((a: any, b: any) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime());

                // Send to backend
                if (config) {
                    await api.savePendingChanges(config.id, currentPending);
                    alert(`Đã lưu thay đổi cho ngày ${pendingEffectiveDate}.`);
                    if (onRefresh) onRefresh();
                }
            }
            onClose();
        } catch (error: any) {
            alert('Lỗi: ' + (error.message || 'Không thể lưu thay đổi'));
        } finally {
            setIsSaving(false);
        }
    };

    const tabs = [
        { id: 'basic', label: 'Thông tin chung', icon: <MapPin size={16} /> },
        { id: 'revenue', label: 'Doanh thu', icon: <DollarSign size={16} /> },
        { id: 'salary', label: 'Lương LX', icon: <Activity size={16} /> },
        { id: 'fuel', label: 'Nhiên liệu', icon: <Fuel size={16} /> },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-8 py-5 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            {isNew ? 'Thêm Mới Tuyến Đường' : (isReadOnly ? 'Chi Tiết Tuyến Đường (Xem Only)' : 'Cấu Hình Tuyến Đường')}
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                            {isReadOnly ? 'Chế độ xem: Không thể chỉnh sửa thông tin.' : 'Thiết lập định mức doanh thu, lương và nhiên liệu'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar Tabs */}
                    <div className="w-64 bg-slate-50 border-r border-slate-200 p-4 space-y-1 shrink-0 overflow-y-auto">
                        <div className="mb-6 px-2">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Điều hướng</h4>
                        </div>
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left ${activeTab === tab.id
                                    ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200'
                                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                                    }`}
                            >
                                <div className={`${activeTab === tab.id ? 'text-blue-500' : 'text-slate-400'}`}>
                                    {tab.icon}
                                </div>
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Main Content Form */}
                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 bg-white/50">
                        <fieldset disabled={isReadOnly} className="contents">

                            {/* BASIC INFO */}
                            {activeTab === 'basic' && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                    <h4 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Thông tin cơ bản (Updated)</h4>
                                    <div className="grid grid-cols-2 gap-6">
                                        {/* Row 1: Cargo Type & Customer */}
                                        <div className="col-span-2 md:col-span-1">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Loại hàng / Dịch vụ</label>
                                            <input
                                                list="cargo-types-list"
                                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700 disabled:bg-slate-100 disabled:text-slate-500"
                                                value={formData.cargoType || ''}
                                                onChange={e => {
                                                    const type = e.target.value;
                                                    handleChange('cargoType', type);
                                                    if (type === 'LUU_DEM') {
                                                        handleChange('isNightStay', true);
                                                    } else {
                                                        // Keep existing isNightStay value unless explicitly changed logic is desired
                                                    }
                                                }}
                                                placeholder="Chọn hoặc nhập loại hàng..."
                                            />
                                            <datalist id="cargo-types-list">
                                                {existingCargoTypes.map((type, idx) => (
                                                    <option key={`${type}-${idx}`} value={type} />
                                                ))}
                                            </datalist>
                                            <p className="text-[10px] text-slate-400 mt-1 italic">Nhập để tạo loại mới nếu chưa có.</p>
                                        </div>

                                        <div className="col-span-2 md:col-span-1">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Khách hàng</label>
                                            <select
                                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700 disabled:bg-slate-100 disabled:text-slate-500"
                                                value={formData.customer || ''}
                                                onChange={e => handleChange('customer', e.target.value)}
                                            >
                                                <option value="">Chọn khách hàng...</option>
                                                {customers.map(c => (
                                                    <option key={c.id} value={c.name}>{c.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Row 2: Route Name/Method */}
                                        <div className="col-span-2">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tên tuyến đường (Phương án vận chuyển)</label>
                                            {formData.cargoType === 'LUU_DEM' ? (
                                                <select
                                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700 disabled:bg-slate-100 disabled:text-slate-500"
                                                    value={formData.routeName || ''}
                                                    onChange={e => {
                                                        handleChange('routeName', e.target.value);
                                                        if (e.target.value === 'Trong Thành Phố') {
                                                            handleChange('nightStayLocation', 'INNER_CITY');
                                                        } else if (e.target.value === 'Ngoài Thành Phố') {
                                                            handleChange('nightStayLocation', 'OUTER_CITY');
                                                        }
                                                    }}
                                                >
                                                    <option value="">-- Chọn khu vực lưu đêm --</option>
                                                    <option value="Trong Thành Phố">Trong Thành Phố</option>
                                                    <option value="Ngoài Thành Phố">Ngoài Thành Phố</option>
                                                </select>
                                            ) : (
                                                <input
                                                    type="text"
                                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700 disabled:bg-slate-100 disabled:text-slate-500"
                                                    value={formData.routeName || ''}
                                                    onChange={e => handleChange('routeName', e.target.value)}
                                                    placeholder="VD: Cảng Tiên Sa - KCN Hòa Khánh"
                                                />
                                            )}
                                        </div>

                                        {/* Night Stay Logic - Only show for LUU_DEM */}
                                        {formData.cargoType === 'LUU_DEM' && (
                                            <div className="col-span-2 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                                <div className="flex items-center justify-between mb-4">
                                                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                                        <Activity size={18} className="text-blue-600" />
                                                        Cấu hình chi tiết Lưu đêm
                                                    </label>
                                                </div>

                                                <div className="animate-in fade-in zoom-in-95 duration-200 mt-2">
                                                    <label className="block text-xs font-bold text-blue-700 uppercase mb-2">Vị trí lưu đêm (Bắt buộc)</label>
                                                    <select
                                                        required
                                                        className="w-full px-4 py-2.5 bg-white border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700 disabled:bg-slate-100 disabled:text-slate-500"
                                                        value={formData.nightStayLocation || ''}
                                                        onChange={e => handleChange('nightStayLocation', e.target.value)}
                                                    >
                                                        <option value="">-- Chọn vị trí --</option>
                                                        <option value="INNER_CITY">Trong Thành Phố</option>
                                                        <option value="OUTER_CITY">Ngoài Thành Phố</option>
                                                    </select>
                                                    <p className="text-[10px] text-blue-500 mt-1 italic">
                                                        * Hệ thống sẽ dùng vị trí này để tính đơn giá lưu đêm tương ứng.
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        <div className="col-span-2 md:col-span-1">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Ngày hiệu lực</label>
                                            <div className="relative">
                                                <input
                                                    type="date"
                                                    disabled
                                                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700 disabled:bg-slate-100 disabled:text-slate-500"
                                                    value={formData.effectiveDate || ''}
                                                    onChange={e => handleChange('effectiveDate', e.target.value)}
                                                />
                                                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* REVENUE CONFIG */}
                            {activeTab === 'revenue' && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                    <h4 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Cấu hình Doanh thu (Đơn giá vận chuyển)</h4>

                                    {/* 40 Feet Prices */}
                                    <div className="grid grid-cols-2 gap-6 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                        <h5 className="col-span-2 text-sm font-bold text-blue-700 uppercase tracking-wide">Container 40</h5>
                                        <div className="col-span-1">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Hàng Full (40'F)</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    className="w-full pl-4 pr-12 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700 disabled:bg-slate-100 disabled:text-slate-500"
                                                    value={formData.revenue?.price40F || 0}
                                                    onChange={e => handleNestedChange('revenue', 'price40F', e.target.valueAsNumber)}
                                                />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">VNĐ</span>
                                            </div>
                                        </div>
                                        <div className="col-span-1">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Hàng Rỗng (40'E)</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    className="w-full pl-4 pr-12 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700 disabled:bg-slate-100 disabled:text-slate-500"
                                                    value={formData.revenue?.price40E || 0}
                                                    onChange={e => handleNestedChange('revenue', 'price40E', e.target.valueAsNumber)}
                                                />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">VNĐ</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 20 Feet Prices */}
                                    <div className="grid grid-cols-2 gap-6 bg-orange-50/50 p-4 rounded-xl border border-orange-100">
                                        <h5 className="col-span-2 text-sm font-bold text-orange-700 uppercase tracking-wide">Container 20</h5>
                                        <div className="col-span-1">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Hàng Full (20'F)</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    className="w-full pl-4 pr-12 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700 disabled:bg-slate-100 disabled:text-slate-500"
                                                    value={formData.revenue?.price20F || 0}
                                                    onChange={e => handleNestedChange('revenue', 'price20F', e.target.valueAsNumber)}
                                                />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">VNĐ</span>
                                            </div>
                                        </div>
                                        <div className="col-span-1">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Hàng Rỗng (20'E)</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    className="w-full pl-4 pr-12 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700 disabled:bg-slate-100 disabled:text-slate-500"
                                                    value={formData.revenue?.price20E || 0}
                                                    onChange={e => handleNestedChange('revenue', 'price20E', e.target.valueAsNumber)}
                                                />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">VNĐ</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Additional Fees */}
                                    <div className="grid grid-cols-2 gap-6 pt-2 border-t border-slate-100">
                                        <div className="col-span-1">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Phí nâng hạ (Mặc định)</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-500"
                                                    value={formData.revenue?.liftDescFee || 0}
                                                    onChange={e => handleNestedChange('revenue', 'liftDescFee', e.target.valueAsNumber)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* SALARY CONFIG */}
                            {activeTab === 'salary' && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                    <h4 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Cấu hình Lương LX</h4>
                                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl mb-6 flex gap-3 text-orange-800 text-sm">
                                        <Activity size={20} className="shrink-0" />
                                        <div>
                                            <span className="font-bold block mb-1">Cơ chế tính lương tự động</span>
                                            Hệ thống sẽ dùng đơn giá này nhân với số chuyến để tính lương cuối tháng.
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="col-span-2">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Lương chuyến (VNĐ)</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-xl text-blue-600 disabled:bg-slate-100 disabled:text-slate-500"
                                                    value={formData.salary?.driverSalary || 0}
                                                    onChange={e => handleNestedChange('salary', 'driverSalary', e.target.valueAsNumber)}
                                                />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">VNĐ</span>
                                            </div>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Phụ cấp khác (nếu có)</label>
                                            <input
                                                type="number"
                                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-500"
                                                value={formData.salary?.surcharge || 0}
                                                onChange={e => handleNestedChange('salary', 'surcharge', e.target.valueAsNumber)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* FUEL CONFIG */}
                            {activeTab === 'fuel' && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                    <h4 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Định mức Nhiên liệu</h4>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="col-span-2 md:col-span-1">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Loại xe áp dụng</label>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    type="button"
                                                    disabled={isReadOnly}
                                                    onClick={() => handleNestedChange('fuel', 'truckType', 'TRACTOR')}
                                                    className={`px-4 py-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${formData.fuel?.truckType === 'TRACTOR'
                                                        ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold shadow-sm'
                                                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                                        } ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                >
                                                    <Truck size={20} />
                                                    <span className="text-xs">Đầu kéo</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={isReadOnly}
                                                    onClick={() => handleNestedChange('fuel', 'truckType', 'TRUCK')}
                                                    className={`px-4 py-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${formData.fuel?.truckType === 'TRUCK'
                                                        ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold shadow-sm'
                                                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                                        } ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                >
                                                    <Truck size={20} />
                                                    <span className="text-xs">Xe tải</span>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="col-span-2 md:col-span-1">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Định mức (Lít)</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-lg text-slate-700 disabled:bg-slate-100 disabled:text-slate-500"
                                                    value={formData.fuel?.quota || 0}
                                                    onChange={e => handleNestedChange('fuel', 'quota', e.target.valueAsNumber)}
                                                />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Lít</span>
                                            </div>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Cây xăng cho phép</label>
                                            <textarea
                                                rows={3}
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm disabled:bg-slate-100 disabled:text-slate-500"
                                                placeholder="Nhập tên cây xăng (ngăn cách bởi dấu phẩy)..."
                                                value={formData.fuel?.gasStations?.join(', ') || ''}
                                                onChange={e => handleNestedChange('fuel', 'gasStations', e.target.value.split(',').map(s => s.trim()))}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                        </fieldset>
                    </form>
                </div>

                {/* Footer Action */}
                <div className="px-8 py-5 border-t border-slate-100 bg-slate-50 shrink-0">
                    {!isReadOnly && (
                        <div className="mb-4 flex items-center gap-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                            <Calendar size={20} className="text-amber-600 shrink-0" />
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-amber-700 uppercase mb-1">
                                    Ngày hiệu lực <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    required
                                    className={`w-full px-3 py-2 bg-white border rounded-lg text-sm font-medium focus:ring-2 focus:ring-amber-500 outline-none ${dateError ? 'border-red-500' : 'border-amber-300'}`}
                                    value={pendingEffectiveDate}
                                    min={(() => {
                                        const tomorrow = new Date();
                                        tomorrow.setDate(tomorrow.getDate() + 1);
                                        return tomorrow.toISOString().split('T')[0];
                                    })()}
                                    onChange={e => {
                                        setPendingEffectiveDate(e.target.value);
                                        setDateError('');
                                    }}
                                />
                                {dateError && (
                                    <p className="text-xs text-red-600 mt-1 font-medium">{dateError}</p>
                                )}
                            </div>
                            <p className="text-xs text-amber-700 max-w-xs">
                                Thay đổi sẽ có hiệu lực từ ngày này. Phiếu trước ngày này vẫn dùng giá cũ.
                            </p>
                        </div>
                    )}

                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                        >
                            {isReadOnly ? 'Đóng' : 'Hủy bỏ'}
                        </button>
                        {!isReadOnly && (
                            <button
                                onClick={handleSubmit}
                                disabled={isSaving}
                                className="px-8 py-2.5 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg transition-all flex items-center gap-2 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Save size={18} />
                                {isSaving ? 'Đang lưu...' : (isNew ? 'Tạo Tuyến Mới' : 'Lưu Thay Đổi')}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
