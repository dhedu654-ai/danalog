import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Save, Send, Camera } from 'lucide-react';

export default function CreateTicket() {
    const navigate = useNavigate();
    const location = useLocation();
    const { addTicket, updateTicket, lastLicensePlate, mockMetadata } = useAppContext();
    const hasAskedPlate = useRef(false);

    // Check for edit mode
    const editingTicket = location.state?.ticket || null;

    if (!mockMetadata) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>;

    const [formData, setFormData] = useState({
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        licensePlate: '',
        customerId: '',
        customerName: '',
        routeId: '',
        route: '',
        containerNo: '',
        containerSize: '40',
        containerType: 'F',
        containerImage: null,
        tripCount: 1,
        overnightStay: false,
        overnightNights: 0,
        overnightLocation: 'out_city',
        expenses: '',
        notes: ''
    });

    const [availableRoutes, setAvailableRoutes] = useState([]);
    const [containerConfig, setContainerConfig] = useState({ mode: 'manual', requireImage: true });
    const [containerOption, setContainerOption] = useState('input'); // Default to 'input'

    // Filter routes based on startDate and customer
    useEffect(() => {
        if (formData.customerId && mockMetadata?.customers) {
            const customer = mockMetadata.customers.find(c => c.id === formData.customerId);
            if (customer && customer.routes) {
                const validRoutes = customer.routes.filter(r => {
                    if (!r.effectiveDate) return true;
                    return r.effectiveDate <= formData.startDate; // Filter by/before start date
                });
                setAvailableRoutes(validRoutes);
            } else {
                setAvailableRoutes([]);
            }
        } else {
            setAvailableRoutes([]);
        }
    }, [formData.customerId, formData.startDate, mockMetadata]);

    // Init Data for Edit Mode
    useEffect(() => {
        if (editingTicket) {
            // Find customer to populate routes
            const customers = mockMetadata?.customers || [];
            const customer = customers.find(c => c.name === editingTicket.customerName || c.name === editingTicket.customer);
            let custId = '';
            let availableRoutesForCust = [];

            if (customer) {
                custId = customer.id;
                availableRoutesForCust = customer.routes || [];
                // setAvailableRoutes handled by dedicated useEffect
            }

            // Determine container option
            let cOption = 'input';
            if (editingTicket.containerNo === 'Trung chuyển') cOption = 'trungchuyen';
            else if (editingTicket.containerNo === 'Sửa xe') cOption = 'suaxe';
            else if (editingTicket.containerNo === 'Khác') cOption = 'khac';

            setContainerOption(cOption);

            // Helper to safe format date to yyyy-mm-dd
            const safeDate = (d) => {
                try {
                    if (!d) return new Date().toISOString().split('T')[0];
                    const dStr = String(d);
                    if (dStr.includes('T')) return dStr.split('T')[0];
                    return dStr;
                } catch (e) {
                    return new Date().toISOString().split('T')[0];
                }
            };

            const routeObj = availableRoutesForCust.find(r => r.name === editingTicket.route);

            setFormData({
                ...formData,
                startDate: safeDate(editingTicket.startDate || editingTicket.date),
                endDate: safeDate(editingTicket.endDate),
                licensePlate: editingTicket.licensePlate || editingTicket.vehicleId || '',
                customerId: custId,
                customerName: editingTicket.customerName || editingTicket.customer || '',
                routeId: editingTicket.routeId || (routeObj?.id || ''),
                route: editingTicket.route || '',
                containerNo: editingTicket.containerNo || '',
                containerSize: editingTicket.containerSize || '40',
                containerType: editingTicket.containerType || 'F',
                tripCount: editingTicket.tripCount || 1,
                overnightStay: editingTicket.overnightStay || false,
                overnightNights: editingTicket.overnightNights || 0,
                overnightLocation: editingTicket.overnightLocation || 'out_city',
                notes: editingTicket.notes || ''
            });
        }
    }, [editingTicket]);

    // ... existing Prompt for last license plate (only if NOT editing) ...
    // Note: If editingTicket is present, we skip strict empty check or we can just let it overwrite if user wants?
    // Let's assume if editing, we trust the ticket data first.

    // ... (keep useEffect for lastLicensePlate but maybe guard it?)
    useEffect(() => {
        if (!editingTicket && lastLicensePlate && !formData.licensePlate && !hasAskedPlate.current) {
            // ... existing logic ...
            setTimeout(() => {
                if (window.confirm(`Bạn có muốn sử dụng biển số xe cũ "${lastLicensePlate}" không?`)) {
                    setFormData(prev => ({ ...prev, licensePlate: lastLicensePlate }));
                }
            }, 100);
            hasAskedPlate.current = true;
        }
    }, [lastLicensePlate, editingTicket]);

    // ... existing containerOption effect ...
    useEffect(() => {
        // Only override if changing option manually (how to distinguish init? user interaction?)
        // Simple fix: Check if current containerNo matches the option's default, if so, allow update.
        // OR better: Just run it. If user switches to 'Sửa xe', it sets 'Sửa xe'.
        // If loading from edit 'Sửa xe', it sets 'Sửa xe' (same).
        // If loading 'input' and value '123', switching to 'Sửa xe' clears it.
        // This is fine.
        if (containerOption === 'suaxe') {
            setFormData(prev => ({ ...prev, containerNo: 'Sửa xe', containerImage: null }));
        } else if (containerOption === 'trungchuyen') {
            setFormData(prev => ({ ...prev, containerNo: 'Trung chuyển', containerImage: null }));
        } else if (containerOption === 'khac') {
            setFormData(prev => ({ ...prev, containerNo: 'Khác', containerImage: null }));
        } else if (containerOption === 'input') {
            // Check if we are switching FROM a preset TO input?
            // If editingTicket exists and matches preset, and we switch to input, we clear it?
            // Yes, user wants to type manual.
            // If just initializing, we might clear existing edit data?
            // Logic issue: If I edit a ticket with '123' (input), existing effect might clear it if triggered?
            // This effect runs on containerOption change. Initial render sets it.
            // If I set 'input' initially, this runs.
            // We should check if containerNo is already set and valid for 'input' (not a preset string) before clearing?
            // Or just: don't clear if it's already a value?
            // BUT if I switch from 'Sửa xe' (preset) to 'Input', I WANT to clear 'Sửa xe'.

            // Refined Logic:
            // Refined Logic: Clear containerNo only if it is one of the preset values
            // Use functional update to check current state safely
            setFormData(prev => {
                const presets = ['Sửa xe', 'Trung chuyển', 'Khác'];
                if (presets.includes(prev.containerNo)) {
                    return { ...prev, containerNo: '' };
                }
                return prev;
            });
        }
    }, [containerOption]);


    const handleCustomerChange = (e) => {
        const custId = e.target.value;
        const customer = mockMetadata?.customers?.find(c => c.id === custId);

        setFormData({
            ...formData,
            customerId: custId,
            customerName: customer ? customer.name : '',
            routeId: '',
            route: ''
        });

        // Available routes will be updated by useEffect based on customer and startDate
    };

    const handleRouteChange = (e) => {
        const rId = e.target.value;
        const routeObj = availableRoutes.find(r => r.id === rId);

        // Logic for auto-container config based on route
        if (routeObj && routeObj.containerConfig) {
            setContainerConfig(routeObj.containerConfig);
            if (routeObj.containerConfig.mode === 'auto') {
                // Auto set container option appropriately
                // If config value is 'Trung Chuyển', set option 'trungchuyen'
                let cOption = 'input';
                // This logic is a bit loose, relying on loose string matching or manual mapping
                // Assuming 'Trung Chuyển' -> 'trungchuyen'
                if (routeObj.containerConfig.value?.toLowerCase().includes('trung chuyển')) cOption = 'trungchuyen';
                else if (routeObj.containerConfig.value?.toLowerCase().includes('tinh dầu')) cOption = 'khac'; // Or specific logic

                setContainerOption(cOption);
                // The effect will handle setting the containerNo text
            } else {
                setContainerOption('input');
            }
        }

        setFormData({
            ...formData,
            routeId: rId,
            route: routeObj ? routeObj.name : ''
        });
    };

    const handleChange = (e) => {
        const { name, value, type, checked, files } = e.target;

        let newFormData = { ...formData }; // Clone first

        if (type === 'checkbox') {
            newFormData[name] = checked;
        } else if (type === 'file') {
            newFormData[name] = files[0];
        } else {
            newFormData[name] = value;
        }

        // Logic Check: If dates become same, disable overnight
        if (name === 'startDate' || name === 'endDate') {
            const dStart = name === 'startDate' ? value : formData.startDate;
            const dEnd = name === 'endDate' ? value : formData.endDate;
            if (dStart === dEnd) {
                newFormData.overnightStay = false;
                newFormData.overnightNights = 0;
            }
        }

        setFormData(newFormData);
    };

    // ... (Skip to handleSubmit) ...

    // ... handleSubmit impl ...
    const handleSubmit = (action) => {
        // ... (Keep existing validation logic) ...
        const diffDates = (start, end) => {
            const d1 = new Date(start);
            const d2 = new Date(end);
            return Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
        };

        if (action === 'send') {
            const requiredFields = [
                { field: formData.licensePlate, label: 'Biển số xe' },
                { field: formData.customerId, label: 'Khách hàng' },
                { field: formData.routeId, label: 'Tuyến đường' },
                { field: formData.startDate, label: 'Ngày bắt đầu' },
                { field: formData.endDate, label: 'Ngày kết thúc' }
            ];

            for (const item of requiredFields) {
                if (!item.field) {
                    alert(`Vui lòng nhập: ${item.label}`);
                    return;
                }
            }

            // Global check for Container No (must not be empty)
            if (!formData.containerNo) {
                alert('Vui lòng nhập/chọn Số Container');
                return;
            }

            if (containerOption === 'input') {
                // Strict check for image: Must have new file OR existing image in editingTicket
                const hasImage = formData.containerImage || (editingTicket && editingTicket.containerImage);

                if (!hasImage) {
                    alert('Vui lòng chụp ảnh Container');
                    return;
                }
            }

            if (formData.overnightStay) {
                const tripDays = diffDates(formData.startDate, formData.endDate);
                if (parseInt(formData.overnightNights) > tripDays) {
                    alert(`Số đêm lưu trú (${formData.overnightNights}) không được lớn hơn khoảng thời gian chuyến đi (${tripDays} ngày)`);
                    return;
                }
                if (!formData.overnightNights || formData.overnightNights <= 0) {
                    alert('Vui lòng nhập số đêm lưu trú hợp lệ');
                    return;
                }
            }
        }

        const ticketData = {
            ...formData,
            title: `${formData.route} (${formData.containerNo})`,
            status: action === 'send' ? 'sent' : 'draft',
            statusText: action === 'send' ? 'Đã gửi (Chưa duyệt)' : 'Bản nháp',
            customer: formData.customerName,
            containerImage: formData.containerImage ? 'image_placeholder.jpg' : (editingTicket?.containerImage || null)
        };

        if (editingTicket) {
            updateTicket(editingTicket.id, ticketData);
            alert(`Đã cập nhật phiếu ${action === 'send' ? 'và gửi đi' : 'thành công'}!`);
        } else {
            addTicket(ticketData);
            alert(action === 'send' ? 'Đã gửi phiếu thành công!' : 'Đã lưu nháp!');
        }

        navigate('/tickets');
    };

    return (
        <div className="animate-slide-up" style={{ paddingBottom: '80px' }}>
            <header style={{ marginBottom: '1.5rem' }}>
                <h2>Tạo Phiếu Vận Tải</h2>
                <p style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>Điền đầy đủ thông tin chuyến đi</p>
            </header>

            <div className="card">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                        <label className="label">Ngày bắt đầu</label>
                        <input type="date" name="startDate" className="input" value={formData.startDate} onChange={handleChange} />
                    </div>
                    <div>
                        <label className="label">Ngày kết thúc</label>
                        <input type="date" name="endDate" className="input" value={formData.endDate} onChange={handleChange} />
                    </div>
                </div>



                <div style={{ marginTop: '1rem' }}>
                    <label className="label">Biển số xe</label>
                    <input type="text" name="licensePlate" placeholder="59A-123.45" className="input" value={formData.licensePlate} onChange={handleChange} />
                </div>

                <div style={{ marginTop: '1rem' }}>
                    <label className="label">Khách hàng</label>
                    <select name="customerId" className="input" value={formData.customerId} onChange={handleCustomerChange}>
                        <option value="">-- Chọn khách hàng --</option>
                        {mockMetadata && mockMetadata.customers && mockMetadata.customers.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                <div style={{ marginTop: '1rem' }}>
                    <label className="label">Tuyến đường</label>
                    <select name="routeId" className="input" value={formData.routeId} onChange={handleRouteChange} disabled={!formData.customerId}>
                        <option value="">-- Chọn tuyến đường --</option>
                        {availableRoutes && availableRoutes.map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                    </select>
                </div>

                {/* Container Section */}
                <div style={{ marginTop: '1.5rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Thông tin Container</h3>

                    <div style={{ marginBottom: '1rem' }}>
                        <label className="label">Container No.</label>
                        <select
                            className="input"
                            value={containerOption}
                            onChange={(e) => setContainerOption(e.target.value)}
                        >
                            <option value="input">Nhập số Container</option>
                            <option value="trungchuyen">Trung chuyển</option>
                            <option value="suaxe">Sửa xe</option>
                            <option value="khac">Khác</option>
                        </select>
                    </div>

                    {containerOption === 'input' && (
                        <div style={{ marginBottom: '1rem' }}>
                            <input
                                type="text"
                                name="containerNo"
                                placeholder="ABCD 123456"
                                className="input"
                                value={formData.containerNo}
                                onChange={handleChange}
                            />
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                        <div>
                            <label className="label">Size</label>
                            <select name="containerSize" className="input" value={formData.containerSize} onChange={handleChange}>
                                <option value="20">20</option>
                                <option value="40">40</option>
                                <option value="other">Khác</option>
                            </select>
                        </div>
                        <div>
                            <label className="label">F/E</label>
                            <select name="containerType" className="input" value={formData.containerType} onChange={handleChange}>
                                <option value="F">Full (Có hàng)</option>
                                <option value="E">Empty (Rỗng)</option>
                            </select>
                        </div>
                    </div>

                    {/* Show Image Upload only if Option is 'input' */}
                    {containerOption === 'input' && (
                        <div style={{ marginTop: '1rem' }}>
                            <label className="label">Ảnh chụp Container <span style={{ color: 'red' }}>*</span></label>
                            <label className="file-upload-btn" style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                border: '1px dashed #ccc', padding: '1rem', borderRadius: '8px', cursor: 'pointer', justifyContent: 'center'
                            }}>
                                <Camera size={20} />
                                <span>
                                    {
                                        formData.containerImage
                                            ? (typeof formData.containerImage === 'string' ? "Ảnh đã lưu (Tải lại để thay đổi)" : (formData.containerImage?.name || "Ảnh đã chọn"))
                                            : (editingTicket?.containerImage ? "Ảnh đã lưu (Tải lại để thay đổi)" : 'Chụp/Tải ảnh lên')
                                    }
                                </span>
                                <input type="file" name="containerImage" accept="image/*" onChange={handleChange} hidden />
                            </label>
                        </div>
                    )}
                </div>

                {/* Overnight Section */}
                <div style={{ marginTop: '1.5rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', color: formData.startDate === formData.endDate ? '#94a3b8' : 'inherit' }}>
                        <input
                            type="checkbox"
                            name="overnightStay"
                            checked={formData.overnightStay}
                            onChange={handleChange}
                            disabled={formData.startDate === formData.endDate}
                            style={{ width: '18px', height: '18px' }}
                        />
                        Lưu đêm {formData.startDate === formData.endDate && <span style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>(Không khả dụng cho chuyến đi trong ngày)</span>}
                    </label>

                    {formData.overnightStay && (
                        <div className="animate-fade-in" style={{ marginTop: '1rem', paddingLeft: '1rem', borderLeft: '3px solid var(--primary)' }}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label className="label">Số đêm</label>
                                <input type="number" name="overnightNights" className="input" value={formData.overnightNights} onChange={handleChange} min="0" />
                            </div>
                            <div>
                                <span className="label" style={{ display: 'block', marginBottom: '0.5rem' }}>Địa điểm</span>
                                <div style={{ display: 'flex', gap: '1.5rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <input type="radio" name="overnightLocation" value="in_city" checked={formData.overnightLocation === 'in_city'} onChange={handleChange} />
                                        Trong TP
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <input type="radio" name="overnightLocation" value="out_city" checked={formData.overnightLocation === 'out_city'} onChange={handleChange} />
                                        Ngoài TP
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ marginTop: '1.5rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                    <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
                        <label className="label">Số chuyến</label>
                        <input type="number" name="tripCount" className="input" value={formData.tripCount} readOnly style={{ backgroundColor: '#f1f5f9' }} />
                    </div>
                    <label className="label">Ghi chú</label>
                    <textarea name="notes" placeholder="..." className="input" style={{ minHeight: '60px' }} value={formData.notes} onChange={handleChange} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '2rem' }}>
                    <button className="btn btn-secondary" onClick={() => handleSubmit('draft')}>
                        <Save size={18} /> Lưu Nháp
                    </button>
                    <button className="btn btn-primary" onClick={() => handleSubmit('send')}>
                        <Send size={18} /> Gửi Phiếu
                    </button>
                </div>
            </div>
        </div>
    );
}
