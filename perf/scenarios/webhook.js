import { sleep, fail } from 'k6';
import { apiPost, expect200 } from '../lib/helpers.js';
import { CONFIG, THRESHOLDS } from '../lib/config.js';
import { METRICS } from '../lib/metrics.js';

export const options = {
  vus: 10,
  duration: '30s',
  thresholds: THRESHOLDS
};

export function setup() {
  if (__ENV.PERF_STRICT === 'true' && !CONFIG.webhookSecret) {
      fail('Strict mode enabled: Webhook Secret is missing. Cannot simulate valid Meta Webhooks.');
  }
}

export default function() {
  const payload = {
    object: 'whatsapp_business_account',
    entry: [{
      id: 'perf-entry',
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: { phone_number_id: '123456789_perf' },
          messages: [{
            from: '1234567890_perf',
            id: `wamid_perf_${__ITER}_${__VU}`,
            text: { body: 'Quiero pedir 2 pasteles' },
            type: 'text'
          }]
        },
        field: 'messages'
      }]
    }]
  };

  const res = apiPost(CONFIG.paths.webhook, payload, { type: 'webhook', endpoint: 'whatsapp_webhook' }, true);
  
  if (expect200(res, 'Webhook Ingestion')) {
      METRICS.webhookAcceptedTotal.add(1);
  } else {
      METRICS.webhookRejectedTotal.add(1);
  }
  
  sleep(1);
}
