import React, { useMemo, useState, useEffect } from 'react';
import { TransportTicket, DISPATCH_STATUS_LABELS, DISPATCH_STATUS_COLORS } from '../../types';
import { ScheduleCalendar } from './shared/ScheduleCalendar';
import { KPICard } from '../Dashboards/shared/KPICard';
import { format } from 'date-fns';
import { TicketModal } from '../TicketModal';
import { api } from '../../services/api';

interface Props {
    tickets: TransportTicket[];
    users: any[];
    currentUser: any;
}

export const DispatchLeadSchedule: React.FC<Props> = ({ tickets, users, currentUser }) => {
    const [dateRange, setDateRange] = useState<{start: Date, end: Date} | null>(null);
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [employeeFilter, setEmployeeFilter] = useState<string | 'ALL'>('ALL');
    const [selectedTicket, setSelectedTicket] = useState<TransportTicket | null>(null);
    const [profileRequests, setProfileRequests] = useState<any[]>([]);

    const dispatchers = useMemo(() => users.filter(u => u.role === 'DISPATCHER' || u.role === 'DV_LEAD'), [users]);

    // Fetch profile update requests
    useEffect(() => {
        api.getProfileUpdateRequests().then(data => {
            setProfileRequests((data || []).filter((r: any) => r.status === 'PENDING'));
        }).catch(() => setProfileRequests([]));
    }, []);

    const handleApproveRequest = async (requestId: string) => {
        try {
            await api.updateProfileRequestStatus(requestId, 'APPROVED', currentUser?.username || 'DV_LEAD');
            setProfileRequests(prev => prev.filter(r => r.id !== requestId));
        } catch (e) { console.error(e); }
    };

    const handleRejectRequest = async (requestId: string) => {
        try {
            await api.updateProfileRequestStatus(requestId, 'REJECTED', currentUser?.username || 'DV_LEAD');
            setProfileRequests(prev => prev.filter(r => r.id !== requestId));
        } catch (e) { console.error(e); }
    };

    const stats = useMemo(() => {
        let baseTickets = tickets;
        if (dateRange && dateRange.start && dateRange.end) { baseTickets = baseTickets.filter(t => { const d = new Date(t.dateStart || t.dateEnd || t.createdAt || new Date()); return d.getTime() >= dateRange.start.getTime() && d.getTime() <= dateRange.end.getTime(); }); }
        if (employeeFilter !== 'ALL') {
            baseTickets = baseTickets.filter(t => t.dispatcherUsername === employeeFilter);
        }
        return {
            total: baseTickets.length,
            waiting: baseTickets.filter(t => t.dispatchStatus === 'WAITING_DISPATCH' || t.dispatchStatus === 'WAITING_AUTO').length,
            assigned: baseTickets.filter(t => t.dispatchStatus === 'ASSIGNED').length,
            pending: baseTickets.filter(t => t.dispatchStatus === 'DRIVER_PENDING' || t.dispatchStatus === 'DRIVER_ASSIGNED').length,
            progress: baseTickets.filter(t => t.dispatchStatus === 'IN_PROGRESS').length,
            completed: baseTickets.filter(t => t.dispatchStatus === 'COMPLETED').length,
        };
    }, [tickets, employeeFilter, dateRange]);

    const filteredTickets = useMemo(() => {
        let result = tickets;
        if (dateRange && dateRange.start && dateRange.end) { result = result.filter(t => { const d = new Date(t.dateStart || t.dateEnd || t.createdAt || new Date()); return d.getTime() >= dateRange.start.getTime() && d.getTime() <= dateRange.end.getTime(); }); }
        if (employeeFilter !== 'ALL') {
            result = result.filter(t => t.dispatcherUsername === employeeFilter);
        }
        if (statusFilter) {
            if (statusFilter === 'DRIVER_PENDING') {
                result = result.filter(t => t.dispatchStatus === 'DRIVER_PENDING' || t.dispatchStatus === 'DRIVER_ASSIGNED');
            } else {
                result = result.filter(t => t.dispatchStatus === statusFilter);
            }
        }
        return result;
    }, [tickets, statusFilter, employeeFilter, dateRange]);

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

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Lịch Điều Phối Tổng Quan</h2>
                    <p className="text-sm text-slate-500 mt-1">Theo dõi toàn bộ hệ thống phân rã theo chức vụ — Trưởng phòng Điều vận.</p>
                </div>
                
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm">
                    <span className="text-sm font-bold text-slate-600">Lọc theo nhân viên:</span>
                    <select 
                        className="bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-sm font-bold text-slate-800 focus:outline-none focus:border-blue-500 w-48"
                        value={employeeFilter}
                        onChange={(e) => {
                            setEmployeeFilter(e.target.value);
                            setStatusFilter(null);
                        }}
                    >
                        <option value="ALL">Tất cả nhân viên</option>
                        {dispatchers.map(d => (
                            <option key={d.username} value={d.username}>{d.name} ({d.username})</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <KPICard label="Tổng phiếu" value={stats.total} color={statusFilter === null ? 'blue' : 'slate'} onClick={() => setStatusFilter(null)} />
                <KPICard label="Chờ điều xe" value={stats.waiting} color={statusFilter === 'WAITING_DISPATCH' ? 'slate' : 'slate'} onClick={() => setStatusFilter('WAITING_DISPATCH')} />
                <KPICard label="Đã phân công" value={stats.assigned} color={statusFilter === 'ASSIGNED' ? 'blue' : 'slate'} onClick={() => setStatusFilter('ASSIGNED')} />
                <KPICard label="Chờ xác nhận" value={stats.pending} color={statusFilter === 'DRIVER_PENDING' ? 'amber' : 'slate'} onClick={() => setStatusFilter('DRIVER_PENDING')} />
                <KPICard label="Đang vận chuyển" value={stats.progress} color={statusFilter === 'IN_PROGRESS' ? 'cyan' : 'slate'} onClick={() => setStatusFilter('IN_PROGRESS')} />
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

                    {/* Profile Update Requests */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">📋 Yêu cầu chỉnh sửa hồ sơ
                            {profileRequests.length > 0 && (
                                <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{profileRequests.length}</span>
                            )}
                        </h3>
                        <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                            {profileRequests.length === 0 ? (
                                <div className="text-sm text-center text-slate-500 py-4 italic">Không có yêu cầu chờ duyệt.</div>
                            ) : profileRequests.map(req => {
                                const fields = req.fieldsToUpdate || {};
                                const fieldNames = Object.keys(fields).filter(k => fields[k] !== undefined && fields[k] !== null);
                                return (
                                    <div key={req.id} className="p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <div className="text-xs font-bold text-slate-800">{req.username}</div>
                                                <div className="text-[10px] text-slate-500">{req.created_at ? format(new Date(req.created_at), 'dd/MM HH:mm') : ''}</div>
                                            </div>
                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-amber-50 text-amber-600">CHỜ DUYỆT</span>
                                        </div>
                                        <div className="text-[10px] text-slate-600 mb-2">
                                            {fieldNames.map(f => (
                                                <div key={f} className="truncate">• <span className="font-semibold">{f === 'name' ? 'Tên hiển thị' : f}</span>: {fields[f]}</div>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleApproveRequest(req.id)} className="flex-1 text-[10px] font-bold py-1.5 rounded bg-emerald-500 text-white hover:bg-emerald-600 transition-colors">Duyệt</button>
                                            <button onClick={() => handleRejectRequest(req.id)} className="flex-1 text-[10px] font-bold py-1.5 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors">Từ chối</button>
                                        </div>
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
