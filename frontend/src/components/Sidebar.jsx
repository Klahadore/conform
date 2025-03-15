import React from 'react';
import './Sidebar.css';
import conformLogo from '../assets/conform_logo.png';
import { scrollToTop } from '../utils/scrollUtils';

const Sidebar = ({ isOpen, onClose, user, onNavigate, handleDashboardClick }) => {
  // Determine the current page based on URL
  const currentPath = window.location.pathname;
  
  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'active' : ''}`} onClick={onClose}></div>
      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <img src={conformLogo} alt="Conform.ai logo" className="sidebar-logo-image" />
            <span className="sidebar-logo-text">Conform</span>
          </div>
          <button className="sidebar-close" onClick={onClose}>×</button>
        </div>
        
        <div className="sidebar-content">
          <h3 className="sidebar-title">Navigation</h3>
          <ul className="sidebar-menu">
            <li className="sidebar-menu-item">
              <a 
                href="/" 
                className={currentPath === '/' ? 'active' : ''}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate('/');
                  onClose();
                }}
              >
                Home
              </a>
            </li>
            <li className="sidebar-menu-item">
              <a 
                href="/dashboard" 
                className={currentPath === '/dashboard' ? 'active' : ''}
                onClick={(e) => {
                  e.preventDefault();
                  if (user) {
                    onNavigate('/dashboard');
                  } else {
                    handleDashboardClick(e, 'dashboard');
                  }
                  onClose();
                }}
              >
                Dashboard
              </a>
            </li>
            <li className="sidebar-menu-item">
              <a 
                href="/form-editor" 
                className={currentPath === '/form-editor' ? 'active' : ''}
                onClick={(e) => {
                  e.preventDefault();
                  if (user) {
                    onNavigate('/form-editor');
                  } else {
                    handleDashboardClick(e, 'form editor');
                  }
                  onClose();
                }}
              >
                Form Editor
              </a>
            </li>
          </ul>
          
          <h3 className="sidebar-title" style={{ marginTop: '2rem' }}>More Information</h3>
          <ul className="sidebar-menu">
            <li className="sidebar-menu-item">
              <a href="#">Features</a>
            </li>
            <li className="sidebar-menu-item">
              <a href="#">Use Cases</a>
            </li>
            <li className="sidebar-menu-item">
              <a href="#">Documentation</a>
            </li>
            <li className="sidebar-menu-item">
              <a href="#">About Us</a>
            </li>
            <li className="sidebar-menu-item">
              <a href="#">Contact</a>
            </li>
          </ul>
        </div>
        
        {user && (
          <div className="sidebar-footer">
            <p>Logged in as: <strong>{user.name}</strong></p>
          </div>
        )}
      </div>
    </>
  );
};

export default Sidebar; 