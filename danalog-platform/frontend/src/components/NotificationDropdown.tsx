import { useState, useEffect } from 'react';
import { Bell, Check, Clock, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { AppNotification } from '../types';

interface NotificationDropdownProps {
    notifications: AppNotification[];
    onRead: (id: string) => void;
    onReadAll: () => void;
    onNavigate?: (relatedId: string, type: string, message: string) => void;
    onDelete: (id: string) => void;
    onDeleteAll: () => void;
}

export function NotificationDropdown({ notifications, onRead, onReadAll, onNavigate, onDelete, onDeleteAll }: NotificationDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    
    // Auto-close if clicked outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (isOpen && !(e.target as Element).closest('#notification-bell-container')) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const unreadCount = notifications.filter(n => !n.read).length;

    const getIcon = (type: string) => {
        switch (type) {
            case 'SUCCESS': return <Check size={16} className="text-green-500" />;
            case 'WARNING': return <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>;
            case 'ERROR': return <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>;
            default: return <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>;
        }
    };

    return (
        <div id="notification-bell-container" className="relative">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-slate-300 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
                title="Thông báo"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse border border-[#0f172a]"></span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-[100] animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            Thông báo
                            {unreadCount > 0 && (
                                <span className="bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded-full font-bold">
                                    {unreadCount} mới
                                </span>
                            )}
                        </h4>
                        <div className="flex items-center gap-3">
                            {unreadCount > 0 && (
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onReadAll();
                                    }}
                                    className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
                                >
                                    Đánh dấu đã đọc
                                </button>
                            )}
                            {notifications.length > 0 && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm("Bạn có chắc muốn xóa tất cả thông báo?")) {
                                            onDeleteAll();
                                        }
                                    }}
                                    className="text-xs text-red-500 hover:text-red-700 font-semibold flex items-center gap-1"
                                >
                                    <Trash2 size={12}/> Xóa tất cả
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="max-h-[60vh] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="px-4 py-8 text-center" onClick={() => setIsOpen(false)}>
                                <Bell className="mx-auto h-8 w-8 text-slate-200 empty-state-icon mb-2" />
                                <p className="text-slate-500 text-sm font-medium">Bạn chưa có thông báo nào</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-slate-100">
                                {notifications.map(notif => (
                                    <li 
                                        key={notif.id}
                                        onClick={() => {
                                            if (!notif.read) onRead(notif.id);
                                            if (onNavigate && notif.relatedId) {
                                                onNavigate(notif.relatedId, notif.type, notif.message);
                                            }
                                            setIsOpen(false);
                                        }}
                                        className={`group px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors ${!notif.read ? 'bg-blue-50/30' : ''}`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="mt-1 shrink-0">
                                                {getIcon(notif.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm text-slate-700 leading-snug ${!notif.read ? 'font-bold' : ''}`}>
                                                    {notif.message}
                                                </p>
                                                <div className="flex items-center gap-1 mt-1 text-slate-400">
                                                    <Clock size={10} />
                                                    <span className="text-[10px] uppercase font-semibold">
                                                        {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: vi })}
                                                    </span>
                                                </div>
                                            </div>
                                            {!notif.read && (
                                                <div className="shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                                            )}
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDelete(notif.id);
                                                }}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all ml-1 shrink-0"
                                                title="Xóa thông báo này"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    
                    <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 text-center">
                        <button 
                            className="text-xs text-slate-500 hover:text-slate-700 font-semibold"
                            onClick={() => setIsOpen(false)}
                        >
                            Đóng
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
