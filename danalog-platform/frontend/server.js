import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const JWT_SECRET = process.env.JWT_SECRET || 'danalog_super_secret_key_123_!@#';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3002;
const DB_FILE = path.join(__dirname, 'db.json');

app.use(helmet({ contentSecurityPolicy: false })); // Allow React to load
app.use(cors());
app.use(bodyParser.json({ limit: '5mb' }));
app.use(bodyParser.urlencoded({ limit: '5mb', extended: true }));

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Quá nhiều lần đăng nhập, vui lòng thử lại sau 15 phút' }
});

const authenticateJWT = (req, res, next) => {
    if (req.path === '/login' || !req.path.startsWith('/')) { // since it's mounted on /api, req.path is relative to /api if we use app.use('/api', ...)
        return next();
    }
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (err) return res.status(403).json({ error: 'Phiên đăng nhập hết hạn hoặc không hợp lệ' });
            req.user = user;
            next();
        });
    } else {
        res.status(401).json({ error: 'Yêu cầu truy cập bị từ chối' });
    }
};

app.use('/api', authenticateJWT);

// Serve static files from the React build
app.use(express.static(path.join(__dirname, 'dist')));

// --- DEFAULT DATA ---
const DEFAULT_USERS = [
    {
        "username": "admin",
        "password": "admin123",
        "role": "ADMIN",
        "name": "Administrator"
    },
    {
        "username": "cs_user",
        "password": "password123",
        "role": "CS",
        "name": "CS Staff"
    },
    {
        "username": "tiennd",
        "password": "driver123",
        "role": "DRIVER",
        "name": "Nguyễn Đức Tiên",
        "licensePlate": "43C-199.91"
    },
    {
        "username": "anhnv",
        "password": "driver123",
        "role": "DRIVER",
        "name": "Nguyễn Văn Anh",
        "licensePlate": "43C-113.94"
    },
    {
        "username": "thanhnv",
        "password": "driver123",
        "role": "DRIVER",
        "name": "Nguyễn Văn Thành",
        "licensePlate": "43C-444.55"
    },
    {
        "username": "anhnt",
        "password": "driver123",
        "role": "DRIVER",
        "name": "Nguyễn Thế Anh",
        "licensePlate": "43C 11394"
    },
    {
        "username": "sanghv",
        "password": "driver123",
        "role": "DRIVER",
        "name": "Hồ Viết Sáng",
        "licensePlate": "43C 19909"
    },
    {
        "username": "hannv",
        "password": "driver123",
        "role": "DRIVER",
        "name": "Nguyễn Văn Hân",
        "licensePlate": "43C 19991"
    },
    {
        "username": "dispatcher1",
        "password": "dispatch123",
        "role": "DISPATCHER",
        "name": "Trần Minh Tú"
    },
    {
        "username": "dvlead",
        "password": "dvlead123",
        "role": "DV_LEAD",
        "name": "Nguyễn Văn A"
    },
    {
        "username": "cs_lead",
        "password": "cslead123",
        "role": "CS_LEAD",
        "name": "Trần Anh Tuấn"
    },
    {
        "username": "ketoan",
        "password": "ketoan123",
        "role": "ACCOUNTANT",
        "name": "Lê Thị Hoa"
    }
];

// Default dispatch configuration (weights for scoring algorithm)
const DEFAULT_DISPATCH_CONFIG = {
    continuity_weight: 40,
    availability_weight: 25,
    route_weight: 15,
    performance_weight: 10,
    balance_weight: 10
};

// Default SLA configuration
const DEFAULT_SLA_CONFIG = {
    standardAssignTime: 15,   // minutes
    priorityAssignTime: 5,    // minutes
    driverResponseTime: 3,    // minutes
    maxAssignmentCycles: 3,   // escalate after N cycles
    enableReminders: true,
    enableDashboardAlert: true
};

// Default customers (will be migrated to database)
const DEFAULT_CUSTOMERS = [
    { id: 'CUST-001', code: 'QZY', name: 'QZY', taxCode: '', contractNo: '', status: 'ACTIVE', createdAt: '2023-01-01', updatedAt: '2023-01-01' },
    { id: 'CUST-002', code: 'STEINWEG', name: 'STEINWEG', taxCode: '', contractNo: '', status: 'ACTIVE', createdAt: '2023-01-01', updatedAt: '2023-01-01' },
    { id: 'CUST-003', code: 'VAN_TUONG', name: 'VẠN TƯỢNG', taxCode: '', contractNo: '', status: 'ACTIVE', createdAt: '2023-01-01', updatedAt: '2023-01-01' },
    { id: 'CUST-004', code: 'AST', name: 'AST', taxCode: '', contractNo: '', status: 'ACTIVE', createdAt: '2023-01-01', updatedAt: '2023-01-01' },
    { id: 'CUST-005', code: 'PHUNG_GIA_PHAT', name: 'PHÙNG GIA PHÁT', taxCode: '', contractNo: '', status: 'ACTIVE', createdAt: '2023-01-01', updatedAt: '2023-01-01' },
    { id: 'CUST-006', code: 'GEMADEPT_BOT', name: 'GEMADEPT-BỘT', taxCode: '', contractNo: '', status: 'ACTIVE', createdAt: '2023-01-01', updatedAt: '2023-01-01' },
    { id: 'CUST-007', code: 'HYOSUNG', name: 'HYOSUNG', taxCode: '', contractNo: '', status: 'ACTIVE', createdAt: '2023-01-01', updatedAt: '2023-01-01' },
    { id: 'CUST-008', code: 'XIDADONG', name: 'XIDADONG', taxCode: '', contractNo: '', status: 'ACTIVE', createdAt: '2023-01-01', updatedAt: '2023-01-01' },
    { id: 'CUST-009', code: 'KHO_DNL', name: 'Kho hàng DNL', taxCode: '', contractNo: '', status: 'ACTIVE', createdAt: '2023-01-01', updatedAt: '2023-01-01' },
    { id: 'CUST-010', code: 'DEPOT', name: 'Depot', taxCode: '', contractNo: '', status: 'ACTIVE', createdAt: '2023-01-01', updatedAt: '2023-01-01' },
    { id: 'CUST-011', code: 'TRUNG_CHUYEN', name: 'TRUNG CHUYỂN', taxCode: '', contractNo: '', status: 'ACTIVE', createdAt: '2023-01-01', updatedAt: '2023-01-01' },
    { id: 'CUST-012', code: 'MULTI', name: 'Nhiều khách hàng', taxCode: '', contractNo: '', status: 'ACTIVE', createdAt: '2023-01-01', updatedAt: '2023-01-01' }
];

