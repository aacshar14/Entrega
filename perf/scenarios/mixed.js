import { sleep } from 'k6';
import dashboard from './dashboard.js';
import webhook from './webhook.js';
import payments from './payments.js';
import { THRESHOLDS } from '../lib/config.js';

export const options = {
  scenarios: {
    dashboard_readers: {
      executor: 'constant-vus',
      exec: 'dashboardExec',
      vus: 10,
      duration: '45s',
    },
    webhook_callers: {
      executor: 'constant-vus',
      exec: 'webhookExec',
      vus: 15,
      duration: '45s',
    },
    payment_writers: {
      executor: 'constant-vus',
      exec: 'paymentsExec',
      vus: 3,
      duration: '45s',
    }
  },
  thresholds: THRESHOLDS
};

export function dashboardExec() {
  dashboard();
}

export function webhookExec() {
  webhook();
}

export function paymentsExec() {
  payments();
}
