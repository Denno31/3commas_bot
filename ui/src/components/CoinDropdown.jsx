import React, { useState, useEffect } from 'react';
import { Form, Spinner } from 'react-bootstrap';
import { fetchCachedCoins } from '../api';

/**
 * CoinDropdown component for selecting coins from pre-generated cache
 * 
 * @param {Object} props Component properties
 * @param {Function} props.onChange Callback when a coin is selected
 * @param {string} props.value Current selected value
 * @param {string} props.baseCoin Base coin filter
 */
const CoinDropdown = ({ onChange, value, baseCoin }) => {
  const [availableCoins, setAvailableCoins] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [coins, setCoins] = useState([]);

  // Fetch available coins on component mount
  useEffect(() => {
    fetchCoins();
  }, []);

  // Update filtered coins when base coin changes
  useEffect(() => {
    if (availableCoins.coinsByBase && baseCoin && availableCoins.coinsByBase[baseCoin]) {
      setCoins(availableCoins.coinsByBase[baseCoin] || []);
    } else if (availableCoins.allCoins) {
      // If no base coin specified, show all coins
      setCoins(availableCoins.allCoins || []);
    }
  }, [baseCoin, availableCoins]);

  // Fetch coins from the cache
  const fetchCoins = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetchCachedCoins();
      
      if (response && response.success) {
        setAvailableCoins(response.data);
        
        // If base coin is specified, filter coins
        if (baseCoin && response.data.coinsByBase && response.data.coinsByBase[baseCoin]) {
          setCoins(response.data.coinsByBase[baseCoin] || []);
        } else {
          // Otherwise, show all available coins
          setCoins(response.data.allCoins || []);
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

  return (
    <Form.Select
      value={value || ''}
      onChange={onChange}
      disabled={loading}
    >
      <option value="">Select a coin</option>
      {coins.map(coin => (
        <option key={coin} value={coin}>
          {coin}
        </option>
      ))}
    </Form.Select>
  );
};

export default CoinDropdown;