const DEFAULT_ROUTES = [
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
        "routeName": "Tiên Sa - Danalog (Z6 sang cont)",
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
        "routeName": "Tiên Sa <-> Danang 1: cont có hàng",
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
        "id": "RT-070",
        "routeName": "Danalog 1 - Tiên Sa: cont có hàng",
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
            "driverSalary": 90000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 12,
            "gasStations": []
        },
        "effectiveDate": "2023-04-01",
        "status": "ACTIVE"
    },
    {
        "id": "RT-071",
        "routeName": "Hàng hóa kho CFS cont 20\'",
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
        "id": "RT-072",
        "routeName": "Hàng hóa kho CFS, cont 40\'",
        "customer": "Kho hàng DNL",
        "cargoType": "KHO_CFS_40",
        "isNightStay": false,
        "revenue": {
            "price40F": 200000,
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
            "quota": 11,
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
        "routeName": "NM Tinh bột sắn, Sepon Lào - Cảng Tiên Sa Đà Nẵng (bốc container rỗng sang nhà máy đóng hàng)",
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
        "id": "RT-080",
        "routeName": "Cảng Chu Lai - Hyosung Tam Thăng, Tam Kỳ, Quảng Nam (2 chuyến)",
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
            "driverSalary": 160000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 36,
            "gasStations": []
        },
        "effectiveDate": "2023-04-01",
        "status": "ACTIVE"
    },
    {
        "id": "RT-081",
        "routeName": "Cảng Chu Lai - Hyosung Tam Thăng, Tam Kỳ, Quảng Nam (3 chuyến)",
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
            "driverSalary": 160000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 33,
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
        "id": "RT-083",
        "routeName": "Cảng Tiên Sa, Đà Nẵng- Hyosung Tam Thăng, Tam Kỳ, Quảng Nam (2 chuyến)",
        "customer": "HYOSUNG",
        "cargoType": "VC_CONT",
        "isNightStay": false,
        "revenue": {
            "price40F": 500000,
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
            "quota": 32,
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
        "id": "RT-086",
        "routeName": "Cảng Tiên Sa - Phú Bài, Huế",
        "customer": "Nhiều khách hàng",
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
            "driverSalary": 250000,
            "surcharge": 0
        },
        "fuel": {
            "truckType": "TRACTOR",
            "quota": 40,
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
        "routeName": "Cảng Tiên Sa - MN Hoà Thọ, Hà Lam, QN",
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
        "routeName": "Cảng Tiên Sa, Đà Nẵng đến Quy Nhơn",
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
        "id": "RT-101",
        "routeName": "Tuyến đường khác",
        "customer": "Nhiều khách hàng",
        "cargoType": "VC_CONT",
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
            "quota": 29,
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
];

// Function to read DB
function readDb() {
    try {
        if (!fs.existsSync(DB_FILE)) {
            return {
                tickets: [],
                users: DEFAULT_USERS,
                routeConfigs: DEFAULT_ROUTES,
                publishedSalaries: [],
                notifications: [],
                dispatch_logs: [],
                driver_responses: [],
                dispatch_config: DEFAULT_DISPATCH_CONFIG,
                sla_config: DEFAULT_SLA_CONFIG
            };
        }
        const data = fs.readFileSync(DB_FILE, 'utf8');
        const db = JSON.parse(data);
        let changed = false;

        if (db.users === undefined) { db.users = DEFAULT_USERS; changed = true; }
        
        // HASH ALL PASSWORDS
        db.users.forEach(u => {
            if (u.password && !u.password.startsWith('$2a$') && !u.password.startsWith('$2b$')) {
                u.password = bcrypt.hashSync(u.password, 10);
                changed = true;
            }
        });
        if (db.routeConfigs === undefined) { db.routeConfigs = DEFAULT_ROUTES; changed = true; }
        if (db.tickets === undefined) { db.tickets = []; changed = true; }
        if (db.publishedSalaries === undefined) { db.publishedSalaries = []; changed = true; }
        if (db.notifications === undefined) { db.notifications = []; changed = true; }
        if (db.customers === undefined) { db.customers = DEFAULT_CUSTOMERS; changed = true; }
        if (db.dispatch_logs === undefined) { db.dispatch_logs = []; changed = true; }
        if (db.driver_responses === undefined) { db.driver_responses = []; changed = true; }
        if (db.ticket_corrections === undefined) { db.ticket_corrections = []; changed = true; }
        if (db.dispatch_config === undefined) { db.dispatch_config = DEFAULT_DISPATCH_CONFIG; changed = true; }
        if (db.sla_config === undefined) { db.sla_config = DEFAULT_SLA_CONFIG; changed = true; }
        if (db.profile_requests === undefined) { db.profile_requests = []; changed = true; }
        if (db.fuel_tickets === undefined) { db.fuel_tickets = []; changed = true; }

        if (changed) {
            console.log("Updating DB structure with missing fields...");
            fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
        }

        if (!db.routeHistory) {
            db.routeHistory = [];
            // Don't necessarily need to write immediately, but good for consistency
        }

        return db;
    } catch (e) {
        console.error("Error reading DB_FILE, resetting...", e);
        return {
            tickets: [],
            users: DEFAULT_USERS,
            routeConfigs: DEFAULT_ROUTES,
            publishedSalaries: [],
            notifications: [],
            dispatch_logs: [],
            driver_responses: [],
            ticket_corrections: [],
            dispatch_config: DEFAULT_DISPATCH_CONFIG,
            sla_config: DEFAULT_SLA_CONFIG,
            routeHistory: [],
            customers: DEFAULT_CUSTOMERS,
            profile_requests: [],
            fuel_tickets: []
        };
    }
}

// Helper to write DB
function writeDb(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Cleanup: Auto-delete inactive customers that have been inactive for over 1 year
function runInactiveCustomerCleanup() {
    console.log("Running inactive customer cleanup...");
    const db = readDb();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const originalCount = (db.customers || []).length;

    db.customers = (db.customers || []).filter(customer => {
        if (customer.status !== 'INACTIVE') return true; // Keep active customers

        // Check if updatedAt (when status was changed to INACTIVE) is more than 1 year ago
        const updatedAt = new Date(customer.updatedAt);
        if (updatedAt < oneYearAgo) {
            console.log(`Auto-deleting inactive customer (>1 year): ${customer.name}`);

            // Also delete linked routes
            const linkedRoutes = (db.routeConfigs || []).filter(r => r.customer === customer.name || r.customer === customer.code);
            if (linkedRoutes.length > 0) {
                db.routeConfigs = (db.routeConfigs || []).filter(r => r.customer !== customer.name && r.customer !== customer.code);
                console.log(`  - Deleted ${linkedRoutes.length} linked routes`);
            }

            return false; // Remove this customer
        }
        return true; // Keep - not yet 1 year
    });

    const deletedCount = originalCount - db.customers.length;
    if (deletedCount > 0) {
        writeDb(db);
        console.log(`Inactive customer cleanup: Deleted ${deletedCount} customers.`);
    } else {
        console.log("Inactive customer cleanup: No customers to delete.");
    }
}

// Run cleanup on server startup
runInactiveCustomerCleanup();

// Apply pending changes that have reached their effective date
function runPendingChangesApply() {
    console.log("Running pending changes apply...");
    const db = readDb();
    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD (Local Time)
    let appliedCount = 0;

    (db.routeConfigs || []).forEach(config => {
        if (config.pendingChanges) {
            console.log(`Checking pending for ${config.id}: effective=${config.pendingChanges.effectiveDate}, today=${today}`);
            if (config.pendingChanges.effectiveDate <= today) {
                console.log(`Applying pending changes for route: ${config.routeName} (effective ${config.pendingChanges.effectiveDate})`);

                // Log history
                if (!db.routeHistory) db.routeHistory = [];
                db.routeHistory.push({
                    id: Date.now().toString() + Math.random(),
                    routeId: config.id,
                    action: 'APPLIED_PENDING',
                    details: `Áp dụng thay đổi có hiệu lực từ ${config.pendingChanges.effectiveDate}`,
                    timestamp: new Date().toISOString(),
                    user: 'system'
                });

                // Merge pending into current config
                const pending = config.pendingChanges;

                // Fields to update directly
                if (pending.code) config.code = pending.code;
                if (pending.routeName) config.routeName = pending.routeName;
                if (pending.customer) config.customer = pending.customer;
                if (pending.cargoType) config.cargoType = pending.cargoType;
                if (pending.status) config.status = pending.status;

                // Specific boolean/string fields often missed
                if (pending.isNightStay !== undefined) config.isNightStay = pending.isNightStay;
                if (pending.nightStayLocation) config.nightStayLocation = pending.nightStayLocation;

                // Nested objects - merge carefully to preserve existing sub-keys if needed, 
                // but usually pending object has the full new state for that section.
                if (pending.revenue) {
                    config.revenue = { ...config.revenue, ...pending.revenue };
                }
                if (pending.salary) {
                    config.salary = { ...config.salary, ...pending.salary };
                }
                if (pending.fuel) {
                    config.fuel = { ...config.fuel, ...pending.fuel };
                }

                // Clear pending
                delete config.pendingChanges;
                appliedCount++;
            }
        }
    });

    if (appliedCount > 0) {
        writeDb(db);
        console.log(`Pending changes apply: Applied ${appliedCount} changes.`);
    } else {
        console.log("Pending changes apply: No changes to apply.");
    }
}

// Run pending apply on server startup
runPendingChangesApply();

// --- NOTIFICATIONS HELPERS ---
function notify(db, role, message, type = 'INFO', relatedId = '') {
    if (!db.notifications) db.notifications = [];
    db.notifications.unshift({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        type, message, targetRole: role, read: false, relatedId,
        createdAt: new Date().toISOString()
    });
}

// === NOTIFICATIONS ENDPOINTS ===
app.get('/api/notifications', (req, res) => {
    const db = readDb();
    res.json(db.notifications || []);
});
app.put('/api/notifications/:id', (req, res) => {
    const db = readDb();
    const index = (db.notifications || []).findIndex(n => n.id === req.params.id);
    if (index !== -1) {
        db.notifications[index].read = true;
        writeDb(db);
        res.json(db.notifications[index]);
    } else {
        res.status(404).json({error: 'Not found'});
    }
});

app.delete('/api/notifications/:id', (req, res) => {
    const db = readDb();
    const id = req.params.id;
    const initialLength = (db.notifications || []).length;
    db.notifications = (db.notifications || []).filter(n => n.id !== id);
    if (db.notifications.length < initialLength) {
        writeDb(db);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Not found' });
    }
});

app.delete('/api/notifications', (req, res) => {
    const { role } = req.query;
    const db = readDb();
    if (role) {
        // Only delete notifications targeted to this role, or maybe we want to delete ALL the user can see.
        // For simplicity, if they click "Delete All", just delete notifications that belong to them.
        // Wait, the client is filtering `notifications.filter(n => isNotificationForUser(n, user?.role))`.
        // To be safe, we can just delete from DB where targetRole matches or just pass the ones to keep.
        // Let's implement deleting based on role if provided.
        db.notifications = (db.notifications || []).filter(n => n.targetRole !== role && n.targetRole !== 'ALL');
    } else {
        db.notifications = [];
    }
    writeDb(db);
    res.json({ success: true });
});

// === ORDERS ENDPOINTS (1 Order -> N Tickets) ===
app.get('/api/orders', (req, res) => {
    const db = readDb();
    res.json(db.orders || []);
});


app.post('/api/orders', (req, res) => {
    try {
        const db = readDb();
        const payload = req.body;
        if (!db.orders) db.orders = [];
        if (!db.tickets) db.tickets = [];

        db.orders.unshift(payload);

        // Only generate tickets for non-DRAFT orders
        const newTickets = [];
        if (payload.status !== 'DRAFT') {
        // Generate N Tickets
        const containers = payload.containers || [{ size: payload.containerSize, fe: payload.fe, count: payload.containerCount || 1 }];
        const routeConfig = (db.routeConfigs || []).find(r => r.id === payload.routeId);
        
        let totalCount = 0;
        let cTypePreview = [];

        containers.forEach(containerGroup => {
            const count = parseInt(containerGroup.count) || 1;
            totalCount += count;
            cTypePreview.push(`${count}x Cont ${containerGroup.size}' ${containerGroup.fe}`);

            let revenue = 0; let driverSalary = 0;
            if (routeConfig) {
                const isF = containerGroup.fe === 'F';
                const is40 = containerGroup.size === '40' || containerGroup.size === '40R0' || containerGroup.size === '45';
                if (is40) {
                    revenue = isF ? routeConfig.revenue?.price40F || 0 : routeConfig.revenue?.price40E || 0;
                } else {
                    revenue = isF ? routeConfig.revenue?.price20F || 0 : routeConfig.revenue?.price20E || 0;
                }
                driverSalary = routeConfig.salary?.driverSalary || 0;
            }

            for (let i = 0; i < count; i++) {
                const ticketCount = db.tickets.length + 1;
                const ticket = {
                    id: 'TK-' + String(ticketCount).padStart(5, '0') + '-' + Math.random().toString(36).substr(2, 4).toUpperCase(),
                    orderId: payload.id,
                    customerCode: payload.customerName || payload.customerId,
                    route: payload.routeName,
                    routeId: payload.routeId,
                    dateStart: payload.pickupDate,
                    dateEnd: payload.deliveryDate || payload.pickupDate, // defaults
                    size: containerGroup.size,
                    fe: containerGroup.fe,
                    stt: i + 1,
                    status: 'DRAFT', 
                    dispatchStatus: 'WAITING_DISPATCH',
                    revenue: revenue,
                    driverSalary: driverSalary,
                    createdBy: payload.createdBy,
                    notes: payload.notes
                };
                newTickets.unshift(ticket);
                db.tickets.unshift(ticket);
            }
        });

        // Notify Dispatcher
        notify(db, 'DISPATCHER', `Đơn hàng mới: ${payload.orderCode} (${cTypePreview.join(', ')}) từ ${payload.customerName}`, 'INFO', payload.id);
        } // end if not DRAFT

        writeDb(db);
        res.json({ order: payload, generatedTickets: newTickets });
    } catch (err) {
        console.error("Error creating order:", err);
        res.status(500).json({ error: 'Failed to create order' });
    }
});

// PUT /api/orders/:id (Update order + notify if in assign process)
app.put('/api/orders/:id', (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const db = readDb();
        if (!db.orders) db.orders = [];

        const index = db.orders.findIndex(o => o.id === id);
        if (index === -1) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const oldOrder = db.orders[index];
        db.orders[index] = { ...oldOrder, ...updates };

        // Check if linked tickets are already in dispatch process
        const linkedTickets = (db.tickets || []).filter(t => t.orderId === id);
        const isInAssignProcess = linkedTickets.some(t =>
            t.dispatchStatus === 'ASSIGNED' || t.dispatchStatus === 'IN_PROGRESS' ||
            t.dispatchStatus === 'COMPLETED' || t.status === 'PENDING' || t.status === 'APPROVED'
        );

        if (isInAssignProcess && updates.editChanges && updates.editChanges.length > 0) {
            const changeText = updates.editChanges.join(', ');
            notify(db, 'DISPATCHER', `Đơn hàng ${oldOrder.orderCode || id} đã sửa: ${changeText}`, 'WARNING', id);

            // Mark tickets with edit highlight
            linkedTickets.forEach(t => {
                const tIdx = db.tickets.findIndex(tk => tk.id === t.id);
                if (tIdx !== -1) {
                    db.tickets[tIdx].editHighlight = updates.editChanges;
                    db.tickets[tIdx].editedAt = new Date().toISOString();
                }
            });
        }

        writeDb(db);
        res.json(db.orders[index]);
    } catch (err) {
        console.error("Error updating order:", err);
        res.status(500).json({ error: 'Failed to update order' });
    }
});

// GET /api/tickets
app.get('/api/tickets', (req, res) => {
    try {
        const { username, role } = req.query;
        const db = readDb();
        let tickets = db.tickets || [];

        // Filter out drafts for others
        // Logic: 
        // 1. If status is NOT 'DRAFT', everyone sees it.
        // 2. If status IS 'DRAFT', only the creator (createdBy === username) sees it.

        // Note: If no username is provided (old frontend), we might unknowingly show drafts? 
        // Safety: If no username, hide all drafts to be safe, or show all? 
        // Requirement: "chỉ có tài xế biết và sau khi gửi thì CS/Admin mới nhận được"
        // So default to hiding drafts if we don't know who created them.

        tickets = tickets.filter(t => {
            if (t.status !== 'DRAFT') return true; // Show non-drafts
            // It is a draft
            if (!username) return false; // No user info, hide draft
            return t.createdBy === username; // Only show if created by this user
        });

        res.json(tickets);
    } catch (err) {
        console.error("Error reading DB:", err);
        res.status(500).json({ error: 'Failed to read database' });
    }
});

// POST /api/tickets (Create new or save list)
app.post('/api/tickets', (req, res) => {
    try {
        const db = readDb();
        const payload = req.body;

        if (Array.isArray(payload)) {
            db.tickets = payload;
        } else {
            db.tickets = [payload, ...(db.tickets || [])];
        }

        writeDb(db);
        res.json(payload);
    } catch (err) {
        console.error("Error writing DB:", err);
        res.status(500).json({ error: 'Failed to save ticket' });
    }
});

// PUT /api/tickets/:id (Update)
app.put('/api/tickets/:id', (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const db = readDb();

        const index = db.tickets.findIndex(t => t.id === id);
        if (index !== -1) {
            db.tickets[index] = { ...db.tickets[index], ...updates };
            writeDb(db);
            res.json(db.tickets[index]);
        } else {
            res.status(404).json({ error: 'Ticket not found' });
        }
    } catch (err) {
        console.error("Error updating DB:", err);
        res.status(500).json({ error: 'Failed to update ticket' });
    }
});

// === TICKET CORRECTIONS ===
app.get('/api/ticket-corrections', (req, res) => {
    const db = readDb();
    res.json(db.ticket_corrections || []);
});

app.post('/api/tickets/:id/correction-request', (req, res) => {
    const { id } = req.params;
    const db = readDb();
    const payload = req.body;
    
    if (!db.ticket_corrections) db.ticket_corrections = [];
    
    const request = {
        id: 'CR-' + Date.now().toString(36),
        ticketId: id,
        ticketRoute: payload.ticketRoute,
        customerCode: payload.customerCode,
        requestedBy: payload.requestedBy,
        requestedAt: new Date().toISOString(),
        reason: payload.reason,
        attachmentUrl: payload.attachmentUrl,
        status: 'PENDING'
    };
    
    db.ticket_corrections.unshift(request);
    
    // Notify CS_LEAD
    notify(db, 'CS_LEAD', `Yêu cầu chỉnh sửa phiếu ${id} từ ${payload.requestedBy}`, 'WARNING', request.id);
    
    writeDb(db);
    res.json(request);
});

