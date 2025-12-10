// API Configuration
// In production (Azure), this will use VITE_BACKEND_API_URL from environment
// In development, it falls back to localhost
export const API_BASE_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:5177';

console.log('Frontend API Base URL:', API_BASE_URL);
