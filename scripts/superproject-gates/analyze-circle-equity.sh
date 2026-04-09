#!/bin/bash
# Analyze skill distribution across circles for equity

echo "=== Circle Equity Analysis ==="
echo ""

for circle in orchestrator assessor innovator analyst seeker intuitive; do
  echo "=== $circle Circle ===" 
  COUNT=$(npx agentdb skill search "$circle" 50 --json 2>/dev/null | jq '.skills | length' 2>/dev/null || echo "0")
  echo "Skills: $COUNT"
  
  # Get top 3 skills
  echo "Top Skills:"
  npx agentdb skill search "$circle" 3 2>/dev/null | grep -E "(^#[0-9]:|Description:|Uses:)" || echo "  No skills found"
  echo ""
done

echo "=== Ceremony Coverage ===" 
echo ""
for ceremony in standup wsjf refine replenish review retro; do
  echo -n "$ceremony: "
  npx agentdb skill search "$ceremony" 1 2>/dev/null | grep -E "^#1:" | sed 's/#1: //' || echo "No skills found"
done

echo ""
echo "=== Expected Distribution ===" 
echo "Orchestrator: 3-4 skills (coordination, standup)"
echo "Assessor: 3-4 skills (wsjf, review, validation)"
echo "Innovator: 2-3 skills (retro, learning, innovation)"
echo "Analyst: 2-3 skills (planning, refine, analysis)"
echo "Seeker: 2-3 skills (discovery, replenish, exploration)"
echo "Intuitive: 1-2 skills (sensemaking, synthesis)"
