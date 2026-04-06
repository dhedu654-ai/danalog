import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const file = path.join(__dirname, 'src/App.tsx');
let source = fs.readFileSync(file, 'utf8');

// 1. Imports
source = source.replace("import { useState, useEffect } from 'react'", "import { useState, useEffect } from 'react'\nimport { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate, Link } from 'react-router-dom'");

// 2. Add routesMap before AppContent
const maps = `
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
`;

// Insert the maps just above "function AppContent() {"
source = source.replace('function AppContent() {', maps + '\nfunction AppContent() {');


// Remove activeTab useState
source = source.replace(/const \[activeTab, setActiveTab\] = useState<TabType>\('dashboard'\);\r?\n/, '');

// Add React Router hooks inside AppContent
// We will replace `const isAdmin = ...` the first hook-like area to inject our hooks.
source = source.replace('    const { user, logout, isAuthenticated, isLoading } = useAuth();', '    const { user, logout, isAuthenticated, isLoading } = useAuth();\n    const navigate = useNavigate();\n    const location = useLocation();\n    const activeTab = routeToTabMap[location.pathname] || \'dashboard\';');

// handleDashboardNavigate
source = source.replace(
    'setActiveTab(tab as TabType);',
    'navigate(revRouteMap[tab] || \'/dashboard\');'
);

// handleNotificationNavigate
source = source.replace(
    'setActiveTab(targetTab);',
    'navigate(revRouteMap[targetTab] || \'/dashboard\');'
);


// Rewrite NavItems to use navigate and location.pathname
// Existing onClick={() => setActiveTab('something')}
source = source.replace(/onClick=\{\(\) => setActiveTab\('([^']+)'\)\}/g, "onClick={() => navigate(revRouteMap['$1'])}");

// Extract the literal switch implementation and replace it
// Since it's too risky to rely purely on regex for the massive switch statement, 
// I'll replace renderContent completely.
const renderContentOldRegex = /const renderContent = \(\) => \{\s*switch \(activeTab\) \{.*?(?=const getHeaderTitle)/s;

const renderContentNew = `const renderContent = () => {
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

    `;

source = source.replace(renderContentOldRegex, renderContentNew);

// Finally wrap App with BrowserRouter
source = source.replace('function App() {\\n    return (\\n        <AuthProvider>\\n            <AppContent />\\n        </AuthProvider>\\n    )\\n}', 'function App() {\\n    return (\\n        <BrowserRouter>\\n            <AuthProvider>\\n                <AppContent />\\n            </AuthProvider>\\n        </BrowserRouter>\\n    )\\n}');
// Regex based wrapper as \n formatting might differ
source = source.replace(/function App\(\) \{\s*return \(\s*<AuthProvider>\s*<AppContent \/>\s*<\/AuthProvider>\s*\)\s*\}/, "function App() {\\n    return (\\n        <BrowserRouter>\\n            <AuthProvider>\\n                <AppContent />\\n            </AuthProvider>\\n        </BrowserRouter>\\n    )\\n}");

fs.writeFileSync(file, source);
console.log('Refactor complete.');
