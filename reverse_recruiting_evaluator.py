"""
Reverse Recruiting Evaluator - Tension Logic
Implements the specific "Prep Cases" logic for reverse recruiting and evaluates companies.
"""

from typing import Dict, List, Any
from pydantic import BaseModel, Field

# Schema definition
class TensionPrepCase(BaseModel):
    name: str = Field(..., description="The name of the prep case, e.g. Apex v BofA/WF")
    description: str = Field(..., description="Details of the strategic tension simulated by this case.")
    anti_fragility_indicator: str = Field(..., description="What to look for as a sign of anti-fragility.")
    superficial_relief_indicator: str = Field(..., description="What to look for as a sign of superficial relief (anti-compatibility risk).")
    weight: float = Field(default=1.0)

class CompanyEvaluationResult(BaseModel):
    company_name: str
    anti_fragility_score: float # 0.0 to 100.0
    superficial_relief_score: float # 0.0 to 100.0
    prep_case_matches: Dict[str, float] # Case name to relevance score
    recommendation: str
    overall_tension_rating: str

class ReverseRecruitingEvaluator:
    def __init__(self):
        self.prep_cases = self._initialize_prep_cases()

    def _initialize_prep_cases(self) -> List[TensionPrepCase]:
        return [
            TensionPrepCase(
                name="Apex v BofA/WF",
                description="May Apex turn a bull into a bear? Evaluates market disruption potential versus legacy entrenchment.",
                anti_fragility_indicator="Organization is structured to gain leverage from adversarial market conditions or legacy competitor stagnation.",
                superficial_relief_indicator="Organization relies on established market share and resists changing structural norms.",
                weight=1.5
            ),
            TensionPrepCase(
                name="Apple v Sprint/T-Mobile",
                description="Evaluates infrastructural dependencies and hardware/network strategic leverage.",
                anti_fragility_indicator="Organization maintains strong bargaining power over infrastructure providers.",
                superficial_relief_indicator="Organization is structurally subordinate to a larger ecosystem without a path to leverage.",
                weight=1.2
            ),
            TensionPrepCase(
                name="Artchat v MAA",
                description="Evaluates artistic/community engagement vs. established property management/legacy systems.",
                anti_fragility_indicator="Empowers tenant/community advocacy through innovative stacks.",
                superficial_relief_indicator="Reinforces traditional property power dynamics without tenant leverage.",
                weight=1.0
            ),
            TensionPrepCase(
                name="Coast Guard v Veterans",
                description="Evaluates differing sub-cultures of duty, protection, and post-legitimacy service structures.",
                anti_fragility_indicator="Translates duty into actionable, protective strategies for users.",
                superficial_relief_indicator="Relies purely on traditional solidarity without performance outcomes.",
                weight=1.0
            ),
            TensionPrepCase(
                name="Courts' Courtesy",
                description="Evaluates legal tension, compliance, and epistemic outsourcing versus system normalization.",
                anti_fragility_indicator="Maintains wholeness and confronts legal/compliance reality creatively.",
                superficial_relief_indicator="Outsources legal epistemology blindly, seeking superficial compliance.",
                weight=1.8
            ),
        ]

    def evaluate_company(self, company_name: str, company_data: Dict[str, Any]) -> CompanyEvaluationResult:
        """
        Evaluate a target company for candidate placement.
        In a full Swarm implementation, this logic is augmented by LLM analysis from the Intuitive and Analyst agents.
        """
        af_score = 0.0
        sr_score = 0.0
        matches = {}

        description_text = str(company_data.get("description", "")).lower()
        culture_text = str(company_data.get("culture", "")).lower()

        for case in self.prep_cases:
            relevance = 0.5

            # Anti-Fragility signals
            if "disrupt" in description_text or "leverage" in culture_text or "innovative" in description_text:
                af_score += 15 * case.weight
                relevance += 0.2

            # Superficial Relief signals
            if "established" in description_text or "stable" in culture_text or "traditional" in description_text:
                sr_score += 10 * case.weight
                relevance += 0.1

            matches[case.name] = min(1.0, relevance)

        max_possible = sum(c.weight for c in self.prep_cases) * 15

        # Prevent division by zero if weights are 0
        if max_possible > 0:
            af_score = min(100.0, (af_score / max_possible) * 100)
            sr_score = min(100.0, (sr_score / max_possible) * 100)

        # Recommendation Logic
        if af_score > 60 and sr_score < 40:
            rating = "Optimal Tension (Anti-Fragile)"
            rec = "Strong target. The organization exhibits characteristics that will provoke growth and align with your post-legitimacy world order theories."
        elif sr_score > 60 and af_score < 40:
            rating = "Too Comfortable (Superficial Relief)"
            rec = "Caution. This role may lead to normalization and loss of strategic tension. Ensure the position offers explicit change-agent authority."
        elif af_score > 60 and sr_score > 60:
            rating = "Contradictory/Toxic Tension"
            rec = "High risk. The organization sends mixed signals about its structural leverage."
        else:
            rating = "Balanced/Neutral"
            rec = "Further discovery required by the Intuitive and Seeker agents."

        return CompanyEvaluationResult(
            company_name=company_name,
            anti_fragility_score=round(af_score, 2),
            superficial_relief_score=round(sr_score, 2),
            prep_case_matches=matches,
            recommendation=rec,
            overall_tension_rating=rating
        )

if __name__ == "__main__":
    import json
    evaluator = ReverseRecruitingEvaluator()

    targets = [
        {"name": "Dynamic Startup", "data": {"description": "We disrupt traditional finance through innovative tech and build strong leverage.", "culture": "Fast-paced, high leverage environment"}},
        {"name": "Legacy Bank Corp", "data": {"description": "An established traditional leader in banking.", "culture": "Stable and traditional."}},
    ]

    print("Testing Reverse Recruiting Evaluator Tension Logic:")
    for target in targets:
        result = evaluator.evaluate_company(target["name"], target["data"])
        print(f"\nTarget: {result.company_name}")
        print(f"Rating: {result.overall_tension_rating}")
        print(f"AF Score: {result.anti_fragility_score}% | SR Score: {result.superficial_relief_score}%")
        print(f"Recommendation: {result.recommendation}")
