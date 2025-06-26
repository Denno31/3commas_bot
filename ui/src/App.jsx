import React, { useState, useEffect } from 'react';
import { Container, Nav, Navbar, Button } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './App.css';
import BotList from './components/BotList';
import SystemConfig from './components/SystemConfig';
import Login from './components/Login';
import { logout } from './api';

function App() {
  const [activeTab, setActiveTab] = useState('bots');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
  }, []);

  return (
    <div className="App">
      {isAuthenticated ? (
        <>
          <Navbar bg="dark" variant="dark" expand="lg" className="mb-4">
            <Container>
              <Navbar.Brand>
                <i className="bi bi-currency-bitcoin me-2"></i>
                Crypto Rebalancer
              </Navbar.Brand>
              <Navbar.Toggle aria-controls="basic-navbar-nav" />
              <Navbar.Collapse id="basic-navbar-nav">
                <Nav className="me-auto">
                  <Nav.Link 
                    href="#"
                    active={activeTab === 'bots'}
                    onClick={() => setActiveTab('bots')}
                  >
                    <i className="bi bi-robot me-2"></i>
                    Bots
                  </Nav.Link>
                  <Nav.Link 
                    href="#"
                    active={activeTab === 'config'}
                    onClick={() => setActiveTab('config')}
                  >
                    <i className="bi bi-gear me-2"></i>
                    System Config
                  </Nav.Link>
                </Nav>
                <Nav>
                  <Button 
                    variant="outline-light" 
                    size="sm"
                    onClick={() => {
                      logout();
                      setIsAuthenticated(false);
                    }}
                  >
                    <i className="bi bi-box-arrow-right me-2"></i>
                    Logout
                  </Button>
                </Nav>
              </Navbar.Collapse>
            </Container>
          </Navbar>

          <Container className="py-4">
            {activeTab === 'bots' ? (
              <BotList />
            ) : (
              <SystemConfig />
            )}
          </Container>
        </>
      ) : (
        <Login onLogin={() => setIsAuthenticated(true)} />
      )}
    </div>
  );
}

export default App;
