import React from 'react';
import { Truck, Droplets, Activity, Banknote, Calendar } from 'lucide-react';
import { TransportTicket } from '../../types';

interface FleetDashboardProps {
    tickets: TransportTicket[];
}

export const FleetDashboard: React.FC<FleetDashboardProps> = ({ tickets }) => {
    // Basic calcs for Accountant
    const completedTickets = tickets.filter(t => t.dispatchStatus === 'COMPLETED' || t.status === 'APPROVED');
    
    // Revenue mock (sum of revenue on completed tickets for current month)
    const currentMonthRevenue = completedTickets.reduce((acc, t) => acc + (t.revenue || 0), 0);
    
    // Salary mock
    const pendingSalary = completedTickets.reduce((acc, t) => acc + (t.driverSalary || 0), 0);
    
    // Trips per vehicle mock
    const uniqueVehicles = new Set(completedTickets.map(t => t.licensePlate).filter(Boolean)).size;
    const tripsPerVehicle = uniqueVehicles > 0 ? (completedTickets.length / uniqueVehicles).toFixed(1) : '0';

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Tài chính & Hiệu suất Tương đối (Fleet)</h2>
                <p className="text-slate-500 mt-1">Quản trị Doanh thu, Chi phí, và Công suất xe</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Revenue */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center justify-between">
                    <div>
                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Doanh thu Tạm tính</div>
                        <div className="text-xl font-bold text-emerald-600 mt-1">
                            {currentMonthRevenue.toLocaleString('vi-VN')} đ
                        </div>
                    </div>
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg shrink-0 ml-2">
                        <Banknote size={20} />
                    </div>
                </div>

                {/* Salary */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center justify-between">
                    <div>
                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Lương Lái xe Tạm tính</div>
                        <div className="text-xl font-bold text-amber-600 mt-1">
                            {pendingSalary.toLocaleString('vi-VN')} đ
                        </div>
                    </div>
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-lg shrink-0 ml-2">
                        <Calendar size={20} />
                    </div>
                </div>

                {/* Trips / Vehicle */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center justify-between">
                    <div>
                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Hiệu suất Chuyến/Xe</div>
                        <div className="text-xl font-bold text-blue-600 mt-1">
                            {tripsPerVehicle} <span className="text-sm font-medium text-slate-400">chuyến</span>
                        </div>
                    </div>
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg shrink-0 ml-2">
                        <Truck size={20} />
                    </div>
                </div>

                {/* Fuel */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center justify-between">
                    <div>
                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tiêu hao Nhiên liệu</div>
                        <div className="text-xl font-bold text-purple-600 mt-1">
                            32.5 <span className="text-sm font-medium text-slate-400">L/100km</span>
                        </div>
                    </div>
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-lg shrink-0 ml-2">
                        <Droplets size={20} />
                    </div>
                </div>

                {/* Vehicle Utilization */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center justify-between">
                    <div>
                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Công suất khả dụng</div>
                        <div className="text-xl font-bold text-indigo-600 mt-1">
                            78%
                        </div>
                    </div>
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg shrink-0 ml-2">
                        <Activity size={20} />
                    </div>
                </div>
            </div>

            {/* Additional Charts area for Accountant */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-72 flex items-center justify-center">
                    <span className="text-slate-400 font-medium">Biểu đồ Lợi nhuận gộp (Cost vs Revenue)</span>
                </div>
                 <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-72 flex items-center justify-center">
                    <span className="text-slate-400 font-medium">Báo cáo tình trạng nạp nhiên liệu (Fuel Stations)</span>
                </div>
            </div>
        </div>
    );
};
