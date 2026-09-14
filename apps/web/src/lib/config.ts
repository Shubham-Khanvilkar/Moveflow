const _raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
export const API_URL = _raw.replace(/\/api\/?$/, '');
