import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Badge, Table, Form, InputGroup } from 'react-bootstrap';
import './BotsListPage.css';
import { fetchBots as apiFetchBots } from '../../api';

const BotsListPage = ({ onViewBot, onNewBot }) => {
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  
  useEffect(() => {
    fetchBotsData();
  }, []);
  
  const fetchBotsData = async () => {
    try {
      setLoading(true);
      const botsData = await apiFetchBots();
      setBots(botsData || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching bots:', error);
      setBots([]);
      setLoading(false);
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
      
      <Card>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-3">Loading bots...</p>
            </div>
          ) : filteredBots.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-robot fs-1 text-muted"></i>
              <p className="mt-3">No bots found. Create a new bot to get started.</p>
              <Button variant="primary" onClick={onNewBot}>
                <i className="bi bi-plus-circle me-2"></i>
                New Bot
              </Button>
            </div>
          ) : (
            <Table responsive hover className="bots-table mb-0">
              <thead>
                <tr>
                  <th className="clickable" onClick={() => handleSort('name')}>
                    Bot Name {renderSortIcon('name')}
                  </th>
                  <th className="clickable" onClick={() => handleSort('status')}>
                    Status {renderSortIcon('status')}
                  </th>
                  <th className="clickable" onClick={() => handleSort('exchange')}>
                    Exchange {renderSortIcon('exchange')}
                  </th>
                  <th className="clickable" onClick={() => handleSort('currentCoin')}>
                    Current Coin {renderSortIcon('currentCoin')}
                  </th>
                  <th className="clickable" onClick={() => handleSort('currentValue')}>
                    Value (USDT) {renderSortIcon('currentValue')}
                  </th>
                  <th className="clickable" onClick={() => handleSort('lastTrade')}>
                    Last Trade {renderSortIcon('lastTrade')}
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBots.map(bot => (
                  <tr key={bot.id} onClick={() => onViewBot(bot.id)} className="bot-row">
                    <td>
                      <div className="d-flex align-items-center">
                        <div className="bot-icon me-2">
                          <i className="bi bi-robot"></i>
                        </div>
                        <div>
                          {bot.name}
                          <div className="small text-muted">ID: {bot.id}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge 
                        bg="light" 
                        text="dark" 
                        className={`status-badge ${getBotStatusClass(bot.status)}`}
                      >
                        {bot.status}
                      </Badge>
                    </td>
                    <td>{bot.exchange}</td>
                    <td>
                      {bot.currentCoin}
                      {bot.balance && (
                        <Badge bg="secondary" className="ms-2">
                          {bot.balance}
                        </Badge>
                      )}
                    </td>
                    <td>${bot.currentValue?.toLocaleString() || 'N/A'}</td>
                    <td>{bot.lastTrade ? new Date(bot.lastTrade).toLocaleString() : 'Never'}</td>
                    <td>
                      <div className="d-flex">
                        <Button 
                          variant="outline-primary" 
                          size="sm" 
                          className="me-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewBot(bot.id);
                          }}
                        >
                          <i className="bi bi-eye"></i>
                        </Button>
                        <Button 
                          variant={bot.status === 'active' ? 'outline-danger' : 'outline-success'} 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Toggle bot status
                          }}
                        >
                          <i className={`bi bi-${bot.status === 'active' ? 'stop-fill' : 'play-fill'}`}></i>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default BotsListPage;
