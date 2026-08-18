async function fetchPublicSheet(sheetId: string, sheetTitle: string) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetTitle)}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const text = await res.text();
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) return [];
  
  const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
  const table = parsed.table;
  if (!table || !table.cols || !table.rows) return [];
  
  // Extract headers
  let headers: string[] = table.cols.map((c: any) => c.label || "");
  let startRow = 0;
  
  // If headers in table.cols are empty, check row 0
  if (headers.every((h) => !h.trim()) && table.rows.length > 0) {
    headers = table.rows[0].c.map((cell: any) => String(cell?.v ?? cell?.f ?? "").trim());
    startRow = 1;
  }
  
  const rows: Record<string, any>[] = [];
  for (let i = startRow; i < table.rows.length; i++) {
    const r = table.rows[i];
    const rowObj: Record<string, any> = {};
    let hasData = false;
    headers.forEach((h, colIdx) => {
      if (h) {
        const val = r.c[colIdx]?.v ?? r.c[colIdx]?.f ?? "";
        rowObj[h] = val;
        if (val !== "") hasData = true;
      }
    });
    if (hasData) rows.push(rowObj);
  }
  return rows;
}

async function testFetch() {
  const sheetId = "1xyws59k-D6Lc1xwt9YBMrMh86hPd41G2gLXVaBlRQv4";
  console.log("Fetching Leads...");
  const leads = await fetchPublicSheet(sheetId, "Leads");
  console.log("Leads rows:", leads.length, leads);

  console.log("Fetching Calls...");
  const calls = await fetchPublicSheet(sheetId, "Calls");
  console.log("Calls rows:", calls.length, calls);

  console.log("Fetching Vapi_Events_Raw...");
  const vapi = await fetchPublicSheet(sheetId, "Vapi_Events_Raw");
  console.log("Vapi events rows:", vapi.length, vapi.slice(0, 3));
}

testFetch().catch(console.error);
