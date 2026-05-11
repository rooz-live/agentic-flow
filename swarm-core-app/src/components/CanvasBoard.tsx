import React, { useState, useEffect } from 'react';
import { CanvasBoardEngine } from '../domains/canvasboard/CanvasBoardEngine';

/**
 * [RCA TRACE]
 * Epic 7: Canvas-Based Interaction
 * TDD Phase: REFACTOR
 * Refactored to dynamically bind to the Holacracy JSON Schema.
 */
export const CanvasBoard: React.FC = () => {
    const [engineState, setEngineState] = useState<{status: string, entropy: number}>({ status: 'PENDING', entropy: 0 });
    useEffect(() => {
        const engine = new CanvasBoardEngine();
        setEngineState(engine.getDiagnostics());
    }, []);

    const [blocks, setBlocks] = useState<{id: string, type: string, x: number, y: number, content: string}[]>([]);

    useEffect(() => {
        // Dynamic schema ingestion (Simulating fetch from physical root artifact)
        const schema = {
            roles: [
                { id: "R1", name: "Institutional Gatekeeper", type: "Role" },
                { id: "R2", name: "Clean Room Modulator", type: "Role" }
            ],
            policies: [
                { id: "P1", name: "Strict DoR/DoD", type: "Policy" },
                { id: "P2", name: "San Gen Shugi", type: "Policy" }
            ]
        };

        const initialBlocks = [
            ...schema.roles.map((r, i) => ({ id: r.id, type: r.type, x: 20 + (i * 220), y: 50, content: r.name })),
            ...schema.policies.map((p, i) => ({ id: p.id, type: p.type, x: 20 + (i * 220), y: 150, content: p.name }))
        ];
        
        setBlocks(initialBlocks);
    }, []);

    const handleDragStart = (e: React.DragEvent, id: string) => {
        e.dataTransfer.setData('text/plain', id);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const id = e.dataTransfer.getData('text/plain');
        const rect = e.currentTarget.getBoundingClientRect();
        
        // Calculate dynamic drag coordinates relative to the canvas layer
        const newX = e.clientX - rect.left - 60; 
        const newY = e.clientY - rect.top - 20;

        setBlocks(prev => prev.map(b => b.id === id ? { ...b, x: newX, y: newY } : b));
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    return (
        <div 
            id="ghost-canvas-board"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            style={{ 
                position: 'relative', 
                width: '100%', 
                height: '350px', 
                background: 'rgba(10, 10, 15, 0.4)', 
                border: '1px solid rgba(0, 240, 255, 0.2)', 
                borderRadius: '16px',
                marginTop: '2rem',
                overflow: 'hidden',
                boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)'
            }}
        >
            <h4 style={{ position: 'absolute', top: 15, left: 20, color: '#64748b', margin: 0, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px' }}>
                Holacracy Governance Canvas (Drag Nodes to Bind)
            </h4>
            
            {blocks.map(b => (
                <div 
                    key={b.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, b.id)}
                    className="draggable-prompt-block"
                    style={{
                        position: 'absolute',
                        left: b.x,
                        top: b.y,
                        padding: '1rem',
                        background: b.type === 'Role' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(236, 72, 153, 0.15)',
                        border: `1px solid ${b.type === 'Role' ? '#818cf8' : '#f472b6'}`,
                        borderRadius: '12px',
                        color: '#fff',
                        cursor: 'move',
                        boxShadow: `0 5px 15px ${b.type === 'Role' ? 'rgba(129, 140, 248, 0.1)' : 'rgba(244, 114, 182, 0.1)'}`,
                        zIndex: 10,
                        userSelect: 'none',
                        minWidth: '150px'
                    }}
                >
                    <div style={{ fontSize: '0.65rem', color: b.type === 'Role' ? '#a5b4fc' : '#fbcfe8', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {b.type} Node
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                        {b.content}
                    </div>
                </div>
            ))}
        
            <div id="engine-state-dump" style={{ display: 'none' }}>{engineState.status}:{engineState.entropy}</div>
        </div>
    );
};
