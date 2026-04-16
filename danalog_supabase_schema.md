# Supabase Schema: Danalog Transport Platform

Cấu trúc cơ sở dữ liệu hiện tại đang vận hành trên Supabase PostgreSQL, tuân thủ kiến trúc Serverless với các bảng được định nghĩa để lưu trữ, quản lý điều phối và tính toán.

## 1. Bảng `Users`
*Quản lý thông tin tài khoản và Role-based Access Control (RBAC).*
- `id` (UUID): Khóa chính
- `username` (String): Tên đăng nhập (sử dụng như khóa liên kết DriverId)
- `password` (String): Mật khẩu (lưu plain-text hoặc hash tùy config)
- `role` (Enum): `ADMIN`, `CS`, `CS_LEAD`, `DISPATCHER`, `DV_LEAD`, `ACCOUNTANT`, `DRIVER`
- `name` (String): Tên hiển thị
- `licensePlate` (String, Optional): Biển số xe (Dành cho DRIVER)
- `status` (Enum): `ACTIVE`, `INACTIVE`
- `createdAt` (Timestamptz)

## 2. Bảng `Orders`
*Đơn hàng gốc được tạo bởi CS, từ đây sinh ra các `Tickets`.*
- `id` (String): `ORD-XXXXXX`
- `orderCode` (String): Mã booking / mã đơn khách hàng
- `customerId` (String), `customerName` (String): Thông tin khách
- `routeId` (String), `routeName` (String): Tuyến đường
- `pickupDate`, `deliveryDate` (Timestamptz): Thời gian dự kiến lấy/giao
- `containerCount` (Int), `containerSize` (String), `fe` (String): Thông tin cont
- `status` (Enum): `NEW`, `PROCESSING`, `DONE`, `BILLED`
- `ticketsGenerated` (Boolean): Trạng thái đã tách phiếu
- `createdAt` (Timestamptz), `createdBy` (String)

## 3. Bảng `Tickets`
*Phiếu vận chuyển (Trip) - Entity cốt lõi nhất của hệ thống, luân chuyển qua các trạng thái CS, Điều phối, và Kế toán.*
- `id` (String): `TK-XXXXXX`
- `orderId` (String): FK Liên kết về Orders
- `route` (String), `routeId` (String): Thông tin lộ trình
- `customerCode` (String)
- `driverUsername` (String): Tài xế được gán (liên kết với Users.username)
- `driverName` (String), `licensePlate` (String)
- `containerNo` (String), `size` (String), `fe` (String)
- **Status Fields:**
  - `status` (String): Trạng thái chính (`MỚI TẠO`, `ĐÃ ĐIỀU XE`, `ĐANG VẬN CHUYỂN`, `COMPLETED`, `APPROVED`, `PENDING`)
  - `dispatchStatus` (String): Trạng thái điều vận AI/Manual (`WAITING_AUTO`, `DRIVER_ASSIGNED`, `DRIVER_ACCEPTED`)
  - `accountantStatus` (String): Kế toán duyệt (`PENDING`, `ACCEPTED`, `REJECTED`)
- **Finance Fields:**
  - `revenue` (Float): Doanh thu tuyến
  - `driverSalary` (Float): Lương thực tế của tài xế
  - Cùng các phụ phí `liftOnFee`, `liftOffFee`, v.v.
- **Traking Fields:**
  - `statusHistory` (JSONB): Lịch sử chạy (`[{status, timestamp, user}]`)
  - `dispatchVersion` (Int): Optimistic Locking ngăn chặn trùng Dispatch

## 4. Bảng `DispatchLogs`
*Bảng Audit dùng để ghi nhận lịch sử thuật toán AI hoặc thao tác Manual ép tài xế.*
- `id` (String): `LG-XXXXXX`
- `ticketId` (String): Mã vé
- `assignedDriverId` (String): Mã tài xế (username)
- `assignType` (String): `manual`, `auto`, `ai_suggested`, `override`
- `responseStatus` (String): `WAITING`, `ACCEPTED`, `REJECTED`
- `candidates` (JSONB), `rejectedCandidates` (JSONB): Log chạy của thuật toán lấy điểm AI
- `reason`, `overrideNote` (String)
- `timestamp` (Timestamptz)

## 5. Bảng `RouteConfigs`
*Quản lý tuyến đường và định mức cho kế toán và hệ thống.*
- `id` (String): `RT-XXXX`
- `routeName` (String), `customer` (String)
- `revenue` (JSONB): Bảng giá thu khách hàng (`price40F`, `price20F`, ...)
- `salary` (JSONB): Cấu hình cấu trúc lương xe tải (`driverSalary`, ...)
- `fuel` (JSONB): Định mức dầu phân bổ
- `status` (Enum): `ACTIVE`, `INACTIVE`
- `pendingChanges` (JSONB): Thay đổi chờ áp dụng (cho tương lai)

## 6. Các bảng phụ trợ khác
- **`Notifications`**: `id`, `type`, `message`, `targetRole`, `to` (username), `read`, `createdAt`, `relatedId`
- **`FuelTickets`**: Quản lý phiếu nhiên liệu (Tài xế up ảnh) 
- **`TicketCorrections`**: Yêu cầu sửa đổi phiếu sai lệch (Driver -> CS)
- **`PublishedSalaries`**: Quản lý chốt lương tài xế theo tháng
- **`ProfileUpdateRequests`**: Thay đổi biển số xe/hồ sơ của tài xế, cần ADMIN duyệt.

*Mô hình được tổ chức theo kiến trúc Denormalization một phần ở `Tickets` (lưu cả `driverName`, `licensePlate` thay vì join hoàn toàn) để phù hợp kiến trúc Serverless, giảm chi phí đọc từ Frontend.*
