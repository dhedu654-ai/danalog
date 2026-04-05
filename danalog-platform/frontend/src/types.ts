import { LEGACY_TICKETS } from './legacy_tickets';

// === SYSTEM TYPES ===
export interface AppNotification {
    id: string;
    type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
    message: string;
    targetRole: UserRole | 'ALL';
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
    pickupUrgency: number;       // 0-100 (weight 0.60)
    waitingPressure: number;     // 0-100 (weight 0.25)
    chainingOpportunity: number; // 0-100 (weight 0.15)
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
    assignmentCycleId: string;
    cycleNo: number;
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
    slaBreached: boolean;
}

export interface DispatchConfig {
    continuity_weight: number;   // default 40
    availability_weight: number; // default 25
    route_weight: number;        // default 15
    performance_weight: number;  // default 10
    balance_weight: number;      // default 10
}

export interface SLAConfig {
    standardAssignTime: number;  // minutes (default 15)
    priorityAssignTime: number;  // minutes (default 5)
    driverResponseTime: number;  // minutes (default 3)
    maxAssignmentCycles: number; // default 3
    enableReminders: boolean;
    enableDashboardAlert: boolean;
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
    | 'DRIVER_PENDING'
    | 'DRIVER_ACCEPTED'
    | 'DRIVER_REJECTED'
    | 'NO_CANDIDATE'
    | 'ESCALATED'
    | 'IN_PROGRESS'
    | 'COMPLETED';

export const DISPATCH_STATUS_LABELS: Record<DispatchStatus, string> = {
    WAITING_DISPATCH: 'Chờ điều xe',
    RECOMMENDED: 'Có đề xuất',
    ASSIGNED: 'Đã phân công',
    DRIVER_PENDING: 'Chờ phản hồi',
    DRIVER_ACCEPTED: 'Đã nhận',
    DRIVER_REJECTED: 'Từ chối',
    NO_CANDIDATE: 'Không có ứng viên',
    ESCALATED: 'Cần xử lý',
    IN_PROGRESS: 'Đang vận chuyển',
    COMPLETED: 'Hoàn thành',
};

export const DISPATCH_STATUS_COLORS: Record<DispatchStatus, { bg: string; text: string; border: string }> = {
    WAITING_DISPATCH: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
    RECOMMENDED: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-100' },
    ASSIGNED: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100' },
    DRIVER_PENDING: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100' },
    DRIVER_ACCEPTED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100' },
    DRIVER_REJECTED: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100' },
    NO_CANDIDATE: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-100' },
    ESCALATED: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-100' },
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
    avgSLATime: number;              // minutes
    rejectionRate: number;           // percentage
    autoAssignRate: number;          // percentage
    aiSuggestedRate: number;         // percentage — top 1 selection rate
    overrideRate: number;            // percentage
    escalationRate: number;          // percentage
    slaComplianceRate: number;       // percentage
    continuityUsageRate: number;     // percentage
    recentAssignments: DispatchLog[];
    slaAlerts: { ticketId: string; route: string; remainingMinutes: number; priorityLevel: PriorityLevel; }[];
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
    assignSlaRemainingSeconds: number;
    dispatchStatus: DispatchStatus;
    currentCycleNo: number;
    version: number;
}

export type TrafficStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'DRAFT';

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
    dispatchSLADeadline?: string;
    currentAssignmentCycleId?: string;
    currentCycleNo?: number;
    version?: number;                 // Optimistic lock
    
    // Parent Order
    orderId?: string;
}

