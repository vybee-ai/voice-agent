async function checkSheet() {
  const sheetId = "1xyws59k-D6Lc1xwt9YBMrMh86hPd41G2gLXVaBlRQv4";
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/edit?usp=sharing`;
  
  const res = await fetch(url);
  const html = await res.text();
  
  // Extract sheet names from HTML bootstrap data
  const matches = [...html.matchAll(/name:"([^"]+)"/g)];
  console.log("Potential sheet names:", matches.map(m => m[1]));

  // Also check standard sheets like Leads, Calls, Associates, Allocations, CRM_Leads, etc.
  const testSheets = [
    "Leads",
    "Calls",
    "Associates",
    "Allocations",
    "CRM_Leads",
    "Call_Logs",
    "Qualification",
    "Follow_Ups",
    "Vapi_Events_Raw",
    "Call_Artifacts",
    "Costs_Analysis",
    "Client_Allocations",
    "Team_Roster"
  ];

  for (const sheet of testSheets) {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}`;
    try {
      const csvRes = await fetch(csvUrl);
      const csvText = await csvRes.text();
      if (!csvText.includes("<!DOCTYPE") && csvText.trim().length > 0 && !csvText.includes("OneX Production Voice CRM")) {
        console.log(`\n================ Sheet Found: "${sheet}" ================`);
        console.log(csvText.slice(0, 500));
      }
    } catch (e) {
      // ignore
    }
  }
}

checkSheet().catch(console.error);
