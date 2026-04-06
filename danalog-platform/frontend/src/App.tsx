import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate, Link } from 'react-router-dom'
import { api } from './services/api'
import { LogOut, ChevronDown, ChevronRight, Users, Map as MapIcon, Shield, Fuel, Truck, BarChart3, PieChart } from 'lucide-react'
import { TicketList } from './components/TicketList'
import { CorrectionRequestList } from './components/CorrectionRequestList'
import { DriverRevenueTable } from './components/DriverRevenueTable'
import { CustomerRevenueTable } from './components/CustomerRevenueTable'
import { RouteConfigList } from './components/RouteConfigList'
import { DriverSalaryTable } from './components/DriverSalaryTable'
import { LoginPage } from './components/LoginPage'
import { UserManagement } from './components/UserManagement';
import { CustomerManagement } from './components/CustomerManagement';
import { FuelManagement } from './components/FuelManagement';
import { DispatchBoard } from './components/DispatchBoard';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { NotificationDropdown } from './components/NotificationDropdown';
import { OrderCreationForm } from './components/OrderCreationForm';
import { UserProfile } from './components/UserProfile';
import { ProfileApprovals } from './components/ProfileApprovals';
import { OrderList } from './components/OrderList';
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ROLE_LABELS, UserRole } from './types'

import { MobileDriverDashboard } from './components/mobile/MobileDriverDashboard'

// === Dashboard Imports ===
import { CompanyOverviewDashboard } from './components/Dashboards/admin/CompanyOverviewDashboard';
import { OperationsDashboard } from './components/Dashboards/admin/OperationsDashboard';
import { DispatchManagerDashboard } from './components/Dashboards/dispatch/DispatchManagerDashboard';
import { FleetDashboardNew } from './components/Dashboards/dispatch/FleetDashboardNew';
import { CSManagerDashboard } from './components/Dashboards/cs/CSManagerDashboard';
import { CSQualityDashboard } from './components/Dashboards/cs/CSQualityDashboard';
import { RevenueDashboard } from './components/Dashboards/finance/RevenueDashboard';
import { FuelDashboard } from './components/Dashboards/finance/FuelDashboard';
import { DispatchPerformanceDashboard } from './components/Dashboards/operators/DispatchPerformanceDashboard';
import { CSReviewDashboard } from './components/Dashboards/operators/CSReviewDashboard';
import { DriverDashboardNew } from './components/Dashboards/driver/DriverDashboardNew';
import { DriverEarnings } from './components/Dashboards/driver/DriverEarnings';
import { CSTaskQueue } from './components/Dashboards/operators/CSTaskQueue';

type TabType = 'dashboard' | 'cs_check' | 'ticket_corrections' | 'revenue_driver' | 'revenue_customer' | 'salary' | 'route_config' | 'settings' | 'user_management' | 'customer_management' | 'fuel_management' | 'dispatch_board' | 'dispatch_tracking' | 'dispatch_responses' | 'dispatch_logs' | 'dispatch_sla' | 'profile' | 'profile_approvals' | 'order_list' | 'db_overview' | 'db_operations' | 'db_dispatch_mgr' | 'db_fleet' | 'db_cs_mgr' | 'db_cs_quality' | 'db_revenue' | 'db_fuel' | 'db_dispatch_perf' | 'db_cs_review' | 'db_cs_task_queue' | 'db_driver' | 'db_driver_earnings';


const revRouteMap: Record<string, string> = {
    'dashboard': '/dashboard',
    'db_overview': '/dashboard',
    'db_operations': '/operations',
    'db_dispatch_mgr': '/dispatch-manager',
    'db_fleet': '/fleet',
    'db_cs_mgr': '/cs-manager',
    'db_cs_quality': '/cs-quality',
    'db_revenue': '/revenue',
    'db_fuel': '/fuel',
    'db_dispatch_perf': '/dispatch-performance',
    'db_cs_review': '/cs-review',
    'db_cs_task_queue': '/cs-task-queue',
    'dispatch_board': '/dispatch',
    'dispatch_tracking': '/dispatch/tracking',
    'dispatch_responses': '/dispatch/responses',
    'dispatch_logs': '/dispatch/logs',
    'dispatch_sla': '/dispatch/sla',
    'order_list': '/orders',
    'cs_check': '/cs/tickets',
    'ticket_corrections': '/cs/corrections',
    'revenue_driver': '/ketoan/revenue-driver',
    'revenue_customer': '/ketoan/revenue-customer',
    'salary': '/ketoan/salary',
    'route_config': '/admin/routes',
    'user_management': '/admin/users',
    'customer_management': '/admin/customers',
    'fuel_management': '/admin/fuel',
    'profile': '/profile',
    'profile_approvals': '/profile/approvals',
    'db_driver': '/driver-dashboard',
    'db_driver_earnings': '/driver-earnings'
};

