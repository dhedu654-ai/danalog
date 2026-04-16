import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TransportTicket, DISPATCH_STATUS_LABELS, DISPATCH_STATUS_COLORS, TicketCorrectionRequest } from '../../types';
import { ScheduleCalendar } from './shared/ScheduleCalendar';
import { KPICard } from '../Dashboards/shared/KPICard';
import { format } from 'date-fns';
import { TicketModal } from '../TicketModal';
import { api } from '../../services/api';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface Props {
    tickets: TransportTicket[];
    users: any[];
    currentUser: any;
}

export const CSLeadSchedule: React.FC<Props> = ({ tickets, users, currentUser }) => {
    const navigate = useNavigate();
    const [dateRange, setDateRange] = useState<{start: Date, end: Date} | null>(null);
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [employeeFilter, setEmployeeFilter] = useState<string | 'ALL'>('ALL');
    const [selectedTicket, setSelectedTicket] = useState<TransportTicket | null>(null);
    const [alertFilter, setAlertFilter] = useState<string | null>(null);
    const [corrections, setCorrections] = useState<TicketCorrectionRequest[]>([]);
    const [showCritical, setShowCritical] = useState(false);
    const [showWarning, setShowWarning] = useState(false);

    const csStaff = useMemo(() => users.filter(u => u.role === 'CS' || u.role === 'CS_LEAD'), [users]);

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

    const stats = useMemo(() => {
        let baseTickets = tickets;
        if (dateRange && dateRange.start && dateRange.end) { 
            baseTickets = baseTickets.filter(t => { 
                const d = new Date(t.dateStart || t.dateEnd || t.createdAt || new Date()); 
                return d.getTime() >= dateRange.start.getTime() && d.getTime() <= dateRange.end.getTime(); 
            }); 
        }
        if (employeeFilter !== 'ALL') {
            baseTickets = baseTickets.filter(t => t.createdBy === employeeFilter);
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
        if (dateRange && dateRange.start && dateRange.end) { 
            result = result.filter(t => { 
                const d = new Date(t.dateStart || t.dateEnd || t.createdAt || new Date()); 
                return d.getTime() >= dateRange.start.getTime() && d.getTime() <= dateRange.end.getTime(); 
            }); 
        }
        if (employeeFilter !== 'ALL') {
            result = result.filter(t => t.createdBy === employeeFilter);
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

    const correctionsPending = useMemo(() => {
        return corrections.filter(c => c.status === 'PENDING').slice(0, 5);
    }, [corrections]);

    // Tìm các phiếu đang bị bottleneck:
    // 1. Quá giờ chạy mà chưa có nhận (WAITING_DISPATCH, ASSIGNED, DRIVER_PENDING) -> Khẩn cấp
    // 2. Còn < 6 tiếng -> Chú ý
    const alerts = useMemo(() => {
        const now = new Date().getTime();
        const alertsList: any[] = [];
        
        tickets.forEach(t => {
            if (t.dispatchStatus === 'IN_PROGRESS' || t.dispatchStatus === 'COMPLETED') return;
            const tDateStr = t.dateStart || t.dateEnd;
            if (!tDateStr) return;
            // Assuming tDateStr contains time or we just use date + '00:00' if no time parsing available easily
            const tTime = new Date(tDateStr).getTime();
            const diffHours = (tTime - now) / (1000 * 60 * 60);

            if (diffHours < 0 && t.dispatchStatus !== 'COMPLETED') {
                alertsList.push({ ticket: t, type: 'critical', msg: 'Quá giờ chưa đi' });
            } else if (diffHours > 0 && diffHours <= 6 && t.dispatchStatus === 'WAITING_DISPATCH') {
                alertsList.push({ ticket: t, type: 'warning', msg: 'Sắp tới giờ chưa có xe' });
            }
        });

        return alertsList;
    }, [tickets, dateRange]);


    const handleReviewCorrection = async (id: string, isApprove: boolean) => {
        const note = prompt(`Nhập ghi chú ${isApprove ? 'phê duyệt' : 'từ chối'} (Không bắt buộc):`);
        if (note === null) return;

        try {
            await api.reviewTicketCorrection(id, {
                status: isApprove ? 'APPROVED' : 'REJECTED',
                reviewedBy: currentUser?.username || 'Admin',
                reviewNote: note
            });
            // Update local state optimistic
            setCorrections(prev => prev.map(c => c.id === id ? { ...c, status: isApprove ? 'APPROVED' : 'REJECTED' } : c));
        } catch (error) {
            console.error("Failed to review request", error);
            alert("Đã có lỗi xảy ra. Vui lòng thử lại.");
        }
    };


    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Lịch Điều Phối CS Khách Hàng (TỔNG)</h2>
                    <p className="text-sm text-slate-500 mt-1">Theo dõi tiến độ đơn hàng và duyệt sửa đổi phiếu — Trưởng CS.</p>
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
                        {csStaff.map(d => (
                            <option key={d.username} value={d.username}>{d.name} ({d.username})</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <KPICard label="Tổng PVT" value={stats.total} color={statusFilter === null ? 'blue' : 'slate'} onClick={() => setStatusFilter(null)} />
                <KPICard label="Đang chạy" value={stats.progress} color={statusFilter === 'IN_PROGRESS' ? 'cyan' : 'slate'} onClick={() => setStatusFilter('IN_PROGRESS')} />
                <KPICard label="Hoàn thành" value={stats.completed} color={statusFilter === 'COMPLETED' ? 'emerald' : 'slate'} onClick={() => setStatusFilter('COMPLETED')} />
                <KPICard label="Phiếu chờ duyệt" value={tickets.filter(t => t.status === 'PENDING').length} color="amber" onClick={() => navigate('/cs/tickets')} />
                <KPICard label="Yêu cầu sửa đổi" value={corrections.filter(c => c.status === 'PENDING').length} color="rose" onClick={() => navigate('/cs/corrections')} />
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
                    {/* Corrections Waiting Approval */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                        <h3 
                            className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 cursor-pointer hover:text-blue-600 transition-colors"
                            onClick={() => navigate('/cs/corrections')}
                        >
                            Yêu cầu chờ duyệt sửa 
                            <span className="bg-rose-100 text-rose-600 text-[10px] px-2 py-0.5 rounded-full">{correctionsPending.length}</span>
                        </h3>
                        <div className="space-y-3">
                            {correctionsPending.length === 0 ? (
                                <div className="text-sm text-center text-slate-500 py-4 italic">Không có yêu cầu chờ duyệt.</div>
                            ) : correctionsPending.map(c => (
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
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-amber-50 text-amber-700">Chờ duyệt</span>
                                    </div>
                                    <div className="text-xs text-slate-800 mb-2 truncate">
                                        Lý do: <span className="font-semibold">{c.reason}</span>
                                    </div>
                                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100">
                                        <span className="text-[10px] text-slate-500">Bởi: {c.requestedBy}</span>
                                        <div className="flex gap-1">
                                            <button onClick={() => handleReviewCorrection(c.id, true)} className="p-1 px-2 flex items-center gap-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded text-[10px] font-bold"><CheckCircle size={10} /> Duyệt</button>
                                            <button onClick={() => handleReviewCorrection(c.id, false)} className="p-1 px-2 flex items-center gap-1 bg-red-50 text-red-600 hover:bg-red-100 rounded text-[10px] font-bold"><XCircle size={10} /> Từ chối</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
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
