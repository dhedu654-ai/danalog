import { useState, useEffect } from 'react';
import { TransportTicket } from '../types';
import { X, Camera, Save, ArrowLeft, ChevronDown } from 'lucide-react';
import { format, differenceInCalendarDays } from 'date-fns';

interface TicketModalProps {
    ticket: TransportTicket | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedTicket: TransportTicket) => void;
}

import { RouteConfig } from '../types';

interface TicketModalProps {
    ticket: TransportTicket | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedTicket: TransportTicket) => void;
    routeConfigs: RouteConfig[];
}

import { CUSTOMERS } from '../constants';

export function TicketModal({ ticket, isOpen, onClose, onSave, routeConfigs }: TicketModalProps) {
    const safeRouteConfigs = Array.isArray(routeConfigs) ? routeConfigs : [];
    const [formData, setFormData] = useState<Partial<TransportTicket>>({});

    useEffect(() => {
        if (ticket) {
            setFormData({ ...ticket, trips: 1 }); // Enforce trips = 1
        }
    }, [ticket]);

    // Derived state: Check if same day and calculate duration
    const isSameDay = formData.dateStart && formData.dateEnd &&
        format(new Date(formData.dateStart), 'yyyy-MM-dd') === format(new Date(formData.dateEnd), 'yyyy-MM-dd');

    const durationDays = formData.dateStart && formData.dateEnd
        ? Math.abs(differenceInCalendarDays(new Date(formData.dateEnd), new Date(formData.dateStart)))
        : 0;

    // Logic: If Start Date == End Date => No Overnight (nightStay = false)
    useEffect(() => {
        if (isSameDay) {
            setFormData(prev => {
                if (prev.nightStay) {
                    return { ...prev, nightStay: false };
                }
                return prev;
            });
        }
    }, [isSameDay]);

    // Logic: Limit nightStayDays to duration
    useEffect(() => {
        if (formData.nightStay && formData.nightStayDays && durationDays > 0) {
            if (formData.nightStayDays > durationDays) {
                setFormData(prev => ({ ...prev, nightStayDays: durationDays }));
            }
        }
    }, [formData.nightStayDays, durationDays, formData.nightStay]);

    // Logic: Snapshot Night Stay Price
    useEffect(() => {
        if (formData.nightStay) {
            const location = formData.cityStatus || formData.nightStayLocation || 'OUTER_CITY';
            // Normalize location
            const normalizedLoc = (location === 'IN_CITY' || location === 'INNER_CITY') ? 'INNER_CITY' : 'OUTER_CITY';

            // Time-Travel Lookup for Night Config
            // 1. Filter by CargoType=LUU_DEM and Location
            const candidates = safeRouteConfigs.filter(rc =>
                rc && rc.cargoType === 'LUU_DEM' &&
                rc.nightStayLocation === normalizedLoc
            );

            // 2. Sort by Effective Date DESC
            candidates.sort((a, b) => (b.effectiveDate || '').localeCompare(a.effectiveDate || ''));

            // 3. Find applicable version
            const ticketDate = formData.dateStart
                ? format(new Date(formData.dateStart), 'yyyy-MM-dd')
                : format(new Date(), 'yyyy-MM-dd');

            const config = candidates.find(rc => (rc.effectiveDate || '') <= ticketDate);

            if (config) {
                setFormData(prev => ({
                    ...prev,
                    nightStaySalary: config.salary.driverSalary,
                    nightStayLocation: normalizedLoc // Ensure consistency
                }));
            }
        } else {
            setFormData(prev => ({ ...prev, nightStaySalary: 0 }));
        }
    }, [formData.nightStay, formData.cityStatus, formData.nightStayLocation, formData.dateStart]);



    const getRouteDetails = (routeName: string, size: string, fe: string, dateStart?: string) => {
        // Filter by Name
        const candidates = safeRouteConfigs.filter(rc => rc && rc.routeName === routeName);
        if (candidates.length === 0) return { revenue: 0, driverSalary: 0 };

        // Determine Ticket Date (Default to today)
        const ticketDate = dateStart
            ? format(new Date(dateStart), 'yyyy-MM-dd')
            : format(new Date(), 'yyyy-MM-dd');

        // Sort by Effective Date DESC (Newest first)
        candidates.sort((a, b) => (b.effectiveDate || '').localeCompare(a.effectiveDate || ''));

        // Find match: first config where effectiveDate <= ticketDate
        // Fallback to the oldest config if no valid historical config found (safe default)
        const config = candidates.find(rc => (rc.effectiveDate || '') <= ticketDate) || candidates[candidates.length - 1];

        if (!config) return { revenue: 0, driverSalary: 0 };

        const { revenue, salary } = config;
        let p = 0;

        // Revenue Logic
        if (size === '20') {
            p = fe === 'F' ? (revenue?.price20F || 0) : (revenue?.price20E || 0);
        } else if (size === '40') {
            p = fe === 'F' ? (revenue?.price40F || 0) : (revenue?.price40E || 0);
        } else {
            // Fallback for others
            p = fe === 'F' ? (revenue?.price40F || 0) : (revenue?.price40E || 0);
        }

        return {
            revenue: p,
            driverSalary: salary?.driverSalary || 0
        };
    };

    const handleChange = (field: keyof TransportTicket, value: any) => {
        setFormData(prev => {
            const updated = { ...prev, [field]: value };

            // Auto-calc price if relevant fields change
            if (field === 'size' || field === 'fe' || field === 'route' || field === 'dateStart') {
                const details = getRouteDetails(
                    updated.route || '',
                    updated.size || '20',
                    updated.fe || 'F',
                    updated.dateStart
                );
                updated.revenue = details.revenue;
                updated.driverSalary = details.driverSalary;
            }
            return updated;
        });
    };

    const handleCustomerChange = (customer: string) => {
        setFormData(prev => ({
            ...prev,
            customerCode: customer,
            route: '', // Reset route when customer changes
            revenue: 0,
            driverSalary: 0
        }));
    };

    const handleRouteChange = (route: string) => {
        // Find config to get price
        const details = getRouteDetails(route, formData.size || '20', formData.fe || 'F', formData.dateStart);

        setFormData(prev => ({
            ...prev,
            route: route,
            revenue: details.revenue, // SNAPSHOT: Revenue is copied from config at THIS moment. Future config changes will NOT affect this ticket.
            driverSalary: details.driverSalary // SNAPSHOT: Salary is copied here.
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...ticket, ...formData } as TransportTicket);
        onClose();
    };

    // Filter available routes from routeConfigs
    // Logic: Only show routes that were effective at the time of the ticket
    // If ticket has no date yet, default to today.
    const ticketDateVal = formData.dateEnd || formData.dateStart || new Date().toLocaleDateString('en-CA');
    const ticketTimestamp = new Date(ticketDateVal).getTime();

    // Helper to safely compare dates
    const isValidRoute = (rc: RouteConfig) => {
        if (!rc) return false;
        if (rc.customer !== formData.customerCode) return false;

        // Use Timestamp comparison for robustness
        const routeEffective = rc.effectiveDate ? new Date(rc.effectiveDate).getTime() : 0;

        // If route effective date is invalid (NaN), assume it's valid (historical) OR hide it? 
        // Safer to hide if invalid, but let's assume valid if missing (0).
        // Logic: activeFrom <= ticketDate
        // Example: Route (14th) <= Ticket (13th) -> False.
        if (isNaN(routeEffective)) return true; // Fallback
        if (isNaN(ticketTimestamp)) return true; // Fallback

        return routeEffective <= ticketTimestamp;
    };

    const availableRoutes = safeRouteConfigs
        .filter(isValidRoute)
        .map(rc => rc ? rc.routeName : '');

    // Auto-clear route if it becomes invalid (e.g. date change makes effectiveDate > ticketDate)
    useEffect(() => {
        if (formData.route && !availableRoutes.includes(formData.route)) {
            // Find if it really is invalid or just missing? 
            // availableRoutes comes from routeConfigs prop which is a snapshot.
            // If the route name is NOT in availableRoutes, it means it's filtered out.
            // We should clear it to prevent "ghost" selection.

            // However, verify it's not simply loading... (routeConfigs is passed in prop)
            if (safeRouteConfigs.length > 0) {
                setFormData(prev => ({
                    ...prev,
                    route: '',
                    revenue: 0,
                    driverSalary: 0
                }));
            }
        }
    }, [ticketDateVal, formData.customerCode, safeRouteConfigs]); // check when date or customer changes

    if (!isOpen || !ticket) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-100 flex flex-col max-h-[95vh]">

                {/* Header */}
                <div className="px-8 py-5 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">Chỉnh Sửa Phiếu Công Tác</h3>
                        <p className="text-sm text-slate-500 mt-1">Cập nhật thông tin chi tiết cho phiếu vận chuyển</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto bg-slate-50/30">
                    <form onSubmit={handleSubmit} className="px-8 py-8 space-y-8">

                        {/* Section 1: Basic Info */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                Thông tin cơ bản
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Row 1: Read-only Info */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Lái xe (Cố định)</label>
                                    <div className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-bold cursor-not-allowed text-sm">
                                        {ticket.driverName || 'Chưa cập nhật'}
                                    </div>
                                </div>
                                {/* Editable: Date Start */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Ngày bắt đầu</label>
                                    <input
                                        type="date"
                                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm font-medium hover:bg-slate-50"
                                        value={formData.dateStart ? format(new Date(formData.dateStart), 'yyyy-MM-dd') : ''}
                                        onChange={e => handleChange('dateStart', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Ngày kết thúc</label>
                                    <input
                                        type="date"
                                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm font-medium hover:bg-slate-50"
                                        value={formData.dateEnd ? format(new Date(formData.dateEnd), 'yyyy-MM-dd') : ''}
                                        onChange={e => handleChange('dateEnd', e.target.value)}
                                    />
                                </div>

                                {/* Row 2: Editable Info */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Biển số xe</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold uppercase"
                                        value={formData.licensePlate || ''}
                                        onChange={e => handleChange('licensePlate', e.target.value)}
                                        placeholder="15C-123.45"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Khách hàng</label>
                                    <select
                                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer text-sm font-medium"
                                        value={formData.customerCode}
                                        onChange={e => handleCustomerChange(e.target.value)}
                                    >
                                        <option value="">Chọn khách hàng...</option>
                                        {CUSTOMERS.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Tuyến đường</label>
                                    <select
                                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer text-sm font-medium"
                                        value={formData.route}
                                        onChange={e => handleRouteChange(e.target.value)}
                                    >
                                        <option value="">Chọn tuyến đường...</option>
                                        {availableRoutes.map(r => (
                                            <option key={r} value={r}>{r}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Container Info */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                Thông tin Container
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

                                {/* Right Column: Key Fields First */}
                                <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Container No.</label>
                                        <div className="space-y-2">
                                            <div className="relative">
                                                <select
                                                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer text-sm font-medium appearance-none"
                                                    value={["Trung chuyển", "Sửa xe", "Khác"].includes(formData.containerNo || '') ? formData.containerNo : 'MANUAL'}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        if (val === 'MANUAL') {
                                                            handleChange('containerNo', ''); // Clear or keep? Usually clear or empty to start typing. Let's keep empty or default.
                                                        } else {
                                                            handleChange('containerNo', val);
                                                        }
                                                    }}
                                                >
                                                    <option value="MANUAL">Nhập số Container</option>
                                                    <option value="Trung chuyển">Trung chuyển</option>
                                                    <option value="Sửa xe">Sửa xe</option>
                                                    <option value="Khác">Khác</option>
                                                </select>
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                                    <ChevronDown size={16} strokeWidth={3} />
                                                </div>
                                            </div>

                                            {/* Conditional Input for Manual Entry */}
                                            {(!["Trung chuyển", "Sửa xe", "Khác"].includes(formData.containerNo || '')) && (
                                                <input
                                                    type="text"
                                                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all uppercase font-mono tracking-wide text-slate-800 font-bold placeholder:font-normal placeholder:text-slate-400 animate-in fade-in slide-in-from-top-1 duration-200"
                                                    value={formData.containerNo === 'MANUAL' ? '' : formData.containerNo}
                                                    onChange={e => handleChange('containerNo', e.target.value)}
                                                    placeholder="ABCD1234567"
                                                    autoFocus
                                                />
                                            )}
                                        </div>
                                    </div>

                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Size</label>
                                        <select
                                            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer text-sm font-medium"
                                            value={formData.size}
                                            onChange={e => handleChange('size', e.target.value)}
                                        >
                                            <option value="20">20</option>
                                            <option value="40">40</option>


                                        </select>
                                    </div>

                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Trạng thái F/E</label>
                                        <select
                                            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer text-sm font-medium"
                                            value={formData.fe}
                                            onChange={e => handleChange('fe', e.target.value)}
                                        >
                                            <option value="F">Full (Có hàng)</option>
                                            <option value="E">Empty (Rỗng)</option>
                                        </select>
                                    </div>

                                    <div className="col-span-1">
                                        {/* Hidden Weight for now or keep if needed, specific request didn't mention it but 'Container Info' usually has it. User said: "Ô thông tin Container gồm: Container No.; Size; F/E; ảnh chụp container". Weight is NOT in this list. I will keep it as it's useful but maybe less prominent or just leave it. I'll remove it from prominence if strictly following list, but safer to keep. User list: "Container No.; Size; F/E; ảnh chụp container".  I will move Weight to be less obtrusive or just keep it. Actually, "Cân nặng" was there before. I'll remove it to strictly follow instructions if space is tight, but usually better to ask. For now I will REMOVE Weight to match the strict list "gồm: ...". */}
                                        {/* Re-reading: "Ô thông tin Container gồm: Container No.; Size; F/E; ảnh chụp container". This sounds exclusive. I will hide Weight. */}
                                    </div>
                                </div>

                                {/* Left Column: Image Upload (Now Last item in the 'list' typically means logically last, visual layout can vary. Putting it on the side is standard for proper UI) */}
                                <div className="md:col-span-4 space-y-3">
                                    <label className="block text-xs font-semibold text-slate-500 uppercase">Ảnh Container</label>
                                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 flex flex-col items-center justify-center bg-slate-50 hover:bg-blue-50 hover:border-blue-400 transition-all cursor-pointer group h-40 relative overflow-hidden">
                                        {formData.imageUrl ? (
                                            <img src={formData.imageUrl} alt="Container" className="absolute inset-0 w-full h-full object-cover rounded-lg" />
                                        ) : (
                                            <>
                                                <div className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                                    <Camera className="text-slate-400 group-hover:text-blue-500" size={20} />
                                                </div>
                                                <p className="text-xs text-slate-500 font-medium">Tải ảnh lên</p>
                                            </>
                                        )}
                                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Financial & Logic */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                Tài chính & Khác
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                                <div className="col-span-12 md:col-span-4">
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Doanh thu (chưa VAT)</label>
                                    <div className="relative">
                                        <div className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-bold text-right cursor-not-allowed">
                                            {formData.revenue?.toLocaleString()}
                                        </div>
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">VND</span>
                                    </div>
                                </div>
                                <div className="col-span-12 md:col-span-3">
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Số chuyến (Cố định)</label>
                                    <div className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-bold text-center cursor-not-allowed">
                                        1
                                    </div>
                                </div>

                                <div className="col-span-12 md:col-span-5 grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Lưu đêm</label>
                                        <select
                                            className={`w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer text-sm font-medium ${isSameDay ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''}`}
                                            value={formData.nightStay ? "YES" : "NO"}
                                            onChange={e => handleChange('nightStay', e.target.value === "YES")}
                                            disabled={!!isSameDay}
                                        >
                                            <option value="NO">Không</option>
                                            <option value="YES">Có</option>
                                        </select>
                                    </div>

                                    {formData.nightStay && (
                                        <div className="animate-in fade-in zoom-in-95 duration-200 space-y-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Số đêm</label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max={durationDays}
                                                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-purple-700"
                                                        value={formData.nightStayDays || 1}
                                                        onChange={e => {
                                                            const val = parseInt(e.target.value);
                                                            // Double check strictly here as well
                                                            if (val > durationDays) return;
                                                            handleChange('nightStayDays', val);
                                                        }}
                                                    />
                                                    <span className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-medium pointer-events-none">đêm</span>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Khu vực lưu đêm</label>
                                                <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleChange('cityStatus', 'OUT_CITY')}
                                                        className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${formData.cityStatus !== 'IN_CITY'
                                                            ? 'bg-white text-blue-600 shadow-sm'
                                                            : 'text-slate-500 hover:text-slate-700'
                                                            }`}
                                                    >
                                                        Ngoài TP
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleChange('cityStatus', 'IN_CITY')}
                                                        className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${formData.cityStatus === 'IN_CITY'
                                                            ? 'bg-white text-blue-600 shadow-sm'
                                                            : 'text-slate-500 hover:text-slate-700'
                                                            }`}
                                                    >
                                                        Trong TP
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8 border-t border-slate-100 pt-6">


                                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <span className="text-sm font-bold text-slate-700">Tính dầu (Allowance)</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={formData.oilIncluded || false}
                                            onChange={e => handleChange('oilIncluded', e.target.checked)}
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        <span className="ml-3 text-sm font-medium text-slate-600">
                                            {formData.oilIncluded ? 'Có' : 'Không'}
                                        </span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Ghi chú vận hành</label>
                            <textarea
                                rows={3}
                                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm transition-all hover:bg-slate-50"
                                placeholder="Nhập ghi chú chi tiết..."
                                value={formData.notes || ''}
                                onChange={e => handleChange('notes', e.target.value)}
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex items-center gap-2 px-6 py-2.5 bg-white text-slate-700 font-bold rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors shadow-sm"
                            >
                                <ArrowLeft size={18} />
                                Hủy bỏ
                            </button>
                            <button
                                type="submit"
                                className="flex items-center gap-2 px-8 py-2.5 bg-blue-700 text-white font-bold rounded-lg hover:bg-blue-800 shadow-md hover:shadow-lg transition-all active:scale-95"
                            >
                                <Save size={18} />
                                Lưu thay đổi
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
