
import React, { useState, useRef, useEffect } from 'react';
import { UserRole, AppNotification, Artwork } from '../types';
import { ArrowLeft, Bell, Check, Clock, Info, LogOut, User as UserIcon } from 'lucide-react';
import NotificationsModal from './NotificationsModal';
import NotificationDetailModal from './NotificationDetailModal';

interface HeaderProps {
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  activeTab: string;
  notifications: AppNotification[];
  onMarkRead: () => void;
  onLogout?: () => void;
  onViewProfile?: () => void;
  userName?: string;
  onBackToDashboard?: () => void;
  artworks: Artwork[];
  onViewArtwork: (id: string) => void;
}

const Header: React.FC<HeaderProps> = ({ userRole, setUserRole, activeTab, notifications, onMarkRead, onLogout, onViewProfile, userName, onBackToDashboard, artworks, onViewArtwork }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<AppNotification | null>(null);
  const unreadCount = notifications.filter(n => !n.isRead).length;
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleNotifications = () => {
    if (!showNotifications && unreadCount > 0) {
      onMarkRead();
    }
    setShowNotifications(!showNotifications);
  };

  const getTimeAgo = (timestamp: string) => {
    const diff = new Date().getTime() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between relative z-50">
      <div className="flex items-center space-x-3">
        {activeTab !== 'dashboard' && (
          <button
            onClick={onBackToDashboard}
            className="p-2 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <h2 className="text-lg font-semibold text-slate-800 capitalize">
          {activeTab.replace('-', ' ')}
        </h2>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 bg-slate-50 px-4 py-1.5 rounded-full border border-slate-100">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{userRole}</span>
        </div>
        
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={toggleNotifications}
            className={`relative p-2 rounded-full transition-all duration-200 hover:scale-105 transform ${showNotifications ? 'bg-slate-100 text-slate-800 shadow-md' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 hover:shadow-sm'}`}
          >
            {unreadCount > 0 && (
              <div className="min-w-[18px] h-[18px] bg-red-500 rounded-full absolute -top-0.5 -right-0.5 border-2 border-white flex items-center justify-center">
                <span className="text-[9px] font-black text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>
              </div>
            )}
            <Bell size={20} />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-200 shadow-2xl rounded-[1.5rem] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Recent Activity</h3>
                <span className="text-[10px] font-bold text-slate-400">{notifications.length} Logs</span>
              </div>
              
              <div className="max-h-[340px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-10 text-center">
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mx-auto mb-3">
                      <Check size={24} />
                    </div>
                    <p className="text-xs font-bold text-slate-400">All caught up!</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {notifications.map((n) => (
                      <button 
                        key={n.id} 
                        onClick={() => {
                          setSelectedNotification(n);
                          setShowNotifications(false);
                        }}
                        className={`w-full text-left p-4 hover:bg-slate-50 transition-colors flex items-start space-x-3 ${!n.isRead ? 'bg-blue-50/30' : ''}`}
                      >
                        <div className={`mt-0.5 p-1.5 rounded-lg ${
                          n.type === 'inventory' ? 'bg-blue-100 text-blue-600' : 
                          n.type === 'sales' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'
                        }`}>
                          <Info size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 leading-tight">{n.title}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                          <div className="flex items-center space-x-1.5 mt-2 text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                            <Clock size={10} />
                            <span>{getTimeAgo(n.timestamp)}</span>
                          </div>
                        </div>
                        {!n.isRead && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5"></div>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => { setShowNotifications(false); setShowAllNotifications(true); }}
                className="w-full px-5 py-3 text-[11px] font-bold text-indigo-600 border-t border-slate-100 bg-white hover:bg-indigo-50/60 hover:text-indigo-700 uppercase tracking-widest"
              >
                View All
              </button>
            </div>
          )}
        </div>

        <div className="h-8 w-px bg-slate-200"></div>

        <div className="relative" ref={userMenuRef}>
          <button 
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-3 p-1 pr-3 rounded-full hover:bg-slate-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white text-[10px] font-black">
              {userName ? userName.charAt(0) : 'U'}
            </div>
            <div className="text-left hidden lg:block">
              <p className="text-xs font-bold text-slate-800">{userName || 'User'}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Session Active</p>
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-3 w-56 bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="p-4 border-b border-slate-100">
                 <p className="text-xs font-bold text-slate-800">{userName}</p>
                 <p className="text-[10px] text-slate-500 font-medium">{userRole}</p>
              </div>
              <div className="p-2">
                <button 
                  onClick={() => { setShowUserMenu(false); onViewProfile?.(); }}
                  className="w-full flex items-center space-x-3 px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors text-sm font-medium"
                >
                  <UserIcon size={16} />
                  <span>My Profile</span>
                </button>
                <button 
                  onClick={onLogout}
                  className="w-full flex items-center space-x-3 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-sm font-bold"
                >
                  <LogOut size={16} />
                  <span>Terminate Session</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {showAllNotifications && (
        <NotificationsModal 
          notifications={notifications} 
          onClose={() => setShowAllNotifications(false)}
          onSelect={(n) => {
            setSelectedNotification(n);
            setShowAllNotifications(false);
          }}
        />
      )}
      {selectedNotification && (
        <NotificationDetailModal 
          notification={selectedNotification} 
          onClose={() => setSelectedNotification(null)}
          artworks={artworks}
          onViewArtwork={onViewArtwork}
        />
      )}
    </header>
  );
};

export default Header;
