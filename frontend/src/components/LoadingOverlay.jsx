import React from 'react';
import './LoadingOverlay.css';

const LoadingOverlay = ({ message = 'Processing your form...', onDismiss }) => {
  return (
    <div className="loading-overlay">
      <div className="loading-overlay-content">
        <div className="loading-spinner"></div>
        <div className="loading-message">{message}</div>
        <div className="loading-note">
          This may take a few minutes. Processing will continue in the background even if you dismiss this overlay.
        </div>
        {onDismiss && (
          <button 
            className="dismiss-button"
            onClick={onDismiss}
          >
            Continue Working
          </button>
        )}
      </div>
    </div>
  );
};

export default LoadingOverlay; 