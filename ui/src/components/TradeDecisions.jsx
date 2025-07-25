import React, { useState, useEffect } from 'react';
import { Card, Tabs, Tab, Alert, Spinner, Badge } from 'react-bootstrap';
import { fetchTradeDecisionHistory } from '../api';
import TradeHistory from './TradeHistory';
import MissedTrades from './MissedTrades';

/**
 * Component that provides a comprehensive view of trade decisions
 * Shows both executed trades and missed opportunities with explanations
 */
function TradeDecisions({ botId }) {
  const [activeTab, setActiveTab] = useState('executed');
  const [summary, setSummary] = useState({
    executed: 0,
    missed: 0,
    loading: true,
    error: null
  });

  useEffect(() => {
    // Load summary statistics
    const loadSummary = async () => {
      try {
        setSummary(prev => ({ ...prev, loading: true }));
        const history = await fetchTradeDecisionHistory(botId);
        
        // Count executed vs missed trades
        const executed = history.filter(item => item.type === 'executed').length;
        const missed = history.filter(item => item.type === 'missed').length;
        
        setSummary({
          executed,
          missed,
          loading: false,
          error: null
        });
      } catch (error) {
        console.error('Error loading trade decision summary:', error);
        setSummary(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to load trade decision summary'
        }));
      }
    };
    
    loadSummary();
    // Refresh every minute
    const interval = setInterval(loadSummary, 60000);
    return () => clearInterval(interval);
  }, [botId]);

  return (
    <Card className="mb-4">
      <Card.Header>
        <h4>Trade Decision Transparency</h4>
        <p className="text-muted mb-0">
          View executed trades and missed opportunities with detailed explanations
        </p>
      </Card.Header>
      <Card.Body>
        {summary.error && (
          <Alert variant="danger">{summary.error}</Alert>
        )}
        
        <Tabs
          activeKey={activeTab}
          onSelect={k => setActiveTab(k)}
          className="mb-3"
          fill
        >
          <Tab 
            eventKey="executed" 
            title={
              <span>
                Executed Trades
                {!summary.loading && (
                  <Badge bg="primary" pill className="ms-2">
                    {summary.executed}
                  </Badge>
                )}
              </span>
            }
          >
            <TradeHistory botId={botId} />
          </Tab>
          <Tab 
            eventKey="missed" 
            title={
              <span>
                Missed Opportunities
                {!summary.loading && (
                  <Badge bg="secondary" pill className="ms-2">
                    {summary.missed}
                  </Badge>
                )}
              </span>
            }
          >
            <MissedTrades botId={botId} />
          </Tab>
        </Tabs>
        
        {summary.loading && (
          <div className="text-center p-2">
            <Spinner animation="border" size="sm" />
            <span className="ms-2">Loading trade statistics...</span>
          </div>
        )}
      </Card.Body>
      <Card.Footer className="text-muted">
        <small>
          Trade decisions are evaluated based on deviation percentages, thresholds, and portfolio protection settings.
          Some trades may be missed if they don't meet the minimum threshold or other criteria.
        </small>
      </Card.Footer>
    </Card>
  );
}

export default TradeDecisions;
