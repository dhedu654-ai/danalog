import { X, Calendar, ArrowRight, DollarSign, Truck, Fuel } from 'lucide-react';
import { RouteConfig } from '../types';

interface PendingChangesModalProps {
    isOpen: boolean;
    config: RouteConfig | null;
    onClose: () => void;
}

export function PendingChangesModal({ isOpen, config, onClose }: PendingChangesModalProps) {
    if (!isOpen || !config || !config.pendingChanges) return null;

    // Normalize to array and sort by effective date
    const rawPending = config.pendingChanges;
    const pendingList = (Array.isArray(rawPending) ? rawPending : [rawPending])
        .sort((a: any, b: any) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime());

    if (pendingList.length === 0) return null;

    const fmt = (v: number | undefined) => (v || 0).toLocaleString('vi-VN') + 'đ';

    // Helper to generate comparisons for a single pending item
    const getComparisons = (pending: any) => {
        const comparisons: { label: string; oldVal: string; newVal: string; icon: React.ReactNode }[] = [];

        // Route Name
        if (pending.routeName && pending.routeName !== config.routeName) {
            comparisons.push({ label: 'Tên tuyến', oldVal: config.routeName, newVal: pending.routeName, icon: null });
        }

        // Customer
        if (pending.customer && pending.customer !== config.customer) {
            comparisons.push({ label: 'Khách hàng', oldVal: config.customer, newVal: pending.customer, icon: null });
        }

        // Cargo Type
        if (pending.cargoType && pending.cargoType !== config.cargoType) {
            comparisons.push({ label: 'Loại hàng', oldVal: config.cargoType, newVal: pending.cargoType, icon: null });
        }

        // Status
        if (pending.status && pending.status !== config.status) {
            comparisons.push({ label: 'Trạng thái', oldVal: config.status, newVal: pending.status, icon: null });
        }

        // Night Stay
        if (pending.isNightStay !== undefined && pending.isNightStay !== config.isNightStay) {
            comparisons.push({ label: 'Lưu đêm', oldVal: config.isNightStay ? 'Có' : 'Không', newVal: pending.isNightStay ? 'Có' : 'Không', icon: null });
        }
        if (pending.nightStayLocation && pending.nightStayLocation !== config.nightStayLocation) {
            const mapLoc = (l: string) => l === 'INNER_CITY' ? 'Trong TP' : 'Ngoài TP';
            comparisons.push({ label: 'Khu vực lưu đêm', oldVal: mapLoc(config.nightStayLocation || ''), newVal: mapLoc(pending.nightStayLocation), icon: null });
        }

        // Revenue
        if (pending.revenue) {
            if (pending.revenue.price40F !== undefined && pending.revenue.price40F !== config.revenue.price40F) {
                comparisons.push({ label: 'Giá 40F', oldVal: fmt(config.revenue.price40F), newVal: fmt(pending.revenue.price40F), icon: <DollarSign size={14} /> });
            }
            if (pending.revenue.price40E !== undefined && pending.revenue.price40E !== config.revenue.price40E) {
                comparisons.push({ label: 'Giá 40E', oldVal: fmt(config.revenue.price40E), newVal: fmt(pending.revenue.price40E), icon: <DollarSign size={14} /> });
            }
            if (pending.revenue.price20F !== undefined && pending.revenue.price20F !== config.revenue.price20F) {
                comparisons.push({ label: 'Giá 20F', oldVal: fmt(config.revenue.price20F), newVal: fmt(pending.revenue.price20F), icon: <DollarSign size={14} /> });
            }
            if (pending.revenue.price20E !== undefined && pending.revenue.price20E !== config.revenue.price20E) {
                comparisons.push({ label: 'Giá 20E', oldVal: fmt(config.revenue.price20E), newVal: fmt(pending.revenue.price20E), icon: <DollarSign size={14} /> });
            }
            if (pending.revenue.liftDescFee !== undefined && pending.revenue.liftDescFee !== config.revenue.liftDescFee) {
                comparisons.push({ label: 'Phí nâng hạ', oldVal: fmt(config.revenue.liftDescFee), newVal: fmt(pending.revenue.liftDescFee), icon: <DollarSign size={14} /> });
            }
        }

        // Salary
        if (pending.salary) {
            if (pending.salary.driverSalary !== undefined && pending.salary.driverSalary !== config.salary.driverSalary) {
                comparisons.push({ label: 'Lương LX', oldVal: fmt(config.salary.driverSalary), newVal: fmt(pending.salary.driverSalary), icon: <Truck size={14} /> });
            }
            if (pending.salary.surcharge !== undefined && pending.salary.surcharge !== config.salary.surcharge) {
                comparisons.push({ label: 'Phụ cấp', oldVal: fmt(config.salary.surcharge), newVal: fmt(pending.salary.surcharge), icon: <Truck size={14} /> });
            }
        }

        // Fuel
        if (pending.fuel) {
            if (pending.fuel.quota !== undefined && pending.fuel.quota !== config.fuel.quota) {
                comparisons.push({ label: 'Định mức dầu', oldVal: `${config.fuel.quota} lít`, newVal: `${pending.fuel.quota} lít`, icon: <Fuel size={14} /> });
            }
        }

        return comparisons;
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 bg-amber-50 shrink-0">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-lg font-bold text-amber-800 flex items-center gap-2">
                                <Calendar size={20} />
                                THAY ĐỔI ĐANG CHỜ HIỆU LỰC
                            </h3>
                            <p className="text-sm text-amber-700 mt-1">
                                Tuyến: <span className="font-bold">{config.routeName}</span>
                            </p>
                        </div>
                        <button onClick={onClose} className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded-lg transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {pendingList.map((pending: any, idx: number) => {
                        const comparisons = getComparisons(pending);
                        return (
                            <div key={idx} className="relative">
                                {/* Timeline line */}
                                {idx !== pendingList.length - 1 && (
                                    <div className="absolute left-3 top-8 bottom-[-32px] w-0.5 bg-slate-200"></div>
                                )}

                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-bold text-xs ring-4 ring-white relative z-10">
                                        {idx + 1}
                                    </div>
                                    <div className="text-sm text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100 font-medium whitespace-nowrap">
                                        📅 Hiệu lực từ: <span className="font-bold">{pending.effectiveDate}</span>
                                    </div>
                                </div>

                                <div className="pl-9">
                                    {comparisons.length === 0 ? (
                                        <p className="text-slate-400 text-xs italic">Không có thay đổi dữ liệu chi tiết.</p>
                                    ) : (
                                        <div className="space-y-3 bg-slate-50/50 rounded-xl p-4 border border-slate-100">
                                            <div className="grid grid-cols-3 gap-2 text-[10px] font-bold text-slate-400 uppercase pb-2 border-b border-slate-100">
                                                <div>Hạng mục</div>
                                                <div className="text-center">Hiện tại</div>
                                                <div className="text-center">Mới</div>
                                            </div>
                                            {comparisons.map((c, cIdx) => (
                                                <div key={cIdx} className="grid grid-cols-3 gap-2 items-center py-2 border-b border-slate-100 last:border-0 hover:bg-white rounded transition-colors px-2 -mx-2">
                                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                                                        {c.icon}
                                                        {c.label}
                                                    </div>
                                                    <div className="text-center text-xs text-red-400 line-through decoration-red-400/50">
                                                        {c.oldVal}
                                                    </div>
                                                    <div className="text-center text-xs font-bold text-emerald-600 flex items-center justify-center gap-1">
                                                        {c.newVal}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-center shrink-0">
                    <button
                        onClick={onClose}
                        className="px-8 py-2.5 rounded-xl font-bold bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors shadow-sm"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
}
