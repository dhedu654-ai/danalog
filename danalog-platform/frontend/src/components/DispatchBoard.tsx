import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { TransportTicket, DispatchCandidate, DispatchLog, DriverResponse as DriverResponseType, RejectedCandidate, OverrideReasonCode, OVERRIDE_REASON_LABELS, PriorityLevel, PriorityBreakdown } from '../types';
import { api } from '../services/api';
import {
    Truck, Clock, Users, AlertTriangle, CheckCircle, XCircle, RefreshCw,
    Zap, Award, Shield,
    BarChart3, Search, ArrowUpDown, Link2
} from 'lucide-react';

interface DispatchBoardProps {
    tickets: TransportTicket[];
    currentUser: any;
    onRefreshTickets: () => void;
    focusedTicketId?: string | null;
    onClearFocus?: () => void;
    activeSubPage: 'board' | 'tracking' | 'responses' | 'logs';
}

// KPI Card
function KPICard({ icon: Icon, label, value, sub, color = 'blue' }: { icon: any, label: string, value: string | number, sub?: string, color?: string }) {
    const colorMap: Record<string, string> = {
        blue: 'from-blue-500 to-blue-600',
        green: 'from-emerald-500 to-emerald-600',
        amber: 'from-amber-500 to-amber-600',
        red: 'from-red-500 to-red-600',
        indigo: 'from-indigo-500 to-indigo-600',
    };
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colorMap[color] || colorMap.blue} flex items-center justify-center`}>
                    <Icon size={20} className="text-white" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
            </div>
            <div className="text-3xl font-extrabold text-slate-800">{value}</div>
            {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
        </div>
    );
}

// Score Bar
function ScoreBar({ label, value, max = 100 }: { label: string, value: number, max?: number }) {
    const pct = Math.min(100, (value / max) * 100);
    return (
        <div className="flex items-center gap-3 text-xs">
            <span className="w-28 text-slate-500 font-medium truncate">{label}</span>
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className="w-12 text-right font-bold text-slate-700">{value}/100</span>
        </div>
    );
}

export function DispatchBoard({ tickets, currentUser, onRefreshTickets, focusedTicketId, onClearFocus, activeSubPage }: DispatchBoardProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const prefix = location.pathname.startsWith('/kt') ? '/kt' : '/dispatch';

    const [selectedTicket, setSelectedTicket] = useState<TransportTicket | null>(null);
    const [candidates, setCandidates] = useState<DispatchCandidate[]>([]);
    const [rejectedCandidates, setRejectedCandidates] = useState<RejectedCandidate[]>([]);
    const [selectedCandidate, setSelectedCandidate] = useState<DispatchCandidate | null>(null);
    const [loading, setLoading] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [logs, setLogs] = useState<DispatchLog[]>([]);
    const [responses, setResponses] = useState<DriverResponseType[]>([]);
    const [stats, setStats] = useState<any>(null);

    const [ticketPriority, setTicketPriority] = useState<{ score: number; level: PriorityLevel; breakdown: PriorityBreakdown } | null>(null);

    // Override modal state
    const [showOverrideModal, setShowOverrideModal] = useState(false);
    const [overrideReasonCode, setOverrideReasonCode] = useState<OverrideReasonCode>('OPERATIONAL_NEED');
    const [overrideNote, setOverrideNote] = useState('');
    const [overrideDriverId, setOverrideDriverId] = useState('');
    const [overrideSubmitting, setOverrideSubmitting] = useState(false);
    const [allDrivers, setAllDrivers] = useState<any[]>([]);

    // Filter & Sort State
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState<'NEWEST' | 'OLDEST' | 'URGENT'>('URGENT');
    const [trackingSearchQuery, setTrackingSearchQuery] = useState('');
    const [trackingDispatcherFilter, setTrackingDispatcherFilter] = useState('');
    const [trackingDriverFilter, setTrackingDriverFilter] = useState('');
    const [trackingStatusFilter, setTrackingStatusFilter] = useState('');
    const [trackingCustomerFilter, setTrackingCustomerFilter] = useState('');
    const [trackingRouteFilter, setTrackingRouteFilter] = useState('');

    // Response filter state
    const [responseStatusFilter, setResponseStatusFilter] = useState<string | null>(null);
    const [responseDriverFilter, setResponseDriverFilter] = useState('');
    const [responseSearchQuery, setResponseSearchQuery] = useState('');

    // Active dispatch statuses that should NOT appear in the pending queue
    const activeDispatchStatuses = ['ASSIGNED', 'DRIVER_ASSIGNED', 'DRIVER_PENDING', 'DRIVER_ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'ON_THE_WAY', 'ARRIVED'];

    // Filter unassigned tickets (pending dispatch)
    const pendingTickets = tickets.filter(t =>
        (!t.dispatchStatus || t.dispatchStatus === 'WAITING_DISPATCH' || t.dispatchStatus === 'WAITING_AUTO') &&
        ['APPROVED', 'PENDING', 'MỚI TẠO', 'NEW', 'CHƯA ĐIỀU XE'].includes(t.status || '')
    );

    const activeTrips = tickets.filter(t =>
        ['ĐANG VẬN CHUYỂN', 'ĐÃ ĐIỀU XE', 'COMPLETED'].includes(t.status || '') ||
        activeDispatchStatuses.includes(t.dispatchStatus || '')
    );

    // Apply Filter & Sort
    let processedPending = [...pendingTickets];

    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        processedPending = processedPending.filter(t => 
            (t.id || '').toLowerCase().includes(q) ||
            (t.route || '').toLowerCase().includes(q) ||
            (t.customerCode || '').toLowerCase().includes(q) ||
            ((t as any).pickupLocation || '').toLowerCase().includes(q)
        );
    }

    processedPending.sort((a, b) => {
        if (sortOrder === 'NEWEST') {
            return new Date(b.dateStart || 0).getTime() - new Date(a.dateStart || 0).getTime();
        } else if (sortOrder === 'OLDEST') {
            return new Date(a.dateStart || 0).getTime() - new Date(b.dateStart || 0).getTime();
        } else if (sortOrder === 'URGENT') {
            // Sort by priority score descending
            const pA = a.priorityScore || 0;
            const pB = b.priorityScore || 0;
            return pB - pA;
        }
        return 0;
    });

    // Tracking Filter
    let processedTracking = [...tickets];
    if (trackingSearchQuery) {
        const q = trackingSearchQuery.toLowerCase();
        processedTracking = processedTracking.filter(t => 
            (t.id || '').toLowerCase().includes(q) ||
            (t.route || '').toLowerCase().includes(q) ||
            (t.customerCode || '').toLowerCase().includes(q) ||
            (t.assignedDriverName || (t as any).assignedDriver || t.driverName || '').toLowerCase().includes(q)
        );
    }
    if (trackingDriverFilter) {
        processedTracking = processedTracking.filter(t => {
            const driverStr = t.assignedDriverName || (t as any).assignedDriver || t.driverName || '';
            return driverStr === trackingDriverFilter;
        });
    }
    if (trackingDispatcherFilter) {
        processedTracking = processedTracking.filter(t => {
            const log = logs.find(l => l.ticketId === t.id);
            // @ts-ignore
            const dispatcher = t.dispatchedBy || log?.dispatcherUsername || '';
            // @ts-ignore
            const isAuto = t.assignType === 'auto' || log?.assignType === 'auto';
            if (trackingDispatcherFilter === '__auto__') return isAuto;
            return dispatcher === trackingDispatcherFilter;
        });
    }
    if (trackingStatusFilter) {
        processedTracking = processedTracking.filter(t => {
            // Check both dispatchStatus and ticket status
            return t.dispatchStatus === trackingStatusFilter || t.status === trackingStatusFilter;
        });
    }
    if (trackingCustomerFilter) {
        processedTracking = processedTracking.filter(t => t.customerCode === trackingCustomerFilter);
    }
    if (trackingRouteFilter) {
        processedTracking = processedTracking.filter(t => t.route === trackingRouteFilter);
    }

    // Unique values for tracking filter dropdowns
    const uniqueTrackingDrivers = Array.from(new Set(tickets.map(t => t.assignedDriverName || (t as any).assignedDriver || t.driverName).filter(Boolean)));
    const uniqueTrackingDispatchers = Array.from(new Set(
        tickets.map(t => {
            const log = logs.find(l => l.ticketId === t.id);
            // @ts-ignore
            return t.dispatchedBy || log?.dispatcherUsername || '';
        }).filter(Boolean)
    ));
    const uniqueTrackingCustomers = Array.from(new Set(tickets.map(t => t.customerCode).filter(Boolean)));
    const uniqueTrackingRoutes = Array.from(new Set(tickets.map(t => t.route).filter(Boolean)));
    const uniqueTrackingStatuses = Array.from(new Set([
        ...tickets.map(t => t.dispatchStatus).filter(Boolean),
        ...tickets.map(t => t.status).filter(Boolean),
    ]));

    // Load dashboard stats
    useEffect(() => {
        api.getDashboardStats().then(setStats).catch(console.error);
        api.getDispatchLogs().then(setLogs).catch(console.error);
        api.getDriverResponses().then(setResponses).catch(console.error);
        api.getUsers().then((users: any[]) => setAllDrivers(users.filter((u: any) => u.role === 'DRIVER'))).catch(console.error);
    }, []);




    // Request AI suggestions for a ticket
    const handleSuggest = useCallback(async (ticket: TransportTicket) => {
        setSelectedTicket(ticket);
        setCandidates([]);
        setRejectedCandidates([]);
        setSelectedCandidate(null);
        setTicketPriority(null);
        setLoading(true);
        try {
            const result = await api.dispatchSuggest(ticket.id);
            setCandidates(result.candidates || []);
            setRejectedCandidates(result.rejectedCandidates || []);
            if (result.priority) setTicketPriority(result.priority);
            if (result.candidates?.length > 0) {
                setSelectedCandidate(result.candidates[0]);
            }
        } catch (err) {
            console.error('Suggest failed:', err);
        }
        setLoading(false);
    }, []);

    // Deep linking focus
    useEffect(() => {
        if (focusedTicketId && tickets.length > 0) {
            if (focusedTicketId.startsWith('TK-')) {
                const targetTicket = tickets.find(t => t.id === focusedTicketId);
                if (targetTicket) {
                    setTimeout(() => {
                        handleSuggest(targetTicket);
                        if (onClearFocus) onClearFocus();
                    }, 50);
                }
            } else if (focusedTicketId.startsWith('ORD-')) {
                const orderTickets = tickets.filter(t => t.orderId === focusedTicketId);
                if (orderTickets.length > 0) {
                    setTimeout(() => {
                        handleSuggest(orderTickets[0]);
                        if (onClearFocus) onClearFocus();
                    }, 50);
                }
            }
        }
    }, [focusedTicketId, tickets, handleSuggest, onClearFocus]);

    // Assign driver 
    const handleAssign = useCallback(async (driverId: string, type: 'manual' | 'auto' | 'ai_suggested' | 'override' = 'manual') => {
        if (!selectedTicket) return;
        setAssigning(true);
        try {
            await api.dispatchAssign(
                selectedTicket.id,
                driverId,
                type,
                undefined,
                currentUser?.username,
                selectedTicket.version
            );
            onRefreshTickets();
            setSelectedTicket(null);
            setCandidates([]);
            setRejectedCandidates([]);
            setSelectedCandidate(null);
            const newLogs = await api.getDispatchLogs();
            setLogs(newLogs);
            const newResponses = await api.getDriverResponses();
            setResponses(newResponses);
            const newStats = await api.getDashboardStats();
            setStats(newStats);
        } catch (err: any) {
            const errMsg = err?.message || '';
            if (errMsg.includes('CONFLICT') || errMsg.includes('409')) {
                alert(errMsg || 'Phiếu này đã được gán cho lái xe khác rồi. Vui lòng refresh lại trang.');
                onRefreshTickets();
            } else {
                console.error('Assign failed:', err);
                alert('Gán lái xe thất bại: ' + errMsg);
            }
        }
        setAssigning(false);
    }, [selectedTicket, currentUser, onRefreshTickets]);

    // Override assign
    const handleOverrideSubmit = useCallback(async () => {
        if (!selectedTicket || !overrideDriverId) return;
        setOverrideSubmitting(true);
        try {
            await api.dispatchOverride(
                selectedTicket.id,
                overrideDriverId,
                overrideReasonCode,
                overrideNote || undefined,
                currentUser?.username,
                selectedTicket.version
            );
            setShowOverrideModal(false);
            setOverrideNote('');
            onRefreshTickets();
            setSelectedTicket(null);
            setCandidates([]);
            setRejectedCandidates([]);
            setSelectedCandidate(null);
            const newLogs = await api.getDispatchLogs();
            setLogs(newLogs);
            const newResponses = await api.getDriverResponses();
            setResponses(newResponses);
        } catch (err: any) {
            if (err?.message === 'CONFLICT') {
                alert('Dữ liệu đã thay đổi. Vui lòng làm mới.');
                onRefreshTickets();
            } else {
                alert('Override thất bại!');
            }
        }
        setOverrideSubmitting(false);
    }, [selectedTicket, overrideDriverId, overrideReasonCode, overrideNote, currentUser, onRefreshTickets]);

    // Auto-assign
    const handleAutoAssign = useCallback(async (ticketId: string) => {
        setAssigning(true);
        try {
            await api.dispatchAutoAssign(ticketId, currentUser?.username);
            onRefreshTickets();
            setSelectedTicket(null);
            setCandidates([]);
            setRejectedCandidates([]);
            const newLogs = await api.getDispatchLogs();
            setLogs(newLogs);
            const newStats = await api.getDashboardStats();
            setStats(newStats);
        } catch (err) {
            console.error('Auto-assign failed:', err);
        }
        setAssigning(false);
    }, [onRefreshTickets]);

    // Open override modal
    const openOverrideModal = (driverId?: string, _driverName?: string) => {
        setOverrideDriverId(driverId || '');
        setOverrideReasonCode('OPERATIONAL_NEED');
        setOverrideNote('');
        setShowOverrideModal(true);
    };

    // Priority badge helper
    const getPriorityBadge = (level?: PriorityLevel, score?: number) => {
        if (!level) return null;
        const colors: Record<PriorityLevel, string> = {
            Critical: 'bg-red-100 text-red-800 border-red-200',
            High: 'bg-orange-100 text-orange-800 border-orange-200',
            Medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            Low: 'bg-green-100 text-green-800 border-green-200',
        };
        const labels: Record<PriorityLevel, string> = { Critical: 'Khẩn', High: 'Cao', Medium: 'TB', Low: 'Thấp' };
        return (
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${colors[level]} ${level === 'Critical' ? 'animate-pulse' : ''}`}>
                {labels[level]}{score !== undefined ? ` ${score}` : ''}
            </span>
        );
    };

    // Eligibility reason labels
    const EL_LABELS: Record<string, string> = {
        DRIVER_NOT_AVAILABLE: 'Không khả dụng',
        VEHICLE_NOT_ACTIVE: 'Xe không hoạt động',
        DRIVER_DISPATCH_LOCKED: 'Khóa điều vận',
        ASSIGNMENT_OVERLAP: 'Trùng lịch (≥2 chuyến)',
        VEHICLE_SIZE_MISMATCH: 'Kích thước xe không phù hợp',
        AVAILABLE_TOO_LATE: 'Khả dụng quá muộn',
        MAINTENANCE_HOLD: 'Đang bảo trì',
        NO_VEHICLE: 'Chưa đăng ký xe',
        PREV_FAILED: 'Đã từ chối/Bị gỡ',
        PREVIOUSLY_REJECTED: 'Đã từ chối trước đó',
    };

    // Slow driver responses alert (no response > 15 mins)
    const slowResponses = responses.filter(r => {
        if (r.response !== 'PENDING') return false;
        if (!r.sentAt) return true; // missing timestamp is considered slow
        const timeDiff = new Date().getTime() - new Date(r.sentAt).getTime();
        return timeDiff > 15 * 60 * 1000;
    });

    return (
        <div className="space-y-6 font-sans">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Trung tâm Điều phối</h2>
                    <p className="text-sm text-slate-500">Quản lý và điều phối đơn hàng tự động thông minh</p>
                </div>
                <div className="flex items-center gap-3">
                    {stats?.overdue > 0 && (
                        <div className="px-3 py-1.5 bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-sm font-bold flex items-center gap-2 animate-pulse cursor-default" title={`${stats.overdue} phiếu đã gán cho tài xế quá 30 phút nhưng chưa nhận/từ chối.`}>
                            <AlertTriangle size={14} />
                            {stats.overdue} chưa phản hồi
                        </div>
                    )}
                    <button
                        onClick={() => { onRefreshTickets(); api.getDashboardStats().then(setStats); }}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2"
                    >
                        <RefreshCw size={14} /> Làm mới
                    </button>
                </div>
            </div>




            {/* Removing old KPI Row as requested */}

            {/* BOARD TAB */}
            {activeSubPage === 'board' && (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    {/* Column 1: Pending Queue */}
                    <div className="xl:col-span-4">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Clock size={18} className="text-amber-500" />
                                    <h3 className="font-bold text-slate-800">Hàng chờ</h3>
                                </div>
                                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                                    {processedPending.length} phiếu
                                </span>
                            </div>

                            {/* SEARCH AND SORT BAR */}
                            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 space-y-2">
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                                    <input 
                                        type="text" 
                                        placeholder="Tìm mã, tuyến, KH..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:border-blue-500 outline-none"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <select 
                                        value={sortOrder}
                                        onChange={e => setSortOrder(e.target.value as any)}
                                        className="w-full px-2 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white outline-none cursor-pointer"
                                    >
                                        <option value="URGENT">Sắp xếp: Ưu tiên cao nhất</option>
                                        <option value="NEWEST">Sắp xếp: Mới nhất</option>
                                        <option value="OLDEST">Sắp xếp: Cũ nhất</option>
                                    </select>
                                </div>
                            </div>

                            <div className="max-h-[400px] xl:max-h-[600px] overflow-y-auto divide-y divide-slate-100">
                                {processedPending.length === 0 && (
                                    <div className="p-8 text-center text-slate-400 text-sm">
                                        <CheckCircle size={32} className="mx-auto mb-2 text-emerald-300" />
                                        Không có đơn chờ điều xe phù hợp
                                    </div>
                                )}
                                {processedPending.map(ticket => {
                                    const isSelected = selectedTicket?.id === ticket.id;
                                    return (
                                        <div
                                            key={ticket.id}
                                            onClick={() => handleSuggest(ticket)}
                                            className={`px-5 py-4 cursor-pointer transition-all hover:bg-blue-50/50 ${isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}
                                        >
                                            <div className="flex items-start justify-between mb-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-mono font-bold text-slate-400">#{ticket.id.slice(-8)}</span>
                                                    {getPriorityBadge(ticket.priorityLevel as PriorityLevel, ticket.priorityScore)}
                                                </div>
                                            </div>
                                            <div className="font-semibold text-slate-700 text-sm truncate">
                                                {ticket.route || '?'}
                                            </div>
                                            <div className="flex items-center gap-2 mt-2 text-xs text-slate-400 flex-wrap">
                                                {ticket.size && <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-bold">{ticket.size}'</span>}
                                                {ticket.fe && <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-bold">{ticket.fe}</span>}
                                                {ticket.customerCode && <span>{ticket.customerCode}</span>}

                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Column 2: AI Suggestions */}
                    <div className="xl:col-span-4">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-100">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Zap size={18} className="text-indigo-500" />
                                        <h3 className="font-bold text-slate-800">Đề xuất</h3>
                                        {candidates.length > 0 && <span className="text-xs text-slate-400">{candidates.length} ứng viên</span>}
                                    </div>
                                    {selectedTicket && (
                                        <button
                                            onClick={() => handleSuggest(selectedTicket)}
                                            className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                                        >
                                            <RefreshCw size={12} /> Chạy lại
                                        </button>
                                    )}
                                </div>
                                {/* Priority info bar */}
                                {ticketPriority && selectedTicket && (
                                    <div className="mt-3 flex items-center gap-3 bg-slate-50 rounded-lg px-3 py-2">
                                        {getPriorityBadge(ticketPriority.level as PriorityLevel, ticketPriority.score)}
                                        <div className="flex gap-3 text-[10px] text-slate-500">
                                            <span>⏰ Pickup: {ticketPriority.breakdown.pickupUrgency}</span>
                                            <span>⏳ Chờ: {ticketPriority.breakdown.waitingPressure}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {!selectedTicket && (
                                <div className="p-8 text-center text-slate-400 text-sm">
                                    <Zap size={32} className="mx-auto mb-2 text-slate-300" />
                                    Chọn một đơn để xem đề xuất
                                </div>
                            )}

                            {loading && (
                                <div className="p-8 text-center">
                                    <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
                                    <p className="text-sm text-slate-500">Đang tính toán...</p>
                                </div>
                            )}

                            {!loading && candidates.length > 0 && (
                                <div className="divide-y divide-slate-100">
                                    {candidates.map((c, idx) => (
                                        <div
                                            key={c.driverId}
                                            onClick={() => setSelectedCandidate(c)}
                                            className={`px-5 py-4 cursor-pointer transition-all hover:bg-indigo-50/50 ${selectedCandidate?.driverId === c.driverId ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : ''}`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-500' : idx === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400' : idx === 2 ? 'bg-gradient-to-br from-orange-300 to-orange-400' : 'bg-gradient-to-br from-slate-200 to-slate-300'}`}>
                                                        {idx + 1}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-800 text-sm">{c.driverName}</div>
                                                        <div className="text-xs text-slate-400 font-mono">{c.licensePlate}</div>
                                                        {(c as any).isSlowResponse && (c as any).phone && (
                                                            <div className="text-[10px] text-red-500 font-bold tracking-wider mt-0.5 animate-pulse">
                                                                📞 {(c as any).phone}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-2xl font-extrabold text-slate-800">{c.score}<span className="text-sm text-slate-400 font-normal">/100</span></div>
                                                    {c.continuityType === 'EXACT' && (
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">
                                                            <Link2 size={10} /> NỐI CHUYẾN
                                                        </span>
                                                    )}
                                                    {c.continuityType === 'NEAR' && (
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-100 text-cyan-700">
                                                            <Link2 size={10} /> GẦN
                                                        </span>
                                                    )}
                                                    {!c.continuityType || c.continuityType === 'WEAK' ? (
                                                        c.routeExperience > 0 ? (
                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600">
                                                                <Award size={10} /> {c.routeExperience} chuyến
                                                            </span>
                                                        ) : null
                                                    ) : null}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-slate-500">
                                                <span className={c.expectedAvailableTime === 'Sẵn sàng' ? 'text-emerald-600 font-medium' : 'text-amber-600'}>{c.expectedAvailableTime}</span>
                                                <span>•</span>
                                                <span>{c.routeExperience} chuyến tuyến</span>
                                                {c.expectedNextLocation && c.expectedNextLocation !== 'DANALOG' && (
                                                    <>
                                                        <span>•</span>
                                                        <span>→ {c.expectedNextLocation}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Action Buttons */}
                            {selectedTicket && candidates.length > 0 && (
                                <div className="px-5 py-4 border-t border-slate-100 space-y-2">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                const target = selectedCandidate || candidates[0];
                                                if (target) handleAssign(target.driverId, 'ai_suggested');
                                            }}
                                            disabled={assigning || candidates.length === 0}
                                            className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-sm font-bold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle size={16} />
                                            {assigning ? 'Đang phân công...' : `Chọn ${(selectedCandidate || candidates[0])?.driverName || ''}`}
                                        </button>
                                        <button
                                            onClick={() => openOverrideModal(undefined, undefined)}
                                            disabled={assigning}
                                            className="flex-1 py-2.5 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg text-sm font-bold hover:bg-orange-100 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                                        >
                                            <Shield size={16} /> Chọn người khác
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Column 3: Score Analysis */}
                    <div className="xl:col-span-4">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden sticky top-6">
                            <div className="px-5 py-4 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <BarChart3 size={18} className="text-emerald-500" />
                                    <h3 className="font-bold text-slate-800">Phân tích chi tiết</h3>
                                </div>
                            </div>

                            {!selectedCandidate && (
                                <div className="p-8 text-center text-slate-400 text-sm">
                                    <BarChart3 size={32} className="mx-auto mb-2 text-slate-300" />
                                    Chọn lái xe để xem phân tích
                                </div>
                            )}

                            {selectedCandidate && (
                                <div className="p-5 space-y-5">
                                    <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                                            {selectedCandidate.driverName.charAt(selectedCandidate.driverName.lastIndexOf(' ') + 1) || '?'}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-800">{selectedCandidate.driverName}</div>
                                            <div className="text-xs text-slate-400 font-mono">{selectedCandidate.licensePlate}</div>
                                        </div>
                                        <div className="ml-auto text-3xl font-extrabold text-indigo-600">
                                            {selectedCandidate.score}
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <ScoreBar label="Tính liên tục" value={selectedCandidate.breakdown.continuity} />
                                        <ScoreBar label="Khả dụng" value={selectedCandidate.breakdown.availability} />
                                        <ScoreBar label="Kinh nghiệm tuyến" value={selectedCandidate.breakdown.routeExperience} />
                                        <ScoreBar label="Hiệu suất" value={selectedCandidate.breakdown.performance} />
                                        <ScoreBar label="Cân bằng tải" value={selectedCandidate.breakdown.loadBalance} />
                                    </div>

                                    <div className="bg-slate-50 rounded-lg p-3 space-y-2 text-xs">
                                        <div className="flex justify-between text-slate-500">
                                            <span>Chuyến gần đây (7 ngày)</span>
                                            <span className="font-bold text-slate-700">{selectedCandidate.recentTrips}</span>
                                        </div>
                                        <div className="flex justify-between text-slate-500">
                                            <span>Kinh nghiệm tuyến</span>
                                            <span className="font-bold text-slate-700">{selectedCandidate.routeExperience} chuyến</span>
                                        </div>
                                        <div className="flex justify-between text-slate-500">
                                            <span>Trạng thái</span>
                                            <span className={`font-bold ${selectedCandidate.expectedAvailableTime === 'Sẵn sàng' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                {selectedCandidate.expectedAvailableTime}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Other candidates comparison */}
                                    {candidates.length > 1 && (
                                        <div className="bg-slate-50 rounded-lg p-3 text-xs space-y-1.5">
                                            <div className="font-bold text-slate-600 mb-1 flex items-center gap-1"><ArrowUpDown size={12} /> So sánh ứng viên khác:</div>
                                            {candidates.filter(c => c.driverId !== selectedCandidate.driverId).map(c => (
                                                <div key={c.driverId} className="flex items-center justify-between text-slate-600 bg-white rounded px-2 py-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">{c.driverName}</span>
                                                        <span className="text-slate-400 font-mono">{c.licensePlate}</span>
                                                    </div>
                                                    <span className="font-bold">{c.score}/100</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Rejected candidates (Eligibility Filter) */}
                                    {rejectedCandidates.length > 0 && (
                                        <div className="bg-red-50/70 rounded-lg p-3 text-xs space-y-1.5">
                                            <div className="font-bold text-red-700 mb-1 flex items-center gap-1"><XCircle size={12} /> Ứng viên bị loại ({rejectedCandidates.length}):</div>
                                            {rejectedCandidates.map(rc => (
                                                <div key={rc.driverId} className="flex items-center justify-between text-red-600 bg-white/60 rounded px-2 py-1">
                                                    <div className="flex items-center gap-2">
                                                        <XCircle size={11} className="flex-shrink-0" />
                                                        <span className="font-medium">{rc.driverName}</span>
                                                        <span className="text-red-400 font-mono">{rc.licensePlate}</span>
                                                    </div>
                                                    <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                                        {EL_LABELS[rc.rejectReasonCode] || rc.rejectReasonCode}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>


                    </div>
                </div>
            )}

            {/* RESPONSES TAB */}
            {activeSubPage === 'responses' && (() => {
                // Compute filtered responses
                let filteredResponses = [...responses];
                if (responseStatusFilter) {
                    filteredResponses = filteredResponses.filter(r => r.response === responseStatusFilter);
                }
                if (responseDriverFilter) {
                    filteredResponses = filteredResponses.filter(r => r.driverName === responseDriverFilter);
                }
                if (responseSearchQuery) {
                    const q = responseSearchQuery.toLowerCase();
                    filteredResponses = filteredResponses.filter(r =>
                        (r.ticketId || '').toLowerCase().includes(q) ||
                        (r.driverName || '').toLowerCase().includes(q) ||
                        (r.licensePlate || '').toLowerCase().includes(q)
                    );
                }
                // Unique driver list
                const uniqueDrivers = Array.from(new Set(responses.map(r => r.driverName).filter(Boolean)));

                return (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100">
                        <h3 className="font-bold text-slate-800">Theo dõi phản hồi lái xe</h3>
                    </div>
                    {/* Response KPIs - Clickable */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-4 lg:p-5">
                        <div
                            onClick={() => setResponseStatusFilter(responseStatusFilter === null ? null : null)}
                            className={`rounded-lg p-3 text-center cursor-pointer transition-all border-2 ${
                                responseStatusFilter === null ? 'bg-blue-100 border-blue-400 shadow-md' : 'bg-blue-50 border-transparent hover:border-blue-200'
                            }`}
                        >
                            <div className="text-2xl font-extrabold text-blue-700">{responses.length}</div>
                            <div className="text-xs text-blue-500 font-medium">Tổng gửi</div>
                        </div>
                        <div
                            onClick={() => setResponseStatusFilter(responseStatusFilter === 'PENDING' ? null : 'PENDING')}
                            className={`rounded-lg p-3 text-center cursor-pointer transition-all border-2 ${
                                responseStatusFilter === 'PENDING' ? 'bg-amber-100 border-amber-400 shadow-md' : 'bg-amber-50 border-transparent hover:border-amber-200'
                            }`}
                        >
                            <div className="text-2xl font-extrabold text-amber-700">{responses.filter(r => r.response === 'PENDING').length}</div>
                            <div className="text-xs text-amber-500 font-medium">Chờ phản hồi</div>
                        </div>
                        <div
                            onClick={() => setResponseStatusFilter(responseStatusFilter === 'ACCEPTED' ? null : 'ACCEPTED')}
                            className={`rounded-lg p-3 text-center cursor-pointer transition-all border-2 ${
                                responseStatusFilter === 'ACCEPTED' ? 'bg-emerald-100 border-emerald-400 shadow-md' : 'bg-emerald-50 border-transparent hover:border-emerald-200'
                            }`}
                        >
                            <div className="text-2xl font-extrabold text-emerald-700">{responses.filter(r => r.response === 'ACCEPTED').length}</div>
                            <div className="text-xs text-emerald-500 font-medium">Đã nhận</div>
                        </div>
                        <div
                            onClick={() => setResponseStatusFilter(responseStatusFilter === 'REJECTED' ? null : 'REJECTED')}
                            className={`rounded-lg p-3 text-center cursor-pointer transition-all border-2 ${
                                responseStatusFilter === 'REJECTED' ? 'bg-red-100 border-red-400 shadow-md' : 'bg-red-50 border-transparent hover:border-red-200'
                            }`}
                        >
                            <div className="text-2xl font-extrabold text-red-700">{responses.filter(r => r.response === 'REJECTED').length}</div>
                            <div className="text-xs text-red-500 font-medium">Từ chối</div>
                        </div>
                        {/* Removed Không phản hồi as requested */}
                    </div>

                    {/* Filter Bar */}
                    <div className="px-5 pb-4 flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Tìm mã phiếu, tên lái xe, biển số..."
                                value={responseSearchQuery}
                                onChange={e => setResponseSearchQuery(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:border-blue-500 outline-none transition-colors"
                            />
                        </div>
                        <select
                            value={responseDriverFilter}
                            onChange={e => setResponseDriverFilter(e.target.value)}
                            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white outline-none cursor-pointer min-w-[180px]"
                        >
                            <option value="">Tất cả lái xe</option>
                            {uniqueDrivers.map(name => (
                                <option key={name} value={name}>{name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Response Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-y border-slate-200">
                                <tr>
                                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase">Mã phiếu</th>
                                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase">Lái xe</th>
                                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase">Trạng thái</th>
                                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase">Phản hồi / Lý do</th>
                                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase">Thời gian</th>
                                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredResponses.length === 0 && (
                                    <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">{responses.length === 0 ? 'Chưa có dữ liệu phản hồi' : 'Không tìm thấy kết quả phù hợp'}</td></tr>
                                )}
                                {filteredResponses.map(r => (
                                    <tr key={r.id} className="hover:bg-slate-50/50">
                                        <td className="px-5 py-3 font-mono text-xs font-bold text-blue-600">#{r.ticketId?.slice(-8)}</td>
                                        <td className="px-5 py-3">
                                            <div className="font-medium text-slate-700">{r.driverName}</div>
                                            <div className="text-xs text-slate-400">{r.licensePlate}</div>
                                        </td>
                                        <td className="px-5 py-3">
                                            {r.response === 'ACCEPTED' && <span className="px-2 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">ĐÃ NHẬN</span>}
                                            {r.response === 'REJECTED' && <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">TỪ CHỐI</span>}
                                            {r.response === 'PENDING' && <span className="px-2 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">ĐANG CHỜ</span>}
                                            {r.response === 'NO_RESPONSE' && <span className="px-2 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-700">KHÔNG PHẢN HỒI</span>}
                                        </td>
                                        <td className="px-5 py-3 text-sm text-slate-600">{r.rejectReasonCode || r.reason || '-'}</td>
                                        <td className="px-5 py-3 text-xs text-slate-400">
                                            {r.sentAt ? new Date(r.sentAt).toLocaleString('vi-VN') : '-'}
                                            {r.respondedAt && r.sentAt && (
                                                <div className="text-[10px] text-slate-300 mt-0.5">
                                                    {Math.round((new Date(r.respondedAt).getTime() - new Date(r.sentAt).getTime()) / 60000)}p phản hồi
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            {r.response === 'PENDING' && (() => {
                                                const minutesWaiting = r.sentAt ? Math.floor((new Date().getTime() - new Date(r.sentAt).getTime()) / 60000) : 999;
                                                const isSlow = minutesWaiting > 30;
                                                const t = tickets.find(tic => tic.id === r.ticketId);
                                                if (!t) return null;
                                                return (
                                                    <button 
                                                        onClick={async () => {
                                                            if (!confirm(`Bạn có chắc muốn gán lại phiếu #${r.ticketId?.slice(-8)}?\nLái xe hiện tại: ${r.driverName}\nLý do: ${isSlow ? 'Không phản hồi (>' + minutesWaiting + ' phút)' : 'DV điều lại xe'}`)) return;
                                                            try {
                                                                await api.dispatchReassign(r.ticketId, currentUser?.username);
                                                                onRefreshTickets();
                                                                const newResponses = await api.getDriverResponses();
                                                                setResponses(newResponses);
                                                                const newLogs = await api.getDispatchLogs();
                                                                setLogs(newLogs);
                                                                navigate(`${prefix}/board`);
                                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                                            } catch (err: any) {
                                                                alert('Gán lại thất bại: ' + (err?.message || 'Unknown error'));
                                                            }
                                                        }}
                                                        className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-colors ${
                                                            isSlow 
                                                                ? 'bg-red-50 hover:bg-red-500 text-red-600 hover:text-white border border-red-200' 
                                                                : 'bg-blue-50 hover:bg-blue-500 text-blue-600 hover:text-white border border-transparent'
                                                        }`}
                                                    >
                                                        {isSlow ? `Gán lại (${minutesWaiting}p)` : 'Gán lại'}
                                                    </button>
                                                );
                                            })()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                );
            })()}

            {/* LOGS TAB */}
            {activeSubPage === 'logs' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100">
                        <h3 className="font-bold text-slate-800">Lịch sử phân công</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-y border-slate-200">
                                <tr>
                                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase">Thời gian</th>
                                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase">Mã phiếu</th>
                                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase">Tuyến</th>
                                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase">Lái xe</th>
                                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase">Loại</th>

                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {logs.length === 0 && (
                                    <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400">Chưa có lịch sử phân công</td></tr>
                                )}
                                {logs.map(log => (
                                    <tr key={log.id} className="hover:bg-slate-50/50">
                                        <td className="px-5 py-3 text-xs text-slate-400">{new Date(log.timestamp).toLocaleString('vi-VN')}</td>
                                        <td className="px-5 py-3 font-mono text-xs font-bold text-blue-600">#{log.ticketId?.slice(-8)}</td>
                                        <td className="px-5 py-3 text-sm text-slate-700 max-w-xs truncate">{log.ticketRoute}</td>
                                        <td className="px-5 py-3 font-medium text-slate-700">{log.assignedDriverName}</td>
                                        <td className="px-5 py-3">
                                            {log.assignType === 'auto' ? (
                                                <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">TỰ ĐỘNG</span>
                                            ) : log.assignType === 'override' ? (
                                                <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700">GHI ĐÈ</span>
                                            ) : log.assignType === 'ai_suggested' ? (
                                                <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">ĐỀ XUẤT</span>
                                            ) : (
                                                <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">THỦ CÔNG</span>
                                            )}
                                        </td>

                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TRACKING TAB */}
            {activeSubPage === 'tracking' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                            <div>
                                <h3 className="font-bold text-slate-800">Tất cả phiếu công tác</h3>
                                <span className="text-sm font-medium text-slate-500">Hiển thị {processedTracking.length}/{tickets.length} phiếu</span>
                            </div>
                            <div className="relative w-full sm:w-72 shrink-0">
                                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                                <input 
                                    type="text" 
                                    placeholder="Tìm mã phiếu, lái xe, KH..."
                                    value={trackingSearchQuery}
                                    onChange={e => setTrackingSearchQuery(e.target.value)}
                                    className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:border-blue-500 outline-none transition-colors"
                                />
                            </div>
                        </div>
                        {/* Filter Dropdowns Row */}
                        <div className="flex flex-wrap gap-2">
                            <select value={trackingDispatcherFilter} onChange={e => setTrackingDispatcherFilter(e.target.value)}
                                className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white outline-none cursor-pointer">
                                <option value="">Người điều vận: Tất cả</option>
                                <option value="__auto__">⚡ Hệ thống Auto</option>
                                {uniqueTrackingDispatchers.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                            <select value={trackingDriverFilter} onChange={e => setTrackingDriverFilter(e.target.value)}
                                className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white outline-none cursor-pointer">
                                <option value="">Lái xe: Tất cả</option>
                                {uniqueTrackingDrivers.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                            <select value={trackingStatusFilter} onChange={e => setTrackingStatusFilter(e.target.value)}
                                className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white outline-none cursor-pointer">
                                <option value="">Trạng thái: Tất cả</option>
                                {uniqueTrackingStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <select value={trackingCustomerFilter} onChange={e => setTrackingCustomerFilter(e.target.value)}
                                className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white outline-none cursor-pointer">
                                <option value="">Khách hàng: Tất cả</option>
                                {uniqueTrackingCustomers.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <select value={trackingRouteFilter} onChange={e => setTrackingRouteFilter(e.target.value)}
                                className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white outline-none cursor-pointer">
                                <option value="">Tuyến: Tất cả</option>
                                {uniqueTrackingRoutes.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                            {(trackingDispatcherFilter || trackingDriverFilter || trackingStatusFilter || trackingCustomerFilter || trackingRouteFilter) && (
                                <button
                                    onClick={() => {
                                        setTrackingDispatcherFilter('');
                                        setTrackingDriverFilter('');
                                        setTrackingStatusFilter('');
                                        setTrackingCustomerFilter('');
                                        setTrackingRouteFilter('');
                                    }}
                                    className="px-3 py-1.5 text-xs font-bold text-red-500 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                                >
                                    ✕ Xóa bộ lọc
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="overflow-x-auto max-h-[700px]">
                        <table className="w-full text-sm text-left whitespace-nowrap">
                            <thead className="bg-slate-50 border-y border-slate-200 sticky top-0 z-10">
                                <tr>
                                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase">Mã phiếu</th>
                                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase">Người điều vận</th>
                                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase">Ngày đi</th>
                                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase">Trạng thái điều xe</th>
                                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase">Trạng thái phiếu</th>
                                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase">Lái xe nhận (Chờ báo)</th>
                                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase">Tuyến</th>
                                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase">Khách hàng</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {processedTracking.length === 0 && (
                                    <tr><td colSpan={8} className="px-5 py-8 text-center text-slate-400">Không có dữ liệu phiếu</td></tr>
                                )}
                                {processedTracking.map(t => (
                                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-5 py-3 font-mono text-xs font-bold text-blue-600">#{t.id}</td>
                                        <td className="px-5 py-3">
                                            {(() => {
                                                const log = logs.find(l => l.ticketId === t.id);
                                                // @ts-ignore
                                                const userStr = t.dispatchedBy || log?.dispatcherUsername;
                                                // @ts-ignore
                                                const isAuto = t.assignType === 'auto' || log?.assignType === 'auto';
                                                
                                                if (t.dispatchStatus === 'ASSIGNED' || t.dispatchStatus === 'RECOMMENDED' || t.dispatchStatus === 'DRIVER_PENDING' || t.dispatchStatus === 'DRIVER_ACCEPTED') {
                                                    return (
                                                        <div className="flex items-center gap-1.5 uppercase tracking-wide">
                                                            {isAuto ? <Zap size={14} className="text-amber-500"/> : <Users size={14} className="text-indigo-500"/>}
                                                            <span className={`text-xs font-bold ${isAuto ? 'text-amber-600' : 'text-indigo-600'}`}>{isAuto ? 'Hệ thống Auto' : (userStr || 'N/A')}</span>
                                                        </div>
                                                    );
                                                }
                                                return <span className="text-slate-400 italic text-xs">-</span>;
                                            })()}
                                        </td>
                                        <td className="px-5 py-3 text-slate-600 font-medium">
                                            {t.dateStart ? new Date(t.dateStart).toLocaleDateString('vi-VN') : '-'}
                                        </td>
                                        <td className="px-5 py-3">
                                            {t.dispatchStatus === 'DRIVER_PENDING' && <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">CHỜ PHẢN HỒI</span>}
                                            {t.dispatchStatus === 'RECOMMENDED' && <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">CÓ ĐỀ XUẤT</span>}
                                            {(t.dispatchStatus === 'ASSIGNED' || t.dispatchStatus === 'DRIVER_ASSIGNED' || t.dispatchStatus === 'DRIVER_ACCEPTED') && <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">ĐÃ NHẬN</span>}
                                            {t.dispatchStatus === 'DRIVER_REJECTED' && <span className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-100">TỪ CHỐI</span>}
                                            {t.dispatchStatus === 'NO_CANDIDATE' && <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-100">KHÔNG CÓ ỨNG VIÊN</span>}

                                            {t.dispatchStatus === 'WAITING_DISPATCH' && <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">CHỜ ĐIỀU XE</span>}
                                            {!t.dispatchStatus && <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">CHƯA GIAO</span>}
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className="text-xs font-bold text-slate-700 tracking-wider uppercase border border-slate-200 px-2 py-0.5 rounded shadow-sm">{t.status || 'N/A'}</span>
                                        </td>
                                        <td className="px-5 py-3 text-slate-700 font-medium">
                                            {t.assignedDriverName || (t as any).assignedDriver || t.driverName || <span className="text-slate-400 italic text-xs">Chưa phân tài</span>}
                                        </td>
                                        <td className="px-5 py-3 text-slate-600">{t.route || 'Chưa định tuyến'}</td>
                                        <td className="px-5 py-3 text-slate-600">{t.customerCode || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}



            {/* OVERRIDE MODAL */}
            {showOverrideModal && selectedTicket && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-orange-50 to-amber-50">
                            <div className="flex items-center gap-2">
                                <Shield size={20} className="text-orange-600" />
                                <h3 className="font-bold text-slate-800">Override — Ghi đè phân công</h3>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Ticket: #{selectedTicket.id.slice(-8)} • {selectedTicket.route || 'N/A'}</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-sm font-bold text-slate-700 block mb-1.5">Lái xe</label>
                                <select
                                    value={overrideDriverId}
                                    onChange={e => {
                                        setOverrideDriverId(e.target.value);
                                    }}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-orange-500 text-sm"
                                >
                                    <option value="">— Chọn lái xe —</option>
                                    {allDrivers.map(d => (
                                        <option key={d.username} value={d.username}>{d.name || d.username} ({d.licensePlate || 'N/A'})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-bold text-slate-700 block mb-1.5">Lý do Override <span className="text-red-500">*</span></label>
                                <select
                                    value={overrideReasonCode}
                                    onChange={e => setOverrideReasonCode(e.target.value as OverrideReasonCode)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-orange-500 text-sm"
                                >
                                    {Object.entries(OVERRIDE_REASON_LABELS).map(([code, label]) => (
                                        <option key={code} value={code}>{label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-bold text-slate-700 block mb-1.5">Ghi chú (tùy chọn)</label>
                                <textarea
                                    value={overrideNote}
                                    onChange={e => setOverrideNote(e.target.value)}
                                    placeholder="Thêm ghi chú nếu cần..."
                                    rows={2}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-orange-500 text-sm resize-none"
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                            <button
                                onClick={() => setShowOverrideModal(false)}
                                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleOverrideSubmit}
                                disabled={!overrideDriverId || overrideSubmitting}
                                className="px-5 py-2 text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 rounded-lg hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 transition-all flex items-center gap-2"
                            >
                                <Shield size={14} />
                                {overrideSubmitting ? 'Đang xử lý...' : 'Xác nhận Override'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
