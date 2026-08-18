'use client';

import { useEffect, useState } from 'react';

interface Stats {
  totalJobs: number;
  qualifiedMatches: number;
  pendingApplications: number;
  documentsReady: number;
}

export function DashboardStats() {
  const [stats, setStats] = useState<Stats>({
    totalJobs: 0,
    qualifiedMatches: 0,
    pendingApplications: 0,
    documentsReady: 0,
  });

  useEffect(() => {
    // TODO: Fetch real stats from Supabase
    // For now, show placeholder data
    setStats({
      totalJobs: 127,
      qualifiedMatches: 23,
      pendingApplications: 8,
      documentsReady: 5,
    });
  }, []);

  const statItems = [
    { name: 'Total Jobs', value: stats.totalJobs, color: 'bg-blue-500' },
    { name: 'Qualified Matches', value: stats.qualifiedMatches, color: 'bg-green-500' },
    { name: 'Pending Applications', value: stats.pendingApplications, color: 'bg-yellow-500' },
    { name: 'Documents Ready', value: stats.documentsReady, color: 'bg-purple-500' },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {statItems.map((item) => (
        <div
          key={item.name}
          className="bg-white overflow-hidden shadow rounded-lg"
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className={`flex-shrink-0 rounded-md p-3 ${item.color}`}>
                <span className="text-white text-lg font-bold">
                  {item.value}
                </span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {item.name}
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {item.value}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
