'use client';

import { useEffect, useState } from 'react';

interface Job {
  id: string;
  title: string;
  employer: string;
  location: string;
  salary_range: string;
  sponsorship_confidence: number;
  match_score: number;
  noc_code: string;
  first_seen_at: string;
  source?: string;
  is_international?: boolean;
  province?: string;
}

export function JobsList() {
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    // TODO: Fetch real jobs from Supabase
    setJobs([
      {
        id: '1',
        title: 'Software Engineer',
        employer: 'TechCorp Inc.',
        location: 'Calgary, Alberta',
        salary_range: '$80,000 - $100,000',
        sponsorship_confidence: 0.85,
        match_score: 92,
        noc_code: '21231',
        first_seen_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        source: 'job_bank',
        is_international: false,
      },
      {
        id: '2',
        title: 'Data Analyst',
        employer: 'Analytics Co',
        location: 'Edmonton, Alberta',
        salary_range: '$65,000 - $85,000',
        sponsorship_confidence: 0.70,
        match_score: 88,
        noc_code: '21211',
        first_seen_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        source: 'job_bank',
        is_international: false,
      },
      {
        id: '3',
        title: 'Full Stack Developer',
        employer: 'StartupXYZ',
        location: 'Toronto, Ontario',
        salary_range: '$90,000 - $110,000',
        sponsorship_confidence: 0.60,
        match_score: 85,
        noc_code: '21232',
        first_seen_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        source: 'job_bank',
        is_international: false,
      },
      {
        id: '4',
        title: 'Senior Backend Engineer',
        employer: 'BerlinTech GmbH',
        location: 'Remote',
        salary_range: '€75,000 - €95,000',
        sponsorship_confidence: 0.15,
        match_score: 78,
        noc_code: '',
        first_seen_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        source: 'arbeitnow',
        is_international: true,
      },
      {
        id: '5',
        title: 'Cloud Infrastructure Engineer',
        employer: 'RemoteFirst Inc.',
        location: 'Remote (Global)',
        salary_range: 'USD 120,000 - USD 160,000 / annual',
        sponsorship_confidence: 0.10,
        match_score: 82,
        noc_code: '',
        first_seen_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        source: 'himalayas',
        is_international: true,
        province: 'Senior',
      },
    ]);
  }, []);

  const getSourceBadge = (source?: string) => {
    switch (source) {
      case 'job_bank':
        return <span className="jobs-badge jobs-badge--ca">🇨🇦 Job Bank</span>;
      case 'arbeitnow':
        return <span className="jobs-badge jobs-badge--de">🇩🇪 Arbeitnow</span>;
      case 'himalayas':
        return <span className="jobs-badge jobs-badge--gl">🌍 Himalayas</span>;
      default:
        return null;
    }
  };

  const getSponsorshipBadge = (confidence: number, isInternational: boolean) => {
    if (isInternational) {
      return <span className="jobs-badge jobs-badge--muted">International</span>;
    }
    if (confidence >= 0.8) {
      return <span className="jobs-badge jobs-badge--green">High confidence</span>;
    }
    if (confidence >= 0.6) {
      return <span className="jobs-badge jobs-badge--yellow">Medium confidence</span>;
    }
    return <span className="jobs-badge jobs-badge--muted">Low confidence</span>;
  };

  const getMatchBadge = (score: number) => {
    if (score >= 90) {
      return <span className="jobs-badge jobs-badge--accent">{score}% match</span>;
    }
    if (score >= 75) {
      return <span className="jobs-badge jobs-badge--blue">{score}% match</span>;
    }
    return <span className="jobs-badge jobs-badge--muted">{score}% match</span>;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="jobs-list">
      <ul className="jobs-list__items">
        {jobs.map((job) => (
          <li key={job.id} className="jobs-item">
            <div className="jobs-item__main">
              <div className="jobs-item__header">
                <h3 className="jobs-item__title">{job.title}</h3>
                <div className="jobs-item__badges">
                  {getMatchBadge(job.match_score)}
                  {getSourceBadge(job.source)}
                  {getSponsorshipBadge(job.sponsorship_confidence, job.is_international || false)}
                </div>
              </div>
              <div className="jobs-item__meta">
                <span className="jobs-item__employer">{job.employer}</span>
                <span className="jobs-item__sep">·</span>
                <span>{job.location}</span>
                {job.salary_range && (
                  <>
                    <span className="jobs-item__sep">·</span>
                    <span>{job.salary_range}</span>
                  </>
                )}
                {job.noc_code && (
                  <>
                    <span className="jobs-item__sep">·</span>
                    <span>NOC: {job.noc_code}</span>
                  </>
                )}
                {job.province && job.source !== 'job_bank' && (
                  <>
                    <span className="jobs-item__sep">·</span>
                    <span>{job.province}</span>
                  </>
                )}
              </div>
              <div className="jobs-item__date">
                Posted {formatDate(job.first_seen_at)}
              </div>
            </div>
            <div className="jobs-item__actions">
              <button className="jobs-btn jobs-btn--ghost">View Details</button>
              <button className="jobs-btn jobs-btn--primary">Save Job</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
