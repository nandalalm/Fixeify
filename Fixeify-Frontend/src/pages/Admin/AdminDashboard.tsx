"use client";

import { type FC, useState, useEffect, useMemo } from "react";
import { AdminNavbar } from "../../components/Admin/AdminNavbar";
import { TrendingUp, Calendar as CalendarIcon, CalendarDays, Sun, Users, Briefcase, Layers, Star, Flame } from "lucide-react";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { fetchDashboardMetrics, fetchAdminMonthlyRevenueSeries, fetchPlatformProMonthlyRevenueSeries } from "../../api/adminApi";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { AdminTopNavbar } from "../../components/Admin/AdminTopNavbar";

 

// Enhanced metric card for the Revenue section (light palette)
const MetricCard: FC<{
  label: string;
  value: string;
  icon: FC<{ className?: string }>;
  fromColor: string;
  toColor: string;
  ariaLabel?: string;
}> = ({ label, value, icon: Icon, fromColor, toColor, ariaLabel }) => {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-gray-200 shadow-sm bg-gradient-to-br ${fromColor} ${toColor} text-gray-800`}
      role="group"
      aria-label={ariaLabel ?? label}
    >
      <div className="p-5 flex items-center justify-between">
        <div>
          <div className="text-sm/5 opacity-70">{label}</div>
          <div className="mt-1 text-3xl font-semibold">{value}</div>
        </div>
        <div className="p-3 rounded-lg bg-white/70 shadow-inner">
          <Icon className="h-6 w-6 text-gray-700" />
        </div>
      </div>
      <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-white/40" />
    </div>
  );
};

const AdminDashboard: FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 1024);
  const [greeting, setGreeting] = useState("");
  const [metrics, setMetrics] = useState<{
    userCount: number;
    proCount: number;
    totalRevenue: number;
    monthlyRevenue: number;
    yearlyRevenue: number;
    dailyRevenue: number;
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

  const [adminSeries, setAdminSeries] = useState<Array<{ year: number; month: number; revenue: number }>>([]);
  const [platformProSeries, setPlatformProSeries] = useState<Array<{ year: number; month: number; revenue: number }>>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [chartLoading, setChartLoading] = useState<boolean>(false);
  const [chartError, setChartError] = useState<string | null>(null);

  // Small-screen detection for responsive chart tuning
  const [isSmall, setIsSmall] = useState<boolean>(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const update = () => setIsSmall(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

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

  useEffect(() => {
    const loadSeries = async () => {
      try {
        setChartLoading(true);
        setChartError(null);
        const [adminData, platformData] = await Promise.all([
          fetchAdminMonthlyRevenueSeries(12),
          fetchPlatformProMonthlyRevenueSeries(12),
        ]);
        setAdminSeries(adminData ?? []);
        setPlatformProSeries(platformData ?? []);
        // Set default selected year to the latest available in either series
        const years = new Set<number>([
          ...adminData.map((d) => d.year),
          ...platformData.map((d) => d.year),
        ]);
        if (years.size > 0) {
          setSelectedYear(Math.max(...Array.from(years)));
        }
      } catch (e) {
        console.error(e);
        setChartError("Failed to load monthly revenue series");
      } finally {
        setChartLoading(false);
      }
    };
    loadSeries();
  }, []);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    adminSeries.forEach((d) => years.add(d.year));
    platformProSeries.forEach((d) => years.add(d.year));
    return Array.from(years).sort((a, b) => a - b);
  }, [adminSeries, platformProSeries]);

  const chartData = useMemo(() => {
    const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    if (!selectedYear) return [] as Array<{ name: string; adminRevenue: number; proRevenue: number }>;
    const byMonth = Array.from({ length: 12 }, (_, i) => ({
      name: MONTHS[i],
      adminRevenue: 0,
      proRevenue: 0,
    }));
    adminSeries
      .filter((d) => d.year === selectedYear)
      .forEach((d) => {
        const idx = (d.month - 1) % 12;
        byMonth[idx].adminRevenue = d.revenue;
      });
    platformProSeries
      .filter((d) => d.year === selectedYear)
      .forEach((d) => {
        const idx = (d.month - 1) % 12;
        byMonth[idx].proRevenue = d.revenue;
      });
    return byMonth;
  }, [selectedYear, adminSeries, platformProSeries]);

  useEffect(() => {
    const handleResize = () => {
      setIsLargeScreen(window.innerWidth >= 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isLargeScreen) {
      setSidebarOpen(false);
    }
  }, [isLargeScreen]);

  const formatCurrency = (v: number | undefined | null) => `₹${Number(v ?? 0).toLocaleString()}`;

  if (!user) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Top Navbar */}
      <AdminTopNavbar 
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen} 
        userName={user.name}
        isLargeScreen={isLargeScreen}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-visible">
        {/* Sidebar */}
        <AdminNavbar isOpen={sidebarOpen} />

        {/* Content */}
        <main
          className={`flex-1 overflow-y-auto p-6 transition-all duration-300`}
        >
          <div className="max-w-7xl mx-auto">
            {/* Greeting Banner with enhanced animated radial blobs (full background) */}
            <section className="relative overflow-hidden rounded-2xl border border-gray-200 mb-8 min-h-[180px]">
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-24 -left-20 w-[640px] h-[640px] rounded-full bg-sky-300/40 blur-3xl blob-animate" />
                <div className="absolute -bottom-24 -right-24 w-[620px] h-[620px] rounded-full bg-emerald-300/40 blur-3xl blob-animate-slow" />
                <div className="absolute top-6 right-1/3 w-80 h-80 rounded-full bg-indigo-300/30 blur-3xl blob-animate-fast" />
              </div>
              <div className="relative p-8 sm:p-10">
                <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900">
                  {greeting}, {user.name}
                </h2>
                <p className="text-sm sm:text-base text-gray-800 mt-2">Here’s a snapshot of platform performance.</p>
              </div>
            </section>
            {loading ? (
              // Admin dashboard skeleton while metrics load
              <div className="animate-pulse" role="status" aria-label="Loading admin dashboard metrics">
                {/* Revenue Title Skeleton */}
                <div className="flex items-center justify-between mb-4">
                  <div className="h-6 w-32 bg-gray-200 rounded" />
                </div>
                {/* Metric Cards Skeleton */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={`admin-metric-skel-${i}`} className="relative overflow-hidden rounded-xl border border-gray-200 shadow-sm bg-white">
                      <div className="p-5 flex items-center justify-between">
                        <div>
                          <div className="h-4 w-24 bg-gray-200 rounded" />
                          <div className="mt-3 h-8 w-28 bg-gray-200 rounded" />
                        </div>
                        <div className="p-3 rounded-lg bg-gray-100 w-12 h-12" />
                      </div>
                    </div>
                  ))}
                </div>
                {/* Monthly Revenue Trends Skeleton */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-6 w-48 bg-gray-200 rounded" />
                    <div className="h-8 w-28 bg-gray-200 rounded" />
                  </div>
                  <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                    <div className="h-56 sm:h-64 md:h-80 w-full bg-gray-100 rounded" />
                  </div>
                </div>
                {/* Counts Skeleton */}
                <div className="mb-8">
                  <div className="h-6 w-24 bg-gray-200 rounded mb-4" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={`count-skel-${i}`} className="relative overflow-hidden rounded-xl border border-gray-200 shadow-sm bg-white">
                        <div className="p-5 flex items-center justify-between">
                          <div>
                            <div className="h-4 w-28 bg-gray-200 rounded" />
                            <div className="mt-3 h-8 w-20 bg-gray-200 rounded" />
                          </div>
                          <div className="p-3 rounded-lg bg-gray-100 w-12 h-12" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Top Performing Pros Skeleton */}
                <div className="mb-8">
                  <div className="h-6 w-48 bg-gray-200 rounded mb-4" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <div key={`top-pro-skel-${i}`} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm flex items-center justify-between">
                        <div>
                          <div className="h-4 w-28 bg-gray-200 rounded" />
                          <div className="mt-2 h-6 w-48 bg-gray-200 rounded" />
                          <div className="mt-2 h-4 w-24 bg-gray-200 rounded" />
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-gray-100" />
                          <div className="p-3 rounded-xl bg-gray-100 w-12 h-12" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Service Insights Skeleton */}
                <div className="mb-8">
                  <div className="h-6 w-40 bg-gray-200 rounded mb-4" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <div key={`svc-skel-${i}`} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm flex items-center justify-between">
                        <div>
                          <div className="h-4 w-32 bg-gray-200 rounded" />
                          <div className="mt-2 h-6 w-48 bg-gray-200 rounded" />
                          <div className="mt-2 h-4 w-24 bg-gray-200 rounded" />
                        </div>
                        <div className="p-3 rounded-xl bg-gray-100 w-12 h-12" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {error && <p className="text-red-500">{error}</p>}
                {metrics && (
                  <>
                    {/* Revenue Metrics */}
                    <section className="mb-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                        <MetricCard
                          label="Total revenue"
                          value={formatCurrency(metrics.totalRevenue)}
                          icon={TrendingUp}
                          fromColor="from-emerald-100"
                          toColor="to-emerald-200"
                          ariaLabel="Total revenue"
                        />
                        <MetricCard
                          label="This year"
                          value={formatCurrency(metrics.yearlyRevenue)}
                          icon={CalendarIcon}
                          fromColor="from-indigo-100"
                          toColor="to-indigo-200"
                          ariaLabel="This year's revenue"
                        />
                        <MetricCard
                          label="This month"
                          value={formatCurrency(metrics.monthlyRevenue)}
                          icon={CalendarDays}
                          fromColor="from-sky-100"
                          toColor="to-sky-200"
                          ariaLabel="This month's revenue"
                        />
                        <MetricCard
                          label="Today"
                          value={formatCurrency(metrics.dailyRevenue)}
                          icon={Sun}
                          fromColor="from-orange-100"
                          toColor="to-orange-200"
                          ariaLabel="Today's revenue"
                        />
                      </div>
                    </section>

                    {/* Monthly Revenue Trends (Admin vs Platform Pro) */}
                    <section className="mb-8">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-800">Monthly Revenue Trends</h3>
                        <div className="flex items-center gap-2">
                          <label htmlFor="yearSelect" className="text-sm text-gray-600">Year</label>
                          <select
                            id="yearSelect"
                            className="border border-gray-300 rounded px-2 py-1 text-sm"
                            value={selectedYear ?? ''}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                          >
                            {availableYears.map((y) => (
                              <option key={y} value={y}>{y}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm" role="region" aria-label="Monthly Revenue Trends chart">
                        {chartLoading && (
                          <div className="animate-pulse w-full">
                            <div className="h-56 sm:h-64 md:h-80 w-full bg-gray-100 rounded" />
                          </div>
                        )}
                        {chartError && <p className="text-red-500">{chartError}</p>}
                        {!chartLoading && !chartError && (
                          <div className="h-56 sm:h-64 md:h-80 overflow-x-hidden">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart
                                data={chartData}
                                margin={{ top: isSmall ? 4 : 10, right: isSmall ? 8 : 20, left: isSmall ? 0 : 8, bottom: isSmall ? 0 : 0 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                  dataKey="name"
                                  interval={isSmall ? "preserveStartEnd" : 0}
                                  tick={{ fontSize: isSmall ? 10 : 12 }}
                                />
                                <YAxis
                                  tickFormatter={(v) => `₹${Number(v).toLocaleString()}`}
                                  width={isSmall ? 52 : 80}
                                  tick={{ fontSize: isSmall ? 10 : 12 }}
                                />
                                <Tooltip
                                  formatter={(v: number) => [`₹${Number(v).toLocaleString()}`, "Revenue"]}
                                  contentStyle={{ fontSize: isSmall ? 12 : 14 }}
                                />
                                {!isSmall && <Legend />}
                                <Line type="monotone" dataKey="adminRevenue" name="Admin Revenue" stroke="#2563eb" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="proRevenue" name="Platform Pro Revenue" stroke="#10b981" strokeWidth={2} dot={false} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </div>
                    </section>

                    {/* Counts */}
                    <section className="mb-8">
                      <h3 className="text-lg font-medium text-gray-800 mb-4">Counts</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                        <MetricCard
                          label="Customers"
                          value={metrics.userCount.toLocaleString()}
                          icon={Users}
                          fromColor="from-blue-100"
                          toColor="to-blue-200"
                        />
                        <MetricCard
                          label="Fixeify Pros"
                          value={metrics.proCount.toLocaleString()}
                          icon={Briefcase}
                          fromColor="from-violet-100"
                          toColor="to-violet-200"
                        />
                        <MetricCard
                          label="Categories"
                          value={metrics.categoryCount.toLocaleString()}
                          icon={Layers}
                          fromColor="from-fuchsia-100"
                          toColor="to-fuchsia-200"
                        />
                      </div>
                    </section>

                    {/* Top Performing Pros */}
                    <section className="mb-8">
                      <h3 className="text-lg font-medium text-gray-800 mb-4">Top Performing Professionals</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Most Rated */}
                        <div className="rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-100 to-amber-200 p-6 shadow-sm flex items-center justify-between">
                          <div>
                            <div className="inline-flex items-center gap-2 text-xs font-medium text-amber-700 bg-amber-100 px-2 py-1 rounded-full">Most Rated</div>
                            <div className="text-xl font-semibold text-gray-900 mt-2">
                              {metrics.topPerformingPros?.mostRated ? `${metrics.topPerformingPros.mostRated.firstName} ${metrics.topPerformingPros.mostRated.lastName}` : "N/A"}
                            </div>
                            <div className="text-sm text-gray-600 mt-1 flex items-center gap-1"><Star className="h-4 w-4 text-amber-500" />{metrics.topPerformingPros?.mostRated?.rating?.toFixed(1) || 0}★</div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-amber-200/60 grid place-items-center text-amber-800 font-bold">
                              {metrics.topPerformingPros?.mostRated ? metrics.topPerformingPros.mostRated.firstName[0] : '—'}
                            </div>
                            <div className="p-3 rounded-xl bg-amber-200"><Star className="h-6 w-6 text-amber-800" /></div>
                          </div>
                        </div>
                        {/* Highest Earning */}
                        <div className="rounded-2xl border border-emerald-300 bg-gradient-to-br from-emerald-100 to-emerald-200 p-6 shadow-sm flex items-center justify-between">
                          <div>
                            <div className="inline-flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full">Highest Earning</div>
                            <div className="text-xl font-semibold text-gray-900 mt-2">
                              {metrics.topPerformingPros?.highestEarning ? `${metrics.topPerformingPros.highestEarning.firstName} ${metrics.topPerformingPros.highestEarning.lastName}` : "N/A"}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">₹{metrics.topPerformingPros?.highestEarning?.revenue?.toLocaleString() || 0}</div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-emerald-200/60 grid place-items-center text-emerald-800 font-bold">
                              {metrics.topPerformingPros?.highestEarning ? metrics.topPerformingPros.highestEarning.firstName[0] : '—'}
                            </div>
                            <div className="p-3 rounded-xl bg-emerald-200"><TrendingUp className="h-6 w-6 text-emerald-800" /></div>
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* Service Insights */}
                    <section>
                      <h3 className="text-lg font-medium text-gray-800 mb-4">Service Insights</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Trending Service */}
                        <div className="rounded-2xl border border-rose-300 bg-gradient-to-br from-rose-100 to-rose-200 p-6 shadow-sm flex items-center justify-between">
                          <div>
                            <div className="inline-flex items-center gap-2 text-xs font-medium text-rose-700 bg-rose-100 px-2 py-1 rounded-full">Trending Service</div>
                            <div className="text-xl font-semibold text-gray-900 mt-2">{metrics.trendingService?.name || "None"}</div>
                            <div className="text-sm text-gray-600 mt-1">{metrics.trendingService?.bookingCount || 0} bookings</div>
                          </div>
                          <div className="p-3 rounded-xl bg-rose-200"><Flame className="h-6 w-6 text-rose-800" /></div>
                        </div>
                        {/* Needs Improvement */}
                        <div className="rounded-2xl border border-gray-300 bg-gradient-to-br from-gray-100 to-gray-200 p-6 shadow-sm flex items-center justify-between">
                          <div>
                            <div className="inline-flex items-center gap-2 text-xs font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded-full">Needs Improvement</div>
                            <div className="text-xl font-semibold text-gray-900 mt-2">
                              {metrics.topPerformingPros?.leastRated ? `${metrics.topPerformingPros.leastRated.firstName} ${metrics.topPerformingPros.leastRated.lastName}` : "N/A"}
                            </div>
                            {metrics.topPerformingPros?.leastRated && (
                              <div className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                                <Star className="h-4 w-4 text-amber-500" />
                                {metrics.topPerformingPros.leastRated.rating.toFixed(1)}★
                              </div>
                            )}
                          </div>
                          <div className="p-3 rounded-xl bg-gray-200"><Star className="h-6 w-6 text-gray-800" /></div>
                        </div>
                      </div>
                    </section>
                  </>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;