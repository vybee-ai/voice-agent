import { googleSheetsAdapter } from "../services/googleSheetsAdapter";
import { leadsService } from "../services/leadsService";
import { callsService } from "../services/callsService";

async function testLive() {
  console.log("=== Testing Live Google Sheet Integration ===");
  console.log("GOOGLE_SHEET_ID:", process.env.GOOGLE_SHEET_ID);
  
  const leads = await googleSheetsAdapter.getLeads();
  console.log(`Fetched ${leads.length} leads:`);
  leads.forEach((l, i) => {
    console.log(`  [${i + 1}] ID: ${l.id} | Buyer: ${l.buyerName} | Temp: ${l.temperature} | Status: ${l.status}`);
  });

  const calls = await googleSheetsAdapter.getCalls();
  console.log(`\nFetched ${calls.length} calls:`);
  calls.slice(0, 4).forEach((c, i) => {
    console.log(`  [${i + 1}] Call ID: ${c.id} | Lead ID: ${c.leadId} | Status: ${c.status} | Agent: ${c.agentName}`);
  });

  const stats = await leadsService.getDashboardStats();
  console.log("\nDashboard Stats:", stats);
  console.log("\n✅ Google Sheet data extraction test succeeded!");
}

testLive().catch(console.error);
