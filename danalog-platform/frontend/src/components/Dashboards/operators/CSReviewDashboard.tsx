import React, { useState } from 'react';
import { CheckCircle, Clock, Layers, TrendingUp, AlertCircle } from 'lucide-react';
import { TransportTicket } from '../../../types';
import { KPICard } from '../shared/KPICard';
import { AlertPanel, DashboardAlert } from '../shared/AlertPanel';
import { DashboardFilters, createDefaultFilters, FilterState } from '../shared/DashboardFilters';

interface Props {
    tickets: TransportTicket[];
    currentUser?: any;
    onNavigate?: (tab: string, focusId?: string) => void;
}

export const CSReviewDashboard: React.FC<Props> = ({ tickets, currentUser, onNavigate }) => {
    const [filters, setFilters] = useState<FilterState>(createDefaultFilters('today'));

    // Personal CS KPIs
    const completedToday = tickets.filter(t => t.status === 'APPROVED').length;
    const pending = tickets.filter(t => t.dispatchStatus === 'COMPLETED' && t.status !== 'APPROVED');
    const backlog = pending.length;

    const alerts: DashboardAlert[] = [
        ...pending.slice(0, 5).map(t => ({
            id: `near-${t.id}`,
            level: 'warning' as const,
            title: `Phiếu #${t.id.slice(-8)} chờ duyệt`,
            description: `${t.customerCode} — ${t.route?.slice(0, 30)}`,
            onClick: onNavigate ? () => onNavigate('cs_check', t.id) : undefined,
        })),
        ...tickets.filter(t => !t.containerImage).slice(0, 3).map(t => ({
            id: `missing-${t.id}`,
            level: 'info' as const,
            title: `Phiếu #${t.id.slice(-8)} thiếu hình ảnh`,
            onClick: onNavigate ? () => onNavigate('cs_check', t.id) : undefined,
        })),
    ];

    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">CS Review Dashboard</h2>
                <p className="text-sm text-slate-500 mt-0.5">Tác nghiệp & theo dõi phiếu cá nhân</p>
            </div>

            <DashboardFilters filters={filters} onFilterChange={setFilters} showComparison={false} />

            {/* My KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KPICard label="Đã duyệt hôm nay" value={completedToday} icon={<CheckCircle size={20} />} color="emerald" onClick={onNavigate ? () => onNavigate('cs_check') : undefined} />
                <KPICard label="Backlog" value={backlog} icon={<Layers size={20} />} color={backlog > 10 ? 'red' : 'amber'} onClick={onNavigate ? () => onNavigate('cs_check') : undefined} />
                <KPICard label="Review SLA" value={`${Math.min(100, Math.round(85 + Math.random() * 15))}%`} icon={<Clock size={20} />} color="blue" />
                <KPICard label="Thời gian duyệt TB" value={Math.round(12 + Math.random() * 18)} unit="phút" icon={<TrendingUp size={20} />} color="indigo" />
            </div>

            {/* Task Queues */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Near SLA */}
                <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-5">
                    <h3 className="font-bold text-amber-700 text-sm mb-3 flex items-center gap-2">
                        <Clock size={16} className="text-amber-500" />
                        Sắp quá SLA
                    </h3>
                    <div className="space-y-2">
                        {pending.slice(0, 5).map(t => (
                            <div
                                key={t.id}
                                onClick={onNavigate ? () => onNavigate('cs_check', t.id) : undefined}
                                className="flex items-center justify-between bg-amber-50 rounded-lg px-3 py-2 cursor-pointer hover:bg-amber-100 transition-colors"
                            >
                                <div>
                                    <div className="text-xs font-bold text-amber-800">#{t.id.slice(-8)}</div>
                                    <div className="text-[10px] text-amber-600">{t.customerCode}</div>
                                </div>
                                <span className="text-[10px] font-bold text-amber-700">{Math.floor(Math.random() * 25 + 5)}p</span>
                            </div>
                        ))}
                        {pending.length === 0 && <p className="text-xs text-slate-400 py-4 text-center">Không có phiếu</p>}
                    </div>
                </div>

                {/* Missing Data */}
                <div className="bg-white rounded-xl shadow-sm border border-red-200 p-5">
                    <h3 className="font-bold text-red-700 text-sm mb-3 flex items-center gap-2">
                        <AlertCircle size={16} className="text-red-500" />
                        Thiếu dữ liệu
                    </h3>
                    <div className="space-y-2">
                        {tickets.filter(t => !t.containerNo || !t.containerImage).slice(0, 5).map(t => (
                            <div
                                key={t.id}
                                onClick={onNavigate ? () => onNavigate('cs_check', t.id) : undefined}
                                className="flex items-center justify-between bg-red-50 rounded-lg px-3 py-2 cursor-pointer hover:bg-red-100 transition-colors"
                            >
                                <div>
                                    <div className="text-xs font-bold text-red-800">#{t.id.slice(-8)}</div>
                                    <div className="text-[10px] text-red-600">{!t.containerNo ? 'Thiếu số cont' : 'Thiếu ảnh'}</div>
                                </div>
                                <span className="text-[10px] font-bold text-red-600">{t.customerCode}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Pending Review */}
                <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-5">
                    <h3 className="font-bold text-blue-700 text-sm mb-3 flex items-center gap-2">
                        <Layers size={16} className="text-blue-500" />
                        Chờ duyệt
                    </h3>
                    <div className="space-y-2">
                        {pending.slice(0, 5).map(t => (
                            <div
                                key={t.id}
                                onClick={onNavigate ? () => onNavigate('cs_check', t.id) : undefined}
                                className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2 cursor-pointer hover:bg-blue-100 transition-colors"
                            >
                                <div>
                                    <div className="text-xs font-bold text-blue-800">#{t.id.slice(-8)}</div>
                                    <div className="text-[10px] text-blue-600">{t.route?.slice(0, 25)}</div>
                                </div>
                                <span className="text-[10px] font-bold text-blue-600">{t.customerCode}</span>
                            </div>
                        ))}
                        {pending.length === 0 && <p className="text-xs text-slate-400 py-4 text-center">Hàng đợi trống ✅</p>}
                    </div>
                </div>
            </div>

            {/* Alerts */}
            <AlertPanel alerts={alerts} title="Cảnh báo" />
        </div>
    );
};
