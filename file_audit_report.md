# Kiểm Kê File & Folder — Danalog Project

> **Ngày kiểm kê:** 12/04/2026  
> **Ký hiệu:** ✅ = Thuộc dự án (cần giữ) · ⚠️ = Có thể xóa (utility/one-time) · ❌ = Dư thừa (nên xóa)

---

## 1. Thư mục gốc `d:\Downloads\123456 - Copy\`

| File / Folder | Loại | Đánh giá | Lý do |
|---|---|:---:|---|
| `danalog-platform/` | 📁 | ✅ | **Core project** — Platform chính |
| `driver-app/` | 📁 | ✅ | **Core project** — App cho lái xe (legacy, đã tích hợp vào platform) |
| `.git/` | 📁 | ✅ | Git repository |
| `.vercel/` | 📁 | ✅ | Vercel deployment config |
| `.env.local` | File | ⚠️ | Trùng lặp với `danalog-platform/frontend/.env.local` — có thể là bản cũ |
| `danalog_product_backlog.md` | File | ✅ | Tài liệu product backlog |
| `danalog_supabase_schema.md` | File | ✅ | Tài liệu schema database |
| `__MACOSX/` | 📁 | ❌ | **Rác hệ thống macOS** — tạo ra khi giải nén zip trên Mac |
| `admin.html` | File | ❌ | **Prototype HTML cũ** — đã được thay thế bởi React components |
| `cs_lead.html` | File | ❌ | **Prototype HTML cũ** — đã có CSLeadSchedule.tsx |
| `cs_staff.html` | File | ❌ | **Prototype HTML cũ** — đã có CSStaffSchedule.tsx |
| `dispatch_lead.html` | File | ❌ | **Prototype HTML cũ** — đã có DispatchLeadSchedule.tsx |
| `dispatcher.html` | File | ❌ | **Prototype HTML cũ** — đã có DispatcherSchedule.tsx |
| `freight_dispatch_manager.html` | File | ❌ | **Prototype HTML cũ** — ~56KB, đã thay thế bởi DispatchBoard.tsx |
| `convert.ps1` | File | ❌ | Script chuyển đổi một lần, không dùng nữa |
| `convert2.ps1` | File | ❌ | Script chuyển đổi một lần |
| `extract_legacy.cjs` | File | ❌ | Script extract dữ liệu cũ, đã chạy xong |
| `legacy_data_full.json` | File | ❌ | Dữ liệu legacy đã import xong (~43KB) |
| `fuel_paths.txt` | File | ❌ | File ghi chú tạm |
| `pd.docx` | File | ⚠️ | Tài liệu product (~580KB) — giữ nếu cần tham khảo |
| `pd.txt` | File | ❌ | Bản text extract từ pd.docx — trùng nội dung |
| `pd_utf8.txt` | File | ❌ | Bản text UTF-8 extract từ pd.docx — trùng nội dung |
| `2025.03.24-File_Mau_Cau_Hinh_Don_Gia...xlsx` | File | ⚠️ | File mẫu cấu hình đơn giá — dữ liệu đã nhập vào hệ thống |
| `Bang_Ke_Luong_Thang_12_2025 (1).xlsx` | File | ❌ | File xuất mẫu — có thể tạo lại từ hệ thống |
| `Phân loại khách hàng vận tải.png` | File | ⚠️ | Sơ đồ phân loại — giữ nếu cần tham khảo |

---

## 2. `danalog-platform/`

| File / Folder | Loại | Đánh giá | Lý do |
|---|---|:---:|---|
| `frontend/` | 📁 | ✅ | **Source code chính** |
| `contracts/` | 📁 | ⚠️ | Chứa `DanalogTransport.sol` — Smart contract blockchain, chưa tích hợp thực tế |
| `docs/` | 📁 | ✅ | Tài liệu kỹ thuật (api_design.md, dispatch_engine_spec) |
| `diff.txt` | File | ❌ | File diff tạm — output debug/review |

---

## 3. `danalog-platform/frontend/` — File gốc (root level)

### ✅ Core Files (Giữ)

