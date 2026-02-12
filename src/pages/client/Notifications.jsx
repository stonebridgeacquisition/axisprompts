import React from 'react';
import { Bell } from 'lucide-react';

const ClientNotifications = () => {
    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
                <p className="text-gray-500">System alerts and order updates.</p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="p-6 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors flex gap-4">
                        <div className="mt-1">
                            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                <Bell size={16} />
                            </div>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-900">New Order Recieved</p>
                            <p className="text-sm text-gray-500 mt-1">Order #302{i} has been paid for and is ready for processing.</p>
                            <p className="text-xs text-gray-400 mt-2">2 hours ago</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ClientNotifications;
