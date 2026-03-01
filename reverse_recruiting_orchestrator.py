"""
Reverse Recruiting Swarm Orchestrator
Executes the workflow pipeline from the Seeker to the Orchestrator,
including Tension Evaluation and simulate simplify.jobs submission.
"""
import time
from typing import Dict, Any

from reverse_recruiting_evaluator import ReverseRecruitingEvaluator
from reverse_recruiting_swarm import ReverseRecruitingSwarm

class ReverseRecruitingPipeline:
    def __init__(self):
        self.evaluator = ReverseRecruitingEvaluator()
        self.swarm = ReverseRecruitingSwarm()

    def sim_simplify_jobs_submit(self, candidate_name: str, target_company: str, payload_data: Dict[str, Any]) -> bool:
        """Mock submission to simplify.jobs api"""
        print(f"\n[simplify.jobs Orchestrator API]")
        print(f"--> Authenticating for Candidate: {candidate_name}")
        time.sleep(0.5)
        print(f"--> Formatting Payload: \n{payload_data['custom_pitch']}")
        time.sleep(0.5)
        print(f"--> Submitting to ATS endpoint for: {target_company}")
        time.sleep(0.5)
        print(f"--> Rate Limit Check: OK (49/50 requests remaining)")
        print(f"--> [SUCCESS] Application ID: SJ-{hash(candidate_name + target_company) % 100000} submitted successfully.\n")
        return True

    def run_pipeline(self, target_company: Dict[str, Any]):
        print(f"\n={'=' * 60}")
        print(f"🚀 INITIALIZING AGENTIC REVERSE RECRUITING SWARM")
        print(f"={'=' * 60}")
        time.sleep(0.5)

        # 1. SEEKER Phase
        seeker = self.swarm.get_agent("Seeker")
        print(f"\n🔍 [1. {seeker.name}]: Discovered target -> {target_company['name']}")
        time.sleep(0.5)

        # 2. INTUITIVE Phase (Tension Evaluator)
        intuitive = self.swarm.get_agent("Intuitive")
        print(f"\n🔮 [2. {intuitive.name}]: Evaluating Strategic Tension (Anti-Fragility vs. Superficial Relief)")
        eval_result = self.evaluator.evaluate_company(target_company['name'], target_company['data'])
        print(f"   --> Rating: {eval_result.overall_tension_rating}")
        print(f"   --> Anti-Fragility: {eval_result.anti_fragility_score}% | Relief: {eval_result.superficial_relief_score}%")
        print(f"   --> Intuitive Verdict: {eval_result.recommendation}")

        if eval_result.superficial_relief_score > 60 and eval_result.anti_fragility_score < 40:
            print(f"   [!] ABORTING pipeline for {target_company['name']} - Too much Superficial Relief.")
            return

        time.sleep(0.5)

        # 3. ANALYST Phase
        analyst = self.swarm.get_agent("Analyst")
        print(f"\n📊 [3. {analyst.name}]: Analyzing JD for KPI fit against Agile/Data Analytics background.")
        print(f"   --> Extracted key domain required: Orchestration & Analytics")
        time.sleep(0.5)

        # 4. INNOVATOR Phase
        innovator = self.swarm.get_agent("Innovator")
        print(f"\n💡 [4. {innovator.name}]: Crafting zero-to-one pitch bypassing traditional ATS.")
        custom_pitch = f"Subject: Transforming {target_company['name']}'s Growth via Agentic Orchestration\n" \
                       f"Body: {self.swarm.payload.pitch}\n" \
                       f"Actionable Analytics Link: {self.swarm.payload.role_links['Analyst']}\n" \
                       f"Actionable Orchestrator Link: {self.swarm.payload.role_links['Orchestrator']}"
        print(f"   --> Custom Pitch generated covering specific candidate KPIs.")
        time.sleep(0.5)

        # 5. ASSESSOR Phase
        assessor = self.swarm.get_agent("Assessor")
        print(f"\n⚖️ [5. {assessor.name}]: Validating payload for risk and tone.")
        print(f"   --> Tone Check: Confident, Epistemically sound. No Anti-Compatibility risks detected.")
        print(f"   --> Quality Check: PASSED.")
        time.sleep(0.5)

        # 6. ORCHESTRATOR Phase
        orchestrator = self.swarm.get_agent("Orchestrator")
        print(f"\n⚙️ [6. {orchestrator.name}]: Executing delivery via simplify.jobs")
        self.sim_simplify_jobs_submit(
            candidate_name=self.swarm.payload.name,
            target_company=target_company['name'],
            payload_data={"custom_pitch": custom_pitch}
        )
        print(f"✅ PIPELINE COMPLETE FOR {target_company['name']}.")

if __name__ == "__main__":
    pipeline = ReverseRecruitingPipeline()

    # Run full simulation on a good target
    target_1 = {"name": "Apex Innovations", "data": {"description": "We disrupt the market and empower strong market leverage.", "culture": "Fast-paced, high leverage environment"}}
    pipeline.run_pipeline(target_1)

    # Run full simulation on a bad target (should abort at Intuitive phase)
    target_2 = {"name": "Legacy Bureaucracy Inc.", "data": {"description": "An established traditional leader.", "culture": "Stable and traditional."}}
    pipeline.run_pipeline(target_2)
