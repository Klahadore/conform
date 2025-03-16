import React, { useState, useEffect, useRef } from 'react';
import './FormEditor.css';
import conformLogo from '../assets/conform_logo.png';
import h2aiLogo from '../assets/h2ai_logo.png';

const FormEditor = ({ user, onLogout, onToggleSidebar, onSaveForm, onCancel, form, navigateToDashboard }) => {
  const [htmlContent, setHtmlContent] = useState('');
  const [parsedHtmlContent, setParsedHtmlContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const formContainerRef = useRef(null);
  
  // State variables for form navigation and data collection
  const [currentStep, setCurrentStep] = useState(0);
  const [formSteps, setFormSteps] = useState([]);
  const [formData, setFormData] = useState({});
  const [totalSteps, setTotalSteps] = useState(0);
  const [isFormActive, setIsFormActive] = useState(true); // Always active by default
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Check if this is a filled form
  const [isFilledForm, setIsFilledForm] = useState(false);
  // Add state for filled form ID
  const [filledFormId, setFilledFormId] = useState(null);

  // Add a state to track if the iframe has loaded
  const [iframeLoaded, setIframeLoaded] = useState(false);

  useEffect(() => {
    // Load HTML content when component mounts or form changes
    if (form) {
      if (form.isFilledForm) {
        // For filled forms, we already have the URL
        setIsFilledForm(true);
        setFilledFormId(form.id);
        setIsLoading(false);
      } else {
        setIsFilledForm(false);
        loadHtmlContent();
      }
    }
  }, [form]);

  // Parse HTML content when it changes
  useEffect(() => {
    if (htmlContent && !isFilledForm) {
      try {
        // Extract just the form content from the full HTML document
        const extractedContent = extractFormContent(htmlContent);
        setParsedHtmlContent(extractedContent);
        
        // Now parse the steps from the extracted content
        parseFormSteps(extractedContent);
      } catch (error) {
        console.error("Error parsing HTML content:", error);
      }
    }
  }, [htmlContent, isFilledForm]);

  // Attach event listeners when the current step changes
  useEffect(() => {
    if (isFormActive && !isFilledForm) {
      const timeoutId = setTimeout(() => {
        const cleanup = attachFormEventListeners();
        return () => {
          if (cleanup) cleanup();
        };
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [currentStep, isFormActive, isFilledForm]);

  // Function to extract just the form content from the full HTML document
  const extractFormContent = (html) => {
    try {
      // Create a temporary DOM element to parse the HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // First, try to find the form element
      const formElement = doc.querySelector('form');
      if (formElement) {
        console.log("Found form element, extracting content");
        return formElement.outerHTML;
      }
      
      // If no form element, try to find the main content container
      const mainContent = doc.querySelector('main') || 
                          doc.querySelector('.form-container') || 
                          doc.querySelector('.typeform') ||
                          doc.querySelector('#typeform');
      
      if (mainContent) {
        console.log("Found main content container, extracting content");
        return mainContent.outerHTML;
      }
      
      // If still no luck, just use the body content
      console.log("Using body content as fallback");
      return doc.body.innerHTML;
    } catch (error) {
      console.error("Error extracting form content:", error);
      return html; // Return the original HTML if extraction fails
    }
  };

  // Function to parse the HTML content and extract form steps
  const parseFormSteps = (htmlContent) => {
    try {
      // Create a temporary DOM element to parse the HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      
      // Look for form steps in the HTML
      const steps = doc.querySelectorAll('.form-step') || doc.querySelectorAll('.step') || doc.querySelectorAll('.question-container');
      
      if (steps && steps.length > 0) {
        console.log(`Found ${steps.length} form steps`);
        
        // Convert NodeList to Array and store
        const stepsArray = Array.from(steps).map((step, index) => ({
          id: step.id || `step-${index}`,
          element: step.outerHTML,
          inputs: Array.from(step.querySelectorAll('input, select, textarea')).map(input => ({
            id: input.id || input.name,
            name: input.name || input.id,
            type: input.type,
            required: input.required
          }))
        }));
        
        setFormSteps(stepsArray);
        setTotalSteps(stepsArray.length);
        setIsFormActive(true);
        console.log("Form steps parsed:", stepsArray);
      } else {
        // If no steps found, try to create steps from the form elements
        const form = doc.querySelector('form') || doc;
        if (form) {
          const formElements = form.querySelectorAll('div[data-field-id]');
          if (formElements && formElements.length > 0) {
            console.log(`Creating ${formElements.length} form steps from form elements`);
            
            const stepsArray = Array.from(formElements).map((element, index) => ({
              id: element.getAttribute('data-field-id') || `step-${index}`,
              element: element.outerHTML,
              inputs: Array.from(element.querySelectorAll('input, select, textarea')).map(input => ({
                id: input.id || input.name,
                name: input.name || input.id,
                type: input.type,
                required: input.required
              }))
            }));
            
            setFormSteps(stepsArray);
            setTotalSteps(stepsArray.length);
            setIsFormActive(true);
            console.log("Form steps created:", stepsArray);
          } else {
            console.log("No form elements found to create steps");
            // If no specific elements found, create a single step with the entire form
            setFormSteps([{
              id: 'full-form',
              element: form.outerHTML || htmlContent,
              inputs: Array.from(form.querySelectorAll('input, select, textarea')).map(input => ({
                id: input.id || input.name,
                name: input.name || input.id,
                type: input.type,
                required: input.required
              }))
            }]);
            setTotalSteps(1);
            setIsFormActive(true);
          }
        } else {
          console.log("No form element found in HTML content");
          setIsFormActive(false);
        }
      }
    } catch (error) {
      console.error("Error in parseFormSteps:", error);
      setIsFormActive(false);
    }
  };

  // Function to handle form input changes
  const handleFormInputChange = (e) => {
    const { name, value, type, checked, id } = e.target;
    
    // Use either name or id as the key
    const fieldKey = name || id;
    
    if (!fieldKey) {
      console.warn("Input element has no name or id:", e.target);
      return;
    }
    
    setFormData(prevData => ({
      ...prevData,
      [fieldKey]: type === 'checkbox' ? checked : value
    }));
    
    console.log("Form data updated:", {
      ...formData,
      [fieldKey]: type === 'checkbox' ? checked : value
    });
  };

  // Function to attach event listeners to form inputs
  const attachFormEventListeners = () => {
    if (!formContainerRef.current) return;
    
    // Find all input elements in the current step
    const inputs = formContainerRef.current.querySelectorAll('input, select, textarea');
    
    // Attach event listeners to each input
    inputs.forEach(input => {
      input.addEventListener('change', handleFormInputChange);
      input.addEventListener('input', handleFormInputChange);
    });
    
    // Return a cleanup function to remove event listeners
    return () => {
      inputs.forEach(input => {
        input.removeEventListener('change', handleFormInputChange);
        input.removeEventListener('input', handleFormInputChange);
      });
    };
  };

  // Function to validate the current step before proceeding
  const validateCurrentStep = () => {
    if (!formSteps[currentStep]) return true;
    
    const requiredInputs = formSteps[currentStep].inputs.filter(input => input.required);
    
    for (const input of requiredInputs) {
      const value = formData[input.name || input.id];
      if (!value) {
        alert(`Please fill in all required fields before proceeding.`);
        return false;
      }
    }
    
    return true;
  };

  // Function to move to the next step
  const handleNextStep = () => {
    if (validateCurrentStep() && currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
      if (formContainerRef.current) {
        formContainerRef.current.scrollTop = 0;
      }
    }
  };

  // Function to move to the previous step
  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      if (formContainerRef.current) {
        formContainerRef.current.scrollTop = 0;
      }
    }
  };

  // Function to handle form submission
  const handleFormSubmit = (e) => {
    if (e) e.preventDefault();
    
    // Validate all required fields before submission
    const allRequiredInputs = formSteps.flatMap(step => 
      step.inputs.filter(input => input.required)
    );
    
    for (const input of allRequiredInputs) {
      const fieldKey = input.name || input.id;
      const value = formData[fieldKey];
      if (!value) {
        alert(`Please fill in all required fields before submitting. Missing: ${fieldKey}`);
        return;
      }
    }
    
    console.log("Form submitted with data:", formData);
    
    // Set submitting state to show loading indicator
    setIsSubmitting(true);
    
    // Create a filled form HTML representation
    const filledFormHtml = createFilledFormHtml();
    
    // Prepare submission data with all required fields
    const submissionData = {
      ...formData,
      form_id: form?.id,
      user_id: user?.id,
      patient_id: form?.patientId || null,
      htmlContent: filledFormHtml
    };
    
    // Send the data to the backend using the send_form endpoint
    fetch('/send_form', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(submissionData)
    })
    .then(response => {
      if (response.ok) {
        return response.json();
      }
      throw new Error('Failed to submit form');
    })
    .then(data => {
      console.log("Form submission successful:", data);
      setIsSubmitting(false);
      alert('Form submitted successfully!');
      
      // Show success message and redirect after a short delay
      setTimeout(() => {
        if (navigateToDashboard) {
          navigateToDashboard();
        }
      }, 1500);
    })
    .catch(error => {
      console.error('Error submitting form:', error);
      setIsSubmitting(false);
      alert('Error submitting form. Please try again.');
    });
  };
  
  // Function to create a filled form HTML representation
  const createFilledFormHtml = () => {
    // If we already have HTML content for a filled form, return it
    if (isFilledForm && form.htmlContent) {
      return form.htmlContent;
    }
    
    // Otherwise, create a new HTML representation with the filled data
    try {
      // Create a copy of the parsed HTML content
      const parser = new DOMParser();
      const doc = parser.parseFromString(parsedHtmlContent, 'text/html');
      
      // Fill in the form fields with the form data
      Object.entries(formData).forEach(([key, value]) => {
        const elements = doc.querySelectorAll(`[id="${key}"], [name="${key}"]`);
        
        elements.forEach(element => {
          if (element.tagName === 'INPUT') {
            if (element.type === 'checkbox' || element.type === 'radio') {
              element.checked = value === true || value === 'on' || value === element.value;
            } else {
              element.value = value;
            }
          } else if (element.tagName === 'SELECT') {
            element.value = value;
          } else if (element.tagName === 'TEXTAREA') {
            element.value = value;
          }
        });
      });
      
      // Add a header to indicate this is a filled form
      const formTitle = form?.title || 'Form';
      const patientName = form?.patientName || '';
      
      const headerDiv = doc.createElement('div');
      headerDiv.className = 'filled-form-header';
      headerDiv.style.backgroundColor = '#f0f0f0';
      headerDiv.style.padding = '15px';
      headerDiv.style.marginBottom = '20px';
      headerDiv.style.borderRadius = '5px';
      headerDiv.style.border = '1px solid #ddd';
      
      const titleElement = doc.createElement('h2');
      titleElement.textContent = formTitle;
      titleElement.style.margin = '0 0 10px 0';
      headerDiv.appendChild(titleElement);
      
      if (patientName) {
        const patientElement = doc.createElement('p');
        patientElement.textContent = `Patient: ${patientName}`;
        patientElement.style.margin = '0';
        headerDiv.appendChild(patientElement);
      }
      
      const timestampElement = doc.createElement('p');
      timestampElement.textContent = `Filled on: ${new Date().toLocaleString()}`;
      timestampElement.style.margin = '5px 0 0 0';
      timestampElement.style.fontSize = '0.9em';
      headerDiv.appendChild(timestampElement);
      
      // Insert the header at the beginning of the body
      const body = doc.body;
      if (body.firstChild) {
        body.insertBefore(headerDiv, body.firstChild);
      } else {
        body.appendChild(headerDiv);
      }
      
      // Return the serialized HTML
      return new XMLSerializer().serializeToString(doc);
    } catch (error) {
      console.error('Error creating filled form HTML:', error);
      // If there's an error, return the original HTML content
      return parsedHtmlContent;
    }
  };

  // Function to load HTML content
  const loadHtmlContent = async () => {
    try {
      setIsLoading(true);
      
      if (!form) {
        console.log("No form object available");
        setIsLoading(false);
        return;
      }
      
      console.log("Form data:", form);
      
      // Determine the filename to use - check multiple possible properties
      let filename = null;
      if (form.originalFilename) {
        filename = form.originalFilename;
        console.log("Using form.originalFilename:", filename);
      } else if (form.filename) {
        filename = form.filename;
        console.log("Using form.filename:", filename);
      } else if (form.pdfFilename) {
        filename = form.pdfFilename;
        console.log("Using form.pdfFilename:", filename);
      } else if (form.title && form.title.endsWith('.pdf')) {
        filename = form.title;
        console.log("Using form.title as filename:", filename);
      } else if (form.title) {
        // Try to use the title with .pdf extension
        filename = form.title + '.pdf';
        console.log("Using form.title with .pdf extension:", filename);
      } else {
        console.log("No filename found in form object:", form);
        setIsLoading(false);
        return;
      }
      
      // First, try to get the HTML content directly from the form object
      if (form.htmlContent) {
        console.log("Using HTML content from form object, length:", form.htmlContent.length);
        setHtmlContent(form.htmlContent);
        setIsLoading(false);
        return;
      } else {
        console.log("No htmlContent in form object");
      }
      
      // If not available in the form object, try to fetch it from the API
      console.log("Fetching HTML content from API for:", filename);
      try {
        const apiUrl = `/api/universal-pdfs/${encodeURIComponent(filename)}`;
        console.log("API URL:", apiUrl);
        
        const apiResponse = await fetch(apiUrl);
        console.log("API Response status:", apiResponse.status);
        
        if (apiResponse.ok) {
          const apiData = await apiResponse.json();
          console.log("API Response data:", apiData);
          
          if (apiData.html_content) {
            console.log("Successfully loaded HTML content via API, length:", apiData.html_content.length);
            setHtmlContent(apiData.html_content);
            setIsLoading(false);
            return;
          } else {
            console.log("API response doesn't contain html_content");
          }
        } else {
          console.error(`API approach failed: ${apiResponse.status}`);
        }
      } catch (apiError) {
        console.error("Error fetching from API:", apiError);
      }
      
      // If API fails, try to fetch the HTML file directly
      const baseName = filename.replace(/\.[^/.]+$/, "");
      const htmlFileName = `${baseName}.html`;
      const htmlUrl = `/html_outputs/${htmlFileName}`;
      
      console.log("Attempting to fetch HTML file directly from:", htmlUrl);
      
      try {
        const response = await fetch(htmlUrl);
        console.log("File fetch response status:", response.status);
        
        if (response.ok) {
          const html = await response.text();
          console.log("Successfully loaded HTML content from file, length:", html.length);
          setHtmlContent(html);
        } else {
          console.error(`Failed to load HTML file: ${response.status} ${response.statusText}`);
        }
      } catch (fileError) {
        console.error("Error fetching HTML file:", fileError);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error in loadHtmlContent:', error);
      setIsLoading(false);
    }
  };
  
  // Function to render the form content
  const renderFormContent = () => {
    if (isFilledForm && form.htmlContent) {
      return (
        <div className="form-editor-filled-form">
          <div className="form-editor-filled-header">
            <h2>{form.title}</h2>
            {form.patientName && (
              <div className="form-editor-patient-info">
                Patient: {form.patientName}
              </div>
            )}
          </div>
          <div className="form-preview-container">
            {isLoading && !iframeLoaded && (
              <div className="iframe-loading-overlay">
                <div className="loading-spinner"></div>
                <p>Loading filled form...</p>
              </div>
            )}
            <iframe 
              srcDoc={form.htmlContent}
              className="form-preview-iframe"
              sandbox="allow-forms allow-scripts"
              onLoad={() => {
                setIframeLoaded(true);
                setIsLoading(false);
              }}
            />
          </div>
        </div>
      );
    }
    
    if (isLoading) {
      return (
        <div className="loading-preview">
          Loading form content...
        </div>
      );
    }

    if (!parsedHtmlContent) {
      return (
        <div className="no-content-message">
          No form content available. Please check the HTML content.
        </div>
      );
    }

    return (
      <div className="form-interactive-container">
        {renderCurrentStep()}
      </div>
    );
  };

  // Function to render the current step
  const renderCurrentStep = () => {
    if (!isFormActive || formSteps.length === 0) {
      return (
        <div className="no-content-message">
          No form steps available. Please check the HTML content.
        </div>
      );
    }

    const currentStepData = formSteps[currentStep];
    
    return (
      <div className="form-step-container">
        <div className="form-progress-bar">
          <div 
            className="form-progress-indicator" 
            style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          ></div>
        </div>
        <div className="form-step-counter">
          Step {currentStep + 1} of {totalSteps}
        </div>
        
        <div 
          className="form-step-content"
          dangerouslySetInnerHTML={{ __html: currentStepData.element }}
        />
        
        <div className="form-step-navigation">
          {currentStep > 0 && (
            <button 
              className="form-nav-button prev-button"
              onClick={handlePrevStep}
            >
              Previous
            </button>
          )}
          
          {currentStep < totalSteps - 1 ? (
            <button 
              className="form-nav-button next-button"
              onClick={handleNextStep}
            >
              Next
            </button>
          ) : (
            <button 
              className="form-nav-button submit-button"
              onClick={handleFormSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          )}
        </div>
      </div>
    );
  };

  // Function to render direct HTML content
  const renderDirectHtml = () => {
    return (
      <div 
        className="direct-html-content"
        dangerouslySetInnerHTML={{ __html: parsedHtmlContent }}
      />
    );
  };

  // Function to download the filled PDF
  const handleDownloadPDF = () => {
    // Get the submission ID from form data
    let formId = filledFormId || (form && form.id);
    
    if (!formId) {
      // If no ID is available, use a default ID of 1
      formId = 1;
      console.log("No form ID available, using default ID: 1");
    }
    
    // Remove any "filled_" prefix if present
    if (typeof formId === 'string' && formId.startsWith('filled_')) {
      formId = formId.replace('filled_', '');
    }
    
    // Use the absolute path to the PDF file
    const absolutePdfPath = `/Users/jibranhutchins/Developer/conform/backend/html_outputs/filled_pdfs/filled_form_${formId}.pdf`;
    
    // Show the absolute path in an alert
    alert(`PDF Absolute Path:\n${absolutePdfPath}\n\nPlease open this file manually.`);
    
    // Try to open the file directly using the file:// protocol
    // Note: This may not work in all browsers due to security restrictions
    window.open(`file://${absolutePdfPath}`, '_blank');
    
    // Also try the API endpoint as a fallback
    window.open(`/api/pdf-preview?path=${encodeURIComponent(absolutePdfPath)}`, '_blank');
  };

  return (
    <div className="app">
      <div className="sparkle"></div>
      <div className="sparkle"></div>
      <div className="sparkle"></div>
      <div className="sparkle"></div>
      <div className="sparkle"></div>
      <div className="sparkle"></div>
      <div className="sparkle"></div>
      <div className="sparkle"></div>
      <div className="sparkle"></div>
      <div className="sparkle"></div>
      <div className="decorative-circle decorative-circle-1"></div>
      <div className="decorative-circle decorative-circle-2"></div>

      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <div className="hamburger-menu" onClick={onToggleSidebar}>
              <div className="hamburger-line"></div>
              <div className="hamburger-line"></div>
              <div className="hamburger-line"></div>
            </div>
            <div className="logo-container">
              <img src={conformLogo} alt="Conform.ai logo" className="logo-image" />
              <span className="logo-text">Conform</span>
            </div>
          </div>
          <div className="h2ai-logo-container">
            <img src={h2aiLogo} alt="H2.ai logo" className="h2ai-logo" />
          </div>
          <div className="header-right">
            <div className="user-menu">
              <span>Welcome, {user?.name}</span>
              <button onClick={onLogout} className="login-button">Logout</button>
            </div>
          </div>
        </div>
      </header>

      <div className={`form-editor-container-embedded ${isFilledForm ? 'filled-form-view' : ''}`}>
        <div className="form-editor-main">
          <div className="form-editor-header">
            <h1>{isFilledForm ? 'Filled Form' : 'Form Editor'}</h1>
            <div className="header-actions">
              {/* Header actions */}
            </div>
          </div>
          
          <div className="form-editor-content">
            {renderFormContent()}
          </div>
          
          <div className="form-editor-actions">
            <button 
              className="form-editor-button secondary"
              onClick={onCancel}
            >
              Back to Dashboard
            </button>
            
            {!isFilledForm && (
              <button 
                className="form-editor-button"
                onClick={() => onSaveForm(formData)}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save Form'}
              </button>
            )}

<button
  className="form-editor-button primary"
  onClick={() =>
    window.open(
      'file:///Users/jibranhutchins/Developer/conform/backend/html_outputs/filled_pdfs/filled_form_1.pdf',
      '_blank'
    )
  }
>
  Download PDF
</button>


          </div>
        </div>
      </div>
    </div>
  );
};

export default FormEditor; 