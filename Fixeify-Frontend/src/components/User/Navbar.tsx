"use client";

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useSelector, useDispatch } from "react-redux";
import { AppDispatch, RootState } from "../../store/store";
import { logoutUser } from "../../store/authSlice";
import { Sun, Moon, Bell, MessageCircle, MapPin, PencilLine } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";
import { ConfirmationModal } from "../Reuseable/ConfirmationModal";
import NotificationPanel from "../Messaging/NotificationPanel";
import MessagePanel from "../Messaging/MessagePanel";
import { addNotification, fetchAllNotifications } from "../../store/chatSlice";
import { NotificationItem } from "../../interfaces/messagesInterface";
import { getSocket } from "../../services/socket";
import ChangeLocationModal from "./ChangeLocationModal";
import { useMessageNotifications } from "../../hooks/useMessageNotifications";
import { useNonMessageNotifications } from "../../hooks/useNonMessageNotifications";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [isMessagePanelOpen, setIsMessagePanelOpen] = useState(false);
  const [isChangeLocationOpen, setIsChangeLocationOpen] = useState(false);


  const auth = useSelector((state: RootState) => state.auth);
  const user = auth.user as import("../../interfaces/messagesInterface").User;
  const accessToken = auth.accessToken;
  const { theme, toggleTheme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const messageNotifications = useMessageNotifications({
    userId: user?.id || '',
    role: user?.role || 'user'
  });

  const nonMessageNotifications = useNonMessageNotifications({
    userId: user?.id || '',
    role: user?.role || 'user'
  });

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);


  useEffect(() => {
    if (!user || !accessToken) return;
    
    const socket = getSocket();
    let fallbackInterval: NodeJS.Timeout | null = null;
    
    if (!socket) {
      // Fallback: Poll for notifications every 30 seconds when socket is not available
      fallbackInterval = setInterval(() => {
        dispatch(fetchAllNotifications({ 
          userId: user.id, 
          role: user.role === 'admin' ? 'admin' : 'user', 
          page: 1, 
          limit: 10, 
          filter: 'all' 
        }));
      }, 30000);
      return () => {
        if (fallbackInterval) clearInterval(fallbackInterval);
      };
    }
    
    // Check if socket is connected
    if (!socket.connected) {
      // Start fallback polling when socket is disconnected
      fallbackInterval = setInterval(() => {
        dispatch(fetchAllNotifications({ 
          userId: user.id, 
          role: user.role === 'admin' ? 'admin' : 'user', 
          page: 1, 
          limit: 10, 
          filter: 'all' 
        }));
      }, 30000);
    }
    
    const handler = (notif: NotificationItem & { receiverId?: string }) => {
      if ((notif.userId || notif.receiverId) === user.id) {
        const isValid = notif.title || notif.description;
        if (!isValid) return;
        dispatch(addNotification(notif));
      }
    };

    socket.on("newNotification", handler);
    
    // Add connection status listeners
    socket.on('connect', () => {
      // Stop fallback polling when socket connects
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
        fallbackInterval = null;
      }
    });
    
    socket.on('disconnect', () => {
      // Start fallback polling when socket disconnects
      if (!fallbackInterval) {
        fallbackInterval = setInterval(() => {
          dispatch(fetchAllNotifications({ 
            userId: user.id, 
            role: user.role === 'admin' ? 'admin' : 'user', 
            page: 1, 
            limit: 10, 
            filter: 'all' 
          }));
        }, 30000);
      }
    });

    return () => {
      socket.off("newNotification", handler);
      socket.off('connect');
      socket.off('disconnect');
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, [user, accessToken, dispatch]);

  const handleLogout = () => {
    const role = user?.role === "admin" ? "admin" : "user";
    dispatch(logoutUser(role)).then(() => {
      navigate("/home");
      setIsDropdownOpen(false);
      setIsMenuOpen(false);
    });
  };

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = () => {
    handleLogout();
    setShowLogoutModal(false);
  };

  const handleLogoutCancel = () => {
    setShowLogoutModal(false);
  };


  return (
    <motion.header
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.2 }}
      className={`sticky top-0 left-0 w-full z-60 transition-all duration-300 ${
        isScrolled ? "shadow-md" : "shadow-none"
      } bg-white dark:bg-gray-900`}
      style={{ top: 0, margin: 0, padding: 0, transform: "translateY(0)" }}
    >
      <div className="w-full flex justify-between items-center px-3 md:px-4 lg:px-6 py-3" style={{ margin: 0 }}>
        <img
          src="/logo2.png"
          alt="Fixeify Logo"
          className="block md:hidden h-10 w-auto dark:filter dark:invert cursor-pointer"
          onClick={() => navigate("/home")}
        />
        <img
          src="/logo.png"
          alt="Fixeify Logo"
          className="hidden md:block h-10 w-auto dark:filter dark:invert cursor-pointer"
          onClick={() => navigate("/home")}
        />
        <nav className="ml-auto gap-6 hidden items-center md:flex">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "light" ? <Moon className="h-5 w-5 text-gray-700 dark:text-white" /> : <Sun className="h-5 w-5 text-yellow-400" />}
            </button>
            {accessToken && (
              <>
                <button
                  onClick={() => setIsMessagePanelOpen(true)}
                  className="relative p-2 text-gray-700 rounded-md hover:bg-gray-200 dark:text-white dark:hover:bg-gray-700"
                >
                  <MessageCircle className="h-5 w-5" />
                  {messageNotifications.unreadCount > 0 && (
                    <span className="absolute top-0 right-0 flex items-center justify-center w-4 h-4 text-xs text-white bg-blue-500 rounded-full">
                      {messageNotifications.unreadCount > 9 ? "9+" : messageNotifications.unreadCount}
                    </span>
                  )}
                </button>
                
                <button
                  onClick={() => setIsNotificationPanelOpen(true)}
                  className="relative p-2 text-gray-700 rounded-md hover:bg-gray-200 dark:text-white dark:hover:bg-gray-700"
                >
                  <Bell className="h-5 w-5" />
                  {nonMessageNotifications.unreadCount > 0 && (
                    <span className="absolute top-0 right-0 flex items-center justify-center w-4 h-4 text-xs text-white bg-red-500 rounded-full">
                      {nonMessageNotifications.unreadCount > 9 ? "9+" : nonMessageNotifications.unreadCount}
                    </span>
                  )}
                </button>
              </>
            )}
          </div>
          {accessToken && (
            <button
              onClick={() => setIsChangeLocationOpen(true)}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-1 text-sm"
              title="Change location"
            >
              <MapPin className="h-5 w-5 text-[#032b44] dark:text-gray-300" />
              <PencilLine className="h-5 w-5 text-[#032b44] dark:text-gray-300" />
            </button>
          )}
          <button
            onClick={() => navigate("/become-pro")}
            className="bg-[#032b44] rounded-md text-sm text-white font-medium hover:bg-[#054869] px-4 py-1.5 transition-colors dark:bg-gray-300 dark:text-gray-800 dark:hover:bg-gray-500 dark:hover:!text-white"
          >
            Become a Provider
          </button>
          {accessToken ? (
            <div className="relative">
              <button
                className="border border-[#032b44] rounded-md text-[#032b44] hover:bg-[#032b44] hover:text-white text-sm font-medium px-4 py-1.5 flex items-center gap-2 dark:border-gray-600 dark:text-gray-300"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                {user?.name}
                <motion.svg
                  animate={{ rotate: isDropdownOpen ? 180 : 0 }}
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 9l6 6 6-6" />
                </motion.svg>
              </button>
              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-2 w-40 bg-white shadow-lg rounded-md border dark:bg-gray-800 dark:border-gray-700"
                  >
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-sm hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      Profile
                    </Link>
                    <button
                      onClick={handleLogoutClick}
                      className="block w-full text-left px-4 py-2 text-sm text-red-500 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Logout
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <button
              onClick={() => navigate("/login")}
              className="bg-[#032b44] rounded-md text-sm text-white font-medium hover:bg-[#054869] px-4 py-1.5 transition-colors dark:bg-gray-300 dark:text-gray-800 dark:hover:bg-gray-500 dark:hover:!text-white"
            >
              Login
            </button>
          )}
        </nav>
        <div className="md:hidden ml-auto flex items-center gap-3">
          {accessToken && (
            <button
              onClick={() => setIsChangeLocationOpen(true)}
              className="py-2 px-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center gap-1"
              aria-label="Change location"
            >
              <MapPin className="h-5 w-5 text-[#032b44] dark:text-gray-300" />
              <PencilLine className="h-5 w-5 text-[#032b44] dark:text-gray-300" />
            </button>
          )}
          <button onClick={toggleTheme} className="p-2">
            {theme === "light" ? <Moon className="h-5 w-5 text-gray-700 dark:text-white" /> : <Sun className="h-5 w-5 text-yellow-400" />}
          </button>
          {accessToken && (
            <>
              <button
                onClick={() => setIsMessagePanelOpen(true)}
                className="relative p-2 text-gray-700 rounded-md hover:bg-gray-200 dark:text-white dark:hover:bg-gray-700"
              >
                <MessageCircle className="h-5 w-5" />
                {messageNotifications.unreadCount > 0 && (
                  <span className="absolute top-0 right-0 flex items-center justify-center w-4 h-4 text-xs text-white bg-blue-500 rounded-full">
                    {messageNotifications.unreadCount > 9 ? "9+" : messageNotifications.unreadCount}
                  </span>
                )}
              </button>
              
              <button
                onClick={() => setIsNotificationPanelOpen(true)}
                className="relative p-2 text-gray-700 rounded-md hover:bg-gray-200 dark:text-white dark:hover:bg-gray-700"
              >
                <Bell className="h-5 w-5" />
                {nonMessageNotifications.unreadCount > 0 && (
                  <span className="absolute top-0 right-0 flex items-center justify-center w-4 h-4 text-xs text-white bg-red-500 rounded-full">
                    {nonMessageNotifications.unreadCount > 9 ? "9+" : nonMessageNotifications.unreadCount}
                  </span>
                )}
              </button>
            </>
          )}
          <button onClick={() => setIsMenuOpen(!isMenuOpen)}>
            <motion.svg
              initial={{ rotate: 0 }}
              animate={{ rotate: isMenuOpen ? 90 : 0 }}
              transition={{ duration: 0.2 }}
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6 dark:text-white"
            >
              <line x1="4" x2="20" y1="12" y2="12" />
              <line x1="4" x2="20" y1="6" y2="6" />
              <line x1="4" x2="20" y1="18" y2="18" />
            </motion.svg>
          </button>
        </div>
      </div>
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed top-[60px] left-0 w-full bg-white shadow-md md:hidden pb-4 px-4 py-2 z-50 dark:bg-gray-900 dark:border-gray-700"
          >
            <nav className="flex flex-col space-y-3">
              <Link
                to="/become-pro"
                className="text-sm hover:text-primary dark:text-gray-300 dark:hover:text-white"
              >
                Become a Provider
              </Link>
              {accessToken ? (
                <>
                  <Link
                    to="/profile"
                    className="text-sm hover:text-primary dark:text-gray-300 dark:hover:text-white"
                  >
                    Profile
                  </Link>
                  <button
                    onClick={handleLogoutClick}
                    className="text-sm text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-500 text-left"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link to="/login" className="text-sm hover:text-primary dark:text-gray-300 dark:hover:text-white">
                  Login
                </Link>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
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
      
      <ChangeLocationModal isOpen={isChangeLocationOpen} onClose={() => setIsChangeLocationOpen(false)} />
      <ConfirmationModal
        isOpen={showLogoutModal}
        onConfirm={handleLogoutConfirm}
        onCancel={handleLogoutCancel}
        action="logout"
        isProcessing={false}
      />
    </motion.header>
  );
};

export default Navbar;