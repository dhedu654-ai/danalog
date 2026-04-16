# Dispatch Engine Phase 1 — Specification v2.0 (Đã chỉnh sửa)

> **Phiên bản**: 2.0
> **Ngày cập nhật**: 2026-04-01
> **Trạng thái**: Final — Sẵn sàng cho dev triển khai

---

# 1. Mục tiêu tài liệu

## 1.1 Mục tiêu

Mô tả chi tiết để dev triển khai:

* Logic xếp ưu tiên ticket (Priority Engine)
* Logic đề xuất tài xế (Driver Recommendation Engine)
* Logic assign / auto-assign / reassign
* SLA monitoring cho điều vận và lái xe
* API, event flow, DB tables cốt lõi
* UI data contract cho Dispatch Board

## 1.2 Phạm vi Phase 1

**Bao gồm:**

* Order → Ticket
* Ticket Priority Engine
* Driver Recommendation Engine (5 thành phần scoring)
* Manual assign / Override assign / Auto assign khi quá SLA
* Driver accept / reject / no response
* Re-run engine (tối đa 3 cycle)
* Dispatch Board (polling 15–30s)
* KPI dispatch cơ bản

**Không bao gồm:**

* Fleet Optimization Layer
* GPS / vị trí real-time
* Tối ưu toàn đội xe theo ngày
* AI learning / predictive ETA
* Route clustering nâng cao
* WebSocket real-time (Phase 2)

---

# 2. Kiến trúc xử lý Phase 1

## 2.1 Luồng tổng thể

```text
CS tạo Order
   ↓
System sinh Work Ticket
   ↓
Priority Engine tính Priority Score
   ↓
Dispatch Queue sắp theo Priority
   ↓
Driver Recommendation Engine tính top candidate
   ↓
Dispatcher assign (ai_suggested / manual) hoặc override
   ↓
Nếu quá SLA assign → auto-assign top 1
   ↓
Driver nhận thông báo và phản hồi
   ↓
Nếu reject / no response → re-run / reassign (tối đa 3 cycle)
   ↓
Nếu vượt max cycle → ESCALATED, alert DV_LEAD
```

## 2.2 3 khối logic cốt lõi

| Khối | Vai trò |
|------|---------|
| Priority Engine | Xếp ticket nào cần xử lý trước (dựa trên độ gấp vận hành) |
| Driver Recommendation Engine | Chọn tài xế/xe phù hợp nhất cho ticket đó |
| SLA Engine | Đo tốc độ xử lý của điều vận và lái xe |

---

# 3. Business Scope Phase 1

## 3.1 Inputs nghiệp vụ

**Ticket đầu vào** có tối thiểu:

* pickup location (+ `pickup_area_code`)
* dropoff location (+ `dropoff_area_code`)
* planned pickup time
* planned delivery time (nếu có)
* container size: `20 / 40 / 45 / other`
* F/E (nếu có)
* route_id
* created time

**Tài xế/xe đầu vào** có tối thiểu:

* driver status
* vehicle status
* current ticket
* expected next location (dùng `area_code` của route gần nhất)
* expected available time
* dispatch lock flag
* route history cơ bản

## 3.2 Outputs nghiệp vụ

Hệ thống phải trả ra:

* Dispatch queue có priority score + priority level
* Top 5 tài xế đề xuất cho mỗi ticket (UI hiển thị top 3, click xem thêm)
* Score breakdown 5 thành phần + lý do điểm số
* Log assign / override / auto-assign / ai_suggested
* Cảnh báo SLA (configurable)
* Trạng thái driver response

---

# 4. Priority Engine Specification

## 4.1 Mục tiêu

Không xếp ticket theo thời gian tạo, mà xếp theo **độ gấp vận hành thực tế**.

## 4.2 Công thức

```text
Priority Score =
  0.60 × Pickup Urgency
+ 0.25 × Waiting Pressure
+ 0.15 × Chaining Opportunity
```

## 4.3 Định nghĩa thành phần

### A. Pickup Urgency

Đơn vị: điểm 0–100

| Time to pickup | Score |
|----------------|------:|
| ≤ 30 phút | 100 |
| 31–60 phút | 80 |
| 61–120 phút | 60 |
| 121–240 phút | 40 |
| > 240 phút | 20 |

### B. Waiting Pressure

Đơn vị: điểm 0–100
Dựa trên `assign_sla_minutes` (lấy từ `sla_rules` table, `process_step_code = 'DISPATCH_ASSIGN'`).

> **Phase 1**: Dùng 1 giá trị global, mặc định **15 phút**. Lưu trong `sla_rules` để chỉnh sửa khi cần đánh giá lại KPI mà không cần sửa code.

| Waiting time / SLA assign | Score |
|----------------------------|------:|
| > 100% SLA | 100 |
| > 75% SLA | 80 |
| > 50% SLA | 60 |
| ≤ 50% SLA | 30 |

### C. Chaining Opportunity

Đơn vị: điểm 0–100

Tính bằng cách **quét nhanh** toàn bộ driver có `expected_next_area_code` trùng hoặc cùng khu vực với `pickup_area_code` của ticket. Chỉ cần biết **"có driver nối chuyến được hay không"**, chưa cần biết cụ thể ai.

| Điều kiện | Score |
|-----------|------:|
| Có driver mà `expected_next_area_code` = `pickup_area_code` | 100 |
| Có driver cùng khu vực gần (prefix matching trên area_code) | 70 |
| Không có cơ hội nối chuyến | 20 |

