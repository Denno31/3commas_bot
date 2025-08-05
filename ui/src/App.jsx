import React, { useState, useEffect } from 'react';
import { Container, Nav, Navbar, Dropdown } from 'react-bootstrap';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './App.css';
import BotList from './components/BotList';
import SystemConfig from './components/SystemConfig';
import Login from './components/Login';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import { logout } from './api';

// Authentication check wrapper component
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('token') !== null;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Main dashboard component with navigation
const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('bots');
  const [username, setUsername] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  
  // Set active tab based on current path
  useEffect(() => {
    if (location.pathname === '/bots' || location.pathname === '/') {
      setActiveTab('bots');
    } else if (location.pathname === '/config') {
      setActiveTab('config');
    }
  }, [location.pathname]);
  
  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  return (
    <>
      <Navbar bg="dark" variant="dark" expand="lg" className="mb-4">
        <Container fluid className="px-4">
          <Navbar.Brand>
            <i className="bi bi-currency-bitcoin me-2"></i>
            Crypto Rebalancer
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <Nav.Link 
                active={activeTab === 'bots'}
                onClick={() => {
                  navigate('/bots');
                  setActiveTab('bots');
                }}
              >
                <i className="bi bi-robot me-2"></i>
                Bots
              </Nav.Link>
              <Nav.Link 
                active={activeTab === 'config'}
                onClick={() => {
                  navigate('/config');
                  setActiveTab('config');
                }}
              >
                <i className="bi bi-gear me-2"></i>
                System Config
              </Nav.Link>
            </Nav>
            <Nav className="align-items-center">
              <Dropdown align="end">
                <Dropdown.Toggle 
                  as="div" 
                  className="d-flex align-items-center text-light" 
                  style={{ cursor: 'pointer' }}
                >
                  <div className="me-2 d-flex align-items-center">
                    <div 
                      className="rounded-circle bg-primary d-flex align-items-center justify-content-center me-2" 
                      style={{ width: '32px', height: '32px', overflow: 'hidden' }}
                    >
                      <i className="bi bi-person-fill text-white fs-5"></i>
                    </div>
                    <span className="d-none d-md-inline">{username || 'User'}</span>
                  </div>
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item disabled>
                    <small className="text-muted">Signed in as</small><br />
                    <strong>{username || 'User'}</strong>
                  </Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item onClick={handleLogout}>
                    <i className="bi bi-box-arrow-right me-2"></i>
                    Logout
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      
      <Container fluid className="py-4 px-4">
        <Routes>
          <Route path="/" element={<BotList />} />
          <Route path="/bots" element={<BotList />} />
          <Route path="/config" element={<SystemConfig />} />
        </Routes>
      </Container>
    </>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          
          {/* Protected routes */}
          <Route path="/*" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
