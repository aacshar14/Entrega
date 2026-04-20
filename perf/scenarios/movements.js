import { sleep, fail } from 'k6';
import { apiPost, expect200 } from '../lib/helpers.js';
import { CONFIG, THRESHOLDS } from '../lib/config.js';
import { METRICS } from '../lib/metrics.js';

export const options = {
  vus: 5,
  duration: '20s',
  thresholds: THRESHOLDS
};

export function setup() {
  if (__ENV.ALLOW_WRITES !== 'true') {
      console.log('Skipping destructive write test. ALLOW_WRITES is not true.');
      return false;
  }
  if (!CONFIG.productId || CONFIG.productId.includes('00000000')) {
      if (__ENV.PERF_STRICT === 'true') {
          fail('Strict mode: Valid product ID required for write tests.');
      }
      return false;
  }
  return true;
}

export default function(canRun) {
  if (!canRun) {
      sleep(1);
      return; 
  }

  const payload = {
    product_id: CONFIG.productId,
    quantity: 1,
    type: 'adjustment',
    description: 'perf-test-write'
  };

  const startTime = Date.now();
  const res = apiPost(CONFIG.paths.createMovement, payload, { type: 'write', endpoint: 'manual_movement' });
  const latency = Date.now() - startTime;
  
  METRICS.movementCreateDuration.add(latency);

  if (res.status === 409 || res.status === 400) {
      METRICS.stockConflictRate.add(1);
  } else {
      expect200(res, 'Movement Created');
  }

  sleep(1);
}
