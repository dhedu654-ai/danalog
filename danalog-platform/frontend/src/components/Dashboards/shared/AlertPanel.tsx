import React from 'react';
import { AlertTriangle, AlertCircle, Info, ChevronRight } from 'lucide-react';

export type AlertLevel = 'critical' | 'warning' | 'info';

export interface DashboardAlert {
    id: string;
    level: AlertLevel;
    title: string;
    description?: string;
    timestamp?: string;
    onClick?: () => void;
}

interface AlertPanelProps {
    alerts: DashboardAlert[];
    title?: string;
    maxItems?: number;
    onViewAll?: () => void;
}

const LEVEL_CONFIG: Record<AlertLevel, {
    icon: React.FC<any>;
    bg: string;
    border: string;
    text: string;
    badge: string;
    pulse?: boolean;
}> = {
    critical: {
        icon: AlertTriangle,
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-700',
        badge: 'bg-red-100 text-red-700',
        pulse: true,
    },
    warning: {
        icon: AlertCircle,
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        text: 'text-amber-700',
        badge: 'bg-amber-100 text-amber-700',
    },
    info: {
        icon: Info,
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-700',
        badge: 'bg-blue-100 text-blue-700',
    },
};

const LEVEL_LABELS: Record<AlertLevel, string> = {
    critical: 'Nghiêm trọng',
    warning: 'Cảnh báo',
    info: 'Thông tin',
};

export const AlertPanel: React.FC<AlertPanelProps> = ({ alerts, title = 'Cảnh báo vận hành', maxItems = 8, onViewAll }) => {
    const sortedAlerts = [...alerts].sort((a, b) => {
        const priority: Record<AlertLevel, number> = { critical: 0, warning: 1, info: 2 };
        return priority[a.level] - priority[b.level];
    });

    const displayed = sortedAlerts.slice(0, maxItems);
    const criticalCount = alerts.filter(a => a.level === 'critical').length;

    if (alerts.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                    <AlertCircle size={16} className="text-emerald-500" />
                    {title}
                </h3>
                <div className="flex items-center justify-center py-6">
                    <div className="text-center">
                        <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-2">
                            <span className="text-2xl">✅</span>
                        </div>
                        <p className="text-sm text-emerald-600 font-medium">Không có cảnh báo</p>
                        <p className="text-xs text-slate-400 mt-1">Hệ thống hoạt động bình thường</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`bg-white rounded-xl shadow-sm border overflow-hidden ${criticalCount > 0 ? 'border-red-200' : 'border-slate-200'}`}>
            <div className={`px-5 py-3 border-b flex items-center justify-between ${criticalCount > 0 ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                <h3 className={`font-bold text-sm flex items-center gap-2 ${criticalCount > 0 ? 'text-red-700' : 'text-slate-800'}`}>
                    <AlertTriangle size={16} className={criticalCount > 0 ? 'text-red-500' : 'text-amber-500'} />
                    {title}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${criticalCount > 0 ? 'bg-red-100 text-red-600' : 'bg-slate-200 text-slate-600'}`}>
                        {alerts.length}
                    </span>
                </h3>
                {onViewAll && alerts.length > maxItems && (
                    <button onClick={onViewAll} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5">
                        Xem tất cả <ChevronRight size={12} />
                    </button>
                )}
            </div>
            <div className="divide-y divide-slate-50">
                {displayed.map((alert) => {
                    const config = LEVEL_CONFIG[alert.level];
                    const Icon = config.icon;
                    return (
                        <div
                            key={alert.id}
                            onClick={alert.onClick}
                            className={`
                                px-5 py-3 flex items-center gap-3 text-sm transition-colors
                                ${alert.onClick ? 'cursor-pointer hover:bg-slate-50' : ''}
                                ${config.pulse ? 'animate-pulse' : ''}
                            `}
                        >
                            <div className={`p-1.5 rounded-lg ${config.bg} shrink-0`}>
                                <Icon size={14} className={config.text} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className={`font-medium text-xs ${config.text}`}>{alert.title}</div>
                                {alert.description && (
                                    <div className="text-[11px] text-slate-400 mt-0.5 truncate">{alert.description}</div>
                                )}
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${config.badge}`}>
                                {LEVEL_LABELS[alert.level]}
                            </span>
                            {alert.onClick && <ChevronRight size={14} className="text-slate-300 shrink-0" />}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
