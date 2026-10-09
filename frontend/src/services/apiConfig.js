/**
 * Central API Base URL Resolver
 * 
 * In development, defaults to '/api' so requests route through Vite's dev proxy
 * (which proxies to http://localhost:5000). This guarantees that both desktop localhost
 * and mobile phones accessing via the laptop's LAN IP (http://192.168.x.x:5173) connect
 * seamlessly without hardcoding any IP address.
 * 
 * Can be overridden anytime via VITE_API_URL in .env.
 */
export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' ? '/api' : 'http://localhost:5000/api');
