import { API_URL } from './config';

const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Network error' }));
    throw new Error(error.detail || 'Network error');
  }
  return response.json();
};

export const fetchBots = async () => {
  const response = await fetch(`${API_URL}/api/bots`);
  return handleResponse(response);
};

export const createBot = async (bot) => {
  const response = await fetch(`${API_URL}/api/bots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bot)
  });
  return handleResponse(response);
};

export const updateBot = async (botId, bot) => {
  const response = await fetch(`${API_URL}/api/bots/${botId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bot)
  });
  return handleResponse(response);
};

export const deleteBot = async (botId) => {
  const response = await fetch(`${API_URL}/api/bots/${botId}`, {
    method: 'DELETE'
  });
  return handleResponse(response);
};

export const toggleBot = async (botId) => {
  const response = await fetch(`${API_URL}/api/bots/${botId}/toggle`, {
    method: 'POST'
  });
  return handleResponse(response);
};

export const fetchBotPrices = async (botId, fromTime, toTime) => {
  const params = new URLSearchParams();
  if (fromTime) params.append('from_time', fromTime.toISOString());
  if (toTime) params.append('to_time', toTime.toISOString());
  
  const response = await fetch(`${API_URL}/api/bots/${botId}/prices?${params}`);
  return handleResponse(response);
};

export const fetchBotTrades = async (botId, status, limit = 100) => {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  params.append('limit', limit);
  
  const response = await fetch(`${API_URL}/api/bots/${botId}/trades?${params}`);
  return handleResponse(response);
};

export const fetchBotLogs = async (botId, level = null, limit = 100) => {
  const params = new URLSearchParams();
  if (level) params.append('level', level);
  if (limit) params.append('limit', limit);
  
  const response = await fetch(`${API_URL}/api/bots/${botId}/logs?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch logs: ${response.statusText}`);
  }
  return response.json();
};

export const fetchBotState = async (botId) => {
  const response = await fetch(`${API_URL}/api/bots/${botId}/state`);
  return handleResponse(response);
};

export const fetchAccounts = async () => {
  const response = await fetch(`${API_URL}/api/accounts`);
  return handleResponse(response);
};

export const fetchSystemConfig = async () => {
  const response = await fetch(`${API_URL}/api/config/system`);
  return handleResponse(response);
};

export const updateSystemConfig = async (config) => {
  const response = await fetch(`${API_URL}/api/config/system`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });
  return handleResponse(response);
};

export const fetchApiConfigs = async () => {
  const response = await fetch(`${API_URL}/api/config/api`);
  return handleResponse(response);
};

export const updateApiConfig = async (name, config) => {
  const response = await fetch(`${API_URL}/api/config/api?name=${name}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
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
