import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Badge } from 'react-bootstrap';
import BotForm from './BotForm';
import BotDetails from './BotDetails';
import {
  fetchBots,
  createBot,
  updateBot,
  deleteBot,
  toggleBot
} from '../api';

function BotList() {
  const [bots, setBots] = useState([]);
  const [selectedBot, setSelectedBot] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editBot, setEditBot] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadBots();
  }, []);

  const loadBots = async () => {
    try {
      const data = await fetchBots();
      console.log(data)
      setBots(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching bots:', err);
      setError('Failed to load bots. Please try again.');
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

  return (
    <Container fluid>
      <Row className="mb-4">
        <Col>
          <Button variant="primary" onClick={() => setShowForm(true)}>
            <i className="bi bi-plus-circle me-2"></i>
            Create Bot
          </Button>
        </Col>
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
        {bots.length === 0 ? (
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
                style={{ cursor: 'pointer', transition: 'all 0.2s ease-in-out' }}
              >
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0 text-truncate" title={bot.name}>{bot.name}</h5>
                  <Badge bg={bot.enabled ? 'success' : 'secondary'} className="ms-2">
                    {bot.enabled ? 'Active' : 'Disabled'}
                  </Badge>
                </Card.Header>
                
                <Card.Body>
                  <div className="mb-3">
                    <small className="text-muted">Current Coin</small>
                    <h6>{bot.currentCoin || 'None'}</h6>
                  </div>
                  
                  <div className="mb-3">
                    <small className="text-muted">Trading Coins</small>
                    <div className="d-flex flex-wrap gap-1 mt-1">
                      {bot.coins.map(coin => (
                        <Badge key={coin} bg="light" text="dark" className="me-1 mb-1">{coin}</Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="row g-2">
                    <div className="col-6">
                      <small className="text-muted">Threshold</small>
                      <h6>{bot.thresholdPercentage}%</h6>
                    </div>
                    <div className="col-6">
                      <small className="text-muted">Check Interval</small>
                      <h6>{bot.checkInterval} mins</h6>
                    </div>
                  </div>

                  {bot.lastTrade && (
                    <div className="mt-3">
                      <small className="text-muted">Last Trade</small>
                      <div className="d-flex align-items-center">
                        <span className="me-1">{bot.lastTrade.fromCoin}</span>
                        <i className="bi bi-arrow-right mx-1 text-muted"></i>
                        <span>{bot.lastTrade.toCoin}</span>
                        <span className="ms-auto text-muted small">
                          {new Date(bot.lastTrade.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  )}
                </Card.Body>
                
                <Card.Footer className="bg-transparent">
                  <div className="d-flex justify-content-between">
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditBot(bot);
                      }}
                    >
                      <i className="bi bi-pencil me-1"></i> Edit
                    </Button>
                    <Button
                      variant={bot.enabled ? 'outline-secondary' : 'outline-success'}
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleBot(bot.id);
                      }}
                    >
                      <i className={`bi bi-${bot.enabled ? 'pause' : 'play'} me-1`}></i>
                      {bot.enabled ? 'Pause' : 'Start'}
                    </Button>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBot(bot.id);
                      }}
                    >
                      <i className="bi bi-trash me-1"></i> Delete
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
