import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { getAllTickets, updateTicketStatus } from "@/api/ticketApi";
import { getUserProfile } from "@/api/userApi";
import { getProProfile } from "@/api/proApi";
import { TicketResponse, TicketPriority } from "@/interfaces/ticketInterface";
import TicketTable from "@/components/Reuseable/TicketTable";
import { ConfirmationModal } from "@/components/Reuseable/ConfirmationModal";
import AdminTicketDetails from "@/components/Admin/AdminTicketDetails";
import { AdminNavbar } from "@/components/Admin/AdminNavbar";
import { RotateCcw } from "lucide-react";
import { AdminTopNavbar } from "@/components/Admin/AdminTopNavbar";

const AdminConflictManagement: React.FC = () => {
  const admin = useSelector((s: RootState) => s.auth.user);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 1024);
  const [tickets, setTickets] = useState<TicketResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(5);
  // Single sort control that also implies status when relevant
  type SortKey =
    | "default_all"
    | "pending_priority_desc_createdAt_asc"
    | "pending_priority_asc_createdAt_asc"
    | "latest"
    | "oldest"
    | "priority_desc"
    | "priority_asc"
    | "status_pending"
    | "status_under_review"
    | "status_resolved";
  // Default: Show all — Under Review first, then Pending (priority high→low, oldest first), then Resolved
  const [sortKey, setSortKey] = useState<SortKey>("default_all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<TicketResponse | null>(null);
  const [uiMode, setUiMode] = useState<"list" | "details">("list");
  const [openConfirm, setOpenConfirm] = useState<{ type: "openTicket" | "closeTicket" | null; ticket?: TicketResponse }>(
    { type: null }
  );
  const [closeComment, setCloseComment] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [anyTicketsExist, setAnyTicketsExist] = useState<boolean>(true);

  // Simple caches to avoid duplicate profile fetches per session
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

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setErrorMessage(null);
    setTimeout(() => setSuccessMessage(null), 2000);
  };

  const handleClearFilter = () => {
    setSearch("");
    setSortKey("default_all");
    setPage(1);
  };
  const showError = (msg: string) => {
    setErrorMessage(msg);
    setSuccessMessage(null);
    setTimeout(() => setErrorMessage(null), 2000);
  };

  const load = async () => {
    setLoading(true);
    try {
      // Map sortKey to API params
      let apiStatus: string | undefined = undefined;
      let apiSort: string | undefined = undefined;
      switch (sortKey) {
        case "default_all":
          apiStatus = undefined;
          apiSort = "-createdAt"; // fetch all; final ordering client-side
          break;
        case "pending_priority_desc_createdAt_asc":
          apiStatus = "pending";
          apiSort = "priority:desc"; // tie-break handled client-side
          break;
        case "pending_priority_asc_createdAt_asc":
          apiStatus = "pending";
          apiSort = "priority:asc";
          break;
        case "status_pending":
          apiStatus = "pending";
          apiSort = "priority:desc"; // keep same as default pending ordering
          break;
        case "status_under_review":
          apiStatus = "under_review";
          apiSort = "-createdAt"; // latest first for these
          break;
        case "status_resolved":
          apiStatus = "resolved";
          apiSort = "-createdAt";
          break;
        case "latest":
          apiSort = "-createdAt";
          break;
        case "oldest":
          apiSort = "createdAt";
          break;
        case "priority_desc":
          apiSort = "priority:desc";
          break;
        case "priority_asc":
          apiSort = "priority:asc";
          break;
      }
      const res = await getAllTickets(page, limit, apiStatus, apiSort);
      const raw = res.tickets || [];
      // Populate missing names client-side for admin view
      const populated = await Promise.all(
        raw.map(async (t) => {
          const complainantName = (t.complainantName && t.complainantName.trim()) || await resolveName(t.complainantType, t.complainantId);
          const againstName = (t.againstName && t.againstName.trim()) || await resolveName(t.againstType, t.againstId);
          return { ...t, complainantName, againstName } as TicketResponse;
        })
      );
      setTickets(populated);
      setTotal(res.total || 0);
    } catch (err: unknown) {
      console.error("Load tickets error", err);
      showError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sortKey]);

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

  // Check if there are any tickets at all (for initial empty state UI)
  useEffect(() => {
    const checkAny = async () => {
      try {
        const res = await getAllTickets(1, 1, undefined, "-createdAt");
        setAnyTicketsExist((res.total || 0) > 0);
      } catch {
        setAnyTicketsExist(true);
      }
    };
    checkAny();
  }, []);

  const filteredTickets = useMemo(() => {
    if (!search) return tickets;
    const s = search.toLowerCase();
    return tickets.filter((t) => {
      const against = `${t.againstName ?? t.againstId}`.toLowerCase();
      const raisedBy = `${t.complainantName ?? t.complainantId}`.toLowerCase();
      const complaint = `${t.subject} ${t.description}`.toLowerCase();
      return against.includes(s) || raisedBy.includes(s) || complaint.includes(s);
    });
  }, [tickets, search]);

  // Ensure compound ordering client-side for cases where API can't multi-sort
  const orderedTickets = useMemo(() => {
    const arr = [...filteredTickets];
    const byCreatedAsc = (a: TicketResponse, b: TicketResponse) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    const prVal = (p?: TicketPriority) => (p === "high" ? 3 : p === "medium" ? 2 : p === "low" ? 1 : 0);
    if (sortKey === "default_all") {
      const under = arr.filter((t) => t.status === "under_review").sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const pending = arr
        .filter((t) => t.status === "pending")
        .sort((a, b) => {
          const p = prVal(b.priority) - prVal(a.priority);
          if (p !== 0) return p;
          return byCreatedAsc(a, b);
        });
      const resolved = arr.filter((t) => t.status === "resolved").sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return [...under, ...pending, ...resolved];
    }
    if (sortKey === "pending_priority_desc_createdAt_asc") {
      return arr.sort((a, b) => {
        const p = prVal(b.priority) - prVal(a.priority);
        if (p !== 0) return p;
        return byCreatedAsc(a, b);
      });
    }
    if (sortKey === "pending_priority_asc_createdAt_asc") {
      return arr.sort((a, b) => {
        const p = prVal(a.priority) - prVal(b.priority);
        if (p !== 0) return p;
        return byCreatedAsc(a, b);
      });
    }
    if (sortKey === "priority_desc") {
      return arr.sort((a, b) => prVal(b.priority) - prVal(a.priority));
    }
    if (sortKey === "priority_asc") {
      return arr.sort((a, b) => prVal(a.priority) - prVal(b.priority));
    }
    if (sortKey === "latest") {
      return arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    if (sortKey === "oldest") {
      return arr.sort(byCreatedAsc);
    }
    return arr;
  }, [filteredTickets, sortKey]);

  const handleUpdateStatus = async (
    id: string,
    nextStatus: TicketResponse["status"],
    adminComment?: string
  ): Promise<TicketResponse | undefined> => {
    try {
      const updated = await updateTicketStatus(id, { status: nextStatus, adminComment, resolvedBy: admin?.id });
      showSuccess("Ticket updated successfully");
      // Refresh list in background after we get the fresh ticket to avoid race
      load();
      return updated;
    } catch (err: unknown) {
      console.error("Update ticket status error", err);
      showError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to update ticket");
      return undefined;
    }
  };

  const handleView = async (t: TicketResponse): Promise<void> => {
    // enforce single under_review only when attempting to open a pending ticket
    const hasAnotherUR = tickets.some((x) => x.status === "under_review" && x._id !== t._id);
    if (hasAnotherUR && t.status === "pending") {
      showError("New tickets can only be opened after resolving existing ones.");
      return;
    }
    if (t.status === "pending") {
      // confirm opening (set under_review)
      setOpenConfirm({ type: "openTicket", ticket: t });
      return;
    }
    // already under_review or resolved (resolved can still be viewed read-only if needed)
    setSelected(t);
    setUiMode("details");
  };

  const confirmOpenTicket = async () => {
    if (!openConfirm.ticket) return;
    try {
      const updated = await handleUpdateStatus(openConfirm.ticket._id, "under_review");
      setSelected(updated || openConfirm.ticket);
      setUiMode("details");
    } finally {
      setOpenConfirm({ type: null });
    }
  };

  const requestCloseTicket = (t: TicketResponse, comment: string) => {
    setCloseComment(comment);
    setOpenConfirm({ type: "closeTicket", ticket: t });
  };

  const confirmCloseTicket = async () => {
    const t = openConfirm.ticket;
    if (!t) return;
    const trimmed = closeComment.trim();
    if (trimmed.length < 5) return; // validation handled in details component UI
    try {
      await handleUpdateStatus(t._id, "resolved", trimmed);
      setUiMode("list");
      setSelected(null);
      setCloseComment("");
    } finally {
      setOpenConfirm({ type: null });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Top Navbar */}
      <AdminTopNavbar 
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen} 
        userName={admin?.name}
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
          <div className="max-w-7xl mx-auto mb-[50px] space-y-4">
            <h1 className="text-2xl font-semibold text-gray-800">Conflict Management</h1>

            {successMessage && (
              <div className="p-3 bg-green-100 text-green-800 rounded-md text-center">{successMessage}</div>
            )}
            {errorMessage && (
              <div className="p-3 bg-red-100 text-red-800 rounded-md text-center">{errorMessage}</div>
            )}

            {/* Controls + Empty States */}
            {!anyTicketsExist ? (
              <div className="text-center py-12 text-gray-600">No tickets raised at the moment.</div>
            ) : (
              <>
                {uiMode === "list" && (
                  <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between">
                    <div className="relative w-full sm:w-5/6">
                      <input
                        type="text"
                        placeholder="Search by raised against, complaint, or raised by"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="relative w-full sm:w-1/6">
                      {/* Single sort that also implies status when needed */}
                      <select
                        value={sortKey}
                        onChange={(e) => { setPage(1); setSortKey(e.target.value as SortKey); }}
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                      >
                        {/* Default (all statuses) */}
                        <option value="default_all">Default</option>
                        {/* General sorts */}
                        <option value="oldest">Oldest</option>
                        <option value="latest">Latest</option>
                        <option value="priority_desc">Priority High→Low</option>
                        <option value="priority_asc">Priority Low→High</option>
                        {/* Status filters */}
                        <option value="status_pending">Pending</option>
                        <option value="status_under_review">Under Review</option>
                        <option value="status_resolved">Resolved</option>
                      </select>
                    </div>
                  </div>
                )}

                {uiMode === "list" ? (
                  (search && filteredTickets.length === 0) || ((sortKey.includes("pending") || sortKey.includes("under_review") || sortKey.includes("resolved")) && tickets.length === 0) ? (
                    <div className="flex flex-col items-center justify-center py-10">
                      <p className="text-gray-500 mb-2">No results found with the search or sort criteria.</p>
                      <button
                        onClick={handleClearFilter}
                        className="mt-2 inline-flex items-center text-blue-600 hover:text-blue-700"
                      >
                        <RotateCcw className="w-4 h-4 mr-1" /> Clear Filter
                      </button>
                    </div>
                  ) : (
                    <TicketTable
                      tickets={orderedTickets}
                      loading={loading}
                      onView={handleView}
                      pagination={{ page, limit, total, onPageChange: setPage }}
                    />
                  )
                ) : (
                  selected && (
                    <AdminTicketDetails
                      ticket={selected}
                      onBack={() => { setUiMode("list"); setSelected(null); load(); }}
                      onClose={(comment: string) => requestCloseTicket(selected, comment)}
                    />
                  )
                )}
              </>
            )}

            <ConfirmationModal
              isOpen={openConfirm.type === "openTicket"}
              onCancel={() => setOpenConfirm({ type: null })}
              onConfirm={confirmOpenTicket}
              action="openTicket"
              customTitle="Open Ticket"
            />
            <ConfirmationModal
              isOpen={openConfirm.type === "closeTicket"}
              onCancel={() => setOpenConfirm({ type: null })}
              onConfirm={confirmCloseTicket}
              action="closeTicket"
              customTitle="Close Ticket"
            />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminConflictManagement;
