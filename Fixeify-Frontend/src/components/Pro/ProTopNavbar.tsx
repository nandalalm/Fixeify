import { FC, useState, useEffect, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { AppDispatch, RootState } from "../../store/store";
import { User } from "../../store/authSlice";
import { Menu, Bell } from "lucide-react";
import NotificationPanel from "../Messaging/NotificationPanel";
import { NotificationItem } from "../../interfaces/messagesInterface";
import {
  fetchAllNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  addNotification,
} from "../../store/chatSlice";
import { getSocket } from "../../services/socket";
import { useNavigate } from "react-router-dom";

interface ProTopNavbarProps {
  toggleSidebar: () => void;
}

const ProTopNavbar: FC<ProTopNavbarProps> = ({ toggleSidebar }) => {
  const auth = useSelector((state: RootState) => state.auth);
  const user = auth.user as User;
  const accessToken = auth.accessToken;
  const navigate = useNavigate();

  if (!user) return null;

  const notifications = useSelector((state: RootState) => state.chat.notifications);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const dispatch = useDispatch<AppDispatch>();
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);

  const unreadNotificationCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  // Fetch notifications
  useEffect(() => {
    if (!user || !accessToken) return;
    dispatch(fetchAllNotifications({ userId: user.id, role: "pro", page: 1, limit: 10, filter }));
  }, [user, accessToken, filter, dispatch]);

  const handleLoadMore = async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    await new Promise(res => setTimeout(res, 1000));
    try {
      const nextPage = page + 1;
      const result = await dispatch(
        fetchAllNotifications({ userId: user.id, role: "pro", page: nextPage, limit: 10, filter })
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

  // Socket real-time notifications
  useEffect(() => {
    if (!user || !accessToken) return;
    const socket = getSocket();
    if (!socket) return;
    const handler = (notif: NotificationItem & { receiverId?: string }) => {
      if ((notif.proId || notif.receiverId) === user.id) {
        const isValid = notif.title || notif.description;
        if (!isValid) return;
        dispatch(addNotification(notif));
        setTimeout(() => {
          dispatch(fetchAllNotifications({ userId: user.id, role: "pro", page: 1, limit: 10, filter }));
        }, 1000);
      }
    };
    socket.on("newNotification", handler);
    return () => {
      socket.off("newNotification", handler);
    };
  }, [user, accessToken, filter, dispatch]);

  const handleMarkAsRead = async (notificationId: string) => {
    await dispatch(markNotificationRead(notificationId));
  };

  const handleMarkAllAsRead = async () => {
    if (user) {
      await dispatch(markAllNotificationsRead({ userId: user.id, role: "pro" }));
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white dark:bg-gray-900 shadow-md transition-colors duration-300">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        {/* Left side: Sidebar toggle + Logo */}
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className="p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md"
          >
            <Menu className="h-6 w-6" />
          </button>
          <img
            src="/logo.png"
            alt="Fixeify Logo"
            className="h-8 w-auto md:h-8 dark:filter dark:invert cursor-pointer"
            onClick={() => navigate("/pro-dashboard")}
          />
        </div>

        {/* Right side: Notification bell + Pro name */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsNotificationPanelOpen(true)}
            className="relative p-2 text-gray-700 rounded-md hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <Bell className="h-5 w-5" />
            {unreadNotificationCount > 0 && (
              <span className="absolute top-0 right-0 flex items-center justify-center w-4 h-4 text-xs text-white bg-red-500 rounded-full">
                {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
              </span>
            )}
          </button>

          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {user.name}
          </span>
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

export default ProTopNavbar;