app.put('/api/ticket-corrections/:id/review', (req, res) => {
    const { id } = req.params;
    const { status, reviewedBy, reviewNote } = req.body;
    const db = readDb();
    
    const index = (db.ticket_corrections || []).findIndex(cr => cr.id === id);
    if (index !== -1) {
        db.ticket_corrections[index].status = status;
        // In reality, if APPROVED, we should actually update the ticket fields if we were tracking them. 
        // But here CS_LEAD edits the ticket directly and then approves the request.
        db.ticket_corrections[index].reviewedBy = reviewedBy;
        db.ticket_corrections[index].reviewedAt = new Date().toISOString();
        db.ticket_corrections[index].reviewNote = reviewNote;
        
        // Notify the CS user who requested it
        const reqBy = db.ticket_corrections[index].requestedBy;
        notify(db, 'CS', `Yêu cầu sửa phiếu ${db.ticket_corrections[index].ticketId} đã bị ${status === 'APPROVED' ? 'DUYỆT' : 'TỪ CHỐI'}`, status === 'APPROVED' ? 'SUCCESS' : 'ERROR', db.ticket_corrections[index].ticketId);

        writeDb(db);
        res.json(db.ticket_corrections[index]);
    } else {
        res.status(404).json({ error: 'Correction Request not found' });
    }
});

// --- ROUTE CONFIGS ---
app.get('/api/route-configs', (req, res) => {
    const db = readDb();
    res.json(db.routeConfigs || []);
});

app.post('/api/route-configs', (req, res) => {
    try {
        const db = readDb();
        const oldConfigs = db.routeConfigs || [];
        const newConfigs = Array.isArray(req.body) ? req.body : [req.body];

        // Helper for diff (Reused logic)
        const getChanges = (oldC, newC) => {
            const changes = [];
            const fmt = (v) => (v || 0).toLocaleString('vi-VN');

            if (oldC.routeName !== newC.routeName) changes.push(`Tên tuyến: "${oldC.routeName}" -> "${newC.routeName}"`);
            if (oldC.customer !== newC.customer) changes.push(`Khách hàng: ${oldC.customer} -> ${newC.customer}`);
            if (oldC.cargoType !== newC.cargoType) changes.push(`Loại hàng: ${oldC.cargoType} -> ${newC.cargoType}`);

            if (oldC.revenue?.price40F != newC.revenue?.price40F) changes.push(`40F: ${fmt(oldC.revenue?.price40F)} -> ${fmt(newC.revenue?.price40F)}`);
            if (oldC.revenue?.price40E != newC.revenue?.price40E) changes.push(`40E: ${fmt(oldC.revenue?.price40E)} -> ${fmt(newC.revenue?.price40E)}`);
            if (oldC.revenue?.price20F != newC.revenue?.price20F) changes.push(`20F: ${fmt(oldC.revenue?.price20F)} -> ${fmt(newC.revenue?.price20F)}`);
            if (oldC.revenue?.price20E != newC.revenue?.price20E) changes.push(`20E: ${fmt(oldC.revenue?.price20E)} -> ${fmt(newC.revenue?.price20E)}`);
            if (oldC.revenue?.liftDescFee != newC.revenue?.liftDescFee) changes.push(`Nâng hạ: ${fmt(oldC.revenue?.liftDescFee)} -> ${fmt(newC.revenue?.liftDescFee)}`);

            if (oldC.salary?.driverSalary != newC.salary?.driverSalary) changes.push(`Lương LX: ${fmt(oldC.salary?.driverSalary)} -> ${fmt(newC.salary?.driverSalary)}`);
            if (oldC.salary?.surcharge != newC.salary?.surcharge) changes.push(`Phụ cấp: ${fmt(oldC.salary?.surcharge)} -> ${fmt(newC.salary?.surcharge)}`);

            if (oldC.fuel?.quota != newC.fuel?.quota) changes.push(`Dầu: ${oldC.fuel?.quota} -> ${newC.fuel?.quota}`);

            if (oldC.status !== newC.status) changes.push(`Trạng thái: ${oldC.status} -> ${newC.status}`);

            return changes;
        };

        if (!db.routeHistory) db.routeHistory = [];

        // Detect Changes
        newConfigs.forEach(newC => {
            const oldC = oldConfigs.find(o => o.id === newC.id);
            if (oldC) {
                // Update
                const changes = getChanges(oldC, newC);
                if (changes.length > 0) {
                    db.routeHistory.push({
                        id: Date.now().toString() + Math.random(),
                        routeId: newC.id,
                        action: 'UPDATE',
                        details: changes.join(', '),
                        timestamp: new Date().toISOString(),
                        user: 'admin' // Default since POST doesn't easily carry user metadata in this app structure yet
                    });
                }
            } else {
                // New Route Created
                db.routeHistory.push({
                    id: Date.now().toString() + Math.random(),
                    routeId: newC.id,
                    action: 'CREATE',
                    details: `Tạo mới tuyến: ${newC.routeName}`,
                    timestamp: new Date().toISOString(),
                    user: 'admin'
                });
            }
        });

        db.routeConfigs = newConfigs;
        writeDb(db);
        console.log(`Saved ${db.routeConfigs.length} route configurations.`);
        res.json(db.routeConfigs);
    } catch (err) {
        console.error("Error saving route configs:", err);
        res.status(500).json({ error: 'Failed to save route configurations' });
    }
});

app.put('/api/route-configs/:id', (req, res) => {
    const { id } = req.params;
    const db = readDb();
    const index = (db.routeConfigs || []).findIndex(r => r.id === id);
    if (index !== -1) {
        const oldConfig = db.routeConfigs[index];
        const newConfig = { ...oldConfig, ...req.body };

        console.log(`[DEBUG_HISTORY] Updating Route ID: ${id}`);
        console.log(`[DEBUG_HISTORY] OLD Config Revenue:`, JSON.stringify(oldConfig.revenue));
        console.log(`[DEBUG_HISTORY] NEW Config Revenue:`, JSON.stringify(newConfig.revenue));
        console.log(`[DEBUG_HISTORY] Checking changes...`);

        // Comprehensive Diff Logic
        const changes = [];

        // Helper to compare and format currency/number
        const fmt = (v) => (v || 0).toLocaleString('vi-VN');

        // 1. Top level string fields
        if (oldConfig.routeName !== newConfig.routeName) changes.push(`Tên tuyến: "${oldConfig.routeName}" -> "${newConfig.routeName}"`);
        if (oldConfig.customer !== newConfig.customer) changes.push(`Khách hàng: ${oldConfig.customer} -> ${newConfig.customer}`);
        if (oldConfig.cargoType !== newConfig.cargoType) changes.push(`Loại hàng: ${oldConfig.cargoType} -> ${newConfig.cargoType}`);

        // 2. Revenue (Use loose equality != to handle string vs number issues)
        if (oldConfig.revenue?.price40F != newConfig.revenue?.price40F) changes.push(`40F: ${fmt(oldConfig.revenue?.price40F)} -> ${fmt(newConfig.revenue?.price40F)}`);
        if (oldConfig.revenue?.price40E != newConfig.revenue?.price40E) changes.push(`40E: ${fmt(oldConfig.revenue?.price40E)} -> ${fmt(newConfig.revenue?.price40E)}`);
        if (oldConfig.revenue?.price20F != newConfig.revenue?.price20F) changes.push(`20F: ${fmt(oldConfig.revenue?.price20F)} -> ${fmt(newConfig.revenue?.price20F)}`);
        if (oldConfig.revenue?.price20E != newConfig.revenue?.price20E) changes.push(`20E: ${fmt(oldConfig.revenue?.price20E)} -> ${fmt(newConfig.revenue?.price20E)}`);
        if (oldConfig.revenue?.liftDescFee != newConfig.revenue?.liftDescFee) changes.push(`Nâng hạ: ${fmt(oldConfig.revenue?.liftDescFee)} -> ${fmt(newConfig.revenue?.liftDescFee)}`);

        // 3. Salary
        if (oldConfig.salary?.driverSalary != newConfig.salary?.driverSalary) changes.push(`Lương LX: ${fmt(oldConfig.salary?.driverSalary)} -> ${fmt(newConfig.salary?.driverSalary)}`);
        if (oldConfig.salary?.surcharge != newConfig.salary?.surcharge) changes.push(`Phụ cấp: ${fmt(oldConfig.salary?.surcharge)} -> ${fmt(newConfig.salary?.surcharge)}`);

        // 4. Fuel
        if (oldConfig.fuel?.quota != newConfig.fuel?.quota) changes.push(`Dầu: ${oldConfig.fuel?.quota} -> ${newConfig.fuel?.quota}`);
        if (oldConfig.fuel?.truckType != newConfig.fuel?.truckType) changes.push(`Loại xe: ${oldConfig.fuel?.truckType} -> ${newConfig.fuel?.truckType}`);

        // 5. Active Status
        if (oldConfig.status !== newConfig.status) changes.push(`Trạng thái: ${oldConfig.status} -> ${newConfig.status}`);

        // If no specific changes detected but object changed (fallback)
        if (changes.length === 0 && JSON.stringify(oldConfig) !== JSON.stringify(newConfig)) {
            changes.push("Cập nhật thông tin khác");
        }

        if (changes.length > 0) {
            const historyEntry = {
                id: Date.now().toString(),
                routeId: id,
                action: 'UPDATE',
                details: changes.join(', '),
                timestamp: new Date().toISOString(),
                user: req.body.user || 'admin'
            };
            if (!db.routeHistory) db.routeHistory = [];
            db.routeHistory.push(historyEntry);
        }

        db.routeConfigs[index] = newConfig;
        writeDb(db);
        res.json(db.routeConfigs[index]);
    } else {
        res.status(404).json({ error: 'Config not found' });
    }
});

app.delete('/api/route-configs/:id', (req, res) => {
    const { id } = req.params;
    const db = readDb();

    // Log history for deletion
    const configToDelete = (db.routeConfigs || []).find(r => r.id === id);
    if (configToDelete) {
        const historyEntry = {
            id: Date.now().toString(),
            routeId: id,
            action: 'DELETE',
            details: `Deleted route: ${configToDelete.routeName}`,
            timestamp: new Date().toISOString(),
            user: 'admin' // Should pass user ideally
        };
        if (!db.routeHistory) db.routeHistory = [];
        db.routeHistory.push(historyEntry);
    }

    const initialLength = (db.routeConfigs || []).length;
    const filteredConfigs = (db.routeConfigs || []).filter(r => r.id !== id);

    if (filteredConfigs.length === initialLength) {
        return res.status(404).json({ error: 'Config not found' });
    }

    db.routeConfigs = filteredConfigs;
    writeDb(db);
    res.json({ message: 'Route config deleted successfully' });
});

app.get('/api/route-history/:routeId', (req, res) => {
    const { routeId } = req.params;
    const db = readDb();
    const history = (db.routeHistory || [])
        .filter(h => h.routeId === routeId)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json(history);
});



// --- USER MANAGEMENT ---




// --- PENDING CHANGES MANAGEMENT ---

// Apply all pending changes that have reached their effective date
app.post('/api/route-configs/apply-pending', (req, res) => {
    const db = readDb();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    let appliedCount = 0;

    (db.routeConfigs || []).forEach(config => {
        if (config.pendingChanges && config.pendingChanges.effectiveDate <= today) {
            // Apply pending changes to current config
            const pending = config.pendingChanges;

            // Log history
            if (!db.routeHistory) db.routeHistory = [];
            db.routeHistory.push({
                id: Date.now().toString() + Math.random(),
                routeId: config.id,
                action: 'APPLIED_PENDING',
                details: `Áp dụng thay đổi có hiệu lực từ ${pending.effectiveDate}`,
                timestamp: new Date().toISOString(),
                user: 'system'
            });

            // Merge pending into current
            if (pending.routeName) config.routeName = pending.routeName;
            if (pending.customer) config.customer = pending.customer;
            if (pending.cargoType) config.cargoType = pending.cargoType;
            if (pending.revenue) config.revenue = { ...config.revenue, ...pending.revenue };
            if (pending.salary) config.salary = { ...config.salary, ...pending.salary };
            if (pending.fuel) config.fuel = { ...config.fuel, ...pending.fuel };
            if (pending.status) config.status = pending.status;

            // Clear pending
            delete config.pendingChanges;
            appliedCount++;
        }
    });

    if (appliedCount > 0) {
        writeDb(db);
        console.log(`[PENDING] Applied ${appliedCount} pending route config changes.`);
    }

    res.json({ message: `Applied ${appliedCount} pending changes.`, appliedCount });
});

// Cancel pending changes for a specific route
app.delete('/api/route-configs/:id/pending', (req, res) => {
    const { id } = req.params;
    const db = readDb();
    const config = (db.routeConfigs || []).find(c => c.id === id);

    if (!config) {
        return res.status(404).json({ error: 'Route config not found' });
    }

    if (!config.pendingChanges) {
        return res.status(400).json({ error: 'No pending changes to cancel' });
    }

    // Log history
    if (!db.routeHistory) db.routeHistory = [];
    db.routeHistory.push({
        id: Date.now().toString() + Math.random(),
        routeId: id,
        action: 'CANCEL_PENDING',
        details: `Hủy thay đổi dự kiến hiệu lực ngày ${config.pendingChanges.effectiveDate}`,
        timestamp: new Date().toISOString(),
        user: req.body?.user || 'admin'
    });

    delete config.pendingChanges;
    writeDb(db);

    res.json({ message: 'Pending changes cancelled successfully', config });
});

