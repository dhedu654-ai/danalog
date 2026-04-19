export const CUSTOMERS = [
    'QZY',
    'STEINWEG',
    'VẠN TƯỢNG',
    'AST',
    'PHÙNG GIA PHÁT',
    'GEMADEPT-BỘT',
    'HYOSUNG',
    'XIDADONG',
    'Kho hàng DNL',
    'Depot',
    'TRUNG CHUYỂN',
    'Nhiều khách hàng'
] as const;

export const ROUTES_BY_CUSTOMER: Record<string, string[]> = {
    'QZY': [
        'Cảng Tiên Sa - Cửa khẩu quốc tế Lao Bảo - Nhà máy Sunpaper Savannakhet, Lào (2 chiều)',
        'Cảng Tiên Sa - Cửa khẩu quốc tế Lao Bảo - Nhà máy Sunpaper Savannakhet, Lào (1 chiều)'
    ],
    'STEINWEG': [
        'Cảng Tiên Sa Danang ( VietNam ) - Vientiane, Lào.'
    ],
    'VẠN TƯỢNG': [
        'Salavan, Lào quá cảnh qua CK Lalay đến cảng Tiên Sa, Đà Nẵng (bốc container rỗng sang đóng hàng)',
        'Cảng Tiên Sa - Thateng, Sekong, Lào (qua cửa khẩu Lalay)'
    ],
    'AST': [
        'Cảng Tiên Sa, Đà Nẵng - Champasak, Lào'
    ],
    'PHÙNG GIA PHÁT': [
        'NM Tinh bột sắn, Sepon Lào - Cảng Tiên Sa Đà Nẵng (bốc container rỗng sang nhà máy đóng hàng)'
    ],
    'GEMADEPT-BỘT': [
        'NM Tinh bột sắn, Sepon Lào - Cảng Tiên Sa Đà Nẵng (bốc container rỗng sang đóng hàng)'
    ],
    'HYOSUNG': [
        'Cảng Tiên Sa, Đà Nẵng- HS Hyosung Quảng Nam, KCN Tam Thăng, xã Thăng Trường, thành phố Đà Nẵng',
        'Cảng Tiên Sa, Đà Nẵng- HS Hyosung Quảng Nam, KCN Tam Thăng, xã Thăng Trường, thành phố Đà Nẵng (2 chuyến/ngày)',
        'Cảng Chu Lai - Hyosung Tam Thăng, Tam Kỳ, Quảng Nam',
        'Cảng Chu Lai - Hyosung Tam Thăng, Tam Kỳ, Quảng Nam (2 chuyến)',
        'Cảng Chu Lai - Hyosung Tam Thăng, Tam Kỳ, Quảng Nam (3 chuyến)',
        'Cảng Tiên Sa, Đà Nẵng- Hyosung Tam Thăng, Tam Kỳ, Quảng Nam',
        'Cảng Tiên Sa, Đà Nẵng- Hyosung Tam Thăng, Tam Kỳ, Quảng Nam (2 chuyến)'
    ],
    'XIDADONG': [
        'Cảng Tiên Sa - KCN Viship Quảng Ngãi'
    ],
    'Nhiều khách hàng': [
        'Cảng Tiên Sa - KCN Thọ Quang',
        'Cảng Tiên Sa - Nhà máy Quặng Quảng Bình',
        'Cảng Tiên Sa - Phú Bài, Huế',
        'Cảng Tiên Sa - KCN Hòa Khánh',
        'Cảng Tiên Sa - KCN Hòa Cầm',
        'Cảng Tiên Sa - Điện Ngọc, Điện Bàn',
        'DNL 1 - Điện Thắng, Sợi Quảng Đà',
        'Cảng Tiên Sa - KCN Duy Xuyên',
        'Cảng Tiên Sa - KCN Quảng Ngãi (Quanterm 125km)',
        'Cảng Tiên Sa - KCN Quảng Ngãi (Vinalink 130km)',
        'Cảng Tiên Sa - MN Hoà Thọ, Hà Lam, QN',
        'Cảng Tiên Sa - KCN Đông Quế Sơn (Giáp Quốc lộ 1A )',
        'Cảng Tiên Sa - Lao Bảo, Quảng Trị (Gỗ)',
        'Cảng Tiên Sa - Đông Hà, Quảng Trị (Gỗ)',
        'Cảng Tiên Sa, Đà Nẵng đến Quy Nhơn',
        'Cảng Tiên Sa - Đồng Hới, Quảng Bình',
        'Cảng Tiên Sa - KCN Bắc Sông Cầu - Phú Yên'
    ],
    'Kho hàng DNL': [
        'Hàng hóa kho CFS cont 20\'',
        'Hàng hóa kho CFS, cont 40\''
    ],
    'Depot': [
        'cont sửa chữa từ Danalog - Tiên sa và ngược lại'
    ],
    'TRUNG CHUYỂN': [
        'Nội bộ kho bãi Danalog 1',
        'Giấy từ kho bãi Tiên Sa - cầu tàu Tiên Sa',
        'Giấy từ kho Danalog - Cảng Tiên Sa',
        'Tàu - Bãi Cảng Tiên Sa',
        'Danalog 1 - Các bãi ngoài (GFT, GLS, VCS…)',
        'Danalog 1,3,5<->Tiên Sa cont rỗng (Kiểm Soát Bãi)',
        'Tiên Sa - Danalog (Z6 sang cont)',
        'Tiên Sa <->Các Depot GFT, Chân Thật, SGS, TQ, VF',
        'Danalog <->Các Depot GFT, Chân Thật, SGS, TQ, VF',
        'Tiên Sa <-> Danang 1: cont có hàng',
        'Danalog 1 - Tiên Sa: cont có hàng'
    ]
};

// Default empty for now, will be populated by user later or derived
export const ROUTE_PRICES: Record<string, number> = {};

// Preset zones - the UI will also include any custom zones found in existing routes
export const ZONE_PRESETS = [
    'Tuyến Nội thành Đà Nẵng',
    'Tuyến Bắc (Huế)',
    'Tuyến Bắc (Quảng Trị)',
    'Tuyến Bắc (Quảng Bình)',
    'Tuyến Nam (Quảng Nam)',
    'Tuyến Nam (Quảng Ngãi)',
    'Tuyến Nam (Bình Định/Phú Yên)',
    'Tuyến Lào',
    'Khác'
] as const;

export const CARGO_TYPE_LABELS: Record<string, string> = {
    'TR_C_NOI_BO': 'Trung chuyển nội bộ',
    'TR_C_CHUYEN_GIAY': 'Trung chuyển giấy',
    'KHO_CFS_40': 'Kho CFS 40\'',
    'KHO_CFS_20': 'Kho CFS 20\'',
    'VC_GIAY': 'Vận chuyển giấy',
    'VC_BOT': 'Vận chuyển bột',
    'VC_CONT': 'Vận chuyển container',
    'LUU_DEM': 'Lưu đêm',
};
