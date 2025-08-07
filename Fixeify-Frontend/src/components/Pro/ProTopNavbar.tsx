import { FC, useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { AppDispatch, RootState } from "../../store/store";
import { logoutUser } from "../../store/authSlice";
import { Menu, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ConfirmationModal } from "../Reuseable/ConfirmationModal";
import NotificationPanel from "../Messaging/NotificationPanel";
import {
  fetchAllNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../../store/chatSlice";
import { getSocket } from "../../services/socket";

interface ProTopNavbarProps {
  toggleSidebar: () => void;
}

const ProTopNavbar: FC<ProTopNavbarProps> = ({ toggleSidebar }) => {
  const { user, accessToken } = useSelector((state: RootState) => state.auth);
  const notifications = useSelector((state: RootState) => state.chat.notifications);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);

  const unreadNotificationCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    if (user && accessToken) {
      dispatch(fetchAllNotifications({ userId: user.id, role: "pro", page: 1, limit: 10 }));

      const socket = getSocket();
      if (socket) {
        socket.on("newNotification", () => {
          dispatch(fetchAllNotifications({ userId: user.id, role: "pro", page: 1, limit: 10 }));
        });

        return () => {
          socket.off("newNotification");
        };
      }
    }
  }, [user, accessToken, dispatch]);

  const handleLogout = () => {
    dispatch(logoutUser("pro")).then(() => {
      navigate("/home");
    });
  };

  const handleLogoutConfirm = () => {
    handleLogout();
    setShowLogoutModal(false);
  };

  const handleLogoutCancel = () => {
    setShowLogoutModal(false);
  };

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
          <div className="flex items-center gap-2">
            <span className="text-lg font-medium text-gray-700 dark:text-white hidden sm:inline">
              {user?.name || "Pro User"}
            </span>
          </div>
        </div>
      </div>
      <NotificationPanel
        isOpen={isNotificationPanelOpen}
        onClose={() => setIsNotificationPanelOpen(false)}
        notifications={notifications}
        onMarkAsRead={handleMarkAsRead}
        onMarkAllAsRead={handleMarkAllAsRead}
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
