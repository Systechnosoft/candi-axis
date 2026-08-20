'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/primitives/StatCard';
import { Users, Briefcase, FileText, Calendar, Loader2, AlertCircle, UserCheck, CheckCircle2, Bot, Pin, CalendarClock, Rocket } from 'lucide-react';
import { PageSection } from '@/components/primitives/LayoutPrimitives';
import { DashboardService } from '@/lib/api/dashboard';

interface DashboardStats {
  openJobPostings: number;
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

type ActivityCategory = 'All' | 'Pipeline' | 'Interviews' | 'Tasks' | 'Jobs';

interface MockActivity {
  id: string;
  category: ActivityCategory;
  icon: any;
  iconColor: string;
  iconBg: string;
  content: React.ReactNode;
  timestamp: string;
}

const getMockActivities = (): MockActivity[] => [
  {
    id: '1',
    category: 'Pipeline',
    icon: UserCheck,
    iconColor: 'text-status-success',
    iconBg: 'bg-status-success/10',
    content: (
      <span>
        🎉 <strong className="text-text-primary">Aarti Soni</strong> was moved to the <strong className="text-text-primary">Offer</strong> stage for the <a href="#" className="text-brand hover:underline font-medium">Full Stack Developer</a> role by Kriti Sharma.
      </span>
    ),
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: '2',
    category: 'Interviews',
    icon: CheckCircle2,
    iconColor: 'text-brand',
    iconBg: 'bg-brand/10',
    content: (
      <span>
        ✅ <strong className="text-text-primary">Tejpal Singh</strong> submitted interview feedback for <strong className="text-text-primary">Mahaveer Kumawat</strong> (Decision: Strong Hire).
      </span>
    ),
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
  {
    id: '3',
    category: 'Pipeline',
    icon: Bot,
    iconColor: 'text-purple-600',
    iconBg: 'bg-purple-100',
    content: (
      <span>
        🤖 Resume scoring completed for <a href="#" className="text-brand hover:underline font-medium">Karan Sejwani</a>. Match score: <strong className="text-text-primary">92%</strong>.
      </span>
    ),
    timestamp: new Date(Date.now() - 1000 * 60 * 150).toISOString(),
  },
  {
    id: '4',
    category: 'Tasks',
    icon: Pin,
    iconColor: 'text-status-warning',
    iconBg: 'bg-status-warning/10',
    content: (
      <span>
        📌 You were assigned a new task: <a href="#" className="text-brand hover:underline font-medium">Screening Review - Anuj Mehta</a>.
      </span>
    ),
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: '5',
    category: 'Interviews',
    icon: CalendarClock,
    iconColor: 'text-blue-500',
    iconBg: 'bg-blue-100',
    content: (
      <span>
        📅 Interview scheduled: <strong className="text-text-primary">Ashish Ranjan</strong> with <strong className="text-text-primary">Rajat Mehta</strong> on Aug 22nd at 2:00 PM.
      </span>
    ),
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: '6',
    category: 'Jobs',
    icon: Rocket,
    iconColor: 'text-orange-500',
    iconBg: 'bg-orange-100',
    content: (
      <span>
        🚀 Job Posting <a href="#" className="text-brand hover:underline font-medium">Senior Blockchain Backend Engineer</a> went live.
      </span>
    ),
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [mockActivities, setMockActivities] = useState<MockActivity[]>([]);
  const [activityFilter, setActivityFilter] = useState<ActivityCategory>('All');
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
        setMockActivities(getMockActivities());
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
        <StatCard              title="Open Job Postings"
              value={stats?.openJobPostings ?? 0} 
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
          <div className="bg-surface border border-border rounded-md p-6">
            
            {/* Filter Chips */}
            <div className="flex gap-2 mb-6 border-b border-border pb-4 overflow-x-auto">
              {(['All', 'Pipeline', 'Interviews', 'Tasks', 'Jobs'] as ActivityCategory[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActivityFilter(cat)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors whitespace-nowrap ${
                    activityFilter === cat
                      ? 'bg-brand text-white border border-brand'
                      : 'bg-subtle text-text-secondary hover:text-brand hover:bg-brand/10 border border-border'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="flow-root">
              <ul className="-mb-8">
                {mockActivities
                  .filter(item => activityFilter === 'All' || item.category === activityFilter)
                  .map((item, itemIdx, arr) => {
                    const Icon = item.icon;
                    return (
                      <li key={item.id}>
                        <div className="relative pb-8">
                          {itemIdx !== arr.length - 1 ? (
                            <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-border" aria-hidden="true" />
                          ) : null}
                          <div className="relative flex space-x-3 items-start">
                            <div>
                              <span className={`h-8 w-8 rounded-full ${item.iconBg} flex items-center justify-center ring-8 ring-surface ${item.iconColor}`}>
                                <Icon className="w-4 h-4" />
                              </span>
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:justify-between space-y-1 sm:space-y-0 sm:space-x-4 pt-1.5">
                              <div>
                                <p className="text-[14px] text-text-secondary">
                                  {item.content}
                                </p>
                              </div>
                              <div className="text-left sm:text-right text-[12px] whitespace-nowrap text-text-muted shrink-0">
                                <time dateTime={item.timestamp}>{formatRelativeTime(item.timestamp)}</time>
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                {mockActivities.filter(item => activityFilter === 'All' || item.category === activityFilter).length === 0 && (
                  <div className="text-center py-6 text-text-muted text-[14px]">
                    No activity found for this category.
                  </div>
                )}
              </ul>
            </div>
          </div>
        </PageSection>
      </div>
    </div>
  );
}
