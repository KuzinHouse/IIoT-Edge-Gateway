'use client';

import { useRef, useEffect } from 'react';
import { Tag, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TagValue {
  id: string;
  name: string;
  value: number | string | boolean;
  unit?: string;
  quality: 'good' | 'bad' | 'uncertain';
  timestamp: string;
  trend?: 'up' | 'down' | 'stable';
  previousValue?: number | string | boolean;
}

interface TagValueCardProps {
  tag: TagValue;
  compact?: boolean;
  showTrend?: boolean;
  refreshInterval?: number;
  onClick?: () => void;
}

export function TagValueCard({ 
  tag, 
  compact = false, 
  showTrend = true,
  refreshInterval = 5000,
  onClick 
}: TagValueCardProps) {
  // Use ref to track animation state without triggering re-renders in effect
  const cardRef = useRef<HTMLDivElement>(null);
  const prevValueRef = useRef(tag.value);

  // Trigger animation when value changes using CSS class manipulation
  useEffect(() => {
    if (prevValueRef.current !== tag.value) {
      prevValueRef.current = tag.value;
      // Add animation class directly to DOM element
      const card = cardRef.current;
      if (card) {
        card.classList.add('tag-updating');
        const timeout = setTimeout(() => card.classList.remove('tag-updating'), 300);
        return () => clearTimeout(timeout);
      }
    }
  }, [tag.value]);

  // Use tag.value directly instead of local state
  const currentValue = tag.value;

  const getQualityColor = () => {
    switch (tag.quality) {
      case 'good':
        return 'border-green-500/30';
      case 'bad':
        return 'border-red-500/30';
      default:
        return 'border-yellow-500/30';
    }
  };

  const getQualityDot = () => {
    switch (tag.quality) {
      case 'good':
        return 'bg-green-500';
      case 'bad':
        return 'bg-red-500';
      default:
        return 'bg-yellow-500';
    }
  };

  const getTrendIcon = () => {
    if (!showTrend || !tag.trend) return null;
    switch (tag.trend) {
      case 'up':
        return <TrendingUp className="h-3.5 w-3.5 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-3.5 w-3.5 text-red-500" />;
      default:
        return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const getTrendColor = () => {
    if (!showTrend || !tag.trend) return '';
    switch (tag.trend) {
      case 'up':
        return 'text-green-500';
      case 'down':
        return 'text-red-500';
      default:
        return 'text-muted-foreground';
    }
  };

  const formatValue = () => {
    if (currentValue === null || currentValue === undefined) return '—';
    if (typeof currentValue === 'boolean') {
      return currentValue ? 'TRUE' : 'FALSE';
    }
    if (typeof currentValue === 'number') {
      const formatted = currentValue.toLocaleString();
      return tag.unit ? `${formatted} ${tag.unit}` : formatted;
    }
    return String(currentValue);
  };

  const formatTimestamp = () => {
    const date = new Date(tag.timestamp);
    return date.toLocaleTimeString();
  };

  if (compact) {
    return (
      <Card 
        ref={cardRef}
        className={cn(
          "cursor-pointer transition-all hover:shadow-md border",
          getQualityColor()
        )}
        onClick={onClick}
      >
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full", getQualityDot())} />
              <span className="text-sm font-medium text-foreground truncate max-w-[100px]">
                {tag.name}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className={cn("font-mono text-sm", getTrendColor())}>
                {formatValue()}
              </span>
              {getTrendIcon()}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      ref={cardRef}
      className={cn(
        "cursor-pointer transition-all hover:shadow-md border",
        getQualityColor()
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-muted">
              <Tag className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <h4 className="font-medium text-foreground truncate max-w-[150px]">
                {tag.name}
              </h4>
              <p className="text-xs text-muted-foreground">{formatTimestamp()}</p>
            </div>
          </div>
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs capitalize",
              tag.quality === 'good' && "bg-green-500/10 text-green-500 border-green-500/30",
              tag.quality === 'bad' && "bg-red-500/10 text-red-500 border-red-500/30",
              tag.quality === 'uncertain' && "bg-yellow-500/10 text-yellow-500 border-yellow-500/30"
            )}
          >
            {tag.quality}
          </Badge>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <p className={cn(
              "text-2xl font-bold font-mono transition-colors",
              getTrendColor()
            )}>
              {formatValue()}
            </p>
            {tag.previousValue !== undefined && (
              <p className="text-xs text-muted-foreground mt-1">
                Previous: {String(tag.previousValue)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {getTrendIcon()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Grid component for multiple tag values
interface TagValueGridProps {
  tags: TagValue[];
  columns?: number;
  compact?: boolean;
  onTagClick?: (tag: TagValue) => void;
}

export function TagValueGrid({ 
  tags, 
  columns = 3, 
  compact = false,
  onTagClick 
}: TagValueGridProps) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn("grid gap-3", gridCols[columns as keyof typeof gridCols])}>
      {tags.map((tag) => (
        <TagValueCard
          key={tag.id}
          tag={tag}
          compact={compact}
          onClick={() => onTagClick?.(tag)}
        />
      ))}
    </div>
  );
}

export default TagValueCard;
