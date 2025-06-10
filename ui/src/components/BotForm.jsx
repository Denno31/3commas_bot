import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Alert } from 'react-bootstrap';
import { fetchAccounts as fetchAccountsApi } from '../api';

const BotForm = ({ show, onHide, onSubmit, editBot = null }) => {
  const [formData, setFormData] = useState({
    name: '',
    coins: '',
    threshold_percentage: '',
    check_interval: '',
    account_id: '',
    initial_coin: '',
    enabled: true
  });

  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (show) {
      fetchAccounts();
      if (editBot) {
        setFormData({
          name: editBot.name,
          coins: editBot.coins,
          threshold_percentage: editBot.threshold_percentage,
          check_interval: editBot.check_interval,
          account_id: editBot.account_id,
          initial_coin: editBot.initial_coin || '',
          enabled: editBot.enabled
        });
      }
    }
  }, [show, editBot]);

  const fetchAccounts = async () => {
    try {
      const data = await fetchAccountsApi();
      setAccounts(Array.isArray(data) ? data : []);
      setError(null);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      setError('Failed to load trading accounts');
      setAccounts([]);
    }
  };

  const validateForm = () => {
    const errors = [];
    if (!formData.name.match(/^[a-zA-Z0-9_-]+$/)) {
      errors.push('Bot name can only contain letters, numbers, underscores, and hyphens');
    }
    if (!formData.coins.split(',').every(coin => coin.trim().match(/^[A-Z0-9]+$/))) {
      errors.push('Coins must be uppercase letters and numbers only');
    }
    if (formData.threshold_percentage < 0.1 || formData.threshold_percentage > 100) {
      errors.push('Threshold must be between 0.1 and 100');
    }
    if (formData.check_interval < 1 || formData.check_interval > 1440) {
      errors.push('Check interval must be between 1 and 1440 minutes');
    }
    if (!formData.account_id) {
      errors.push('Trading account is required');
    }
    if (formData.initial_coin && !formData.coins.split(',').includes(formData.initial_coin)) {
      errors.push('Initial coin must be one of the trading pairs');
    }
    return errors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError(validationErrors.join('\n'));
      return;
    }

    const processedData = {
      ...formData,
      coins: formData.coins.split(',').map(c => c.trim()),
      threshold_percentage: parseFloat(formData.threshold_percentage),
      check_interval: parseInt(formData.check_interval),
      account_id: formData.account_id.toString()
    };

    onSubmit(processedData);
    if (!editBot) {
      setFormData({
        name: '',
        coins: '',
        threshold_percentage: '',
        check_interval: '',
        account_id: '',
        initial_coin: '',
        enabled: true
      });
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{editBot ? 'Edit Bot' : 'Create New Bot'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <Alert variant="danger" className="mb-3">
            <pre className="mb-0">{error}</pre>
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Bot Name</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter bot name (letters, numbers, underscores, hyphens)"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={!!editBot}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Trading Account</Form.Label>
            <Form.Select
              value={formData.account_id}
              onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
              required
            >
              <option value="">Select a trading account</option>
              {accounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.type})
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Trading Pairs</Form.Label>
            <Form.Control
              type="text"
              placeholder="BTC,ETH,USDT (comma-separated)"
              value={formData.coins}
              onChange={(e) => setFormData({ ...formData, coins: e.target.value.toUpperCase() })}
              required
            />
            <Form.Text className="text-muted">
              Enter comma-separated list of coins (e.g., BTC,ETH,USDT)
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Initial Coin</Form.Label>
            <Form.Control
              type="text"
              placeholder="Initial coin (optional)"
              value={formData.initial_coin}
              onChange={(e) => setFormData({ ...formData, initial_coin: e.target.value.toUpperCase() })}
            />
            <Form.Text className="text-muted">
              Must be one of the trading pairs above
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Threshold Percentage</Form.Label>
            <Form.Control
              type="number"
              step="0.1"
              min="0.1"
              max="100"
              placeholder="Enter threshold percentage (0.1-100)"
              value={formData.threshold_percentage}
              onChange={(e) => setFormData({ ...formData, threshold_percentage: e.target.value })}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Check Interval (minutes)</Form.Label>
            <Form.Control
              type="number"
              min="1"
              max="1440"
              placeholder="Enter check interval (1-1440)"
              value={formData.check_interval}
              onChange={(e) => setFormData({ ...formData, check_interval: e.target.value })}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Check
              type="switch"
              label="Enable bot after creation"
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
            />
          </Form.Group>

          <div className="d-flex justify-content-end gap-2">
            <Button variant="secondary" onClick={onHide}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editBot ? 'Save Changes' : 'Create Bot'}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default BotForm;
