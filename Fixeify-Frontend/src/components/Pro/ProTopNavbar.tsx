import { FC, useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { AppDispatch, RootState } from "../../store/store";
import { logoutUser } from "../../store/authSlice";
import { Menu, Bell, MessageCircle, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ConfirmationModal } from "../Reuseable/ConfirmationModal";
import NotificationPanel from "../Messaging/NotificationPanel";
import MessagePanel from "../Messaging/MessagePanel";
import { NotificationItem } from "../../interfaces/messagesInterface";
import { addNotification } from "../../store/chatSlice";
import { getSocket } from "../../services/socket";
import { useMessageNotifications } from "../../hooks/useMessageNotifications";
import { useNonMessageNotifications } from "../../hooks/useNonMessageNotifications";

interface ProTopNavbarProps {
  toggleSidebar: () => void;
  isLargeScreen?: boolean;
  sidebarOpen?: boolean;
}

const ProTopNavbar: FC<ProTopNavbarProps> = ({ toggleSidebar, isLargeScreen = true, sidebarOpen = false }) => {
  const { user, accessToken } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [isMessagePanelOpen, setIsMessagePanelOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // NEW: Separate hooks for message and non-message notifications
  const messageNotifications = useMessageNotifications({
    userId: user?.id || '',
    role: 'pro'
  });

  const nonMessageNotifications = useNonMessageNotifications({
    userId: user?.id || '',
    role: 'pro'
  });


  useEffect(() => {
    if (!user || !accessToken) return;
    const socket = getSocket();
    if (!socket) return;

    const handler = (notif: NotificationItem & { receiverId?: string }) => {
      if (!user || (notif.proId || notif.receiverId) !== user.id) return;
      const isValid = notif.title || notif.description;
      if (!isValid) return;
      
      // Immediately add the notification to update the count in real-time
      dispatch(addNotification(notif));
      // Real-time update - no need to fetch from backend
    };

    socket.on("newNotification", handler);
    return () => {
      socket.off("newNotification", handler);
    };
  }, [user, accessToken, dispatch]);

  const handleLogout = () => {
    // Navigate away from protected pro routes first to avoid ProPrivateRoute redirect to /login
    navigate("/home", { replace: true });
    // Then perform logout
    dispatch(logoutUser("pro")).finally(() => {
      // no-op; already navigated
    });
  };

  const handleLogoutConfirm = () => {
    handleLogout();
    setShowLogoutModal(false);
  };

  const handleLogoutCancel = () => {
    setShowLogoutModal(false);
  };

  if (!user) return null;

  return (
    <header className="sticky top-0 z-50 w-full bg-white dark:bg-gray-900 shadow-md transition-colors duration-300">
      <div className="w-full px-3 md:px-4 lg:px-6 py-3 flex justify-between items-center">
        <div className="flex items-center gap-4">
          {!isLargeScreen && (
            <button
              onClick={toggleSidebar}
              className="p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md"
            >
              {sidebarOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          )}
          {/* Mobile logo */}
          <img
            src="/logo2.png"
            alt="Fixeify Logo"
            className="block md:hidden h-8 w-auto dark:filter dark:invert cursor-pointer"
            onClick={() => navigate("/pro-dashboard")}
          />
          {/* Desktop/Tablet logo */}
          <img
            src="/logo.png"
            alt="Fixeify Logo"
            className="hidden md:block h-8 w-auto dark:filter dark:invert cursor-pointer"
            onClick={() => navigate("/pro-dashboard")}
          />
        </div>

        <div className="flex items-center gap-4">
          {/* Message Icon */}
          <button
            onClick={() => setIsMessagePanelOpen(true)}
            className="relative p-2 text-gray-700 rounded-md hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <MessageCircle className="h-5 w-5" />
            {messageNotifications.unreadCount > 0 && (
              <span className="absolute top-0 right-0 flex items-center justify-center w-4 h-4 text-xs text-white bg-blue-500 rounded-full">
                {messageNotifications.unreadCount > 9 ? "9+" : messageNotifications.unreadCount}
              </span>
            )}
          </button>
          
          {/* Notification Bell Icon */}
          <button
            onClick={() => setIsNotificationPanelOpen(true)}
            className="relative p-2 text-gray-700 rounded-md hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <Bell className="h-5 w-5" />
            {nonMessageNotifications.unreadCount > 0 && (
              <span className="absolute top-0 right-0 flex items-center justify-center w-4 h-4 text-xs text-white bg-red-500 rounded-full">
                {nonMessageNotifications.unreadCount > 9 ? "9+" : nonMessageNotifications.unreadCount}
              </span>
            )}
          </button>
          
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {user.name}
          </span>
        </div>
      </div>

      {/* Non-Message Notifications Panel */}
      <NotificationPanel
        isOpen={isNotificationPanelOpen}
        onClose={() => setIsNotificationPanelOpen(false)}
        notifications={nonMessageNotifications.notifications}
        onMarkAsRead={nonMessageNotifications.markAsRead}
        onMarkAllAsRead={nonMessageNotifications.markAllAsRead}
        loading={nonMessageNotifications.loading}
        filter={nonMessageNotifications.filter}
        onToggleFilter={nonMessageNotifications.toggleFilter}
        onLoadMore={nonMessageNotifications.loadMore}
        hasMore={nonMessageNotifications.hasMore}
      />
      
      {/* Message Notifications Panel */}
      <MessagePanel
        isOpen={isMessagePanelOpen}
        onClose={() => setIsMessagePanelOpen(false)}
        notifications={messageNotifications.notifications}
        onMarkAsRead={messageNotifications.markAsRead}
        onMarkAllAsRead={messageNotifications.markAllAsRead}
        loading={messageNotifications.loading}
        filter={messageNotifications.filter}
        onToggleFilter={messageNotifications.toggleFilter}
        onLoadMore={messageNotifications.loadMore}
        hasMore={messageNotifications.hasMore}
      />

      <ConfirmationModal
        isOpen={showLogoutModal}
        onConfirm={handleLogoutConfirm}
        onCancel={handleLogoutCancel}
        action="logout"
        isProcessing={false}
      />
    </header>
  );
};

export default ProTopNavbar;
