import { rankAssociateRecommendations, scoreAssociateMatch, checkHardConstraints } from "../lib/allocationEngine";
import { normalizeAssociate, normalizeAllocation, normalizeList, type RawRow } from "../lib/normalize";
import { allocationsService } from "../services/allocationsService";
import { associatesService } from "../services/associatesService";
import type { Lead, Associate } from "../lib/types";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ Passed: ${message}`);
  }
}

async function runTests() {
  console.log("\n=======================================================");
  console.log("🚀 Running OneX Allocation & Backend Test Suite");
  console.log("=======================================================\n");

  const testLead: Lead = {
    id: "lead-test-1",
    leadId: "LEAD-T100",
    buyerName: "Test Buyer Marina",
    phone: "+971501112233",
    source: "Property Finder",
    country: "United Arab Emirates",
    city: "Dubai",
    preferredArea: "Dubai Marina",
    propertyType: "Apartment",
    bedrooms: "2 BR",
    purchasePurpose: "Investment",
    budgetMin: 1_500_000,
    budgetMax: 2_000_000,
    currency: "AED",
    purchaseTimeline: "Within 60 days",
    keyRequirements: "Near metro, rental yield",
    status: "Qualified",
    temperature: "HOT",
    qualificationScore: 88,
    qualificationCompleteness: 90,
    brokerFollowupRequested: true,
    preferredCallbackTime: "Tomorrow morning",
    assignedAssociateId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastContactAt: null,
    nextAction: "Assign Associate",
    callOutcome: "Qualified",
    callSummary: "Investor looking for 2BR in Marina",
  };

  const testAssociates: Associate[] = [
    {
      id: "assoc-marina",
      name: "Marina Specialist",
      role: "Property Specialist",
      status: "Active",
      availability: "Available",
      phone: "+971501111111",
      email: "marina@test.com",
      territories: ["Dubai Marina", "JBR"],
      propertyTypes: ["Apartment"],
      budgetMin: 1_000_000,
      budgetMax: 3_000_000,
      languages: ["English", "Arabic"],
      maxActiveCapacity: 15,
      leadsAssigned: 5,
      hotLeads: 2,
      followUps: 3,
      currentActiveClients: 3,
      historicalConversionRate: 25,
      averageResponseMinutes: 10,
      lastActivityAt: new Date().toISOString(),
    },
    {
      id: "assoc-villa",
      name: "Palm Villa Specialist",
      role: "Senior Specialist",
      status: "Active",
      availability: "Available",
      phone: "+971502222222",
      email: "palm@test.com",
      territories: ["Palm Jumeirah"],
      propertyTypes: ["Villa"],
      budgetMin: 8_000_000,
      budgetMax: 25_000_000,
      languages: ["English"],
      maxActiveCapacity: 10,
      leadsAssigned: 4,
      hotLeads: 2,
      followUps: 2,
      currentActiveClients: 4,
      historicalConversionRate: 18,
      averageResponseMinutes: 20,
      lastActivityAt: new Date().toISOString(),
    },
    {
      id: "assoc-offline",
      name: "Offline Specialist",
      role: "Property Specialist",
      status: "Offline",
      availability: "Offline",
      phone: "+971503333333",
      email: "offline@test.com",
      territories: ["Dubai Marina"],
      propertyTypes: ["Apartment"],
      maxActiveCapacity: 10,
      leadsAssigned: 2,
      hotLeads: 1,
      followUps: 1,
      currentActiveClients: 1,
      lastActivityAt: null,
    },
    {
      id: "assoc-full",
      name: "Full Capacity Specialist",
      role: "Property Specialist",
      status: "Active",
      availability: "Available",
      phone: "+971504444444",
      email: "full@test.com",
      territories: ["Dubai Marina"],
      propertyTypes: ["Apartment"],
      maxActiveCapacity: 5,
      leadsAssigned: 10,
      hotLeads: 5,
      followUps: 5,
      currentActiveClients: 5, // Full
      lastActivityAt: null,
    },
  ];

  console.log("--- 1. Testing Hard Constraints ---");
  const offlineCheck = checkHardConstraints(testLead, testAssociates[2]);
  assert(!offlineCheck.eligible, "Offline specialist must be ineligible");

  const fullCheck = checkHardConstraints(testLead, testAssociates[3]);
  assert(!fullCheck.eligible, "Full capacity specialist must be ineligible");

  const validCheck = checkHardConstraints(testLead, testAssociates[0]);
  assert(validCheck.eligible, "Active available specialist must be eligible");

  console.log("\n--- 2. Testing Multi-Factor Match Scoring ---");
  const marinaMatch = scoreAssociateMatch(testLead, testAssociates[0]);
  assert(marinaMatch.score >= 85, `Marina specialist score should be high (Got: ${marinaMatch.score})`);
  assert(marinaMatch.factors.length === 6, "Must produce 6 explainable factors");

  const villaMatch = scoreAssociateMatch(testLead, testAssociates[1]);
  assert(villaMatch.score < marinaMatch.score, `Villa specialist should score lower than Marina specialist (Got: ${villaMatch.score} vs ${marinaMatch.score})`);

  console.log("\n--- 3. Testing Candidate Ranking ---");
  const ranked = rankAssociateRecommendations(testLead, testAssociates);
  assert(ranked[0].associate.id === "assoc-marina", "Top ranked candidate must be Marina specialist");
  assert(ranked[ranked.length - 1].eligible === false, "Ineligible candidates must be sorted at the end");

  console.log("\n--- 4. Testing Normalization Layer ---");
  const rawAssocRow: RawRow = {
    "Associate ID": "assoc-99",
    Name: "Sarah Connor",
    Role: "Senior Property Specialist",
    Status: "Active",
    Availability: "Available",
    Phone: "0509998877",
    Email: "sarah@onex.ae",
    Territories: "Downtown Dubai, Business Bay",
    "Property Types": '["Apartment", "Penthouse"]',
    "Max Capacity": "12",
    "Conversion Rate": "21.5",
  };

  const normAssoc = normalizeAssociate(rawAssocRow, 0);
  assert(normAssoc.id === "assoc-99", "Associate ID normalized correctly");
  assert(normAssoc.phone === "+971509998877", "Phone formatted with +971 correctly");
  assert(normAssoc.territories?.length === 2, "Comma-separated territories parsed into array");
  assert(normAssoc.propertyTypes?.length === 2, "JSON string property types parsed into array");
  assert(normAssoc.maxActiveCapacity === 12, "Numeric capacity parsed correctly");

  const rawAllocRow: RawRow = {
    "Allocation ID": "alloc-999",
    "Lead ID": "lead-1",
    "Lead Name": "Rahul Sharma",
    "Associate ID": "assoc-1",
    "Associate Name": "Ahmed Khan",
    "Match Score": "92",
    "Match Factors": JSON.stringify([{ signal: "Location", score: 30, maxScore: 30, matched: true, detail: "Match" }]),
    "Allocation Method": "RuleEngine",
    Status: "Accepted",
    "Is Current": "TRUE",
    "Assigned At": "2026-08-17T11:00:00Z",
  };

  const normAlloc = normalizeAllocation(rawAllocRow, 0);
  assert(normAlloc.id === "alloc-999", "Allocation ID normalized correctly");
  assert(normAlloc.matchScore === 92, "Match score normalized correctly");
  assert(normAlloc.isCurrent === true, "Boolean isCurrent parsed as true");
  assert(normAlloc.matchFactors.length === 1, "Match factors parsed from JSON string");
  assert(normAlloc.status === "Accepted", "Status normalized as Accepted");

  console.log("\n--- 5. Testing Allocations Service Lifecycle Operations ---");
  // Test Assign
  const assignRes = await allocationsService.assignAssociate({
    leadId: "lead-1",
    associateId: "assoc-1",
    method: "RuleEngine",
  });
  assert(assignRes.success, "assignAssociate succeeded");
  assert(assignRes.allocation?.isCurrent === true, "New allocation is marked isCurrent=true");

  const allocId = assignRes.allocation!.id;

  // Test Accept
  const acceptRes = await allocationsService.acceptAllocation(allocId);
  assert(acceptRes.success, "acceptAllocation succeeded");
  assert(acceptRes.allocation?.status === "Accepted", "Status transitioned to Accepted");
  assert(!!acceptRes.allocation?.acceptedAt, "acceptedAt timestamp recorded");

  // Test First Contact
  const contactRes = await allocationsService.recordFirstContact(allocId);
  assert(contactRes.success, "recordFirstContact succeeded");
  assert(contactRes.allocation?.status === "Contacted", "Status transitioned to Contacted");
  assert(!!contactRes.allocation?.firstContactAt, "firstContactAt timestamp recorded");

  // Test Reassign
  const reassignRes = await allocationsService.reassignAllocation({
    currentAllocationId: allocId,
    newAssociateId: "assoc-2",
    reason: "Buyer requested villa options",
  });
  assert(reassignRes.success, "reassignAllocation succeeded");
  assert(reassignRes.newAllocation?.associateId === "assoc-2", "New allocation assigned to assoc-2");
  assert(reassignRes.newAllocation?.isCurrent === true, "New allocation is marked isCurrent=true");

  // Verify historical allocation state
  const oldAlloc = await allocationsService.getById(allocId);
  assert(oldAlloc?.status === "Reassigned", "Old allocation marked as Reassigned");
  assert(oldAlloc?.isCurrent === false, "Old allocation marked as isCurrent=false");

  console.log("\n--- 6. Testing Associates Service Derived Metrics ---");
  const allAssociates = await associatesService.getAll();
  assert(allAssociates.length >= 4, "Fetched all associates");
  assert(typeof allAssociates[0].currentActiveClients === "number", "Calculated currentActiveClients");
  assert(typeof allAssociates[0].historicalConversionRate === "number", "Calculated historicalConversionRate");

  console.log("\n=======================================================");
  console.log("🎉 ALL TESTS PASSED SUCCESSFULLY! (0 Failures)");
  console.log("=======================================================\n");
}

runTests().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
