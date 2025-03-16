import React from 'react';
import './LoadingOverlay.css';

const LoadingOverlay = ({ message = 'Processing your form...' }) => {
  return (
    <div className="loading-overlay">
      <div className="loading-overlay-content">
        <div className="loading-spinner"></div>
        <div className="loading-message">{message}</div>
      </div>
    </div>
  );
};

export default LoadingOverlay; 