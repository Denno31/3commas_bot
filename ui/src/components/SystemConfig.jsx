import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Alert, Row, Col, Spinner } from 'react-bootstrap';
import {
  fetchSystemConfig,
  updateSystemConfig,
  fetchApiConfigs,
  updateApiConfig,
  downloadDatabaseBackup
} from '../api';

function SystemConfig() {
  const [systemConfig, setSystemConfig] = useState({
    pricing_source: '3commas',
    fallback_source: 'coingecko',
    update_interval: 1,
    websocket_enabled: true,
    analytics_enabled: true,
    analytics_save_interval: 60
  });

  const [apiConfigs, setApiConfigs] = useState({
    '3commas': {
      api_key: '',
      api_secret: '',
      mode: 'paper'
    }
  });

  console.log({apiConfigs})
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      const [sysConfig, apiConfig] = await Promise.all([
        fetchSystemConfig(),
        fetchApiConfigs()
      ]);
      setSystemConfig(sysConfig);
      setApiConfigs(apiConfig || {
        '3commas': {
          api_key: '',
          api_secret: '',
          mode: 'paper'
        }
      });
      setMessage(null);
      setError(null);
    } catch (err) {
      console.error('Error loading configurations:', err);
      setMessage({ type: 'danger', text: 'Failed to load configurations. Please try again.' });
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSystemConfigSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateSystemConfig(systemConfig);
      setMessage({ type: 'success', text: 'System configuration updated successfully' });
    } catch (err) {
      console.error('Error updating system config:', err);
      setMessage({ type: 'danger', text: 'Failed to update system configuration' });
    }
  };

  const handleApiConfigSubmit = async (e) => {
    e.preventDefault();
    try {
      const config = apiConfigs['3commas'];
      await updateApiConfig('3commas', {
        api_key: config.api_key,
        api_secret: config.api_secret,
        mode: config.mode || 'paper'
      });
      setMessage({ type: 'success', text: 'API configuration updated successfully' });
    } catch (err) {
      console.error('Error updating API config:', err);
      setMessage({ type: 'danger', text: 'Failed to update API configuration' });
    }
  };

  const handleBackupDatabase = async () => {
    try {
      await downloadDatabaseBackup();
      setMessage({ type: 'success', text: 'Database backup downloaded successfully' });
    } catch (err) {
      console.error('Error downloading backup:', err);
      setMessage({ type: 'danger', text: 'Failed to download database backup' });
    }
  };

  if (loading) {
    return (
      <div className="text-center p-4">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <div className="mb-4">
      {message && (
        <Alert variant={message.type} onClose={() => setMessage(null)} dismissible>
          {message.text}
        </Alert>
      )}

      <Card className="mb-4">
        <Card.Body>
          <Card.Title>System Configuration</Card.Title>
          <Form onSubmit={handleSystemConfigSubmit}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Primary Price Source</Form.Label>
                  <Form.Select
                    value={systemConfig.pricing_source}
                    onChange={e => setSystemConfig({ ...systemConfig, pricing_source: e.target.value })}
                  >
                    <option value="3commas">3Commas</option>
                    <option value="coingecko">CoinGecko</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Fallback Price Source</Form.Label>
                  <Form.Select
                    value={systemConfig.fallback_source}
                    onChange={e => setSystemConfig({ ...systemConfig, fallback_source: e.target.value })}
                  >
                    <option value="coingecko">CoinGecko</option>
                    <option value="3commas">3Commas</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Update Interval (minutes)</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    value={systemConfig.update_interval}
                    onChange={e => setSystemConfig({ ...systemConfig, update_interval: parseInt(e.target.value) })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Analytics Save Interval (minutes)</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    value={systemConfig.analytics_save_interval}
                    onChange={e => setSystemConfig({ ...systemConfig, analytics_save_interval: parseInt(e.target.value) })}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Check
                    type="switch"
                    label="Enable WebSocket Updates"
                    checked={systemConfig.websocket_enabled}
                    onChange={e => setSystemConfig({ ...systemConfig, websocket_enabled: e.target.checked })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Check
                    type="switch"
                    label="Enable Analytics"
                    checked={systemConfig.analytics_enabled}
                    onChange={e => setSystemConfig({ ...systemConfig, analytics_enabled: e.target.checked })}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Button type="submit" variant="primary">
              <i className="bi bi-save me-2"></i>
              Save System Configuration
            </Button>
          </Form>
        </Card.Body>
      </Card>

      <Card className="mb-4">
        <Card.Body>
          <Card.Title>API Configuration</Card.Title>
          <Form onSubmit={handleApiConfigSubmit}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>3Commas API Key</Form.Label>
                  <Form.Control
                    type="password"
                    value={apiConfigs['3commas']?.api_key}
                    onChange={e => setApiConfigs({
                      ...apiConfigs,
                      '3commas': { ...apiConfigs['3commas'], api_key: e.target.value }
                    })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>3Commas API Secret</Form.Label>
                  <Form.Control
                    type="password"
                    value={apiConfigs['3commas']?.api_secret}
                    onChange={e => setApiConfigs({
                      ...apiConfigs,
                      '3commas': { ...apiConfigs['3commas'], api_secret: e.target.value }
                    })}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Trading Mode</Form.Label>
              <Form.Select
                value={apiConfigs['3commas']?.mode}
                onChange={e => setApiConfigs({
                  ...apiConfigs,
                  '3commas': { ...apiConfigs['3commas'], mode: e.target.value }
                })}
              >
                <option value="paper">Paper Trading</option>
                <option value="real">Real Trading</option>
              </Form.Select>
            </Form.Group>

            <Button type="submit" variant="primary">
              <i className="bi bi-key me-2"></i>
              Save API Configuration
            </Button>
          </Form>
        </Card.Body>
      </Card>

      <Card>
        <Card.Body>
          <Card.Title>Database Management</Card.Title>
          <Button variant="secondary" onClick={handleBackupDatabase}>
            <i className="bi bi-download me-2"></i>
            Download Database Backup
          </Button>
        </Card.Body>
      </Card>
    </div>
  );
};

export default SystemConfig;
