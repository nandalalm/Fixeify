import { Search } from "lucide-react";

const Hero = () => {
  return (
    <section className="h-[600px] md:h-[700px] relative">
      <div className="absolute inset-0 z-0">
        <img
          src="/hero-img.png?height=600&width=1400"
          alt="Hero background"
          className="h-full w-full brightness-75 object-cover"
        />
      </div>

      <div className="flex flex-col justify-center text-center absolute inset-0 items-center px-4 z-10">
        <h1 className="text-3xl text-white font-bold lg:text-5xl mb-8 md:text-4xl dark:!text-white">
          Find Your Proffesional Near You!
        </h1>
        <div className="flex bg-white rounded-md w-full items-center max-w-md mx-2 overflow-hidden sm:mx-0 dark:bg-gray-800">
          <div className="flex flex-1 items-center px-3 py-2">
            <Search className="h-4 text-gray-400 w-4 mr-2 dark:text-gray-300" />
            <input
              type="text"
              placeholder="Find the service you need"
              className="text-sm w-full focus:outline-none placeholder-gray-400 dark:placeholder-gray-300 dark:text-white"
            />
          </div>
          <button className="bg-[#032B44] h-full text-sm text-white font-medium hover:bg-[#054869] px-4 py-2 transition dark:bg-gray-300 dark:text-gray-800 dark:hover:bg-gray-500 dark:hover:!text-white">
            Search
          </button>
        </div>
      </div>
    </section>
  );
};

export default Hero;