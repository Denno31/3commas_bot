import React, { useState } from 'react';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import { sellToStablecoin } from '../api';

const SellToStablecoinModal = ({ show, onHide, bot, currentCoin, coinAmount, onSuccess }) => {
  const [amount, setAmount] = useState('');
  const [targetStablecoin, setTargetStablecoin] = useState(bot?.preferredStablecoin || 'USDT');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [useMaxAmount, setUseMaxAmount] = useState(false);

  // Reset form when modal is opened
  React.useEffect(() => {
    if (show) {
      setAmount('');
      setTargetStablecoin(bot?.preferredStablecoin || 'USDT');
      setError(null);
      setUseMaxAmount(false);
    }
  }, [show, bot]);

  // Handle amount change
  const handleAmountChange = (e) => {
    setUseMaxAmount(false);
    setAmount(e.target.value);
  };

  // Handle max amount toggle
  const handleMaxAmountToggle = () => {
    setUseMaxAmount(!useMaxAmount);
    if (!useMaxAmount) {
      setAmount('max');
    } else {
      setAmount('');
    }
  };

  // Handle sell action
  const handleSell = async () => {
    if (!amount && !useMaxAmount) {
      setError('Please enter an amount or select "Max"');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await sellToStablecoin(
        bot.id,
        currentCoin,
        useMaxAmount ? 'max' : amount,
        targetStablecoin
      );

      if (result.success) {
        onSuccess && onSuccess(result);
        onHide();
      } else {
        setError(result.message || 'Failed to sell to stablecoin');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while selling to stablecoin');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Sell {currentCoin} to Stablecoin</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Amount to Sell</Form.Label>
            <div className="d-flex align-items-center">
              <Form.Control
                type="number"
                placeholder="Enter amount"
                value={useMaxAmount ? '' : amount}
                onChange={handleAmountChange}
                disabled={useMaxAmount || isLoading}
              />
              <Button 
                variant={useMaxAmount ? "primary" : "outline-primary"}
                className="ms-2"
                onClick={handleMaxAmountToggle}
                disabled={isLoading}
              >
                Max
              </Button>
            </div>
            {coinAmount && (
              <Form.Text className="text-muted">
                Available: {coinAmount.toFixed(8)} {currentCoin}
              </Form.Text>
            )}
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Target Stablecoin</Form.Label>
            <Form.Select
              value={targetStablecoin}
              onChange={(e) => setTargetStablecoin(e.target.value)}
              disabled={isLoading}
            >
              <option value="USDT">USDT</option>
              <option value="USDC">USDC</option>
              <option value="BUSD">BUSD</option>
              <option value="DAI">DAI</option>
            </Form.Select>
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={isLoading}>
          Cancel
        </Button>
        <Button 
          variant="primary" 
          onClick={handleSell}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
                className="me-2"
              />
              Selling...
            </>
          ) : (
            <>Sell to {targetStablecoin}</>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default SellToStablecoinModal;
