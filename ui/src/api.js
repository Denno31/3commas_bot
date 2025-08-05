import { API_URL } from './config';

const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Network error' }));
    throw new Error(error.detail || 'Network error');
  }
  return response.json();
};

// Auth functions
export async function login(username, password) {
  // Use JSON format instead of FormData
  const response = await fetch(`${API_URL}/api/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Login failed');
  }

  const data = await response.json();
  localStorage.setItem('token', data.access_token);
  return data;
}

export async function register(email, username, password) {
  const response = await fetch(`${API_URL}/api/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, username, password })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Registration failed');
  }

  return response.json();
}

// Request a password reset email
export async function requestPasswordReset(email) {
  const response = await fetch(`${API_URL}/api/password-reset-request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to request password reset');
  }

  return response.json();
}

// Reset password with token
export async function resetPassword(token, password) {
  const response = await fetch(`${API_URL}/api/password-reset`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token, password })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Password reset failed');
  }

  return response.json();
}

export function logout() {
  localStorage.removeItem('token');
}

// Helper function to get auth header
function getAuthHeader() {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export const fetchBots = async () => {
  const response = await fetch(`${API_URL}/api/bots`, {
    headers: getAuthHeader()
  });
  return handleResponse(response);
};

export const createBot = async (bot) => {
  const response = await fetch(`${API_URL}/api/bots`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(bot)
  });
  return handleResponse(response);
};

export const updateBot = async (botId, bot) => {
  const response = await fetch(`${API_URL}/api/bots/${botId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(bot)
  });
  return handleResponse(response);
};

export const deleteBot = async (botId) => {
  const response = await fetch(`${API_URL}/api/bots/${botId}`, {
    method: 'DELETE',
    headers: getAuthHeader()
  });
  return handleResponse(response);
};

export const toggleBot = async (botId) => {
  const response = await fetch(`${API_URL}/api/bots/${botId}/toggle`, {
    method: 'POST',
    headers: getAuthHeader()
  });
  return handleResponse(response);
};

export const fetchBotPrices = async (botId, fromTime, toTime) => {
  const params = new URLSearchParams();
  if (fromTime) params.append('from_time', fromTime.toISOString());
  if (toTime) params.append('to_time', toTime.toISOString());
  
  const response = await fetch(`${API_URL}/api/bots/${botId}/prices?${params}`, {
    headers: getAuthHeader()
  });
  return handleResponse(response);
};

export const fetchBotTrades = async (botId, status, limit = 100) => {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  params.append('limit', limit);
  
  const response = await fetch(`${API_URL}/api/bots/${botId}/trades?${params}`, {
    headers: getAuthHeader()
  });
  return handleResponse(response);
};

export const fetchBotLogs = async (botId, level = null, limit = 100) => {
  const params = new URLSearchParams();
  if (level) params.append('level', level);
  if (limit) params.append('limit', limit);
  
  const response = await fetch(`${API_URL}/api/bots/${botId}/logs?${params}`, {
    headers: getAuthHeader()
  });
  if (!response.ok) {
    if (response.status === 401) {
      logout();
      throw new Error('Please login again');
    }
    throw new Error('Failed to fetch logs');
  }
  return response.json();
};

// New function for trade decision logs - filtered on the server for security
export const fetchTradeDecisionLogs = async (botId, limit = 100) => {
  const params = new URLSearchParams();
  if (limit) params.append('limit', limit);
  console.log(`${API_URL}/api/bots/${botId}/trade-decision-logs?${params}`)
  
  const response = await fetch(`${API_URL}/api/bots/${botId}/trade-decision-logs?${params}`, {
    headers: getAuthHeader()
  });
  if (!response.ok) {
    if (response.status === 401) {
      logout();
      throw new Error('Please login again');
    }
    throw new Error('Failed to fetch trade decision logs');
  }
  return response.json();
};

