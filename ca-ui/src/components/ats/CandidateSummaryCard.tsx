import React from 'react';
import { Card, CardContent } from '../primitives/Card';
import { Badge } from '../primitives/Badge';
import { Mail, Phone, MapPin } from 'lucide-react';

interface CandidateSummaryCardProps {
  name: string;
  role: string;
  email: string;
  phone?: string;
  location?: string;
  stage: string;
}

export function CandidateSummaryCard({ name, role, email, phone, location, stage }: CandidateSummaryCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-semibold text-text-primary mb-1">{name}</h2>
            <p className="text-[14px] text-text-secondary">{role}</p>
          </div>
          <Badge variant="info">{stage}</Badge>
        </div>
        
        <div className="flex flex-col gap-2 text-[13px] text-text-secondary mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-text-muted" />
            <span>{email}</span>
          </div>
          {phone && (
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-text-muted" />
              <span>{phone}</span>
            </div>
          )}
          {location && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-text-muted" />
              <span>{location}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
