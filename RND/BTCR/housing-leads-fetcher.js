const crypto = require("crypto");
const https = require("https");

const CONFIG = {
  profileId: "24039743",
  encryptionKey: "2c6f9b9c693e91afdf5a45786c2a7ca8",
  baseUrl: "https://pahal.housing.com/api/v0/get-builder-leads",
  pollIntervalMs: 50_000,
  perPage: 1000,
};

function generateHash(currentTime) {
  return crypto
    .createHmac("sha256", CONFIG.encryptionKey)
    .update(String(currentTime))
    .digest("hex");
}

function getStartOfDayEpoch() {
  const now = new Date();
  return Math.floor(new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000);
}

function buildUrl() {
  const startDate = getStartOfDayEpoch();
  const currentTime = Math.floor(Date.now() / 1000);
  const endDate = currentTime;
  const hash = generateHash(currentTime);

  const params = new URLSearchParams({
    start_date: String(startDate),
    end_date: String(endDate),
    current_time: String(currentTime),
    hash,
    id: CONFIG.profileId,
    per_page: String(CONFIG.perPage),
  });

  return `${CONFIG.baseUrl}?${params.toString()}`;
}

function fetchLeads() {
  return new Promise((resolve, reject) => {
    const url = buildUrl();
    console.log(`\n[${ new Date().toISOString() }] Fetching leads...`);
    console.log(`URL: ${url}\n`);

    https.get(url, { rejectUnauthorized: false }, (res) => {
      let body = "";
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => {
        console.log(`Status: ${res.statusCode}`);
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, data: json });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    }).on("error", (err) => reject(err));
  });
}

async function poll() {
  try {
    const { status, data } = await fetchLeads();

    if (status === 200 && data.data) {
      const leads = Array.isArray(data.data) ? data.data : [data.data];
      console.log(`Received ${leads.length} lead(s):\n`);
      leads.forEach((lead, i) => {
        console.log(`--- Lead ${i + 1} ---`);
        console.log(`  Name      : ${lead.lead_name ?? "N/A"}`);
        console.log(`  Phone     : ${lead.lead_phone ?? "N/A"}`);
        console.log(`  Email     : ${lead.lead_email ?? "N/A"}`);
        console.log(`  Project ID: ${lead.project_id ?? lead.flat_id ?? "N/A"}`);
        console.log(`  Project   : ${lead.project_name ?? "N/A"}`);
        console.log(`  Locality  : ${lead.locality ?? "N/A"}`);
        console.log(`  Lead Date : ${lead.lead_date ?? "N/A"}`);
        console.log(`  Type      : ${lead.service_type ?? "N/A"}`);
        if (lead.pg_name) console.log(`  PG Name   : ${lead.pg_name}`);
      });
    } else if (status === 422) {
      console.log("Validation error — missing or malformed parameters:");
      console.log(JSON.stringify(data, null, 2));
    } else if (status === 401) {
      console.log("Unauthorized — hash mismatch or request delayed >15 min:");
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log("Response:");
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error("Request failed:", err.message);
  }
}

console.log("=== Housing.com Lead Fetcher ===");
console.log(`Profile ID : ${CONFIG.profileId}`);
console.log(`Polling every ${CONFIG.pollIntervalMs / 1000}s`);
console.log("Press Ctrl+C to stop.\n");

poll();
setInterval(poll, CONFIG.pollIntervalMs);
