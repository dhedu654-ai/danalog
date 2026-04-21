# DỮ LIỆU ĐÃ XỬ LÝ & LÀM SẠCH — HỆ THỐNG DANALOG

> **Ngày xuất:** 13:45:29 21/4/2026

---

## I. THỐNG KÊ TỔNG HỢP

| Chỉ tiêu | Giá trị |
|----------|--------|
| Tổng bản ghi RouteConfig | 44 |
| → Tuyến vận chuyển | 41 |
| → Tên tuyến duy nhất (không trùng) | 40 |
| → Cấu hình lưu đêm | 2 |
| → Tuyến catch-all | 1 |
| Tổng Users | 12 |
| → Tài xế | 6 |
| Tổng khách hàng | 12 |
| Lương tài xế (min-max) | 30,000đ – 800,000đ |
| Định mức dầu (min-max) | 3L – 170L |

**Tuyến trùng tên:** Cảng Tiên Sa - Phú Bài, Huế

### Phân bổ vai trò

| Vai trò | Số lượng |
|---------|--------|
| Quản trị viên (ADMIN) | 1 |
| Nhân viên CS (CS) | 1 |
| Lái xe (DRIVER) | 6 |
| Điều phối viên (DISPATCHER) | 1 |
| Trưởng phòng Điều vận (DV_LEAD) | 1 |
| Trưởng phòng CS (CS_LEAD) | 1 |
| Kế toán (ACCOUNTANT) | 1 |

### Phân bổ tuyến theo loại hàng

| Loại hàng | Số tuyến |
|-----------|--------|
| Trung chuyển nội bộ | 11 |
| Kho hàng | 2 |
| Vận chuyển giấy | 2 |
| Vận chuyển container | 24 |
| Vận chuyển bột | 2 |

---

## II. DANH SÁCH TUYẾN ĐƯỜNG VẬN CHUYỂN (41 bản ghi, 40 tên duy nhất)

