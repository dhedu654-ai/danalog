import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Filter, Calendar, ChevronRight, X, Edit, CheckCircle, Clock, FileText, PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TicketList() {
    const { tickets, updateTicket, user } = useAppContext();
    const navigate = useNavigate();

    const [filterStatus, setFilterStatus] = useState('all');
    const [filterTime, setFilterTime] = useState('month');
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // Current month YYYY-MM
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    const [selectedTicket, setSelectedTicket] = useState(null);

    // Filter Logic
    const filteredTickets = useMemo(() => {
        return tickets.filter(ticket => {
            // User Filter
            if (user && ticket.createdBy !== user.username) return false;

            // Status Filter
            // Reverted: User wants to see approved tickets in 'all' view
            // if (filterStatus === 'all' && (ticket.status === 'approved' || ticket.status?.toLowerCase() === 'approved')) return false; 
            if (filterStatus === 'draft' && ticket.status !== 'draft') return false;
            if (filterStatus === 'sent' && ticket.status !== 'sent') return false;
            if (filterStatus === 'approved' && ticket.status !== 'approved') return false;

            // Time Filter
            // User request: filter by End Date
            const tDate = ticket.endDate || ticket.startDate || ticket.date;
            const ticketDate = new Date(tDate);

            if (filterTime === 'month') {
                return tDate && tDate.startsWith(selectedMonth);
            } else if (filterTime === 'range') {
                if (dateRange.start && ticketDate < new Date(dateRange.start)) return false;
                if (dateRange.end && ticketDate > new Date(dateRange.end)) return false;
            }
            return true;
        }).sort((a, b) => new Date(b.endDate || b.startDate || b.date) - new Date(a.endDate || a.startDate || a.date));
    }, [tickets, filterStatus, filterTime, selectedMonth, dateRange]);

    const handleEdit = (ticket) => {
        navigate('/create', { state: { ticket } });
    };

    const handleSendDraft = (ticket) => {
        // Validation Logic
        if (!ticket.licensePlate) { alert('Thiếu thông tin: Biển số xe'); return; }
        if (!ticket.customerId) { alert('Thiếu thông tin: Khách hàng'); return; }
        if (!ticket.routeId) { alert('Thiếu thông tin: Tuyến đường'); return; }
        if (!ticket.startDate) { alert('Thiếu thông tin: Ngày bắt đầu'); return; }
        if (!ticket.endDate) { alert('Thiếu thông tin: Ngày kết thúc'); return; }
        if (!ticket.containerNo) { alert('Thiếu thông tin: Số Container'); return; }

        // Logic check for Container Image (required unless preset)
        const presets = ['Sửa xe', 'Trung chuyển', 'Khác'];
        if (!presets.includes(ticket.containerNo) && !ticket.containerImage) {
            alert('Thiếu thông tin: Ảnh container');
            return;
        }

        // Logic check for Overnight
        const d1Str = ticket.startDate || ticket.date;
        const d2Str = ticket.endDate;
        // Simple string compare for same day (YYYY-MM-DD)
        if (d1Str === d2Str && ticket.overnightStay) {
            alert('Không thể chọn LƯU ĐÊM nếu ngày đi và về cùng ngày.');
            return;
        }

        if (ticket.overnightStay) {
            const d1 = new Date(ticket.startDate || ticket.date);
            const d2 = new Date(ticket.endDate);
            const tripDays = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));

            if (!ticket.overnightNights || ticket.overnightNights <= 0) {
                alert('Số đêm lưu trú không hợp lệ'); return;
            }
            if (parseInt(ticket.overnightNights) > tripDays) {
                alert(`Số đêm lưu trú (${ticket.overnightNights}) không được lớn hơn thời gian chuyến đi (${tripDays} ngày)`);
                return;
            }
        }

        if (window.confirm('Thông tin đã đầy đủ. Gửi phiếu này lên hệ thống?')) {
            updateTicket(ticket.id, { status: 'sent', statusText: 'Đã gửi (Chưa duyệt)' });
            setSelectedTicket(null);
            alert('Đã gửi phiếu thành công!');
        }
    };





    // Helper for dd/mm/yyyy
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('en-GB'); // dd/mm/yyyy
    };

    if (selectedTicket) {
        return (
            <div className="animate-slide-up">
                <header style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <button onClick={() => setSelectedTicket(null)} style={{ background: 'none', border: 'none', padding: 0 }}>
                        <X size={24} />
                    </button>
                    <h3>Chi tiết phiếu</h3>
                </header>

                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{ticketDisplayName(selectedTicket)}</span>
                        <StatusBadge status={selectedTicket.status} />
                    </div>

                    <DetailRow label="Ngày bắt đầu" value={formatDate(selectedTicket.startDate || selectedTicket.date)} />
                    {selectedTicket.endDate && <DetailRow label="Ngày kết thúc" value={formatDate(selectedTicket.endDate)} />}
                    <DetailRow label="Khách hàng" value={selectedTicket.customer || '-'} />
                    <DetailRow label="Biển số" value={selectedTicket.licensePlate || selectedTicket.vehicleId} />
                    <DetailRow label="Tuyến đường" value={selectedTicket.route} />
                    <DetailRow label="Container No." value={`${selectedTicket.containerNo || '-'} (${selectedTicket.containerSize || ''}')`} />
                    <DetailRow label="F/E" value={selectedTicket.containerType === 'E' ? 'Empty' : 'Full'} />
                    <DetailRow
                        label="Lưu đêm"
                        value={selectedTicket.overnightStay
                            ? `${selectedTicket.overnightNights} đêm (${selectedTicket.overnightLocation === 'in_city' ? 'Trong TP' : 'Ngoài TP'})`
                            : 'Không'}
                    />


                    <div style={{ marginTop: '1rem' }}>
                        <label className="label">Ghi chú</label>
                        <p style={{ background: '#f1f5f9', padding: '0.75rem', borderRadius: '8px' }}>
                            {selectedTicket.notes || 'Không có ghi chú'}
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                        {selectedTicket.status === 'draft' && (
                            <>
                                <button className="btn btn-primary" onClick={() => handleSendDraft(selectedTicket)}>
                                    <Clock size={18} /> Gửi ngay
                                </button>
                                <button className="btn btn-secondary" onClick={() => handleEdit(selectedTicket)}>
                                    <Edit size={18} /> Sửa
                                </button>
                            </>
                        )}

                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-slide-up">
            <header style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Danh sách phiếu</h2>
                <button
                    onClick={() => navigate('/create')}
                    className="btn btn-primary"
                    style={{ padding: '6px 12px', borderRadius: '16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                    <PlusCircle size={16} /> Tạo mới
                </button>
            </header>

            {/* Filter Controls */}
            <div className="card" style={{ padding: '0.75rem', gap: '0.5rem', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '4px' }}>
                    <FilterBtn label="Tất cả" active={filterStatus === 'all'} onClick={() => setFilterStatus('all')} />
                    <FilterBtn label="Bản nháp" active={filterStatus === 'draft'} onClick={() => setFilterStatus('draft')} />
                    <FilterBtn label="Chưa duyệt" active={filterStatus === 'sent'} onClick={() => setFilterStatus('sent')} />
                    <FilterBtn label="Đã duyệt" active={filterStatus === 'approved'} onClick={() => setFilterStatus('approved')} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.9rem' }}>
                    <Calendar size={16} color="var(--primary)" />
                    <select
                        value={filterTime}
                        onChange={(e) => setFilterTime(e.target.value)}
                        style={{ padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    >
                        <option value="range">Khoảng thời gian</option>
                        <option value="month">Theo Tháng</option>
                    </select>

                    {filterTime === 'range' ? (
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <input type="date" value={dateRange.start} onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))} style={{ maxWidth: '90px' }} />
                            -
                            <input type="date" value={dateRange.end} onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))} style={{ maxWidth: '90px' }} />
                        </div>
                    ) : (
                            <select
                                value={selectedMonth.split('-')[1]}
                                onChange={(e) => setSelectedMonth(prev => `${prev.split('-')[0]}-${e.target.value}`)}
                                style={{ padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                            >
                                {['12', '11', '10', '09', '08', '07', '06', '05', '04', '03', '02', '01'].map(m => (
                                    <option key={m} value={m}>Tháng {m}</option>
                                ))}
                            </select>
                            <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} style={{ padding: '4px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                        </div>
                    )}
            </div>
        </div>

            {/* List */ }
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {filteredTickets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-light)' }}>
                <FileText size={48} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                <p>Không tìm thấy phiếu nào</p>
            </div>
        ) : (
            filteredTickets.map(ticket => (
                <div key={ticket.id} className="card" onClick={() => setSelectedTicket(ticket)} style={{ marginBottom: 0, cursor: 'pointer', padding: '0.75rem 1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div style={{ flex: 1 }}>
                            <h4 style={{ marginBottom: '6px', fontSize: '1rem' }}>{ticket.route}</h4>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-light)', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                                <span style={{ fontWeight: 500, color: '#334155' }}>
                                    {ticket.endDate ? `Kết thúc: ${formatDate(ticket.endDate)}` : formatDate(ticket.startDate || ticket.date)}
                                </span>
                                <span style={{ color: '#cbd5e1' }}>|</span>
                                <span>{ticket.containerSize ? `${ticket.containerSize}'` : '-'}</span>
                                <span style={{ color: '#cbd5e1' }}>|</span>
                                <span>{ticket.containerType === 'E' ? 'Empty' : (ticket.containerType === 'F' ? 'Full' : '-')}</span>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>
                                {ticket.licensePlate || ticket.vehicleId}
                            </div>
                        </div>
                        <div style={{ marginLeft: '8px' }}>
                            <StatusBadge status={ticket.status} />
                        </div>
                    </div>
                </div>
            ))
        )}
    </div>
        </div >
    );
}

