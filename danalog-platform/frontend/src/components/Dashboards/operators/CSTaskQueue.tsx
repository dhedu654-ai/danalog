import React, { useState } from 'react';
import { Layers, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { TransportTicket } from '../../../types';
import { KPICard } from '../shared/KPICard';
import { DashboardFilters, createDefaultFilters, FilterState } from '../shared/DashboardFilters';
import { DataTable, DataTableColumn } from '../shared/DataTable';

interface Props {
    tickets: TransportTicket[];
    currentUser?: any;
    onNavigate?: (tab: string, focusId?: string) => void;
}

export const CSTaskQueue: React.FC<Props> = ({ tickets, currentUser, onNavigate }) => {
    const [filters, setFilters] = useState<FilterState>(createDefaultFilters('today'));

    // Filter for tickets that need CS attention
    const pendingTickets = tickets.filter(t => t.dispatchStatus === 'COMPLETED' && t.status !== 'APPROVED');
    const missingDocs = tickets.filter(t => !t.containerImage || !t.containerNo);

    const urgentTickets = pendingTickets.filter(t => {
        // Ex: High priority if old ticket
        if (!t.dateEnd) return true;
        const diffHours = (new Date().getTime() - new Date(t.dateEnd).getTime()) / (1000 * 60 * 60);
        return diffHours > 48; // Older than 48h
    });

    const columns: DataTableColumn[] = [
        { 
            key: 'id', 
            label: 'Mã', 
            width: '80px', 
            render: (v) => <span className="font-mono text-blue-600 text-[11px]">#{v.slice(-6)}</span> 
        },
        { 
            key: 'route', 
            label: 'Tuyến', 
            render: (v) => <span className="text-xs">{v?.slice(0, 35)}{v?.length > 35 ? '...' : ''}</span> 
        },
        { key: 'customerCode', label: 'Khách hàng' },
        { 
            key: 'dateEnd', 
            label: 'Ngày chạy',
            render: (v) => <span className="text-xs">{v?.slice(0, 10)}</span>
        },
        {
            key: 'id',
            label: 'Trạng thái',
            render: (_, ticket: any) => {
                if (!ticket.containerImage || !ticket.containerNo) {
                    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">Thiếu DL</span>;
                }
                return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">Chờ duyệt</span>;
            }
        },
    ];

    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">CS Task Queue</h2>
                <p className="text-sm text-slate-500 mt-0.5">Danh sách phiếu cần xử lý theo mức độ ưu tiên</p>
            </div>

            <DashboardFilters filters={filters} onFilterChange={setFilters} showComparison={false} />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <KPICard 
                    label="Tổng chờ duyệt" 
                    value={pendingTickets.length} 
                    icon={<Layers size={20} />} 
                    color="blue" 
                    onClick={onNavigate ? () => onNavigate('cs_check') : undefined} 
                />
                <KPICard 
                    label="Thiếu dữ liệu" 
                    value={missingDocs.length} 
                    icon={<AlertCircle size={20} />} 
                    color="red" 
                    onClick={onNavigate ? () => onNavigate('cs_check') : undefined} 
                />
                <KPICard 
                    label="Quá hạn SLA (>48h)" 
                    value={urgentTickets.length} 
                    icon={<Clock size={20} />} 
                    color="amber" 
                    onClick={onNavigate ? () => onNavigate('cs_check') : undefined} 
                />
                <KPICard 
                    label="Yêu cầu sửa đổi (CR)" 
                    value={0} 
                    icon={<CheckCircle size={20} />} 
                    color="indigo" 
                    onClick={onNavigate ? () => onNavigate('ticket_corrections') : undefined} 
                />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-5">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                        <Layers size={16} className="text-blue-500" />
                        Danh sách công việc (Hàng đợi)
                    </h3>
                </div>
                
                <DataTable
                    title=""
                    columns={columns}
                    data={pendingTickets}
                    maxRows={15}
                />
            </div>
        </div>
    );
};
