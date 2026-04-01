'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { 
  Database, Wifi, Cpu, Zap, Calculator, Filter, 
  GitBranch, Merge, Timer, Clock, Repeat, MessageSquare,
  FileOutput, AlertTriangle
} from 'lucide-react';

// Use the same exported types from FlowEditor
import type { FlowNode, FlowEdge } from './FlowEditor';

interface FlowCanvasProps {
  nodes: FlowNode[];
  edges: FlowEdge[];
  zoom: number;
  pan: { x: number; y: number };
  selectedNode: string | null;
  selectedEdge: string | null;
  onSelectNode: (id: string | null) => void;
  onSelectEdge: (id: string | null) => void;
  onMoveNode: (id: string, x: number, y: number) => void;
  onAddEdge: (source: string, sourceHandle: string, target: string, targetHandle: string) => void;
  onAddNode: (type: string, x: number, y: number, metadata?: { label: string; inputs: number; outputs: number }) => void;
}

const NODE_WIDTH = 160;
const NODE_HEIGHT = 60;
const HANDLE_RADIUS = 5;

const getNodeIcon = (type: string) => {
  switch (type) {
    case 'modbus-read':
    case 'modbus-write':
      return <Database className="h-4 w-4" />;
    case 'mqtt-subscribe':
    case 'mqtt-publish':
      return <Wifi className="h-4 w-4" />;
    case 'opcua-read':
      return <Cpu className="h-4 w-4" />;
    case 'inject':
      return <Zap className="h-4 w-4" />;
    case 'function':
      return <Calculator className="h-4 w-4" />;
    case 'filter':
      return <Filter className="h-4 w-4" />;
    case 'switch':
      return <GitBranch className="h-4 w-4" />;
    case 'merge':
      return <Merge className="h-4 w-4" />;
    case 'interval':
      return <Timer className="h-4 w-4" />;
    case 'schedule':
      return <Clock className="h-4 w-4" />;
    case 'loop':
      return <Repeat className="h-4 w-4" />;
    case 'debug':
      return <MessageSquare className="h-4 w-4" />;
    case 'file':
      return <FileOutput className="h-4 w-4" />;
    case 'alarm':
      return <AlertTriangle className="h-4 w-4" />;
    default:
      return <Database className="h-4 w-4" />;
  }
};

// Return a CSS color string for the node border
const getNodeColor = (type: string): string => {
  if (type.includes('modbus')) return '#3b82f6'; // blue-500
  if (type.includes('mqtt')) return '#22c55e'; // green-500
  if (type.includes('opcua')) return '#a855f7'; // purple-500
  if (type.includes('inject') || type.includes('interval') || type.includes('schedule')) return '#eab308'; // yellow-500
  if (type.includes('function') || type.includes('filter')) return '#f97316'; // orange-500
  if (type.includes('alarm')) return '#ef4444'; // red-500
  if (type.includes('switch')) return '#ec4899'; // pink-500
  if (type.includes('merge')) return '#6366f1'; // indigo-500
  if (type.includes('loop')) return '#84cc16'; // lime-500
  return '#6b7280'; // gray-500
};

// Find the index of a handle by its name
const findHandleIndex = (handles: string[], handleName: string): number => {
  const idx = handles.indexOf(handleName);
  return idx >= 0 ? idx : 0;
};

// Get handle position relative to the canvas coordinate system
const getHandlePosition = (
  node: FlowNode,
  isOutput: boolean,
  index: number = 0
) => {
  const handles = isOutput ? node.outputs : node.inputs;
  const totalHandles = handles.length;

  // If no handles of this type, return the center of the appropriate side
  if (totalHandles === 0) {
    return {
      x: isOutput ? node.x + NODE_WIDTH : node.x,
      y: node.y + NODE_HEIGHT / 2,
    };
  }

  // Distribute handles evenly along the node height
  const spacing = NODE_HEIGHT / (totalHandles + 1);
  return {
    x: isOutput ? node.x + NODE_WIDTH : node.x,
    y: node.y + spacing * (index + 1),
  };
};

