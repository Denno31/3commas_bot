import React, { useState, useEffect } from 'react';
import { Modal, Button, Tab, Nav, Row, Col, Badge, Spinner, Alert, Table, Card } from 'react-bootstrap';
import { fetchBotState, fetchBotLogs, fetchAvailableCoins } from '../api';
import PriceHistory from './PriceHistory';
import TradeHistory from './TradeHistory';
import TradeDecisionLogs from './TradeDecisionLogs';
import SwapDecisionHistory from './SwapDecisionHistory';
import RelativeDeviationChart from './RelativeDeviationChart';
import DeviationCalculator from './DeviationCalculator';
import PriceComparisonChart from './PriceComparisonChart';
import SellToStablecoinModal from './SellToStablecoinModal';
import ResetBotModal from './ResetBotModal';
import './BotDetails.css';

const LogViewer = ({ logs }) => (
  <div className="logs-container">
    {logs.map((log, index) => (
      <div key={index} className="log-entry">
        <span className="log-time">{new Date(log.timestamp).toLocaleString()}</span>
        <span className={`log-level ${log.level.toLowerCase()}`}>{log.level}</span>
        <span className="log-message">{log.message}</span>
      </div>
    ))}
  </div>
);

function BotDetails({ bot, onClose }) {
  const [state, setState] = useState(null);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('state');
  const [coinUsdValue, setCoinUsdValue] = useState(null);
  const [loadingValue, setLoadingValue] = useState(false);
  const [botAssets, setBotAssets] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [exchange,setExchange]= useState(null)

  useEffect(() => {
    const updateState = async () => {
      try {
        
        const [botState, botLogs] = await Promise.all([
          fetchBotState(bot.id),
          fetchBotLogs(bot.id)
        ]);
        setState(botState);
        setLogs(botLogs);
        
        // If bot has an account ID, fetch assets when state is updated
        if (bot.accountId) {
          
          fetchBotAssets(bot.accountId);
        }
      } catch (error) {
        console.error('Error fetching bot data:', error);
      }
    };

    updateState();
    // const interval = setInterval(updateState, 5000);

    // return () => clearInterval(interval);
  }, [bot.id]);
  
  // Fetch USDT value whenever current coin changes
  useEffect(() => {
    const fetchCoinValue = async () => {
     
      if (!state || !state.currentCoin || state.currentCoin === bot.preferredStablecoin) {
        setCoinUsdValue(null);
        return;
      }
      
      setLoadingValue(true);
      try {
        // Get the account ID from the bot object
        // In our system, the 3Commas account ID is likely stored directly in the bot config
        const accountId = bot.accountId || bot.account_id;
        
        if (!accountId) {
           // Log the bot data to understand its structure
          console.error('No accountId available to fetch coin value');
          setLoadingValue(false);
          return;
        }
        
        // Fetch available coins from 3Commas API
        const response = await fetchAvailableCoins(accountId);
        
        
        // Check if we have a valid response with success status
        if (!response) {
          
          console.error('Failed to fetch account coins', response?.message || 'Invalid response');
          setLoadingValue(false);
          return;
        }
        
        // In our backend, the coins are in the 'data' property, not 'coins'
        const coins = response.availableCoins;
        
        // Make sure the coins array exists
        if (!coins || !Array.isArray(coins)) {
          console.error('No coins array in response', response);
          setLoadingValue(false);
          return;
        }
        
        try {
          // In our backend API, the coin is identified by 'coin' property, not 'symbol'
         
          const coin = coins.find(c => c && c.coin === state.currentCoin);
            
          if (coin) {
            setCoinUsdValue({
              usdValue: Number(coin.amountInUsd) || 0,
              amount: Number(coin.amount) || 0
              // Note: BTC value may not be available in our API response
            });
          } else {
            
            setCoinUsdValue(null);
          }
        } catch (findError) {
          console.error('Error processing coin data:', findError);
          setCoinUsdValue(null);
        }
      } catch (error) {
        console.error('Error fetching coin value:', error);
        setCoinUsdValue(null);
      } finally {
        setLoadingValue(false);
      }
    };
    
    fetchCoinValue();
  }, [state?.currentCoin, bot.id, bot.apiConfig, bot.preferredStablecoin]);

  // Function to fetch bot assets
  const fetchBotAssets = async (accountId) => {
    
    if (!accountId) return;
    
    setLoadingAssets(true);
    try {
      const {availableCoins,account} = await fetchAvailableCoins(accountId);
     
      // Filter for coins with balances or coins related to the bot
      const relevantAssets = availableCoins.filter(coin => {
        const hasBalance = Number(coin.amount) > 0;
        const isBotCoin = coin.symbol === state?.currentCoin || 
                         coin.symbol === bot.initialCoin || 
                         (bot.coins && bot.coins.split(',').includes(coin.symbol));
        return hasBalance || isBotCoin;
      });
      
      // Sort by USD value descending
      const sortedAssets = relevantAssets.sort((a, b) => {
        return (Number(b.amountInUsd) || 0) - (Number(a.amountInUsd) || 0);
      });
      setExchange(account)
      setBotAssets(sortedAssets);
    } catch (error) {
      console.error('Error fetching bot assets:', error);
      setBotAssets([]);
    } finally {
      setLoadingAssets(false);
    }
  };
  
  return (
    <Modal 
      show={true} 
      onHide={onClose} 
      backdrop="static" 
      keyboard={false} 
      size="xl" 
      centered
      dialogClassName="bot-details-modal-wide"
    >
      <Modal.Header 
        closeButton 
        style={{ 
          background: bot.enabled 
            ? 'linear-gradient(to right, rgba(28, 200, 138, 0.1), rgba(54, 185, 204, 0.1))' 
            : 'linear-gradient(to right, rgba(108, 117, 125, 0.05), rgba(108, 117, 125, 0.1))',
          borderBottom: bot.enabled 
            ? '2px solid rgba(28, 200, 138, 0.3)' 
            : '2px solid rgba(108, 117, 125, 0.3)',
        }}
      >
        <Modal.Title className="w-100">
          <div className="d-flex align-items-center flex-wrap">
            <i className={`bi bi-robot me-2 fs-3 ${bot.enabled ? 'text-success' : 'text-secondary'}`}></i>
            <span className="fs-4 me-2" style={{ color: '#3a3b45', fontWeight: '600' }}>{bot.name}</span>
            <Badge 
              bg={bot.enabled ? "success" : "secondary"} 
              style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.08)' }}
            >
              <i className={`bi bi-${bot.enabled ? 'play-fill' : 'pause-fill'} me-1`}></i>
              {bot.enabled ? "Active" : "Disabled"}
            </Badge>
          </div>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="pt-0">
        <Tab.Container id="bot-details-tabs" defaultActiveKey={activeTab}>
          <Row className="g-3">
            <Col lg={3} md={4} sm={12} className="mb-3">
              <div className="p-2 rounded shadow-sm mb-3" style={{ backgroundColor: 'rgba(248, 249, 252, 0.7)' }}>
                <Nav variant="pills" className="flex-column nav-custom d-flex flex-md-column flex-row flex-wrap">
                  <Nav.Item className="mb-2 px-1" style={{ flex: '1 1 auto', minWidth: '140px', maxWidth: '200px' }}>
                    <Nav.Link eventKey="state" className="d-flex align-items-center py-2 px-3" 
                      style={{
                        borderRadius: '8px',
                        transition: 'all 0.2s ease',
                        boxShadow: activeTab === 'state' ? '0 2px 5px rgba(0,0,0,0.1)' : 'none'
                      }}>
                      <i className="bi bi-info-circle me-2 text-primary"></i>
                      <span>State</span>
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item className="mb-2 px-1" style={{ flex: '1 1 auto', minWidth: '140px', maxWidth: '200px' }}>
                    <Nav.Link eventKey="price-history" className="d-flex align-items-center py-2 px-3" 
                      style={{
                        borderRadius: '8px',
                        transition: 'all 0.2s ease',
                        boxShadow: activeTab === 'price-history' ? '0 2px 5px rgba(0,0,0,0.1)' : 'none'
                      }}>
                      <i className="bi bi-graph-up me-2 text-primary"></i>
                      <span>Price History</span>
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item className="mb-2 px-1" style={{ flex: '1 1 auto', minWidth: '140px', maxWidth: '200px' }}>
                    <Nav.Link eventKey="trade-history" className="d-flex align-items-center py-2 px-3" 
                      style={{
                        borderRadius: '8px',
                        transition: 'all 0.2s ease',
                        boxShadow: activeTab === 'trade-history' ? '0 2px 5px rgba(0,0,0,0.1)' : 'none'
                      }}>
                      <i className="bi bi-clock-history me-2 text-info"></i>
                      <span>Trade History</span>
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item className="mb-2 px-1" style={{ flex: '1 1 auto', minWidth: '140px', maxWidth: '200px' }}>
                    <Nav.Link eventKey="trade-logs" className="d-flex align-items-center py-2 px-3" 
                      style={{
                        borderRadius: '8px',
                        transition: 'all 0.2s ease',
                        boxShadow: activeTab === 'trade-logs' ? '0 2px 5px rgba(0,0,0,0.1)' : 'none'
                      }}>
                      <i className="bi bi-list-check me-2 text-success"></i>
                      <span>Trade Decisions</span>
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item className="mb-2 px-1" style={{ flex: '1 1 auto', minWidth: '140px', maxWidth: '200px' }}>
                    <Nav.Link eventKey="swap-decisions" className="d-flex align-items-center py-2 px-3" 
                      style={{
                        borderRadius: '8px',
                        transition: 'all 0.2s ease',
                        boxShadow: activeTab === 'swap-decisions' ? '0 2px 5px rgba(0,0,0,0.1)' : 'none'
                      }}>
                      <i className="bi bi-shuffle me-2 text-info"></i>
                      <span>Swap Decisions</span>
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item className="mb-2 px-1" style={{ flex: '1 1 auto', minWidth: '140px', maxWidth: '200px' }}>
                    <Nav.Link eventKey="deviation-chart" className="d-flex align-items-center py-2 px-3" 
                      style={{
                        borderRadius: '8px',
                        transition: 'all 0.2s ease',
                        boxShadow: activeTab === 'deviation-chart' ? '0 2px 5px rgba(0,0,0,0.1)' : 'none'
                      }}>
                      <i className="bi bi-graph-up me-2 text-warning"></i>
                      <span>Deviation Chart</span>
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item className="mb-2 px-1" style={{ flex: '1 1 auto', minWidth: '140px', maxWidth: '200px' }}>
                    <Nav.Link eventKey="assets" className="d-flex align-items-center py-2 px-3" 
                      style={{
                        borderRadius: '8px',
                        transition: 'all 0.2s ease',
                        boxShadow: activeTab === 'assets' ? '0 2px 5px rgba(0,0,0,0.1)' : 'none'
                      }}>
                      <i className="bi bi-coin me-2 text-secondary"></i>
                      <span>Assets</span>
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item className="mb-2 px-1" style={{ flex: '1 1 auto', minWidth: '140px', maxWidth: '200px' }}>
                    <Nav.Link eventKey="logs" className="d-flex align-items-center py-2 px-3" 
                      style={{
                        borderRadius: '8px',
                        transition: 'all 0.2s ease',
                        boxShadow: activeTab === 'logs' ? '0 2px 5px rgba(0,0,0,0.1)' : 'none'
                      }}>
                      <i className="bi bi-terminal me-2 text-danger"></i>
                      <span>Logs</span>
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item className="mb-2 px-1" style={{ flex: '1 1 auto', minWidth: '140px', maxWidth: '200px' }}>
                    <Nav.Link eventKey="deviation-calculator" className="d-flex align-items-center py-2 px-3" 
                      style={{
                        borderRadius: '8px',
                        transition: 'all 0.2s ease',
                        boxShadow: activeTab === 'deviation-calculator' ? '0 2px 5px rgba(0,0,0,0.1)' : 'none'
                      }}>
                      <i className="bi bi-calculator me-2 text-primary"></i>
                      <span>Deviation Calculator</span>
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item className="mb-2 px-1" style={{ flex: '1 1 auto', minWidth: '140px', maxWidth: '200px' }}>
                    <Nav.Link eventKey="price-comparison" className="d-flex align-items-center py-2 px-3" 
                      style={{
                        borderRadius: '8px',
                        transition: 'all 0.2s ease',
                        boxShadow: activeTab === 'price-comparison' ? '0 2px 5px rgba(0,0,0,0.1)' : 'none'
                      }}>
                      <i className="bi bi-graph-up-arrow me-2 text-success"></i>
                      <span>Price Movement</span>
                    </Nav.Link>
                  </Nav.Item>
                </Nav>
              </div>
            </Col>
            <Col lg={9} md={8} sm={12}>
                <Tab.Content>
                  <Tab.Pane eventKey="state">
                    {state ? (
                      <>
                        <h5 className="mb-3 text-primary d-flex align-items-center flex-wrap">
                          <i className="bi bi-info-circle me-2"></i>
                          <span className="d-inline-block">Bot Information</span>
                        </h5>
                        <div className="row g-3">
                          {/* Current Coin Card */}
                          <div className="col-xl-6 col-md-12">
                            <Card className="coin-detail-card h-100" style={{ 
                              borderLeft: '4px solid #4e73df',
                              transition: 'all 0.3s'
                            }}>
                              <Card.Body>
                                <div className="d-flex align-items-center mb-2">
                                  <i className="bi bi-coin fs-3 me-2 text-primary"></i>
                                  <h6 className="text-primary fw-bold mb-0">Current Coin</h6>
                                </div>
                                <div className="coin-detail-value">
                                  {state.currentCoin ? (
                                    <h4 className="mb-0 mt-2" style={{ fontWeight: '600', color: '#3a3b45' }}>
                                      {state.currentCoin}
                                    </h4>
                                  ) : (
                                    <span className="text-muted fst-italic">Not holding any coin</span>
                                  )}
                                  {state.currentCoin && (
                                    <div className="mt-2">
                                      {loadingValue ? (
                                        <div className="d-flex align-items-center text-info">
                                          <Spinner animation="border" size="sm" className="me-2" /> 
                                          <span>Loading value...</span>
                                        </div>
                                      ) : coinUsdValue ? (
                                        <div>
                                          <div className="d-flex align-items-center text-success">
                                            <i className="bi bi-currency-exchange me-1"></i>
                                            <strong>{coinUsdValue.amount.toFixed(8)}</strong>
                                            <span className="ms-1">{state.currentCoin}</span>
                                          </div>
                                          <div className="mt-1 d-flex align-items-center text-info">
                                            <i className="bi bi-arrow-right-short me-1"></i>
                                            <span>{coinUsdValue.usdValue.toFixed(2)} {bot.preferredStablecoin || 'USDT'}</span>
                                          </div>
                                          
                                          {/* Sell to Stablecoin Button */}
                                          <div className="mt-3">
                                            <Button 
                                              variant="outline-primary" 
                                              size="sm"
                                              className="d-flex align-items-center"
                                              onClick={() => setShowSellModal(true)}
                                              disabled={!state.currentCoin || state.currentCoin === bot.preferredStablecoin}
                                            >
                                              <i className="bi bi-currency-exchange me-1"></i>
                                              Sell to Stablecoin
                                            </Button>
                                          </div>
                                        </div>
                                      ) : null}
                                    </div>
                                  )}
                                </div>
                              </Card.Body>
                            </Card>
                          </div>
                          
                          {/* Price Source Card */}
                          <div className="col-xl-6 col-md-12">
                            <Card className="coin-detail-card h-100" style={{ 
                              borderLeft: '4px solid #1cc88a',
                              transition: 'all 0.3s'
                            }}>
                              <Card.Body>
                                <div className="d-flex align-items-center mb-2">
                                  <i className="bi bi-graph-up-arrow fs-3 me-2 text-success"></i>
                                  <h6 className="text-success fw-bold mb-0">Price Source</h6>
                                </div>
                                <div className="coin-detail-value">
                                  <h4 className="mb-0 mt-2" style={{ fontWeight: '600', color: '#3a3b45' }}>
                                    {state.priceSource === 'three_commas' ? 'Three Commas' : 'CoinGecko'}
                                  </h4>
                                  {state.priceSourceStatus && (
                                    <div className="mt-2">
                                      <Badge 
                                        bg={state.lastPriceSource === state.priceSource ? 'success' : 'warning'}
                                        className="d-inline-flex align-items-center px-2 py-1"
                                        style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.08)', fontSize: '0.85rem' }}
                                      >
                                        <i className={`bi bi-${state.lastPriceSource === state.priceSource ? 'check-circle' : 'exclamation-triangle'} me-1`}></i>
                                        <span>{state.lastPriceSource === state.priceSource ? 'Active' : 'Fallback Active'}</span>
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                              </Card.Body>
                            </Card>
                          </div>
                          
                          {/* Preferred Stablecoin Card */}
                          <div className="col-xl-6 col-md-12">
                            <Card className="coin-detail-card h-100" style={{ 
                              borderLeft: '4px solid #36b9cc',
                              transition: 'all 0.3s'
                            }}>
                              <Card.Body>
                                <div className="d-flex align-items-center mb-2">
                                  <i className="bi bi-cash-coin fs-3 me-2 text-info"></i>
                                  <h6 className="text-info fw-bold mb-0">Preferred Stablecoin</h6>
                                </div>
                                <div className="coin-detail-value">
                                  <h4 className="mb-0 mt-2" style={{ fontWeight: '600', color: '#3a3b45' }}>
                                    {bot.preferredStablecoin || 'USDT'}
                                  </h4>
                                </div>
                              </Card.Body>
                            </Card>
                          </div>
                          
                          {/* Commission Rate Card */}
                          <div className="col-xl-6 col-md-12">
                            <Card className="coin-detail-card h-100" style={{ 
                              borderLeft: '4px solid #f6c23e',
                              transition: 'all 0.3s'
                            }}>
                              <Card.Body>
                                <div className="d-flex align-items-center mb-2">
                                  <i className="bi bi-percent fs-3 me-2 text-warning"></i>
                                  <h6 className="text-warning fw-bold mb-0">Commission Rate</h6>
                                </div>
                                <div className="coin-detail-value">
                                  <h4 className="mb-0 mt-2" style={{ fontWeight: '600', color: '#3a3b45' }}>
                                    {bot.commissionRate ? `${(bot.commissionRate * 100).toFixed(2)}%` : '0.20%'}
                                  </h4>
                                </div>
                              </Card.Body>
                            </Card>
                          </div>
                          
                          {/* Threshold Card */}
                          <div className="col-xl-6 col-md-12">
                            <Card className="coin-detail-card h-100" style={{ 
                              borderLeft: '4px solid #e74a3b',
                              transition: 'all 0.3s'
                            }}>
                              <Card.Body>
                                <div className="d-flex align-items-center mb-2">
                                  <i className="bi bi-sliders fs-3 me-2 text-danger"></i>
                                  <h6 className="text-danger fw-bold mb-0">Threshold</h6>
                                </div>
                                <div className="coin-detail-value">
                                  <h4 className="mb-0 mt-2" style={{ fontWeight: '600', color: '#3a3b45' }}>
                                    {bot.thresholdPercentage || 0}%
                                  </h4>
                                </div>
                              </Card.Body>
                            </Card>
                          </div>
                          
                          {/* Take Profit Percentage Card */}
                          <div className="col-xl-6 col-md-12">
                            <Card className="coin-detail-card h-100" style={{ 
                              borderLeft: '4px solid #1cc88a',
                              transition: 'all 0.3s'
                            }}>
                              <Card.Body>
                                <div className="d-flex align-items-center mb-2">
                                  <i className="bi bi-graph-up-arrow fs-3 me-2 text-success"></i>
                                  <h6 className="text-success fw-bold mb-0">Take Profit</h6>
                                </div>
                                <div className="coin-detail-value">
                                  <h4 className="mb-0 mt-2" style={{ fontWeight: '600', color: '#3a3b45' }}>
                                    {bot.takeProfitPercentage !== null && bot.takeProfitPercentage !== undefined ? 
                                      `${bot.takeProfitPercentage}%` : 'Not set'}
                                      {console.log(bot)}
                                  </h4>
                                </div>
                              </Card.Body>
                            </Card>
                          </div>
                          
                          <div className="col-xl-6 col-md-12">
                            <Card className="coin-detail-card h-100" style={{ 
                              borderLeft: '4px solid #858796',
                              transition: 'all 0.3s'
                            }}>
                              <Card.Body>
                                <div className="d-flex align-items-center mb-2">
                                  <i className="bi bi-clock-history fs-3 me-2 text-secondary"></i>
                                  <h6 className="text-secondary fw-bold mb-0">Check Interval</h6>
                                </div>
                                <div className="coin-detail-value">
                                  <h4 className="mb-0 mt-2" style={{ fontWeight: '600', color: '#3a3b45' }}>
                                    {bot.checkInterval || 0} minutes
                                  </h4>
                                </div>
                              </Card.Body>
                            </Card>
                          </div>
                          
                          {/* Exchange Account Card */}
                          <div className="col-xl-6 col-md-12">
                            <Card className="coin-detail-card h-100" style={{ 
                              borderLeft: '4px solid #20c997',
                              transition: 'all 0.3s'
                            }}>
                              <Card.Body>
                                <div className="d-flex align-items-center mb-2">
                                  <i className="bi bi-bank fs-3 me-2 text-teal" style={{ color: '#20c997' }}></i>
                                  <h6 className="fw-bold mb-0" style={{ color: '#20c997' }}>Exchange Account</h6>
                                </div>
                                <div className="coin-detail-value">
                                  {bot.accountInfo ? (
                                    <>
                                      <h4 className="mb-0 mt-2" style={{ fontWeight: '600', color: '#3a3b45' }}>
                                        {bot.accountInfo.name || 'Account'}
                                      </h4>
                                      <div className="mt-2 small">
                                        <div className="d-flex align-items-center text-muted mb-1">
                                          <i className="bi bi-building me-1"></i>
                                          <span>Exchange: {bot.accountInfo.exchange_name || 'Unknown'}</span>
                                        </div>
                                        {bot.accountInfo.market_code && (
                                          <div className="d-flex align-items-center text-muted mb-1">
                                            <i className="bi bi-tag me-1"></i>
                                            <span>Market: {bot.accountInfo.market_code}</span>
                                          </div>
                                        )}
                                        <div className="d-flex align-items-center text-muted">
                                          <i className="bi bi-shield-check me-1"></i>
                                          <span>Type: {bot.accountInfo.type || 'Unknown'}</span>
                                        </div>
                                      </div>
                                    </>
                                  ) : exchange ? (
                                    <>
                                      <h4 className="mb-0 mt-2" style={{ fontWeight: '600', color: '#3a3b45' }}>
                                        {exchange.name || 'Account'}
                                      </h4>
                                      <div className="mt-2 small">
                                        <div className="d-flex align-items-center text-muted mb-1">
                                          <i className="bi bi-building me-1"></i>
                                          <span>Exchange: {exchange.exchange_name || 'Unknown'}</span>
                                        </div>
                                        {exchange.market_code && (
                                          <div className="d-flex align-items-center text-muted mb-1">
                                            <i className="bi bi-tag me-1"></i>
                                            <span>Market: {exchange.market_code}</span>
                                          </div>
                                        )}
                                        <div className="d-flex align-items-center text-muted">
                                          <i className="bi bi-shield-check me-1"></i>
                                          <span>Type: {exchange.type || 'Unknown'}</span>
                                        </div>
                                      </div>
                                    </>
                                  ) : (
                                    <div className="text-muted fst-italic mt-2">Account information not available</div>
                                  )}
                                </div>
                              </Card.Body>
                            </Card>
                          </div>
                          
                          <div className="col-xl-6 col-md-12">
                            <Card className="coin-detail-card h-100" style={{ 
                              borderLeft: '4px solid #4e73df',
                              transition: 'all 0.3s'
                            }}>
                                <Card.Body>
                                  <div className="d-flex align-items-center mb-2">
                                    <i className="bi bi-bar-chart-line fs-3 me-2 text-primary"></i>
                                    <h6 className="text-primary fw-bold mb-0">Performance & Stats</h6>
                                  </div>
                                  <div className="coin-detail-value">
                                    <div className="d-flex justify-content-between align-items-center mb-2 mt-3">
                                      <span className="text-muted">Total Commissions:</span>
                                      <span className="text-danger fw-bold">
                                        {state.totalCommissionsPaid !== undefined ? 
                                          `${parseFloat(state.totalCommissionsPaid).toFixed(4)} ${bot.preferredStablecoin || 'USDT'}` : 
                                          '0.0000'}
                                      </span>
                                    </div>
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                      <span className="text-muted">Last Price Update:</span>
                                      <span>
                                        {state.lastPriceUpdate ? 
                                          new Date(state.lastPriceUpdate).toLocaleTimeString() : 
                                          'Never'}
                                      </span>
                                    </div>
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                      <span className="text-muted">Last Check:</span>
                                      <span>
                                        {state.lastCheckTime ? 
                                          new Date(state.lastCheckTime).toLocaleTimeString() : 
                                          'Never'}
                                      </span>
                                    </div>
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                      <span className="text-muted">Active Trade:</span>
                                      {state.activeTradeId ? (
                                        <Badge bg="info" className="d-inline-flex align-items-center px-2" style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.08)', fontSize: '0.85rem' }}>
                                          <i className="bi bi-arrow-repeat me-1"></i>
                                          <span>Trading</span>
                                        </Badge>
                                      ) : (
                                        <span>None</span>
                                      )}
                                    </div>
                                    <div className="d-flex justify-content-between align-items-center">
                                      <span className="text-muted">Allocation:</span>
                                      <span>
                                        {bot.allocationPercentage ? (
                                          <span className="text-success">{bot.allocationPercentage}% of funds</span>
                                        ) : bot.manualBudgetAmount ? (
                                          <span className="text-primary">{bot.manualBudgetAmount} {bot.preferredStablecoin || 'USDT'}</span>
                                        ) : (
                                          <span className="text-warning">Not specified</span>
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                </Card.Body>
                              </Card>
                            </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-5">
                        <Spinner animation="border" variant="primary" />
                        <p className="mt-3">Loading bot state...</p>
                      </div>
                    )}
                  </Tab.Pane>
                  <Tab.Pane eventKey="price-history" className="chart-container">
                    <h5 className="mb-3 text-primary">
                      <i className="bi bi-graph-up me-2"></i>
                      Price History
                    </h5>
                    <PriceHistory botId={bot.id} />
                  </Tab.Pane>
                  <Tab.Pane eventKey="trade-history">
                    <h5 className="mb-3 text-info">
                      <i className="bi bi-clock-history me-2"></i>
                      Trade History
                    </h5>
                    <TradeHistory botId={bot.id} />
                  </Tab.Pane>
                  
                  <Tab.Pane eventKey="trade-logs">
                    <h5 className="mb-3 text-success">
                      <i className="bi bi-list-check me-2"></i>
                      Trade Decisions
                    </h5>
                    <TradeDecisionLogs botId={bot.id} />
                  </Tab.Pane>
                  <Tab.Pane eventKey="swap-decisions">
                    <h5 className="mb-3 text-success">
                      <i className="bi bi-list-check me-2"></i>
                      Swap Decisions
                    </h5>
                    <SwapDecisionHistory botId={bot.id} />
                  </Tab.Pane>
                  <Tab.Pane eventKey="deviation-chart" className="deviation-chart-tab">
                    <h5 className="mb-3 text-warning">
                      <i className="bi bi-graph-up me-2"></i>
                      Deviation Chart
                    </h5>
                    <RelativeDeviationChart botId={bot.id} />
                  </Tab.Pane>
                  <Tab.Pane eventKey="assets">
                    <div className="p-3">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 className="mb-0 text-secondary d-flex align-items-center">
                          <i className="bi bi-coin me-2 text-secondary fs-4"></i>
                          <span>Exchange Assets</span>
                        </h5>
                        {bot.enabled && (
                          <Badge bg="success" pill className="d-flex align-items-center" 
                            style={{ 
                              padding: '0.5rem 0.75rem',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.08)' 
                            }}>
                            <i className="bi bi-bank me-1"></i>
                            <span>Account: {exchange?.exchange_name} {bot.accountId}</span>
                          </Badge>
                        )}
                      </div>
                      
                      {loadingAssets ? (
                        <Card className="mb-4 border-0 shadow-sm">
                          <Card.Body className="text-center p-5">
                            <div className="d-flex justify-content-center mb-3">
                              <Spinner animation="border" variant="primary" size="sm" className="me-2" />
                              <Spinner animation="border" variant="info" size="sm" className="me-2" />
                              <Spinner animation="border" variant="success" size="sm" />
                            </div>
                            <p className="text-muted mb-0">Loading account assets...</p>
                          </Card.Body>
                        </Card>
                      ) : botAssets.length > 0 ? (
                        <Card className="mb-4 border-0 shadow-sm">
                          <Card.Header className="bg-gradient" style={{
                            background: 'linear-gradient(to right, rgba(78, 115, 223, 0.1), rgba(54, 185, 204, 0.1))',
                            border: 'none',
                            borderBottom: '1px solid rgba(0,0,0,0.05)'
                          }}>
                            <div className="d-flex justify-content-between align-items-center">
                              <span className="fw-bold text-primary">
                                <i className="bi bi-wallet2 me-2"></i>
                                Portfolio Distribution
                              </span>
                              <Badge bg="light" text="dark" className="d-flex align-items-center" style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                <i className="bi bi-arrow-repeat me-1 text-primary"></i>
                                <span>Auto-refreshing</span>
                              </Badge>
                            </div>
                          </Card.Header>
                          <Card.Body className="p-0">
                            <div className="table-responsive">
                              <Table bordered hover responsive className="asset-table mb-0" style={{ minWidth: '650px' }}>
                                <thead className="bg-light">
                                  <tr>
                                    <th className="text-primary">Coin</th>
                                    <th className="text-success">Amount</th>
                                    <th className="text-info">USD Value</th>
                                    <th className="text-warning">% of Portfolio</th>
                                    <th className="text-secondary">Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {botAssets.map((asset, index) => {
                                    const isCurrent = state?.currentCoin === asset.symbol;
                                    const isInitial = bot.initialCoin === asset.symbol;
                                    const totalPortfolioValue = botAssets.reduce(
                                      (sum, a) => sum + (Number(a.amountInUsd) || 0), 0
                                    );
                                    const percentage = totalPortfolioValue > 0 
                                      ? ((Number(asset.amountInUsd) || 0) / totalPortfolioValue * 100).toFixed(2)
                                      : '0';
                                    
                                    return (
                                      <tr key={asset.symbol || index} style={{
                                        backgroundColor: isCurrent ? 'rgba(78, 115, 223, 0.05)' : '',
                                        borderLeft: isCurrent ? '3px solid #4e73df' : ''
                                      }}>
                                        <td>
                                          <div className="d-flex align-items-center">
                                            <i className="bi bi-currency-bitcoin me-2" style={{ color: '#f6c23e' }}></i>
                                            <span style={{ fontWeight: 500 }}>{asset.coin}</span>
                                            {isCurrent && (
                                              <Badge bg="primary" className="ms-2" 
                                                style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.08)' }}>
                                                <i className="bi bi-check-circle-fill me-1"></i>
                                                Current
                                              </Badge>
                                            )}
                                            {isInitial && (
                                              <Badge bg="info" className="ms-2"
                                                style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.08)' }}>
                                                <i className="bi bi-flag-fill me-1"></i>
                                                Initial
                                              </Badge>
                                            )}
                                          </div>
                                        </td>
                                        <td style={{ fontWeight: 500 }}>{Number(asset.amount).toFixed(8)}</td>
                                        <td className="text-success" style={{ fontWeight: 600 }}>
                                          ${Number(asset.amountInUsd).toFixed(2)}
                                        </td>
                                        <td>
                                          <div className="d-flex align-items-center">
                                            <div className="progress me-2" style={{ height: '8px', width: '100%', maxWidth: '60px', minWidth: '40px' }}>
                                              <div 
                                                className="progress-bar" 
                                                role="progressbar" 
                                                style={{ 
                                                  width: `${percentage}%`,
                                                  background: 'linear-gradient(to right, #f6c23e, #e74a3b)'
                                                }}
                                                aria-valuenow={percentage} 
                                                aria-valuemin="0" 
                                                aria-valuemax="100"
                                              ></div>
                                            </div>
                                            <span className="ms-1">{percentage}%</span>
                                          </div>
                                        </td>
                                        <td>
                                          {Number(asset.amount) > 0 ? (
                                            <Badge bg="success" className="d-inline-flex align-items-center px-2" style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.08)', fontSize: '0.85rem' }}>
                                              <i className="bi bi-check-circle-fill me-1"></i> <span>Active</span>
                                            </Badge>
                                          ) : (
                                            <Badge bg="secondary" className="d-inline-flex align-items-center px-2" style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.08)', fontSize: '0.85rem' }}>
                                              <i className="bi bi-dash-circle-fill me-1"></i> <span>None</span>
                                            </Badge>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </Table>
                            </div>
                          </Card.Body>
                        </Card>
                        ) : (
                          <Alert variant="info" className="d-flex align-items-center">
                            <i className="bi bi-info-circle-fill me-2 fs-4"></i>
                            <div>
                              No assets found for this bot. This could mean the bot hasn't acquired any coins yet or there was an issue retrieving the data.
                            </div>
                          </Alert>
                        )}
                      </div>
                  </Tab.Pane>
              <Tab.Pane eventKey="logs" className="logs-tab">
                <div className="p-3">
                  <h5 className="mb-3 text-danger">
                    <i className="bi bi-terminal me-2"></i>
                    System Logs
                  </h5>
                  {logs.length > 0 ? (
                    <LogViewer logs={logs} />
                  ) : (
                    <Alert variant="info" className="d-flex align-items-center">
                      <i className="bi bi-info-circle-fill me-2 fs-4"></i>
                      <div>
                        No logs available for this bot yet.
                      </div>
                    </Alert>
                  )}
                </div>
              </Tab.Pane>
              <Tab.Pane eventKey="deviation-calculator" className="deviation-calculator-tab">
                <div className="p-3">
                  <h5 className="mb-3 text-primary">
                    <i className="bi bi-calculator me-2"></i>
                    Deviation Calculator
                  </h5>
                  <DeviationCalculator botId={bot.id} />
                </div>
              </Tab.Pane>
              <Tab.Pane eventKey="price-comparison" className="price-comparison-tab">
                <div className="p-3">
                  <h5 className="mb-3 text-primary">
                    <i className="bi bi-graph-up-arrow me-2"></i>
                    Price Movement Since Initial Snapshot
                  </h5>
                  <PriceComparisonChart botId={bot.id} />
                </div>
              </Tab.Pane>
            </Tab.Content>
          </Col>
        </Row>
      </Tab.Container>
    </Modal.Body>
    <Modal.Footer>
      <Button 
        variant="outline-danger" 
        onClick={() => setShowResetModal(true)}
        className="me-auto"
      >
        <i className="bi bi-arrow-counterclockwise me-1"></i>
        Reset Bot
      </Button>
      <Button variant="secondary" onClick={onClose}>
        Close
      </Button>
    </Modal.Footer>
    {/* Sell to Stablecoin Modal */}
    <SellToStablecoinModal
      show={showSellModal}
      onHide={() => setShowSellModal(false)}
      bot={bot}
      currentCoin={state?.currentCoin}
      coinAmount={coinUsdValue?.amount}
      onSuccess={() => {
        // Refresh bot state after successful sell
        const updateState = async () => {
          try {
            const botState = await fetchBotState(bot.id);
            setState(botState);
            
            // If bot has an account ID, fetch assets when state is updated
            if (bot.accountId) {
              fetchBotAssets(bot.accountId);
            }
          } catch (error) {
            console.error('Error fetching bot data:', error);
          }
        };
        updateState();
      }}
    />
    
    {/* Reset Bot Modal */}
    <ResetBotModal
      show={showResetModal}
      onHide={() => setShowResetModal(false)}
      bot={bot}
      onSuccess={() => {
        // Refresh bot state after successful reset
        const updateState = async () => {
          try {
            const botState = await fetchBotState(bot.id);
            setState(botState);
            
            // If bot has an account ID, fetch assets when state is updated
            if (bot.accountId) {
              fetchBotAssets(bot.accountId);
            }
          } catch (error) {
            console.error('Error fetching bot data:', error);
          }
        };
        updateState();
      }}
    />
  </Modal>
);
}

export default BotDetails;