// Save pending changes for a route (new endpoint for explicit pending save)
// Save pending changes (Array support)
app.put('/api/route-configs/:id/pending', (req, res) => {
    const { id } = req.params;
    const db = readDb();
    const index = (db.routeConfigs || []).findIndex(c => c.id === id);

    if (index === -1) {
        return res.status(404).json({ error: 'Route config not found' });
    }

    const payload = req.body; // Expecting array or object
    console.log('[DEBUG] PUT Pending Payload:', JSON.stringify(payload, null, 2));
    console.log('[DEBUG] Is Array?', Array.isArray(payload));
    const today = new Date().toISOString().split('T')[0];

    let newPendingList = [];

    if (Array.isArray(payload)) {
        // Validate all items
        for (const item of payload) {
            if (!item.effectiveDate) {
                return res.status(400).json({ error: 'Ngày hiệu lực là bắt buộc cho mọi thay đổi' });
            }
            if (item.effectiveDate <= today) {
                return res.status(400).json({ error: `Ngày hiệu lực ${item.effectiveDate} phải từ ngày mai trở đi` });
            }
        }
        newPendingList = payload;
    } else {
        // Legacy/Single object support
        const { effectiveDate, ...changes } = payload;
        if (!effectiveDate) {
            return res.status(400).json({ error: 'Ngày hiệu lực là bắt buộc' });
        }
        if (effectiveDate <= today) {
            return res.status(400).json({ error: 'Ngày hiệu lực phải từ ngày mai trở đi' });
        }
        newPendingList = [{ effectiveDate, ...changes }];
    }

    const config = db.routeConfigs[index];

    // Log history
    if (!db.routeHistory) db.routeHistory = [];
    db.routeHistory.push({
        id: Date.now().toString() + Math.random(),
        routeId: id,
        action: 'UPDATE_PENDING',
        details: `Cập nhật danh sách thay đổi chờ (${newPendingList.length} lịch)`,
        timestamp: new Date().toISOString(),
        user: req.body[0]?.user || req.body.user || 'admin'
    });

    // Save as array
    config.pendingChanges = newPendingList;

    writeDb(db);
    res.json({ message: 'Pending changes saved', config });
});

// --- CUSTOMERS MANAGEMENT ---
app.get('/api/customers', (req, res) => {
    const db = readDb();
    res.json(db.customers || []);
});

app.post('/api/customers', (req, res) => {
    const db = readDb();
    const customer = req.body;

    if (!db.customers) db.customers = [];

    // Validate required fields
    if (!customer.code || !customer.name) {
        return res.status(400).json({ error: 'Mã và Tên khách hàng là bắt buộc' });
    }

    // Check for duplicate code
    const existing = db.customers.find(c => c.code === customer.code);
    if (existing) {
        return res.status(400).json({ error: 'Mã khách hàng đã tồn tại' });
    }

    const newCustomer = {
        id: `CUST-${Date.now()}`,
        code: customer.code,
        name: customer.name,
        taxCode: customer.taxCode || '',
        contractNo: customer.contractNo || '',
        contactPerson: customer.contactPerson || '',
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || '',
        status: customer.status || 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    db.customers.push(newCustomer);
    writeDb(db);
    console.log(`Created customer: ${newCustomer.name}`);
    res.status(201).json(newCustomer);
});

app.put('/api/customers/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const db = readDb();

    const index = (db.customers || []).findIndex(c => c.id === id);
    if (index === -1) {
        return res.status(404).json({ error: 'Khách hàng không tồn tại' });
    }

    // Check for duplicate code if code is being changed
    if (updates.code && updates.code !== db.customers[index].code) {
        const existing = db.customers.find(c => c.code === updates.code && c.id !== id);
        if (existing) {
            return res.status(400).json({ error: 'Mã khách hàng đã tồn tại' });
        }
    }

    db.customers[index] = {
        ...db.customers[index],
        ...updates,
        updatedAt: new Date().toISOString()
    };

    writeDb(db);
    console.log(`Updated customer: ${db.customers[index].name}`);
    res.json(db.customers[index]);
});

app.delete('/api/customers/:id', (req, res) => {
    const { id } = req.params;
    const db = readDb();

    const customer = (db.customers || []).find(c => c.id === id);
    if (!customer) {
        return res.status(404).json({ error: 'Khách hàng không tồn tại' });
    }

    // Find and delete all linked route configs (keep tickets/reports data untouched)
    const linkedRoutes = (db.routeConfigs || []).filter(r => r.customer === customer.name || r.customer === customer.code);
    const linkedRouteCount = linkedRoutes.length;

    if (linkedRouteCount > 0) {
        // Remove linked routes from database
        db.routeConfigs = (db.routeConfigs || []).filter(r => r.customer !== customer.name && r.customer !== customer.code);
        console.log(`Deleted ${linkedRouteCount} linked routes for customer: ${customer.name}`);
    }

    // Delete the customer
    db.customers = db.customers.filter(c => c.id !== id);
    writeDb(db);
    console.log(`Deleted customer: ${customer.name}`);
    res.json({
        message: linkedRouteCount > 0
            ? `Xóa khách hàng thành công. Đã xóa ${linkedRouteCount} tuyến đường liên kết.`
            : 'Xóa khách hàng thành công',
        deletedRoutes: linkedRouteCount
    });
});

// --- PUBLISHED SALARIES ---
app.get('/api/published-salaries', (req, res) => {
    const db = readDb();
    res.json(db.publishedSalaries || []);
});

app.post('/api/published-salaries', (req, res) => {
    const db = readDb();
    const publication = req.body; // { driverUsername, month, year, publishedAt }
    if (!db.publishedSalaries) db.publishedSalaries = [];

    // Check if already published
    const exists = db.publishedSalaries.find(p =>
        p.driverUsername === publication.driverUsername &&
        p.month === publication.month &&
        p.year === publication.year
    );

    if (!exists) {
        db.publishedSalaries.push(publication);

        // Also add a notification automatically
        if (!db.notifications) db.notifications = [];
        db.notifications.push({
            id: Date.now(),
            to: publication.driverUsername,
            message: `Phiếu lương tháng ${publication.month}/${publication.year} đã được công bố.`,
            timestamp: new Date().toISOString(),
            read: false,
            type: 'SALARY_PUBLISHED'
        });

        writeDb(db);
    }
    res.json(publication);
});

// --- NOTIFICATIONS ---
app.get('/api/notifications', (req, res) => {
    const db = readDb();
    res.json(db.notifications || []);
});

app.put('/api/notifications/:id', (req, res) => {
    const { id } = req.params;
    const db = readDb();
    const index = (db.notifications || []).findIndex(n => n.id == id);
    if (index !== -1) {
        db.notifications[index].read = true;
        writeDb(db);
        res.json(db.notifications[index]);
    } else {
        res.status(404).json({ error: 'Notification not found' });
    }
});

// --- USERS ---
app.get('/api/users', (req, res) => {
    const db = readDb();
    // Return users without passwords for safety, but include other fields
    const safeUsers = (db.users || []).map(({ password, ...u }) => u);
    res.json(safeUsers);
});

app.post('/api/users', (req, res) => {
    const db = readDb();
    const newUser = req.body; // { username, password, role, name, licensePlate, status }

    // Validate required fields
    if (!newUser.username || !newUser.password || !newUser.role || !newUser.name) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if username exists
    const users = db.users || [];
    if (users.find(u => u.username === newUser.username)) {
        return res.status(400).json({ error: 'Username already exists' });
    }

    // Default status to ACTIVE if not provided
    newUser.status = newUser.status || 'ACTIVE';
    newUser.joinedAt = new Date().toISOString();

    // HASH PASSWORD
    newUser.password = bcrypt.hashSync(newUser.password, 10);

    db.users = [...users, newUser];
    writeDb(db);

    // Return without password
    const { password, ...safeUser } = newUser;
    res.json(safeUser);
});

app.put('/api/users/:username', (req, res) => {
    const { username } = req.params;
    const updates = req.body;
    const db = readDb();

    const index = (db.users || []).findIndex(u => u.username === username);
    if (index === -1) {
        return res.status(404).json({ error: 'User not found' });
    }

    // Update fields
    // Simplify update logic to ensure fields are captured
    const existingUser = db.users[index];

    console.log('--- START UPDATE USER ---');
    console.log('Target:', username);
    console.log('Incoming Payload:', JSON.stringify(updates, null, 2));

    const updatedUser = {
        ...existingUser,
        ...updates, // Merge everything from updates directly
        // Protect specific fields from being nullified if not present in updates (though frontend usually sends all)
        role: updates.role || existingUser.role,
        status: updates.status || existingUser.status
    };

    // Ensure password isn't wiped if empty, and hash it if it's new
    if (!updates.password || updates.password.trim() === '') {
        updatedUser.password = existingUser.password;
    } else if (updates.password !== existingUser.password) {
        updatedUser.password = bcrypt.hashSync(updates.password, 10);
    }

    // Explicitly handle vehicleCapacity to be sure
    if (updates.vehicleCapacity !== undefined) {
        updatedUser.vehicleCapacity = updates.vehicleCapacity;
    }

    // Handle deactivation timestamp
    if (updatedUser.status === 'INACTIVE' && existingUser.status !== 'INACTIVE') {
        updatedUser.deactivatedAt = new Date().toISOString();
    } else if (updatedUser.status === 'ACTIVE') {
        updatedUser.deactivatedAt = undefined;
    }

    console.log('Final User Object to Save:', JSON.stringify(updatedUser, null, 2));

    db.users[index] = updatedUser;
    writeDb(db);
    console.log('--- DB WRITTEN SUCCESS 100% ---');

    const { password, ...safeUser } = updatedUser;
    res.json(safeUser);
});

app.delete('/api/users/:username', (req, res) => {
    const { username } = req.params;
    const db = readDb();

    const initialLength = (db.users || []).length;
    const filteredUsers = (db.users || []).filter(u => u.username !== username);

    if (filteredUsers.length === initialLength) {
        return res.status(404).json({ error: 'User not found' });
    }

    db.users = filteredUsers;
    writeDb(db);
    res.json({ message: 'User deleted successfully' });
});

// Auto-cleanup inactive users (older than 1 year)
function cleanupInactiveUsers() {
    console.log("Running inactive user cleanup...");
    const db = readDb();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const initialLength = (db.users || []).length;
    db.users = (db.users || []).filter(u => {
        if (u.status === 'INACTIVE' && u.deactivatedAt) {
            const deactivatedDate = new Date(u.deactivatedAt);
            return deactivatedDate > oneYearAgo;
        }
        return true;
    });

    if (db.users.length !== initialLength) {
        console.log(`Removed ${initialLength - db.users.length} inactive users.`);
        writeDb(db);
    }
}

// Run cleanup on startup and every 24 hours
cleanupInactiveUsers();
setInterval(cleanupInactiveUsers, 24 * 60 * 60 * 1000);

// ============================================================
// === PROFILE MANAGEMENT ===
// ============================================================

// Helper for approver role mapping
function getApproverRole(role) {
    if (role === 'CS') return 'CS_LEAD';
    if (role === 'DISPATCHER' || role === 'DRIVER') return 'DV_LEAD';
    return 'ADMIN'; 
}

// PUT /api/profile/password - Change password directly
app.put('/api/profile/password', (req, res) => {
    const { username, oldPassword, newPassword } = req.body;
    const db = readDb();
    
    const index = (db.users || []).findIndex(u => u.username === username);
    if (index === -1) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    const user = db.users[index];
    if (!bcrypt.compareSync(oldPassword, user.password || '')) {
        return res.status(400).json({ error: 'Mật khẩu cũ không chính xác' });
    }
    
    db.users[index].password = bcrypt.hashSync(newPassword, 10);
    writeDb(db);
    res.json({ message: 'Đổi mật khẩu thành công' });
});

// POST /api/profile/update-request - Submit info update request
app.post('/api/profile/update-request', (req, res) => {
    const { username, fieldsToUpdate } = req.body;
    const db = readDb();
    
    const user = (db.users || []).find(u => u.username === username);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    if (!db.profile_update_requests) db.profile_update_requests = [];
    
    // Check if there's already a pending request
    const existing = db.profile_update_requests.find(r => r.username === username && r.status === 'PENDING');
    if (existing) {
        return res.status(400).json({ error: 'Bạn đang có một yêu cầu chờ duyệt, không thể gửi thêm.' });
    }
    
    const approverRole = getApproverRole(user.role);
    
    const newReq = {
        id: 'PRQ-' + Date.now(),
        username: user.username,
        fullName: user.name,
        role: user.role,
        approverRole: approverRole,
        requestedAt: new Date().toISOString(),
        status: 'PENDING',
        fieldsToUpdate
    };
    
    db.profile_update_requests.unshift(newReq);
    
    // Notify Approver
    notify(db, approverRole, `Nhân sự ${user.name} (${user.username}) yêu cầu cập nhật thông tin hồ sơ.`, 'INFO', newReq.id);
    
    writeDb(db);
    res.status(201).json(newReq);
});

