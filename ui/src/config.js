// Use environment variable in production, fallback to localhost in development
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