/**
 * Fetch swap decisions for a bot with pagination and filtering
 * @param {string} botId - ID of the bot to fetch swap decisions for
 * @param {Object} options - Optional parameters
 * @param {number} options.page - Page number for pagination
 * @param {number} options.limit - Number of records per page
 * @param {string} options.fromCoin - Filter by source coin
 * @param {string} options.toCoin - Filter by target coin
 * @param {boolean} options.swapPerformed - Filter by whether swap was performed
 * @param {Date|string} options.startDate - Start date for filtering
 * @param {Date|string} options.endDate - End date for filtering
 * @returns {Promise<Object>} - Swap decisions with pagination metadata
 */
export const fetchBotSwapDecisions = async (botId, options = {}) => {
  const params = new URLSearchParams();
  if (options.page) params.append('page', options.page);
  if (options.limit) params.append('limit', options.limit);
  if (options.fromCoin) params.append('fromCoin', options.fromCoin);
  if (options.toCoin) params.append('toCoin', options.toCoin);
  if (options.swapPerformed !== undefined) params.append('swapPerformed', options.swapPerformed);
  if (options.startDate) params.append('startDate', new Date(options.startDate).toISOString());
  if (options.endDate) params.append('endDate', new Date(options.endDate).toISOString());
  
  const response = await fetch(`${API_URL}/api/bots/${botId}/swap-decisions?${params}`, {
    headers: getAuthHeader()
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      logout();
      throw new Error('Please login again');
    }
    throw new Error('Failed to fetch swap decisions');
  }
  
  return response.json();
};

/**
 * Fetch relative coin deviation data for charting
 * @param {string} botId - ID of the bot to fetch deviations for
 * @param {Object} options - Optional parameters
 * @param {Date|string} options.from - Start date for data range
 * @param {Date|string} options.to - End date for data range
 * @param {string} options.baseCoin - Filter by base coin
 * @param {string} options.targetCoin - Filter by target coin
 * @returns {Promise<Object>} - Deviation data for charting
 */
export const fetchBotDeviations = async (botId, options = {}) => {
  const params = new URLSearchParams();
  if (options.from) params.append('from', new Date(options.from).toISOString());
  if (options.to) params.append('to', new Date(options.to).toISOString());
  if (options.baseCoin) params.append('baseCoin', options.baseCoin);
  if (options.targetCoin) params.append('targetCoin', options.targetCoin);
  
  const queryString = params.toString() ? `?${params.toString()}` : '';
  
  const response = await fetch(`${API_URL}/api/deviations/bots/${botId}${queryString}`, {
    headers: getAuthHeader()
  });
  

  if (!response.ok) {
    if (response.status === 401) {
      logout();
      throw new Error('Please login again');
    }
    throw new Error('Failed to fetch deviation data');
  }
  return response.json();
};

export const fetchBotState = async (botId) => {
  const response = await fetch(`${API_URL}/api/bots/${botId}/state`, {
    headers: getAuthHeader()
  });
  return handleResponse(response);
};

export const fetchAccounts = async () => {
  const response = await fetch(`${API_URL}/api/accounts`, {
    headers: getAuthHeader()
  });
  return handleResponse(response);
};

export const fetchSystemConfig = async () => {
  const response = await fetch(`${API_URL}/api/config/system`, {
    headers: getAuthHeader()
  });
  return handleResponse(response);
};

export const fetchRealTimePrice = async (coin, baseCoin = 'USDT') => {
  const response = await fetch(`${API_URL}/api/bots/price/${coin}?baseCoin=${baseCoin}`, {
    headers: getAuthHeader()
  });
  return handleResponse(response);
};

export const updateSystemConfig = async (config) => {
  console.log('configs here',config)
  const response = await fetch(`${API_URL}/api/config/system`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(config)
  });
  return handleResponse(response);
};

export const fetchApiConfigs = async () => {
  const response = await fetch(`${API_URL}/api/config/api`, {
    headers: getAuthHeader()
  });
  return handleResponse(response);
};

export const updateApiConfig = async (name, config) => {
  console.log('configs here',config,name)
  const response = await fetch(`${API_URL}/api/config/api/${name}`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(config)
  });
  return handleResponse(response);
};

