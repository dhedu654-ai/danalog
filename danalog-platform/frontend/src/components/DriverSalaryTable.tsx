import { useState, useMemo } from 'react';
import { TransportTicket, RouteConfig } from '../types';
import XLSX from 'xlsx-js-style';
import { format } from 'date-fns';
import { Calendar, Bell, ChevronRight, FileSpreadsheet, User, Send, CheckCircle, XCircle } from 'lucide-react';

interface DriverSalaryTableProps {
    tickets: TransportTicket[];
    routeConfigs: RouteConfig[];
    publishedSalaries: any[];
    users: any[];
    onNotifySalary?: (driverUsername: string, month: number, year: number, action: 'SEND_TO_ACCOUNTANT' | 'APPROVE_ACCOUNTANT' | 'REJECT_ACCOUNTANT' | 'PUBLISH_TO_DRIVER', reason?: string) => void;
    onBulkNotifySalary?: (driverUsernames: string[], month: number, year: number, action: 'SEND_TO_ACCOUNTANT' | 'APPROVE_ACCOUNTANT' | 'REJECT_ACCOUNTANT' | 'PUBLISH_TO_DRIVER', reason?: string) => void;
    currentUser?: any;
}


interface SalaryItem {
    id: string; // Composite key
    cargoName: string; // "V/c cont", "Lưu đêm"...
    content: string; // Route Name
    unit: string; // "chuyến", "đêm"
    quantity: number;
    unitPrice: number;
    total: number;
    note: string;
}

