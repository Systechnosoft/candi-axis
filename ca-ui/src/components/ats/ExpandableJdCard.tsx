import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Star } from 'lucide-react';
import { Card, CardContent } from '../primitives/Card';
import { Badge } from '../primitives/Badge';
import { Tag } from '@/types/tags';

interface ExpandableJdCardProps {
  summary: string | null;
  responsibilities: string | null;
  mustHave: string | null;
  niceToHave: string | null;
  tags: Tag[];
}

export const ExpandableJdCard: React.FC<ExpandableJdCardProps> = ({
  summary,
  responsibilities,
  mustHave,
  niceToHave,
  tags,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="border border-border shadow-sm bg-surface transition-all duration-300 hover:shadow-md">
      <div 
        className="flex items-center justify-between p-4 cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <span className="text-base font-semibold text-text-primary">Job Description Details</span>
        </div>
        <div className="p-1 rounded-full hover:bg-subtle text-text-secondary transition-colors">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-brand" />
          ) : (
            <ChevronDown className="w-5 h-5 text-text-muted" />
          )}
        </div>
      </div>
      
      <div 
        className={`overflow-hidden transition-all duration-500 ease-in-out ${
          isExpanded ? 'max-h-[1000px] border-t border-border opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
        }`}
      >
        <CardContent className="p-6 space-y-6">
          {summary && (
            <div>
              <h4 className="text-xs font-bold text-text-muted tracking-wider mb-2">Summary</h4>
              <div 
                className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap prose max-w-none" 
                dangerouslySetInnerHTML={{ __html: summary }} 
              />
            </div>
          )}
          
          {responsibilities && (
            <div>
              <h4 className="text-xs font-bold text-text-muted tracking-wider mb-2">Responsibilities</h4>
              <div 
                className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap prose max-w-none" 
                dangerouslySetInnerHTML={{ __html: responsibilities }} 
              />
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {mustHave && (
              <div className="bg-success-50/10 p-4 rounded-xl border border-success/10">
                <h4 className="text-xs font-bold text-success tracking-wider mb-2">Must Have</h4>
                <div 
                  className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap prose max-w-none" 
                  dangerouslySetInnerHTML={{ __html: mustHave }} 
                />
              </div>
            )}
            
            {niceToHave && (
              <div className="bg-brand-50/10 p-4 rounded-xl border border-brand/10">
                <h4 className="text-xs font-bold text-brand tracking-wider mb-2">Nice To Have</h4>
                <div 
                  className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap prose max-w-none" 
                  dangerouslySetInnerHTML={{ __html: niceToHave }} 
                />
              </div>
            )}
          </div>
          
          {tags.length > 0 && (
            <div className="pt-4 border-t border-border/60">
              <h4 className="text-xs font-bold text-text-muted tracking-wider mb-2">Required Skills & Tags</h4>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag.id} variant="info" className="bg-brand/10 text-brand border-none font-medium flex items-center gap-1.5" title={tag.is_starred ? "Must-have skill" : undefined}>
                    {tag.is_starred && (
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                    )}
                    <span>{tag.name}</span>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </div>
    </Card>
  );
};
