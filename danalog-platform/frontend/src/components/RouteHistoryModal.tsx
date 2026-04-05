import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { api } from '../services/api';

interface RouteHistoryModalProps {
    routeId: string | null;
    routeName: string | null;
    isOpen: boolean;
    onClose: () => void;
}

export function RouteHistoryModal({ routeId, routeName, isOpen, onClose }: RouteHistoryModalProps) {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && routeId) {
            setLoading(true);
            api.getRouteHistory(routeId)
                .then(data => {
                    setHistory(data);
                })
                .catch(err => console.error("Failed to load history", err))
                .finally(() => setLoading(false));
        }
    }, [isOpen, routeId]);

    if (!isOpen) return null;

    const getActionStyle = (action: string) => {
        if (action === 'UPDATE') return 'text-blue-600 bg-blue-50 border-blue-200';
        if (action === 'BULK_IMPORT') return 'text-purple-600 bg-purple-50 border-purple-200';
        return 'text-slate-600 bg-slate-50 border-slate-200';
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100">
                    <h3 className="text-xl font-bold text-[#1e3a8a] uppercase">
                        LỊCH SỬ THAY ĐỔI
                    </h3>
                    <p className="text-sm text-slate-500 truncate max-w-md">{routeName}</p>
                </div>

                <div className="p-8 relative max-h-[60vh] overflow-y-auto">
                    {/* Vertical Line */}
                    <div className="absolute left-[54px] top-8 bottom-8 w-px bg-slate-200"></div>

                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {history.length === 0 && <p className="text-center text-slate-500 italic">Chưa có lịch sử thay đổi.</p>}

                            {history.map((item, idx) => (
                                <div key={idx} className="relative flex gap-6">
                                    {/* Timeline Icon */}
                                    <div className="relative z-10 w-10 h-10 rounded-full border-2 border-slate-200 bg-white flex items-center justify-center text-slate-400 shrink-0">
                                        <Clock size={20} />
                                    </div>

                                    {/* Content Card */}
                                    <div className={`flex-1 border rounded-2xl p-4 shadow-sm ${getActionStyle(item.action)}`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold">
                                                {item.action === 'UPDATE' ? 'Cập nhật' : item.action}
                                            </h4>
                                            <span className="text-xs opacity-70 ml-2">
                                                {new Date(item.timestamp).toLocaleString('vi-VN')}
                                            </span>
                                        </div>
                                        <div className="text-sm mb-1 opacity-90">
                                            Người thực hiện: <span className="font-semibold">{item.user}</span>
                                        </div>
                                        <div className="text-sm italic opacity-80 break-words">
                                            {item.details}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-center">
                    <button
                        onClick={onClose}
                        className="w-full bg-slate-200 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-300 transition-colors"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
}
