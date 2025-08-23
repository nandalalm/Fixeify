import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { getTicketsByComplainant, getTicketById } from "@/api/ticketApi";
import { getUserProfile } from "@/api/userApi";
import { getProProfile } from "@/api/proApi";
import { TicketResponse } from "@/interfaces/ticketInterface";
import TicketTable from "@/components/Reuseable/TicketTable";
import TicketDetails from "@/components/Reuseable/TicketDetails";
import { RotateCcw } from "lucide-react";
import { SkeletonLine, SkeletonBlock } from "@/components/Reuseable/Skeleton";

const UserConflicts: React.FC = () => {
  const user = useSelector((s: RootState) => s.auth.user);
  const userId = user?.id as string | undefined;

  const [tickets, setTickets] = useState<TicketResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [sort, setSort] = useState<string>("-createdAt");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<TicketResponse | null>(null);
  const [viewing, setViewing] = useState<boolean>(false);
  const [anyTicketsExist, setAnyTicketsExist] = useState<boolean>(true);

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
    if (!userId) return;
    setLoading(true);
    try {
      const res = await getTicketsByComplainant(userId, page, limit, sort);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, page, sort]);

  useEffect(() => {
    const checkAny = async () => {
      if (!userId) return;
      try {
        const res = await getTicketsByComplainant(userId, 1, 1, "-createdAt");
        setAnyTicketsExist((res.total || 0) > 0);
      } catch {
        setAnyTicketsExist(true);
      }
    };
    checkAny();
  }, [userId]);

  const filteredTickets = useMemo(() => {
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

  if (loading) {
    return (
      <div className="p-6 mb-[350px] mt-8">
        <div className="mb-6">
          <SkeletonLine width="w-1/3" height="h-8" className="mb-4" />
          <div className="flex flex-col sm:flex-row gap-4">
            <SkeletonLine width="w-full sm:w-5/6" height="h-10" />
            <SkeletonLine width="w-full sm:w-1/6" height="h-10" />
          </div>
        </div>
        <div className="space-y-3">
          <SkeletonBlock height="h-20" />
          <SkeletonBlock height="h-20" />
          <SkeletonBlock height="h-20" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 mb-[350px] mt-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Your Conflicts</h2>
      </div>

      {anyTicketsExist ? (
        <>
          {!selected && !viewing && (
            <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between">
              <input
                type="text"
                placeholder="Search by subject, description, party..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-5/6 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={sort}
                onChange={(e) => { setPage(1); setSort(e.target.value); }}
                className="w-full sm:w-1/6 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                <option value="-createdAt">Sort by Latest</option>
                <option value="createdAt">Sort by Oldest</option>
                <option value="priority:desc">Priority High-Low</option>
                <option value="priority:asc">Priority Low-High</option>
              </select>
            </div>
          )}

          {!selected && !viewing && (search && filteredTickets.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-8">
              <p className="text-gray-500 dark:text-gray-400 mb-2">
                No results found with the search or sort criteria.
              </p>
              <button onClick={handleClearFilter} className="mt-2 inline-flex items-center text-blue-500 hover:text-blue-700">
                <RotateCcw className="w-4 h-4 mr-1" /> Clear Filter
              </button>
            </div>
          ) : !selected && !viewing ? (
            <TicketTable
              tickets={filteredTickets}
              loading={loading}
              onView={async (t) => {
                setViewing(true);
                try {
                  const fresh = await getTicketById(t._id);
                  setSelected(fresh);
                } catch {
                  setSelected(t);
                } finally {
                  setViewing(false);
                }
              }}
              pagination={{ page, limit, total, onPageChange: setPage }}
              showRaisedBy={false}
              showTypeBadges={false}
            />
          ) : !selected && viewing ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#032b44]"></div>
            </div>
          ) : (
            <TicketDetails ticket={selected as TicketResponse} onBack={() => { setSelected(null); load(); }} />
          )}
        </>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">No tickets raised at the moment.</p>
        </div>
      )}
    </div>
  );
};

export default UserConflicts;
