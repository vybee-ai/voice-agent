import http from "http";

const BASE_URL = "http://localhost:3000";

interface TestRoute {
  path: string;
  expectedStatus: number[];
  expectedContent?: string[];
  method?: "GET" | "POST";
  body?: any;
}

const routesToTest: TestRoute[] = [
  { path: "/", expectedStatus: [200, 307, 308] },
  { path: "/dashboard", expectedStatus: [200], expectedContent: ["Dashboard", "Pipeline", "Good morning"] },
  { path: "/leads", expectedStatus: [200], expectedContent: ["Leads", "ONX-"] },
  { path: "/leads/ONX-335158", expectedStatus: [200], expectedContent: ["Property Requirement", "Qualification"] },
  { path: "/calls", expectedStatus: [200], expectedContent: ["Calls", "Duration", "Status", "Sofia"] },
  { path: "/calls/01a014e7-4160-7ccd-8115-6c4802433be2", expectedStatus: [200], expectedContent: ["Call Analysis", "01a014e7-4160-7ccd-8115-6c4802433be2", "AI Analysis"] },
  { path: "/talk-to-sofia", expectedStatus: [200], expectedContent: ["Talk to Sofia", "Sofia"] },
  { path: "/allocations", expectedStatus: [200], expectedContent: ["Allocations", "Specialist"] },
  { path: "/associates", expectedStatus: [200], expectedContent: ["Associates", "Specialist"] },
  { path: "/whatsapp", expectedStatus: [200], expectedContent: ["WhatsApp"] },
  { path: "/follow-ups", expectedStatus: [200], expectedContent: ["Follow-up"] },
  { path: "/analytics", expectedStatus: [200], expectedContent: ["Analytics", "Funnel"] },
  { path: "/settings", expectedStatus: [200], expectedContent: ["Settings", "Company"] },
  { path: "/settings/integrations", expectedStatus: [200], expectedContent: ["Integrations", "Google Sheet"] },
  { path: "/settings/whatsapp", expectedStatus: [200], expectedContent: ["WhatsApp"] },
  { path: "/settings/voice", expectedStatus: [200], expectedContent: ["Voice Provider", "Sofia"] },
  { path: "/settings/ai-agent", expectedStatus: [200], expectedContent: ["AI Agent", "Qualification Threshold"] },
  { path: "/settings/team", expectedStatus: [200], expectedContent: ["Team"] },
  { path: "/health", expectedStatus: [200], expectedContent: ['"status":"ok"'] },
  { path: "/api/health", expectedStatus: [200], expectedContent: ['"status":"ok"'] },
  { path: "/api/leads", expectedStatus: [200], expectedContent: ["leads", "count"] },
  {
    path: "/api/leads",
    method: "POST",
    expectedStatus: [201],
    body: {
      buyerName: "Production Verification Lead",
      phone: "+971509998877",
      source: "Automated Pre-Deployment Audit",
    },
    expectedContent: ["success", "lead"],
  },
];

async function runTest(test: TestRoute): Promise<{ path: string; status: number; passed: boolean; error?: string }> {
  return new Promise((resolve) => {
    const url = new URL(test.path, BASE_URL);
    const options: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: test.method || "GET",
      headers: test.body
        ? {
            "Content-Type": "application/json",
          }
        : {},
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        const statusMatch = test.expectedStatus.includes(res.statusCode || 0);
        let contentMatch = true;
        let missingContent = "";

        if (test.expectedContent) {
          for (const snippet of test.expectedContent) {
            if (!data.includes(snippet)) {
              contentMatch = false;
              missingContent = snippet;
              break;
            }
          }
        }

        const passed = statusMatch && contentMatch;
        let error: string | undefined;
        if (!statusMatch) {
          error = `Expected status ${test.expectedStatus.join("|")}, got ${res.statusCode}`;
        } else if (!contentMatch) {
          error = `Missing expected content snippet: "${missingContent}"`;
        }

        resolve({
          path: `${test.method || "GET"} ${test.path}`,
          status: res.statusCode || 0,
          passed,
          error,
        });
      });
    });

    req.on("error", (err) => {
      resolve({
        path: `${test.method || "GET"} ${test.path}`,
        status: 0,
        passed: false,
        error: err.message,
      });
    });

    if (test.body) {
      req.write(JSON.stringify(test.body));
    }
    req.end();
  });
}

async function main() {
  console.log("==================================================");
  console.log("ONEX LEAD MANAGEMENT — PRODUCTION ROUTE AUDIT");
  console.log("==================================================");
  console.log(`Target Base URL: ${BASE_URL}\n`);

  let allPassed = true;
  for (const test of routesToTest) {
    const result = await runTest(test);
    const badge = result.passed ? "PASS" : "FAIL";
    console.log(`${badge} [${result.status}] ${result.path}`);
    if (!result.passed) {
      allPassed = false;
      console.log(`       Reason: ${result.error}`);
    }
  }

  console.log("\n==================================================");
  if (allPassed) {
    console.log("ALL PRODUCTION ROUTES AND API ENDPOINTS PASSED!");
  } else {
    console.log("SOME TESTS FAILED. PLEASE REVIEW LOGS.");
    process.exit(1);
  }
  console.log("==================================================");
}

main().catch(console.error);
