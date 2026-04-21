import React, { useState, useMemo } from 'react';
import { Clock, CheckCircle, FileText, ChevronRight, Edit, Calendar, PlusCircle, ChevronDown } from 'lucide-react';
import { TransportTicket } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { TicketDetailMobile } from './TicketDetailMobile';
import { CreateTicketMobile } from './CreateTicketMobile';

interface TicketListMobileProps {
    tickets: TransportTicket[];
    onUpdateTickets: (tickets: any[]) => void;
    onUpdateSingleTicket?: (ticket: any) => Promise<void>;
    onCreateTicket?: (ticket: any) => Promise<void>;
    routeConfigs: any[];
    onCreateNew: () => void;
}

const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="flex justify-between items-start py-3.5 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
        <span className="text-xs text-slate-400 font-medium shrink-0 pt-0.5">{label}</span>
        <span className="text-xs text-slate-700 font-bold text-right flex-1 ml-4 break-words">{value}</span>
    </div>
);

const FilterBtn: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
    <button
        onClick={onClick}
        className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap border transition-all ${active
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-white text-slate-500 border-slate-100'
            }`}
    >
        {label}
    </button>
);

export const TicketListMobile: React.FC<TicketListMobileProps> = ({ tickets = [], onUpdateTickets, onUpdateSingleTicket, onCreateTicket, routeConfigs, onCreateNew }) => {
    const { user } = useAuth();

    const [filterStatus, setFilterStatus] = useState<'ALL' | 'DRAFT' | 'PENDING' | 'APPROVED'>('ALL');
    const [filterTime, setFilterTime] = useState<'month' | 'range'>('range');
    const [selectedMonths, setSelectedMonths] = useState<number[]>([new Date().getMonth() + 1]);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [viewingTicket, setViewingTicket] = useState<TransportTicket | null>(null);

    // Filter Logic matching driver-app
    const filteredTickets = useMemo(() => {
        return tickets.filter(ticket => {
            // User Filter - show tickets assigned to this driver
            if (user && ticket.driverUsername !== user.username && ticket.createdBy !== user.username) return false;

            // Hide pending assignment tickets (they belong in Home pending queue, not history)
            if (['DRIVER_ASSIGNED'].includes(ticket.dispatchStatus || '') || ticket.status === 'ĐÃ ĐIỀU XE') {
                return false;
            }

            // Status Filter
            if (filterStatus === 'DRAFT' && ticket.status !== 'DRAFT') return false;
            if (filterStatus === 'PENDING' && ticket.status !== 'PENDING') return false;
            if (filterStatus === 'APPROVED' && ticket.status !== 'APPROVED') return false;

            // Time Filter
            const tDate = ticket.dateEnd || ticket.dateStart;
            const ticketDate = new Date(tDate);

            if (filterTime === 'month') {
                if (!tDate) return false;
                if (selectedMonths.length > 0 && !selectedMonths.includes(ticketDate.getMonth() + 1)) return false;
                if (selectedYear !== 0 && ticketDate.getFullYear() !== selectedYear) return false;
            } else if (filterTime === 'range') {
                if (dateRange.start && ticketDate < new Date(dateRange.start)) return false;
                if (dateRange.end && ticketDate > new Date(dateRange.end)) return false;
            }
            return true;
        }).sort((a, b) => {
            // Sắp xếp theo ngày kết thúc gần nhất đến xa nhất (dateEnd DESC)
            const dateA = new Date(a.dateEnd || a.dateStart || 0).getTime();
            const dateB = new Date(b.dateEnd || b.dateStart || 0).getTime();
            if (dateA !== dateB) {
                return dateB - dateA;
            }
            // Nếu cùng ngày, xếp theo ID để giữ thứ tự ổn định
            return b.id.localeCompare(a.id);
        });
    }, [tickets, user, filterStatus, filterTime, selectedMonths, selectedYear, dateRange]);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        // dd/mm/yy
        return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear().toString().slice(-2)}`;
    };

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'APPROVED': return { color: 'text-emerald-600', bg: 'bg-emerald-50', icon: <CheckCircle size={14} />, label: 'Đã duyệt' };
            case 'DRAFT': return { color: 'text-slate-500', bg: 'bg-slate-100', icon: <FileText size={14} />, label: 'Chờ chứng từ' };
            case 'PENDING':
            case 'SUBMITTED':
                return { color: 'text-orange-600', bg: 'bg-orange-50', icon: <Clock size={14} />, label: 'Chờ duyệt' };
            case 'COMPLETED': return { color: 'text-blue-600', bg: 'bg-blue-50', icon: <CheckCircle size={14} />, label: 'Chờ nộp chứng từ' };
            case 'ĐANG VẬN CHUYỂN': return { color: 'text-purple-600', bg: 'bg-purple-50', icon: <Clock size={14} />, label: 'Đang vận chuyển' };
            case 'DRIVER_ACCEPTED': return { color: 'text-indigo-600', bg: 'bg-indigo-50', icon: <CheckCircle size={14} />, label: 'Đã nhận lệnh' };
            default: return { color: 'text-blue-600', bg: 'bg-blue-50', icon: <Clock size={14} />, label: status || 'Chờ duyệt' };
        }
    };

    if (viewingTicket) {
        const isLocked = ['SUBMITTED', 'PENDING', 'APPROVED'].includes(viewingTicket.status);
        
        if (!isLocked) {
            return (
                <div className="fixed inset-0 z-[60] bg-white overflow-y-auto p-4">
                    <button onClick={() => setViewingTicket(null)} className="absolute top-4 right-4 z-[70] p-2 text-slate-400">
                        <PlusCircle className="rotate-45" size={24} />
                    </button>
                    <CreateTicketMobile
                        tickets={tickets}
                        onUpdateTickets={onUpdateTickets}
                        onUpdateSingleTicket={onUpdateSingleTicket}
                        onCreateTicket={onCreateTicket}
                        routeConfigs={routeConfigs}
                        onComplete={() => {
                            setViewingTicket(null);
                            onCreateNew(); // Use as refresh hook
                        }}
                        ticketToEdit={viewingTicket}
                    />
                </div>
            );
        }

        return (
            <TicketDetailMobile 
                ticket={viewingTicket} 
                onBack={() => setViewingTicket(null)}
                onSubmitted={() => { onCreateNew(); setViewingTicket(null); }}
            />
        );
    }

    return (
        <div className="space-y-4 pb-10 animate-slide-up">
            <header className="flex justify-between items-center px-1">
                <h2 className="text-xl font-bold text-slate-800">Lịch sử Chuyến Đi</h2>
            </header>

            {/* Filter Controls - Exactly like driver-app */}
            <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 space-y-3">
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide items-center">
                    <FilterBtn label="Tất cả" active={filterStatus === 'ALL'} onClick={() => setFilterStatus('ALL')} />
                    <FilterBtn label="Chờ chứng từ" active={filterStatus === 'DRAFT'} onClick={() => setFilterStatus('DRAFT')} />
                    <FilterBtn label="Chưa duyệt" active={filterStatus === 'PENDING'} onClick={() => setFilterStatus('PENDING')} />
                    <FilterBtn label="Đã duyệt" active={filterStatus === 'APPROVED'} onClick={() => setFilterStatus('APPROVED')} />
                </div>

                <div className="flex items-center gap-3 pt-3 border-t border-slate-50">
                    <div className="flex items-center gap-2 relative">
                        <Calendar size={16} className="text-blue-600 shrink-0" />
                        <select
                            value={filterTime}
                            onChange={(e) => setFilterTime(e.target.value as any)}
                            className="appearance-none bg-transparent text-xs font-bold text-slate-700 outline-none pr-4 relative z-10 cursor-pointer py-1"
                        >
                            <option value="range">Khoảng thời gian</option>
                            <option value="month">Theo Tháng</option>
                        </select>
                        <ChevronDown size={12} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 z-0 pointer-events-none" />
                    </div>

                    {filterTime === 'range' ? (
                        <div className="flex items-center gap-2 flex-1 justify-end ml-auto">
                            <input type="date" value={dateRange.start} onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))} className="bg-slate-50 rounded-lg px-2 py-1.5 text-[10px] font-bold border-none outline-none w-24 text-center text-slate-600 focus:ring-2 focus:ring-blue-100 transition-all font-mono" />
                            <span className="text-slate-300 font-bold">-</span>
                            <input type="date" value={dateRange.end} onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))} className="bg-slate-50 rounded-lg px-2 py-1.5 text-[10px] font-bold border-none outline-none w-24 text-center text-slate-600 focus:ring-2 focus:ring-blue-100 transition-all font-mono" />
                        </div>
                    ) : (
                        <div className="flex gap-2 ml-auto">
                            <div className="relative">
                                <div 
                                    className="bg-slate-50 rounded-lg px-3 py-1.5 text-[10px] font-bold border border-slate-100 outline-none text-slate-700 cursor-pointer min-w-[90px] flex items-center justify-center max-w-[130px] truncate"
                                    onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}
                                >
                                    <span>{selectedMonths.length === 0 ? 'Tất cả tháng' : `Tháng ${selectedMonths.join(', ')}`}</span>
                                </div>
                                {isMonthDropdownOpen && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setIsMonthDropdownOpen(false)}></div>
                                        <div className="absolute top-full mt-1 right-0 min-w-[140px] bg-white border border-slate-200 shadow-xl rounded-xl z-20 p-2 grid grid-cols-1 gap-1 max-h-[40vh] overflow-y-auto">
                                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                                <label key={m} className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded-lg transition-colors ${selectedMonths.includes(m) ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'}`}>
                                                    <input 
                                                        type="checkbox" 
                                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                        checked={selectedMonths.includes(m)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setSelectedMonths(prev => [...prev, m].sort((a,b)=>a-b));
                                                            else setSelectedMonths(prev => prev.filter(x => x !== m));
                                                        }}
                                                    />
                                                    <span className="text-sm font-semibold">Tháng {m}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                className="bg-slate-50 rounded-lg px-3 py-1.5 text-[10px] font-bold border border-slate-100 outline-none text-slate-700"
                            >
                                {[2023, 2024, 2025, 2026].map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* Ticket Cards */}
            <div className="space-y-3">
                {filteredTickets.length > 0 ? (
                    filteredTickets.map(ticket => {
                        const status = getStatusInfo(ticket.status);
                        return (
                            <div
                                key={ticket.id}
                                onClick={() => setViewingTicket(ticket)}
                                className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 active:bg-slate-50 transition-colors cursor-pointer"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex-1">
                                        <h4 className="font-bold text-slate-800 line-clamp-1 text-sm">{ticket.route}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{ticket.customerCode}</span>
                                            <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                                            <span className="text-[10px] text-slate-400 font-bold">{ticket.licensePlate}</span>
                                        </div>
                                    </div>
                                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${status.bg} ${status.color} shrink-0`}>
                                        {status.icon}
                                        {status.label}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mt-4">
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Thời gian</p>
                                        <p className="text-[11px] font-bold text-slate-600">
                                            {ticket.dateEnd ? formatDate(ticket.dateEnd) : formatDate(ticket.dateStart)}
                                        </p>
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Container</p>
                                        <p className="text-[11px] font-bold text-slate-600">
                                            {ticket.containerNo} ({ticket.size}')
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-4 pt-3 border-t border-slate-50 flex justify-between items-center">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setViewingTicket(ticket); }}
                                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${['SUBMITTED', 'PENDING', 'APPROVED'].includes(ticket.status) ? 'bg-slate-50 text-slate-500 active:bg-slate-100' : 'bg-blue-50 text-blue-600 active:bg-blue-100'}`}
                                        >
                                            {['SUBMITTED', 'PENDING', 'APPROVED'].includes(ticket.status) ? (
                                                <>Xem chi tiết</>
                                            ) : (
                                                <><Edit size={14} /> Chi tiết / Cập nhật</>
                                            )}
                                        </button>
                                        
                                        {ticket.nightStay && (
                                            <div className="px-2 py-1 bg-orange-50 text-orange-600 rounded-lg text-[10px] font-bold">LƯU ĐÊM</div>
                                        )}
                                    </div>
                                    <ChevronRight size={18} className="text-slate-300" />
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="py-20 flex flex-col items-center justify-center text-slate-300 space-y-3">
                        <FileText size={48} opacity={0.3} />
                        <p className="text-sm font-medium">Không tìm thấy chuyến đi nào</p>
                    </div>
                )}
            </div>

        </div>
    );
};


