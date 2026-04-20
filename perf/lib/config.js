export const getEnv = (key, defaultVal = undefined) => {
  const val = __ENV[key];
  if (val === undefined && defaultVal === undefined) {
    if (__ENV.PERF_STRICT === 'true') {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return '';
  }
  return val || defaultVal;
};

export const CONFIG = {
  baseUrl: getEnv('PERF_BASE_URL', 'https://api.entrega.space'),
  apiToken: getEnv('PERF_API_TOKEN', ''),
  tenantId: getEnv('PERF_TENANT_ID', ''),
  customerId: getEnv('PERF_CUSTOMER_ID', '00000000-0000-0000-0000-000000000000'),
  productId: getEnv('PERF_PRODUCT_ID', '00000000-0000-0000-0000-000000000000'),
  webhookSecret: getEnv('PERF_WEBHOOK_SECRET', ''), // Required to sign payloads dynamically if active
  
  paths: {
    webhook: getEnv('PERF_WEBHOOK_PATH', '/api/v1/webhooks/whatsapp'),
    stock: getEnv('PERF_STOCK_PATH', '/api/v1/stock/'),
    movements: getEnv('PERF_MOVEMENTS_PATH', '/api/v1/movements/'),
    dashboard: getEnv('PERF_DASHBOARD_PATH', '/api/v1/dashboard/'),
    createMovement: getEnv('PERF_CREATE_MOVEMENT_PATH', '/api/v1/movements/manual'),
    createPayment: getEnv('PERF_CREATE_PAYMENT_PATH', '/api/v1/payments/'),
    health: getEnv('PERF_HEALTH_PATH', '/api/v1/health')
  }
};

export const THRESHOLDS = {
  'http_req_failed': ['rate<0.01'], // Global < 1% error rate
  'checks': ['rate>0.99'],          // Global > 99% check pass rate
  
  // Tag-based latency enforcement
  'http_req_duration{type:read}': ['p(95)<800', 'p(99)<1500'],
  'http_req_duration{type:write}': ['p(95)<1200', 'p(99)<2000'],
  'http_req_duration{type:webhook}': ['p(95)<1200', 'p(99)<2000'],
};
