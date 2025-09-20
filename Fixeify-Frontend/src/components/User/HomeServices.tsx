import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { fetchPopularCategories } from "@/api/proApi";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";

interface HomeServiceProps {
  title: string;
  description: string;
  image: string;
  onBook?: () => void;
}

const HomeServiceCard = ({ title, description, image, onBook }: HomeServiceProps) => {
  return (
    <div className="flex flex-col bg-white border border-gray-200 rounded-lg shadow-md w-10/12 md:w-full md:flex-row min-h-[150px] md:min-h-[224px] mx-auto overflow-hidden dark:bg-gray-800 dark:border-gray-700">
      <div className="w-full md:w-1/2 overflow-hidden">
        <img
          src={image || "/placeholder.svg"}
          alt={title}
          className="h-32 md:h-56 rounded-t-lg w-full md:rounded-l-lg md:rounded-t-none object-cover object-bottom transform transition-transform duration-300 hover:scale-110"
        />
      </div>
      <div className="flex flex-col justify-between p-3 md:p-6 w-full md:w-1/2">
        <div>
          <h3 className="text-sm md:text-lg font-bold dark:text-white">{title}</h3>
          <p className="text-gray-600 text-xs md:text-sm mb-2 md:mb-3 mt-1 dark:text-gray-300">{description}</p>
        </div>
        <button
          onClick={onBook}
          className="bg-[#032B44] rounded-md text-[10px] md:text-sm text-white w-fit font-medium hover:bg-[#054569] px-2 py-1.5 md:px-4 md:py-2 self-center transition-all  dark:bg-gray-300 dark:text-gray-800 dark:hover:bg-gray-500 dark:hover:!text-white"
        >
          Book Now
        </button>
      </div>
    </div>
  );
};

interface Category {
  id: string;
  name: string;
  image?: string;
  imageUrl?: string;
  description?: string;
  bookingsCount?: number;
  totalBookings?: number;
}

const HomeServices = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        // Try popular categories first
        let popular: Category[] = [];
        try {
          popular = await fetchPopularCategories(2);
        } catch (_) {
          // ignore and fallback
        }

        if (popular && popular.length > 0) {
          if (popular.length === 1) {
            // Fetch all categories and pick one random different category
            try {
              const res = await api.get<{ categories?: Category[]; data?: Category[] } | Category[]>(
                "/pro/fetchCategories"
              );
              let all: Category[] = [];
              if (Array.isArray(res.data)) {
                all = res.data as Category[];
              } else if ((res.data as any).categories) {
                all = (res.data as any).categories as Category[];
              } else if ((res.data as any).data) {
                all = (res.data as any).data as Category[];
              }
              const remaining = all.filter(c => c.id !== popular[0].id);
              const extra = remaining.length > 0 ? remaining[Math.floor(Math.random() * remaining.length)] : undefined;
              const two = extra ? [popular[0], extra] : [popular[0]];
              if (!cancelled) setCategories(two);
            } catch {
              if (!cancelled) setCategories(popular);
            }
          } else {
            if (!cancelled) setCategories(popular.slice(0, 2));
          }
        } else {
          // Fallback to any categories
          const res = await api.get<{ categories?: Category[]; data?: Category[] } | Category[]>(
            "/pro/fetchCategories"
          );
          let fetched: Category[] = [];
          if (Array.isArray(res.data)) {
            fetched = res.data as Category[];
          } else if ((res.data as any).categories) {
            fetched = (res.data as any).categories as Category[];
          } else if ((res.data as any).data) {
            fetched = (res.data as any).data as Category[];
          }
          if (!cancelled) setCategories((fetched ?? []).slice(0, 2));
        }
      } catch (_e) {
        if (!cancelled) setError("Failed to load categories");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sorted = [...categories].sort((a, b) => {
    const aCount = (a.bookingsCount ?? a.totalBookings ?? 0) as number;
    const bCount = (b.bookingsCount ?? b.totalBookings ?? 0) as number;
    return bCount - aCount;
  });
  const topTwo = (sorted.some(c => (c.bookingsCount ?? c.totalBookings ?? 0) > 0) ? sorted : categories).slice(0, 2);

  return (
    <section className="container text-center lg:px-8 md:px-10 mx-auto px-4 md:px-6 py-6 md:py-8 dark:bg-gray-900">
      <h2 className="text-2xl font-bold mb-5 pb-5 dark:text-white">Popular Categories</h2>
      {loading ? (
        <div className="flex flex-col gap-3 md:flex-row md:gap-6">
          <div className="flex-1 h-32 md:h-56 bg-gray-100 rounded-lg animate-pulse" />
          <div className="flex-1 h-32 md:h-56 bg-gray-100 rounded-lg animate-pulse" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : (
        <div className="flex flex-col gap-3 md:flex-row md:gap-6">
          {topTwo.map((c) => (
            <HomeServiceCard
              key={c.id}
              title={c.name}
              description={c.description || `Explore top-rated ${c.name} services near you.`}
              image={c.image || c.imageUrl || "/placeholder.svg"}
              onBook={() => {
                const savedLocation = user?.address as any;
                if (savedLocation && savedLocation.coordinates?.coordinates) {
                  navigate(`/nearby-pros?categoryId=${encodeURIComponent(c.id)}`, { state: { location: savedLocation } });
                } else {
                  navigate(`/location?categoryId=${encodeURIComponent(c.id)}`);
                }
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default HomeServices;