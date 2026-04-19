import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, isSameDay, isSameMonth, addMonths, subMonths, addWeeks, subWeeks, isValid } from 'date-fns';
import { vi } from 'date-fns/locale';
import { TransportTicket, DISPATCH_STATUS_LABELS, DISPATCH_STATUS_COLORS } from '../../../types';

interface ScheduleCalendarProps {
    tickets: TransportTicket[];
    onTicketClick?: (ticket: TransportTicket) => void;
    onDateRangeChange?: (start: Date | null, end: Date | null) => void;
}

export const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({ tickets, onTicketClick, onDateRangeChange }) => {
    const [view, setView] = useState<'day' | 'week' | 'month' | 'all'>('day');
    const [currentDate, setCurrentDate] = useState(new Date());

    // Stabilize callback ref to prevent infinite re-render loop
    const onDateRangeChangeRef = useRef(onDateRangeChange);
    useEffect(() => { onDateRangeChangeRef.current = onDateRangeChange; }, [onDateRangeChange]);

    useEffect(() => {
        if (!onDateRangeChangeRef.current) return;
        if (view === 'day') {
            const start = new Date(currentDate);
            start.setHours(0,0,0,0);
            const end = new Date(currentDate);
            end.setHours(23,59,59,999);
            onDateRangeChangeRef.current(start, end);
        } else if (view === 'week') {
            const start = startOfWeek(currentDate, { weekStartsOn: 1 });
            start.setHours(0,0,0,0);
            const end = endOfWeek(currentDate, { weekStartsOn: 1 });
            end.setHours(23,59,59,999);
            onDateRangeChangeRef.current(start, end);
        } else if (view === 'month') {
            const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            start.setHours(0,0,0,0);
            const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0); 
            end.setHours(23,59,59,999);
            onDateRangeChangeRef.current(start, end);
        } else {
            onDateRangeChangeRef.current(null, null);
        }
    }, [view, currentDate]);

    // Navigation
    const handlePrev = () => {
        if (view === 'day') setCurrentDate(addDays(currentDate, -1));
        else if (view === 'week') setCurrentDate(subWeeks(currentDate, 1));
        else setCurrentDate(subMonths(currentDate, 1));
    };

    const handleNext = () => {
        if (view === 'day') setCurrentDate(addDays(currentDate, 1));
        else if (view === 'week') setCurrentDate(addWeeks(currentDate, 1));
        else setCurrentDate(addMonths(currentDate, 1));
    };

    const handleToday = () => setCurrentDate(new Date());

    // Data Filtering
    const getTicketsForDate = (date: Date) => {
        return tickets.filter(t => {
            const ticketDate = new Date(t.dateStart || t.dateEnd || new Date().toISOString());
            return isSameDay(ticketDate, date);
        }).sort((a, b) => {
            // Sort by pickupTime (dummy logic if pickupTime doesn't exist on TransportTicket)
            // But we actually use dateEnd or priority for now
            return (a.dateEnd || '').localeCompare(b.dateEnd || '');
        });
    };

    // Render Helpers
    const renderTicketChip = (ticket: TransportTicket) => {
        const style = (DISPATCH_STATUS_COLORS[ticket.dispatchStatus as keyof typeof DISPATCH_STATUS_COLORS] || DISPATCH_STATUS_COLORS['WAITING_DISPATCH']);
        return (
            <div 
                key={ticket.id}
                onClick={(e) => { e.stopPropagation(); onTicketClick && onTicketClick(ticket); }}
                className={`flex justify-between items-center px-2 py-1 mb-1 text-[10px] font-bold rounded cursor-pointer border-l-2 transition-transform hover:scale-105 ${style.bg} ${style.text} whitespace-nowrap overflow-hidden`}
                style={{ borderLeftColor: 'currentColor' }}
            >
                <div className="truncate flex-1" title={`${ticket.orderCode || ticket.id.slice(-6)} • ${ticket.route || 'Chưa chọn tuyến'}`}>
                    {ticket.orderCode || ticket.id.slice(-6)} • <span className="font-normal opacity-80">{ticket.route ? ticket.route.split(' - ')[0] : 'N/A'}</span>
                </div>
            </div>
        );
    };

    const renderDispatchRow = (ticket: TransportTicket) => {
        const style = (DISPATCH_STATUS_COLORS[ticket.dispatchStatus as keyof typeof DISPATCH_STATUS_COLORS] || DISPATCH_STATUS_COLORS['WAITING_DISPATCH']);
        return (
            <div 
                key={ticket.id}
                onClick={() => onTicketClick && onTicketClick(ticket)}
                className="flex items-start gap-3 p-3 mb-2 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer transition-colors"
            >
                <div className="text-xs font-bold text-blue-600 whitespace-nowrap w-20">
                    {/* Time fallback to prevent GMT+7 07:00 default for date-only strings */}
                    {ticket.dateEnd && isValid(new Date(ticket.dateEnd)) 
                        ? (ticket.dateEnd.includes('T') || ticket.dateEnd.includes(' ') ? format(new Date(ticket.dateEnd), 'HH:mm') : '--:--') 
                        : '--:--'}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold text-slate-800 mb-1">
                        {ticket.orderCode || ticket.id} • Size {ticket.size}
                    </div>
                    <div className="text-[11px] text-slate-500 mb-1 truncate">
                        KH: {ticket.customerCode || 'N/A'} | Tuyến: {ticket.route}
                    </div>
                    <div className="text-[11px] text-slate-500 mb-2 truncate">
                        LX: {ticket.driverName || 'Chưa phân công'} {ticket.licensePlate ? `• ${ticket.licensePlate}` : ''}
                    </div>
                    <div className="flex flex-wrap gap-1">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${style.bg} ${style.text}`}>
                            {(DISPATCH_STATUS_LABELS[ticket.dispatchStatus as keyof typeof DISPATCH_STATUS_LABELS] || 'Chờ điều xe')}
                        </span>
                    </div>
                </div>
                <button className="p-2 border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 text-slate-400 transition-colors">
                    <Eye size={16} />
                </button>
            </div>
        );
    };

    const renderDayView = () => {
        const ticketsForDay = getTicketsForDate(currentDate);
        return (
            <div className="border border-slate-200 rounded-xl p-4">
                <h4 className="text-sm font-bold text-slate-700 mb-4 capitalize">{format(currentDate, "eeee, dd MMMM yyyy", { locale: vi })}</h4>
                {ticketsForDay.length > 0 ? ticketsForDay.map(renderDispatchRow) : <div className="text-center text-slate-400 p-4 border border-dashed border-slate-200 rounded-lg text-sm">Không có phiếu nào.</div>}
            </div>
        );
    };

    const renderWeekView = () => {
        const start = startOfWeek(currentDate, { weekStartsOn: 1 });
        const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
        return (
            <div className="flex flex-col gap-3">
                {days.map(day => {
                    const ticketsForDay = getTicketsForDate(day);
                    return (
                        <div key={day.toISOString()} className="border border-slate-200 rounded-xl p-4">
                            <h4 className="text-sm font-bold text-slate-700 mb-3 capitalize">{format(day, "eeee, dd/MM", { locale: vi })}</h4>
                            {ticketsForDay.length > 0 ? ticketsForDay.map(renderDispatchRow) : <div className="text-center text-slate-400 p-2 text-xs">Phân công trống.</div>}
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderMonthView = () => {
        const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const start = startOfWeek(firstDayOfMonth, { weekStartsOn: 1 });
        const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));

        return (
            <div>
                <div className="grid grid-cols-7 gap-1 mb-2">
                    {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(w => (
                        <div key={w} className="text-[11px] font-bold text-slate-400 text-center uppercase tracking-wider">{w}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {days.map(day => {
                        const isOtherMonth = !isSameMonth(day, currentDate);
                        const isToday = isSameDay(day, new Date());
                        const ticketsForDay = getTicketsForDate(day);
                        return (
                            <div key={day.toISOString()} className={`min-h-[100px] p-2 border border-slate-200 rounded-lg flex flex-col ${isOtherMonth ? 'bg-slate-50/50 opacity-50' : 'bg-white'} ${isToday ? 'border-blue-400 bg-blue-50/20' : ''}`}>
                                <div className="flex justify-between items-center mb-1">
                                    <span className={`text-xs font-bold ${isToday ? 'text-blue-600' : 'text-slate-700'}`}>{format(day, 'd')}</span>
                                    {ticketsForDay.length > 0 && <span className="bg-slate-100 text-slate-500 text-[9px] font-bold px-1.5 py-0.5 rounded-full">{ticketsForDay.length}</span>}
                                </div>
                                <div className="flex-1 overflow-auto no-scrollbar">
                                    {ticketsForDay.slice(0, 3).map(renderTicketChip)}
                                    {ticketsForDay.length > 3 && (
                                        <div className="text-[10px] text-slate-400 font-bold text-center mt-1">+ {ticketsForDay.length - 3}</div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderAllView = () => {
        const sortedTickets = [...tickets].sort((a, b) => {
            const aDate = new Date(a.dateStart || a.dateEnd || new Date().toISOString()).getTime();
            const bDate = new Date(b.dateStart || b.dateEnd || new Date().toISOString()).getTime();
            return bDate - aDate;
        });
        return (
            <div className="border border-slate-200 rounded-xl p-4">
                <h4 className="text-sm font-bold text-slate-700 mb-4 capitalize">Tất cả thời gian</h4>
                <div className="max-h-[600px] overflow-y-auto pr-2 space-y-2 no-scrollbar">
                    {sortedTickets.length > 0 ? sortedTickets.map(renderDispatchRow) : <div className="text-center text-slate-400 p-4 border border-dashed border-slate-200 rounded-lg text-sm">Không có phiếu nào.</div>}
                </div>
            </div>
        );
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
                <h3 className="text-lg font-bold text-slate-800 capitalize">
                    {view === 'day' && format(currentDate, "dd/MM/yyyy")}
                    {view === 'week' && `${format(startOfWeek(currentDate, {weekStartsOn:1}), 'dd/MM')} - ${format(endOfWeek(currentDate, {weekStartsOn:1}), 'dd/MM')}`}
                    {view === 'month' && format(currentDate, "'Tháng' MM, yyyy", { locale: vi })}
                    {view === 'all' && 'Tất cả thời gian'}
                </h3>
                <div className="flex items-center gap-3">
                    <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                        <button onClick={() => setView('day')} className={`px-3 py-1 text-xs font-bold rounded-md ${view === 'day' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:text-slate-800'}`}>Ngày</button>
                        <button onClick={() => setView('week')} className={`px-3 py-1 text-xs font-bold rounded-md ${view === 'week' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:text-slate-800'}`}>Tuần</button>
                        <button onClick={() => setView('month')} className={`px-3 py-1 text-xs font-bold rounded-md ${view === 'month' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:text-slate-800'}`}>Tháng</button>
                        <button onClick={() => setView('all')} className={`px-3 py-1 text-xs font-bold rounded-md ${view === 'all' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:text-slate-800'}`}>Tất cả</button>
                    </div>
                    {view !== 'all' && (
                        <div className="flex gap-1">
                            <button onClick={handlePrev} className="p-1 px-2 border border-slate-200 rounded-lg hover:bg-slate-50"><ChevronLeft size={16} /></button>
                            <button onClick={handleToday} className="px-3 border border-slate-200 rounded-lg hover:bg-slate-50 text-xs font-bold text-slate-600">Hôm nay</button>
                            <button onClick={handleNext} className="p-1 px-2 border border-slate-200 rounded-lg hover:bg-slate-50"><ChevronRight size={16} /></button>
                        </div>
                    )}
                </div>
            </div>
            {view === 'day' && renderDayView()}
            {view === 'week' && renderWeekView()}
            {view === 'month' && renderMonthView()}
            {view === 'all' && renderAllView()}
        </div>
    );
};
