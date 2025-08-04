import React, { useState } from 'react';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import { resetBot } from '../api';

function ResetBotModal({ show, onHide, bot, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [resetType, setResetType] = useState('soft');
  const [sellToStablecoin, setSellToStablecoin] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await resetBot(bot.id, { resetType, sellToStablecoin });
      onSuccess();
      onHide();
    } catch (err) {
      console.error('Error resetting bot:', err);
      setError(err.message || 'Failed to reset bot. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={loading ? null : onHide} centered>
      <Modal.Header closeButton={!loading}>
        <Modal.Title className="d-flex align-items-center">
          <i className="bi bi-arrow-counterclockwise me-2 text-danger"></i>
          Reset Bot
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
          </Alert>
        )}
        
        <Alert variant="warning" className="d-flex">
          <i className="bi bi-exclamation-triangle-fill me-2 fs-4"></i>
          <div>
            <strong>Warning:</strong> Resetting a bot will clear its current state, including global peak values and protection settings. 
            This action cannot be undone.
          </div>
        </Alert>

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Reset Type</Form.Label>
            <Form.Select 
              value={resetType} 
              onChange={(e) => setResetType(e.target.value)}
              disabled={loading}
            >
              <option value="soft">Soft Reset (Keep current coin)</option>
              <option value="hard">Hard Reset (Return to initial coin)</option>
            </Form.Select>
            <Form.Text className="text-muted">
              A soft reset maintains the current coin but resets state values. 
              A hard reset returns to the initial coin configuration.
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Check 
              type="checkbox"
              id="sell-to-stablecoin"
              label={`Sell all assets to ${bot.preferredStablecoin || 'USDT'} before reset`}
              checked={sellToStablecoin}
              onChange={(e) => setSellToStablecoin(e.target.checked)}
              disabled={loading}
            />
            <Form.Text className="text-muted">
              This will execute a market sell of all current assets to your preferred stablecoin.
            </Form.Text>
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={loading}>
          Cancel
        </Button>
        <Button 
          variant="danger" 
          onClick={handleSubmit} 
          disabled={loading}
        >
          {loading ? (
            <>
              <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
              Resetting...
            </>
          ) : (
            'Reset Bot'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default ResetBotModal;
