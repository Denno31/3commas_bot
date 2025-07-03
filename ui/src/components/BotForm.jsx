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
    price_source: 'three_commas',
    preferred_stablecoin: 'USDT',
    allocation_percentage: '',
    manual_budget_amount: '',
    commission_rate: '0.2',
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
          // Convert array to comma-separated string if needed
          coins: Array.isArray(editBot.coins) ? editBot.coins.join(',') : editBot.coins,
          threshold_percentage: editBot.thresholdPercentage,
          check_interval: editBot.checkInterval,
          account_id: editBot.accountId,
          initial_coin: editBot.initialCoin || '',
          price_source: editBot.priceSource || 'three_commas',
          preferred_stablecoin: editBot.preferredStablecoin || 'USDT',
          allocation_percentage: editBot.allocationPercentage || '',
          manual_budget_amount: editBot.manualBudgetAmount || '',
          commission_rate: editBot.commissionRate || '0.2',
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
    console.log(formData)
    const errors = [];
    
    // Handle case when coins might be an array or string
    const coinsArray = Array.isArray(formData.coins) 
      ? formData.coins 
      : (typeof formData.coins === 'string' ? formData.coins.split(',').map(c => c.trim()) : []);
    
    if (!formData.name.match(/^[a-zA-Z0-9_-]+$/)) {
      errors.push('Bot name can only contain letters, numbers, underscores, and hyphens');
    }
    
    if (!coinsArray.every(coin => coin.match(/^[A-Z0-9]+$/))) {
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
    
    if (formData.initial_coin && !coinsArray.includes(formData.initial_coin)) {
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
      ...(editBot && { id: editBot.id }),
      ...formData,
      coins: Array.isArray(formData.coins) 
        ? formData.coins 
        : formData.coins.split(',').map(c => c.trim()),
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
        price_source: 'three_commas',
        preferred_stablecoin: 'USDT',
        allocation_percentage: '',
        manual_budget_amount: '',
        commission_rate: '0.2',
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
            <Form.Label>Price Source</Form.Label>
            <Form.Select
              value={formData.price_source}
              onChange={(e) => setFormData({ ...formData, price_source: e.target.value })}
            >
              <option value="three_commas">Three Commas</option>
              <option value="coingecko">CoinGecko</option>
            </Form.Select>
            <Form.Text className="text-muted">
              Will fall back to alternative source if primary source fails
            </Form.Text>
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>Preferred Stablecoin</Form.Label>
            <Form.Select
              value={formData.preferred_stablecoin}
              onChange={(e) => setFormData({ ...formData, preferred_stablecoin: e.target.value })}
            >
              <option value="USDT">USDT (Tether)</option>
              <option value="USDC">USDC (USD Coin)</option>
              <option value="BUSD">BUSD (Binance USD)</option>
              <option value="DAI">DAI</option>
              <option value="TUSD">TUSD (True USD)</option>
            </Form.Select>
            <Form.Text className="text-muted">
              Stablecoin used for valuation and allocation calculations
            </Form.Text>
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>Allocation Percentage (%)</Form.Label>
            <Form.Control
              type="number"
              step="1"
              min="0"
              max="100"
              placeholder="Percentage of account to allocate (0-100%)"
              value={formData.allocation_percentage}
              onChange={(e) => {
                // Clear manual budget when percentage is set
                if (e.target.value) {
                  setFormData({
                    ...formData,
                    allocation_percentage: e.target.value,
                    manual_budget_amount: ''
                  });
                } else {
                  setFormData({
                    ...formData,
                    allocation_percentage: e.target.value
                  });
                }
              }}
            />
            <Form.Text className="text-muted">
              Optional: Set a percentage of available funds to allocate
            </Form.Text>
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>Manual Budget Amount</Form.Label>
            <Form.Control
              type="number"
              step="0.01"
              min="0"
              placeholder={`Amount in ${formData.preferred_stablecoin}`}
              value={formData.manual_budget_amount}
              onChange={(e) => {
                // Clear percentage when manual budget is set
                if (e.target.value) {
                  setFormData({
                    ...formData,
                    manual_budget_amount: e.target.value,
                    allocation_percentage: ''
                  });
                } else {
                  setFormData({
                    ...formData,
                    manual_budget_amount: e.target.value
                  });
                }
              }}
            />
            <Form.Text className="text-muted">
              Optional: Set a specific budget amount in your preferred stablecoin
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Commission Rate (%)</Form.Label>
            <Form.Control
              type="number"
              step="0.01"
              min="0"
              max="10"
              placeholder="Commission rate percentage (e.g., 0.2 for 0.2%)"
              value={formData.commission_rate}
              onChange={(e) => setFormData({ ...formData, commission_rate: e.target.value })}
              required
            />
            <Form.Text className="text-muted">
              Exchange commission rate for trades (typically 0.1% to 0.5%)
            </Form.Text>
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
