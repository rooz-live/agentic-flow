import { AgentDB } from '../core/agentdb';

interface RoamNode {
  id: string;
  type: 'skill' | 'episode' | 'circle' | 'causal_edge';
  label: string;
  circle?: string;
  metric?: number;
}

interface RoamEdge {
  source: string;
  target: string;
  type: 'relationship' | 'ontology' | 'attribution' | 'metrics';
  weight: number;
}

export interface RoamData {
  nodes: RoamNode[];
  edges: RoamEdge[];
}

export async function generateRoamData(db: AgentDB): Promise<RoamData> {
  const nodes: RoamNode[] = [];
  const edges: RoamEdge[] = [];
  const nodeSet = new Set<string>();

  try {
    // Add circle nodes
    const circles = ['orchestrator', 'assessor', 'analyst', 'innovator', 'seeker', 'intuitive'];
    circles.forEach(circle => {
      const nodeId = `circle:${circle}`;
      nodes.push({
        id: nodeId,
        type: 'circle',
        label: circle.charAt(0).toUpperCase() + circle.slice(1),
        circle,
      });
      nodeSet.add(nodeId);
    });

    // Fetch skills and create skill nodes
    const skills = await db.searchSkills({ task: '', minSuccessRate: 0 });
    skills.forEach((skill: any) => {
      const nodeId = `skill:${skill.id}`;
      const circleMatch = skill.task.match(/\b(orchestrator|assessor|analyst|innovator|seeker|intuitive)\b/i);
      const circle = circleMatch ? circleMatch[1].toLowerCase() : 'orchestrator';
      
      nodes.push({
        id: nodeId,
        type: 'skill',
        label: skill.task.substring(0, 30) + (skill.task.length > 30 ? '...' : ''),
        circle,
        metric: skill.successRate || 0,
      });
      nodeSet.add(nodeId);

      // Attribution edge: skill → circle
      const circleNodeId = `circle:${circle}`;
      if (nodeSet.has(circleNodeId)) {
        edges.push({
          source: nodeId,
          target: circleNodeId,
          type: 'attribution',
          weight: skill.uses || 1,
        });
      }
    });

    // Fetch sample episodes and create episode nodes
    const episodes = await db.getRecentEpisodes(50);
    episodes.forEach((episode: any, index: number) => {
      if (index >= 20) return; // Limit to 20 episodes for visualization clarity

      const nodeId = `episode:${episode.id || index}`;
      const circleMatch = episode.task.match(/\b(orchestrator|assessor|analyst|innovator|seeker|intuitive)\b/i);
      const circle = circleMatch ? circleMatch[1].toLowerCase() : 'orchestrator';

      nodes.push({
        id: nodeId,
        type: 'episode',
        label: `Episode ${index + 1}`,
        circle,
        metric: episode.totalReward || 0,
      });
      nodeSet.add(nodeId);

      // Find related skill and create relationship edge
      const relatedSkill = skills.find((s: any) => 
        s.task.toLowerCase().includes(episode.task.toLowerCase().substring(0, 20))
      );
      if (relatedSkill) {
        const skillNodeId = `skill:${relatedSkill.id}`;
        if (nodeSet.has(skillNodeId)) {
          edges.push({
            source: nodeId,
            target: skillNodeId,
            type: 'relationship',
            weight: episode.success ? 1.0 : 0.5,
          });
        }
      }
    });

    // Fetch causal edges and create causal_edge nodes
    const causalEdges = await db.getCausalEdges();
    causalEdges.forEach((edge: any, index: number) => {
      if (index >= 10) return; // Limit for clarity

      const nodeId = `causal:${edge.id || index}`;
      nodes.push({
        id: nodeId,
        type: 'causal_edge',
        label: `Causal ${index + 1}`,
        metric: edge.confidence || 0,
      });
      nodeSet.add(nodeId);

      // Create ontology edges between causal nodes and skills
      const sourceSkill = skills.find((s: any) => s.task.includes(edge.fromAction));
      const targetSkill = skills.find((s: any) => s.task.includes(edge.toAction));
      
      if (sourceSkill) {
        const sourceNodeId = `skill:${sourceSkill.id}`;
        if (nodeSet.has(sourceNodeId)) {
          edges.push({
            source: sourceNodeId,
            target: nodeId,
            type: 'ontology',
            weight: edge.strength || 0.5,
          });
        }
      }

      if (targetSkill) {
        const targetNodeId = `skill:${targetSkill.id}`;
        if (nodeSet.has(targetNodeId)) {
          edges.push({
            source: nodeId,
            target: targetNodeId,
            type: 'ontology',
            weight: edge.strength || 0.5,
          });
        }
      }
    });

    // Add cross-circle metrics edges (showing collaboration between circles)
    for (let i = 0; i < circles.length; i++) {
      for (let j = i + 1; j < circles.length; j++) {
        const circle1 = circles[i];
        const circle2 = circles[j];
        
        // Count shared skills or episodes
        const sharedMetric = Math.random() * 0.5 + 0.1; // Simplified: in real impl, query actual shared resources
        
        if (sharedMetric > 0.3) {
          edges.push({
            source: `circle:${circle1}`,
            target: `circle:${circle2}`,
            type: 'metrics',
            weight: sharedMetric,
          });
        }
      }
    }

    console.log(`Generated ROAM data: ${nodes.length} nodes, ${edges.length} edges`);
    
    return { nodes, edges };
  } catch (error) {
    console.error('Error generating ROAM data:', error);
    return { nodes, edges };
  }
}