// GET /api/profile/update-requests - Get requests by approver role
app.get('/api/profile/update-requests', (req, res) => {
    const { role, username } = req.query;
    const db = readDb();
    const allReqs = db.profile_update_requests || [];
    
    if (role === 'ADMIN') {
        res.json(allReqs);
    } else if (role) {
        // Approver like CS_LEAD, DV_LEAD
        res.json(allReqs.filter(r => r.approverRole === role));
    } else if (username) {
        // My requests
        res.json(allReqs.filter(r => r.username === username));
    } else {
        res.json(allReqs);
    }
});

// PUT /api/profile/update-requests/:id/:action
app.put('/api/profile/update-requests/:id/:action', (req, res) => {
    const { id, action } = req.params;
    const { reviewNote, reviewerUsername } = req.body;
    const db = readDb();
    
    if (!db.profile_update_requests) db.profile_update_requests = [];
    const reqIndex = db.profile_update_requests.findIndex(r => r.id === id);
    
    if (reqIndex === -1) return res.status(404).json({ error: 'Request not found' });
    
    const request = db.profile_update_requests[reqIndex];
    if (request.status !== 'PENDING') {
        return res.status(400).json({ error: 'Request is already processed' });
    }
    
    if (action === 'approve') {
        // Apply changes
        const userIndex = (db.users || []).findIndex(u => u.username === request.username);
        if (userIndex !== -1) {
            db.users[userIndex] = { ...db.users[userIndex], ...request.fieldsToUpdate };
        }
        
        request.status = 'APPROVED';
        notify(db, request.username, `Yêu cầu cập nhật hồ sơ của bạn đã được PHÊ DUYỆT.`, 'SUCCESS', request.id);
        
    } else if (action === 'reject') {
        request.status = 'REJECTED';
        notify(db, request.username, `Yêu cầu cập nhật hồ sơ của bạn bị TỪ CHỐI. L/do: ${reviewNote || 'Không có'}`, 'ERROR', request.id);
    } else {
        return res.status(400).json({ error: 'Invalid action' });
    }
    
    request.reviewedBy = reviewerUsername;
    request.reviewedAt = new Date().toISOString();
    request.reviewNote = reviewNote || '';
    
    writeDb(db);
    res.json(request);
});

// ============================================================
// === DISPATCH ENGINE (Spec v2.0) ===
// ============================================================

// --- AREA CODE MAPPING ---
const AREA_CODE_MAP = {
    'Tiên Sa': 'TIEN_SA', 'Cảng Tiên Sa': 'TIEN_SA', 'Tiên sa': 'TIEN_SA',
    'Lao Bảo': 'LAO_BAO', 'Cửa khẩu quốc tế Lao Bảo': 'LAO_BAO',
    'Danalog': 'DANALOG', 'DNL': 'DANALOG', 'Danalog 1': 'DANALOG', 'DNL1': 'DANALOG',
    'Tam Thăng': 'TAM_THANG', 'Hyosung': 'TAM_THANG', 'HSQN': 'TAM_THANG',
    'Quảng Ngãi': 'QUANG_NGAI', 'Viship': 'QUANG_NGAI',
    'Chu Lai': 'CHU_LAI', 'Cảng Chu Lai': 'CHU_LAI',
    'Hòa Cầm': 'HOA_CAM', 'Viconship Hòa Cầm': 'HOA_CAM',
    'Savannakhet': 'SAVANNAKHET', 'Vientiane': 'VIENTIANE',
    'Champasak': 'CHAMPASAK', 'Salavan': 'SALAVAN', 'Sepon': 'SEPON',
    'Thọ Quang': 'THO_QUANG', 'KCN Thọ Quang': 'THO_QUANG',
};

function resolveAreaCode(locationStr) {
    if (!locationStr) return 'UNKNOWN';
    for (const [key, code] of Object.entries(AREA_CODE_MAP)) {
        if (locationStr.includes(key)) return code;
    }
    return 'UNKNOWN';
}

// --- PRIORITY ENGINE (Spec v2.0 Section 5) ---
function calculatePriority(ticket) {
    const now = new Date();
    
    // 1. Pickup Urgency (weight 0.70)
    const pickupTime = ticket.dateStart ? new Date(ticket.dateStart) : null;
    let pickupUrgency = 50;
    if (pickupTime) {
        const hoursToPickup = (pickupTime.getTime() - now.getTime()) / 3600000;
        if (hoursToPickup <= 2) pickupUrgency = 100;
        else if (hoursToPickup <= 6) pickupUrgency = 80;
        else if (hoursToPickup <= 12) pickupUrgency = 60;
        else if (hoursToPickup <= 24) pickupUrgency = 40;
        else pickupUrgency = 20;
    }
    
    // 2. Waiting Pressure (weight 0.30)
    const createdAt = ticket.createdAt ? new Date(ticket.createdAt) : now;
    const waitHours = (now.getTime() - createdAt.getTime()) / 3600000;
    let waitingPressure = 0;
    if (waitHours >= 4) waitingPressure = 100;
    else if (waitHours >= 2) waitingPressure = 80;
    else if (waitHours >= 1) waitingPressure = 60;
    else if (waitHours >= 0.5) waitingPressure = 40;
    else waitingPressure = 20;
    
    const score = Math.round(
        pickupUrgency * 0.70 +
        waitingPressure * 0.30
    );
    
    let level = 'Low';
    if (score >= 80) level = 'Critical';
    else if (score >= 60) level = 'High';
    else if (score >= 40) level = 'Medium';
    
    return {
        score,
        level,
        breakdown: { pickupUrgency, waitingPressure }
    };
}

// --- ELIGIBILITY FILTER (Spec v2.0 Section 7) ---
function filterEligibleDrivers(drivers, ticket, db) {
    const allTickets = db.tickets || [];
    const allResponses = db.driver_responses || [];
    const eligible = [];
    const rejected = [];
    
    for (const driver of drivers) {
        let rejectReason = null;
        
        // EL-01: Driver status = AVAILABLE
        if (driver.status === 'OFF_DUTY' || driver.status === 'SUSPENDED') {
            rejectReason = 'DRIVER_NOT_AVAILABLE';
        }
        
        // EL-02: Vehicle active
        if (!rejectReason && driver.vehicleStatus === 'INACTIVE') {
            rejectReason = 'VEHICLE_NOT_ACTIVE';
        }
        
        // EL-03: Not dispatch-locked
        if (!rejectReason && driver.dispatchLocked) {
            rejectReason = 'DRIVER_DISPATCH_LOCKED';
        }
        
        // EL-04: No overlap with active assignments
        if (!rejectReason) {
            const activeStatuses = ['ĐANG VẬN CHUYỂN', 'ĐÃ ĐIỀU XE', 'DRIVER_PENDING'];
            const activeTrips = allTickets.filter(t => 
                (t.assignedDriverId === driver.username || t.driverName === driver.name) &&
                activeStatuses.includes(t.status || '')
            );
            if (activeTrips.length >= 2) {
                rejectReason = 'ASSIGNMENT_OVERLAP';
            }
        }
        
        // EL-05: Vehicle size compatibility (simplified — all tractors for now)
        // In Phase 1, skip this check as all vehicles are tractors
        
        // EL-07: Not in maintenance
        if (!rejectReason && driver.maintenanceHold) {
            rejectReason = 'MAINTENANCE_HOLD';
        }
        
        // EL-08: Not previously rejected this ticket in current cycle
        if (!rejectReason) {
            const thisTicketRejections = allResponses.filter(r =>
                r.ticketId === ticket.id &&
                r.driverId === driver.username &&
                r.response === 'REJECTED'
            );
            if (thisTicketRejections.length > 0) {
                rejectReason = 'PREVIOUSLY_REJECTED';
            }
        }
        
        if (rejectReason) {
            rejected.push({
                driverId: driver.username,
                driverName: driver.name,
                licensePlate: driver.licensePlate || 'N/A',
                rejectReasonCode: rejectReason
            });
        } else {
            eligible.push(driver);
        }
    }
    
    return { eligible, rejected };
}

// --- DRIVER SCORING (Spec v2.0 Section 8) ---
function scoreDriver(driver, ticket, db) {
    const config = db.dispatch_config || DEFAULT_DISPATCH_CONFIG;
    const allTickets = db.tickets || [];
    const allResponses = db.driver_responses || [];
    
    const driverTickets = allTickets.filter(t => 
        t.assignedDriverId === driver.username || t.driverName === driver.name
    );
    const routeName = ticket.route || '';
    const newTicketStart = ticket.dateStart ? new Date(ticket.dateStart) : null;
    
    // 1. Continuity Score (weight 0.40) — area_code + TIME ALIGNMENT
    const ticketPickupArea = ticket.pickupAreaCode || resolveAreaCode(routeName);
    const MAX_CHAIN_GAP_HOURS = 6; // Khoảng cách tối đa để coi là nối chuyến được
    
    // Find the most recent active/completed ticket for this driver
    const lastTicket = driverTickets
        .filter(t => t.status === 'HOÀN THÀNH' || t.status === 'ĐANG VẬN CHUYỂN' || t.status === 'ĐÃ ĐIỀU XE' || t.status === 'APPROVED')
        .sort((a, b) => new Date(b.assignedAt || b.createdAt || 0).getTime() - new Date(a.assignedAt || a.createdAt || 0).getTime())[0];
    
    let continuity = 30;
    let continuityType = 'WEAK';
    if (lastTicket) {
        const lastDropoffArea = lastTicket.dropoffAreaCode || resolveAreaCode(lastTicket.route || '');
        const lastTripEnd = lastTicket.dateEnd ? new Date(lastTicket.dateEnd) : null;
        
        // Time alignment check
        let timeAligned = true; // default true if no dates available
        if (lastTripEnd && newTicketStart) {
            const gapHours = (newTicketStart.getTime() - lastTripEnd.getTime()) / 3600000;
            
            if (gapHours < 0) {
                // Chuyến cũ kết thúc SAU khi chuyến mới bắt đầu → không thể nối
                timeAligned = false;
                continuity = 0;
                continuityType = 'WEAK';
            } else if (gapHours > MAX_CHAIN_GAP_HOURS) {
                // Chênh lệch quá lớn (> 6 tiếng) → không gọi là nối chuyến
                timeAligned = false;
                continuity = 30; // default weak
                continuityType = 'WEAK';
            }
        }
        
        // Only score area-based continuity if timing fits
        if (timeAligned) {
            if (lastDropoffArea === ticketPickupArea && ticketPickupArea !== 'UNKNOWN') {
                continuity = 100;
                continuityType = 'EXACT';
            } else if (lastDropoffArea !== 'UNKNOWN' && ticketPickupArea !== 'UNKNOWN') {
                // NEAR: same macro-area (simplified)
                continuity = 60;
                continuityType = 'NEAR';
            }
        }
    }
    
    // 2. Availability Score (weight 0.25)
    const activeStatuses = ['ĐANG VẬN CHUYỂN', 'ĐÃ ĐIỀU XE', 'DRIVER_PENDING'];
    const activeTrips = driverTickets.filter(t => activeStatuses.includes(t.status || ''));
    let availability = 100;
    if (activeTrips.length === 1) availability = 50;
    else if (activeTrips.length >= 2) availability = 10;
    
    // 3. Route Experience Score (weight 0.15)
    const routeTrips = driverTickets.filter(t => (t.route || '') === routeName).length;
    let routeExperience = 20;
    if (routeTrips >= 10) routeExperience = 100;
    else if (routeTrips >= 5) routeExperience = 80;
    else if (routeTrips >= 2) routeExperience = 60;
    else if (routeTrips >= 1) routeExperience = 40;
    
    // 4. Performance Score (weight 0.10) — REAL DATA
    // Based on: 50% acceptance rate + 50% on-time completion rate
    const driverResponses = allResponses.filter(r => r.driverId === driver.username);
    const decidedResponses = driverResponses.filter(r => r.response === 'ACCEPTED' || r.response === 'REJECTED');
    const acceptedCount = driverResponses.filter(r => r.response === 'ACCEPTED').length;
    
    // Acceptance rate (0-100)
    let acceptanceRate = 50; // default when no data
    if (decidedResponses.length >= 2) {
        acceptanceRate = Math.round((acceptedCount / decidedResponses.length) * 100);
    }
    
    // On-time completion rate (0-100)
    // A trip is "on-time" if its actual completion/status change happened before or at dateEnd
    const completedTrips = driverTickets.filter(t => t.status === 'HOÀN THÀNH');
    let onTimeRate = 50; // default when no data
    if (completedTrips.length >= 2) {
        const onTimeCount = completedTrips.filter(t => {
            if (!t.dateEnd) return true; // no deadline = on time
            const deadline = new Date(t.dateEnd);
            // Use completedAt if available, otherwise assignedAt as approximation
            const actual = t.completedAt ? new Date(t.completedAt) : (t.assignedAt ? new Date(t.assignedAt) : null);
            if (!actual) return true; // no actual data = assume on time
            return actual <= deadline;
        }).length;
        onTimeRate = Math.round((onTimeCount / completedTrips.length) * 100);
    }
    
    // Combined performance: 50% acceptance + 50% on-time
    let performance = Math.round(acceptanceRate * 0.5 + onTimeRate * 0.5);
    
    // 5. Load Balance Score (weight 0.10)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentTrips = driverTickets.filter(t => {
        const d = new Date(t.dateStart || t.createdAt || 0);
        return d >= sevenDaysAgo;
    }).length;
    
    let loadBalance = 100;
    if (recentTrips >= 10) loadBalance = 20;
    else if (recentTrips >= 7) loadBalance = 40;
    else if (recentTrips >= 4) loadBalance = 60;
    else if (recentTrips >= 1) loadBalance = 80;
    
    // Weighted total
    const totalWeight = config.continuity_weight + config.availability_weight + 
                        config.route_weight + config.performance_weight + config.balance_weight;
    
    let score = Math.round(
        (continuity * config.continuity_weight + 
         availability * config.availability_weight + 
         routeExperience * config.route_weight + 
         performance * config.performance_weight + 
         loadBalance * config.balance_weight) / totalWeight
    );
    
    // Smart bonus/penalty for chaining
    if (activeTrips.length > 0 && continuity >= 80) {
        score = Math.min(100, score + 5); // Chain trip bonus
    } else if (activeTrips.length > 0 && continuity < 50) {
        score = Math.max(1, score - 20); // Truly busy penalty
    }
    
    return {
        driverId: driver.username,
        driverName: driver.name,
        vehicleId: driver.vehicleId || driver.username,
        licensePlate: driver.licensePlate || 'N/A',
        score,
        breakdown: { continuity, availability, routeExperience, performance, loadBalance },
        continuityType,
        continuityBadge: continuityType === 'EXACT',
        expectedAvailableTime: availability >= 100 ? 'Sẵn sàng' : 'Đang chạy',
        expectedNextLocation: lastTicket ? (lastTicket.dropoffAreaCode || resolveAreaCode(lastTicket.route || '')) : 'DANALOG',
        currentLocation: driver.currentLocation || 'Bãi xe',
        recentTrips,
        routeExperience: routeTrips
    };
}

