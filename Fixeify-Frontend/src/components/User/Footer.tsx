import { useState } from "react";
import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin, ChevronDown, ChevronUp } from "lucide-react";

const Footer = () => {
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);

  const toggleAccordion = (section: string) => {
    setOpenAccordion(openAccordion === section ? null : section);
  };

  const footerSections = [
    {
      id: "company",
      title: "Company",
      links: [
        { name: "About Fixeify", href: "/about" },
        { name: "How It Works", href: "/how-it-works" },
        { name: "Careers", href: "/careers" },
        { name: "Press & Media", href: "/press" },
        { name: "Investor Relations", href: "/investors" },
        { name: "Blog", href: "/blog" }
      ]
    },
    {
      id: "services",
      title: "Services",
      links: [
        { name: "Home Repairs", href: "/services/repairs" },
        { name: "Plumbing", href: "/services/plumbing" },
        { name: "Electrical", href: "/services/electrical" },
        { name: "Cleaning", href: "/services/cleaning" },
        { name: "Painting", href: "/services/painting" },
        { name: "All Services", href: "/services" }
      ]
    },
    {
      id: "support",
      title: "Support",
      links: [
        { name: "Help Center", href: "/help" },
        { name: "Contact Us", href: "/contact" },
        { name: "Safety Guidelines", href: "/safety" },
        { name: "Trust & Safety", href: "/trust-safety" },
        { name: "Report an Issue", href: "/report" },
        { name: "Community Guidelines", href: "/community" }
      ]
    },
    {
      id: "professionals",
      title: "For Professionals",
      links: [
        { name: "Join as Pro", href: "/become-pro" },
        { name: "Pro Resources", href: "/pro-resources" },
        { name: "Pro Success Stories", href: "/pro-stories" },
        { name: "Pro Training", href: "/pro-training" },
        { name: "Pro Support", href: "/pro-support" },
        { name: "Pro App Download", href: "/pro-app" }
      ]
    }
  ];

  return (
    <footer className="bg-[#032B44] text-white dark:bg-gray-200 dark:text-gray-800">
      {/* Main Footer Content */}
      <div className="container mx-auto px-4 py-12">
        {/* Desktop Layout */}
        <div className="hidden md:grid md:grid-cols-5 gap-8 mb-12">
          {/* Company Info */}
          <div className="col-span-1 xl:pl-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white dark:text-gray-900 mb-2">Fixeify</h2>
              <p className="text-gray-300 dark:text-gray-600 text-sm leading-relaxed">
                Your trusted platform for connecting with skilled professionals. 
              </p>
            </div>
            
            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-center text-sm text-gray-300 dark:text-gray-600">
                <Phone className="h-4 w-4 mr-2 flex-shrink-0" />
                <span>+91 9207503095</span>
              </div>
              <div className="flex items-center text-sm text-gray-300 dark:text-gray-600">
                <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="break-all min-w-0">support@fixeify.com</span>
              </div>
              <div className="flex items-start text-sm text-gray-300 dark:text-gray-600">
                <MapPin className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
                <span>Cottonmil Road Thiruvannur<br />Calicut, India 673029</span>
              </div>
            </div>
          </div>

          {/* Footer Links */}
          {footerSections.map((section) => (
            <div key={section.id} className="col-span-1">
              <h3 className="font-semibold text-white dark:text-gray-900 mb-4">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <span 
                      className="text-gray-300 dark:text-gray-600 hover:text-white dark:hover:text-gray-800 text-sm transition-colors duration-200 cursor-pointer"
                    >
                      {link.name}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Mobile Layout with Accordions */}
        <div className="md:hidden mb-8">
          {/* Company Info - Always Visible on Mobile */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white dark:text-gray-900 mb-3">Fixeify</h2>
            <p className="text-gray-300 dark:text-gray-600 text-sm leading-relaxed mb-4">
              Your trusted platform for connecting with skilled professionals. 
            </p>
            
            {/* Contact Info */}
            <div className="space-y-2">
              <div className="flex items-center text-sm text-gray-300 dark:text-gray-600">
                <Phone className="h-4 w-4 mr-2 flex-shrink-0" />
                <span>+91 9207503095</span>
              </div>
              <div className="flex items-center text-sm text-gray-300 dark:text-gray-600">
                <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="break-all min-w-0">support@fixeify.com</span>
              </div>
              <div className="flex items-start text-sm text-gray-300 dark:text-gray-600">
                <MapPin className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
                <span>Cottonmil Road Thiruvannur<br />Calicut, India 673029</span>
              </div>
            </div>
          </div>

          {/* Accordion Sections */}
          {footerSections.map((section) => (
            <div key={section.id} className="border-b border-gray-600 dark:border-gray-400">
              <button
                onClick={() => toggleAccordion(section.id)}
                className="w-full py-4 flex justify-between items-center text-left"
              >
                <h3 className="font-semibold text-white dark:text-gray-900">{section.title}</h3>
                {openAccordion === section.id ? (
                  <ChevronUp className="h-5 w-5 text-gray-300 dark:text-gray-600" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-300 dark:text-gray-600" />
                )}
              </button>
              
              {openAccordion === section.id && (
                <div className="pb-4">
                  <ul className="space-y-2 pl-4">
                    {section.links.map((link) => (
                      <li key={link.name}>
                        <span 
                          className="text-gray-300 dark:text-gray-600 hover:text-white dark:hover:text-gray-800 text-sm transition-colors duration-200 block py-1 cursor-pointer"
                        >
                          {link.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Social Media */}
        <div className="border-t border-gray-600 dark:border-gray-400 pt-8 mb-8">
          <div className="flex justify-center">
            <div className="flex flex-col items-center">
              <h4 className="font-semibold text-white dark:text-gray-900 mb-3">Follow Us</h4>
              <div className="flex space-x-4">
                <span 
                  aria-label="Facebook" 
                  className="text-gray-300 hover:text-white dark:text-gray-600 dark:hover:text-gray-800 transition-colors duration-200 cursor-pointer"
                >
                  <Facebook className="h-6 w-6" />
                </span>
                <span 
                  aria-label="Twitter" 
                  className="text-gray-300 hover:text-white dark:text-gray-600 dark:hover:text-gray-800 transition-colors duration-200 cursor-pointer"
                >
                  <Twitter className="h-6 w-6" />
                </span>
                <span 
                  aria-label="Instagram" 
                  className="text-gray-300 hover:text-white dark:text-gray-600 dark:hover:text-gray-800 transition-colors duration-200 cursor-pointer"
                >
                  <Instagram className="h-6 w-6" />
                </span>
                <span 
                  aria-label="LinkedIn" 
                  className="text-gray-300 hover:text-white dark:text-gray-600 dark:hover:text-gray-800 transition-colors duration-200 cursor-pointer"
                >
                  <Linkedin className="h-6 w-6" />
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-600 dark:border-gray-400 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-center md:text-left">
              <p className="text-gray-400 dark:text-gray-500 text-sm">
                2025 Fixeify. All rights reserved.
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center md:justify-end gap-4 text-sm">
              <span className="text-gray-400 hover:text-white dark:text-gray-600 dark:hover:text-gray-800 transition-colors duration-200 cursor-pointer">
                Privacy Policy
              </span>
              <span className="text-gray-400 hover:text-white dark:text-gray-600 dark:hover:text-gray-800 transition-colors duration-200 cursor-pointer">
                Terms of Service
              </span>
              <span className="text-gray-400 hover:text-white dark:text-gray-600 dark:hover:text-gray-800 transition-colors duration-200 cursor-pointer">
                Cookie Policy
              </span>
              <span className="text-gray-400 hover:text-white dark:text-gray-600 dark:hover:text-gray-800 transition-colors duration-200 cursor-pointer">
                Accessibility
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;