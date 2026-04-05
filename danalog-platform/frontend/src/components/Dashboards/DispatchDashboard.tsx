import React, { useEffect, useState } from 'react';
import {
    Zap, GitBranch, Shield, CheckCircle, AlertTriangle,
    Clock, TrendingUp, Users, Timer, Award, BarChart3, RefreshCw, Activity
} from 'lucide-react';
import { api } from '../../services/api';

interface DispatchDashboardProps {
    tickets: any[];
}

// Donut chart component (CSS only)
function DonutChart({ segments, size = 120, label }: { segments: { value: number; color: string; label: string }[]; size?: number; label?: string }) {
    const total = segments.reduce((s, seg) => s + seg.value, 0);
    if (total === 0) return (
        <div style={{ width: size, height: size }} className="rounded-full border-8 border-slate-100 flex items-center justify-center">
            <span className="text-slate-400 text-xs">N/A</span>
        </div>
    );

    let cumulativePct = 0;
    const gradientParts = segments.map(seg => {
        const pct = (seg.value / total) * 100;
        const start = cumulativePct;
        cumulativePct += pct;
        return `${seg.color} ${start}% ${cumulativePct}%`;
    });

    return (
        <div className="flex flex-col items-center gap-2">
            <div
                style={{
                    width: size, height: size,
                    background: `conic-gradient(${gradientParts.join(', ')})`,
                }}
                className="rounded-full flex items-center justify-center"
            >
                <div className="bg-white rounded-full flex items-center justify-center" style={{ width: size * 0.65, height: size * 0.65 }}>
                    <span className="text-lg font-extrabold text-slate-700">{total}</span>
                </div>
            </div>
            {label && <span className="text-xs font-bold text-slate-600">{label}</span>}
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[10px]">
                {segments.filter(s => s.value > 0).map(seg => (
                    <div key={seg.label} className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: seg.color }} />
                        <span className="text-slate-500">{seg.label}</span>
                        <span className="font-bold text-slate-700">{seg.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Horizontal bar component
function HBar({ label, value, max = 100, color = '#6366f1', suffix = '%' }: { label: string; value: number; max?: number; color?: string; suffix?: string }) {
    const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
    return (
        <div className="flex items-center gap-3 text-sm">
            <span className="w-32 text-slate-500 font-medium truncate text-xs">{label}</span>
            <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                />
            </div>
            <span className="w-14 text-right font-bold text-slate-700 text-xs">{value}{suffix}</span>
        </div>
    );
}

// Metric card component
function MetricCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string | number; sub?: string; color: string }) {
    const colorMap: Record<string, { bg: string; icon: string; text: string }> = {
        emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', text: 'text-emerald-700' },
        blue: { bg: 'bg-blue-50', icon: 'text-blue-600', text: 'text-blue-700' },
        indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', text: 'text-indigo-700' },
        amber: { bg: 'bg-amber-50', icon: 'text-amber-600', text: 'text-amber-700' },
        red: { bg: 'bg-red-50', icon: 'text-red-600', text: 'text-red-700' },
        purple: { bg: 'bg-purple-50', icon: 'text-purple-600', text: 'text-purple-700' },
        slate: { bg: 'bg-slate-50', icon: 'text-slate-500', text: 'text-slate-700' },
    };
    const c = colorMap[color] || colorMap.slate;
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</div>
                    <div className={`text-2xl font-extrabold ${c.text}`}>{value}</div>
                    {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
                </div>
                <div className={`p-3 ${c.bg} rounded-lg`}>
                    <Icon size={22} className={c.icon} />
                </div>
            </div>
        </div>
    );
}

export const DispatchDashboard: React.FC<DispatchDashboardProps> = ({ tickets }) => {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const loadStats = async () => {
        setLoading(true);
        try {
            const data = await api.getDashboardStats();
            setStats(data);
        } catch (err) {
            console.error('Failed to load stats:', err);
        }
        setLoading(false);
    };

    useEffect(() => { loadStats(); }, []);

    // Derived ticket stats
    const escalatedCount = tickets.filter(t => t.dispatchStatus === 'ESCALATED').length;
    const pendingCount = tickets.filter(t => !t.assignedDriverId && ['APPROVED', 'PENDING', 'CHỜ ĐIỀU XE', 'MỚI TẠO'].includes(t.status || '')).length;
    const activeCount = tickets.filter(t => ['ĐANG VẬN CHUYỂN', 'ĐÃ ĐIỀU XE'].includes(t.status || '')).length;

    if (loading && !stats) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
        );
    }

    const ab = stats?.assignBreakdown || { auto: 0, ai_suggested: 0, override: 0, manual: 0, total: 0 };
    const rb = stats?.responseBreakdown || { accepted: 0, rejected: 0, noResponse: 0, pending: 0, total: 0 };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Dispatch KPI Dashboard</h2>
                    <p className="text-sm text-slate-500">Hiệu suất và phân tích Dispatch Engine v2.0</p>
                </div>
                <button
                    onClick={loadStats}
                    disabled={loading}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Làm mới
                </button>
            </div>

            {/* Row 1: Core Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <MetricCard icon={CheckCircle} label="SLA Compliance" value={`${stats?.slaComplianceRate || 100}%`} color="emerald" />
                <MetricCard icon={Zap} label="AI Suggest Rate" value={`${stats?.aiSuggestedRate || 0}%`} sub={`${ab.ai_suggested}/${ab.total} lệnh`} color="indigo" />
                <MetricCard icon={TrendingUp} label="Auto Assign" value={`${stats?.autoAssignRate || 0}%`} sub={`${ab.auto} lệnh auto`} color="blue" />
                <MetricCard icon={Shield} label="Override Rate" value={`${stats?.overrideRate || 0}%`} sub={`${ab.override} override`} color="amber" />
                <MetricCard icon={GitBranch} label="Continuity" value={`${stats?.continuityUsageRate || 0}%`} sub="Nối chuyến EXACT" color="purple" />
                <MetricCard icon={AlertTriangle} label="Escalation" value={escalatedCount} sub={`${stats?.escalationRate || 0}% tổng`} color="red" />
            </div>

            {/* Row 2: Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Assignment Breakdown Donut */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                        <BarChart3 size={16} className="text-indigo-500" />
                        Phân bổ phân công
                    </h3>
                    <div className="flex justify-center py-2">
                        <DonutChart
                            segments={[
                                { value: ab.ai_suggested, color: '#6366f1', label: 'AI Suggest' },
                                { value: ab.auto, color: '#3b82f6', label: 'Auto' },
                                { value: ab.manual, color: '#64748b', label: 'Manual' },
                                { value: ab.override, color: '#f59e0b', label: 'Override' },
                            ]}
                            size={130}
                            label="Tổng phân công"
                        />
                    </div>
                </div>

                {/* Response Breakdown Donut */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                        <Activity size={16} className="text-emerald-500" />
                        Phản hồi lái xe
                    </h3>
                    <div className="flex justify-center py-2">
                        <DonutChart
                            segments={[
                                { value: rb.accepted, color: '#10b981', label: 'Đã nhận' },
                                { value: rb.rejected, color: '#ef4444', label: 'Từ chối' },
                                { value: rb.noResponse, color: '#94a3b8', label: 'No Response' },
                                { value: rb.pending, color: '#f59e0b', label: 'Đang chờ' },
                            ]}
                            size={130}
                            label="Tổng phản hồi"
                        />
                    </div>
                </div>

                {/* Driver Status */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                        <Users size={16} className="text-blue-500" />
                        Trạng thái tài xế & hàng chờ
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-sm font-medium text-emerald-700">Sẵn sàng</span>
                            </div>
                            <span className="text-xl font-extrabold text-emerald-700">{stats?.driversAvailable || 0}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                                <span className="text-sm font-medium text-blue-700">Đang vận chuyển</span>
                            </div>
                            <span className="text-xl font-extrabold text-blue-700">{activeCount}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                                <span className="text-sm font-medium text-amber-700">Chờ điều xe</span>
                            </div>
                            <span className="text-xl font-extrabold text-amber-700">{pendingCount}</span>
                        </div>
                        {escalatedCount > 0 && (
                            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg animate-pulse">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                                    <span className="text-sm font-medium text-red-700">Escalated</span>
                                </div>
                                <span className="text-xl font-extrabold text-red-700">{escalatedCount}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Row 3: Performance Bars */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* KPI Rates */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h3 className="font-bold text-slate-800 text-sm mb-5 flex items-center gap-2">
                        <Award size={16} className="text-purple-500" />
                        Chỉ số hiệu suất Dispatch
                    </h3>
                    <div className="space-y-3">
                        <HBar label="SLA Compliance" value={stats?.slaComplianceRate || 100} color="#10b981" />
                        <HBar label="AI Suggest Rate" value={stats?.aiSuggestedRate || 0} color="#6366f1" />
                        <HBar label="Auto Assign Rate" value={stats?.autoAssignRate || 0} color="#3b82f6" />
                        <HBar label="Nối chuyến (EXACT)" value={stats?.continuityUsageRate || 0} color="#8b5cf6" />
                        <HBar label="Override Rate" value={stats?.overrideRate || 0} color="#f59e0b" />
                        <HBar label="Tỷ lệ từ chối" value={stats?.rejectionRate || 0} color="#ef4444" />
                        <HBar label="Escalation Rate" value={stats?.escalationRate || 0} color="#f43f5e" />
                    </div>
                </div>

                {/* Response Performance */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h3 className="font-bold text-slate-800 text-sm mb-5 flex items-center gap-2">
                        <Timer size={16} className="text-amber-500" />
                        Hiệu suất phản hồi
                    </h3>
                    <div className="space-y-4">
                        {/* Avg response time */}
                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 flex items-center justify-between">
                            <div>
                                <div className="text-xs font-semibold text-indigo-400 uppercase">Thời gian phản hồi TB</div>
                                <div className="text-3xl font-extrabold text-indigo-700 mt-1">
                                    {stats?.avgResponseTime || 0}<span className="text-sm font-normal text-indigo-400"> phút</span>
                                </div>
                            </div>
                            <Clock size={32} className="text-indigo-200" />
                        </div>

                        {/* Response counts */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-emerald-50 rounded-lg p-3 text-center">
                                <div className="text-2xl font-extrabold text-emerald-700">{rb.accepted}</div>
                                <div className="text-[10px] font-bold text-emerald-500 uppercase">Đã nhận</div>
                            </div>
                            <div className="bg-red-50 rounded-lg p-3 text-center">
                                <div className="text-2xl font-extrabold text-red-700">{rb.rejected}</div>
                                <div className="text-[10px] font-bold text-red-500 uppercase">Từ chối</div>
                            </div>
                            <div className="bg-slate-100 rounded-lg p-3 text-center">
                                <div className="text-2xl font-extrabold text-slate-700">{rb.noResponse}</div>
                                <div className="text-[10px] font-bold text-slate-500 uppercase">No Response</div>
                            </div>
                            <div className="bg-amber-50 rounded-lg p-3 text-center">
                                <div className="text-2xl font-extrabold text-amber-700">{rb.pending}</div>
                                <div className="text-[10px] font-bold text-amber-500 uppercase">Đang chờ</div>
                            </div>
                        </div>

                        {/* Accept rate bar */}
                        {rb.total > 0 && (
                            <div className="mt-2">
                                <div className="flex justify-between text-xs text-slate-500 mb-1">
                                    <span>Tỷ lệ chấp nhận</span>
                                    <span className="font-bold text-emerald-600">
                                        {Math.round((rb.accepted / Math.max(rb.accepted + rb.rejected + rb.noResponse, 1)) * 100)}%
                                    </span>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
                                    <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(rb.accepted / rb.total) * 100}%` }} />
                                    <div className="h-full bg-red-400 transition-all" style={{ width: `${(rb.rejected / rb.total) * 100}%` }} />
                                    <div className="h-full bg-slate-300 transition-all" style={{ width: `${(rb.noResponse / rb.total) * 100}%` }} />
                                    <div className="h-full bg-amber-300 transition-all" style={{ width: `${(rb.pending / rb.total) * 100}%` }} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Row 4: SLA Alerts */}
            {stats?.slaAlerts?.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden">
                    <div className="px-5 py-3 border-b border-red-100 bg-red-50 flex items-center gap-2">
                        <AlertTriangle size={16} className="text-red-500" />
                        <h3 className="font-bold text-red-700 text-sm">Cảnh báo SLA đang tích cực</h3>
                    </div>
                    <div className="divide-y divide-red-50">
                        {stats.slaAlerts.map((alert: any) => (
                            <div key={alert.ticketId} className="px-5 py-3 flex items-center justify-between text-sm">
                                <div className="flex items-center gap-3">
                                    <span className="font-mono font-bold text-blue-600 text-xs">#{alert.ticketId?.slice(-8)}</span>
                                    <span className="text-slate-600">{alert.route}</span>
                                    {alert.priorityLevel && (
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                            alert.priorityLevel === 'Critical' ? 'bg-red-100 text-red-700' :
                                            alert.priorityLevel === 'High' ? 'bg-orange-100 text-orange-700' :
                                            'bg-yellow-100 text-yellow-700'
                                        }`}>
                                            {alert.priorityLevel}
                                        </span>
                                    )}
                                </div>
                                <span className={`font-bold text-xs ${alert.remainingMinutes <= 0 ? 'text-red-600 animate-pulse' : 'text-amber-600'}`}>
                                    {alert.remainingMinutes <= 0 ? 'QUÁ HẠN' : `${alert.remainingMinutes}p còn lại`}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
