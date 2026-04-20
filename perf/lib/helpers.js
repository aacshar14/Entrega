import http from 'k6/http';
import { check } from 'k6';
import crypto from 'k6/crypto';
import { CONFIG } from './config.js';

export function getHeaders(additionalArgs = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  
  if (CONFIG.apiToken) {
    headers['Authorization'] = `Bearer ${CONFIG.apiToken}`;
  }
  if (CONFIG.tenantId) {
    headers['x-tenant-id'] = CONFIG.tenantId;
  }
  
  return Object.assign(headers, additionalArgs);
}

export function buildWebhookSignature(payloadStr) {
  if (!CONFIG.webhookSecret) return '';
  const hasher = crypto.createHMAC('sha256', CONFIG.webhookSecret);
  hasher.update(payloadStr);
  return `sha256=${hasher.digest('hex')}`;
}

export function apiGet(endpoint, tags = {}) {
  const url = `${CONFIG.baseUrl.replace(/\/$/, '')}${endpoint}`;
  const res = http.get(url, { headers: getHeaders(), tags });
  return res;
}

export function apiPost(endpoint, payload, tags = {}, isSignedWebhook = false) {
  const url = `${CONFIG.baseUrl.replace(/\/$/, '')}${endpoint}`;
  const payloadStr = JSON.stringify(payload);
  
  const headersObj = getHeaders();
  if (isSignedWebhook && CONFIG.webhookSecret) {
      headersObj['X-Hub-Signature-256'] = buildWebhookSignature(payloadStr);
  }

  const res = http.post(url, payloadStr, { headers: headersObj, tags });
  return res;
}

export function expect200(res, actionName) {
  return check(res, {
    [`${actionName} returned 200`]: (r) => r.status === 200 || r.status === 201 || r.status === 202
  });
}
