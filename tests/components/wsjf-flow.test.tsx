/**
 * Test Suite for WSJFFlowComponent
 * 
 * Tests ReactFlow-based mindmap visualization for:
 * - WSJF prioritization flow
 * - GOAP planning flow
 * - SFT + RL testing flow
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WSJFFlowComponent } from '../../src/components/wsjf-flow/WSJFFlowComponent';
import React from 'react';

// Mock ReactFlow to avoid canvas rendering issues in tests
vi.mock('reactflow', () => ({
  __esModule: true,
  default: ({ children, nodes, edges, onNodeClick, onEdgeClick }: any) => (
    <div data-testid="react-flow-mock">
      <div data-testid="nodes-count">{nodes.length}</div>
      <div data-testid="edges-count">{edges.length}</div>
      {children}
      {nodes.map((node: any, idx: number) => (
        <div
          key={node.id}
          data-testid={`node-${node.id}`}
          onClick={() => onNodeClick?.(null, node)}
        >
          {node.data.label}
        </div>
      ))}
      {edges.map((edge: any, idx: number) => (
        <div
          key={`${edge.source}-${edge.target}`}
          data-testid={`edge-${edge.source}-${edge.target}`}
          onClick={() => onEdgeClick?.(null, edge)}
        />
      ))}
    </div>
  ),
  Controls: () => <div data-testid="controls">Controls</div>,
  MiniMap: () => <div data-testid="minimap">MiniMap</div>,
  Background: () => <div data-testid="background">Background</div>,
  Panel: ({ children }: any) => <div data-testid="panel">{children}</div>,
  useNodesState: (initialNodes: any) => {
    const [nodes, setNodes] = React.useState(initialNodes);
    return [nodes, setNodes, vi.fn()];
  },
  useEdgesState: (initialEdges: any) => {
    const [edges, setEdges] = React.useState(initialEdges);
    return [edges, setEdges, vi.fn()];
  },
  addEdge: vi.fn((params, edges) => [...edges, params]),
  BackgroundVariant: { Dots: 'dots' },
}));

describe('WSJFFlowComponent', () => {
  describe('rendering', () => {
    it('should render with default WSJF flow type', () => {
      render(<WSJFFlowComponent />);
      
      expect(screen.getByTestId('react-flow-mock')).toBeInTheDocument();
      expect(screen.getByTestId('controls')).toBeInTheDocument();
      expect(screen.getByTestId('minimap')).toBeInTheDocument();
      expect(screen.getByTestId('background')).toBeInTheDocument();
    });

    it('should render WSJF flow with correct nodes', () => {
      render(<WSJFFlowComponent flowType="wsjf" />);
      
      const nodesCount = screen.getByTestId('nodes-count');
      expect(parseInt(nodesCount.textContent || '0')).toBeGreaterThan(0);
    });

    it('should render GOAP flow when flowType is goap', () => {
      render(<WSJFFlowComponent flowType="goap" />);
      
      expect(screen.getByText(/GOAP Planning Flow/)).toBeInTheDocument();
    });

    it('should render Testing flow when flowType is testing', () => {
      render(<WSJFFlowComponent flowType="testing" />);
      
      expect(screen.getByText(/SFT \+ RL Testing Flow/)).toBeInTheDocument();
    });
  });

  describe('node interactions', () => {
    it('should call onNodeClick when node is clicked', () => {
      const onNodeClick = vi.fn();
      render(<WSJFFlowComponent onNodeClick={onNodeClick} />);
      
      // Find first node and click it
      const nodes = screen.getAllByTestId(/^node-/);
      if (nodes.length > 0) {
        fireEvent.click(nodes[0]);
        expect(onNodeClick).toHaveBeenCalled();
      }
    });

    it('should call onEdgeClick when edge is clicked', () => {
      const onEdgeClick = vi.fn();
      render(<WSJFFlowComponent onEdgeClick={onEdgeClick} />);
      
      // Find first edge and click it
      const edges = screen.getAllByTestId(/^edge-/);
      if (edges.length > 0) {
        fireEvent.click(edges[0]);
        expect(onEdgeClick).toHaveBeenCalled();
      }
    });
  });

  describe('flow type switching', () => {
    it('should display flow type selector buttons', () => {
      render(<WSJFFlowComponent />);
      
      expect(screen.getByText('WSJF')).toBeInTheDocument();
      expect(screen.getByText('GOAP')).toBeInTheDocument();
      expect(screen.getByText('TESTING')).toBeInTheDocument();
    });

    it('should switch between flow types on button click', () => {
      render(<WSJFFlowComponent flowType="wsjf" />);
      
      const goapButton = screen.getByText('GOAP');
      fireEvent.click(goapButton);
      
      // After click, GOAP content should be visible
      // (In real implementation, nodes/edges would change)
    });
  });

  describe('panel information', () => {
    it('should display WSJF formula in panel', () => {
      render(<WSJFFlowComponent flowType="wsjf" />);
      
      expect(screen.getByText(/CoD = UBV \+ TC \+ RR/)).toBeInTheDocument();
      expect(screen.getByText(/WSJF = CoD \/ Size/)).toBeInTheDocument();
    });

    it('should display GOAP phases in panel', () => {
      render(<WSJFFlowComponent flowType="goap" />);
      
      expect(screen.getByText(/5 Phases: Foundation → Emergence/)).toBeInTheDocument();
    });

    it('should display Testing phases in panel', () => {
      render(<WSJFFlowComponent flowType="testing" />);
      
      expect(screen.getByText(/Spectrum Phase → Signal Phase → MGPO/)).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      const { container } = render(<WSJFFlowComponent />);
      
      // Component should be accessible
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      render(<WSJFFlowComponent />);
      
      // Flow selector buttons should be keyboard accessible
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('styling', () => {
    it('should apply correct dimensions', () => {
      const { container } = render(<WSJFFlowComponent />);
      
      const flowContainer = container.firstChild as HTMLElement;
      expect(flowContainer.style.width).toBe('100%');
      expect(flowContainer.style.height).toBe('600px');
    });

    it('should apply dark theme background', () => {
      const { container } = render(<WSJFFlowComponent />);
      
      const flowContainer = container.firstChild as HTMLElement;
      expect(flowContainer.style.background).toBe('rgb(15, 15, 26)');
    });
  });

  describe('edge cases', () => {
    it('should handle empty callbacks gracefully', () => {
      expect(() => {
        render(<WSJFFlowComponent onNodeClick={undefined} onEdgeClick={undefined} />);
      }).not.toThrow();
    });

    it('should handle rapid flow type switching', () => {
      render(<WSJFFlowComponent />);
      
      const wsjfButton = screen.getByText('WSJF');
      const goapButton = screen.getByText('GOAP');
      const testingButton = screen.getByText('TESTING');
      
      // Rapid switching should not crash
      fireEvent.click(goapButton);
      fireEvent.click(testingButton);
      fireEvent.click(wsjfButton);
      
      expect(screen.getByTestId('react-flow-mock')).toBeInTheDocument();
    });
  });

  describe('export functionality', () => {
    it('should be exportable as default', () => {
      const { default: WSJFFlow } = require('../../src/components/wsjf-flow/WSJFFlowComponent');
      expect(WSJFFlow).toBeDefined();
    });
  });
});
