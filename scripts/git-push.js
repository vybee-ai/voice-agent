const fs = require("fs");
const { execSync } = require("child_process");

const logFile = "scripts/git-output.log";
fs.writeFileSync(logFile, "Starting git push process...\n");

function log(msg) {
  fs.appendFileSync(logFile, msg + "\n");
}

try {
  log("Step 1: Adding files");
  const addOut = execSync("git add .", { encoding: "utf8" });
  log("git add output: " + (addOut || "done"));

  log("Step 2: Committing changes");
  try {
    const commitOut = execSync('git commit -m "feat: integrate n8n new-lead and vapi webhooks"', { encoding: "utf8" });
    log("git commit output: " + commitOut);
  } catch (e) {
    log("git commit message: " + (e.stdout || e.message));
  }

  log("Step 3: Pushing to origin main");
  const pushOut = execSync("git push -u origin main", { encoding: "utf8" });
  log("git push output: " + (pushOut || "success"));
  log("STATUS: SUCCESS");
} catch (err) {
  log("ERROR: " + (err.stderr || err.stdout || err.message));
}
