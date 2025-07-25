import React, { useState, useEffect } from 'react';
import { Card, Form, Row, Col, Button, InputGroup, Alert } from 'react-bootstrap';
import { fetchBotDeviations } from '../api';

/**
 * Calculator component for computing price deviations between cryptocurrency pairs
 */
const DeviationCalculator = ({ botId }) => {
  // State for selected coins and prices
  const [baseCoin, setBaseCoin] = useState('');
  const [targetCoin, setTargetCoin] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [calculatedDeviation, setCalculatedDeviation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Available coins and latest prices
  const [availableCoins, setAvailableCoins] = useState([]);
  const [latestPrices, setLatestPrices] = useState({});
  
  // Load coins and prices when botId changes
  useEffect(() => {
    const loadCoinData = async () => {
      if (!botId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Get the latest data from the past 24 hours
        const options = {
          from: new Date(Date.now() - 24 * 60 * 60 * 1000),
          to: new Date()
        };
        
        const result = await fetchBotDeviations(botId, options);
        
        if (result.success) {
          setAvailableCoins(result.coins);
          
          // Extract the latest prices from timeSeriesData
          const extractedPrices = {};
          Object.entries(result.timeSeriesData).forEach(([pairKey, dataPoints]) => {
            if (dataPoints.length > 0) {
              // Get the most recent data point
              const latest = dataPoints[dataPoints.length - 1];
              const { baseCoin, targetCoin, basePrice, targetPrice } = latest;
              
              // Initialize baseCoin entry if needed
              if (!extractedPrices[baseCoin]) {
                extractedPrices[baseCoin] = {};
              }
              
              // Store price data
              extractedPrices[baseCoin][targetCoin] = { basePrice, targetPrice };
            }
          });
          
          setLatestPrices(extractedPrices);
          
          // Set default coins if available
          if (result.coins.length >= 2) {
            setBaseCoin(result.coins[0]);
            setTargetCoin(result.coins[1]);
          }
        } else {
          setError('Failed to load coin data');
        }
      } catch (err) {
        console.error('Error loading coin data:', err);
        setError(err.message || 'Failed to load coin data');
      } finally {
        setLoading(false);
      }
    };
    
    loadCoinData();
  }, [botId]);
  
  // Update prices when coins change
  useEffect(() => {
    if (baseCoin && targetCoin && latestPrices[baseCoin]?.[targetCoin]) {
      const priceData = latestPrices[baseCoin][targetCoin];
      setBasePrice(priceData.basePrice.toString());
      setTargetPrice(priceData.targetPrice.toString());
    } else {
      // Reset prices if we don't have data for this pair
      setBasePrice('');
      setTargetPrice('');
      setCalculatedDeviation(null);
    }
  }, [baseCoin, targetCoin, latestPrices]);
  
  // Calculate deviation when prices change
  useEffect(() => {
    if (basePrice && targetPrice) {
      const baseVal = parseFloat(basePrice);
      const targetVal = parseFloat(targetPrice);
      
      if (baseVal > 0 && targetVal > 0) {
        try {
          // Calculate current deviation
          if (latestPrices[baseCoin]?.[targetCoin]) {
            const originalBasePrice = latestPrices[baseCoin][targetCoin].basePrice;
            const originalTargetPrice = latestPrices[baseCoin][targetCoin].targetPrice;
            
            // Deviation formula from the project
            // ((target_price / base_price) / (original_target_price / original_base_price) - 1) * 100
            const currentRatio = targetVal / baseVal;
            const originalRatio = originalTargetPrice / originalBasePrice;
            const deviation = ((currentRatio / originalRatio) - 1) * 100;
            
            setCalculatedDeviation(deviation);
            setError(null);
          }
        } catch (err) {
          console.error('Error calculating deviation:', err);
          setError('Error calculating deviation. Please check your inputs.');
          setCalculatedDeviation(null);
        }
      } else {
        setCalculatedDeviation(null);
      }
    } else {
      setCalculatedDeviation(null);
    }
  }, [basePrice, targetPrice, baseCoin, targetCoin, latestPrices]);
  
  // Reset to current market prices
  const handleReset = () => {
    if (baseCoin && targetCoin && latestPrices[baseCoin]?.[targetCoin]) {
      const priceData = latestPrices[baseCoin][targetCoin];
      setBasePrice(priceData.basePrice.toString());
      setTargetPrice(priceData.targetPrice.toString());
    }
  };
  
  // Format price for display
  const formatPrice = (price) => {
    const numPrice = parseFloat(price);
    if (isNaN(numPrice)) return 'N/A';
    
    // Format based on magnitude
    if (numPrice < 0.01) return numPrice.toFixed(6);
    if (numPrice < 1) return numPrice.toFixed(4);
    if (numPrice < 1000) return numPrice.toFixed(2);
    return numPrice.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };
  
  // Format deviation value
  const formatDeviation = (value) => {
    if (value === null || isNaN(value)) return 'N/A';
    const formattedValue = value.toFixed(2);
    return `${value > 0 ? '+' : ''}${formattedValue}%`;
  };

  // Handle input changes
  const handleBasePriceChange = (e) => {
    setBasePrice(e.target.value);
  };
  
  const handleTargetPriceChange = (e) => {
    setTargetPrice(e.target.value);
  };
  
  const handleBaseCoinChange = (e) => {
    setBaseCoin(e.target.value);
  };
  
  const handleTargetCoinChange = (e) => {
    setTargetCoin(e.target.value);
  };
  
  // Get target coin options based on selected base coin
  const getTargetCoinOptions = () => {
    if (!baseCoin) return availableCoins;
    return availableCoins.filter(coin => coin !== baseCoin);
  };
  
  // Determine if the deviation is positive or negative
  const isPositiveDeviation = calculatedDeviation !== null && calculatedDeviation > 0;
  const isNegativeDeviation = calculatedDeviation !== null && calculatedDeviation < 0;
  
  return (
    <Card className="mb-4">
      <Card.Header>
        <h5 className="mb-0">Deviation Calculator</h5>
      </Card.Header>
      <Card.Body>
        {error && (
          <Alert variant="danger" className="mb-3">{error}</Alert>
        )}
        
        <Form>
          <Row className="mb-3">
            <Col md={6}>
              <Form.Group controlId="baseCoin">
                <Form.Label>Base Coin</Form.Label>
                <Form.Select 
                  value={baseCoin}
                  onChange={handleBaseCoinChange}
                  disabled={loading || availableCoins.length === 0}
                >
                  <option value="">Select Base Coin</option>
                  {availableCoins.map(coin => (
                    <option key={coin} value={coin}>{coin}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group controlId="targetCoin">
                <Form.Label>Target Coin</Form.Label>
                <Form.Select 
                  value={targetCoin}
                  onChange={handleTargetCoinChange}
                  disabled={loading || !baseCoin || availableCoins.length === 0}
                >
                  <option value="">Select Target Coin</option>
                  {getTargetCoinOptions().map(coin => (
                    <option key={coin} value={coin}>{coin}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
          
          {baseCoin && targetCoin && (
            <>
              <Row className="mb-3">
                <Col md={6}>
                  <Form.Group controlId="basePrice">
                    <Form.Label>Base Price ({baseCoin})</Form.Label>
                    <InputGroup>
                      <Form.Control
                        type="number"
                        step="any"
                        min="0"
                        value={basePrice}
                        onChange={handleBasePriceChange}
                        placeholder="Enter base price"
                      />
                    </InputGroup>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="targetPrice">
                    <Form.Label>Target Price ({targetCoin})</Form.Label>
                    <InputGroup>
                      <Form.Control
                        type="number"
                        step="any"
                        min="0"
                        value={targetPrice}
                        onChange={handleTargetPriceChange}
                        placeholder="Enter target price"
                      />
                    </InputGroup>
                  </Form.Group>
                </Col>
              </Row>
              
              <Row className="mb-3">
                <Col className="text-center">
                  <Button 
                    variant="outline-secondary"
                    onClick={handleReset}
                    disabled={loading}
                    className="mt-2"
                  >
                    Reset to Current Prices
                  </Button>
                </Col>
              </Row>
              
              {calculatedDeviation !== null && (
                <Row className="mt-4">
                  <Col className="text-center">
                    <h4>Calculated Deviation</h4>
                    <h2 className={isPositiveDeviation ? 'text-success' : isNegativeDeviation ? 'text-danger' : ''}>
                      {formatDeviation(calculatedDeviation)}
                    </h2>
                    
                    <div className="mt-3">
                      {isPositiveDeviation ? (
                        <div className="text-success">
                          <i className="bi bi-arrow-up-right me-1"></i>
                          {targetCoin} is outperforming {baseCoin}
                        </div>
                      ) : isNegativeDeviation ? (
                        <div className="text-danger">
                          <i className="bi bi-arrow-down-right me-1"></i>
                          {targetCoin} is underperforming {baseCoin}
                        </div>
                      ) : null}
                    </div>
                  </Col>
                </Row>
              )}
            </>
          )}
        </Form>
        
        <Card.Text className="text-muted mt-4 small">
          <i className="bi bi-info-circle me-1"></i>
          This calculator helps you understand how price changes affect the relative performance between two coins.
          Enter hypothetical prices to see what the deviation would be compared to current market prices.
        </Card.Text>
      </Card.Body>
    </Card>
  );
};

export default DeviationCalculator;