const routeToTabMap: Record<string, TabType> = Object.fromEntries(Object.entries(revRouteMap).map(([k, v]) => [v, k as TabType]));

function AppContent() {
    const { user, logout, isAuthenticated, isLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const activeTab = routeToTabMap[location.pathname] || 'dashboard';

    // RBAC Flags
    const isAdmin = user?.role === 'ADMIN';
    const isAccountant = user?.role === 'ACCOUNTANT';
    const isDVLead = user?.role === 'DV_LEAD';
    const isDispatcher = user?.role === 'DISPATCHER';
    const isCSLead = user?.role === 'CS_LEAD';
    const isCS = user?.role === 'CS';
    const isDriver = user?.role === 'DRIVER';

    const canViewDispatch = isAdmin || isDVLead || isDispatcher;
    const canViewCS = isAdmin || isCSLead || isCS || isAccountant;
    const canViewFinance = isAdmin || isAccountant;
    const canApproveProfiles = isAdmin || isDVLead || isCSLead || user?.role === 'KT_LEAD';

        const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
    const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);

    // State for expanding menus
    const [isDashboardOpen, setIsDashboardOpen] = useState(true);
    const [isDispatchOpen, setIsDispatchOpen] = useState(true);
    const [isCSOpen, setIsCSOpen] = useState(true);
    const [isRevenueOpen, setIsRevenueOpen] = useState(true);

    // Dashboard navigation handler — passed to dashboard components for drill-down
    const handleDashboardNavigate = (tab: string, focusId?: string) => {
        navigate(revRouteMap[tab] || '/dashboard');
        if (focusId) setFocusedTicketId(focusId);
    };

    const [tickets, setTickets] = useState<any[]>([]);
    const [routeConfigs, setRouteConfigs] = useState<any[]>([]);
    const [publishedSalaries, setPublishedSalaries] = useState<any[]>([]);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [focusedTicketId, setFocusedTicketId] = useState<string | null>(null);


    // Fetch data on mount or when user changes
    useEffect(() => {
        const fetchData = async () => {
            // Pass user info to getTickets
            const userInfo = user ? { username: user.username, role: user.role } : undefined;

            // Apply any pending route changes that have reached their effective date
            try {
                await api.applyPendingChanges();
            } catch (e) {
                console.log('Note: Could not apply pending changes', e);
            }

            const [ticketsData, routesData, publishedData, notificationsData, usersData] = await Promise.all([
                api.getTickets(userInfo),
                api.getRouteConfigs(),
                api.getPublishedSalaries(),
                api.getNotifications(),
                api.getUsers()
            ]);

            if (ticketsData && ticketsData.length > 0) setTickets(ticketsData);
            else setTickets([]); // Remove mock data fallback to avoid confusion, or keep it if desired. Let's keep it empty if no data.

            if (routesData && Array.isArray(routesData)) setRouteConfigs(routesData);
            else setRouteConfigs([]);
            // No fallback to MOCK_ROUTES_CONFIG - we want server to be source of truth

            setPublishedSalaries(publishedData || []);
            setNotifications(notificationsData || []);
            setUsers(usersData || []);
        };
        fetchData();
    }, [user]); // Add user dependency to refetch when user logs in

    // Refetch data when switching tabs to ensure freshness
    useEffect(() => {
        if (activeTab === 'route_config') {
            api.getRouteConfigs().then(data => setRouteConfigs(data || []));
        } else if (activeTab === 'customer_management') {
            // Optional: Refetch customers if needed, although CustomerManagement handles its own initial fetch
            // But checking for side effects on other data is good practice
        }
    }, [activeTab]);

    // Persist changes
    // Removed localStorage effect for tickets
    // useEffect(() => {
    //     localStorage.setItem('danalog_tickets', JSON.stringify(tickets));
    // }, [tickets]);




    // Show splash screen while checking auth
    if (isLoading) {
        return (
            <div className="h-screen w-screen bg-slate-900 flex flex-col items-center justify-center text-white">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-slate-400 font-medium animate-pulse">Đang tải...</p>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <LoginPage />;
    }

    // Role-based Layout Switching: STRICT ISOLATION

    const handleUpdateTickets = async (updatedTickets: any[]) => {
        setTickets(updatedTickets);
        await api.saveTickets(updatedTickets);
    };

    const handleUpdateSingleTicket = async (updatedTicket: any) => {
        // Optimistic update
        setTickets(prev => prev.map(t => t.id === updatedTicket.id ? updatedTicket : t));
        try {
            await api.updateTicket(updatedTicket.id, updatedTicket);
        } catch (error) {
            console.error("Failed to update ticket", error);
            alert("Lỗi cập nhật phiếu. Vui lòng thử lại.");
            // Revert could be added here if needed
        }
    };

    const handleCreateTicket = async (newTicket: any) => {
        // Optimistic update
        setTickets(prev => [newTicket, ...prev]);
        try {
            await api.createTicket(newTicket);
        } catch (error) {
            console.error("Failed to create ticket", error);
            // Rollback if needed, but for MVP keep it simple or show alert
            alert("Lỗi lưu phiếu. Vui lòng kiểm tra kết nối mạng.");
        }
    };

    if (user?.role === 'DRIVER') {
        return (
            <div className="bg-slate-900 min-h-screen flex justify-center">
                <MobileDriverDashboard
                    tickets={tickets}
                    onUpdateTickets={handleUpdateTickets}
                    onCreateTicket={handleCreateTicket}
                    routeConfigs={routeConfigs}
                    notifications={notifications}
                    publishedSalaries={publishedSalaries}
                />
            </div>
        );
    }

    const handleMarkNotificationRead = async (id: string) => {
        try {
            await api.markNotificationRead(id as any);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        } catch (e) {
            console.error("Failed to mark as read", e);
        }
    };

    const handleReadAllNotifications = async () => {
        // Optimistic update
        setNotifications(prev => prev.map(n => ({...n, read: true})));
        // Assuming we could have a markAllAsRead endpoint, but since we don't, we can just map them visually for now
    };

    const handleNotifySalary = async (driverUsername: string, month: number, year: number) => {
        try {
            await api.publishSalary({
                driverUsername,
                month,
                year,
                publishedAt: new Date().toISOString()
            });
            // Update local state
            const publishedData = await api.getPublishedSalaries();
            setPublishedSalaries(publishedData);

            // Refresh notifications
            const notificationsData = await api.getNotifications();
            setNotifications(notificationsData);

            alert(`Đã gửi thông báo lương cho lái xe ${driverUsername} tháng ${month}/${year}`);
        } catch (error) {
            console.error("Failed to publish salary", error);
            alert("Lỗi khi gửi thông báo lương.");
        }
    };

    const handleUpdateRouteConfigs = async (updatedConfigs: any[]) => {
        // Optimistic UI update: Show new routes immediately
        setRouteConfigs(updatedConfigs);

        try {
            // Save to server
            await api.saveRouteConfigs(updatedConfigs);

            // SYNC: Fetch latest tickets to update their prices
            const latestTickets = await api.getTickets();

            // Merge current changes with latest from server if they differ
            // For now, prioritize the user's intent: use updatedConfigs as the source of truth for routes

            const configMap = new Map(updatedConfigs.map((c: any) => [c.routeName, c]));

            // Helper to get the effective revenue/salary based on ticket endDate vs pending effectiveDate
            const getEffectiveValues = (config: any, ticketEndDate: string) => {
                // Check if there are pending changes and if the ticket endDate qualifies
                if (config.pendingChanges && ticketEndDate >= config.pendingChanges.effectiveDate) {
                    // Use pending values (merged with current as fallback)
                    return {
                        revenue: { ...config.revenue, ...config.pendingChanges.revenue },
                        salary: { ...config.salary, ...config.pendingChanges.salary }
                    };
                }
                // Use current values
                return { revenue: config.revenue, salary: config.salary };
            };

            // Use latestTickets instead of local tickets state for cascading update
            const updatedTickets = latestTickets.map((ticket: any) => {
                const config = configMap.get(ticket.route);
                if (config) {
                    // Get effective values based on ticket's endDate (dateEnd)
                    const ticketEndDate = ticket.dateEnd || ticket.endDate || '';
                    const effectiveConfig = getEffectiveValues(config, ticketEndDate);

                    const hasSize40 = ticket.size === '40' || ticket.size === '40R0' || ticket.size === '45';
                    const hasSize20 = ticket.size === '20';
                    const isFull = ticket.fe === 'F';

                    let revenue = 0;
                    if (hasSize40) revenue = isFull ? (effectiveConfig.revenue.price40F || 0) : (effectiveConfig.revenue.price40E || 0);
                    else if (hasSize20) revenue = isFull ? (effectiveConfig.revenue.price20F || 0) : (effectiveConfig.revenue.price20E || 0);

                    const driverSalary = effectiveConfig.salary?.driverSalary || 0;

                    if (ticket.revenue !== revenue || ticket.driverSalary !== driverSalary) {
                        return {
                            ...ticket,
                            revenue,
                            driverSalary
                        };
                    }
                }
                return ticket;
            });

            if (JSON.stringify(updatedTickets) !== JSON.stringify(tickets)) {
                setTickets(updatedTickets);
                await api.saveTickets(updatedTickets);
            }

            alert("Đã lưu cấu hình tuyến đường và cập nhật giá lương cho các phiếu hiện tại.");
        } catch (error) {
            console.error("Failed to update route configs", error);
            alert("Lỗi khi lưu cấu hình tuyến đường. Vui lòng thử lại.");
        }
    };

    const handleRefreshTickets = async () => {
        const userInfo = user ? { username: user.username, role: user.role } : undefined;
        const ticketsData = await api.getTickets(userInfo);
        setTickets(ticketsData || []);
    };

    const handleNotificationNavigate = (relatedId: string, type: string) => {
        if (!relatedId) return;
        
        let targetTab: TabType | null = null;
        if (relatedId.startsWith('ORD-')) {
            // Orders -> Dispatch Board (to see generated tickets) or CS Check
            targetTab = (isDispatcher || isDVLead || user?.role === 'ADMIN') ? 'dispatch_board' : 'cs_check';
        } else if (relatedId.startsWith('TK-') || relatedId.startsWith('CR-')) {
            // Tickets & Correction requests
            if (relatedId.startsWith('CR-') && canViewCS) targetTab = 'ticket_corrections';
            else if (isDispatcher || isDVLead) targetTab = 'dispatch_board';
            else if (user?.role === 'ADMIN') targetTab = 'cs_check'; // Admin better views full ticket in cs_check
            else if (user?.role === 'DRIVER') { /* handled in MobileDriverDashboard */ }
            else if (canViewCS) targetTab = 'cs_check';
        }

        if (targetTab) {
            navigate(revRouteMap[targetTab] || '/dashboard');
            setFocusedTicketId(relatedId);
        }
    };

    const renderContent = () => {
        return (
            <Routes>
                <Route path="/" element={<Navigate to="/dashboard" />} />
                
                {/* Dispatch */}
                <Route path="/dispatch" element={<DispatchBoard tickets={tickets} currentUser={user} onRefreshTickets={handleRefreshTickets} focusedTicketId={focusedTicketId} onClearFocus={() => setFocusedTicketId(null)} activeSubPage="board" />} />
                <Route path="/dispatch/tracking" element={<DispatchBoard tickets={tickets} currentUser={user} onRefreshTickets={handleRefreshTickets} focusedTicketId={focusedTicketId} onClearFocus={() => setFocusedTicketId(null)} activeSubPage="tracking" />} />
                <Route path="/dispatch/responses" element={<DispatchBoard tickets={tickets} currentUser={user} onRefreshTickets={handleRefreshTickets} focusedTicketId={focusedTicketId} onClearFocus={() => setFocusedTicketId(null)} activeSubPage="responses" />} />
                <Route path="/dispatch/logs" element={<DispatchBoard tickets={tickets} currentUser={user} onRefreshTickets={handleRefreshTickets} focusedTicketId={focusedTicketId} onClearFocus={() => setFocusedTicketId(null)} activeSubPage="logs" />} />
                <Route path="/dispatch/sla" element={<DispatchBoard tickets={tickets} currentUser={user} onRefreshTickets={handleRefreshTickets} focusedTicketId={focusedTicketId} onClearFocus={() => setFocusedTicketId(null)} activeSubPage="sla_config" />} />
                
                {/* Orders / Tickets */}
                <Route path="/orders" element={<OrderList currentUser={user} onRefreshTickets={handleRefreshTickets} />} />
                <Route path="/cs/tickets" element={<TicketList tickets={tickets} onUpdateTickets={handleUpdateTickets} onUpdateTicket={handleUpdateSingleTicket} routeConfigs={routeConfigs} currentUser={user} focusedTicketId={focusedTicketId} onClearFocus={() => setFocusedTicketId(null)} />} />
                <Route path="/cs/corrections" element={<CorrectionRequestList currentUser={user} />} />
                
                {/* Finance */}
                <Route path="/ketoan/revenue-driver" element={<DriverRevenueTable tickets={tickets} />} />
                <Route path="/ketoan/revenue-customer" element={<CustomerRevenueTable tickets={tickets} />} />
                <Route path="/ketoan/salary" element={<DriverSalaryTable tickets={tickets} routeConfigs={routeConfigs} publishedSalaries={publishedSalaries} users={users} onNotifySalary={handleNotifySalary} />} />
                
                {/* Admin */}
                <Route path="/admin/routes" element={<RouteConfigList configs={routeConfigs} onUpdateConfigs={handleUpdateRouteConfigs} isReadOnly={user?.role === 'CS'} />} />
                <Route path="/admin/users" element={<UserManagement users={users} onRefresh={async () => { const data = await api.getUsers(); setUsers(data || []); }} />} />
                <Route path="/admin/customers" element={<CustomerManagement />} />
                <Route path="/admin/fuel" element={<FuelManagement users={users} />} />
                
                {/* Profile */}
                <Route path="/profile" element={<UserProfile currentUser={user} onRefreshUser={() => {}} />} />
                <Route path="/profile/approvals" element={<ProfileApprovals currentUser={user} onUserUpdated={async () => { const data = await api.getUsers(); setUsers(data || []); }} />} />
                
                {/* Dashboards */}
                <Route path="/dashboard" element={<CompanyOverviewDashboard tickets={tickets} onNavigate={handleDashboardNavigate} />} />
                <Route path="/operations" element={<OperationsDashboard tickets={tickets} onNavigate={handleDashboardNavigate} />} />
                <Route path="/dispatch-manager" element={<DispatchManagerDashboard tickets={tickets} onNavigate={handleDashboardNavigate} />} />
                <Route path="/fleet" element={<FleetDashboardNew tickets={tickets} onNavigate={handleDashboardNavigate} />} />
                <Route path="/cs-manager" element={<CSManagerDashboard tickets={tickets} onNavigate={handleDashboardNavigate} />} />
                <Route path="/cs-quality" element={<CSQualityDashboard tickets={tickets} onNavigate={handleDashboardNavigate} />} />
                <Route path="/revenue" element={<RevenueDashboard tickets={tickets} onNavigate={handleDashboardNavigate} />} />
                <Route path="/fuel" element={<FuelDashboard tickets={tickets} onNavigate={handleDashboardNavigate} />} />
                <Route path="/dispatch-performance" element={<DispatchPerformanceDashboard tickets={tickets} currentUser={user} onNavigate={handleDashboardNavigate} />} />
                <Route path="/cs-review" element={<CSReviewDashboard tickets={tickets} currentUser={user} onNavigate={handleDashboardNavigate} />} />
                <Route path="/cs-task-queue" element={<CSTaskQueue tickets={tickets} currentUser={user} onNavigate={handleDashboardNavigate} />} />
                <Route path="/driver-dashboard" element={<DriverDashboardNew tickets={tickets} currentUser={user} onNavigate={handleDashboardNavigate} />} />
                <Route path="/driver-earnings" element={<DriverEarnings tickets={tickets} currentUser={user} />} />
                
                {/* Fallback */}
                <Route path="*" element={<Navigate to="/dashboard" />} />
            </Routes>
        );
    };

    const getHeaderTitle = () => {
        switch (activeTab) {
            case 'dispatch_board': return 'Bảng Điều vận';
            case 'dispatch_tracking': return 'Theo dõi Tổng quát';
            case 'dispatch_responses': return 'Phản hồi Lái xe';
            case 'dispatch_logs': return 'Lịch sử Phân công';
            case 'dispatch_sla': return 'Cấu hình SLA';
            case 'order_list': return 'Danh Sách Đơn Hàng';
            case 'cs_check': return isAccountant ? 'Kế Toán Đối Soát Phiếu' : 'CS Kiểm Tra / Phê Duyệt Phiếu';
            case 'ticket_corrections': return 'Yêu Cầu Sửa Đổi';
            case 'revenue_driver': return 'Bảng Kê Doanh Thu (Lái Xe)';
            case 'revenue_customer': return 'Bảng Kê Doanh Thu (Khách Hàng)';
            case 'salary': return 'Quản Lý Lương Lái Xe';
            case 'route_config': return 'Cấu Hình Tuyến Đường & Định Mức';
            case 'user_management': return 'Quản Lý Tài Khoản Hệ Thống';
            case 'fuel_management': return 'Quản Lý Nhiên Liệu';
            case 'settings': return 'Cài Đặt';
            case 'profile': return 'Hồ Sơ Của Tôi';
            case 'profile_approvals': return 'Phê Duyệt Hồ Sơ';
            case 'db_overview': return 'Tổng Quan Công Ty';
            case 'db_operations': return 'Vận Hành';
            case 'db_dispatch_mgr': return 'Dispatch Manager';
            case 'db_fleet': return 'Hiệu Suất Đội Xe';
            case 'db_cs_mgr': return 'CS Manager';
            case 'db_cs_quality': return 'Chất Lượng Dữ Liệu';
            case 'db_revenue': return 'Phân Tích Doanh Thu';
            case 'db_fuel': return 'Phân Tích Nhiên Liệu';
            case 'db_dispatch_perf': return 'Hiệu Suất Điều Vận';
            case 'db_cs_review': return 'CS Review';
            case 'db_cs_task_queue': return 'CS Task Queue';
            case 'db_driver': return 'Dashboard Lái Xe';
            case 'db_driver_earnings': return 'Thu Nhập Lái Xe';
            default: return 'Dashboard';
        }
    }

    // Helper to determine if a notification applies to the current user
    const isNotificationForUser = (n: any, role?: string) => {
        if (!role) return false;
        if (role === 'ADMIN') return true; // Admin sees all system notifications (as they inherit all roles)
        if (n.targetRole === 'ALL') return true;
        if (n.targetRole === role) return true;
        // Role mappings
        if (n.targetRole === 'DISPATCHER' && role === 'DV_LEAD') return true;
        if (n.targetRole === 'CS' && role === 'CS_LEAD') return true;
        // Driver specific check (n.targetRole contains username) is handled by fallback if targetRole equals username
        return false;
    };

    return (
        <div className="flex h-screen bg-slate-50 font-sans">
            {/* Sidebar */}
            <aside className="w-64 bg-[#0f172a] text-slate-300 flex flex-col shrink-0 border-r border-slate-800">
                {/* Logo / Brand */}
                <div className="px-5 py-4 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Truck size={18} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-white tracking-tight leading-none">DANALOG</h2>
                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest mt-0.5">Transport Manager</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto py-3 space-y-0.5">
                    {/* ── DASHBOARDS ── */}
                    {user?.role !== 'DRIVER' && (
                        <>
                        <div
                            className="mx-2 px-3 py-2 hover:bg-white/5 cursor-pointer transition-colors flex items-center gap-3 rounded-lg text-slate-300"
                            onClick={() => setIsDashboardOpen(!isDashboardOpen)}
                        >
                            <PieChart size={18} className="text-cyan-400 shrink-0" />
                            <span className="font-semibold flex-1 text-sm">Dashboards</span>
                            {isDashboardOpen ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
                        </div>
                        {isDashboardOpen && (
                            <div className="ml-4 border-l border-slate-800 pl-2 space-y-0.5 pb-1">
                                {/* Admin dashboards */}
                                {isAdmin && (
                                    <>
                                        <NavItem label="Tổng quan Công ty" active={activeTab === 'dashboard' || activeTab === 'db_overview'} onClick={() => navigate(revRouteMap['dashboard'])} indent />
                                        <NavItem label="Vận hành" active={activeTab === 'db_operations'} onClick={() => navigate(revRouteMap['db_operations'])} indent />
                                    </>
                                )}
                                {/* Dispatch Manager dashboards */}
                                {(isAdmin || isDVLead) && (
                                    <>
                                        <NavItem label="Dispatch Manager" active={activeTab === 'db_dispatch_mgr'} onClick={() => navigate(revRouteMap['db_dispatch_mgr'])} indent />
                                        <NavItem label="Hiệu suất Đội xe" active={activeTab === 'db_fleet'} onClick={() => navigate(revRouteMap['db_fleet'])} indent />
                                    </>
                                )}
                                {/* CS Manager dashboards */}
                                {(isAdmin || isCSLead) && (
                                    <>
                                        <NavItem label="CS Manager" active={activeTab === 'db_cs_mgr'} onClick={() => navigate(revRouteMap['db_cs_mgr'])} indent />
                                        <NavItem label="Chất lượng DL" active={activeTab === 'db_cs_quality'} onClick={() => navigate(revRouteMap['db_cs_quality'])} indent />
                                    </>
                                )}
                                {/* Finance dashboards */}
                                {(isAdmin || isAccountant || isCSLead || isCS) && (
                                    <>
                                        <NavItem label="Doanh thu" active={activeTab === 'db_revenue'} onClick={() => navigate(revRouteMap['db_revenue'])} indent />
                                        <NavItem label="Nhiên liệu" active={activeTab === 'db_fuel'} onClick={() => navigate(revRouteMap['db_fuel'])} indent />
                                    </>
                                )}
                                {/* Operator dashboards */}
                                {(isDispatcher || isDVLead) && (
                                    <NavItem label="Hiệu suất cá nhân" active={activeTab === 'db_dispatch_perf'} onClick={() => navigate(revRouteMap['db_dispatch_perf'])} indent />
                                )}
                                {(isCS || isCSLead) && (
                                    <>
                                        <NavItem label="CS Review" active={activeTab === 'db_cs_review'} onClick={() => navigate(revRouteMap['db_cs_review'])} indent />
                                        <NavItem label="CS Task Queue" active={activeTab === 'db_cs_task_queue'} onClick={() => navigate(revRouteMap['db_cs_task_queue'])} indent />
                                    </>
                                )}
                            </div>
                        )
                        }
                        </>
                    )}

                    {/* ── DISPATCH CENTER ── */}
                    {canViewDispatch && (
                        <>
                            <div className="pt-4 pb-1 px-5"><span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Điều phối</span></div>
                            <div
                                className="mx-2 px-3 py-2 hover:bg-white/5 cursor-pointer transition-colors flex items-center gap-3 rounded-lg text-slate-300"
                                onClick={() => setIsDispatchOpen(!isDispatchOpen)}
                            >
                                <Truck size={18} className="text-blue-400 shrink-0" />
                                <span className="font-semibold flex-1 text-sm">Trung tâm Điều phối</span>
                                {isDispatchOpen ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
                            </div>
                            {isDispatchOpen && (
                                <div className="ml-4 border-l border-slate-800 pl-2 space-y-0.5 pb-1">
                                    <NavItem label="Bảng điều vận" active={activeTab === 'dispatch_board'} onClick={() => navigate(revRouteMap['dispatch_board'])} indent />
                                    <NavItem label="Theo dõi tổng quát" active={activeTab === 'dispatch_tracking'} onClick={() => navigate(revRouteMap['dispatch_tracking'])} indent />
                                    <NavItem label="Phản hồi lái xe" active={activeTab === 'dispatch_responses'} onClick={() => navigate(revRouteMap['dispatch_responses'])} indent />
                                    <NavItem label="Lịch sử phân công" active={activeTab === 'dispatch_logs'} onClick={() => navigate(revRouteMap['dispatch_logs'])} indent />
                                    <NavItem label="Cấu hình SLA" active={activeTab === 'dispatch_sla'} onClick={() => navigate(revRouteMap['dispatch_sla'])} indent />
                                </div>
                            )}
                        </>
                    )}

                    {/* ── CS / ĐƠN HÀNG ── */}
                    {canViewCS && (
                        <>
                            <div className="pt-4 pb-1 px-5"><span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">CS / Đơn hàng</span></div>
                            <div
                                className="mx-2 px-3 py-2 hover:bg-white/5 cursor-pointer transition-colors flex items-center gap-3 rounded-lg text-slate-300"
                                onClick={() => setIsCSOpen(!isCSOpen)}
                            >
                                <Users size={18} className="text-emerald-400 shrink-0" />
                                <span className="font-semibold flex-1 text-sm">Quản lý Đơn hàng</span>
                                {isCSOpen ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
                            </div>
                            {isCSOpen && (
                                <div className="ml-4 border-l border-slate-800 pl-2 space-y-0.5 pb-1">
                                    <NavItem label="Danh sách Đơn hàng" active={activeTab === 'order_list'} onClick={() => navigate(revRouteMap['order_list'])} indent />
                                    <NavItem label="CS kiểm tra phiếu" active={activeTab === 'cs_check'} onClick={() => navigate(revRouteMap['cs_check'])} indent />
                                    <NavItem label="Yêu cầu sửa đổi" active={activeTab === 'ticket_corrections'} onClick={() => navigate(revRouteMap['ticket_corrections'])} indent />
                                </div>
                            )}
                        </>
                    )}

                    {/* ── BÁO CÁO ── */}
                    {(canViewCS || canViewFinance) && (
                        <>
                            <div className="pt-4 pb-1 px-5"><span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Báo cáo</span></div>
                            <div
                                className="mx-2 px-3 py-2 hover:bg-white/5 cursor-pointer transition-colors flex items-center gap-3 rounded-lg text-slate-300"
                                onClick={() => setIsRevenueOpen(!isRevenueOpen)}
                            >
                                <BarChart3 size={18} className="text-amber-400 shrink-0" />
                                <span className="font-semibold flex-1 text-sm">Doanh thu vận tải</span>
                                {isRevenueOpen ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
                            </div>
                            {isRevenueOpen && (
                                <div className="ml-4 border-l border-slate-800 pl-2 space-y-0.5 pb-1">
                                    <NavItem label="Theo lái xe" active={activeTab === 'revenue_driver'} onClick={() => navigate(revRouteMap['revenue_driver'])} indent />
                                    <NavItem label="Theo khách hàng" active={activeTab === 'revenue_customer'} onClick={() => navigate(revRouteMap['revenue_customer'])} indent />
                                </div>
                            )}
                            <NavItem label="Bảng kê Lương" icon={<Shield size={18} />} active={activeTab === 'salary'} onClick={() => navigate(revRouteMap['salary'])} />
                        </>
                    )}

                    {/* ── QUẢN LÝ ── */}
                    {(canViewCS || canViewDispatch || canViewFinance || isAdmin) && (
                        <>
                            <div className="pt-4 pb-1 px-5"><span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Quản lý</span></div>
                            {canViewCS && (
                                <>
                                    <NavItem label="Cấu hình Tuyến" icon={<MapIcon size={18} />} active={activeTab === 'route_config'} onClick={() => navigate(revRouteMap['route_config'])} />
                                    <NavItem label="Khách hàng" icon={<Users size={18} />} active={activeTab === 'customer_management'} onClick={() => navigate(revRouteMap['customer_management'])} />
                                </>
                            )}
                            {(canViewCS || canViewDispatch || canViewFinance) && (
                                <NavItem label="Nhiên liệu" icon={<Fuel size={18} />} active={activeTab === 'fuel_management'} onClick={() => navigate(revRouteMap['fuel_management'])} />
                            )}
                            {isAdmin && (
                                <NavItem label="Quản lý Tài khoản" icon={<Shield size={18} />} active={activeTab === 'user_management'} onClick={() => navigate(revRouteMap['user_management'])} />
                            )}
                        </>
                    )}

                    {/* ── CÁ NHÂN ── */}
                    <div className="pt-4 pb-1 px-5"><span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Cá nhân</span></div>
                    <NavItem label="Hồ sơ của tôi" icon={<Users size={18} />} active={activeTab === 'profile'} onClick={() => navigate(revRouteMap['profile'])} />
                    {canApproveProfiles && (
                        <NavItem label="Duyệt hồ sơ" icon={<Shield size={18} />} active={activeTab === 'profile_approvals'} onClick={() => navigate(revRouteMap['profile_approvals'])} />
                    )}
                </nav>

                {/* User footer */}
                <div className="p-3 border-t border-slate-800">
                    <div className="flex items-center gap-3 px-2 py-1.5 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                            <img src={`https://ui-avatars.com/api/?name=${user?.name}&background=random&size=32`} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-200 truncate">{user?.name}</p>
                            <p className="text-[10px] text-slate-500 truncate">{ROLE_LABELS[user?.role as UserRole] || user?.role}</p>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors font-medium"
                    >
                        <LogOut size={14} />
                        Đăng xuất
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden">
                <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center z-10 shadow-sm gap-4">
                    <h2 className="text-xl font-bold text-slate-800 flex-1">
                        {getHeaderTitle()}
                    </h2>
                    
                    {canViewCS && (
                        <button 
                            onClick={() => setIsOrderFormOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm transition-colors"
                        >
                            Tạo Đơn Hàng
                        </button>
                    )}

                    <div className="flex items-center gap-6 border-l border-slate-200 pl-6 ml-2">
                        <NotificationDropdown
                            notifications={notifications.filter(n => isNotificationForUser(n, user?.role))}
                            onRead={handleMarkNotificationRead}
                            onReadAll={handleReadAllNotifications}
                            onNavigate={handleNotificationNavigate}
                            onDelete={async (id) => {
                                try {
                                    await api.deleteNotification(id);
                                    setNotifications(prev => prev.filter(n => n.id !== id));
                                } catch (e) {
                                    console.error("Failed to delete notification", e);
                                }
                            }}
                            onDeleteAll={async () => {
                                try {
                                    await api.deleteAllNotifications(user?.role);
                                    const newNotifs = await api.getNotifications();
                                    setNotifications(newNotifs || []);
                                } catch (e) {
                                    console.error("Failed to delete all notifications", e);
                                }
                            }}
                        />
                        
                        <div
                            className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => navigate(revRouteMap['profile'])}
                        title="Vào trang cá nhân"
                    >
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold overflow-hidden">
                            <img src={`https://ui-avatars.com/api/?name=${user?.name}&background=random`} alt={user?.name} className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-700">{user?.name}</p>
                            <p className="text-xs text-slate-500">
                                {ROLE_LABELS[user?.role as UserRole] || user?.role}
                            </p>
                        </div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-auto p-8">
                    {renderContent()}
                </div>

                <ChangePasswordModal
                    isOpen={isChangePasswordOpen}
                    onClose={() => setIsChangePasswordOpen(false)}
                    username={user?.username || ''}
                />

                <OrderCreationForm
                    isOpen={isOrderFormOpen}
                    onClose={() => setIsOrderFormOpen(false)}
                    routeConfigs={routeConfigs}
                    currentUser={user}
                    onSuccess={() => {
                        api.getTickets().then(data => setTickets(data || []));
                    }}
                />
            </main>
        </div>
    )
}

function NavItem({ label, active, onClick, indent, indentDouble, icon }: any) {
    return (
        <div
            onClick={onClick}
            className={`
                relative cursor-pointer select-none transition-all duration-150 py-2 pr-3 flex items-center gap-2.5 mx-2 rounded-lg text-[13px]
                ${indent ? 'pl-4' : indentDouble ? 'pl-8' : 'pl-3'}
                ${active
                    ? 'bg-blue-600/15 text-blue-400 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }
            `}
        >
            {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-blue-500 rounded-r-full"></div>
            )}
            {icon && <span className={active ? 'text-blue-400' : 'text-slate-500'}>{icon}</span>}
            <span className="truncate">{label}</span>
        </div>
    )
}

function StatCard({ label, value, subtext, color }: any) {
    const colors = {
        blue: "bg-blue-50 text-blue-600",
        green: "bg-emerald-50 text-emerald-600",
        orange: "bg-orange-50 text-orange-600",
    }
    return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-sm font-medium text-slate-500 mb-1">{label}</p>
            <h3 className="text-3xl font-bold text-slate-900 mb-2">{value}</h3>
            <p className={`text-xs inline-block px-2 py-1 rounded-full font-medium ${colors[color as keyof typeof colors]}`}>{subtext}</p>
        </div>
    )
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppContent />
            </AuthProvider>
        </BrowserRouter>
    )
}

export default App
