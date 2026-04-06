import React, { useState, useEffect } from 'react';
import { List, FileText, User, Home, Droplet } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { HomeMobile } from './HomeMobile';
import { TicketListMobile } from './TicketListMobile';
import { FuelTicketMobile } from './FuelTicketMobile'; 
import { DriverProfileMobile } from './DriverProfileMobile';
import { SalarySlipMobile } from './SalarySlipMobile';
import { ChangePasswordModal } from '../ChangePasswordModal';
import { NotificationDropdown } from '../NotificationDropdown';
import { api } from '../../services/api';

type DriverTab = 'home' | 'history' | 'fuel' | 'salary' | 'account';

interface MobileDriverDashboardProps {
    tickets: any[];
    onUpdateTickets: (tickets: any[]) => void;
    onCreateTicket?: (ticket: any) => Promise<void>;
    routeConfigs: any[];
    notifications: any[];
    publishedSalaries: any[];
}

// Dispatch notification component
// The DispatchNotifications code was moved to HomeMobile.tsx

export const MobileDriverDashboard: React.FC<MobileDriverDashboardProps> = ({
    tickets,
    onUpdateTickets,
    routeConfigs,
    notifications,
    publishedSalaries
}) => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<DriverTab>('home');
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);
    const [localNotifications, setLocalNotifications] = useState(notifications);

    useEffect(() => {
        setLocalNotifications(notifications);
    }, [notifications]);

    // Check for pending dispatch responses
    useEffect(() => {
        api.getDriverResponses().then(responses => {
            const mine = responses.filter((r: any) => r.driverId === user?.username && r.response === 'PENDING');
            setPendingCount(mine.length);
        }).catch(() => { });
    }, [user, tickets]);

    const handleRefresh = () => {
        api.getDriverResponses().then(responses => {
            const mine = responses.filter((r: any) => r.driverId === user?.username && r.response === 'PENDING');
            setPendingCount(mine.length);
        }).catch(() => { });
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'home':
                return <HomeMobile tickets={tickets} currentUser={user} onRefresh={handleRefresh} onNavigate={(tab: any) => setActiveTab(tab)} />;
            case 'history':
                return <TicketListMobile tickets={tickets} onUpdateTickets={onUpdateTickets} routeConfigs={routeConfigs} onCreateNew={() => {}} />;
            case 'fuel':
                return <FuelTicketMobile />;
            case 'salary':
                return <SalarySlipMobile tickets={tickets} notifications={localNotifications} routeConfigs={routeConfigs} publishedSalaries={publishedSalaries} />;
            case 'account':
                return <DriverProfileMobile />;
            default:
                return null;
        }
    };

    const handleNotificationNavigate = (_relatedId: string, type: string) => {
        let nType = type.toUpperCase();
        if (nType.includes('SALARY')) {
            setActiveTab('salary');
        } else if (nType.includes('FUEL')) {
            setActiveTab('fuel');
        } else if (nType.includes('PROFILE')) {
            setActiveTab('account');
        } else {
            setActiveTab('home');
        }
    };

    return (
        <div className="fixed inset-0 w-full h-[100dvh] bg-slate-50 flex flex-col overflow-hidden">
            {/* Header */}
            <header className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-4 shadow-md flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg text-white border-2 border-white/50 overflow-hidden shadow-inner">
                        <img src={`https://ui-avatars.com/api/?name=${user?.name}&background=random`} alt={user?.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                        <p className="text-[10px] text-blue-200 uppercase tracking-widest font-semibold mb-0.5">Lái Xe</p>
                        <p className="text-sm font-bold leading-tight">{user?.name}</p>
                        {user?.licensePlate && (
                            <p className="text-xs text-white/80 font-mono mt-0.5">{user.licensePlate}</p>
                        )}
                    </div>
                </div>
                <div className="flex items-center">
                    <NotificationDropdown
                        notifications={localNotifications.filter(n => n.to === user?.username || n.targetRole === 'DRIVER')}
                        onRead={async (id) => {
                            await api.markNotificationRead(id as any);
                            setLocalNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
                        }}
                        onReadAll={() => {
                            setLocalNotifications(prev => prev.map(n => ({ ...n, read: true })));
                        }}
                        onNavigate={handleNotificationNavigate}
                        onDelete={async (id) => {
                            await api.deleteNotification(id);
                            setLocalNotifications(prev => prev.filter(n => n.id !== id));
                        }}
                        onDeleteAll={async () => {
                            await api.deleteAllNotifications(user?.username); // Delete driver's notifications
                            const data = await api.getNotifications();
                            setLocalNotifications(data || []);
                        }}
                    />
                </div>
            </header>

            {/* Content Area */}
            <main className="flex-1 overflow-y-auto p-4 pb-20">
                {renderContent()}
            </main>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around items-center p-2 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50">
                <NavBtn
                    icon={<Home size={22} className={activeTab === 'home' ? 'fill-blue-50' : ''} />}
                    label="Trang chủ"
                    active={activeTab === 'home'}
                    onClick={() => setActiveTab('home')}
                    hasNotification={pendingCount > 0}
                />
                <NavBtn
                    icon={<List size={22} />}
                    label="Chuyến đi"
                    active={activeTab === 'history'}
                    onClick={() => setActiveTab('history')}
                />
                <NavBtn
                    icon={<Droplet size={22} className={activeTab === 'fuel' ? 'fill-blue-50' : ''} />}
                    label="Phiếu NL"
                    active={activeTab === 'fuel'}
                    onClick={() => setActiveTab('fuel')}
                />
                <NavBtn
                    icon={<FileText size={22} className={activeTab === 'salary' ? 'fill-blue-50' : ''} />}
                    label="Lương"
                    active={activeTab === 'salary'}
                    onClick={() => setActiveTab('salary')}
                    hasNotification={false}
                />
                <NavBtn
                    icon={<User size={22} className={activeTab === 'account' ? 'fill-blue-50' : ''} />}
                    label="Tài khoản"
                    active={activeTab === 'account'}
                    onClick={() => setActiveTab('account')}
                />
            </nav>

            {/* Change Password Modal */}
            <ChangePasswordModal
                isOpen={isChangePasswordOpen}
                onClose={() => setIsChangePasswordOpen(false)}
                username={user?.username || ''}
            />
        </div>
    );
};

interface NavBtnProps {
    icon: React.ReactNode;
    label: string;
    active: boolean;
    onClick: () => void;
    hasNotification?: boolean;
}

const NavBtn: React.FC<NavBtnProps> = ({ icon, label, active, onClick, hasNotification }) => (
    <button
        onClick={onClick}
        className={`flex flex-col items-center gap-1 flex-1 py-1 transition-colors relative ${active ? 'text-blue-600' : 'text-slate-400'
            }`}
    >
        <div className="relative">
            {icon}
            {hasNotification && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
            )}
        </div>
        <span className="text-[10px] font-medium uppercase tracking-tight">{label}</span>
        {active && <div className="w-1 h-1 rounded-full bg-blue-600 mt-0.5"></div>}
    </button>
);