export function FlowCanvas({
  nodes,
  edges,
  zoom,
  pan,
  selectedNode,
  selectedEdge,
  onSelectNode,
  onSelectEdge,
  onMoveNode,
  onAddEdge,
  onAddNode,
}: FlowCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragNode, setDragNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connectingFrom, setConnectingFrom] = useState<{
    nodeId: string;
    handle: string;
    isOutput: boolean;
  } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Handle drop from palette
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const nodeType = e.dataTransfer.getData('nodeType');
      const metadataStr = e.dataTransfer.getData('nodeMetadata');

      if (nodeType && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // Convert screen coords to canvas coords
        const canvasX = (e.clientX - rect.left - pan.x) / zoom;
        const canvasY = (e.clientY - rect.top - pan.y) / zoom;

        let metadata: { label: string; inputs: number; outputs: number } | undefined;
        if (metadataStr) {
          try {
            metadata = JSON.parse(metadataStr);
          } catch {
            // ignore parse error
          }
        }

        onAddNode(
          nodeType,
          canvasX - NODE_WIDTH / 2,
          canvasY - NODE_HEIGHT / 2,
          metadata
        );
      }
    },
    [zoom, pan, onAddNode]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  // Handle node dragging
  const handleNodeMouseDown = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation();
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;

      // The SVG has transform: translate(pan.x, pan.y) scale(zoom)
      // So screen position = pan + nodePos * zoom
      // => nodePos = (screenPos - pan) / zoom
      const nodeScreenX = pan.x + node.x * zoom;
      const nodeScreenY = pan.y + node.y * zoom;

      setDragNode(nodeId);
      setDragOffset({
        x: e.clientX - nodeScreenX,
        y: e.clientY - nodeScreenY,
      });
      setIsDragging(true);
      onSelectNode(nodeId);
      onSelectEdge(null);
    },
    [nodes, zoom, pan, onSelectNode, onSelectEdge]
  );

  // Handle mouse move for dragging and connecting
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && dragNode) {
        // Convert screen position to canvas coordinates
        const newCanvasX = (e.clientX - pan.x - dragOffset.x) / zoom;
        const newCanvasY = (e.clientY - pan.y - dragOffset.y) / zoom;
        onMoveNode(dragNode, newCanvasX, newCanvasY);
      }
      if (connectingFrom && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePos({
          x: (e.clientX - rect.left - pan.x) / zoom,
          y: (e.clientY - rect.top - pan.y) / zoom,
        });
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        setDragNode(null);
      }
      if (connectingFrom) {
        setConnectingFrom(null);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragNode, dragOffset, zoom, pan, connectingFrom, onMoveNode]);

  // Handle canvas click (deselect)
  const handleCanvasClick = () => {
    onSelectNode(null);
    onSelectEdge(null);
  };

  // Start connecting from an output handle
  const handleOutputMouseDown = useCallback(
    (e: React.MouseEvent, nodeId: string, handle: string) => {
      e.stopPropagation();
      e.preventDefault();
      setConnectingFrom({ nodeId, handle, isOutput: true });
    },
    []
  );

  // Complete connection at an input handle
  const handleInputMouseUp = useCallback(
    (e: React.MouseEvent, nodeId: string, handle: string) => {
      e.stopPropagation();
      if (connectingFrom && connectingFrom.nodeId !== nodeId) {
        // Output -> Input connection
        if (connectingFrom.isOutput) {
          onAddEdge(connectingFrom.nodeId, connectingFrom.handle, nodeId, handle);
        }
      }
      setConnectingFrom(null);
    },
    [connectingFrom, onAddEdge]
  );

  // Build a bezier path between two points
  const buildEdgePath = (
    sx: number,
    sy: number,
    tx: number,
    ty: number
  ) => {
    const dx = tx - sx;
    const cp = Math.max(50, Math.abs(dx) * 0.5);
    return `M ${sx} ${sy} C ${sx + cp} ${sy}, ${tx - cp} ${ty}, ${tx} ${ty}`;
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-background relative overflow-hidden"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onClick={handleCanvasClick}
    >
      {/* Dot grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle, hsl(var(--muted-foreground) / 0.15) 1px, transparent 1px)',
          backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      />

      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {/* Edges */}
        {edges.map((edge) => {
          const sourceNode = nodes.find((n) => n.id === edge.source);
          const targetNode = nodes.find((n) => n.id === edge.target);
          if (!sourceNode || !targetNode) return null;

          const sourceIdx = findHandleIndex(sourceNode.outputs, edge.sourceHandle);
          const targetIdx = findHandleIndex(targetNode.inputs, edge.targetHandle);

          const sourcePos = getHandlePosition(sourceNode, true, sourceIdx);
          const targetPos = getHandlePosition(targetNode, false, targetIdx);

          const path = buildEdgePath(
            sourcePos.x,
            sourcePos.y,
            targetPos.x,
            targetPos.y
          );

          return (
            <g key={edge.id}>
              {/* Wider invisible path for easier click targeting */}
              <path
                d={path}
                fill="none"
                stroke="transparent"
                strokeWidth={12}
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectEdge(edge.id);
                  onSelectNode(null);
                }}
              />
              {/* Visible edge */}
              <path
                d={path}
                fill="none"
                stroke={
                  selectedEdge === edge.id
                    ? 'hsl(var(--primary))'
                    : 'hsl(var(--muted-foreground) / 0.5)'
                }
                strokeWidth={selectedEdge === edge.id ? 2.5 : 2}
                className="pointer-events-none transition-colors"
              />
              {/* Arrow head */}
              <circle
                cx={targetPos.x}
                cy={targetPos.y}
                r={3}
                fill={
                  selectedEdge === edge.id
                    ? 'hsl(var(--primary))'
                    : 'hsl(var(--muted-foreground) / 0.5)'
                }
                className="pointer-events-none"
              />
            </g>
          );
        })}

        {/* Connecting line (being drawn) */}
        {connectingFrom && (() => {
          const sourceNode = nodes.find((n) => n.id === connectingFrom.nodeId);
          if (!sourceNode) return null;

          const sourceIdx = findHandleIndex(
            connectingFrom.isOutput ? sourceNode.outputs : sourceNode.inputs,
            connectingFrom.handle
          );
          const sourcePos = getHandlePosition(sourceNode, connectingFrom.isOutput, sourceIdx);

          const path = buildEdgePath(
            sourcePos.x,
            sourcePos.y,
            mousePos.x,
            mousePos.y
          );

          return (
            <path
              d={path}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              strokeDasharray="6,4"
              className="pointer-events-none"
            />
          );
        })()}

        {/* Nodes */}
        {nodes.map((node) => {
          const isSelected = selectedNode === node.id;
          const nodeColor = getNodeColor(node.type);

          return (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              className={cn(isDragging ? '' : 'cursor-move')}
              onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
            >
              {/* Node shadow / selection glow */}
              {isSelected && (
                <rect
                  x={-2}
                  y={-2}
                  width={NODE_WIDTH + 4}
                  height={NODE_HEIGHT + 4}
                  rx={10}
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth={1}
                  opacity={0.3}
                />
              )}

              {/* Node background */}
              <rect
                width={NODE_WIDTH}
                height={NODE_HEIGHT}
                rx={8}
                fill="hsl(var(--card))"
                stroke={isSelected ? 'hsl(var(--primary))' : nodeColor}
                strokeWidth={isSelected ? 2 : 1.5}
                className="transition-all"
              />

              {/* Type color strip on top */}
              <rect
                width={NODE_WIDTH}
                height={4}
                rx={8}
                fill={nodeColor}
              />
              <rect
                y={2}
                width={NODE_WIDTH}
                height={2}
                fill={nodeColor}
              />

              {/* Node icon and label */}
              <foreignObject
                width={NODE_WIDTH - 24}
                height={NODE_HEIGHT}
                x={12}
                y={4}
              >
                <div className="flex items-center gap-2 h-full">
                  <div
                    className="p-1.5 rounded flex-shrink-0"
                    style={{ backgroundColor: `${nodeColor}20` }}
                  >
                    <div style={{ color: nodeColor }}>
                      {getNodeIcon(node.type)}
                    </div>
                  </div>
                  <span className="text-xs font-medium text-foreground truncate leading-tight">
                    {node.label}
                  </span>
                </div>
              </foreignObject>

              {/* Input handles */}
              {node.inputs.map((handleName, index) => {
                const pos = getHandlePosition(node, false, index);
                const relX = pos.x - node.x;
                const relY = pos.y - node.y;

                return (
                  <circle
                    key={handleName}
                    cx={relX}
                    cy={relY}
                    r={HANDLE_RADIUS}
                    fill="hsl(var(--background))"
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={1.5}
                    className="cursor-crosshair hover:fill-primary hover:stroke-primary transition-colors"
                    onMouseDown={(e) => e.stopPropagation()}
                    onMouseUp={(e) => handleInputMouseUp(e, node.id, handleName)}
                  />
                );
              })}

              {/* Output handles */}
              {node.outputs.map((handleName, index) => {
                const pos = getHandlePosition(node, true, index);
                const relX = pos.x - node.x;
                const relY = pos.y - node.y;

                return (
                  <circle
                    key={handleName}
                    cx={relX}
                    cy={relY}
                    r={HANDLE_RADIUS}
                    fill="hsl(var(--background))"
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={1.5}
                    className="cursor-crosshair hover:fill-primary hover:stroke-primary transition-colors"
                    onMouseDown={(e) =>
                      handleOutputMouseDown(e, node.id, handleName)
                    }
                  />
                );
              })}
            </g>
          );
        })}
      </svg>

      {/* Empty state */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-muted-foreground">
            <Database className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Drag nodes from the palette to start</p>
            <p className="text-xs mt-1 opacity-60">
              Connect output handles to input handles to build your flow
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default FlowCanvas;
