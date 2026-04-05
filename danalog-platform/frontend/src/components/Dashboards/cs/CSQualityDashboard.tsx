import React, { useState, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Camera, FileText, AlertCircle, ShieldAlert, Users } from 'lucide-react';
import { TransportTicket } from '../../../types';
import { KPICard } from '../shared/KPICard';
import { DashboardFilters, createDefaultFilters, FilterState } from '../shared/DashboardFilters';
import { DataTable, DataTableColumn } from '../shared/DataTable';
import { generateDataQualityStats } from '../shared/mockData';

interface Props {
    tickets: TransportTicket[];
    onNavigate?: (tab: string, focusId?: string) => void;
}

export const CSQualityDashboard: React.FC<Props> = ({ tickets, onNavigate }) => {
    const [filters, setFilters] = useState<FilterState>(createDefaultFilters('this_month'));
    const quality = useMemo(() => generateDataQualityStats(tickets), [tickets]);

    const customers = useMemo(() => {
        const set = new Set(tickets.map(t => t.customerCode).filter(Boolean));
        return [...set].map(c => ({ id: c, name: c }));
    }, [tickets]);

    // Error tickets for table
    const errorTickets = useMemo(() => {
        return tickets
            .filter(t => !t.containerNo || !t.containerImage || !t.size)
            .slice(0, 20)
            .map(t => ({
                ticketId: t.id,
                ticketNo: t.stt,
                customerCode: t.customerCode,
                route: t.route?.slice(0, 35) + (t.route && t.route.length > 35 ? '...' : ''),
                errorType: !t.containerNo ? 'Thiếu số cont' : !t.containerImage ? 'Thiếu hình ảnh' : 'Thiếu kích cỡ',
                driverName: t.driverName || 'N/A',
                csReviewer: t.createdBy || 'N/A',
            }));
    }, [tickets]);

    const errorColumns: DataTableColumn[] = [
        {
            key: 'ticketId', label: 'Mã phiếu', width: '100px',
            render: (v) => <span className="font-mono font-bold text-blue-600 text-[11px]">#{v.slice(-8)}</span>,
        },
        { key: 'customerCode', label: 'Khách hàng' },
        { key: 'route', label: 'Tuyến' },
        {
            key: 'errorType', label: 'Loại lỗi',
            render: (v) => (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">{v}</span>
            ),
        },
        { key: 'driverName', label: 'Lái xe' },
        { key: 'csReviewer', label: 'CS' },
    ];

    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">CS Quality Dashboard</h2>
                <p className="text-sm text-slate-500 mt-0.5">Phân tích chất lượng dữ liệu & lỗi hồ sơ</p>
            </div>

            <DashboardFilters
                filters={filters}
                onFilterChange={setFilters}
                showCustomer
                showRoute
                customers={customers}
                routes={useMemo(() => {
                    const set = new Set(tickets.map(t => t.route).filter(Boolean));
                    return [...set].map(r => ({ id: r, name: r.length > 40 ? r.slice(0, 40) + '...' : r }));
                }, [tickets])}
            />

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KPICard
                    label="Thiếu hình ảnh"
                    value={quality.missingPhotos}
                    icon={<Camera size={20} />}
                    color={quality.missingPhotos > 5 ? 'red' : 'amber'}
                    onClick={onNavigate ? () => onNavigate('cs_check') : undefined}
                />
                <KPICard
                    label="Thiếu info Container"
                    value={quality.missingContainerInfo}
                    icon={<FileText size={20} />}
                    color={quality.missingContainerInfo > 3 ? 'red' : 'amber'}
                    onClick={onNavigate ? () => onNavigate('cs_check') : undefined}
                />
                <KPICard
                    label="Dữ liệu sai"
                    value={quality.incorrectData}
                    icon={<AlertCircle size={20} />}
                    color="red"
                    onClick={onNavigate ? () => onNavigate('ticket_corrections') : undefined}
                />
                <KPICard
                    label="Duyệt ngoại lệ"
                    value={quality.exceptionApprovals}
                    icon={<ShieldAlert size={20} />}
                    color="purple"
                />
            </div>

            {/* Error Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Errors by Customer */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                        <Users size={16} className="text-red-500" />
                        Lỗi theo Khách hàng
                    </h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={quality.errorsByCustomer} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                            <YAxis type="category" dataKey="customer" tick={{ fontSize: 10, fill: '#94a3b8' }} width={80} />
                            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                            <Bar dataKey="errors" fill="#ef4444" radius={[0, 4, 4, 0]} name="Lỗi" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Errors by Route */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                        <AlertCircle size={16} className="text-amber-500" />
                        Lỗi theo Tuyến đường
                    </h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={quality.errorsByRoute} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                            <YAxis type="category" dataKey="route" tick={{ fontSize: 9, fill: '#94a3b8' }} width={120} />
                            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                            <Bar dataKey="errors" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Lỗi" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Error Table */}
            <DataTable
                title="Phiếu có lỗi dữ liệu"
                titleIcon={<AlertCircle size={16} className="text-red-500" />}
                columns={errorColumns}
                data={errorTickets}
                maxRows={15}
                onRowClick={onNavigate ? (row) => onNavigate('cs_check', row.ticketId) : undefined}
            />
        </div>
    );
};
