import { type FC, useEffect, useState } from "react";
import { useParams, useNavigate} from "react-router-dom"; // Added useLocation to determine active tab
import { fetchPendingProById, PendingPro } from "../api/adminApi";
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

const ProProfileView: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [pro, setPro] = useState<PendingPro | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"serviceSkills" | "identity" | "availability" | "contact" | "bankDetails">("serviceSkills");
  const user = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/admin-login");
      return;
    }

    const fetchPro = async () => {
      try {
        if (id) {
          const proData = await fetchPendingProById(id);
          console.log("Fetched pro data:", proData);
          setPro(proData);
        }
      } catch (error) {
        console.error("Failed to fetch pro profile:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPro();
  }, [id, user?.id, navigate]);

  if (loading) return <div className="flex justify-center p-6">Loading...</div>;
  if (!pro) return <div className="flex justify-center p-6">Pro not found.</div>;

  const handleApprove = () => {
    console.log("Approve request for:", pro._id);
    // Add API call to approve pro and move to approvedpros collection
  };

  const handleReject = () => {
    console.log("Reject request for:", pro._id);
    // Add API call to reject pro
  };

  if (!user || user.role !== "admin") return null;

  return (
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
            {/* Profile Content */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              {/* Breadcrumb */}
              <div className="text-start pb-5 bg-white m-0 pl-0">
                <div className="flex place-items-start m-0 text-sm pl-0 text-gray-500 space-x-1">
                  <span
                    className="text-blue-600 cursor-pointer hover:underline"
                    onClick={() => navigate("/admin/pro-management")}
                  >
                    Facility/Site Management
                  </span>
                  <ChevronRight className="w-4 h-4 mx-1" />
                  <span
                    className="text-blue-600 cursor-pointer hover:underline"
                    onClick={() => navigate("/admin/pro-management")}
                  >
                    Approval Pending Users
                  </span>
                  <ChevronRight className="w-4 h-4 mx-1" />
                  <span>View Profile</span>
                </div>
              </div>

              {/* Banner and Profile */}
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
                        src={pro.profilePhoto || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=774&q=80"}
                        alt={`${pro.firstName} ${pro.lastName}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-12 md:mt-0 mb-5 md:ml-0 place-items-start">
                <h1 className="text-2xl font-semibold text-gray-800">{`${pro.firstName} ${pro.lastName}`}</h1>
              </div>

              {/* Tabs */}
              <div className="mb-6">
                <div className="flex border-b">
                  <button
                    className={`px-4 py-2 font-medium text-sm ${activeTab === "serviceSkills" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"}`}
                    onClick={() => setActiveTab("serviceSkills")}
                  >
                    Service/Skills
                  </button>
                  <button
                    className={`px-4 py-2 font-medium text-sm ${activeTab === "identity" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"}`}
                    onClick={() => setActiveTab("identity")}
                  >
                    Proof of Identity
                  </button>
                  <button
                    className={`px-4 py-2 font-medium text-sm ${activeTab === "availability" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"}`}
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
                </div>
              </div>

              {/* Tab Content */}
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
                        <div key={index} className="border rounded-lg overflow-hidden w-100">
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
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 mt-6">
                <button
                  onClick={handleApprove}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                >
                  <span className="text-sm">✓</span> Approve Request
                </button>
                <button
                  onClick={handleReject}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium flex items-center justify-center gap-2"
                >
                  <span className="text-sm">✕</span> Reject Request
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ProProfileView;