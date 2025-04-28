import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";

interface StepProps {
  number: number;
  title: string;
  description: string;
  image: string;
}

const steps = [
  { number: 1, title: "Search and Find", description: "Find the service you need.", image: "/step1.jpeg" },
  { number: 2, title: "Get matched", description: "We match you with the best service providers.", image: "/step2.png" },
  { number: 3, title: "Review and Hire", description: "Review the options and hire your preferred pro.", image: "/step3.png" },
  { number: 4, title: "Set your time", description: "Set the time for the service.", image: "/step4.png" },
  { number: 5, title: "Plans Change?", description: "Cancel anytime before the booked date if plans change.", image: "/step5.png" },
  { number: 6, title: "Payment", description: "Make a secure payment for the service.", image: "/step6.png" },
];

const StepCard = ({ number, title, description, image }: StepProps) => {
  return (
    <Link to="#" className="h-full w-full block group">
      <div className="flex flex-col bg-white h-full p-4 rounded-xl shadow-lg text-center w-full min-h-[300px] dark:bg-gray-800 dark:shadow-gray-700">
        <div className="h-40 rounded-lg mb-4 overflow-hidden">
          <img
            src={image}
            alt={`Step ${number}`}
            className="h-full w-full duration-300 group-hover:scale-110 object-cover transition-transform"
          />
        </div>
        <div className="flex flex-col flex-grow">
          <div className="text-blue-600 text-sm font-semibold dark:text-blue-400">Step {number}</div>
          <h3 className="text-lg font-semibold dark:text-white">{title}</h3>
          <p className="flex-grow text-gray-600 text-sm dark:text-gray-300">{description}</p>
        </div>
      </div>
    </Link>
  );
};

const HowItWorks = () => {
  const carouselRef = useRef<HTMLDivElement>(null);

  const infiniteSteps = [...steps, ...steps, ...steps];

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const handleScroll = () => {
      const scrollLeft = carousel.scrollLeft;
      const scrollWidth = carousel.scrollWidth;
      const clientWidth = carousel.clientWidth;

      if (scrollLeft + clientWidth >= scrollWidth - 1) {
        carousel.scrollTo({ left: clientWidth, behavior: "auto" });
      }
      else if (scrollLeft <= 0) {
        carousel.scrollTo({ left: clientWidth * 2, behavior: "auto" });
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const scrollAmount = 300; 
      if (event.key === "ArrowRight") {
        carousel.scrollBy({ left: scrollAmount, behavior: "smooth" });
      } else if (event.key === "ArrowLeft") {
        carousel.scrollBy({ left: -scrollAmount, behavior: "smooth" });
      }
    };

    carousel.addEventListener("scroll", handleScroll);
    document.addEventListener("keydown", handleKeyDown);

    carousel.scrollTo({ left: carousel.clientWidth, behavior: "auto" });

    return () => {
      carousel.removeEventListener("scroll", handleScroll);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <section className="container text-center mb-20 mx-auto px-8 py-12 dark:bg-gray-900">
      <h2 className="text-3xl font-bold mb-8 dark:text-white">How It Works</h2>
      <div
        ref={carouselRef}
        className="flex p-4 w-full overflow-x-auto scroll-smooth scrollbar-none snap-x space-x-6"
      >
        {infiniteSteps.map((step, index) => (
          <div
            key={`${step.number}-${index}`}
            className="w-[250px] lg:w-[300px] md:w-[280px] shrink-0 snap-center"
          >
            <StepCard {...step} />
          </div>
        ))}
      </div>
      <style>{`
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-none {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </section>
  );
};

export default HowItWorks;