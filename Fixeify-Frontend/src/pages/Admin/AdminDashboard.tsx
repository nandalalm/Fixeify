"use client";

import { type FC, useState, useEffect } from "react";
import { AdminNavbar } from "../../components/Admin/AdminNavbar";
import { Menu, } from "lucide-react";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { fetchDashboardMetrics } from "../../api/adminApi";

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
  const [metrics, setMetrics] = useState<{
    userCount: number;
    proCount: number;
    totalRevenue: number;
    monthlyRevenue: number;
    categoryCount: number;
    trendingService: { categoryId: string; name: string; bookingCount: number } | null;
    topPerformingPros: {
      mostRated: { proId: string; firstName: string; lastName: string; rating: number } | null;
      highestEarning: { proId: string; firstName: string; lastName: string; revenue: number } | null;
      leastRated: { proId: string; firstName: string; lastName: string; rating: number } | null;
      lowestEarning: { proId: string; firstName: string; lastName: string; revenue: number } | null;
    };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const user = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!user?.id) return;
      try {
        setLoading(true);
        const data = await fetchDashboardMetrics(user.id);
        setMetrics(data);
      } catch (err) {
        setError("Failed to load dashboard metrics");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, [user]);

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
            {loading && <p>Loading metrics...</p>}
            {error && <p className="text-red-500">{error}</p>}
            {metrics && (
              <>
                <section className="mb-8">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Counts</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard value={metrics.userCount.toString()} subtitle="Customers" />
                    <StatCard value={metrics.proCount.toString()} subtitle="Fixeify Pros" />
                    <StatCard value={metrics.categoryCount.toString()} subtitle="Categories" />
                  </div>
                </section>

                <section className="mb-8">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Revenue</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <StatCard value={`₹${metrics.totalRevenue?.toLocaleString() || '0'}`} subtitle="Total Revenue" />
                    <StatCard value={`₹${metrics.monthlyRevenue?.toLocaleString() || '0'}`} subtitle="This Month's Revenue" />
                  </div>
                </section>

                <section className="mb-8">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Top Performing Pros</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <StatCard 
                      value={metrics.topPerformingPros?.mostRated ? `${metrics.topPerformingPros.mostRated.firstName} ${metrics.topPerformingPros.mostRated.lastName}` : "N/A"}
                      subtitle={`Most Rated (${metrics.topPerformingPros?.mostRated?.rating?.toFixed(1) || 0}★)`}
                    />
                    <StatCard 
                      value={metrics.topPerformingPros?.highestEarning ? `${metrics.topPerformingPros.highestEarning.firstName} ${metrics.topPerformingPros.highestEarning.lastName}` : "N/A"}
                      subtitle={`Highest Earning (₹${metrics.topPerformingPros?.highestEarning?.revenue?.toLocaleString() || 0})`}
                    />
                  </div>
                </section>

                <section>
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Service Insights</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <StatCard
                      value={metrics.trendingService?.name || "None"}
                      subtitle={`Trending Service (${metrics.trendingService?.bookingCount || 0} bookings)`}
                    />
                    <StatCard
                      value={metrics.topPerformingPros?.leastRated ? `${metrics.topPerformingPros.leastRated.firstName} ${metrics.topPerformingPros.leastRated.lastName}` : "N/A"}
                      subtitle={`Needs Improvement (${metrics.topPerformingPros?.leastRated?.rating?.toFixed(1) || 0}★)`}
                    />
                  </div>
                </section>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;