**Pseudo-code:**

```pseudo
function calc_chaining_opportunity(ticket):
    exact_count = count drivers
        WHERE expected_next_area_code = ticket.pickup_area_code
        AND status = 'AVAILABLE'
    near_count = count drivers
        WHERE expected_next_area_code IN same_region(ticket.pickup_area_code)
        AND status = 'AVAILABLE'

    if exact_count > 0: return 100
    if near_count > 0: return 70
    return 20
```

## 4.4 Priority Level

Từ `priority_score`, map ra level cho UI badge.

| Priority Score | Level |
|----------------|-------|
| ≥ 85 | Critical |
| 70–84 | High |
| 50–69 | Medium |
| < 50 | Low |

## 4.5 Pseudo-code tổng

```pseudo
for ticket in open_tickets:
    pickup_urgency = calc_pickup_urgency(ticket.planned_pickup_time)
    waiting_pressure = calc_waiting_pressure(ticket.created_at, assign_sla_minutes)
    chaining_opportunity = calc_chaining_opportunity(ticket)

    ticket.priority_score =
        0.60 * pickup_urgency +
        0.25 * waiting_pressure +
        0.15 * chaining_opportunity

    ticket.priority_level = map_priority_level(ticket.priority_score)

sort open_tickets by priority_score DESC, planned_pickup_time ASC
```

## 4.6 Quy tắc sort cuối cùng

Nếu 2 ticket cùng `priority_score`, sort theo:

1. `planned_pickup_time` sớm hơn
2. `created_at` sớm hơn
3. `ticket_no` tăng dần

---

# 5. Driver Recommendation Engine Specification

## 5.1 Mục tiêu

Chọn tài xế/xe phù hợp nhất cho **ticket đang được ưu tiên xử lý**.

## 5.2 Quy trình tổng quan

```text
Bước 1: Eligibility Filter → loại driver/xe không hợp lệ
Bước 2: Driver Scoring → tính điểm 5 thành phần
Bước 3: Ranking → sắp xếp và trả top 5 candidates
```

---

# 6. Eligibility Filter

## 6.1 Mục tiêu

Loại trước các tài xế/xe không thể nhận chuyến.

## 6.2 Rules

| Rule code | Điều kiện loại |
|-----------|----------------|
| EL-01 | `driver.status != AVAILABLE` |
| EL-02 | `vehicle.status != ACTIVE` |
| EL-03 | `driver.dispatch_lock_flag = true` |
| EL-04 | Driver hoặc vehicle đang có active assignment trùng thời gian |
| EL-05 | Vehicle không phù hợp size container |
| EL-06 | `expected_available_time > planned_pickup_time + threshold` (quá trễ) |
| EL-07 | Driver/vehicle đang bị maintenance hold |
| EL-08 | Driver đã reject ticket này trong assignment_cycle trước |

## 6.3 Container compatibility

| Ticket size | Vehicle capability |
|-------------|-------------------|
| 20 | Xe hỗ trợ 20 hoặc lớn hơn |
| 40 | Xe phải hỗ trợ 40 trở lên |
| 45 | Xe phải hỗ trợ 45 |
| other | Dispatcher đánh giá thủ công |

## 6.4 Output filter

Hệ thống phải lưu:

* Candidate hợp lệ (`is_eligible = true`)
* Candidate bị loại (`is_eligible = false`)
* Lý do bị loại (`rejected_reason`)

Điều này cần cho: UI "rejected reasons", audit, dashboard tuning.

## 6.5 Pseudo-code

```pseudo
eligible = []
rejected = []

for pair in driver_vehicle_pairs:
    if pair.driver.status != "AVAILABLE":
        rejected.append(pair, "DRIVER_NOT_AVAILABLE")
        continue

    if pair.vehicle.status != "ACTIVE":
        rejected.append(pair, "VEHICLE_NOT_ACTIVE")
        continue

    if pair.driver.dispatch_lock_flag == true:
        rejected.append(pair, "DRIVER_DISPATCH_LOCKED")
        continue

    if overlap_assignment(pair, ticket):
        rejected.append(pair, "ASSIGNMENT_OVERLAP")
        continue

    if not vehicle_compatible(pair.vehicle, ticket):
        rejected.append(pair, "VEHICLE_SIZE_MISMATCH")
        continue

    if pair.driver.maintenance_hold == true:
        rejected.append(pair, "MAINTENANCE_HOLD")
        continue

    if driver_rejected_this_ticket(pair.driver, ticket):
        rejected.append(pair, "PREVIOUSLY_REJECTED")
        continue

    eligible.append(pair)
```

---

# 7. Driver Score Model

## 7.1 Công thức (5 thành phần)

```text
Driver Score =
  0.40 × Continuity Score
+ 0.25 × Availability Score
+ 0.15 × Route Experience Score
+ 0.10 × Performance Score
+ 0.10 × Load Balance Score
```

> **Lưu ý Phase 1**: Performance Score mặc định = 50 (trung tính) cho tất cả driver. Data sẽ được thu thập từ `driver_responses`, `sla_logs` sau go-live để tính score thực tế ở Phase 2.

## 7.2 Continuity Score (trọng số 0.40)

Đánh giá khả năng nối chuyến. **Phase 1 dùng `area_code`** thay vì location/cluster table.

