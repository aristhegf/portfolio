'use client';

import { useEffect, useState } from 'react';

interface ReviewItem {
  id: string;
  type: 'requirement' | 'interview_signal' | 'document_draft';
  title: string;
  description: string;
  confidence: number;
  created_at: string;
}

export function ReviewQueue() {
  const [items, setItems] = useState<ReviewItem[]>([]);

  useEffect(() => {
    // TODO: Fetch real review items from Supabase
    // For now, show placeholder data
    setItems([
      {
        id: '1',
        type: 'requirement',
        title: 'Low-confidence requirement extraction',
        description: 'Job posting from TechCorp requires review - AI detected portfolio requirement with 65% confidence',
        confidence: 0.65,
        created_at: new Date().toISOString(),
      },
      {
        id: '2',
        type: 'interview_signal',
        title: 'Interview signal detected',
        description: 'Email from StartupXYZ mentions "schedule a call" - needs your confirmation',
        confidence: 0.80,
        created_at: new Date().toISOString(),
      },
      {
        id: '3',
        type: 'document_draft',
        title: 'Cover letter draft ready',
        description: 'AI-generated cover letter for DataCo position needs your approval',
        confidence: 0.90,
        created_at: new Date().toISOString(),
      },
    ]);
  }, []);

  if (items.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6 text-center">
        <p className="text-gray-500">No items need your review. Great job! 🎉</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <ul className="divide-y divide-gray-200">
        {items.map((item) => (
          <li key={item.id} className="p-4 hover:bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div
                  className={`flex-shrink-0 w-2 h-2 rounded-full ${
                    item.confidence < 0.7
                      ? 'bg-red-400'
                      : item.confidence < 0.85
                      ? 'bg-yellow-400'
                      : 'bg-green-400'
                  }`}
                />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">
                    {item.title}
                  </p>
                  <p className="text-sm text-gray-500">{item.description}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">
                  {Math.round(item.confidence * 100)}% confidence
                </span>
                <button className="text-sm text-blue-600 hover:text-blue-800">
                  Review →
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
