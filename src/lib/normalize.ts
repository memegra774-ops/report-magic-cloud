// Canonicalization helpers for education levels & academic ranks.
// Different sources spell the same value many ways; we always store the canonical form.

export const normalizeEducationLevel = (raw?: string | null): string => {
  if (!raw) return '';
  const v = raw.trim().toLowerCase().replace(/\s+/g, '').replace(/\./g, '');
  if (['phd', 'phd.', 'phd', 'phd', 'phd'].includes(v) || v === 'phd' || v === 'phd' || v === 'phd') return 'PHD';
  if (v === 'phd' || v === 'phd' || v === 'phd' || v === 'phd' || v === 'phd' || v.startsWith('phd')) return 'PHD';
  if (v === 'msc' || v === 'msc' || v === 'msc') return 'Msc';
  if (v === 'bsc' || v === 'bsc' || v === 'bsc') return 'Bsc';
  if (v === 'ma') return 'MA';
  if (v === 'llm') return 'LLM';
  if (v === 'mba') return 'MBA';
  if (v === 'dip' || v === 'diploma') return 'Dip';
  if (v === 'bed' || v === 'bed') return 'BED';
  return raw.trim();
};

export const normalizeAcademicRank = (raw?: string | null): string => {
  if (!raw) return '';
  const original = raw.trim();
  const v = original.toLowerCase().replace(/\s+/g, '').replace(/\./g, '');
  // Asst. Prof. variants
  if (['asstprof', 'assistantprofessor', 'assprof'].includes(v)) return 'Asst. Prof.';
  // Asst. Lec. variants
  if (['asstlec', 'asstlecturer', 'asslecturer', 'assistantlecturer'].includes(v)) return 'Asst. Lec.';
  if (v === 'lecturer') return 'Lecturer';
  if (v === 'seniorlecturer' || v === 'srlecturer') return 'Senior Lecturer';
  if (v === 'assocprof' || v === 'associateprofessor') return 'Assoc. Prof.';
  if (v === 'professor' || v === 'prof') return 'Professor';
  if (v === 'ga') return 'GA';
  if (v === 'ara' || v === 'arai') return 'ARA';
  if (v === 'sara' || v === 'sarai') return 'SARA';
  if (v === 'chiefara' || v === 'chiefarai') return 'Chief ARA';
  if (v === 'cara') return 'CARA';
  return original;
};