| Mức | Điều kiện | Score |
|-----|-----------|------:|
| Exact | `expected_next_area_code = pickup_area_code` | 100 |
| Near | Cùng khu vực gần (prefix matching) | 70 |
| Weak | Không cùng cụm nhưng vẫn có thể chạy | 30 |

**Dữ liệu dùng:**
* `driver.expected_next_area_code` (từ route cuối cùng)
* `ticket.pickup_area_code` (từ route của ticket)

## 7.3 Availability Score (trọng số 0.25)

Dựa trên `expected_available_time` so với `planned_pickup_time`.

| Điều kiện | Score |
|-----------|------:|
| Sẵn sàng ngay hoặc trước pickup | 100 |
| Trễ ≤ 30 phút | 80 |
| Trễ ≤ 60 phút | 60 |
| Trễ > 60 phút | 20 |

## 7.4 Route Experience Score (trọng số 0.15)

Dựa trên số chuyến đã chạy tuyến đó. Phase 1 query trực tiếp từ `assignments` JOIN `work_tickets` GROUP BY `route_id`.

| Kinh nghiệm tuyến | Score |
|-------------------|------:|
| > 20 chuyến | 100 |
| 10–20 chuyến | 70 |
| 1–9 chuyến | 40 |
| 0 chuyến | 20 |

## 7.5 Performance Score (trọng số 0.10)

Đánh giá chất lượng làm việc lịch sử: tỷ lệ đúng giờ, tỷ lệ accept, số khiếu nại.

| Phase 1 | Giá trị |
|---------|---------|
| Tất cả driver | **50** (trung tính) |
| Khi có data (Phase 2) | Tính từ `sla_logs`, `driver_responses` |

**Công thức Phase 2 (tham khảo, chưa triển khai):**
```pseudo
performance = 0.40 * on_time_rate + 0.30 * accept_rate + 0.30 * (100 - complaint_rate)
```

## 7.6 Load Balance Score (trọng số 0.10)

Tránh dồn việc cho 1 driver khi nhiều ứng viên tương đương.

```pseudo
function calc_load_balance(driver, all_eligible_drivers):
    driver_load = count_recent_tickets(driver, hours=24)
    all_loads = [count_recent_tickets(d, hours=24) for d in all_eligible_drivers]

    min_load = min(all_loads)
    max_load = max(all_loads)

    if max_load == min_load: return 100

    percentile = (driver_load - min_load) / (max_load - min_load)

    if percentile <= 0.25: return 100   // thấp nhất nhóm
    if percentile <= 0.50: return 70    // trung bình
    if percentile <= 0.75: return 40    // cao
    return 20                           // rất cao
```

## 7.7 Pseudo-code tổng

```pseudo
for candidate in eligible:
    continuity = calc_continuity(candidate, ticket)
    availability = calc_availability(candidate, ticket)
    route_exp = calc_route_experience(candidate.driver, ticket.route_id)
    performance = 50  // Phase 1 default
    load_balance = calc_load_balance(candidate.driver, all_eligible)

    candidate.driver_score =
        0.40 * continuity +
        0.25 * availability +
        0.15 * route_exp +
        0.10 * performance +
        0.10 * load_balance
```

---

# 8. Ranking Output

## 8.1 Kết quả trả ra

Top candidates gồm:

* `driver_id`, `vehicle_id`
* `rank_no`
* `driver_score` (tổng)
* Score breakdown: `continuity`, `availability`, `route_experience`, `performance`, `load_balance`
* `continuity_type`: EXACT / NEAR / WEAK
* `expected_next_area_code`
* `expected_available_time`

## 8.2 Số lượng

* Mặc định trả **top 5**
* UI hiển thị top 3 trước, click để xem thêm

## 8.3 Nếu không có candidate

* Ticket status = `NO_CANDIDATE`
* Hiển thị cảnh báo cho dispatcher
* Log event `EVT_NO_ELIGIBLE_DRIVER`
* Ticket vẫn ở trong queue, priority vẫn tính

---

# 9. Assign / Override / Auto-Assign Logic

## 9.1 Dispatch Status Flow

```text
WAITING_DISPATCH → RECOMMENDED → ASSIGNED → DRIVER_PENDING
    → DRIVER_ACCEPTED → IN_PROGRESS → COMPLETED
    → DRIVER_REJECTED → WAITING_DISPATCH (new cycle)
    → NO_CANDIDATE (alert)
    → ESCALATED (vượt max 3 cycle)
```

| Status | Mô tả |
|--------|--------|
| `WAITING_DISPATCH` | Ticket mới vào queue, chưa có recommendation |
| `RECOMMENDED` | Đã có danh sách candidate |
| `ASSIGNED` | Đã assign cho driver |
| `DRIVER_PENDING` | Driver đã nhận notification, chưa phản hồi |
| `DRIVER_ACCEPTED` | Driver đã accept |
| `DRIVER_REJECTED` | Driver từ chối → trigger rerun |
| `NO_CANDIDATE` | Không tìm được candidate hợp lệ |
| `ESCALATED` | Vượt max 3 cycle, cần DV_LEAD xử lý |
| `IN_PROGRESS` | Đang thực hiện chuyến |
| `COMPLETED` | Hoàn thành |

## 9.2 Assign Type

