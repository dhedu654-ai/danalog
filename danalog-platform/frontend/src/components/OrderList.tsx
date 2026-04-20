import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, FileText, Clock, Truck, CheckCircle, AlertCircle, Edit3, Eye, RefreshCw, ChevronDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import { format } from 'date-fns';

interface Order {
    id: string;
    orderCode: string;
    customerName: string;
    routeId: string;
    routeName: string;
    pickupDate: string;
    deliveryDate: string;
    containers: { id: number; size: string; fe: string; count: number }[];
    notes: string;
    status: string; // DRAFT, NEW, PROCESSING, COMPLETED
    createdBy: string;
    createdAt: string;
    ticketsGenerated?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    'DRAFT': { label: 'Nháp', color: 'text-slate-500', bg: 'bg-slate-100', icon: <FileText size={14} /> },
    'NEW': { label: 'Mới', color: 'text-blue-600', bg: 'bg-blue-50', icon: <Clock size={14} /> },
    'PROCESSING': { label: 'Đang xử lý', color: 'text-amber-600', bg: 'bg-amber-50', icon: <Truck size={14} /> },
    'COMPLETED': { label: 'Hoàn thành', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: <CheckCircle size={14} /> },
};

export function OrderList({ currentUser, onRefreshTickets }: { currentUser: any; onRefreshTickets?: () => void }) {
    const [orders, setOrders] = useState<Order[]>([]);
    const [tickets, setTickets] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [currentPage, setCurrentPage] = useState(1);
    const [editingOrder, setEditingOrder] = useState<Order | null>(null);
    const [editFormData, setEditFormData] = useState<any>({});
    const PAGE_SIZE = 10;

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [ordersData, ticketsData] = await Promise.all([
                api.getOrders(),
                api.getTickets()
            ]);
            setOrders(ordersData || []);
            setTickets(ticketsData || []);
        } catch (err) {
            console.error('Failed to fetch orders:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // Determine order status based on linked tickets
    const getOrderStatus = (order: Order) => {
        const linkedTickets = tickets.filter(t => t.orderId === order.id);
        if (linkedTickets.length === 0) return order.status || 'DRAFT';

        const allApproved = linkedTickets.every(t => t.status === 'APPROVED');
        if (allApproved) return 'COMPLETED';

        const hasAssigned = linkedTickets.some(t =>
            t.dispatchStatus === 'ASSIGNED' || t.dispatchStatus === 'IN_PROGRESS' ||
            t.dispatchStatus === 'COMPLETED' || t.status === 'PENDING' || t.status === 'APPROVED'
        );
        if (hasAssigned) return 'PROCESSING';

        return order.status || 'NEW';
    };

    // Check if order is already in assign process
    const isInAssignProcess = (order: Order) => {
        const linkedTickets = tickets.filter(t => t.orderId === order.id);
        return linkedTickets.some(t =>
            t.dispatchStatus === 'ASSIGNED' || t.dispatchStatus === 'IN_PROGRESS' ||
            t.dispatchStatus === 'COMPLETED' || t.status === 'PENDING' || t.status === 'APPROVED'
        );
    };

    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            // Search
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const match =
                    order.orderCode?.toLowerCase().includes(term) ||
                    order.customerName?.toLowerCase().includes(term) ||
                    order.routeName?.toLowerCase().includes(term) ||
                    order.id?.toLowerCase().includes(term);
                if (!match) return false;
            }
            // Status
            if (statusFilter !== 'ALL') {
                const computedStatus = getOrderStatus(order);
                if (computedStatus !== statusFilter) return false;
            }
            return true;
        }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [orders, tickets, searchTerm, statusFilter]);

    const totalPages = Math.ceil(filteredOrders.length / PAGE_SIZE);
    const paginatedOrders = filteredOrders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    // Get container summary
    const getContainerSummary = (order: Order) => {
        if (!order.containers || order.containers.length === 0) return '-';
        return order.containers.map(c => `${c.count}x${c.size}'${c.fe}`).join(', ');
    };

    const getLinkedTicketCount = (orderId: string) => {
        return tickets.filter(t => t.orderId === orderId).length;
    };

    // Handle editing an order
    const handleStartEdit = (order: Order) => {
        if (isInAssignProcess(order)) {
            // Show warning - will notify relevant people about changes
            if (!window.confirm('Đơn hàng này đã bước vào quy trình assign. Mọi thay đổi sẽ được thông báo cho điều vận và lái xe liên quan. Tiếp tục?')) {
                return;
            }
        }
        setEditingOrder(order);
        setEditFormData({
            pickupDate: order.pickupDate || '',
            deliveryDate: order.deliveryDate || '',
            containers: order.containers ? order.containers.map(c => ({ ...c })) : [],
            notes: order.notes || ''
        });
    };

    const handleSaveEdit = async () => {
        if (!editingOrder) return;

        try {
            // Find what changed
            const changes: string[] = [];
            if (editFormData.pickupDate !== editingOrder.pickupDate) changes.push(`Ngày bắt đầu: ${editingOrder.pickupDate} → ${editFormData.pickupDate}`);
            if (editFormData.deliveryDate !== editingOrder.deliveryDate) changes.push(`Ngày kết thúc: ${editingOrder.deliveryDate} → ${editFormData.deliveryDate}`);

            const oldContSummary = getContainerSummary(editingOrder);
            const newContSummary = editFormData.containers?.map((c: any) => `${c.count}x${c.size}'${c.fe}`).join(', ') || '';
            if (oldContSummary !== newContSummary) changes.push(`Container: ${oldContSummary} → ${newContSummary}`);

            if (changes.length === 0 && editFormData.notes === editingOrder.notes) {
                alert('Không có thay đổi nào.');
                setEditingOrder(null);
                return;
            }

            const updatedOrder = {
                ...editingOrder,
                pickupDate: editFormData.pickupDate,
                deliveryDate: editFormData.deliveryDate,
                containers: editFormData.containers,
                notes: editFormData.notes
            };
            
            // Lọc bỏ các trường không tồn tại trên DB trước khi gửi
            const orderPayload = { ...updatedOrder };
            delete (orderPayload as any).editChanges;
            delete (orderPayload as any).lastEditedBy;
            delete (orderPayload as any).lastEditedAt;

            await api.updateOrder(editingOrder.id, orderPayload);

            // If in assign process, update linked tickets and send notification
            if (isInAssignProcess(editingOrder)) {
                const linkedTickets = tickets.filter(t => t.orderId === editingOrder.id);

                // Update ticket dates if changed
                for (const ticket of linkedTickets) {
                    const updates: any = {};
                    if (editFormData.pickupDate !== editingOrder.pickupDate) updates.dateStart = editFormData.pickupDate;
                    if (editFormData.deliveryDate !== editingOrder.deliveryDate) updates.dateEnd = editFormData.deliveryDate;

                    if (Object.keys(updates).length > 0) {
                        // Append to statusHistory to log the change, instead of editHighlight
                        const log = {
                            status: 'Đã sửa đổi',
                            timestamp: new Date().toISOString(),
                            user: currentUser?.name || currentUser?.username || 'System',
                            action: `Order updated: ${changes.join(', ')}`
                        };
                        const ticketPayload = { ...ticket, ...updates };
                        ticketPayload.statusHistory = [log, ...(ticket.statusHistory || [])];
                        
                        delete ticketPayload.editHighlight;
                        await api.updateTicket(ticket.id, ticketPayload);
                    }
                }

                // Notify dispatcher and driver
                // This is handled server-side through the update endpoint, 
                // but we also show client-side feedback
                alert(`Đã cập nhật đơn hàng. Thông báo đã được gửi cho điều vận và lái xe liên quan.\n\nCác thay đổi:\n${changes.join('\n')}`);
            } else {
                alert('Đã cập nhật đơn hàng thành công.');
            }

            setEditingOrder(null);
            fetchData();
            if (onRefreshTickets) onRefreshTickets();
        } catch (err) {
            console.error('Failed to update order:', err);
            alert('Lỗi khi cập nhật đơn hàng.');
        }
    };

    return (
        <div className="space-y-4 lg:space-y-6 font-sans">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 lg:gap-4">
                <h2 className="text-xl lg:text-2xl font-bold text-slate-800 tracking-tight">Danh Sách Đơn Hàng</h2>
                <button
                    onClick={fetchData}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium shadow-sm transition-all"
                >
                    <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                    Làm mới
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-2 mb-4">
                    <Filter size={20} className="text-blue-600" />
                    <h3 className="font-bold text-slate-800 uppercase text-sm tracking-wide">Bộ Lọc</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Search */}
                    <div className="space-y-1.5 md:col-span-2">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tìm kiếm</label>
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Mã đơn, khách hàng, tuyến đường..."
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                value={searchTerm}
                                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            />
                        </div>
                    </div>
                    {/* Status */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Trạng thái</label>
                        <select
                            value={statusFilter}
                            onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                        >
                            <option value="ALL">Tất cả</option>
                            <option value="DRAFT">Nháp</option>
                            <option value="NEW">Mới</option>
                            <option value="PROCESSING">Đang xử lý</option>
                            <option value="COMPLETED">Hoàn thành</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Status summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['DRAFT', 'NEW', 'PROCESSING', 'COMPLETED'].map(s => {
                    const config = STATUS_CONFIG[s];
                    const count = orders.filter(o => getOrderStatus(o) === s).length;
                    return (
                        <button
                            key={s}
                            onClick={() => { setStatusFilter(statusFilter === s ? 'ALL' : s); setCurrentPage(1); }}
                            className={`bg-white p-4 rounded-xl border shadow-sm transition-all hover:shadow-md ${statusFilter === s ? 'border-blue-300 ring-2 ring-blue-100' : 'border-slate-200'}`}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <div className={`p-1.5 rounded-lg ${config.bg}`}>{config.icon}</div>
                                <span className={`text-xs font-bold ${config.color}`}>{config.label}</span>
                            </div>
                            <p className="text-2xl font-bold text-slate-800">{count}</p>
                        </button>
                    );
                })}
            </div>

            {/* Orders Table */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden min-w-0">
                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
                    <table className="w-full text-xs lg:text-sm text-left whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-4 lg:px-5 py-3 lg:py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px] lg:text-xs w-12 text-center">STT</th>
                                <th className="px-4 lg:px-5 py-3 lg:py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px] lg:text-xs">Mã đơn</th>
                                <th className="px-4 lg:px-5 py-3 lg:py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px] lg:text-xs">Khách hàng</th>
                                <th className="px-4 lg:px-5 py-3 lg:py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px] lg:text-xs">Tuyến đường</th>
                                <th className="px-4 lg:px-5 py-3 lg:py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px] lg:text-xs text-center">Ngày lấy</th>
                                <th className="px-4 lg:px-5 py-3 lg:py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px] lg:text-xs text-center">Container</th>
                                <th className="px-4 lg:px-5 py-3 lg:py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px] lg:text-xs text-center">Số phiếu</th>
                                <th className="px-4 lg:px-5 py-3 lg:py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px] lg:text-xs text-center">Trạng thái</th>
                                <th className="px-4 lg:px-5 py-3 lg:py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px] lg:text-xs">Người tạo</th>
                                <th className="px-4 lg:px-5 py-3 lg:py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px] lg:text-xs text-center">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedOrders.map((order, index) => {
                                const status = getOrderStatus(order);
                                const stConfig = STATUS_CONFIG[status] || STATUS_CONFIG['NEW'];
                                const ticketCount = getLinkedTicketCount(order.id);
                                const hasChanges = order.editChanges && order.editChanges.length > 0;

                                return (
                                    <tr key={order.id} className={`hover:bg-blue-50/30 transition-colors ${hasChanges ? 'bg-amber-50/20' : ''}`}>
                                        <td className="px-5 py-4 text-center text-slate-400 font-medium">{(currentPage - 1) * PAGE_SIZE + index + 1}</td>
                                        <td className="px-5 py-4">
                                            <span className="font-bold text-blue-600 font-mono text-xs">{order.orderCode || order.id}</span>
                                        </td>
                                        <td className="px-5 py-4 font-bold text-slate-700">{order.customerName}</td>
                                        <td className="px-5 py-4 max-w-[200px] truncate text-slate-600" title={order.routeName}>{order.routeName}</td>
                                        <td className="px-5 py-4 text-center text-slate-600">
                                            {order.pickupDate ? format(new Date(order.pickupDate), 'dd/MM/yyyy') : '-'}
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <span className="px-2 py-1 bg-slate-100 rounded-md text-xs font-bold text-slate-600">{getContainerSummary(order)}</span>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-700 font-bold text-xs ring-1 ring-blue-100">
                                                {ticketCount}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${stConfig.bg} ${stConfig.color}`}>
                                                {stConfig.icon}
                                                {stConfig.label}
                                            </span>
                                            {hasChanges && (
                                                <div className="mt-1">
                                                    <span className="text-[10px] text-amber-600 font-bold flex items-center justify-center gap-1">
                                                        <AlertCircle size={10} /> Đã sửa đổi
                                                    </span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="text-xs text-slate-500">{order.createdBy}</span>
                                            <div className="text-[10px] text-slate-400">{order.createdAt ? format(new Date(order.createdAt), 'dd/MM HH:mm') : ''}</div>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={() => handleStartEdit(order)}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded-full transition-all"
                                                    title={isInAssignProcess(order) ? 'Sửa (sẽ thông báo cho người liên quan)' : 'Chỉnh sửa'}
                                                >
                                                    <Edit3 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {paginatedOrders.length === 0 && (
                                <tr>
                                    <td colSpan={10} className="px-6 py-12 text-center text-slate-400 italic">
                                        {isLoading ? 'Đang tải...' : 'Không có đơn hàng nào'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between text-sm text-slate-500">
                    <div className="font-medium">
                        Hiển thị <span className="text-slate-900 font-bold">{paginatedOrders.length}</span> / <span className="text-slate-900 font-bold">{filteredOrders.length}</span> đơn
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-2 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ArrowLeft size={16} />
                        </button>
                        <span className="font-medium text-slate-700">Trang {currentPage} / {totalPages || 1}</span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="p-2 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Edit Order Modal */}
            {editingOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50 flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">
                                    Chỉnh sửa Đơn hàng {editingOrder.orderCode}
                                </h3>
                                {isInAssignProcess(editingOrder) && (
                                    <p className="text-xs text-amber-600 font-bold mt-1 flex items-center gap-1">
                                        <AlertCircle size={12} />
                                        Đơn hàng đã trong quy trình assign — các thay đổi sẽ được thông báo
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6">
                            {/* Read-only info */}
                            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Khách hàng</label>
                                    <p className="text-sm font-bold text-slate-700">{editingOrder.customerName}</p>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tuyến đường</label>
                                    <p className="text-sm font-bold text-slate-700 truncate" title={editingOrder.routeName}>{editingOrder.routeName}</p>
                                </div>
                            </div>

                            {/* Editable: Dates */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Ngày bắt đầu</label>
                                    <input
                                        type="date"
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                                        value={editFormData.pickupDate}
                                        onChange={e => setEditFormData({ ...editFormData, pickupDate: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Ngày kết thúc</label>
                                    <input
                                        type="date"
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                                        value={editFormData.deliveryDate}
                                        onChange={e => setEditFormData({ ...editFormData, deliveryDate: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Editable: Containers */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Container</label>
                                <div className="space-y-3">
                                    {editFormData.containers?.map((c: any, idx: number) => (
                                        <div key={idx} className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                            <div>
                                                <label className="text-[10px] text-slate-400 font-bold">Size</label>
                                                <select
                                                    className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm mt-1"
                                                    value={c.size}
                                                    onChange={e => {
                                                        const newC = [...editFormData.containers];
                                                        newC[idx] = { ...newC[idx], size: e.target.value };
                                                        setEditFormData({ ...editFormData, containers: newC });
                                                    }}
                                                >
                                                    <option value="20">20'</option>
                                                    <option value="40">40'</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-slate-400 font-bold">F/E</label>
                                                <select
                                                    className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm mt-1"
                                                    value={c.fe}
                                                    onChange={e => {
                                                        const newC = [...editFormData.containers];
                                                        newC[idx] = { ...newC[idx], fe: e.target.value };
                                                        setEditFormData({ ...editFormData, containers: newC });
                                                    }}
                                                >
                                                    <option value="F">Full</option>
                                                    <option value="E">Empty</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-slate-400 font-bold">Số lượng</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm mt-1 text-center font-bold"
                                                    value={c.count}
                                                    onChange={e => {
                                                        const newC = [...editFormData.containers];
                                                        newC[idx] = { ...newC[idx], count: parseInt(e.target.value) || 1 };
                                                        setEditFormData({ ...editFormData, containers: newC });
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Ghi chú</label>
                                <textarea
                                    rows={2}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
                                    value={editFormData.notes}
                                    onChange={e => setEditFormData({ ...editFormData, notes: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                            <button
                                onClick={() => setEditingOrder(null)}
                                className="px-6 py-2.5 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                            >
                                {isInAssignProcess(editingOrder) ? 'Lưu & Thông báo' : 'Lưu thay đổi'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
