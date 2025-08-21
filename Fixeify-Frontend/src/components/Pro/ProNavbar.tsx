import type { FC } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Briefcase, Wallet, User, MessageSquare, Star, Calendar1, LogOut, OctagonAlert, ChevronLeft, ChevronRight } from "lucide-react";
import type { LucideProps } from "lucide-react";
import { useDispatch,useSelector } from "react-redux";
import { AppDispatch,RootState } from "../../store/store";
import { logoutUser } from "../../store/authSlice";
import { useState, useEffect } from "react";
import { ConfirmationModal } from "../Reuseable/ConfirmationModal"; 

interface NavItem {
  icon: FC<LucideProps>;
  label: string;
  path: string;
  onClick?: () => void;
}

interface ProNavbarProps {
  isOpen: boolean;
}

export const ProNavbar: FC<ProNavbarProps> = ({ isOpen }) => {
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isSidebarShrunk, setIsSidebarShrunk] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [isExtraSmallScreen, setIsExtraSmallScreen] = useState(false);
  const user = useSelector((state: RootState) => state.auth.user);
  const proId = user?.id;

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsExtraSmallScreen(width <= 768);
      if (width <= 768) {
        setIsSidebarVisible(false);
      } else {
        setIsSidebarVisible(true);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    const savedState = localStorage.getItem("isProSidebarShrunk");
    if (savedState !== null) {
      setIsSidebarShrunk(JSON.parse(savedState));
    }

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    localStorage.setItem("isProSidebarShrunk", JSON.stringify(isSidebarShrunk));
  }, [isSidebarShrunk]);

  useEffect(() => {
    setIsSidebarVisible(isOpen);
  }, [isOpen]);

  const toggleSidebarShrink = () => {
    setIsSidebarShrunk(!isSidebarShrunk);
  };

  const handleLogout = () => {
    dispatch(logoutUser("pro")).then(() => {
      window.location.href = "/home";
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

  const navItems: NavItem[] = [
    { icon: Home, label: "Dashboard", path: "/pro-dashboard" },
    { icon: Briefcase, label: "Jobs", path: "/pro/jobs" },
    { icon: Wallet, label: "Wallet", path: `/pro/wallet/${proId}` },
    { icon: MessageSquare, label: "Messages", path: "/pro/messages" },
    { icon: Star, label: "Ratings", path: "/pro/ratings" },
    { icon: Calendar1, label: "Slots", path: "/pro/slot-management" },
    { icon: OctagonAlert, label: "Conflicts", path: "/pro/conflicts" },
    { icon: User, label: "Profile", path: "/pro/profile" }, 
    { icon: LogOut, label: "Log Out", path: "/home", onClick: handleLogoutClick },
  ];

  return (
    <>
      <aside
        className={`${
          isExtraSmallScreen
            ? `absolute top-9 left-0 z-40 h-full transition-transform duration-300 ${
                isSidebarVisible ? "translate-x-0" : "-translate-x-full"
              }`
            : "relative z-20"
        } ${isSidebarShrunk ? "w-20" : "w-64"} bg-white border-r border-gray-200 shadow-sm transition-all duration-300 ${
          isSidebarShrunk ? "md:w-20" : "md:w-64"
        } overflow-visible`}
      >
        <nav className={`p-4 ${isExtraSmallScreen ? "pt-12" : ""} h-full overflow-y-auto`}>
          <ul className="space-y-2">
            {navItems.map((item) =>
              item.label === "Log Out" ? (
                <li key={item.label}>
                  <div
                    onClick={item.onClick}
                    className={`flex items-center w-full p-3 rounded-md transition-colors ${
                      location.pathname === item.path
                        ? "bg-gray-100 text-gray-900"
                        : "text-gray-700 hover:bg-gray-50"
                    } ${isSidebarShrunk ? "justify-center" : ""} cursor-pointer`}
                  >
                    <span className={`${isSidebarShrunk ? "mx-auto" : "mr-3"}`}>
                      <item.icon className="h-5 w-5 text-red-600" />
                    </span>
                    <span className={`font-medium ${isSidebarShrunk ? "hidden" : "block"} text-red-600`}>{item.label}</span> 
                  </div>
                </li>
              ) : (
                <li key={item.label}>
                  <Link
                    to={item.path}
                    onClick={item.onClick}
                    className={`flex items-center w-full p-3 rounded-md transition-colors ${
                      location.pathname === item.path
                        ? "bg-gray-100 text-gray-900"
                        : "text-gray-700 hover:bg-gray-50"
                    } ${isSidebarShrunk ? "justify-center" : ""}`}
                    title={isSidebarShrunk ? item.label : ""}
                  >
                    <span className={`${isSidebarShrunk ? "mx-auto" : "mr-3"}`}>
                      <item.icon className="h-5 w-5" />
                    </span>
                    <span className={`font-medium ${isSidebarShrunk ? "hidden" : "block"}`}>{item.label}</span>
                  </Link>
                </li>
              )
            )}
          </ul>
        </nav>
        {isSidebarVisible && (
          <button
            onClick={toggleSidebarShrink}
            className="absolute top-72 -right-4 p-2 bg-white border border-gray-300 rounded-md shadow-md hover:bg-gray-100 transition-colors z-[30]"
          >
            {isSidebarShrunk ? (
              <ChevronRight className="w-6 h-6 text-blue-600" />
            ) : (
              <ChevronLeft className="w-6 h-6 text-blue-600" />
            )}
          </button>
        )}
      </aside>
      <ConfirmationModal
        isOpen={showLogoutModal}
        onConfirm={handleLogoutConfirm}
        onCancel={handleLogoutCancel}
        action="logout"
        isProcessing={false}
      />
    </>
  );
};