import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import api from "../../api/axios";

interface Category {
  id: string;
  name: string;
  image?: string;
}

const Hero = () => {
  const navigate = useNavigate();
  const [imgLoaded, setImgLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [suggestions, setSuggestions] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Debounce query
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  // Server-side suggestions on debounced query
  useEffect(() => {
    // cancel previous
    abortRef.current?.abort();
    if (!debounced) {
      setSuggestions([]);
      setError(null);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get<{ categories?: Category[]; data?: Category[] } | Category[]>(
          "/pro/fetchCategories",
          { params: { q: debounced }, signal: controller.signal }
        );
        let fetched: Category[] = [];
        if (Array.isArray(res.data)) {
          fetched = res.data as Category[];
        } else if ((res.data as any).categories) {
          fetched = (res.data as any).categories as Category[];
        } else if ((res.data as any).data) {
          fetched = (res.data as any).data as Category[];
        }
        // Fallback client-side filter to ensure correctness if backend doesn't filter by q yet
        const q = debounced.toLowerCase();
        const filtered = q ? fetched.filter(c => c.name?.toLowerCase().includes(q)) : fetched;
        setSuggestions(filtered.slice(0, 8));
      } catch (e: any) {
        if (e?.name === "CanceledError") return;
        setError("Failed to fetch suggestions");
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [debounced]);

  // Close dropdown on outside click
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const goToCategory = (cat: Category) => {
    setOpen(false);
    setQuery("");
    navigate(`/location?categoryId=${cat.id}`);
  };

  return (
    <section className="h-[600px] md:h-[700px] relative">
      <div className="absolute inset-0 z-0">
        {!imgLoaded && (
          <div className="h-full w-full bg-gray-200 animate-pulse" />
        )}
        <img
          src="/hero-img.png?height=600&width=1400"
          alt="Hero background"
          className={`h-full w-full brightness-75 object-cover ${imgLoaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setImgLoaded(true)}
        />
      </div>

      <div className="flex flex-col justify-center text-center absolute inset-0 items-center px-4 z-10">
        <h1 className="text-3xl text-white font-bold lg:text-5xl mb-8 md:text-4xl dark:!text-white">
          Find Your Professional Near You!
        </h1>
        <div ref={boxRef} className="relative w-full max-w-md mx-2 sm:mx-0">
          <div className="flex items-center bg-white/95 backdrop-blur rounded-full border border-white/60 shadow-lg focus-within:ring-2 focus-within:ring-white/70 dark:bg-gray-800 dark:border-gray-700">
            <Search className="h-5 w-5 text-gray-400 mx-3 dark:text-gray-300" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              placeholder="Search for services (e.g., Cleaning, Electrical)"
              className="text-sm w-full py-3 pr-4 bg-transparent focus:outline-none placeholder-gray-400 dark:placeholder-gray-300 dark:text-white"
              aria-label="Search services"
            />
          </div>
          {/* Dropdown (overlay) */}
          {open && (query || suggestions.length > 0) && (
            <div className="absolute left-0 right-0 top-full mt-2 z-20 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden dark:bg-gray-800 dark:border-gray-700">
              {loading ? (
                <div className="p-3">
                  <div className="h-9 bg-gray-100 animate-pulse rounded" />
                </div>
              ) : error ? (
                <div className="p-3 text-sm text-red-600 dark:text-red-400">{error}</div>
              ) : suggestions.length === 0 ? (
                <div className="p-3 text-sm text-gray-500 dark:text-gray-300">No categories found</div>
              ) : (
                <ul className="max-h-72 overflow-auto">
                  {suggestions.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => goToCategory(c)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-3 dark:hover:bg-gray-700"
                      >
                        {c.image && (
                          <img src={c.image} alt={c.name} className="w-7 h-7 rounded object-cover" />
                        )}
                        <span className="text-sm text-gray-800 dark:text-gray-100">{c.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Hero;