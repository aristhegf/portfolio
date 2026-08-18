/**
 * Comprehensive Ranking System (CRS) Score Calculator
 * Based on IRCC's official Express Entry scoring system.
 *
 * Reference: https://www.canada.ca/en/immigration-refugees-citizenship/corporate/mandate/policies-operational-instructions-agreements/ministerial-instructions/express-entry-rounds.html
 *
 * Total maximum: 1200 points
 *   - Core/Human Capital Factors: max 500 (single) / 460 (married)
 *   - Skill Transferability Factors: max 100
 *   - Additional Points: max 600
 */

import { ieltsToCLB } from './profile';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface CRSInput {
  /** "single" or "married" (common-law counts as married) */
  maritalStatus: 'single' | 'married';
  age: number;

  /* Language */
  languageTestType: 'IELTS' | 'CELPIP' | 'TEF' | 'TCF';
  /** CLB equivalents (converted from raw scores inside the calculator) */
  clbListening: number;
  clbReading: number;
  clbWriting: number;
  clbSpeaking: number;

  /* Education */
  educationLevel: EducationLevel;

  /* Canadian work experience (years, 0-5+) */
  canadianExperienceYears: number;

  /* Foreign work experience (years, 0-3+) */
  foreignExperienceYears: number;

  /* Arranged employment (LMIA-backed offer) */
  arrangedEmployment: boolean;

  /* Provincial nomination */
  provincialNomination: boolean;

  /* Canadian education */
  canadianEducationLevel?: CanadianEducationLevel;

  /** Sibling in Canada (citizen or PR, 18+) */
  siblingInCanada?: boolean;

  /** French language ability (for additional points) */
  frenchCLB?: number; // NCLC 7+ for extra points
}

export interface CRSBreakdown {
  core: number;          // Age + Education + Language + Canadian Experience (max 500/460)
  coreAge: number;
  coreEducation: number;
  coreLanguage: number;
  coreCanadianExperience: number;
  skillTransferability: number;  // max 100
  additional: number;            // max 600
  additionalNomination: number;
  additionalEmployment: number;
  additionalEducation: number;
  additionalFrench: number;
  additionalSibling: number;
  total: number;
  /** Human-readable rank estimate */
  rankTier: 'competitive' | 'moderate' | 'low';
}

export type EducationLevel =
  | 'less_than_secondary'
  | 'secondary'
  | 'one_year'
  | 'two_year'
  | 'bachelors'
  | 'two_or_more'
  | 'masters'
  | 'phd';

export type CanadianEducationLevel =
  | 'none'
  | 'one_year'
  | 'two_year'
  | 'three_plus';

/* ------------------------------------------------------------------ */
/*  CLB Conversion Tables                                              */
/* ------------------------------------------------------------------ */

/** Convert IELTS band to CLB level */
function ieltsBandToCLB(band: number, ability: 'listening' | 'reading' | 'writing' | 'speaking'): number {
  const table: Record<string, Record<number, number>> = {
    listening: {
      8.5: 10, 8.0: 10, 7.5: 9, 7.0: 8, 6.5: 7, 6.0: 6, 5.5: 5, 5.0: 4,
    },
    reading: {
      8.0: 10, 7.5: 9, 7.0: 8, 6.5: 7, 6.0: 6, 5.5: 5, 5.0: 4,
    },
    writing: {
      7.5: 10, 7.0: 9, 6.5: 8, 6.0: 7, 5.5: 6, 5.0: 5, 4.5: 4,
    },
    speaking: {
      7.5: 10, 7.0: 9, 6.5: 8, 6.0: 7, 5.5: 6, 5.0: 5, 4.5: 4,
    },
  };

  // Find the closest band that doesn't exceed the input
  const bands = Object.keys(table[ability]).map(Number).sort((a, b) => b - a);
  for (const b of bands) {
    if (band >= b) return table[ability][b];
  }
  return 0;
}

/** Convert CELPIP level to CLB (1:1 mapping for most levels) */
function celpipToCLB(level: number): number {
  if (level >= 10) return 10;
  if (level >= 9) return 9;
  if (level >= 8) return 8;
  if (level >= 7) return 7;
  if (level >= 6) return 6;
  if (level >= 5) return 5;
  return 0;
}

