import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Nav, Tab, Button, Badge, Spinner, Alert, Modal } from 'react-bootstrap';
import './BotDetails.css';

// Import API functions
import { fetchBots, fetchBotState, fetchBotAssets, fetchBotTrades, fetchBotLogs, toggleBot, updateBot } from '../../api';

// Import existing components that we'll reuse
import RelativeDeviationChart from '../RelativeDeviationChart';
import PriceComparisonChart from '../PriceComparisonChart';
import TradeHistory from '../TradeHistory';
import TradeDecisionLogs from '../TradeDecisionLogs';
import SellToStablecoinModal from '../modals/SellToStablecoinModal';
import BotForm from '../BotForm';

const BotDetails = ({ botId }) => {
  const [bot, setBot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showSellModal, setShowSellModal] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);
  
  // Handler for toggling bot status (start/stop)
  const handleToggleBot = async () => {
    try {
      setActionLoading(true);
      setActionError(null);
      
      // Call API to toggle bot status
      await toggleBot(botId);
      
      // Update local state
      setBot({
        ...bot,
        enabled: !bot.enabled
      });
      
      setActionLoading(false);
    } catch (error) {
      console.error('Error toggling bot status:', error);
      setActionError(error.message || 'Failed to toggle bot status');
      setActionLoading(false);
    }
  };
  
  // Handler for updating bot after edit
  const handleBotUpdate = async (updatedBot) => {
    try {
      setActionLoading(true);
      setActionError(null);
      
      // Close the edit modal
      setShowEditModal(false);
      
      // Call API to update bot
      await updateBot(botId, updatedBot);
      
      // Refresh bot data
      await fetchBotData();
      
      setActionLoading(false);
    } catch (error) {
      console.error('Error updating bot:', error);
      setActionError(error.message || 'Failed to update bot');
      setActionLoading(false);
    }
  };
  
  // Fetch bot data from API
  useEffect(() => {
    const fetchBotData = async () => {
      try {
        setLoading(true);
        
        // Fetch all bots first
        const allBots = await fetchBots();
        
        // Find the specific bot by ID
        const botData = Array.isArray(allBots) ? allBots.find(b => b.id === botId) : null;
        
        if (!botData) {
          throw new Error(`Bot with ID ${botId} not found`);
        }
        
        // Fetch additional bot details
        const [botState, botAssets, botTradesData] = await Promise.all([
          fetchBotState(botId),
          fetchBotAssets(botId).catch(err => {
            console.warn('Failed to fetch bot assets:', err);
            return [];
          }),
          fetchBotTrades(botId).catch(err => {
            console.warn('Failed to fetch bot trades:', err);
            return [];
          })
        ]);
        
        // Merge all data into a single bot object
        const enrichedBot = {
          ...botData,
          state: botState,
          assets: botAssets || [],
          trades: botTradesData || [],
          totalTrades: botTradesData?.length || 0,
          lastTrade: botTradesData?.length > 0 ? botTradesData[0].timestamp : null
        };
        
        console.log('Fetched bot data:', enrichedBot);
        setBot(enrichedBot);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching bot data:', error);
        setLoading(false);
      }
    };
    
    fetchBotData();
  }, [botId]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Loading bot details...</p>
      </div>
    );
  }

  return (
    <div className="bot-details-page">
      <div className="page-header d-flex justify-content-between align-items-center">
        <div>
          <h1>{bot.name}</h1>
          <p className="text-muted">
            {bot.exchange || 'Unknown Exchange'} • Account ID: {bot.accountId || 'N/A'}
          </p>
        </div>
        <div className="d-flex">
          {actionError && (
            <Alert variant="danger" className="me-2 mb-0 py-1 px-2" style={{ fontSize: '0.85rem' }}>
              {actionError}
              <Button 
                variant="link" 
                className="p-0 ms-2" 
                style={{ fontSize: '0.85rem', verticalAlign: 'baseline' }}
                onClick={() => setActionError(null)}
              >
                <i className="bi bi-x"></i>
              </Button>
            </Alert>
          )}
          <Button 
            variant={bot.enabled ? 'danger' : 'success'} 
            className="me-2"
            onClick={handleToggleBot}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <>
                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-1" />
                {bot.enabled ? 'Stopping...' : 'Starting...'}
              </>
            ) : (
              <>
                <i className={`bi ${bot.enabled ? 'bi-stop-fill' : 'bi-play-fill'} me-1`}></i>
                {bot.enabled ? 'Stop Bot' : 'Start Bot'}
              </>
            )}
          </Button>
          <Button 
            variant="outline-primary"
            onClick={() => setShowEditModal(true)}
            disabled={actionLoading}
          >
            <i className="bi bi-gear-fill me-1"></i>
            Edit Bot
          </Button>
        </div>
      </div>
      
      <Row className="stats-cards">
        <Col md={3} sm={6}>
          <Card className="stat-card">
            <Card.Body>
              <div className="stat-icon">
                <i className="bi bi-currency-bitcoin"></i>
              </div>
              <div className="stat-details">
                <h6 className="stat-title">Current Coin</h6>
                <h3 className="stat-value">
                  {bot.state?.currentCoin || 'N/A'}
                  {bot.state?.currentCoin && bot.state?.balance && (
                    <Badge 
                      bg="secondary" 
                      className="ms-2 balance-badge"
                    >
                      {typeof bot.state.balance === 'number' ? bot.state.balance.toFixed(8) : bot.state.balance}
                    </Badge>
                  )}
                </h3>
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={3} sm={6}>
          <Card className="stat-card">
            <Card.Body>
              <div className="stat-icon">
                <i className="bi bi-cash-coin"></i>
              </div>
              <div className="stat-details">
                <h6 className="stat-title">USDT Value</h6>
                <h3 className="stat-value">
                  ${bot.state?.usdtValue ? bot.state.usdtValue.toLocaleString() : 'N/A'}
                </h3>
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={3} sm={6}>
          <Card className="stat-card">
            <Card.Body>
              <div className="stat-icon">
                <i className="bi bi-arrow-repeat"></i>
              </div>
              <div className="stat-details">
                <h6 className="stat-title">Total Trades</h6>
                <h3 className="stat-value">
                  {bot.totalTrades || 0}
                </h3>
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={3} sm={6}>
          <Card className="stat-card">
            <Card.Body>
              <div className="stat-icon">
                <i className="bi bi-graph-up-arrow"></i>
              </div>
              <div className="stat-details">
                <h6 className="stat-title">Profit</h6>
                <h3 className="stat-value">
                  {bot.state?.profitPercent !== undefined ? (
                    <span className={bot.state.profitPercent >= 0 ? 'text-success' : 'text-danger'}>
                      {bot.state.profitPercent >= 0 ? '+' : ''}{bot.state.profitPercent}%
                    </span>
                  ) : 'N/A'}
                </h3>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* Additional stats row for threshold, interval, and success rate */}
      <Row className="stats-cards mt-3">
        <Col md={4} sm={6}>
          <Card className="stat-card">
            <Card.Body>
              <div className="stat-icon">
                <i className="bi bi-sliders"></i>
              </div>
              <div className="stat-details">
                <h6 className="stat-title">Threshold</h6>
                <h3 className="stat-value">
                  {bot.thresholdPercentage ? `${bot.thresholdPercentage}%` : 'N/A'}
                </h3>
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={4} sm={6}>
          <Card className="stat-card">
            <Card.Body>
              <div className="stat-icon">
                <i className="bi bi-clock-history"></i>
              </div>
              <div className="stat-details">
                <h6 className="stat-title">Check Interval</h6>
                <h3 className="stat-value">
                  {bot.checkInterval ? `${bot.checkInterval} mins` : 'N/A'}
                </h3>
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={4} sm={12}>
          <Card className="stat-card">
            <Card.Body>
              <div className="stat-icon">
                <i className="bi bi-check-circle"></i>
              </div>
              <div className="stat-details">
                <h6 className="stat-title">Success Rate</h6>
                <h3 className="stat-value">
                  {bot.trades && bot.trades.length > 0 ? (
                    <div className="d-flex align-items-center">
                      <div className="progress me-2" 
                           style={{ 
                             height: '10px', 
                             width: '80px',
                             backgroundColor: 'rgba(28, 200, 138, 0.1)', 
                             boxShadow: '0 1px 2px rgba(0,0,0,0.05)' 
                           }}>
                        <div 
                          className="progress-bar" 
                          role="progressbar" 
                          style={{ 
                            width: `${Math.round((bot.trades.filter(t => t.status === 'completed' || t.status === 'success').length / bot.trades.length) * 100)}%`,
                            background: 'linear-gradient(to right, #1cc88a, #36b9cc)',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                          }}
                          aria-valuenow="25" 
                          aria-valuemin="0" 
                          aria-valuemax="100"
                        ></div>
                      </div>
                      <span className="fw-bold" style={{ color: '#1cc88a' }}>
                        {Math.round((bot.trades.filter(t => t.status === 'completed' || t.status === 'success').length / bot.trades.length) * 100)}%
                      </span>
                    </div>
                  ) : 'N/A'}
                </h3>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Row className="mt-4">
        <Col>
          <Card>
            <Card.Header className="p-0">
              <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
                <Nav variant="tabs">
                  <Nav.Item>
                    <Nav.Link eventKey="overview">
                      <i className="bi bi-grid me-2"></i>
                      Overview
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="deviation">
                      <i className="bi bi-graph-up me-2"></i>
                      Deviation Chart
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="price-movement">
                      <i className="bi bi-graph-up-arrow me-2"></i>
                      Price Movement
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="trade-history">
                      <i className="bi bi-clock-history me-2"></i>
                      Trade History
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="logs">
                      <i className="bi bi-journal-text me-2"></i>
                      Logs
                    </Nav.Link>
                  </Nav.Item>
                </Nav>
                
                <Tab.Content>
                  <Tab.Pane eventKey="overview">
                    <div className="p-4">
                      <Row>
                        <Col md={6}>
                          <h5 className="mb-3">Bot Configuration</h5>
                          <table className="table table-dark table-bordered">
                            <tbody>
                              <tr>
                                <th>Bot ID</th>
                                <td>{bot.id}</td>
                              </tr>
                              <tr>
                                <th>Exchange</th>
                                <td>{bot.exchange || 'N/A'}</td>
                              </tr>
                              <tr>
                                <th>Account ID</th>
                                <td>{bot.accountId || 'N/A'}</td>
                              </tr>
                              <tr>
                                <th>Preferred Stablecoin</th>
                                <td>{bot.preferredStablecoin || 'N/A'}</td>
                              </tr>
                              <tr>
                                <th>Coins</th>
                                <td>{Array.isArray(bot.coins) ? bot.coins.join(', ') : 'N/A'}</td>
                              </tr>
                              <tr>
                                <th>Created</th>
                                <td>{bot.created ? new Date(bot.created).toLocaleString() : 'N/A'}</td>
                              </tr>
                              <tr>
                                <th>Last Trade</th>
                                <td>{bot.lastTrade ? new Date(bot.lastTrade).toLocaleString() : 'N/A'}</td>
                              </tr>
                            </tbody>
                          </table>
                          
                          <h5 className="mb-3 mt-4">Current Holdings</h5>
                          <table className="table table-dark table-bordered">
                            <thead>
                              <tr>
                                <th>Coin</th>
                                <th>Balance</th>
                                <th>USDT Value</th>
                                <th>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {bot.assets && bot.assets.length > 0 ? bot.assets.map((asset) => (
                                <tr key={asset.coin || asset.symbol || `asset-${Math.random()}`}>
                                  <td>
                                    <div className="d-flex align-items-center">
                                      <div className="coin-icon me-2">{(asset.coin || asset.symbol || '?').substring(0, 1)}</div>
                                      {asset.coin || asset.symbol}
                                    </div>
                                  </td>
                                  <td>
                                    {typeof asset.balance === 'number' 
                                      ? asset.balance.toFixed(8) 
                                      : asset.balance || 'N/A'}
                                  </td>
                                  <td>
                                    {asset.usdtValue 
                                      ? `$${typeof asset.usdtValue === 'number' 
                                          ? asset.usdtValue.toLocaleString() 
                                          : asset.usdtValue}` 
                                      : 'N/A'}
                                  </td>
                                  <td>
                                    {(asset.coin || asset.symbol) && 
                                     (asset.coin || asset.symbol) !== 'USDT' && 
                                     (asset.coin || asset.symbol) !== 'USDC' && 
                                     parseFloat(asset.balance) > 0 && (
                                      <Button 
                                        size="sm" 
                                        variant="outline-warning"
                                        onClick={() => {
                                          setSelectedCoin(asset.coin || asset.symbol);
                                          setShowSellModal(true);
                                        }}
                                      >
                                        <i className="bi bi-currency-dollar me-1"></i>
                                        Sell
                                      </Button>
                                    )}
                                  </td>
                                </tr>
                              )) : (
                                <tr>
                                  <td colSpan="4" className="text-center">
                                    No assets found
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </Col>
                        <Col md={6}>
                          <h5 className="mb-3">Quick Actions</h5>
                          <div className="d-grid gap-3">
                            <Button variant="primary">
                              <i className="bi bi-arrow-repeat me-2"></i>
                              Force Rebalance
                            </Button>
                            <Button 
                              variant="warning"
                              onClick={() => {
                                setSelectedCoin(bot.currentCoin);
                                setShowSellModal(true);
                              }}
                            >
                              <i className="bi bi-currency-dollar me-2"></i>
                              Sell Current Coin
                            </Button>
                            <Button variant="secondary">
                              <i className="bi bi-eye me-2"></i>
                              View API Credentials
                            </Button>
                            <Button variant="danger">
                              <i className="bi bi-trash me-2"></i>
                              Delete Bot
                            </Button>
                          </div>
                        </Col>
                      </Row>
                    </div>
                  </Tab.Pane>
                  
                  <Tab.Pane eventKey="deviation">
                    <div className="p-4">
                      <RelativeDeviationChart botId={bot.id} />
                    </div>
                  </Tab.Pane>
                  
                  <Tab.Pane eventKey="price-movement">
                    <div className="p-4">
                      <PriceComparisonChart botId={bot.id} />
                    </div>
                  </Tab.Pane>
                  
                  <Tab.Pane eventKey="trade-history">
                    <div className="p-4">
                      <TradeHistory botId={bot.id} />
                    </div>
                  </Tab.Pane>
                  
                  <Tab.Pane eventKey="logs">
                    <div className="p-4">
                      <TradeDecisionLogs botId={bot.id} />
                    </div>
                  </Tab.Pane>
                </Tab.Content>
              </Tab.Container>
            </Card.Header>
          </Card>
        </Col>
      </Row>

      {/* Sell to Stablecoin Modal */}
      <SellToStablecoinModal
        show={showSellModal}
        onHide={() => setShowSellModal(false)}
        bot={bot}
        coin={selectedCoin}
        onSuccess={async (result) => {
          // Refresh bot data after successful sell
          console.log('Sell completed successfully:', result);
          
          try {
            setLoading(true);
            
            // Fetch updated bot data
            const [botState, botAssets] = await Promise.all([
              fetchBotState(botId),
              fetchBotAssets(botId).catch(err => {
                console.warn('Failed to fetch bot assets after sell:', err);
                return [];
              })
            ]);
            
            // Update the bot with fresh data
            setBot({
              ...bot,
              state: botState,
              assets: botAssets || [],
              currentCoin: result?.trade?.toCoin || botState?.currentCoin
            });
            
            setLoading(false);
          } catch (error) {
            console.error('Error refreshing bot data after sell:', error);
            setLoading(false);
          }
        }}
      />
      
      {/* Edit Bot Form */}
      <BotForm
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        onSubmit={handleBotUpdate}
        editBot={bot}
      />
    </div>
  );
};

export default BotDetails;
