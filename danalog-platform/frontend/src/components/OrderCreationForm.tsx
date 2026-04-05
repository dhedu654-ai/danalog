import React, { useState, useEffect } from 'react';
import { X, Save, ArrowLeft, FileText } from 'lucide-react';
import { RouteConfig } from '../types';
import { CUSTOMERS } from '../constants';
import { api } from '../services/api';

interface OrderCreationFormProps {
    isOpen: boolean;
    onClose: () => void;
    routeConfigs: RouteConfig[];
    currentUser: any;
    onSuccess: () => void;
}

export function OrderCreationForm({ isOpen, onClose, routeConfigs, currentUser, onSuccess }: OrderCreationFormProps) {
    const [formData, setFormData] = useState({
        customerName: '',
        routeId: '',
        routeName: '',
        pickupDate: new Date().toLocaleDateString('en-CA'),
        deliveryDate: new Date().toLocaleDateString('en-CA'),
        containers: [{ id: Date.now(), size: '40', fe: 'F', count: 1 }],
        notes: ''
    });

    const [isSaving, setIsSaving] = useState(false);

    // Reset form when reopened
    useEffect(() => {
        if (isOpen) {
            setFormData({
                customerName: '',
                routeId: '',
                routeName: '',
                pickupDate: new Date().toLocaleDateString('en-CA'),
                deliveryDate: new Date().toLocaleDateString('en-CA'),
                containers: [{ id: Date.now(), size: '40', fe: 'F', count: 1 }],
                notes: ''
            });
            setIsSaving(false);
        }
    }, [isOpen]);

    const handleCustomerChange = (customer: string) => {
        setFormData(prev => ({
            ...prev,
            customerName: customer,
            routeId: '',
            routeName: ''
        }));
    };

    const handleRouteChange = (rId: string) => {
        const tr = availableRoutes.find(r => r.id === rId);
        setFormData(prev => ({
            ...prev,
            routeId: rId,
            routeName: tr ? tr.routeName : ''
        }));
    };

    // Filter active routes by customer
    const isValidRoute = (rc: RouteConfig) => {
        if (!rc || rc.status !== 'ACTIVE') return false;
        if (rc.customer !== formData.customerName) return false;
        return true;
    };

    const availableRoutes = routeConfigs.filter(isValidRoute);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const totalCount = formData.containers.reduce((sum, c) => sum + (c.count || 0), 0);
        if (!formData.customerName || !formData.routeId || totalCount < 1) {
            alert("Vui lòng nhập đủ Khách hàng, Tuyến đường và ít nhất 1 Container.");
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                id: 'ORD-' + Date.now(),
                orderCode: 'ORD-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
                ...formData,
                createdBy: currentUser?.username || 'system',
                createdAt: new Date().toISOString(),
                status: 'NEW',
                ticketsGenerated: true
            };

            await api.createOrder(payload);
            
            // Show Success
            alert(`Đã tạo thành công Đơn Hàng gồm ${totalCount} Phiếu Vận Tải!`);
            onSuccess();
            onClose();
        } catch (err) {
            console.error("Error creating order:", err);
            alert("Đã xảy ra lỗi khi tạo đơn hàng.");
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-100 flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="px-8 py-5 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">Tạo Đơn Hàng (Order) Mới</h3>
                        <p className="text-sm text-slate-500 mt-1">Hệ thống sẽ tự động tách thành N Phiếu Vận Tải tương ứng</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto bg-slate-50/30">
                    <form onSubmit={handleSubmit} className="px-8 py-8 space-y-6">
                        
                        {/* Section 1: Customer & Route */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Thông tin hành trình</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Khách hàng <span className="text-red-500">*</span></label>
                                    <select
                                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer text-sm font-medium"
                                        value={formData.customerName}
                                        onChange={e => handleCustomerChange(e.target.value)}
                                        required
                                    >
                                        <option value="">Chọn khách hàng...</option>
                                        {CUSTOMERS.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Tuyến đường <span className="text-red-500">*</span></label>
                                    <select
                                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer text-sm font-medium disabled:bg-slate-100"
                                        value={formData.routeId}
                                        onChange={e => handleRouteChange(e.target.value)}
                                        disabled={!formData.customerName}
                                        required
                                    >
                                        <option value="">Chọn tuyến đường...</option>
                                        {availableRoutes.map(r => (
                                            <option key={r.id} value={r.id}>{r.routeName}</option>
                                        ))}
                                    </select>
                                    {!formData.customerName && <p className="text-xs text-orange-500 mt-1">Vui lòng chọn khách hàng trước</p>}
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Ngày bắt đầu (Dự kiến) <span className="text-red-500">*</span></label>
                                    <input
                                        type="date"
                                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium hover:bg-slate-50"
                                        value={formData.pickupDate}
                                        onChange={e => setFormData({ ...formData, pickupDate: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Ngày kết thúc (Dự kiến) <span className="text-red-500">*</span></label>
                                    <input
                                        type="date"
                                        min={formData.pickupDate} // Prevent selecting a date before start date
                                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium hover:bg-slate-50"
                                        value={formData.deliveryDate}
                                        onChange={e => setFormData({ ...formData, deliveryDate: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Container Config */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-blue-500">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cấu hình Container đa lô</h4>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, containers: [...formData.containers, { id: Date.now() + Math.random(), size: '40', fe: 'F', count: 1 }] })}
                                    className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded text-xs font-bold hover:bg-blue-100 flex items-center gap-1 transition-colors shadow-sm"
                                >
                                    + THÊM LOẠI CONT
                                </button>
                            </div>
                            
                            <div className="space-y-4">
                                {formData.containers.map((container, index) => (
                                    <div key={container.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-slate-50 p-4 rounded-lg border border-slate-100 relative">
                                        {formData.containers.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newC = [...formData.containers];
                                                    newC.splice(index, 1);
                                                    setFormData({ ...formData, containers: newC });
                                                }}
                                                className="absolute -right-2 -top-2 w-6 h-6 bg-red-100 text-red-500 rounded-full flex items-center justify-center hover:bg-red-200 shadow-sm"
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                        <div className="md:col-span-4">
                                            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Loại Cont {index + 1}</label>
                                            <select
                                                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                                                value={container.size}
                                                onChange={e => {
                                                    const newC = [...formData.containers];
                                                    newC[index].size = e.target.value;
                                                    setFormData({ ...formData, containers: newC });
                                                }}
                                            >
                                                <option value="20">20'</option>
                                                <option value="40">40' / 40HC</option>
                                            </select>
                                        </div>
                                        
                                        <div className="md:col-span-4">
                                            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Trạng thái</label>
                                            <select
                                                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                                                value={container.fe}
                                                onChange={e => {
                                                    const newC = [...formData.containers];
                                                    newC[index].fe = e.target.value;
                                                    setFormData({ ...formData, containers: newC });
                                                }}
                                            >
                                                <option value="F">Full (Có hàng)</option>
                                                <option value="E">Empty (Rỗng)</option>
                                            </select>
                                        </div>

                                        <div className="md:col-span-4">
                                            <label className="block text-xs font-semibold text-blue-600 mb-1.5 uppercase">SL Cont <span className="text-red-500">*</span></label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="50"
                                                className="w-full px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm font-bold text-center text-blue-700 outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                                                value={container.count}
                                                onChange={e => {
                                                    const newC = [...formData.containers];
                                                    newC[index].count = parseInt(e.target.value) || 1;
                                                    setFormData({ ...formData, containers: newC });
                                                }}
                                                required
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 text-right pt-4 border-t border-slate-100">
                                <span className="text-sm font-medium text-slate-500 mr-2">
                                    Tổng số vé xe sẽ sinh ra:
                                </span>
                                <span className="text-xl font-extrabold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">
                                    {formData.containers.reduce((s, c) => s + (c.count || 0), 0)}
                                </span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Ghi chú (Tùy chọn)</label>
                            <textarea
                                rows={2}
                                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm transition-all hover:bg-slate-50"
                                placeholder="..."
                                value={formData.notes}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 mt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex items-center gap-2 px-6 py-2.5 bg-white text-slate-700 font-bold rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors shadow-sm"
                            >
                                <ArrowLeft size={18} />
                                Hủy bỏ
                            </button>
                            <button
                                type="button"
                                disabled={isSaving}
                                onClick={async () => {
                                    if (!formData.customerName) {
                                        alert('Vui lòng chọn khách hàng trước khi lưu nháp.');
                                        return;
                                    }
                                    setIsSaving(true);
                                    try {
                                        const payload = {
                                            id: 'ORD-' + Date.now(),
                                            orderCode: 'ORD-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
                                            ...formData,
                                            createdBy: currentUser?.username || 'system',
                                            createdAt: new Date().toISOString(),
                                            status: 'DRAFT',
                                            ticketsGenerated: false
                                        };
                                        await api.createOrder(payload);
                                        alert('Đã lưu đơn hàng nháp.');
                                        onSuccess();
                                        onClose();
                                    } catch (err) {
                                        console.error("Error saving draft:", err);
                                        alert("Đã xảy ra lỗi khi lưu nháp.");
                                    } finally {
                                        setIsSaving(false);
                                    }
                                }}
                                className="flex items-center gap-2 px-6 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-lg border border-slate-300 hover:bg-slate-200 transition-colors shadow-sm disabled:opacity-50"
                            >
                                <FileText size={18} />
                                Lưu nháp
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="flex items-center gap-2 px-8 py-2.5 bg-blue-700 text-white font-bold rounded-lg hover:bg-blue-800 shadow-md hover:shadow-lg transition-all active:scale-95 disabled:bg-slate-400"
                            >
                                <Save size={18} />
                                {isSaving ? 'Đang tạo Đơn...' : 'Tạo Đơn Hàng'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
