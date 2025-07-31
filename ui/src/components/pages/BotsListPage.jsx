import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Badge, Form, InputGroup, Placeholder } from 'react-bootstrap';
import './BotsListPage.css';
import { fetchBots as apiFetchBots, fetchBotAssets, toggleBot } from '../../api';

// Helper function to calculate estimated USDT value when missing
const calculateEstimatedValue = (bot) => {
  // Default to "N/A" if we can't calculate
  if (!bot.botAssets || !bot.currentCoin) return "N/A";
  
  const currentCoinAsset = bot.botAssets.find(asset => asset.coin === bot.currentCoin);
  if (!currentCoinAsset || !currentCoinAsset.amount) return "N/A";
  
  // Look for a stablecoin asset with USDT equivalent to estimate price
  const stablecoinAsset = bot.botAssets.find(asset => 
    (asset.coin === "USDT" || asset.coin === "USDC" || asset.coin === "BUSD") && 
    asset.usdtEquivalent
  );
  
  if (stablecoinAsset && stablecoinAsset.amount > 0 && stablecoinAsset.usdtEquivalent) {
    // Calculate price based on stablecoin's USDT equivalent
    const stablecoinPrice = stablecoinAsset.usdtEquivalent / stablecoinAsset.amount;
    // Assume 1:1 for stablecoins as fallback
    return (currentCoinAsset.amount * (stablecoinPrice || 1)).toFixed(2);
  }
  
  // If we have entry price, use that as an estimate
  if (currentCoinAsset.entryPrice) {
    return (currentCoinAsset.amount * currentCoinAsset.entryPrice).toFixed(2);
  }
  
  return "N/A";
};