/** Convert TEF Canada results to CLB */
function tefToCLB(results: { comprehension_ecrite: number; comprehension_orale: number; expression_ecrite: number; expression_orale: number }): { listening: number; reading: number; writing: number; speaking: number } {
  // Simplified TEF to CLB mapping
  const toCLB = (score: number, max: number): number => {
    const pct = score / max;
    if (pct >= 0.9) return 10;
    if (pct >= 0.8) return 9;
    if (pct >= 0.7) return 8;
    if (pct >= 0.6) return 7;
    if (pct >= 0.5) return 6;
    if (pct >= 0.4) return 5;
    return 4;
  };

  return {
    listening: toCLB(results.comprehension_orale, 316),
    reading: toCLB(results.comprehension_ecrite, 263),
    writing: toCLB(results.expression_ecrite, 393),
    speaking: toCLB(results.expression_orale, 393),
  };
}

/* ------------------------------------------------------------------ */
/*  Age Points (Core/Human Capital)                                    */
/* ------------------------------------------------------------------ */

/** Max 110 points for single, 100 for married */
function agePoints(age: number, maritalStatus: 'single' | 'married'): number {
  const max = maritalStatus === 'single' ? 110 : 100;

  if (age >= 20 && age <= 29) return max;
  if (age === 19) return max - 5;
  if (age === 30) return max - 5;
  if (age === 31) return max - 10;
  if (age === 32) return max - 15;
  if (age === 33) return max - 20;
  if (age === 34) return max - 25;
  if (age === 35) return max - 30;
  if (age === 36) return max - 35;
  if (age === 37) return max - 40;
  if (age === 38) return max - 45;
  if (age === 39) return max - 50;
  if (age === 40) return max - 55;
  if (age === 41) return max - 60;
  if (age === 42) return max - 65;
  if (age === 43) return max - 70;
  if (age === 44) return max - 75;
  if (age === 45) return max - 80;
  if (age === 46) return max - 85;
  if (age === 47) return max - 90;
  if (age === 48) return max - 95;
  if (age >= 17 && age <= 48) return 0;
  return 0;
}

/* ------------------------------------------------------------------ */
/*  Education Points (Core/Human Capital)                              */
/* ------------------------------------------------------------------ */

function educationPoints(level: EducationLevel, maritalStatus: 'single' | 'married'): number {
  const singleTable: Record<EducationLevel, number> = {
    less_than_secondary: 0,
    secondary: 30,
    one_year: 90,
    two_year: 98,
    bachelors: 120,
    two_or_more: 128,
    masters: 135,
    phd: 150,
  };

  const marriedTable: Record<EducationLevel, number> = {
    less_than_secondary: 0,
    secondary: 28,
    one_year: 84,
    two_year: 91,
    bachelors: 112,
    two_or_more: 119,
    masters: 126,
    phd: 140,
  };

  return maritalStatus === 'single' ? singleTable[level] : marriedTable[level];
}

/* ------------------------------------------------------------------ */
/*  Language Points (Core/Human Capital)                               */
/* ------------------------------------------------------------------ */

/**
 * Points per CLB level per ability (single applicant).
 * First official language: up to 34 per ability = 136 total.
 */
function languagePointsSingle(clb: number): number {
  if (clb >= 10) return 34;
  if (clb >= 9) return 31;
  if (clb >= 8) return 29;
  if (clb >= 7) return 23;
  if (clb >= 6) return 17;
  if (clb >= 5) return 9;
  if (clb >= 4) return 6;
  return 0;
}

function languagePointsMarried(clb: number): number {
  if (clb >= 10) return 32;
  if (clb >= 9) return 29;
  if (clb >= 8) return 27;
  if (clb >= 7) return 22;
  if (clb >= 6) return 16;
  if (clb >= 5) return 8;
  if (clb >= 4) return 6;
  return 0;
}

/* ------------------------------------------------------------------ */
/*  Canadian Experience Points (Core/Human Capital)                    */
/* ------------------------------------------------------------------ */

