'use client';

import React from "react";
import { Card, CardContent } from "@/components/primitives/Card";
import { Badge } from "@/components/primitives/Badge";
import { Button } from "@/components/primitives/Button";
import { Loader2 } from "lucide-react";

interface SkillScore {
  skill: string;
  score: number;
}

interface RatingResult {
  overall: number;
  experience: number;
  education: number;
  domain: number;
  skills: SkillScore[];
}

interface Props {
  rating: RatingResult | null;
  loading: boolean;
  onRefresh: () => void;
}

export function CandidateRatingPanel({ rating, loading, onRefresh }: Props) {
  return (
    <Card className="w-80 border-l border-border h-full sticky top-0">
      <CardContent className="p-5 space-y-6">

        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-text-muted uppercase">
            AI Rating Summary
          </h3>
          <Button size="sm" variant="secondary" onClick={onRefresh}>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Refresh"
            )}
          </Button>
        </div>

        {/* Overall Score */}
        <div className="text-center border rounded-lg p-4 bg-surface">
          <p className="text-sm text-text-secondary mb-1">Overall Rating</p>
          <p className="text-4xl font-bold text-brand">
            {rating ? rating.overall : "--"}
          </p>
        </div>

        {/* Breakdown */}
        <div className="space-y-4">
          {rating && (
            <>
              <RatingRow label="Experience Match" value={rating.experience} />
              <RatingRow label="Education Match" value={rating.education} />
              <RatingRow label="Domain Match" value={rating.domain} />

              <div className="mt-2">
                <p className="text-xs text-text-muted mb-2 uppercase font-semibold">
                  Skill Match Breakdown
                </p>

                <div className="space-y-2">
                  {rating.skills.map((s) => (
                    <div key={s.skill} className="flex justify-between text-sm">
                      <span>{s.skill}</span>
                      <Badge variant="default">{s.score}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="pt-4 border-t border-border space-y-3">
          <Button variant="primary" className="w-full">
            View Full Resume
          </Button>
          <Button variant="secondary" className="w-full">
            Open Candidate Profile
          </Button>
        </div>

      </CardContent>
    </Card>
  );
}

function RatingRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-text-secondary">{label}</span>
      <Badge variant="default">{value}</Badge>
    </div>
  );
}