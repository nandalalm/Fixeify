import type { FC } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Briefcase, Wallet, User, MessageSquare, Star, Calendar1, LogOut, OctagonAlert } from "lucide-react";
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
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 1024);
  const user = useSelector((state: RootState) => state.auth.user);
  const proId = user?.id;
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => {
      setIsLargeScreen(window.innerWidth >= 1024);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Sidebar shrinking removed: keep fixed width and visible labels

  const handleLogout = () => {
    // Navigate away from protected pro routes first to avoid ProPrivateRoute redirect to /login
    navigate("/home", { replace: true });
    // Then perform logout (no full reload)
    dispatch(logoutUser("pro")).finally(() => {
      // no-op; already navigated
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
        className={`bg-white w-64 border-r border-gray-200 shadow-sm overflow-visible transition-all duration-300 ease-in-out z-20 ${
          isLargeScreen
            ? "relative h-full top-0"
            : `fixed left-0 top-16 h-[calc(100vh-4rem)] ${isOpen ? "translate-x-0" : "-translate-x-full"}`
        }`}
      >
        <nav className={`py-4 h-full overflow-y-auto`}>
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
                    } cursor-pointer`}
                  >
                    <span className={`mr-3`}>
                      <item.icon className="h-5 w-5 text-red-600" />
                    </span>
                    <span className={`font-medium text-red-600`}>{item.label}</span> 
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
                    }`}
                    title={""}
                  >
                    <span className={`mr-3`}>
                      <item.icon className="h-5 w-5" />
                    </span>
                    <span className={`font-medium`}>{item.label}</span>
                  </Link>
                </li>
              )
            )}
          </ul>
        </nav>
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