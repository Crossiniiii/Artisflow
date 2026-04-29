import React, { useState, useRef, useEffect } from 'react';
import { UserRole, AppNotification, Artwork, UserPermissions } from '../types';
import { ArrowLeft, Bell, Check, Clock, Info, LogOut, User as UserIcon, Monitor, MessageSquare, Menu } from 'lucide-react';
import NotificationsModal from './NotificationsModal';
import NotificationDetailModal from './NotificationDetailModal';

interface HeaderProps {
  userRole: UserRole;
  activeTab: string;
  notifications: AppNotification[];
  unreadChatCount?: number;
  onMarkRead: () => void;
  onLogout?: () => void;
  onViewProfile?: () => void;
  userName?: string;
  onBackToDashboard?: () => void;
  historyStack?: { tab: string }[];
  onViewChat?: () => void;
  artworks: Artwork[];
  onViewArtwork: (id: string) => void;
  onDeleteNotifications?: (ids: string[]) => void;
  zoomLevel: number;
  setZoomLevel: (level: number) => void;
  permissions?: UserPermissions;
  onToggleMobileMenu?: () => void;
}

const Header: React.FC<HeaderProps> = ({ userRole, activeTab, notifications, unreadChatCount = 0, onMarkRead, onLogout, onViewProfile, userName, onBackToDashboard, historyStack = [], onViewChat, artworks, onViewArtwork, onDeleteNotifications, zoomLevel, setZoomLevel, permissions, onToggleMobileMenu }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showDisplayMenu, setShowDisplayMenu] = useState(false);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<AppNotification | null>(null);
  const [isChatHidden, setIsChatHidden] = useState(false);
  const unreadCount = notifications.filter(n => !n.isRead).length;
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const displayMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkChatVisibility = () => {
      if (typeof window === 'undefined') return;
      const raw = window.localStorage.getItem('sidebar-hidden-tabs');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          setIsChatHidden(Array.isArray(parsed) && parsed.includes('chat'));
        } catch {
          setIsChatHidden(false);
        }
      } else {
        setIsChatHidden(false);
      }
    };

    checkChatVisibility();
    window.addEventListener('artisflow-hidden-tabs-changed', checkChatVisibility);
    return () => window.removeEventListener('artisflow-hidden-tabs-changed', checkChatVisibility);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (displayMenuRef.current && !displayMenuRef.current.contains(event.target as Node)) {
        setShowDisplayMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleNotifications = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!showNotifications && unreadCount > 0) {
      try {
        onMarkRead();
      } catch (err) {
        console.error("Error marking notifications as read:", err);
      }
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
    <header className="h-16 bg-white border-b border-neutral-200 px-8 flex items-center justify-between relative z-50">
      <div className="flex items-center space-x-3">
        <button
          className="p-2 md:hidden rounded-lg text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors mr-2"
          onClick={onToggleMobileMenu}
        >
          <Menu size={24} />
        </button>
        {(activeTab !== 'dashboard' || historyStack.length > 0) && (
          <button
            onClick={onBackToDashboard}
            className="p-2 rounded-full border border-neutral-200 text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
            title="Go Back"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <h2 className="text-lg font-semibold text-neutral-900 capitalize">
          {activeTab.replace('-', ' ')}
        </h2>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 bg-neutral-50 px-3 py-1 rounded-md border border-neutral-200">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></div>
          <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider">{userRole}</span>
        </div>

        <div className="relative" ref={displayMenuRef}>
          <button
            onClick={() => setShowDisplayMenu(!showDisplayMenu)}
            className={`p-2 rounded-md transition-all duration-150 ${showDisplayMenu ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50'}`}
            title="Display Settings"
          >
            <Monitor size={20} />
          </button>

          {showDisplayMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-neutral-200 shadow-xl rounded-md overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50">
                <h3 className="text-xs font-black text-neutral-900 uppercase tracking-widest">Resolution</h3>
              </div>
              <div className="p-2 space-y-1">
                {[0.75, 0.8, 0.9, 1, 1.1, 1.25].map((level) => (
                  <button
                    key={level}
                    onClick={() => { setZoomLevel(level); setShowDisplayMenu(false); }}
                    className={`w-full text-left px-3 py-2 rounded-sm text-[13px] font-medium transition-colors flex justify-between items-center ${zoomLevel === level ? 'bg-blue-50 text-blue-600' : 'text-neutral-600 hover:bg-neutral-50'}`}
                  >
                    <span>{Math.round(level * 100)}%</span>
                    {zoomLevel === level && <Check size={14} />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {!isChatHidden && (permissions?.accessibleTabs ? permissions.accessibleTabs.includes('chat') : true) && (
          <div className="relative">
            <button
              onClick={onViewChat}
              className={`relative p-2 rounded-full transition-all duration-200 hover:scale-105 transform ${activeTab === 'chat' ? 'bg-neutral-100 text-neutral-900 shadow-md' : 'text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 hover:shadow-sm'}`}
              title="Inbox"
            >
              {unreadChatCount > 0 && (
                <div className="min-w-[18px] h-[18px] bg-neutral-900 rounded-full absolute -top-0.5 -right-0.5 border-2 border-white flex items-center justify-center">
                  <span className="text-[9px] font-black text-white">{unreadChatCount > 9 ? '9+' : unreadChatCount}</span>
                </div>
              )}
              <MessageSquare size={20} />
            </button>
          </div>
        )}

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={toggleNotifications}
            className={`relative p-2 rounded-full transition-all duration-200 hover:scale-105 transform ${showNotifications ? 'bg-neutral-100 text-neutral-900 shadow-md' : 'text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 hover:shadow-sm'}`}
          >
            {unreadCount > 0 && (
              <div className="min-w-[18px] h-[18px] bg-red-600 rounded-full absolute -top-0.5 -right-0.5 border-2 border-white flex items-center justify-center">
                <span className="text-[9px] font-black text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>
              </div>
            )}
            <Bell size={20} />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-neutral-200 shadow-xl rounded-md overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-5 py-4 border-b border-neutral-100 bg-neutral-50 flex justify-between items-center">
                <h3 className="text-xs font-black text-neutral-900 uppercase tracking-widest">Recent Activity</h3>
                <span className="text-[10px] font-bold text-neutral-400">{notifications.length} Logs</span>
              </div>

              <div className="max-h-[340px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-10 text-center">
                    <div className="w-12 h-12 bg-neutral-50 rounded-full flex items-center justify-center text-neutral-200 mx-auto mb-3">
                      <Check size={24} />
                    </div>
                    <p className="text-xs font-bold text-neutral-400">All caught up!</p>
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-50">
                    {notifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => {
                          setSelectedNotification(n);
                          setShowNotifications(false);
                        }}
                        className={`w-full text-left p-4 hover:bg-neutral-50 transition-colors flex items-start space-x-3 ${!n.isRead ? 'bg-neutral-50/50' : ''}`}
                      >
                        <div className={`mt-0.5 p-1.5 rounded-lg ${n.type === 'inventory' ? 'bg-neutral-200 text-neutral-700' :
                          n.type === 'sales' ? 'bg-neutral-200 text-neutral-700' : 'bg-neutral-100 text-neutral-600'
                          }`}>
                          <Info size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-neutral-900 leading-tight">{n.title}</p>
                          <p className="text-[11px] text-neutral-500 mt-0.5 line-clamp-2">{n.message}</p>
                          <div className="flex items-center space-x-1.5 mt-2 text-[9px] font-bold text-neutral-400 uppercase tracking-tighter">
                            <Clock size={10} />
                            <span>{getTimeAgo(n.timestamp)}</span>
                          </div>
                        </div>
                        {!n.isRead && <div className="w-1.5 h-1.5 bg-neutral-900 rounded-full mt-1.5"></div>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => { setShowNotifications(false); setShowAllNotifications(true); }}
                className="w-full px-5 py-3 text-[11px] font-bold text-neutral-900 border-t border-neutral-100 bg-white hover:bg-neutral-50 hover:text-neutral-700 uppercase tracking-widest"
              >
                View All
              </button>
            </div>
          )}
        </div>

        <div className="h-8 w-px bg-neutral-200"></div>

        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-3 p-1 pr-3 rounded-full hover:bg-neutral-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center text-white text-[10px] font-black">
              {(userName?.[0] || 'U').toUpperCase()}
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-neutral-200 shadow-xl rounded-md overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-5 py-4 border-b border-neutral-100 bg-neutral-50">
                <p className="text-xs font-bold text-neutral-900">{userName || 'User'}</p>
                <p className="text-[10px] text-neutral-500 mt-0.5 capitalize">{userRole.replace('_', ' ').toLowerCase()}</p>
              </div>
              <div className="p-2 space-y-1">
                <button
                  onClick={() => { setShowUserMenu(false); onViewProfile && onViewProfile(); }}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-neutral-600 hover:bg-neutral-50 flex items-center space-x-2 transition-colors"
                >
                  <UserIcon size={16} />
                  <span>Profile</span>
                </button>
                <button
                  onClick={() => { setShowUserMenu(false); onLogout && onLogout(); }}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-neutral-600 hover:bg-neutral-50 flex items-center space-x-2 transition-colors"
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
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
          onDeleteNotifications={onDeleteNotifications}
        />
      )}

      {selectedNotification && (
        <NotificationDetailModal
          notification={selectedNotification}
          onClose={() => setSelectedNotification(null)}
          artworks={artworks}
          onViewArtwork={onViewArtwork}
          permissions={permissions}
        />
      )}
    </header>
  );
};

export default Header;
