import { type FC, useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  fetchPendingProById,
  approvePro,
  rejectPro,
  fetchApprovedProById,
  toggleBanPro,
} from "../../api/adminApi";
import { IApprovedPro, PendingPro } from "../../interfaces/adminInterface";
import { ArrowLeft, Phone, MapPin, Mail, User, CreditCard, Building, Calendar } from "lucide-react";
import { AdminNavbar } from "./AdminNavbar";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { ConfirmationModal } from "../Reuseable/ConfirmationModal";
import { AdminTopNavbar } from "./AdminTopNavbar";

const SkillBadge = ({ name }: { name: string }) => (
  <div className="px-4 py-2 text-sm font-medium bg-gray-100 rounded-lg text-gray-800">{name}</div>
);

const convertTo12Hour = (time: string): { time: string; period: "AM" | "PM" } => {
  const [hour, minute] = time.split(":").map(Number);
  const period = hour >= 12 ? "PM" : "AM";
  const adjustedHour = hour % 12 || 12;
  return { time: `${adjustedHour}:${minute.toString().padStart(2, "0")}`, period };
};

const AvailabilityRow = ({ day, timeSlots }: { day: string; timeSlots: { startTime: string; endTime: string }[] }) => (
  <div className="flex items-center gap-3 mb-3">
    <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
      <Calendar className="w-4 h-4 text-gray-600" />
    </div>
    <div>
      <div className={`font-medium ${timeSlots.length === 0 ? "text-gray-400" : "text-gray-900"}`}>{day}</div>
      <div className="text-sm text-gray-500">
        {timeSlots.length === 0
          ? "Not Available"
          : timeSlots
              .map((slot) => {
                const start = convertTo12Hour(slot.startTime);
                const end = convertTo12Hour(slot.endTime);
                return `${start.time} ${start.period} - ${end.time} ${end.period}`;
              })
              .join(", ")}
      </div>
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

const ProProfileView: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [pro, setPro] = useState<PendingPro | IApprovedPro | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 1024);
  const [activeTab, setActiveTab] = useState<
    "service" | "identity" | "availability" | "contact" | "bankDetails" | "action"
  >("service");
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
          const pendingProData = await fetchPendingProById(id);
          setPro(pendingProData);
        } else {
          try {
            const approvedProData = await fetchApprovedProById(id);
            setPro(approvedProData);
          } catch (approvedError) {
            console.error('Failed to fetch approved pro, trying pending:', approvedError);
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
  }, [id, user, navigate, location.state]);

  useEffect(() => {
    const handleResize = () => setIsLargeScreen(window.innerWidth >= 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Show not-found only after loading finishes
  if (!loading && !pro) return <div className="flex justify-center p-6">Pro not found.</div>;

  const handleApprove = () => {
    if (pro && "createdAt" in pro) {
      setAction("approve");
      setShowConfirmModal(true);
      setError(null);
    }
  };

  const handleReject = () => {
    if (pro && "createdAt" in pro) {
      setAction("reject");
      setShowConfirmModal(true);
      setError(null);
    }
  };

  const handleBan = () => {
    if (pro && !("createdAt" in pro)) {
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
      if (action === "approve" && pro && "createdAt" in pro) {
        await approvePro(pro._id, { about: null });
        setShowConfirmModal(false);
        setAction(null);
        navigate("/admin/pro-management", { state: { tab: "approved", fromNavigation: true } });
      } else if (action === "reject" && pro && "createdAt" in pro && reason) {
        await rejectPro(pro._id, { reason });
        setShowConfirmModal(false);
        setAction(null);
        navigate("/admin/pro-management", { state: { tab: "pending", fromNavigation: true } });
      } else if ((action === "ban" || action === "unban") && pro && !("createdAt" in pro)) {
        await toggleBanPro(pro._id, action === "ban");
        setPro((prev) => (prev ? { ...prev, isBanned: action === "ban" } : null));
        setShowConfirmModal(false);
        setAction(null);
      }
    } catch (error) {
      console.error(`${action} failed:`, error);
      setError(`Failed to ${action} pro. Please try again.`);
    } finally {
      setIsProcessing(false);
      setReason("");
      setCustomReason("");
    }
  };

  const handleCancel = () => {
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
        <AdminTopNavbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} userName={user.name} isLargeScreen={isLargeScreen} />

        <div className="flex flex-1 overflow-visible">
          <AdminNavbar isOpen={sidebarOpen} />
          <main
            className={`flex-1 overflow-y-auto p-6 transition-all duration-300`}
          >
            <div className="max-w-7xl mx-auto mb-10">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="spinner"></div>
                </div>
              ) : (
              pro && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="pb-5">
                  <button
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center gap-2 text-[#032B44] hover:underline"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
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
                    <div className="md:absolute md:-top-16 md:left-8 -mt-12 md:mt-0">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-white overflow-hidden bg-gray-200">
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
                  {pro && !("createdAt" in pro) && (
                    <p className="text-md text-gray-600 mt-2">
                      {pro.about ?? `Hi, I am ${pro.firstName} ${pro.lastName}, I specialize in ${pro.category.name} works, and if you have questions, feel free to message me.`}
                    </p>
                  )}
                </div>

                <div className="mb-6">
                  <div className="flex border-b overflow-x-auto">
                    <button
                      className={`px-4 py-2 font-medium text-sm flex-shrink-0 ${
                        activeTab === "service" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"
                      }`}
                      onClick={() => setActiveTab("service")}
                    >
                      Service
                    </button>
                    <button
                      className={`px-4 py-2 font-medium text-sm flex-shrink-0 ${
                        activeTab === "identity" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"
                      }`}
                      onClick={() => setActiveTab("identity")}
                    >
                      Proof of Identity
                    </button>
                    <button
                      className={`px-4 py-2 font-medium text-sm flex-shrink-0 ${
                        activeTab === "availability" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"
                      }`}
                      onClick={() => setActiveTab("availability")}
                    >
                      Availability
                    </button>
                    <button
                      className={`px-4 py-2 font-medium text-sm flex-shrink-0 ${
                        activeTab === "contact" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"
                      }`}
                      onClick={() => setActiveTab("contact")}
                    >
                      Contact
                    </button>
                    <button
                      className={`px-4 py-2 font-medium text-sm flex-shrink-0 ${
                        activeTab === "bankDetails" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"
                      }`}
                      onClick={() => setActiveTab("bankDetails")}
                    >
                      Bank Details
                    </button>
                    {pro && !("createdAt" in pro) && (
                      <button
                        className={`px-4 py-2 font-medium text-sm flex-shrink-0 ${
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
                  {activeTab === "service" && (
                    <div>
                      <h3 className="text-md font-medium text-gray-600 mb-4">Service</h3>
                      <div className="flex flex-wrap gap-4">
                        <SkillBadge name={pro.category.name} />
                      </div>
                    </div>
                  )}

                  {activeTab === "identity" && (
                    <div>
                      <h3 className="text-md font-medium text-gray-600 mb-4">Proof of Identity</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        {pro.idProof.map((proof, index) => (
                          <div key={index} className="border rounded-lg overflow-hidden">
                            <img src={proof} alt={`ID Proof ${index + 1}`} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                      <h3 className="text-md font-medium text-gray-600 mb-4">Profile Image</h3>
                      <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                        <div className="border rounded-lg overflow-hidden w-40 h-40 sm:w-64 sm:h-64">
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
                    <div className={pro && !("createdAt" in pro) && pro.isUnavailable ? "opacity-50" : ""}>
                      <h3 className="text-md font-medium text-gray-600 mb-4">Available Days</h3>
                      {pro && !("createdAt" in pro) && pro.isUnavailable && (
                        <p className="text-red-500 mb-4">Status: Currently Unavailable</p>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <AvailabilityRow day="Monday" timeSlots={pro.availability.monday || []} />
                          <AvailabilityRow day="Tuesday" timeSlots={pro.availability.tuesday || []} />
                          <AvailabilityRow day="Wednesday" timeSlots={pro.availability.wednesday || []} />
                          <AvailabilityRow day="Thursday" timeSlots={pro.availability.thursday || []} />
                        </div>
                        <div>
                          <AvailabilityRow day="Friday" timeSlots={pro.availability.friday || []} />
                          <AvailabilityRow day="Saturday" timeSlots={pro.availability.saturday || []} />
                          <AvailabilityRow day="Sunday" timeSlots={pro.availability.sunday || []} />
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "contact" && (
                    <div>
                      <h3 className="text-md font-medium text-gray-600 mb-4">Contact</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <ContactRow label="Phone Number" value={"+91 " + pro.phoneNumber} />
                          <ContactRow label="Location" value={pro.location.address} />
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

                  {activeTab === "action" && pro && !("createdAt" in pro) && (
                    <div>
                      <h3 className="text-md font-medium text-gray-600 mb-4">Actions</h3>
                      <button
                        onClick={handleBan}
                        className="px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors duration-200 bg-[#032B44] text-white hover:bg-[#054869]"
                      >
                        <span className="text-sm">{pro.isBanned ? "✓" : "✕"}</span>
                        {pro.isBanned ? "Unban" : "Ban"}
                      </button>
                    </div>
                  )}
                </div>

                {pro && "createdAt" in pro && (
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
              )
              )}
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