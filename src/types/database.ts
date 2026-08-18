// Database types based on the MyHelpa engineering plan

// Identity & profile
export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  target_industries: string[];
  target_provinces: string[];
  noc_targets: string[];
  created_at: string;
}

export interface ImmigrationProfile {
  id: string;
  user_id: string;
  age: number | null;
  highest_education: string | null;
  education_country: string | null;
  language_test_type: string | null;
  language_scores: Record<string, number>; // varies by test (IELTS/CELPIP/TEF)
  canadian_experience_months: number;
  foreign_experience_months: number;
  arranged_employment: boolean;
  provincial_nomination: boolean;
  crs_score_cached: number | null;
  crs_ruleset_version: string | null;
  crs_calculated_at: string | null;
  document_expiries: Record<string, string>; // police cert, medical, biometrics
  created_at: string;
}

// Deterministic immigration rules (never AI-authored)
export interface ImmigrationRule {
  id: string;
  jurisdiction: string;
  pathway: string;
  version: string;
  effective_from: string;
  effective_until: string | null;
  rule_key: string;
  rule_value: Record<string, unknown>;
  source_url: string | null;
  source_checked_at: string | null;
  created_at: string;
}

// Employers & postings
export interface Employer {
  id: string;
  canonical_name: string;
  aliases: string[];
  province: string | null;
  source: string;
  verified_at: string | null;
  created_at: string;
}

export type PostingStatus = 'active' | 'closed' | 'unknown';

export interface Posting {
  id: string;
  employer_id: string;
  canonical_fingerprint: string;
  title: string;
  noc_code: string | null;
  location: string;
  salary_range: string | null;
  raw_description: string;
  sponsorship_confidence: number; // 0-1 numeric
  status: PostingStatus;
  first_seen_at: string;
  created_at: string;
}

export interface PostingSource {
  id: string;
  posting_id: string;
  source: string;
  source_url: string | null;
  external_id: string | null;
  first_seen_at: string;
}

export type EvidenceType =
  | 'lmia_positive_history'
  | 'job_bank_intl_flag'
  | 'job_bank_lmia_flag'
  | 'employer_stated'
  | 'manual';

export interface SponsorshipEvidence {
  id: string;
  posting_id: string;
  employer_id: string;
  source: string;
  evidence_type: EvidenceType;
  evidence_text: string;
  observed_at: string;
  confidence: number;
  expires_at: string | null;
  created_at: string;
}

// Requirements
export type RequirementType =
  | 'resume'
  | 'cover_letter'
  | 'portfolio'
  | 'reference'
  | 'certification'
  | 'assessment'
  | 'other';

export interface Requirement {
  id: string;
  posting_id: string;
  type: RequirementType;
  detail: string;
  condition: string | null;
  is_mandatory: boolean;
  confidence: number;
  source: string | null;
  evidence_text: string | null;
  status: 'pending' | 'satisfied' | 'not_applicable';
  created_at: string;
}

// Documents
export interface Document {
  id: string;
  user_id: string;
  type: string;
  is_master: boolean;
  created_at: string;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  storage_path: string;
  checksum: string;
  mime_type: string;
  file_size: number;
  created_at: string;
  verified_at: string | null;
}

// Applications
export type ApplicationStatus =
  | 'saved'
  | 'drafting'
  | 'submitted'
  | 'interviewing'
  | 'offer'
  | 'rejected';

export interface Application {
  id: string;
  user_id: string;
  posting_id: string;
  status: ApplicationStatus;
  portal_used: string | null;
  submitted_at: string | null;
  created_at: string;
}

export interface ApplicationDocument {
  id: string;
  application_id: string;
  document_version_id: string;
  tailoring_notes: string | null;
}

export type RuleType = 'deadline' | 'follow_up' | 'requirement' | 'other';

export interface ApplicationRule {
  id: string;
  application_id: string;
  rule_text: string;
  rule_type: RuleType;
  due_at: string | null;
  satisfied: boolean;
  created_at: string;
}

export type GenerationStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface GenerationRun {
  id: string;
  application_id: string;
  source_document_version_id: string;
  source_posting_id: string;
  model: string;
  prompt_version: string;
  output_document_version_id: string | null;
  status: GenerationStatus;
  created_at: string;
}

// Scheduling
export interface Interview {
  id: string;
  application_id: string;
  scheduled_at: string;
  calendar_event_id: string | null;
  type: string;
  prep_notes: string | null;
  outcome: string | null;
  detected_from: string | null;
  confirmed_by_user: boolean;
  created_at: string;
}

// Ops
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface Job {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  status: JobStatus;
  attempts: number;
  run_at: string;
  completed_at: string | null;
  error: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  payload: Record<string, unknown>;
  sent_at: string | null;
  read_at: string | null;
  created_at: string;
}

// Extended types with relations
export interface PostingWithEmployer extends Posting {
  employer: Employer;
  sponsorship_evidence: SponsorshipEvidence[];
  requirements: Requirement[];
}

export interface ApplicationWithPosting extends Application {
  posting: PostingWithEmployer;
  application_rules: ApplicationRule[];
}
