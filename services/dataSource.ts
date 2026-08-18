import { demoAdapter } from "./demoAdapter";
import { googleSheetsAdapter } from "./googleSheetsAdapter";

// Single switch point between the demo adapter and the live Google Sheets
// adapter. Every service below imports from here rather than reaching into
// either adapter directly, so swapping the data source later (e.g. to a
// real database adapter) only means editing this one file.
export function getAdapter() {
  const mode = process.env.APP_MODE === "live" ? "live" : "demo";
  return mode === "live" ? googleSheetsAdapter : demoAdapter;
}

export function getAppMode(): "demo" | "live" {
  return process.env.APP_MODE === "live" ? "live" : "demo";
}
