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

export const updateSystemConfig = async (config) => {
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
  const response = await fetch(`${API_URL}/api/config/api?name=${name}`, {
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