function canadianExperiencePoints(years: number, maritalStatus: 'single' | 'married'): number {
  const singleTable: Record<number, number> = { 0: 0, 1: 40, 2: 53, 3: 64, 4: 72, 5: 80 };
  const marriedTable: Record<number, number> = { 0: 0, 1: 35, 2: 46, 3: 56, 4: 63, 5: 70 };
  const capped = Math.min(years, 5);
  return maritalStatus === 'single' ? (singleTable[capped] ?? 0) : (marriedTable[capped] ?? 0);
}

/* ------------------------------------------------------------------ */
/*  Skill Transferability Factors (max 100)                            */
/* ------------------------------------------------------------------ */

function skillTransferability(
  education: EducationLevel,
  clb: number,
  canadianExp: number,
  foreignExp: number,
): number {
  let total = 0;

  // Education + Language combination
  const hasHigherEd = ['bachelors', 'two_or_more', 'masters', 'phd'].includes(education);
  const hasPostSec = ['one_year', 'two_year', 'bachelors', 'two_or_more', 'masters', 'phd'].includes(education);

  if (hasHigherEd && clb >= 9) {
    total += 50;
  } else if (hasHigherEd && clb >= 7) {
    total += 25;
  } else if (hasPostSec && clb >= 9) {
    total += 25;
  } else if (hasPostSec && clb >= 7) {
    total += 13;
  }

  // Education + Canadian experience combination
  if (hasHigherEd && canadianExp >= 3) {
    total += 50;
  } else if (hasHigherEd && canadianExp >= 1) {
    total += 25;
  } else if (hasPostSec && canadianExp >= 3) {
    total += 25;
  } else if (hasPostSec && canadianExp >= 1) {
    total += 13;
  }

  // Foreign experience + Language combination
  if (foreignExp >= 3 && clb >= 9) {
    total += 50;
  } else if (foreignExp >= 3 && clb >= 7) {
    total += 25;
  } else if (foreignExp >= 1 && clb >= 9) {
    total += 25;
  } else if (foreignExp >= 1 && clb >= 7) {
    total += 13;
  }

  // Foreign experience + Canadian experience combination
  if (foreignExp >= 3 && canadianExp >= 2) {
    total += 50;
  } else if (foreignExp >= 3 && canadianExp >= 1) {
    total += 25;
  } else if (foreignExp >= 1 && canadianExp >= 2) {
    total += 25;
  } else if (foreignExp >= 1 && canadianExp >= 1) {
    total += 13;
  }

  // Cap at 100
  return Math.min(total, 100);
}

/* ------------------------------------------------------------------ */
/*  Additional Points (max 600)                                        */
/* ------------------------------------------------------------------ */

function additionalPoints(input: CRSInput): {
  total: number;
  nomination: number;
  employment: number;
  education: number;
  french: number;
  sibling: number;
} {
  let nomination = 0;
  let employment = 0;
  let education = 0;
  let french = 0;
  let sibling = 0;

  // Provincial nomination: 600 points
  if (input.provincialNomination) {
    nomination = 600;
  }

  // Arranged employment: 50 or 200 points
  if (input.arrangedEmployment) {
    // 200 for NOC TEER 0 major group 00 (senior management)
    // 50 for all other eligible NOCs
    // We default to 50 since we don't have NOC data here
    employment = 50;
  }

  // Canadian education: 15 or 30 points
  if (input.canadianEducationLevel === 'one_year') {
    education = 15;
  } else if (input.canadianEducationLevel === 'two_year' || input.canadianEducationLevel === 'three_plus') {
    education = 30;
  }

  // French language proficiency: up to 50 points
  if (input.frenchCLB && input.frenchCLB >= 7) {
    // French + English CLB 5+ = 50 points
    // French only (no English CLB 5+) = 25 points
    const hasEnglish = Math.min(
      input.clbListening, input.clbReading, input.clbWriting, input.clbSpeaking
    ) >= 5;
    french = hasEnglish ? 50 : 25;
  }

  // Sibling in Canada: 15 points
  if (input.siblingInCanada) {
    sibling = 15;
  }

  const total = Math.min(
    nomination + employment + education + french + sibling,
    600
  );

  return { total, nomination, employment, education, french, sibling };
}

