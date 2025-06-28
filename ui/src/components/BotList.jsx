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

      <Row>
        <Col md={12}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Bot List</h5>
            </Card.Header>
            <Card.Body className="p-0">
              <Table hover responsive>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Coins</th>
                    <th>Threshold</th>
                    <th>Interval</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bots.map((bot) => (
                    <tr key={bot.id} onClick={() => setSelectedBot(bot)} style={{ cursor: 'pointer' }}>
                      <td>{bot.name}</td>
                      <td>
                        <Badge bg={bot.enabled ? 'success' : 'secondary'}>
                          {bot.enabled ? 'Active' : 'Disabled'}
                        </Badge>
                      </td>
                      <td>{bot.coins.join(', ')}</td>
                      <td>{bot.thresholdPercentage}%</td>
                      <td>{bot.checkInterval}mins</td>
                      <td>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="me-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditBot(bot);
                          }}
                        >
                          <i className="bi bi-pencil"></i>
                        </Button>
                        <Button
                          variant={bot.enabled ? 'outline-secondary' : 'outline-success'}
                          size="sm"
                          className="me-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleBot(bot.id);
                          }}
                        >
                          <i className={`bi bi-${bot.enabled ? 'pause' : 'play'}`}></i>
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteBot(bot.id);
                          }}
                        >
                          <i className="bi bi-trash"></i>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>

        {selectedBot && (
          <BotDetails
            bot={selectedBot}
            onClose={() => setSelectedBot(null)}
          />
        )}
      </Row>
    </Container>
  );
}

export default BotList;
