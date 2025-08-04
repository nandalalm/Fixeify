import { type FC, useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { ProNavbar } from "../../components/Pro/ProNavbar";
import { Car, Check, Timer } from "lucide-react";
import ProTopNavbar from "../../components/Pro/ProTopNavbar";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
}

interface TimelineItemProps {
  icon: React.ReactNode;
  title: string;
  time: string;
  isCompleted?: boolean;
  isActive?: boolean;
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

const TimelineItem: FC<TimelineItemProps> = ({ icon, title, time, isCompleted = false, isActive = false }) => {
  return (
    <div className="flex">
      <div className="flex flex-col items-center mr-4">
        <div
          className={`flex items-center justify-center w-8 h-8 rounded-full ${
            isCompleted ? "bg-green-100" : isActive ? "bg-blue-100" : "bg-gray-100"
          }`}
        >
          {icon}
        </div>
        <div className="w-px h-full bg-gray-200 my-1"></div>
      </div>
      <div className="pb-6">
        <p className="font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-500">{time}</p>
      </div>
    </div>
  );
};

const ProDashboard: FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true); 
  const [greeting, setGreeting] = useState("");
  const user = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  if (!user ) {
    return null;
  }

  const stats = [
    { title: "Total earnings", value: "$1,240", subtitle: "This month" },
    { title: "Completed jobs", value: "12", subtitle: "This month" },
    { title: "Pending jobs", value: "3", subtitle: "Upcoming" },
    { title: "Average rating", value: "4.8", subtitle: "Based on 50 reviews" },
  ];

  const timelineItems = [
    {
      icon: <Check className="w-5 h-5 text-green-500" />,
      title: "Job confirmed",
      time: "7:30 am",
      isCompleted: true,
    },
    {
      icon: <Car className="w-5 h-5 text-blue-500" />,
      title: "On my way",
      time: "9:45 am",
      isActive: true,
    },
    {
      icon: <Check className="w-5 h-5 text-gray-400" />,
      title: "Job completed",
      time: "10:15 am",
    },
  ];

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

            {/* Stats Section */}
            <section className="mb-8">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

            {/* Next Job Section */}
            <section className="mb-8">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Your next job is at 10:00 am</h3>
              <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <div className="space-y-6">
                  {timelineItems.map((item, index) => (
                    <TimelineItem
                      key={index}
                      icon={item.icon}
                      title={item.title}
                      time={item.time}
                      isCompleted={item.isCompleted}
                      isActive={item.isActive}
                    />
                  ))}
                </div>
              </div>
            </section>

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