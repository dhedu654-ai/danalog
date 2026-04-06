import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Calendar, ChevronRight, ArrowLeft, User, Truck, DollarSign } from 'lucide-react';

export default function SalarySlip() {
    const { tickets, lastLicensePlate, mockMetadata, user, isSalaryPublished, loading } = useAppContext();
    const [viewMode, setViewMode] = useState('list'); // 'list' | 'detail'
    const [selectedMonth, setSelectedMonth] = useState(null);
    const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
    const [filterMonth, setFilterMonth] = useState('');

    const formatMoney = (amount) => {
        return amount.toLocaleString('vi-VN') + ' đ';
    };

    // --- Data Logic ---
    // Filter tickets for the current user only
    const userTickets = useMemo(() => {
        if (!user) return [];
        return tickets.filter(t => t.createdBy === user.username);
    }, [tickets, user]);

    const allRoutes = useMemo(() => {
        const routes = [];
        mockMetadata.customers.forEach(c => {
            c.routes.forEach(r => routes.push(r));
        });
        return routes;
    }, [mockMetadata]);

    const getRoutePrice = (routeId) => {
        const r = allRoutes.find(x => x.id === routeId);
        return r ? r.price : 0;
    };

    // Helper to calculate total for a specific month (used for list preview and detail)
    const calculateMonthSalary = (monthStr) => {
        const monthTickets = userTickets.filter(t => {
            const d = t.startDate || t.date;
            return d && d.startsWith(monthStr) && t.status === 'approved';
        });

        // Route Income
        const routeGrouping = {};
        monthTickets.forEach(t => {
            if (!t.routeId) return;
            const rId = t.routeId;
            if (!routeGrouping[rId]) {
                routeGrouping[rId] = {
                    name: t.route,
                    count: 0,
                    price: getRoutePrice(rId),
                    total: 0
                };
            }
            const count = parseInt(t.tripCount || 1);
            routeGrouping[rId].count += count;
            routeGrouping[rId].total += count * routeGrouping[rId].price;
        });
        const totalRouteIncome = Object.values(routeGrouping).reduce((sum, item) => sum + item.total, 0);

        // Overnight Income
        let totalOvernight = 0;
        const overnightDetails = [];
        const inCityTickets = monthTickets.filter(t => t.overnightStay && t.overnightLocation === 'in_city');
        const inCityNights = inCityTickets.reduce((sum, t) => sum + parseInt(t.overnightNights || 0), 0);
        if (inCityNights > 0) {
            const total = inCityNights * mockMetadata.overnightRates.in_city;
            totalOvernight += total;
            overnightDetails.push({ name: 'Lưu đêm (Trong TP)', quantity: inCityNights, price: mockMetadata.overnightRates.in_city, total });
        }

        const outCityTickets = monthTickets.filter(t => t.overnightStay && t.overnightLocation === 'out_city');
        const outCityNights = outCityTickets.reduce((sum, t) => sum + parseInt(t.overnightNights || 0), 0);
        if (outCityNights > 0) {
            const total = outCityNights * mockMetadata.overnightRates.out_city;
            totalOvernight += total;
            overnightDetails.push({ name: 'Lưu đêm (Ngoài TP)', quantity: outCityNights, price: mockMetadata.overnightRates.out_city, total });
        }

        return {
            month: monthStr,
            tripCount: monthTickets.length,
            routeDetails: Object.values(routeGrouping),
            overnightDetails,
            grandTotal: totalRouteIncome + totalOvernight
        };
    };

    // Extract available months from tickets based on PUBLISHED status
    const availableMonths = useMemo(() => {
        const months = new Set();
        userTickets.forEach(t => {
            const d = t.startDate || t.date;
            // Check if ticket month is published
            if (d && t.status === 'approved') {
                const mStr = d.slice(0, 7); // YYYY-MM
                // Logic: Only show if published
                if (isSalaryPublished(user.username, mStr)) {
                    months.add(mStr);
                }
            }
        });

        let list = Array.from(months).sort().reverse();

        // Apply filters
        if (filterYear) {
            list = list.filter(m => m.startsWith(filterYear));
        }
        if (filterMonth) {
            list = list.filter(m => m.endsWith(`-${filterMonth.padStart(2, '0')}`));
        }
        return list;
    }, [userTickets, filterYear, filterMonth, user, isSalaryPublished]);

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Đang tải dữ liệu...</div>;


    // --- View Handling ---

    const handleSelectMonth = (month) => {
        setSelectedMonth(month);
        setViewMode('detail');
    };

    const handleBack = () => {
        setViewMode('list');
        setSelectedMonth(null);
    };

    // --- Render List View ---
    if (viewMode === 'list') {
        const currentYear = new Date().getFullYear();
        const years = [currentYear, currentYear - 1];

        return (
            <div className="animate-slide-up">
                <header style={{ marginBottom: '1.5rem' }}>
                    <h2>Bảng Lương</h2>
                    <p style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>Phiếu lương đã được công ty gửi</p>

                    {/* Improved Filters */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                        <div>
                            <label className="label" style={{ marginBottom: '4px' }}>Năm</label>
                            <select
                                className="input"
                                value={filterYear}
                                onChange={(e) => setFilterYear(e.target.value)}
                            >
                                <option value="">Tất cả</option>
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label" style={{ marginBottom: '4px' }}>Tháng</label>
                            <select
                                className="input"
                                value={filterMonth}
                                onChange={(e) => setFilterMonth(e.target.value)}
                            >
                                <option value="">Tất cả</option>
                                {[12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(m => (
                                    <option key={m} value={m.toString().padStart(2, '0')}>Tháng {m}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </header>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {availableMonths.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-light)' }}>
                            <p>Chưa có phiếu lương nào được gửi.</p>
                        </div>
                    ) : (
                        availableMonths.map(month => {
                            const data = calculateMonthSalary(month);
                            return (
                                <div key={month} className="card" onClick={() => handleSelectMonth(month)} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{ background: 'var(--primary-light)', padding: '0.75rem', borderRadius: '8px', color: 'var(--primary)' }}>
                                            <Calendar size={24} />
                                        </div>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Tháng {month.split('-').reverse().join('/')}</h3>
                                            <span style={{ fontSize: '0.9rem', color: 'var(--text-light)' }}>{data.tripCount} chuyến</span>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '1.1rem' }}>{formatMoney(data.grandTotal)}</div>
                                        <ChevronRight size={20} color="#cbd5e1" style={{ display: 'inline-block', verticalAlign: 'middle' }} />
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        );
    }

    // --- Render Detail View ---
    const salaryData = calculateMonthSalary(selectedMonth);

    return (
        <div className="animate-slide-up" style={{ paddingBottom: '80px' }}>
            <header style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button onClick={handleBack} style={{ background: 'none', border: 'none', padding: '0.5rem', cursor: 'pointer', marginLeft: '-0.5rem' }}>
                    <ArrowLeft size={24} />
                </button>
                <h2 style={{ margin: 0 }}>Lương Tháng {selectedMonth.split('-').reverse().join('/')}</h2>
            </header>

            {/* Driver Info */}
            <div className="card" style={{ background: 'linear-gradient(to right, #f8fafc, #fff)' }}>
                <div style={{ display: 'flex', gap: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ background: '#e2e8f0', padding: '8px', borderRadius: '50%' }}>
                            <User size={20} color="#475569" />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Tài xế</div>
                            <div style={{ fontWeight: 600 }}>Nguyễn Văn A</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ background: '#e2e8f0', padding: '8px', borderRadius: '50%' }}>
                            <Truck size={20} color="#475569" />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Biển số</div>
                            <div style={{ fontWeight: 600 }}>{lastLicensePlate || '---'}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card">
                {/* Summary Header */}
                <div style={{ textAlign: 'center', padding: '1rem 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-light)', display: 'block', marginBottom: '0.5rem' }}>TỔNG THỰC LĨNH</span>
                    <h1 style={{ color: 'var(--primary)', fontSize: '2rem', margin: 0 }}>
                        {formatMoney(salaryData.grandTotal)}
                    </h1>
                </div>

                <div style={{ marginTop: '1rem' }}>
                    <h4 style={{ marginBottom: '0.75rem', fontSize: '0.95rem', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Chi tiết chạy xe</h4>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', color: '#64748b' }}>
                                    <th style={{ textAlign: 'left', padding: '8px', borderRadius: '4px 0 0 4px' }}>Tuyến đường</th>
                                    <th style={{ textAlign: 'center', padding: '8px' }}>SLC</th>
                                    <th style={{ textAlign: 'right', padding: '8px' }}>Đơn giá</th>
                                    <th style={{ textAlign: 'right', padding: '8px', borderRadius: '0 4px 4px 0' }}>Thành tiền</th>
                                </tr>
                            </thead>
                            <tbody>
                                {salaryData.routeDetails.map((item, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '8px' }}>{item.name}</td>
                                        <td style={{ textAlign: 'center', padding: '8px' }}>{item.count}</td>
                                        <td style={{ textAlign: 'right', padding: '8px' }}>{item.price.toLocaleString()}</td>
                                        <td style={{ textAlign: 'right', padding: '8px', fontWeight: 500 }}>{item.total.toLocaleString()}</td>
                                    </tr>
                                ))}
                                {salaryData.routeDetails.length === 0 && (
                                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: '1rem', color: '#94a3b8' }}>Chưa có chuyến nào</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {salaryData.overnightDetails.length > 0 && (
                        <>
                            <h4 style={{ marginTop: '1.5rem', marginBottom: '0.75rem', fontSize: '0.95rem', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Phụ cấp lưu đêm</h4>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc', color: '#64748b' }}>
                                        <th style={{ textAlign: 'left', padding: '8px', borderRadius: '4px 0 0 4px' }}>Loại</th>
                                        <th style={{ textAlign: 'center', padding: '8px' }}>Số đêm</th>
                                        <th style={{ textAlign: 'right', padding: '8px' }}>Đơn giá</th>
                                        <th style={{ textAlign: 'right', padding: '8px', borderRadius: '0 4px 4px 0' }}>Thành tiền</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {salaryData.overnightDetails.map((item, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '8px' }}>{item.name}</td>
                                            <td style={{ textAlign: 'center', padding: '8px' }}>{item.quantity}</td>
                                            <td style={{ textAlign: 'right', padding: '8px' }}>{item.price.toLocaleString()}</td>
                                            <td style={{ textAlign: 'right', padding: '8px', fontWeight: 500 }}>{item.total.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
