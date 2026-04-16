import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface KPICardProps {
    label: string;
    value: string | number;
    unit?: string;
    trend?: 'up' | 'down' | 'flat';
    trendValue?: string;
    trendLabel?: string;
    icon?: React.ReactNode;
    color?: 'blue' | 'emerald' | 'indigo' | 'amber' | 'red' | 'purple' | 'cyan' | 'rose' | 'slate';
    onClick?: () => void;
    format?: 'number' | 'currency' | 'percent';
    size?: 'sm' | 'md';
}

const COLOR_MAP: Record<string, { bg: string; iconBg: string; text: string; trendUp: string; trendDown: string; border: string }> = {
    blue:    { bg: 'bg-white', iconBg: 'bg-blue-50', text: 'text-blue-600', trendUp: 'text-emerald-600', trendDown: 'text-red-500', border: 'border-blue-100' },
    emerald: { bg: 'bg-white', iconBg: 'bg-emerald-50', text: 'text-emerald-600', trendUp: 'text-emerald-600', trendDown: 'text-red-500', border: 'border-emerald-100' },
    indigo:  { bg: 'bg-white', iconBg: 'bg-indigo-50', text: 'text-indigo-600', trendUp: 'text-emerald-600', trendDown: 'text-red-500', border: 'border-indigo-100' },
    amber:   { bg: 'bg-white', iconBg: 'bg-amber-50', text: 'text-amber-600', trendUp: 'text-emerald-600', trendDown: 'text-red-500', border: 'border-amber-100' },
    red:     { bg: 'bg-white', iconBg: 'bg-red-50', text: 'text-red-600', trendUp: 'text-emerald-600', trendDown: 'text-red-500', border: 'border-red-100' },
    purple:  { bg: 'bg-white', iconBg: 'bg-purple-50', text: 'text-purple-600', trendUp: 'text-emerald-600', trendDown: 'text-red-500', border: 'border-purple-100' },
    cyan:    { bg: 'bg-white', iconBg: 'bg-cyan-50', text: 'text-cyan-600', trendUp: 'text-emerald-600', trendDown: 'text-red-500', border: 'border-cyan-100' },
    rose:    { bg: 'bg-white', iconBg: 'bg-rose-50', text: 'text-rose-600', trendUp: 'text-emerald-600', trendDown: 'text-red-500', border: 'border-rose-100' },
    slate:   { bg: 'bg-white', iconBg: 'bg-slate-50', text: 'text-slate-600', trendUp: 'text-emerald-600', trendDown: 'text-red-500', border: 'border-slate-100' },
};

export function formatKPIValue(value: number, format?: 'number' | 'currency' | 'percent'): string {
    if (format === 'currency') {
        if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
        if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
        if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
        return value.toLocaleString('vi-VN');
    }
    if (format === 'percent') return `${value}%`;
    if (typeof value === 'number' && value >= 1000) return value.toLocaleString('vi-VN');
    return String(value);
}

export const KPICard: React.FC<KPICardProps> = ({
    label, value, unit, trend, trendValue, trendLabel, icon, color = 'blue', onClick, format, size = 'md'
}) => {
    const c = COLOR_MAP[color] || COLOR_MAP.blue;
    const displayValue = typeof value === 'number' ? formatKPIValue(value, format) : value;

    const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
    const trendColor = trend === 'up' ? c.trendUp : trend === 'down' ? c.trendDown : 'text-slate-400';

    return (
        <div
            onClick={onClick}
            className={`
                ${c.bg} rounded-xl shadow-sm border ${c.border} 
                ${size === 'sm' ? 'p-4' : 'p-5'} 
                ${onClick ? 'cursor-pointer hover:shadow-md hover:border-blue-300 hover:-translate-y-0.5' : ''} 
                transition-all duration-200 group relative overflow-hidden
            `}
        >
            {/* Subtle gradient overlay on hover */}
            {onClick && (
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 to-blue-50/0 group-hover:from-blue-50/30 group-hover:to-indigo-50/20 transition-all duration-300 pointer-events-none" />
            )}

            <div className="relative flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 truncate">{label}</div>
                    <div className={`${size === 'sm' ? 'text-xl' : 'text-2xl'} font-extrabold ${c.text} leading-tight`}>
                        {displayValue}
                        {unit && <span className="text-sm font-medium text-slate-400 ml-1">{unit}</span>}
                    </div>
                    {(trend || trendValue) && (
                        <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trendColor}`}>
                            <TrendIcon size={12} />
                            {trendValue && <span>{trendValue}</span>}
                            {trendLabel && <span className="text-slate-400 font-normal">{trendLabel}</span>}
                        </div>
                    )}
                </div>
                {icon && (
                    <div className={`p-2.5 ${c.iconBg} rounded-lg shrink-0 ${c.text}`}>
                        {icon}
                    </div>
                )}
            </div>

            {/* Click indicator */}
            {onClick && (
                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="text-[10px] text-blue-400 font-medium">Chi tiết →</div>
                </div>
            )}
        </div>
    );
};
