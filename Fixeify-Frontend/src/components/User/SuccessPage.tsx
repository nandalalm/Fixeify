import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar"; 
import Footer from "./Footer"; 

const SuccessPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Navbar /> {/* Include the Navbar */}
      <div className="flex-1 p-4 md:p-6">
        <div className="max-w-4xl mx-auto w-full text-center"> 
          <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
            Your Application is being Processed
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Thank you for applying to become a Fixeify Pro. Your application is under review we will notify you via email
            once the process is completed.
          </p>
          <div className="mb-6">
            <img
              src="/Pro-Success-img.png" 
              alt="Worker reviewing application"
              className="mx-auto w-full max-w-3xl" 
            />
          </div>
          <div className="mt-12 mb-16"> 
            <button
              onClick={() => navigate("/")}
              className="px-6 py-2 bg-[#032B44] text-white rounded-md hover:bg-[#054869] dark:bg-gray-300 dark:text-gray-800 dark:hover:bg-gray-500"
            >
              Back to Homepage
            </button>
          </div>
        </div>
      </div>
      <Footer /> 
    </div>
  );
};

export default SuccessPage;