import React from "react";
import "./Loading.css";

const Loading: React.FC = () => {
  return (
    <div className="loading-container">
      <div className="dot"></div>
      <div className="dot"></div>
      <div className="dot"></div>
      <div className="dot"></div>
    </div>
  );
};

export default Loading;