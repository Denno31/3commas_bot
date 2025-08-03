import React, { useState, useEffect } from 'react';
import { Table, Spinner, Alert, Card, Badge, Pagination, Form, Row, Col, Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { fetchBotSwapDecisions } from '../api';

function SwapDecisionHistory({ botId }) {
  const [swapDecisions, setSwapDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  
  // Filter states
  const [filters, setFilters] = useState({
    fromCoin: '',
    toCoin: '',
    swapPerformed: '',
    startDate: '',
    endDate: '',
    deviationMin: '',
    deviationMax: '',
    hasProtection: ''
  });

  useEffect(() => {
    if (botId) {
      loadSwapDecisions();
    }
  }, [botId, pagination.page, pagination.limit]);

  const loadSwapDecisions = async () => {
    setLoading(true);
    try {
      // Convert page to offset for API
      const offset = (pagination.page - 1) * pagination.limit;
      
      const response = await fetchBotSwapDecisions(botId, {
        offset: offset,
        limit: pagination.limit,
        swapPerformed: filters.swapPerformed === '' ? undefined : filters.swapPerformed === 'true',
        fromCoin: filters.fromCoin || undefined,
        toCoin: filters.toCoin || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined
      });
      
      console.log('API Response:', response); // Debug log
      
      // Handle the API response structure correctly - matches the exact structure you shared
      if (response && Array.isArray(response.items)) {
        setSwapDecisions(response.items);
        setPagination(prev => ({
          ...prev,
          total: response.total || 0,
          totalPages: Math.ceil((response.total || 0) / pagination.limit)
        }));
      } else {
        // Fallback if response structure is different
        setSwapDecisions([]);
        console.error('Unexpected response structure:', response);
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching swap decisions:', err);
      setError('Failed to load swap decisions. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const applyFilters = () => {
    setPagination(prev => ({
      ...prev,
      page: 1 // Reset to first page when applying filters
    }));
    loadSwapDecisions();
  };

  const resetFilters = () => {
    setFilters({
      fromCoin: '',
      toCoin: '',
      swapPerformed: '',
      startDate: '',
      endDate: ''
    });
    setPagination(prev => ({
      ...prev,
      page: 1
    }));
    // We'll reload in the useEffect when state changes
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const formatPercent = (value) => {
    return value !== undefined && value !== null ? `${(parseFloat(value)).toFixed(2)}%` : 'N/A';
  };
  
  // Helper to determine if a deviation is positive, negative, or neutral
  const getDeviationColor = (value) => {
    if (value === undefined || value === null) return 'inherit';
    const numValue = parseFloat(value);
    if (numValue > 0) return 'text-success';
    if (numValue < 0) return 'text-danger';
    return 'text-warning';
  };

  const formatPrice = (price) => {
    return price !== undefined && price !== null ? `$${parseFloat(price).toFixed(4)}` : 'N/A';
  };

  const renderPagination = () => {
    const { page, totalPages } = pagination;
    
    if (totalPages <= 1) return null;
    
    let items = [];
    
    // Previous button
    items.push(
      <Pagination.Prev 
        key="prev"
        disabled={page === 1}
        onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
      />
    );
    
    // First page
    items.push(
      <Pagination.Item 
        key={1} 
        active={page === 1}
        onClick={() => setPagination(prev => ({ ...prev, page: 1 }))}
      >
        1
      </Pagination.Item>
    );
    
    // Ellipsis if needed
    if (page > 3) {
      items.push(<Pagination.Ellipsis key="ellipsis1" disabled />);
    }
    
    // Pages around current
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      items.push(
        <Pagination.Item
          key={i}
          active={page === i}
          onClick={() => setPagination(prev => ({ ...prev, page: i }))}
        >
          {i}
        </Pagination.Item>
      );
    }
    
    // Ellipsis if needed
    if (page < totalPages - 2) {
      items.push(<Pagination.Ellipsis key="ellipsis2" disabled />);
    }
    
    // Last page if not already included
    if (totalPages > 1) {
      items.push(
        <Pagination.Item
          key={totalPages}
          active={page === totalPages}
          onClick={() => setPagination(prev => ({ ...prev, page: totalPages }))}
        >
          {totalPages}
        </Pagination.Item>
      );
    }
    
    // Next button
    items.push(
      <Pagination.Next
        key="next"
        disabled={page === totalPages}
        onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
      />
    );
    
    return <Pagination>{items}</Pagination>;
  };

  const getSwapStatusBadge = (decision) => {
    if (decision.swapPerformed === true) {
      return <Badge bg="success">Performed</Badge>;
    } else if (decision.swapPerformed === false) {
      return <Badge bg="secondary">Not Performed</Badge>;
    } else {
      return <Badge bg="warning">Unknown</Badge>;
    }
  };

  return (
    <Card className="mb-4">
      <Card.Header>
        <h5>Swap Decision History</h5>
        <small className="text-muted">Complete record of all bot swap evaluations</small>
      </Card.Header>
      <Card.Body>
        {/* Filters */}
        <div className="mb-4">
          <h6>Filters</h6>
          <Row className="g-2 mb-2">
            <Col md={2}>
              <OverlayTrigger placement="top" overlay={<Tooltip>Filter by source coin</Tooltip>}>
                <Form.Control
                  size="sm"
                  type="text"
                  placeholder="From Coin"
                  name="fromCoin"
                  value={filters.fromCoin}
                  onChange={handleFilterChange}
                />
              </OverlayTrigger>
            </Col>
            <Col md={2}>
              <OverlayTrigger placement="top" overlay={<Tooltip>Filter by target coin</Tooltip>}>
                <Form.Control
                  size="sm"
                  type="text"
                  placeholder="To Coin"
                  name="toCoin"
                  value={filters.toCoin}
                  onChange={handleFilterChange}
                />
              </OverlayTrigger>
            </Col>
            <Col md={2}>
              <OverlayTrigger placement="top" overlay={<Tooltip>Filter by swap execution status</Tooltip>}>
                <Form.Select
                  size="sm"
                  name="swapPerformed"
                  value={filters.swapPerformed}
                  onChange={handleFilterChange}
                >
                  <option value="">All Swaps</option>
                  <option value="true">Performed</option>
                  <option value="false">Not Performed</option>
                </Form.Select>
              </OverlayTrigger>
            </Col>
            <Col md={2}>
              <OverlayTrigger placement="top" overlay={<Tooltip>Filter by protection status</Tooltip>}>
                <Form.Select
                  size="sm"
                  name="hasProtection"
                  value={filters.hasProtection}
                  onChange={handleFilterChange}
                >
                  <option value="">All Protection</option>
                  <option value="true">Protection Triggered</option>
                  <option value="false">No Protection</option>
                </Form.Select>
              </OverlayTrigger>
            </Col>
            <Col md={2}>
              <OverlayTrigger placement="top" overlay={<Tooltip>Filter by start date</Tooltip>}>
                <Form.Control
                  size="sm"
                  type="date"
                  name="startDate"
                  value={filters.startDate}
                  onChange={handleFilterChange}
                  placeholder="Start Date"
                />
              </OverlayTrigger>
            </Col>
            <Col md={2}>
              <OverlayTrigger placement="top" overlay={<Tooltip>Filter by end date</Tooltip>}>
                <Form.Control
                  size="sm"
                  type="date"
                  name="endDate"
                  value={filters.endDate}
                  onChange={handleFilterChange}
                  placeholder="End Date"
                />
              </OverlayTrigger>
            </Col>
          </Row>
          <Row className="g-2">
            <Col md={2}>
              <OverlayTrigger placement="top" overlay={<Tooltip>Minimum deviation percentage</Tooltip>}>
                <Form.Control
                  size="sm"
                  type="number"
                  placeholder="Min Deviation %"
                  name="deviationMin"
                  value={filters.deviationMin}
                  onChange={handleFilterChange}
                />
              </OverlayTrigger>
            </Col>
            <Col md={2}>
              <OverlayTrigger placement="top" overlay={<Tooltip>Maximum deviation percentage</Tooltip>}>
                <Form.Control
                  size="sm"
                  type="number"
                  placeholder="Max Deviation %"
                  name="deviationMax"
                  value={filters.deviationMax}
                  onChange={handleFilterChange}
                />
              </OverlayTrigger>
            </Col>
            <Col md={6} className="d-flex align-items-center">
              <Button size="sm" variant="primary" onClick={applyFilters} className="me-2">
                <i className="bi bi-filter me-1"></i> Apply
              </Button>
              <Button size="sm" variant="secondary" onClick={resetFilters} className="me-2">
                <i className="bi bi-x-circle me-1"></i> Reset
              </Button>
              <Button size="sm" variant="info" onClick={() => loadSwapDecisions()} className="me-2">
                <i className="bi bi-arrow-clockwise me-1"></i> Refresh
              </Button>
            </Col>
          </Row>
        </div>

        {loading ? (
          <div className="text-center p-5">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
          </div>
        ) : error ? (
          <Alert variant="danger">{error}</Alert>
        ) : swapDecisions.length === 0 ? (
          <Alert variant="info">No swap decisions found for this bot.</Alert>
        ) : (
          <>
            <div className="table-responsive" style={{ overflowX: 'auto', overflowY: 'auto', maxWidth: '100%', maxHeight: '600px' }}>
              <Table striped bordered hover size="sm" className="swap-decision-table">
                <thead>
                  <tr>
                    <th>
                      <OverlayTrigger placement="top" overlay={<Tooltip>When the swap decision was evaluated</Tooltip>}>
                        <span>Date</span>
                      </OverlayTrigger>
                    </th>
                    <th>
                      <OverlayTrigger placement="top" overlay={<Tooltip>Source and target coins for potential swap</Tooltip>}>
                        <span>From → To</span>
                      </OverlayTrigger>
                    </th>
                    <th>
                      <OverlayTrigger placement="top" overlay={<Tooltip>Current prices at time of evaluation</Tooltip>}>
                        <span>Current Prices</span>
                      </OverlayTrigger>
                    </th>
                    <th>
                      <OverlayTrigger placement="top" overlay={<Tooltip>Original snapshot prices used as baseline</Tooltip>}>
                        <span>Snapshot Prices</span>
                      </OverlayTrigger>
                    </th>
                    <th>
                      <OverlayTrigger placement="top" overlay={<Tooltip>Price deviation percentage and threshold for swap</Tooltip>}>
                        <span>Deviation</span>
                      </OverlayTrigger>
                    </th>
                    <th>
                      <OverlayTrigger placement="top" overlay={<Tooltip>Ethereum equivalent values for the trade</Tooltip>}>
                        <span>ETH Values</span>
                      </OverlayTrigger>
                    </th>
                    <th>
                      <OverlayTrigger placement="top" overlay={<Tooltip>Global peak value and protection status</Tooltip>}>
                        <span>Global Peak</span>
                      </OverlayTrigger>
                    </th>
                    <th>
                      <OverlayTrigger placement="top" overlay={<Tooltip>Whether the swap was performed</Tooltip>}>
                        <span>Status</span>
                      </OverlayTrigger>
                    </th>
                    <th>
                      <OverlayTrigger placement="top" overlay={<Tooltip>Reason for the swap decision</Tooltip>}>
                        <span>Reason</span>
                      </OverlayTrigger>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {swapDecisions.map((decision) => (
                    <tr key={decision.id}>
                      <td>{formatDate(decision.createdAt)}</td>
                      <td>
                        <strong>{decision.fromCoin}</strong> → <strong>{decision.toCoin}</strong>
                      </td>
                      <td>
                        <small>
                          {decision.fromCoin}: {formatPrice(decision.fromCoinPrice)}<br />
                          {decision.toCoin}: {formatPrice(decision.toCoinPrice)}
                        </small>
                      </td>
                      <td>
                        <small>
                          {decision.fromCoin}: {formatPrice(decision.fromCoinSnapshot)}<br />
                          {decision.toCoin}: {formatPrice(decision.toCoinSnapshot)}
                        </small>
                      </td>
                      <td>
                        <small>
                          Current: <span className={getDeviationColor(decision.priceDeviationPercent)}>{formatPercent(decision.priceDeviationPercent)}</span><br />
                          Threshold: {formatPercent(decision.priceThreshold)}
                        </small>
                      </td>
                      <td>
                        <small>
                          From: {decision.ethEquivalentValue !== undefined ? parseFloat(decision.ethEquivalentValue).toFixed(6) : 'N/A'}<br />
                          Min: {decision.minEthEquivalent !== undefined ? parseFloat(decision.minEthEquivalent).toFixed(6) : 'N/A'}
                        </small>
                      </td>
                      <td>
                        <small>
                          Peak: {decision.globalPeakValue !== undefined ? parseFloat(decision.globalPeakValue).toFixed(6) : 'N/A'}<br />
                          {decision.globalProtectionTriggered && <Badge bg="warning" className="mt-1">Protection</Badge>}
                        </small>
                      </td>
                      <td>{getSwapStatusBadge(decision)}</td>
                      <td>
                        <small>{decision.reason || 'N/A'}</small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
            
            <div className="d-flex justify-content-between align-items-center mt-3">
              <div>
                <small className="text-muted">
                  Showing {swapDecisions.length} of {pagination.total} records
                </small>
              </div>
              {renderPagination()}
            </div>
          </>
        )}
      </Card.Body>
    </Card>
  );
}

export default SwapDecisionHistory;
