import React, { useState, useEffect } from 'react';
import { Form, Spinner, Table, Badge, Alert, Button } from 'react-bootstrap';
import axios from 'axios';
import { API_URL } from '../config';

/**
 * CoinSelector component for selecting coins from 3Commas accounts
 * 
 * @param {Object} props Component properties
 * @param {Function} props.onCoinSelect Callback when a coin is selected
 * @param {number} props.accountId Account ID to fetch coins for (if already selected)
 * @param {Array} props.selectedCoins Array of already selected coins (to exclude from options)
 * @param {string} props.apiBaseUrl Optional override for API base URL
 */
const CoinSelector = ({ 
  onCoinSelect, 
  accountId, 
  selectedCoins = [], 
  apiBaseUrl = `${API_URL}/api`
}) => {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(accountId || null);
  const [coins, setCoins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Fetch accounts on component mount
  useEffect(() => {
    if (!accountId) {
      fetchAccounts();
    } else {
      setSelectedAccount(accountId);
      fetchCoins(accountId);
    }
  }, [accountId]);
  
  // Fetch 3Commas accounts
  const fetchAccounts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(`${apiBaseUrl}/coins/accounts`);
      
      if (response.data && response.data.success) {
        setAccounts(response.data.data || []);
        
        // If only one account, auto-select it
        if (response.data.data.length === 1) {
          setSelectedAccount(response.data.data[0].id);
          fetchCoins(response.data.data[0].id);
        }
      } else {
        throw new Error(response.data?.message || 'Failed to fetch accounts');
      }
    } catch (err) {
      console.error('Error fetching accounts:', err);
      setError('Failed to fetch accounts. Please check your 3Commas API configuration.');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch coins for a specific account
  const fetchCoins = async (accId) => {
    if (!accId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(`${apiBaseUrl}/coins/accounts/${accId}`);
      
      if (response.data && response.data.success) {
        setCoins(response.data.data || []);
      } else {
        throw new Error(response.data?.message || 'Failed to fetch coins');
      }
    } catch (err) {
      console.error('Error fetching coins:', err);
      setError('Failed to fetch coins. Please check your 3Commas API configuration.');
      setCoins([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle account selection
  const handleAccountChange = (e) => {
    const accId = e.target.value;
    setSelectedAccount(accId);
    fetchCoins(accId);
  };
  
  // Filter out already selected coins
  const availableCoins = coins.filter(
    coin => !selectedCoins.includes(coin.coin)
  );
  
  // Sort coins by USD value
  const sortedCoins = [...availableCoins].sort((a, b) => b.amountInUsd - a.amountInUsd);
  
  return (
    <div className="coin-selector">
      {!accountId && (
        <Form.Group className="mb-3">
          <Form.Label>Select 3Commas Account</Form.Label>
          <Form.Select
            onChange={handleAccountChange}
            disabled={loading && !coins.length}
            value={selectedAccount || ''}
          >
            <option value="">Select a trading account</option>
            {accounts.map(account => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.exchange_name})
              </option>
            ))}
          </Form.Select>
        </Form.Group>
      )}
      
      {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
      
      {loading && !coins.length ? (
        <div className="text-center py-4">
          <Spinner animation="border" role="status" />
          <div className="mt-2">Loading available coins...</div>
        </div>
      ) : (
        <>
          {selectedAccount && sortedCoins.length > 0 ? (
            <div>
              <h5 className="mb-3">
                <i className="bi bi-wallet"></i> Available Coins ({sortedCoins.length})
              </h5>
              
              <Table hover size="sm" responsive>
                <thead>
                  <tr>
                    <th>Coin</th>
                    <th>Balance</th>
                    <th>USD Value</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCoins.map(coin => (
                    <tr key={coin.coin}>
                      <td>
                        <strong>{coin.coin}</strong>
                        <div><small className="text-muted">{coin.name}</small></div>
                      </td>
                      <td>
                        {coin.amount.toLocaleString(undefined, { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 8 
                        })}
                      </td>
                      <td>
                        <Badge bg="primary">
                          ${coin.amountInUsd.toLocaleString(undefined, { 
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: 2 
                          })}
                        </Badge>
                      </td>
                      <td>
                        <Button 
                          variant="outline-primary" 
                          size="sm"
                          onClick={() => onCoinSelect(coin.coin)}
                        >
                          Select
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : selectedAccount && (
            <Alert variant="info">
              No coins found in this account
            </Alert>
          )}
        </>
      )}
    </div>
  );
};

export default CoinSelector;
