import React, { useState, useRef, useEffect } from 'react';
import conformLogo from '../assets/conform_logo.png';
import h2aiLogo from '../assets/h2ai_logo.png';
import './Dashboard.css';
import EditProfile from './EditProfile';
import FormEditor from './FormEditor';
import LoadingOverlay from './LoadingOverlay';
import { scrollToTop } from '../utils/scrollUtils';

const Dashboard = ({ 
  user, 
  onLogout, 
  onToggleSidebar, 
  onUpdateUser, 
  forms, 
  setForms, 
  onCreateForm 
}) => {
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showFormEditor, setShowFormEditor] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [userPdfs, setUserPdfs] = useState([]);
  const [lastUploadedPdf, setLastUploadedPdf] = useState(null);
  const [showAllForms, setShowAllForms] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pdfToDelete, setPdfToDelete] = useState(null);
  const [currentFormId, setCurrentFormId] = useState(null);
  const [showPatientAssignmentPopup, setShowPatientAssignmentPopup] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [newPatient, setNewPatient] = useState('');
  const [patients, setPatients] = useState([]);
  const [formToEdit, setFormToEdit] = useState(null);
  const fileInputRef = useRef(null);
  const [isLoadingForms, setIsLoadingForms] = useState(false);
  const [expandedPatient, setExpandedPatient] = useState(null);
  const [showDeletePatientConfirm, setShowDeletePatientConfirm] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState(null);
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const patientFileInputRef = useRef(null);
  const [patientEmail, setPatientEmail] = useState('');
  const [patientDob, setPatientDob] = useState('');
  const [patientGender, setPatientGender] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientConditions, setPatientConditions] = useState('');
  const [patientMedications, setPatientMedications] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingPdfId, setProcessingPdfId] = useState(null);
  const [processingFilename, setProcessingFilename] = useState(null);
  const [htmlReady, setHtmlReady] = useState(false);
  const [htmlUrl, setHtmlUrl] = useState(null);
  const checkIntervalRef = useRef(null);
  const [templates, setTemplates] = useState([]);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [isProcessingTemplate, setIsProcessingTemplate] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('Processing your form...');
  
  // Add a cleanup effect to clear the interval when component unmounts
  useEffect(() => {
    return () => {
      if (checkIntervalRef.current) {
        console.log("Cleaning up check interval on unmount");
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, []);
  
  // Fetch templates when isProcessingTemplate changes to false
  useEffect(() => {
    if (user && !isProcessingTemplate) {
      console.log("isProcessingTemplate changed to false, fetching templates");
      fetchTemplates();
    }
  }, [user, isProcessingTemplate]);
  
  // Add an effect to check completion status periodically if processing is active
  useEffect(() => {
    // If we're processing a template, set up a backup check
    if (isProcessingTemplate && lastUploadedPdf) {
      console.log("Setting up backup completion check");
      
      // Check every 15 seconds as a backup to the main polling
      const backupIntervalId = setInterval(async () => {
        try {
          console.log("Backup check for completion...");
          const checkResponse = await fetch(`/api/check-html/${encodeURIComponent(lastUploadedPdf.originalFilename)}?user_id=${user.id}`);
          
          if (checkResponse.ok) {
            const checkData = await checkResponse.json();
            console.log("Backup check response:", checkData);
            
            if (checkData.htmlGenerated) {
              // Processing is complete, update UI
              setIsProcessingTemplate(false);
              setUploadSuccess(`Template Created! "${lastUploadedPdf.originalFilename}" is ready to use.`);
              
              // Refresh data
              fetchUserPdfs();
              fetchTemplates();
              
              // Clear the interval
              clearInterval(backupIntervalId);
            }
          }
        } catch (error) {
          console.error("Error in backup completion check:", error);
        }
      }, 15000); // Check every 15 seconds
      
      // Return cleanup function
      return () => {
        clearInterval(backupIntervalId);
      };
    }
  }, [isProcessingTemplate, lastUploadedPdf, user]);
  
  // Fetch user's PDFs on component mount
  useEffect(() => {
    if (user) {
      fetchUserPdfs();
      fetchTemplates(); // Also fetch templates on mount
    }
  }, [user]);
  
  const fetchUserPdfs = async () => {
    try {
      const response = await fetch(`/api/user/${user.id}/filled-forms`);
      if (response.ok) {
        const data = await response.json();
        setUserPdfs(data.filledForms || []);
      }
    } catch (error) {
      console.error('Error fetching filled forms:', error);
      setUserPdfs([]);
    }
  };
  
  // Fetch patients for the logged-in user
  useEffect(() => {
    if (user) {
      fetchUserPatients();
    }
  }, [user]);
  
  const fetchUserPatients = async () => {
    try {
      const response = await fetch(`/api/user/${user.id}/patients`);
      
      if (response.ok) {
        const data = await response.json();
        setPatients(data.patients);
      } else {
        console.error('Error fetching patients:', response.statusText);
        // Use mock data as fallback
        if (patients.length === 0) {
          setPatients([
            { id: 1, name: 'John Doe', userId: user.id },
            { id: 2, name: 'Jane Smith', userId: user.id },
            { id: 3, name: 'Robert Johnson', userId: user.id }
          ]);
        }
      }
    } catch (error) {
      console.error('Error fetching user patients:', error);
      // Use mock data as fallback
      if (patients.length === 0) {
        setPatients([
          { id: 1, name: 'John Doe', userId: user.id },
          { id: 2, name: 'Jane Smith', userId: user.id },
          { id: 3, name: 'Robert Johnson', userId: user.id }
        ]);
      }
    }
  };
  
  const handleHomeClick = (e) => {
    e.preventDefault();
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
    scrollToTop();
  };
  
  const handleCreateForm = () => {
    // Reset the last uploaded PDF when clicking to upload a new one
    setLastUploadedPdf(null);
    
    // Open the file picker directly instead of showing the patient assignment popup
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
    
    scrollToTop();
  };
  
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check if file is a PDF
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setUploadError('Only PDF files are allowed');
      setTimeout(() => setUploadError(''), 3000);
      return;
    }
    
    setIsUploading(true);
    setUploadError('');
    setUploadSuccess('');
    
    try {
      console.log(`Uploading file: ${file.name}, size: ${file.size} bytes`);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('user_id', user.id);
      
      console.log('Sending upload request...');
      const response = await fetch('/api/upload-pdf', {
        method: 'POST',
        body: formData,
      });
      
      console.log(`Upload response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Server error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Upload response data:', data);
      
      setLastUploadedPdf(data.pdf);
      
      // If the PDF already has HTML content and filename
      if (data.pdf.hasHtmlContent && data.pdf.hasHtmlFilename) {
        console.log("PDF already has HTML content");
        setUploadSuccess(`Template for "${data.pdf.originalFilename}" already exists.`);
      }
      // If processing was started
      else if (data.pdf.processingStarted) {
        console.log("PDF processing started");
        setProcessingMessage(`Processing "${data.pdf.originalFilename}" to create template...`);
        setIsProcessingTemplate(true);
        
        // Set a timeout to automatically hide the loading overlay after 2 minutes
        // This gives enough time for the processing to complete in most cases
        const timeoutId = setTimeout(() => {
          if (isProcessingTemplate) {
            setIsProcessingTemplate(false);
            setUploadSuccess(`Template processing started for "${data.pdf.originalFilename}". It will be available soon.`);
            // Refresh the user's PDFs list
            fetchUserPdfs();
            // Refresh templates
            fetchTemplates();
          }
        }, 120000); // 2 minutes
        
        // Set up a polling mechanism that checks every 5 seconds
        const checkCompletion = async () => {
          try {
            console.log(`Checking HTML readiness for: ${data.pdf.originalFilename}`);
            const checkResponse = await fetch(`/api/check-html/${encodeURIComponent(data.pdf.originalFilename)}?user_id=${user.id}`);
            
            if (checkResponse.ok) {
              const checkData = await checkResponse.json();
              console.log("HTML readiness check response:", checkData);
              
              if (checkData.htmlGenerated) {
                // Clear the timeout since we're done
                clearTimeout(timeoutId);
                
                // Clear any existing interval
                if (checkIntervalRef.current) {
                  clearInterval(checkIntervalRef.current);
                  checkIntervalRef.current = null;
                }
                
                // Update UI
                setIsProcessingTemplate(false);
                setUploadSuccess(`Template Created! "${data.pdf.originalFilename}" is ready to use.`);
                
                // Refresh data
                fetchUserPdfs();
                fetchTemplates();
                
                return true; // Processing is complete
              }
            }
            return false; // Processing is not complete yet
          } catch (error) {
            console.error("Error checking HTML readiness:", error);
            return false;
          }
        };
        
        // Check immediately after 5 seconds
        setTimeout(async () => {
          const isComplete = await checkCompletion();
          
          // If not complete after first check, set up a polling interval
          if (!isComplete) {
            // Check every 10 seconds
            const intervalId = setInterval(async () => {
              console.log("Polling for completion...");
              const isComplete = await checkCompletion();
              if (isComplete) {
                console.log("Processing complete, clearing interval");
                clearInterval(intervalId);
                checkIntervalRef.current = null;
              }
            }, 10000); // Check every 10 seconds
            
            // Store the interval ID for cleanup
            checkIntervalRef.current = intervalId;
          }
        }, 5000);
      } else {
        setUploadSuccess(`PDF uploaded successfully: ${data.pdf.originalFilename}`);
      }
      
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      setIsUploading(false);
      setShowPatientAssignmentPopup(false);
    } catch (error) {
      console.error('Error uploading PDF:', error);
      setUploadError(`Error uploading PDF: ${error.message}`);
      setIsUploading(false);
      setIsProcessingTemplate(false);
    }
  };
  
  const handleEditForm = (formId) => {
    // Find the PDF information from userPdfs
    const pdfToEdit = userPdfs.find(pdf => pdf.id === formId);
    
    if (pdfToEdit) {
      // Create a form object with the PDF information
      const formData = {
        id: pdfToEdit.id,
        title: pdfToEdit.originalFilename.replace('.pdf', ''),
        createdAt: pdfToEdit.uploadDate,
        pdfUrl: pdfToEdit.url,
        filename: pdfToEdit.filename,
        originalFilename: pdfToEdit.originalFilename
      };
      
      // Set the form to be edited
      setFormToEdit(formData);
      
      // Show the Form Editor
      setShowFormEditor(true);
      
      // Close any open modals
      setShowAllForms(false);
      setExpandedPatient(null);
      
      // Scroll to top for better user experience
      scrollToTop();
    } else {
      console.error(`Form with ID ${formId} not found`);
      setUploadError('Form not found');
      setTimeout(() => setUploadError(''), 3000);
    }
  };
  
  const handleDeleteForm = (formId) => {
    if (setForms) {
      setForms(forms.filter(form => form.id !== formId));
    }
  };
  
  const handleUpdateSuccess = (updatedUser) => {
    // Pass the updated user data to the parent component
    if (onUpdateUser) {
      onUpdateUser(updatedUser);
    }
  };

  const handleSaveForm = (newForm) => {
    setForms([...forms, newForm]);
    setShowFormEditor(false);
  };

  const handleViewAllForms = async () => {
    setIsLoadingForms(true);
    
    // Fetch the latest PDFs with patient information
    await fetchPdfsWithPatientInfo();
    
    // Show the modal and hide loading
    setShowAllForms(true);
    setIsLoadingForms(false);
  };

  const fetchPdfsWithPatientInfo = async () => {
    try {
      console.log("Fetching PDFs with patient info...");
      
      // Fetch PDFs from API
      const response = await fetch(`/api/user/${user.id}/pdfs`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Log the raw data from the API
        console.log("API Response:", data);
        console.log("PDFs from API:", data.pdfs);
        
        // Check if any PDFs have patient information
        const hasPatientsInfo = data.pdfs.some(pdf => pdf.patientName);
        console.log("Any PDFs have patient info?", hasPatientsInfo);
        
        if (!hasPatientsInfo) {
          console.log("No patient info found in API response. Property names:", 
            Object.keys(data.pdfs[0] || {}));
        }
        
        // Update the userPdfs state with the data directly from the API
        setUserPdfs(data.pdfs);
      }
    } catch (error) {
      console.error('Error fetching PDFs with patient information:', error);
    }
  };

  const handleCloseAllForms = () => {
    setShowAllForms(false);
  };

  const handleDeletePdf = (pdfId) => {
    setPdfToDelete(pdfId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!pdfToDelete) return;
    
    try {
      const response = await fetch(`/api/pdfs/${pdfToDelete}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete form');
      }
      
      // Remove the PDF from the userPdfs state
      setUserPdfs(userPdfs.filter(pdf => pdf.id !== pdfToDelete));
      
      // If this was the last uploaded PDF, clear it
      if (lastUploadedPdf && lastUploadedPdf.id === pdfToDelete) {
        setLastUploadedPdf(null);
      }
      
      // Show success message
      setUploadSuccess('Form deleted successfully');
      setTimeout(() => setUploadSuccess(''), 3000);
      
    } catch (error) {
      console.error('Error deleting PDF:', error);
      setUploadError('Failed to delete form');
      setTimeout(() => setUploadError(''), 5000);
    } finally {
      // Close the confirmation modal
      setShowDeleteConfirm(false);
      setPdfToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setPdfToDelete(null);
  };

  // Add a useEffect to handle the automatic clearing of success messages
  useEffect(() => {
    // If there's a success message, set a timeout to clear it
    if (uploadSuccess) {
      const timeoutId = setTimeout(() => {
        setUploadSuccess('');
      }, 5000);
      
      // Return a cleanup function to clear the timeout if the component unmounts
      // or if uploadSuccess changes before the timeout completes
      return () => clearTimeout(timeoutId);
    }
  }, [uploadSuccess]);

  // Function to handle patient assignment
  const handleAssignPatient = async (e) => {
    e.preventDefault();
    
    try {
      // Validate that a patient is selected
      if (!selectedPatient) {
        setUploadError('Please select a patient');
        setTimeout(() => setUploadError(''), 3000);
        return;
      }
      
      console.log("handleAssignPatient - Selected patient ID:", selectedPatient);
      console.log("handleAssignPatient - formToEdit:", JSON.stringify(formToEdit, null, 2));
      
      // Close the patient assignment popup
      setShowPatientAssignmentPopup(false);
      
      // If we have a form to edit (template), process it with chain2
      if (formToEdit && formToEdit.htmlFilename) {
        console.log("handleAssignPatient - Processing template with chain2");
        console.log("handleAssignPatient - Template filename:", formToEdit.htmlFilename);
        
        // Show loading overlay with redirect message
        setIsProcessingTemplate(true);
        setProcessingMessage(`Filling form for patient...`);
        
        // Call the API to fill the template with patient and doctor data
        const requestData = {
          template_filename: formToEdit.htmlFilename,
          patient_id: selectedPatient,
          user_id: user.id
        };
        
        console.log("handleAssignPatient - API request data:", JSON.stringify(requestData, null, 2));
        
        const response = await fetch('/api/fill-template', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestData)
        });
        
        console.log("handleAssignPatient - API response status:", response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("handleAssignPatient - API error response:", errorText);
          try {
            const errorData = JSON.parse(errorText);
            console.error("handleAssignPatient - Parsed error data:", errorData);
            throw new Error(errorData.detail || 'Failed to fill template');
          } catch (parseError) {
            console.error("handleAssignPatient - Could not parse error response as JSON:", parseError);
            throw new Error(errorText || 'Failed to fill template');
          }
        }
        
        const data = await response.json();
        console.log("handleAssignPatient - API success response:", JSON.stringify(data, null, 2));
        
        // Update processing message to indicate fetching the filled form
        setProcessingMessage('Form filled successfully! Loading content...');
        
        // Fetch the actual HTML content instead of just using the URL
        const filledFormUrl = `/api/filled-form/${encodeURIComponent(data.filled_template_filename)}?user_id=${user.id}`;
        console.log("handleAssignPatient - Fetching HTML content from:", filledFormUrl);
        
        try {
          const htmlResponse = await fetch(filledFormUrl);
          
          if (!htmlResponse.ok) {
            throw new Error(`Failed to fetch HTML content: ${htmlResponse.status}`);
          }
          
          // Get the HTML content as text
          const htmlContent = await htmlResponse.text();
          console.log("handleAssignPatient - Fetched HTML content length:", htmlContent.length);
          
          // Get patient name for display
          const patientName = patients.find(p => p.id == selectedPatient)?.name || 'Unknown Patient';
          
          // Create a form object with the filled form data and actual HTML content
          const filledForm = {
            id: `filled_${Date.now()}`, // Generate a temporary ID
            title: `Filled ${formToEdit.title || 'Form'}`,
            htmlContent: htmlContent, // Store the actual HTML content, not just the URL
            isFilledForm: true, // Flag to indicate this is a filled form
            patientId: selectedPatient,
            patientName: patientName
          };
          
          // Add a small delay before redirecting to ensure the UI updates properly
          setTimeout(() => {
            // Hide the loading overlay
            setIsProcessingTemplate(false);
            
            // Show success message
            setUploadSuccess(`Form filled successfully!`);
            
            // Show the form editor with the filled form
            setCurrentFormId(filledForm.id);
            setForms(prevForms => [...prevForms, filledForm]);
            setShowFormEditor(true);
          }, 1000);
        } catch (htmlError) {
          console.error("Error fetching HTML content:", htmlError);
          setUploadError(`Failed to load filled form: ${htmlError.message}`);
          setIsProcessingTemplate(false);
        }
        
        // Return here to prevent falling through to the file upload code
        return;
      } else {
        console.log("handleAssignPatient - No template to process, opening file picker");
        // If no template selected, just open the file picker for PDF upload
        fileInputRef.current.click();
      }
      
    } catch (error) {
      console.error('Error filling template:', error);
      setUploadError(`Failed to fill template: ${error.message}`);
      setTimeout(() => setUploadError(''), 5000);
      setIsProcessingTemplate(false);
    }
  };
  
  // Function to handle opening the Add New Patient modal from the Assign Patient modal
  const handleOpenAddPatientModal = () => {
    // Close the patient assignment popup
    setShowPatientAssignmentPopup(false);
    
    // Open the Add New Patient modal
    setShowAddPatientModal(true);
  };

  // Function to handle adding a new patient
  const handleAddPatient = async (e) => {
    e.preventDefault();
    
    try {
      // Validate required fields
      if (!newPatientName.trim()) {
        setUploadError('Patient name is required');
        setTimeout(() => setUploadError(''), 3000);
        return;
      }
      
      // Create the patient data object
      const patientData = {
        name: newPatientName,
        user_id: user.id,
        email: patientEmail || null,
        date_of_birth: patientDob || null,
        gender: patientGender || null,
        age: patientAge || null,
        conditions: patientConditions || null,
        medications: patientMedications || null
      };
      
      console.log('Sending patient data:', patientData);
      
      // Send the request to create a new patient
      const response = await fetch(`/api/user/${user.id}/patients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(patientData)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Server error response:', errorData);
        throw new Error(errorData.detail || 'Failed to add patient');
      }
      
      const data = await response.json();
      console.log('Server response:', data);
      
      // Add the new patient to the patients list
      setPatients([...patients, data.patient]);
      
      // Reset the form fields
      setNewPatientName('');
      setPatientEmail('');
      setPatientDob('');
      setPatientGender('');
      setPatientAge('');
      setPatientConditions('');
      setPatientMedications('');
      setSelectedFiles([]);
      
      // Close the Add Patient modal
      setShowAddPatientModal(false);
      
      // Reopen the Assign Patient modal with the newly created patient selected
      setSelectedPatient(data.patient.id);
      setShowPatientAssignmentPopup(true);
      
      // Show success message
      setUploadSuccess('Patient added successfully');
      setTimeout(() => setUploadSuccess(''), 3000);
      
      // Refresh the patients list
      fetchUserPatients();
      
    } catch (error) {
      console.error('Error adding patient:', error);
      setUploadError(`Failed to add patient: ${error.message}`);
      setTimeout(() => setUploadError(''), 3000);
    }
  };

  const handlePatientFileSelect = (e) => {
    const files = Array.from(e.target.files);
    
    // Validate files (ensure they're PDFs)
    const validFiles = files.filter(file => file.name.toLowerCase().endsWith('.pdf'));
    
    if (validFiles.length !== files.length) {
      setUploadError('Only PDF files are allowed');
      setTimeout(() => setUploadError(''), 3000);
    }
    
    setSelectedFiles(validFiles);
  };

  const handleAddNewPatientClick = () => {
    setShowAddPatientModal(true);
  };

  // Function to handle deleting a patient
  const handleDeletePatient = (patientId) => {
    setPatientToDelete(patientId);
    setShowDeletePatientConfirm(true);
  };
  
  // Function to cancel patient deletion
  const cancelDeletePatient = () => {
    setPatientToDelete(null);
    setShowDeletePatientConfirm(false);
  };
  
  // Function to confirm patient deletion
  const confirmDeletePatient = async () => {
    try {
      // Call the API to delete the patient
      const response = await fetch(`/api/patients/${patientToDelete}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete patient');
      }
      
      // Remove the patient from the state
      setPatients(patients.filter(patient => patient.id !== patientToDelete));
      
      // Close the confirmation modal
      setShowDeletePatientConfirm(false);
      
      // Close the patient info modal if it's open
      setExpandedPatient(null);
      
      // Show success message
      setUploadSuccess('Patient deleted successfully');
      setTimeout(() => setUploadSuccess(''), 3000);
      
      // Refresh the PDFs list to update UI
      fetchUserPdfs();
    } catch (error) {
      console.error('Error deleting patient:', error);
      setUploadError('Failed to delete patient');
      setTimeout(() => setUploadError(''), 3000);
    }
  };

  // Add this effect to fetch templates when the component mounts
  useEffect(() => {
    if (user) {
      fetchTemplates();
    }
  }, [user]);

  // Make sure fetchTemplates is defined correctly
  const fetchTemplates = async () => {
    try {
      if (!user || !user.id) return;
      
      console.log(`Fetching templates for user ${user.id}`);
      const response = await fetch(`/api/user/${user.id}/templates`);
      console.log('Templates response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Templates data:', data);
        
        // Filter templates to only include those with .pdf extension
        const filteredTemplates = data.templates ? data.templates.filter(template => {
          // Only keep templates where originalFilename ends with .pdf
          const hasPdfExtension = template.originalFilename.toLowerCase().endsWith('.pdf');
          
          if (!hasPdfExtension) {
            console.log(`Filtering out non-PDF template: ${template.originalFilename}`);
          }
          
          return hasPdfExtension;
        }) : [];
        
        // Remove duplicates by using a Map with the base filename (without extension) as key
        const uniqueTemplatesMap = new Map();
        
        filteredTemplates.forEach(template => {
          // Get the base name without extension
          const baseName = template.originalFilename.replace(/\.pdf$/i, '');
          
          // If this is a filled version (starts with filled_), skip it
          if (baseName.startsWith('filled_')) {
            console.log(`Filtering out filled template: ${template.originalFilename}`);
            return;
          }
          
          // If we haven't seen this base name before, or if this template is from the user's hospital system
          // (prioritize hospital system templates)
          if (!uniqueTemplatesMap.has(baseName) || template.hospitalSystem === user.hospitalSystem) {
            uniqueTemplatesMap.set(baseName, template);
          }
        });
        
        // Convert the Map values back to an array
        const uniqueTemplates = Array.from(uniqueTemplatesMap.values());
        
        // Log each template for debugging
        if (uniqueTemplates.length > 0) {
          console.log(`Displaying ${uniqueTemplates.length} unique templates:`);
          uniqueTemplates.forEach((template, index) => {
            console.log(`Template ${index + 1}:`, {
              originalFilename: template.originalFilename,
              htmlFilename: template.htmlFilename,
              hospitalSystem: template.hospitalSystem || 'None'
            });
          });
        } else {
          console.log('No templates to display after filtering');
        }
        
        setTemplates(uniqueTemplates);
      } else {
        console.error('Error fetching templates:', response.statusText);
        // Try the test endpoint to see if the API is working
        const testResponse = await fetch(`/api/user/${user.id}/templates-test`);
        console.log('Test endpoint response:', await testResponse.json());
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  // Update the handleUseTemplate function
  const handleUseTemplate = (template) => {
    console.log("handleUseTemplate - Template object:", JSON.stringify(template, null, 2));
    
    // Ensure the original filename has a .pdf extension
    let originalFilename = template.originalFilename;
    if (!originalFilename.toLowerCase().endsWith('.pdf')) {
      originalFilename = `${originalFilename}.pdf`;
    }
    
    // Create a form object from the template
    const formData = {
      title: originalFilename.replace(/\.pdf$/i, ''),
      originalFilename: originalFilename,
      filename: originalFilename,
      pdfFilename: originalFilename,
      htmlFilename: template.htmlFilename
    };
    
    console.log("handleUseTemplate - Created formData:", JSON.stringify(formData, null, 2));
    
    // Set the form to be edited
    setFormToEdit(formData);
    
    // Close the templates modal
    setShowTemplatesModal(false);
    
    // Open the patient assignment modal
    setShowPatientAssignmentPopup(true);
  };

  // Add this function to handle template deletion
  const handleDeleteTemplate = async (template, event) => {
    // Stop event propagation to prevent the modal from closing
    event.stopPropagation();
    
    // Ensure the original filename has a .pdf extension
    let originalFilename = template.originalFilename;
    if (!originalFilename.toLowerCase().endsWith('.pdf')) {
      originalFilename = `${originalFilename}.pdf`;
    }
    
    const templateName = originalFilename.replace(/\.pdf$/i, '');
    const hospitalInfo = template.hospitalSystem ? ` from ${template.hospitalSystem}` : '';
    
    console.log("Deleting template:", {
      originalFilename,
      templateName,
      hospitalSystem: template.hospitalSystem || 'None',
      id: template.id
    });
    
    if (window.confirm(`Are you sure you want to delete the template "${templateName}"${hospitalInfo}?`)) {
      try {
        const response = await fetch(`/api/templates/${encodeURIComponent(originalFilename)}?user_id=${user.id}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          // Remove the template from the templates list
          setTemplates(templates.filter(t => t.originalFilename !== template.originalFilename));
          setUploadSuccess(`Template "${templateName}" deleted successfully`);
          setTimeout(() => setUploadSuccess(''), 3000);
        } else {
          const errorData = await response.json();
          setUploadError(`Error deleting template: ${errorData.detail}`);
          setTimeout(() => setUploadError(''), 3000);
        }
      } catch (error) {
        console.error('Error deleting template:', error);
        setUploadError(`Error deleting template: ${error.message}`);
        setTimeout(() => setUploadError(''), 3000);
      }
    }
  };

  // Clear formToEdit when patient assignment popup is closed without submitting
  useEffect(() => {
    if (!showPatientAssignmentPopup) {
      console.log("useEffect - Patient assignment popup closed, formToEdit:", formToEdit);
      
      // Small delay to avoid clearing it during the actual submission process
      const timeoutId = setTimeout(() => {
        if (!isProcessingTemplate) {
          console.log("useEffect - Clearing formToEdit after delay");
          setFormToEdit(null);
        } else {
          console.log("useEffect - Not clearing formToEdit because isProcessingTemplate is true");
        }
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [showPatientAssignmentPopup, isProcessingTemplate]);

  if (showFormEditor) {
    // Find the form to edit
    const formToEdit = currentFormId ? forms.find(form => form.id === currentFormId) : null;
    
    return (
      <FormEditor 
        user={user}
        onLogout={onLogout}
        onToggleSidebar={onToggleSidebar}
        onSaveForm={handleSaveForm}
        onCancel={() => {
          setShowFormEditor(false);
          setCurrentFormId(null);
        }}
        form={formToEdit} // Pass the form to edit
      />
    );
  }

  return (
    <div className="app">
      {/* Show loading overlay when processing template */}
      {isProcessingTemplate && (
        <LoadingOverlay 
          message={processingMessage} 
          onDismiss={() => {
            setIsProcessingTemplate(false);
            setUploadSuccess(`Template processing started for "${lastUploadedPdf?.originalFilename}". It will be available soon.`);
          }}
        />
      )}
      
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
            <div className="user-menu">
              <span>Welcome, {user?.name}</span>
              <button onClick={onLogout} className="login-button">Logout</button>
            </div>
          </div>
        </div>
      </header>

      <main className="dashboard-content">
        <div className="dashboard-header">
          <h1>{user?.name.split(' ')[0]}'s Dashboard</h1>
          <p>Manage your patient's medical forms and submissions</p>
        </div>

        {/* Hidden file input for PDF upload */}
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept=".pdf" 
          onChange={handleFileChange}
        />
        
        {/* Upload error/success messages */}
        {uploadError && (
          <div className="upload-error-message">
            {uploadError}
          </div>
        )}
        
        {uploadSuccess && (
          <div className="upload-success">
            <p>{uploadSuccess}</p>
          </div>
        )}

        <div className="dashboard-section">
          <h2 style={{ color: 'white' }}>Create Form Template</h2>
          <div className="forms-grid">
            <div 
              className="create-form-card" 
              onClick={handleCreateForm}
              style={{
                background: "linear-gradient(135deg, rgba(79, 255, 176, 0.2) 0%, rgba(79, 255, 176, 0.1) 100%)",
                border: "2px dashed rgba(79, 255, 176, 0.5)",
                borderRadius: "2rem",
                padding: "1.5rem",
                textAlign: "center",
                cursor: "pointer",
                transition: "all 0.3s ease",
                marginBottom: "2rem",
                position: "relative",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100px"
              }}
            >
              <div className="upload-icon">+</div>
              <div className="upload-subtext">
                Upload a PDF Form
              </div>
            </div>
            
            {isUploading && (
              <div className="upload-status">
                <div className="upload-spinner"></div>
                <span>Creating template...</span>
              </div>
            )}
            
            {lastUploadedPdf && (
              <div className="last-upload-info">
                <div className="last-upload-title">Last Uploaded:</div>
                <div className="last-upload-name">{lastUploadedPdf.originalFilename}</div>
                {lastUploadedPdf.patientName && (
                  <div className="last-upload-patient">Patient: {lastUploadedPdf.patientName}</div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="dashboard-grid">
          <div className="dashboard-card">
            <h2>Recently Filled Forms</h2>
            {userPdfs.length > 0 ? (
              <div className="recent-forms-list">
                {userPdfs.slice(0, 3).map(pdf => (
                  <div className="recent-form-item" key={pdf.id}>
                    <div className="recent-form-info">
                      <span className="recent-form-name">{pdf.originalFilename}</span>
                      {pdf.patientName && (
                        <span className="recent-form-patient">Patient: {pdf.patientName}</span>
                      )}
                    </div>
                    <div className="recent-form-actions">
                      <span className="recent-form-date">
                        {new Date(pdf.uploadDate).toLocaleDateString()}
                      </span>
                      <button 
                        className="form-card-action delete"
                        onClick={() => handleDeletePdf(pdf.id)}
                      >
                        −
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="recent-forms-empty">No forms submitted yet</p>
            )}
            <button 
              className="dashboard-button view-all-button"
              onClick={handleViewAllForms}
            >
              View All Filled Forms
            </button>
          </div>

          <div className="dashboard-card">
            <h2>{user?.hospitalSystem || 'Your'} Templates</h2>
            {templates.length > 0 ? (
              <div className="recent-forms-list">
                {templates.slice(0, 3).map((template, index) => {
                  // Get clean template name without .pdf extension
                  const templateName = template.originalFilename.replace(/\.pdf$/i, '');
                  
                  return (
                    <div className="recent-form-item" key={index}>
                      <div className="recent-form-info">
                        <span className="recent-form-name">{templateName}</span>
                        <span className="recent-form-date">
                          {new Date(template.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="recent-form-actions">
                        <button 
                          className="form-card-action use-template"
                          onClick={() => handleUseTemplate(template)}
                        >
                          Use
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="recent-forms-empty">No templates available</p>
            )}
            <button 
              className="dashboard-button view-all-button"
              onClick={() => setShowTemplatesModal(true)}
            >
              View All Templates
            </button>
          </div>

          <div className="dashboard-card">
            <h2>Profile Information</h2>
            <div className="profile-info">
              <p><strong>Name:</strong> {user?.name}</p>
              <p><strong>Email:</strong> {user?.email}</p>
              <p><strong>Healthcare Title:</strong> {user?.healthcareTitle}</p>
              <p><strong>Hospital System:</strong> {user?.hospitalSystem}</p>
            </div>
            <button 
              className="dashboard-button edit-profile-button"
              onClick={() => setShowEditProfile(true)}
            >
              Edit Profile
            </button>
          </div>

          <div className="dashboard-card patient-manager-card">
            <h2>Patient Manager</h2>
            
            {patients.length > 0 ? (
              <div className="patient-list">
                {patients.map(patient => {
                  // Count forms for this patient
                  const patientForms = userPdfs.filter(pdf => 
                    pdf.patientId === patient.id || 
                    (pdf.patientName && pdf.patientName === patient.name)
                  );
                  
                  return (
                    <div className="patient-item" key={patient.id}>
                      <button 
                        className="patient-expand-button"
                        onClick={() => setExpandedPatient(patient)}
                      >
                        Expand
                      </button>
                      <div className="patient-name">{patient.name}</div>
                      <div className="patient-form-count">{patientForms.length} forms</div>
                      <div className="patient-forms-dropdown">
                        <button className="dropdown-toggle">
                          View Forms
                          <span className="dropdown-arrow">▼</span>
                        </button>
                        
                        <div className="dropdown-content">
                          {patientForms.length > 0 ? (
                            patientForms.map(form => (
                              <div className="dropdown-form-item" key={form.id}>
                                <span className="dropdown-form-name">{form.originalFilename}</span>
                                <span className="dropdown-form-date">
                                  {new Date(form.uploadDate).toLocaleDateString()}
                                </span>
                                <div className="dropdown-form-actions">
                                  <button 
                                    className="dropdown-form-action edit"
                                    onClick={(e) => {
                                      e.stopPropagation(); // Prevent dropdown from closing
                                      handleEditForm(form.id);
                                    }}
                                  >
                                    ✎
                                  </button>
                                  <button 
                                    className="dropdown-form-action delete"
                                    onClick={(e) => {
                                      e.stopPropagation(); // Prevent dropdown from closing
                                      handleDeletePdf(form.id);
                                    }}
                                  >
                                    −
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="dropdown-empty">No forms assigned</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">No patients added yet</div>
            )}
            
            <button 
              className="dashboard-button"
              onClick={handleAddNewPatientClick}
            >
              Add New Patient
            </button>
          </div>
        </div>
      </main>

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
              <li><span className="footer-text" style={{ fontWeight: 'bold', color: '#4FFFB0' }}>Dashboard</span></li>
              <li><span className="footer-text">Form Editor</span></li>
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

      {showEditProfile && (
        <EditProfile 
          user={user} 
          onClose={() => setShowEditProfile(false)} 
          onUpdateSuccess={handleUpdateSuccess}
        />
      )}

      {/* View All Forms Popup */}
      {showAllForms && (
        <div className="modal-overlay" onClick={handleCloseAllForms}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>All Uploaded Forms</h2>
              <button className="modal-close" onClick={handleCloseAllForms}>×</button>
            </div>
            <div className="modal-body">
              {isLoadingForms ? (
                <div className="loading-indicator">Loading forms...</div>
              ) : userPdfs.length > 0 ? (
                <div className="all-forms-list">
                  {userPdfs.map(pdf => {
                    // Debug log to check each PDF
                    console.log('Rendering PDF in View All Forms:', pdf);
                    
                    // Check for patient name in either property
                    const patientName = pdf.patientName || (pdf.patient_name);
                    
                    return (
                      <div className="all-forms-item" key={pdf.id}>
                        <div className="all-forms-item-left">
                          <div className="all-forms-name-container">
                            <span className="all-forms-name">{pdf.originalFilename}</span>
                            {patientName && (
                              <span className="all-forms-patient">Patient: {patientName}</span>
                            )}
                          </div>
                          <span className="all-forms-date">
                            {new Date(pdf.uploadDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="all-forms-actions">
                          <button 
                            className="form-card-action edit"
                            onClick={() => handleEditForm(pdf.id)}
                          >
                            ✎
                          </button>
                          <button 
                            className="form-card-action delete"
                            onClick={() => handleDeletePdf(pdf.id)}
                          >
                            −
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="all-forms-empty">No forms uploaded yet</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="modal-content delete-confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirm Delete</h2>
              <button className="modal-close" onClick={cancelDelete}>×</button>
            </div>
            <div className="modal-body">
              <p className="delete-confirm-message">
                Are you sure you want to delete this form? This action cannot be undone.
              </p>
              <div className="delete-confirm-actions">
                <button 
                  className="dashboard-button secondary"
                  onClick={cancelDelete}
                >
                  Cancel
                </button>
                <button 
                  className="dashboard-button delete-button"
                  onClick={confirmDelete}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Patient Assignment Popup */}
      {showPatientAssignmentPopup && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-content">
              <h2>Assign Form to Patient</h2>
              <p>Select an existing patient or add a new one:</p>
              
              <form onSubmit={handleAssignPatient}>
                <div className="form-group">
                  <label htmlFor="existingPatient">Existing Patient</label>
                  <select
                    id="existingPatient"
                    value={selectedPatient}
                    onChange={(e) => setSelectedPatient(e.target.value)}
                    className="patient-select"
                  >
                    <option value="">Select a patient</option>
                    {patients.map(patient => (
                      <option key={patient.id} value={patient.id}>
                        {patient.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group add-new-patient-button-container">
                  <button
                    type="button"
                    className="add-new-patient-button"
                    onClick={handleOpenAddPatientModal}
                  >
                    + Add New Patient
                  </button>
                </div>
                
                <div className="assign-patient-actions">
                  <button
                    type="button"
                    className="action-button cancel-button"
                    onClick={() => {
                      console.log("Cancel button clicked - Current formToEdit:", formToEdit);
                      setShowPatientAssignmentPopup(false);
                      setFormToEdit(null);
                      console.log("Cancel button clicked - formToEdit set to null");
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="action-button submit-button"
                    disabled={!selectedPatient}
                  >
                    Fill
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Patient Information Popup */}
      {expandedPatient && (
        <div className="modal-overlay" onClick={() => setExpandedPatient(null)}>
          <div className="modal-content patient-info-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{expandedPatient.name}</h2>
              <button className="modal-close" onClick={() => setExpandedPatient(null)}>×</button>
            </div>
            
            <div className="modal-body">
              {/* Patient Details Section */}
              <div className="patient-info-section">
                <h4>Patient Details</h4>
                <div className="patient-details-grid">
                  <div className="patient-info-item">
                    <div className="patient-info-label">Email</div>
                    <div className={`patient-info-value ${!expandedPatient.email ? 'empty' : ''}`}>
                      {expandedPatient.email || 'Not provided'}
                    </div>
                  </div>
                  
                  <div className="patient-info-item">
                    <div className="patient-info-label">Date of Birth</div>
                    <div className={`patient-info-value ${!expandedPatient.dateOfBirth ? 'empty' : ''}`}>
                      {expandedPatient.dateOfBirth || 'Not provided'}
                    </div>
                  </div>
                  
                  <div className="patient-info-item">
                    <div className="patient-info-label">Gender</div>
                    <div className={`patient-info-value ${!expandedPatient.gender ? 'empty' : ''}`}>
                      {expandedPatient.gender || 'Not provided'}
                    </div>
                  </div>
                  
                  <div className="patient-info-item">
                    <div className="patient-info-label">Age</div>
                    <div className={`patient-info-value ${!expandedPatient.age ? 'empty' : ''}`}>
                      {expandedPatient.age || 'Not provided'}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Medical Information Section */}
              <div className="patient-info-section">
                <h4>Medical Information</h4>
                <div className="patient-medical-info">
                  <div className="patient-info-item full-width">
                    <div className="patient-info-label">Current Medical Conditions</div>
                    <div className={`patient-info-value ${!expandedPatient.conditions ? 'empty' : ''}`}>
                      {expandedPatient.conditions || 'No conditions listed'}
                    </div>
                  </div>
                  
                  <div className="patient-info-item full-width">
                    <div className="patient-info-label">Current Medications</div>
                    <div className={`patient-info-value ${!expandedPatient.medications ? 'empty' : ''}`}>
                      {expandedPatient.medications || 'No medications listed'}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Patient Forms Section */}
              <div className="patient-info-section">
                <h4>Patient Forms</h4>
                
                {/* Get forms for this patient */}
                {(() => {
                  const patientForms = userPdfs.filter(pdf => 
                    pdf.patientId === expandedPatient.id || 
                    (pdf.patientName && pdf.patientName === expandedPatient.name)
                  );
                  
                  return patientForms.length > 0 ? (
                    <div className="all-forms-list">
                      {patientForms.map(form => (
                        <div className="all-forms-item" key={form.id}>
                          <div className="all-forms-item-left">
                            <div className="all-forms-name-container">
                              <span className="all-forms-name">{form.originalFilename}</span>
                            </div>
                            <span className="all-forms-date">
                              {new Date(form.uploadDate).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="all-forms-actions">
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="all-forms-empty">No forms assigned to this patient</div>
                  );
                })()}
              </div>
            </div>
            
            <div className="patient-info-actions">
              <button 
                className="dashboard-button secondary"
                onClick={() => setExpandedPatient(null)}
              >
                Close
              </button>
              <button 
                className="dashboard-button delete-button"
                onClick={() => handleDeletePatient(expandedPatient.id)}
              >
                Delete Patient
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Patient Confirmation Modal */}
      {showDeletePatientConfirm && (
        <div className="modal-overlay" onClick={cancelDeletePatient}>
          <div className="modal-content delete-confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirm Delete Patient</h2>
              <button className="modal-close" onClick={cancelDeletePatient}>×</button>
            </div>
            <div className="modal-body">
              <p className="delete-confirm-message">
                Are you sure you want to delete this patient? This will remove the patient from all forms.
                This action cannot be undone.
              </p>
              <div className="delete-confirm-actions">
                <button 
                  className="dashboard-button secondary"
                  onClick={cancelDeletePatient}
                >
                  Cancel
                </button>
                <button 
                  className="dashboard-button delete-button"
                  onClick={confirmDeletePatient}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add New Patient Modal */}
      {showAddPatientModal && (
        <div className="modal-overlay" onClick={() => setShowAddPatientModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Patient</h2>
              <button className="modal-close" onClick={() => setShowAddPatientModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleAddPatient}>
                <div className="form-group">
                  <label htmlFor="patientName">Patient Name</label>
                  <input
                    type="text"
                    id="patientName"
                    value={newPatientName}
                    onChange={(e) => setNewPatientName(e.target.value)}
                    className="patient-input"
                    placeholder="Enter patient name"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="patientEmail">Email Address</label>
                  <input
                    type="email"
                    id="patientEmail"
                    value={patientEmail || ''}
                    onChange={(e) => setPatientEmail(e.target.value)}
                    className="patient-input"
                    placeholder="Enter patient's email (optional)"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="patientDob">Date of Birth</label>
                  <input
                    type="date"
                    id="patientDob"
                    value={patientDob || ''}
                    onChange={(e) => setPatientDob(e.target.value)}
                    className="patient-input"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="patientGender">Gender</label>
                  <select
                    id="patientGender"
                    value={patientGender || ''}
                    onChange={(e) => setPatientGender(e.target.value)}
                    className="patient-select"
                  >
                    <option value="">Select gender (optional)</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="patientAge">Age</label>
                  <input
                    type="number"
                    id="patientAge"
                    value={patientAge || ''}
                    onChange={(e) => setPatientAge(e.target.value)}
                    className="patient-input"
                    placeholder="Enter patient's age (optional)"
                    min="0"
                    max="120"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="patientConditions">Current Medical Conditions</label>
                  <textarea
                    id="patientConditions"
                    value={patientConditions || ''}
                    onChange={(e) => setPatientConditions(e.target.value)}
                    className="patient-input"
                    placeholder="List any current medical conditions (optional)"
                    rows="3"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="patientMedications">Current Medications</label>
                  <textarea
                    id="patientMedications"
                    value={patientMedications || ''}
                    onChange={(e) => setPatientMedications(e.target.value)}
                    className="patient-input"
                    placeholder="List any current medications (optional)"
                    rows="3"
                  />
                </div>
                
                <div className="form-group">
                  <label>Upload Patient Forms (Optional)</label>
                  <div className="file-upload-container">
                    <button
                      type="button"
                      className="file-select-button"
                      onClick={() => patientFileInputRef.current.click()}
                    >
                      Select PDF Files
                    </button>
                    <input
                      type="file"
                      ref={patientFileInputRef}
                      onChange={handlePatientFileSelect}
                      multiple
                      accept=".pdf"
                      style={{ display: 'none' }}
                    />
                    {selectedFiles.length > 0 && (
                      <div className="selected-files">
                        <p>{selectedFiles.length} file(s) selected</p>
                        <ul className="file-list">
                          {selectedFiles.map((file, index) => (
                            <li key={index} className="file-item">
                              {file.name}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="form-actions centered">
                  <button
                    type="button"
                    className="action-button cancel-button"
                    onClick={() => setShowAddPatientModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="action-button submit-button"
                  >
                    Add Patient
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Templates Modal */}
      {showTemplatesModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{user?.hospitalSystem || 'Your'} Templates</h2>
              <button 
                className="close-button"
                onClick={() => setShowTemplatesModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              {templates.length === 0 ? (
                <div className="empty-state">
                  No templates found for your healthcare system.
                </div>
              ) : (
                <div className="templates-grid">
                  {templates.map((template, index) => {
                    // Get clean template name without .pdf extension
                    const templateName = template.originalFilename.replace(/\.pdf$/i, '');
                    
                    return (
                      <div key={index} className="template-item">
                        <div className="template-item-header">
                          <div className="template-item-name">
                            {templateName}
                          </div>
                          <div className="template-item-date">
                            Updated: {new Date(template.updatedAt).toLocaleDateString()}
                          </div>
                          {template.hospitalSystem && (
                            <div className="template-item-hospital">
                              Hospital: {template.hospitalSystem}
                            </div>
                          )}
                        </div>
                        <div className="template-item-actions">
                          <button 
                            className="action-button submit-button"
                            onClick={() => handleUseTemplate(template)}
                          >
                            Use Template
                          </button>
                          <button 
                            className="action-button delete-button"
                            onClick={(e) => handleDeleteTemplate(template, e)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard; 