.PHONY: perf-smoke perf-baseline perf-stress perf-dashboard perf-webhook perf-mixed perf-payments

perf-smoke:
	k6 run perf/scenarios/smoke.js

perf-baseline:
	k6 run perf/scenarios/baseline.js

perf-stress:
	k6 run perf/scenarios/stress.js

perf-stress-hard:
	STRESS_MODE=hard k6 run perf/scenarios/stress.js

perf-dashboard:
	k6 run perf/scenarios/dashboard.js

perf-webhook:
	k6 run perf/scenarios/webhook.js

perf-payments:
	k6 run perf/scenarios/payments.js

perf-mixed:
	k6 run perf/scenarios/mixed.js
