"""
Reverse Recruiting Swarm - Role Definitions
Defines the 6 Holacratic Roles (Seeker, Intuitive, Analyst, Assessor, Innovator, Orchestrator)
and the candidate payload for reverse recruiting.
"""

from typing import Dict, Any
from pydantic import BaseModel, Field
import subprocess
import sys
import os

class AgentRole(BaseModel):
    name: str
    archetype: str
    purpose: str
    domains: list[str]
    accountabilities: list[str]
    system_prompt: str

class CandidatePayload(BaseModel):
    name: str = "Shahrooz Bhopti"
    core_expertise: str = "Agile Methodologies and Data Analytics"
    pitch: str = "My expanding agentics coaching expertise has lean foundations in Agile methodologies and Data Analytics, and I'm passionate about contributing value to product teams, programs, and portfolios through effective coaching and strategic insight."
    links: list[str] = [
        "https://cal.rooz.live",
        "https://cv.rooz.live",
        "https://decisioncall.com",
        "https://TAG.VOTE | https://O-GOV.com",
        "https://artchat.art | https://chatfans.fans"
    ]
    role_links: Dict[str, str] = {
        "Analyst": "https://wapp.rooz.o-gov.com/analyst",
        "Assessor": "https://wapp.rooz.o-gov.com/assessor",
        "Innovator": "https://wapp.rooz.o-gov.com/innovator",
        "Intuitive": "https://wapp.rooz.o-gov.com/intuitive",
        "Orchestrator": "https://wapp.rooz.o-gov.com/orchestrator",
        "Seeker": "https://wapp.rooz.o-gov.com/seeker"
    }

class ReverseRecruitingSwarm:
    def __init__(self):
        # CSQBM Governance Constraint: Force truth matrix validation
        try:
            subprocess.run(["bash", "scripts/validators/project/check-csqbm.sh"], check=True)
        except subprocess.CalledProcessError:
            print("ERROR (CSQBM): agentdb.db stale. Validation halted.", file=sys.stderr)
            sys.exit(1)
        except FileNotFoundError:
            pass
            
        self.payload = CandidatePayload()
        self.agents = self._initialize_agents()

    def _initialize_agents(self) -> Dict[str, AgentRole]:
        return {
            "Seeker": AgentRole(
                name="Seeker",
                archetype="Signals & Horizon Scanner",
                purpose="Discover non-obvious job opportunities, hidden market signals, and network bridges.",
                domains=["Traditional job boards", "Stealth startups", "Talent networks"],
                accountabilities=["Scrape for roles", "Expand candidate pipeline", "Maintain option value"],
                system_prompt="""You are the Seeker Agent. Your role is continuous discovery.
You scan job markets for unlisted or newly listed opportunities that require Agile and Data Analytics coaching.
Output raw leads for the Intuitive to filter. Focus on raw optionality."""
            ),
            "Intuitive": AgentRole(
                name="Intuitive",
                archetype="Foresight Scout / Customer Empathy Lead",
                purpose="Ensure candidate's anti-fragile thresholds align with the target organization.",
                domains=["Company culture sentiment", "Strategic position", "Market pressure vectors"],
                accountabilities=["Filter misaligned roles", "Score employers against prep cases", "Avoid 'superficial relief' roles"],
                system_prompt="""You are the Intuitive Agent.
Take the Seeker's raw leads and evaluate the company's "Strategic Tension".
Use the Prep Cases (e.g. Apex v BofA, Apple v T-Mobile) to measure if the company provides Anti-Fragile leverage or superficial relief.
Discard superficial relief roles."""
            ),
            "Analyst": AgentRole(
                name="Analyst",
                archetype="Metrics Steward / Insights Synthesizer",
                purpose="Extract hard data and map market requirements to candidate capabilities.",
                domains=["Job descriptions (JDs)", "Skill extraction", "Fit percentages"],
                accountabilities=["Analyze JDs", "Compute fit percentages", "Map candidate Agile/Data expertise to target KPIs"],
                system_prompt="""You are the Analyst Agent.
Analyze the job descriptions of validated targets.
Extract required KPIs, skill constraints, and match them explicitly against Shahrooz's Agile/Data Analytics background.
Provide a diagnostic fit report."""
            ),
            "Innovator": AgentRole(
                name="Innovator",
                archetype="Venture Builder / Prototyping Owner",
                purpose="Bypass traditional ATS systems via high-impact, differentiated interventions.",
                domains=["Custom outreach", "Value-prop prototyping", "Portfolio linking"],
                accountabilities=["Generate custom pitch emails", "Design 1-pagers", "Select specific candidate role links to highlight"],
                system_prompt=f"""You are the Innovator Agent.
Take the Analyst's fit report and craft a unique, pattern-breaking outreach strategy.
Embed the core pitch: '{CandidatePayload().pitch}'
Highlight the most relevant domain links (e.g. wapp.rooz.o-gov.com/analyst if an analytics role).
Create a highly customized email for hiring managers."""
            ),
            "Assessor": AgentRole(
                name="Assessor",
                archetype="Quality Assessor / Risk Steward",
                purpose="Validate the application payload and mitigate risks before deployment.",
                domains=["Compliance", "Payload quality", "Anti-compatibility checks"],
                accountabilities=["Final Go/No-Go check on pitch", "Correctness verification", "Tone validation"],
                system_prompt="""You are the Assessor Agent.
Review the Innovator's custom pitch.
Check for risk (too passive, too aggressive) and assure the tone accurately reflects a highly strategic, Holacratic-minded agile coach.
Approve or reject the artifact before orchestration."""
            ),
            "Orchestrator": AgentRole(
                name="Orchestrator",
                archetype="Flow Orchestrator / Dependency Steward",
                purpose="Manage cadence, API dependencies, and actual delivery of applications.",
                domains=["simplify.jobs API", "Cadence scheduling", "Application tracking"],
                accountabilities=["Submit via endpoints", "Manage rate limits", "Update internal tracking status"],
                system_prompt="""You are the Orchestrator Agent.
Once the Assessor approves an artifact, you package the submission and execute the delivery via API (like simplify.jobs).
Manage rate limits, wait states, and log final submission status."""
            )
        }

    def get_agent(self, role_name: str) -> AgentRole:
        return self.agents.get(role_name)

if __name__ == "__main__":
    swarm = ReverseRecruitingSwarm()

    print(f"Loaded Candidate Payload for: {swarm.payload.name}")
    print(f"Core Pitch: {swarm.payload.pitch}\n")

    for role_name, agent in swarm.agents.items():
        print(f"Role: {agent.name} ({agent.archetype})")
        print(f"Purpose: {agent.purpose}")
        print(f"Prompt Sneak-Peek: {agent.system_prompt[:60]}...")
        print("-" * 50)