| Type | Khi nào | Ghi chú |
|------|---------|---------|
| `ai_suggested` | Dispatcher chọn đúng top 1 do engine đề xuất | Dùng để đánh giá hiệu quả AI |
| `manual` | Dispatcher chọn candidate khác trong top 5 | Vẫn trong danh sách recommend |
| `override` | Dispatcher chọn driver ngoài danh sách recommend | Bắt buộc `override_reason_code` |
| `auto` | System tự assign khi SLA breach | `sla_breach = true` |

## 9.3 Manual / AI-Suggested Assign

Dispatcher chọn 1 candidate và assign.

**Input:**
* `ticket_id`
* `assignment_cycle_id`
* `selected_driver_id`, `selected_vehicle_id`
* `assign_type`: `ai_suggested` (nếu top 1) hoặc `manual`

**Output:**
* `ticket.dispatch_status = ASSIGNED → DRIVER_PENDING`
* Assignment record created
* SLA assign stopped
* Notification gửi cho driver
* SLA driver response started

## 9.4 Override Assign

Dispatcher chọn người ngoài danh sách đề xuất.

**Bắt buộc:**
* `override_reason_code` (từ danh mục bên dưới)
* `override_note` (optional)

**Override Reason Codes:**

| Code | Mô tả |
|------|--------|
| `DRIVER_REQUESTED` | Lái xe yêu cầu |
| `CUSTOMER_REQUESTED` | Khách hàng yêu cầu |
| `OPERATIONAL_NEED` | Yêu cầu vận hành |
| `SYSTEM_ERROR` | Lỗi hệ thống |
| `OTHER` | Lý do khác (bắt buộc ghi note) |

**Output:**
* `assign_type = OVERRIDE`
* Reason + note logged
* `ticket.dispatch_status = ASSIGNED → DRIVER_PENDING`

## 9.5 Auto Assign

Khi quá `dispatch_assign_sla` (mặc định 15 phút, configurable trong `sla_rules`).

**Rule:**
* System lấy top 1 candidate hiện tại
* Tạo assignment với `assign_type = AUTO`
* Log `sla_breach = true`
* Notify driver

**Nếu không có top 1:**
* `ticket.dispatch_status = NO_CANDIDATE`
* Alert dispatcher / DV_LEAD

---

# 10. Driver Response Logic

## 10.1 Trạng thái

| Response | Ý nghĩa |
|----------|---------|
| `ACCEPTED` | Lái xe nhận chuyến |
| `REJECTED` | Lái xe từ chối |
| `NO_RESPONSE` | Quá SLA chưa phản hồi (mặc định 3 phút) |

## 10.2 Flow

```text
ASSIGNED → DRIVER_PENDING
   ↓
Driver notified
   ↓
Driver accepts → DRIVER_ACCEPTED → IN_PROGRESS
Driver rejects → DRIVER_REJECTED → re-run
No response → alert dispatcher
```

## 10.3 Nếu reject

* Ghi `reject_reason_code`
* Ticket quay lại `WAITING_DISPATCH`
* System tạo assignment cycle mới (`cycle_no + 1`)
* Driver vừa reject bị loại khỏi eligible (rule EL-08)
* Re-run recommendation engine

**Reject Reason Codes:**

| Code | Mô tả |
|------|--------|
| `BUSY` | Đang bận |
| `VEHICLE_ISSUE` | Xe gặp sự cố |
| `PERSONAL` | Lý do cá nhân |
| `ROUTE_UNFAMILIAR` | Không quen tuyến |
| `OTHER` | Khác |

## 10.4 Nếu no response

* SLA breach logged
* Alert dispatcher
* Dispatcher có thể: re-run engine hoặc reassign thủ công

## 10.5 Giới hạn cycle

* `max_assignment_cycles = 3` (configurable trong `sla_rules`)
* Sau khi vượt max cycle → `ticket.dispatch_status = ESCALATED`
* Alert cho DV_LEAD / Manager
* Dispatcher phải xử lý manual ngoài danh sách recommend

---

# 11. SLA Engine Specification

## 11.1 SLA dùng trong Phase 1

| SLA code | Công đoạn | Giá trị mặc định | Configurable |
|----------|-----------|-------------------|-------------|
| `SLA_DISPATCH_ASSIGN` | Từ khi ticket vào queue đến khi assign | 15 phút | ✅ Trong `sla_rules` |
| `SLA_DRIVER_RESPONSE` | Từ khi notify driver đến khi phản hồi | 3 phút | ✅ Trong `sla_rules` |

> **Quan trọng**: Giá trị SLA lưu trong table `sla_rules`, có thể chỉnh sửa qua Admin UI mà không cần sửa code. Khi đánh giá lại KPI, chỉ cần update giá trị trong DB.

## 11.2 SLA start/stop

### SLA_DISPATCH_ASSIGN
* **Start**: Khi ticket có recommendation đầu tiên hoặc vào dispatch queue
* **Stop**: Khi assignment được tạo

### SLA_DRIVER_RESPONSE
* **Start**: Khi gửi notification cho driver
* **Stop**: Khi driver accept hoặc reject

## 11.3 Hành động breach

| SLA | Hành động |
|-----|-----------|
| `DISPATCH_ASSIGN` | Auto-assign top 1 candidate |
| `DRIVER_RESPONSE` | Alert dispatcher, cho reassign |

---

# 12. Dispatch Board Data Contract

## 12.1 Queue Ticket List

