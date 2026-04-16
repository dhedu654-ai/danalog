import React, { useState, useMemo } from 'react';
import { Calendar, ChevronRight, ArrowLeft, User, Truck, FileText, ChevronDown } from 'lucide-react';
import { TransportTicket, RouteConfig } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface SalarySlipMobileProps {
    tickets: TransportTicket[];
    notifications?: any[];
    routeConfigs: RouteConfig[];
    publishedSalaries: any[];
}

export const SalarySlipMobile: React.FC<SalarySlipMobileProps> = ({ tickets, notifications, routeConfigs, publishedSalaries }) => {
    const { user } = useAuth();
    console.log('Notifications count:', notifications?.length || 0);
    const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
    const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
    const [filterYear, setFilterYear] = useState('');
    const [filterMonths, setFilterMonths] = useState<string[]>([]);
    const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);

    const formatMoney = (amount: number) => {
        return amount.toLocaleString('vi-VN') + ' đ';
    };

    // 1. Get ONLY published months for this driver
    const driverPublishedMonths = useMemo(() => {
        if (!user) return [];
        return (publishedSalaries || [])
            .filter(ps => ps.driverUsername === user.username)
            .map(ps => `${ps.year}-${ps.month.toString().padStart(2, '0')}`);
    }, [publishedSalaries, user]);

    // 2. Filter tickets for the current user and only for published months
    const userTickets = useMemo(() => {
        if (!user) return [];
        return tickets.filter(t => {
            const isOwner = t.createdBy === user.username || t.driverName === user.name;
            if (!isOwner) return false;

            const d = t.dateEnd || t.dateStart;
            if (!d) return false;
            const monthStr = d.slice(0, 7);
            return driverPublishedMonths.includes(monthStr);
        });
    }, [tickets, user, driverPublishedMonths]);

    // Calculate totals for a month
    const calculateMonthSalary = (monthStr: string) => {
        const monthTickets = userTickets.filter(t => {
            const d = t.dateEnd || t.dateStart;
            return d && d.startsWith(monthStr) && t.status === 'APPROVED';
        });

        const routeGrouping: Record<string, { name: string; count: number; price: number; total: number }> = {};
        let totalOvernight = 0;
        const overnightDetails: { name: string; quantity: number; price: number; total: number }[] = [];

        monthTickets.forEach(t => {
            // Group by route
            const routeName = t.route;
            if (!routeGrouping[routeName]) {
                routeGrouping[routeName] = {
                    name: routeName,
                    count: 0,
                    price: t.driverPrice || Math.round((t.driverSalary || 0) / (t.trips || 1)),
                    total: 0
                };
            }
            routeGrouping[routeName].count += (t.trips || 1);
            routeGrouping[routeName].total += (t.driverSalary || 0);

            if (t.nightStay) {
                // FIX: Enhanced location detection to match DriverSalaryTable logic
                let location = t.nightStayLocation;
                if (!location) {
                    const routeConfig = routeConfigs.find(rc => rc.routeName === t.route);
                    location = routeConfig?.nightStayLocation || 'OUTER_CITY';
                }

                // Find config for pricing
                const isInnerCity = (location === 'INNER_CITY' || location === 'IN_CITY');
                // User requested absolute hardcoded values for Night Stay
                const price = isInnerCity ? 90000 : 120000;

                const dailyTotal = (t.nightStayDays || 1) * price;
                totalOvernight += dailyTotal;

                // FIX: Label logic must match the detected location
                const label = isInnerCity ? 'Lưu đêm (Trong TP)' : 'Lưu đêm (Ngoài TP)';
                const existing = overnightDetails.find(d => d.name === label);
                if (existing) {
                    existing.quantity += (t.nightStayDays || 1);
                    existing.total += dailyTotal;
                } else {
                    overnightDetails.push({ name: label, quantity: (t.nightStayDays || 1), price, total: dailyTotal });
                }
            }
        });

        const grandTotal = Object.values(routeGrouping).reduce((sum, item) => sum + item.total, 0) + totalOvernight;

        return {
            month: monthStr,
            tripCount: monthTickets.length,
            routeDetails: Object.values(routeGrouping),
            overnightDetails,
            grandTotal
        };
    };

    const availableMonths = useMemo(() => {
        let list = [...driverPublishedMonths].sort().reverse();
        if (filterYear) list = list.filter(m => m.startsWith(filterYear));
        if (filterMonths.length > 0) list = list.filter(m => filterMonths.includes(m.split('-')[1]));
        return list;
    }, [driverPublishedMonths, filterYear, filterMonths]);

    if (viewMode === 'list') {
        return (
            <div className="space-y-6 pb-10 animate-slide-up">
                <header>
                    <h2 className="text-2xl font-bold text-slate-800">Bảng Lương</h2>
                    <p className="text-slate-500 text-sm">Phiếu lương đã được công ty gửi</p>

                    <div className="mt-6 flex gap-4">
                        <div className="flex-1 bg-white rounded-2xl p-1.5 flex items-center justify-between border border-slate-100 shadow-sm transition-all">
                            <div className="flex items-center gap-3 px-3 w-full">
                                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                    <Calendar size={16} />
                                </div>
                                <div className="flex-1 relative">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Tháng</p>
                                    <div 
                                        className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none cursor-pointer truncate max-w-[100px]"
                                        onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}
                                    >
                                        <span>{filterMonths.length === 0 ? 'Tất cả' : filterMonths.join(', ')}</span>
                                    </div>
                                    {isMonthDropdownOpen && (
                                        <>
                                            <div className="fixed inset-0 z-10" onClick={() => setIsMonthDropdownOpen(false)}></div>
                                            <div className="absolute top-full mt-2 left-0 min-w-[140px] bg-white border border-slate-200 shadow-xl rounded-xl z-20 p-2 grid grid-cols-1 gap-1 max-h-[40vh] overflow-y-auto">
                                                {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(m => (
                                                    <label key={m} className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded-lg transition-colors ${filterMonths.includes(m) ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'}`}>
                                                        <input 
                                                            type="checkbox" 
                                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                            checked={filterMonths.includes(m)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) setFilterMonths(prev => [...prev, m].sort((a,b)=>a.localeCompare(b)));
                                                                else setFilterMonths(prev => prev.filter(x => x !== m));
                                                            }}
                                                        />
                                                        <span className="text-sm font-semibold">Tháng {m}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                                <ChevronDown size={14} className="text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        <div className="flex-1 bg-white rounded-2xl p-1.5 flex items-center justify-between border border-slate-100 shadow-sm transition-all">
                            <div className="flex items-center gap-3 px-3 w-full">
                                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                                    <Calendar size={16} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Năm</p>
                                    <select
                                        value={filterYear}
                                        onChange={(e) => setFilterYear(e.target.value)}
                                        className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none cursor-pointer appearance-none"
                                    >
                                        <option value="">Tất cả</option>
                                        {[2023, 2024, 2025, 2026].map(y => (
                                            <option key={y} value={y.toString()}>{y}</option>
                                        ))}
                                    </select>
                                </div>
                                <ChevronDown size={14} className="text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </header>

                <div className="space-y-3">
                    {availableMonths.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400">
                            <FileText className="mx-auto mb-3 opacity-20" size={48} />
                            <p className="text-sm font-medium">Chưa có phiếu lương nào được gửi.</p>
                        </div>
                    ) : (
                        availableMonths.map(month => {
                            const data = calculateMonthSalary(month);
                            return (
                                <div key={month} onClick={() => { setSelectedMonth(month); setViewMode('detail'); }} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex justify-between items-center active:bg-slate-50 transition-colors gap-3">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="bg-blue-50 p-2.5 rounded-xl text-blue-600 shrink-0">
                                            <Calendar size={18} />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-bold text-slate-800 text-sm truncate">Tháng {month.split('-').reverse().join('/')}</h3>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <div className="text-right">
                                            <p className="text-blue-600 font-bold text-sm">{formatMoney(data.grandTotal)}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase">{data.tripCount} chuyến</p>
                                        </div>
                                        <ChevronRight size={16} className="text-slate-300" />
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        );
    }

    const salaryData = calculateMonthSalary(selectedMonth!);

    return (
        <div className="space-y-4 pb-10 animate-slide-up">
            <header className="flex items-center gap-3">
                <button onClick={() => setViewMode('list')} className="p-2 -ml-2 text-slate-400">
                    <ArrowLeft size={24} />
                </button>
                <h2 className="text-xl font-bold text-slate-800">Lương Tháng {selectedMonth!.split('-').reverse().join('/')}</h2>
            </header>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 border-dashed">
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-white p-2 rounded-full shadow-sm text-slate-400">
                            <User size={18} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Lái xe</p>
                            <p className="text-xs font-bold text-slate-700">{user?.name}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="bg-white p-2 rounded-full shadow-sm text-slate-400">
                            <Truck size={18} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Biển số</p>
                            <p className="text-xs font-bold text-slate-700">{userTickets[0]?.licensePlate || 'N/A'}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                <div className="text-center pb-4 border-b border-slate-50">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tổng thực lĩnh</p>
                    <h1 className="text-2xl font-black text-blue-600 tracking-tight">
                        {formatMoney(salaryData.grandTotal)}
                    </h1>
                </div>

                <div className="mt-6 space-y-6">
                    <div className="space-y-3">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Chi tiết chạy xe</h4>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-[11px]">
                                <thead className="text-[10px] font-bold text-slate-400 uppercase bg-slate-50">
                                    <tr>
                                        <th className="px-2 py-2 rounded-l-lg">Tuyến</th>
                                        <th className="px-1 py-2 text-center">SLC</th>
                                        <th className="px-1 py-2 text-right">Đơn giá</th>
                                        <th className="px-2 py-2 text-right rounded-r-lg">Tổng</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {salaryData.routeDetails.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="px-2 py-2 font-medium text-slate-700">{item.name}</td>
                                            <td className="px-1 py-2 text-center font-bold text-slate-500">{item.count}</td>
                                            <td className="px-1 py-2 text-right text-slate-500">{item.price.toLocaleString()}</td>
                                            <td className="px-2 py-2 text-right font-bold text-slate-800">{item.total.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                    {salaryData.routeDetails.length === 0 && (
                                        <tr><td colSpan={4} className="py-8 text-center text-slate-300 italic">Không có dữ liệu</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {salaryData.overnightDetails.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Phụ cấp lưu đêm</h4>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-[11px]">
                                    <thead className="text-[10px] font-bold text-slate-400 uppercase bg-slate-50">
                                        <tr>
                                            <th className="px-2 py-2 rounded-l-lg">Loại</th>
                                            <th className="px-1 py-2 text-center">Đêm</th>
                                            <th className="px-1 py-2 text-right">Đơn giá</th>
                                            <th className="px-2 py-2 text-right rounded-r-lg">Tổng</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {salaryData.overnightDetails.map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="px-2 py-2 font-medium text-slate-700">{item.name}</td>
                                                <td className="px-1 py-2 text-center font-bold text-slate-500">{item.quantity}</td>
                                                <td className="px-1 py-2 text-right text-slate-500">{item.price.toLocaleString()}</td>
                                                <td className="px-2 py-2 text-right font-bold text-slate-800">{item.total.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
