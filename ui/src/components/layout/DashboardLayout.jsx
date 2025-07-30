import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import './DashboardLayout.css';
import { logout, fetchBots } from '../../api';

const DashboardLayout = ({ children, activePage, onNavigate, refreshTrigger = 0 }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [username, setUsername] = useState('');
  const [botList, setBotList] = useState([]);
  
  // Get username from localStorage and fetch bots on component mount
  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);
  
  // Fetch bots for sidebar navigation when refreshTrigger changes
  useEffect(() => {
    loadBots();
  }, [refreshTrigger]);
  
  const loadBots = async () => {
    try {
      const botsData = await fetchBots();
      setBotList(botsData);
    } catch (error) {
      console.error('Error fetching bots for sidebar:', error);
    }
  };
  
  const handleLogout = () => {
    logout()
      .then(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        window.location.reload();
      })
      .catch(error => {
        console.error('Logout failed:', error);
      });
  };
  
  const handleNavigation = (page, botId = null) => {
    if (onNavigate) {
      onNavigate(page, botId);
    }
    console.log(`Navigating to ${page}${botId ? ` for bot ${botId}` : ''}`);
  };
  
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };
  
  const getPageTitle = (page) => {
    switch (page) {
      case 'dashboard':
        return 'Dashboard';
      case 'bots-list':
        return 'Bots';
      case 'bot-details':
        return 'Bot Details';
      case 'new-bot':
        return 'New Bot';
      case 'analytics':
        return 'Analytics';
      case 'config':
        return 'System Configuration';
      case 'settings':
        return 'Settings';
      default:
        return page.charAt(0).toUpperCase() + page.slice(1);
    }
  };

  return (
    <div className="dashboard-container">
      <Sidebar 
        activeItem={activePage} 
        onNavigate={handleNavigation}
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        botList={botList}
      />
      
      <div className={`content-area ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <TopBar 
          username={username} 
          onLogout={handleLogout}
          pageTitle={getPageTitle(activePage)}
        />
        
        <div className="page-content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
