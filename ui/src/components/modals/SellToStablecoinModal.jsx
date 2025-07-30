import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import { sellToStablecoin } from '../../api';
import './SellToStablecoinModal.css';

/**
 * Modal component for selling coin units to a stablecoin
 */
const SellToStablecoinModal = ({ show, onHide, bot, coin, onSuccess }) => {
  const [amount, setAmount] = useState('');
  const [targetStablecoin, setTargetStablecoin] = useState('USDT');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [maxAmount, setMaxAmount] = useState(0);
  
  // Get the maximum available amount for the selected coin
  useEffect(() => {
    if (bot && coin) {
      // Check both coin and symbol properties since API data might use either
      const coinAsset = bot.assets?.find(asset => 
        (asset.coin === coin) || (asset.symbol === coin)
      );
      
      if (coinAsset) {
        setMaxAmount(coinAsset.balance || 0);
      } else {
        setMaxAmount(0);
      }
    }
  }, [bot, coin]);
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      // Convert amount to number if not 'max'
      const amountValue = amount === 'max' ? 'max' : parseFloat(amount);
      
      // Get the bot ID - handle both id and _id formats from API
      const botId = bot.id || bot._id;
      
      if (!botId) {
        throw new Error('Bot ID not found');
      }
      
      console.log('Selling to stablecoin:', {
        botId,
        coin,
        amount: amountValue,
        targetStablecoin
      });
      
      // Call API to sell to stablecoin
      const result = await sellToStablecoin(
        botId,
        coin,
        amountValue,
        targetStablecoin
      );
      
      // Handle success
      setLoading(false);
      if (onSuccess) {
        onSuccess(result);
      }
      onHide();
    } catch (err) {
      console.error('Error selling to stablecoin:', err);
      setLoading(false);
      setError(err.message || 'Failed to sell to stablecoin');
    }
  };
  
  // Handle max button click
  const handleMaxClick = () => {
    setAmount('max');
  };
  
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Sell {coin} to Stablecoin</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
          </Alert>
        )}
        
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>From Coin</Form.Label>
            <Form.Control
              type="text"
              value={coin || ''}
              disabled
            />
            <Form.Text className="text-muted">
              Available: {maxAmount} {coin}
            </Form.Text>
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>Amount</Form.Label>
            <div className="d-flex align-items-center">
              <Form.Control
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                required
              />
              <Button 
                variant="outline-secondary" 
                size="sm" 
                onClick={handleMaxClick}
                className="ms-2 btn-max"
              >
                MAX
              </Button>
            </div>
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>Target Stablecoin</Form.Label>
            <div>
              <div 
                className={`stablecoin-option ${targetStablecoin === 'USDT' ? 'selected' : ''}`}
                onClick={() => setTargetStablecoin('USDT')}
              >
                <div className="stablecoin-icon">T</div>
                <div className="stablecoin-details">
                  <div className="stablecoin-name">USDT (Tether)</div>
                  <div className="stablecoin-description">Most widely used stablecoin with high liquidity</div>
                </div>
              </div>
              
              <div 
                className={`stablecoin-option ${targetStablecoin === 'USDC' ? 'selected' : ''}`}
                onClick={() => setTargetStablecoin('USDC')}
              >
                <div className="stablecoin-icon">C</div>
                <div className="stablecoin-details">
                  <div className="stablecoin-name">USDC (USD Coin)</div>
                  <div className="stablecoin-description">Fully regulated stablecoin with transparent reserves</div>
                </div>
              </div>
            </div>
          </Form.Group>
          
          <div className="d-flex justify-content-end mt-4">
            <Button variant="secondary" onClick={onHide} className="me-2">
              Cancel
            </Button>
            <Button 
              variant="primary" 
              type="submit"
              disabled={loading || !amount}
            >
              {loading ? (
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
                `Sell to ${targetStablecoin}`
              )}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default SellToStablecoinModal;
