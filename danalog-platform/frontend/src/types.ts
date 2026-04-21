// === SYSTEM TYPES ===
export interface AppNotification {
    id: string;
    type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
    message: string;
    targetRole: UserRole | 'ALL';
    to?: string; // Target specific user by username
    read: boolean;
    relatedId?: string; // e.g. ticketId, orderId
    createdAt: string;
}

export interface TransportOrder {
    id: string;
    orderCode: string;
    customerId: string;
    customerName: string;
    routeId: string;
    routeName: string;
    pickupDate: string;
    deliveryDate: string;
    containerCount: number;
    containerSize: '20' | '40' | '40R0' | '45' | 'other';
    fe: 'F' | 'E';
    status: 'NEW' | 'PROCESSING' | 'DONE' | 'BILLED';
    notes?: string;
    createdBy: string;
    createdAt: string;
    ticketsGenerated: boolean;
}

// === ROLE SYSTEM ===
export type UserRole = 'ADMIN' | 'CS' | 'CS_LEAD' | 'DISPATCHER' | 'DV_LEAD' | 'ACCOUNTANT' | 'DRIVER';

export const ROLE_LABELS: Record<UserRole, string> = {
    ADMIN: 'Quản trị viên',
    CS: 'Nhân viên CS',
    CS_LEAD: 'Trưởng phòng CS',
    DISPATCHER: 'Điều phối viên',
    DV_LEAD: 'Trưởng phòng Điều vận',
    ACCOUNTANT: 'Kế toán',
    DRIVER: 'Lái xe',
};

// === DISPATCH TYPES (Spec v2.0) ===

// Priority Engine
export type PriorityLevel = 'Critical' | 'High' | 'Medium' | 'Low';

export interface PriorityBreakdown {
    pickupUrgency: number;       // 0-100 (weight 0.70)
    waitingPressure: number;     // 0-100 (weight 0.30)
}

// Driver Score — 5 components
export interface ScoreBreakdown {
    continuity: number;     // 0-100 (weight 0.40)
    availability: number;   // 0-100 (weight 0.25)
    routeExperience: number;// 0-100 (weight 0.15)
    performance: number;    // 0-100 (weight 0.10) — Phase 1 default=50
    loadBalance: number;    // 0-100 (weight 0.10)
}

export type ContinuityType = 'EXACT' | 'NEAR' | 'WEAK';

export interface DispatchCandidate {
    driverId: string;
    driverName: string;
    vehicleId: string;
    licensePlate: string;
    score: number;                  // 0-100 weighted total
    breakdown: ScoreBreakdown;
    continuityType: ContinuityType;
    continuityBadge: boolean;       // true if EXACT continuity
    expectedAvailableTime: string;
    expectedNextLocation: string;
    currentLocation: string;
    recentTrips: number;            // trips in last 7 days
    routeExperience: number;        // trips on this route
}

// Assign types
export type DispatchAssignType = 'ai_suggested' | 'manual' | 'override' | 'auto';

// Override reason codes
export type OverrideReasonCode = 'DRIVER_REQUESTED' | 'CUSTOMER_REQUESTED' | 'OPERATIONAL_NEED' | 'SYSTEM_ERROR' | 'OTHER';
export const OVERRIDE_REASON_LABELS: Record<OverrideReasonCode, string> = {
    DRIVER_REQUESTED: 'Lái xe yêu cầu',
    CUSTOMER_REQUESTED: 'Khách hàng yêu cầu',
    OPERATIONAL_NEED: 'Yêu cầu vận hành',
    SYSTEM_ERROR: 'Lỗi hệ thống',
    OTHER: 'Lý do khác',
};

// Driver reject reason codes
export type RejectReasonCode = 'BUSY' | 'VEHICLE_ISSUE' | 'PERSONAL' | 'ROUTE_UNFAMILIAR' | 'OTHER';
export const REJECT_REASON_LABELS: Record<RejectReasonCode, string> = {
    BUSY: 'Đang bận',
    VEHICLE_ISSUE: 'Xe gặp sự cố',
    PERSONAL: 'Lý do cá nhân',
    ROUTE_UNFAMILIAR: 'Không quen tuyến',
    OTHER: 'Khác',
};

// Eligibility rejection reasons
export type EligibilityRejectReason =
    | 'DRIVER_NOT_AVAILABLE'
    | 'VEHICLE_NOT_ACTIVE'
    | 'DRIVER_DISPATCH_LOCKED'
    | 'ASSIGNMENT_OVERLAP'
    | 'VEHICLE_SIZE_MISMATCH'
    | 'AVAILABLE_TOO_LATE'
    | 'MAINTENANCE_HOLD'
    | 'PREVIOUSLY_REJECTED';

