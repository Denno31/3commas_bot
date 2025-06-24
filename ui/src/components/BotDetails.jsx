import React, { useState, useEffect } from 'react';
import { Modal, Button, Nav, Tab, Row, Col } from 'react-bootstrap';
import PriceHistory from './PriceHistory';
import TradeHistory from './TradeHistory';
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
                  <Nav.Link eventKey="logs">Logs</Nav.Link>
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
                            {state.current_coin || 'Not holding any coin'}
                          </div>
                        </div>
                        <div className="coin-detail-item">
                          <strong>Price Source</strong>
                          <div className="coin-detail-value">
                            {state.price_source === 'three_commas' ? 'Three Commas' : 'CoinGecko'}
                            {state.price_source_status && (
                              <span className={`ms-2 badge ${state.last_price_source === state.price_source ? 'bg-success' : 'bg-warning'}`}>
                                {state.last_price_source === state.price_source ? 'Active' : 'Fallback Active'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="coin-detail-item">
                          <strong>Last Price Update</strong>
                          <div className="coin-detail-value">
                            {state.last_price_update ? (
                              <>
                                {new Date(state.last_price_update).toLocaleString()}
                                {state.last_price_source && (
                                  <span className="ms-2 text-muted">
                                    via {state.last_price_source === 'three_commas' ? 'Three Commas' : 'CoinGecko'}
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
                              new Date(state.last_check_time).toLocaleString()
                            ) : (
                              'Never'
                            )}
                          </div>
                        </div>
                        <div className="coin-detail-item">
                          <strong>Active Trade</strong>
                          <div className="coin-detail-value">
                            {state.active_trade_id || 'None'}
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
