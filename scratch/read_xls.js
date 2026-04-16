const xlsx = require('xlsx');
const fs = require('fs');

const path = 'd:/Downloads/123456 - Copy/2025.03.24-File_Mau_Cau_Hinh_Don_Gia_San_Pham_danalog -PKDVan Tai update - gửi Đức.xlsx';
const workbook = xlsx.readFile(path);

let allRoutes = [];
for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { defval: "" });
    allRoutes = allRoutes.concat(data);
}

fs.writeFileSync('routes_parsed.json', JSON.stringify(allRoutes, null, 2));
console.log('Parsed', allRoutes.length, 'rows');
