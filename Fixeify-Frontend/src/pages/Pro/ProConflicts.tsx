import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { getTicketsByComplainant, getTicketById } from "@/api/ticketApi";
import { getUserProfile } from "@/api/userApi";
import { getProProfile } from "@/api/proApi";
import { TicketResponse } from "@/interfaces/ticketInterface";
import TicketTable from "@/components/Reuseable/TicketTable";
import TicketDetails from "@/components/Reuseable/TicketDetails";
import ProTopNavbar from "@/components/Pro/ProTopNavbar";
import { ProNavbar } from "@/components/Pro/ProNavbar";
import { RotateCcw } from "lucide-react";

const ProConflicts: React.FC = () => {
  const user = useSelector((s: RootState) => s.auth.user);
  const proId = user?.id as string | undefined;

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 1024);
  const [tickets, setTickets] = useState<TicketResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [sort, setSort] = useState<string>("-createdAt");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<TicketResponse | null>(null);
  const [anyTicketsExist, setAnyTicketsExist] = useState<boolean>(true);

  // caches to avoid duplicate lookups
  const userNameCache = React.useRef<Record<string, string>>({});
  const proNameCache = React.useRef<Record<string, string>>({});
  const resolveName = async (type: "user" | "pro", id: string): Promise<string> => {
    if (!id) return "";
    if (type === "user") {
      if (userNameCache.current[id]) return userNameCache.current[id];
      try {
        const u = await getUserProfile(id);
        const name = u?.name || id;
        userNameCache.current[id] = name;
        return name;
      } catch {
        return id;
      }
    } else {
      if (proNameCache.current[id]) return proNameCache.current[id];
      try {
        const p = await getProProfile(id);
        const name = [p?.firstName, p?.lastName].filter(Boolean).join(" ") || id;
        proNameCache.current[id] = name;
        return name;
      } catch {
        return id;
      }
    }
  };

  const load = async () => {
    if (!proId) return;
    setLoading(true);
    try {
      const res = await getTicketsByComplainant(proId, page, limit, sort);
      const raw = res.tickets || [];
      const populated = await Promise.all(
        raw.map(async (t) => {
          const complainantName = (t.complainantName && t.complainantName.trim()) || await resolveName(t.complainantType, t.complainantId);
          const againstName = (t.againstName && t.againstName.trim()) || await resolveName(t.againstType, t.againstId);
          return { ...t, complainantName, againstName } as TicketResponse;
        })
      );
      setTickets(populated);
      setTotal(res.total || 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [proId, page, sort]);

  useEffect(() => {
    const checkAny = async () => {
      if (!proId) return;
      try {
        const res = await getTicketsByComplainant(proId, 1, 1, "-createdAt");
        setAnyTicketsExist((res.total || 0) > 0);
      } catch {
        setAnyTicketsExist(true);
      }
    };
    checkAny();
  }, [proId]);

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

  const filtered = useMemo(() => {
    if (!search) return tickets;
    const s = search.toLowerCase();
    return tickets.filter((t) => {
      const against = `${t.againstName ?? t.againstId}`.toLowerCase();
      const complaint = `${t.subject} ${t.description}`.toLowerCase();
      return against.includes(s) || complaint.includes(s);
    });
  }, [tickets, search]);

  const handleClearFilter = () => {
    setSearch("");
    setSort("-createdAt");
    setPage(1);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <ProTopNavbar 
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
        isLargeScreen={isLargeScreen}
        sidebarOpen={sidebarOpen}
      />
      <div className="flex flex-1 overflow-visible">
        <ProNavbar 
          isOpen={sidebarOpen} 
        />
        <main className={`flex-1 overflow-y-auto p-6 transition-all duration-300`}>
          <div className="max-w-7xl mx-auto mb-[50px] space-y-4">
            <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">Your Conflicts</h1>

            {anyTicketsExist ? (
              <>
                {!selected && (
                  <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between">
                    <div className="relative w-full sm:w-5/6">
                      <input
                        type="text"
                        placeholder="Search by subject, description, party..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="relative w-full sm:w-1/6">
                      <select
                        value={sort}
                        onChange={(e) => { setPage(1); setSort(e.target.value); }}
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                      >
                        <option value="-createdAt">Latest</option>
                        <option value="createdAt">Oldest</option>
                        <option value="priority:desc">Priority High-Low</option>
                        <option value="priority:asc">Priority Low-High</option>
                      </select>
                    </div>
                  </div>
                )}

                {!selected && (filtered.length === 0) ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <p className="text-gray-500 mb-2">No results found with the search or sort criteria.</p>
                    <button
                      onClick={handleClearFilter}
                      className="mt-2 inline-flex items-center text-blue-600 hover:text-blue-700"
                    >
                      <RotateCcw className="w-4 h-4 mr-1" /> Clear Filter
                    </button>
                  </div>
                ) : !selected ? (
                  <TicketTable
                    tickets={filtered}
                    loading={loading}
                    onView={async (t) => {
                      try {
                        const fresh = await getTicketById(t._id);
                        setSelected(fresh);
                      } catch {
                        setSelected(t);
                      }
                    }}
                    pagination={{ page, limit, total, onPageChange: setPage }}
                    showRaisedBy={false}
                    showTypeBadges={false}
                  />
                ) : (
                  <TicketDetails ticket={selected} onBack={() => { setSelected(null); load(); }} />
                )}
              </>
            ) : (
              <div className="text-center py-12 text-gray-600">No tickets raised at the moment.</div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ProConflicts;
