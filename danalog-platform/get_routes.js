const fs = require('fs');
const content = fs.readFileSync('frontend/src/types.ts', 'utf8');

const anchor = 'export const MOCK_ROUTES_CONFIG: RouteConfig[] = ';
const startIndex = content.indexOf(anchor); 
if (startIndex !== -1) {
    const arrayStart = startIndex + anchor.length;
    let braceCount = 0;
    let arrayContent = '';
    let foundArray = false;
    for (let i = arrayStart; i < content.length; i++) {
        const char = content[i];
        if (char === '[') {
            braceCount++;
            foundArray = true;
        } else if (char === ']') {
            braceCount--;
        }
        arrayContent += char;
        if (foundArray && braceCount === 0) {
            break;
        }
    }
    
    const script = "module.exports = " + arrayContent + ";";
    fs.writeFileSync('temp_eval.js', script);
    const routes = require('./temp_eval.js');
    
    let md = '# Danh Mục Tuyến Đường Danalog\n\n';
    md += '| ID | Tên tuyến đường | Phân loại | Tự động Bật Lưu đêm |\n';
    md += '|---|---|---|---|\n';
    routes.forEach(r => {
        let loc = r.nightStayLocation;
        if (loc === 'INNER_CITY' || loc === 'IN_CITY') loc = 'Trong Thành Phố';
        else if (loc === 'OUTER_CITY' || loc === 'OUT_CITY') loc = 'Ngoài Thành Phố';
        else loc = 'Chưa quy hoạch';
        
        md += `| **${r.id}** | ${r.routeName.replace(/\|/g, '-')} | ${r.customer} | ${loc} |\n`;
    });

    fs.writeFileSync('routes_output.md', md, 'utf8');
    console.log('routes_output.md created successfully.');
} else {
    console.log('Anchor not found');
}
