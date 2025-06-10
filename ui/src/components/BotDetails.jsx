import React, { useState, useEffect } from 'react';
import { Card, Button, Nav, Tab } from 'react-bootstrap';
import PriceHistory from './PriceHistory';
import TradeHistory from './TradeHistory';
import { fetchBotState } from '../api';

function BotDetails({ bot, onClose }) {
  const [state, setState] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadBotState();
    const interval = setInterval(loadBotState, 30000);
    return () => clearInterval(interval);
  }, [bot.id]);

  const loadBotState = async () => {
    try {
      const data = await fetchBotState(bot.id);
      setState(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching bot state:', err);
      setError('Failed to load bot state');
    }
  };

  return (
    <Card className="mb-4">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Bot Details: {bot.name}</h5>
        <Button variant="outline-secondary" size="sm" onClick={onClose}>
          <i className="bi bi-x-lg"></i>
        </Button>
      </Card.Header>
      <Card.Body>
        {error && (
          <div className="alert alert-danger mb-4">{error}</div>
        )}

        <div className="mb-4">
          <h6>Current State</h6>
          {state ? (
            <div>
              <p className="mb-2">
                <strong>Current Coin:</strong>{' '}
                {state.current_coin || 'Not holding any coin'}
              </p>
              <p className="mb-2">
                <strong>Last Check:</strong>{' '}
                {state.last_check_time ? (
                  new Date(state.last_check_time).toLocaleString()
                ) : (
                  'Never'
                )}
              </p>
              <p className="mb-0">
                <strong>Active Trade:</strong>{' '}
                {state.active_trade_id || 'None'}
              </p>
            </div>
          ) : (
            <div className="alert alert-info">No state available</div>
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

export default BotDetails;
