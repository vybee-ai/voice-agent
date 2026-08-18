async function discoverAllSheets() {
  const sheetId = "1xyws59k-D6Lc1xwt9YBMrMh86hPd41G2gLXVaBlRQv4";
  
  // Try fetching gviz schema which lists all sheets
  const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;
  const res = await fetch(gvizUrl);
  const text = await res.text();
  
  // Test common sheet names
  const candidateNames = [
    "Readme",
    "README",
    "Overview",
    "Leads",
    "Calls",
    "Calls_Summary",
    "Call_Logs",
    "Associates",
    "Allocations",
    "Qualification",
    "Follow_Ups",
    "Follow-ups",
    "Followups",
    "FollowUps",
    "Vapi_Events_Raw",
    "Events_Raw",
    "Call_Artifacts",
    "Artifacts",
    "Costs_Analysis",
    "Costs",
    "CRM_Leads",
    "Lead_Pipeline",
    "Client_Allocations",
    "Team",
    "Specialists",
    "Brokers",
    "Conversations",
    "WhatsApp",
    "WhatsApp_Messages",
    "Activity",
    "Activity_Log"
  ];

  for (const name of candidateNames) {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(name)}`;
    try {
      const resp = await fetch(csvUrl);
      if (resp.ok) {
        const csv = await resp.text();
        if (csv.length > 0 && !csv.includes("<!DOCTYPE") && !csv.includes("OneX Production Voice CRM — Data Model") && csv.trim().length > 10) {
          console.log(`\n================ Sheet Found: "${name}" (${csv.split('\n').length} rows) ================`);
          const lines = csv.split('\n');
          console.log("Header:", lines[0]);
          if (lines.length > 1 && lines[1]) {
            console.log("Sample row 1:", lines[1].slice(0, 300));
          }
          if (lines.length > 2 && lines[2]) {
            console.log("Sample row 2:", lines[2].slice(0, 300));
          }
        }
      }
    } catch (e) {}
  }
}

discoverAllSheets().catch(console.error);
