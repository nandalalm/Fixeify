import { Link } from "react-router-dom";
import { useRef, useEffect } from "react";

interface ServiceProps {
  name: string;
  image: string;
}

const ServiceCard = ({ name, image }: ServiceProps) => {
  return (
    <Link to={`/services/${name.toLowerCase()}`} className="group">
      <div className="rounded-lg aspect-square mb-2 overflow-hidden relative">
        <img
          src={image || "/placeholder.svg"}
          alt={name}
          className="h-full w-full duration-300 group-hover:scale-110 object-cover transition-transform"
        />
      </div>
      <h3 className="text-center font-medium dark:text-white">{name}</h3>
    </Link>
  );
};

const ServiceCategories = () => {
  const carouselRef = useRef<HTMLDivElement>(null);

  const services = [
    { name: "Electrical", image: "/Electrical.png?height=300&width=300" },
    { name: "Remodeling", image: "/Remodeling.png?height=300&width=300" },
    { name: "Roofing", image: "/Roofing.png?height=300&width=300" },
    { name: "Landscaping", image: "/Landscaping.png?height=300&width=300" },
    { name: "Painting", image: "/Painting.png?height=300&width=300" },
    { name: "Cleaning", image: "/Cleaning.png?height=300&width=300" },
    { name: "Moving Help", image: "/Moving-help.png?height=300&width=300" },
    { name: "Plumbing", image: "/Plumbing.png?height=300&width=300" },
  ];

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!carouselRef.current) return;
      const scrollAmount = 200;
      if (event.key === "ArrowRight") {
        carouselRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
      } else if (event.key === "ArrowLeft") {
        carouselRef.current.scrollBy({ left: -scrollAmount, behavior: "smooth" });
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <section className="container text-center mx-auto px-6 py-8 dark:bg-gray-900">
      <h2 className="text-2xl font-bold mb-5 pb-5 dark:text-white">Our Services</h2>
      <div
        ref={carouselRef}
        className="flex p-4 w-full overflow-x-auto scroll-smooth scrollbar-none snap-x space-x-4"
      >
        {services.map((service) => (
          <div key={service.name} className="w-40 lg:w-56 md:w-48 shrink-0 snap-center">
            <ServiceCard {...service} />
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

export default ServiceCategories;