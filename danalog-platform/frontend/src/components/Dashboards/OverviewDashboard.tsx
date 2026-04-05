import React from 'react';
import { ShoppingBag, Ticket, Clock, MessageSquare, AlertCircle } from 'lucide-react';
import { TransportTicket } from '../../types';

interface OverviewDashboardProps {
    tickets: TransportTicket[];
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({ tickets }) => {
    // Calculate metrics
    const activeTickets = tickets.filter(t => t.dispatchStatus === 'IN_PROGRESS' || t.dispatchStatus === 'ASSIGNED');
    
    // Simulate orders (in reality, orders are grouped from tickets or a separate table)
    const uniqueOrders = new Set(tickets.map(t => t.orderId || t.id)).size;
    
    // Dispatch SLA: assigned within SLA vs total assigned
    const assignedTickets = tickets.filter(t => t.dispatchStatus === 'ASSIGNED' || t.dispatchStatus === 'COMPLETED');
    const withinSla = assignedTickets.filter(t => {
        // Mock SLA check for now
        return true; 
    });
    const slaRate = assignedTickets.length ? Math.round((withinSla.length / assignedTickets.length) * 100) : 100;

    // Pending review tickets (e.g. COMPLETED by driver, waiting for APPROVED by CS)
    const pendingReview = tickets.filter(t => t.dispatchStatus === 'COMPLETED' && t.status !== 'APPROVED').length;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Dashboard Tổng Quan</h2>
                <p className="text-slate-500 mt-1">Giám sát hiệu suất vận hành toàn hệ thống</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {/* Orders */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                        <ShoppingBag size={24} />
                    </div>
                    <div>
                        <div className="text-sm font-medium text-slate-500">Tổng Bookings</div>
                        <div className="text-2xl font-bold text-slate-800">{uniqueOrders}</div>
                    </div>
                </div>

                {/* Tickets */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                        <Ticket size={24} />
                    </div>
                    <div>
                        <div className="text-sm font-medium text-slate-500">Phiếu đang vận hành</div>
                        <div className="text-2xl font-bold text-slate-800">{activeTickets.length}</div>
                    </div>
                </div>

                {/* Dispatch SLA */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                        <Clock size={24} />
                    </div>
                    <div>
                        <div className="text-sm font-medium text-slate-500">Tỷ lệ đúng hạn SLA</div>
                        <div className="text-2xl font-bold text-slate-800">{slaRate}%</div>
                    </div>
                </div>

                {/* Driver Response */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center gap-4">
                    <div className="p-3 bg-violet-50 text-violet-600 rounded-lg">
                        <MessageSquare size={24} />
                    </div>
                    <div>
                        <div className="text-sm font-medium text-slate-500">Tốc độ phản hồi (TB)</div>
                        <div className="text-2xl font-bold text-slate-800">12<span className="text-base text-slate-500 ml-1">phút</span></div>
                    </div>
                </div>

                {/* Pending Review */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center gap-4">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                        <AlertCircle size={24} />
                    </div>
                    <div>
                        <div className="text-sm font-medium text-slate-500">Phiếu chờ duyệt (CS)</div>
                        <div className="text-2xl font-bold text-slate-800">{pendingReview}</div>
                    </div>
                </div>
            </div>

            {/* Placeholder for larger charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                 <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-64 flex items-center justify-center">
                    <span className="text-slate-400 font-medium">Biểu đồ Đơn hàng (Tuần)</span>
                 </div>
                 <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-64 flex items-center justify-center">
                    <span className="text-slate-400 font-medium">Tỷ lệ Trạng thái phiếu</span>
                 </div>
            </div>
        </div>
    );
};
