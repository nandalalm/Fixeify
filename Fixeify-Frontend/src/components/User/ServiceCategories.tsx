import { useRef, useEffect, useState } from "react";
import api from "../../api/axios";

interface Category {
  id: string;
  name: string;
  image: string;
}

const ServiceCard = ({ id, name, image }: Category) => {
  return (
    <a href={`/location?categoryId=${id}`} className="group">
      <div className="rounded-lg aspect-square mb-2 overflow-hidden relative">
        <img
          src={image || "/placeholder.svg"}
          alt={name}
          className="h-full w-full duration-300 group-hover:scale-110 object-cover transition-transform"
        />
      </div>
      <h3 className="text-center font-medium dark:text-white">{name}</h3>
    </a>
  );
};

const ServiceCategories = () => {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const response = await api.get<{ categories?: Category[]; data?: Category[] } | Category[]>(
          "/pro/fetchCategories"
        );
        let fetchedCategories: Category[] = [];
        if (Array.isArray(response.data)) {
          fetchedCategories = response.data;
        } else if (response.data.categories && Array.isArray(response.data.categories)) {
          fetchedCategories = response.data.categories;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          fetchedCategories = response.data.data;
        } else {
          throw new Error("Expected an array of categories");
        }
        setCategories(fetchedCategories);
        setError(null);
      } catch (err: any) {
        const errorMessage = err.response
          ? `Failed to load categories: ${err.response.status} - ${JSON.stringify(err.response.data)}`
          : `Failed to load categories: ${err.message}`;
        setError(errorMessage);
        console.error("Error fetching categories:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

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

  useEffect(() => {
    if (!loading && categories.length > 0 && carouselRef.current) {
      carouselRef.current.scrollTo({ left: 100, behavior: "smooth" });
    }
  }, [loading, categories]);

  return (
    <section className="container text-center mx-auto px-6 py-8 dark:bg-gray-900">
      <h2 className="text-2xl font-bold mb-5 pb-5 dark:text-white">Our Services</h2>
      {loading ? (
        <div className="flex p-4 w-full overflow-x-auto scroll-smooth scrollbar-none snap-x space-x-4">
          {[...Array(8)].map((_, index) => (
            <div key={index} className="w-40 lg:w-56 md:w-48 shrink-0 snap-center">
              <div className="rounded-lg aspect-square mb-2 bg-gray-200 animate-pulse" />
              <div className="h-6 bg-gray-200 rounded mx-auto w-3/4 animate-pulse" />
            </div>
          ))}
        </div>
      ) : error ? (
        <p className="text-red-500 dark:text-red-400">{error}</p>
      ) : categories.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No categories available</p>
      ) : (
        <div
          ref={carouselRef}
          className="flex p-4 w-full overflow-x-auto scroll-smooth scrollbar-none snap-x space-x-4"
        >
          {categories.map((category) => (
            <div key={category.id} className="w-40 lg:w-56 md:w-48 shrink-0 snap-center">
              <ServiceCard id={category.id} name={category.name} image={category.image} />
            </div>
          ))}
        </div>
      )}
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