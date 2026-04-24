const fs = require('fs');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    content = content.replace(/"customer":\s*"([^"]*)"/g, (match, customerName) => {
        if (customerName === "TRUNG CHUYỂN" || customerName === "Nhiều khách hàng" || customerName === "") {
            return `"customers": []`;
        } else {
            return `"customers": ["${customerName}"]`;
        }
    });

    fs.writeFileSync(filePath, content);
    console.log('Updated ' + filePath);
}

processFile('frontend/src/types.ts');
processFile('frontend/server.js');