| STT | Mã | Tên tuyến | Khách hàng | Loại hàng | Lương TX | Dầu (L) | Giá 40F | Giá 20F | Ghi chú |
|-----|-----|-----------|-----------|-----------|---------|---------|---------|---------|--------|
| 1 | RT-060 | Nội bộ kho bãi Danalog 1 | TRUNG CHUYỂN | TR_C_NOI_BO | 30,000 | 8 | 0 | 0 |  |
| 2 | RT-061 | Giấy từ kho bãi Tiên Sa - cầu tàu Tiên Sa | TRUNG CHUYỂN | TR_C_CHUYEN_GIAY | 40,000 | 4 | 0 | 0 |  |
| 3 | RT-062 | Giấy từ kho Danalog - Cảng Tiên Sa | TRUNG CHUYỂN | TR_C_CHUYEN_GIAY | 90,000 | 27 | 0 | 0 |  |
| 4 | RT-063 | Tàu - Bãi Cảng Tiên Sa | TRUNG CHUYỂN | TR_C_NOI_BO | 60,000 | 3 | 0 | 0 |  |
| 5 | RT-064 | Danalog 1 - Các bãi ngoài (GFT, GLS, VCS…) | TRUNG CHUYỂN | TR_C_NOI_BO | 30,000 | 4 | 0 | 0 |  |
| 6 | RT-065 | Danalog 1,3,5<->Tiên Sa cont rỗng (Kiểm Soát Bãi) | TRUNG CHUYỂN | TR_C_NOI_BO | 30,000 | 7 | 0 | 0 |  |
| 7 | RT-066 | Tiên Sa - Danalog (Z6 sang cont) | TRUNG CHUYỂN | TR_C_NOI_BO | 140,000 | 17 | 0 | 0 |  |
| 8 | RT-067 | Tiên Sa <->Các Depot GFT, Chân Thật, SGS, TQ, VF | TRUNG CHUYỂN | TR_C_NOI_BO | 50,000 | 3 | 0 | 0 |  |
| 9 | RT-068 | Danalog <->Các Depot GFT, Chân Thật, SGS, TQ, VF | TRUNG CHUYỂN | TR_C_NOI_BO | 60,000 | 5 | 0 | 0 |  |
| 10 | RT-069 | Tiên Sa <-> Danang 1: cont có hàng | TRUNG CHUYỂN | TR_C_NOI_BO | 100,000 | 16 | 500,000 | 325,000 |  |
| 11 | RT-070 | Danalog 1 - Tiên Sa: cont có hàng | TRUNG CHUYỂN | TR_C_NOI_BO | 90,000 | 12 | 500,000 | 325,000 |  |
| 12 | RT-071 | Hàng hóa kho CFS cont 20' | Kho hàng DNL | KHO_CFS_20 | 90,000 | 21 | 0 | 130,000 |  |
| 13 | RT-072 | Hàng hóa kho CFS, cont 40' | Kho hàng DNL | KHO_CFS_40 | 120,000 | 11 | 200,000 | 0 |  |
| 14 | RT-073 | Cảng Tiên Sa - Cửa khẩu quốc tế Lao Bảo - Nhà máy Sunpaper Savannakhet, Lào (2 chiều) | QZY | VC_GIAY | 800,000 | 115 | 3,200,000 | 0 |  |
| 15 | RT-074 | Cảng Tiên Sa - Cửa khẩu quốc tế Lao Bảo - Nhà máy Sunpaper Savannakhet, Lào (1 chiều) | QZY | VC_GIAY | 400,000 | 170 | 3,000,000 | 0 |  |
| 16 | RT-075 | Cảng Tiên Sa Danang ( VietNam ) - Vientiane, Lào. | STEINWEG | VC_CONT | 800,000 | 146 | 2,700,000 | 1,755,000 |  |
| 17 | RT-076 | NM Tinh bột sắn, Sepon Lào - Cảng Tiên Sa Đà Nẵng (bốc container rỗng sang nhà máy đóng hàng) | PHÙNG GIA PHÁT | VC_BOT | 400,000 | 105 | 2,400,000 | 0 |  |
| 18 | RT-077 | Cảng Tiên Sa - Thateng, Sekong, Lào (qua cửa khẩu Lalay) | VẠN TƯỢNG | VC_BOT | 600,000 | 110 | 2,500,000 | 0 |  |
| 19 | RT-078 | Cảng Tiên Sa - Nhà máy Quặng Quảng Bình | Nhiều khách hàng | VC_CONT | 300,000 | 104 | 1,500,000 | 975,000 |  |
| 20 | RT-079 | Cảng Chu Lai - Hyosung Tam Thăng, Tam Kỳ, Quảng Nam | HYOSUNG | VC_CONT | 180,000 | 45 | 0 | 390,000 |  |
| 21 | RT-080 | Cảng Chu Lai - Hyosung Tam Thăng, Tam Kỳ, Quảng Nam (2 chuyến) | HYOSUNG | VC_CONT | 160,000 | 36 | 0 | 390,000 |  |
| 22 | RT-081 | Cảng Chu Lai - Hyosung Tam Thăng, Tam Kỳ, Quảng Nam (3 chuyến) | HYOSUNG | VC_CONT | 160,000 | 33 | 0 | 390,000 |  |
| 23 | RT-082 | Cảng Tiên Sa, Đà Nẵng- Hyosung Tam Thăng, Tam Kỳ, Quảng Nam | HYOSUNG | VC_CONT | 190,000 | 45 | 400,000 | 0 |  |
| 24 | RT-083 | Cảng Tiên Sa, Đà Nẵng- Hyosung Tam Thăng, Tam Kỳ, Quảng Nam (2 chuyến) | HYOSUNG | VC_CONT | 190,000 | 32 | 500,000 | 0 |  |
| 25 | RT-084 | Cảng Tiên Sa - KCN Thọ Quang | Nhiều khách hàng | VC_CONT | 150,000 | 22 | 400,000 | 260,000 |  |
| 26 | RT-085 | Cảng Tiên Sa - Phú Bài, Huế | Nhiều khách hàng | VC_CONT | 250,000 | 47 | 700,000 | 0 | ⚠️ Trùng tên |
| 27 | RT-086 | Cảng Tiên Sa - Phú Bài, Huế | Nhiều khách hàng | VC_CONT | 250,000 | 40 | 0 | 390,000 | ⚠️ Trùng tên |
| 28 | RT-087 | Cảng Tiên Sa - KCN Hòa Khánh | Nhiều khách hàng | VC_CONT | 90,000 | 10 | 200,000 | 130,000 |  |
| 29 | RT-088 | Cảng Tiên Sa - KCN Hòa Cầm | Nhiều khách hàng | VC_CONT | 110,000 | 14 | 300,000 | 195,000 |  |
| 30 | RT-089 | Cảng Tiên Sa - Điện Ngọc, Điện Bàn | Nhiều khách hàng | VC_CONT | 90,000 | 19 | 200,000 | 130,000 |  |
| 31 | RT-090 | DNL 1 - Điện Thắng, Sợi Quảng Đà | Nhiều khách hàng | VC_CONT | 100,000 | 13 | 400,000 | 260,000 |  |
| 32 | RT-091 | Cảng Tiên Sa - KCN Duy Xuyên | Nhiều khách hàng | VC_CONT | 300,000 | 68 | 900,000 | 585,000 |  |
| 33 | RT-092 | Cảng Tiên Sa - KCN Quảng Ngãi (Quanterm 125km) | Nhiều khách hàng | VC_CONT | 200,000 | 48 | 900,000 | 585,000 |  |
| 34 | RT-093 | Cảng Tiên Sa - KCN Quảng Ngãi (Vinalink 130km) | Nhiều khách hàng | VC_CONT | 200,000 | 63 | 700,000 | 455,000 |  |
| 35 | RT-094 | Cảng Tiên Sa - MN Hoà Thọ, Hà Lam, QN | Nhiều khách hàng | VC_CONT | 300,000 | 63 | 1,000,000 | 650,000 |  |
| 36 | RT-095 | Cảng Tiên Sa - KCN Đông Quế Sơn (Giáp Quốc lộ 1A ) | Nhiều khách hàng | VC_CONT | 300,000 | 68 | 1,000,000 | 650,000 |  |
| 37 | RT-096 | Cảng Tiên Sa - Lao Bảo, Quảng Trị (Gỗ) | Nhiều khách hàng | VC_CONT | 600,000 | 128 | 3,000,000 | 1,950,000 |  |
| 38 | RT-097 | Cảng Tiên Sa - Đông Hà, Quảng Trị (Gỗ) | Nhiều khách hàng | VC_CONT | 400,000 | 81 | 1,000,000 | 650,000 |  |
| 39 | RT-098 | Cảng Tiên Sa, Đà Nẵng đến Quy Nhơn | Nhiều khách hàng | VC_CONT | 300,000 | 87 | 1,300,000 | 845,000 |  |
| 40 | RT-099 | Cảng Tiên Sa - Đồng Hới, Quảng Bình | Nhiều khách hàng | VC_CONT | 500,000 | 90 | 1,400,000 | 910,000 |  |
| 41 | RT-100 | Cảng Tiên Sa - KCN Bắc Sông Cầu - Phú Yên | Nhiều khách hàng | VC_CONT | 500,000 | 84 | 1,800,000 | 1,170,000 |  |

