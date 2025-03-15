import React from 'react';
import './Carousel.css';

const Carousel = ({ images }) => {
  // Create a duplicated array of images for seamless looping
  // Duplicate enough times to ensure continuous movement
  const extendedImages = [...images, ...images, ...images, ...images];
  
  // Text labels for each image
  const imageLabels = [
    "Patient Registration Forms",
    "Medical History Forms",
    "Informed Consent Forms",
    "HIPPA Authorization Forms",
    "Insurance Claim Forms",
    "Prescription Forms",
    "Referral Forms",
    "Discharge Summary Forms",
    "Advance Directive Forms",
    "Medical Power of Attorney Forms",
    "Laboratory Test Requisition Forms",
    "Patient Appointment/\nScheduling Forms",
    "Telemedicine Consent Forms",
    "Clinical Trial/\nResearch Consent Forms"
  ];

  // Determine if text is long and needs special styling
  const isLongText = (text) => {
    return text.includes("\n") || text.length > 25;
  };

  // Get the label for a specific image index
  const getLabel = (index) => {
    // Calculate the original image index (0-13)
    const originalIndex = index % imageLabels.length;
    return imageLabels[originalIndex];
  };

  // Format text with line breaks
  const formatText = (text) => {
    if (text.includes("\n")) {
      return text.split("\n").map((line, i) => (
        <React.Fragment key={i}>
          {line}
          {i < text.split("\n").length - 1 && <br />}
        </React.Fragment>
      ));
    }
    return text;
  };

  return (
    <div className="carousel">
      <div 
        className="carousel-track" 
        style={{
          width: `${extendedImages.length * 170}px` // 160px card + 10px margin
        }}
      >
        {extendedImages.map((image, index) => {
          const label = getLabel(index);
          const textClass = isLongText(label) ? "card-text long-text" : "card-text";
          
          return (
            <div key={index} className="card">
              <img src={image} alt={`carousel-${index}`} />
              <div className="card-overlay">
                <p className={textClass}>{formatText(label)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Carousel;