async function dumpAllSheets() {
  const sheetId = "1xyws59k-D6Lc1xwt9YBMrMh86hPd41G2gLXVaBlRQv4";
  const sheets = [
    "Leads",
    "Calls",
    "Qualification",
    "Call_Artifacts",
    "Costs_Analysis",
    "Follow_Ups",
    "Vapi_Events_Raw",
    "Associates",
    "Allocations"
  ];

  for (const s of sheets) {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(s)}`;
    try {
      const resp = await fetch(csvUrl);
      const text = await resp.text();
      console.log(`\n=================== SHEET: "${s}" ===================`);
      console.log(text.trim());
    } catch (e) {
      console.log(`Failed to fetch ${s}:`, e);
    }
  }
}

dumpAllSheets().catch(console.error);