/* ------------------------------------------------------------------ */
/*  Main CRS Calculator                                                */
/* ------------------------------------------------------------------ */

export function calculateCRS(input: CRSInput): CRSBreakdown {
  const maritalStatus = input.maritalStatus;

  // --- Core / Human Capital ---
  const coreAge = agePoints(input.age, maritalStatus);
  const coreEducation = educationPoints(input.educationLevel, maritalStatus);

  const langFn = maritalStatus === 'single' ? languagePointsSingle : languagePointsMarried;
  const coreLanguage =
    langFn(input.clbListening) +
    langFn(input.clbReading) +
    langFn(input.clbWriting) +
    langFn(input.clbSpeaking);

  const coreCanadianExperience = canadianExperiencePoints(input.canadianExperienceYears, maritalStatus);

  const coreMax = maritalStatus === 'single' ? 500 : 460;
  const core = Math.min(
    coreAge + coreEducation + coreLanguage + coreCanadianExperience,
    coreMax
  );

  // --- Skill Transferability ---
  const avgCLB = Math.round(
    (input.clbListening + input.clbReading + input.clbWriting + input.clbSpeaking) / 4
  );
  const skillTransfer = skillTransferability(
    input.educationLevel,
    avgCLB,
    input.canadianExperienceYears,
    input.foreignExperienceYears,
  );

  // --- Additional ---
  const addl = additionalPoints(input);

  const total = Math.min(core + skillTransfer + addl.total, 1200);

  // Rank tier
  let rankTier: CRSBreakdown['rankTier'] = 'low';
  if (total >= 470) rankTier = 'competitive';
  else if (total >= 430) rankTier = 'moderate';

  return {
    core,
    coreAge,
    coreEducation,
    coreLanguage,
    coreCanadianExperience,
    skillTransferability: skillTransfer,
    additional: addl.total,
    additionalNomination: addl.nomination,
    additionalEmployment: addl.employment,
    additionalEducation: addl.education,
    additionalFrench: addl.french,
    additionalSibling: addl.sibling,
    total,
    rankTier,
  };
}

/**
 * Convert IELTS band scores to CLB levels for CRS calculation
 */
export function ieltsBandsToCLB(
  listening: number,
  reading: number,
  writing: number,
  speaking: number
): { clbListening: number; clbReading: number; clbWriting: number; clbSpeaking: number } {
  return {
    clbListening: ieltsBandToCLB(listening, 'listening'),
    clbReading: ieltsBandToCLB(reading, 'reading'),
    clbWriting: ieltsBandToCLB(writing, 'writing'),
    clbSpeaking: ieltsBandToCLB(speaking, 'speaking'),
  };
}

/**
 * Convert CELPIP levels to CLB
 */
export function celpipLevelsToCLB(
  listening: number,
  reading: number,
  writing: number,
  speaking: number
): { clbListening: number; clbReading: number; clbWriting: number; clbSpeaking: number } {
  return {
    clbListening: celpipToCLB(listening),
    clbReading: celpipToCLB(reading),
    clbWriting: celpipToCLB(writing),
    clbSpeaking: celpipToCLB(speaking),
  };
}

/**
 * Convert TEF scores to CLB
 */
export function tefScoresToCLB(
  comprehension_ecrite: number,
  comprehension_orale: number,
  expression_ecrite: number,
  expression_orale: number
): { clbListening: number; clbReading: number; clbWriting: number; clbSpeaking: number } {
  const tef = tefToCLB({ comprehension_ecrite, comprehension_orale, expression_ecrite, expression_orale });
  return {
    clbListening: tef.listening,
    clbReading: tef.reading,
    clbWriting: tef.writing,
    clbSpeaking: tef.speaking,
  };
}

/**
 * Get a human-readable description of the CRS tier
 */
export function getCRSTierDescription(tier: CRSBreakdown['rankTier']): string {
  switch (tier) {
    case 'competitive':
      return 'Your score is competitive for Express Entry draws.';
    case 'moderate':
      return 'Your score may qualify in some draws. Consider improving language scores or gaining Canadian experience.';
    case 'low':
      return 'Your score is below recent draw cutoffs. Focus on language improvement, education, or provincial nomination.';
  }
}
