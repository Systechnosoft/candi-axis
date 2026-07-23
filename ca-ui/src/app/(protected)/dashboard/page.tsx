'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/primitives/StatCard';
import { Users, Briefcase, FileText, Calendar, Loader2, AlertCircle } from 'lucide-react';
import { PageSection } from '@/components/primitives/LayoutPrimitives';
import { DashboardService } from '@/lib/api/dashboard';

interface DashboardStats {
  openRequisitions: number;
  totalCandidates: number;
  draftOffers: number;
  interviewing: number;
}

interface ActivityItem {
  id: string;
  entity_type: string;
  entity_id: string;
  from_status: string | null;
  to_status: string;
  changed_at: string;
  reason: string | null;
  user_name: string | null;
}

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function getActivityText(item: ActivityItem) {
  const user = item.user_name || 'System';
  const entity = item.entity_type === 'application' ? 'candidate application' : item.entity_type;
  const fromStr = item.from_status ? ` from "${item.from_status}"` : '';
  const toStr = ` to "${item.to_status}"`;
  
  return {
    user,
    description: `updated ${entity} status${fromStr}${toStr}`,
    reason: item.reason
  };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        setError(null);
        const [statsData, activityData] = await Promise.all([
          DashboardService.getStats(),
          DashboardService.getActivity()
        ]);
        setStats(statsData);
        setActivity(activityData);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col h-full w-full">
        <PageHeader title="Dashboard" />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-brand" />
            <span className="text-[14px] text-text-muted">Loading dashboard...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full w-full">
        <PageHeader title="Dashboard" />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4 text-center max-w-md p-6 bg-surface border border-border rounded-md">
            <AlertCircle className="w-10 h-10 text-status-error" />
            <h3 className="text-lg font-semibold text-text-primary">Error Loading Dashboard</h3>
            <p className="text-[14px] text-text-muted">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full">
      <PageHeader title="Dashboard" />
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Open Requisitions" 
          value={stats?.openRequisitions ?? 0} 
          icon={<Briefcase className="w-4 h-4" />} 
        />
        <StatCard 
          title="Total Candidates" 
          value={stats?.totalCandidates ?? 0} 
          icon={<Users className="w-4 h-4" />} 
        />
        <StatCard 
          title="Interviewing" 
          value={stats?.interviewing ?? 0} 
          icon={<Calendar className="w-4 h-4" />} 
        />
        <StatCard 
          title="Draft Offers" 
          value={stats?.draftOffers ?? 0} 
          icon={<FileText className="w-4 h-4" />} 
        />
      </div>

      <div className="flex-1">
        <PageSection title="Recent Activity">
          {activity.length === 0 ? (
            <div className="bg-surface border border-border rounded-md p-8 text-center text-text-muted text-[14px]">
              No recent activity found.
            </div>
          ) : (
            <div className="bg-surface border border-border rounded-md p-6">
              <div className="flow-root">
                <ul className="-mb-8">
                  {activity.map((item, itemIdx) => {
                    const { user, description, reason } = getActivityText(item);
                    return (
                      <li key={item.id}>
                        <div className="relative pb-8">
                          {itemIdx !== activity.length - 1 ? (
                            <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-border" aria-hidden="true" />
                          ) : null}
                          <div className="relative flex space-x-3">
                            <div>
                              <span className="h-8 w-8 rounded-full bg-subtle flex items-center justify-center ring-8 ring-surface text-text-muted">
                                {item.entity_type === 'application' ? (
                                  <Users className="w-4 h-4" />
                                ) : (
                                  <Briefcase className="w-4 h-4" />
                                )}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0 pt-1.5 flex justify-between space-x-4">
                              <div>
                                <p className="text-[14px] text-text-secondary">
                                  <span className="font-semibold text-text-primary">{user}</span>{' '}
                                  {description}
                                </p>
                                {reason && (
                                  <p className="mt-1 text-[13px] text-text-muted italic bg-subtle px-3 py-1.5 rounded border border-border inline-block">
                                    &quot;{reason}&quot;
                                  </p>
                                )}
                              </div>
                              <div className="text-right text-[12px] whitespace-nowrap text-text-muted">
                                <time dateTime={item.changed_at}>{formatRelativeTime(item.changed_at)}</time>
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}
        </PageSection>
      </div>
    </div>
  );
}
