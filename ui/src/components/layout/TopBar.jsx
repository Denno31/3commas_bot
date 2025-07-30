import React, { useState } from 'react';
import { Navbar, Nav, NavDropdown, Form, Button, Badge } from 'react-bootstrap';
import './TopBar.css';

const TopBar = ({ username, onLogout, pageTitle }) => {
  const [notifications, setNotifications] = useState(3); // Mock notifications count
  return (
    <Navbar className="topbar" expand="lg">
      <div className="d-flex justify-content-between align-items-center w-100">
        <div className="d-flex align-items-center">
          <div className="page-title">{pageTitle}</div>
        </div>
        
        <div className="d-flex align-items-center">
          <div className="topbar-actions me-3">
            <Button variant="outline-secondary" size="sm" className="me-2">
              <Form className="d-flex mx-auto search-form">
                <div className="search-wrapper">
                  <i className="bi bi-search search-icon"></i>
                  <Form.Control
                    type="search"
                    placeholder="Search bots, coins, exchanges..."
                    className="search-input"
                    aria-label="Search"
                  />
                </div>
              </Form>
            </Button>
            
            <Button variant="outline-secondary" size="sm">
              <i className="bi bi-question-circle"></i>
            </Button>
          </div>
          
          <Nav className="topbar-nav">
            <Nav.Link href="#" className="notification-link">
              <i className="bi bi-bell"></i>
              {notifications > 0 && (
                <Badge pill bg="danger" className="notification-badge">
                  {notifications}
                </Badge>
              )}
            </Nav.Link>
            
            <Nav.Link href="#" className="settings-link">
              <i className="bi bi-gear"></i>
            </Nav.Link>
            
            <NavDropdown 
              title={
                <div className="user-avatar-wrapper">
                  <div className="user-avatar">
                    {username ? username.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="username">{username || 'User'}</span>
                </div>
              } 
              id="user-dropdown"
              align="end"
            >
              <NavDropdown.Item href="#">
                <i className="bi bi-person me-2"></i>
                Profile
              </NavDropdown.Item>
              <NavDropdown.Item href="#">
                <i className="bi bi-sliders me-2"></i>
                Preferences
              </NavDropdown.Item>
              <NavDropdown.Divider />
              <NavDropdown.Item onClick={onLogout}>
                <i className="bi bi-box-arrow-right me-2"></i>
                Logout
              </NavDropdown.Item>
            </NavDropdown>
          </Nav>
        </div>
      </div>
    </Navbar>
  );
};

export default TopBar;
