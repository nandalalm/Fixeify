import React from "react";
import { Link } from "react-router-dom";

const NotFound: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-7xl font-extrabold text-gray-800 dark:text-gray-100">404</h1>
        <p className="mt-2 text-xl font-semibold text-gray-700 dark:text-gray-200">Page not found</p>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-block bg-[#032B44] text-white px-5 py-2.5 rounded-md hover:bg-[#054869] transition-colors dark:bg-[#032B44] dark:text-white"
          >
            Back Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
