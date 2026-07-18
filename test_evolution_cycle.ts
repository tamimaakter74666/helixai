import { evolutionManager } from "./server/core/EvolutionManager";
import fs from "fs";
import path from "path";

async function main() {
  console.log("=== STARTING EVOLUTION MODE RUNTIME VERIFICATION ===");
  
  // 1. Run the cycle (manual: true)
  console.log("Running self-evolution research cycle...");
  const result = await evolutionManager.runResearchCycle(true);
  console.log("Cycle Result Success:", result.success);
  if (result.report) {
    console.log("Generated Report Summary:", result.report.summary);
    console.log("What Was Learned Count:", result.report.whatWasLearnedCount);
    console.log("New Technologies Discovered:", JSON.stringify(result.report.newTechnologiesDiscovered, null, 2));
    console.log("Weaknesses Identified:", JSON.stringify(result.report.weaknessesIdentified, null, 2));
    console.log("Possible Improvements:", JSON.stringify(result.report.possibleImprovements, null, 2));
    console.log("Confidence Levels:", JSON.stringify(result.report.confidenceLevels, null, 2));
  }

  if (!result.success) {
    console.error("FAIL: Evolution Cycle did not execute successfully. Error:", result.error);
    process.exit(1);
  }

  // 2. Verify data directories and files exist and contain items
  console.log("Checking stored files...");
  const knowledge = evolutionManager.getKnowledge();
  const findings = evolutionManager.getSelfAnalysis();
  const proposals = evolutionManager.getProposals();
  const reports = evolutionManager.getReports();

  console.log(`Knowledge Items Count: ${knowledge.length}`);
  console.log(`Self-Analysis Findings Count: ${findings.length}`);
  console.log(`Proposals Count: ${proposals.length}`);
  console.log(`Reports Count: ${reports.length}`);

  if (knowledge.length === 0 || findings.length === 0 || proposals.length === 0 || reports.length === 0) {
    console.error("FAIL: One or more data files are empty after research cycle.");
    process.exit(1);
  }

  // Verify the schema structure of the stored elements
  console.log("Verifying schemas and properties of the retrieved items...");
  
  const kSample = knowledge[0];
  if (!kSample.id || !kSample.topic || !kSample.source || !kSample.evidence || !kSample.date || kSample.confidenceScore === undefined || !kSample.status) {
    console.error("FAIL: KnowledgeItem does not conform to required schema properties.", kSample);
    process.exit(1);
  }
  console.log("KnowledgeItem Schema: VALID");

  const fSample = findings[0];
  if (!fSample.id || !fSample.category || !fSample.finding || !fSample.evidence || !fSample.impact || !fSample.date) {
    console.error("FAIL: SelfAnalysisFinding does not conform to required schema properties.", fSample);
    process.exit(1);
  }
  console.log("SelfAnalysisFinding Schema: VALID");

  const pSample = proposals[0];
  if (!pSample.id || !pSample.problem || !pSample.rootCause || !pSample.supportingEvidence || !pSample.expectedBenefit || !pSample.riskAssessment || !pSample.status || !pSample.date) {
    console.error("FAIL: ImprovementProposal does not conform to required schema properties.", pSample);
    process.exit(1);
  }
  console.log("ImprovementProposal Schema: VALID");

  const rSample = reports[0];
  if (!rSample.id || !rSample.date || !rSample.summary || rSample.whatWasLearnedCount === undefined || !rSample.newTechnologiesDiscovered || !rSample.weaknessesIdentified || !rSample.possibleImprovements || !rSample.confidenceLevels) {
    console.error("FAIL: EvolutionReport does not conform to required schema properties.", rSample);
    process.exit(1);
  }
  console.log("EvolutionReport Schema: VALID");

  // 3. Verify approval workflow
  const firstProposal = proposals[0];
  console.log(`Approving Proposal ID: ${firstProposal.id}`);
  const approveResult = evolutionManager.approveProposal(firstProposal.id);
  console.log(`Approval Success: ${approveResult}`);
  
  const updatedProposals = evolutionManager.getProposals();
  const approvedProp = updatedProposals.find(p => p.id === firstProposal.id);
  console.log(`Approved Proposal Status is: ${approvedProp?.status}`);
  if (approvedProp?.status !== "Approved") {
    console.error("FAIL: Proposal status was not updated to 'Approved'.");
    process.exit(1);
  }

  // 4. Verify execution workflow
  console.log(`Executing Proposal ID: ${firstProposal.id}`);
  const execResult = evolutionManager.executeProposal(firstProposal.id);
  console.log(`Execution Success: ${execResult}`);
  
  const updatedProposals2 = evolutionManager.getProposals();
  const executedProp = updatedProposals2.find(p => p.id === firstProposal.id);
  console.log(`Executed Proposal Status is: ${executedProp?.status}`);
  if (executedProp?.status !== "Executed") {
    console.error("FAIL: Proposal status was not updated to 'Executed'.");
    process.exit(1);
  }

  // 5. Verify knowledge item verification workflow
  const firstKnowledge = knowledge[0];
  console.log(`Verifying Knowledge Item ID: ${firstKnowledge.id}`);
  const verifyResult = evolutionManager.verifyKnowledgeItem(firstKnowledge.id);
  console.log(`Verification Success: ${verifyResult}`);
  
  const updatedKnowledge = evolutionManager.getKnowledge();
  const verifiedKnow = updatedKnowledge.find(k => k.id === firstKnowledge.id);
  console.log(`Verified Knowledge Status is: ${verifiedKnow?.status}`);
  if (verifiedKnow?.status !== "Verified") {
    console.error("FAIL: Knowledge status was not updated to 'Verified'.");
    process.exit(1);
  }

  console.log("=== EVOLUTION MODE RUNTIME VERIFICATION SUCCESSFUL ===");
}

main().catch(err => {
  console.error("UNHANDLED RUNTIME ERROR:", err);
  process.exit(1);
});
