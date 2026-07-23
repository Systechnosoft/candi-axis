import React from 'react';
import { Card, CardContent } from '../primitives/Card';
import { Calendar, User, Clock, UserCheck } from 'lucide-react';
import { Badge } from '../primitives/Badge';

interface InterviewRoundCardProps {
  title: string;
  interviewer: string;
  scheduledBy?: string;
  date: string;
  time: string;
  status: 'Scheduled' | 'Completed' | 'Feedback pending';
}

export function InterviewRoundCard({ title, interviewer, scheduledBy, date, time, status }: InterviewRoundCardProps) {
  return (
    <Card className="hover:border-strong-border transition-colors">
      <CardContent className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-1">
          <h4 className="text-[14px] font-semibold text-text-primary">{title}</h4>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-text-secondary mt-1">
            <span className="flex items-center gap-1.5" title="Interviewers">
              <User className="w-3.5 h-3.5" /> <strong>Interviewer:</strong> {interviewer}
            </span>
            {scheduledBy && (
              <span className="flex items-center gap-1.5" title="Scheduled By">
                <UserCheck className="w-3.5 h-3.5 text-brand" /> <strong>Scheduled By:</strong> {scheduledBy}
              </span>
            )}
            <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {date}</span>
            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {time}</span>
          </div>
        </div>
        <Badge variant={status === 'Completed' ? 'success' : status === 'Scheduled' ? 'info' : 'warning'}>
          {status}
        </Badge>
      </CardContent>
    </Card>
  );
}
