import { type FC, useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { ProNavbar } from "../../components/Pro/ProNavbar";
import { Timer } from "lucide-react";
import ProTopNavbar from "../../components/Pro/ProTopNavbar";
import { fetchProDashboardMetrics } from "../../api/proApi";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
}



const StatCard: FC<StatCardProps> = ({ title, value, subtitle }) => {
  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
      <h3 className="text-gray-700 font-medium mb-4">{title}</h3>
      <div className="flex flex-col">
        <span className="text-3xl font-bold text-gray-900">{value}</span>
        <span className="text-sm text-gray-500 mt-1">{subtitle}</span>
      </div>
    </div>
  );
};



const ProDashboard: FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true); 
  const [greeting, setGreeting] = useState("");
  const [metrics, setMetrics] = useState<{
    totalRevenue: number;
    monthlyRevenue: number;
    completedJobs: number;
    pendingJobs: number;
    averageRating: number;
    walletBalance: number;
    totalWithdrawn: number;
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
        const data = await fetchProDashboardMetrics(user.id);
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

  if (!user ) {
    return null;
  }

  const stats = metrics ? [
    { title: "Total earnings", value: `₹${metrics.totalRevenue.toLocaleString()}`, subtitle: "All time" },
    { title: "Monthly earnings", value: `₹${metrics.monthlyRevenue.toLocaleString()}`, subtitle: "This month" },
    { title: "Completed jobs", value: metrics.completedJobs.toString(), subtitle: "All time" },
    { title: "Pending jobs", value: metrics.pendingJobs.toString(), subtitle: "Upcoming" },
    { title: "Average rating", value: metrics.averageRating.toFixed(1), subtitle: "Customer reviews" },
    { title: "Wallet balance", value: `₹${metrics.walletBalance.toLocaleString()}`, subtitle: "Available" },
    { title: "Total withdrawn", value: `₹${metrics.totalWithdrawn.toLocaleString()}`, subtitle: "All time" },
  ] : [];



  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
     <ProTopNavbar toggleSidebar={toggleSidebar} />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <ProNavbar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

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

            {loading && <p>Loading dashboard metrics...</p>}
            {error && <p className="text-red-500">{error}</p>}
            {metrics && (
              <>
                {/* Stats Section */}
                <section className="mb-8">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Overview</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {stats.map((stat, index) => (
                      <StatCard
                        key={index}
                        title={stat.title}
                        value={stat.value}
                        subtitle={stat.subtitle}
                      />
                    ))}
                  </div>
                </section>

                {/* Performance Summary */}
                <section className="mb-8">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Performance Summary</h3>
                  <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{metrics.completedJobs}</div>
                        <div className="text-sm text-gray-500">Jobs Completed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{metrics.averageRating.toFixed(1)}★</div>
                        <div className="text-sm text-gray-500">Average Rating</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">₹{metrics.monthlyRevenue.toLocaleString()}</div>
                        <div className="text-sm text-gray-500">This Month's Earnings</div>
                      </div>
                    </div>
                  </div>
                </section>


              </>
            )}

            {/* Pro Tips Section */}
            <section>
              <h3 className="text-lg font-medium text-gray-800 mb-4">Pro tips</h3>
              <div className="bg-blue-50 rounded-lg border border-blue-100 p-6 shadow-sm">
                <div className="flex items-start">
                  <div className="flex-shrink-0 bg-blue-100 rounded-full p-2 mr-3">
                    <Timer className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-blue-900">Be on time</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ProDashboard;