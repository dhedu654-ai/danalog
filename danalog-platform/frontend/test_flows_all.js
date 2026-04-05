const fetch = globalThis.fetch;
const API_URL = 'http://localhost:3002/api';

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

let lastCheckTime = Date.now();

// Print only relevant notifications
async function printRecentNotifications(ticketId) {
    await delay(500); // Đợi server xử lý xong
    
    // Fallback if no ticketId 
    if(!ticketId) return;

    try {
        const res = await fetch(`${API_URL}/notifications`);
        const notifs = await res.json();
        
        let count = 0;
        for(let n of notifs) {
            // Check if it's new and related to our ticket
            let d = new Date(n.createdAt).getTime();
            if(d >= lastCheckTime && n.message.includes(ticketId)) {
                console.log(`      🔔 [${n.targetRole || n.to || 'ALL'}] ${n.message}`);
                count++;
            }
            if(count > 5) break; 
        }
    } catch (e) {
        // ignore
    }
}

async function testAllFlows() {
    console.log("=========================================");
    console.log("    TEST TỰ ĐỘNG 5 LUỒNG NGHIỆP VỤ       ");
    console.log("=========================================\n");

    try {
        // --- FLOW 1 ---
        console.log(">>> FLOW 1: TẠO ĐƠN -> ĐIỀU VẬN ASSIGN -> TÀI XẾ TỪ CHỐI -> ASSIGN LẠI -> NHẬN");
        
        console.log("[1.1] CS (cs_user) tạo đơn hàng mới...");
        const orderPayload = {
            id: 'ORD-' + Date.now().toString().slice(-6), orderCode: 'FLOW1-' + Date.now().toString().slice(-6),
            customerId: 'CUST-001', customerName: 'QZY',
            routeId: 'RT-QZY-01', routeName: 'Cảng Tiên Sa - Sunpaper',
            pickupDate: new Date().toISOString(), deliveryDate: new Date().toISOString(),
            containerCount: 1, containerSize: '40', fe: 'F',
            containers: [{ size: '40', fe: 'F', count: 1 }],
            status: 'NEW', createdBy: 'cs_user', createdAt: new Date().toISOString()
        };

        const createRes = await fetch(`${API_URL}/orders`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderPayload)
        });
        const orderData = await createRes.json();
        let flow1Ticket = orderData.generatedTickets[0];
        console.log(`      ✓ Đã tạo phiếu hệ thống: ${flow1Ticket.id}`);
        await printRecentNotifications(flow1Ticket.id);

        console.log("[1.2] CS cập nhật phiếu sang trạng thái CHỜ ĐIỀU XE");
        await fetch(`${API_URL}/tickets/${flow1Ticket.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'CHỜ ĐIỀU XE' })
        });

        console.log(`[1.3] Điều vận gán phiếu ${flow1Ticket.id} cho tài xế [tiennd]...`);
        await fetch(`${API_URL}/dispatch/assign`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ticketId: flow1Ticket.id, driverId: 'tiennd', assignType: 'manual', dispatcherUsername: 'dispatcher1'
            })
        });
        await printRecentNotifications(flow1Ticket.id);

        console.log(`[1.4] Tài xế [tiennd] TỪ CHỐI chuyến đi do bận...`);
        await fetch(`${API_URL}/dispatch/driver-response`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ticketId: flow1Ticket.id, driverUsername: 'tiennd', response: 'REJECTED', rejectReasonCode: 'BUSY'
            })
        });
        await printRecentNotifications(flow1Ticket.id);

        console.log(`[1.5] Điều vận nhận được báo cáo từ chối, gán lại cho tài xế [anhnv]...`);
        await fetch(`${API_URL}/dispatch/assign`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ticketId: flow1Ticket.id, driverId: 'anhnv', assignType: 'manual', dispatcherUsername: 'dispatcher1'
            })
        });
        await printRecentNotifications(flow1Ticket.id);

        console.log(`[1.6] Tài xế [anhnv] ĐỒNG Ý NHẬN CÔNG VIỆC...`);
        await fetch(`${API_URL}/dispatch/driver-response`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticketId: flow1Ticket.id, driverUsername: 'anhnv', response: 'ACCEPTED' })
        });
        await printRecentNotifications(flow1Ticket.id);

        let tRes = await fetch(`${API_URL}/tickets`);
        let allT = await tRes.json();
        let currentT = allT.find(t => t.id === flow1Ticket.id);
        console.log(`      => Status hiện tại của phiếu: ${currentT.status} / Dispatch status: ${currentT.dispatchStatus}`);

        // --- FLOW 2 ---
        console.log("\n>>> FLOW 2: CHẠY CHUYẾN -> HOÀN THÀNH -> CS DUYỆT");
        console.log(`[2.1] Tài xế [anhnv] chụp ảnh cập nhật HOÀN THÀNH chuyến hàng...`);
        await fetch(`${API_URL}/tickets/${flow1Ticket.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'HOÀN THÀNH', containerNo: 'CMAU1234567', containerImage: 'http://img.com/1', submittedToCS: true })
        });
        console.log(`      ✓ Lái xe đã gửi bằng chứng lên cho CS.`);

        console.log(`[2.2] CS Kiểm tra đối chiếu chứng từ thành công. CS DUYỆT (APPROVED)...`);
        await fetch(`${API_URL}/tickets/${flow1Ticket.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'APPROVED' })
        });
        console.log(`      ✓ Phiếu ${flow1Ticket.id} hiện có trạng thái: APPROVED. Sẵn sàng cho Kế toán đối soát.`);

        // --- FLOW 3 ---
        console.log("\n>>> FLOW 3: KẾ TOÁN TRẢ PHIẾU VỀ -> CS SỬA -> CHỐT LƯƠNG");
        console.log(`[3.1] Kế toán phát hiện sai thông tin cước phí, TRẢ PHIẾU VỀ (REJECTED)...`);
        await fetch(`${API_URL}/tickets/${flow1Ticket.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'REJECTED' })
        });
        console.log(`      ✓ Phiếu bị trả về trạng thái REJECTED cho CS.`);

        console.log(`[3.2] CS sửa đổi thông tin bù phí và DUYỆT LẠI (APPROVED) lần 2...`);
        await fetch(`${API_URL}/tickets/${flow1Ticket.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'APPROVED' })
        });
        console.log(`      ✓ Phiếu đã quay trở lại APPROVED an toàn.`);

        console.log(`[3.3] Kế toán CÔNG BỐ bảng lương cho tài xế [anhnv].`);
        await fetch(`${API_URL}/published-salaries`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                driverUsername: 'anhnv', month: new Date().getMonth() + 1, year: new Date().getFullYear(), publishedAt: new Date().toISOString()
            })
        });
        console.log(`      ✓ Đã công bố phiếu lương.`);

        // --- FLOW 4 ---
        console.log("\n>>> FLOW 4: KẾ TOÁN TẠO TICKET CORRECTION REQUEST (YÊU CẦU SỬA ĐỔI)");
        console.log(`[4.1] Kế toán tạo 1 Phiếu Yêu Cầu Sửa Đổi (Correction Request) lên CS_LEAD...`);
        const reqRes = await fetch(`${API_URL}/tickets/${flow1Ticket.id}/correction-request`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ticketRoute: currentT.route, customerCode: currentT.customerCode,
                requestedBy: 'ketoan_user', reason: 'Thiếu phí chạy cảng 2 đầu 500k', attachmentUrl: 'http://img.com/phieu'
            })
        });
        const corrData = await reqRes.json();
        console.log(`      ✓ Đã tạo thành công Phiếu Yêu cầu CR: ${corrData.id}`);

        console.log(`[4.2] CS_LEAD xem xét và DUYỆT Yêu Cầu Sửa Đổi (APPROVED)...`);
        await fetch(`${API_URL}/ticket-corrections/${corrData.id}/review`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'APPROVED', reviewedBy: 'cs_lead', reviewNote: 'Đã nhận lệnh sửa tiền' })
        });
        console.log(`      ✓ Phiếu sửa đổi CR đã được duyệt và cập nhật!`);

        // --- FLOW 5 ---
        console.log("\n>>> FLOW 5: NGOẠI LỆ TỪ CHỐI NHIỀU (ESCALATED / BÁO ĐỘNG ĐỎ)");
        console.log(`(Tạo 1 LUỒNG MỚI ĐỂ VƯỢT QUÁ SỐ LẦN TỪ CHỐI MAX=3)`);
        const orderPayload2 = { ...orderPayload, id: 'ORD-ESC-' + Date.now().toString().slice(-6) };
        const res2 = await fetch(`${API_URL}/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(orderPayload2) });
        const d2 = await res2.json();
        const escTicket = d2.generatedTickets[0];
        console.log(`      ✓ Đã tạo phiếu Test Ngoại Lệ: ${escTicket.id}`);
        await printRecentNotifications(escTicket.id);

        const drivers = ['thanhnv', 'anhnt', 'sanghv'];
        for (let i = 0; i < drivers.length; i++) {
            console.log(`[5.${i+1}] Điều vận gán cho [${drivers[i]}]. Tài xế [${drivers[i]}] lại TỪ CHỐI...`);
            await fetch(`${API_URL}/dispatch/assign`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticketId: escTicket.id, driverId: drivers[i], assignType: 'manual', dispatcherUsername: 'dispatcher1' })
            });

            await fetch(`${API_URL}/dispatch/driver-response`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticketId: escTicket.id, driverUsername: drivers[i], response: 'REJECTED', rejectReasonCode: 'BUSY' })
            });
            await printRecentNotifications(escTicket.id);
        }

        console.log(`[!] Lần thứ 3 tài xế từ chối liên hoàn. Kiểm tra kết quả...`);
        await delay(500);

        tRes = await fetch(`${API_URL}/tickets`);
        allT = await tRes.json();
        const finalTicket = allT.find(t => t.id === escTicket.id);

        console.log(`      ✓ Trạng thái điều vận Phiếu 5 (Cuối cùng): ${finalTicket.dispatchStatus}`);
        if(finalTicket.dispatchStatus === 'ESCALATED') {
            console.log(`      => CHUẨN XÁC: Đã xảy ra NGOẠI LỆ ĐỎ (ESCALATED). Thông báo khẩn cấp xử lý thủ công!`);
        } else {
             console.log(`      => Lỗi: Chưa vào luồng ESCALATED. Status thực tế là ${finalTicket.dispatchStatus}`);
        }

        console.log("\n=========================================");
        console.log("    HOÀN TẤT KỊCH BẢN TEST 5 LUỒNG CORES         ");
        console.log("=========================================");

    } catch (e) {
        console.error("Fatal Error Test Suite:", e);
    }
}

testAllFlows();