interface DriversalarySheet {
    driverName: string;
    driverUsername: string;
    items: SalaryItem[];
    totalQuantity: number;
    totalSalary: number;
    months: number[];
    year: number;
    trips: number;
}
export function DriverSalaryTable({ tickets, routeConfigs, publishedSalaries, users, onNotifySalary, onBulkNotifySalary, currentUser }: DriverSalaryTableProps) {
    const [selectedMonths, setSelectedMonths] = useState<number[]>([new Date().getMonth() + 1]);
    const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedDriver, setSelectedDriver] = useState('');
    const [expandedDrivers, setExpandedDrivers] = useState<string[]>([]);
    const [isExporting, setIsExporting] = useState(false);

    // 1. Filter Tickets by Status (APPROVED) and Date (Month/Year)
    const filteredTickets = useMemo(() => {
        return tickets.filter(t => {
            if (t.status !== 'APPROVED') return false;
            
            const date = new Date(t.dateEnd);
            // Month Filter
            if (selectedMonths.length > 0 && !selectedMonths.includes(date.getMonth() + 1)) return false;

            // Year Filter (0 = All)
            if (selectedYear !== 0 && date.getFullYear() !== selectedYear) return false;

            return true;
        });
    }, [tickets, selectedMonths, selectedYear]);

    // Get unique drivers from the filtered tickets (or all tickets if desired, but contextual usage suggests relevant drivers)
    const uniqueDrivers = useMemo(() => {
        const drivers = new Set(filteredTickets.map(t => t.driverName).filter((d): d is string => !!d));
        return Array.from(drivers).sort();
    }, [filteredTickets]);

    // 2. Aggregate Data per Driver
    const salarySheets = useMemo(() => {
        const sheets: DriversalarySheet[] = [];
        const driverMap: Record<string, TransportTicket[]> = {};

        // Group by Driver first
        filteredTickets.forEach(t => {
            const name = t.driverName || 'Unknown';
            if (!driverMap[name]) driverMap[name] = [];
            driverMap[name].push(t);
        });

        // Process each driver's tickets into Aggegrated Lines
        Object.keys(driverMap).forEach(driverName => {
            const driverTickets = driverMap[driverName];
            const itemMap: Record<string, SalaryItem> = {};

            driverTickets.forEach(t => {
                // 1. PRIMARY ITEM (The Transport Trip)
                // Logic to deduce "Cargo Name" and "Unit" from Ticket Data
                let cargoName = "V/c cont";
                let unit = "chuyến";

                const routeName = t.route || '';
                const routeLower = routeName.toLowerCase();

                if (routeLower.includes("lưu đêm")) {
                    cargoName = "Lưu đêm";
                    unit = "đêm";
                } else if (routeLower.includes("trung chuyển") || routeLower.includes("tr/c")) {
                    cargoName = "Tr/c cont";
                }

                // If ticket is purely an overnight ticket (manual), use it as is.
                // But typically, nightStay is an add-on.

                const key = `${t.route}-${t.driverSalary}-${cargoName}`;

                let historicalPrice = t.driverSalary;

                // FIX: Apply Time-Travel Lookup for MAIN TRIP as well.
                // This ensures if the ticket snapshot is wrong (updated by mistake), we recover the correct historical price 
                // from the Route Config history (if it exists).

                // 1. Filter by Route Name
                const mainCandidates = routeConfigs.filter(rc => rc.routeName === t.route);

                if (mainCandidates.length > 0) {
                    // 2. Sort by Effective Date DESC
                    mainCandidates.sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));

                    // 3. Find correct version based on date
                    const mainRefDate = t.dateEnd || t.dateStart || new Date().toISOString();
                    const mainCompletionDate = format(new Date(mainRefDate), 'yyyy-MM-dd');

                    // 4. Find version active at that time
                    const historicalConfig = mainCandidates.find(rc => rc.effectiveDate <= mainCompletionDate) || mainCandidates[mainCandidates.length - 1];

                    if (historicalConfig) {
                        historicalPrice = historicalConfig.salary.driverSalary;
                    }
                }

                if (!itemMap[key]) {
                    itemMap[key] = {
                        id: key,
                        cargoName,
                        content: t.route,
                        unit,
                        quantity: 0,
                        unitPrice: historicalPrice || 0,
                        total: 0,
                        note: ""
                    };
                }

                itemMap[key].quantity += 1;
                itemMap[key].total += (t.driverSalary || 0);

                // 2. NIGHT STAY ADD-ON (if applicable)
                // Auto-detect nightStay from route config if ticket doesn't have the flag
                const routeConfig = routeConfigs.find(rc => rc.routeName === t.route);
                const hasNightStay = t.nightStay || (routeConfig as any)?.isNightStay;
                
                // Calculate days: use ticket's nightStayDays, or compute from date range
                let days = t.nightStayDays || 0;
                if (hasNightStay && days <= 0) {
                    // Auto-compute from dateStart/dateEnd
                    if (t.dateStart && t.dateEnd) {
                        const start = new Date(t.dateStart);
                        const end = new Date(t.dateEnd);
                        const diffMs = end.getTime() - start.getTime();
                        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                        days = Math.max(diffDays, 1);
                    } else {
                        days = 1; // Fallback
                    }
                }
                
                if (hasNightStay && days > 0) {
                    // Check if this is NOT already a manual "Lưu đêm" route
                    if (!routeLower.includes("lưu đêm")) {
                        // FIX: Prioritize the salary saved on the ticket (Snapshot)
                        // If not found, fallback to dynamic lookup (Legacy behavior)
                        let nightPrice = t.nightStaySalary;

                        let location = t.cityStatus || t.nightStayLocation;
                        let nightConfig: RouteConfig | undefined;

                        if (!nightPrice) {
                            if (!location) {
                                location = routeConfig?.nightStayLocation || 'OUTER_CITY';
                            }

                            // User requested absolute hardcoded values for Night Stay
                            nightPrice = (location === 'INNER_CITY' || location === 'IN_CITY') ? 90000 : 120000;
                            nightConfig = undefined; // Force fallback label
                        }

                        if (nightPrice) {
                            const nightKey = `NIGHT-${location}-${nightPrice}`;

                            if (!itemMap[nightKey]) {
                                itemMap[nightKey] = {
                                    id: nightKey,
                                    cargoName: 'Lưu đêm',
                                    content: nightConfig?.routeName || ((location === 'INNER_CITY' || location === 'IN_CITY') ? 'Lưu đêm (Trong TP)' : 'Lưu đêm (Ngoài TP)'),
                                    unit: 'đêm',
                                    quantity: 0,
                                    unitPrice: nightPrice,
                                    total: 0,
                                    note: ""
                                };
                            }

                            itemMap[nightKey].quantity += days;
                            itemMap[nightKey].total += (days * nightPrice);
                        }
                    }
                }
            });

            const items = Object.values(itemMap);
            // Sort items by Cargo Name for better readability
            items.sort((a, b) => a.cargoName.localeCompare(b.cargoName));

            const totalSalary = items.reduce((sum, item) => sum + item.total, 0);
            const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

            // Find the unique username for this driver name
            const driverInfo = users.find(u => u.name === driverName);
            const driverUsername = driverInfo?.username || driverTickets[0]?.createdBy || driverName;

            sheets.push({
                driverName,
                driverUsername,
                items,
                totalQuantity,
                totalSalary,
                months: selectedMonths,
                year: selectedYear,
                trips: driverTickets.length
            });
        });

        // Filter by Selected Driver
        return sheets.filter(s => {
            const matchesDriver = selectedDriver ? s.driverName === selectedDriver : true;
            return matchesDriver;
        });
    }, [filteredTickets, selectedDriver, selectedMonths, selectedYear]);

    // Toggle Expand
    const toggleExpand = (driverName: string) => {
        setExpandedDrivers(prev =>
            prev.includes(driverName) ? prev.filter(n => n !== driverName) : [...prev, driverName]
        );
    };

    // Helper to add a sheet to a workbook
    const addDriverSheet = (wb: any, sheet: DriversalarySheet) => {
        // Find ALL License Plates from tickets for this driver
        const driverPlates = tickets
            .filter(t => t.driverName === sheet.driverName && t.licensePlate && t.licensePlate.trim() !== '')
            .map(t => t.licensePlate?.trim())
            .filter((plate): plate is string => !!plate);

        // Deduplicate plates
        const uniquePlates = Array.from(new Set(driverPlates));
        const plate = uniquePlates.length > 0 ? uniquePlates.join(', ') : '';

        // Styles
        const fontName = 'Times New Roman';

        // Borders - Solid Black Thin
        const borderStyle = {
            top: { style: 'thin', color: { rgb: "000000" } },
            bottom: { style: 'thin', color: { rgb: "000000" } },
            left: { style: 'thin', color: { rgb: "000000" } },
            right: { style: 'thin', color: { rgb: "000000" } }
        };

        const titleStyle = {
            font: { name: fontName, sz: 14, bold: true },
            alignment: { horizontal: 'center', vertical: 'center' }
        };
        const subTitleStyle = {
            font: { name: fontName, sz: 11, bold: true },
            alignment: { horizontal: 'center', vertical: 'center' }
        };

        const infoStyle = {
            font: { name: fontName, sz: 11, bold: true },
            alignment: { horizontal: 'center', vertical: 'center' }
        };

        // Table Header
        const headerStyle = {
            font: { name: fontName, sz: 11, bold: true },
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
            border: borderStyle,
            fill: { fgColor: { rgb: "FFFFFF" } }
        };

        // Data Cells
        const cellCenter = {
            font: { name: fontName, sz: 11 },
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
            border: borderStyle
        };

        const cellLeft = {
            font: { name: fontName, sz: 11 },
            alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
            border: borderStyle
        };

        const cellRight = {
            font: { name: fontName, sz: 11 },
            alignment: { horizontal: 'right', vertical: 'center' },
            border: borderStyle
        };

        // Total Row
        const totalLabelStyle = {
            font: { name: fontName, sz: 11, bold: true },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: borderStyle
        };

        const totalValueStyle = {
            font: { name: fontName, sz: 11, bold: true },
            alignment: { horizontal: 'right', vertical: 'center' },
            border: borderStyle
        };

        // Construct Rows

        // Row 1: Title
        const row1 = [
            { v: 'BẢNG TỔNG HỢP THANH TOÁN LƯƠNG', t: 's', s: titleStyle },
            { v: '', t: 's', s: titleStyle }, { v: '', t: 's', s: titleStyle }, { v: '', t: 's', s: titleStyle },
            { v: '', t: 's', s: titleStyle }, { v: '', t: 's', s: titleStyle }, { v: '', t: 's', s: titleStyle }, { v: '', t: 's', s: titleStyle }
        ];

        // Row 2: Period
        const row2 = [
            { v: `Kỳ thanh toán: ${sheet.months.length === 0 ? 'Tất cả' : sheet.months.join(', ')}/${sheet.year === 0 ? 'Tất cả' : sheet.year}`, t: 's', s: subTitleStyle },
            { v: '', t: 's', s: subTitleStyle }, { v: '', t: 's', s: subTitleStyle }, { v: '', t: 's', s: subTitleStyle },
            { v: '', t: 's', s: subTitleStyle }, { v: '', t: 's', s: subTitleStyle }, { v: '', t: 's', s: subTitleStyle }, { v: '', t: 's', s: subTitleStyle }
        ];

        // Row 3: Info
        const row3 = [
            { v: `Họ và tên: ${sheet.driverName}`, t: 's', s: infoStyle },
            { v: '', t: 's', s: infoStyle }, { v: '', t: 's', s: infoStyle }, { v: '', t: 's', s: infoStyle },
            { v: `Biển kiểm soát: ${plate}`, t: 's', s: infoStyle },
            { v: '', t: 's', s: infoStyle }, { v: '', t: 's', s: infoStyle }, { v: '', t: 's', s: infoStyle }
        ];

        // Row 4: Empty (Gap)
        const row4 = ['', '', '', '', '', '', '', ''];

        // Row 5: Headers
        const row5 = [
            { v: 'STT', t: 's', s: headerStyle },
            { v: 'Tên hàng', t: 's', s: headerStyle },
            { v: 'Nội dung', t: 's', s: headerStyle },
            { v: 'ĐVT', t: 's', s: headerStyle },
            { v: 'Số lượng', t: 's', s: headerStyle },
            { v: 'Đơn giá tiền lương', t: 's', s: headerStyle },
            { v: 'Tổng lương', t: 's', s: headerStyle },
            { v: 'Ghi chú', t: 's', s: headerStyle }
        ];

        // Data Rows
        const dataRows = sheet.items.map((item, index) => [
            { v: index + 1, t: 'n', s: cellCenter },
            { v: item.cargoName, t: 's', s: cellLeft },
            { v: item.content, t: 's', s: cellLeft },
            { v: item.unit, t: 's', s: cellCenter },
            { v: item.quantity, t: 'n', s: cellCenter },
            { v: item.unitPrice, t: 'n', s: cellRight },
            { v: item.total, t: 'n', s: cellRight },
            { v: item.note || '', t: 's', s: cellLeft }
        ]);

        // Total Row
        // User request: "Cộng" spans from A to D (Merges A, B, C, D)

        // Actually, let's just calculate logic dynamically or trust the push order.
        // We add headers (1 row) + 3 title rows + 1 empty row = 5 rows (0-4).
        // Table Header is row 5.
        // Data starts row 6.
        // Total row is last.

        const totalRow = [
            { v: 'Cộng', t: 's', s: totalLabelStyle }, // Merged A-D
            { v: '', t: 's', s: cellCenter },
            { v: '', t: 's', s: cellCenter },
            { v: '', t: 's', s: cellCenter },
            { v: sheet.totalQuantity, t: 'n', s: { ...cellCenter, font: { name: fontName, sz: 11, bold: true } } },
            { v: '', t: 's', s: cellCenter }, // Don Gia
            { v: sheet.totalSalary, t: 'n', s: totalValueStyle },
            { v: '', t: 's', s: cellCenter } // Ghi Chu
        ];

        const ws = XLSX.utils.json_to_sheet([]);
        const allRows = [row1, row2, row3, row4, row5, ...dataRows, totalRow];

        XLSX.utils.sheet_add_aoa(ws, allRows, { origin: 'A1' });

        // Calculate Total Row Index for Merging
        // rows 0,1,2,3,4 are headers/gap.
        // row 5 is table header.
        // dataRows.length items.
        // Total row is at index: 5 + 1 (header) + dataRows.length? 
        // Wait, 'row5' is the 5th element in `allRows` array (index 4)?
        // No: row1, row2, row3, row4, row5 are 5 items. Indices 0,1,2,3,4.
        // dataRows is list of items.
        // Total row is last.
        // Total Row Index = 4 + dataRows.length + 1 = 5 + dataRows.length.
        const lastRowIdx = 5 + dataRows.length;

        // Merges
        ws['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }, // Row 1 Title
            { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } }, // Row 2 Period
            { s: { r: 2, c: 0 }, e: { r: 2, c: 3 } }, // Row 3 Name (A-D)
            { s: { r: 2, c: 4 }, e: { r: 2, c: 7 } },  // Row 3 Plate (E-H)

            // Total Row Merge: A to D (Cols 0-3)
            { s: { r: lastRowIdx, c: 0 }, e: { r: lastRowIdx, c: 3 } }
        ];

        // Column Widths
        ws['!cols'] = [
            { wch: 5 },  // STT
            { wch: 15 }, // Ten Hang
            { wch: 40 }, // Noi Dung
            { wch: 8 },  // DVT
            { wch: 8 },  // So Luong
            { wch: 15 }, // Don Gia
            { wch: 15 }, // Tong Luong
            { wch: 20 }  // Ghi Chu
        ];

        const sheetName = sheet.driverName.replace(/[\\/?*[\]]/g, '').slice(0, 30);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
    };

    const handleBulkExport = () => {
        // Require BOTH month AND year to be selected
        if (selectedMonths.length === 0 || selectedYear === 0) {
            alert('Vui lòng chọn cả Tháng và Năm để xuất bảng kê lương.');
            return;
        }

        if (salarySheets.length === 0) {
            alert('Không có dữ liệu để xuất!');
            return;
        }

        setIsExporting(true);
        try {
            const wb = XLSX.utils.book_new();

            salarySheets.forEach(sheet => {
                addDriverSheet(wb, sheet);
            });

            XLSX.writeFile(wb, `Bang_Ke_Luong_Thang_${selectedMonths.join('_')}_${selectedYear}.xlsx`);

            setTimeout(() => {
                alert(`Đã xuất bảng lương cho ${salarySheets.length} lái xe.`);
            }, 500);

        } catch (error) {
            console.error(error);
            alert('Lỗi xuất file');
        } finally {
            setIsExporting(false);
        }
    };

    const handleBulkAction = (action: 'SEND_TO_ACCOUNTANT' | 'APPROVE_ACCOUNTANT' | 'REJECT_ACCOUNTANT' | 'PUBLISH_TO_DRIVER') => {
        if (selectedMonths.length !== 1 || selectedYear === 0) {
            alert('Vui lòng chọn 1 tháng duy nhất qua bộ lọc để thao tác hàng loạt.');
            return;
        }

        if (salarySheets.length === 0) return;

        if (!onBulkNotifySalary) return;

        let reason = '';
        if (action === 'REJECT_ACCOUNTANT') {
            const r = window.prompt(`Vui lòng nhập lý do từ chối bảng lương tháng ${selectedMonths[0]}/${selectedYear} của ${salarySheets.length} lái xe:`);
            if (r === null) return; // Cancelled
            if (!r.trim()) {
                alert('Phải nhập lý do từ chối.');
                return;
            }
            reason = r;
        } else {
            const verb = action === 'SEND_TO_ACCOUNTANT' ? 'TÁI KIỂM & GỬI' : action === 'APPROVE_ACCOUNTANT' ? 'DUYỆT' : 'GỬI (CÔNG BỐ) CHO';
            const confirmMsg = action === 'SEND_TO_ACCOUNTANT' 
                ? `Bạn có chắc chắn muốn gửi bảng lương tháng ${selectedMonths[0]}/${selectedYear} của TẤT CẢ ${salarySheets.length} CÁ NHÂN hiển thị lên Kế Toán?`
                : `Bạn có chắc chắn muốn ${verb} TẤT CẢ bảng lương tháng ${selectedMonths[0]}/${selectedYear} của ${salarySheets.length} LÁI XE hiển thị?`;

            if (!window.confirm(confirmMsg)) return;
        }

        const driverUsernames = salarySheets.map(s => s.driverUsername);
        onBulkNotifySalary(driverUsernames, selectedMonths[0], selectedYear, action, reason);
    };


    return (
        <div className="space-y-6 font-sans">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Bảng Kê Lương Lái Xe</h2>
                <p className="text-slate-500 mt-1">Tổng hợp và đối soát lương theo tháng.</p>
            </div>

            {/* Filters + Export Button */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex gap-4 items-center">
                <div className="flex items-center gap-2 text-slate-400 border-r border-slate-200 pr-4 shrink-0">
                    <Calendar size={20} />
                    <span className="font-bold text-xs uppercase">Kỳ thanh toán</span>
                </div>

                <div className="relative">
                    <div 
                        className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 cursor-pointer flex items-center justify-between min-w-[140px]"
                        onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}
                    >
                        <span>{selectedMonths.length === 0 ? 'Tất cả tháng' : `Tháng ${selectedMonths.join(', ')}`}</span>
                    </div>
                    {isMonthDropdownOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setIsMonthDropdownOpen(false)}></div>
                            <div className="absolute top-full mt-1 left-0 min-w-[220px] bg-white border border-slate-200 shadow-xl rounded-xl z-20 p-3 grid grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                    <label key={m} className={`flex items-center justify-center p-2 cursor-pointer rounded-lg transition-colors border ${selectedMonths.includes(m) ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:bg-slate-50 text-slate-700'}`}>
                                        <input 
                                            type="checkbox" 
                                            className="hidden"
                                            checked={selectedMonths.includes(m)}
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedMonths(prev => [...prev, m].sort((a,b)=>a-b));
                                                else setSelectedMonths(prev => prev.filter(x => x !== m));
                                            }}
                                        />
                                        <span className="text-sm font-semibold mx-auto">T {m}</span>
                                    </label>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none cursor-pointer focus:ring-2 focus:ring-blue-500"
                >
                    <option value={0}>Tất cả năm</option>
                    {[...Array(5)].map((_, i) => {
                        const year = new Date().getFullYear() - 2 + i;
                        return <option key={year} value={year}>{year}</option>;
                    })}
                </select>

                <div className="relative">
                    <select
                        value={selectedDriver}
                        onChange={e => setSelectedDriver(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700 cursor-pointer appearance-none"
                    >
                        <option value="">Tất cả lái xe</option>
                        {uniqueDrivers.map(d => (
                            <option key={d} value={d}>{d}</option>
                        ))}
                    </select>
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>

                {(() => {
                    const role = currentUser?.role;
                    const isCS = role === 'CS' || role === 'CS_LEAD' || role === 'ADMIN';
                    const isAccountant = role === 'ACCOUNTANT' || role === 'ADMIN';

                    return (
                        <div className="ml-auto flex items-center gap-2 shrink-0">
                            {isCS && (
                                <button
                                    onClick={() => handleBulkAction('SEND_TO_ACCOUNTANT')}
                                    disabled={salarySheets.length === 0}
                                    className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white font-bold rounded-lg shadow-sm hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Gửi Kế Toán Hàng Loạt"
                                >
                                    <Send size={18} />
                                </button>
                            )}

                            {isAccountant && (
                                <>
                                    <button
                                        onClick={() => handleBulkAction('APPROVE_ACCOUNTANT')}
                                        disabled={salarySheets.length === 0}
                                        className="flex items-center justify-center w-10 h-10 bg-emerald-600 text-white font-bold rounded-lg shadow-sm hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Kế toán Duyệt Hàng Loạt"
                                    >
                                        <CheckCircle size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleBulkAction('REJECT_ACCOUNTANT')}
                                        disabled={salarySheets.length === 0}
                                        className="flex items-center justify-center w-10 h-10 bg-red-500 text-white font-bold rounded-lg shadow-sm hover:bg-red-600 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Từ chối Hàng Loạt (Trả về CS)"
                                    >
                                        <XCircle size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleBulkAction('PUBLISH_TO_DRIVER')}
                                        disabled={salarySheets.length === 0}
                                        className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white font-bold rounded-lg shadow-sm hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Gửi bảng lương cho Lái xe Hàng Loạt"
                                    >
                                        <Send size={18} />
                                    </button>
                                </>
                            )}

                            <button
                                onClick={handleBulkExport}
                                disabled={isExporting || salarySheets.length === 0}
                                className="flex items-center justify-center w-10 h-10 bg-slate-700 text-white font-bold rounded-lg shadow-sm hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Xuất Excel"
                            >
                                {isExporting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FileSpreadsheet size={18} />}
                            </button>
                        </div>
                    );
                })()}
            </div>

            {/* Content */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                {salarySheets.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 flex flex-col items-center">
                        <Calendar size={48} className="mb-4 opacity-20" />
                        <p>Không có dữ liệu lương phù hợp</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {salarySheets.map(sheet => (
                            <div key={sheet.driverName} className="group">
                                {/* Driver Header Row */}
                                <div
                                    onClick={() => toggleExpand(sheet.driverName)}
                                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-1 rounded-full text-slate-400 transition-transform duration-200 ${expandedDrivers.includes(sheet.driverName) ? 'rotate-90 text-blue-600' : ''}`}>
                                            <ChevronRight size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 text-base">{sheet.driverName}</h3>
                                            <p className="text-xs text-slate-500 mt-0.5">{sheet.trips} phiếu • {sheet.totalQuantity} chuyến/đêm</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <span className="block text-2xl font-bold text-emerald-600">
                                                {sheet.totalSalary.toLocaleString()} <span className="text-sm font-medium text-slate-400">đ</span>
                                            </span>
                                        </div>
                                        {(() => {
                                            const role = currentUser?.role;
                                            const isCS = role === 'CS' || role === 'CS_LEAD' || role === 'ADMIN';
                                            const isAccountant = role === 'ACCOUNTANT' || role === 'ADMIN';
                                            
                                            // Get statuses for selected months
                                            const statuses = selectedMonths.map(m => {
                                                const ps = publishedSalaries.find(p => p.driverUsername === sheet.driverUsername && p.month === m && p.year === selectedYear);
                                                return ps?.status;
                                            });
                                            
                                            if (selectedMonths.length === 0) return null;
                                            
                                            const allApproved = statuses.every(s => s === 'APPROVED_ACCOUNTANT');
                                            const anyRejected = statuses.some(s => s === 'REJECTED_ACCOUNTANT');
                                            const allPending = statuses.every(s => s === 'PENDING_ACCOUNTANT');
                                            const allPublished = statuses.every(s => s === 'PUBLISHED');
                                            
                                            // The "anyUnsent" condition for CS now has to allow them to resend REJECTED statuses
                                            const anyUnsent = statuses.some(s => s !== 'PENDING_ACCOUNTANT' && s !== 'PUBLISHED' && s !== 'APPROVED_ACCOUNTANT');
                                            
                                            if (allPublished) {
                                                return <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 flex items-center gap-1"><CheckCircle size={14} /> Lái xe đã nhận</span>;
                                            }

                                            return (
                                                <div className="flex gap-2 items-center">
                                                    {anyRejected && !isAccountant && (
                                                        <span className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-full border border-red-200 uppercase tracking-widest" title="Bị kế toán từ chối, vui lòng kiểm tra lại">Bị từ chối</span>
                                                    )}

                                                    {isCS && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (onNotifySalary) {
                                                                    selectedMonths.forEach(m => onNotifySalary(sheet.driverUsername, m, selectedYear, 'SEND_TO_ACCOUNTANT'));
                                                                }
                                                            }}
                                                            className={`flex items-center justify-center w-8 h-8 rounded-full text-xs transition-all shadow-sm ${!anyUnsent ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow'}`}
                                                            title={!anyUnsent ? "Đã gửi Kế toán" : "Gửi Kế toán"}
                                                            disabled={!anyUnsent}
                                                        >
                                                            <Send size={14} />
                                                        </button>
                                                    )}
                                                    
                                                    {isAccountant && allPending && (
                                                        <>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (onNotifySalary) {
                                                                        selectedMonths.forEach(m => onNotifySalary(sheet.driverUsername, m, selectedYear, 'APPROVE_ACCOUNTANT'));
                                                                    }
                                                                }}
                                                                className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-sm hover:shadow"
                                                                title="Duyệt Bản Lương Này"
                                                            >
                                                                <CheckCircle size={14} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const r = window.prompt(`Nhập lý do từ chối bảng lương của ${sheet.driverName}:`);
                                                                    if (r === null) return;
                                                                    if (!r.trim()) { alert('Phải nhập lý do'); return; }
                                                                    if (onNotifySalary) {
                                                                        selectedMonths.forEach(m => onNotifySalary(sheet.driverUsername, m, selectedYear, 'REJECT_ACCOUNTANT', r));
                                                                    }
                                                                }}
                                                                className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500 text-white hover:bg-red-600 transition-all shadow-sm hover:shadow"
                                                                title="Từ chối (Trả về CS kèm lý do)"
                                                            >
                                                                <XCircle size={14} />
                                                            </button>
                                                        </>
                                                    )}

                                                    {isAccountant && allApproved && (
                                                         <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (onNotifySalary) {
                                                                    selectedMonths.forEach(m => onNotifySalary(sheet.driverUsername, m, selectedYear, 'PUBLISH_TO_DRIVER'));
                                                                }
                                                            }}
                                                            className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm hover:shadow"
                                                            title="Gửi bảng lương cho Lái xe"
                                                        >
                                                            <Send size={14} />
                                                        </button>
                                                    )}
                                                    
                                                    {(!isAccountant && allPending) && (
                                                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 tracking-wider">CHỜ KT DUYỆT</span>
                                                    )}
                                                    
                                                    {(!isAccountant && allApproved) && (
                                                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 tracking-wider">KT ĐÃ DUYỆT</span>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>

                                {/* Aggregated Detail Table */}
                                {expandedDrivers.includes(sheet.driverName) && (
                                    <div className="bg-white border-t border-slate-100 p-6 animate-in slide-in-from-top-2 duration-200">
                                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                                                    <tr>
                                                        <th className="px-4 py-3 border-r border-slate-200">STT</th>
                                                        <th className="px-4 py-3 border-r border-slate-200">Tên hàng</th>
                                                        <th className="px-4 py-3 border-r border-slate-200 w-1/3">Nội dung</th>
                                                        <th className="px-4 py-3 border-r border-slate-200 text-center">ĐVT</th>
                                                        <th className="px-4 py-3 border-r border-slate-200 text-center">Số lượng</th>
                                                        <th className="px-4 py-3 border-r border-slate-200 text-right">Đơn giá tiền lương</th>
                                                        <th className="px-4 py-3 border-r border-slate-200 text-right">Tổng lương</th>
                                                        <th className="px-4 py-3">Ghi chú</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-200">
                                                    {sheet.items.map((item, index) => (
                                                        <tr key={item.id} className="hover:bg-slate-50">
                                                            <td className="px-4 py-3 text-center text-slate-500 border-r border-slate-200">{index + 1}</td>
                                                            <td className="px-4 py-3 font-medium text-slate-700 border-r border-slate-200">{item.cargoName}</td>
                                                            <td className="px-4 py-3 text-slate-600 border-r border-slate-200">{item.content}</td>
                                                            <td className="px-4 py-3 text-center text-slate-500 border-r border-slate-200">{item.unit}</td>
                                                            <td className="px-4 py-3 text-center font-bold text-slate-700 border-r border-slate-200">{item.quantity}</td>
                                                            <td className="px-4 py-3 text-right text-slate-600 border-r border-slate-200">{item.unitPrice.toLocaleString()}</td>
                                                            <td className="px-4 py-3 text-right font-bold text-emerald-600 border-r border-slate-200">{item.total.toLocaleString()}</td>
                                                            <td className="px-4 py-3 text-slate-500 italic">{item.note}</td>
                                                        </tr>
                                                    ))}
                                                    <tr className="bg-slate-50 font-bold text-slate-800">
                                                        <td className="px-4 py-3 text-center border-r border-slate-200"></td>
                                                        <td className="px-4 py-3 border-r border-slate-200">Cộng</td>
                                                        <td className="px-4 py-3 border-r border-slate-200"></td>
                                                        <td className="px-4 py-3 border-r border-slate-200"></td>
                                                        <td className="px-4 py-3 text-center border-r border-slate-200">{sheet.totalQuantity}</td>
                                                        <td className="px-4 py-3 text-right border-r border-slate-200"></td>
                                                        <td className="px-4 py-3 text-right text-emerald-700 border-r border-slate-200">{sheet.totalSalary.toLocaleString()}</td>
                                                        <td className="px-4 py-3"></td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
