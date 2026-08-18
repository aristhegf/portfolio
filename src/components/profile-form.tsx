'use client';

import { useEffect, useState, useCallback } from 'react';
import { getSession, signOut } from '@/lib/auth';
import {
  loadFullProfile,
  saveProfile,
  saveImmigrationProfile,
  uploadAvatar,
  type ProfileData,
  type ImmigrationData,
} from '@/lib/profile-client';
import {
  calculateCRS,
  ieltsBandsToCLB,
  celpipLevelsToCLB,
  getCRSTierDescription,
  type CRSInput,
  type CRSBreakdown,
  type EducationLevel,
} from '@/lib/crs';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const provinces = [
  'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick',
  'Newfoundland and Labrador', 'Nova Scotia', 'Ontario',
  'Prince Edward Island', 'Quebec', 'Saskatchewan',
];

const educationLevels: { value: EducationLevel; label: string }[] = [
  { value: 'less_than_secondary', label: 'Less than secondary (high school)' },
  { value: 'secondary', label: 'Secondary diploma (high school)' },
  { value: 'one_year', label: 'One-year diploma/certificate' },
  { value: 'two_year', label: 'Two-year diploma/certificate' },
  { value: 'bachelors', label: "Bachelor's degree (3+ years)" },
  { value: 'two_or_more', label: 'Two or more certificates/diplomas' },
  { value: 'masters', label: "Master's degree" },
  { value: 'phd', label: 'Doctoral degree (PhD)' },
];

const canadianEducationLevels = [
  { value: 'none', label: 'None' },
  { value: 'one_year', label: 'One-year diploma/certificate' },
  { value: 'two_year', label: 'Two-year diploma/certificate' },
  { value: 'three_plus', label: 'Three or more years (Bachelor+)' },
];

const countries = [
  'Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Australia',
  'Bangladesh', 'Brazil', 'Cameroon', 'China', 'Colombia',
  'Congo', 'Cuba', 'Dominican Republic', 'Ecuador', 'Egypt',
  'Ethiopia', 'France', 'Germany', 'Ghana', 'Greece',
  'Haiti', 'India', 'Indonesia', 'Iran', 'Iraq',
  'Ireland', 'Italy', 'Jamaica', 'Japan', 'Jordan',
  'Kenya', 'Lebanon', 'Mexico', 'Morocco', 'Nepal',
  'Nigeria', 'Pakistan', 'Palestine', 'Peru', 'Philippines',
  'Poland', 'Romania', 'Russia', 'Saudi Arabia', 'Senegal',
  'South Africa', 'South Korea', 'Spain', 'Sri Lanka', 'Sudan',
  'Syria', 'Taiwan', 'Tanzania', 'Thailand', 'Tunisia',
  'Turkey', 'Uganda', 'Ukraine', 'United Arab Emirates',
  'United Kingdom', 'United States', 'Venezuela', 'Vietnam', 'Yemen',
  'Other',
];