function StatusBadge({ status }) {
    let className = 'badge ';
    let text = '';
    let icon = null;

    if (status === 'draft') {
        className += 'badge-draft';
        text = 'Bản nháp';
        icon = <Edit size={12} style={{ marginRight: 4 }} />;
    } else if (status === 'sent') {
        // Randomize approved/pending for demo purpose? Or just keep pending. 
        // Let's keep it 'pending' generally, unless we add a mock approve button.
        // For now, strict logic: 'sent' is 'Pending' unless we have an 'approved' field.
        className += 'badge-pending';
        text = 'Chưa duyệt';
        icon = <Clock size={12} style={{ marginRight: 4 }} />;
    } else if (status === 'approved') {
        className += 'badge-approved';
        text = 'Đã duyệt';
        icon = <CheckCircle size={12} style={{ marginRight: 4 }} />;
    }

    return <span className={className} style={{ display: 'flex', alignItems: 'center' }}>{icon}{text}</span>;
}

function DetailRow({ label, value }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ color: 'var(--text-light)' }}>{label}</span>
            <span style={{ fontWeight: 500 }}>{value}</span>
        </div>
    );
}

function FilterBtn({ label, active, onClick }) {
    return (
        <button
            onClick={onClick}
            style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '20px',
                border: active ? 'none' : '1px solid #e2e8f0',
                background: active ? 'var(--primary)' : 'white',
                color: active ? 'white' : 'var(--text)',
                fontSize: '0.85rem',
                whiteSpace: 'nowrap',
                cursor: 'pointer'
            }}
        >
            {label}
        </button>
    );
}

function ticketDisplayName(ticket) {
    if (ticket.title) return ticket.title;
    return ticket.route;
}
