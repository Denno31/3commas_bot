import React, { useState, useEffect } from 'react';
import { Form, Button, Spinner, Badge, InputGroup, Row, Col } from 'react-bootstrap';
import { fetchCachedCoins } from '../api';

/**
 * Component that lets users select coins from cached data
 * and adds them to a comma-separated list
 * 
 * @param {Object} props Component properties
 * @param {string} props.value Current comma-separated coin list
 * @param {Function} props.onChange Function to call when list changes
 */
const CoinListSelector = ({ value, onChange }) => {
  const [availableCoins, setAvailableCoins] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedBase, setSelectedBase] = useState('');
  const [availableBases, setAvailableBases] = useState([]);
  const [filteredCoins, setFilteredCoins] = useState([]);
  
  // Track which coins are already selected in the comma-separated list
  const selectedCoins = value ? value.split(',').map(c => c.trim()) : [];
  
  // Fetch available coins on component mount
  useEffect(() => {
    fetchCoins();
  }, []);
  
  // Update filtered coins when base changes
  useEffect(() => {
    if (availableCoins.pairsByBase && selectedBase) {
      setFilteredCoins(availableCoins.pairsByBase[selectedBase] || []);
    }
  }, [selectedBase, availableCoins]);
  
  // Fetch coins from the cache
  const fetchCoins = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetchCachedCoins();
      
      if (response && response.success) {
        setAvailableCoins(response.data);
        
        // Get all available base currencies from the pairsByBase keys
        if (response.data.pairsByBase) {
          const baseCoins = Object.keys(response.data.pairsByBase);
          setAvailableBases(baseCoins);
          if (baseCoins.length > 0) {
            setSelectedBase(baseCoins[0]);
          }
        }
      } else {
        throw new Error(response?.message || 'Failed to fetch available coins');
      }
    } catch (err) {
      console.error('Error fetching cached coins:', err);
      setError('Failed to load coin options');
    } finally {
      setLoading(false);
    }
  };
  
  // Add a coin to the comma-separated list
  const addCoin = (coin) => {
    if (!selectedCoins.includes(coin)) {
      const newList = [...selectedCoins, coin].join(',');
      onChange(newList);
    }
  };
  
  // Remove a coin from the comma-separated list
  const removeCoin = (coin) => {
    const newList = selectedCoins.filter(c => c !== coin).join(',');
    onChange(newList);
  };

  if (loading) {
    return <div className="text-center my-3"><Spinner animation="border" size="sm" /> Loading coins...</div>;
  }

  if (error) {
    return <div className="text-danger my-2">{error}</div>;
  }

  return (
    <div>
      <Row className="mb-3">
        <Col>
          <Form.Label>Available Coins</Form.Label>
          <div className="border rounded p-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
            <div className="d-flex flex-wrap gap-1">
              {filteredCoins.map(coin => {
                const isSelected = selectedCoins.includes(coin);
                return (
                  <Button
                    key={coin}
                    size="sm"
                    variant={isSelected ? "primary" : "outline-secondary"}
                    className="mb-1"
                    onClick={() => isSelected ? removeCoin(coin) : addCoin(coin)}
                    disabled={isSelected}
                  >
                    {coin}
                  </Button>
                );
              })}
            </div>
          </div>
        </Col>
      </Row>

      {selectedCoins.length > 0 && (
        <div className="selected-coins mb-3">
          <Form.Label>Selected Coins</Form.Label>
          <div className="d-flex flex-wrap gap-2">
            {selectedCoins.map(coin => (
              <Badge 
                key={coin} 
                bg="primary" 
                className="p-2 me-1 mb-1 d-flex align-items-center"
              >
                {coin}
                <Button
                  variant="primary"
                  size="sm"
                  className="ms-1 p-0 px-1 py-0 d-flex align-items-center"
                  style={{ fontSize: '0.65rem', lineHeight: 1 }}
                  onClick={() => removeCoin(coin)}
                >
                  ×
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CoinListSelector;
