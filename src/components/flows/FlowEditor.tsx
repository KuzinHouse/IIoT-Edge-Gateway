'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Play, Pause, Save, Undo, Redo, ZoomIn, ZoomOut, 
  Plus, Trash2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { NodePalette } from './NodePalette';
import { FlowCanvas } from './FlowCanvas';
import { cn } from '@/lib/utils';

// Types matching the expected Flow interface
export interface FlowNode {
  id: string;
  flowId: string;
  type: string;
  label: string;
  x: number;
  y: number;
  config?: Record<string, any>;
  executionOrder: number;
  inputs: string[];
  outputs: string[];
}

export interface FlowEdge {
  id: string;
  flowId: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
}

export interface Flow {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'error';
  nodes: FlowNode[];
  edges: FlowEdge[];
}

interface FlowEditorProps {
  flow?: Flow;
  onSave?: (flow: Flow) => void;
  onRun?: () => void;
  onStop?: () => void;
}

export function FlowEditor({ flow, onSave, onRun, onStop }: FlowEditorProps) {
  const [nodes, setNodes] = useState<FlowNode[]>(flow?.nodes || []);
  const [edges, setEdges] = useState<FlowEdge[]>(flow?.edges || []);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isRunning, setIsRunning] = useState(flow?.status === 'running');
  const [history, setHistory] = useState<{ nodes: FlowNode[]; edges: FlowEdge[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showPalette, setShowPalette] = useState(true);
  const canvasRef = useRef<HTMLDivElement>(null);

  const flowId = flow?.id || 'new-flow';

  // NOTE: When switching between different flows, the parent component
  // should pass a changing `key={flow.id}` to remount this component.
  // This avoids syncing from props via effects and keeps local state clean.

  // Save state to history
  const saveToHistory = useCallback(() => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ nodes: [...nodes], edges: [...edges] });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [nodes, edges, history, historyIndex]);

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setNodes(prev.nodes);
      setEdges(prev.edges);
      setHistoryIndex(historyIndex - 1);
    }
  }, [history, historyIndex]);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setNodes(next.nodes);
      setEdges(next.edges);
      setHistoryIndex(historyIndex + 1);
    }
  }, [history, historyIndex]);

  // Add node — accepts full metadata from palette drag
  const handleAddNode = useCallback((type: string, x: number, y: number, metadata?: { label: string; inputs: number; outputs: number }) => {
    const inputs = metadata
      ? Array.from({ length: metadata.inputs }, (_, i) => `input-${i}`)
      : ['input'];
    const outputs = metadata
      ? Array.from({ length: metadata.outputs }, (_, i) => `output-${i}`)
      : ['output'];

    const newNode: FlowNode = {
      id: `node-${Date.now()}`,
      flowId,
      type,
      label: metadata?.label || `${type.charAt(0).toUpperCase() + type.slice(1)} ${nodes.length + 1}`,
      x,
      y,
      executionOrder: nodes.length,
      inputs,
      outputs,
    };
    setNodes(prev => [...prev, newNode]);
    saveToHistory();
  }, [nodes.length, flowId, saveToHistory]);

  // Move node
  const handleMoveNode = useCallback((id: string, x: number, y: number) => {
    setNodes(prev => prev.map(node => 
      node.id === id ? { ...node, x, y } : node
    ));
  }, []);

  // Delete selected
  const handleDelete = useCallback(() => {
    if (selectedNode) {
      setNodes(prev => prev.filter(n => n.id !== selectedNode));
      setEdges(prev => prev.filter(e => e.source !== selectedNode && e.target !== selectedNode));
      setSelectedNode(null);
      saveToHistory();
    } else if (selectedEdge) {
      setEdges(prev => prev.filter(e => e.id !== selectedEdge));
      setSelectedEdge(null);
      saveToHistory();
    }
  }, [selectedNode, selectedEdge, saveToHistory]);

  // Add edge
  const handleAddEdge = useCallback((source: string, sourceHandle: string, target: string, targetHandle: string) => {
    // Prevent duplicate edges
    const exists = edges.some(
      e => e.source === source && e.sourceHandle === sourceHandle && 
           e.target === target && e.targetHandle === targetHandle
    );
    if (exists) return;

    // Prevent self-connections
    if (source === target) return;

    const newEdge: FlowEdge = {
      id: `edge-${Date.now()}`,
      flowId,
      source,
      sourceHandle,
      target,
      targetHandle,
    };
    setEdges(prev => [...prev, newEdge]);
    saveToHistory();
  }, [edges, flowId, saveToHistory]);

  // Toggle run
  const handleToggleRun = useCallback(() => {
    setIsRunning(prev => {
      const next = !prev;
      if (prev) {
        onStop?.();
      } else {
        onRun?.();
      }
      return next;
    });
  }, [onRun, onStop]);

  // Save flow
  const handleSave = useCallback(() => {
    onSave?.({
      id: flow?.id || `flow-${Date.now()}`,
      name: flow?.name || 'New Flow',
      status: isRunning ? 'running' : 'stopped',
      nodes,
      edges,
    });
  }, [flow, nodes, edges, isRunning, onSave]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        handleDelete();
      } else if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      } else if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDelete, handleUndo, handleRedo, handleSave]);

  return (
    <Card className="bg-card border-border h-full flex flex-col">
      {/* Toolbar */}
      <CardHeader className="py-3 px-4 space-y-0 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold text-foreground">
              {flow?.name || 'Flow Editor'}
            </CardTitle>
            {flow && (
              <Badge 
                variant="outline" 
                className={cn(
                  "ml-2",
                  isRunning 
                    ? "bg-green-500/10 text-green-500 border-green-500/30" 
                    : flow.status === 'error'
                      ? "bg-red-500/10 text-red-500 border-red-500/30"
                      : "bg-muted text-muted-foreground"
                )}
              >
                {isRunning ? 'Running' : flow.status === 'error' ? 'Error' : 'Stopped'}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Undo/Redo */}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="h-8 w-8"
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="h-8 w-8"
            >
              <Redo className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Zoom */}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setZoom(prev => Math.min(2, prev + 0.1))}
              className="h-8 w-8"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setZoom(prev => Math.max(0.3, prev - 0.1))}
              className="h-8 w-8"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Actions */}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setShowPalette(!showPalette)}
              className={cn("h-8 w-8", showPalette && "bg-primary/20 text-primary")}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleDelete}
              disabled={!selectedNode && !selectedEdge}
              className="h-8 w-8"
            >
              <Trash2 className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Run/Stop */}
            <Button 
              variant={isRunning ? "destructive" : "default"}
              size="sm"
              onClick={handleToggleRun}
              className="gap-1"
            >
              {isRunning ? (
                <>
                  <Pause className="h-4 w-4" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Run
                </>
              )}
            </Button>

            <Button 
              variant="outline"
              size="sm"
              onClick={handleSave}
              className="gap-1"
            >
              <Save className="h-4 w-4" />
              Save
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Main Content */}
      <CardContent className="flex-1 flex p-0 overflow-hidden">
        {/* Node Palette */}
        {showPalette && (
          <div className="w-56 border-r border-border bg-muted/30 p-3 overflow-y-auto shrink-0">
            <NodePalette onDragStart={(type) => {}} />
          </div>
        )}

        {/* Canvas */}
        <div className="flex-1 relative" ref={canvasRef}>
          <FlowCanvas
            nodes={nodes}
            edges={edges}
            zoom={zoom}
            pan={pan}
            selectedNode={selectedNode}
            selectedEdge={selectedEdge}
            onSelectNode={setSelectedNode}
            onSelectEdge={setSelectedEdge}
            onMoveNode={handleMoveNode}
            onAddEdge={handleAddEdge}
            onAddNode={handleAddNode}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default FlowEditor;
