import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const apiDuration = new Trend('api_duration');

export const options = {
  stages: [
    { duration: '1m', target: 10 },
    { duration: '3m', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '2m', target: 50 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    errors: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3000';
let authToken = '';

function login() {
  const res = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: 'admin@navira.app',
    password: 'Admin@123',
  }), { headers: { 'Content-Type': 'application/json' } });

  check(res, { 'login successful': (r) => r.status === 200 });
  if (res.status === 200) {
    const body = JSON.parse(res.body as string);
    authToken = body.data?.accessToken || body.accessToken || '';
  }
}

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authToken}`,
  };
}

export default function () {
  if (!authToken) login();

  const scenarios = [
    { name: 'GET /api/bookings', fn: () => http.get(`${BASE_URL}/api/bookings?limit=20`, { headers: getHeaders() }) },
    { name: 'GET /api/trips', fn: () => http.get(`${BASE_URL}/api/trips?limit=20`, { headers: getHeaders() }) },
    { name: 'GET /api/fleet/vehicles', fn: () => http.get(`${BASE_URL}/api/fleet/vehicles?limit=20`, { headers: getHeaders() }) },
    { name: 'GET /api/dashboard/kpi', fn: () => http.get(`${BASE_URL}/api/dashboard/kpi`, { headers: getHeaders() }) },
    { name: 'GET /api/employees', fn: () => http.get(`${BASE_URL}/api/employees?limit=20`, { headers: getHeaders() }) },
    { name: 'GET /api/routes', fn: () => http.get(`${BASE_URL}/api/routes?limit=20`, { headers: getHeaders() }) },
    { name: 'GET /api/vendors', fn: () => http.get(`${BASE_URL}/api/vendors?limit=20`, { headers: getHeaders() }) },
  ];

  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  const start = Date.now();
  const res = scenario.fn();
  const duration = Date.now() - start;

  apiDuration.add(duration);

  check(res, {
    [`${scenario.name} - status 200`]: (r) => r.status === 200,
    [`${scenario.name} - response < 500ms`]: (r) => r.timings.duration < 500,
  });

  errorRate.add(res.status !== 200 ? 1 : 0);

  sleep(Math.random() * 2 + 1);
}

export function setup() {
  console.log(`Starting load test against ${BASE_URL}`);
}

export function teardown(data) {
  console.log('Load test completed');
}