// --- RECOMMENDATION ENGINE (combines eligibility + scoring) ---
function recommendationEngine(ticket, db, maxCandidates = 5) {
    const users = db.users || [];
    const allDrivers = users.filter(u => u.role === 'DRIVER');
    
    const { eligible, rejected } = filterEligibleDrivers(allDrivers, ticket, db);
    
    const candidates = eligible.map(driver => scoreDriver(driver, ticket, db));
    candidates.sort((a, b) => b.score - a.score);
    
    return {
        candidates: candidates.slice(0, maxCandidates),
        rejectedCandidates: rejected
    };
}

// POST /api/dispatch/suggest - Get top 5 driver suggestions for a ticket (Spec v2.0)
app.post('/api/dispatch/suggest', (req, res) => {
    try {
        const { ticketId } = req.body;
        const db = readDb();
        
        const ticket = (db.tickets || []).find(t => t.id === ticketId);
        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }
        
        // Calculate Priority
        const priority = calculatePriority(ticket);
        
        // Run Recommendation Engine
        const { candidates, rejectedCandidates } = recommendationEngine(ticket, db);
        
        // Update ticket with priority + status
        const idx = db.tickets.findIndex(t => t.id === ticketId);
        if (idx !== -1) {
            db.tickets[idx].priorityScore = priority.score;
            db.tickets[idx].priorityLevel = priority.level;
            db.tickets[idx].priorityBreakdown = priority.breakdown;
            db.tickets[idx].dispatchStatus = candidates.length > 0 ? 'RECOMMENDED' : 'NO_CANDIDATE';
            db.tickets[idx].pickupAreaCode = resolveAreaCode(ticket.route || '');
            
            // Set SLA deadline if not already set
            if (!db.tickets[idx].dispatchSLADeadline) {
                const slaConfig = db.sla_config || DEFAULT_SLA_CONFIG;
                const slaMinutes = priority.level === 'Critical' || priority.level === 'High' 
                    ? slaConfig.priorityAssignTime 
                    : slaConfig.standardAssignTime;
                db.tickets[idx].dispatchSLADeadline = new Date(Date.now() + slaMinutes * 60000).toISOString();
            }
            
            // Initialize version if not set
            if (!db.tickets[idx].version) db.tickets[idx].version = 1;
            
            writeDb(db);
        }
        
        res.json({ candidates, rejectedCandidates, ticketId, priority });
    } catch (err) {
        console.error('Dispatch suggest error:', err);
        res.status(500).json({ error: 'Dispatch engine error' });
    }
});

// POST /api/dispatch/assign - Assign driver (manual, ai_suggested, auto) with optimistic lock
app.post('/api/dispatch/assign', (req, res) => {
    try {
        const { ticketId, driverId, assignType = 'manual', reason, dispatcherUsername, version } = req.body;
        const db = readDb();
        
        const ticketIdx = (db.tickets || []).findIndex(t => t.id === ticketId);
        if (ticketIdx === -1) {
            return res.status(404).json({ error: 'Ticket not found' });
        }
        
        const ticket = db.tickets[ticketIdx];
        
        // Optimistic lock check
        if (version !== undefined && ticket.version !== undefined && ticket.version !== version) {
            return res.status(409).json({ error: 'CONFLICT', message: 'Dữ liệu đã thay đổi, vui lòng refresh' });
        }
        
        const driver = (db.users || []).find(u => u.username === driverId);
        if (!driver) {
            return res.status(404).json({ error: 'Driver not found' });
        }
        
        // Update ticket
        const cycleNo = (ticket.currentCycleNo || 0) + 1;
        const cycleId = `AC-${ticketId}-${cycleNo}`;
        
        db.tickets[ticketIdx] = {
            ...ticket,
            assignedDriverName: driver.name,
            assignedDriverId: driver.username,
            driverName: driver.name,
            licensePlate: driver.licensePlate,
            dispatchStatus: 'DRIVER_PENDING',
            assignType,
            assignedAt: new Date().toISOString(),
            status: 'ĐÃ ĐIỀU XE',
            currentAssignmentCycleId: cycleId,
            currentCycleNo: cycleNo,
            version: (ticket.version || 1) + 1
        };
        
        // Notify the assigned driver
        notify(db, driver.username, `Bạn được phân công lệnh mới: ${ticketId} (${ticket.route || ''})`, 'INFO', ticketId);
        
        // Run engine to get candidates for log
        const { candidates, rejectedCandidates } = recommendationEngine(ticket, db);
        
        // Log
        const slaDeadline = ticket.dispatchSLADeadline ? new Date(ticket.dispatchSLADeadline) : null;
        const slaBreached = slaDeadline ? new Date() > slaDeadline : false;
        
        const log = {
            id: 'DL-' + Date.now(),
            ticketId,
            ticketRoute: ticket.route || '',
            assignmentCycleId: cycleId,
            cycleNo,
            candidates,
            rejectedCandidates: rejectedCandidates || [],
            assignedDriverId: driver.username,
            assignedDriverName: driver.name,
            assignType,
            reason,
            timestamp: new Date().toISOString(),
            dispatcherUsername,
            slaBreached
        };
        
        if (!db.dispatch_logs) db.dispatch_logs = [];
        db.dispatch_logs.unshift(log);
        
        // Create driver response entry (PENDING)
        if (!db.driver_responses) db.driver_responses = [];
        db.driver_responses.unshift({
            id: 'DR-' + Date.now(),
            assignmentId: cycleId,
            ticketId,
            driverId: driver.username,
            driverName: driver.name,
            licensePlate: driver.licensePlate || 'N/A',
            response: 'PENDING',
            sentAt: new Date().toISOString(),
            route: ticket.route || ''
        });
        
        writeDb(db);
        res.json({ success: true, log });
    } catch (err) {
        console.error('Dispatch assign error:', err);
        res.status(500).json({ error: 'Failed to assign driver' });
    }
});

// POST /api/dispatch/override - Override assign with reason code
app.post('/api/dispatch/override', (req, res) => {
    try {
        const { ticketId, driverId, overrideReasonCode, overrideNote, dispatcherUsername, version } = req.body;
        const db = readDb();
        
        const ticketIdx = (db.tickets || []).findIndex(t => t.id === ticketId);
        if (ticketIdx === -1) return res.status(404).json({ error: 'Ticket not found' });
        
        const ticket = db.tickets[ticketIdx];
        
        // Optimistic lock
        if (version !== undefined && ticket.version !== undefined && ticket.version !== version) {
            return res.status(409).json({ error: 'CONFLICT', message: 'Dữ liệu đã thay đổi, vui lòng refresh' });
        }
        
        if (!overrideReasonCode) {
            return res.status(400).json({ error: 'override_reason_code is required' });
        }
        
        const driver = (db.users || []).find(u => u.username === driverId);
        if (!driver) return res.status(404).json({ error: 'Driver not found' });
        
        const cycleNo = (ticket.currentCycleNo || 0) + 1;
        const cycleId = `AC-${ticketId}-${cycleNo}`;
        
        db.tickets[ticketIdx] = {
            ...ticket,
            assignedDriverName: driver.name,
            assignedDriverId: driver.username,
            driverName: driver.name,
            licensePlate: driver.licensePlate,
            dispatchStatus: 'DRIVER_PENDING',
            assignType: 'override',
            assignedAt: new Date().toISOString(),
            status: 'ĐÃ ĐIỀU XE',
            currentAssignmentCycleId: cycleId,
            currentCycleNo: cycleNo,
            version: (ticket.version || 1) + 1
        };
        
        notify(db, driver.username, `[Override] Bạn được phân công lệnh: ${ticketId}`, 'WARNING', ticketId);
        
        const slaDeadline = ticket.dispatchSLADeadline ? new Date(ticket.dispatchSLADeadline) : null;
        const slaBreached = slaDeadline ? new Date() > slaDeadline : false;
        
        const log = {
            id: 'DL-' + Date.now(),
            ticketId,
            ticketRoute: ticket.route || '',
            assignmentCycleId: cycleId,
            cycleNo,
            candidates: [],
            rejectedCandidates: [],
            assignedDriverId: driver.username,
            assignedDriverName: driver.name,
            assignType: 'override',
            overrideReasonCode,
            overrideNote,
            reason: `Override: ${overrideReasonCode}${overrideNote ? ' - ' + overrideNote : ''}`,
            timestamp: new Date().toISOString(),
            dispatcherUsername,
            slaBreached
        };
        
        if (!db.dispatch_logs) db.dispatch_logs = [];
        db.dispatch_logs.unshift(log);
        
        if (!db.driver_responses) db.driver_responses = [];
        db.driver_responses.unshift({
            id: 'DR-' + Date.now(),
            assignmentId: cycleId,
            ticketId,
            driverId: driver.username,
            driverName: driver.name,
            licensePlate: driver.licensePlate || 'N/A',
            response: 'PENDING',
            sentAt: new Date().toISOString(),
            route: ticket.route || ''
        });
        
        writeDb(db);
        res.json({ success: true, log });
    } catch (err) {
        console.error('Override assign error:', err);
        res.status(500).json({ error: 'Override assign failed' });
    }
});

// POST /api/dispatch/auto-assign - Auto-assign top 1 driver
app.post('/api/dispatch/auto-assign', (req, res) => {
    try {
        const { ticketId } = req.body;
        const db = readDb();
        
        const ticketIdx = (db.tickets || []).findIndex(t => t.id === ticketId);
        if (ticketIdx === -1) return res.status(404).json({ error: 'Ticket not found' });
        
        const ticket = db.tickets[ticketIdx];
        const { candidates } = recommendationEngine(ticket, db);
        
        if (candidates.length === 0) {
            db.tickets[ticketIdx].dispatchStatus = 'NO_CANDIDATE';
            writeDb(db);
            return res.status(400).json({ error: 'No available drivers found' });
        }
        
        const top = candidates[0];
        const cycleNo = (ticket.currentCycleNo || 0) + 1;
        const cycleId = `AC-${ticketId}-${cycleNo}`;
        
        db.tickets[ticketIdx] = {
            ...ticket,
            assignedDriverName: top.driverName,
            assignedDriverId: top.driverId,
            driverName: top.driverName,
            licensePlate: top.licensePlate,
            dispatchStatus: 'DRIVER_PENDING',
            assignType: 'auto',
            assignedAt: new Date().toISOString(),
            status: 'ĐÃ ĐIỀU XE',
            currentAssignmentCycleId: cycleId,
            currentCycleNo: cycleNo,
            version: (ticket.version || 1) + 1
        };
        
        const slaDeadline = ticket.dispatchSLADeadline ? new Date(ticket.dispatchSLADeadline) : null;
        const slaBreached = slaDeadline ? new Date() > slaDeadline : false;
        
        const log = {
            id: 'DL-' + Date.now(),
            ticketId,
            ticketRoute: ticket.route || '',
            assignmentCycleId: cycleId,
            cycleNo,
            candidates,
            rejectedCandidates: [],
            assignedDriverId: top.driverId,
            assignedDriverName: top.driverName,
            assignType: 'auto',
            reason: `Auto-assigned: Score ${top.score}/100`,
            timestamp: new Date().toISOString(),
            slaBreached
        };
        
        if (!db.dispatch_logs) db.dispatch_logs = [];
        db.dispatch_logs.unshift(log);
        
        if (!db.driver_responses) db.driver_responses = [];
        db.driver_responses.unshift({
            id: 'DR-' + Date.now(),
            assignmentId: cycleId,
            ticketId,
            driverId: top.driverId,
            driverName: top.driverName,
            licensePlate: top.licensePlate,
            response: 'PENDING',
            sentAt: new Date().toISOString(),
            route: ticket.route || ''
        });
        
        notify(db, top.driverId, `[Auto] Bạn được phân công lệnh: ${ticketId}`, 'INFO', ticketId);
        
        writeDb(db);
        res.json({ success: true, log, assignedDriver: top });
    } catch (err) {
        console.error('Auto-assign error:', err);
        res.status(500).json({ error: 'Auto-assign failed' });
    }
});

