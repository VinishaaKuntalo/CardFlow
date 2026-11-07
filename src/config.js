// Auto-detect production vs local environment
// In production (Render/Railway/Vercel/etc), relative URLs ('/api') are used.
// In local development, port 5001 is used.
export const API_BASE = (typeof window !== 'undefined' && window.location.hostname !== 'localhost')
  ? ''
  : 'http://localhost:5001';