---

## III. CẤU HÌNH LƯU ĐÊM (2 bản ghi)

| Mã | Khu vực | Đơn giá lưu đêm |
|-----|---------|----------------|
| RT-102 | Trong TP (INNER_CITY) | 120,000đ/đêm |
| RT-103 | Ngoài TP (OUTER_CITY) | 90,000đ/đêm |

---

## IV. DANH SÁCH NGƯỜI DÙNG (12 user)

| STT | Username | Họ tên | Vai trò | Biển số xe | Mật khẩu đã hash |
|-----|----------|--------|---------|-----------|------------------|
| 1 | admin | Administrator | Quản trị viên (ADMIN) | — | ✅ bcrypt |
| 2 | cs_user | CS Staff | Nhân viên CS (CS) | — | ✅ bcrypt |
| 3 | tiennd | Nguyễn Đức Tiên | Lái xe (DRIVER) | 43C-199.91 | ✅ bcrypt |
| 4 | anhnv | Nguyễn Văn Anh | Lái xe (DRIVER) | 43C-113.94 | ✅ bcrypt |
| 5 | thanhnv | Nguyễn Văn Thành | Lái xe (DRIVER) | 43C-444.55 | ✅ bcrypt |
| 6 | anhnt | Nguyễn Thế Anh | Lái xe (DRIVER) | 43C 11394 | ✅ bcrypt |
| 7 | sanghv | Hồ Viết Sáng | Lái xe (DRIVER) | 43C 19909 | ✅ bcrypt |
| 8 | hannv | Nguyễn Văn Hân | Lái xe (DRIVER) | 43C 19991 | ✅ bcrypt |
| 9 | dispatcher1 | Trần Minh Tú | Điều phối viên (DISPATCHER) | — | ✅ bcrypt |
| 10 | dvlead | Nguyễn Văn A | Trưởng phòng Điều vận (DV_LEAD) | — | ✅ bcrypt |
| 11 | cs_lead | Trần Anh Tuấn | Trưởng phòng CS (CS_LEAD) | — | ✅ bcrypt |
| 12 | ketoan | Lê Thị Hoa | Kế toán (ACCOUNTANT) | — | ✅ bcrypt |

