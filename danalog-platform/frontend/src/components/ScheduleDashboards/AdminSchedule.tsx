import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TransportTicket, DISPATCH_STATUS_LABELS, DISPATCH_STATUS_COLORS, TicketCorrectionRequest } from '../../types';
import { KPICard } from '../Dashboards/shared/KPICard';
import { format, parseISO } from 'date-fns';
import { TicketModal } from '../TicketModal';
import { ScheduleCalendar } from './shared/ScheduleCalendar';
import { api } from '../../services/api';
import { AlertTriangle, Clock, Settings } from 'lucide-react';

interface Props {
    tickets: TransportTicket[];
    users: any[];
    currentUser: any;
}

export const AdminSchedule: React.FC<Props> = ({ tickets, users, currentUser }) => {
    const navigate = useNavigate();
    const [selectedTicket, setSelectedTicket] = useState<TransportTicket | null>(null);
    const [dateRange, setDateRange] = useState<{start: Date, end: Date} | null>(null);
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [corrections, setCorrections] = useState<TicketCorrectionRequest[]>([]);
    const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);

    useEffect(() => {
        const fetchCorrections = async () => {
            try {
                const data = await api.getTicketCorrections();
                setCorrections(data || []);
            } catch (e) {
                console.error("Failed to fetch corrections", e);
            }
        };
        const fetchPendingApprovals = async () => {
            try {
                const data = await api.getProfileUpdateRequests();
                const pending = (data || []).filter((r: any) => r.status === 'PENDING');
                setPendingApprovalsCount(pending.length);
            } catch (e) {
                console.error("Failed to fetch profile approvals", e);
            }
        };
        fetchCorrections();
        fetchPendingApprovals();
    }, []);

    const dateFilteredTickets = useMemo(() => { if (!dateRange || !dateRange.start || !dateRange.end) return tickets; return tickets.filter(t => { const d = new Date(t.dateStart || t.dateEnd || new Date()); return d.getTime() >= dateRange.start.getTime() && d.getTime() <= dateRange.end.getTime(); }); }, [tickets, dateRange]);

    const stats = useMemo(() => {
        return {
            total: dateFilteredTickets.length,
            waiting: dateFilteredTickets.filter(t => t.dispatchStatus === 'WAITING_DISPATCH' || t.dispatchStatus === 'WAITING_AUTO').length,
            driverPending: dateFilteredTickets.filter(t => t.dispatchStatus === 'DRIVER_PENDING' || t.dispatchStatus === 'DRIVER_ASSIGNED').length,
            progress: dateFilteredTickets.filter(t => t.dispatchStatus === 'IN_PROGRESS').length,
            completed: dateFilteredTickets.filter(t => t.dispatchStatus === 'COMPLETED').length,
            pendingStatus: tickets.filter(t => t.status === 'PENDING').length
        };
    }, [dateFilteredTickets, tickets]);

    const filteredTickets = useMemo(() => {
        if (!statusFilter) return dateFilteredTickets;
        if (statusFilter === 'PENDING') return dateFilteredTickets.filter(t => t.status === 'PENDING');
        if (statusFilter === 'DRIVER_PENDING') return dateFilteredTickets.filter(t => t.dispatchStatus === 'DRIVER_PENDING' || t.dispatchStatus === 'DRIVER_ASSIGNED');
        return dateFilteredTickets.filter(t => t.dispatchStatus === statusFilter);
    }, [dateFilteredTickets, statusFilter]);

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Tổng Quan Vận Hành Công Ty</h2>
                    <p className="text-sm text-slate-500 mt-1">Giám sát toàn bộ KPI điều phối và hỗ trợ hệ thống — Admin.</p>
                </div>
            </div>

            {/* KPI Panels */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6 mt-4">
                <KPICard label="Tổng phiếu toàn HT" value={stats.total} color={statusFilter === null ? 'blue' : 'slate'} onClick={() => setStatusFilter(null)} />
                <KPICard label="Chờ điều xe" value={stats.waiting} color={statusFilter === 'WAITING_DISPATCH' ? 'slate' : 'slate'} onClick={() => setStatusFilter('WAITING_DISPATCH')} />
                <KPICard label="Chờ xác nhận" value={stats.driverPending} color={statusFilter === 'DRIVER_PENDING' ? 'amber' : 'slate'} onClick={() => setStatusFilter('DRIVER_PENDING')} />
                <KPICard label="Đang chạy" value={stats.progress} color={statusFilter === 'IN_PROGRESS' ? 'cyan' : 'slate'} onClick={() => setStatusFilter('IN_PROGRESS')} />
                <KPICard label="Hoàn thành" value={stats.completed} color={statusFilter === 'COMPLETED' ? 'emerald' : 'slate'} onClick={() => setStatusFilter('COMPLETED')} />
                <KPICard label="Phiếu chờ duyệt" value={stats.pendingStatus} color={statusFilter === 'PENDING' ? 'orange' : 'slate'} onClick={() => setStatusFilter('PENDING')} />
            </div>

            {/* Main Area */}
            <div className="flex flex-col lg:flex-row gap-6 mt-6">
                <div className="flex-1 flex flex-col min-w-0">
                    <ScheduleCalendar tickets={filteredTickets} onTicketClick={(t) => t.status === 'PENDING' ? navigate('/admin/tickets') : setSelectedTicket(t)} onDateRangeChange={(start, end) => setDateRange((start && end) ? {start: start as Date, end: end as Date} : null)} />
                </div>

                <div className="w-full lg:w-80 flex flex-col gap-6 shrink-0">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                         <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">📌 Tổng hợp yêu cầu</h3>
                         <div className="space-y-3">
                             <div 
                                className="p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                                onClick={() => navigate('/admin/corrections')}
                             >
                                <div className="text-sm font-bold text-slate-800 mb-1">Yêu cầu sửa đổi</div>
                                <div className="text-xs text-slate-500">Có <span className="font-bold text-rose-600">{corrections.filter(c => c.status === 'PENDING').length}</span> yêu cầu đang chờ duyệt.</div>
                             </div>
                             <div 
                                className="p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer group"
                                onClick={() => navigate('/admin/profile/approvals')}
                             >
                                <div className="flex justify-between items-center mb-1">
                                    <div className="text-sm font-bold text-slate-800">Yêu cầu duyệt hồ sơ</div>
                                    {pendingApprovalsCount > 0 && (
                                        <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse min-w-[20px] text-center">
                                            {pendingApprovalsCount}
                                        </span>
                                    )}
                                </div>
                                <div className="text-xs text-slate-500">
                                    {pendingApprovalsCount > 0 
                                        ? <>Có <span className="font-bold text-rose-600">{pendingApprovalsCount}</span> hồ sơ đang chờ duyệt.</>
                                        : 'Không có hồ sơ nào chờ duyệt.'
                                    }
                                </div>
                             </div>
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
