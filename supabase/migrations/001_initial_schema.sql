-- MyHelpa Database Schema
-- Based on the Product & Engineering Plan v2

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- IDENTITY & PROFILE
-- ============================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT,
  target_industries TEXT[] DEFAULT '{}',
  target_provinces TEXT[] DEFAULT '{}',
  noc_targets TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE immigration_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  age INTEGER,
  highest_education TEXT,
  education_country TEXT,
  language_test_type TEXT,
  language_scores JSONB DEFAULT '{}',
  canadian_experience_months INTEGER DEFAULT 0,
  foreign_experience_months INTEGER DEFAULT 0,
  arranged_employment BOOLEAN DEFAULT FALSE,
  provincial_nomination BOOLEAN DEFAULT FALSE,
  crs_score_cached INTEGER,
  crs_ruleset_version TEXT,
  crs_calculated_at TIMESTAMPTZ,
  document_expiries JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DETERMINISTIC IMMIGRATION RULES
-- ============================================================

CREATE TABLE immigration_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  jurisdiction TEXT NOT NULL,
  pathway TEXT NOT NULL,
  version TEXT NOT NULL,
  effective_from DATE NOT NULL,
  effective_until DATE,
  rule_key TEXT NOT NULL,
  rule_value JSONB NOT NULL,
  source_url TEXT,
  source_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(jurisdiction, pathway, version, rule_key)
);

-- ============================================================
-- EMPLOYERS & POSTINGS
-- ============================================================

CREATE TABLE employers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  canonical_name TEXT NOT NULL,
  aliases TEXT[] DEFAULT '{}',
  province TEXT,
  source TEXT NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE postings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employer_id UUID NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
  canonical_fingerprint TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  noc_code TEXT,
  location TEXT NOT NULL,
  salary_range TEXT,
  raw_description TEXT NOT NULL,
  sponsorship_confidence NUMERIC(3,2) DEFAULT 0,
  status TEXT DEFAULT 'unknown' CHECK (status IN ('active', 'closed', 'unknown')),
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE posting_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  posting_id UUID NOT NULL REFERENCES postings(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  source_url TEXT,
  external_id TEXT,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(posting_id, source, external_id)
);

CREATE TABLE sponsorship_evidence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  posting_id UUID NOT NULL REFERENCES postings(id) ON DELETE CASCADE,
  employer_id UUID NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  evidence_type TEXT NOT NULL CHECK (evidence_type IN (
    'lmia_positive_history',
    'job_bank_intl_flag',
    'job_bank_lmia_flag',
    'employer_stated',
    'manual'
  )),
  evidence_text TEXT NOT NULL,
  observed_at TIMESTAMPTZ DEFAULT NOW(),
  confidence NUMERIC(3,2) NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- REQUIREMENTS
-- ============================================================

CREATE TABLE requirements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  posting_id UUID NOT NULL REFERENCES postings(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'resume', 'cover_letter', 'portfolio', 'reference',
    'certification', 'assessment', 'other'
  )),
  detail TEXT NOT NULL,
  condition TEXT,
  is_mandatory BOOLEAN DEFAULT TRUE,
  confidence NUMERIC(3,2) DEFAULT 1,
  source TEXT,
  evidence_text TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'satisfied', 'not_applicable')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DOCUMENTS
-- ============================================================

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  is_master BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE document_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  checksum TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  UNIQUE(document_id, version_number)
);

-- ============================================================
-- APPLICATIONS
-- ============================================================

CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  posting_id UUID NOT NULL REFERENCES postings(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'saved' CHECK (status IN (
    'saved', 'drafting', 'submitted', 'interviewing', 'offer', 'rejected'
  )),
  portal_used TEXT,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE application_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  document_version_id UUID NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
  tailoring_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE application_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  rule_text TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('deadline', 'follow_up', 'requirement', 'other')),
  due_at TIMESTAMPTZ,
  satisfied BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE generation_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  source_document_version_id UUID NOT NULL REFERENCES document_versions(id),
  source_posting_id UUID NOT NULL REFERENCES postings(id),
  model TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  output_document_version_id UUID REFERENCES document_versions(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SCHEDULING
-- ============================================================

CREATE TABLE interviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  calendar_event_id TEXT,
  type TEXT NOT NULL,
  prep_notes TEXT,
  outcome TEXT,
  detected_from TEXT,
  confirmed_by_user BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- OPS
-- ============================================================

CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  attempts INTEGER DEFAULT 0,
  run_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_postings_fingerprint ON postings(canonical_fingerprint);
CREATE INDEX idx_postings_employer ON postings(employer_id);
CREATE INDEX idx_postings_status ON postings(status);
CREATE INDEX idx_postings_noc ON postings(noc_code);
CREATE INDEX idx_employers_name ON employers(canonical_name);
CREATE INDEX idx_sponsorship_posting ON sponsorship_evidence(posting_id);
CREATE INDEX idx_requirements_posting ON requirements(posting_id);
CREATE INDEX idx_applications_user ON applications(user_id);
CREATE INDEX idx_applications_posting ON applications(posting_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_jobs_status ON jobs(status, run_at);
CREATE INDEX idx_notifications_user ON notifications(user_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE immigration_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies (single-user for now, but ready for multi-tenant)
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own immigration profile" ON immigration_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own immigration profile" ON immigration_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own immigration profile" ON immigration_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own documents" ON documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents" ON documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own document versions" ON document_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_versions.document_id
      AND documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own document versions" ON document_versions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_versions.document_id
      AND documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own applications" ON applications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own applications" ON applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own applications" ON applications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own application documents" ON application_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id = application_documents.application_id
      AND applications.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own application documents" ON application_documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id = application_documents.application_id
      AND applications.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own application rules" ON application_rules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id = application_rules.application_id
      AND applications.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own generation runs" ON generation_runs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id = generation_runs.application_id
      AND applications.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own interviews" ON interviews
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id = interviews.application_id
      AND applications.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own interviews" ON interviews
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id = interviews.application_id
      AND applications.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Function to generate canonical fingerprint for deduplication
CREATE OR REPLACE FUNCTION generate_fingerprint(
  employer_name TEXT,
  job_title TEXT,
  location TEXT
) RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(
    TRIM(employer_name) || '|' ||
    TRIM(REGEXP_REPLACE(job_title, '[^a-zA-Z0-9 ]', '', 'g')) || '|' ||
    TRIM(location)
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;