export interface RejectedCandidate {
    driverId: string;
    driverName: string;
    licensePlate: string;
    rejectReasonCode: EligibilityRejectReason;
}

export interface DispatchLog {
    id: string;
    ticketId: string;
    ticketRoute: string;
    assignmentId: string;
    candidates: DispatchCandidate[];
    rejectedCandidates: RejectedCandidate[];
    assignedDriverId: string;
    assignedDriverName: string;
    assignType: DispatchAssignType;
    overrideReasonCode?: OverrideReasonCode;
    overrideNote?: string;
    reason?: string;
    timestamp: string;
    dispatcherUsername?: string;
}

export interface DispatchConfig {
    continuity_weight: number;   // default 40
    availability_weight: number; // default 25
    route_weight: number;        // default 15
    performance_weight: number;  // default 10
    balance_weight: number;      // default 10
}


export type DriverResponseStatus = 'ACCEPTED' | 'REJECTED' | 'PENDING' | 'NO_RESPONSE' | 'EXPIRED';

export interface DriverResponse {
    id: string;
    assignmentId: string;
    ticketId: string;
    driverId: string;
    driverName: string;
    licensePlate: string;
    response: DriverResponseStatus;
    rejectReasonCode?: RejectReasonCode;
    reason?: string;
    sentAt: string;
    respondedAt?: string;
    route?: string;
}

// === DISPATCH STATUS FLOW (Spec v2.0 Section 9.1) ===
export type DispatchStatus =
    | 'WAITING_DISPATCH'
    | 'RECOMMENDED'
    | 'ASSIGNED'
    | 'DRIVER_ASSIGNED'
    | 'DRIVER_PENDING'
    | 'DRIVER_ACCEPTED'
    | 'DRIVER_REJECTED'
    | 'NO_CANDIDATE'

    | 'IN_PROGRESS'
    | 'COMPLETED';

export const DISPATCH_STATUS_LABELS: Record<DispatchStatus, string> = {
    WAITING_DISPATCH: 'Chờ điều xe',
    RECOMMENDED: 'Có đề xuất',
    ASSIGNED: 'Đã phân công',
    DRIVER_ASSIGNED: 'Đã gán lái xe',
    DRIVER_PENDING: 'Chờ phản hồi',
    DRIVER_ACCEPTED: 'Đã nhận',
    DRIVER_REJECTED: 'Từ chối',
    NO_CANDIDATE: 'Không có ứng viên',

    IN_PROGRESS: 'Đang vận chuyển',
    COMPLETED: 'Hoàn thành',
};

export const DISPATCH_STATUS_COLORS: Record<DispatchStatus, { bg: string; text: string; border: string }> = {
    WAITING_DISPATCH: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
    RECOMMENDED: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-100' },
    ASSIGNED: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100' },
    DRIVER_ASSIGNED: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100' },
    DRIVER_PENDING: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100' },
    DRIVER_ACCEPTED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100' },
    DRIVER_REJECTED: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100' },
    NO_CANDIDATE: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-100' },

    IN_PROGRESS: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-100' },
    COMPLETED: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-100' },
};

// === PRIORITY BADGE COLORS ===
export const PRIORITY_COLORS: Record<PriorityLevel, { bg: string; text: string; border: string; pulse?: boolean }> = {
    Critical: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', pulse: true },
    High: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
    Medium: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
    Low: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
};

// === DASHBOARD STATS ===
export interface DashboardStats {
    totalOrders: number;
    pendingTickets: number;
    activeTrips: number;
    driversAvailable: number;
    totalDrivers: number;

    rejectionRate: number;           // percentage
    autoAssignRate: number;          // percentage
    aiSuggestedRate: number;         // percentage — top 1 selection rate
    overrideRate: number;            // percentage

    continuityUsageRate: number;     // percentage
    recentAssignments: DispatchLog[];
}

// === DISPATCH QUEUE ITEM (Spec v2.0 Section 12.1) ===
export interface DispatchQueueItem {
    ticketId: string;
    ticketNo: string;
    customerName: string;
    pickupLocationName: string;
    dropoffLocationName: string;
    routeName: string;
    plannedPickupTime: string;
    timeToPickupMinutes: number;
    containerSize: string;
    containerFe: string;
    priorityScore: number;
    priorityLevel: PriorityLevel;
    priorityBreakdown: PriorityBreakdown;

    dispatchStatus: DispatchStatus;

    version: number;
}

// Main ticket status — used across CS, Dispatch, and Driver flows
// English statuses: CS workflow (DRAFT → PENDING → APPROVED)
// Vietnamese statuses: Dispatch/Driver workflow (ĐÃ ĐIỀU XE → ĐANG VẬN CHUYỂN → COMPLETED)
// Note: These must remain consistent across all API handlers (assign.js, driver-response.js, orders/index.js)
export type TrafficStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'DRAFT' | 'NEW'
    | 'CHƯA ĐIỀU XE' | 'ĐÃ ĐIỀU XE' | 'ĐANG VẬN CHUYỂN' | 'COMPLETED'
    | 'MỚI TẠO' | 'BÁO CÁO CS';

