import React, { useState, useEffect } from 'react';
import { Container, Nav, Navbar, Button, Image, Dropdown } from 'react-bootstrap';
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
  const [username, setUsername] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUsername = localStorage.getItem('username');
    console.log({storedUsername})
    setIsAuthenticated(!!token);
    if (storedUsername) {
      setUsername(storedUsername);
    }
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
                      <Dropdown.Item 
                        onClick={() => {
                          logout();
                          setIsAuthenticated(false);
                          setUsername('');
                        }}
                      >
                        <i className="bi bi-box-arrow-right me-2"></i>
                        Logout
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
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
