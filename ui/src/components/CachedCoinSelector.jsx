import React, { useState, useEffect } from 'react';
import { Form, Spinner, Alert, ListGroup, Badge, Button } from 'react-bootstrap';
import { fetchCachedCoins } from '../api';

/**
 * CachedCoinSelector component for selecting coins from pre-generated cache of available trading pairs
 * 
 * @param {Object} props Component properties
 * @param {Function} props.onCoinSelect Callback when a coin is selected
 * @param {Array} props.selectedCoins Array of already selected coins (to exclude from options)
 */
const CachedCoinSelector = ({ onCoinSelect, selectedCoins = [] }) => {
  const [availableCoins, setAvailableCoins] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedBase, setSelectedBase] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch available coins on component mount
  useEffect(() => {
    fetchCoins();
  }, []);

  // Fetch coins from the cache
  const fetchCoins = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetchCachedCoins();
      
      if (response && response.success) {
        setAvailableCoins(response.data);
        // Auto-select first base currency
        if (response.data.baseCurrencies && response.data.baseCurrencies.length > 0) {
          setSelectedBase(response.data.baseCurrencies[0]);
        }
      } else {
        throw new Error(response?.message || 'Failed to fetch available coins');
      }
    } catch (err) {
      console.error('Error fetching cached coins:', err);
      setError('Failed to fetch available coins. Please make sure the coin extraction utility has been run.');
    } finally {
      setLoading(false);
    }
  };

  // Handle base currency selection
  const handleBaseChange = (e) => {
    setSelectedBase(e.target.value);
    setSearchTerm(''); // Reset search when changing base
  };

  // Filter coins based on search term
  const filteredCoins = () => {
    if (!availableCoins.coinsByBase || !selectedBase) return [];
    
    const coins = availableCoins.coinsByBase[selectedBase] || [];
    if (!searchTerm) return coins;
    
    return coins.filter(coin => 
      coin.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Check if a coin is already selected
  const isCoinSelected = (coin) => {
    return selectedCoins.includes(coin);
  };

  return (
    <div className="cached-coin-selector">
      {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
      
      {loading ? (
        <div className="text-center py-4">
          <Spinner animation="border" role="status" />
          <div className="mt-2">Loading available coins...</div>
        </div>
      ) : (
        <>
          <div className="mb-3">
            <Form.Group className="mb-3">
              <Form.Label>Base Currency</Form.Label>
              <Form.Select
                onChange={handleBaseChange}
                value={selectedBase}
              >
                <option value="">Select base currency</option>
                {availableCoins.baseCurrencies?.map(base => (
                  <option key={base} value={base}>
                    {base}
                  </option>
                ))}
              </Form.Select>
              <Form.Text className="text-muted">
                Select the base currency to filter available coins
              </Form.Text>
            </Form.Group>

            {selectedBase && (
              <Form.Group className="mb-3">
                <Form.Label>Search Coins</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Type to search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </Form.Group>
            )}
          </div>

          {selectedBase && (
            <div>
              <h5 className="mb-3">
                <i className="bi bi-coin"></i> Available Coins for {selectedBase} ({filteredCoins().length})
              </h5>
              
              {filteredCoins().length > 0 ? (
                <ListGroup className="coin-list">
                  {filteredCoins().map(coin => (
                    <ListGroup.Item 
                      key={coin}
                      className="d-flex justify-content-between align-items-center"
                    >
                      <div>
                        <Badge bg="secondary" className="me-2">{selectedBase}</Badge>
                        <strong>{coin}</strong>
                      </div>
                      <div>
                        <Button 
                          variant={isCoinSelected(coin) ? "outline-secondary" : "outline-primary"} 
                          size="sm"
                          onClick={() => onCoinSelect(coin)}
                          disabled={isCoinSelected(coin)}
                        >
                          {isCoinSelected(coin) ? 'Selected' : 'Select'}
                        </Button>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              ) : (
                <Alert variant="info">
                  {searchTerm ? 'No coins match your search' : 'No coins available for this base currency'}
                </Alert>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CachedCoinSelector;