| Field | Type | Ghi chú |
|-------|------|---------|
| `ticket_id` | uuid | |
| `ticket_no` | string | |
| `customer_name` | string | |
| `pickup_location_name` | string | |
| `dropoff_location_name` | string | |
| `route_name` | string | Tên tuyến |
| `planned_pickup_time` | datetime | |
| `time_to_pickup_minutes` | int | |
| `container_size` | string | 20/40/45/other |
| `container_fe` | string | F/E |
| `priority_score` | decimal | |
| `priority_level` | string | Critical/High/Medium/Low |
| `assign_sla_remaining_seconds` | int | Countdown |
| `dispatch_status` | string | |
| `current_cycle_no` | int | Đang ở cycle thứ mấy |
| `version` | int | Optimistic lock |

## 12.2 Candidate List

| Field | Type |
|-------|------|
| `rank_no` | int |
| `driver_id` | uuid |
| `driver_name` | string |
| `vehicle_id` | uuid |
| `plate_number` | string |
| `driver_score` | decimal |
| `continuity_score` | decimal |
| `availability_score` | decimal |
| `route_experience_score` | decimal |
| `performance_score` | decimal |
| `load_balance_score` | decimal |
| `continuity_type` | string (EXACT/NEAR/WEAK) |
| `continuity_badge` | boolean |
| `expected_next_location_name` | string |
| `expected_available_time` | datetime |
| `current_location` | string |
| `recent_trips` | int (7 ngày gần nhất) |
| `route_experience` | int (số chuyến trên tuyến) |

## 12.3 Rejected List

| Field | Type |
|-------|------|
| `driver_id` | uuid |
| `driver_name` | string |
| `plate_number` | string |
| `reject_reason_code` | string |

---

# 13. API Endpoints Phase 1

## 13.1 Dispatch Queue

### GET `/api/v1/dispatch/queue`

Trả danh sách ticket đang chờ dispatch.

**Query params:**
* `date_from`, `date_to`
* `priority_level`
* `pickup_location_id`
* `status`
* `page`, `limit` (mặc định: page=1, limit=20)
* `sort_by` (mặc định: priority_score)
* `sort_order` (mặc định: desc)

**Response format:**
```json
{
    "success": true,
    "data": [ /* Queue Ticket List items */ ],
    "meta": {
        "page": 1,
        "limit": 20,
        "total": 150,
        "totalPages": 8
    }
}
```

### GET `/api/v1/dispatch/tickets/{ticket_id}/recommendations`

Trả top candidates + rejected reasons.

### POST `/api/v1/dispatch/tickets/{ticket_id}/run-recommendation`

Chạy lại engine cho ticket.

## 13.2 Assign

### POST `/api/v1/dispatch/assign`

```json
{
    "ticket_id": "uuid",
    "assignment_cycle_id": "uuid",
    "driver_id": "uuid",
    "vehicle_id": "uuid",
    "assign_type": "ai_suggested",
    "version": 5
}
```

**Response khi conflict (version đã thay đổi):**
```json
{
    "success": false,
    "error": {
        "code": "CONFLICT",
        "message": "Dữ liệu đã thay đổi, vui lòng refresh"
    }
}
```
HTTP Status: `409 Conflict`

### POST `/api/v1/dispatch/override`

```json
{
    "ticket_id": "uuid",
    "assignment_cycle_id": "uuid",
    "driver_id": "uuid",
    "vehicle_id": "uuid",
    "assign_type": "OVERRIDE",
    "override_reason_code": "DRIVER_REQUESTED",
    "override_note": "Thông tin thực địa",
    "version": 5
}
```

### POST `/api/v1/dispatch/auto-assign/{ticket_id}`

Gọi nội bộ bởi scheduler/system. Không expose cho UI.

## 13.3 Driver Response

### POST `/api/v1/driver/assignments/{assignment_id}/accept`

### POST `/api/v1/driver/assignments/{assignment_id}/reject`

```json
{
    "reject_reason_code": "BUSY",
    "note": "Đang xử lý công việc khác"
}
```

---

# 14. Database Tables Phase 1

## 14.1 Core tables

| Bảng | Mục đích |
|------|----------|
| `orders` | Đơn hàng |
| `work_tickets` | Phiếu công tác |
| `drivers` | Tài xế |
| `vehicles` | Xe |
| `driver_vehicle_assignments` | Cặp tài xế-xe hiện hành |
| `assignment_cycles` | Từng vòng dispatch |
| `assignment_recommendations` | Candidates + rejected (cùng bảng, phân biệt bằng `is_eligible`) |
| `assignments` | Assign chính thức |
| `driver_responses` | Phản hồi lái xe |
| `sla_rules` | Rule SLA (configurable) |
| `sla_logs` | Log đo SLA |
| `system_events` | Event nghiệp vụ |
| `audit_logs` | Audit thao tác |

## 14.2 Các field bắt buộc

### work_tickets

