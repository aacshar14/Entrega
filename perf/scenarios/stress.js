import { sleep } from 'k6';
import { apiGet, expect200 } from '../lib/helpers.js';
import { CONFIG, THRESHOLDS } from '../lib/config.js';

const isHard = __ENV.STRESS_MODE === 'hard';

export const options = {
  stages: isHard ? [
    { duration: '30s', target: 50 },
    { duration: '1m', target: 100 },
    { duration: '30s', target: 0 },
  ] : [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 30 },
    { duration: '30s', target: 0 },
  ],
  thresholds: Object.assign({}, THRESHOLDS, {
    'http_req_failed': isHard ? ['rate<0.10'] : ['rate<0.05'], // Relaxed failure bounds for stress
  })
};

export default function() {
  const res = apiGet(CONFIG.paths.dashboard, { type: 'read', endpoint: 'dashboard_stress' });
  expect200(res, 'Dashboard Read (Stress)');
  sleep(0.5);
}
