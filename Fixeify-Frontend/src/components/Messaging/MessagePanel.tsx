import { FC, useEffect, useRef } from "react";
import { X, CheckCheck, MessageCircle } from "lucide-react";
import { NotificationItem } from "../../interfaces/messagesInterface";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";

interface MessagePanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
  loading: boolean;
  filter: 'all' | 'unread';
  onToggleFilter: (filter: 'all' | 'unread') => void;
  onLoadMore: () => void;
  hasMore: boolean;
}

const MessagePanel: FC<MessagePanelProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  loading,
  filter,
  onToggleFilter,
  onLoadMore,
  hasMore,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const currentUser = useSelector((state: RootState) => state.auth.user);

  const filteredNotifications =
    filter === "unread"
      ? notifications.filter((n) => !n.isRead)
      : notifications;

  const prevNotifCountRef = useRef<number>(notifications.length);
  const isInitialOpenRef = useRef<boolean>(false);
  const prevFirstIdRef = useRef<string | undefined>(notifications[0]?.id);
  const loadingMoreRef = useRef<boolean>(false);

  useEffect(() => {
    if (isOpen && listRef.current) {
      if (!isInitialOpenRef.current) {
        listRef.current.scrollTop = 0;
        isInitialOpenRef.current = true;
      } else {
        const firstId = notifications[0]?.id;
        const firstChanged = firstId && firstId !== prevFirstIdRef.current;
        const grew = notifications.length > prevNotifCountRef.current;
        const topIsUnread = notifications[0]?.isRead === false;

        if (!loadingMoreRef.current && grew && firstChanged && topIsUnread) {
          listRef.current.scrollTop = 0;
        }
      }
    }

    if (!isOpen) {
      isInitialOpenRef.current = false;
    }

    prevNotifCountRef.current = notifications.length;
    prevFirstIdRef.current = notifications[0]?.id;
  }, [isOpen, notifications]);

  useEffect(() => {
    if (!loading) {
      loadingMoreRef.current = false;
    }
  }, [loading]);

  const handleScroll = () => {
    if (!listRef.current || loading || !hasMore) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    if (scrollHeight - scrollTop - clientHeight < 60) {
      loadingMoreRef.current = true;
      onLoadMore();
    }
  };

  const handleMessageClick = (notification: NotificationItem) => {

    if (!notification.isRead) {
      onMarkAsRead(notification.id);
    }

    if (notification.chatId && currentUser) {
      let navigationPath = '';
      
      if (currentUser.role === 'user') {
        navigationPath = `/profile?tab=Messages&chatId=${notification.chatId}`;
      } else if (currentUser.role === 'pro') {
        navigationPath = `/pro/messages?chatId=${notification.chatId}`;
      } else {
        return;
      }
      
      if (navigationPath) {
        navigate(navigationPath);
        onClose();
      }
    } else {
      console.error('Missing chatId or currentUser:', { chatId: notification.chatId, currentUser });
    }
  };

  return (
    <div
      ref={panelRef}
       className={`fixed top-18 w-[300px] max-w-full max-h-[540px]  // ⬅ changed from 360px
     bg-white dark:bg-gray-800 shadow-xl rounded-xl border border-gray-200 dark:border-gray-700 
       z-50 transition-transform duration-300
       left-1/2 -translate-x-1/2 right-auto
       md:left-auto md:right-4 md:translate-x-0 md:w-[420px]  // desktop remains same
       ${isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0 pointer-events-none"}`}

      style={{ minHeight: 160 }}
    >
      {/* Header */}
      <div className="flex flex-col border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-t-xl">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
            Messages
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 ml-2"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {/* Toggle and Mark All as Read */}
        <div className="flex items-center justify-between px-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex bg-gray-200 dark:bg-gray-700 rounded-full p-1 relative transition-all">
              <button
                className={`px-4 py-1 rounded-full text-sm font-medium transition-all duration-200 focus:outline-none ${filter === "unread"
                  ? "bg-[#032b44] dark:bg-gray-500 text-white shadow"
                  : "text-gray-700 dark:text-gray-200"
                  }`}
                onClick={() => onToggleFilter("unread")}
                disabled={filter === "unread"}
                style={{ minWidth: 70 }}
              >
                Unread
              </button>
              <button
                className={`px-4 py-1 rounded-full text-sm font-medium transition-all duration-200 focus:outline-none ${filter === "all"
                  ? "bg-[#032b44] dark:bg-gray-500 text-white shadow"
                  : "text-gray-700 dark:text-gray-200"
                  }`}
                onClick={() => onToggleFilter("all")}
                disabled={filter === "all"}
                style={{ minWidth: 70 }}
              >
                All
              </button>
            </div>
          </div>

          {filter === "unread" && filteredNotifications.length > 0 && (
            <button
              onClick={onMarkAllAsRead}
              className="flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-400 px-2 py-1 rounded-full transition-colors"
              title="Mark all as read"
            >
              <CheckCheck className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>

      <div
        ref={listRef}
        className="overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700"
        onScroll={handleScroll}
        style={{ minHeight: 350, maxHeight: 350 }}
      >
        {filteredNotifications.filter((n) => n.title || n.description).length === 0 &&
          !loading ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            No messages
          </div>
        ) : (
          filteredNotifications
            .filter((n) => n.title || n.description)
            .map((notification) => (
              <div
                key={notification.id}
                className={`p-3 mb-2 rounded-lg border transition-colors cursor-pointer ${notification.isRead
                  ? "bg-gray-50 dark:bg-gray-700"
                  : "bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700"
                  }`}
                onClick={() => handleMessageClick(notification)}
              >
                <div className="flex items-start">
                  {(() => {
                    const iconClass = "w-4 h-4 text-gray-600 dark:text-gray-300 mr-2 mt-1";
                    return <MessageCircle className={iconClass} />;
                  })()}
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-800 dark:text-white">
                      {notification.title}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 break-words break-all">
                      {notification.description}
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                      {(() => {
                        const date = new Date(notification.timestamp);
                        return isNaN(date.getTime())
                          ? "-"
                          : format(date, "MMM d, yyyy h:mm a");
                      })()}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full mt-1 ml-1"></div>
                  )}
                </div>
              </div>
            ))
        )}

        {loading && hasMore && (
          <div className="flex justify-center items-center py-4">
            <svg
              className="animate-spin h-5 w-5 text-blue-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8z"
              ></path>
            </svg>
            <span className="ml-2 text-xs text-gray-500 dark:text-gray-300">
              Loading...
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagePanel;
