---
date: 2026-03-06
status: accepted
related_tests: TBD
---

# ADR-001: yo.life Dimensional UI Architecture with MCP/MPP Integration

**Status:** Proposed  
**Date:** 2026-01-07  
**Deciders:** System Architect, UX Lead  
**Circle:** assessor  
**Ceremony:** wsjf

---

## Context and Problem Statement

The yo.life digital cockpit requires a flexible, dimensional UI that can pivot across temporal, spatial, demographic, psychological, and economic factors while integrating with the Model Context Protocol (MCP) for agent coordination and Method Pattern Protocol (MPP) for skill-based execution.

**Key Questions:**
- How do we create an expandable/pivotable menu system that hides pricing until requested?
- How do we integrate MCP server health checks into the dimensional views?
- How do we preserve circle-specific skills during dimension pivots?
- How do we support the rooz.yo.life subscription system within the same architecture?

---

## Decision Drivers

- **User Experience:** Intuitive dimensional navigation without overwhelming users
- **Extensibility:** Support for future dimensions and pivot types
- **Performance:** < 200ms pivot transitions, real-time MCP health updates
- **Modularity:** Separate concerns (UI, MCP integration, episode storage)
- **Privacy:** Hide pricing/sensitive data until explicitly requested
- **Circle Equity:** Balance usage across orchestrator, assessor, innovator, analyst, seeker, intuitive

---

## Considered Options

### Option 1: Single-Page React App with Context API
**Description:** Traditional SPA using React Context for state management, REST API for backend.

**Pros:**
- ✅ Familiar patterns for team
- ✅ Rich ecosystem of components
- ✅ Good developer tooling

**Cons:**
- ❌ Context can become unwieldy with many dimensions
- ❌ Difficult to optimize pivot performance
- ❌ No built-in support for MCP protocol

**WSJF Score:** 5.2 (UBV=7, TC=6, RR=5, JS=3.5)

---

### Option 2: Custom Web Components with MCP-Native Integration
**Description:** Build lightweight web components that natively speak MCP protocol, use dimensional state machine.

**Pros:**
- ✅ Direct MCP integration without translation layer
- ✅ Highly optimized for pivot operations
- ✅ Framework-agnostic (reusable across projects)
- ✅ Natural fit for dimensional state modeling

**Cons:**
- ❌ Higher initial development cost
- ❌ Less mature ecosystem
- ❌ Team learning curve

**WSJF Score:** 7.8 (UBV=9, TC=8, RR=8, JS=3.2)

---

### Option 3: Hybrid React + Web Components Architecture
**Description:** React for main structure, custom web components for MCP/dimensional features.

**Pros:**
- ✅ Best of both worlds
- ✅ Incremental migration path
- ✅ Team can use React knowledge while learning Web Components

**Cons:**
- ❌ Potential performance overhead at boundaries
- ❌ Two mental models to maintain
- ❌ More complex build setup

**WSJF Score:** 6.5 (UBV=8, TC=7, RR=7, JS=3.4)

---

## Decision Outcome

**Chosen Option:** Option 2 - Custom Web Components with MCP-Native Integration

**Rationale:**
The highest WSJF score (7.8) indicates this option delivers maximum value relative to implementation cost. The native MCP integration eliminates impedance mismatch between protocol and UI, and the dimensional state machine provides a natural model for temporal/spatial/economic pivots. While there's a learning curve, the long-term maintainability and performance benefits outweigh initial costs.

**Implementation Notes:**
- Start with `YoLifeCockpit` as the main orchestrator component
- Build `DimensionalPivot` web component for pivot operations
- Create `CircleActivityTimeline` for temporal dimension
- Implement `SpatialPivot` for geographic/location-based views
- Use `RoamGraph` for ROAM exposure visualization
- Integrate pricing reveal as a separate `SubscriptionPanel` component that loads on demand

**Migration Strategy:**
1. Phase 1: Build core web components (2 weeks)
2. Phase 2: MCP integration layer (1 week)
3. Phase 3: Migrate existing React components (2 weeks)
4. Phase 4: rooz.yo.life subscription integration (1 week)

**Rollback Plan:**
Keep existing React components as fallbacks. Use feature flags to toggle between implementations during transition.

---

## Consequences

### Positive Consequences
- ✅ Sub-200ms pivot performance achieved through optimized state machine
- ✅ MCP health checks integrated directly into UI lifecycle
- ✅ Circle skills preserved in dimensional context automatically
- ✅ Expandable menu system naturally supports hierarchical dimensions
- ✅ Pricing hidden by default, revealed on user action
- ✅ Framework-agnostic components reusable in rooz.yo.life

### Negative Consequences
- ⚠️ 2-3 week team ramp-up time for web components
- ⚠️ Smaller ecosystem means more custom tooling
- ⚠️ Need to maintain compatibility layer during transition

### Neutral Consequences
- ℹ️ Build process requires web component polyfills for older browsers
- ℹ️ TypeScript definitions need manual creation for custom elements
- ℹ️ Testing strategy shifts to component-level rather than integration

---

## Validation & Success Criteria

**How will we measure success?**
- [ ] Pivot transition time < 200ms (P50), < 500ms (P95)
- [ ] MCP server health check latency < 100ms
- [ ] Circle equity balance maintained (no circle drops below 10% usage)
- [ ] User testing shows 90%+ can navigate dimensions without training
- [ ] Pricing reveal CTR < 15% (most users don't need to see pricing)
- [ ] Zero data leaks of hidden pricing information
- [ ] rooz.yo.life subscription flow completes in < 3 minutes

**Review Date:** 2026-02-07  
**Circle Review:** assessor (WSJF validation), innovator (retro on learning curve)

---

## Related Decisions

- Supersedes: N/A (first ADR)
- Related to: [Future ADR on MCP transport selection]
- Influences: [Future decisions on mobile app architecture]

---

## References

- [Model Context Protocol Specification](https://spec.modelcontextprotocol.io)
- [Web Components v1 Spec](https://www.w3.org/TR/custom-elements/)
- [Yo.life FLM Framework](https://yo.life)
- [ROAM Exposure Methodology](internal-docs)
- [Circle-Specific Skills Database](AgentDB)

---

## Episode Metadata

**Episode ID:** assessor_wsjf_1736275230  
**Skills Applied:** planning_heavy, assessment_focused, full_cycle  
**Duration:** 4.5 hours  
**Equity Impact:** assessor +1 episode, maintains 16.7% equity

---

## ROAM Classification

**Risk:**
- Performance targets may not be achievable with web components
- Team adoption slower than expected

**Obstacle:**
- Lack of mature web component libraries for complex UI patterns
- Browser compatibility issues with custom elements

**Assumption:**
- Team can learn web components in 2-3 weeks
- MCP protocol stable enough for production use
- Dimensional state machine adequately models all pivot types

**Mitigation:**
- Build performance benchmarks in Phase 1 before committing
- Provide team training and pair programming sessions
- Create polyfill strategy for browser compatibility
- Use feature flags to enable gradual rollout

---

## Notes

During the WSJF ceremony, the assessor circle identified this as the highest priority decision blocking rooz.yo.life launch. The dimensional UI is the foundation for all other yo.life features, making this a critical path item.

The team expressed excitement about learning web components, viewing it as a skill investment that pays dividends across future projects. The orchestrator circle will track learning progress through daily standups.

---

**Template Version:** 1.0  
**Last Updated:** 2026-01-07
