'use client';

import { 
  Cpu, Database, Wifi, Zap, Clock, Filter, 
  Calculator, AlertTriangle, MessageSquare, FileOutput,
  GitBranch, Merge, Repeat, Timer
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface NodeCategory {
  name: string;
  nodes: NodeDefinition[];
}

interface NodeDefinition {
  type: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  inputs: number;
  outputs: number;
}

const NODE_CATEGORIES: NodeCategory[] = [
  {
    name: 'Input',
    nodes: [
      {
        type: 'modbus-read',
        label: 'Modbus Read',
        icon: <Database className="h-4 w-4" />,
        color: 'bg-blue-500',
        description: 'Read data from Modbus device',
        inputs: 0,
        outputs: 1,
      },
      {
        type: 'mqtt-subscribe',
        label: 'MQTT Subscribe',
        icon: <Wifi className="h-4 w-4" />,
        color: 'bg-green-500',
        description: 'Subscribe to MQTT topic',
        inputs: 0,
        outputs: 1,
      },
      {
        type: 'opcua-read',
        label: 'OPC UA Read',
        icon: <Cpu className="h-4 w-4" />,
        color: 'bg-purple-500',
        description: 'Read from OPC UA server',
        inputs: 0,
        outputs: 1,
      },
      {
        type: 'inject',
        label: 'Inject',
        icon: <Zap className="h-4 w-4" />,
        color: 'bg-yellow-500',
        description: 'Inject values manually',
        inputs: 0,
        outputs: 1,
      },
    ],
  },
  {
    name: 'Function',
    nodes: [
      {
        type: 'function',
        label: 'Function',
        icon: <Calculator className="h-4 w-4" />,
        color: 'bg-orange-500',
        description: 'JavaScript function',
        inputs: 1,
        outputs: 1,
      },
      {
        type: 'filter',
        label: 'Filter',
        icon: <Filter className="h-4 w-4" />,
        color: 'bg-cyan-500',
        description: 'Filter data based on conditions',
        inputs: 1,
        outputs: 2,
      },
      {
        type: 'switch',
        label: 'Switch',
        icon: <GitBranch className="h-4 w-4" />,
        color: 'bg-pink-500',
        description: 'Route based on conditions',
        inputs: 1,
        outputs: 3,
      },
      {
        type: 'merge',
        label: 'Merge',
        icon: <Merge className="h-4 w-4" />,
        color: 'bg-indigo-500',
        description: 'Merge multiple inputs',
        inputs: 2,
        outputs: 1,
      },
    ],
  },
  {
    name: 'Trigger',
    nodes: [
      {
        type: 'interval',
        label: 'Interval',
        icon: <Timer className="h-4 w-4" />,
        color: 'bg-teal-500',
        description: 'Trigger at regular intervals',
        inputs: 0,
        outputs: 1,
      },
      {
        type: 'schedule',
        label: 'Schedule',
        icon: <Clock className="h-4 w-4" />,
        color: 'bg-amber-500',
        description: 'Cron-based scheduling',
        inputs: 0,
        outputs: 1,
      },
      {
        type: 'loop',
        label: 'Loop',
        icon: <Repeat className="h-4 w-4" />,
        color: 'bg-lime-500',
        description: 'Loop over data',
        inputs: 1,
        outputs: 1,
      },
    ],
  },
  {
    name: 'Output',
    nodes: [
      {
        type: 'modbus-write',
        label: 'Modbus Write',
        icon: <Database className="h-4 w-4" />,
        color: 'bg-blue-600',
        description: 'Write to Modbus device',
        inputs: 1,
        outputs: 0,
      },
      {
        type: 'mqtt-publish',
        label: 'MQTT Publish',
        icon: <Wifi className="h-4 w-4" />,
        color: 'bg-green-600',
        description: 'Publish to MQTT topic',
        inputs: 1,
        outputs: 0,
      },
      {
        type: 'debug',
        label: 'Debug',
        icon: <MessageSquare className="h-4 w-4" />,
        color: 'bg-gray-500',
        description: 'Debug output',
        inputs: 1,
        outputs: 0,
      },
      {
        type: 'file',
        label: 'File',
        icon: <FileOutput className="h-4 w-4" />,
        color: 'bg-slate-500',
        description: 'Write to file',
        inputs: 1,
        outputs: 0,
      },
    ],
  },
  {
    name: 'Alert',
    nodes: [
      {
        type: 'alarm',
        label: 'Alarm',
        icon: <AlertTriangle className="h-4 w-4" />,
        color: 'bg-red-500',
        description: 'Trigger alarm',
        inputs: 1,
        outputs: 1,
      },
    ],
  },
];

interface NodePaletteProps {
  onDragStart?: (type: string) => void;
}

export function NodePalette({ onDragStart }: NodePaletteProps) {
  const handleDragStart = (e: React.DragEvent, node: NodeDefinition) => {
    // Set the node type for identification
    e.dataTransfer.setData('nodeType', node.type);
    // Set metadata so the canvas knows how many inputs/outputs to create
    e.dataTransfer.setData(
      'nodeMetadata',
      JSON.stringify({
        label: node.label,
        inputs: node.inputs,
        outputs: node.outputs,
      })
    );
    // Set a drag image (optional, helps with visual feedback)
    e.dataTransfer.effectAllowed = 'copy';

    onDragStart?.(node.type);
  };

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4">
        {NODE_CATEGORIES.map((category) => (
          <div key={category.name}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {category.name}
            </h3>
            <div className="space-y-1.5">
              {category.nodes.map((node) => (
                <div
                  key={node.type}
                  draggable
                  onDragStart={(e) => handleDragStart(e, node)}
                  className="group flex items-center gap-2.5 p-2 rounded-lg bg-background border border-border cursor-grab hover:border-primary/50 hover:shadow-sm transition-all active:cursor-grabbing select-none"
                >
                  <div
                    className={cn(
                      'p-1.5 rounded shrink-0',
                      node.color,
                      'text-white'
                    )}
                  >
                    {node.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {node.label}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {node.description}
                    </p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {node.inputs > 0 && (
                      <Badge variant="outline" className="text-[10px] px-1">
                        {node.inputs} in
                      </Badge>
                    )}
                    {node.outputs > 0 && (
                      <Badge variant="outline" className="text-[10px] px-1">
                        {node.outputs} out
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

export default NodePalette;
