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
import BotForm from './components/BotForm';
import { createBot } from './api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activePage, setActivePage] = useState('dashboard');
  const [selectedBotId, setSelectedBotId] = useState(null);
  const [showNewBotModal, setShowNewBotModal] = useState(false);
  const [createBotLoading, setCreateBotLoading] = useState(false);
  const [createBotError, setCreateBotError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
  }, []);

  // Handler for creating a new bot
  const handleCreateBot = async (botData) => {
    try {
      setCreateBotLoading(true);
      setCreateBotError(null);
      
      // Call API to create bot
      const newBot = await createBot(botData);
      
      // Close the modal and navigate to the new bot's details page
      setShowNewBotModal(false);
      
      // Trigger sidebar refresh by incrementing refreshTrigger
      setRefreshTrigger(prev => prev + 1);
      
      // Navigate to the new bot's details page
      handleNavigation('bot-details', newBot.id);
      
      setCreateBotLoading(false);
    } catch (error) {
      console.error('Error creating bot:', error);
      setCreateBotError(error.message || 'Failed to create bot');
      setCreateBotLoading(false);
    }
  };

  // Function to render the active page content
  const renderPageContent = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard />;
      case 'bots-list':
        return <BotsListPage 
          onViewBot={(botId) => handleNavigation('bot-details', botId)} 
          onNewBot={() => setShowNewBotModal(true)}
        />;
      case 'config':
        return <SystemConfig />;
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
        <>
          <DashboardLayout 
            activePage={activePage} 
            onNavigate={handleNavigation}
            refreshTrigger={refreshTrigger}
          >
            {renderPageContent()}
          </DashboardLayout>
          
          {/* Create Bot Form */}
          <BotForm
            show={showNewBotModal}
            onHide={() => setShowNewBotModal(false)}
            onSubmit={handleCreateBot}
            editBot={null} // null means creating a new bot
          />
        </>
      ) : (
        <Login onLogin={() => setIsAuthenticated(true)} />
      )}
    </div>
  );
}

export default App;
