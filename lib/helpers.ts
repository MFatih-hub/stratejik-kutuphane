export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return '';
  const mb = bytes / (1024 * 1024);
  return mb.toFixed(1) + ' MB';
}

// ============= ALANLAR =============
export interface SubjectGroup {
  slug: string;
  name: string;
  icon: string;
  subjects: { slug: string; name: string }[];
}

export const SUBJECT_GROUPS: SubjectGroup[] = [
  {
    slug: 'physical-sciences',
    name: 'Physical Sciences and Engineering',
    icon: 'ti-atom',
    subjects: [
      { slug: 'chemical-engineering', name: 'Chemical Engineering' },
      { slug: 'chemistry', name: 'Chemistry' },
      { slug: 'computer-science', name: 'Computer Science' },
      { slug: 'earth-planetary-sciences', name: 'Earth and Planetary Sciences' },
      { slug: 'energy', name: 'Energy' },
      { slug: 'engineering', name: 'Engineering' },
      { slug: 'materials-science', name: 'Materials Science' },
      { slug: 'mathematics', name: 'Mathematics' },
      { slug: 'physics-astronomy', name: 'Physics and Astronomy' },
    ],
  },
  {
    slug: 'life-sciences',
    name: 'Life Sciences',
    icon: 'ti-dna',
    subjects: [
      { slug: 'agricultural-biological', name: 'Agricultural and Biological Sciences' },
      { slug: 'biochemistry-genetics', name: 'Biochemistry, Genetics and Molecular Biology' },
      { slug: 'environmental-science', name: 'Environmental Science' },
      { slug: 'immunology-microbiology', name: 'Immunology and Microbiology' },
      { slug: 'neuroscience', name: 'Neuroscience' },
    ],
  },
  {
    slug: 'health-sciences',
    name: 'Health Sciences',
    icon: 'ti-stethoscope',
    subjects: [
      { slug: 'medicine-dentistry', name: 'Medicine and Dentistry' },
      { slug: 'nursing-health', name: 'Nursing and Health Professions' },
      { slug: 'pharmacology', name: 'Pharmacology, Toxicology and Pharmaceutical Science' },
      { slug: 'veterinary', name: 'Veterinary Science and Veterinary Medicine' },
    ],
  },
  {
    slug: 'social-humanities',
    name: 'Social Sciences and Humanities',
    icon: 'ti-books',
    subjects: [
      { slug: 'arts-humanities', name: 'Arts and Humanities' },
      { slug: 'business-management', name: 'Business, Management and Accounting' },
      { slug: 'decision-sciences', name: 'Decision Sciences' },
      { slug: 'economics-finance', name: 'Economics, Econometrics and Finance' },
      { slug: 'psychology', name: 'Psychology' },
      { slug: 'social-sciences', name: 'Social Sciences' },
    ],
  },
];

// Slug → name lookup
export const SUBJECT_LOOKUP: Record<string, { name: string; groupName: string; groupSlug: string }> = {};
SUBJECT_GROUPS.forEach((g) => {
  g.subjects.forEach((s) => {
    SUBJECT_LOOKUP[s.slug] = { name: s.name, groupName: g.name, groupSlug: g.slug };
  });
});

// ============= TÜRLER =============
export interface ResourceType {
  slug: string;
  name: string;
  icon: string;
  color: { bg: string; fg: string };
}

export const RESOURCE_TYPES: ResourceType[] = [
  { slug: 'journal',       name: 'Journal',        icon: 'ti-news',           color: { bg: '#e6f1fb', fg: '#0c447c' } },
  { slug: 'book',          name: 'Book',           icon: 'ti-book-2',         color: { bg: '#f3edfe', fg: '#3c2c89' } },
  { slug: 'textbook',      name: 'Textbook',       icon: 'ti-school',         color: { bg: '#faeeda', fg: '#854f0b' } },
  { slug: 'handbook',      name: 'Handbook',       icon: 'ti-notebook',       color: { bg: '#e1f5ee', fg: '#085041' } },
  { slug: 'reference',     name: 'Reference Work', icon: 'ti-bookmarks',      color: { bg: '#fdf2ee', fg: '#8b2a16' } },
  { slug: 'whitepaper',    name: 'Whitepaper',     icon: 'ti-file-text',      color: { bg: '#f1efe8', fg: '#444441' } },
];

export const TYPE_LOOKUP: Record<string, ResourceType> = {};
RESOURCE_TYPES.forEach((t) => { TYPE_LOOKUP[t.slug] = t; });

// ============= STATUS =============
export const STATUS_LABELS: Record<string, { label: string; color: { bg: string; fg: string } }> = {
  to_read: { label: 'Okunacak',   color: { bg: '#f1efe8', fg: '#5f5e5a' } },
  reading: { label: 'Okuyorum',   color: { bg: '#faeeda', fg: '#854f0b' } },
  done:    { label: 'Bitti',      color: { bg: '#e1f5ee', fg: '#0f6e56' } },
};

// ============= DİLLER =============
export const LANGUAGES = [
  { code: 'TR', name: 'Türkçe' },
  { code: 'EN', name: 'İngilizce' },
  { code: 'FR', name: 'Fransızca' },
  { code: 'DE', name: 'Almanca' },
  { code: 'RU', name: 'Rusça' },
  { code: 'AR', name: 'Arapça' },
  { code: 'FA', name: 'Farsça' },
  { code: 'ZH', name: 'Çince' },
  { code: 'ES', name: 'İspanyolca' },
  { code: 'IT', name: 'İtalyanca' },
];
