import './App.css'
import conformLogo from './assets/conform_logo.png'
import h2aiLogo from './assets/h2ai_logo.png'
import medicalFormPreview from './assets/medical_form.png'
import popup1 from './assets/popup1.png'
import popup2 from './assets/popup2.png'
import xIcon from './assets/x.png'
import clockIcon from './assets/clock.png'
import carousel1 from './assets/carousel1.png'
import carousel2 from './assets/carousel2.png'
import carousel3 from './assets/carousel3.png'
import carousel4 from './assets/carousel4.png'
import carousel5 from './assets/carousel5.png'
import carousel6 from './assets/carousel6.png'
import carousel7 from './assets/carousel7.png'
import carousel8 from './assets/carousel8.png'
import carousel9 from './assets/carousel9.png'
import carousel10 from './assets/carousel10.png'
import carousel11 from './assets/carousel11.png'
import carousel12 from './assets/carousel12.png'
import carousel13 from './assets/carousel13.png'
import carousel14 from './assets/carousel14.png'
import Carousel from './components/Carousel'
import SignUp from './components/SignUp'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import FormEditor from './components/FormEditor'
import Sidebar from './components/Sidebar'
import { useEffect, useState } from 'react'
import { scrollToTop } from './utils/scrollUtils'

function App() {
  const [showPopups, setShowPopups] = useState(true);
  const [showSignUp, setShowSignUp] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [user, setUser] = useState(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [loginPromptMessage, setLoginPromptMessage] = useState('');
  const [showFormEditor, setShowFormEditor] = useState(false);
  const [forms, setForms] = useState([]);
  
  const carouselImages = [
    carousel1, carousel2, carousel3, carousel4,
    carousel5, carousel6, carousel7, carousel8, 
    carousel9, carousel10, carousel11, carousel12,
    carousel13, carousel14
  ];

  useEffect(() => {
    let isMounted = true;
    const showDuration = 3000;
    const hideDuration = 1000;
    let timeoutId;

    const togglePopups = () => {
      if (isMounted) {
        setShowPopups(true);
        timeoutId = setTimeout(() => {
          if (isMounted) {
            setShowPopups(false);
          }
        }, showDuration);
      }
    };

    togglePopups();
    const intervalId = setInterval(togglePopups, showDuration + hideDuration);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const handleRouteChange = () => {
      const path = window.location.pathname;
      
      if (user) {
        if (path === '/') {
          setShowDashboard(false);
          setShowFormEditor(false);
        } else if (path === '/dashboard') {
          setShowDashboard(true);
          setShowFormEditor(false);
        } else if (path === '/form-editor') {
          setShowFormEditor(true);
          setShowDashboard(false);
        }
      } else {
        if (path === '/dashboard' || path === '/form-editor') {
          window.history.pushState({}, '', '/');
          setShowLoginPrompt(true);
          setLoginPromptMessage(`Please log in to access this page`);
          setTimeout(() => setShowLoginPrompt(false), 3000);
        }
      }
      
      scrollToTop();
    };
    
    handleRouteChange();
    
    window.addEventListener('popstate', handleRouteChange);
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, [user]);

  useEffect(() => {
    // Listen for page load events
    const handleLoad = () => {
      const path = window.location.pathname;
      
      // Check if user is logged in from localStorage
      const savedUser = localStorage.getItem('user');
      
      if (savedUser) {
        try {
          const userData = JSON.parse(savedUser);
          setUser(userData);
          
          // Set the appropriate view based on the path
          if (path === '/dashboard') {
            setShowDashboard(true);
            setShowFormEditor(false);
          } else if (path === '/form-editor') {
            setShowFormEditor(true);
            setShowDashboard(false);
          }
        } catch (error) {
          console.error('Error parsing saved user:', error);
        }
      }
      
      // Force scroll to top
      window.scrollTo(0, 0);
    };
    
    // Call once on mount
    handleLoad();
    
    // Add event listener for page loads
    window.addEventListener('load', handleLoad);
    
    return () => {
      window.removeEventListener('load', handleLoad);
    };
  }, []);

  useEffect(() => {
    const redirectTo = sessionStorage.getItem('redirectTo');
    if (redirectTo) {
      sessionStorage.removeItem('redirectTo');
      
      // Check if user is logged in
      const savedUser = localStorage.getItem('user');
      if (savedUser && redirectTo === '/dashboard') {
        setUser(JSON.parse(savedUser));
        setShowDashboard(true);
        setShowFormEditor(false);
        window.history.pushState({}, '', '/dashboard');
        // Force scroll to top immediately
        window.scrollTo(0, 0);
      } else if (savedUser && redirectTo === '/form-editor') {
        setUser(JSON.parse(savedUser));
        setShowFormEditor(true);
        setShowDashboard(false);
        window.history.pushState({}, '', '/form-editor');
        // Force scroll to top immediately
        window.scrollTo(0, 0);
      }
    }
  }, []);

  const handleSignUpClick = () => {
    setShowSignUp(true);
  };

  const handleCloseSignUp = () => {
    setShowSignUp(false);
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    // Save user to localStorage
    localStorage.setItem('user', JSON.stringify(userData));
    setShowLogin(false);
    setShowDashboard(true);
    setShowFormEditor(false);
    window.history.pushState({}, '', '/dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    // Clear user from localStorage
    localStorage.removeItem('user');
    setShowDashboard(false);
    setShowFormEditor(false);
    window.history.pushState({}, '', '/');
  };

  const handleNavigate = (path) => {
    if (!user && (path === '/dashboard' || path === '/form-editor')) {
      setLoginPromptMessage(`Please log in to access this page`);
      setShowLoginPrompt(true);
      setTimeout(() => setShowLoginPrompt(false), 3000);
      return;
    }
    
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleDashboardClick = (e, page = 'dashboard') => {
    if (!user) {
      e.preventDefault();
      setLoginPromptMessage(`Please log in to access the ${page}`);
      setShowLoginPrompt(true);
      setTimeout(() => setShowLoginPrompt(false), 3000);
    } else {
      window.history.pushState({}, '', '/dashboard');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const handleUpdateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  const handleSaveForm = (newForm) => {
    setForms([...forms, newForm]);
    setShowFormEditor(false);
    setShowDashboard(true);
    window.history.pushState({}, '', '/dashboard');
  };

  const handleCreateForm = () => {
    if (user) {
      setShowFormEditor(true);
      setShowDashboard(false);
      window.history.pushState({}, '', '/form-editor');
      // Force scroll to top immediately
      window.scrollTo(0, 0);
    } else {
      setLoginPromptMessage('Please log in to create a form');
      setShowLoginPrompt(true);
      setTimeout(() => setShowLoginPrompt(false), 3000);
    }
  };

  const handleFormEditorToDashboard = () => {
    setShowFormEditor(false);
    setShowDashboard(true);
    window.history.pushState({}, '', '/dashboard');
    // Force scroll to top immediately
    window.scrollTo(0, 0);
  };

  if (user && showFormEditor) {
    return (
      <>
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
          user={user}
          onNavigate={handleNavigate}
          handleDashboardClick={handleDashboardClick}
        />
        <FormEditor 
          user={user}
          onLogout={handleLogout}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onSaveForm={handleSaveForm}
          onCancel={handleFormEditorToDashboard}
          form={null}
          navigateToDashboard={handleFormEditorToDashboard}
        />
      </>
    );
  }

  if (user && showDashboard) {
    return (
      <>
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
          user={user}
          onNavigate={handleNavigate}
          handleDashboardClick={handleDashboardClick}
        />
        <Dashboard 
          user={user} 
          onLogout={handleLogout}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onUpdateUser={handleUpdateUser}
          forms={forms}
          setForms={setForms}
          onCreateForm={handleCreateForm}
        />
      </>
    );
  }

  return (
    <div className="app">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        user={user}
        onNavigate={handleNavigate}
        handleDashboardClick={handleDashboardClick}
      />
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
            <div className="hamburger-menu" onClick={() => setSidebarOpen(true)}>
              <div className="hamburger-line"></div>
              <div className="hamburger-line"></div>
              <div className="hamburger-line"></div>
            </div>
            <div 
              className="logo-container" 
              onClick={() => setShowDashboard(false)}
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
            {user ? (
              <div className="user-menu">
                <span>Welcome, {user.name}</span>
                <button onClick={handleLogout} className="login-button">Logout</button>
              </div>
            ) : (
              <>
                <button onClick={() => setShowLogin(true)} className="login-button">Log In</button>
                <button onClick={() => setShowSignUp(true)} className="sign-up-button">Sign Up</button>
              </>
            )}
          </div>
        </div>
      </header>
      
      <main className="main-content">
        <div className="hero-section">
          <div className="hero-content">
            <div className="hero-text">
              <h1>
                Fill and send medical forms <span className="highlight">accurately</span> and <span className="highlight">quickly</span> with Conform
              </h1>
              <button className="get-started-button" onClick={handleSignUpClick}>Get Started</button>
            </div>
            <div className="carousel-section">
              <h2 className="carousel-title">Fill and send <span className="highlight">any</span> medical form</h2>
              <Carousel images={carouselImages} />
            </div>
          </div>
          <div className="hero-image">
            <div className="form-container">
              <img src={medicalFormPreview} alt="Medical form preview" className="form-preview" />
              <img 
                src={popup1} 
                alt="Vermont popup" 
                className={`popup popup-vermont ${showPopups ? 'show' : ''}`}
              />
              <img 
                src={popup2} 
                alt="Diabetes popup" 
                className={`popup popup-diabetes ${showPopups ? 'show' : ''}`}
              />
            </div>
          </div>
        </div>

        <div className="features-section">
          <h2>Why Choose Conform?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-title">
                <img src={conformLogo} alt="Conform logo" className="feature-icon" />
                <h3>Smart Form Filling</h3>
              </div>
              <p>Conform automatically fills form fields that have been previously saved.</p>
            </div>
            <div className="feature-card">
              <div className="feature-title">
                <img src={xIcon} alt="Error prevention icon" className="feature-icon" />
                <h3>Error Prevention</h3>
              </div>
              <p>Real-time AI validation ensures that entries are consistent and accurate.</p>
            </div>
            <div className="feature-card">
              <div className="feature-title">
                <img src={clockIcon} alt="Clock icon" className="feature-icon" />
                <h3>Time Saving</h3>
              </div>
              <p>Reduce form filling time by having a dashboard of all patient forms.</p>
            </div>
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
              <li><span className="footer-text" style={{ fontWeight: 'bold', color: '#4FFFB0' }}>Home</span></li>
              <li><span className="footer-text">Dashboard</span></li>
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
      
      {showSignUp && <SignUp onClose={handleCloseSignUp} />}

      {showLogin && (
        <Login 
          onClose={() => setShowLogin(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {showLoginPrompt && (
        <div className="login-prompt">
          <p>{loginPromptMessage}</p>
        </div>
      )}
    </div>
  )
}

export default App
