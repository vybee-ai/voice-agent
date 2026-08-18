async function inspectVapiJson() {
  const sheetId = "1xyws59k-D6Lc1xwt9YBMrMh86hPd41G2gLXVaBlRQv4";
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=Vapi_Events_Raw`;
  const res = await fetch(url);
  const text = await res.text();
  
  // Extract JSON from gviz response: /*O_o*/ google.visualization.Query.setResponse({...});
  const jsonStr = text.substring(text.indexOf("{"), text.lastIndexOf("}") + 1);
  const data = JSON.parse(jsonStr);
  
  console.log("Columns:", data.table.cols.map((c: any) => c.label));
  console.log("Rows count:", data.table.rows.length);
  
  for (let i = 0; i < data.table.rows.length; i++) {
    const row = data.table.rows[i];
    console.log(`\n--- Row ${i + 1} ---`);
    console.log("event_id:", row.c[0]?.v);
    console.log("event_type:", row.c[1]?.v);
    console.log("call_id:", row.c[2]?.v);
    console.log("lead_id:", row.c[3]?.v);
    console.log("received_at:", row.c[4]?.v);
    console.log("processing_status:", row.c[5]?.v);
    const rawJson = row.c[6]?.v;
    if (rawJson) {
      console.log("raw_vapi_json sample:", String(rawJson).slice(0, 300));
    } else {
      console.log("raw_vapi_json: (empty)");
    }
  }
}

inspectVapiJson().catch(console.error);