| Field | Type | Ghi chú |
|-------|------|---------|
| `ticket_id` | uuid | PK |
| `ticket_no` | string | Mã hiển thị |
| `order_id` | uuid | FK → orders |
| `route_id` | string | FK → route config |
| `pickup_location_id` | string | |
| `pickup_area_code` | string | VD: `TIEN_SA`, `LAO_BAO` |
| `dropoff_location_id` | string | |
| `dropoff_area_code` | string | |
| `planned_pickup_time` | datetime | |
| `planned_delivery_time` | datetime | nullable |
| `container_size` | string | 20/40/45/other |
| `container_fe` | string | F/E |
| `priority_score` | decimal | 0-100 |
| `priority_level` | string | Critical/High/Medium/Low |
| `dispatch_status` | string | Theo status flow ở section 9.1 |
| `assign_sla_deadline` | datetime | |
| `current_assignment_cycle_id` | uuid | FK |
| `version` | int | Optimistic lock |
| `status` | string | |
| `created_at` | datetime | |

### drivers

| Field | Type |
|-------|------|
| `driver_id` | uuid PK |
| `driver_name` | string |
| `status` | string (AVAILABLE/BUSY/OFF_DUTY/MAINTENANCE) |
| `dispatch_lock_flag` | boolean |
| `expected_next_area_code` | string |
| `expected_available_time` | datetime |

### vehicles

| Field | Type |
|-------|------|
| `vehicle_id` | uuid PK |
| `plate_number` | string |
| `status` | string (ACTIVE/INACTIVE/MAINTENANCE) |
| `container_capacity` | string (hỗ trợ sizes nào) |

### driver_vehicle_assignments

| Field | Type |
|-------|------|
| `driver_id` | uuid FK |
| `vehicle_id` | uuid FK |
| `start_time` | datetime |
| `end_time` | datetime nullable |
| `status` | string |

### assignment_cycles

| Field | Type |
|-------|------|
| `assignment_cycle_id` | uuid PK |
| `ticket_id` | uuid FK |
| `cycle_no` | int |
| `status` | string |
| `started_at` | datetime |
| `ended_at` | datetime nullable |
| `trigger_source` | string (SYSTEM/MANUAL/SLA_BREACH) |

### assignment_recommendations

| Field | Type | Ghi chú |
|-------|------|---------|
| `id` | uuid PK | |
| `assignment_cycle_id` | uuid FK | |
| `driver_id` | uuid FK | |
| `vehicle_id` | uuid FK | |
| `is_eligible` | boolean | true=candidate, false=rejected |
| `rank_no` | int | nullable (chỉ eligible mới có rank) |
| `continuity_score` | decimal | |
| `availability_score` | decimal | |
| `route_experience_score` | decimal | |
| `performance_score` | decimal | |
| `load_balance_score` | decimal | |
| `driver_score` | decimal | Tổng weighted |
| `continuity_type` | string | EXACT/NEAR/WEAK |
| `expected_next_area_code` | string | |
| `expected_available_time` | datetime | |
| `rejected_reason` | string | nullable (chỉ rejected mới có) |

### assignments

| Field | Type |
|-------|------|
| `assignment_id` | uuid PK |
| `ticket_id` | uuid FK |
| `assignment_cycle_id` | uuid FK |
| `driver_id` | uuid FK |
| `vehicle_id` | uuid FK |
| `assign_type` | string (ai_suggested/manual/override/auto) |
| `override_reason_code` | string nullable |
| `override_note` | string nullable |
| `assigned_by` | string (user hoặc SYSTEM) |
| `assigned_at` | datetime |
| `sla_breach` | boolean |

### driver_responses

| Field | Type |
|-------|------|
| `id` | uuid PK |
| `assignment_id` | uuid FK |
| `driver_id` | uuid FK |
| `response_type` | string (ACCEPTED/REJECTED/NO_RESPONSE) |
| `reject_reason_code` | string nullable |
| `note` | string nullable |
| `responded_at` | datetime nullable |

### sla_rules

| Field | Type | Ghi chú |
|-------|------|---------|
| `id` | uuid PK | |
| `process_step_code` | string | `DISPATCH_ASSIGN` / `DRIVER_RESPONSE` |
| `sla_minutes` | int | Giá trị SLA |
| `is_active` | boolean | |
| `updated_at` | datetime | |
| `updated_by` | string | Ai chỉnh lần cuối |

### sla_logs

| Field | Type |
|-------|------|
| `id` | uuid PK |
| `ticket_id` | uuid FK |
| `process_step_code` | string |
| `start_time` | datetime |
| `end_time` | datetime nullable |
| `measured_minutes` | decimal |
| `sla_met` | boolean |
| `breach_flag` | boolean |

---

# 15. Event Flow Phase 1

## 15.1 Happy path

```text
EVT_TICKET_CREATED
→ EVT_PRIORITY_CALCULATED
→ EVT_RECOMMENDATION_GENERATED
→ EVT_SLA_STARTED(DISPATCH_ASSIGN)
→ EVT_DRIVER_ASSIGNED (assign_type: ai_suggested/manual)
→ EVT_SLA_STOPPED(DISPATCH_ASSIGN)
→ EVT_DRIVER_NOTIFIED
→ EVT_SLA_STARTED(DRIVER_RESPONSE)
→ EVT_DRIVER_ACCEPTED
→ EVT_SLA_STOPPED(DRIVER_RESPONSE)
```

## 15.2 Auto-assign path

```text
EVT_TICKET_CREATED
→ EVT_PRIORITY_CALCULATED
→ EVT_RECOMMENDATION_GENERATED
→ EVT_SLA_STARTED(DISPATCH_ASSIGN)
→ EVT_SLA_BREACHED(DISPATCH_ASSIGN)
→ EVT_DRIVER_AUTO_ASSIGNED
→ EVT_DRIVER_NOTIFIED
→ EVT_SLA_STARTED(DRIVER_RESPONSE)
→ EVT_DRIVER_ACCEPTED / REJECTED
→ EVT_SLA_STOPPED(DRIVER_RESPONSE)
```

