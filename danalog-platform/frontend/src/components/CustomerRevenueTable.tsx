import { useState, useMemo } from 'react';
import { TransportTicket } from '../types';
import { Download, Filter, User } from 'lucide-react';
import { format, parseISO, isWithinInterval } from 'date-fns';
import XLSX from 'xlsx-js-style';

export function CustomerRevenueTable({ tickets }: { tickets: TransportTicket[] }) {
    const [filters, setFilters] = useState({
        customer: '',
        month: '',
        year: new Date().getFullYear().toString(),
        fromDate: '',
        toDate: ''
    });

    const uniqueCustomers = useMemo(() => {
        const approvedTickets = tickets.filter(t => t.status === 'APPROVED');
        const customers = new Set(approvedTickets.map(t => t.customerCode).filter(Boolean));
        return Array.from(customers).sort();
    }, [tickets]);

    const filteredTickets = useMemo(() => {
        return tickets.filter(ticket => {
            // Must be APPROVED
            if (ticket.status !== 'APPROVED') return false;

            // Customer Filter
            if (filters.customer && filters.customer !== 'Tất cả') {
                if (ticket.customerCode !== filters.customer) return false;
            }

            // Date Range
            if (filters.fromDate && filters.toDate) {
                const start = parseISO(filters.fromDate);
                const end = parseISO(filters.toDate);
                const ticketDate = parseISO(ticket.dateEnd);
                if (!isWithinInterval(ticketDate, { start, end })) return false;
            }

            // Month & Year Filter
            // Case 1: Both Month and Year selected -> Exact Month/Year match
            if (filters.month && filters.year) {
                const date = parseISO(ticket.dateEnd);
                if ((date.getMonth() + 1).toString() !== filters.month || date.getFullYear().toString() !== filters.year) return false;
            }
            // Case 2: Only Year selected (Month is empty/"All") -> Match Year only
            else if (!filters.month && filters.year) {
                const date = parseISO(ticket.dateEnd);
                if (date.getFullYear().toString() !== filters.year) return false;
            }
            // Case 3: Only Month selected (Year is empty/"All") -> Match Month across all years (Valid use case?)
            else if (filters.month && !filters.year) {
                const date = parseISO(ticket.dateEnd);
                if ((date.getMonth() + 1).toString() !== filters.month) return false;
            }

            return true;
        }).sort((a, b) => {
            const dateA = new Date(a.dateEnd || a.dateStart).getTime();
            const dateB = new Date(b.dateEnd || b.dateStart).getTime();
            return dateB - dateA;
        });
    }, [tickets, filters]);

    // Totals
    const totals = useMemo(() => {
        return filteredTickets.reduce((acc, ticket) => ({
            trips: acc.trips + (ticket.trips || 0),
            revenue: acc.revenue + (ticket.revenue || 0) + (ticket.liftOnFee || 0) + (ticket.liftOffFee || 0) + (ticket.airportFee || 0),
            nightStay: acc.nightStay + (ticket.nightStayDays || (ticket.nightStay ? 1 : 0))
        }), { trips: 0, revenue: 0, nightStay: 0 });
    }, [filteredTickets]);

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleExport = () => {
        // Validate at least one filter is active
        const hasCustomerFilter = filters.customer && filters.customer !== 'Tất cả';
        const hasMonthFilter = !!filters.month;
        const hasYearFilter = !!filters.year;
        const hasDateRangeFilter = filters.fromDate && filters.toDate;

        if (!hasCustomerFilter && !hasMonthFilter && !hasYearFilter && !hasDateRangeFilter) {
            alert('Vui lòng chọn ít nhất 1 bộ lọc (Khách hàng, Tháng, Năm hoặc Khoảng thời gian) trước khi xuất báo cáo.');
            return;
        }

        if (filteredTickets.length === 0) {
            alert("Không có dữ liệu để xuất!");
            return;
        }

        // Group by Customer
        const ticketsByCustomer: Record<string, TransportTicket[]> = {};
        filteredTickets.forEach(t => {
            const c = t.customerCode || 'Unknown';
            if (!ticketsByCustomer[c]) ticketsByCustomer[c] = [];
            ticketsByCustomer[c].push(t);
        });

        const wb = XLSX.utils.book_new();

        // Styles
        const borderStyle = {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
        };
        const titleStyle = {
            font: { bold: true, sz: 14, name: 'Calibri' },
            alignment: { horizontal: 'center', vertical: 'center' }
        };
        const subTitleStyle = {
            font: { bold: true, sz: 11, name: 'Calibri' },
            alignment: { horizontal: 'center', vertical: 'center' }
        };
        const headerStyle = {
            font: { bold: true, name: 'Calibri', sz: 10 },
            border: borderStyle,
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
            // fill: { fgColor: { rgb: "E0E0E0" } } // Optional background
        };
        const cellStyle = {
            font: { name: 'Calibri', sz: 11 },
            border: borderStyle,
            alignment: { vertical: 'center' }
        };
        const moneyFormat = '#,##0';

        Object.keys(ticketsByCustomer).forEach(customerName => {
            const customerTickets = ticketsByCustomer[customerName];

            // Time Label Logic
            let timeLabel = '';
            const uniqueMonths = Array.from(new Set(customerTickets.map(t => {
                if (!t.dateStart && !t.dateEnd) return null;
                const d = new Date(t.dateStart || t.dateEnd);
                return `${d.getMonth() + 1}/${d.getFullYear()}`;
            }).filter(Boolean)));

            if (uniqueMonths.length === 1 && uniqueMonths[0]) {
                const [m, y] = uniqueMonths[0].split('/');
                timeLabel = `Tháng ${m}/${y}`;
            } else if (filters.month && filters.year) {
                timeLabel = `Tháng ${filters.month}/${filters.year}`;
            } else if (filters.year) {
                timeLabel = `Năm ${filters.year}`;
            } else {
                timeLabel = "Tổng hợp";
            }

            // Headers
            // Row 3 (Index 2)
            const header1 = [
                "STT", "Ngày Vận Chuyển", "Số Bill Nhập", "Số cont:", "BKS:", "Số lượng", "", "",
                "Tuyến đường Vận chuyển", "Đơn giá (VND/chuyến)", "Cước VC",
                "Nâng Full tại Cảng Đà Nẵng (mức 1)", "Hạ rỗng tại Đà Nẵng", "Phí lấy hàng ở sân bay",
                "Thành Tiền", "Lưu đêm", "Ghi chú"
            ];
            // Row 4 (Index 3)
            const header2 = [
                "", "", "", "", "", "20", "40", "40R0",
                "", "", "",
                "", "", "",
                "", "", ""
            ];

            // Data
            const rows = customerTickets.map((t, idx) => {
                const unitPrice = t.revenue || 0;
                const revenue = t.revenue || 0;
                const liftOn = t.liftOnFee || 0;
                const liftOff = t.liftOffFee || 0;
                const airport = t.airportFee || 0;
                const totalAmt = revenue + liftOn + liftOff + airport;

                const sizeStr = String(t.size);
                const is20 = sizeStr === '20';
                const is40 = sizeStr === '40';
                const is40R = sizeStr === '40R0' || sizeStr === '40R';

                return [
                    idx + 1,
                    format(new Date(t.dateStart), 'dd/MM/yyyy'),
                    "", // Bill No (Not in types? Leaving empty as per requirement)
                    t.containerNo,
                    t.licensePlate || "",
                    is20 ? 1 : '',
                    is40 ? 1 : '',
                    is40R ? 1 : '',
                    t.route,
                    unitPrice,
                    revenue,
                    liftOn || '',
                    liftOff || '',
                    airport || '',
                    totalAmt,
                    t.nightStay ? (t.nightStayDays || 1) : '',
                    t.notes || ""
                ];
            });

            // Totals
            const sum20 = customerTickets.reduce((s, t) => s + (String(t.size) === '20' ? 1 : 0), 0);
            const sum40 = customerTickets.reduce((s, t) => s + (String(t.size) === '40' ? 1 : 0), 0);
            const sum40R = customerTickets.reduce((s, t) => {
                const sz = String(t.size);
                return s + (sz === '40R0' || sz === '40R' ? 1 : 0);
            }, 0);
            const sumRev = customerTickets.reduce((s, t) => s + (t.revenue || 0), 0);
            const sumLiftOn = customerTickets.reduce((s, t) => s + (t.liftOnFee || 0), 0);
            const sumLiftOff = customerTickets.reduce((s, t) => s + (t.liftOffFee || 0), 0);
            const sumAirport = customerTickets.reduce((s, t) => s + (t.airportFee || 0), 0);
            const sumTotalAmt = sumRev + sumLiftOn + sumLiftOff + sumAirport;
            const sumNight = customerTickets.reduce((s, t) => s + (t.nightStayDays || (t.nightStay ? 1 : 0)), 0);

            const totalRow = [
                "TỔNG CỘNG", "", "", "", "", sum20, sum40, sum40R,
                "", "", sumRev,
                sumLiftOn, sumLiftOff, sumAirport,
                sumTotalAmt, sumNight, ""
            ];

            const wsData = [[''], [''], header1, header2, ...rows, totalRow];
            const ws = XLSX.utils.aoa_to_sheet(wsData);

            // Merges
            ws['!merges'] = [
                // Title
                { s: { r: 0, c: 0 }, e: { r: 0, c: 16 } },
                // Subtitle
                { s: { r: 1, c: 0 }, e: { r: 1, c: 16 } },
                // Headers (Row 2 & 3 / Index 2 & 3)
                { s: { r: 2, c: 0 }, e: { r: 3, c: 0 } }, // STT
                { s: { r: 2, c: 1 }, e: { r: 3, c: 1 } }, // Date
                { s: { r: 2, c: 2 }, e: { r: 3, c: 2 } }, // Bill
                { s: { r: 2, c: 3 }, e: { r: 3, c: 3 } }, // Cont
                { s: { r: 2, c: 4 }, e: { r: 3, c: 4 } }, // BKS
                { s: { r: 2, c: 5 }, e: { r: 2, c: 7 } }, // Qty (Horizontal)
                { s: { r: 2, c: 8 }, e: { r: 3, c: 8 } }, // Route
                { s: { r: 2, c: 9 }, e: { r: 3, c: 9 } }, // Unit Price
                { s: { r: 2, c: 10 }, e: { r: 3, c: 10 } }, // Transport Fee
                { s: { r: 2, c: 11 }, e: { r: 3, c: 11 } }, // Lift On
                { s: { r: 2, c: 12 }, e: { r: 3, c: 12 } }, // Lift Off
                { s: { r: 2, c: 13 }, e: { r: 3, c: 13 } }, // Airport
                { s: { r: 2, c: 14 }, e: { r: 3, c: 14 } }, // Total Amt
                { s: { r: 2, c: 15 }, e: { r: 3, c: 15 } }, // Night
                { s: { r: 2, c: 16 }, e: { r: 3, c: 16 } }, // Note
                // Total Row (Last Row)
                { s: { r: wsData.length - 1, c: 0 }, e: { r: wsData.length - 1, c: 4 } } // TỔNG CỘNG (A-E)
            ];

            // Set Title/Subtitle Values
            ws['A1'] = { v: 'BẢNG DOANH THU KHÁCH HÀNG', s: titleStyle };
            ws['A2'] = { v: `Khách hàng: ${customerName} - ${timeLabel}`, s: subTitleStyle };

            // Apply Styles
            const range = XLSX.utils.decode_range(ws['!ref']!);

            // Header Styles (Rows 2 & 3)
            for (let R = 2; R <= 3; ++R) {
                for (let C = 0; C <= 16; ++C) {
                    const addr = XLSX.utils.encode_cell({ r: R, c: C });
                    if (!ws[addr]) ws[addr] = { v: '', s: headerStyle };
                    else ws[addr].s = headerStyle;
                }
            }

            // Data Styles
            for (let R = 4; R < range.e.r; ++R) {
                for (let C = 0; C <= 16; ++C) {
                    const addr = XLSX.utils.encode_cell({ r: R, c: C });
                    const s: any = { ...cellStyle };

                    // Alignments
                    if ([0, 1, 5, 6, 7, 15].includes(C)) s.alignment = { ...s.alignment, horizontal: 'center' }; // Center
                    else if ([9, 10, 11, 12, 13, 14].includes(C)) { // Money
                        s.alignment = { ...s.alignment, horizontal: 'right' };
                        s.numFmt = moneyFormat;
                    } else {
                        s.alignment = { ...s.alignment, horizontal: 'left', wrapText: true };
                    }

                    if (!ws[addr]) ws[addr] = { v: '', s };
                    else ws[addr].s = s;
                }
            }

            // Total Row Style
            const tempVal = wsData.length - 1;
            for (let C = 0; C <= 16; ++C) {
                const addr = XLSX.utils.encode_cell({ r: tempVal, c: C });
                const s: any = { ...cellStyle, font: { bold: true, name: 'Calibri' } };

                if (C === 0) s.alignment = { ...s.alignment, horizontal: 'center' }; // TỔNG CỘNG
                else if ([5, 6, 7, 15].includes(C)) s.alignment = { ...s.alignment, horizontal: 'center' };
                else if ([9, 10, 11, 12, 13, 14].includes(C)) {
                    s.alignment = { ...s.alignment, horizontal: 'right' };
                    s.numFmt = moneyFormat;
                }

                if (!ws[addr]) ws[addr] = { v: '', s };
                else ws[addr].s = s;
            }


            // Col Widths
            ws['!cols'] = [
                { wch: 5 },  // STT
                { wch: 12 }, // Date
                { wch: 10 }, // Bill
                { wch: 12 }, // Cont
                { wch: 10 }, // BKS
                { wch: 5 }, { wch: 5 }, { wch: 5 }, // Qty
                { wch: 30 }, // Route
                { wch: 15 }, // Unit
                { wch: 15 }, // Trans
                { wch: 12 }, // LiftOn
                { wch: 12 }, // LiftOff
                { wch: 15 }, // Airport
                { wch: 15 }, // Total
                { wch: 8 },  // Night
                { wch: 10 }  // Note
            ];

            const sheetName = customerName.substring(0, 31).replace(/[\\*?:/\[\]]/g, '_');
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
        });

        XLSX.writeFile(wb, `BangKe_KhachHang_${format(new Date(), 'ddMMyy')}.xlsx`);
    };



    return (
        <div className="space-y-6 font-sans">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Bảng Kê Doanh Thu Khách Hàng</h2>
                <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-sm transition-all transform active:scale-95"
                >
                    <Download size={18} />
                    Xuất Excel
                </button>
            </div>

            {/* Filter Section */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-2 mb-6">
                    <Filter size={20} className="text-blue-600" />
                    <h3 className="font-bold text-slate-800 uppercase text-sm tracking-wide">Bộ Lọc Thống Kê</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Customer Filter */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Khách hàng</label>
                        <div className="relative">
                            <select
                                value={filters.customer}
                                onChange={e => handleFilterChange('customer', e.target.value)}
                                className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none transition-all cursor-pointer hover:bg-slate-100"
                            >
                                <option value="">Tất cả</option>
                                {uniqueCustomers.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                            <User size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Month filter */}
                    <div className="flex gap-2">
                        <div className="space-y-1.5 flex-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tháng</label>
                            <select
                                value={filters.month}
                                onChange={e => handleFilterChange('month', e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 outline-none appearance-none transition-all hover:bg-slate-100"
                            >
                                <option value="">Tất cả</option>
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                    <option key={m} value={m.toString()}>Tháng {m}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5 flex-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Năm</label>
                            <select
                                value={filters.year}
                                onChange={e => handleFilterChange('year', e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 outline-none appearance-none transition-all hover:bg-slate-100"
                            >
                                <option value="">Tất cả</option>
                                {[2023, 2024, 2025, 2026].map(y => (
                                    <option key={y} value={y.toString()}>{y}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Date Range - From */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Từ ngày</label>
                        <div className="relative">
                            <input
                                type={filters.fromDate ? "date" : "text"}
                                placeholder="dd/MM/yyyy"
                                onFocus={(e) => (e.target.type = "date")}
                                onBlur={(e) => { if (!filters.fromDate) e.target.type = "text"; }}
                                value={filters.fromDate}
                                onChange={e => handleFilterChange('fromDate', e.target.value)}
                                className="w-full pl-4 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all hover:bg-slate-100 block"
                            />
                        </div>
                    </div>

                    {/* Date Range - To */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Đến ngày</label>
                        <div className="relative">
                            <input
                                type={filters.toDate ? "date" : "text"}
                                placeholder="dd/MM/yyyy"
                                onFocus={(e) => (e.target.type = "date")}
                                onBlur={(e) => { if (!filters.toDate) e.target.type = "text"; }}
                                value={filters.toDate}
                                onChange={e => handleFilterChange('toDate', e.target.value)}
                                className="w-full pl-4 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all hover:bg-slate-100 block"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Table Area */}
            <div className="bg-white border boundary-slate-200 rounded-xl shadow-sm flex-1 overflow-hidden flex flex-col relative">
                <div className="overflow-auto flex-1 w-full">
                    <table className="w-full text-sm text-left border-collapse min-w-[1600px]">
                        <thead className="text-xs uppercase bg-slate-50 sticky top-0 z-20 shadow-sm font-bold text-slate-600">
                            <tr>
                                <th rowSpan={2} className="px-4 py-3 sticky left-0 bg-slate-50 border-r border-slate-200 w-16 text-center z-30 align-middle">STT</th>
                                <th rowSpan={2} className="px-4 py-3 border-r border-slate-200 align-middle w-48 text-left">Khách hàng</th>
                                <th rowSpan={2} className="px-4 py-3 border-r border-slate-200 align-middle">Ngày Vận<br />Chuyển</th>
                                <th rowSpan={2} className="px-4 py-3 border-r border-slate-200 align-middle">Số Bill Nhập</th>
                                <th rowSpan={2} className="px-4 py-3 border-r border-slate-200 align-middle">Số cont:</th>
                                <th rowSpan={2} className="px-4 py-3 border-r border-slate-200 align-middle">BKS:</th>
                                <th colSpan={3} className="px-4 py-2 border-r border-b border-slate-200 text-center bg-slate-100">Số lượng</th>
                                <th rowSpan={2} className="px-4 py-3 border-r border-slate-200 align-middle w-48">Tuyến đường Vận<br />chuyển</th>
                                <th rowSpan={2} className="px-4 py-3 border-r border-slate-200 text-right align-middle">Đơn giá<br />(VND/chuyến)</th>
                                <th rowSpan={2} className="px-4 py-3 border-r border-slate-200 text-right align-middle">Cước VC</th>
                                <th rowSpan={2} className="px-4 py-3 border-r border-slate-200 text-right align-middle w-24">Nâng Full tại<br />Cảng Đà Nẵng<br />(mức 1)</th>
                                <th rowSpan={2} className="px-4 py-3 border-r border-slate-200 text-right align-middle w-24">Hạ rỗng tại<br />Đà Nẵng</th>
                                <th rowSpan={2} className="px-4 py-3 border-r border-slate-200 text-right align-middle w-24">Phí lấy<br />hàng ở<br />sân bay</th>
                                <th rowSpan={2} className="px-4 py-3 border-r border-slate-200 text-right align-middle text-blue-700">Thành Tiền</th>
                                <th rowSpan={2} className="px-4 py-3 border-r border-slate-200 text-center align-middle w-20">Lưu đêm</th>
                                <th rowSpan={2} className="px-4 py-3 border-l border-slate-200 text-center align-middle">Ghi chú</th>
                            </tr>
                            <tr className="bg-slate-100">
                                <th className="px-2 py-1 border-r border-slate-200 text-center w-12">20</th>
                                <th className="px-2 py-1 border-r border-slate-200 text-center w-12">40</th>
                                <th className="px-2 py-1 border-r border-slate-200 text-center w-12">40R0</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredTickets.length === 0 ? (
                                <tr>
                                    <td colSpan={17} className="p-12 text-center text-slate-400 italic">
                                        Không có dữ liệu phù hợp (Chỉ hiển thị phiếu đã duyệt)
                                    </td>
                                </tr>
                            ) : (
                                filteredTickets.map((ticket, index) => {
                                    const unitPrice = ticket.revenue || 0;
                                    const liftOnFee = ticket.liftOnFee || 0;
                                    const liftOffFee = ticket.liftOffFee || 0;
                                    const airportFee = ticket.airportFee || 0;


                                    return (
                                        <tr key={ticket.id} className="hover:bg-blue-50/30 transition-colors">
                                            <td className="px-4 py-3 sticky left-0 bg-white border-r border-slate-100 font-medium text-center z-10 text-slate-500">
                                                {index + 1}
                                            </td>
                                            <td className="px-4 py-3 font-bold text-slate-700 w-48 truncate" title={ticket.customerCode}>{ticket.customerCode}</td>
                                            <td className="px-4 py-3 text-center text-slate-600">{format(new Date(ticket.dateStart), 'dd/MM/yyyy')}</td>
                                            <td className="px-4 py-3 text-center text-slate-500">-</td>
                                            <td className="px-4 py-3 font-mono text-slate-600 font-bold">{ticket.containerNo}</td>
                                            <td className="px-4 py-3 font-medium text-slate-700">{ticket.licensePlate || ""}</td>

                                            <td className="px-2 py-3 text-center border-r border-slate-50 font-bold text-slate-600">{ticket.size === '20' ? '1' : ''}</td>
                                            <td className="px-2 py-3 text-center border-r border-slate-50 font-bold text-slate-600">{ticket.size === '40' ? '1' : ''}</td>
                                            <td className="px-2 py-3 text-center border-r border-slate-50 font-bold text-slate-600">{ticket.size === '40R0' ? '1' : ''}</td>

                                            <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={ticket.route}>{ticket.route}</td>
                                            <td className="px-4 py-3 text-right text-slate-600">{unitPrice.toLocaleString()}</td>
                                            <td className="px-4 py-3 text-right font-medium text-slate-700">{ticket.revenue?.toLocaleString()}</td>

                                            <td className="px-4 py-3 text-right text-slate-600">{liftOnFee ? liftOnFee.toLocaleString() : '-'}</td>
                                            <td className="px-4 py-3 text-right text-slate-600">{liftOffFee ? liftOffFee.toLocaleString() : '-'}</td>
                                            <td className="px-4 py-3 text-right text-slate-600">{airportFee ? airportFee.toLocaleString() : '-'}</td>

                                            <td className="px-4 py-3 text-right font-bold text-blue-700"></td>
                                            <td className="px-4 py-3 text-center border-r border-slate-50">
                                                {ticket.nightStay && (
                                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-purple-50 text-purple-700 font-bold text-xs ring-1 ring-purple-100">
                                                        {ticket.nightStayDays || (ticket.nightStay ? 1 : '')}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 border-l border-slate-100 text-slate-400 italic text-xs truncate max-w-[12rem]">
                                                {ticket.notes}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>

                        {filteredTickets.length > 0 && (
                            <tfoot className="bg-slate-50 font-bold text-slate-800 border-t-2 border-slate-200 sticky bottom-0 z-30 shadow-[0_-5px_10px_rgba(0,0,0,0.05)]">
                                <tr>
                                    <td colSpan={6} className="px-4 py-4 text-center sticky left-0 bg-slate-50 border-r border-slate-200 z-30 uppercase text-xs tracking-wider">TỔNG CỘNG</td>

                                    <td className="px-2 py-4 text-center text-blue-800">
                                        {filteredTickets.filter(t => t.size === '20').length}
                                    </td>
                                    <td className="px-2 py-4 text-center text-blue-800">
                                        {filteredTickets.filter(t => t.size === '40').length}
                                    </td>
                                    <td className="px-2 py-4 text-center text-blue-800">
                                        {filteredTickets.filter(t => t.size === '40R0').length}
                                    </td>

                                    <td className="px-4 py-4"></td>
                                    <td className="px-4 py-4"></td>
                                    <td className="px-4 py-4 text-right text-blue-800">{totals.revenue.toLocaleString()}</td>

                                    <td className="px-4 py-4"></td>
                                    <td className="px-4 py-4"></td>
                                    <td className="px-4 py-4"></td>

                                    <td className="px-4 py-4 text-right text-blue-800"></td>
                                    <td className="px-4 py-4 text-center text-purple-700 font-bold">{totals.nightStay}</td>
                                    <td className="px-4 py-4 border-l border-slate-200"></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
}
