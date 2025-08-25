import { useEffect, useRef, useState } from "react";
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
  { number: 3, title: "Review and find", description: "Review the options and find your preferred professional.", image: "/step3.png" },
  { number: 4, title: "Book your professional", description: "Select the date and time for the service.", image: "/step4.png" },
  { number: 5, title: "Plans Change?", description: "Cancel anytime before the professional accepts.", image: "/step5.png" },
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
  const [isDesktop, setIsDesktop] = useState<boolean>(false);

  const infiniteSteps = [...steps, ...steps, ...steps];
  const data = infiniteSteps; // Always use infinite data so left scroll is available on mobile too

  useEffect(() => {
    const onResize = () => {
      // Tailwind md breakpoint ~768px
      setIsDesktop(window.innerWidth >= 768);
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    // Keep loop behavior on both mobile and desktop
    const handleScroll = () => {
      const scrollLeft = carousel.scrollLeft;
      const scrollWidth = carousel.scrollWidth;
      const clientWidth = carousel.clientWidth;
      if (scrollLeft + clientWidth >= scrollWidth - 1) {
        // Jump back near the middle block
        const targetIndex = steps.length; // start of middle block
        const child = carousel.children.item(targetIndex) as HTMLElement | null;
        if (child) carousel.scrollTo({ left: child.offsetLeft, behavior: "auto" });
      } else if (scrollLeft <= 0) {
        // Jump forward near the middle block
        const targetIndex = steps.length * 2 - 1; // end of middle block
        const child = carousel.children.item(targetIndex) as HTMLElement | null;
        if (child) carousel.scrollTo({ left: child.offsetLeft, behavior: "auto" });
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isDesktop) return;
      const scrollAmount = 300;
      if (event.key === "ArrowRight") {
        carousel.scrollBy({ left: scrollAmount, behavior: "smooth" });
      } else if (event.key === "ArrowLeft") {
        carousel.scrollBy({ left: -scrollAmount, behavior: "smooth" });
      }
    };

    const handleWheel = (event: WheelEvent) => {
      if (!isDesktop) return;
      // Convert vertical wheel to horizontal scroll when hovering the carousel
      if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
        event.preventDefault();
        carousel.scrollBy({ left: event.deltaY, behavior: "auto" });
      }
    };

    // Attach scroll handler for both
    carousel.addEventListener("scroll", handleScroll);

    // Desktop-only inputs
    if (isDesktop) {
      document.addEventListener("keydown", handleKeyDown);
      carousel.addEventListener("wheel", handleWheel, { passive: false });
    }

    // Position: show Step 1 (from middle block) first so content exists on the left
    const targetIndex = steps.length; // first item of middle block is Step 1
    const child = carousel.children.item(targetIndex) as HTMLElement | null;
    if (child) {
      carousel.scrollTo({ left: child.offsetLeft, behavior: "auto" });
    }

    return () => {
      carousel.removeEventListener("scroll", handleScroll);
      document.removeEventListener("keydown", handleKeyDown);
      carousel.removeEventListener("wheel", handleWheel as EventListener);
    };
  }, [isDesktop]);

  return (
    <section className="container text-center mb-20 mx-auto px-8 py-12 dark:bg-gray-900">
      <h2 className="text-3xl font-bold mb-8 dark:text-white">How It Works</h2>
      <div
        ref={carouselRef}
        className="flex p-4 w-full overflow-x-auto overflow-y-hidden scroll-smooth scrollbar-none snap-x space-x-6"
        style={{ touchAction: "pan-x" }}
      >
        {data.map((step, index) => {
          const logicalIndex = index % steps.length;
          const blockIndex = Math.floor(index / steps.length); // 0,1,2
          return (
            <div
              key={`${step.number}-${index}`}
              data-step-index={logicalIndex}
              data-block-index={blockIndex}
              className="w-[250px] lg:w-[300px] md:w-[280px] shrink-0 snap-center"
            >
              <StepCard {...step} />
            </div>
          );
        })}
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