## 15.3 Reject path

```text
EVT_DRIVER_REJECTED
→ EVT_SLA_STOPPED(DRIVER_RESPONSE)
→ EVT_ASSIGNMENT_CYCLE_EXPIRED
→ EVT_RECOMMENDATION_RERUN
→ EVT_RECOMMENDATION_GENERATED
```

## 15.4 Escalation path (MỚI)

```text
EVT_DRIVER_REJECTED (cycle 3)
→ EVT_MAX_CYCLE_REACHED
→ EVT_TICKET_ESCALATED
→ EVT_ALERT_DV_LEAD
```

---

# 16. Sequence Diagram

```text
CS → Order Service: Create Order
Order Service → Ticket Service: Generate Ticket
Ticket Service → Priority Engine: Calculate Priority
Priority Engine → Dispatch Queue: Insert / Update Queue Position

Dispatcher → Dispatch API: Open Queue (polling 15-30s)
Dispatch API → Recommendation Engine: Get Top Candidates
Recommendation Engine → DB: Read drivers/vehicles/assignment state
Recommendation Engine → Dispatch API: Return top 5 + rejected list

Dispatcher → Dispatch API: Assign Driver (with version check)
Dispatch API → Version Check: Compare version
  [If conflict] → Dispatch API: Return 409
  [If OK] → Assignment Service: Create Assignment
Assignment Service → SLA Service: Stop Assign SLA
Assignment Service → Notification Service: Notify Driver
Assignment Service → SLA Service: Start Driver Response SLA

Driver → Driver API: Accept / Reject
Driver API → SLA Service: Stop Driver Response SLA
Driver API → Assignment Service: Update response state
  [If reject] → Recommendation Engine: Re-run (exclude this driver)
```

---

# 17. Edge Cases bắt buộc

## 17.1 Không có candidate hợp lệ

* Ticket vẫn ở queue, priority vẫn tồn tại
* `dispatch_status = NO_CANDIDATE`
* Manager có thể xử lý thủ công hoặc đợi driver available

## 17.2 Dispatcher mở màn hình cũ, dữ liệu đã đổi

* Dùng **optimistic lock** với field `version` (số nguyên tăng dần)
* Khi assign, gửi kèm `version` hiện tại
* Nếu version trong DB đã thay đổi → trả `409 Conflict`
* UI hiển thị: *"Dữ liệu đã thay đổi, vui lòng refresh"*
* UI tự động refresh data

## 17.3 Driver accept sau khi ticket đã reassign

* Reject request
* Trả message: *"Phiếu không còn hiệu lực với tài xế này"*
* Kiểm tra `assignment.status` trước khi chấp nhận response

## 17.4 Driver/vehicle vừa đổi trạng thái

* Nếu trước lúc assign: recommendation rerun
* Nếu sau lúc assign: dispatcher xử lý reassign

## 17.5 Vượt max assignment cycles (MỚI)

* Sau 3 cycle reject → `ticket.dispatch_status = ESCALATED`
* Alert DV_LEAD
* Dispatcher phải chọn driver thủ công, không qua recommendation engine

## 17.6 2 dispatcher assign cùng ticket cùng lúc (MỚI)

* Optimistic lock bảo vệ: chỉ 1 người assign thành công
* Người còn lại nhận `409 Conflict`

---

# 18. KPI Phase 1

## 18.1 Dispatch KPI

| KPI | Công thức |
|-----|-----------|
| Assign SLA Compliance | Số ticket assign đúng SLA / tổng ticket |
| Auto Assign Rate | Số ticket auto-assign / tổng ticket |
| Override Rate | Số override / tổng assign |
| No Response Rate | Số no response / tổng assignment |
| Reassign Rate | Số reassign / tổng ticket |
| Escalation Rate (MỚI) | Số ticket ESCALATED / tổng ticket |

## 18.2 Recommendation KPI

| KPI | Công thức |
|-----|-----------|
| AI Suggested Selected Rate (MỚI) | Số lần chọn `ai_suggested` / tổng assign |
| Top-1 Selected Rate | Số lần chọn top 1 / tổng assign |
| Candidate Availability Rate | Số ticket có ≥1 candidate / tổng ticket |
| Continuity Usage Rate | Số assign dùng candidate EXACT/NEAR / tổng assign |

---

# 19. Out of Scope rõ ràng

Không triển khai trong Phase 1:

* GPS real-time
* Map routing
* ETA prediction
* Fuel-based optimization
* Fleet rebalancing
* Customer priority
* Route criticality nâng cao bằng AI
* Predictive driver behavior
* WebSocket real-time (dùng polling thay thế)
* Location/cluster table phức tạp (dùng area_code đơn giản)

---

# 20. Definition of Done cho Dev

## Backend

