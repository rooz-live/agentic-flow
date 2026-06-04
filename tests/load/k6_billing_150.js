import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

const BASE_URL = __ENV.BILLING_API_HOST || "http://localhost:8000";

export const failedRequests = new Rate("failed_requests");

export const options = {
  stages: [
    { duration: "10s", target: 150 }, // ramp-up to 150 VUs (150% capacity)
    { duration: "30s", target: 150 }, // hold at 150 VUs
    { duration: "10s", target: 0 },   // ramp-down to 0
  ],
  thresholds: {
    http_req_duration: ["p(95)<200"],
    failed_requests: ["rate<0.01"], // custom failure rate threshold
  },
};

function randomUUID() {
  // RFC-4122 v4 UUID (no crypto dependency required in k6)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function () {
  const headers = { "Content-Type": "application/json" };

  // GET /health
  const healthRes = http.get(`${BASE_URL}/health`);
  const healthOk = check(healthRes, {
    "health status 200": (r) => r.status === 200,
    "health response time < 200ms": (r) => r.timings.duration < 200,
  });
  failedRequests.add(!healthOk);

  // GET /api/v1/rates/{uuid}
  const technicianId = randomUUID();
  const rateRes = http.get(`${BASE_URL}/api/v1/rates/${technicianId}`);
  const rateOk = check(rateRes, {
    "rate status 200 or 404": (r) => r.status === 200 || r.status === 404,
    "rate response time < 200ms": (r) => r.timings.duration < 200,
  });
  failedRequests.add(!rateOk);

  // POST /api/v1/events
  const eventPayload = JSON.stringify({
    event_type: "clock_in",
    entity_uuid: randomUUID(),
    timestamp: new Date().toISOString(),
    payload: {
      location: "36.1234,-78.5678",
    },
  });
  const eventRes = http.post(`${BASE_URL}/api/v1/events`, eventPayload, {
    headers,
  });
  const eventOk = check(eventRes, {
    "event status 200 or 201": (r) => r.status === 200 || r.status === 201,
    "event response time < 200ms": (r) => r.timings.duration < 200,
  });
  failedRequests.add(!eventOk);

  sleep(1);
}
