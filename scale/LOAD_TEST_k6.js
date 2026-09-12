// RIZVI FOMS — Load Test Script (k6)
// -----------------------------------------------------------------
// এটা রান করার আগে অ্যাপটা কোথাও (Cloud Run / server) লাইভ ডিপ্লয় করা
// থাকতে হবে। আমি (Claude) এই স্ক্রিপ্ট এখনো রান করিনি — sandbox-এ ইন্টারনেট
// অ্যাক্সেস বন্ধ, এবং কোনো লাইভ URL নেই। তাই এটা এখনো একটা "verified load
// test result" না, শুধু deploy করার পর আপনি নিজে চালানোর জন্য প্রস্তুত টুল।
//
// চালানোর নিয়ম:
//   1) https://k6.io/docs/get-started/installation/ থেকে k6 ইনস্টল করুন
//   2) BASE_URL এবং একটা বৈধ EMPLOYEE_CODE/PASSWORD বসান (env var দিয়ে)
//   3) রান করুন:
//        k6 run -e BASE_URL=https://your-api-url -e EMP_CODE=xxx -e EMP_PASS=xxx scale/LOAD_TEST_k6.js
//
// এই স্ক্রিপ্ট backend/routes/auth.js, backend/routes/enterprise.js (live-stats),
// এবং backend/routes/employees.js — এই বাস্তব endpoint গুলো টেস্ট করে,
// কাল্পনিক কোনো endpoint না।

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const EMP_CODE = __ENV.EMP_CODE || '';
const EMP_PASS = __ENV.EMP_PASS || '';

export const options = {
  scenarios: {
    ramping_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },
        { duration: '1m', target: 200 },
        { duration: '1m', target: 500 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<800'],
    http_req_failed: ['rate<0.02'],
  },
};

let token = null;

export function setup() {
  if (!EMP_CODE || !EMP_PASS) {
    console.warn('EMP_CODE/EMP_PASS দেওয়া হয়নি — শুধু public endpoint টেস্ট হবে।');
    return { token: null };
  }
  const res = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    employee_code: EMP_CODE, password: EMP_PASS,
  }), { headers: { 'Content-Type': 'application/json' } });
  const body = res.json();
  return { token: body && body.token ? body.token : null };
}

export default function (data) {
  const headers = { 'Content-Type': 'application/json' };
  if (data.token) headers.Authorization = `Bearer ${data.token}`;

  const stats = http.get(`${BASE_URL}/api/v2/enterprise/live-stats`, { headers });
  check(stats, { 'live-stats 200': (r) => r.status === 200 });

  if (data.token) {
    const emp = http.get(`${BASE_URL}/api/employees?limit=20`, { headers });
    check(emp, { 'employees 200': (r) => r.status === 200 });
  }

  sleep(1);
}
