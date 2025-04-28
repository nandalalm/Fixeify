import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-[#00205B] text-white py-10 dark:bg-gray-100">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-center mb-8">
          <Link to="/about" className=" dark:hover:text-gray-600">
            About
          </Link>
          <Link to="/services" className=" dark:hover:text-gray-600">
            Services
          </Link>
          <Link to="/safety" className=" dark:hover:text-gray-600">
            Safety
          </Link>
          <Link to="/contact" className=" dark:hover:text-gray-600">
            Contact Us
          </Link>
          <Link to="/terms" className=" dark:hover:text-gray-600">
            Terms of use
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-center mb-8">
          <Link to="/reviews" className=" dark:hover:text-gray-600">
            Reviews
          </Link>
          <Link to="/privacy" className=" dark:hover:text-gray-600">
            Privacy Policy
          </Link>
        </div>

        <div className="flex justify-center gap-6 mb-6">
          <a href="#" aria-label="Facebook" className="dark:hover:text-gray-600">
            <Facebook className="h-5 w-5" />
          </a>
          <a href="#" aria-label="Twitter" className="dark:hover:text-gray-600">
            <Twitter className="h-5 w-5" />
          </a>
          <a href="#" aria-label="Instagram" className="dark:hover:text-gray-600">
            <Instagram className="h-5 w-5" />
          </a>
          <a href="#" aria-label="LinkedIn" className="dark:hover:text-gray-600">
            <Linkedin className="h-5 w-5" />
          </a>
        </div>

        <div className="text-center text-sm dark:hover:text-gray-600">
          <p>©2022 Fixeify</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;