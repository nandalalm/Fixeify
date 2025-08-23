interface HomeServiceProps {
  title: string;
  description: string;
  image: string;
}

const HomeServiceCard = ({ title, description, image }: HomeServiceProps) => {
  return (
    <div className="flex flex-col bg-white border border-gray-200 rounded-lg shadow-md w-full md:flex-row min-h-[224px] overflow-hidden dark:bg-gray-800 dark:border-gray-700">
      <div className="w-full md:w-1/2 overflow-hidden">
        <img
          src={image || "/placeholder.svg"}
          alt={title}
          className="h-56 rounded-t-lg w-full md:rounded-l-lg md:rounded-t-none object-cover object-bottom transform transition-transform duration-300 hover:scale-110"
        />
      </div>
      <div className="flex flex-col justify-between p-6 w-full md:w-1/2">
        <div>
          <h3 className="text-lg font-bold dark:text-white">{title}</h3>
          <p className="text-gray-600 text-sm mb-3 mt-1 dark:text-gray-300">{description}</p>
        </div>
        <button className="bg-[#032B44] rounded-md text-sm text-white w-fit font-medium hover:bg-[#054569] px-4 py-2 self-center transition-all  dark:bg-gray-300 dark:text-gray-800 dark:hover:bg-gray-500 dark:hover:!text-white">
          Book Now
        </button>
      </div>
    </div>
  );
};

const HomeServices = () => {
  const services = [
    {
      title: "House Cleaning",
      description: "Hire a top-rated professional to keep your home spotless.",
      image: "/home-service1.png?height=200&width=200",
    },
    {
      title: "Furniture Assembly",
      description: "Get your furniture assembled quickly and professionally.",
      image: "/home-service2.png?height=200&width=200",
    },
  ];

  return (
    <section className="container text-center lg:px-8 md:px-10 mx-auto px-6 py-8 dark:bg-gray-900">
      <h2 className="text-2xl font-bold mb-5 pb-5 dark:text-white">Keep Your Home In Tip-Top</h2>
      <div className="flex flex-col gap-4 md:flex-row md:gap-6">
        {services.map((service) => (
          <HomeServiceCard key={service.title} {...service} />
        ))}
      </div>
    </section>
  );
};

export default HomeServices;