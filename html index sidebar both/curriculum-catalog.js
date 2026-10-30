/**
 * Zenith O-Level • Smart Study Engine
 * Comprehensive Grade 6 to Grade 11 Curriculum & Subject Catalog
 * Sri Lanka National Curriculum (Junior Secondary & G.C.E. O/L)
 */

(function(global) {
  'use strict';

  // --- Grade Definitions ---
  const GRADES_CATALOG = [
    { grade: 6, labelEn: 'Grade 6', labelSi: '6 ශ්‍රේණිය', stage: 'Junior Secondary', color: '#0984e3' },
    { grade: 7, labelEn: 'Grade 7', labelSi: '7 ශ්‍රේණිය', stage: 'Junior Secondary', color: '#00cec9' },
    { grade: 8, labelEn: 'Grade 8', labelSi: '8 ශ්‍රේණිය', stage: 'Junior Secondary', color: '#00b894' },
    { grade: 9, labelEn: 'Grade 9', labelSi: '9 ශ්‍රේණිය', stage: 'Pre-O/Level', color: '#6c5ce7' },
    { grade: 10, labelEn: 'Grade 10 (O/L)', labelSi: '10 ශ්‍රේණිය (O/L)', stage: 'Senior Secondary', color: '#e84393' },
    { grade: 11, labelEn: 'Grade 11 (O/L Exam)', labelSi: '11 ශ්‍රේණිය (O/L විභාගය)', stage: 'O/Level Exam Year', color: '#d63031' }
  ];

  // --- Master Subject Dictionary ---
  const MASTER_SUBJECT_DICTIONARY = {
    // Core Common Subjects
    'MATH': { code: 'MATH', nameSi: 'ගණිතය', nameEn: 'Mathematics', color: '#0984e3', icon: '📐', category: 'core' },
    'SCI': { code: 'SCI', nameSi: 'විද්‍යාව', nameEn: 'Science', color: '#00b894', icon: '🔬', category: 'core' },
    'SIN': { code: 'SIN', nameSi: 'සිංහල භාෂාව හා සාහිත්‍යය', nameEn: 'Sinhala Language & Lit', color: '#e17055', icon: '📘', category: 'core' },
    'ENG': { code: 'ENG', nameSi: 'ඉංග්‍රීසි භාෂාව', nameEn: 'English Language', color: '#6c5ce7', icon: '🔤', category: 'core' },
    'BUD': { code: 'BUD', nameSi: 'බුද්ධ ධර්මය', nameEn: 'Buddhism', color: '#f39c12', icon: '☸️', category: 'core' },
    'HIST': { code: 'HIST', nameSi: 'ඉතිහාසය', nameEn: 'History', color: '#d35400', icon: '🏛️', category: 'core' },
    'GEO': { code: 'GEO', nameSi: 'භූගෝල විද්‍යාව', nameEn: 'Geography', color: '#27ae60', icon: '🌍', category: 'basket1' },
    'CIV': { code: 'CIV', nameSi: 'පුරවැසි අධ්‍යාපනය', nameEn: 'Civic Education', color: '#8e44ad', icon: '⚖️', category: 'basket1' },
    'HLTH': { code: 'HLTH', nameSi: 'සෞඛ්‍ය හා ශාරීරික අධ්‍යාපනය', nameEn: 'Health & PE', color: '#e84393', icon: '🏃‍♀️', category: 'core' },
    'ICT': { code: 'ICT', nameSi: 'තොරතුරු හා සන්නිවේදන තාක්ෂණය', nameEn: 'ICT', color: '#20bf6b', icon: '💻', category: 'basket3' },
    'TAM': { code: 'TAM', nameSi: 'දෙවන බස දෙමළ', nameEn: 'Tamil 2nd Language', color: '#00cec9', icon: '🗣️', category: 'basket1' },
    'PTS': { code: 'PTS', nameSi: 'ප්‍රායෝගික හා තාක්ෂණික කුසලතා', nameEn: 'Practical Skills (PTS)', color: '#636e72', icon: '🛠️', category: 'core' },
    'AES': { code: 'AES', nameSi: 'සෞන්දර්ය විෂයයන්', nameEn: 'Aesthetics', color: '#fd79a8', icon: '🎨', category: 'basket2' },

    // O-Level Basket 1: Social Science, Commerce & Languages
    'COM': { code: 'COM', nameSi: 'ව්‍යාපාර හා ගිණුම්කරණ අධ්‍යයනය', nameEn: 'Commerce & Accounting', color: '#2980b9', icon: '📊', category: 'basket1' },
    'ENT': { code: 'ENT', nameSi: 'ව්‍යවසායකත්ව අධ්‍යයනය', nameEn: 'Entrepreneurship Studies', color: '#e67e22', icon: '💡', category: 'basket1' },

    // O-Level Basket 2: Aesthetic Subjects
    'MUS': { code: 'MUS', nameSi: 'සංගීතය (පෙරදිග/අපරදිග)', nameEn: 'Music', color: '#9b59b6', icon: '🎵', category: 'basket2' },
    'ART': { code: 'ART', nameSi: 'චිත්‍ර කලාව', nameEn: 'Art', color: '#e056fd', icon: '🎨', category: 'basket2' },
    'DNC': { code: 'DNC', nameSi: 'නර්තනය', nameEn: 'Dancing', color: '#f0932b', icon: '💃', category: 'basket2' },
    'DRA': { code: 'DRA', nameSi: 'නාට්‍ය හා රංග කලාව', nameEn: 'Drama & Theatre', color: '#eb4d4b', icon: '🎭', category: 'basket2' },
    'LIT_E': { code: 'LIT_E', nameSi: 'ඉංග්‍රීසි සාහිත්‍යය', nameEn: 'English Literature', color: '#4834d4', icon: '📖', category: 'basket2' },
    'LIT_S': { code: 'LIT_S', nameSi: 'සිංහල සාහිත්‍යය (රසවින්දනය)', nameEn: 'Sinhala Literature', color: '#be2edd', icon: '📜', category: 'basket2' },

    // O-Level Basket 3: Technical & Applied Subjects
    'AGRI': { code: 'AGRI', nameSi: 'කෘෂිකර්මය හා ආහාර තාක්ෂණය', nameEn: 'Agriculture & Food Tech', color: '#6ab04c', icon: '🌱', category: 'basket3' },
    'HOME': { code: 'HOME', nameSi: 'ගෘහ ආර්ථික විද්‍යාව', nameEn: 'Home Science', color: '#ff7979', icon: '🍳', category: 'basket3' },
    'TECH': { code: 'TECH', nameSi: 'තාක්ෂණික විෂයයන් (Design & Mech)', nameEn: 'Design, Construction & Tech', color: '#535c68', icon: '⚙️', category: 'basket3' }
  };

  // --- Grade Specific Subject Configurations ---
  const DEFAULT_SUBJECTS_BY_GRADE = {
    // Grades 6 to 9 (13 Core Subjects)
    '6': ['MATH', 'SCI', 'SIN', 'ENG', 'BUD', 'HIST', 'GEO', 'CIV', 'HLTH', 'PTS', 'ICT', 'TAM', 'AES'],
    '7': ['MATH', 'SCI', 'SIN', 'ENG', 'BUD', 'HIST', 'GEO', 'CIV', 'HLTH', 'PTS', 'ICT', 'TAM', 'AES'],
    '8': ['MATH', 'SCI', 'SIN', 'ENG', 'BUD', 'HIST', 'GEO', 'CIV', 'HLTH', 'PTS', 'ICT', 'TAM', 'AES'],
    '9': ['MATH', 'SCI', 'SIN', 'ENG', 'BUD', 'HIST', 'GEO', 'CIV', 'HLTH', 'PTS', 'ICT', 'TAM', 'AES'],

    // Grades 10 and 11 (6 Core + Basket 1: Commerce/Geo + Basket 2: Art/Music + Basket 3: ICT/Agri)
    '10': ['MATH', 'SCI', 'SIN', 'ENG', 'BUD', 'HIST', 'COM', 'ART', 'ICT'],
    '11': ['MATH', 'SCI', 'SIN', 'ENG', 'BUD', 'HIST', 'COM', 'ART', 'ICT']
  };

  // --- Public Helper Methods ---
  function getGradeInfo(gradeNum) {
    const g = Number(gradeNum) || 9;
    return GRADES_CATALOG.find(item => item.grade === g) || GRADES_CATALOG[3];
  }

  function getActiveGrade() {
    try {
      const saved = localStorage.getItem('zenith_active_grade');
      if (saved && !isNaN(saved)) return Number(saved);
    } catch (_) {}
    return 9; // Sensible default
  }

  function setActiveGrade(gradeNum) {
    const g = Math.min(11, Math.max(6, Number(gradeNum) || 9));
    try {
      localStorage.setItem('zenith_active_grade', String(g));
    } catch (_) {}
    return g;
  }

  function getSubjectMetaByCode(code) {
    if (!code) return { code: 'UNKNOWN', nameSi: 'නොදනී', nameEn: 'Unknown', color: '#8c7ae6', icon: '📘', active: true };
    const upper = String(code).toUpperCase().trim();
    if (MASTER_SUBJECT_DICTIONARY[upper]) {
      return { ...MASTER_SUBJECT_DICTIONARY[upper], active: true };
    }
    return { code: upper, nameSi: upper, nameEn: upper, color: '#8c7ae6', icon: '📘', active: true, category: 'custom' };
  }

  function getDefaultSubjectsForGrade(gradeNum) {
    const gStr = String(gradeNum || getActiveGrade());
    const codes = DEFAULT_SUBJECTS_BY_GRADE[gStr] || DEFAULT_SUBJECTS_BY_GRADE['9'];
    return codes.map(code => getSubjectMetaByCode(code));
  }

  function getActiveSubjectsForUser(userId) {
    const currentGrade = getActiveGrade();
    const storageKey = userId ? `zenith_subjs_${userId}_g${currentGrade}` : `g9_subjects_config`;

    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter(s => s.active !== false).map(s => {
            const meta = getSubjectMetaByCode(s.code);
            return { ...meta, ...s, active: true };
          });
        }
      }
    } catch (e) {
      console.warn('Error reading active subjects config:', e);
    }

    return getDefaultSubjectsForGrade(currentGrade);
  }

  function saveActiveSubjectsForUser(userId, subjectsArray) {
    const currentGrade = getActiveGrade();
    const storageKey = userId ? `zenith_subjs_${userId}_g${currentGrade}` : `g9_subjects_config`;
    try {
      localStorage.setItem(storageKey, JSON.stringify(subjectsArray));
      localStorage.setItem('g9_subjects_config', JSON.stringify(subjectsArray)); // legacy sync
    } catch (_) {}
  }

  // Export to global scope
  global.ZenithCurriculum = {
    GRADES_CATALOG,
    MASTER_SUBJECT_DICTIONARY,
    DEFAULT_SUBJECTS_BY_GRADE,
    getGradeInfo,
    getActiveGrade,
    setActiveGrade,
    getSubjectMetaByCode,
    getDefaultSubjectsForGrade,
    getActiveSubjectsForUser,
    saveActiveSubjectsForUser
  };

})(typeof window !== 'undefined' ? window : this);
