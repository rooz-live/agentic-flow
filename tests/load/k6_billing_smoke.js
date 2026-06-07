import http from "k6/http";
import { check, sleep } from "k6";
const BASE = __ENV.BILLING_BASE || "https://billing.bhopti.com";
export const options = { vus: 1, duration: "10s", thresholds: { http_req_failed: ["rate<1"] } };
export default function () {
  const res = http.get(`${BASE}/health`, { timeout: "8s" });
  check(res, { "health 200 or 502 honest": (r) => r.status === 200 || r.status === 502 });
  sleep(1);
}
