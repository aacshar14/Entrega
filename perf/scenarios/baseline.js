import { sleep } from 'k6';
import { apiGet, expect200 } from '../lib/helpers.js';
import { CONFIG, THRESHOLDS } from '../lib/config.js';

export const options = {
  vus: 5,
  duration: '30s',
  thresholds: THRESHOLDS
};

export default function() {
  const resDash = apiGet(CONFIG.paths.dashboard, { type: 'read', endpoint: 'dashboard' });
  expect200(resDash, 'Dashboard Baseline Read');

  const resMov = apiGet(CONFIG.paths.movements, { type: 'read', endpoint: 'movements' });
  expect200(resMov, 'Movements Baseline Read');

  const resStock = apiGet(CONFIG.paths.stock, { type: 'read', endpoint: 'stock' });
  expect200(resStock, 'Stock Baseline Read');

  sleep(1);
}
