async function parseVapiEvents() {
  const sheetId = "1xyws59k-D6Lc1xwt9YBMrMh86hPd41G2gLXVaBlRQv4";
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=Vapi_Events_Raw`;
  const resp = await fetch(csvUrl);
  const text = await resp.text();
  console.log("Vapi_Events_Raw length:", text.length);
  
  // Let's also check Leads, Calls, Qualification, Artifacts, FollowUps
  const sheets = ["Leads", "Calls", "Qualification", "Artifacts", "FollowUps", "Associates", "Allocations"];
  for (const s of sheets) {
    const u = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(s)}`;
    const r = await fetch(u);
    const t = await r.text();
    const rows = t.trim().split("\n");
    console.log(`Sheet "${s}": ${rows.length} rows`);
    if (rows.length > 1) {
      console.log(`  Header:`, rows[0]);
      console.log(`  Row 1:`, rows[1].slice(0, 150));
    }
  }
}

parseVapiEvents().catch(console.error);
