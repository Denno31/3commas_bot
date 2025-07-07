import React, { useState, useEffect } from 'react';
import { Modal, Button, Nav, Tab, Row, Col } from 'react-bootstrap';
import PriceHistory from './PriceHistory';
import TradeHistory from './TradeHistory';
import TradeDecisionLogs from './TradeDecisionLogs';
import RelativeDeviationChart from './RelativeDeviationChart';
import { fetchBotState, fetchBotLogs } from '../api';
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

  useEffect(() => {
    const updateState = async () => {
      try {
        const [botState, botLogs] = await Promise.all([
          fetchBotState(bot.id),
          fetchBotLogs(bot.id)
        ]);
        setState(botState);
        setLogs(botLogs);
      } catch (error) {
        console.error('Error fetching bot data:', error);
      }
    };

    updateState();
    const interval = setInterval(updateState, 5000);

    return () => clearInterval(interval);
  }, [bot.id]);

  return (
    <Modal show={true} onHide={onClose} size="lg" className="bot-details-modal">
      <Modal.Header closeButton>
        <Modal.Title>{bot.name}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-0">
        {error && (
          <div className="alert alert-danger mb-4">{error}</div>
        )}
        <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
          <Row className="m-0">
            <Col sm={12} className="p-0">
              <Nav variant="tabs" className="px-3 pt-2">
                <Nav.Item>
                  <Nav.Link eventKey="state">Current State</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="price-history">Price History</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="trade-history">Trade History</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="trade-decisions">Trade Decisions</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="deviation-chart">Deviation Chart</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="logs">Raw Logs</Nav.Link>
                </Nav.Item>
              </Nav>
              <div className="p-3">
                <Tab.Content>
                  <Tab.Pane eventKey="state">
                    {state ? (
                      <div className="coin-details">
                        <div className="coin-detail-item">
                          <strong>Current Coin</strong>
                          <div className="coin-detail-value">
                            {state.currentCoin || 'Not holding any coin'}
                          </div>
                        </div>
                        <div className="coin-detail-item">
                          <strong>Price Source</strong>
                          <div className="coin-detail-value">
                            {state.priceSource === 'three_commas' ? 'Three Commas' : 'CoinGecko'}
                            {state.priceSourceStatus && (
                              <span className={`ms-2 badge ${state.lastPriceSource === state.priceSource ? 'bg-success' : 'bg-warning'}`}>
                                {state.lastPriceSource === state.priceSource ? 'Active' : 'Fallback Active'}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="coin-detail-item">
                          <strong>Preferred Stablecoin</strong>
                          <div className="coin-detail-value">
                            {bot.preferredStablecoin || 'USDT'}
                          </div>
                        </div>
                        
                        <div className="coin-detail-item">
                          <strong>Commission Rate</strong>
                          <div className="coin-detail-value">
                            {bot.commissionRate ? `${(bot.commissionRate * 100).toFixed(2)}%` : '0.20%'}
                          </div>
                        </div>
                        
                        <div className="coin-detail-item">
                          <strong>Total Commissions Paid</strong>
                          <div className="coin-detail-value">
                            {state.total_commissions_paid !== undefined ? 
                              `${parseFloat(state.total_commissions_paid).toFixed(8)} ${bot.preferredStablecoin || 'USDT'}` : 
                              '0.00000000'}
                          </div>
                        </div>
                        
                        <div className="coin-detail-item">
                          <strong>Allocation Settings</strong>
                          <div className="coin-detail-value">
                            {bot.allocationPercentage ? (
                              <span>{bot.allocationPercentage}% of available funds</span>
                            ) : bot.manualBudgetAmount ? (
                              <span>{bot.manualBudgetAmount} {bot.preferredStablecoin || 'USDT'} budget</span>
                            ) : (
                              <span>No allocation specified</span>
                            )}
                          </div>
                        </div>
                        <div className="coin-detail-item">
                          <strong>Last Price Update</strong>
                          <div className="coin-detail-value">
                            {state.lastPriceUpdate ? (
                              <>
                                {new Date(state.lastPriceUpdate).toLocaleString()}
                                {state.lastPriceSource && (
                                  <span className="ms-2 text-muted">
                                    {/* via {state.lastPriceSource === 'three_commas' ? 'Three Commas' : 'CoinGecko'} */}
                                  </span>
                                )}
                              </>
                            ) : (
                              'Never'
                            )}
                          </div>
                        </div>
                        <div className="coin-detail-item">
                          <strong>Last Check</strong>
                          <div className="coin-detail-value">
                            {state.last_check_time ? (
                              new Date(state.lastCheckTime).toLocaleString()
                            ) : (
                              'Never'
                            )}
                          </div>
                        </div>
                        <div className="coin-detail-item">
                          <strong>Active Trade</strong>
                          <div className="coin-detail-value">
                            {state.activeTradeId || 'None'}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="alert alert-info">No state available</div>
                    )}
                  </Tab.Pane>
                  <Tab.Pane eventKey="price-history" className="chart-container">
                    <PriceHistory botId={bot.id} />
                  </Tab.Pane>
                  <Tab.Pane eventKey="trade-history" className="table-container">
                    <TradeHistory botId={bot.id} />
                  </Tab.Pane>
                  <Tab.Pane eventKey="trade-decisions" className="trade-decisions-tab">
                    <TradeDecisionLogs botId={bot.id} />
                  </Tab.Pane>
                  <Tab.Pane eventKey="deviation-chart" className="deviation-chart-tab">
                    <RelativeDeviationChart botId={bot.id} />
                  </Tab.Pane>
                  <Tab.Pane eventKey="logs" className="logs-tab">
                    {logs.length > 0 ? (
                      <LogViewer logs={logs} />
                    ) : (
                      <div className="alert alert-info">No logs available</div>
                    )}
                  </Tab.Pane>
                </Tab.Content>
              </div>
            </Col>
          </Row>
        </Tab.Container>
      </Modal.Body>
    </Modal>
  );
};

export default BotDetails;
