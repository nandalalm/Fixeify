import { type FC, useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { ProNavbar } from "../../components/Pro/ProNavbar";
import { TrendingUp, Calendar as CalendarIcon, CalendarDays, CheckCircle, Clock, Star, Wallet, Banknote } from "lucide-react";
import ProTopNavbar from "../../components/Pro/ProTopNavbar";
import { fetchProDashboardMetrics, fetchProMonthlyRevenueSeries } from "../../api/proApi";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

// Enhanced metric card for the Revenue section
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



const ProDashboard: FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLargeScreen, setIsLargeScreen] = useState(true);
  const [greeting, setGreeting] = useState("");
  const [metrics, setMetrics] = useState<{
    totalRevenue: number;
    monthlyRevenue: number;
    yearlyRevenue: number;
    dailyRevenue: number;
    completedJobs: number;
    pendingJobs: number;
    averageRating: number;
    walletBalance: number;
    totalWithdrawn: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const user = useSelector((state: RootState) => state.auth.user);
  const [series, setSeries] = useState<Array<{ year: number; month: number; revenue: number }>>([]);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [seriesError, setSeriesError] = useState<string | null>(null);

  // Screen size detection for responsive behavior
  const [isSmall, setIsSmall] = useState<boolean>(false);
  useEffect(() => {
    const smallMq = window.matchMedia("(max-width: 640px)");
    const largeMq = window.matchMedia("(min-width: 1024px)");
    
    const updateScreenSize = () => {
      setIsSmall(smallMq.matches);
      setIsLargeScreen(largeMq.matches);
      
      // On medium screens, close sidebar by default
      if (!largeMq.matches) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    
    updateScreenSize();
    smallMq.addEventListener?.("change", updateScreenSize);
    largeMq.addEventListener?.("change", updateScreenSize);
    
    return () => {
      smallMq.removeEventListener?.("change", updateScreenSize);
      largeMq.removeEventListener?.("change", updateScreenSize);
    };
  }, []);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

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

  useEffect(() => {
    const loadSeries = async () => {
      if (!user?.id) return;
      try {
        setSeriesLoading(true);
        setSeriesError(null);
        const data = await fetchProMonthlyRevenueSeries(user.id, 12);
        setSeries(data ?? []);
        const years = Array.from(new Set(data.map((d) => d.year))).sort((a, b) => a - b);
        if (years.length) setSelectedYear(years[years.length - 1]);
      } catch (e) {
        console.error(e);
        setSeriesError("Failed to load monthly revenue series");
      } finally {
        setSeriesLoading(false);
      }
    };
    loadSeries();
  }, [user]);

  const availableYears = useMemo(() => {
    const s = new Set<number>();
    series.forEach((d) => s.add(d.year));
    return Array.from(s).sort((a, b) => a - b);
  }, [series]);

  const chartData = useMemo(() => {
    const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    if (!selectedYear) return [] as Array<{ name: string; revenue: number }>;
    const byMonth = Array.from({ length: 12 }, (_, i) => ({ name: MONTHS[i], revenue: 0 }));
    series
      .filter((d) => d.year === selectedYear)
      .forEach((d) => {
        const idx = (d.month - 1) % 12;
        byMonth[idx].revenue = d.revenue;
      });
    return byMonth;
  }, [selectedYear, series]);

  const formatCurrency = (v: number | undefined | null) => `₹${Number(v ?? 0).toLocaleString()}`;
  // yearlyRevenue and dailyRevenue are now provided by backend

  if (!user ) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
     <ProTopNavbar 
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
        isLargeScreen={isLargeScreen}
        sidebarOpen={sidebarOpen}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-visible">
        {/* Sidebar */}
        <ProNavbar 
          isOpen={sidebarOpen} 
        />

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
                <p className="text-sm sm:text-base text-gray-800 mt-2">Your performance overview looks great today.</p>
              </div>
            </section>

            {loading ? (
              // Dashboard skeleton while metrics load
              <div className="animate-pulse" role="status" aria-label="Loading dashboard metrics">
                {/* Revenue Title Skeleton */}
                <div className="flex items-center justify-between mb-4">
                  <div className="h-6 w-32 bg-gray-200 rounded" />
                </div>
                {/* Metric Cards Skeleton */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={`metric-skel-${i}`} className="relative overflow-hidden rounded-xl border border-gray-200 shadow-sm bg-white">
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
                {/* Chart Skeleton */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-5 w-48 bg-gray-200 rounded" />
                    <div className="h-8 w-28 bg-gray-200 rounded" />
                  </div>
                  <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                    <div className="h-56 sm:h-64 md:h-80 w-full bg-gray-100 rounded" />
                  </div>
                </div>
                {/* Overview Skeleton */}
                <div className="mb-8">
                  <div className="h-6 w-28 bg-gray-200 rounded mb-4" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-6">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={`ov-skel-${i}`} className="relative overflow-hidden rounded-xl border border-gray-200 shadow-sm bg-white">
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
                {/* Performance Summary Skeleton */}
                <div className="mb-8">
                  <div className="h-6 w-40 bg-gray-200 rounded mb-4" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={`perf-skel-${i}`} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm flex items-center justify-between">
                        <div>
                          <div className="h-4 w-36 bg-gray-200 rounded" />
                          <div className="mt-3 h-8 w-24 bg-gray-200 rounded" />
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
                    {/* Revenue Section */}
                    <section className="mb-8">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-800">Revenue</h3>
                      </div>
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
                          icon={Clock}
                          fromColor="from-rose-100"
                          toColor="to-rose-200"
                          ariaLabel="Today's revenue"
                        />
                      </div>

                      {/* Revenue Chart moved inside Revenue section */}
                      <div className="mt-6">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-base font-medium text-gray-700">Monthly Revenue Trend</h4>
                          <div className="flex items-center gap-2">
                            <label htmlFor="proYearSelect" className="text-sm text-gray-600">Year</label>
                            <select
                              id="proYearSelect"
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
                        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm" role="region" aria-label="Pro Monthly Revenue Trend chart">
                      {seriesLoading && (
                        <div className="animate-pulse w-full">
                          <div className="h-56 sm:h-64 md:h-80 w-full bg-gray-100 rounded" />
                        </div>
                      )}
                      {seriesError && <p className="text-red-500">{seriesError}</p>}
                      {!seriesLoading && !seriesError && (
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
                                <Line type="monotone" dataKey="revenue" name="Monthly Revenue" stroke="#2563eb" strokeWidth={2} dot={false} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                        </div>
                      </div>
                    </section>
                    {/* Stats Section */}
                    <section className="mb-8">
                      <h3 className="text-lg font-medium text-gray-800 mb-4">Overview</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-6">
                        <MetricCard
                          label="Completed jobs"
                          value={metrics.completedJobs.toLocaleString()}
                          icon={CheckCircle}
                          fromColor="from-emerald-100"
                          toColor="to-emerald-200"
                          ariaLabel="Completed jobs"
                        />
                        <MetricCard
                          label="Pending jobs"
                          value={metrics.pendingJobs.toLocaleString()}
                          icon={Clock}
                          fromColor="from-amber-100"
                          toColor="to-amber-200"
                          ariaLabel="Pending jobs"
                        />
                        <MetricCard
                          label="Average rating"
                          value={Number(metrics.averageRating || 0).toFixed(1)}
                          icon={Star}
                          fromColor="from-fuchsia-100"
                          toColor="to-fuchsia-200"
                          ariaLabel="Average rating"
                        />
                        <MetricCard
                          label="Wallet balance"
                          value={formatCurrency(metrics.walletBalance)}
                          icon={Wallet}
                          fromColor="from-sky-100"
                          toColor="to-sky-200"
                          ariaLabel="Wallet balance"
                        />
                        <MetricCard
                          label="Total withdrawn"
                          value={formatCurrency(metrics.totalWithdrawn)}
                          icon={Banknote}
                          fromColor="from-indigo-100"
                          toColor="to-indigo-200"
                          ariaLabel="Total withdrawn"
                        />
                      </div>
                    </section>

                    {/* Monthly Revenue Trend moved into Revenue section above */}

                    {/* Performance Summary */}
                    <section className="mb-8">
                      <h3 className="text-lg font-medium text-gray-800 mb-4">Performance Summary</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                        <div className="rounded-2xl border border-emerald-300 bg-gradient-to-br from-emerald-100 to-emerald-200 p-6 shadow-sm flex items-center justify-between">
                          <div>
                            <div className="text-sm text-emerald-700">Jobs Completed</div>
                            <div className="mt-1 text-3xl font-semibold text-gray-900">{metrics.completedJobs.toLocaleString()}</div>
                          </div>
                          <div className="p-3 rounded-xl bg-emerald-200"><CheckCircle className="h-6 w-6 text-emerald-800" /></div>
                        </div>
                        <div className="rounded-2xl border border-indigo-300 bg-gradient-to-br from-indigo-100 to-indigo-200 p-6 shadow-sm flex items-center justify-between">
                          <div>
                            <div className="text-sm text-indigo-700">Average Rating</div>
                            <div className="mt-1 text-3xl font-semibold text-gray-900">{Number(metrics.averageRating || 0).toFixed(1)}★</div>
                          </div>
                          <div className="p-3 rounded-xl bg-indigo-200"><Star className="h-6 w-6 text-indigo-800" /></div>
                        </div>
                        <div className="rounded-2xl border border-fuchsia-300 bg-gradient-to-br from-fuchsia-100 to-fuchsia-200 p-6 shadow-sm flex items-center justify-between">
                          <div>
                            <div className="text-sm text-fuchsia-700">This Month's Earnings</div>
                            <div className="mt-1 text-3xl font-semibold text-gray-900">{formatCurrency(metrics.monthlyRevenue)}</div>
                          </div>
                          <div className="p-3 rounded-xl bg-fuchsia-200"><CalendarDays className="h-6 w-6 text-fuchsia-800" /></div>
                        </div>
                      </div>
                    </section>


                  </>
                )}
              </>
            )}

            {/* Pro Tips Section removed as requested */}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ProDashboard;