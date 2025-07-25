import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Badge, Placeholder } from 'react-bootstrap';
import BotForm from './BotForm';
import BotDetails from './BotDetails';
import {
  fetchBots,
  createBot,
  updateBot,
  deleteBot,
  toggleBot,
  fetchBotAssets
} from '../api';

function BotList() {
  const [bots, setBots] = useState([]);
  const [selectedBot, setSelectedBot] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editBot, setEditBot] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBots: 0,
    activeBots: 0,
    totalTrades: 0,
    successRate: 0
  });

  useEffect(() => {
    loadBots();
  }, []);

  const loadBots = async () => {
    setIsLoading(true);
    try {
      const data = await fetchBots();
      console.log(data);
      setBots(data);
      setError(null);
      
      // Calculate quick stats
      const activeBots = data.filter(bot => bot.enabled).length;
      const totalTrades = data.reduce((sum, bot) => sum + (bot.trades?.length || 0), 0);
      const successfulTrades = data.reduce((sum, bot) => {
        return sum + (bot.trades?.filter(trade => 
          trade.status === 'completed' || trade.status === 'success'
        ).length || 0);
      }, 0);
      
      setStats({
        totalBots: data.length,
        activeBots,
        totalTrades,
        successRate: totalTrades ? Math.round((successfulTrades / totalTrades) * 100) : 0
      });
    } catch (err) {
      console.error('Error fetching bots:', err);
      setError('Failed to load bots. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBot = async (bot) => {
    try {
      const data = await createBot(bot);
      setBots([...bots, data]);
      setShowForm(false);
      setError(null);
    } catch (err) {
      console.error('Error creating bot:', err);
      setError('Failed to create bot. Please check your input and try again.');
    }
  };

  const handleUpdateBot = async (bot) => {
    try {
      console.log('Updating bot:')
      const data = await updateBot(bot.id, bot);
      setBots(bots.map(b => b.id === bot.id ? data : b));
      setEditBot(null);
      setShowForm(false);
      setError(null);
    } catch (err) {
      console.error('Error updating bot:', err);
      setError('Failed to update bot. Please check your input and try again.');
    }
  };

  const handleDeleteBot = async (botId) => {
    if (window.confirm(`Are you sure you want to delete this bot?`)) {
      try {
        await deleteBot(botId);
        setBots(bots.filter(b => b.id !== botId));
        if (selectedBot?.id === botId) setSelectedBot(null);
        setError(null);
      } catch (err) {
        console.error('Error deleting bot:', err);
        setError('Failed to delete bot. Please try again.');
      }
    }
  };

  const handleToggleBot = async (botId) => {
    try {
      const data = await toggleBot(botId);
      setBots(bots.map(b => b.id === botId ? { ...b, enabled: data.enabled } : b));
      setError(null);
    } catch (err) {
      console.error('Error toggling bot:', err);
      setError('Failed to toggle bot. Please try again.');
    }
  };

  const handleEditBot = (bot) => {
    setEditBot(bot);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditBot(null);
    setError(null);
  };

  // Skeleton loader for stats cards
  const StatsCardSkeleton = () => (
    <Card className="h-100 shadow-sm">
      <Card.Body>
        <Placeholder as={Card.Title} animation="glow">
          <Placeholder xs={8} />
        </Placeholder>
        <Placeholder as={Card.Text} animation="glow">
          <Placeholder xs={12} size="lg" />
        </Placeholder>
      </Card.Body>
    </Card>
  );

  // Skeleton loader for bot cards
  const BotCardSkeleton = () => (
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
          <Placeholder.Button variant="danger" xs={3} />
        </div>
      </Card.Footer>
    </Card>
  );

  return (
    <Container fluid>
      <Row className="mb-4">
        <Col md={9}>
          <Button variant="primary" onClick={() => setShowForm(true)}>
            <i className="bi bi-plus-circle me-2"></i>
            Create Bot
          </Button>
        </Col>
        <Col md={3} className="d-flex justify-content-end">
          <Button 
            variant="outline-secondary" 
            onClick={loadBots} 
            disabled={isLoading}
          >
            <i className="bi bi-arrow-clockwise me-2"></i>
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </Col>
      </Row>

      {/* Stats Summary Row */}
      <Row className="mb-4">
        {isLoading ? (
          // Skeleton loaders for stats
          <>
            <Col md={3} className="mb-3 mb-md-0"><StatsCardSkeleton /></Col>
            <Col md={3} className="mb-3 mb-md-0"><StatsCardSkeleton /></Col>
            <Col md={3} className="mb-3 mb-md-0"><StatsCardSkeleton /></Col>
            <Col md={3} className="mb-3 mb-md-0"><StatsCardSkeleton /></Col>
          </>
        ) : (
          // Actual stats cards
          <>
            <Col md={3} className="mb-3 mb-md-0">
              <Card className="h-100 shadow-sm" style={{ borderLeft: '4px solid #4e73df' }}>
                <Card.Body>
                  <div className="d-flex align-items-center">
                    <div>
                      <h6 className="text-primary fw-bold mb-1">Total Bots</h6>
                      <h2>{stats.totalBots}</h2>
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
                      <h2>{stats.activeBots}</h2>
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
                      <h2>{stats.totalTrades}</h2>
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
                      <h6 className="text-warning fw-bold mb-1">Success Rate</h6>
                      <h2>{stats.successRate}%</h2>
                    </div>
                    <div className="ms-auto">
                      <i className="bi bi-graph-up" style={{ fontSize: '2.5rem', color: '#f6c23e' }}></i>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </>
        )}
      </Row>

      {error && (
        <Row className="mb-4">
          <Col>
            <div className="alert alert-danger">{error}</div>
          </Col>
        </Row>
      )}

      <BotForm
        show={showForm}
        onHide={handleFormClose}
        onSubmit={editBot ? handleUpdateBot : handleCreateBot}
        editBot={editBot}
      />

      <Row className="mb-4">
        {isLoading ? (
          // Display skeleton loaders when loading
          [...Array(3)].map((_, index) => (
            <Col key={`skeleton-${index}`} xs={12} md={6} lg={4} className="mb-4">
              <BotCardSkeleton />
            </Col>
          ))
        ) : bots.length === 0 ? (
          <Col>
            <div className="text-center p-5">
              <i className="bi bi-robot" style={{ fontSize: '3rem', opacity: 0.3 }}></i>
              <h5 className="mt-3">No bots created yet</h5>
              <p className="text-muted">Click the "Create Bot" button above to get started</p>
            </div>
          </Col>
        ) : (
          bots.map((bot) => (
            <Col key={bot.id} xs={12} md={6} lg={4} className="mb-4">
              <Card 
                className={`h-100 bot-card ${bot.enabled ? 'border-success' : 'border-secondary'}`}
                onClick={() => setSelectedBot(bot)}
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
                    background: bot.enabled ? 'linear-gradient(to right, rgba(28, 200, 138, 0.15), rgba(255, 255, 255, 0))' : 'linear-gradient(to right, rgba(108, 117, 125, 0.15), rgba(255, 255, 255, 0))',
                    borderBottom: bot.enabled ? '1px solid rgba(28, 200, 138, 0.3)' : '1px solid rgba(108, 117, 125, 0.3)',
                  }}
                >
                  <h5 className="mb-0 text-truncate" 
                      title={bot.name}
                      style={{ color: bot.enabled ? '#1e7e34' : '#495057' }}>
                    {bot.name}
                  </h5>
                  <Badge 
                    bg={bot.enabled ? 'success' : 'secondary'} 
                    className="ms-2"
                    style={{ fontSize: '0.8rem', padding: '0.35em 0.65em' }}
                  >
                    {bot.enabled ? 'Active' : 'Disabled'}
                  </Badge>
                </Card.Header>
                
                <Card.Body>
                  <div className="mb-3">
                    <small className="text-primary fw-bold">Current Coin</small>
                    <h6 className="mt-1" style={{ color: '#3a3b45', fontWeight: 600 }}>
                      {bot.currentCoin ? (
                        <div className="d-flex align-items-center">
                          <span>{bot.currentCoin}</span>
                          {bot.botAssets && bot.botAssets.some(asset => asset.coin === bot.currentCoin) && (
                            <Badge 
                              bg="light" 
                              text="dark" 
                              className="ms-2" 
                              title={`Current value: ${bot.botAssets.find(asset => asset.coin === bot.currentCoin).usdtEquivalent ? '$' + Number(bot.botAssets.find(asset => asset.coin === bot.currentCoin).usdtEquivalent).toFixed(2) : 'Unknown'}`}
                            >
                              {Number(bot.botAssets.find(asset => asset.coin === bot.currentCoin).amount).toLocaleString(undefined, { maximumFractionDigits: 8 })}
                            </Badge>
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
                      {bot.coins.map(coin => (
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
                  
                  <div className="row g-2">
                    <div className="col-6">
                      <small className="text-info fw-bold">Threshold</small>
                      <h6 className="mt-1" style={{ color: '#3a3b45', fontWeight: 600 }}>
                        <i className="bi bi-sliders me-1" style={{ color: '#36b9cc' }}></i>
                        {bot.thresholdPercentage}%
                      </h6>
                    </div>
                    <div className="col-6">
                      <small className="text-warning fw-bold">Check Interval</small>
                      <h6 className="mt-1" style={{ color: '#3a3b45', fontWeight: 600 }}>
                        <i className="bi bi-clock-history me-1" style={{ color: '#f6c23e' }}></i>
                        {bot.checkInterval} mins
                      </h6>
                    </div>
                  </div>

                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(78, 115, 223, 0.2)' }}>
                    <small className="text-primary fw-bold d-block mb-2">
                      <i className="bi bi-graph-up-arrow me-1"></i> Performance
                    </small>
                    <div className="d-flex justify-content-between mb-1 align-items-center">
                      <span className="small fw-bold" style={{ color: '#4e73df' }}>Success Rate:</span>
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
                              width: `${bot.trades && bot.trades.length > 0 
                                ? Math.round((bot.trades.filter(t => t.status === 'completed' || t.status === 'success').length / bot.trades.length) * 100) 
                                : 0}%`,
                              background: 'linear-gradient(to right, #1cc88a, #36b9cc)',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                            }}
                            aria-valuenow="25" 
                            aria-valuemin="0" 
                            aria-valuemax="100"
                          ></div>
                        </div>
                        <span className="small fw-bold" style={{ color: '#1cc88a' }}>
                          {bot.trades && bot.trades.length > 0 
                            ? Math.round((bot.trades.filter(t => t.status === 'completed' || t.status === 'success').length / bot.trades.length) * 100) 
                            : 0}%
                        </span>
                      </div>
                    </div>
                    {bot.trades && bot.trades.length > 0 && (
                      <div className="d-flex justify-content-between small mt-2">
                        <span className="fw-bold" style={{ color: '#36b9cc' }}>
                          <i className="bi bi-arrow-repeat me-1"></i>
                          Trades: {bot.trades.length}
                        </span>
                        <span style={{ color: '#5a5c69' }}>
                          <i className="bi bi-calendar-check me-1"></i>
                          Last: {new Date(bot.trades[0].executedAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {bot.lastTrade && (
                    <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(246, 194, 62, 0.2)' }}>
                      <small className="text-warning fw-bold">
                        <i className="bi bi-currency-exchange me-1"></i> Last Trade
                      </small>
                      <div className="d-flex align-items-center mt-1">
                        <span className="me-1 fw-bold" style={{ color: '#e74a3b' }}>{bot.lastTrade.fromCoin}</span>
                        <i className="bi bi-arrow-right mx-1" style={{ color: '#4e73df' }}></i>
                        <span className="fw-bold" style={{ color: '#1cc88a' }}>{bot.lastTrade.toCoin}</span>
                        <span className="ms-auto" style={{ color: '#5a5c69', fontSize: '0.85rem' }}>
                          <i className="bi bi-clock me-1"></i>
                          {new Date(bot.lastTrade.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {bot.lastTrade.amount && (
                        <div className="small fw-bold mt-1" style={{ color: '#36b9cc' }}>
                          <i className="bi bi-cash-stack me-1"></i>
                          Amount: {Number(bot.lastTrade.amount).toFixed(6)}
                        </div>
                      )}
                    </div>
                  )}
                </Card.Body>
                
                <Card.Footer className="bg-transparent">
                  <div className="d-flex justify-content-between">
                    <Button
                      variant="outline-primary"
                      size="sm"
                      className="action-btn"
                      style={{
                        borderWidth: '2px',
                        fontWeight: 'bold',
                        boxShadow: '0 2px 4px rgba(78, 115, 223, 0.15)',
                        transition: 'all 0.2s'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditBot(bot);
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#4e73df';
                        e.currentTarget.style.color = 'white';
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(78, 115, 223, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#4e73df';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(78, 115, 223, 0.15)';
                      }}
                    >
                      <i className="bi bi-pencil-square me-1"></i> Edit
                    </Button>
                    <Button
                      variant={bot.enabled ? 'outline-secondary' : 'outline-success'}
                      size="sm"
                      className="action-btn"
                      style={{
                        borderWidth: '2px',
                        fontWeight: 'bold',
                        boxShadow: bot.enabled 
                          ? '0 2px 4px rgba(108, 117, 125, 0.15)' 
                          : '0 2px 4px rgba(28, 200, 138, 0.15)',
                        transition: 'all 0.2s'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleBot(bot.id);
                      }}
                      onMouseEnter={(e) => {
                        if (bot.enabled) {
                          e.currentTarget.style.backgroundColor = '#6c757d';
                          e.currentTarget.style.color = 'white';
                          e.currentTarget.style.boxShadow = '0 4px 8px rgba(108, 117, 125, 0.3)';
                        } else {
                          e.currentTarget.style.backgroundColor = '#1cc88a';
                          e.currentTarget.style.color = 'white';
                          e.currentTarget.style.boxShadow = '0 4px 8px rgba(28, 200, 138, 0.3)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = bot.enabled ? '#6c757d' : '#1cc88a';
                        e.currentTarget.style.boxShadow = bot.enabled
                          ? '0 2px 4px rgba(108, 117, 125, 0.15)'
                          : '0 2px 4px rgba(28, 200, 138, 0.15)';
                      }}
                    >
                      <i className={`bi bi-${bot.enabled ? 'pause-fill' : 'play-fill'} me-1`}></i>
                      {bot.enabled ? 'Pause' : 'Start'}
                    </Button>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      className="action-btn"
                      style={{
                        borderWidth: '2px',
                        fontWeight: 'bold',
                        boxShadow: '0 2px 4px rgba(231, 74, 59, 0.15)',
                        transition: 'all 0.2s'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBot(bot.id);
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#e74a3b';
                        e.currentTarget.style.color = 'white';
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(231, 74, 59, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#e74a3b';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(231, 74, 59, 0.15)';
                      }}
                    >
                      <i className="bi bi-trash-fill me-1"></i> Delete
                    </Button>
                  </div>
                </Card.Footer>
              </Card>
            </Col>
          ))
        )}
      </Row>

      {selectedBot && (
        <BotDetails
          bot={selectedBot}
          onClose={() => setSelectedBot(null)}
        />
      )}
    </Container>
  );
}

export default BotList;