| File | Mục đích |
|------|----------|
| `.env.local` | Biến môi trường (Supabase keys) |
| `.eslintrc.cjs` | ESLint config |
| `.gitignore` | Git ignore rules |
| `.npmrc` | NPM config |
| `Dockerfile` | Docker build config |
| `index.html` | HTML entry point (Vite) |
| `package.json` | Dependencies |
| `package-lock.json` | Locked dependencies |
| `postcss.config.js` | PostCSS (TailwindCSS) |
| `tailwind.config.js` | TailwindCSS config |
| `tsconfig.json` | TypeScript config |
| `tsconfig.node.json` | TypeScript node config |
| `vercel.json` | Vercel deployment config |
| `vite.config.ts` | Vite build config |
| `server.js` | **Express server chính** (~138KB) — xử lý dispatch, orders, etc. |
| `README_DEPLOY.md` | Hướng dẫn deploy |

### ✅ Core Folders (Giữ)

| Folder | Mục đích |
|--------|----------|
| `api/` | Vercel Serverless Functions (dispatch, orders, tickets, salaries, corrections) |
| `src/` | React source code |
| `.vercel/` | Vercel deployment state |

### ⚠️ Có thể xóa (One-time scripts / Build artifacts)

| File / Folder | Kích thước | Lý do |
|---|---|---|
| `db.json` | **~86MB** 🔴 | **Bản sao database local từ Supabase** — rất nặng, không cần trong repo |
| `dist/` | 📁 | Build output — tự build khi deploy |
| `node_modules/` | 📁 | Dependencies — tự install bằng `npm install` |
| `.npm-cache/` | 📁 | NPM cache — không cần trong repo |
| `backup_truoc_khi_dap_xay_lai.zip` | ~2.7MB | Backup cũ trước khi refactor |
| `new_routes.json` | ~25KB | Data import tuyến đường — đã import xong |
| `output.log` | ~7KB | Build/debug log |

### ❌ Dư thừa (One-time scripts đã chạy xong)

| File | Kích thước | Mục đích ban đầu |
|---|---|---|
| `seed.js` | 3KB | Seed data ban đầu — đã chạy |
| `add_employee_code.js` | 1KB | Thêm employee code một lần — đã chạy |
| `add_route_fields.sql` | <1KB | SQL migration — đã chạy |
| `create_fuel_stations.sql` | 2KB | SQL tạo fuel stations — đã chạy |
| `populate_money.js` | 5KB | Populate giá tiền — đã chạy |
| `refactor.js` | 10KB | Script refactor dữ liệu — đã chạy |
| `fix_draft_tickets.js` | 1KB | Fix tickets bị stuck ở DRAFT — đã chạy |
| `fix_schema.js` | 1KB | Fix schema — đã chạy |
| `fix_stuck_ticket.js` | 1KB | Fix ticket bị stuck — đã chạy |
| `read_excel.py` | 2KB | Python script đọc Excel import — đã chạy |
| `check2.js` | 1KB | Debug script kiểm tra data |
| `check3.js` | 1KB | Debug script kiểm tra data |
| `check_schema.js` | 1KB | Debug script kiểm tra schema |

### ❌ Test scripts (Nên chuyển vào folder `tests/` hoặc xóa)

| File | Kích thước | Mục đích |
|---|---|---|
| `test_all_noti.js` | <1KB | Test tất cả notifications |
| `test_console.cjs` | <1KB | Test console |
| `test_corrections.js` | <1KB | Test correction flow |
| `test_fetch.js` | <1KB | Test API fetch |
| `test_fetch.mjs` | <1KB | Test API fetch (ESM) |
| `test_flow.js` | 6KB | Test luồng nghiệp vụ |
| `test_flows_all.js` | 12KB | Test tất cả luồng |
| `test_history.js` | <1KB | Test history |
| `test_insert_cr.js` | <1KB | Test insert correction |
| `test_noti.js` | <1KB | Test notification |
| `test_noti2.js` | <1KB | Test notification v2 |
| `test_noti3.js` | <1KB | Test notification v3 |
| `test_schema.js` | <1KB | Test schema |

### ❌ Deploy scripts (Có thể xóa nếu dùng Vercel CI/CD)

