import React, { useState, useEffect } from 'react';
import { Table, Badge, Card, Spinner, Form, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { fetchMissedTrades } from '../api';

/**
 * Component to display missed trade opportunities
 * Shows trades that could have happened but didn't meet the threshold
 */
function MissedTrades({ botId }) {
  const [missedTrades, setMissedTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({
    sortBy: 'date',
    sortOrder: 'desc'
  });

  useEffect(() => {
    loadMissedTrades();
    // Update every 30 seconds
    const interval = setInterval(loadMissedTrades, 30000);
    return () => clearInterval(interval);
  }, [botId]);

  const loadMissedTrades = async () => {
    try {
      setLoading(true);
      const data = await fetchMissedTrades(botId);
      console.log('Loaded missed trades:', data);
      setMissedTrades(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching missed trades:', err);
      setError('Failed to load missed trade opportunities');
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort missed trades
  const filteredTrades = [...missedTrades].sort((a, b) => {
    const aValue = filter.sortBy === 'date' 
      ? new Date(a.created_at) 
      : filter.sortBy === 'deviation' 
        ? a.deviation_percentage 
        : filter.sortBy === 'score' 
          ? a.score 
          : a.created_at;
    
    const bValue = filter.sortBy === 'date' 
      ? new Date(b.created_at) 
      : filter.sortBy === 'deviation' 
        ? b.deviation_percentage 
        : filter.sortBy === 'score' 
          ? b.score 
          : b.created_at;
          
    return filter.sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
  });

  if (loading) {
    return (
      <div className="text-center p-4">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <Card className="mb-4">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Missed Trade Opportunities</h5>
        <Badge bg="secondary">{missedTrades.length}</Badge>
      </Card.Header>
      <Card.Body>
        {error && <div className="alert alert-danger">{error}</div>}
        
        {!loading && missedTrades.length === 0 && (
          <div className="text-center text-muted p-4">
            No missed trade opportunities found. This could mean all qualifying trades were executed or no trades met the minimum criteria.
          </div>
        )}

        {missedTrades.length > 0 && (
          <>
            <Form.Group className="mb-3">
              <Form.Label>Sort By</Form.Label>
              <div className="d-flex">
                <Form.Select 
                  value={filter.sortBy}
                  onChange={(e) => setFilter({ ...filter, sortBy: e.target.value })}
                  className="me-2"
                >
                  <option value="date">Date</option>
                  <option value="deviation">Deviation %</option>
                  <option value="score">Score</option>
                </Form.Select>
                <Form.Select
                  value={filter.sortOrder}
                  onChange={(e) => setFilter({ ...filter, sortOrder: e.target.value })}
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </Form.Select>
              </div>
            </Form.Group>

            <Table responsive hover>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Reason</th>
                  <th>Score</th>
                  <th>Deviation</th>
                  <th>Threshold</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrades.map((trade) => (
                  <tr key={trade.id}>
                    <td>{new Date(trade.created_at).toLocaleString()}</td>
                    <td>{trade.from_coin}</td>
                    <td>{trade.to_coin}</td>
                    <td>
                      <OverlayTrigger
                        placement="left"
                        overlay={
                          <Tooltip id={`reason-tooltip-${trade.id}`}>
                            {trade.reason}
                          </Tooltip>
                        }
                      >
                        <div className="text-truncate" style={{ maxWidth: '200px', cursor: 'pointer' }}>
                          {trade.reason}
                        </div>
                      </OverlayTrigger>
                    </td>
                    <td>
                      {trade.score ? (
                        <Badge bg="secondary">
                          {Number(trade.score).toFixed(2)}
                        </Badge>
                      ) : '-'}
                    </td>
                    <td>
                      <Badge bg="info" text="dark">
                        {Number(trade.deviation_percentage).toFixed(2)}%
                      </Badge>
                    </td>
                    <td>
                      <Badge bg="warning" text="dark">
                        {Number(trade.threshold).toFixed(2)}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </>
        )}
      </Card.Body>
    </Card>
  );
}

export default MissedTrades;
