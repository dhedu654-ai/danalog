import React from 'react';
import { ChevronUp, ChevronDown, ChevronRight, Minus } from 'lucide-react';

export interface DataTableColumn<T = any> {
    key: string;
    label: string;
    width?: string;
    align?: 'left' | 'center' | 'right';
    sortable?: boolean;
    render?: (value: any, row: T) => React.ReactNode;
    format?: 'number' | 'currency' | 'percent';
}

interface DataTableProps<T = any> {
    columns: DataTableColumn<T>[];
    data: T[];
    onRowClick?: (row: T) => void;
    sortKey?: string;
    sortDir?: 'asc' | 'desc';
    onSort?: (key: string) => void;
    maxRows?: number;
    emptyText?: string;
    title?: string;
    titleIcon?: React.ReactNode;
    compact?: boolean;
}

function formatCell(value: any, format?: 'number' | 'currency' | 'percent'): string {
    if (value == null) return '—';
    if (format === 'currency') {
        const n = Number(value);
        if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
        return n.toLocaleString('vi-VN') + ' đ';
    }
    if (format === 'percent') return `${value}%`;
    if (format === 'number' && typeof value === 'number') return value.toLocaleString('vi-VN');
    return String(value);
}

export function DataTable<T extends Record<string, any>>({
    columns, data, onRowClick, sortKey, sortDir, onSort, maxRows, emptyText = 'Không có dữ liệu', title, titleIcon, compact
}: DataTableProps<T>) {
    const displayed = maxRows ? data.slice(0, maxRows) : data;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {title && (
                <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                    {titleIcon}
                    <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
                    <span className="text-xs text-slate-400 ml-1">{data.length} dòng</span>
                </div>
            )}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-100">
                            {columns.map(col => (
                                <th
                                    key={col.key}
                                    onClick={col.sortable && onSort ? () => onSort(col.key) : undefined}
                                    className={`
                                        ${compact ? 'px-3 py-2' : 'px-5 py-3'} 
                                        text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider
                                        ${col.sortable && onSort ? 'cursor-pointer hover:text-slate-600 select-none' : ''}
                                        ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}
                                    `}
                                    style={col.width ? { width: col.width } : undefined}
                                >
                                    <span className="flex items-center gap-1">
                                        {col.label}
                                        {col.sortable && sortKey === col.key && (
                                            sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                                        )}
                                    </span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {displayed.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="px-5 py-8 text-center text-slate-400 text-sm">
                                    {emptyText}
                                </td>
                            </tr>
                        ) : (
                            displayed.map((row, idx) => (
                                <tr
                                    key={idx}
                                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                                    className={`
                                        ${onRowClick ? 'cursor-pointer hover:bg-blue-50/40' : 'hover:bg-slate-50/50'}
                                        transition-colors group
                                    `}
                                >
                                    {columns.map(col => (
                                        <td
                                            key={col.key}
                                            className={`
                                                ${compact ? 'px-3 py-2' : 'px-5 py-3'} 
                                                text-slate-700 text-xs
                                                ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}
                                            `}
                                        >
                                            {col.render
                                                ? col.render(row[col.key], row)
                                                : formatCell(row[col.key], col.format)
                                            }
                                        </td>
                                    ))}
                                    {onRowClick && (
                                        <td className="pr-3 py-2">
                                            <ChevronRight size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            {maxRows && data.length > maxRows && (
                <div className="px-5 py-2 border-t border-slate-100 text-center">
                    <span className="text-xs text-slate-400">
                        Hiển thị {maxRows}/{data.length} dòng
                    </span>
                </div>
            )}
        </div>
    );
}

// Comparison badge component
export function ComparisonBadge({ current, previous, format }: { current: number; previous: number; format?: 'number' | 'percent' | 'currency' }) {
    if (previous === 0) return null;
    const diff = current - previous;
    const pct = Math.round((diff / previous) * 100);
    const isUp = diff > 0;
    const isFlat = diff === 0;

    return (
        <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${
            isFlat ? 'text-slate-400' : isUp ? 'text-emerald-600' : 'text-red-500'
        }`}>
            {isFlat ? <Minus size={10} /> : isUp ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            {Math.abs(pct)}%
        </span>
    );
}
