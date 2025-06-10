import React, { useState } from 'react';
import { Container, Nav, Navbar } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './App.css';
import BotList from './components/BotList';
import SystemConfig from './components/SystemConfig';

function App() {
  const [activeTab, setActiveTab] = useState('bots');

  return (
    <div className="App">
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
          </Navbar.Collapse>
          <Navbar.Brand>Crypto Rebalancing Bot</Navbar.Brand>
        </Container>
      </Navbar>

      <Container className="py-4">
        {activeTab === 'bots' ? (
          <BotList />
        ) : (
          <SystemConfig />
        )}
      </Container>
    </div>
  );
}

export default App;
