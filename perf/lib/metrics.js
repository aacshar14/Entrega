import { Rate, Trend, Counter } from 'k6/metrics';

export const METRICS = {
  stockConflictRate: new Rate('stock_conflict_rate'),
  webhookAcceptedTotal: new Counter('webhook_accepted_total'),
  webhookRejectedTotal: new Counter('webhook_rejected_total'),
  movementCreateDuration: new Trend('movement_create_duration', true),
  paymentCreateDuration: new Trend('payment_create_duration', true)
};
