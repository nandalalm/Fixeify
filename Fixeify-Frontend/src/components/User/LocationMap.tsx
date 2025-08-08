import React, { useEffect, useRef } from "react";
import { ILocation } from "../../interfaces/adminInterface";

interface LocationMapProps {
  location: ILocation;
  height?: string;
  className?: string;
}

const LocationMap: React.FC<LocationMapProps> = ({ 
  location, 
  height = "300px", 
  className = "" 
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);

  useEffect(() => {
    const loadGoogleMapsScript = () => {
      if (window.google && window.google.maps) {
        initMap();
        return;
      }

      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        initMap();
      };
      script.onerror = () => {
        console.error("Failed to load Google Maps script");
      };
      document.head.appendChild(script);
    };

    const initMap = () => {
      if (!mapRef.current || !location.coordinates?.coordinates) return;

      const [lng, lat] = location.coordinates.coordinates;
      const position = { lat, lng };

      mapInstanceRef.current = new google.maps.Map(mapRef.current, {
        zoom: 15,
        center: position,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }],
          },
        ],
      });

      // Add marker
      new google.maps.Marker({
        position: position,
        map: mapInstanceRef.current,
        title: location.address,
        icon: {
          url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 2C10.477 2 6 6.477 6 12C6 20 16 30 16 30S26 20 26 12C26 6.477 21.523 2 16 2Z" fill="#032b44"/>
              <circle cx="16" cy="12" r="4" fill="white"/>
            </svg>
          `),
          scaledSize: new google.maps.Size(32, 32),
          anchor: new google.maps.Point(16, 32),
        },
      });
    };

    loadGoogleMapsScript();
  }, [location]);

  if (!location.coordinates?.coordinates) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg ${className}`}
        style={{ height }}
      >
        <p className="text-gray-500 dark:text-gray-400">Location coordinates not available</p>
      </div>
    );
  }

  return (
    <div 
      ref={mapRef} 
      className={`rounded-lg ${className}`}
      style={{ height }}
    />
  );
};

export default LocationMap;