- [ ] Tạo được ticket queue theo `priority_score`
- [ ] Tính được top 5 candidate cho ticket (5 thành phần scoring)
- [ ] `ai_suggested` assign khi chọn top 1
- [ ] Manual assign chạy đúng
- [ ] Override assign bắt buộc `override_reason_code`
- [ ] Auto-assign chạy khi SLA breach
- [ ] Driver accept/reject/no response hoạt động
- [ ] Re-run engine loại driver đã reject (EL-08)
- [ ] Escalation khi vượt max 3 cycle
- [ ] `sla_rules` configurable (không cần sửa code)
- [ ] `sla_logs` lưu đúng
- [ ] Optimistic lock với `version` field
- [ ] `409 Conflict` khi version mismatch
- [ ] Audit/event log lưu đúng
- [ ] API pagination + sorting

## Frontend Web

- [ ] Dispatch Board hiển thị queue + priority badge + SLA countdown
- [ ] Candidate list hiển thị score breakdown 5 thành phần
- [ ] Override modal có dropdown `reason_code` + note
- [ ] Continuity badge hiển thị đúng
- [ ] Polling 15–30s refresh data
- [ ] Xử lý `409 Conflict` — hiển thị thông báo + auto refresh
- [ ] Rejected reasons list hiển thị

## Mobile Driver

- [ ] Nhận assignment notification
- [ ] Accept / reject với reason code
- [ ] Hiển thị ticket đúng assignment hiện hành
- [ ] Xử lý case ticket đã reassign

## QA/UAT

- [ ] Test happy path (ai_suggested + manual)
- [ ] Test override flow
- [ ] Test auto assign khi SLA breach
- [ ] Test reject + rerun (với EL-08 exclusion)
- [ ] Test no candidate
- [ ] Test escalation (3 reject liên tiếp)
- [ ] Test stale data conflict (optimistic lock)
- [ ] Test 2 dispatcher assign cùng ticket

---

# 21. Khuyến nghị triển khai sprint

## Sprint 1: Foundation

* Core tables (theo section 14)
* Order → Ticket (với `area_code` fields)
* Dispatch queue basic
* Priority Engine (3 thành phần scoring)

## Sprint 2: Recommendation & Dispatch Board

* Eligibility Filter (8 rules)
* Driver Scoring (5 thành phần, performance = 50 default)
* Dispatch Board UI
* Manual assign / ai_suggested / override

## Sprint 3: SLA & Driver Response

* SLA engine (configurable rules)
* Auto-assign khi breach
* Driver accept/reject
* Re-run engine (EL-08 exclusion)
* Escalation flow
* Event/audit log

## Sprint 4: KPI & Hardening

* KPI dashboard (dispatch + recommendation)
* Optimistic lock + conflict handling
* Polling optimization
* Hardening / UAT fixes

---

# 22. Sự thật / Suy luận / Giả định

## Sự thật

* Phase 1 chỉ tập trung vào dispatch vận hành, chưa cần fleet optimization
* Customer priority đã được chốt là tạm thời bỏ khỏi dispatch engine
* Priority dựa trên pickup urgency, waiting pressure và chaining opportunity
* SLA configurable trong DB, không hardcode
* Driver Score có 5 thành phần, performance mặc định = 50

## Suy luận

* Mô hình này đủ để go-live và tạo giá trị thật ngay cho điều vận
* Nếu làm đúng 3 khối Priority + Recommendation + SLA, hệ thống đã xử lý được phần lớn pain point hiện tại
* Polling 15–30s đủ tốt cho Phase 1, không cần đầu tư WebSocket ngay
* `ai_suggested` tracking sẽ cung cấp data quan trọng để đánh giá engine ở Phase 2

## Giả định

* Dữ liệu `expected_next_area_code` và `expected_available_time` có thể được xác định từ route cuối cùng của driver
* Route experience tính từ lịch sử ticket/assignment trong DB nội bộ (query trực tiếp, không cần summary table)
* `area_code` đủ để xác định proximity cho Continuity Score Phase 1 (không cần GPS/cluster phức tạp)
* UI web là desktop-first, mobile chỉ cần driver-facing app
* Max 3 assignment cycles là đủ trước khi escalate

---

# Changelog từ v1.0

| # | Thay đổi | Lý do |
|---|----------|-------|
| 1 | Driver Score: 4 → 5 thành phần (thêm performance = 50 default) | Tránh code lại khi lên Phase 2 |
| 2 | Thêm `ai_suggested` assign type | Đánh giá hiệu quả AI recommendation |
| 3 | SLA values configurable trong `sla_rules` table | Linh hoạt điều chỉnh KPI không cần sửa code |
| 4 | Container size: 20/40 → 20/40/45/other | Mở rộng theo yêu cầu |
| 5 | Dispatch Board: polling 15–30s thay vì WebSocket | Đơn giản Phase 1 |
| 6 | Dùng `area_code` thay vì location/cluster table | Chưa có data, đơn giản hóa |
| 7 | Optimistic lock bằng `version` number | Xử lý conflict khi nhiều dispatcher |
| 8 | Thêm EL-08: exclude driver đã reject | Tránh assign lại cho driver đã từ chối |
| 9 | Thêm max 3 cycle + ESCALATED status | Xử lý case reject liên tục |
| 10 | Thêm override/reject reason code catalogs | Chuẩn hóa log để phân tích KPI |
| 11 | Thêm Escalation path trong Event Flow | Đầy đủ luồng nghiệp vụ |
| 12 | Thêm API pagination + response format chuẩn | Production-ready API |
| 13 | Thống nhất Dispatch Status Flow | Align code hiện tại với spec |
| 14 | Bổ sung field thiếu vào DB tables | Đủ để triển khai |
