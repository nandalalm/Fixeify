import { useLocation, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ThumbsUp,
  ThumbsDown,
  Briefcase,
  MapPin,
  Phone,
  Clock,
  Calendar,
  CalendarDays,
} from "lucide-react";
import { IApprovedPro, ILocation } from "../../interfaces/adminInterface";
import Navbar from "../../components/User/Navbar";
import Footer from "../../components/User/Footer";
import { JSX } from "react";

const ProDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const pro = location.state?.pro as IApprovedPro | undefined;
  const categoryId = location.state?.categoryId as string | undefined;
  const selectedLocation = location.state?.location as ILocation | undefined;

  const dummyReviews = [
    {
      name: "John Doe",
      date: "May 01, 2025",
      rating: 4,
      comment: "Great service! Very professional and on time.",
    },
    {
      name: "Jane Smith",
      date: "April 15, 2025",
      rating: 5,
      comment: "Amazing work! Highly recommend.",
    },
  ];

  const formatTimeTo12Hour = (time: string) => {
    const [hour, minute] = time.split(":").map(Number);
    const period = hour >= 12 ? "PM" : "AM";
    const adjustedHour = hour % 12 || 12;
    return `${adjustedHour}:${minute.toString().padStart(2, "0")} ${period}`;
  };

  const formatAvailability = (availability: IApprovedPro["availability"]) => {
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    const availableDays = days
      .filter((day) => availability[day as keyof typeof availability]?.length)
      .map((day) => {
        const slots = availability[day as keyof typeof availability]!;
        const formattedSlots = slots.map((slot) => ({
          startTime: formatTimeTo12Hour(slot.startTime),
          endTime: formatTimeTo12Hour(slot.endTime),
        }));
        return { day: day.charAt(0).toUpperCase() + day.slice(1), slots: formattedSlots };
      });
    return availableDays;
  };

  const dayIcons: { [key: string]: JSX.Element } = {
    Monday: <CalendarDays className="w-5 h-5 text-gray-600 dark:text-gray-300" />,
    Tuesday: <CalendarDays className="w-5 h-5 text-gray-600 dark:text-gray-300" />,
    Wednesday: <CalendarDays className="w-5 h-5 text-gray-600 dark:text-gray-300" />,
    Thursday: <CalendarDays className="w-5 h-5 text-gray-600 dark:text-gray-300" />,
    Friday: <CalendarDays className="w-5 h-5 text-gray-600 dark:text-gray-300" />,
    Saturday: <CalendarDays className="w-5 h-5 text-gray-600 dark:text-gray-300" />,
    Sunday: <CalendarDays className="w-5 h-5 text-gray-600 dark:text-gray-300" />,
  };

  if (!pro) {
    return (
      <div className="flex flex-col min-h-screen dark:bg-gray-900">
        <Navbar />
        <main className="flex-1 flex items-center justify-center py-8">
          <p className="text-red-500 dark:text-red-400">Professional data not found.</p>
        </main>
        <Footer />
      </div>
    );
  }

  const availableDays = formatAvailability(pro.availability);

  return (
    <div className="flex flex-col min-h-screen dark:bg-gray-900">
      <Navbar />
      <main className="flex-1 py-8">
        <section className="container mx-auto px-2 max-w-6xl">
          <button
            onClick={() =>
              navigate(`/nearby-pros?categoryId=${categoryId || ""}`, {
                state: { location: selectedLocation },
                replace: true,
              })
            }
            className="inline-block p-1 rounded-full border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-200" />
          </button>

          <div className="flex flex-col items-center mb-8">
            <div className="w-32 h-32 rounded-full overflow-hidden mb-3">
              <img
                src={pro.profilePhoto || "/placeholder.svg"}
                alt={`${pro.firstName} ${pro.lastName}`}
                className="w-full h-full object-cover"
              />
            </div>
            <h1 className="text-4xl font-bold text-center mb-2 dark:text-gray-200">
              {pro.firstName} {pro.lastName}
            </h1>
            <a href={`mailto:${pro.email}`} className="text-gray-600 dark:text-gray-400 text-base">
              {pro.email}
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-6">
            <div>
              <div className="w-full space-y-6 mb-8">
                <div className="flex items-start pb-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md mr-4">
                    <Briefcase className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </div>
                  <div>
                    <h3 className="text-base font-medium text-gray-600 dark:text-gray-400">Service Type</h3>
                    <p className="text-base text-gray-900 dark:text-gray-200">{pro.category.name}</p>
                  </div>
                </div>

                <div className="flex items-start pb-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md mr-4">
                    <MapPin className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </div>
                  <div>
                    <h3 className="text-base font-medium text-gray-600 dark:text-gray-400">Location</h3>
                    <p className="text-base text-gray-900 dark:text-gray-200">{pro.location.address}</p>
                  </div>
                </div>

                <div className="flex items-start pb-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md mr-4">
                    <Phone className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </div>
                  <div>
                    <h3 className="text-base font-medium text-gray-600 dark:text-gray-400">Phone</h3>
                    <p className="text-base text-gray-900 dark:text-gray-200">{pro.phoneNumber}</p>
                  </div>
                </div>

                <div className="flex items-start pb-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md mr-4">
                    <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </div>
                  <div className="w-full">
                    <h3 className="text-base font-medium text-gray-600 dark:text-gray-400">Availability</h3>
                    {availableDays.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                        {availableDays.map((day) => (
                          <div
                            key={day.day}
                            className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              {dayIcons[day.day]}
                              <p className="text-base text-gray-900 dark:text-gray-200">{day.day}</p>
                            </div>
                            <ul className="ml-4">
                              {day.slots.map((slot, index) => (
                                <li
                                  key={index}
                                  className="flex items-center gap-2 text-base text-gray-900 dark:text-gray-200"
                                >
                                  <Clock className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                                  {slot.startTime} - {slot.endTime}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-base text-gray-900 dark:text-gray-200">Not available</p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-medium mb-3 text-gray-900 dark:text-gray-200">Reviews</h2>
                {dummyReviews.map((review, index) => (
                  <div
                    key={index}
                    className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 overflow-hidden">
                        <img
                          src="/placeholder.svg?height=40&width=40"
                          alt={review.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="font-medium text-base text-gray-900 dark:text-gray-200">{review.name}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">{review.date}</div>
                      </div>
                    </div>
                    <div className="flex mb-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className="text-yellow-400 text-base">
                          {i < review.rating ? "★" : "☆"}
                        </span>
                      ))}
                    </div>
                    <p className="text-base text-gray-900 dark:text-gray-300 mb-2">{review.comment}</p>
                    <div className="flex gap-4">
                      <button className="flex items-center gap-1 text-gray-600 dark:text-gray-400 text-sm">
                        <ThumbsUp size={14} />
                      </button>
                      <button className="flex items-center gap-1 text-gray-600 dark:text-gray-400 text-sm">
                        <ThumbsDown size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {pro.about && (
                <div>
                  <h2 className="text-xl font-medium mb-3 text-gray-900 dark:text-gray-200">About Me</h2>
                  <p className="text-base text-gray-900 dark:text-gray-300 whitespace-pre-line">{pro.about}</p>
                </div>
              )}

              <h2 className="text-base font-medium mb-2 text-gray-600 dark:text-gray-400">
                {pro.category.name} Expert
              </h2>
              <Link
                to={`/book/${pro._id}`}
                state={{ pro, categoryId, location: selectedLocation }}
                className="w-full bg-[#032B44] text-white py-2 px-4 rounded-md font-medium hover:bg-[#054869] dark:bg-gray-300 dark:text-gray-800 dark:hover:bg-gray-500 dark:hover:!text-white text-center text-sm"
              >
                Book Now
              </Link>
              <Link
                to={`/chat/${pro._id}`}
                className="w-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 py-2 px-4 rounded-md font-medium hover:bg-gray-300 dark:hover:bg-gray-600 text-center text-sm"
              >
                Chat Now
              </Link>
              <button className="w-full bg-white dark:bg-gray-800 text-[#032B44] dark:text-gray-200 py-2 px-4 rounded-md font-medium border border-[#032B44] dark:border-gray-600 hover:bg-[#032B44] hover:text-white dark:hover:bg-gray-700 text-sm">
                Report
              </button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default ProDetails;