export interface RouteConfig {
    id: string;
    routeName: string;
    customer: string;

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
        "id": "RT-QZY-01",
        "routeName": "Cảng Tiên Sa - Cửa khẩu quốc tế Lao Bảo - Nhà máy Sunpaper Savannakhet, Lào (2 chiều)",
        "customer": "QZY",
        "cargoType": "VC_CONT",
        "isNightStay": false,
        "revenue": {
            "price40F": 2000000,
            "price40E": 2000000,
            "price20F": 2000000,
            "price20E": 2000000,
            "liftDescFee": 0
        },
        "salary": {
            "driverSalary": 500000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 0,
            "gasStations": []
        },
        "effectiveDate": "2023-01-01",
        "status": "ACTIVE"
    },
    {
        "id": "RT-QZY-02",
        "routeName": "Cảng Tiên Sa - Cửa khẩu quốc tế Lao Bảo - Nhà máy Sunpaper Savannakhet, Lào (1 chiều)",
        "customer": "QZY",
        "cargoType": "VC_CONT",
        "isNightStay": false,
        "revenue": {
            "price40F": 2000000,
            "price40E": 2000000,
            "price20F": 2000000,
            "price20E": 2000000,
            "liftDescFee": 0
        },
        "salary": {
            "driverSalary": 500000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 0,
            "gasStations": []
        },
        "effectiveDate": "2023-01-01",
        "status": "ACTIVE"
    },
    {
        "id": "RT-STEINWEG-01",
        "routeName": "Cảng Tiên Sa, Danang - Vientiane, Lào.",
        "customer": "STEINWEG",
        "cargoType": "VC_CONT",
        "isNightStay": false,
        "revenue": {
            "price40F": 2000000,
            "price40E": 2000000,
            "price20F": 2000000,
            "price20E": 2000000,
            "liftDescFee": 0
        },
        "salary": {
            "driverSalary": 500000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 0,
            "gasStations": []
        },
        "effectiveDate": "2023-01-01",
        "status": "ACTIVE"
    },
    {
        "id": "RT-VANTUONG-01",
        "routeName": "Salavan, Lào quá cảnh qua CK Lalay đến cảng Tiên Sa, Đà Nẵng (bốc container rỗng sang đóng hàng)",
        "customer": "VẠN TƯỢNG",
        "cargoType": "VC_CONT",
        "isNightStay": false,
        "revenue": {
            "price40F": 2000000,
            "price40E": 2000000,
            "price20F": 2000000,
            "price20E": 2000000,
            "liftDescFee": 0
        },
        "salary": {
            "driverSalary": 500000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 0,
            "gasStations": []
        },
        "effectiveDate": "2023-01-01",
        "status": "ACTIVE"
    },
    {
        "id": "RT-AST-01",
        "routeName": "Cảng Tiên Sa, Đà Nẵng - Champasak, Lào",
        "customer": "AST",
        "cargoType": "VC_CONT",
        "isNightStay": false,
        "revenue": {
            "price40F": 2000000,
            "price40E": 2000000,
            "price20F": 2000000,
            "price20E": 2000000,
            "liftDescFee": 0
        },
        "salary": {
            "driverSalary": 500000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 0,
            "gasStations": []
        },
        "effectiveDate": "2023-01-01",
        "status": "ACTIVE"
    },
    {
        "id": "RT-PGP-01",
        "routeName": "NM Tinh bột sắn, Sepon Lào - Cảng Tiên Sa Đà Nẵng (bốc container rỗng sang đóng hàng)",
        "customer": "PHÙNG GIA PHÁT",
        "cargoType": "VC_BOT",
        "isNightStay": false,
        "revenue": {
            "price40F": 2000000,
            "price40E": 2000000,
            "price20F": 2000000,
            "price20E": 2000000,
            "liftDescFee": 0
        },
        "salary": {
            "driverSalary": 500000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 0,
            "gasStations": []
        },
        "effectiveDate": "2023-01-01",
        "status": "ACTIVE"
    },
    {
        "id": "RT-GEMADEPT-01",
        "routeName": "NM Tinh bột sắn, Sepon Lào - Cảng Tiên Sa Đà Nẵng (bốc container rỗng sang đóng hàng)",
        "customer": "GEMADEPT-BỘT",
        "cargoType": "VC_BOT",
        "isNightStay": false,
        "revenue": {
            "price40F": 2000000,
            "price40E": 2000000,
            "price20F": 2000000,
            "price20E": 2000000,
            "liftDescFee": 0
        },
        "salary": {
            "driverSalary": 500000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 0,
            "gasStations": []
        },
        "effectiveDate": "2023-01-01",
        "status": "ACTIVE"
    },
    {
        "id": "RT-HYOSUNG-01",
        "routeName": "Cảng Tiên Sa, Đà Nẵng- HS Hyosung Quảng Nam, KCN Tam Thăng, xã Thăng Trường, thành phố Đà Nẵng",
        "customer": "HYOSUNG",
        "cargoType": "VC_CONT",
        "isNightStay": false,
        "revenue": {
            "price40F": 2000000,
            "price40E": 2000000,
            "price20F": 2000000,
            "price20E": 2000000,
            "liftDescFee": 0
        },
        "salary": {
            "driverSalary": 500000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 0,
            "gasStations": []
        },
        "effectiveDate": "2023-01-01",
        "status": "ACTIVE"
    },
    {
        "id": "RT-HYOSUNG-02",
        "routeName": "Cảng Tiên Sa, Đà Nẵng- HS Hyosung Quảng Nam, KCN Tam Thăng, xã Thăng Trường, thành phố Đà Nẵng (2 chuyến/ngày)",
        "customer": "HYOSUNG",
        "cargoType": "VC_CONT",
        "isNightStay": false,
        "revenue": {
            "price40F": 2000000,
            "price40E": 2000000,
            "price20F": 2000000,
            "price20E": 2000000,
            "liftDescFee": 0
        },
        "salary": {
            "driverSalary": 500000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 0,
            "gasStations": []
        },
        "effectiveDate": "2023-01-01",
        "status": "ACTIVE"
    },
    {
        "id": "RT-XIDADONG-01",
        "routeName": "Cảng Tiên Sa - KCN Viship Quảng Ngãi",
        "customer": "XIDADONG",
        "cargoType": "VC_CONT",
        "isNightStay": false,
        "revenue": {
            "price40F": 2000000,
            "price40E": 2000000,
            "price20F": 2000000,
            "price20E": 2000000,
            "liftDescFee": 0
        },
        "salary": {
            "driverSalary": 500000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 0,
            "gasStations": []
        },
        "effectiveDate": "2023-01-01",
        "status": "ACTIVE"
    },
    {
        "id": "RT-OTHER-01",
        "routeName": "Cảng Tiên Sa - KCN Thọ Quang",
        "customer": "Nhiều khách hàng",
        "cargoType": "VC_CONT",
        "isNightStay": false,
        "revenue": {
            "price40F": 2000000,
            "price40E": 2000000,
            "price20F": 2000000,
            "price20E": 2000000,
            "liftDescFee": 0
        },
        "salary": {
            "driverSalary": 500000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 0,
            "gasStations": []
        },
        "effectiveDate": "2023-01-01",
        "status": "ACTIVE"
    },
    {
        "id": "RT-DNL-01",
        "routeName": "Hàng hóa kho CFS cont 20'",
        "customer": "Kho hàng DNL",
        "cargoType": "KHO_CFS_20",
        "isNightStay": false,
        "revenue": {
            "price40F": 2000000,
            "price40E": 2000000,
            "price20F": 2000000,
            "price20E": 2000000,
            "liftDescFee": 0
        },
        "salary": {
            "driverSalary": 500000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 0,
            "gasStations": []
        },
        "effectiveDate": "2023-01-01",
        "status": "ACTIVE"
    },
    {
        "id": "RT-DNL-02",
        "routeName": "Hàng hóa kho CFS, cont 40'",
        "customer": "Kho hàng DNL",
        "cargoType": "KHO_CFS_40",
        "isNightStay": false,
        "revenue": {
            "price40F": 2000000,
            "price40E": 2000000,
            "price20F": 2000000,
            "price20E": 2000000,
            "liftDescFee": 0
        },
        "salary": {
            "driverSalary": 500000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 0,
            "gasStations": []
        },
        "effectiveDate": "2023-01-01",
        "status": "ACTIVE"
    },
    {
        "id": "RT-DEPOT-01",
        "routeName": "cont sửa chữa từ Danalog - Tiên sa và ngược lại",
        "customer": "Depot",
        "cargoType": "VC_CONT",
        "isNightStay": false,
        "revenue": {
            "price40F": 2000000,
            "price40E": 2000000,
            "price20F": 2000000,
            "price20E": 2000000,
            "liftDescFee": 0
        },
        "salary": {
            "driverSalary": 500000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 0,
            "gasStations": []
        },
        "effectiveDate": "2023-01-01",
        "status": "ACTIVE"
    },
    {
        "id": "RT-TC-01",
        "routeName": "Nội bộ kho bãi Danalog 1",
        "customer": "TRUNG CHUYỂN",
        "cargoType": "TR_C_NOI_BO",
        "isNightStay": false,
        "revenue": {
            "price40F": 2000000,
            "price40E": 2000000,
            "price20F": 2000000,
            "price20E": 2000000,
            "liftDescFee": 0
        },
        "salary": {
            "driverSalary": 500000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 0,
            "gasStations": []
        },
        "effectiveDate": "2023-01-01",
        "status": "ACTIVE"
    },
    {
        "id": "RT-TC-02",
        "routeName": "Tàu - Bãi Cảng Tiên Sa",
        "customer": "TRUNG CHUYỂN",
        "cargoType": "TR_C_NOI_BO",
        "isNightStay": false,
        "revenue": {
            "price40F": 2000000,
            "price40E": 2000000,
            "price20F": 2000000,
            "price20E": 2000000,
            "liftDescFee": 0
        },
        "salary": {
            "driverSalary": 500000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 0,
            "gasStations": []
        },
        "effectiveDate": "2023-01-01",
        "status": "ACTIVE"
    },
    {
        "id": "RT-NIGHT-01",
        "routeName": "Lưu đêm (Ngoài TP)",
        "customer": "",
        "cargoType": "LUU_DEM",
        "isNightStay": true,
        "nightStayLocation": "OUTER_CITY",
        "revenue": {
            "price40F": 2000000,
            "price40E": 2000000,
            "price20F": 2000000,
            "price20E": 2000000,
            "liftDescFee": 0
        },
        "salary": {
            "driverSalary": 500000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 0,
            "gasStations": []
        },
        "effectiveDate": "2023-01-01",
        "status": "ACTIVE"
    },
    {
        "id": "RT-NIGHT-02",
        "routeName": "Lưu đêm (Trong TP)",
        "customer": "",
        "cargoType": "LUU_DEM",
        "isNightStay": true,
        "nightStayLocation": "INNER_CITY",
        "revenue": {
            "price40F": 2000000,
            "price40E": 2000000,
            "price20F": 2000000,
            "price20E": 2000000,
            "liftDescFee": 0
        },
        "salary": {
            "driverSalary": 500000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 0,
            "gasStations": []
        },
        "effectiveDate": "2023-01-01",
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
    requestedAt: string;
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
    fullName: string;
    role: string;
    approverRole: string; // E.g., 'CS_LEAD', 'DV_LEAD', 'ADMIN'
    requestedAt: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    
    fieldsToUpdate: {
        name?: string;
        licensePlate?: string;
        phone?: string;
        email?: string;
        [key: string]: any;
    };
    
    reviewedBy?: string;
    reviewedAt?: string;
    reviewNote?: string;
}

