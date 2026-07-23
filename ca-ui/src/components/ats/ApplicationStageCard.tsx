import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../primitives/Card';
import { Badge } from '../primitives/Badge';

export function ApplicationStageCard({ stage, appliedDate }: { stage: string; appliedDate: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[14px]">Application Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <Badge variant="info" className="px-3 py-1 font-medium">{stage}</Badge>
          <span className="text-[12px] text-text-muted">Applied {appliedDate}</span>
        </div>
      </CardContent>
    </Card>
  );
}
