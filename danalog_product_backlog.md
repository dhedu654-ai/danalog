# Product Backlog: Hệ thống Quản lý Vận tải Danalog

## Mục tiêu (Product Vision)
Tự động hóa, số hóa và tối ưu hóa toàn bộ quy trình xoay quanh việc vận tải container hằng ngày, từ khâu tiếp nhận đơn hàng (CS), điều phối xe tự động hóa (Dispatch/AI), đến giao nhận qua Mobile App (Driver), cũng như minh bạch đối soát và tính lương tự động (Accountant/Finance).

---

## Danh sách vai trò Người dùng (User Roles)
1. **ADMIN (Quản trị viên):** Quản lý toàn bộ quyền hạn, tài khoản hệ thống, định mức tuyến đường và xem tất cả dashboard.
2. **CS (Nhân viên CS / Đơn hàng):** Tạo đơn hàng, kiểm duyệt phiếu đóng, xử lý yêu cầu sửa đổi phiếu (Correction Requests).
3. **CS_LEAD (Trưởng phòng CS):** Duyệt các quy trình tài chính liên đới của phòng CS, chốt chất lượng phiếu.
4. **DISPATCHER (Điều phối viên):** Giao việc cho tài xế, sử dụng AI/Suggest để chỉ định tài xế, theo dõi tiến độ thời gian thực (SLA).
5. **DV_LEAD (Trưởng phòng Điều vận):** Giám sát hiệu suất tài xế, độ nhạy SLA.
6. **ACCOUNTANT (Kế toán):** Tính lương theo định mức, thu/chi khách hàng, quản lý phí nhiên liệu, đối soát phiếu vận hành.
7. **DRIVER (Lái xe - Mobile App):** Nhận lệnh (Phiếu), chấp nhận/từ chối lệnh, bấm chuyển trạng thái, tạo phiếu đổ dầu, xem bảng lương.

---

## Epic 1: Quản trị Hệ thống & Setup (Admin & Config)
- **Story 1.1:** *Là ADMIN, tôi muốn quản lý danh sách tài khoản (thêm/sửa/xóa) và phân quyền tương ứng.* 
- **Story 1.2:** *Là ADMIN/ACCOUNTANT, tôi muốn thiết lập Cấu hình Tuyến đường (RouteConfig), bao gồm giá thu (Revenue), lương tài xế (Salary), định mức nhiên liệu (Fuel).*
- **Story 1.3:** *Là ADMIN, tôi muốn kiểm duyệt (Approve) hoặc từ chối thông tin thay đổi hồ sơ lái xe (Biển số xe, SĐT).*

## Epic 2: Quy trình Đơn hàng & Kiểm duyệt (CS & Order Management)
- **Story 2.1:** *Là CS, tôi muốn tạo Đơn hàng (TransportOrder) điền các thông tin: Tuyến, Số container, Loại cont, Rỗng/Đầy. Hệ thống tự tách thành các Phiếu vận tải (Tickets) tương ứng.*
- **Story 2.2:** *Là CS, tôi muốn kiểm duyệt và chốt tính hợp lệ của từng Phiếu Vận Tải sau khi tài xế đã hoàn thành.*
- **Story 2.3:** *Là CS, tôi muốn nhận thông báo hoặc duyệt các Yêu cầu Sửa đổi Phiếu (Correction Requests) của tài xế.*

## Epic 3: Điều vận Tự động & Quản lý SLA (Dispatch Hub)
- **Story 3.1:** *Là DISPATCHER, tôi muốn thấy Bảng điều vận trung tâm với các Phiếu "Chờ Điều Xe" xếp hạng ưu tiên theo thuật toán thời gian.*
- **Story 3.2:** *Là DISPATCHER, tôi có thể dùng tính năng AI Suggest để ưu tiên các Tài xế Sẵn sàng, Gần nhất hoặc Dư năng lực thay vì gán ngẫu nhiên.*
- **Story 3.3:** *Là DISPATCHER, tôi muốn theo dõi SLA (Quá hạn nhận lệnh) dưới dạng Cảnh báo (Alerts) đỏ nếu quá 5 phút chưa nhận.*
- **Story 3.4:** *Là DISPATCHER, tôi có thể Override (Chỉ định ép buộc) tài xế kèm theo lý do cụ thể nếu Auto-suggest không thỏa mãn.*

## Epic 4: Mobile App Lái xe (Driver Experience)
- **Story 4.1:** *Là DRIVER, tôi muốn có cơ chế cảnh báo popup thời gian thực (hoặc tự tải) khi có đơn hàng mới.*
- **Story 4.2:** *Là DRIVER, tôi muốn có lựa chọn Đồng ý/Từ chối phiếu (kèm lý do).*
- **Story 4.3:** *Là DRIVER, tôi muốn thay đổi trạng thái tiến độ ("Đã Nhận" -> "Đang Vận Chuyển" -> "Hoàn Thành").*
- **Story 4.4:** *Là DRIVER, tôi muốn tạo Phiếu đổ dầu bằng cách tải ảnh lên để hệ thống duyệt trừ / tính tiền lương thực.*

## Epic 5: Tài chính & Đối soát (Finance & Accounting)
- **Story 5.1:** *Là ACCOUNTANT, tôi muốn tự động tính Doanh thu từng chuyến cho khách hàng dựa trên Bảng giá Tuyến (Route Config).*
- **Story 5.2:** *Là ACCOUNTANT, tôi muốn chốt lương cho MỖI LÁI XE hằng tháng (Driver Salary) qua 1 click nút, hệ thống chốt số lượng bill đã chạy.*
- **Story 5.3:** *Là ACCOUNTANT, tôi muốn push Lương đến màn hình ứng dụng điện thoại (Mobile App) của lái xe với trạng thái "Đã chốt lương".*

## Epic 6: Dashboards (Báo cáo tổng quan)
- **Story 6.1:** *Là ADMIN, tôi xem Company Overview Dashboard thể hiện doanh số, mức lợi nhuận dự kiến và hiệu suất đoàn xe.*
- **Story 6.2:** *Là DV_LEAD, tôi xem Dispatch Performance Board để biết tỷ lệ điều xe AI, tỷ lệ tài chối từ, và xử lý vi phạm.*
- **Story 6.3:** *Là ACCOUNTANT, tôi xem Fuel Dashboard biểu đồ mức tiêu thụ nhiên liệu theo đầu xe.*

## Trạng thái hiện tại đối chiếu Backlog
- *Epic 1, Epic 2, Epic 5, Epic 6:* Đã hoàn thiện ~90%, đang sử dụng thực tế.
- *Epic 3 & 4:* Cốt lõi đang vướng lỗi đồng bộ lệnh từ Dispatch sang Driver (App), Driver thiếu tự động tải lệnh, `api.ts` phía frontend thiếu một số phương thức update. Cần Fix khẩn.
