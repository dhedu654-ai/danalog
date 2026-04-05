import { useState, useRef, useEffect } from 'react';
import { Camera, X, Save, Send, History, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { TransportTicket, RouteConfig } from '../../types';
import { format } from 'date-fns';
import { compressImage } from '../../utils/imageUtils';

interface CreateTicketMobileProps {
    tickets: TransportTicket[];
    onUpdateTickets: (tickets: any[]) => void;
    onCreateTicket?: (ticket: any) => Promise<void>;
    routeConfigs: RouteConfig[];
    onComplete: () => void;
    ticketToEdit?: TransportTicket | null;
}

export const CreateTicketMobile: React.FC<CreateTicketMobileProps> = ({
    tickets,
    onUpdateTickets,
    onCreateTicket,
    routeConfigs,
    onComplete,
    ticketToEdit
}) => {
    const { user } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Get driver's default plate from user profile
    const userDefaultPlate = user?.licensePlate || '';

    // Get all unique plates from previous tickets of this user, plus the user's profile plate
    const uniquePlates = Array.from(new Set(
        [
            userDefaultPlate, // Add user's profile plate first
            ...tickets
                .filter(t => t.createdBy === user?.username || t.driverName === user?.name)
                .map(t => t.licensePlate)
        ].filter((p): p is string => !!p) // Filter out empty/null
    ));

    // Form State - use user's default plate if creating new ticket
    const [formData, setFormData] = useState({
        dateStart: ticketToEdit?.dateStart || new Date().toISOString().split('T')[0],
        dateEnd: ticketToEdit?.dateEnd || new Date().toISOString().split('T')[0],
        licensePlate: ticketToEdit?.licensePlate || userDefaultPlate,
        customerCode: ticketToEdit?.customerCode || '',
        route: ticketToEdit?.route || '',
        routeId: ticketToEdit?.routeId || '',
        containerNo: ticketToEdit?.containerNo || '',
        size: ticketToEdit?.size || '40' as any,
        fe: ticketToEdit?.fe || 'F' as any,
        trips: ticketToEdit?.trips || 1,
        nightStay: ticketToEdit?.nightStay || false,
        nightStayDays: ticketToEdit?.nightStayDays || 0,
        nightStayLocation: ticketToEdit?.nightStayLocation || 'OUTER_CITY' as any,
        notes: ticketToEdit?.notes || '',
        containerImage: null as File | null,
        containerImagePreview: ticketToEdit?.imageUrl || ''
    });

    const [containerOption, setContainerOption] = useState<'input' | 'trungchuyen' | 'suaxe' | 'khac'>(
        ticketToEdit?.containerNo === 'Trung chuyển' ? 'trungchuyen' :
            ticketToEdit?.containerNo === 'Sửa xe' ? 'suaxe' :
                ticketToEdit?.containerNo === 'Khác' ? 'khac' : 'input'
    );
    const [availableRoutes, setAvailableRoutes] = useState<RouteConfig[]>([]);

    // Filter routes by selected customer
    const customers = Array.from(new Set(routeConfigs.map(c => c.customer))).filter(c => !!c);

    useEffect(() => {
        if (formData.customerCode) {
            const customerRoutes = routeConfigs.filter(r => r.customer === formData.customerCode);
            // Filter by effective date
            const validRoutes = customerRoutes.filter(r => {
                if (!r.effectiveDate) return true;
                // Strict compare using date objects to avoid string issues
                // Assuming formats are YYYY-MM-DD
                return new Date(r.effectiveDate) <= new Date(formData.dateStart);
            });
            setAvailableRoutes(validRoutes);
        } else {
            setAvailableRoutes([]);
        }
    }, [formData.customerCode, formData.dateStart, routeConfigs]);

    useEffect(() => {
        if (containerOption === 'suaxe') setFormData(prev => ({ ...prev, containerNo: 'Sửa xe', containerImage: null, containerImagePreview: '' }));
        else if (containerOption === 'trungchuyen') setFormData(prev => ({ ...prev, containerNo: 'Trung chuyển', containerImage: null, containerImagePreview: '' }));
        else if (containerOption === 'khac') setFormData(prev => ({ ...prev, containerNo: 'Khác', containerImage: null, containerImagePreview: '' }));
        else if (containerOption === 'input' && ['Sửa xe', 'Trung chuyển', 'Khác'].includes(formData.containerNo)) {
            setFormData(prev => ({ ...prev, containerNo: '' }));
        }
    }, [containerOption]);

    // Added: Validation to ensure night stay is valid relative to dates
    useEffect(() => {
        if (formData.dateStart > formData.dateEnd) {
            setFormData(prev => ({ ...prev, dateEnd: prev.dateStart }));
            return;
        }

        if (formData.dateStart === formData.dateEnd) {
            if (formData.nightStay) {
                setFormData(prev => ({ ...prev, nightStay: false, nightStayDays: 0 }));
            }
        }
    }, [formData.dateStart, formData.dateEnd]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            try {
                // Compress image before setting state
                const compressedBase64 = await compressImage(file);
                setFormData(prev => ({
                    ...prev,
                    containerImage: file, // Keep original file object reference (legacy)
                    containerImagePreview: compressedBase64 // Use compressed base64 for preview AND payload
                }));
            } catch (error) {
                console.error("Compression failed", error);
                alert("Lỗi xử lý ảnh. Vui lòng thử lại.");
            }
        }
    };

    const clearImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setFormData(prev => ({
            ...prev,
            containerImage: null,
            containerImagePreview: ''
        }));
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = (status: 'DRAFT' | 'PENDING') => {
        // Validation for PENDING status
        if (status === 'PENDING') {
            if (!formData.licensePlate || !formData.customerCode || !formData.route || !formData.containerNo) {
                alert('Vui lòng điền đầy đủ các thông tin bắt buộc (*)');
                return;
            }

            if (containerOption === 'input' && !formData.containerImage && !formData.containerImagePreview) {
                alert('Vui lòng chụp ảnh/tải ảnh Container');
                return;
            }

            if (formData.nightStay) {
                const start = new Date(formData.dateStart).getTime();
                const end = new Date(formData.dateEnd).getTime();
                const maxDays = Math.floor((end - start) / (1000 * 3600 * 24));

                if (!formData.nightStayDays || formData.nightStayDays <= 0) {
                    alert('Vui lòng nhập số đêm lưu trú hợp lệ');
                    return;
                }

                if (formData.nightStayDays > maxDays) {
                    alert(`Số đêm lưu trú không được lớn hơn khoảng cách ngày (${maxDays} đêm)`);
                    return;
                }
            }
        }

        // Calculate Revenue & Salary based on Config
        let calculatedRevenue = 0;
        let calculatedSalary = 0;

        const selectedRouteConfig = routeConfigs.find(r => r.id === formData.routeId) || routeConfigs.find(r => r.routeName === formData.route);

        if (selectedRouteConfig) {
            const { revenue, salary } = selectedRouteConfig;
            const size = formData.size;
            const fe = formData.fe;

            if (size === '20') {
                calculatedRevenue = fe === 'F' ? revenue.price20F : revenue.price20E;
            } else if (size === '40') {
                calculatedRevenue = fe === 'F' ? revenue.price40F : revenue.price40E;
            } else {
                calculatedRevenue = fe === 'F' ? revenue.price40F : revenue.price40E; // Fallback or 45/40R0 logic
            }

            calculatedSalary = salary.driverSalary || 0;
        }

        if (ticketToEdit) {
            const updatedTicket: TransportTicket = {
                ...ticketToEdit,
                ...formData,
                status,
                createdBy: ticketToEdit.createdBy || user?.username,
                revenue: calculatedRevenue || ticketToEdit.revenue,
                driverSalary: calculatedSalary || ticketToEdit.driverSalary,
                imageUrl: formData.containerImagePreview || ticketToEdit.imageUrl,
                containerImage: formData.containerImage ? formData.containerImage.name : ticketToEdit.containerImage,
                statusHistory: [
                    {
                        status: status,
                        timestamp: format(new Date(), 'HH:mm dd/MM/yy'),
                        user: user?.name || user?.username || 'Driver',
                        action: status === 'DRAFT' ? 'Cập nhật bản nháp' : 'Gửi lại phiếu chờ duyệt'
                    },
                    ...(ticketToEdit.statusHistory || [])
                ]
            };
            onUpdateTickets(tickets.map(t => t.id === ticketToEdit.id ? updatedTicket : t));
            alert('Cập nhật thành công');
            onComplete();
        } else {
            const newTicket: TransportTicket = {
                id: `T-${Date.now()}`,
                stt: tickets.length + 1,
                ...formData,
                status,
                driverName: user?.name,
                createdBy: user?.username,
                revenue: calculatedRevenue,
                driverSalary: calculatedSalary,
                imageUrl: formData.containerImagePreview || undefined,
                containerImage: formData.containerImage ? formData.containerImage.name : undefined,
                statusHistory: [
                    {
                        status: status,
                        timestamp: format(new Date(), 'HH:mm dd/MM/yy'),
                        user: user?.name || user?.username || 'Driver',
                        action: status === 'DRAFT' ? 'Lưu nháp' : 'Khởi tạo phiếu'
                    }
                ]
            };

            setIsSubmitting(true);

            // Prefer optimized single-create if available
            if (onCreateTicket) {
                onCreateTicket(newTicket)
                    .then(() => {
                        alert(status === 'DRAFT' ? 'Đã lưu bản nháp' : 'Đã gửi phiếu thành công');
                        onComplete();
                    })
                    .catch(() => {
                        alert('Có lỗi xảy ra khi lưu phiếu. Vui lòng thử lại.');
                        setIsSubmitting(false);
                    });
            } else {
                // Fallback to bulk update
                try {
                    onUpdateTickets([newTicket, ...tickets]);
                    alert(status === 'DRAFT' ? 'Đã lưu bản nháp' : 'Đã gửi phiếu thành công');
                    onComplete();
                } catch (e) {
                    setIsSubmitting(false);
                }
            }
        }
    };


    // Helper to format license plate
    const formatLicensePlate = (value: string) => {
        const clean = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

        if (clean.length > 3) {
            let formatted = clean.slice(0, 3) + '-' + clean.slice(3);
            if (clean.length > 6) {
                // 43C-123.45 format
                formatted = clean.slice(0, 3) + '-' + clean.slice(3, 6) + '.' + clean.slice(6, 8);
            }
            return formatted;
        }
        return clean;
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-20">
            <header className="mb-2">
                <h2 className="text-xl font-bold text-slate-800">{ticketToEdit ? 'Chỉnh Sửa Phiếu' : 'Tạo Phiếu Vận Tải'}</h2>
                <p className="text-xs text-slate-500 italic mt-0.5">{ticketToEdit ? 'Cập nhật lại thông tin bản nháp' : 'Vui lòng nhập đầy đủ thông tin chuyến đi'}</p>
            </header>

            {/* Date and Basic Info Section */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wide">
                    <span className="w-1.5 h-4 bg-blue-600 rounded-full"></span>
                    Thông tin chuyến đi
                </h3>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Ngày bắt đầu</label>
                            <input
                                type="date"
                                value={formData.dateStart}
                                onChange={e => setFormData({ ...formData, dateStart: e.target.value })}
                                className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Ngày kết thúc</label>
                            <input
                                type="date"
                                value={formData.dateEnd}
                                onChange={e => setFormData({ ...formData, dateEnd: e.target.value })}
                                className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Biển số xe</label>
                        <input
                            type="text"
                            placeholder="59A-123.45"
                            value={formData.licensePlate}
                            onChange={e => setFormData({ ...formData, licensePlate: formatLicensePlate(e.target.value) })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold tracking-wider focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                        {uniquePlates.length > 0 && !formData.licensePlate && !ticketToEdit && (
                            <div className="mt-3">
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-2">
                                    <History size={14} />
                                    <span>Lịch sử biển số:</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {uniquePlates.map(plate => (
                                        <button
                                            key={plate}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, licensePlate: plate }))}
                                            className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold border border-blue-100 active:scale-95 transition-all hover:bg-blue-100"
                                        >
                                            {plate}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Khách hàng</label>
                        <select
                            value={formData.customerCode}
                            onChange={e => setFormData({ ...formData, customerCode: e.target.value, route: '', routeId: '' })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none"
                        >
                            <option value="">-- Chọn khách hàng --</option>
                            {customers.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tuyến đường</label>
                        <select
                            value={formData.routeId}
                            disabled={!formData.customerCode}
                            onChange={e => {
                                const r = availableRoutes.find(x => x.id === e.target.value);
                                if (r) setFormData({ ...formData, routeId: r.id, route: r.routeName });
                            }}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50 transition-all appearance-none"
                        >
                            <option value="">-- Chọn tuyến đường --</option>
                            {availableRoutes.map(r => <option key={r.id} value={r.id}>{r.routeName}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Container Section */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wide">
                    <span className="w-1.5 h-4 bg-orange-500 rounded-full"></span>
                    Thông tin Container
                </h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Container No.</label>
                        <select
                            value={containerOption}
                            onChange={e => setContainerOption(e.target.value as any)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                        >
                            <option value="input">Nhập số Container</option>
                            <option value="trungchuyen">Trung chuyển</option>
                            <option value="suaxe">Sửa xe</option>
                            <option value="khac">Khác</option>
                        </select>
                    </div>

                    {containerOption === 'input' && (
                        <div>
                            <input
                                type="text"
                                placeholder="ABCD123456"
                                value={formData.containerNo}
                                onChange={e => setFormData({ ...formData, containerNo: e.target.value.toUpperCase() })}
                                className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm font-mono font-bold tracking-widest outline-none transition-all ${formData.containerNo.includes(' ')
                                    ? 'border-red-500 text-red-500 focus:ring-2 focus:ring-red-500 bg-red-50'
                                    : 'border-slate-200 focus:ring-2 focus:ring-orange-500'
                                    }`}
                            />
                            {formData.containerNo.includes(' ') && (
                                <p className="mt-1 text-[10px] font-bold text-red-500 animate-pulse">
                                    * Số Container không được chứa khoảng trắng
                                </p>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Size</label>
                            <select
                                value={formData.size}
                                onChange={e => setFormData({ ...formData, size: e.target.value as any })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                            >
                                <option value="20">20</option>
                                <option value="40">40</option>
                                <option value="other">Khác</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">F/E</label>
                            <select
                                value={formData.fe}
                                onChange={e => setFormData({ ...formData, fe: e.target.value as any })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                            >
                                <option value="F">Full (Có hàng)</option>
                                <option value="E">Empty (Rỗng)</option>
                            </select>
                        </div>
                    </div>

                    {containerOption === 'input' && (
                        <div className="mt-2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Ảnh chụp Container *</label>
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="relative h-40 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 flex flex-col items-center justify-center gap-2 text-slate-400 overflow-hidden active:bg-slate-100 transition-all cursor-pointer"
                            >
                                {formData.containerImagePreview ? (
                                    <>
                                        <img src={formData.containerImagePreview} alt="Container" className="w-full h-full object-cover" />
                                        <button
                                            onClick={clearImage}
                                            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg"
                                        >
                                            <X size={16} />
                                        </button>
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white py-1 px-3 text-[10px] font-bold">
                                            {formData.containerImage?.name}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <Camera size={36} className="text-slate-300" />
                                        <span className="text-xs font-bold text-slate-500">Chụp hoặc tải ảnh lên</span>
                                        <span className="text-[9px] uppercase tracking-wider text-red-400 font-bold underline">Bắt buộc đối với Container</span>
                                    </>
                                )}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Overnight Section */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide">
                        <span className="w-1.5 h-4 bg-purple-500 rounded-full"></span>
                        Lưu đêm
                    </h3>
                    <div
                        className={`w-12 h-6 rounded-full relative transition-all cursor-pointer ${formData.nightStay ? 'bg-purple-600' : 'bg-slate-200'} `}
                        onClick={() => {
                            if (formData.dateStart !== formData.dateEnd) {
                                setFormData({ ...formData, nightStay: !formData.nightStay });
                            } else {
                                alert('Không thể chọn lưu đêm cho chuyến đi trong ngày.');
                            }
                        }}
                    >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.nightStay ? 'left-7' : 'left-1'} `}></div>
                    </div>
                </div>

                {formData.nightStay && (
                    <div className="space-y-4 pt-2 border-t border-slate-50 animate-in fade-in duration-300">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Số đêm</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={formData.nightStayDays}
                                    onChange={e => {
                                        const val = parseInt(e.target.value) || 0;
                                        const start = new Date(formData.dateStart).getTime();
                                        const end = new Date(formData.dateEnd).getTime();
                                        const maxDays = Math.floor((end - start) / (1000 * 3600 * 24));

                                        if (val > maxDays) {
                                            alert(`Số đêm không được vượt quá ${maxDays} đêm`);
                                            setFormData({ ...formData, nightStayDays: maxDays });
                                        } else {
                                            setFormData({ ...formData, nightStayDays: val });
                                        }
                                    }}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Địa điểm</label>
                                <select
                                    value={formData.nightStayLocation}
                                    onChange={e => setFormData({ ...formData, nightStayLocation: e.target.value as any })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-purple-500 outline-none transition-all appearance-none"
                                >
                                    <option value="INNER_CITY">Trong TP</option>
                                    <option value="OUTER_CITY">Ngoài TP</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Notes Section */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2 uppercase tracking-wide">
                    <span className="w-1.5 h-4 bg-slate-400 rounded-full"></span>
                    Ghi chú
                </h3>
                <textarea
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Nhập ghi chú quan trọng cho CS..."
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm min-h-[100px] focus:ring-2 focus:ring-slate-400 outline-none transition-all"
                />
            </div>

            {/* Submit Buttons */}
            <div className="flex flex-col gap-3 pt-2 pb-8">
                <button
                    onClick={() => handleSubmit('PENDING')}
                    disabled={isSubmitting}
                    className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-200 flex items-center justify-center gap-2 active:scale-95 transition-all text-base uppercase tracking-wider disabled:opacity-50"
                >
                    {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                    GỬI PHIẾU NGAY
                </button>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => handleSubmit('DRAFT')}
                        disabled={isSubmitting}
                        className="w-full bg-white text-slate-600 font-bold py-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center gap-2 active:bg-slate-50 transition-all text-sm uppercase disabled:opacity-50"
                    >
                        {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        LƯU NHÁP
                    </button>
                    <button
                        onClick={() => onComplete()}
                        className="w-full bg-slate-100 text-slate-500 font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 active:bg-slate-200 transition-all text-sm uppercase"
                    >
                        <X size={18} />
                        HỦY BỎ
                    </button>
                </div>
            </div>
        </div>
    );
};
