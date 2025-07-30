import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './App.new.css';
import DashboardLayout from './components/layout/DashboardLayout';
import Dashboard from './components/pages/Dashboard';
import BotsListPage from './components/pages/BotsListPage';
import BotDetails from './components/pages/BotDetails';
import SystemConfig from './components/SystemConfig';
import Login from './components/Login';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activePage, setActivePage] = useState('dashboard');
  const [selectedBotId, setSelectedBotId] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
  }, []);

  // Function to render the active page content
  const renderPageContent = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard />;
      case 'bots-list':
        return <BotsListPage 
          onViewBot={(botId) => handleNavigation('bot-details', botId)} 
          onNewBot={() => handleNavigation('new-bot')}
        />;
      case 'config':
        return <SystemConfig />;
      case 'new-bot':
        return <div>New Bot Form</div>; // Placeholder for new bot form
      default:
        if (activePage === 'bot-details' && selectedBotId) {
          return <BotDetails botId={selectedBotId} />;
        }
        return <Dashboard />;
    }
  };

  // Handle navigation from sidebar
  const handleNavigation = (page, botId = null) => {
    setActivePage(page);
    if (botId) {
      setSelectedBotId(botId);
    }
  };

  return (
    <div className="App">
      {isAuthenticated ? (
        <DashboardLayout 
          activePage={activePage} 
          onNavigate={handleNavigation}
        >
          {renderPageContent()}
        </DashboardLayout>
      ) : (
        <Login onLogin={() => setIsAuthenticated(true)} />
      )}
    </div>
  );
}

export default App;
