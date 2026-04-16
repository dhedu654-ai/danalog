import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TransportTicket, DISPATCH_STATUS_LABELS, DISPATCH_STATUS_COLORS, TicketCorrectionRequest } from '../../types';
import { ScheduleCalendar } from './shared/ScheduleCalendar';
import { KPICard } from '../Dashboards/shared/KPICard';
import { format } from 'date-fns';
import { TicketModal } from '../TicketModal';
import { api } from '../../services/api';
import { AlertTriangle, Plus } from 'lucide-react';

interface Props {
    tickets: TransportTicket[];
    currentUser: any;
}

export const CSStaffSchedule: React.FC<Props> = ({ tickets, currentUser }) => {
    const navigate = useNavigate();
    const [dateRange, setDateRange] = useState<{start: Date, end: Date} | null>(null);
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [selectedTicket, setSelectedTicket] = useState<TransportTicket | null>(null);
    const [alertFilter, setAlertFilter] = useState<string | null>(null);
    const [corrections, setCorrections] = useState<TicketCorrectionRequest[]>([]);
    const [showCritical, setShowCritical] = useState(false);
    const [showWarning, setShowWarning] = useState(false);

    useEffect(() => {
        const fetchCorrections = async () => {
            try {
                const data = await api.getTicketCorrections();
                setCorrections(data || []);
            } catch (e) {
                console.error("Failed to fetch corrections", e);
            }
        };
        fetchCorrections();
    }, []);

    const baseMyTickets = useMemo(() => {
        return tickets.filter(t => t.createdBy === currentUser.username || (t as any).csUsername === currentUser.username);
    }, [tickets, currentUser.username]);

    const myTickets = useMemo(() => {
        let result = baseMyTickets;
        if (dateRange && dateRange.start && dateRange.end) {
            result = result.filter(t => {
                const d = new Date(t.dateStart || t.dateEnd || t.createdAt || new Date());
                return d.getTime() >= dateRange.start.getTime() && d.getTime() <= dateRange.end.getTime();
            });
        }
        return result;
    }, [baseMyTickets, dateRange]);

    const stats = useMemo(() => {
        return {
            total: myTickets.length,
            waiting: myTickets.filter(t => t.dispatchStatus === 'WAITING_DISPATCH' || t.dispatchStatus === 'WAITING_AUTO').length,
            assigned: myTickets.filter(t => t.dispatchStatus === 'ASSIGNED').length,
            pending: myTickets.filter(t => t.dispatchStatus === 'DRIVER_PENDING' || t.dispatchStatus === 'DRIVER_ASSIGNED').length,
            progress: myTickets.filter(t => t.dispatchStatus === 'IN_PROGRESS').length,
            completed: myTickets.filter(t => t.dispatchStatus === 'COMPLETED').length,
        };
    }, [myTickets]);

    const filteredTickets = useMemo(() => {
        let result = myTickets;
        if (statusFilter) {
            if (statusFilter === 'DRIVER_PENDING') {
                result = result.filter(t => t.dispatchStatus === 'DRIVER_PENDING' || t.dispatchStatus === 'DRIVER_ASSIGNED');
            } else {
                result = result.filter(t => t.dispatchStatus === statusFilter);
            }
        }
        if (alertFilter) {
            const now = new Date().getTime();
            result = result.filter(t => {
                if (t.dispatchStatus === 'IN_PROGRESS' || t.dispatchStatus === 'COMPLETED') return false;
                const tDateStr = t.dateStart || t.dateEnd;
                if (!tDateStr) return false;
                const tTime = new Date(tDateStr).getTime();
                const diffHours = (tTime - now) / (1000 * 60 * 60);
                if (alertFilter === 'CRITICAL') return diffHours < 0 && t.dispatchStatus !== 'COMPLETED';
                if (alertFilter === 'WARNING') return diffHours > 0 && diffHours <= 6 && t.dispatchStatus === 'WAITING_DISPATCH';
                return true;
            });
        }
        return result;
    }, [myTickets, statusFilter, alertFilter]);

    const myCorrections = useMemo(() => {
        return corrections.filter(c => c.requestedBy === currentUser.username);
    }, [corrections, currentUser.username]);

    const alerts = useMemo(() => {
        const now = new Date().getTime();
        const alertsList: any[] = [];
        
        tickets.forEach(t => {
            if (t.dispatchStatus === 'IN_PROGRESS' || t.dispatchStatus === 'COMPLETED') return;
            const tDateStr = t.dateStart || t.dateEnd;
            if (!tDateStr) return;
            
            const tTime = new Date(tDateStr).getTime();
            const diffHours = (tTime - now) / (1000 * 60 * 60);

            if (diffHours < 0 && t.dispatchStatus !== 'COMPLETED') {
                alertsList.push({ ticket: t, type: 'critical', msg: 'Quá giờ chưa đi' });
            } else if (diffHours > 0 && diffHours <= 6 && t.dispatchStatus === 'WAITING_DISPATCH') {
                alertsList.push({ ticket: t, type: 'warning', msg: 'Sắp tới giờ chưa có xe' });
            }
        });

        return alertsList;
    }, [tickets]);

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Lịch Công Việc Của Tôi (CS)</h2>
                <p className="text-sm text-slate-500 mt-1">Theo dõi tiến độ đơn hàng do bạn khởi tạo và quản lý hồ sơ sửa đổi.</p>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <KPICard label="Tổng PVT" value={stats.total} color={statusFilter === null ? 'blue' : 'slate'} onClick={() => setStatusFilter(null)} />
                <KPICard label="Đang chạy" value={stats.progress} color={statusFilter === 'IN_PROGRESS' ? 'cyan' : 'slate'} onClick={() => setStatusFilter('IN_PROGRESS')} />
                <KPICard label="Hoàn thành" value={stats.completed} color={statusFilter === 'COMPLETED' ? 'emerald' : 'slate'} onClick={() => setStatusFilter('COMPLETED')} />
                <KPICard label="Phiếu chờ duyệt" value={baseMyTickets.filter(t => t.status === 'PENDING').length} color="amber" onClick={() => navigate('/cs/tickets')} />
                <KPICard label="Yêu cầu sửa đổi" value={myCorrections.filter(c => c.status === 'PENDING').length} color="rose" onClick={() => navigate('/cs/corrections')} />
            </div>

            {/* Alerts Panel if any */}
            {alerts.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <h3 className="text-red-800 font-bold text-sm mb-3 flex items-center gap-2">
                        <AlertTriangle size={16} /> Cảnh báo chung toàn hệ thống (Nhấn để xem danh sách phiếu)
                    </h3>
                    <div className="flex flex-col gap-3">
                        {alerts.filter(a => a.type === 'critical').length > 0 && (
                            <div className="flex flex-col gap-2">
                                <div 
                                    className="px-4 py-2 rounded-lg border bg-red-100/50 border-red-200 text-red-800 hover:bg-red-100 flex gap-2 items-center text-sm font-bold cursor-pointer transition-colors inline-block w-max"
                                    onClick={() => setShowCritical(!showCritical)}
                                >
                                    <span>🚨 Quá giờ vận hành ({alerts.filter(a => a.type === 'critical').length})</span>
                                </div>
                                {showCritical && (
                                    <div className="pl-4 border-l-2 border-red-300 ml-2 space-y-1">
                                        {alerts.filter(a => a.type === 'critical').map((a, i) => (
                                            <div key={i} onClick={() => setSelectedTicket(a.ticket)} className="text-xs font-semibold text-red-700 hover:underline cursor-pointer">
                                                {a.ticket.orderCode || a.ticket.id.slice(-6)} - {a.ticket.route}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        {alerts.filter(a => a.type === 'warning').length > 0 && (
                            <div className="flex flex-col gap-2">
                                <div 
                                    className="px-4 py-2 rounded-lg border bg-orange-50 border-orange-200 text-orange-800 hover:bg-orange-100 flex gap-2 items-center text-sm font-bold cursor-pointer transition-colors inline-block w-max"
                                    onClick={() => setShowWarning(!showWarning)}
                                >
                                    <span>⚠️ Sắp tới giờ nhưng chưa có xe ({alerts.filter(a => a.type === 'warning').length})</span>
                                </div>
                                {showWarning && (
                                    <div className="pl-4 border-l-2 border-orange-300 ml-2 space-y-1">
                                        {alerts.filter(a => a.type === 'warning').map((a, i) => (
                                            <div key={i} onClick={() => setSelectedTicket(a.ticket)} className="text-xs font-semibold text-orange-700 hover:underline cursor-pointer">
                                                {a.ticket.orderCode || a.ticket.id.slice(-6)} - {a.ticket.route}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1 min-w-0">
                    <ScheduleCalendar tickets={filteredTickets} onTicketClick={(t) => t.status === 'PENDING' ? navigate('/cs/tickets') : setSelectedTicket(t)} onDateRangeChange={(start, end) => setDateRange((start && end) ? {start: start as Date, end: end as Date} : null)} />
                </div>
                
                <div className="w-full lg:w-96 flex flex-col gap-6 shrink-0">
                    {/* My Corrections */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 
                                className="text-sm font-bold text-slate-800 cursor-pointer hover:text-blue-600 transition-colors"
                                onClick={() => navigate('/cs/corrections')}
                            >
                                Yêu cầu sửa đổi
                            </h3>
                        </div>
                        <div className="space-y-3">
                            {myCorrections.length === 0 ? (
                                <div className="text-sm text-center text-slate-500 py-4 italic">Không có yêu cầu nào.</div>
                            ) : myCorrections.map(c => {
                                const isPending = c.status === 'PENDING';
                                const isApproved = c.status === 'APPROVED';
                                return (
                                    <div key={c.id} className="p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
                                        <div className="flex justify-between items-start mb-1">
                                            <span 
                                                className="text-xs font-bold text-blue-600 font-mono cursor-pointer hover:underline"
                                                onClick={() => {
                                                    const t = tickets.find(t => t.id === c.ticketId || t.orderCode === c.ticketId);
                                                    if (t) setSelectedTicket(t);
                                                    else alert('Không tìm thấy phiếu này.');
                                                }}
                                            >
                                                {c.ticketId}
                                            </span>
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm ${isPending ? 'bg-amber-50 text-amber-700' : isApproved ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                                {isPending ? 'Chờ duyệt' : isApproved ? 'Đã duyệt' : 'Từ chối'}
                                            </span>
                                        </div>
                                        <div className="text-xs text-slate-800 mb-1 truncate">
                                            Lý do: <span className="font-semibold">{c.reason}</span>
                                        </div>
                                        {!isPending && (
                                            <div className={`mt-2 p-2 rounded text-[10px] ${isApproved ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
                                                Duyệt bởi: {c.reviewedBy} <br/> "{c.reviewNote || 'Ok'}"
                                            </div>
                                        )}
                                    </div>
                                )
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
