import React, { useState, useEffect } from 'react';
import { Card, Badge, Accordion, Table, Alert } from 'react-bootstrap';
import { fetchTradeDecisionLogs } from '../api';
import './TradeDecisionLogs.css';

function TradeDecisionLogs({ botId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filteredLogs, setFilteredLogs] = useState([]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        // Use the new endpoint that filters logs on the server side
        const tradeDecisionGroups = await fetchTradeDecisionLogs(botId);
        console.log({tradeDecisionGroups})
        
        // No need to process logs anymore - it's done on the server
        setLogs(tradeDecisionGroups);
        setFilteredLogs(tradeDecisionGroups);
      } catch (err) {
        console.error('Error fetching trade decision logs:', err);
        setError('Failed to load trade decision logs');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
    // Refresh logs every 30 seconds
    const interval = setInterval(fetchLogs, 30000);
    
    return () => clearInterval(interval);
  }, [botId]);

  // The organizeTradeDecisionLogs function has been moved to the server side
  // for better security. Logs are now filtered and organized before being sent to the client.

  // Get appropriate badge for log level
  const getLevelBadge = (level) => {
    switch (level.toLowerCase()) {
      case 'error':
        return <Badge bg="danger">ERROR</Badge>;
      case 'warning':
        return <Badge bg="warning" text="dark">WARNING</Badge>;
      case 'info':
        return <Badge bg="info" text="dark">INFO</Badge>;
      default:
        return <Badge bg="secondary">{level}</Badge>;
    }
  };

  // Check if a log group represents a trade decision
  const isTradeDecisionGroup = (group) => {
    const messages = group.map(log => log.message.toLowerCase());
    return (
      messages.some(msg => msg.includes('eligible coins for swap')) ||
      messages.some(msg => msg.includes('no eligible coins found')) ||
      messages.some(msg => msg.includes('didn\'t qualify'))
    );
  };

  // Extract trade decision details from a log group
  const extractTradeDecisionDetails = (group) => {
    let foundCoins = [];
    let skippedCoins = [];
    let protectionTriggered = false;
    let decisionResult = 'No decision';
    let portfolioValue = null;
    
    group.forEach(log => {
      const msg = log.message;
      
      // Check for eligible coins
      if (msg.includes('Deviation') && msg.includes('>') && !msg.includes('NOT TRADED')) {
        const coinMatch = msg.match(/^([A-Z0-9]+):/);
        if (coinMatch) {
          const coin = coinMatch[1];
          const deviationMatch = msg.match(/Deviation ([\d.-]+)%/);
          const deviation = deviationMatch ? deviationMatch[1] : 'N/A';
          const thresholdMatch = msg.match(/> ([\d.-]+)%/);
          const threshold = thresholdMatch ? thresholdMatch[1] : 'N/A';
          
          foundCoins.push({ coin, deviation, threshold });
          decisionResult = 'Found eligible coins';
        }
      }
      
      // Check for skipped coins
      if (msg.includes('NOT TRADED')) {
        const coinMatch = msg.match(/^([A-Z0-9]+):/);
        if (coinMatch) {
          const coin = coinMatch[1];
          const deviationMatch = msg.match(/Deviation ([\d.-]+)%/);
          const deviation = deviationMatch ? deviationMatch[1] : 'N/A';
          const reasonText = msg.split('NOT TRADED - ')[1] || 'Unknown reason';
          
          skippedCoins.push({ coin, deviation, reason: reasonText });
          if (decisionResult === 'No decision') {
            decisionResult = 'No eligible coins';
          }
        }
      }
      
      // Check for profit protection
      if (msg.includes('TRADE PREVENTED BY PROFIT PROTECTION')) {
        protectionTriggered = true;
        decisionResult = 'Profit protection triggered';
      }
      
      // Check for portfolio value
      if (msg.includes('Portfolio value check:')) {
        const valueMatch = msg.match(/Current ([\d.]+)/);
        const percentMatch = msg.match(/\(([\d.]+)% of peak/);
        const drawdownMatch = msg.match(/([\d.]+)% drawdown/);
        
        if (valueMatch) {
          portfolioValue = {
            value: valueMatch[1],
            percentOfPeak: percentMatch ? percentMatch[1] : 'N/A',
            drawdown: drawdownMatch ? drawdownMatch[1] : 'N/A'
          };
        }
      }
    });
    
    return {
      result: decisionResult,
      eligibleCoins: foundCoins,
      skippedCoins: skippedCoins,
      profitProtection: {
        triggered: protectionTriggered,
        portfolioValue
      },
      timestamp: group[0]?.timestamp || new Date()
    };
  };

  if (loading) {
    return <div className="text-center my-4">Loading trade decision logs...</div>;
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  if (filteredLogs.length === 0) {
    return <Alert variant="info">No trade decision logs available</Alert>;
  }

  return (
    <div className="trade-decision-logs">
      <h5 className="mb-3">Trade Decision Logs</h5>
      
      <Accordion className="mb-4">
        {filteredLogs.map((group, index) => {
          // Only process groups that look like trade decisions
          if (!isTradeDecisionGroup(group)) return null;
          
          const decision = extractTradeDecisionDetails(group);
          const timestamp = new Date(decision.timestamp).toLocaleString();
          
          let headerVariant = 'secondary';
          let resultText = 'No decision';
          
          if (decision.eligibleCoins.length > 0) {
            headerVariant = 'success';
            resultText = `Found ${decision.eligibleCoins.length} eligible coins`;
          } else if (decision.profitProtection.triggered) {
            headerVariant = 'warning';
            resultText = 'Trade prevented by profit protection';
          } else if (decision.skippedCoins.length > 0) {
            headerVariant = 'info';
            resultText = 'No eligible coins found';
          }
          
          return (
            <Accordion.Item eventKey={index.toString()} key={index}>
              <Accordion.Header>
                <span className="me-2">{timestamp}</span>
                <Badge bg={headerVariant}>{resultText}</Badge>
              </Accordion.Header>
              <Accordion.Body>
                {decision.profitProtection.portfolioValue && (
                  <Card className="mb-3" border="info">
                    <Card.Header>Portfolio Value</Card.Header>
                    <Card.Body>
                      <div className="d-flex justify-content-between">
                        <div>Value: <strong>{decision.profitProtection.portfolioValue.value}</strong></div>
                        <div>% of Peak: <strong>{decision.profitProtection.portfolioValue.percentOfPeak}%</strong></div>
                        <div>Drawdown: <strong>{decision.profitProtection.portfolioValue.drawdown}%</strong></div>
                      </div>
                    </Card.Body>
                  </Card>
                )}
                
                {decision.eligibleCoins.length > 0 && (
                  <Card className="mb-3" border="success">
                    <Card.Header>Eligible Coins</Card.Header>
                    <Card.Body>
                      <Table size="sm" hover>
                        <thead>
                          <tr>
                            <th>Coin</th>
                            <th>Deviation</th>
                            <th>Threshold</th>
                          </tr>
                        </thead>
                        <tbody>
                          {decision.eligibleCoins.map((coin, idx) => (
                            <tr key={idx}>
                              <td>{coin.coin}</td>
                              <td className="text-success">{coin.deviation}%</td>
                              <td>{coin.threshold}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </Card.Body>
                  </Card>
                )}
                
                {decision.skippedCoins.length > 0 && (
                  <Card border="warning">
                    <Card.Header>Skipped Coins</Card.Header>
                    <Card.Body>
                      <Table size="sm" hover>
                        <thead>
                          <tr>
                            <th>Coin</th>
                            <th>Deviation</th>
                            <th>Reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          {decision.skippedCoins.map((coin, idx) => (
                            <tr key={idx}>
                              <td>{coin.coin}</td>
                              <td>{coin.deviation}%</td>
                              <td>{coin.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </Card.Body>
                  </Card>
                )}
                
                <div className="mt-3">
                  <Accordion>
                    <Accordion.Item eventKey="raw-logs">
                      <Accordion.Header>
                        <small>Raw Log Messages</small>
                      </Accordion.Header>
                      <Accordion.Body className="raw-logs">
                        {group.map((log, idx) => (
                          <div key={idx} className="log-entry">
                            <small>
                              <span className="log-time">{new Date(log.timestamp).toLocaleString()}</span>
                              {getLevelBadge(log.level)}
                              <span className="log-message">{log.message}</span>
                            </small>
                          </div>
                        ))}
                      </Accordion.Body>
                    </Accordion.Item>
                  </Accordion>
                </div>
              </Accordion.Body>
            </Accordion.Item>
          );
        })}
      </Accordion>
    </div>
  );
}

export default TradeDecisionLogs;
