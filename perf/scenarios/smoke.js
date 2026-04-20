import { apiGet, expect200 } from '../lib/helpers.js';
import { CONFIG, THRESHOLDS } from '../lib/config.js';

export const options = {
  vus: 1,
  duration: '10s',
  thresholds: THRESHOLDS
};

export default function() {
  const res = apiGet(CONFIG.paths.health, { type: 'read', endpoint: 'health' });
  expect200(res, 'Health Check');
  
  if (CONFIG.apiToken && CONFIG.tenantId) {
      const dbRes = apiGet(CONFIG.paths.dashboard, { type: 'read', endpoint: 'dashboard_smoke' });
      expect200(dbRes, 'Dashboard Auth Check');
  }
}
