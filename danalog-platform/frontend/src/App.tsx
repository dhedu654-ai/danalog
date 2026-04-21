import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate, Link } from 'react-router-dom'
import { api } from './services/api'
import { LogOut, ChevronDown, ChevronRight, Users, Map as MapIcon, Shield, Fuel, Truck, BarChart3, PieChart, Menu, X, AlertTriangle } from 'lucide-react'
import { TicketList } from './components/TicketList'
import { CorrectionRequestList } from './components/CorrectionRequestList'
import { Calendar } from 'lucide-react'
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


import { AdminSchedule } from './components/ScheduleDashboards/AdminSchedule';
import { DispatchLeadSchedule } from './components/ScheduleDashboards/DispatchLeadSchedule';
import { DispatcherSchedule } from './components/ScheduleDashboards/DispatcherSchedule';
import { CSLeadSchedule } from './components/ScheduleDashboards/CSLeadSchedule';
import { CSStaffSchedule } from './components/ScheduleDashboards/CSStaffSchedule';

type TabType = 'dashboard' | 'cs_check' | 'ticket_corrections' | 'revenue_driver' | 'revenue_customer' | 'salary' | 'route_config' | 'settings' | 'user_management' | 'customer_management' | 'fuel_management' | 'dispatch_board' | 'dispatch_tracking' | 'dispatch_responses' | 'dispatch_logs' | 'profile' | 'profile_approvals' | 'order_list' | 'db_overview' | 'db_operations' | 'db_dispatch_mgr' | 'db_fleet' | 'db_cs_mgr' | 'db_cs_quality' | 'db_revenue' | 'db_fuel' | 'db_dispatch_perf' | 'db_cs_review' | 'db_cs_task_queue' | 'db_driver' | 'db_driver_earnings' | 'schedule';

const tabPathMap: Record<TabType, string> = {
    // Dashboards
    'dashboard': '/dashboard',
    'db_overview': '/dashboard-overview',
    'db_operations': '/operations',
    'db_dispatch_mgr': '/dispatch-manager',
    'db_fleet': '/fleet',
    'db_cs_mgr': '/cs-manager',
    'db_cs_quality': '/cs-quality',
    'db_revenue': '/revenue',
    'db_fuel': '/fuel-analysis',
    'db_dispatch_perf': '/performance',
    'db_cs_review': '/review',
    'db_cs_task_queue': '/task-queue',
    'db_driver': '/driver-dashboard',
    'db_driver_earnings': '/earnings',
    'schedule': '/schedule',
    
    // Dispatch
    'dispatch_board': '/board',
    'dispatch_tracking': '/tracking',
    'dispatch_responses': '/responses',
    'dispatch_logs': '/logs',
    
    // CS
    'order_list': '/orders',
    'cs_check': '/tickets',
    'ticket_corrections': '/corrections',
    
    // Finance
    'revenue_driver': '/revenue-driver',
    'revenue_customer': '/revenue-customer',
    'salary': '/salary',
    
    // Admin / Config
    'route_config': '/routes',
    'user_management': '/users',
    'customer_management': '/customers',
    'fuel_management': '/fuel',
    
    // Common
    'profile': '/profile',
    'profile_approvals': '/profile/approvals',
    'settings': '/settings',
};

const getRolePrefix = (role?: string) => {
    if (!role) return '';
    switch (role) {
        case 'ADMIN': return '/admin';
        case 'ACCOUNTANT': return '/ketoan';
        case 'DISPATCHER':
        case 'DV_LEAD': return '/dispatch';
        case 'CS':
        case 'CS_LEAD': return '/cs';
        case 'DRIVER': return '/driver';
        default: return '';
    }
};

const getTabFromPath = (path: string, prefix: string): TabType => {
    const relativePath = path.startsWith(prefix) ? path.slice(prefix.length) : path;
    const entry = Object.entries(tabPathMap).find(([_, p]) => p === relativePath);
    return (entry ? entry[0] : 'dashboard') as TabType;
};

const getRoutePath = (tab: TabType, prefix: string) => {
    return `${prefix}${tabPathMap[tab] || '/dashboard'}`;
};

