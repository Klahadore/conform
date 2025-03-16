import React, { useState, useEffect, useRef } from 'react';
import './FormEditor.css';
import conformLogo from '../assets/conform_logo.png';
import h2aiLogo from '../assets/h2ai_logo.png';
import { scrollToTop } from '../utils/scrollUtils';
import FormFieldNavigator from './FormFieldNavigator';

const FormEditor = ({ user, onLogout, onToggleSidebar, onSaveForm, onCancel, form, navigateToDashboard }) => {
  const [formElements, setFormElements] = useState([]);
  const [currentElement, setCurrentElement] = useState({
    type: 'text',
    label: '',
    placeholder: '',
    required: false,
    options: []
  });
  const [showElementForm, setShowElementForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState(-1);
  const [newOption, setNewOption] = useState('');
  const [formTitle, setFormTitle] = useState(form ? form.title : 'New Form');
  const [pdfUrl, setPdfUrl] = useState(form ? form.pdfUrl : '');
  const [generatedFormHtml, setGeneratedFormHtml] = useState('');
  const [isFormGenerated, setIsFormGenerated] = useState(false);
  const [htmlContent, setHtmlContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const iframeRef = useRef(null);

  useEffect(() => {
    // Update state when form prop changes
    if (form) {
      setFormTitle(form.title);
      setPdfUrl(form.pdfUrl);
      loadHtmlContent();
    }
  }, [form]);

  useEffect(() => {
    // Add a sample field for testing if no elements exist
    if (formElements.length === 0) {
      setFormElements([
        {
          type: 'text',
          label: 'Patient Full Name',
          placeholder: 'Enter patient name',
          required: true,
          options: []
        }
      ]);
    }
  }, []);  // Empty dependency array means this runs once on component mount

  useEffect(() => {
    console.log("FormEditor mounted/updated with form:", form);
    
    if (form) {
      console.log("Form properties:", {
        id: form.id,
        title: form.title,
        originalFilename: form.originalFilename,
        filename: form.filename,
        pdfFilename: form.pdfFilename
      });
    }
  }, [form]);

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
  
  // Function to extract just the form content from the HTML
  const extractFormContent = (html) => {
    try {
      // Create a temporary DOM element to parse the HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Find the main form element or content container
      const formElement = doc.querySelector('form') || doc.querySelector('.form-container') || doc.querySelector('main');
      
      if (formElement) {
        return formElement.outerHTML;
      }
      
      // If we can't find a specific form element, return the body content
      return doc.body.innerHTML;
    } catch (error) {
      console.error('Error extracting form content:', error);
      return html; // Return the original HTML if extraction fails
    }
  };

  const handleHomeClick = (e) => {
    e.preventDefault();
    // Navigate to home but maintain login state
    window.history.pushState({}, '', '/');
    // This will trigger the App component to update its UI without logging out
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleAddElement = () => {
    setCurrentElement({
      type: 'text',
      label: '',
      placeholder: '',
      required: false,
      options: []
    });
    setShowElementForm(true);
    setEditingIndex(-1);
  };

  const handleEditElement = (index) => {
    setCurrentElement({ ...formElements[index] });
    setShowElementForm(true);
    setEditingIndex(index);
  };

  const handleDeleteElement = (index) => {
    const updatedElements = [...formElements];
    updatedElements.splice(index, 1);
    setFormElements(updatedElements);
  };

  const handleSaveElement = () => {
    if (!currentElement.label) return;

    const updatedElements = [...formElements];
    
    if (editingIndex >= 0) {
      updatedElements[editingIndex] = currentElement;
    } else {
      updatedElements.push(currentElement);
    }
    
    setFormElements(updatedElements);
    setShowElementForm(false);
  };

  const handleAddOption = () => {
    if (!newOption) return;
    
    setCurrentElement({
      ...currentElement,
      options: [...currentElement.options, newOption]
    });
    
    setNewOption('');
  };

  const handleRemoveOption = (index) => {
    const updatedOptions = [...currentElement.options];
    updatedOptions.splice(index, 1);
    
    setCurrentElement({
      ...currentElement,
      options: updatedOptions
    });
  };

  const handleSave = () => {
    const newForm = {
      id: form ? form.id : Date.now(),
      title: formTitle,
      createdAt: form ? form.createdAt : new Date().toISOString(),
      originalFilename: form ? form.originalFilename : '',
      htmlContent: htmlContent
    };
    
    onSaveForm(newForm);
  };

  const handleDashboardClick = (e) => {
    e.preventDefault();
    if (navigateToDashboard) {
      navigateToDashboard();
    } else {
      onCancel();
    }
  };

  const handleApplyAutofill = (option, fieldName) => {
    console.log(`Applied ${option} to field: ${fieldName}`);
    
    // Show a visual confirmation
    alert(`Applied "${option}" to field: "${fieldName}"`);
    
    // In a real implementation, you would update the form element
    // For example:
    // const updatedElements = formElements.map(element => {
    //   if (element.label === fieldName) {
    //     return {
    //       ...element,
    //       autofillOption: option
    //     };
    //   }
    //   return element;
    // });
    // setFormElements(updatedElements);
  };

  const handleApplyRadial = (option, fieldName) => {
    console.log(`Applied radio option "${option}" to field: ${fieldName}`);
    alert(`Selected "${option}" for field: "${fieldName}"`);
    // In a real implementation, you would update the form element
  };

  const handleFormSubmit = (formData) => {
    console.log('Form submitted with data:', formData);
    
    // Here you would typically send the data to your backend
    // For example:
    // axios.post('/api/submit-form', { formId: form.id, formData })
    //   .then(response => {
    //     alert('Form submitted successfully!');
    //     navigateToDashboard();
    //   })
    //   .catch(error => {
    //     console.error('Error submitting form:', error);
    //     alert('Error submitting form. Please try again.');
    //   });
    
    // For now, just show an alert
    alert('Form submitted successfully!');
    navigateToDashboard();
  };

  const generateForm = async () => {
    // This would be replaced with your actual API call to the LLM
    try {
      // Example API call:
      // const response = await axios.post('/api/generate-form', {
      //   pdfUrl: pdfUrl,
      //   formElements: formElements
      // });
      // setGeneratedFormHtml(response.data.html);
      
      // For testing, we'll use a more realistic placeholder with multiple fields
      const testHtml = `
        <div data-field-id="field1" data-field-name="patientName" data-required="true">
          <label class="text-white text-lg font-medium mb-2">
            Patient Name
            <span class="text-emerald-400 ml-1">*</span>
          </label>
          <p class="text-white/60 text-sm mb-4">
            Enter the patient's full legal name as it appears on their ID.
          </p>
          <div class="mb-5">
            <input
              type="text"
              name="patientName"
              required
              class="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white text-base transition-all focus:outline-none focus:border-emerald-400/40 focus:shadow focus:shadow-emerald-400/10"
              placeholder="e.g. John Smith"
            />
          </div>
        </div>
        
        <div data-field-id="field2" data-field-name="gender" data-required="true">
          <label class="text-white text-lg font-medium mb-2">
            Gender
            <span class="text-emerald-400 ml-1">*</span>
          </label>
          <p class="text-white/60 text-sm mb-4">
            Select the patient's gender as it appears on their medical records.
          </p>
          <div class="mb-4">
            <div class="space-y-2">
              <div class="flex items-center p-3 bg-purple-900/[0.08] rounded-lg cursor-pointer transition-all border border-purple-300/[0.15] mb-2 hover:bg-purple-900/[0.15]">
                <input type="radio" id="gender-male" name="gender" value="male" required class="hidden" />
                <div class="w-[18px] h-[18px] rounded-full border-2 border-white/50 mr-3 flex items-center justify-center"></div>
                <label for="gender-male" class="text-white text-[0.95rem]">Male</label>
              </div>
              <div class="flex items-center p-3 bg-purple-900/[0.08] rounded-lg cursor-pointer transition-all border border-purple-300/[0.15] mb-2 hover:bg-purple-900/[0.15]">
                <input type="radio" id="gender-female" name="gender" value="female" required class="hidden" />
                <div class="w-[18px] h-[18px] rounded-full border-2 border-white/50 mr-3 flex items-center justify-center"></div>
                <label for="gender-female" class="text-white text-[0.95rem]">Female</label>
              </div>
              <div class="flex items-center p-3 bg-purple-900/[0.08] rounded-lg cursor-pointer transition-all border border-purple-300/[0.15] mb-2 hover:bg-purple-900/[0.15]">
                <input type="radio" id="gender-other" name="gender" value="other" required class="hidden" />
                <div class="w-[18px] h-[18px] rounded-full border-2 border-white/50 mr-3 flex items-center justify-center"></div>
                <label for="gender-other" class="text-white text-[0.95rem]">Other</label>
              </div>
            </div>
          </div>
        </div>
        
        <div data-field-id="field3" data-field-name="dob" data-required="false">
          <label class="text-white text-lg font-medium mb-2">
            Date of Birth
          </label>
          <p class="text-white/60 text-sm mb-4">
            Enter the patient's date of birth.
          </p>
          <div class="mb-5">
            <input
              type="date"
              name="dob"
              class="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white text-base transition-all focus:outline-none focus:border-emerald-400/40 focus:shadow focus:shadow-emerald-400/10"
            />
          </div>
        </div>
      `;
      
      setGeneratedFormHtml(testHtml);
      setIsFormGenerated(true);
    } catch (error) {
      console.error('Error generating form:', error);
      alert('Error generating form. Please try again.');
    }
  };

  const handleClose = () => {
    if (onCancel) {
      onCancel();
    }
  };

  // Function to handle iframe load event
  const handleIframeLoad = () => {
    if (iframeRef.current) {
      // You can interact with the iframe content here if needed
      console.log('Iframe loaded successfully');
    }
  };

  const testApiEndpoint = async () => {
    if (!form || !form.originalFilename) {
      console.log("No form or originalFilename available for API test");
      alert("No form or originalFilename available");
      return;
    }
    
    try {
      console.log("Testing API endpoint for:", form.originalFilename);
      
      // Test the universal-pdfs endpoint
      const apiResponse = await fetch(`/api/universal-pdfs/${form.originalFilename}`);
      console.log("API Response status:", apiResponse.status);
      
      if (apiResponse.ok) {
        const apiData = await apiResponse.json();
        console.log("API Response data:", apiData);
        
        if (apiData.html_content) {
          console.log("HTML content length from API:", apiData.html_content.length);
          alert(`API test successful! HTML content length: ${apiData.html_content.length} characters`);
        } else {
          console.log("API response doesn't contain html_content");
          alert("API response doesn't contain html_content");
        }
      } else {
        console.error(`API test failed: ${apiResponse.status} ${apiResponse.statusText}`);
        alert(`API test failed: ${apiResponse.status} ${apiResponse.statusText}`);
      }
    } catch (error) {
      console.error("Error testing API:", error);
      alert(`Error testing API: ${error.message}`);
    }
  };

  const debugHtmlContent = async () => {
    try {
      console.log("Debug button clicked");
      
      if (!form) {
        console.log("No form object available for debugging");
        alert("No form object available");
        return;
      }
      
      console.log("Form data for debugging:", form);
      
      // Determine the filename to use
      let filename = null;
      if (form.originalFilename) {
        filename = form.originalFilename;
      } else if (form.filename) {
        filename = form.filename;
      } else if (form.pdfFilename) {
        filename = form.pdfFilename;
      } else if (form.title && form.title.endsWith('.pdf')) {
        filename = form.title;
      } else if (form.title) {
        filename = form.title + '.pdf';
      }
      
      if (!filename) {
        alert("No filename found in form object");
        console.log("No filename found in form object:", form);
        return;
      }
      
      console.log("Using filename for debugging:", filename);
      
      // Try the debug endpoint
      try {
        const debugUrl = `/api/debug/html-content/${encodeURIComponent(filename)}`;
        console.log("Debug URL:", debugUrl);
        
        const debugResponse = await fetch(debugUrl);
        console.log("Debug response status:", debugResponse.status);
        
        if (debugResponse.ok) {
          const debugData = await debugResponse.json();
          console.log("Debug data:", debugData);
          alert(JSON.stringify(debugData, null, 2));
          
          if (debugData.file_exists) {
            // Try to load the file directly
            const htmlUrl = `/html_outputs/${debugData.html_filename}`;
            console.log("Attempting to fetch HTML directly from:", htmlUrl);
            
            const htmlResponse = await fetch(htmlUrl);
            if (htmlResponse.ok) {
              const html = await htmlResponse.text();
              console.log("Successfully loaded HTML, length:", html.length);
              setHtmlContent(html);
              alert("HTML content loaded successfully!");
            } else {
              console.error("Failed to load HTML file:", htmlResponse.status);
              alert(`Failed to load HTML file: ${htmlResponse.status}`);
            }
          }
        } else {
          console.error("Debug endpoint failed:", debugResponse.status);
          alert(`Debug endpoint failed: ${debugResponse.status}`);
        }
      } catch (error) {
        console.error("Error in debug fetch:", error);
        alert(`Error in debug fetch: ${error.message}`);
      }
    } catch (error) {
      console.error("Error in debugHtmlContent:", error);
      alert(`Error in debugHtmlContent: ${error.message}`);
    }
  };

  // Add this function to directly load HTML content
  const loadHtmlDirectly = async () => {
    try {
      if (!form) {
        console.log("No form object available for direct loading");
        return;
      }
      
      // Determine the filename to use
      let filename = null;
      if (form.originalFilename) {
        filename = form.originalFilename;
      } else if (form.filename) {
        filename = form.filename;
      } else if (form.pdfFilename) {
        filename = form.pdfFilename;
      } else if (form.title && form.title.endsWith('.pdf')) {
        filename = form.title;
      } else if (form.title) {
        filename = form.title + '.pdf';
      }
      
      if (!filename) {
        console.log("No filename found in form object:", form);
        return;
      }
      
      console.log("Attempting to load HTML directly for:", filename);
      
      // Try the direct HTML endpoint
      const htmlUrl = `/api/html-content/${encodeURIComponent(filename)}`;
      console.log("Direct HTML URL:", htmlUrl);
      
      const response = await fetch(htmlUrl);
      console.log("Direct HTML response status:", response.status);
      
      if (response.ok) {
        const html = await response.text();
        console.log("Successfully loaded HTML directly, length:", html.length);
        setHtmlContent(html);
        setIsLoading(false);
        return true;
      } else {
        console.error(`Failed to load HTML directly: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.error("Error loading HTML directly:", error);
      return false;
    }
  };

  console.log("Current HTML content length:", htmlContent ? htmlContent.length : 0);

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
            <div 
              className="logo-container" 
              onClick={handleHomeClick}
              style={{ cursor: 'pointer' }}
            >
              <img src={conformLogo} alt="Conform.ai logo" className="logo-image" />
              <span className="logo-text">Conform</span>
            </div>
          </div>
          <div className="h2ai-logo-container">
            <img src={h2aiLogo} alt="H2.ai logo" className="h2ai-logo" />
          </div>
          <div className="header-right">
            {user && (
              <div className="user-menu">
                <span>Welcome, {user.name}</span>
                <button onClick={onLogout} className="login-button">Logout</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="form-editor-page">
        <div className="form-editor-single-panel">
          <div className="form-title-section">
            <label htmlFor="formTitle">Form Title:</label>
            <input
              type="text"
              id="formTitle"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Enter form title"
            />
          </div>
          
          <div className="form-preview-panel">
            <h3>Form Preview</h3>
            
            {/* Test buttons */}
            <div style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
              <button 
                onClick={loadHtmlContent} 
                style={{ 
                  padding: '8px 16px', 
                  backgroundColor: '#4FFFB0', 
                  color: 'black', 
                  border: 'none', 
                  borderRadius: '4px'
                }}
              >
                Reload HTML Content
              </button>
              
              <button 
                onClick={testApiEndpoint} 
                style={{ 
                  padding: '8px 16px', 
                  backgroundColor: '#FF4F4F', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px'
                }}
              >
                Test API Endpoint
              </button>
              
              <div style={{ marginBottom: '1rem' }}>
                <button 
                  onClick={debugHtmlContent}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#ff9900',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    marginRight: '10px'
                  }}
                >
                  Debug HTML Content
                </button>
              </div>
            </div>
            
            <div className="form-content-container">
              {isLoading ? (
                <div className="loading-preview">Loading form content...</div>
              ) : htmlContent ? (
                <>
                  <div style={{ marginBottom: '10px', padding: '10px', background: '#f0f0f0', borderRadius: '4px' }}>
                    HTML Content Length: {htmlContent.length} characters
                  </div>
                  <iframe
                    ref={iframeRef}
                    srcDoc={htmlContent}
                    style={{
                      width: '100%',
                      height: '600px',
                      border: '1px solid #ccc',
                      borderRadius: '4px'
                    }}
                    onLoad={() => console.log("iframe loaded")}
                    title="Form Preview"
                  />
                </>
              ) : (
                <div className="no-content-message">
                  No form content available. Please use the Debug button above to troubleshoot.
                </div>
              )}
            </div>
          </div>
          
          <div className="form-editor-actions">
            <button className="cancel-button" onClick={onCancel}>Cancel</button>
            <button className="save-button" onClick={handleSave}>Save Form</button>
          </div>
        </div>
      </main>

      {showElementForm && (
        <div className="element-form-overlay">
          <div className="element-form">
            <h3>{editingIndex >= 0 ? 'Edit Element' : 'Add New Element'}</h3>
            
            <div className="element-form-field">
              <label>Element Type</label>
              <select 
                value={currentElement.type}
                onChange={(e) => setCurrentElement({...currentElement, type: e.target.value})}
              >
                <option value="text">Text Input</option>
                <option value="textarea">Text Area</option>
                <option value="select">Dropdown</option>
                <option value="checkbox">Checkbox Group</option>
                <option value="radio">Radio Group</option>
              </select>
            </div>
            
            <div className="element-form-field">
              <label>Label</label>
              <input 
                type="text"
                value={currentElement.label}
                onChange={(e) => setCurrentElement({...currentElement, label: e.target.value})}
                placeholder="Enter field label"
              />
            </div>
            
            {(currentElement.type === 'text' || currentElement.type === 'textarea') && (
              <div className="element-form-field">
                <label>Placeholder</label>
                <input 
                  type="text"
                  value={currentElement.placeholder}
                  onChange={(e) => setCurrentElement({...currentElement, placeholder: e.target.value})}
                  placeholder="Enter placeholder text"
                />
              </div>
            )}
            
            {(currentElement.type === 'select' || currentElement.type === 'checkbox' || currentElement.type === 'radio') && (
              <div className="element-form-field">
                <label>Options</label>
                <div className="options-container">
                  {currentElement.options.map((option, index) => (
                    <div key={index} className="option-item">
                      <span>{option}</span>
                      <button 
                        type="button"
                        onClick={() => handleRemoveOption(index)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <div className="add-option-container">
                  <input 
                    type="text"
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    placeholder="Enter option text"
                  />
                  <button 
                    type="button"
                    onClick={handleAddOption}
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
            
            <div className="element-form-field checkbox-field">
              <label>
                <input 
                  type="checkbox"
                  checked={currentElement.required}
                  onChange={(e) => setCurrentElement({...currentElement, required: e.target.checked})}
                />
                Required Field
              </label>
            </div>
            
            <div className="element-form-actions">
              <button 
                type="button" 
                className="cancel-button"
                onClick={() => setShowElementForm(false)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="save-button"
                onClick={handleSaveElement}
              >
                Save Element
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <div className="logo-container">
              <img src={conformLogo} alt="Conform.ai logo" className="logo-image" />
              <span className="logo-text">Conform</span>
            </div>
            <p className="footer-description">Making medical form filling accurate and efficient.</p>
          </div>
          <div className="footer-section">
            <h4>Pages</h4>
            <ul>
              <li><span className="footer-text">Home</span></li>
              <li><span className="footer-text">Dashboard</span></li>
              <li><span className="footer-text" style={{ fontWeight: 'bold', color: '#4FFFB0' }}>Form Editor</span></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Product</h4>
            <ul>
              <li><span className="footer-text">Features</span></li>
              <li><span className="footer-text">Use Cases</span></li>
              <li><span className="footer-text">Documentation</span></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Company</h4>
            <ul>
              <li><span className="footer-text">About Us</span></li>
              <li><span className="footer-text">Contact</span></li>
              <li><span className="footer-text">Future Work</span></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Connect</h4>
            <div className="social-links">
              <a href="#" className="social-link">GitHub</a>
              <a href="#" className="social-link">Devpost</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="sponsored-by">
            <span>A project made at</span>
            <img src={h2aiLogo} alt="H2.ai logo" className="h2ai-logo" />
          </div>
          <p>&copy; 2025 Conform. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default FormEditor; 