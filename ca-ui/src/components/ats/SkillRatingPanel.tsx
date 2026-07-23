import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../primitives/Card';
import { StarRating } from './StarRating';
import { CircularProgressRing } from './CircularProgressRing';
import { Tag } from '@/types/tags';
import { ModalShell } from '../primitives/ModalShell';

interface SkillRatingPanelProps {
  overallScore: number; // 0 to 10
  candidateSkills: string[];
  jdSkills: Tag[];
}

export const SkillRatingPanel: React.FC<SkillRatingPanelProps> = ({
  overallScore,
  candidateSkills,
  jdSkills,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Derive matching skills
  const jdSkillNames = jdSkills.map(t => t.name.toLowerCase());
  
  const uniqueMatchingSkills = (() => {
    const list = candidateSkills.filter(skill =>
      jdSkillNames.some(jds => skill.toLowerCase().includes(jds) || jds.includes(skill.toLowerCase()))
    );
    const seen = new Set<string>();
    const res: string[] = [];
    for (let i = 0; i < list.length; i++) {
      const lower = list[i].toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        res.push(list[i]);
      }
    }
    return res;
  })();

  const displaySkillsList = uniqueMatchingSkills.slice(0, 6);

  const getSkillRating = (idx: number, skillName: string) => {
    const isMatching = jdSkillNames.some(jds => skillName.toLowerCase().includes(jds) || jds.includes(skillName.toLowerCase()));
    const base = isMatching ? 4.5 : 3.5;
    const rating = Math.max(3.0, Math.min(5.0, base - (idx * 0.15)));
    return rating;
  };

  const filteredSkills = uniqueMatchingSkills.filter(skill =>
    skill.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Card className="border border-border shadow-sm bg-surface sticky top-6 animate-in slide-in-from-right duration-300">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-sm font-bold text-text-primary uppercase tracking-wider">
            AI Fit Breakdown
          </CardTitle>
        </CardHeader>

        <CardContent className="p-5 space-y-6">
          {/* Overall Fit Circle */}
          <div className="flex flex-col items-center justify-center py-4 bg-subtle/30 rounded-xl border border-border/40">
            <CircularProgressRing score={overallScore} size={130} strokeWidth={8} />
            <span className="text-xs font-bold text-text-muted uppercase tracking-widest mt-3">
              Overall Fit
            </span>
            <span className={`text-xs font-semibold mt-1 ${overallScore >= 7 ? 'text-success' : overallScore >= 4 ? 'text-brand' : 'text-danger'
              }`}>
              {overallScore >= 7 ? 'Excellent Match' : overallScore >= 4 ? 'Good Match' : 'Weak Match'}
            </span>
          </div>

          {/* Top Matching Skills */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Top Matching Skills
            </h4>
            <div className="space-y-2">
              {displaySkillsList.map((skill, idx) => {
                const rating = getSkillRating(idx, skill);
                return (
                  <div
                    key={skill}
                    className="flex items-center justify-between p-2.5 border border-border rounded-lg bg-surface hover:-translate-y-0.5 hover:shadow-sm hover:border-brand/30 transition-all duration-200 select-none cursor-default"
                  >
                    <span className="font-bold text-text-secondary truncate max-w-28 capitalize text-xs">
                      {skill}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <StarRating rating={rating} size={12} />
                      <span className="text-[10px] font-black text-brand bg-brand/5 px-1.5 py-0.5 rounded">{rating.toFixed(1)}</span>
                    </div>
                  </div>
                );
              })}
              {displaySkillsList.length === 0 && (
                <p className="text-xs text-text-muted italic">No matching skills identified.</p>
              )}
              {uniqueMatchingSkills.length > 6 && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="w-full mt-3 py-1.5 text-center text-xs font-bold text-brand hover:underline border-t border-border/30 transition-all"
                >
                  View All
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {isModalOpen && (
        <ModalShell
          title="Matched Skills with JD"
          onClose={() => {
            setIsModalOpen(false);
            setSearchQuery('');
          }}
          className="max-w-2xl"
        >
          <div className="space-y-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search matched skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-border rounded-lg bg-surface focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 transition-all"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-2">
              {filteredSkills.map((skill) => {
                const originalIdx = uniqueMatchingSkills.indexOf(skill);
                const rating = getSkillRating(originalIdx, skill);
                return (
                  <div
                    key={skill}
                    className="flex items-center justify-between p-3 border border-border rounded-lg bg-surface hover:-translate-y-0.5 hover:shadow-sm hover:border-brand/30 transition-all duration-200 select-none cursor-default"
                  >
                    <span className="font-bold text-text-secondary truncate max-w-[70%] capitalize text-xs">
                      {skill}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <StarRating rating={rating} size={12} />
                      <span className="text-[10px] font-black text-brand bg-brand/5 px-1.5 py-0.5 rounded">
                        {rating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                );
              })}
              {filteredSkills.length === 0 && (
                <div className="col-span-full py-8 text-center text-xs text-text-muted italic">
                  No matching skills found.
                </div>
              )}
            </div>
          </div>
        </ModalShell>
      )}
    </>
  );
};

export default SkillRatingPanel;
