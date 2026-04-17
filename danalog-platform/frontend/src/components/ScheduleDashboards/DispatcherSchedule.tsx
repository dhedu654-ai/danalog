import React, { useMemo, useState } from 'react';
import { TransportTicket, DISPATCH_STATUS_LABELS, DISPATCH_STATUS_COLORS } from '../../types';
import { ScheduleCalendar } from './shared/ScheduleCalendar';
import { KPICard } from '../Dashboards/shared/KPICard';
import { format } from 'date-fns';
import { TicketModal } from '../TicketModal';

interface Props {
    tickets: TransportTicket[];
    users: any[];
    currentUser: any;
}

export const DispatcherSchedule: React.FC<Props> = ({ tickets, users, currentUser }) => {
    const [dateRange, setDateRange] = useState<{start: Date, end: Date} | null>(null);
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [selectedTicket, setSelectedTicket] = useState<TransportTicket | null>(null);

    const stats = useMemo(() => {
        let baseTickets = tickets;
        if (dateRange && dateRange.start && dateRange.end) { baseTickets = baseTickets.filter(t => { const d = new Date(t.dateStart || t.dateEnd || new Date()); return d.getTime() >= dateRange.start.getTime() && d.getTime() <= dateRange.end.getTime(); }); }
        
        return {
            total: baseTickets.length,
            waiting: baseTickets.filter(t => t.dispatchStatus === 'WAITING_DISPATCH' || t.dispatchStatus === 'WAITING_AUTO').length,
            myAssigned: baseTickets.filter(t => t.dispatcherUsername === currentUser.username && (t.dispatchStatus === 'ASSIGNED' || t.dispatchStatus === 'DRIVER_ASSIGNED' || t.dispatchStatus === 'IN_PROGRESS' || t.dispatchStatus === 'COMPLETED' || t.dispatchStatus === 'DRIVER_PENDING')).length,
            pending: baseTickets.filter(t => t.dispatchStatus === 'DRIVER_PENDING').length,
            progress: baseTickets.filter(t => t.dispatchStatus === 'IN_PROGRESS').length,
            completed: baseTickets.filter(t => t.dispatchStatus === 'COMPLETED').length,
        };
    }, [tickets, currentUser.username, dateRange]);

    const filteredTickets = useMemo(() => {
        let result = tickets;
        if (dateRange && dateRange.start && dateRange.end) { result = result.filter(t => { const d = new Date(t.dateStart || t.dateEnd || new Date()); return d.getTime() >= dateRange.start.getTime() && d.getTime() <= dateRange.end.getTime(); }); }
        
        if (statusFilter === 'MY_ASSIGNED') {
            return result.filter(t => t.dispatcherUsername === currentUser.username && (t.dispatchStatus === 'ASSIGNED' || t.dispatchStatus === 'DRIVER_ASSIGNED' || t.dispatchStatus === 'IN_PROGRESS' || t.dispatchStatus === 'COMPLETED' || t.dispatchStatus === 'DRIVER_PENDING'));
        }
        if (statusFilter) {
            return result.filter(t => t.dispatchStatus === statusFilter);
        }
        return result;
    }, [tickets, statusFilter, dateRange, currentUser.username]);

    // Drivers tracking
    const { availableDrivers, driverTrips } = useMemo(() => {
        const drivers = users.filter((u: any) => u.role === 'DRIVER');
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        
        const busyDriverIds = new Set(
            tickets.filter(t => t.dispatchStatus === 'IN_PROGRESS' || t.dispatchStatus === 'DRIVER_PENDING')
                   .map(t => t.assignedDriverId || t.driverName)
                   .filter(Boolean)
        );

        const tripCounts: Record<string, number> = {};
        tickets.filter(t => t.dispatchStatus === 'IN_PROGRESS' || t.dispatchStatus === 'DRIVER_PENDING').filter(t => {
            const ticketDate = new Date(t.dateEnd || t.dateStart || new Date());
            if (isNaN(ticketDate.getTime())) return false;
            return format(ticketDate, 'yyyy-MM-dd') === todayStr;
        }).forEach(t => {
            const drId = t.assignedDriverId || t.driverName;
            if (drId) tripCounts[drId] = (tripCounts[drId] || 0) + 1;
        });

        const available = drivers.filter(dr => !busyDriverIds.has(dr.username));

        return { availableDrivers: available, driverTrips: tripCounts };
    }, [tickets, users]);

    const upcomingTickets = useMemo(() => {
        const now = new Date();
        return tickets.filter(t => {
            const tDate = new Date(t.dateStart || t.dateEnd || new Date().toISOString());
            return tDate >= now && t.dispatcherUsername === currentUser.username && (t.dispatchStatus === 'ASSIGNED' || t.dispatchStatus === 'DRIVER_ASSIGNED' || t.dispatchStatus === 'IN_PROGRESS' || t.dispatchStatus === 'DRIVER_PENDING');
        }).sort((a,b) => {
            const aDate = new Date(a.dateStart || a.dateEnd || new Date().toISOString()).getTime();
            const bDate = new Date(b.dateStart || b.dateEnd || new Date().toISOString()).getTime();
            return aDate - bDate;
        }).slice(0, 8);
    }, [tickets, currentUser.username]);

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Lịch Điều Phối Cá Nhân</h2>
                <p className="text-sm text-slate-500 mt-1">Hello {currentUser.name}! Bạn đang xem Lịch các phiếu chưa gom và phiếu đã gán cho bạn.</p>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <KPICard label="Tổng phiếu" value={stats.total} color={statusFilter === null ? 'blue' : 'slate'} onClick={() => setStatusFilter(null)} />
                <KPICard label="Chờ xếp xe" value={stats.waiting} color={statusFilter === 'WAITING_DISPATCH' ? 'slate' : 'slate'} onClick={() => setStatusFilter('WAITING_DISPATCH')} />
                <KPICard label="Đã điều xe" value={stats.myAssigned} color={statusFilter === 'MY_ASSIGNED' ? 'indigo' : 'slate'} onClick={() => setStatusFilter('MY_ASSIGNED')} />
                <KPICard label="Chờ xác nhận" value={stats.pending} color={statusFilter === 'DRIVER_PENDING' ? 'amber' : 'slate'} onClick={() => setStatusFilter('DRIVER_PENDING')} />
                <KPICard label="Đang chạy" value={stats.progress} color={statusFilter === 'IN_PROGRESS' ? 'cyan' : 'slate'} onClick={() => setStatusFilter('IN_PROGRESS')} />
                <KPICard label="Hoàn thành" value={stats.completed} color={statusFilter === 'COMPLETED' ? 'emerald' : 'slate'} onClick={() => setStatusFilter('COMPLETED')} />
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1 min-w-0">
                    <ScheduleCalendar 
                tickets={filteredTickets} 
                onTicketClick={setSelectedTicket}
                onDateRangeChange={(start, end) => setDateRange((start && end) ? {start: start as Date, end: end as Date} : null)}
            />
                </div>
                
                <div className="w-full lg:w-80 flex flex-col gap-6 shrink-0">
                    {/* Available Drivers */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Lái xe rảnh
                            </h3>
                            <span className="text-xs text-slate-500 font-medium">{format(new Date(), 'dd/MM')}</span>
                        </div>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                            {availableDrivers.length === 0 ? (
                                <div className="text-sm text-center text-slate-500 py-4 italic">Không có lái xe rảnh.</div>
                            ) : availableDrivers.map(dr => (
                                <div key={dr.id} className="flex items-center gap-3 p-2 rounded-lg border border-slate-100 hover:bg-slate-50">
                                    <div className="w-8 h-8 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-[10px]">
                                        {dr.name?.split(' ').pop()?.slice(0,2).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs font-bold text-slate-800 truncate">{dr.name}</div>
                                        <div className="text-[10px] text-slate-500 truncate">{dr.licensePlate || 'Chưa cập nhật biển số'}</div>
                                    </div>
                                    <div className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                                        {driverTrips[dr.username] || 0} chuyến
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Upcoming Tickets */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">📌 Phiếu sắp tới</h3>
                        <div className="space-y-3">
                            {upcomingTickets.length === 0 ? (
                                <div className="text-sm text-center text-slate-500 py-4 italic">Không có phiếu sắp tới.</div>
                            ) : upcomingTickets.map(t => {
                                const st = (DISPATCH_STATUS_COLORS[t.dispatchStatus as keyof typeof DISPATCH_STATUS_COLORS] || DISPATCH_STATUS_COLORS['WAITING_DISPATCH']);
                                return (
                                    <div key={t.id} onClick={() => setSelectedTicket(t)} className="p-3 border border-slate-100 rounded-lg cursor-pointer hover:bg-slate-50 hover:border-slate-200 transition-colors">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-xs font-bold text-blue-600">{t.dateEnd && !isNaN(new Date(t.dateEnd).getTime()) ? format(new Date(t.dateEnd), 'HH:mm') : ''}</span>
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm ${st.bg} ${st.text}`}>{(DISPATCH_STATUS_LABELS[t.dispatchStatus as keyof typeof DISPATCH_STATUS_LABELS] || 'Chờ xếp xe')}</span>
                                        </div>
                                        <div className="text-xs font-bold text-slate-800 mb-1">{t.orderCode || t.id.slice(-6)}</div>
                                        <div className="text-[10px] text-slate-500 w-full truncate">{t.customerCode} • {t.route}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {selectedTicket && (
                <TicketModal
                    ticket={selectedTicket}
                    isOpen={!!selectedTicket}
                    onClose={() => setSelectedTicket(null)}
                    routeConfigs={[]} 
                    currentUser={currentUser}
                    isReadOnly={true}
                />
            )}
        </div>
    );
};