// GET /api/dispatch/queue - Priority-sorted dispatch queue (Spec v2.0 Section 12.1)
app.get('/api/dispatch/queue', (req, res) => {
    try {
        const db = readDb();
        const { date_from, date_to, priority_level, status, page = 1, limit = 50 } = req.query;
        
        let tickets = (db.tickets || []).filter(t => 
            !t.assignedDriverId && ['APPROVED', 'PENDING', 'CHỜ ĐIỀU XE', 'MỚI TẠO', 'DRAFT'].includes(t.status || '')
        );
        
        // Apply priority to all queue items
        tickets = tickets.map(t => {
            const p = calculatePriority(t);
            return { ...t, priorityScore: p.score, priorityLevel: p.level, priorityBreakdown: p.breakdown };
        });
        
        // Sort by priority descending
        tickets.sort((a, b) => b.priorityScore - a.priorityScore);
        
        // Filters
        if (priority_level) tickets = tickets.filter(t => t.priorityLevel === priority_level);
        if (status) tickets = tickets.filter(t => t.dispatchStatus === status);
        if (date_from) tickets = tickets.filter(t => t.dateStart >= date_from);
        if (date_to) tickets = tickets.filter(t => t.dateStart <= date_to);
        
        // Pagination
        const total = tickets.length;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const items = tickets.slice(offset, offset + parseInt(limit));
        
        res.json({ items, total, page: parseInt(page), limit: parseInt(limit) });
    } catch (err) {
        res.status(500).json({ error: 'Failed to get dispatch queue' });
    }
});

// POST /api/dispatch/tickets/:id/run-recommendation
app.post('/api/dispatch/tickets/:id/run-recommendation', (req, res) => {
    try {
        const db = readDb();
        const ticket = (db.tickets || []).find(t => t.id === req.params.id);
        if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
        
        const priority = calculatePriority(ticket);
        const { candidates, rejectedCandidates } = recommendationEngine(ticket, db);
        
        res.json({ candidates, rejectedCandidates, priority });
    } catch (err) {
        res.status(500).json({ error: 'Recommendation failed' });
    }
});

// GET /api/dispatch/logs
app.get('/api/dispatch/logs', (req, res) => {
    try {
        const db = readDb();
        res.json(db.dispatch_logs || []);
    } catch (err) {
        res.status(500).json({ error: 'Failed to read dispatch logs' });
    }
});

// GET/PUT /api/dispatch/config (scoring weights)
app.get('/api/dispatch/config', (req, res) => {
    const db = readDb();
    res.json(db.dispatch_config || DEFAULT_DISPATCH_CONFIG);
});

app.put('/api/dispatch/config', (req, res) => {
    try {
        const db = readDb();
        db.dispatch_config = { ...(db.dispatch_config || DEFAULT_DISPATCH_CONFIG), ...req.body };
        notify(db, 'ALL', 'Trọng số thuật toán Điều vận tự động vừa được cập nhật.', 'WARNING');
        writeDb(db);
        res.json(db.dispatch_config);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update dispatch config' });
    }
});

// GET/PUT /api/dispatch/sla-config
app.get('/api/dispatch/sla-config', (req, res) => {
    const db = readDb();
    res.json(db.sla_config || DEFAULT_SLA_CONFIG);
});

app.put('/api/dispatch/sla-config', (req, res) => {
    try {
        const db = readDb();
        db.sla_config = { ...(db.sla_config || DEFAULT_SLA_CONFIG), ...req.body };
        notify(db, 'ALL', 'Thông số SLA Điều vận thời gian thực vừa được cập nhật.', 'WARNING');
        writeDb(db);
        res.json(db.sla_config);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update SLA config' });
    }
});

// GET /api/dispatch/driver-responses
app.get('/api/dispatch/driver-responses', (req, res) => {
    try {
        const db = readDb();
        res.json(db.driver_responses || []);
    } catch (err) {
        res.status(500).json({ error: 'Failed to read driver responses' });
    }
});

// POST /api/dispatch/driver-response - Driver accepts/rejects (with reason codes)
app.post('/api/dispatch/driver-response', (req, res) => {
    try {
        const { ticketId, response, rejectReasonCode, reason, driverUsername } = req.body;
        const db = readDb();
        const slaConfig = db.sla_config || DEFAULT_SLA_CONFIG;
        const maxCycles = slaConfig.maxAssignmentCycles || 3;
        
        // Find the pending response for this ticket
        const respIdx = (db.driver_responses || []).findIndex(r => 
            r.ticketId === ticketId && 
            (driverUsername ? r.driverId === driverUsername : true) &&
            r.response === 'PENDING'
        );
        
        if (respIdx === -1) {
            return res.status(404).json({ error: 'No pending response found for this ticket' });
        }
        
        db.driver_responses[respIdx].response = response;
        db.driver_responses[respIdx].rejectReasonCode = rejectReasonCode || '';
        db.driver_responses[respIdx].reason = reason || '';
        db.driver_responses[respIdx].respondedAt = new Date().toISOString();
        
        // Update ticket status based on response
        const ticketIdx = (db.tickets || []).findIndex(t => t.id === ticketId);
        if (ticketIdx !== -1) {
            const ticket = db.tickets[ticketIdx];
            
            if (response === 'ACCEPTED') {
                db.tickets[ticketIdx].dispatchStatus = 'DRIVER_ACCEPTED';
                db.tickets[ticketIdx].status = 'ĐANG VẬN CHUYỂN';
                db.tickets[ticketIdx].version = (ticket.version || 1) + 1;
                notify(db, 'DISPATCHER', `Lái xe ${driverUsername} đã nhận phiếu ${ticketId}`, 'SUCCESS', ticketId);
                notify(db, 'CS', `Lái xe ${driverUsername} đã nhận phiếu ${ticketId}`, 'INFO', ticketId);
            } else if (response === 'REJECTED') {
                const currentCycle = ticket.currentCycleNo || 1;
                
                const reasonMap = {
                    BUSY: 'Đang bận',
                    VEHICLE_ISSUE: 'Xe gặp sự cố',
                    PERSONAL: 'Lý do cá nhân',
                    ROUTE_UNFAMILIAR: 'Không quen tuyến',
                    OTHER: 'Khác'
                };
                const displayReason = reason || reasonMap[rejectReasonCode] || rejectReasonCode || 'Không có lý do';

                if (currentCycle >= maxCycles) {
                    // ESCALATED — max cycles reached
                    db.tickets[ticketIdx].dispatchStatus = 'ESCALATED';
                    db.tickets[ticketIdx].status = 'CHỜ ĐIỀU XE';
                    delete db.tickets[ticketIdx].assignedDriverId;
                    delete db.tickets[ticketIdx].assignedDriverName;
                    db.tickets[ticketIdx].version = (ticket.version || 1) + 1;
                    notify(db, 'DV_LEAD', `⚠️ Cảnh báo: Kế hoạch phân công phiếu ${ticketId} thất bại liên tiếp ${currentCycle} lần. Cần xử lý thủ công.`, 'ERROR', ticketId);
                    notify(db, 'DISPATCHER', `⚠️ Cảnh báo: Phiếu ${ticketId} bị từ chối vượt quá số lần quy định (${maxCycles} lần).`, 'ERROR', ticketId);
                } else {
                    // Re-queue for next cycle
                    db.tickets[ticketIdx].dispatchStatus = 'WAITING_DISPATCH';
                    db.tickets[ticketIdx].status = 'CHỜ ĐIỀU XE';
                    delete db.tickets[ticketIdx].assignedDriverId;
                    delete db.tickets[ticketIdx].assignedDriverName;
                    db.tickets[ticketIdx].version = (ticket.version || 1) + 1;
                    notify(db, 'DISPATCHER', `Thất bại lần ${currentCycle}: Lái xe ${driverUsername} đã từ chối phiếu ${ticketId} vì ${displayReason}.`, 'ERROR', ticketId);
                }
            }
        }
        
        writeDb(db);
        res.json({ success: true, response: db.driver_responses[respIdx] });
    } catch (err) {
        console.error('Driver response error:', err);
        res.status(500).json({ error: 'Failed to process driver response' });
    }
});

// GET /api/dashboard/stats - Dispatch dashboard statistics (Enhanced Sprint 3+4)
app.get('/api/dashboard/stats', (req, res) => {
    try {
        const db = readDb();
        const tickets = db.tickets || [];
        const users = db.users || [];
        const logs = db.dispatch_logs || [];
        const responses = db.driver_responses || [];
        
        const drivers = users.filter(u => u.role === 'DRIVER' && u.status !== 'INACTIVE');
        const activeStatuses = ['ĐANG VẬN CHUYỂN', 'ĐÃ ĐIỀU XE', 'DRIVER_PENDING'];
        const pendingStatuses = ['CHỜ ĐIỀU XE', 'MỚI TẠO', 'APPROVED', 'PENDING'];
        
        const activeTrips = tickets.filter(t => activeStatuses.includes(t.status)).length;
        const pendingTickets = tickets.filter(t => 
            pendingStatuses.includes(t.status) && !t.assignedDriverId
        ).length;
        
        const driversWithActiveTrips = new Set(
            tickets.filter(t => activeStatuses.includes(t.status)).map(t => t.assignedDriverId || t.driverUsername)
        );
        const driversAvailable = drivers.filter(d => !driversWithActiveTrips.has(d.username)).length;
        
        // === CORE KPIs ===
        const totalLogs = logs.length;
        const autoLogs = logs.filter(l => l.assignType === 'auto');
        const aiSuggestedLogs = logs.filter(l => l.assignType === 'ai_suggested');
        const overrideLogs = logs.filter(l => l.assignType === 'override');
        const manualLogs = logs.filter(l => l.assignType === 'manual');
        
        const autoAssignRate = totalLogs > 0 ? Math.round((autoLogs.length / totalLogs) * 100) : 0;
        const aiSuggestedRate = totalLogs > 0 ? Math.round((aiSuggestedLogs.length / totalLogs) * 100) : 0;
        const overrideRate = totalLogs > 0 ? Math.round((overrideLogs.length / totalLogs) * 100) : 0;
        
        // Rejection stats
        const rejectedResponses = responses.filter(r => r.response === 'REJECTED');
        const noResponseResponses = responses.filter(r => r.response === 'NO_RESPONSE');
        const totalResponses = responses.filter(r => r.response !== 'PENDING').length;
        const rejectionRate = totalResponses > 0 ? Math.round((rejectedResponses.length / totalResponses) * 100) : 0;
        
        // SLA compliance
        const breachedLogs = logs.filter(l => l.slaBreached);
        const slaComplianceRate = totalLogs > 0 ? Math.round(((totalLogs - breachedLogs.length) / totalLogs) * 100) : 100;
        
        // Continuity usage rate
        const continuityLogs = logs.filter(l => {
            if (!l.candidates || l.candidates.length === 0) return false;
            const assignedCandidate = l.candidates.find(c => c.driverId === l.assignedDriverId);
            return assignedCandidate && assignedCandidate.continuityType === 'EXACT';
        });
        const continuityUsageRate = totalLogs > 0 ? Math.round((continuityLogs.length / totalLogs) * 100) : 0;
        
        // Escalation
        const escalatedTickets = tickets.filter(t => t.dispatchStatus === 'ESCALATED').length;
        const escalationRate = totalLogs > 0 ? Math.round((escalatedTickets / Math.max(totalLogs, 1)) * 100) : 0;
        
        // Average response time (minutes)
        const respondedResponses = responses.filter(r => r.respondedAt && r.sentAt && r.response !== 'PENDING');
        let avgResponseTime = 0;
        if (respondedResponses.length > 0) {
            const totalMs = respondedResponses.reduce((sum, r) => {
                return sum + (new Date(r.respondedAt).getTime() - new Date(r.sentAt).getTime());
            }, 0);
            avgResponseTime = Math.round((totalMs / respondedResponses.length) / 60000 * 10) / 10; // minutes, 1 decimal
        }
        
        // SLA alerts - tickets with approaching deadline
        const now = new Date();
        const slaAlerts = tickets
            .filter(t => t.dispatchSLADeadline && !t.assignedDriverId)
            .map(t => {
                const deadline = new Date(t.dispatchSLADeadline);
                const remainingMinutes = Math.round((deadline - now) / 60000);
                return {
                    ticketId: t.id,
                    route: t.route || '',
                    remainingMinutes,
                    priorityLevel: t.priorityLevel || 'Medium'
                };
            })
            .filter(a => a.remainingMinutes < 30)
            .sort((a, b) => a.remainingMinutes - b.remainingMinutes);
        
        res.json({
            totalOrders: tickets.length,
            pendingTickets,
            activeTrips,
            driversAvailable,
            totalDrivers: drivers.length,
            // Core rates
            autoAssignRate,
            aiSuggestedRate,
            overrideRate,
            rejectionRate,
            slaComplianceRate,
            continuityUsageRate,
            escalationRate,
            escalatedTickets,
            // Response stats
            noResponseCount: noResponseResponses.length,
            avgResponseTime,
            // Breakdowns
            assignBreakdown: {
                auto: autoLogs.length,
                ai_suggested: aiSuggestedLogs.length,
                override: overrideLogs.length,
                manual: manualLogs.length,
                total: totalLogs
            },
            responseBreakdown: {
                accepted: responses.filter(r => r.response === 'ACCEPTED').length,
                rejected: rejectedResponses.length,
                noResponse: noResponseResponses.length,
                pending: responses.filter(r => r.response === 'PENDING').length,
                total: responses.length
            },
            recentAssignments: logs.slice(0, 10),
            slaAlerts: slaAlerts.slice(0, 5)
        });
    } catch (err) {
        console.error('Dashboard stats error:', err);
        res.status(500).json({ error: 'Failed to get dashboard stats' });
    }
});
// ============================================================
// === SLA & DISPATCH TIMER ENGINES (Sprint 3) ===
// ============================================================