---

## V. DANH MỤC KHÁCH HÀNG (12 khách)

| STT | Mã | Code | Tên hiển thị | Trạng thái | Số tuyến |
|-----|-----|------|-------------|-----------|--------|
| 1 | CUST-001 | QZY | QZY | ACTIVE | 2 |
| 2 | CUST-002 | STEINWEG | STEINWEG | ACTIVE | 1 |
| 3 | CUST-003 | VAN_TUONG | VẠN TƯỢNG | ACTIVE | 1 |
| 4 | CUST-004 | AST | AST | ACTIVE | 0 |
| 5 | CUST-005 | PHUNG_GIA_PHAT | PHÙNG GIA PHÁT | ACTIVE | 1 |
| 6 | CUST-006 | GEMADEPT_BOT | GEMADEPT-BỘT | ACTIVE | 0 |
| 7 | CUST-007 | HYOSUNG | HYOSUNG | ACTIVE | 5 |
| 8 | CUST-008 | XIDADONG | XIDADONG | ACTIVE | 0 |
| 9 | CUST-009 | KHO_DNL | Kho hàng DNL | ACTIVE | 2 |
| 10 | CUST-010 | DEPOT | Depot | ACTIVE | 0 |
| 11 | CUST-011 | TRUNG_CHUYEN | TRUNG CHUYỂN | ACTIVE | 11 |
| 12 | CUST-012 | MULTI | Nhiều khách hàng | ACTIVE | 18 |

---

## VI. CẤU HÌNH THUẬT TOÁN ĐIỀU PHỐI AI

### Trọng số Scoring (5 tiêu chí)

| Tiêu chí | Trọng số | Mô tả |
|----------|---------|-------|
| Continuity (Tính liên tục) | 40% | Tài xế vừa hoàn thành chuyến gần điểm lấy hàng mới |
| Availability (Khả dụng) | 25% | Tài xế đang rảnh hay đang bận |
| Route Experience (Kinh nghiệm tuyến) | 15% | Số lần tài xế đã chạy tuyến này |
| Performance (Hiệu suất) | 10% | Tỷ lệ hoàn thành, tỷ lệ từ chối |
| Load Balance (Cân bằng tải) | 10% | Phân bổ đều giữa các tài xế |

### Cấu hình SLA