export const downloadDatabaseBackup = async () => {
  const response = await fetch(`${API_URL}/api/database/backup`, {
    method: 'POST'
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Network error' }));
    throw new Error(error.detail || 'Network error');
  }
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = response.headers.get('Content-Disposition').split('filename=')[1];
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

/**
 * Fetch available coins from a 3Commas account
 * @param {string} accountId - ID of the 3Commas account
 * @returns {Promise<Array>} - List of available coins with balances
 */
export const fetchAvailableCoins = async (accountId) => {
  console.log('fetching coins',accountId)
  if (!accountId) {
    throw new Error('Account ID is required');
  }

  const response = await fetch(`${API_URL}/api/accounts/${accountId}/coins`, {
    headers: getAuthHeader()
  });
  
  return handleResponse(response);
};

/**
 * Fetch bot assets (holdings) for a bot
 * @param {string} botId - ID of the bot to fetch assets for
 * @returns {Promise<Object>} - Bot assets data
 */
export const fetchBotAssets = async (botId) => {
  const response = await fetch(`${API_URL}/api/bots/${botId}/assets`, {
    headers: getAuthHeader()
  });
  return handleResponse(response);
};

/**
 * Fetch cached available coins from server
 * @returns {Promise<Object>} - Available coins data grouped by base currency
 */
export const fetchCachedCoins = async () => {
  const response = await fetch(`${API_URL}/api/coins/available`, {
    headers: getAuthHeader()
  });
  const data = await handleResponse(response)
  console.log(data)
  return data;
};

/**
 * Fetch price comparison between initial snapshot and current prices
 * @param {string} botId - ID of the bot
 * @returns {Promise<Object>} - Price comparison data with initial and current prices
 */
export const fetchPriceComparison = async (botId) => {
  const response = await fetch(`${API_URL}/api/snapshots/bots/${botId}/price-comparison`, {
    headers: getAuthHeader()
  });
  return handleResponse(response);
};

/**
 * Fetch historical price data with snapshot reference points
 * @param {string} botId - ID of the bot
 * @param {Object} options - Optional parameters
 * @param {Date} options.fromTime - Start date for data range
 * @param {Date} options.toTime - End date for data range
 * @param {string} options.coin - Filter by coin
 * @returns {Promise<Object>} - Historical price data with snapshot reference
 */
export const fetchHistoricalComparison = async (botId, options = {}) => {
  const params = new URLSearchParams();
  if (options.fromTime) params.append('from_time', options.fromTime.toISOString());
  if (options.toTime) params.append('to_time', options.toTime.toISOString());
  if (options.coin) params.append('coin', options.coin);
  
  const queryString = params.toString() ? `?${params.toString()}` : '';
  
  const response = await fetch(`${API_URL}/api/snapshots/bots/${botId}/historical-comparison${queryString}`, {
    headers: getAuthHeader()
  });
  return handleResponse(response);
};

/**
 * Sell coin units to a stablecoin (USDC/USDT)
 * @param {string} botId - ID of the bot
 * @param {string} fromCoin - Coin to sell
 * @param {string|number} amount - Amount to sell (use 'max' for all available)
 * @param {string} targetStablecoin - Target stablecoin (USDC/USDT)
 * @returns {Promise<Object>} - Trade result
 */
export const sellToStablecoin = async (botId, fromCoin, amount, targetStablecoin) => {
  const response = await fetch(`${API_URL}/api/trades/sell-to-stablecoin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify({
      botId,
      fromCoin,
      amount,
      targetStablecoin
    })
  });
  return handleResponse(response);
};

/**
 * Reset a bot to its initial state
 * @param {string} botId - ID of the bot to reset
 * @param {Object} options - Reset options
 * @param {string} options.resetType - Type of reset ('soft' or 'hard')
 * @param {boolean} options.sellToStablecoin - Whether to sell to stablecoin before reset
 * @returns {Promise<Object>} - The updated bot
 */
export function resetBot(botId, options = {}) {
  return fetch(`${API_URL}/api/bots/${botId}/reset`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(options)
  })
  .then(handleResponse);
}