const BotsListPage = ({ onViewBot, onNewBot }) => {
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  useEffect(() => {
    fetchBotsData();
    
    // Set up auto-refresh
    let refreshTimer = null;
    if (autoRefresh) {
      refreshTimer = setInterval(() => {
        fetchBotsData();
      }, 60000); // Refresh every minute
    }
    
    return () => {
      if (refreshTimer) clearInterval(refreshTimer);
    };
  }, [autoRefresh]);
  
  const fetchBotsData = async () => {
    try {
      setLoading(true);
      const botsData = await apiFetchBots();
      
      // Fetch assets for each bot to get USDT values
      const botsWithAssets = await Promise.all(
        botsData.map(async (bot) => {
          try {
            const assets = await fetchBotAssets(bot.id).catch(() => []);
            return { ...bot, botAssets: assets || [] };
          } catch (error) {
            console.warn(`Failed to fetch assets for bot ${bot.id}:`, error);
            return { ...bot, botAssets: [] };
          }
        })
      );
      
      setBots(botsWithAssets || []);
      setLastRefreshed(new Date());
      setLoading(false);
    } catch (error) {
      console.error('Error fetching bots:', error);
      setBots([]);
      setLoading(false);
    }
  };
  
  const handleToggleBot = async (botId) => {
    try {
      setActionLoading(true);
      await toggleBot(botId);
      await fetchBotsData(); // Refresh the bots list to show updated status
      setActionLoading(false);
    } catch (error) {
      console.error('Error toggling bot:', error);
      setActionLoading(false);
    }
  };
  
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  const sortedBots = [...bots].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];
    
    // Handle nested properties
    if (sortField === 'currentValue') {
      aValue = a.currentValue || 0;
      bValue = b.currentValue || 0;
    }
    
    if (typeof aValue === 'string') {
      if (sortDirection === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    } else {
      if (sortDirection === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    }
  });
  
  const filteredBots = sortedBots.filter(bot => 
    bot.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bot.exchange.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (bot.currentCoin && bot.currentCoin.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  const renderSortIcon = (field) => {
    if (sortField === field) {
      return sortDirection === 'asc' ? 
        <i className="bi bi-caret-up-fill ms-1"></i> : 
        <i className="bi bi-caret-down-fill ms-1"></i>;
    }
    return null;
  };
  
  const getBotStatusClass = (status) => {
    // Handle undefined, null or empty status
    if (!status) {
      return 'status-inactive'; // Default to inactive if no status
    }
    
    switch (status.toLowerCase()) {
      case 'active':
        return 'status-active';
      case 'inactive':
        return 'status-inactive';
      case 'paused':
        return 'status-paused';
      default:
        return 'status-inactive';
    }
  };

  return (
    <div className="bots-list-page">
      <div className="page-header d-flex justify-content-between align-items-center">
        <div>
          <h1>Bots</h1>
          <p className="text-muted">Manage your crypto trading bots</p>
        </div>
        <div>
          <Button variant="primary" onClick={onNewBot}>
            <i className="bi bi-plus-circle me-2"></i>
            New Bot
          </Button>
        </div>
      </div>
      
      <Card className="mb-4">
        <Card.Body>
          <Row className="align-items-center">
            <Col md={6} className="mb-3 mb-md-0">
              <InputGroup>
                <InputGroup.Text>
                  <i className="bi bi-search"></i>
                </InputGroup.Text>
                <Form.Control
                  placeholder="Search bots by name, exchange, or coin..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="placeholder-dark"
                  style={{ "--placeholder-opacity": "0.7" }}
                />
                {searchTerm && (
                  <Button 
                    variant="outline-secondary" 
                    onClick={() => setSearchTerm('')}
                  >
                    <i className="bi bi-x"></i>
                  </Button>
                )}
              </InputGroup>
            </Col>
            <Col md={3} className="mb-3 mb-md-0">
              <Form.Select>
                <option value="all">All Exchanges</option>
                <option value="binance">Binance</option>
                <option value="kucoin">KuCoin</option>
                <option value="3commas">3Commas</option>
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Select>
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="paused">Paused</option>
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>
      
      {/* Stats Summary Row */}
      <Row className="mb-4">
        <Col md={3} className="mb-3 mb-md-0">
          <Card className="h-100 shadow-sm" style={{ borderLeft: '4px solid #4e73df' }}>
            <Card.Body>
              <div className="d-flex align-items-center">
                <div>
                  <h6 className="text-primary fw-bold mb-1">Total Bots</h6>
                  <h2>{filteredBots.length}</h2>
                </div>
                <div className="ms-auto">
                  <i className="bi bi-robot" style={{ fontSize: '2.5rem', color: '#4e73df' }}></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3 mb-md-0">
          <Card className="h-100 shadow-sm" style={{ borderLeft: '4px solid #1cc88a' }}>
            <Card.Body>
              <div className="d-flex align-items-center">
                <div>
                  <h6 className="text-success fw-bold mb-1">Active Bots</h6>
                  <h2>{filteredBots.filter(bot => bot.enabled || bot.status === 'active').length}</h2>
                </div>
                <div className="ms-auto">
                  <i className="bi bi-activity" style={{ fontSize: '2.5rem', color: '#1cc88a' }}></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3 mb-md-0">
          <Card className="h-100 shadow-sm" style={{ borderLeft: '4px solid #36b9cc' }}>
            <Card.Body>
              <div className="d-flex align-items-center">
                <div>
                  <h6 className="text-info fw-bold mb-1">Total Trades</h6>
                  <h2>{filteredBots.reduce((sum, bot) => sum + (bot.trades?.length || 0), 0)}</h2>
                </div>
                <div className="ms-auto">
                  <i className="bi bi-arrow-left-right" style={{ fontSize: '2.5rem', color: '#36b9cc' }}></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3 mb-md-0">
          <Card className="h-100 shadow-sm" style={{ borderLeft: '4px solid #f6c23e' }}>
            <Card.Body>
              <div className="d-flex align-items-center">
                <div>
                  <h6 className="text-warning fw-bold mb-1">Last Updated</h6>
                  <h5>{lastRefreshed ? lastRefreshed.toLocaleTimeString() : 'Never'}</h5>
                </div>
                <div className="ms-auto">
                  <Button 
                    variant="outline-secondary" 
                    size="sm"
                    onClick={fetchBotsData} 
                    disabled={loading}
                  >
                    <i className="bi bi-arrow-clockwise me-1"></i>
                    {loading ? 'Refreshing...' : 'Refresh'}
                  </Button>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Bot Cards */}
      {loading ? (
        <Row>
          {[...Array(3)].map((_, index) => (
            <Col key={`skeleton-${index}`} xs={12} md={6} lg={4} className="mb-4">
              <Card className="h-100 shadow-sm mb-4">
                <Card.Header>
                  <Placeholder animation="glow">
                    <Placeholder xs={8} />
                  </Placeholder>
                </Card.Header>
                <Card.Body>
                  <Placeholder animation="glow">
                    <Placeholder xs={7} /> <Placeholder xs={4} /> <Placeholder xs={4} />{' '}
                    <Placeholder xs={6} /> <Placeholder xs={8} />
                    <Placeholder xs={12} className="mt-2" style={{ height: '60px' }} />
                  </Placeholder>
                </Card.Body>
                <Card.Footer>
                  <div className="d-flex justify-content-between">
                    <Placeholder.Button variant="primary" xs={4} />
                    <Placeholder.Button variant="success" xs={4} />
                  </div>
                </Card.Footer>
              </Card>
            </Col>
          ))}
        </Row>
      ) : filteredBots.length === 0 ? (
        <Card className="text-center py-5">
          <Card.Body>
            <i className="bi bi-robot fs-1 text-muted"></i>
            <p className="mt-3">No bots found. Create a new bot to get started.</p>
            <Button variant="primary" onClick={onNewBot}>
              <i className="bi bi-plus-circle me-2"></i>
              New Bot
            </Button>
          </Card.Body>
        </Card>
      ) : (
        <Row>
          {filteredBots.map(bot => (
            <Col key={bot.id} xs={12} md={6} lg={4} className="mb-4">
              <Card 
                className={`h-100 bot-card ${bot.enabled || bot.status === 'active' ? 'border-success' : 'border-secondary'}`}
                onClick={() => onViewBot(bot.id)}
                style={{ 
                  cursor: 'pointer', 
                  transition: 'all 0.2s ease-in-out',
                  boxShadow: '0 0.15rem 1.75rem 0 rgba(58, 59, 69, 0.15)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = '0 0.5rem 2rem 0 rgba(58, 59, 69, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 0.15rem 1.75rem 0 rgba(58, 59, 69, 0.15)';
                }}
              >
                <Card.Header 
                  className="d-flex justify-content-between align-items-center"
                  style={{
                    background: bot.enabled || bot.status === 'active' ? 'linear-gradient(to right, rgba(28, 200, 138, 0.15), rgba(255, 255, 255, 0))' : 'linear-gradient(to right, rgba(108, 117, 125, 0.15), rgba(255, 255, 255, 0))',
                    borderBottom: bot.enabled || bot.status === 'active' ? '1px solid rgba(28, 200, 138, 0.3)' : '1px solid rgba(108, 117, 125, 0.3)',
                  }}
                >
                  <h5 className="mb-0 text-truncate" 
                      title={bot.name}
                      style={{ color: bot.enabled || bot.status === 'active' ? '#1e7e34' : '#495057' }}>
                    {bot.name}
                  </h5>
                  <Badge 
                    bg={bot.enabled || bot.status === 'active' ? 'success' : 'secondary'} 
                    className="ms-2"
                    style={{ fontSize: '0.8rem', padding: '0.35em 0.65em' }}
                  >
                    {bot.enabled || bot.status === 'active' ? 'Active' : 'Disabled'}
                  </Badge>
                </Card.Header>
                
                <Card.Body>
                  <div className="mb-3">
                    <small className="text-primary fw-bold">Current Coin</small>
                    <h6 className="mt-1" style={{ color: '#3a3b45', fontWeight: 600 }}>
                      {bot.currentCoin ? (
                        <div className="d-flex align-items-center justify-content-between w-100">
                          <div className="d-flex align-items-center">
                            <span className="me-2">{bot.currentCoin}</span>
                            {bot.botAssets && bot.botAssets.some(asset => asset.coin === bot.currentCoin) && (
                              <Badge 
                                bg="light" 
                                text="dark" 
                                title={`Amount: ${Number(bot.botAssets.find(asset => asset.coin === bot.currentCoin).amount).toLocaleString(undefined, { maximumFractionDigits: 8 })}`}
                              >
                                {Number(bot.botAssets.find(asset => asset.coin === bot.currentCoin).amount).toLocaleString(undefined, { maximumFractionDigits: 8 })}
                              </Badge>
                            )}
                          </div>
                          {bot.botAssets && bot.botAssets.some(asset => asset.coin === bot.currentCoin) && (
                            <div 
                              className="px-2 py-1 rounded" 
                              style={{
                                background: 'linear-gradient(135deg, #0d6efd, #0dcaf0)',
                                color: 'white',
                                fontWeight: 'bold',
                                fontSize: '0.85rem',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                                border: '1px solid rgba(255,255,255,0.2)'
                              }}
                              title="USDT Equivalent Value"
                            >
                              {bot.botAssets.find(asset => asset.coin === bot.currentCoin).usdtEquivalent ? 
                                `$${Number(bot.botAssets.find(asset => asset.coin === bot.currentCoin).usdtEquivalent).toFixed(2)}` : 
                                `$${calculateEstimatedValue(bot)}`
                              }
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted fst-italic">None</span>
                      )}
                    </h6>
                  </div>
                  
                  <div className="mb-3">
                    <small className="text-success fw-bold">Trading Coins</small>
                    <div className="d-flex flex-wrap gap-1 mt-1">
                      {bot.coins && bot.coins.map(coin => (
                        <Badge 
                          key={coin} 
                          bg={coin === bot.currentCoin ? 'primary' : 'light'} 
                          text={coin === bot.currentCoin ? 'white' : 'dark'} 
                          className="me-1 mb-1" 
                          style={{ fontWeight: 600, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                        >
                          {coin}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <small className="text-info fw-bold">Exchange</small>
                    <h6 className="mt-1" style={{ color: '#3a3b45', fontWeight: 600 }}>
                      <i className="bi bi-currency-exchange me-1" style={{ color: '#36b9cc' }}></i>
                      {bot.exchange || 'Unknown'}
                    </h6>
                  </div>
                  
                  <div className="row g-2">
                    <div className="col-6">
                      <small className="text-info fw-bold">Threshold</small>
                      <h6 className="mt-1" style={{ color: '#3a3b45', fontWeight: 600 }}>
                        <i className="bi bi-sliders me-1" style={{ color: '#36b9cc' }}></i>
                        {bot.threshold_percentage || bot.thresholdPercentage || 'N/A'}%
                      </h6>
                    </div>
                    <div className="col-6">
                      <small className="text-warning fw-bold">Check Interval</small>
                      <h6 className="mt-1" style={{ color: '#3a3b45', fontWeight: 600 }}>
                        <i className="bi bi-clock-history me-1" style={{ color: '#f6c23e' }}></i>
                        {bot.check_interval || bot.checkInterval || 'N/A'} mins
                      </h6>
                    </div>
                  </div>

                  {bot.lastTrade && (
                    <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(78, 115, 223, 0.2)' }}>
                      <small className="text-primary fw-bold">
                        <i className="bi bi-calendar-check me-1"></i> Last Trade
                      </small>
                      <h6 className="mt-1" style={{ color: '#3a3b45', fontWeight: 600 }}>
                        {new Date(bot.lastTrade).toLocaleString()}
                      </h6>
                    </div>
                  )}
                </Card.Body>
                
                <Card.Footer className="d-flex justify-content-between">
                  <Button 
                    variant="primary" 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewBot(bot.id);
                    }}
                  >
                    <i className="bi bi-eye me-1"></i> View Details
                  </Button>
                  <Button 
                    variant={bot.enabled || bot.status === 'active' ? 'danger' : 'success'} 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleBot(bot.id);
                    }}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                        Processing...
                      </>
                    ) : (
                      <>
                        <i className={`bi bi-${bot.enabled || bot.status === 'active' ? 'stop-fill' : 'play-fill'} me-1`}></i>
                        {bot.enabled || bot.status === 'active' ? 'Stop' : 'Start'}
                      </>
                    )}
                  </Button>
                </Card.Footer>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
};

export default BotsListPage;