| Tham số | Giá trị | Mô tả |
|---------|---------|-------|
| Thời gian phản hồi tài xế | 3 phút | Sau thời gian này → NO_RESPONSE |
| Bật nhắc nhở | Có | |
| Bật cảnh báo dashboard | Có | |

---

## VII. BẢNG CHUẨN HÓA KHU VỰC ĐỊA LÝ (17 mã vùng)

| Mã vùng | Loại | Tên nhận diện |
|---------|------|---------------|
| TIEN_SA | Cảng | Tiên Sa, Tien Sa |
| LIEN_CHIEU | Cảng | Liên Chiểu, Lien Chieu |
| CHU_LAI | Cảng | Chu Lai |
| QUY_NHON | Cảng | Quy Nhơn, Quy Nhon |
| CHAN_MAY | Cảng | Chân Mây, Chan May |
| LAO_BAO | Cửa khẩu | Lao Bảo, Lao Bao |
| BO_Y | Cửa khẩu | Bờ Y, Bo Y |
| LA_LAY | Cửa khẩu | La Lay |
| HOA_KHANH | KCN | Hòa Khánh, Hoa Khanh |
| DIEN_NAM | KCN | Điện Ngọc, Dien Ngoc, Điện Nam |
| KCN_DANANG | KCN | VSIP, KCN |
| DUNG_QUAT | KCN | Dung Quất, Dung Quat |
| DANANG | Thành phố | Đà Nẵng, Da Nang, Danang |
| HUE | Thành phố | Huế, Hue |
| QUANG_TRI | Thành phố | Quảng Trị, Quang Tri |
| QUANG_NGAI | Thành phố | Quảng Ngãi, Quang Ngai |
| LAOS | Quốc tế | Savannakhet, Lào, Lao |

### Nhóm vùng lân cận (cho AI Continuity Scoring)

- **Đà Nẵng Metro**: TIEN_SA ↔ LIEN_CHIEU ↔ HOA_KHANH ↔ KCN_DANANG ↔ DANANG
- **Quảng Nam**: DIEN_NAM ↔ CHU_LAI ↔ DUNG_QUAT
- **Huế - Quảng Trị**: HUE ↔ CHAN_MAY ↔ QUANG_TRI ↔ LAO_BAO ↔ LA_LAY
- **Phía Nam**: QUY_NHON ↔ QUANG_NGAI
- **Biên giới Lào**: LAO_BAO ↔ LAOS

---

## VIII. TÓM TẮT CÁC PHƯƠNG PHÁP XỬ LÝ & LÀM SẠCH

| # | Nhóm dữ liệu | Phương pháp | File nguồn |
|---|--------------|------------|------------|
| 1 | RouteConfigs | Excel → JSON cấu trúc, phân loại cargoType, tách giá 4 chiều | server.js, db.json |
| 2 | Customers | Mã hóa code Latin, phân loại nội bộ/đối tác | server.js |
| 3 | Users | Hash mật khẩu bcrypt, phân quyền RBAC 7 vai trò | db.json |
| 4 | Tickets | sanitizeTicketForDb(): parse JSON an toàn, map field, loại undefined | api.ts |
| 5 | F/E values | Normalize: Full→F, Empty→E | orders/index.js |
| 6 | Night Stay Location | Normalize: IN_CITY/INNER_CITY→INNER_CITY | TicketModal.tsx |
| 7 | Revenue/Salary | Auto-lookup từ RouteConfig + Snapshot Pattern | TicketModal.tsx |
| 8 | Salary History | Time-Travel Pricing (effectiveDate) | DriverSalaryTable.tsx |
| 9 | Area Codes | NLP normalizeArea(): tên tiếng Việt→mã vùng chuẩn | dispatch/suggest.js |
| 10 | Route dedup | Deduplicate by customer+routeName+cargoType | api.ts |
| 11 | License Plates | Array→Set dedup khi xuất bảng lương | DriverSalaryTable.tsx |
| 12 | Date/Time | Local datetime→ISO 8601 string | TicketModal.tsx |

---

*Xuất tự động bởi export_processed_data.js*
