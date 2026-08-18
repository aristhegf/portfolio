'use client';

import { useState } from 'react';

export function JobsFilters() {
  const [search, setSearch] = useState('');
  const [province, setProvince] = useState('');
  const [nocCode, setNocCode] = useState('');
  const [sponsorshipOnly, setSponsorshipOnly] = useState(false);
  const [source, setSource] = useState('');
  const [remoteOnly, setRemoteOnly] = useState(false);

  const provinces = [
    'Alberta',
    'British Columbia',
    'Manitoba',
    'New Brunswick',
    'Newfoundland and Labrador',
    'Nova Scotia',
    'Ontario',
    'Prince Edward Island',
    'Quebec',
    'Saskatchewan',
  ];

  const sources = [
    { value: '', label: 'All Sources' },
    { value: 'job_bank', label: '🇨🇦 Job Bank (Canada)' },
    { value: 'arbeitnow', label: '🇩🇪 Arbeitnow (Germany)' },
    { value: 'himalayas', label: '🌍 Himalayas (Remote)' },
  ];

  return (
    <div className="jobs-filters">
      <div className="jobs-filters__grid">
        <div className="jobs-field">
          <label htmlFor="search" className="jobs-field__label">Search</label>
          <input
            type="text"
            id="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Job title or keyword..."
            className="jobs-input"
          />
        </div>

        <div className="jobs-field">
          <label htmlFor="source" className="jobs-field__label">Source</label>
          <select
            id="source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="jobs-select"
          >
            {sources.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="jobs-field">
          <label htmlFor="province" className="jobs-field__label">Province</label>
          <select
            id="province"
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            className="jobs-select"
          >
            <option value="">All Provinces</option>
            {provinces.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="jobs-field">
          <label htmlFor="noc" className="jobs-field__label">NOC Code</label>
          <input
            type="text"
            id="noc"
            value={nocCode}
            onChange={(e) => setNocCode(e.target.value)}
            placeholder="e.g., 21231"
            className="jobs-input"
          />
        </div>

        <div className="jobs-field jobs-field--checkbox">
          <label className="jobs-checkbox">
            <input
              type="checkbox"
              checked={sponsorshipOnly}
              onChange={(e) => setSponsorshipOnly(e.target.checked)}
            />
            <span>Sponsorship evidence only</span>
          </label>
        </div>

        <div className="jobs-field jobs-field--checkbox">
          <label className="jobs-checkbox">
            <input
              type="checkbox"
              checked={remoteOnly}
              onChange={(e) => setRemoteOnly(e.target.checked)}
            />
            <span>Remote jobs only</span>
          </label>
        </div>
      </div>

      <div className="jobs-filters__actions">
        <button className="jobs-btn jobs-btn--primary">Apply Filters</button>
      </div>
    </div>
  );
}
