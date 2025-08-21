import type { FC } from "react";
import { Home, Users, Award, Grid, Calendar, BadgeIndianRupee, Star, LogOut, OctagonAlert, ChevronLeft, ChevronRight } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { LucideProps } from "lucide-react";
import { useDispatch } from "react-redux";
import { logoutUser } from "../../store/authSlice";
import { AppDispatch } from "../../store/store";
import { useState, useEffect } from "react";
import { ConfirmationModal } from "../Reuseable/ConfirmationModal";

interface NavItem {
  icon: FC<LucideProps>;
  label: string;
  path: string;
  onClick?: () => void;
}

interface AdminNavbarProps {
  isOpen: boolean;
}

export const AdminNavbar: FC<AdminNavbarProps> = ({ isOpen }) => {
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isSidebarShrunk, setIsSidebarShrunk] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const savedState = localStorage.getItem("isAdminSidebarShrunk");
    if (savedState !== null) {
      setIsSidebarShrunk(JSON.parse(savedState));
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsLargeScreen(window.innerWidth >= 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    localStorage.setItem("isAdminSidebarShrunk", JSON.stringify(isSidebarShrunk));
  }, [isSidebarShrunk]);

  const toggleSidebarShrink = () => {
    setIsSidebarShrunk(!isSidebarShrunk);
  };

  const handleLogout = () => {
    dispatch(logoutUser("admin")).then(() => {
      navigate("/admin-login");
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
    { icon: Home, label: "Dashboard", path: "/admin-dashboard" },
    { icon: Users, label: "User Management", path: "/admin/users" },
    { icon: Award, label: "Fixeify Pro Management", path: "/admin/pro-management" },
    { icon: Grid, label: "Category Management", path: "/admin/categories" },
    { icon: Calendar, label: "Booking Management", path: "/admin/bookings" },
    { icon: BadgeIndianRupee, label: "Revenue Management", path: "/admin/revenue" },
    { icon: Star, label: "Rating Management", path: "/admin/reviews" },
    { icon: OctagonAlert, label: "Conflit Management", path: "/admin/conflits" },
    { icon: LogOut, label: "Log Out", path: "/admin-login", onClick: handleLogoutClick },
  ];

  return (
    <>
      <aside
        className={`bg-white h-screen ${isSidebarShrunk ? "w-20" : "w-64"} border-r border-gray-200 overflow-visible transition-all duration-300 ease-in-out z-20 ${
          isLargeScreen 
            ? "relative" 
            : `fixed left-0 ${
                isOpen ? "translate-x-0" : "-translate-x-full"
              }`
        } ${!isLargeScreen ? "top-16" : "top-0"}`}
      >
        <nav className="py-4 h-full overflow-y-auto">
          <ul className="space-y-1">
            {navItems.map((item) =>
              item.label === "Log Out" ? (
                <li key={item.label}>
                  <div
                    onClick={item.onClick}
                    className={`flex items-center px-4 py-3 text-sm ${
                      location.pathname === item.path
                        ? "bg-blue-100 font-semibold"
                        : "hover:bg-gray-100"
                    } rounded-md mx-2 transition-colors duration-200 cursor-pointer ${isSidebarShrunk ? "justify-center" : ""}`}
                  >
                    <item.icon className={`h-5 w-5 text-red-600 ${isSidebarShrunk ? "mx-auto" : "mr-3"}`} />
                    <span className={`text-red-600 ${isSidebarShrunk ? "hidden" : "block"}`}>{item.label}</span>
                  </div>
                </li>
              ) : (
                <li key={item.label}>
                  <Link
                    to={item.path}
                    onClick={item.onClick}
                    className={`flex items-center px-4 py-3 text-sm ${
                      location.pathname === item.path
                        ? "bg-blue-100 text-blue-600 font-semibold"
                        : "text-gray-700 hover:bg-gray-100"
                    } rounded-md mx-2 transition-colors duration-200 ${isSidebarShrunk ? "justify-center" : ""}`}
                    title={isSidebarShrunk ? item.label : ""}
                  >
                    <item.icon className={`h-5 w-5 ${isSidebarShrunk ? "mx-auto" : "mr-3"}`} />
                    <span className={`${isSidebarShrunk ? "hidden" : "block"}`}>{item.label}</span>
                  </Link>
                </li>
              )
            )}
          </ul>
        </nav>
        {(isLargeScreen || isOpen) && (
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