import { useState, useMemo } from 'react';
import { TransportTicket } from '../types';
import XLSX from 'xlsx-js-style';
import { format, isWithinInterval, parseISO } from 'date-fns';
import { Filter, User, Download } from 'lucide-react';

export function DriverRevenueTable({ tickets }: { tickets: TransportTicket[] }) {
    const [filters, setFilters] = useState({
        driver: '',
        month: '',
        year: new Date().getFullYear().toString(),
        fromDate: '',
        toDate: ''
    });

    const uniqueDrivers = useMemo(() => {
        const drivers = new Set(tickets.map(t => t.driverName).filter((d): d is string => !!d));
        return Array.from(drivers);
    }, [tickets]);

    const filteredTickets = useMemo(() => {
        return tickets.filter(ticket => {
            if (ticket.status !== 'APPROVED') return false;

            // Driver
            if (filters.driver && filters.driver !== 'Tất cả') {
                if (ticket.driverName !== filters.driver) return false;
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

            // Date Range
            if (filters.fromDate && filters.toDate) {
                const start = parseISO(filters.fromDate);
                const end = parseISO(filters.toDate);
                const ticketDate = parseISO(ticket.dateEnd);
                if (!isWithinInterval(ticketDate, { start, end })) return false;
            }

            return true;
        }).sort((a, b) => {
            const dateA = new Date(a.dateEnd || a.dateStart).getTime();
            const dateB = new Date(b.dateEnd || b.dateStart).getTime();
            return dateB - dateA;
        });
    }, [tickets, filters]);

    const totals = useMemo(() => {
        return filteredTickets.reduce((acc, ticket) => ({
            trips: acc.trips + ticket.trips,
            revenue: acc.revenue + ticket.revenue,
            nightStay: acc.nightStay + (ticket.nightStayDays || (ticket.nightStay ? 1 : 0))
        }), { trips: 0, revenue: 0, nightStay: 0 });
    }, [filteredTickets]);

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const exportDriverSheet = () => {
        // Validate at least one filter is active
        const hasDriverFilter = filters.driver && filters.driver !== 'Tất cả';
        const hasMonthFilter = !!filters.month;
        const hasYearFilter = !!filters.year;
        const hasDateRangeFilter = filters.fromDate && filters.toDate;

        if (!hasDriverFilter && !hasMonthFilter && !hasYearFilter && !hasDateRangeFilter) {
            alert('Vui lòng chọn ít nhất 1 bộ lọc (Lái xe, Tháng, Năm hoặc Khoảng thời gian) trước khi xuất báo cáo.');
            return;
        }

        if (filteredTickets.length === 0) {
            alert('Không có dữ liệu để xuất!');
            return;
        }

        // Group by Driver
        const ticketsByDriver: Record<string, TransportTicket[]> = {};
        filteredTickets.forEach(t => {
            const d = t.driverName || 'Unknown';
            if (!ticketsByDriver[d]) ticketsByDriver[d] = [];
            ticketsByDriver[d].push(t);
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
            font: { bold: true, name: 'Calibri' },
            border: borderStyle,
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
            fill: { fgColor: { rgb: "D9D9D9" } } // Match screenshot gray
        };

        // Base cell style
        const baseCellStyle = {
            font: { name: 'Calibri', sz: 11 },
            border: borderStyle,
            alignment: { vertical: 'center' }
        };

        const cellCenter = { ...baseCellStyle, alignment: { horizontal: 'center', vertical: 'center' } };
        const cellLeft = { ...baseCellStyle, alignment: { horizontal: 'left', vertical: 'center', wrapText: true } };
        const cellRight = { ...baseCellStyle, alignment: { horizontal: 'right', vertical: 'center' } };
        const moneyFormat = '#,##0';

        Object.keys(ticketsByDriver).forEach(driverName => {
            const driverTickets = ticketsByDriver[driverName];

            const plates = Array.from(new Set(driverTickets.map(t => t.licensePlate).filter(Boolean)));
            const platesStr = plates.join(', ');

            let timeLabel = '';

            // Get unique Month/Year pairs from data
            const uniqueMonths = Array.from(new Set(driverTickets.map(t => {
                if (!t.dateStart && !t.dateEnd) return null;
                const d = new Date(t.dateStart || t.dateEnd);
                return `${d.getMonth() + 1}/${d.getFullYear()}`;
            }).filter(Boolean)));

            if (uniqueMonths.length === 1 && uniqueMonths[0]) {
                const [m, y] = uniqueMonths[0].split('/');
                timeLabel = `Tháng ${m}/ ${y}`;
            } else if (filters.month && filters.year) {
                timeLabel = `Tháng ${filters.month}/ ${filters.year}`;
            } else if (filters.year) {
                timeLabel = `Năm ${filters.year}`;
            } else if (driverTickets.length > 0) {
                const dates = driverTickets.map(t => new Date(t.dateStart || t.dateEnd));
                const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
                const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
                timeLabel = `${format(minDate, 'dd/MM/yyyy')} - ${format(maxDate, 'dd/MM/yyyy')}`;
            }

            const headers = [
                'STT', 'Ngày', 'Container No.', 'Size', 'S/C',
                'F/E', 'Tuyến đường', 'Tổng doanh thu', 'Dthu vận chuyển', 'Lưu đêm', 'Ghi chú'
            ];

            const dataRows = driverTickets.map((t, idx) => [
                idx + 1,
                t.dateStart ? format(new Date(t.dateStart), 'dd/MM/yyyy') : '-',
                t.containerNo,
                t.size,
                t.trips || 1,
                t.fe,
                t.route,
                t.revenue,
                t.revenue,
                t.nightStay ? (t.nightStayDays || 1) : '',
                t.notes || ''
            ]);

            const totalRevenue = driverTickets.reduce((sum, t) => sum + t.revenue, 0);
            const totalNightStay = driverTickets.reduce((sum, t) => sum + (t.nightStayDays || (t.nightStay ? 1 : 0)), 0);

            // Total Row
            const totalRow = [
                'Tổng', '', '', '', '', '', '',
                totalRevenue,
                totalRevenue,
                totalNightStay,
                ''
            ];

            const ws = XLSX.utils.aoa_to_sheet([
                [''], [''], headers, ...dataRows, totalRow
            ]);

            // Merges
            if (!ws['!merges']) ws['!merges'] = [];
            ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 10 } }); // Title
            ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 10 } }); // Subtitle

            // Merge Total Row (A-G aka 0-6)
            const totalRowIdx = dataRows.length + 3;
            ws['!merges'].push({ s: { r: totalRowIdx, c: 0 }, e: { r: totalRowIdx, c: 6 } });

            // Set Title/Subtitle content
            ws['A1'] = { v: 'BẢNG KÊ DOANH THU VẬN CHUYỂN', s: titleStyle };
            ws['A2'] = { v: `${driverName} - ${platesStr} - ${timeLabel}`, s: subTitleStyle };

            // Apply Header Styles
            const range = XLSX.utils.decode_range(ws['!ref']!);
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const addr = XLSX.utils.encode_cell({ r: 2, c: C });
                if (ws[addr]) ws[addr].s = headerStyle;
            }

            // Apply Data Styles
            for (let R = 3; R < range.e.r; ++R) { // Exclude last row
                for (let C = 0; C <= 10; ++C) {
                    const addr = XLSX.utils.encode_cell({ r: R, c: C });
                    if (!ws[addr]) ws[addr] = { v: '', s: baseCellStyle }; // Default init

                    if (C === 0) ws[addr].s = cellCenter; // STT
                    else if (C === 1) ws[addr].s = cellCenter; // Date
                    else if (C === 2) ws[addr].s = cellLeft;   // Container No
                    else if (C === 3 || C === 4 || C === 5) ws[addr].s = cellCenter; // Size, S/C, F/E
                    else if (C === 6) ws[addr].s = cellLeft;   // Route
                    else if (C === 7 || C === 8) ws[addr].s = { ...cellRight, numFmt: moneyFormat }; // Money
                    else if (C === 9) ws[addr].s = cellCenter; // Night Stay
                    else if (C === 10) ws[addr].s = cellLeft;  // Note

                    ws[addr].s = { ...ws[addr].s, border: borderStyle };
                }
            }

            // Apply Total Row Styles
            const totalR = range.e.r;

            for (let C = 0; C <= 10; ++C) {
                const addr = XLSX.utils.encode_cell({ r: totalR, c: C });
                if (!ws[addr]) ws[addr] = { v: '' };

                // Apply Bold + Border to ALL total row cells
                const style: any = {
                    font: { bold: true, name: 'Calibri', sz: 11 },
                    border: borderStyle,
                    alignment: { vertical: 'center' }
                };

                if (C === 0) style.alignment.horizontal = 'center'; // "Tổng" (Merged A-G)
                if (C === 7 || C === 8) {
                    style.alignment.horizontal = 'right';
                    style.numFmt = moneyFormat;
                }
                if (C === 9) style.alignment.horizontal = 'center';

                ws[addr].s = style;
            }

            // Column Widths
            ws['!cols'] = [
                { wch: 5 },  // STT
                { wch: 12 }, // Date
                { wch: 15 }, // Container
                { wch: 6 },  // Size
                { wch: 5 },  // S/C
                { wch: 5 },  // F/E
                { wch: 50 }, // Route
                { wch: 18 }, // Total Rev
                { wch: 18 }, // Trans Rev
                { wch: 10 }, // Night Stay
                { wch: 15 }  // Note
            ];

            XLSX.utils.book_append_sheet(wb, ws, driverName || 'Sheet1');
        });

        XLSX.writeFile(wb, `BangKe_LaiXe_${format(new Date(), 'ddMMyy')}.xlsx`);
    };

    return (
        <div className="space-y-6 font-sans">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Bảng Kê Doanh Thu Lái Xe</h2>
                <button
                    onClick={exportDriverSheet}
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
                    {/* Driver Filter */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Lái xe</label>
                        <div className="relative">
                            <select
                                value={filters.driver}
                                onChange={e => handleFilterChange('driver', e.target.value)}
                                className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none transition-all cursor-pointer hover:bg-slate-100"
                            >
                                <option value="">Tất cả</option>
                                {uniqueDrivers.map(d => (
                                    <option key={d} value={d}>{d}</option>
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

            {/* Data Table */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs w-16 text-center">STT</th>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Ngày</th>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Container No.</th>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs text-center">Size</th>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs text-center">S/C</th>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs text-center">F/E</th>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Tuyến đường</th>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs text-right">Tổng doanh thu</th>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs text-right">Dthu vận chuyển</th>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs text-center">Lưu đêm</th>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Ghi chú</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredTickets.length > 0 ? (
                                filteredTickets.map((ticket, index) => (
                                    <tr key={ticket.id} className="hover:bg-blue-50/30 transition-colors">
                                        <td className="px-6 py-4 text-center text-slate-400 font-medium">{index + 1}</td>
                                        <td className="px-6 py-4 text-slate-600">{ticket.dateStart ? format(new Date(ticket.dateStart), 'dd/MM/yyyy') : '-'}</td>
                                        <td className="px-6 py-4 font-mono text-slate-600">{ticket.containerNo}</td>
                                        <td className="px-6 py-4 text-center text-slate-600">{ticket.size}</td>
                                        <td className="px-6 py-4 text-center text-slate-600">{ticket.trips || 1}</td>
                                        <td className={`px-6 py-4 text-center font-bold ${ticket.fe === 'F' ? 'text-blue-600' : 'text-orange-600'}`}>{ticket.fe}</td>
                                        <td className="px-6 py-4 text-slate-600 max-w-xs truncate" title={ticket.route}>{ticket.route}</td>
                                        <td className="px-6 py-4 text-right font-medium text-slate-600">{(ticket.revenue || 0).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-right font-medium text-slate-600">{(ticket.revenue || 0).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-center">
                                            {ticket.nightStay && (
                                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-purple-50 text-purple-700 font-bold text-xs ring-1 ring-purple-100">
                                                    {ticket.nightStayDays || 1}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-slate-400 italic text-xs max-w-[12rem] truncate">
                                            {ticket.notes}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={11} className="px-6 py-12 text-center text-slate-400 italic">
                                        Không có dữ liệu phù hợp
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot className="bg-slate-50 border-t border-slate-200 font-bold text-slate-700">
                            <tr>
                                <td colSpan={7} className="px-6 py-4 text-right uppercase text-xs tracking-wider">Tổng cộng</td>
                                <td className="px-6 py-4 text-right text-emerald-600">{totals.revenue.toLocaleString()}</td>
                                <td className="px-6 py-4 text-right text-emerald-600">{totals.revenue.toLocaleString()}</td>
                                <td className="px-6 py-4 text-center text-purple-700">{totals.nightStay}</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
}