export function generateMockRoamData(): RoamData {
  const circles = ['orchestrator', 'assessor', 'analyst', 'innovator', 'seeker', 'intuitive'];
  const nodes: RoamNode[] = [];
  const edges: RoamEdge[] = [];

  // Create circle nodes
  circles.forEach(circle => {
    nodes.push({
      id: `circle:${circle}`,
      type: 'circle',
      label: circle.charAt(0).toUpperCase() + circle.slice(1),
      circle,
    });
  });

  // Create sample skill nodes
  const skillTemplates = [
    { task: 'Agile full_sprint_cycle', metric: 1.0 },
    { task: 'Agile wsjf_skip_scenario', metric: 0.95 },
    { task: 'Agile minimal_cycle', metric: 1.0 },
    { task: 'Agile analyst_driven', metric: 0.98 },
    { task: 'Agile seeker_driven', metric: 1.0 },
  ];

  skillTemplates.forEach((template, i) => {
    const circleMatch = template.task.match(/(orchestrator|assessor|analyst|innovator|seeker|intuitive)/i);
    const circle = circleMatch ? circleMatch[1].toLowerCase() : circles[i % circles.length];
    
    nodes.push({
      id: `skill:${i}`,
      type: 'skill',
      label: template.task,
      circle,
      metric: template.metric,
    });

    // Add attribution edge to circle
    edges.push({
      source: `skill:${i}`,
      target: `circle:${circle}`,
      type: 'attribution',
      weight: 1.0,
    });
  });

  // Add sample episodes
  for (let i = 0; i < 8; i++) {
    const circle = circles[i % circles.length];
    nodes.push({
      id: `episode:${i}`,
      type: 'episode',
      label: `Episode ${i + 1}`,
      circle,
      metric: 0.8 + Math.random() * 0.2,
    });

    // Connect to related skill
    edges.push({
      source: `episode:${i}`,
      target: `skill:${i % skillTemplates.length}`,
      type: 'relationship',
      weight: 0.9,
    });
  }

  // Add metrics edges between circles
  for (let i = 0; i < circles.length; i++) {
    const next = (i + 1) % circles.length;
    edges.push({
      source: `circle:${circles[i]}`,
      target: `circle:${circles[next]}`,
      type: 'metrics',
      weight: 0.3 + Math.random() * 0.4,
    });
  }

  return { nodes, edges };
}
