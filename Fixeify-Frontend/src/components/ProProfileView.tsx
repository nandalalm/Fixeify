import { type FC, useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  fetchPendingProById,
  PendingPro,
  approvePro,
  rejectPro,
  fetchApprovedProById,
  IApprovedPro,
  toggleBanPro,
} from "../api/adminApi";
import { ChevronRight, Phone, MapPin, Mail, User, CreditCard, Building, Calendar } from "lucide-react";
import { AdminNavbar } from "../components/AdminNavbar";
import { Menu } from "lucide-react";
import { useSelector } from "react-redux";
import { RootState } from "../store/store";

const SkillBadge = ({ name }: { name: string }) => (
  <div className="px-4 py-2 text-sm font-medium bg-gray-100 rounded-lg text-gray-800">{name}</div>
);

const AvailabilityRow = ({ day, status }: { day: string; status: string }) => (
  <div className="flex items-center gap-3 mb-3">
    <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
      <Calendar className="w-4 h-4 text-gray-600" />
    </div>
    <div>
      <div className={`font-medium ${status === "Not Available" ? "text-gray-400" : "text-gray-900"}`}>{day}</div>
      <div className="text-sm text-gray-500">{status}</div>
    </div>
  </div>
);

const ContactRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center gap-3 mb-3">
    {label === "Phone Number" && <Phone className="w-4 h-4 text-gray-600" />}
    {label === "Location" && <MapPin className="w-4 h-4 text-gray-600" />}
    {label === "Email" && <Mail className="w-4 h-4 text-gray-600" />}
    <div>
      <div className="font-medium text-gray-900">{label}</div>
      <div className="text-sm text-gray-500">{value}</div>
    </div>
  </div>
);

const BankRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center gap-3 mb-3">
    {label === "Account Holder Name" && <User className="w-4 h-4 text-gray-600" />}
    {label === "Account Number" && <CreditCard className="w-4 h-4 text-gray-600" />}
    {label === "Bank Name" && <Building className="w-4 h-4 text-gray-600" />}
    <div>
      <div className="font-medium text-gray-900">{label}</div>
      <div className="text-sm text-gray-500">{value}</div>
    </div>
  </div>
);

