import React, { useState, useEffect } from 'react';
import { Table, Badge, Form, Row, Col, Spinner, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { fetchBotTrades, fetchTradeDecisions } from '../api';

function TradeHistory({ botId }) {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({
    status: 'all',
    sortBy: 'date',
    sortOrder: 'desc',
    showDetails: true
  });

  useEffect(() => {
    loadTrades();
    const interval = setInterval(loadTrades, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [botId]);

  const loadTrades = async () => {
    try {
      setLoading(true);
      // If details are enabled, use the enhanced trade decisions endpoint
      let data;
      if (filter.showDetails) {
        data = await fetchTradeDecisions(botId);
      } else {
        data = await fetchBotTrades(botId, filter.status === 'all' ? null : filter.status);
      }
      console.log('Loaded trades:', data);
      setTrades(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching trades:', err);
      setError('Failed to load trade history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      'completed': 'success',
      'pending': 'warning',
      'failed': 'danger'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const filteredTrades = trades
    .sort((a, b) => {
      const aValue = filter.sortBy === 'date' ? new Date(a.executed_at) : a[filter.sortBy];
      const bValue = filter.sortBy === 'date' ? new Date(b.executed_at) : b[filter.sortBy];
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
    <div>
      {error && (
        <div className="alert alert-danger mb-4">{error}</div>
      )}

      <Row className="mb-3">
        <Col md={4}>
          <Form.Group>
            <Form.Label>Status</Form.Label>
            <Form.Select
              value={filter.status}
              onChange={(e) => {
                setFilter({ ...filter, status: e.target.value });
                loadTrades();
              }}
            >
              <option value="all">All</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group>
            <Form.Label>Sort By</Form.Label>
            <Form.Select
              value={filter.sortBy}
              onChange={(e) => setFilter({ ...filter, sortBy: e.target.value })}
            >
              <option value="date">Date</option>
              <option value="price_change">Price Change</option>
              <option value="from_amount">Amount</option>
              <option value="commission_amount">Commission</option>
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group>
            <Form.Label>Order</Form.Label>
            <Form.Select
              value={filter.sortOrder}
              onChange={(e) => setFilter({ ...filter, sortOrder: e.target.value })}
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>

      <Form.Check 
        type="switch"
        id="details-switch"
        label="Show Decision Details"
        className="mb-3"
        checked={filter.showDetails}
        onChange={() => {
          setFilter({ ...filter, showDetails: !filter.showDetails });
          // Reload trades when toggling the switch
          loadTrades();
        }}
      />

      <Table responsive hover>
        <thead>
          <tr>
            <th>Date</th>
            <th>From</th>
            <th>To</th>
            <th>Amount</th>
            <th>Price Change</th>
            <th>Commission</th>
            {filter.showDetails && <th>Decision Reason</th>}
            {filter.showDetails && <th>Deviation</th>}
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {filteredTrades.map(trade => (
            <tr key={trade.id}>
              <td>{new Date(trade.executedAt || trade.executed_at).toLocaleString()}</td>
              <td>{trade.fromCoin || trade.from_coin}</td>
              <td>{trade.toCoin || trade.to_coin}</td>
              <td>
                {trade.fromAmount ? `${Number(trade.fromAmount).toLocaleString()} ${trade.fromCoin || trade.from_coin}` : '-'}
                <br />
                <small className="text-muted">
                  → {trade.toAmount ? `${Number(trade.toAmount).toLocaleString()} ${trade.toCoin || trade.to_coin}` : '-'}
                </small>
              </td> 
              <td className={trade.priceChange >= 0 ? 'text-success' : 'text-danger'}>
                {trade.priceChange >= 0 ? '+' : ''}{trade.priceChange ? Number(trade.priceChange).toFixed(2) : '-'}%
              </td>
              <td>
                {trade.commissionAmount ? 
                  <>
                    {Number(trade.commissionAmount).toFixed(8)}
                    <br />
                    <small className="text-muted">({(Number(trade.commissionRate) * 100).toFixed(2)}%)</small>
                  </>
                  : '-'}
              </td>
              {filter.showDetails && (
                <td>
                  {trade.decision_reason ? (
                    <OverlayTrigger
                      placement="left"
                      overlay={
                        <Tooltip id={`reason-tooltip-${trade.id}`}>
                          {trade.decision_reason}
                        </Tooltip>
                      }
                    >
                      <div className="text-truncate" style={{ maxWidth: '200px', cursor: 'pointer' }}>
                        {trade.decision_reason}
                      </div>
                    </OverlayTrigger>
                  ) : '-'}
                </td>
              )}
              {filter.showDetails && (
                <td className="text-center">
                  {trade.deviation_percentage ? (
                    <Badge bg="info" text="dark">
                      {Number(trade.deviation_percentage).toFixed(2)}%
                    </Badge>
                  ) : '-'}
                </td>
              )}
              <td>{getStatusBadge(trade.status)}</td>
            </tr>
          ))}
          {filteredTrades.length === 0 && (
            <tr>
              <td colSpan="7" className="text-center text-muted">No trades found</td>
            </tr>
          )}
        </tbody>
      </Table>
    </div>
  );
}

export default TradeHistory;