function AppContent() {
    const { user, logout, isAuthenticated, isLoading, refreshUser } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    
    const prefix = getRolePrefix(user?.role);
    const activeTab = getTabFromPath(location.pathname, prefix);

    // RBAC Flags
    const isAdmin = user?.role === 'ADMIN';
    const isAccountant = user?.role === 'ACCOUNTANT';
    const isDVLead = user?.role === 'DV_LEAD';
    const isDispatcher = user?.role === 'DISPATCHER';
    const isCSLead = user?.role === 'CS_LEAD';
    const isCS = user?.role === 'CS';
    const isDriver = user?.role === 'DRIVER';

    const canViewDispatch = isAdmin || isDVLead || isDispatcher;
    const canViewCS = isAdmin || isCSLead || isCS;
    const canViewFinance = isAdmin || isAccountant;
    const canApproveProfiles = isAdmin || isDVLead || isCSLead || user?.role === 'KT_LEAD';

        const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
    const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);

    // State for expanding menus
    const [isDashboardOpen, setIsDashboardOpen] = useState(true);
    const [isDispatchOpen, setIsDispatchOpen] = useState(true);
    const [isCSOpen, setIsCSOpen] = useState(true);
    const [isRevenueOpen, setIsRevenueOpen] = useState(true);

    // Sidebar visibility state
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);

    // Auto-close sidebar on mobile when navigating
    useEffect(() => {
        if (window.innerWidth < 1024) {
            setIsSidebarOpen(false);
        }
    }, [location.pathname]);

    // Global Alert State (Slow Driver Responses)
    const [slowResponses, setSlowResponses] = useState<any[]>([]);
    const [alertDismissed, setAlertDismissed] = useState(false);
    const [dismissedKey, setDismissedKey] = useState<string>('');

    const checkSlowResponses = async () => {
        if (user?.role !== 'ADMIN' && user?.role !== 'DISPATCHER' && user?.role !== 'DV_LEAD') return;
        try {
            const responses = await api.getDriverResponses();
            const now = new Date();
            const slow = (responses || []).filter(r => {
                if (r.response !== 'PENDING') return false;
                const sentTime = new Date(r.timestamp);
                const diffMins = (now.getTime() - sentTime.getTime()) / (1000 * 60);
                return diffMins > 30;
            });
            setSlowResponses(slow);
            if (slow.length > 0) {
                const currentKey = slow.map(r => r.id).sort().join(',');
                // Only re-show alert if the set of slow IDs has changed since user dismissed
                setDismissedKey(prevKey => {
                    if (prevKey && prevKey === currentKey) {
                        // Same set of IDs as before — keep dismissed
                        return prevKey;
                    }
                    // New/different set of slow IDs — force alert to show again
                    setAlertDismissed(false);
                    return prevKey; // keep old key until user dismisses again
                });

                // Shoot a Notification to Backend so the badge shows
                try {
                    const existingNotis = await api.getNotifications();
                    let updated = false;
                    for (const w of slow) {
                        const alreadyEscalated = existingNotis.some((n: any) => 
                            n.relatedId === w.ticketId && 
                            n.message.includes('quá 30 phút') &&
                            new Date(n.createdAt).getTime() > new Date(w.sentAt).getTime()
                        );
                        if (!alreadyEscalated) {
                            await api.createNotification({
                                type: 'WARNING',
                                message: `Lái xe ${w.driverName} chưa phản hồi lệnh ${w.ticketId?.slice(-8)} quá 30 phút!`,
                                targetRole: 'DISPATCHER',
                                relatedId: w.ticketId,
                                read: false,
                                createdAt: new Date().toISOString()
                            });
                            updated = true;
                        }
                    }
                    if (updated) {
                        const newNotis = await api.getNotifications();
                        setNotifications(newNotis || []);
                    }
                } catch (err) {
                    console.error('Failed to create slow response notification log', err);
                }
            } else {
                // No slow responses — reset everything
                setAlertDismissed(false);
                setDismissedKey('');
            }
        } catch (e) {
            console.error("Failed to check slow responses", e);
        }
    };

    // Update sidebar state on resize
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) {
                setIsSidebarOpen(true);
            } else {
                setIsSidebarOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        
        // Initial check and periodic check for slow responses
        checkSlowResponses();
        const interval = setInterval(checkSlowResponses, 60000); // every minute

        return () => {
            window.removeEventListener('resize', handleResize);
            clearInterval(interval);
        };
    }, [user?.role]);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    // Dashboard navigation handler — passed to dashboard components for drill-down
    const handleDashboardNavigate = (tab: string, focusId?: string) => {
        navigate(getRoutePath(tab as TabType, prefix));
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

        // Refresh on Window Focus (SWR-style) to save Vercel requests instead of passive interval
        const handleFocus = () => {
            console.log('Window focused! Refreshing data...');
            fetchData();
            if (refreshUser) refreshUser();
        };
        window.addEventListener('focus', handleFocus);

        return () => window.removeEventListener('focus', handleFocus);
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
            <MobileDriverDashboard
                tickets={tickets}
                onUpdateTickets={handleUpdateTickets}
                onUpdateSingleTicket={handleUpdateSingleTicket}
                onCreateTicket={handleCreateTicket}
                routeConfigs={routeConfigs}
                notifications={notifications}
                publishedSalaries={publishedSalaries}
            />
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

    const handleNotifySalary = async (driverUsername: string, month: number, year: number, action: 'SEND_TO_ACCOUNTANT' | 'APPROVE_ACCOUNTANT' | 'REJECT_ACCOUNTANT' | 'PUBLISH_TO_DRIVER', reason?: string) => {
        try {
            let status = 'PENDING_ACCOUNTANT';
            if (action === 'APPROVE_ACCOUNTANT') status = 'APPROVED_ACCOUNTANT';
            else if (action === 'REJECT_ACCOUNTANT') status = 'REJECTED_ACCOUNTANT';
            else if (action === 'PUBLISH_TO_DRIVER') status = 'PUBLISHED';

            await api.publishSalary({
                driverUsername,
                month,
                year,
                status,
                publishedAt: new Date().toISOString()
            });

            if (action === 'REJECT_ACCOUNTANT') {
                await api.createNotification({
                    type: 'WARNING',
                    message: `Kế toán đã TỪ CHỐI bảng lương T${month}/${year} của ${driverUsername}. Lý do: ${reason}`,
                    targetRole: 'CS',
                    read: false,
                    createdAt: new Date().toISOString()
                });
            }

            // Update local state
            const publishedData = await api.getPublishedSalaries();
            setPublishedSalaries(publishedData);

            // Refresh notifications
            const notificationsData = await api.getNotifications();
            setNotifications(notificationsData);

            if (action === 'PUBLISH_TO_DRIVER') {
                alert(`Đã gửi thông báo lương cho lái xe ${driverUsername} tháng ${month}/${year}`);
            } else if (action === 'APPROVE_ACCOUNTANT') {
                alert(`Đã duyệt lương tháng ${month}/${year} của ${driverUsername}.`);
            } else if (action === 'REJECT_ACCOUNTANT') {
                alert(`Đã từ chối bảng lương tháng ${month}/${year} của ${driverUsername}.`);
            } else {
                alert(`Đã gửi báo cáo lương tháng ${month}/${year} lên Kế toán thành công.`);
            }
        } catch (error) {
            console.error("Failed to publish salary", error);
            alert("Lỗi khi gửi thông báo lương.");
        }
    };

    const handleBulkNotifySalary = async (driverUsernames: string[], month: number, year: number, action: 'SEND_TO_ACCOUNTANT' | 'APPROVE_ACCOUNTANT' | 'REJECT_ACCOUNTANT' | 'PUBLISH_TO_DRIVER', reason?: string) => {
        try {
            let status = 'PENDING_ACCOUNTANT';
            if (action === 'APPROVE_ACCOUNTANT') status = 'APPROVED_ACCOUNTANT';
            else if (action === 'REJECT_ACCOUNTANT') status = 'REJECTED_ACCOUNTANT';
            else if (action === 'PUBLISH_TO_DRIVER') status = 'PUBLISHED';

            for (const username of driverUsernames) {
                await api.publishSalary({
                    driverUsername: username,
                    month,
                    year,
                    status,
                    publishedAt: new Date().toISOString()
                });
            }

            if (action === 'REJECT_ACCOUNTANT') {
                await api.createNotification({
                    type: 'WARNING',
                    message: `Kế toán đã TỪ CHỐI bảng lương T${month}/${year} của ${driverUsernames.length} lái xe. Lý do: ${reason}`,
                    targetRole: 'CS',
                    read: false,
                    createdAt: new Date().toISOString()
                });
            }

            // Update local state
            const publishedData = await api.getPublishedSalaries();
            setPublishedSalaries(publishedData);

            // Refresh notifications
            const notificationsData = await api.getNotifications();
            setNotifications(notificationsData);

            if (action === 'PUBLISH_TO_DRIVER') {
                alert(`Đã gửi thông báo lương cho ${driverUsernames.length} lái xe thành công.`);
            } else if (action === 'APPROVE_ACCOUNTANT') {
                alert(`Đã duyệt báo cáo lương của ${driverUsernames.length} lái xe.`);
            } else if (action === 'REJECT_ACCOUNTANT') {
                alert(`Đã từ chối báo cáo lương của ${driverUsernames.length} lái xe.`);
            } else {
                alert(`Đã gửi báo cáo lương của ${driverUsernames.length} lái xe lên Kế toán thành công.`);
            }
        } catch (error) {
            console.error("Failed to bulk publish salary", error);
            alert("Lỗi khi gửi thông báo lương hàng loạt.");
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

    const handleNotificationNavigate = (relatedId: string, type: string, message?: string) => {
        if (!relatedId) return;
        
        let targetTab: TabType | null = null;
        if (relatedId.startsWith('ORD-')) {
            // Orders -> Dispatch Board (to see generated tickets) or CS Check
            targetTab = (isDispatcher || isDVLead || user?.role === 'ADMIN') ? 'dispatch_board' : 'cs_check';
        } else if (relatedId.startsWith('TK-') || relatedId.startsWith('CR-')) {
            // Tickets & Correction requests
            if (relatedId.startsWith('CR-') && canViewCS) targetTab = 'ticket_corrections';
            else if (isDispatcher || isDVLead) {
                targetTab = 'dispatch_board';
            }
            else if (user?.role === 'ADMIN') targetTab = 'cs_check'; // Admin better views full ticket in cs_check
            else if (user?.role === 'DRIVER') { /* handled in MobileDriverDashboard */ }
            else if (canViewCS) targetTab = 'cs_check';
        } else if (relatedId.startsWith('FUEL-')) {
            if (canViewCS || canViewDispatch || canViewFinance || user?.role === 'ADMIN') {
                targetTab = 'fuel_management';
            }
        }

        if (targetTab) {
            navigate(getRoutePath(targetTab, prefix));
            setFocusedTicketId(relatedId);
        }
    };

    const renderContent = () => {
        return (
            <Routes>
                {/* Fallback & Root Redirect to Role Prefix Base */}
                <Route path="/" element={<Navigate to={`${prefix}/schedule`} />} />
                <Route path="*" element={<Navigate to={`${prefix}/schedule`} />} />
                
                {/* ── ROLE PREFIX ROUTES ── */}
                <Route path={prefix}>
                    <Route path="" element={<Navigate to="schedule" />} />
                    <Route path="schedule" element={
                        isAdmin ? <AdminSchedule tickets={tickets} users={users} currentUser={user} /> :
                        isDVLead ? <DispatchLeadSchedule tickets={tickets} users={users} currentUser={user} /> :
                        isDispatcher ? <DispatcherSchedule tickets={tickets} users={users} currentUser={user} /> :
                        isCSLead ? <CSLeadSchedule tickets={tickets} users={users} currentUser={user} /> :
                        canViewCS ? <CSStaffSchedule tickets={tickets} currentUser={user} /> :
                        isAccountant ? <Navigate to={`${prefix}/tickets`} replace /> :
                        <Navigate to={`${prefix}/dashboard`} replace />
                    } />
                    
                    {/* Dispatch routes */}
                    {canViewDispatch && (
                        <>
                            <Route path="board" element={<DispatchBoard tickets={tickets} currentUser={user} onRefreshTickets={handleRefreshTickets} focusedTicketId={focusedTicketId} onClearFocus={() => setFocusedTicketId(null)} activeSubPage="board" />} />
                            <Route path="tracking" element={<DispatchBoard tickets={tickets} currentUser={user} onRefreshTickets={handleRefreshTickets} focusedTicketId={focusedTicketId} onClearFocus={() => setFocusedTicketId(null)} activeSubPage="tracking" />} />
                            <Route path="responses" element={<DispatchBoard tickets={tickets} currentUser={user} onRefreshTickets={handleRefreshTickets} focusedTicketId={focusedTicketId} onClearFocus={() => setFocusedTicketId(null)} activeSubPage="responses" />} />
                            <Route path="logs" element={<DispatchBoard tickets={tickets} currentUser={user} onRefreshTickets={handleRefreshTickets} focusedTicketId={focusedTicketId} onClearFocus={() => setFocusedTicketId(null)} activeSubPage="logs" />} />

                        </>
                    )}
                    
                    {/* CS / Orders */}
                    {(canViewCS || isAccountant) && (
                        <>
                            {canViewCS && <Route path="orders" element={<OrderList currentUser={user} onRefreshTickets={handleRefreshTickets} />} />}
                            <Route path="tickets" element={<TicketList tickets={tickets} onUpdateTickets={handleUpdateTickets} onUpdateTicket={handleUpdateSingleTicket} routeConfigs={routeConfigs} currentUser={user} focusedTicketId={focusedTicketId} onClearFocus={() => setFocusedTicketId(null)} />} />
                            {canViewCS && <Route path="corrections" element={<CorrectionRequestList currentUser={user} />} />}
                        </>
                    )}
                    
                    {/* Finance */}
                    {(canViewCS || canViewFinance) && (
                        <>
                            <Route path="revenue-driver" element={<DriverRevenueTable tickets={tickets} />} />
                            <Route path="revenue-customer" element={<CustomerRevenueTable tickets={tickets} />} />
                        </>
                    )}
                    {(canViewFinance || isAdmin || canViewCS) && (
                        <Route path="salary" element={<DriverSalaryTable tickets={tickets} routeConfigs={routeConfigs} publishedSalaries={publishedSalaries} users={users} onNotifySalary={handleNotifySalary} onBulkNotifySalary={handleBulkNotifySalary} currentUser={user} />} />
                    )}
                    
                    {/* Admin / Config */}
                    {(canViewCS || isAdmin || canViewDispatch || canViewFinance) && (
                        <>
                            {(canViewCS || isAccountant) && (
                                <Route path="routes" element={<RouteConfigList configs={routeConfigs} onUpdateConfigs={handleUpdateRouteConfigs} isReadOnly={user?.role === 'CS' || isAccountant} tickets={tickets} />} />
                            )}
                            {(canViewCS || isAdmin) && !isAccountant && (
                                <Route path="customers" element={<CustomerManagement />} />
                            )}
                            {(canViewCS || canViewDispatch || canViewFinance || isAdmin) && (
                                <Route path="fuel" element={<FuelManagement users={users} tickets={tickets} routeConfigs={routeConfigs} />} />
                            )}
                            {isAdmin && (
                                <Route path="users" element={<UserManagement users={users} onRefresh={async () => { const data = await api.getUsers(); setUsers(data || []); }} />} />
                            )}
                        </>
                    )}
                    
                    {/* Profile */}
                    <Route path="profile" element={<UserProfile currentUser={user} onRefreshUser={() => {}} />} />
                    {canApproveProfiles && (
                        <Route path="profile/approvals" element={<ProfileApprovals currentUser={user} onUserUpdated={async () => { const data = await api.getUsers(); setUsers(data || []); }} />} />
                    )}
                    
                    {/* Dashboards - Kept minimal as per requirement */}
                    <Route path="dashboard" element={<Navigate to="schedule" replace />} />
                </Route>
            </Routes>
        );
    };

    const getHeaderTitle = () => {
        switch (activeTab) {
            case 'dispatch_board': return 'Bảng Điều vận';
            case 'dispatch_tracking': return 'Theo dõi Tổng quát';
            case 'dispatch_responses': return 'Phản hồi Lái xe';
            case 'dispatch_logs': return 'Lịch sử Phân công';

            case 'schedule': return 'Lịch Điều Phối';
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
    const isNotificationForUser = (n: any, role?: string, username?: string) => {
        if (!role) return false;
        // User-specific notification (by username)
        if (n.to) {
            return username ? n.to === username : false;
        }
        // Admin sees all role-based notifications
        if (role === 'ADMIN') return true;
        if (n.targetRole === 'ALL') return true;
        if (n.targetRole === role) return true;
        // Role mappings
        if (n.targetRole === 'DISPATCHER' && role === 'DV_LEAD') return true;
        if (n.targetRole === 'CS' && role === 'CS_LEAD') return true;
        return false;
    };

    return (
        <div className="flex h-screen bg-slate-50 font-sans relative overflow-hidden">
            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 lg:relative lg:translate-x-0
                bg-[#0f172a] text-slate-300 flex flex-col shrink-0 border-r border-slate-800
                transition-all duration-300 ease-in-out
                ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full lg:w-0 lg:opacity-0 lg:border-none'}
            `}>
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
                                    <NavItem label="Lịch điều phối" active={activeTab === 'schedule'} onClick={() => navigate(getRoutePath('schedule', prefix))} indent />
                                    <NavItem label="Bảng điều vận" active={activeTab === 'dispatch_board'} onClick={() => navigate(getRoutePath('dispatch_board', prefix))} indent />
                                    <NavItem label="Phản hồi lái xe" active={activeTab === 'dispatch_responses'} onClick={() => navigate(getRoutePath('dispatch_responses', prefix))} indent />

                                </div>
                            )}
                        </>
                    )}

                    {/* ── CS / ĐƠN HÀNG ── */}
                    {(canViewCS || isAccountant) && (
                        <>
                            {isAccountant ? (
                                <>
                                    <div className="pt-4 pb-1 px-5"><span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Kiểm duyệt</span></div>
                                    <NavItem label="Danh sách phiếu" icon={<Users size={18} />} active={activeTab === 'cs_check'} onClick={() => navigate(getRoutePath('cs_check', prefix))} />
                                </>
                            ) : (
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
                                            {!canViewDispatch && (
                                                <NavItem label="Lịch điều phối" active={activeTab === 'schedule'} onClick={() => navigate(getRoutePath('schedule', prefix))} indent />
                                            )}
                                            <NavItem label="Danh sách Đơn hàng" active={activeTab === 'order_list'} onClick={() => navigate(getRoutePath('order_list', prefix))} indent />
                                            <NavItem label="CS kiểm tra phiếu" active={activeTab === 'cs_check'} onClick={() => navigate(getRoutePath('cs_check', prefix))} indent />
                                            <NavItem label="Yêu cầu sửa đổi" active={activeTab === 'ticket_corrections'} onClick={() => navigate(getRoutePath('ticket_corrections', prefix))} indent />
                                        </div>
                                    )}
                                </>
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
                                    <NavItem label="Theo lái xe" active={activeTab === 'revenue_driver'} onClick={() => navigate(getRoutePath('revenue_driver', prefix))} indent />
                                    <NavItem label="Theo khách hàng" active={activeTab === 'revenue_customer'} onClick={() => navigate(getRoutePath('revenue_customer', prefix))} indent />
                                </div>
                            )}
                            <NavItem label="Bảng kê Lương" icon={<Shield size={18} />} active={activeTab === 'salary'} onClick={() => navigate(getRoutePath('salary', prefix))} />
                        </>
                    )}

                    {/* ── QUẢN LÝ ── */}
                    {(canViewCS || canViewDispatch || canViewFinance || isAdmin) && (
                        <>
                            <div className="pt-4 pb-1 px-5"><span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Quản lý</span></div>
                            {(canViewCS || isAccountant) && (
                                <>
                                    <NavItem label="Cấu hình Tuyến" icon={<MapIcon size={18} />} active={activeTab === 'route_config'} onClick={() => navigate(getRoutePath('route_config', prefix))} />
                                    {!isAccountant && (
                                        <NavItem label="Khách hàng" icon={<Users size={18} />} active={activeTab === 'customer_management'} onClick={() => navigate(getRoutePath('customer_management', prefix))} />
                                    )}
                                </>
                            )}
                            {(canViewCS || canViewDispatch || canViewFinance) && (
                                <NavItem label="Nhiên liệu" icon={<Fuel size={18} />} active={activeTab === 'fuel_management'} onClick={() => navigate(getRoutePath('fuel_management', prefix))} />
                            )}
                            {isAdmin && (
                                <NavItem label="Quản lý Tài khoản" icon={<Shield size={18} />} active={activeTab === 'user_management'} onClick={() => navigate(getRoutePath('user_management', prefix))} />
                            )}
                        </>
                    )}

                    {/* ── CÁ NHÂN ── */}
                    <div className="pt-4 pb-1 px-5"><span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Cá nhân</span></div>
                    <NavItem label="Hồ sơ của tôi" icon={<Users size={18} />} active={activeTab === 'profile'} onClick={() => navigate(getRoutePath('profile', prefix))} />
                    {canApproveProfiles && (
                        <NavItem label="Duyệt hồ sơ" icon={<Shield size={18} />} active={activeTab === 'profile_approvals'} onClick={() => navigate(getRoutePath('profile_approvals', prefix))} />
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
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="bg-white border-b border-slate-200 px-4 lg:px-8 py-3 lg:py-4 flex justify-between items-center z-10 shadow-sm gap-4">
                    <div className="flex items-center gap-3 lg:gap-4 flex-1 min-w-0">
                        <button 
                            onClick={toggleSidebar}
                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                            title={isSidebarOpen ? "Đóng sidebar" : "Mở sidebar"}
                        >
                            <Menu size={20} />
                        </button>
                        <h2 className="text-lg lg:text-xl font-bold text-slate-800 truncate">
                            {getHeaderTitle()}
                        </h2>
                    </div>
                    
                    {canViewCS && !isAccountant && (
                        <button 
                            onClick={() => setIsOrderFormOpen(true)}
                            className="flex items-center gap-2 px-3 lg:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm lg:text-base font-bold rounded-lg shadow-sm transition-colors whitespace-nowrap"
                        >
                            <span className="hidden sm:inline">Tạo Đơn Hàng</span>
                            <span className="sm:hidden">+ Đơn</span>
                        </button>
                    )}

                    <div className="flex items-center gap-3 lg:gap-6 border-l border-slate-200 pl-3 lg:pl-6 ml-0">
                        <NotificationDropdown
                            notifications={notifications.filter(n => isNotificationForUser(n, user?.role, user?.username))}
                            onRead={handleMarkNotificationRead}
                            onReadAll={handleReadAllNotifications}
                            onNavigate={(id, type) => {
                                if (window.innerWidth < 1024) setIsSidebarOpen(false);
                                handleNotificationNavigate(id, type);
                            }}
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
                                    const idsToDelete = notifications.filter(n => isNotificationForUser(n, user?.role, user?.username)).map(n => n.id);
                                    if (idsToDelete.length > 0) {
                                        await api.deleteAllNotifications(idsToDelete);
                                        setNotifications(prev => prev.filter(n => !idsToDelete.includes(n.id)));
                                    }
                                } catch (e) {
                                    console.error("Failed to delete all notifications", e);
                                }
                            }}
                        />
                        
                        <div
                            className="flex items-center gap-2 lg:gap-4 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => navigate(getRoutePath('profile', prefix))}
                        title="Vào trang cá nhân"
                    >
                        <div className="w-8 lg:w-10 h-8 lg:h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold overflow-hidden shrink-0">
                            <img src={`https://ui-avatars.com/api/?name=${user?.name}&background=random`} alt={user?.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="hidden md:block">
                            <p className="text-sm font-bold text-slate-700">{user?.name}</p>
                            <p className="text-xs text-slate-500">
                                {ROLE_LABELS[user?.role as UserRole] || user?.role}
                            </p>
                        </div>
                        </div>
                    </div>
                </header>

                {/* Global Slow Response Warning */}
                {slowResponses.length > 0 && !alertDismissed && (user?.role === 'ADMIN' || user?.role === 'DISPATCHER' || user?.role === 'DV_LEAD') && (
                    <div 
                        className="bg-red-600 text-white px-4 lg:px-8 py-2.5 flex items-center justify-between shrink-0 overflow-hidden"
                    >
                        <div 
                            className="flex items-center gap-2 lg:gap-3 overflow-hidden cursor-pointer flex-1 hover:opacity-80 transition-opacity"
                            onClick={() => {
                                if (slowResponses.length === 1) {
                                    setFocusedTicketId(slowResponses[0].ticketId);
                                }
                                navigate(getRoutePath('dispatch_responses', prefix));
                            }}
                        >
                            <AlertTriangle size={18} className="shrink-0 animate-pulse" />
                            <span className="text-xs lg:text-sm font-bold truncate">
                                CẢNH BÁO: Có {slowResponses.length} lái xe chưa phản hồi phiếu quá 30 phút!
                            </span>
                            <div className="flex items-center gap-1 text-[10px] lg:text-xs font-bold uppercase tracking-widest whitespace-nowrap ml-2">
                                Xử lý ngay <ChevronRight size={14} />
                            </div>
                        </div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setAlertDismissed(true); setDismissedKey(slowResponses.map(r => r.id).sort().join(',')); }}
                            className="p-1 hover:bg-red-500 rounded transition-colors ml-3 shrink-0"
                            title="Tắt cảnh báo"
                        >
                            <X size={16} />
                        </button>
                    </div>
                )}

                <div className="flex-1 overflow-auto p-4 lg:p-8">
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
