import { sleep, fail } from 'k6';
import { apiPost, expect200 } from '../lib/helpers.js';
import { CONFIG, THRESHOLDS } from '../lib/config.js';
import { METRICS } from '../lib/metrics.js';

export const options = {
  vus: 3,
  duration: '15s',
  thresholds: THRESHOLDS
};

export function setup() {
  if (__ENV.ALLOW_WRITES !== 'true') {
      console.log('Skipping destructive write test. ALLOW_WRITES is not true.');
      return false;
  }
  if (!CONFIG.customerId || CONFIG.customerId.includes('00000000')) {
      if (__ENV.PERF_STRICT === 'true') {
          fail('Strict mode: Valid customer ID required for payment tests.');
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
    customer_id: CONFIG.customerId,
    amount: 10.50,
    method: 'cash'
  };

  const startTime = Date.now();
  const res = apiPost(CONFIG.paths.createPayment, payload, { type: 'write', endpoint: 'create_payment' });
  const latency = Date.now() - startTime;
  
  METRICS.paymentCreateDuration.add(latency);

  if (res.status === 409 || res.status === 400) {
      METRICS.stockConflictRate.add(1);
  } else {
      expect200(res, 'Payment Created');
  }

  sleep(1);
}
