const fetch = globalThis.fetch;

const API_URL = 'http://localhost:3002/api';

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function testFlow() {
    console.log("=== BẮT ĐẦU TEST LUỒNG ===");
    try {
        // 1. CS TẠO ĐƠN HÀNG
        console.log("\n[1/5] CS (cs_user) đang tạo đơn hàng mới...");
        const orderPayload = {
            id: 'ORD-' + Date.now(),
            orderCode: 'TEST-' + Date.now(),
            customerId: 'CUST-001',
            customerName: 'QZY',
            routeId: 'RT-QZY-01',
            routeName: 'Cảng Tiên Sa - Cửa khẩu quốc tế Lao Bảo - Nhà máy Sunpaper Savannakhet, Lào (2 chiều)',
            pickupDate: new Date().toISOString(),
            deliveryDate: new Date().toISOString(),
            containerCount: 1,
            containerSize: '40',
            fe: 'F',
            containers: [{ size: '40', fe: 'F', count: 1 }],
            status: 'NEW',
            createdBy: 'cs_user',
            createdAt: new Date().toISOString()
        };

        const createRes = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderPayload)
        });
        const orderData = await createRes.json();
        
        let ticket = orderData.generatedTickets && orderData.generatedTickets[0];
        if(!ticket) {
            console.error("Không tạo được ticket!");
            return;
        }
        console.log(`- Đã tạo đơn hàng thành công kèm Phiếu: ${ticket.id}`);
        await printNotifications();

        await fetch(`${API_URL}/tickets/${ticket.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'CHỜ LẤY HÀNG' })
        });

        // 2. ĐIỀU VẬN ASSIGN CHO TÀI XẾ 1 (tiennd)
        console.log(`\n[2/5] Điều vận (dispatcher1) assign phiếu ${ticket.id} cho tài xế tiennd...`);
        const assign1Res = await fetch(`${API_URL}/dispatch/assign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ticketId: ticket.id,
                driverId: 'tiennd',
                assignType: 'manual',
                dispatcherUsername: 'dispatcher1'
            })
        });
        
        const assign1Data = await assign1Res.json();
        if(assign1Data.error) {
            console.error("Assign lỗi:", assign1Data.error);
        } else {
            console.log(`- Gán thành công. Trạng thái phiếu: ${assign1Data.dispatchStatus || assign1Data.status}`);
        }
        await printNotifications();

        // 3. TÀI XẾ 1 TỪ CHỐI
        console.log(`\n[3/5] Tài xế (tiennd) từ chối phiếu ${ticket.id}...`);
        const rejectRes = await fetch(`${API_URL}/dispatch/driver-response`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ticketId: ticket.id,
                driverUsername: 'tiennd',
                response: 'REJECTED',
                rejectReasonCode: 'BUSY',
                reason: 'Xe đang sửa'
            })
        });
        const rejectData = await rejectRes.json();
        console.log(`- Đã từ chối. Phản hồi: ${rejectData.response}`);
        await printNotifications();

        // 4. ĐIỀU VẬN ASSIGN LẠI CHO TÀI XẾ 2 (anhnv)
        console.log(`\n[4/5] Điều vận (dispatcher1) assign lại phiếu ${ticket.id} cho tài xế anhnv...`);
        const assign2Res = await fetch(`${API_URL}/dispatch/assign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ticketId: ticket.id,
                driverId: 'anhnv',
                assignType: 'manual',
                dispatcherUsername: 'dispatcher1'
            })
        });
        const assign2Data = await assign2Res.json();
        if(assign2Data.error) {
            console.error("Assign 2 lỗi:", assign2Data.error);
        } else {
            console.log(`- Gán lại thành công. Trạng thái phiếu: ${assign2Data.dispatchStatus || assign2Data.status}`);
        }
        await printNotifications();

        // 5. TÀI XẾ 2 NHẬN
        console.log(`\n[5/5] Tài xế (anhnv) NHẬN phiếu ${ticket.id}...`);
        const acceptRes = await fetch(`${API_URL}/dispatch/driver-response`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ticketId: ticket.id,
                driverUsername: 'anhnv',
                response: 'ACCEPTED'
            })
        });
        const acceptData = await acceptRes.json();
        console.log(`- Đã NHẬN. Phản hồi: ${acceptData.response}`);
        await printNotifications();

        console.log("\n=== HOÀN TẤT LUỒNG TEST ===");

    } catch (e) {
        console.error("Test flow failed:", e);
    }
}

let lastNotifCount = 0;
async function printNotifications() {
    await delay(300);
    const res = await fetch(`${API_URL}/notifications`);
    const notifs = await res.json();
    
    if(notifs && notifs.length > 0) {
        if (lastNotifCount === 0) {
            console.log(`  --> Hệ thống ghi nhận [${notifs.length}] thông báo (Log thông báo mới nhất):`);
            console.log(`      + Role: ${notifs[0].targetRole} | Thông báo: "${notifs[0].message}"`);
        } else {
            let count = notifs.length - lastNotifCount;
            if(count > 0) {
                console.log(`  --> Phát hiện [${count}] thông báo mới bắn đi:`);
                const newNotifs = notifs.slice(0, count);
                newNotifs.forEach(n => {
                    console.log(`      + Role: ${n.targetRole} | Thông báo: "${n.message}"`);
                });
            }
        }
        lastNotifCount = notifs.length;
    }
}

testFlow();