// --- SLA BREACH AUTO-ASSIGN TIMER ---
// Runs every 60 seconds: finds tickets past SLA deadline without driver
function runSLABreachCheck() {
    try {
        const db = readDb();
        const now = new Date();
        const slaConfig = db.sla_config || DEFAULT_SLA_CONFIG;
        let changed = false;

        const unassignedTickets = (db.tickets || []).filter(t =>
            !t.assignedDriverId &&
            t.dispatchSLADeadline &&
            ['APPROVED', 'PENDING', 'CHỜ ĐIỀU XE', 'MỚI TẠO', 'WAITING_DISPATCH', 'RECOMMENDED', 'NO_CANDIDATE'].includes(t.status || t.dispatchStatus || '')
        );

        for (const ticket of unassignedTickets) {
            const deadline = new Date(ticket.dispatchSLADeadline);
            if (now > deadline) {
                // SLA breached — attempt auto-assign
                const { candidates } = recommendationEngine(ticket, db);

                if (candidates.length > 0) {
                    const top = candidates[0];
                    const ticketIdx = db.tickets.findIndex(t => t.id === ticket.id);
                    if (ticketIdx === -1) continue;

                    const cycleNo = (ticket.currentCycleNo || 0) + 1;
                    const cycleId = `AC-${ticket.id}-${cycleNo}`;

                    db.tickets[ticketIdx] = {
                        ...ticket,
                        assignedDriverName: top.driverName,
                        assignedDriverId: top.driverId,
                        driverName: top.driverName,
                        licensePlate: top.licensePlate,
                        dispatchStatus: 'DRIVER_PENDING',
                        assignType: 'auto',
                        assignedAt: now.toISOString(),
                        status: 'ĐÃ ĐIỀU XE',
                        currentAssignmentCycleId: cycleId,
                        currentCycleNo: cycleNo,
                        version: (ticket.version || 1) + 1
                    };

                    if (!db.dispatch_logs) db.dispatch_logs = [];
                    db.dispatch_logs.unshift({
                        id: 'DL-SLA-' + Date.now(),
                        ticketId: ticket.id,
                        ticketRoute: ticket.route || '',
                        assignmentCycleId: cycleId,
                        cycleNo,
                        candidates,
                        rejectedCandidates: [],
                        assignedDriverId: top.driverId,
                        assignedDriverName: top.driverName,
                        assignType: 'auto',
                        reason: `SLA breach auto-assign: Score ${top.score}/100`,
                        timestamp: now.toISOString(),
                        slaBreached: true
                    });

                    if (!db.driver_responses) db.driver_responses = [];
                    db.driver_responses.unshift({
                        id: 'DR-SLA-' + Date.now(),
                        assignmentId: cycleId,
                        ticketId: ticket.id,
                        driverId: top.driverId,
                        driverName: top.driverName,
                        licensePlate: top.licensePlate,
                        response: 'PENDING',
                        sentAt: now.toISOString(),
                        route: ticket.route || ''
                    });

                    notify(db, 'DISPATCHER', `⏰ SLA vượt hạn — Auto-assign Lệnh ${ticket.id} → ${top.driverName}`, 'WARNING', ticket.id);
                    notify(db, top.driverId, `[Auto-SLA] Bạn được phân công lệnh: ${ticket.id}`, 'INFO', ticket.id);
                    changed = true;

                    console.log(`[SLA-Engine] Auto-assigned ${ticket.id} → ${top.driverName} (SLA breach)`);
                } else {
                    // No candidates — escalate
                    const ticketIdx = db.tickets.findIndex(t => t.id === ticket.id);
                    if (ticketIdx !== -1 && ticket.dispatchStatus !== 'ESCALATED') {
                        db.tickets[ticketIdx].dispatchStatus = 'ESCALATED';
                        db.tickets[ticketIdx].version = (ticket.version || 1) + 1;
                        notify(db, 'DV_LEAD', `⚠️ Lệnh ${ticket.id} ESCALATED: SLA vượt hạn, không có ứng viên.`, 'ERROR', ticket.id);
                        notify(db, 'DISPATCHER', `⚠️ Lệnh ${ticket.id} ESCALATED (SLA + no candidate).`, 'ERROR', ticket.id);
                        changed = true;
                        console.log(`[SLA-Engine] Escalated ${ticket.id} (no candidates, SLA breached)`);
                    }
                }
            }
        }

        if (changed) writeDb(db);
    } catch (err) {
        console.error('[SLA-Engine] Error:', err);
    }
}

// --- DRIVER NO_RESPONSE TIMEOUT ---
// Runs every 30 seconds: finds PENDING responses past driverResponseTime
function runDriverResponseTimeout() {
    try {
        const db = readDb();
        const now = new Date();
        const slaConfig = db.sla_config || DEFAULT_SLA_CONFIG;
        const responseTimeout = (slaConfig.driverResponseTime || 3) * 60000; // ms
        const maxCycles = slaConfig.maxAssignmentCycles || 3;
        let changed = false;

        const pendingResponses = (db.driver_responses || []).filter(r => r.response === 'PENDING');

        for (const resp of pendingResponses) {
            const sentAt = new Date(resp.sentAt);
            const elapsed = now.getTime() - sentAt.getTime();

            if (elapsed > responseTimeout) {
                // Mark as NO_RESPONSE
                const respIdx = db.driver_responses.findIndex(r => r.id === resp.id);
                if (respIdx === -1) continue;

                db.driver_responses[respIdx].response = 'NO_RESPONSE';
                db.driver_responses[respIdx].reason = 'Hết thời gian phản hồi';
                db.driver_responses[respIdx].respondedAt = now.toISOString();

                // Update ticket — re-queue or escalate
                const ticketIdx = (db.tickets || []).findIndex(t => t.id === resp.ticketId);
                if (ticketIdx !== -1) {
                    const ticket = db.tickets[ticketIdx];
                    const currentCycle = ticket.currentCycleNo || 1;

                    if (currentCycle >= maxCycles) {
                        // ESCALATED
                        db.tickets[ticketIdx].dispatchStatus = 'ESCALATED';
                        db.tickets[ticketIdx].status = 'CHỜ ĐIỀU XE';
                        delete db.tickets[ticketIdx].assignedDriverId;
                        delete db.tickets[ticketIdx].assignedDriverName;
                        db.tickets[ticketIdx].version = (ticket.version || 1) + 1;
                        notify(db, 'DV_LEAD', `⚠️ Lệnh ${resp.ticketId} ESCALATED: ${resp.driverName} không phản hồi (${currentCycle} cycle).`, 'ERROR', resp.ticketId);
                        notify(db, 'DISPATCHER', `⚠️ Lệnh ${resp.ticketId} ESCALATED: vượt ${maxCycles} cycle.`, 'ERROR', resp.ticketId);
                    } else {
                        // Re-queue for next cycle
                        db.tickets[ticketIdx].dispatchStatus = 'WAITING_DISPATCH';
                        db.tickets[ticketIdx].status = 'CHỜ ĐIỀU XE';
                        delete db.tickets[ticketIdx].assignedDriverId;
                        delete db.tickets[ticketIdx].assignedDriverName;
                        db.tickets[ticketIdx].version = (ticket.version || 1) + 1;
                        notify(db, 'DISPATCHER', `⏰ Tài xế ${resp.driverName} KHÔNG PHẢN HỒI Lệnh ${resp.ticketId}. Tự động xếp lại hàng chờ (cycle ${currentCycle}/${maxCycles}).`, 'WARNING', resp.ticketId);
                    }
                }

                changed = true;
                console.log(`[NoResponse-Engine] ${resp.driverName} timed out on ${resp.ticketId}`);
            }
        }

        if (changed) writeDb(db);
    } catch (err) {
        console.error('[NoResponse-Engine] Error:', err);
    }
}

// Start timer engines
setInterval(runSLABreachCheck, 60 * 1000);       // Every 60 seconds
setInterval(runDriverResponseTimeout, 30 * 1000); // Every 30 seconds

// Run once on startup
setTimeout(() => { runSLABreachCheck(); runDriverResponseTimeout(); }, 5000);

console.log('[Dispatch Engine] SLA breach check (60s) and Driver response timeout (30s) timers started.');

// --- PROFILE REQUESTS ---
app.get('/api/users/profile-requests', (req, res) => {
    const db = readDb();
    res.json(db.profile_requests || []);
});

app.post('/api/users/profile-request', (req, res) => {
    try {
        const db = readDb();
        const payload = req.body;
        if (!db.profile_requests) db.profile_requests = [];
        
        const request = {
            id: 'PR-' + Date.now().toString(36),
            ...payload,
            status: 'PENDING',
            requestedAt: new Date().toISOString()
        };
        db.profile_requests.unshift(request);
        notify(db, 'ADMIN', `Yêu cầu cập nhật hồ sơ từ ${payload.username}`, 'INFO', request.id);
        
        writeDb(db);
        res.json(request);
    } catch (err) {
        console.error("Error creating profile request:", err);
        res.status(500).json({ error: 'Failed to create profile request' });
    }
});

// --- FUEL TICKETS ---
app.get('/api/fuel-tickets', (req, res) => {
    const { username } = req.query;
    const db = readDb();
    let tickets = db.fuel_tickets || [];
    if (username) {
        tickets = tickets.filter(t => t.driverUsername === username);
    }
    res.json(tickets);
});

app.post('/api/fuel-tickets', (req, res) => {
    try {
        const db = readDb();
        const payload = req.body;
        if (!db.fuel_tickets) db.fuel_tickets = [];
        
        const ticket = {
            id: 'NL-' + Date.now().toString(36).toUpperCase(),
            ...payload,
            status: 'SUBMITTED',
            createdAt: new Date().toISOString()
        };
        db.fuel_tickets.unshift(ticket);
        
        // Notify accountant or admin about new fuel ticket
        notify(db, 'ACCOUNTANT', `Lái xe ${payload.driverUsername} nộp phiếu nhiên liệu mới`, 'INFO', ticket.id);
        
        writeDb(db);
        res.json(ticket);
    } catch (err) {
        console.error("Error creating fuel ticket:", err);
        res.status(500).json({ error: 'Failed to create fuel ticket' });
    }
});

// --- AUTH ---
app.post('/api/login', loginLimiter, (req, res) => {
    try {
        const { username, password } = req.body;
        console.log(`Login attempt for user: ${username}`);

        const db = readDb();
        const users = db.users || [];

        const user = users.find(u => u.username === username);
        if (user && bcrypt.compareSync(password, user.password || '')) {
            if (user.status === 'INACTIVE') {
                console.warn(`Login failed: Inactive account ${username}`);
                return res.status(403).json({ error: 'Tài khoản đã bị vô hiệu hóa' });
            }

            console.log(`Login success: ${username}`);
            // Don't send password back
            const { password: p, ...userWithoutPassword } = user;
            
            // Generate token
            const token = jwt.sign({ username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });

            res.json({ user: userWithoutPassword, token });
        } else {
            console.warn(`Login failed: Invalid credentials for ${username}`);
            res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng' });
        }
    } catch (err) {
        console.error("Login server error:", err);
        res.status(500).json({ error: 'Lỗi máy chủ' });
    }
});

// The "catch-all" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    // Ensure DB exists on start
    readDb();
});
