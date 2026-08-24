import React from 'react';
import { Card, CardContent } from '@/components/primitives/Card';
import { Button } from '@/components/primitives/Button';
import { RefreshCw, CheckCircle2, Star, Sparkles, ChevronDown, Loader2, AlertCircle } from 'lucide-react';

interface AiRatingCardProps {
  application: any;
  refreshingAi: boolean;
  onRefresh: () => void;
}

export const AiRatingCard: React.FC<AiRatingCardProps> = ({ application, refreshingAi, onRefresh }) => {
  return (
    <Card className="overflow-hidden border-none shadow-sm">
      <CardContent className="p-0">
        <div className="p-6 border-b border-border bg-gradient-to-r from-surface to-subtle flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand" />
            <h3 className="text-lg font-bold text-text-primary">AI Evaluation & Fit Score</h3>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onRefresh} 
            disabled={refreshingAi || application.ai_rating?.status === 'pending'} 
            className="gap-2 text-brand hover:bg-brand/10 transition-colors rounded-full px-4"
          >
            <RefreshCw className={`w-4 h-4 ${refreshingAi || application.ai_rating?.status === 'pending' ? 'animate-spin' : ''}`} />
            Refresh AI Rating
          </Button>
        </div>

        <div className="p-6">
          {application.ai_rating?.status === 'pending' ? (
            <div className="flex flex-col items-center py-12 bg-subtle/50 rounded-xl border border-dashed border-border">
              <Loader2 className="w-10 h-10 animate-spin text-brand mb-4" />
              <p className="font-semibold text-text-primary">Gemini is evaluating the candidate...</p>
              <p className="text-sm text-text-muted mt-1">This typically takes 10-15 seconds.</p>
            </div>
          ) : application.ai_rating?.status === 'completed' ? (
            <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-6">
              
              {/* Left: Dark Score Card */}
              <div className="relative overflow-hidden flex flex-col items-center justify-center p-8 rounded-3xl bg-slate-900 shadow-2xl group animate-in fade-in zoom-in duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-transparent opacity-50" />
                <div className="relative z-10 flex flex-col items-center w-full">
                  <span className="text-sm font-semibold text-slate-300 mb-6 tracking-wide">Overall Fit Score</span>
                  
                  {/* Circular Progress Ring Mockup */}
                  <div className="relative flex items-center justify-center w-40 h-40 rounded-full border-[6px] border-slate-800 shadow-[0_0_40px_rgba(99,102,241,0.2)] group-hover:shadow-[0_0_60px_rgba(99,102,241,0.4)] transition-all duration-700">
                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="6" className="text-slate-800" />
                      <circle 
                        cx="50" cy="50" r="46" fill="none" stroke="url(#gradient)" strokeWidth="6" 
                        strokeDasharray={`${(application.ai_rating.score / 100) * 289} 289`} 
                        strokeLinecap="round" 
                        className="transition-all duration-1000 ease-out" 
                      />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#818cf8" />
                          <stop offset="100%" stopColor="#c084fc" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="flex flex-col items-center justify-center">
                      <div className="flex items-baseline gap-1">
                        <span className="text-5xl font-black text-white tracking-tighter">
                          {(application.ai_rating.score / 10).toFixed(1)}
                        </span>
                      </div>
                      <span className="text-slate-400 font-medium text-sm">/ 10</span>
                    </div>
                  </div>

                  <div className="mt-6 px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                    <span className="text-xs font-bold text-emerald-400">Excellent Fit</span>
                  </div>
                  
                  <div className="w-full mt-8 pt-6 border-t border-slate-700/50 flex justify-between items-end">
                     <div>
                        <p className="text-[10px] text-slate-400 tracking-widest mb-1">Confidence</p>
                        <p className="text-sm font-semibold text-slate-200">High</p>
                     </div>
                     <div className="flex items-center gap-1.5 opacity-60">
                       <span className="text-[10px] text-slate-400">v2.1</span>
                       <CheckCircle2 className="w-3 h-3 text-slate-400" />
                     </div>
                  </div>
                </div>
              </div>
              
              {/* Right: Skills List */}
              <div className="flex flex-col h-full">
                <h4 className="text-sm font-bold text-text-primary mb-4">Top 5 Matching Skills</h4>
                <div className="flex flex-col gap-3">
                  {application.ai_rating.skills_analyzed?.slice(0, 5).map((skill: any, i: number) => {
                    const starRating = Math.max(0, Math.min(5, skill.rating / 2));
                    return (
                      <div key={i} className="flex flex-col p-4 rounded-2xl bg-surface border border-border shadow-sm hover:shadow-md hover:border-brand/30 transition-all duration-300 group animate-in slide-in-from-right-4" style={{ animationDelay: `${i * 100}ms` }}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-brand/5 text-brand flex items-center justify-center font-black shrink-0 group-hover:bg-brand/10 transition-colors">
                              {skill.skill.substring(0, 2).toUpperCase()}
                            </div>
                            <h5 className="font-bold text-text-primary">{skill.skill}</h5>
                          </div>
                          
                          <div className="flex items-center gap-4 self-end sm:self-auto">
                            {/* Stars */}
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <div key={star} className="relative w-4 h-4 cursor-default">
                                  <Star className="w-4 h-4 text-slate-200 fill-slate-200 absolute inset-0" />
                                  {starRating >= star ? (
                                    <Star className="w-4 h-4 text-amber-400 fill-amber-400 absolute inset-0 transition-transform duration-300 hover:scale-125" />
                                  ) : starRating > star - 1 ? (
                                    <div className="absolute inset-0 overflow-hidden transition-transform duration-300 hover:scale-125" style={{ width: `${(starRating % 1) * 100}%` }}>
                                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                                    </div>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                            <div className="flex items-center gap-1.5 w-16 justify-end">
                              <span className="font-bold text-text-primary">{starRating.toFixed(1)}</span>
                              <span className="text-xs text-text-muted">/ 5</span>
                            </div>
                            <ChevronDown className="w-4 h-4 text-text-muted opacity-50" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {(!application.ai_rating.skills_analyzed || application.ai_rating.skills_analyzed.length === 0) && (
                    <div className="p-8 text-center text-text-muted border border-dashed rounded-2xl">
                      No detailed skills analysis available. Please refresh the rating.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-12 bg-error/5 rounded-xl border border-dashed border-error/20">
              <AlertCircle className="w-10 h-10 text-error mb-4" />
              <p className="font-semibold text-text-primary">Evaluation Failed</p>
              <p className="text-sm text-text-muted mt-1">{application.ai_rating?.error_message || 'Unexpected AI error.'}</p>
              <Button variant="secondary" size="sm" className="mt-4" onClick={onRefresh}>Retry Evaluation</Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