export interface TransportTicket {
    id: string;
    stt: number;
    dateStart: string;
    dateEnd: string;
    licensePlate: string;
    driverName?: string; // Driver Name
    createdBy?: string; // Username of the creator
    customerCode: string; // e.g., SAM, LG
    containerNo: string;
    route: string;
    routeId?: string; // Reference to RouteConfig
    size: '20' | '40' | '40R0' | '45' | 'other';
    fe: 'F' | 'E'; // Full / Empty
    trips: number;
    imageUrl?: string;
    containerImage?: string; // Driver app uses this

    // Computed/Estimated values
    revenue: number;
    driverSalary: number;
    driverPrice?: number; // Don gia luong tai xe

    status: TrafficStatus;

    // Blockchain metadata
    onChainHash?: string;
    onChainStatus?: 'NONE' | 'PENDING' | 'VERIFIED';

    // Extra fields for logic
    nightStay?: boolean; // Luu dem
    nightStayDays?: number; // So luong dem luu
    nightStayLocation?: 'INNER_CITY' | 'OUTER_CITY' | 'OUT_CITY' | 'IN_CITY';
    nightStaySalary?: number; // Don gia luu dem (SNAPSHOT)
    notes?: string;
    billNo?: string; // So Bill (CS nhap de ke toan doi soat)
    tollFee?: number; // Phu phi cau duong/cang (Lai xe khai bao)
    tollFeeImage?: string; // Anh chung tu phu phi

    // Detailed Edit Fields
    weight?: number;
    cityStatus?: 'OUT_CITY' | 'IN_CITY';
    oilIncluded?: boolean;

    // Fees
    liftOnFee?: number; // Nang full
    liftOffFee?: number; // Ha rong
    airportFee?: number; // Phi lay hang san bay

    statusHistory?: {
        status: string;
        timestamp: string;
        user: string;
        action: string;
    }[];

    // Accountant Workflow
    accountantStatus?: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    accountantRejectReason?: string;
    accountantDeadline?: string;

    // Dispatch fields (Spec v2.0)
    dispatchStatus?: DispatchStatus;
    priorityScore?: number;
    priorityLevel?: PriorityLevel;
    priorityBreakdown?: PriorityBreakdown;
    pickupAreaCode?: string;          // e.g., 'TIEN_SA', 'LAO_BAO'
    dropoffAreaCode?: string;
    assignedDriverId?: string;
    assignedDriverName?: string;
    assignedAt?: string;
    assignType?: DispatchAssignType;


    version?: number;                 // Optimistic lock
    
    // Parent Order
    orderId?: string;
    orderCode?: string;               // Added for UI compatibility
    dispatcherUsername?: string;      // Added for UI compatibility
    submittedToCS?: boolean;
    submittedAt?: string;
    driverUsername?: string;
    editHighlight?: string[];
}

export interface TicketCorrectionRequest {
    id: string;
    ticketId: string;
    requestedBy: string;
    reason: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    reviewedBy?: string;
    reviewNote?: string;
    createdAt: string;
}

export interface RouteConfig {
    id: string;
    routeName: string;
    customer: string;
    km?: number;          // Khoảng cách (km)
    zone?: string;        // Vùng (dùng làm bộ lọc)
    pointA?: string;      // Điểm đi
    pointB?: string;      // Điểm đến

    // Dynamic Fields
    cargoType: 'TR_C_NOI_BO' | 'TR_C_CHUYEN_GIAY' | 'KHO_CFS_40' | 'KHO_CFS_20' | 'VC_GIAY' | 'VC_BOT' | 'VC_CONT' | 'LUU_DEM';
    isNightStay: boolean;
    nightStayLocation?: 'INNER_CITY' | 'OUTER_CITY';

    revenue: {
        price40F: number;
        price40E: number;
        price20F: number;
        price20E: number;

        liftDescFee: number;
    };

    salary: {
        driverSalary: number;
        surcharge: number;
    };

    fuel: {
        truckType: 'TRACTOR' | 'TRUCK';
        quota: number; // Liters
        gasStations: string[];
    };

    effectiveDate: string;
    status: 'ACTIVE' | 'INACTIVE';

    // Pending changes (scheduled for future effective date)
    // Pending changes (scheduled for future effective date)
    pendingChanges?: PendingRouteChange[];
}

