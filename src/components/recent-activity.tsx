'use client';

import { useEffect, useState } from 'react';

interface Activity {
  id: string;
  type: 'job_found' | 'application_submitted' | 'document_uploaded' | 'interview_scheduled';
  title: string;
  description: string;
  created_at: string;
}

export function RecentActivity() {
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    // TODO: Fetch real activities from Supabase
    // For now, show placeholder data
    setActivities([
      {
        id: '1',
        type: 'job_found',
        title: 'New job match found',
        description: 'Software Engineer at TechCorp - 92% match score',
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: '2',
        type: 'application_submitted',
        title: 'Application submitted',
        description: 'Applied to Data Analyst position at Analytics Co',
        created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: '3',
        type: 'document_uploaded',
        title: 'Resume updated',
        description: 'Master resume version 3 uploaded',
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: '4',
        type: 'interview_scheduled',
        title: 'Interview scheduled',
        description: 'Video call with StartupXYZ tomorrow at 2pm',
        created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      },
    ]);
  }, []);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getTypeIcon = (type: Activity['type']) => {
    switch (type) {
      case 'job_found':
        return '🎯';
      case 'application_submitted':
        return '📝';
      case 'document_uploaded':
        return '📄';
      case 'interview_scheduled':
        return '📅';
      default:
        return '📌';
    }
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <ul className="divide-y divide-gray-200">
        {activities.map((activity) => (
          <li key={activity.id} className="p-4 hover:bg-gray-50">
            <div className="flex items-start">
              <span className="text-lg mt-0.5">{getTypeIcon(activity.type)}</span>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {activity.title}
                </p>
                <p className="text-sm text-gray-500">{activity.description}</p>
              </div>
              <span className="text-xs text-gray-400">
                {formatTimeAgo(activity.created_at)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