| File | Mục đích |
|---|---|
| `create_deploy_zip.ps1` | Script tạo zip deploy |
| `danalog_deploy.sh` | Script deploy bash |

### ❌ Legacy folder

| Folder | Kích thước | Lý do |
|---|---|---|
| `backend_legacy_do_not_touch/` | **~73MB** 🔴 | Chứa `db.json` (76MB) + `server.js` (130KB) cũ — đã thay thế hoàn toàn bởi Supabase + server.js mới |

---

## 4. `danalog-platform/frontend/api/` — Vercel Serverless

| File / Folder | Đánh giá | Lý do |
|---|:---:|---|
| `_supabase.js` | ✅ | Supabase client helper |
| `login.js` | ✅ | Login endpoint |
| `ticket-correction-request.js` | ✅ | Correction request endpoint |
| `ticket-correction-review.js` | ✅ | Correction review endpoint |
| `dispatch/suggest.js` | ✅ | AI dispatch suggestion engine |
| `dispatch/assign.js` | ✅ | Dispatch assignment |
| `dispatch/auto-assign.js` | ✅ | Auto-assignment |
| `dispatch/driver-response.js` | ✅ | Driver response handling |
| `dashboard/stats.js` | ✅ | Dashboard statistics |
| `orders/index.js` | ✅ | Order creation |
| `tickets/[id]/` | ✅ | Ticket CRUD |
| `published-salaries/index.js` | ✅ | Salary publishing |
| `ticket-corrections/[id]/` | ✅ | Correction CRUD |
| `cron/` | ⚠️ | **Folder rỗng** — chưa implement cron jobs |

---

## 5. `danalog-platform/frontend/src/` — Source Code

### ✅ Core Source Files

| File | Mục đích |
|------|----------|
| `App.tsx` | Router + Layout chính |
| `main.tsx` | Entry point |
| `index.css` | Global styles |
| `types.ts` | TypeScript interfaces + mock route data |
| `constants.ts` | Constants (CUSTOMERS, CARGO_TYPES, ZONES) |
| `vite-env.d.ts` | Vite type declarations |
| `contexts/AuthContext.tsx` | Authentication context |
| `services/api.ts` | API service layer |
| `services/supabaseClient.ts` | Supabase client |
| `utils/imageUtils.ts` | Image compression utility |

### ⚠️ Có thể là dead code

| File | Đánh giá | Lý do |
|------|:---:|------|
| `legacy_tickets.ts` | ❌ | **Không được import ở bất kỳ đâu** — dữ liệu legacy đã migrate vào DB |
| `utils/web3.ts` | ❌ | **Không được import ở bất kỳ đâu** — blockchain integration chưa dùng |
| `hooks/useLocalStorage.ts` | ❌ | **Chỉ tự tham chiếu chính nó** — không được dùng bởi component nào |

---

## 6. Dashboard Components — Dead Code Analysis

> [!WARNING]
> **13 dashboard components được import nhưng KHÔNG được render trong bất kỳ `<Route>` nào.** Chỉ `CompanyOverviewDashboard` được dùng thực tế.

### ✅ Đang dùng

| Component | Render tại |
|-----------|-----------|
| `CompanyOverviewDashboard` | `/dashboard`, `/dashboard-overview` |

### ❌ Import nhưng KHÔNG render (Dead Code)

| Component | Import tại App.tsx | Route? |
|-----------|:---:|:---:|
| `OperationsDashboard` | L30 | ❌ Không |
| `DispatchManagerDashboard` | L31 | ❌ Không |
| `FleetDashboardNew` | L32 | ❌ Không |
| `CSManagerDashboard` | L33 | ❌ Không |
| `CSQualityDashboard` | L34 | ❌ Không |
| `RevenueDashboard` | L35 | ❌ Không |
| `FuelDashboard` | L36 | ❌ Không |
| `DispatchPerformanceDashboard` | L37 | ❌ Không |
| `CSReviewDashboard` | L38 | ❌ Không |
| `DriverDashboardNew` | L39 | ❌ Không |
| `DriverEarnings` | L40 | ❌ Không |
| `CSTaskQueue` | L41 | ❌ Không |

### ❌ Files không được import bởi bất kỳ ai