export interface PendingRouteChange {
    effectiveDate: string;
    code?: string;
    routeName?: string;
    customer?: string;
    km?: number;
    zone?: string;
    pointA?: string;
    pointB?: string;
    cargoType?: 'TR_C_NOI_BO' | 'TR_C_CHUYEN_GIAY' | 'KHO_CFS_40' | 'KHO_CFS_20' | 'VC_GIAY' | 'VC_BOT' | 'VC_CONT' | 'LUU_DEM';
    isNightStay?: boolean;
    nightStayLocation?: 'INNER_CITY' | 'OUTER_CITY' | 'IN_CITY' | 'OUT_CITY';
    revenue?: {
        price40F?: number;
        price40E?: number;
        price20F?: number;
        price20E?: number;
        liftDescFee?: number;
    };
    salary?: {
        driverSalary?: number;
        surcharge?: number;
    };
    fuel?: {
        truckType?: 'TRACTOR' | 'TRUCK';
        quota?: number;
        gasStations?: string[];
    };
    status?: 'ACTIVE' | 'INACTIVE';
}

// Mock Data
export const MOCK_ROUTES_CONFIG: RouteConfig[] = [
    {
        "id": "RT-060",
        "routeName": "Nội bộ kho bãi Danalog 1",
        "customer": "TRUNG CHUYỂN",
        "cargoType": "TR_C_NOI_BO",
        "isNightStay": false,
        "revenue": {
            "price40F": 0,
            "price40E": 70000,
            "price20F": 0,
            "price20E": 50000,
            "liftDescFee": 0
        },
        "salary": {
            "driverSalary": 30000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 8,
            "gasStations": []
        },
        "effectiveDate": "2023-04-01",
        "status": "ACTIVE"
    },
    {
        "id": "RT-061",
        "routeName": "Giấy từ kho bãi Tiên Sa - cầu tàu Tiên Sa",
        "customer": "TRUNG CHUYỂN",
        "cargoType": "TR_C_CHUYEN_GIAY",
        "isNightStay": false,
        "revenue": {
            "price40F": 0,
            "price40E": 0,
            "price20F": 0,
            "price20E": 0,
            "liftDescFee": 0
        },
        "salary": {
            "driverSalary": 40000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 4,
            "gasStations": []
        },
        "effectiveDate": "2023-04-01",
        "status": "ACTIVE"
    },
    {
        "id": "RT-062",
        "routeName": "Giấy từ kho Danalog - Cảng Tiên Sa",
        "customer": "TRUNG CHUYỂN",
        "cargoType": "TR_C_CHUYEN_GIAY",
        "isNightStay": false,
        "revenue": {
            "price40F": 0,
            "price40E": 0,
            "price20F": 0,
            "price20E": 0,
            "liftDescFee": 0
        },
        "salary": {
            "driverSalary": 90000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 27,
            "gasStations": []
        },
        "effectiveDate": "2023-04-01",
        "status": "ACTIVE"
    },
    {
        "id": "RT-063",
        "routeName": "Tàu - Bãi Cảng Tiên Sa",
        "customer": "TRUNG CHUYỂN",
        "cargoType": "TR_C_NOI_BO",
        "isNightStay": false,
        "revenue": {
            "price40F": 0,
            "price40E": 70000,
            "price20F": 0,
            "price20E": 50000,
            "liftDescFee": 0
        },
        "salary": {
            "driverSalary": 60000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 3,
            "gasStations": []
        },
        "effectiveDate": "2023-04-01",
        "status": "ACTIVE"
    },
    {
        "id": "RT-064",
        "routeName": "Danalog 1 - Các bãi ngoài (GFT, GLS, VCS…)",
        "customer": "TRUNG CHUYỂN",
        "cargoType": "TR_C_NOI_BO",
        "isNightStay": false,
        "revenue": {
            "price40F": 0,
            "price40E": 70000,
            "price20F": 0,
            "price20E": 50000,
            "liftDescFee": 0
        },
        "salary": {
            "driverSalary": 30000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 4,
            "gasStations": []
        },
        "effectiveDate": "2023-04-01",
        "status": "ACTIVE"
    },
    {
        "id": "RT-065",
        "routeName": "Danalog 1,3,5<->Tiên Sa cont rỗng (Kiểm Soát Bãi)",
        "customer": "TRUNG CHUYỂN",
        "cargoType": "TR_C_NOI_BO",
        "isNightStay": false,
        "revenue": {
            "price40F": 0,
            "price40E": 70000,
            "price20F": 0,
            "price20E": 50000,
            "liftDescFee": 0
        },
        "salary": {
            "driverSalary": 30000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 7,
            "gasStations": []
        },
        "effectiveDate": "2023-04-01",
        "status": "ACTIVE"
    },
    {
        "id": "RT-066",
        "routeName": "Tiên Sa - Danalog",
        "customer": "TRUNG CHUYỂN",
        "cargoType": "TR_C_NOI_BO",
        "isNightStay": false,
        "revenue": {
            "price40F": 0,
            "price40E": 0,
            "price20F": 0,
            "price20E": 0,
            "liftDescFee": 0
        },
        "salary": {
            "driverSalary": 140000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 17,
            "gasStations": []
        },
        "effectiveDate": "2023-04-01",
        "status": "ACTIVE"
    },
    {
        "id": "RT-067",
        "routeName": "Tiên Sa <->Các Depot GFT, Chân Thật, SGS, TQ, VF",
        "customer": "TRUNG CHUYỂN",
        "cargoType": "TR_C_NOI_BO",
        "isNightStay": false,
        "revenue": {
            "price40F": 0,
            "price40E": 140000,
            "price20F": 0,
            "price20E": 100000,
            "liftDescFee": 0
        },
        "salary": {
            "driverSalary": 50000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 3,
            "gasStations": []
        },
        "effectiveDate": "2023-04-01",
        "status": "ACTIVE"
    },
    {
        "id": "RT-068",
        "routeName": "Danalog <->Các Depot GFT, Chân Thật, SGS, TQ, VF",
        "customer": "TRUNG CHUYỂN",
        "cargoType": "TR_C_NOI_BO",
        "isNightStay": false,
        "revenue": {
            "price40F": 0,
            "price40E": 70000,
            "price20F": 0,
            "price20E": 50000,
            "liftDescFee": 0
        },
        "salary": {
            "driverSalary": 60000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 5,
            "gasStations": []
        },
        "effectiveDate": "2023-04-01",
        "status": "ACTIVE"
    },
    {
        "id": "RT-069",
        "routeName": "Tiên Sa <-> Danalog 1",
        "customer": "TRUNG CHUYỂN",
        "cargoType": "TR_C_NOI_BO",
        "isNightStay": false,
        "revenue": {
            "price40F": 500000,
            "price40E": 0,
            "price20F": 325000,
            "price20E": 0,
            "liftDescFee": 0
        },
        "salary": {
            "driverSalary": 100000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 16,
            "gasStations": []
        },
        "effectiveDate": "2023-04-01",
        "status": "ACTIVE"
    },
    {
        "id": "RT-071",
        "routeName": "Hàng hóa kho CFS",
        "customer": "Kho hàng DNL",
        "cargoType": "KHO_CFS_20",
        "isNightStay": false,
        "revenue": {
            "price40F": 0,
            "price40E": 0,
            "price20F": 130000,
            "price20E": 0,
            "liftDescFee": 0
        },
        "salary": {
            "driverSalary": 90000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 21,
            "gasStations": []
        },
        "effectiveDate": "2023-04-01",
        "status": "ACTIVE"
    },
    {
        "id": "RT-073",
        "routeName": "Cảng Tiên Sa - Cửa khẩu quốc tế Lao Bảo - Nhà máy Sunpaper Savannakhet, Lào (2 chiều)",
        "customer": "QZY",
        "cargoType": "VC_GIAY",
        "isNightStay": false,
        "revenue": {
            "price40F": 3200000,
            "price40E": 0,
            "price20F": 0,
            "price20E": 0,
            "liftDescFee": 0
        },
        "salary": {
            "driverSalary": 800000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 115,
            "gasStations": []
        },
        "effectiveDate": "2023-04-01",
        "status": "ACTIVE"
    },
    {
        "id": "RT-074",
        "routeName": "Cảng Tiên Sa - Cửa khẩu quốc tế Lao Bảo - Nhà máy Sunpaper Savannakhet, Lào (1 chiều)",
        "customer": "QZY",
        "cargoType": "VC_GIAY",
        "isNightStay": false,
        "revenue": {
            "price40F": 3000000,
            "price40E": 0,
            "price20F": 0,
            "price20E": 0,
            "liftDescFee": 0
        },
        "salary": {
            "driverSalary": 400000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 170,
            "gasStations": []
        },
        "effectiveDate": "2023-04-01",
        "status": "ACTIVE"
    },
    {
        "id": "RT-075",
        "routeName": "Cảng Tiên Sa Danang ( VietNam ) - Vientiane, Lào.",
        "customer": "STEINWEG",
        "cargoType": "VC_CONT",
        "isNightStay": false,
        "revenue": {
            "price40F": 2700000,
            "price40E": 0,
            "price20F": 1755000,
            "price20E": 0,
            "liftDescFee": 0
        },
        "salary": {
            "driverSalary": 800000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 146,
            "gasStations": []
        },
        "effectiveDate": "2023-04-01",
        "status": "ACTIVE"
    },
    {
        "id": "RT-076",
        "routeName": "NM Tinh bột sắn, Sepon Lào - Cảng Tiên Sa Đà Nẵng",
        "customer": "PHÙNG GIA PHÁT",
        "cargoType": "VC_BOT",
        "isNightStay": false,
        "revenue": {
            "price40F": 2400000,
            "price40E": 0,
            "price20F": 0,
            "price20E": 0,
            "liftDescFee": 0
        },
        "salary": {
            "driverSalary": 400000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 105,
            "gasStations": []
        },
        "effectiveDate": "2023-04-01",
        "status": "ACTIVE"
    },
    {
        "id": "RT-077",
        "routeName": "Cảng Tiên Sa - Thateng, Sekong, Lào (qua cửa khẩu Lalay)",
        "customer": "VẠN TƯỢNG",
        "cargoType": "VC_BOT",
        "isNightStay": false,
        "revenue": {
            "price40F": 2500000,
            "price40E": 0,
            "price20F": 0,
            "price20E": 0,
            "liftDescFee": 0
        },
        "salary": {
            "driverSalary": 600000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 110,
            "gasStations": []
        },
        "effectiveDate": "2023-04-01",
        "status": "ACTIVE"
    },
    {
        "id": "RT-078",
        "routeName": "Cảng Tiên Sa - Nhà máy Quặng Quảng Bình",
        "customer": "Nhiều khách hàng",
        "cargoType": "VC_CONT",
        "isNightStay": false,
        "revenue": {
            "price40F": 1500000,
            "price40E": 0,
            "price20F": 975000,
            "price20E": 0,
            "liftDescFee": 0
        },
        "salary": {
            "driverSalary": 300000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 104,
            "gasStations": []
        },
        "effectiveDate": "2023-04-01",
        "status": "ACTIVE"
    },
    {
        "id": "RT-079",
        "routeName": "Cảng Chu Lai - Hyosung Tam Thăng, Tam Kỳ, Quảng Nam",
        "customer": "HYOSUNG",
        "cargoType": "VC_CONT",
        "isNightStay": false,
        "revenue": {
            "price40F": 0,
            "price40E": 0,
            "price20F": 390000,
            "price20E": 0,
            "liftDescFee": 0
        },
        "salary": {
            "driverSalary": 180000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 45,
            "gasStations": []
        },
        "effectiveDate": "2023-04-01",
        "status": "ACTIVE"
    },
    {
        "id": "RT-082",
        "routeName": "Cảng Tiên Sa, Đà Nẵng- Hyosung Tam Thăng, Tam Kỳ, Quảng Nam",
        "customer": "HYOSUNG",
        "cargoType": "VC_CONT",
        "isNightStay": false,
        "revenue": {
            "price40F": 400000,
            "price40E": 0,
            "price20F": 0,
            "price20E": 0,
            "liftDescFee": 0
        },
        "salary": {
            "driverSalary": 190000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 45,
            "gasStations": []
        },
        "effectiveDate": "2023-04-01",
        "status": "ACTIVE"
    },
    {
        "id": "RT-084",
        "routeName": "Cảng Tiên Sa - KCN Thọ Quang",
        "customer": "Nhiều khách hàng",
        "cargoType": "VC_CONT",
        "isNightStay": false,
        "revenue": {
            "price40F": 400000,
            "price40E": 0,
            "price20F": 260000,
            "price20E": 0,
            "liftDescFee": 0
        },
        "salary": {
            "driverSalary": 150000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 22,
            "gasStations": []
        },
        "effectiveDate": "2023-04-01",
        "status": "ACTIVE"
    },
    {
        "id": "RT-085",
        "routeName": "Cảng Tiên Sa - Phú Bài, Huế",
        "customer": "Nhiều khách hàng",
        "cargoType": "VC_CONT",
        "isNightStay": false,
        "revenue": {
            "price40F": 700000,
            "price40E": 0,
            "price20F": 0,
            "price20E": 0,
            "liftDescFee": 0
        },
        "salary": {
            "driverSalary": 250000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 47,
            "gasStations": []
        },
        "effectiveDate": "2023-04-01",
        "status": "ACTIVE"
    },
    {
        "id": "RT-087",
        "routeName": "Cảng Tiên Sa - KCN Hòa Khánh",
        "customer": "Nhiều khách hàng",
        "cargoType": "VC_CONT",
        "isNightStay": false,
        "revenue": {
            "price40F": 200000,
            "price40E": 0,
            "price20F": 130000,
            "price20E": 0,
            "liftDescFee": 0
        },
        "salary": {
            "driverSalary": 90000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 10,
            "gasStations": []
        },
        "effectiveDate": "2023-04-01",
        "status": "ACTIVE"
    },
    {
        "id": "RT-088",
        "routeName": "Cảng Tiên Sa - KCN Hòa Cầm",
        "customer": "Nhiều khách hàng",
        "cargoType": "VC_CONT",
        "isNightStay": false,
        "revenue": {
            "price40F": 300000,
            "price40E": 0,
            "price20F": 195000,
            "price20E": 0,
            "liftDescFee": 0
        },
        "salary": {
            "driverSalary": 110000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 14,
            "gasStations": []
        },
        "effectiveDate": "2023-04-01",
        "status": "ACTIVE"
    },
    {
        "id": "RT-089",
        "routeName": "Cảng Tiên Sa - Điện Ngọc, Điện Bàn",
        "customer": "Nhiều khách hàng",
        "cargoType": "VC_CONT",
        "isNightStay": false,
        "revenue": {
            "price40F": 200000,
            "price40E": 0,
            "price20F": 130000,
            "price20E": 0,
            "liftDescFee": 0
        },
        "salary": {
            "driverSalary": 90000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 19,
            "gasStations": []
        },
        "effectiveDate": "2023-04-01",
        "status": "ACTIVE"
    },
    {
        "id": "RT-090",
        "routeName": "DNL 1 - Điện Thắng, Sợi Quảng Đà",
        "customer": "Nhiều khách hàng",
        "cargoType": "VC_CONT",
        "isNightStay": false,
        "revenue": {
            "price40F": 400000,
            "price40E": 0,
            "price20F": 260000,
            "price20E": 0,
            "liftDescFee": 0
        },
        "salary": {
            "driverSalary": 100000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 13,
            "gasStations": []
        },
        "effectiveDate": "2023-04-01",
        "status": "ACTIVE"
    },
    {
        "id": "RT-091",
        "routeName": "Cảng Tiên Sa - KCN Duy Xuyên",
        "customer": "Nhiều khách hàng",
        "cargoType": "VC_CONT",
        "isNightStay": false,
        "revenue": {
            "price40F": 900000,
            "price40E": 0,
            "price20F": 585000,
            "price20E": 0,
            "liftDescFee": 0
        },
        "salary": {
            "driverSalary": 300000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 68,
            "gasStations": []
        },
        "effectiveDate": "2023-04-01",
        "status": "ACTIVE"
    },
    {
        "id": "RT-092",
        "routeName": "Cảng Tiên Sa - KCN Quảng Ngãi (Quanterm 125km)",
        "customer": "Nhiều khách hàng",
        "cargoType": "VC_CONT",
        "isNightStay": false,
        "revenue": {
            "price40F": 900000,
            "price40E": 0,
            "price20F": 585000,
            "price20E": 0,
            "liftDescFee": 0
        },
        "salary": {
            "driverSalary": 200000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 48,
            "gasStations": []
        },
        "effectiveDate": "2023-04-01",
        "status": "ACTIVE"
    },
    {
        "id": "RT-093",
        "routeName": "Cảng Tiên Sa - KCN Quảng Ngãi (Vinalink 130km)",
        "customer": "Nhiều khách hàng",
        "cargoType": "VC_CONT",
        "isNightStay": false,
        "revenue": {
            "price40F": 700000,
            "price40E": 0,
            "price20F": 455000,
            "price20E": 0,
            "liftDescFee": 0
        },
        "salary": {
            "driverSalary": 200000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 63,
            "gasStations": []
        },
        "effectiveDate": "2023-04-01",
        "status": "ACTIVE"
    },
    {
        "id": "RT-094",
        "routeName": "Cảng Tiên Sa - MN Hoà Thọ, Hà Lam, Quảng Nam",
        "customer": "Nhiều khách hàng",
        "cargoType": "VC_CONT",
        "isNightStay": false,
        "revenue": {
            "price40F": 1000000,
            "price40E": 0,
            "price20F": 650000,
            "price20E": 0,
            "liftDescFee": 0
        },
        "salary": {
            "driverSalary": 300000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 63,
            "gasStations": []
        },
        "effectiveDate": "2023-04-01",
        "status": "ACTIVE"
    },
    {
        "id": "RT-095",
        "routeName": "Cảng Tiên Sa - KCN Đông Quế Sơn (Giáp Quốc lộ 1A )",
        "customer": "Nhiều khách hàng",
        "cargoType": "VC_CONT",
        "isNightStay": false,
        "revenue": {
            "price40F": 1000000,
            "price40E": 0,
            "price20F": 650000,
            "price20E": 0,
            "liftDescFee": 0
        },
        "salary": {
            "driverSalary": 300000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 68,
            "gasStations": []
        },
        "effectiveDate": "2023-04-01",
        "status": "ACTIVE"
    },
    {
        "id": "RT-096",
        "routeName": "Cảng Tiên Sa - Lao Bảo, Quảng Trị (Gỗ)",
        "customer": "Nhiều khách hàng",
        "cargoType": "VC_CONT",
        "isNightStay": false,
        "revenue": {
            "price40F": 3000000,
            "price40E": 0,
            "price20F": 1950000,
            "price20E": 0,
            "liftDescFee": 0
        },
        "salary": {
            "driverSalary": 600000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 128,
            "gasStations": []
        },
        "effectiveDate": "2023-04-01",
        "status": "ACTIVE"
    },
    {
        "id": "RT-097",
        "routeName": "Cảng Tiên Sa - Đông Hà, Quảng Trị (Gỗ)",
        "customer": "Nhiều khách hàng",
        "cargoType": "VC_CONT",
        "isNightStay": false,
        "revenue": {
            "price40F": 1000000,
            "price40E": 0,
            "price20F": 650000,
            "price20E": 0,
            "liftDescFee": 0
        },
        "salary": {
            "driverSalary": 400000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 81,
            "gasStations": []
        },
        "effectiveDate": "2023-04-01",
        "status": "ACTIVE"
    },
    {
        "id": "RT-098",
        "routeName": "Cảng Tiên Sa, Đà Nẵng - Quy Nhơn",
        "customer": "Nhiều khách hàng",
        "cargoType": "VC_CONT",
        "isNightStay": false,
        "revenue": {
            "price40F": 1300000,
            "price40E": 0,
            "price20F": 845000,
            "price20E": 0,
            "liftDescFee": 0
        },
        "salary": {
            "driverSalary": 300000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 87,
            "gasStations": []
        },
        "effectiveDate": "2023-04-01",
        "status": "ACTIVE"
    },
    {
        "id": "RT-099",
        "routeName": "Cảng Tiên Sa - Đồng Hới, Quảng Bình",
        "customer": "Nhiều khách hàng",
        "cargoType": "VC_CONT",
        "isNightStay": false,
        "revenue": {
            "price40F": 1400000,
            "price40E": 0,
            "price20F": 910000,
            "price20E": 0,
            "liftDescFee": 0
        },
        "salary": {
            "driverSalary": 500000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 90,
            "gasStations": []
        },
        "effectiveDate": "2023-04-01",
        "status": "ACTIVE"
    },
    {
        "id": "RT-100",
        "routeName": "Cảng Tiên Sa - KCN Bắc Sông Cầu - Phú Yên",
        "customer": "Nhiều khách hàng",
        "cargoType": "VC_CONT",
        "isNightStay": false,
        "revenue": {
            "price40F": 1800000,
            "price40E": 0,
            "price20F": 1170000,
            "price20E": 0,
            "liftDescFee": 0
        },
        "salary": {
            "driverSalary": 500000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 84,
            "gasStations": []
        },
        "effectiveDate": "2023-04-01",
        "status": "ACTIVE"
    },
    {
        "id": "RT-102",
        "routeName": "Trong TP",
        "customer": "",
        "cargoType": "LUU_DEM",
        "isNightStay": true,
        "nightStayLocation": "INNER_CITY",
        "revenue": {
            "price40F": 0,
            "price40E": 0,
            "price20F": 0,
            "price20E": 0,
            "liftDescFee": 0
        },
        "salary": {
            "driverSalary": 120000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 27,
            "gasStations": []
        },
        "effectiveDate": "2023-04-01",
        "status": "ACTIVE"
    },
    {
        "id": "RT-103",
        "routeName": "Ngoài TP",
        "customer": "",
        "cargoType": "LUU_DEM",
        "isNightStay": true,
        "nightStayLocation": "OUTER_CITY",
        "revenue": {
            "price40F": 0,
            "price40E": 0,
            "price20F": 0,
            "price20E": 0,
            "liftDescFee": 0
        },
        "salary": {
            "driverSalary": 90000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 27,
            "gasStations": []
        },
        "effectiveDate": "2023-04-01",
        "status": "ACTIVE"
    }
]

// === CORRECTION REQUESTS ===
export interface TicketCorrectionRequest {
    id: string;
    ticketId: string;
    ticketRoute: string; // for display
    customerCode: string; // for display
    requestedBy: string; // Username of CS
    requestedAt?: string; 
    created_at?: string; // Fallback explicitly for DB
    reason: string;
    attachmentUrl?: string; // Optional URL or file path
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    reviewedBy?: string;
    reviewedAt?: string;
    reviewNote?: string;
}

// === PROFILE UPDATE REQUESTS ===
export interface ProfileUpdateRequest {
    id: string;
    username: string;
    fullName?: string;
    role?: string;
    approverRole?: string;
    created_at?: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    
    fieldsToUpdate: {
        name?: string;
        licensePlate?: string;
        phone?: string;
        email?: string;
        [key: string]: any;
    };
    
    approverUsername?: string;
    approverNotes?: string;
}

