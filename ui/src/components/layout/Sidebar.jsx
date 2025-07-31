import React, { useState } from 'react';
import { Nav, Button } from 'react-bootstrap';
import './Sidebar.css';

const Sidebar = ({ activeItem, onNavigate, collapsed, onToggle, botList = [] }) => {
  const [botsExpanded, setBotsExpanded] = useState(false);

  const toggleSidebar = () => {
    if (onToggle) {
      onToggle();
    }
    if (botsExpanded && collapsed) {
      setBotsExpanded(false);
    }
  };

  const toggleBots = () => {
    setBotsExpanded(!botsExpanded);
  };

  const handleNavigation = (page, botId = null) => {
    if (onNavigate) {
      onNavigate(page, botId);
    }
  };

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : 'expanded'}`}>
      <div className="sidebar-header">
        <div className="logo">
          <i className="bi bi-currency-bitcoin"></i>
          {!collapsed && <span>Crypto Rebalancer</span>}
        </div>
        <Button 
          variant="link" 
          className="toggle-btn"
          onClick={toggleSidebar}
        >
          <i className={`bi bi-chevron-${collapsed ? 'right' : 'left'}`}></i>
        </Button>
      </div>
      
      <Nav className="flex-column sidebar-nav">
        <Nav.Link 
          className={activeItem === 'dashboard' ? 'active' : ''} 
          onClick={() => handleNavigation('dashboard')}
        >
          <i className="bi bi-speedometer2"></i>
          {!collapsed && <span>Dashboard</span>}
        </Nav.Link>
        
        <div className={`nav-item-with-children ${botsExpanded ? 'expanded' : ''}`}>
          <Nav.Link 
            className={activeItem.startsWith('bot') ? 'active' : ''} 
            onClick={toggleBots}
          >
            <i className="bi bi-robot"></i>
            {!collapsed && (
              <>
                <span>Bots</span>
                <i className={`bi bi-chevron-${botsExpanded ? 'down' : 'right'} ms-auto`}></i>
              </>
            )}
          </Nav.Link>
          
          {botsExpanded && !collapsed && (
            <div className="child-items">
              <Nav.Link 
                className={activeItem === 'bots-list' ? 'active' : ''} 
                onClick={() => handleNavigation('bots-list')}
              >
                <i className="bi bi-list-ul"></i>
                <span>All Bots</span>
              </Nav.Link>
              
              {botList.map(bot => (
                <Nav.Link 
                  key={bot.id}
                  className={activeItem === `bot-${bot.id}` ? 'active' : ''} 
                  onClick={() => handleNavigation('bot-details', bot.id)}
                >
                  <i className={`bi ${bot.enabled ? 'bi-circle-fill text-success' : 'bi-circle'}`}></i>
                  <span>{bot.name}</span>
                  {activeItem === `bot-${bot.id}` && (
                    <i className="bi bi-chevron-right ms-auto selected-indicator"></i>
                  )}
                </Nav.Link>
              ))}
              
              <Nav.Link 
                className={activeItem === 'new-bot' ? 'active' : ''} 
                onClick={() => handleNavigation('new-bot')}
              >
                <i className="bi bi-plus-circle"></i>
                <span>New Bot</span>
              </Nav.Link>
            </div>
          )}
        </div>
        
        <Nav.Link 
          className={activeItem === 'analytics' ? 'active' : ''} 
          onClick={() => handleNavigation('analytics')}
        >
          <i className="bi bi-graph-up"></i>
          {!collapsed && <span>Analytics</span>}
        </Nav.Link>
        
        <Nav.Link 
          className={activeItem === 'config' ? 'active' : ''} 
          onClick={() => handleNavigation('config')}
        >
          <i className="bi bi-gear"></i>
          {!collapsed && <span>System Config</span>}
        </Nav.Link>
        
        <Nav.Link 
          className={activeItem === 'settings' ? 'active' : ''} 
          onClick={() => handleNavigation('settings')}
        >
          <i className="bi bi-sliders"></i>
          {!collapsed && <span>Settings</span>}
        </Nav.Link>
      </Nav>
      
      <div className="sidebar-footer">
        {!collapsed && (
          <div className="version">
            <small>v1.0.0</small>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