| File | Vị trí |
|------|--------|
| `OverviewDashboard.tsx` | `Dashboards/OverviewDashboard.tsx` (5KB) |
| `FleetDashboard.tsx` | `Dashboards/FleetDashboard.tsx` (6KB) |
| `DispatchDashboard.tsx` | `Dashboards/DispatchDashboard.tsx` (19KB) |
| `mockData.ts` | `Dashboards/shared/mockData.ts` (13KB) — mock data cho dashboard |

> [!NOTE]
> Các shared components (`AlertPanel.tsx`, `DashboardFilters.tsx`, `DataTable.tsx`, `KPICard.tsx`) có thể cũng là dead code nếu chỉ được dùng bởi các dashboard không render ở trên. Tuy nhiên, chúng có thể hữu ích nếu bạn muốn kích hoạt lại các dashboard trong tương lai.

---

## 7. `driver-app/` — ❌ TOÀN BỘ THƯ MỤC NÀY DƯ THỪA

> [!CAUTION]
> **Toàn bộ `driver-app/` có thể xóa.** Đây là bản prototype ban đầu (JSX, local db.json, server riêng). Tất cả chức năng đã được viết lại hoàn toàn trong `danalog-platform/frontend/src/components/mobile/` với TypeScript + Supabase.

| Chức năng | `driver-app/` (CŨ) | `platform/mobile/` (MỚI — đang dùng) |
|---|---|---|
| Tạo phiếu | `CreateTicket.jsx` | ✅ `CreateTicketMobile.tsx` |
| Danh sách chuyến | `TicketList.jsx` | ✅ `TicketListMobile.tsx` + `TicketDetailMobile.tsx` |
| Xem lương | `SalarySlip.jsx` | ✅ `SalarySlipMobile.tsx` |
| Trang chủ + Dispatch | *(không có)* | ✅ `HomeMobile.tsx` |
| Phiếu nhiên liệu | *(không có)* | ✅ `FuelTicketMobile.tsx` |
| Hồ sơ cá nhân | *(không có)* | ✅ `DriverProfileMobile.tsx` |
| Auth | Local context | ✅ Supabase Auth |
| Database | Local db.json | ✅ Supabase cloud |

Platform mới có thêm: dispatch notification, password change, notification system, fuel management — driver-app không có các tính năng này.

---

## 📊 Tổng Hợp Dung Lượng Tiết Kiệm

| Hạng mục | Dung lượng ước tính |
|----------|:---:|
| `backend_legacy_do_not_touch/` | **~73 MB** |
| `danalog-platform/frontend/db.json` | **~86 MB** |
| `__MACOSX/` | ~1 KB |
| HTML prototypes (.html files gốc) | ~224 KB |
| One-time scripts + test files | ~60 KB |
| Legacy data files | ~190 KB |
| `driver-app/` (toàn bộ, trừ node_modules) | ~350 KB |
| Dead dashboard components (nếu xóa) | ~130 KB |
| **TỔNG CỘNG CÓ THỂ GIẢI PHÓNG** | **~160 MB** |

---

## 🎯 Khuyến Nghị Hành Động

### Ưu tiên cao (Xóa ngay, tiết kiệm ~160MB)
1. Xóa `backend_legacy_do_not_touch/` (~73MB)
2. Xóa `danalog-platform/frontend/db.json` (~86MB) — hoặc thêm vào `.gitignore`
3. Xóa `__MACOSX/`

### Ưu tiên trung bình (Dọn dẹp repo)
4. Xóa 6 file HTML prototype ở thư mục gốc
5. Xóa các file `pd.txt`, `pd_utf8.txt`, `legacy_data_full.json`
6. Di chuyển 13 file test vào folder `tests/` hoặc xóa
7. Xóa 9 file one-time scripts (`seed.js`, `fix_*.js`, `add_*.js`, etc.)

### Ưu tiên thấp (Dead code cleanup)
8. Xóa `legacy_tickets.ts`, `web3.ts`, `useLocalStorage.ts`
9. Quyết định giữ hay xóa 15+ dashboard components không render
10. Xóa `mockData.ts` nếu không cần dashboard mock data
