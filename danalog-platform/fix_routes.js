const fs = require('fs');

function processRoutes() {
    const tsFile = 'frontend/src/types.ts';
    const content = fs.readFileSync(tsFile, 'utf8');

    const anchor = 'export const MOCK_ROUTES_CONFIG: RouteConfig[] = ';
    const startIndex = content.indexOf(anchor);
    if(startIndex === -1) {
        console.log('Not found');
        return;
    }

    const arrStart = startIndex + anchor.length;
    let braceCount = 0;
    let foundArray = false;
    let endIndex = arrStart;
    
    for (let i = arrStart; i < content.length; i++) {
        const char = content[i];
        if (char === '[') { braceCount++; foundArray = true; }
        else if (char === ']') braceCount--;
        
        if (foundArray && braceCount === 0) {
            endIndex = i;
            break;
        }
    }
    
    const arrayStr = content.substring(arrStart, endIndex + 1);
    
    // Evaluate the array
    const script = "module.exports = " + arrayStr + ";";
    fs.writeFileSync('temp_routes_data.js', script);
    const routes = require('./temp_routes_data.js');
    
    // Process according to user instructions
    const newRoutes = [];
    const removedIds = [];
    
    for (const r of routes) {
        // 1. Z6 sang cont (bỏ note)
        if (r.routeName.includes('(Z6 sang cont)')) {
            r.routeName = r.routeName.replace(/\(Z6 sang cont\)/g, '').trim();
        }
        
        // 2. Tiên Sa <-> Danang 1 / Danalog 1: cont có hàng (combine, remove note)
        if (r.id === 'RT-069' || r.id === 'RT-070') {
            if (r.id === 'RT-070') {
                removedIds.push(r.id);
                continue; // Skip RT-070
            }
            r.routeName = 'Tiên Sa <-> Danalog 1'; // Unified name
        }
        
        // 3. Kho CFS 20 / 40 -> remove size note
        if (r.id === 'RT-071' || r.id === 'RT-072') {
            if (r.id === 'RT-072') {
                removedIds.push(r.id);
                continue; // Skip 40'
            }
            r.routeName = 'Hàng hóa kho CFS';
        }
        
        // 4. Bỏ trong ngoặc Sepon Lào
        if (r.id === 'RT-076') {
             r.routeName = 'NM Tinh bột sắn, Sepon Lào - Cảng Tiên Sa Đà Nẵng';
        }
        
        // 5. Cảng Chu Lai - Hyosung (2-3 chuyến) -> Duplicate
        if (r.id === 'RT-080' || r.id === 'RT-081') {
             removedIds.push(r.id);
             continue;
        }
        
        // 6. Cảng Tiên Sa - Hyosung (2 chuyến)
        if (r.id === 'RT-083') {
             removedIds.push(r.id);
             continue;
        }
        
        // 7. Cảng Tiên Sa - Phú Bài (trùng 85, 86)
        if (r.id === 'RT-086') {
             removedIds.push(r.id);
             continue;
        }
        
        // 8. QN -> Quảng Nam
        if (r.id === 'RT-094') {
             r.routeName = r.routeName.replace('QN', 'Quảng Nam');
        }
        
        // 9. đến -> '-'  (Cảng Tiên Sa, Đà Nẵng đến Quy Nhơn)
        if (r.id === 'RT-098') {
             r.routeName = r.routeName.replace('đến', '-');
        }
        
        // 10. Tuyến đường khác
        if (r.id === 'RT-101') {
             removedIds.push(r.id);
             continue;
        }
        
        // Fix spelling errors like "Danang 1" -> "Danalog 1"
        if (r.routeName.includes('Danang 1')) {
            r.routeName = r.routeName.replace('Danang 1', 'Danalog 1');
        }

        newRoutes.push(r);
    }
    
    // Now replace the content in types.ts
    const newArrayStr = JSON.stringify(newRoutes, null, 4);
    
    const beforeStr = content.substring(0, arrStart);
    const afterStr = content.substring(endIndex + 1);
    
    // JSON.stringify will add quotes to everything, so it changes single quotes to double, but it's acceptable.
    
    fs.writeFileSync(tsFile, beforeStr + newArrayStr + afterStr);
    console.log('Removed specific duplicates: ' + removedIds.join(', '));
}

processRoutes();
