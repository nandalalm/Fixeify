"use client";

import { type FC, useState, useEffect } from "react";
import { AdminNavbar } from "../../components/Admin/AdminNavbar";
import { Menu, Bell } from "lucide-react";
import { useSelector,  } from "react-redux";
import { RootState, } from "../../store/store";

interface StatCardProps {
  title?: string;
  value: string;
  subtitle: string;
}

const StatCard: FC<StatCardProps> = ({ title, value, subtitle }) => {
  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
      {title && <h3 className="text-gray-700 font-medium mb-4">{title}</h3>}
      <div className="flex flex-col">
        <span className="text-3xl font-bold text-gray-900">{value}</span>
        <span className="text-sm text-gray-500 mt-1">{subtitle}</span>
      </div>
    </div>
  );
};

const AdminDashboard: FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true); 
  const [greeting, setGreeting] = useState("");
  const user = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);


  if (!user) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Top Navbar */}
      <header className="bg-white border-b border-gray-200 p-4 flex items-center justify-between z-30">
        <div className="flex items-center">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
          >
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-semibold text-gray-800 ml-4">Fixeify Admin</h1>
        </div>
        <div className="flex items-center space-x-4">
          <button className="relative p-1 text-gray-700 rounded-md hover:bg-gray-100">
            <Bell className="h-5 w-5" />
            <span className="absolute top-0 right-0 flex items-center justify-center w-4 h-4 text-xs text-white bg-red-500 rounded-full">
              1
            </span>
          </button>
          <div className="flex items-center">
            <span className="text-lg font-medium text-gray-700 mr-2 hidden sm:inline">{user.name}</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <AdminNavbar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        {/* Content */}
        <main
          className={`flex-1 overflow-y-auto p-6 transition-all duration-300 ${
            sidebarOpen ? "ml-64" : "ml-0"
          }`}
        >
          <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
              {greeting}, {user.name}
          </h2>
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Dashboard</h2>
            <section className="mb-8">
              <h3 className="text-lg font-medium text-gray-800 mb-4">User count</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatCard value="3,100" subtitle="Customers" />
                <StatCard value="400" subtitle="Fixeify Pros" />
              </div>
            </section>

            <section>
              <h3 className="text-lg font-medium text-gray-800 mb-4">Revenue</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatCard value="₹20,000" subtitle="Revenue" />
                <StatCard value="₹15,000" subtitle="Paid to Fixeify Pros" />
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;