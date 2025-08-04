import { FC } from "react";
import { X, Bell } from "lucide-react";
import { NotificationItem } from "../../interfaces/messagesInterface";
import { useTheme } from "../../context/ThemeContext";
import { format } from "date-fns";

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
}

const NotificationPanel: FC<NotificationPanelProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
}) => {
  const { theme } = useTheme();

  const formatTimestamp = (timestamp: string) => {
    return format(new Date(timestamp), "MMM d, yyyy h:mm a");
  };

  return (
    <div
      className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-white shadow-lg z-50 transform transition-transform duration-300 ${
        isOpen ? "translate-x-0" : "translate-x-full"
      } ${theme === "dark" ? "bg-gray-800" : "bg-white"}`}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Notifications</h2>
        <div className="flex items-center space-x-2">
          {notifications.length > 0 && (
            <button
              onClick={onMarkAllAsRead}
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Mark all as read
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      </div>
      <div className="overflow-y-auto h-[calc(100%-4rem)] p-4">
        {notifications.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400">
            No notifications
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 mb-2 rounded-lg border ${
                notification.isRead
                  ? "bg-gray-50 dark:bg-gray-700"
                  : "bg-blue-50 dark:bg-blue-900"
              }`}
              onClick={() => !notification.isRead && onMarkAsRead(notification.id)}
            >
              <div className="flex items-start">
                <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300 mr-3" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {notification.title}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {notification.description}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formatTimestamp(notification.timestamp)}
                  </p>
                </div>
                {!notification.isRead && (
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-1"></div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationPanel;