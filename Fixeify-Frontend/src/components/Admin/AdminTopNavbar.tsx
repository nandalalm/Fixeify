"use client";

import { FC, useEffect, useMemo, useState } from "react";
import { Menu, Bell, X } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../../store/store";
import NotificationPanel from "../Messaging/NotificationPanel";
import { NotificationItem } from "../../interfaces/messagesInterface";
import { getSocket } from "../../services/socket";
import { fetchAllNotifications, markAllNotificationsRead, markNotificationRead, addNotification } from "../../store/chatSlice";

interface AdminTopNavbarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  userName: string | undefined | null;
  isLargeScreen?: boolean;
}

export const AdminTopNavbar: FC<AdminTopNavbarProps> = ({ sidebarOpen, setSidebarOpen, userName, isLargeScreen = true }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, accessToken } = useSelector((state: RootState) => state.auth);
  const notifications = useSelector((state: RootState) => state.chat.notifications);

  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);

  const unreadNotificationCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  useEffect(() => {
    if (!user || user.role !== "admin" || !accessToken) return;
    dispatch(fetchAllNotifications({ userId: user.id, role: "admin", page: 1, limit: 10, filter }));
  }, [user, accessToken, filter, dispatch]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLoadMore = async () => {
    if (loading || !hasMore || !user) return;
    setLoading(true);
    await new Promise(res => setTimeout(res, 800));
    try {
      const nextPage = page + 1;
      const result = await dispatch(
        fetchAllNotifications({ userId: user.id, role: "admin", page: nextPage, limit: 10, filter })
      ).unwrap();
      setPage(nextPage);
      setHasMore(result.length === 10);
    } catch {
      setHasMore(false);
    }
    setLoading(false);
  };

  const handleToggleFilter = (newFilter: 'all' | 'unread') => {
    if (filter !== newFilter) {
      setFilter(newFilter);
      setPage(1);
      setHasMore(true);
    }
  };

  useEffect(() => {
    if (!user || user.role !== "admin" || !accessToken) return;
    const socket = getSocket();
    if (!socket) return;

    const handler = (notif: NotificationItem & { receiverId?: string }) => {
      // Accept if targeted by adminId or via receiverId
      if ((notif.adminId || notif.receiverId) !== user.id) return;
      const isValid = notif.title || notif.description;
      if (!isValid) return;
      dispatch(addNotification(notif));
    };

    socket.on("newNotification", handler);
    return () => {
      socket.off("newNotification", handler);
    };
  }, [user, accessToken, dispatch]);

  const handleMarkAsRead = async (notificationId: string) => {
    await dispatch(markNotificationRead(notificationId));
  };

  const handleMarkAllAsRead = async () => {
    if (user) {
      await dispatch(markAllNotificationsRead({ userId: user.id, role: "admin" }));
    }
  };

  return (
    <header
      className={`sticky top-0 z-50 w-full bg-white border-b border-gray-200 transition-all duration-300 ${
        isScrolled ? "shadow-md" : "shadow-none"
      }`}
    >
      <div className="w-full flex items-center justify-between px-3 md:px-4 lg:px-6 py-3">
        <div className="flex items-center">
          {!isLargeScreen && (
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          )}
          <h1 className="text-xl font-semibold text-gray-800 ml-4">Fixeify Admin</h1>
        </div>
        <div className="flex items-center space-x-4 ml-auto">
          <button
            onClick={() => setIsNotificationPanelOpen(true)}
            className="relative p-2 text-gray-700 rounded-md hover:bg-gray-200"
            aria-label="Open notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadNotificationCount > 0 && (
              <span className="absolute top-0 right-0 flex items-center justify-center w-4 h-4 text-xs text-white bg-red-500 rounded-full">
                {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
              </span>
            )}
          </button>
          <div className="flex items-center">
            <span className="text-lg font-medium text-gray-700 mr-2 hidden sm:inline">{userName}</span>
          </div>
        </div>
      </div>

      <NotificationPanel
        isOpen={isNotificationPanelOpen}
        onClose={() => setIsNotificationPanelOpen(false)}
        notifications={notifications}
        onMarkAsRead={handleMarkAsRead}
        onMarkAllAsRead={handleMarkAllAsRead}
        loading={loading}
        filter={filter}
        onToggleFilter={handleToggleFilter}
        onLoadMore={handleLoadMore}
        hasMore={hasMore}
      />
    </header>
  );
};

