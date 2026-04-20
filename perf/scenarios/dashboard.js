import { sleep } from 'k6';
import { apiGet, expect200 } from '../lib/helpers.js';
import { CONFIG, THRESHOLDS } from '../lib/config.js';

export const options = {
  vus: 15,
  duration: '45s',
  thresholds: THRESHOLDS
};

export default function() {
  const dashRes = apiGet(CONFIG.paths.dashboard, { type: 'read', endpoint: 'dashboard_full' });
  expect200(dashRes, 'Dashboard Summary');
  
  sleep(0.3);

  const stockRes = apiGet(CONFIG.paths.stock, { type: 'read', endpoint: 'stock_list' });
  expect200(stockRes, 'Stock List');

  sleep(0.3);

  const listRes = apiGet(CONFIG.paths.movements, { type: 'read', endpoint: 'movements_list' });
  expect200(listRes, 'Movements List');

  sleep(2);
}