const languageTests = ['IELTS', 'CELPIP'] as const;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ProfileForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState('');
  const [toast, setToast] = useState({ visible: false, message: '' });

  // Profile
  const [fullName, setFullName] = useState('');
  const [targetProvinces, setTargetProvinces] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Immigration
  const [age, setAge] = useState('');
  const [highestEducation, setHighestEducation] = useState<EducationLevel | ''>('');
  const [educationCountry, setEducationCountry] = useState('');
  const [languageTestType, setLanguageTestType] = useState<'IELTS' | 'CELPIP'>('IELTS');
  const [ieltsListening, setIeltsListening] = useState('');
  const [ieltsReading, setIeltsReading] = useState('');
  const [ieltsWriting, setIeltsWriting] = useState('');
  const [ieltsSpeaking, setIeltsSpeaking] = useState('');
  const [canadianExpMonths, setCanadianExpMonths] = useState('0');
  const [foreignExpMonths, setForeignExpMonths] = useState('0');
  const [arrangedEmployment, setArrangedEmployment] = useState(false);
  const [provincialNomination, setProvincialNomination] = useState(false);
  const [canadianEducation, setCanadianEducation] = useState('none');

  // CRS
  const [crs, setCrs] = useState<CRSBreakdown | null>(null);

  /* ---- Load from Supabase ---- */
  useEffect(() => {
    (async () => {
      try {
        const { session } = await getSession();
        if (!session?.user) {
          window.location.href = '/auth/login';
          return;
        }
        setUserId(session.user.id);

        const { profile, immigration } = await loadFullProfile(session.user.id);

        if (profile) {
          setFullName(profile.full_name ?? '');
          setTargetProvinces(profile.target_provinces ?? []);
          setAvatarUrl(profile.avatar_url ?? null);
        }

        if (immigration) {
          setAge(immigration.age != null ? String(immigration.age) : '');
          setHighestEducation((immigration.highest_education as EducationLevel) ?? '');
          setEducationCountry(immigration.education_country ?? '');
          setLanguageTestType((immigration.language_test_type as 'IELTS' | 'CELPIP') ?? 'IELTS');
          const scores = immigration.language_scores ?? {};
          setIeltsListening(scores.listening != null ? String(scores.listening) : '');
          setIeltsReading(scores.reading != null ? String(scores.reading) : '');
          setIeltsWriting(scores.writing != null ? String(scores.writing) : '');
          setIeltsSpeaking(scores.speaking != null ? String(scores.speaking) : '');
          setCanadianExpMonths(String(immigration.canadian_experience_months ?? 0));
          setForeignExpMonths(String(immigration.foreign_experience_months ?? 0));
          setArrangedEmployment(immigration.arranged_employment ?? false);
          setProvincialNomination(immigration.provincial_nomination ?? false);
        }
      } catch {
        // Auth check failed
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ---- Live CRS calculation ---- */
  const recalcCRS = useCallback(() => {
    const ageNum = parseInt(age) || 0;
    const eduLevel = highestEducation as EducationLevel;
    if (ageNum < 17 || ageNum > 65 || !eduLevel) {
      setCrs(null);
      return;
    }

    const l = parseFloat(ieltsListening) || 0;
    const r = parseFloat(ieltsReading) || 0;
    const w = parseFloat(ieltsWriting) || 0;
    const s = parseFloat(ieltsSpeaking) || 0;
    if (!l && !r && !w && !s) {
      setCrs(null);
      return;
    }

    let clb;
    if (languageTestType === 'IELTS') {
      clb = ieltsBandsToCLB(l, r, w, s);
    } else {
      clb = celpipLevelsToCLB(l, r, w, s);
    }

    const input: CRSInput = {
      maritalStatus: 'single',
      age: ageNum,
      languageTestType,
      ...clb,
      educationLevel: eduLevel,
      canadianExperienceYears: Math.floor(parseInt(canadianExpMonths) || 0 / 12),
      foreignExperienceYears: Math.floor(parseInt(foreignExpMonths) || 0 / 12),
      arrangedEmployment,
      provincialNomination,
      canadianEducationLevel: canadianEducation as CRSInput['canadianEducationLevel'],
    };

    setCrs(calculateCRS(input));
  }, [
    age, highestEducation, languageTestType,
    ieltsListening, ieltsReading, ieltsWriting, ieltsSpeaking,
    canadianExpMonths, foreignExpMonths,
    arrangedEmployment, provincialNomination, canadianEducation,
  ]);

  useEffect(() => {
    recalcCRS();
  }, [recalcCRS]);

  /* ---- Toast ---- */
  const showToast = (message: string) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast({ visible: false, message: '' }), 3000);
  };

  /* ---- Save ---- */
  const handleSave = async () => {
    setSaving(true);
    try {
      const profileData: ProfileData = {
        full_name: fullName || null,
        target_provinces: targetProvinces,
        noc_targets: [],
        avatar_url: avatarUrl,
      };

      const immigrationData: ImmigrationData = {
        age: age ? parseInt(age) : null,
        highest_education: highestEducation || null,
        education_country: educationCountry || null,
        language_test_type: languageTestType,
        language_scores: {
          listening: parseFloat(ieltsListening) || 0,
          reading: parseFloat(ieltsReading) || 0,
          writing: parseFloat(ieltsWriting) || 0,
          speaking: parseFloat(ieltsSpeaking) || 0,
        },
        canadian_experience_months: parseInt(canadianExpMonths) || 0,
        foreign_experience_months: parseInt(foreignExpMonths) || 0,
        arranged_employment: arrangedEmployment,
        provincial_nomination: provincialNomination,
      };

      const [profileResult, immigrationResult] = await Promise.all([
        saveProfile(userId, profileData),
        saveImmigrationProfile(userId, immigrationData),
      ]);

      if (profileResult.error || immigrationResult.error) {
        showToast(`Save failed: ${profileResult.error || immigrationResult.error}`);
      } else {
        showToast('Profile saved successfully');
      }
    } catch {
      showToast('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  /* ---- Avatar ---- */
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setUploading(true);
    try {
      const { url, error } = await uploadAvatar(userId, file);
      if (error) {
        showToast(`Upload failed: ${error}`);
      } else if (url) {
        setAvatarUrl(url);
        showToast('Avatar uploaded');
      }
    } catch {
      showToast('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  /* ---- Sign out ---- */
  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/auth/login';
  };

  /* ---- Province toggle ---- */
  const toggleProvince = (province: string) => {
    setTargetProvinces((prev) =>
      prev.includes(province)
        ? prev.filter((p) => p !== province)
        : [...prev, province]
    );
  };

  /* ---- IELTS overall ---- */
  const ieltsOverall = (() => {
    const vals = [ieltsListening, ieltsReading, ieltsWriting, ieltsSpeaking]
      .map(parseFloat)
      .filter((v) => !isNaN(v) && v > 0);
    if (vals.length === 4) return (vals.reduce((a, b) => a + b, 0) / 4).toFixed(1);
    return '';
  })();

  /* ---- CLB display ---- */
  const clbDisplay = (() => {
    const l = parseFloat(ieltsListening) || 0;
    const r = parseFloat(ieltsReading) || 0;
    const w = parseFloat(ieltsWriting) || 0;
    const s = parseFloat(ieltsSpeaking) || 0;
    if (!l && !r && !w && !s) return null;
    const clb = languageTestType === 'IELTS'
      ? ieltsBandsToCLB(l, r, w, s)
      : celpipLevelsToCLB(l, r, w, s);
    return clb;
  })();

  if (loading) {
    return (
      <div className="profile-page">
        <div className="container">
          <p style={{ color: 'var(--ink-2)', textAlign: 'center', padding: '4rem 0' }}>
            Loading profile...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="container">
        <div className="profile-card">
          <div className="profile-card__header">
            <h1 className="profile-card__title">Your Profile</h1>
            <button className="jobs-btn jobs-btn--ghost" onClick={handleSignOut}>
              Sign Out
            </button>
          </div>

          <div className="profile-form">
            {/* ---- Avatar ---- */}
            <div className="profile-section" style={{ textAlign: 'center' }}>
              <div className="profile-avatar">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="profile-avatar__img" />
                ) : (
                  <div className="profile-avatar__placeholder">
                    {fullName ? fullName.charAt(0).toUpperCase() : '?'}
                  </div>
                )}
              </div>
              <label className="jobs-btn jobs-btn--ghost" style={{ marginTop: '0.8rem', cursor: 'pointer' }}>
                {uploading ? 'Uploading...' : 'Change Photo'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  style={{ display: 'none' }}
                  disabled={uploading}
                />
              </label>
            </div>

            {/* ---- CRS Live Score ---- */}
            {crs && (
              <div className={`crs-card crs-card--${crs.rankTier}`}>
                <div className="crs-card__header">
                  <span className="crs-card__label">Estimated CRS Score</span>
                  <span className="crs-card__total">{crs.total}</span>
                </div>
                <div className="crs-bar">
                  <div
                    className="crs-bar__fill"
                    style={{ width: `${Math.min((crs.total / 1200) * 100, 100)}%` }}
                  />
                </div>
                <div className="crs-breakdown">
                  <span>Core: {crs.core}</span>
                  <span>Skill: {crs.skillTransferability}</span>
                  <span>Additional: {crs.additional}</span>
                </div>
                <p className="crs-card__tier">{getCRSTierDescription(crs.rankTier)}</p>
              </div>
            )}

            {/* ---- Personal ---- */}
            <div className="profile-section">
              <h2 className="profile-section__title">Personal Information</h2>
              <div className="profile-grid">
                <div className="profile-field">
                  <label className="profile-field__label">Full Name</label>
                  <input
                    type="text"
                    className="profile-field__input"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                  />
                </div>
                <div className="profile-field">
                  <label className="profile-field__label">Age</label>
                  <input
                    type="number"
                    className="profile-field__input"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="25"
                    min="17"
                    max="65"
                  />
                </div>
              </div>
            </div>

            {/* ---- Education ---- */}
            <div className="profile-section">
              <h2 className="profile-section__title">Education</h2>
              <div className="profile-grid">
                <div className="profile-field">
                  <label className="profile-field__label">Highest Education</label>
                  <select
                    className="profile-field__select"
                    value={highestEducation}
                    onChange={(e) => setHighestEducation(e.target.value as EducationLevel)}
                  >
                    <option value="">Select...</option>
                    {educationLevels.map((l) => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </select>
                </div>
                <div className="profile-field">
                  <label className="profile-field__label">Country of Education</label>
                  <select
                    className="profile-field__select"
                    value={educationCountry}
                    onChange={(e) => setEducationCountry(e.target.value)}
                  >
                    <option value="">Select...</option>
                    {countries.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="profile-field">
                  <label className="profile-field__label">Canadian Education</label>
                  <select
                    className="profile-field__select"
                    value={canadianEducation}
                    onChange={(e) => setCanadianEducation(e.target.value)}
                  >
                    {canadianEducationLevels.map((l) => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* ---- Language ---- */}
            <div className="profile-section">
              <h2 className="profile-section__title">Language Test</h2>
              <div className="profile-grid">
                <div className="profile-field">
                  <label className="profile-field__label">Test Type</label>
                  <select
                    className="profile-field__select"
                    value={languageTestType}
                    onChange={(e) => setLanguageTestType(e.target.value as 'IELTS' | 'CELPIP')}
                  >
                    {languageTests.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="profile-field">
                  <label className="profile-field__label">Listening</label>
                  <input
                    type="number"
                    className="profile-field__input"
                    value={ieltsListening}
                    onChange={(e) => setIeltsListening(e.target.value)}
                    placeholder={languageTestType === 'IELTS' ? '6.5' : '7'}
                    min="0" max="9" step="0.5"
                  />
                </div>
                <div className="profile-field">
                  <label className="profile-field__label">Reading</label>
                  <input
                    type="number"
                    className="profile-field__input"
                    value={ieltsReading}
                    onChange={(e) => setIeltsReading(e.target.value)}
                    placeholder={languageTestType === 'IELTS' ? '6.0' : '7'}
                    min="0" max="9" step="0.5"
                  />
                </div>
                <div className="profile-field">
                  <label className="profile-field__label">Writing</label>
                  <input
                    type="number"
                    className="profile-field__input"
                    value={ieltsWriting}
                    onChange={(e) => setIeltsWriting(e.target.value)}
                    placeholder={languageTestType === 'IELTS' ? '6.0' : '7'}
                    min="0" max="9" step="0.5"
                  />
                </div>
                <div className="profile-field">
                  <label className="profile-field__label">Speaking</label>
                  <input
                    type="number"
                    className="profile-field__input"
                    value={ieltsSpeaking}
                    onChange={(e) => setIeltsSpeaking(e.target.value)}
                    placeholder={languageTestType === 'IELTS' ? '6.5' : '7'}
                    min="0" max="9" step="0.5"
                  />
                </div>
                <div className="profile-field">
                  <label className="profile-field__label">Overall</label>
                  <input
                    type="text"
                    className="profile-field__input"
                    value={ieltsOverall}
                    readOnly
                    placeholder="Auto-calculated"
                    style={{ opacity: 0.7 }}
                  />
                </div>
              </div>

              {/* CLB equivalents */}
              {clbDisplay && (
                <div className="clb-row">
                  <span className="clb-row__label">CLB Equivalent:</span>
                  <span>L:{clbDisplay.clbListening} R:{clbDisplay.clbReading} W:{clbDisplay.clbWriting} S:{clbDisplay.clbSpeaking}</span>
                </div>
              )}
            </div>

            {/* ---- Work Experience ---- */}
            <div className="profile-section">
              <h2 className="profile-section__title">Work Experience</h2>
              <div className="profile-grid">
                <div className="profile-field">
                  <label className="profile-field__label">Canadian Experience (months)</label>
                  <input
                    type="number"
                    className="profile-field__input"
                    value={canadianExpMonths}
                    onChange={(e) => setCanadianExpMonths(e.target.value)}
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div className="profile-field">
                  <label className="profile-field__label">Foreign Experience (months)</label>
                  <input
                    type="number"
                    className="profile-field__input"
                    value={foreignExpMonths}
                    onChange={(e) => setForeignExpMonths(e.target.value)}
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>
            </div>

            {/* ---- Additional Factors ---- */}
            <div className="profile-section">
              <h2 className="profile-section__title">Additional Factors</h2>
              <div className="profile-grid">
                <div className="profile-field">
                  <label className="profile-field__label">Arranged Employment</label>
                  <select
                    className="profile-field__select"
                    value={arrangedEmployment ? 'yes' : 'no'}
                    onChange={(e) => setArrangedEmployment(e.target.value === 'yes')}
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes (+50 pts)</option>
                  </select>
                </div>
                <div className="profile-field">
                  <label className="profile-field__label">Provincial Nomination</label>
                  <select
                    className="profile-field__select"
                    value={provincialNomination ? 'yes' : 'no'}
                    onChange={(e) => setProvincialNomination(e.target.value === 'yes')}
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes (+600 pts)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ---- Target Provinces ---- */}
            <div className="profile-section">
              <h2 className="profile-section__title">Target Provinces</h2>
              <div className="profile-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
                {provinces.map((province) => (
                  <label key={province} className="jobs-checkbox">
                    <input
                      type="checkbox"
                      checked={targetProvinces.includes(province)}
                      onChange={() => toggleProvince(province)}
                    />
                    <span>{province}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* ---- Save ---- */}
            <div className="profile-actions">
              <button className="jobs-btn jobs-btn--primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className={`profile-toast ${toast.visible ? 'is-visible' : ''}`} role="status" aria-live="polite">
        {toast.message}
      </div>
    </div>
  );
}