const ConfirmationModal = ({
  isOpen,
  onConfirm,
  onCancel,
  action,
  reason,
  setReason,
  customReason,
  setCustomReason,
  error,
  isProcessing,
}: {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  action: "approve" | "reject" | "ban" | "unban" | null;
  reason: string;
  setReason: (reason: string) => void;
  customReason: string;
  setCustomReason: (reason: string) => void;
  error: string | null;
  isProcessing: boolean;
}) => {
  if (!isOpen) return null;

  const reasons = ["Incomplete documentation", "Insufficient skills", "Background check failed", "Other"];

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 supports-[backdrop-filter]:bg-transparent supports-[backdrop-filter]:bg-opacity-0">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96 relative">
        {isProcessing && (
          <div className="absolute inset-0 bg-white bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="spinner"></div>
          </div>
        )}
        <h3 className="text-lg font-semibold mb-4">
          {action === "approve" && "Approve Pro"}
          {action === "reject" && "Reject Pro"}
          {action === "ban" && "Ban Pro"}
          {action === "unban" && "Unban Pro"}
        </h3>
        <p className="mb-4">
          {action === "approve" && "Are you sure you want to approve this pro?"}
          {action === "reject" && "Please select a reason for rejection:"}
          {action === "ban" && "Are you sure you want to ban this pro?"}
          {action === "unban" && "Are you sure you want to unban this pro?"}
        </p>
        {action === "reject" && (
          <div className="mb-4">
            <select
              value={reason === customReason && customReason ? "Other" : reason}
              onChange={(e) => {
                if (e.target.value === "Other") {
                  setReason("");
                } else {
                  setReason(e.target.value);
                  setCustomReason("");
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              disabled={isProcessing}
            >
              <option value="">Select a reason</option>
              {reasons.map((r, index) => (
                <option key={index} value={r}>{r}</option>
              ))}
            </select>
            {reason === "" && (
              <textarea
                value={customReason}
                onChange={(e) => {
                  setCustomReason(e.target.value);
                  setReason(e.target.value);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md mt-2"
                placeholder="Enter custom reason"
                disabled={isProcessing}
              />
            )}
            {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
          </div>
        )}
        <div className="flex justify-end gap-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            disabled={isProcessing}
          >
            {isProcessing ? "Processing..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
};

const ProProfileView: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [pro, setPro] = useState<PendingPro | IApprovedPro | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "serviceSkills" | "identity" | "availability" | "contact" | "bankDetails" | "action"
  >("serviceSkills");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [action, setAction] = useState<"approve" | "reject" | "ban" | "unban" | null>(null);
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const user = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/admin-login");
      return;
    }

    const fetchPro = async () => {
      try {
        if (!id) {
          console.error("ID is undefined, cannot fetch pro profile");
          setLoading(false);
          return;
        }
        const isFromPending = location.state?.fromPending || false;
        if (isFromPending) {
          console.log("Fetching pending pro for ID:", id);
          const pendingProData = await fetchPendingProById(id);
          setPro(pendingProData);
        } else {
          try {
            console.log("Fetching approved pro for ID:", id);
            const approvedProData = await fetchApprovedProById(id);
            setPro(approvedProData);
          } catch (approvedError) {
            console.log("Approved pro not found, fetching pending pro for ID:", id);
            const pendingProData = await fetchPendingProById(id);
            setPro(pendingProData);
          }
        }
      } catch (error) {
        console.error("Failed to fetch pro profile:", error);
        setPro(null);
      } finally {
        setLoading(false);
      }
    };
    fetchPro();
  }, [id, user?.id, navigate, location.state]);

  if (loading) return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50">
      <div className="spinner"></div>
    </div>
  );
  if (!pro) return <div className="flex justify-center p-6">Pro not found.</div>;

  const defaultAbout = !("createdAt" in pro) && pro.about
    ? pro.about
    : !("createdAt" in pro) && !pro.about
    ? `Hi, I am ${pro.firstName} ${pro.lastName}, I specialize in ${pro.serviceType} works, and if you have any questions, feel free to message me.`
    : "";

  const handleApprove = () => {
    if ("createdAt" in pro) {
      setAction("approve");
      setShowConfirmModal(true);
      setError(null);
    }
  };

  const handleReject = () => {
    if ("createdAt" in pro) {
      setAction("reject");
      setShowConfirmModal(true);
      setError(null);
    }
  };

  const handleBan = () => {
    if (!("createdAt" in pro)) {
      setAction(pro.isBanned ? "unban" : "ban");
      setShowConfirmModal(true);
      setError(null);
    }
  };

  const handleConfirm = async () => {
    if (action === "reject" && !reason) {
      setError("Please choose a reason before confirming");
      return;
    }

    setIsProcessing(true);
    try {
      if (action === "approve" && "createdAt" in pro) {
        console.log("Calling approvePro for ID:", pro._id);
        await approvePro(pro._id, { about: null });
        console.log("approvePro completed, closing modal");
        setShowConfirmModal(false);
        setAction(null);
        navigate("/admin/pro-management", { state: { tab: "approved", fromNavigation: true } });
      } else if (action === "reject" && "createdAt" in pro && reason) {
        console.log("Calling rejectPro for ID:", pro._id, "with reason:", reason);
        await rejectPro(pro._id, { reason });
        console.log("rejectPro completed, closing modal");
        setShowConfirmModal(false);
        setAction(null);
        navigate("/admin/pro-management", { state: { tab: "pending", fromNavigation: true } });
      } else if ((action === "ban" || action === "unban") && !("createdAt" in pro)) {
        console.log("Calling toggleBanPro for ID:", pro._id, "ban:", action === "ban");
        await toggleBanPro(pro._id, action === "ban");
        setPro((prev) => (prev ? { ...prev, isBanned: action === "ban" } : null));
        console.log("toggleBanPro completed, closing modal");
        setShowConfirmModal(false);
        setAction(null);
      }
    } catch (error) {
      console.error(`${action} failed:`, error);
      setError(`Failed to ${action} pro. Please try again.`);
    } finally {
      setIsProcessing(false);
      console.log("Resetting modal state");
      setReason("");
      setCustomReason("");
    }
  };

  const handleCancel = () => {
    console.log("Cancel modal, resetting state");
    setShowConfirmModal(false);
    setAction(null);
    setReason("");
    setCustomReason("");
    setError(null);
    setIsProcessing(false);
  };

  if (!user || user.role !== "admin") return null;

  return (
    <>
      <style>
        {`
          .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #032b44;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      <div className="flex flex-col h-screen bg-gray-50">
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
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">{user.name}</span>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <AdminNavbar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
          <main
            className={`flex-1 overflow-y-auto p-6 transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-0"}`}
          >
            <div className="max-w-7xl mx-auto mb-10">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="text-start pb-5 bg-white m-0 pl-0">
                  <div className="flex place-items-start m-0 text-sm pl-0 text-gray-500 space-x-1">
                    <span
                      className="text-blue-600 cursor-pointer hover:underline"
                      onClick={() =>
                        navigate("/admin/pro-management", {
                          state: { tab: "createdAt" in pro ? "pending" : "approved", fromNavigation: true },
                        })
                      }
                    >
                      Facility/Site Management
                    </span>
                    <ChevronRight className="w-4 h-4 mx-1" />
                    <span
                      className="text-blue-600 cursor-pointer hover:underline"
                      onClick={() =>
                        navigate("/admin/pro-management", {
                          state: { tab: "createdAt" in pro ? "pending" : "approved", fromNavigation: true },
                        })
                      }
                    >
                      {"createdAt" in pro ? "Approval Pending Users" : "Approved Pros"}
                    </span>
                    <ChevronRight className="w-4 h-4 mx-1" />
                    <span>View Profile</span>
                  </div>
                </div>

                <div className="mb-2 rounded-lg overflow-hidden">
                  <div className="h-48 bg-gray-200">
                    <img
                      src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80"
                      alt="Banner"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="bg-white p-4 flex flex-col items-center md:items-start md:flex-row relative">
                    <div className="absolute -top-16 left-1/2 md:left-8 transform -translate-x-1/2 md:translate-x-0">
                      <div className="w-24 h-24 rounded-full border-4 border-white overflow-hidden bg-gray-200">
                        <img
                          src={
                            pro.profilePhoto ||
                            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=774&q=80"
                          }
                          alt={`${pro.firstName} ${pro.lastName}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-12 md:mt-0 mb-5 md:ml-3 place-items-start">
                  <h1 className="text-2xl font-semibold text-gray-800">{`${pro.firstName} ${pro.lastName}`}</h1>
                  {!("createdAt" in pro) && <p className="text-md text-gray-600 mt-2">{defaultAbout}</p>}
                </div>

                <div className="mb-6">
                  <div className="flex border-b">
                    <button
                      className={`px-4 py-2 font-medium text-sm ${
                        activeTab === "serviceSkills" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"
                      }`}
                      onClick={() => setActiveTab("serviceSkills")}
                    >
                      Service/Skills
                    </button>
                    <button
                      className={`px-4 py-2 font-medium text-sm ${
                        activeTab === "identity" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"
                      }`}
                      onClick={() => setActiveTab("identity")}
                    >
                      Proof of Identity
                    </button>
                    <button
                      className={`px-4 py-2 font-medium text-sm ${
                        activeTab === "availability" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"
                      }`}
                      onClick={() => setActiveTab("availability")}
                    >
                      Availability
                    </button>
                    <button
                      className={`px-4 py-2 font-medium text-sm ${
                        activeTab === "contact" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"
                      }`}
                      onClick={() => setActiveTab("contact")}
                    >
                      Contact
                    </button>
                    <button
                      className={`px-4 py-2 font-medium text-sm ${
                        activeTab === "bankDetails" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"
                      }`}
                      onClick={() => setActiveTab("bankDetails")}
                    >
                      Bank Details
                    </button>
                    {!("createdAt" in pro) && (
                      <button
                        className={`px-4 py-2 font-medium text-sm ${
                          activeTab === "action" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"
                        }`}
                        onClick={() => setActiveTab("action")}
                      >
                        Action
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                  {activeTab === "serviceSkills" && (
                    <div>
                      <h3 className="text-md font-medium text-gray-600 mb-4">Services</h3>
                      <div className="flex flex-wrap gap-4 mb-4">
                        <SkillBadge name={pro.serviceType} />
                      </div>
                      <h3 className="text-md font-medium text-gray-600 mb-4">Skills</h3>
                      <div className="flex flex-wrap gap-4">
                        {pro.skills.map((skill, index) => (
                          <SkillBadge key={index} name={skill} />
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === "identity" && (
                    <div>
                      <h3 className="text-md font-medium text-gray-600 mb-4">Proof of Identity</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        {pro.idProof.map((proof, index) => (
                          <div key={index} className="border rounded-lg overflow-hidden">
                            <img src={proof} alt={`ID Proof ${index + 1}`} className="w-full h-64 object-cover" />
                          </div>
                        ))}
                      </div>
                      <h3 className="text-md font-medium text-gray-600 mb-4">Profile Image</h3>
                      <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                        <div className="border rounded-lg overflow-hidden w-64 h-64">
                          <img
                            src={
                              pro.profilePhoto ||
                              "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=774&q=80"
                            }
                            alt={`${pro.firstName} ${pro.lastName}'s Profile`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "availability" && (
                    <div>
                      <h3 className="text-md font-medium text-gray-600 mb-4">Available Days</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <AvailabilityRow
                            day="Monday"
                            status={pro.availability.monday ? "Available" : "Not Available"}
                          />
                          <AvailabilityRow
                            day="Tuesday"
                            status={pro.availability.tuesday ? "Available" : "Not Available"}
                          />
                          <AvailabilityRow
                            day="Wednesday"
                            status={pro.availability.wednesday ? "Available" : "Not Available"}
                          />
                          <AvailabilityRow
                            day="Thursday"
                            status={pro.availability.thursday ? "Available" : "Not Available"}
                          />
                        </div>
                        <div>
                          <AvailabilityRow
                            day="Friday"
                            status={pro.availability.friday ? "Available" : "Not Available"}
                          />
                          <AvailabilityRow
                            day="Saturday"
                            status={pro.availability.saturday ? "Available" : "Not Available"}
                          />
                          <AvailabilityRow
                            day="Sunday"
                            status={pro.availability.sunday ? "Available" : "Not Available"}
                          />
                        </div>
                      </div>
                      <h3 className="text-md font-medium text-gray-600 mt-6 mb-4">Working Hours</h3>
                      <p className="text-gray-700">{pro.workingHours}</p>
                    </div>
                  )}

                  {activeTab === "contact" && (
                    <div>
                      <h3 className="text-md font-medium text-gray-600 mb-4">Contact</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <ContactRow label="Phone Number" value={"+91 " + pro.phoneNumber} />
                          <ContactRow label="Location" value={pro.location} />
                          <ContactRow label="Email" value={pro.email} />
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "bankDetails" && (
                    <div>
                      <h3 className="text-md font-medium text-gray-600 mb-4">Bank Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <BankRow label="Account Holder Name" value={pro.accountHolderName} />
                          <BankRow label="Account Number" value={pro.accountNumber} />
                          <BankRow label="Bank Name" value={pro.bankName} />
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "action" && !("createdAt" in pro) && (
                    <div>
                      <h3 className="text-md font-medium text-gray-600 mb-4">Actions</h3>
                      <button
                        onClick={handleBan}
                        className={`px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors duration-200 ${
                          pro.isBanned
                            ? "bg-green-600 text-white hover:bg-green-700"
                            : "bg-red-600 text-white hover:bg-red-700"
                        }`}
                      >
                        <span className="text-sm">{pro.isBanned ? "✓" : "✕"}</span>
                        {pro.isBanned ? "Unban" : "Ban"}
                      </button>
                    </div>
                  )}
                </div>

                {"createdAt" in pro && (
                  <div className="flex flex-col sm:flex-row gap-4 mt-6">
                    <button
                      onClick={handleApprove}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors duration-200"
                      disabled={isProcessing}
                    >
                      <span className="text-sm">✓</span> Approve Request
                    </button>
                    <button
                      onClick={handleReject}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-gray-300 transition-colors duration-200"
                      disabled={isProcessing}
                    >
                      <span className="text-sm">✕</span> Reject Request
                    </button>
                  </div>
                )}
              </div>
            </div>
          </main>
          <ConfirmationModal
            isOpen={showConfirmModal}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
            action={action}
            reason={reason}
            setReason={setReason}
            customReason={customReason}
            setCustomReason={setCustomReason}
            error={error}
            isProcessing={isProcessing}
          />
        </div>
      </div>
    </>
  );
};

export default ProProfileView;