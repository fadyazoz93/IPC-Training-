import React, {
  Fragment,
  useState,
  useEffect,
  useMemo,
  useCallback,
  createContext,
  useContext,
} from 'react';

// ============================================================================
// 1. TYPES & INTERFACES (الأنواع والواجهات البرمجية)
// ============================================================================

export type ReportView =
  | 'stats'
  | 'training'
  | 'history'
  | 'affidavits'
  | 'planView'
  | 'settings';

export interface Employee {
  ID?: string;
  Name: string;
  Job?: string;
  Category: string;
  [key: string]: any;
}

export interface TrainingLog {
  ID?: string | number;
  Date: string;
  Month?: string | number;
  Year?: string | number;
  Category: string;
  Policies: string;
  TraineeName: string;
  Trainer?: string;
  Timestamp?: string;
  [key: string]: any;
}

export interface TrainingPlanItem {
  id?: string | number;
  Month: string | number;
  Category: string;
  Policies: string;
  Year?: string | number;
  [key: string]: any;
}

export interface SettingItem {
  Type: string;
  Value: string;
  [key: string]: any;
}

export type DepartmentInput =
  | string
  | {
      id?: string | number;
      name?: string;
      value?: string;
      label?: string;
      Category?: string;
    };

export interface ReportData {
  employees: Employee[];
  logs: TrainingLog[];
  settings: SettingItem[];
  plan: TrainingPlanItem[];
  categories: string[];
}

export interface SessionDataProp {
  logs?: TrainingLog[];
  employees?: Employee[];
  departments?: DepartmentInput[];
  categories?: string[];
  plan?: TrainingPlanItem[];
  settings?: SettingItem[];
  hospitalName?: string;
  hospitalLogo?: string;
  hospitalLogoLeft?: string;
}

export interface SaveTrainingSessionPayload {
  date: string;
  category: string;
  policies: string[];
  trainees: string[];
  trainer: string;
}

export interface AddTraineesToSessionPayload {
  date: string;
  month?: string | number;
  year?: string | number;
  category: string;
  policies: string;
  trainer: string;
  trainees: string[];
  newEmployees: Employee[];
}

export interface UpdateSessionTrainerPayload {
  date: string;
  category: string;
  policies: string;
  oldTrainer: string;
  newTrainer: string;
  logIds: Array<string | number>;
}

export interface UpdateSessionPoliciesPayload {
  date: string;
  category: string;
  oldPolicies: string;
  newPolicies: string;
  trainer: string;
  logIds: Array<string | number>;
}

export interface DeleteTrainingSessionPayload {
  singleLogId?: string | number;
  date?: string;
  category?: string;
  policies?: string;
  trainer?: string;
  logIds?: Array<string | number>;
}

export interface SavePlanPayload {
  month: number | string;
  category: string;
  policies: string[] | string;
  year: number | string;
}

export interface FetchPlanFromGoogleSheetPayload {
  sheetId: string;
  targetYear: number | string;
}

export interface FetchedPlanResult {
  items: Array<{
    Month?: string | number;
    month?: string | number;
    Category?: string;
    category?: string;
    Policies?: string;
    policies?: string;
    Year?: string | number;
    year?: string | number;
  }>;
  source?: string;
  totalItems?: number;
}

export interface SaveImportedPlanPayload {
  items: FetchedPlanResult['items'];
  mode: string;
  targetYear: number | string;
  sheetId?: string;
}

export interface TursoCredentialsPayload {
  url: string;
  authToken: string;
}

export interface TursoPreviewData {
  employeesCount: number;
  logsCount: number;
  sessionsCount: number;
  planCount: number;
  settingsCount: number;
  detectedHospitalName?: string;
}

export interface ImportFromTursoPayload {
  url: string;
  authToken: string;
  importLogs: boolean;
  importEmployees: boolean;
  importPlan: boolean;
  importSettings: boolean;
  mode: 'merge' | 'replace' | string;
}

export interface ImportFromTursoResult {
  stats?: {
    employees?: number;
    logs?: number;
    plan?: number;
    settings?: number;
  };
}

export interface ReportPersistenceHandlers {
  onRefreshData?: (options?: { forceRefresh?: boolean }) => Promise<ReportData | void> | ReportData | void;
  onDataChange?: (updatedData: ReportData) => void;
  onSaveTrainingSession?: (payload: SaveTrainingSessionPayload) => Promise<ReportData | void> | ReportData | void;
  onAddTraineesToSession?: (payload: AddTraineesToSessionPayload) => Promise<ReportData | void> | ReportData | void;
  onUpdateSessionTrainer?: (payload: UpdateSessionTrainerPayload) => Promise<ReportData | void> | ReportData | void;
  onUpdateSessionPolicies?: (payload: UpdateSessionPoliciesPayload) => Promise<ReportData | void> | ReportData | void;
  onDeleteTrainingSession?: (payload: DeleteTrainingSessionPayload) => Promise<ReportData | void> | ReportData | void;
  onUpdateEmployeesBulk?: (employees: Employee[]) => Promise<ReportData | void> | ReportData | void;
  onDeleteEmployee?: (employeeId: string | number | undefined, employeeName: string) => Promise<ReportData | void> | ReportData | void;
  onSavePlan?: (payload: SavePlanPayload) => Promise<ReportData | void> | ReportData | void;
  onSavePlanBatch?: (items: SavePlanPayload[]) => Promise<ReportData | void> | ReportData | void;
  onFetchPlanFromGoogleSheet?: (payload: FetchPlanFromGoogleSheetPayload) => Promise<FetchedPlanResult>;
  onSaveImportedPlan?: (payload: SaveImportedPlanPayload) => Promise<ReportData | void> | ReportData | void;
  onSaveSettingsItem?: (type: string, value: string) => Promise<ReportData | void> | ReportData | void;
  onDeleteSettingsItem?: (type: string, value: string) => Promise<ReportData | void> | ReportData | void;
  onRenamePolicy?: (oldName: string, newName: string) => Promise<ReportData | void> | ReportData | void;
  onTestPreviousTursoDb?: (payload: TursoCredentialsPayload) => Promise<TursoPreviewData>;
  onImportFromPreviousTursoDb?: (payload: ImportFromTursoPayload) => Promise<ImportFromTursoResult>;
}

export interface ReportProps extends ReportPersistenceHandlers {
  sessionData?: SessionDataProp;
  logs?: TrainingLog[];
  employees?: Employee[];
  departments?: DepartmentInput[];
  categories?: string[];
  plan?: TrainingPlanItem[];
  settings?: SettingItem[];
  hospitalName?: string;
  hospitalLogo?: string;
  hospitalLogoLeft?: string;
  initialView?: ReportView;
  handlers?: ReportPersistenceHandlers;
}

// ============================================================================
// 2. CONSTANTS & SHARED HELPERS (الثوابت والدوال المساعدة)
// ============================================================================

const ARABIC_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

const DEFAULT_HOSPITAL_NAME = 'مستشفى المنيا الجامعى للعيون';

const normalizeDepartments = (
  departments?: DepartmentInput[],
  categories?: string[],
  settings?: SettingItem[],
  employees?: Employee[]
): string[] => {
  const result: string[] = [];
  const pushUnique = (val?: string) => {
    const clean = String(val || '').trim();
    if (clean && !result.includes(clean)) result.push(clean);
  };

  (departments || []).forEach((d) => {
    if (typeof d === 'string') pushUnique(d);
    else if (d) pushUnique(d.name || d.value || d.label || d.Category);
  });
  (categories || []).forEach((c) => pushUnique(c));
  (settings || [])
    .filter((s) => s.Type === 'Category')
    .forEach((s) => pushUnique(s.Value));
  (employees || []).forEach((e) => pushUnique(e.Category));

  return result;
};

const recomputeCategories = (
  settings: SettingItem[],
  employees: Employee[],
  externalCategories: string[] = []
): string[] => {
  const set = new Set<string>();
  externalCategories.forEach((c) => {
    const clean = String(c || '').trim();
    if (clean) set.add(clean);
  });
  settings
    .filter((s) => s.Type === 'Category')
    .forEach((s) => {
      const clean = String(s.Value || '').trim();
      if (clean) set.add(clean);
    });
  employees.forEach((e) => {
    const clean = String(e.Category || '').trim();
    if (clean) set.add(clean);
  });
  return Array.from(set);
};

const buildReportDataFromProps = (props: ReportProps): ReportData => {
  const sd = props.sessionData || {};
  const employees = props.employees ?? sd.employees ?? [];
  const logs = props.logs ?? sd.logs ?? [];
  const plan = props.plan ?? sd.plan ?? [];

  const baseSettings: SettingItem[] = [...(props.settings ?? sd.settings ?? [])];
  const upsertLocalSetting = (type: string, value?: string) => {
    if (value === undefined) return;
    const idx = baseSettings.findIndex((s) => s.Type === type);
    if (idx >= 0) baseSettings[idx] = { Type: type, Value: value };
    else baseSettings.push({ Type: type, Value: value });
  };

  upsertLocalSetting('Hospital_Name', props.hospitalName ?? sd.hospitalName);
  upsertLocalSetting('Hospital_Logo', props.hospitalLogo ?? sd.hospitalLogo);
  upsertLocalSetting(
    'Hospital_Logo_Left',
    props.hospitalLogoLeft ?? sd.hospitalLogoLeft
  );

  if (!baseSettings.some((s) => s.Type === 'Hospital_Name')) {
    baseSettings.push({ Type: 'Hospital_Name', Value: DEFAULT_HOSPITAL_NAME });
  }

  const categories = normalizeDepartments(
    props.departments ?? sd.departments,
    props.categories ?? sd.categories,
    baseSettings,
    employees
  );

  categories.forEach((c) => {
    if (!baseSettings.some((s) => s.Type === 'Category' && s.Value === c)) {
      baseSettings.push({ Type: 'Category', Value: c });
    }
  });

  return {
    employees,
    logs,
    settings: baseSettings,
    plan,
    categories,
  };
};

const parsePolicyDaysAndDates = (
  policyStr: string
): { base: string; days: number; dates: string[] } => {
  const s = String(policyStr || '').trim();
  const match = s.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (match) {
    const base = match[1].trim();
    const inside = match[2].trim();
    let days = 0;
    const dates: string[] = [];

    if (inside.includes('يومين') || inside.includes('يومان')) {
      days = 2;
    } else if (inside.includes('يوم')) {
      days = 1;
    }

    const parts = inside.split('|');
    if (parts.length > 1) {
      const dateStr = parts[1].trim();
      dateStr.split('،').forEach((d) => {
        const cleaned = d.trim();
        if (cleaned) dates.push(cleaned);
      });
    } else {
      const dateMatches = inside.match(/\d{4}-\d{2}-\d{2}/g);
      if (dateMatches) {
        dates.push(...dateMatches);
        if (days === 0) days = dateMatches.length;
      }
    }

    if (days > 0 || dates.length > 0) {
      return { base, days: days || dates.length, dates };
    }
  }
  return { base: s, days: 0, dates: [] };
};

const formatPolicyNameAndDates = (
  base: string,
  days: number,
  dates: string[] = []
): string => {
  const cleanDates = (dates || [])
    .filter((d) => d && d.trim() !== '')
    .slice(0, days);
  if (days === 1) {
    return cleanDates.length > 0
      ? `${base} (يوم | ${cleanDates[0]})`
      : `${base} (يوم)`;
  }
  if (days === 2) {
    return cleanDates.length > 0
      ? `${base} (يومين | ${cleanDates.join(' ، ')})`
      : `${base} (يومين)`;
  }
  return base;
};

const getPlanItem = (
  plan: TrainingPlanItem[],
  month: number | string,
  category: string,
  year: number | string
): TrainingPlanItem | undefined => {
  return plan.find(
    (p) =>
      String(p.Month) === String(month) &&
      String(p.Category || '').trim() === String(category || '').trim() &&
      String(p.Year || new Date().getFullYear()) === String(year)
  );
};

const splitPolicies = (str?: string): string[] => {
  if (!str) return [];
  const rawList = String(str)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const seen = new Map<string, string>();
  rawList.forEach((p) => {
    const base = parsePolicyDaysAndDates(p).base;
    if (!seen.has(base) || p.length > (seen.get(base)?.length || 0)) {
      seen.set(base, p);
    }
  });
  return Array.from(seen.values());
};

const getBasePolicyName = (p: string): string => parsePolicyDaysAndDates(p).base;

const formatGoogleDriveImageUrl = (url?: string): string => {
  if (!url) return '';
  let trimmed = String(url).trim();
  if (!trimmed) return '';
  if (trimmed.includes('drive.google.com') || trimmed.includes('docs.google.com')) {
    let fileId = '';
    const dMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
    const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (dMatch) fileId = dMatch[1];
    else if (idMatch) fileId = idMatch[1];
    if (fileId) return `https://lh3.googleusercontent.com/d/${fileId}`;
  }
  return trimmed;
};

const handleDriveImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
  const img = e.currentTarget;
  if (img.src.includes('lh3.googleusercontent.com/d/')) {
    const id = img.src.split('/d/')[1];
    if (id) img.src = `https://drive.google.com/thumbnail?id=${id}&sz=w800`;
  }
};

const exportHTMLToWord = (elementId: string, filename = 'document') => {
  const sourceElement = document.getElementById(elementId);
  if (!sourceElement) return;

  const clone = sourceElement.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('.no-print, button, input, select').forEach((el) => el.remove());

  clone.querySelectorAll('.print-only').forEach((el) => {
    const htmlEl = el as HTMLElement;
    htmlEl.classList.remove('print-only');
    if (htmlEl.tagName === 'TR') htmlEl.style.display = 'table-row';
    else if (htmlEl.tagName === 'THEAD') htmlEl.style.display = 'table-header-group';
    else if (htmlEl.tagName === 'TFOOT') htmlEl.style.display = 'table-footer-group';
    else htmlEl.style.display = 'block';
  });

  clone.querySelectorAll('.print-title-container').forEach((headerEl) => {
    const rightLogo = headerEl.querySelector('.print-logo-box-right img');
    const leftLogo = headerEl.querySelector('.print-logo-box-left img');
    const centerDiv = headerEl.querySelector('.print-header-center');
    const titleHtml = centerDiv ? centerDiv.innerHTML : headerEl.innerHTML;

    const rightImgHtml = rightLogo
      ? `<img src="${rightLogo.getAttribute('src')}" width="65" height="65" style="width: 65px; height: 65px; object-fit: contain;" />`
      : '';
    const leftImgHtml = leftLogo
      ? `<img src="${leftLogo.getAttribute('src')}" width="65" height="65" style="width: 65px; height: 65px; object-fit: contain;" />`
      : '';

    const tableHeader = document.createElement('table');
    tableHeader.setAttribute('border', '0');
    tableHeader.setAttribute('cellpadding', '0');
    tableHeader.setAttribute('cellspacing', '0');
    tableHeader.style.cssText =
      'width: 100%; border: none !important; border-bottom: 2px solid #000 !important; margin-bottom: 12px; direction: rtl;';
    tableHeader.innerHTML = `
      <tr>
        <td style="width: 80px; border: none !important; text-align: right; vertical-align: middle; padding: 4px;">${rightImgHtml}</td>
        <td style="border: none !important; text-align: center; vertical-align: middle; padding: 4px;">${titleHtml}</td>
        <td style="width: 80px; border: none !important; text-align: left; vertical-align: middle; padding: 4px;">${leftImgHtml}</td>
      </tr>
    `;
    if (headerEl.parentNode) headerEl.parentNode.replaceChild(tableHeader, headerEl);
  });

  clone.querySelectorAll('.print-header-row').forEach((row) => {
    row.querySelectorAll('th, td').forEach((cell) => {
      (cell as HTMLElement).style.border = 'none';
    });
  });

  clone.querySelectorAll('.session-print-block').forEach((el, idx) => {
    if (idx > 0) {
      const pageBreak = document.createElement('br');
      pageBreak.setAttribute('clear', 'all');
      pageBreak.style.pageBreakBefore = 'always';
      if (el.parentNode) el.parentNode.insertBefore(pageBreak, el);
    }
  });

  const htmlString = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40' dir="rtl">
    <head>
      <meta charset='utf-8'>
      <title>${filename}</title>
      <style>
        @page { size: A4; margin: 1.5cm; }
        body { font-family: 'Cairo', 'Arial', sans-serif; direction: rtl; text-align: right; color: #000; background: #fff; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 15px; direction: rtl; }
        th, td { border: 1px solid #000; padding: 6px 8px; text-align: center; font-size: 10pt; vertical-align: middle; }
        th { background-color: #f3f4f6; font-weight: bold; }
        .text-right, td.text-right { text-align: right !important; }
        .text-center { text-align: center !important; }
        .text-left { text-align: left !important; }
        .font-bold { font-weight: bold; }
        .print-footer { margin-top: 20px; text-align: center; font-size: 9pt; color: #555; border-top: 1px solid #ccc; padding-top: 8px; }
        .print-title-container { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 10px; }
        h1 { font-size: 16pt; margin: 4px 0; }
        h2 { font-size: 13pt; margin: 2px 0; color: #333; }
        h3 { font-size: 12pt; margin: 2px 0; }
        p { margin: 4px 0; }
        .session-meta { border: 1px solid #000; background-color: #f9fafb; padding: 10px; margin-bottom: 15px; }
        .flex { display: block; margin-bottom: 4px; }
        .justify-between { width: 100%; }
      </style>
    </head>
    <body>
      ${clone.innerHTML}
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', htmlString], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const formatDatesArabic = (dates: string[]): string => {
  if (!dates || dates.length === 0) return '';
  return dates
    .map((d) => {
      const p = d.split('-');
      if (p.length === 3) return `${p[2]}/${p[1]}/${p[0]}`;
      return d;
    })
    .join(' و ');
};

const getMonthYearOptions = () => {
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];
  const options: Array<{ value: string; label: string }> = [];
  years.forEach((y) => {
    ARABIC_MONTHS.forEach((mName, idx) => {
      const mNum = idx + 1;
      options.push({
        value: `${y}-${String(mNum).padStart(2, '0')}`,
        label: `${mName} ${y}`,
      });
    });
  });
  return options;
};

const parseFlexibleDate = (dateVal: any): Date | null => {
  if (!dateVal) return null;
  if (dateVal instanceof Date) {
    return isNaN(dateVal.getTime()) ? null : dateVal;
  }
  const s = String(dateVal).trim();
  const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const dt = new Date(
      parseInt(isoMatch[1], 10),
      parseInt(isoMatch[2], 10) - 1,
      parseInt(isoMatch[3], 10)
    );
    return isNaN(dt.getTime()) ? null : dt;
  }
  const slashMatch = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (slashMatch) {
    const dt = new Date(
      parseInt(slashMatch[1], 10),
      parseInt(slashMatch[2], 10) - 1,
      parseInt(slashMatch[3], 10)
    );
    return isNaN(dt.getTime()) ? null : dt;
  }
  const dmyMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmyMatch) {
    const dt = new Date(
      parseInt(dmyMatch[3], 10),
      parseInt(dmyMatch[2], 10) - 1,
      parseInt(dmyMatch[1], 10)
    );
    return isNaN(dt.getTime()) ? null : dt;
  }
  const parsed = new Date(s);
  return isNaN(parsed.getTime()) ? null : parsed;
};

const parseDateToTime = (dateVal: any): number => {
  const dt = parseFlexibleDate(dateVal);
  return dt ? dt.getTime() : 0;
};

const formatLogDate = (dateVal: any): string => {
  if (!dateVal) return '';
  const dt = parseFlexibleDate(dateVal);
  if (!dt) return String(dateVal);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatLogDateWithWeekday = (dateVal: any): string => {
  if (!dateVal) return '';
  const dt = parseFlexibleDate(dateVal);
  if (!dt) return String(dateVal);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  const formattedDate = `${y}-${m}-${d}`;
  const weekdays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const dayName = weekdays[dt.getDay()];
  return dayName ? `${dayName}، ${formattedDate}` : formattedDate;
};

const extractPlanFromLogs = (logs: TrainingLog[], targetYear: number | string) => {
  const yrNum = parseInt(String(targetYear), 10);
  const grouped = new Map<string, Map<string, Set<string>>>();
  let matchingLogsCount = 0;

  (logs || []).forEach((log) => {
    const rawDate = String(log.Date || '').trim();
    const datePart = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate;

    let logYear = log.Year ? parseInt(String(log.Year), 10) : NaN;
    let logMonth = log.Month ? parseInt(String(log.Month), 10) : NaN;

    if (datePart && /^\d{4}-\d{1,2}-\d{1,2}/.test(datePart)) {
      const parts = datePart.split('-');
      if (isNaN(logYear)) logYear = parseInt(parts[0], 10);
      if (isNaN(logMonth)) logMonth = parseInt(parts[1], 10);
    }

    if (logYear !== yrNum || !logMonth || logMonth < 1 || logMonth > 12) return;

    const category = String(log.Category || '').trim();
    if (!category) return;

    matchingLogsCount++;
    const key = `${logMonth}___${category}`;
    if (!grouped.has(key)) grouped.set(key, new Map());
    const policyMap = grouped.get(key)!;

    const polList = splitPolicies(log.Policies);
    polList.forEach((pStr) => {
      const { base } = parsePolicyDaysAndDates(pStr);
      if (!base) return;
      if (!policyMap.has(base)) policyMap.set(base, new Set());
      if (datePart && /^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
        policyMap.get(base)!.add(datePart);
      }
    });
  });

  const items: Array<{
    year: number;
    month: number;
    category: string;
    policies: string[];
  }> = [];
  const uniqueCategories = new Set<string>();
  const uniqueMonths = new Set<number>();
  let totalUniquePolicies = 0;

  grouped.forEach((policyMap, key) => {
    const [mStr, cat] = key.split('___');
    const monthNum = parseInt(mStr, 10);
    uniqueMonths.add(monthNum);
    uniqueCategories.add(cat);

    const formattedPolicies: string[] = [];
    policyMap.forEach((datesSet, base) => {
      totalUniquePolicies++;
      const sortedDates = Array.from(datesSet).sort();
      if (sortedDates.length === 1) {
        formattedPolicies.push(formatPolicyNameAndDates(base, 1, sortedDates));
      } else if (sortedDates.length >= 2) {
        const pickedDates = [sortedDates[0], sortedDates[sortedDates.length - 1]];
        formattedPolicies.push(formatPolicyNameAndDates(base, 2, pickedDates));
      } else {
        formattedPolicies.push(base);
      }
    });

    items.push({
      year: yrNum,
      month: monthNum,
      category: cat,
      policies: formattedPolicies,
    });
  });

  items.sort((a, b) => a.month - b.month || a.category.localeCompare(b.category));

  return {
    items,
    stats: {
      totalLogs: matchingLogsCount,
      monthsCount: uniqueMonths.size,
      categoriesCount: uniqueCategories.size,
      policiesCount: totalUniquePolicies,
    },
  };
};

// ============================================================================
// 3. DECOUPLED PERSISTENCE & SAVE ADAPTERS (دوال الحفظ والربط المفصولة)
// ============================================================================

const makeId = () => Math.random().toString(36).substring(2, 11);

const saveTrainingSessionAction = async (
  currentData: ReportData,
  payload: SaveTrainingSessionPayload,
  handler?: ReportPersistenceHandlers['onSaveTrainingSession']
): Promise<ReportData> => {
  if (handler) {
    const res = await handler(payload);
    if (res) return res;
  }
  const dt = new Date(payload.date);
  const month = isNaN(dt.getTime()) ? new Date().getMonth() + 1 : dt.getMonth() + 1;
  const year = isNaN(dt.getTime()) ? new Date().getFullYear() : dt.getFullYear();
  const policiesStr = payload.policies.join(', ');
  const timestamp = new Date().toISOString();

  const newLogs: TrainingLog[] = payload.trainees.map((traineeName) => ({
    ID: makeId(),
    Date: payload.date,
    Month: String(month),
    Year: String(year),
    Category: payload.category,
    Policies: policiesStr,
    TraineeName: traineeName,
    Trainer: payload.trainer,
    Timestamp: timestamp,
  }));

  return { ...currentData, logs: [...currentData.logs, ...newLogs] };
};

const addTraineesToSessionAction = async (
  currentData: ReportData,
  payload: AddTraineesToSessionPayload,
  handler?: ReportPersistenceHandlers['onAddTraineesToSession']
): Promise<ReportData> => {
  if (handler) {
    const res = await handler(payload);
    if (res) return res;
  }
  const updatedEmployees = [...currentData.employees];
  (payload.newEmployees || []).forEach((emp) => {
    const name = String(emp.Name || '').trim();
    if (name && !updatedEmployees.some((e) => String(e.Name || '').trim() === name)) {
      updatedEmployees.push({
        ID: emp.ID || makeId(),
        Name: name,
        Job: emp.Job || 'موظف',
        Category: emp.Category || payload.category,
      });
    }
  });

  const timestamp = new Date().toISOString();
  const newLogs: TrainingLog[] = (payload.trainees || []).map((tName) => ({
    ID: makeId(),
    Date: payload.date,
    Month: payload.month,
    Year: payload.year,
    Category: payload.category,
    Policies: payload.policies,
    TraineeName: tName,
    Trainer: payload.trainer,
    Timestamp: timestamp,
  }));

  return {
    ...currentData,
    employees: updatedEmployees,
    logs: [...currentData.logs, ...newLogs],
    categories: recomputeCategories(
      currentData.settings,
      updatedEmployees,
      currentData.categories
    ),
  };
};

const updateSessionTrainerAction = async (
  currentData: ReportData,
  payload: UpdateSessionTrainerPayload,
  handler?: ReportPersistenceHandlers['onUpdateSessionTrainer']
): Promise<ReportData> => {
  if (handler) {
    const res = await handler(payload);
    if (res) return res;
  }
  const idSet = new Set((payload.logIds || []).map(String));
  const nextLogs = currentData.logs.map((l) => {
    const matchById = l.ID !== undefined && idSet.has(String(l.ID));
    const matchByFields =
      formatLogDate(l.Date) === formatLogDate(payload.date) &&
      String(l.Category || '') === String(payload.category || '') &&
      String(l.Policies || '') === String(payload.policies || '') &&
      String(l.Trainer || '') === String(payload.oldTrainer || '');
    if (matchById || matchByFields) {
      return { ...l, Trainer: payload.newTrainer };
    }
    return l;
  });
  return { ...currentData, logs: nextLogs };
};

const updateSessionPoliciesAction = async (
  currentData: ReportData,
  payload: UpdateSessionPoliciesPayload,
  handler?: ReportPersistenceHandlers['onUpdateSessionPolicies']
): Promise<ReportData> => {
  if (handler) {
    const res = await handler(payload);
    if (res) return res;
  }
  const idSet = new Set((payload.logIds || []).map(String));
  const nextLogs = currentData.logs.map((l) => {
    const matchById = l.ID !== undefined && idSet.has(String(l.ID));
    const matchByFields =
      formatLogDate(l.Date) === formatLogDate(payload.date) &&
      String(l.Category || '') === String(payload.category || '') &&
      String(l.Policies || '') === String(payload.oldPolicies || '') &&
      String(l.Trainer || '') === String(payload.trainer || '');
    if (matchById || matchByFields) {
      return { ...l, Policies: payload.newPolicies };
    }
    return l;
  });
  return { ...currentData, logs: nextLogs };
};

const deleteTrainingSessionAction = async (
  currentData: ReportData,
  payload: DeleteTrainingSessionPayload,
  handler?: ReportPersistenceHandlers['onDeleteTrainingSession']
): Promise<ReportData> => {
  if (handler) {
    const res = await handler(payload);
    if (res) return res;
  }
  if (payload.singleLogId !== undefined) {
    return {
      ...currentData,
      logs: currentData.logs.filter((l) => String(l.ID) !== String(payload.singleLogId)),
    };
  }
  const idSet = new Set((payload.logIds || []).map(String));
  const nextLogs = currentData.logs.filter((l) => {
    if (l.ID !== undefined && idSet.has(String(l.ID))) return false;
    const matchByFields =
      formatLogDate(l.Date) === formatLogDate(payload.date) &&
      String(l.Category || '') === String(payload.category || '') &&
      String(l.Policies || '') === String(payload.policies || '') &&
      String(l.Trainer || '') === String(payload.trainer || '');
    return !matchByFields;
  });
  return { ...currentData, logs: nextLogs };
};

const updateEmployeesBulkAction = async (
  currentData: ReportData,
  employees: Employee[],
  handler?: ReportPersistenceHandlers['onUpdateEmployeesBulk']
): Promise<ReportData> => {
  if (handler) {
    const res = await handler(employees);
    if (res) return res;
  }
  return {
    ...currentData,
    employees,
    categories: recomputeCategories(currentData.settings, employees, currentData.categories),
  };
};

const deleteEmployeeAction = async (
  currentData: ReportData,
  employeeId: string | number | undefined,
  employeeName: string,
  handler?: ReportPersistenceHandlers['onDeleteEmployee']
): Promise<ReportData> => {
  if (handler) {
    const res = await handler(employeeId, employeeName);
    if (res) return res;
  }
  const cleanName = String(employeeName || '').trim();
  const nextEmployees = currentData.employees.filter(
    (e) =>
      !(
        (employeeId && e.ID === employeeId) ||
        String(e.Name || '').trim() === cleanName
      )
  );
  const nextLogs = currentData.logs.filter(
    (l) => String(l.TraineeName || '').trim() !== cleanName
  );
  return {
    ...currentData,
    employees: nextEmployees,
    logs: nextLogs,
    categories: recomputeCategories(
      currentData.settings,
      nextEmployees,
      currentData.categories
    ),
  };
};

const savePlanAction = async (
  currentData: ReportData,
  payload: SavePlanPayload,
  handler?: ReportPersistenceHandlers['onSavePlan']
): Promise<ReportData> => {
  if (handler) {
    const res = await handler(payload);
    if (res) return res;
  }
  const polStr = Array.isArray(payload.policies)
    ? payload.policies.join(', ')
    : String(payload.policies || '');
  const nextPlan = [...currentData.plan];
  const idx = nextPlan.findIndex(
    (p) =>
      String(p.Month) === String(payload.month) &&
      String(p.Category || '').trim() === String(payload.category || '').trim() &&
      String(p.Year || new Date().getFullYear()) === String(payload.year)
  );
  if (idx >= 0) {
    nextPlan[idx] = { ...nextPlan[idx], Policies: polStr };
  } else {
    nextPlan.push({
      id: makeId(),
      Month: String(payload.month),
      Category: payload.category,
      Policies: polStr,
      Year: String(payload.year),
    });
  }
  return { ...currentData, plan: nextPlan };
};

const savePlanBatchAction = async (
  currentData: ReportData,
  items: SavePlanPayload[],
  handler?: ReportPersistenceHandlers['onSavePlanBatch']
): Promise<ReportData> => {
  if (handler) {
    const res = await handler(items);
    if (res) return res;
  }
  let nextData = currentData;
  for (const item of items) {
    nextData = await savePlanAction(nextData, item);
  }
  return nextData;
};

const saveImportedPlanAction = async (
  currentData: ReportData,
  payload: SaveImportedPlanPayload,
  handler?: ReportPersistenceHandlers['onSaveImportedPlan']
): Promise<ReportData> => {
  if (handler) {
    const res = await handler(payload);
    if (res) return res;
  }
  const targetYr = String(payload.targetYear);
  let nextPlan =
    payload.mode === 'replace_year'
      ? currentData.plan.filter(
          (p) => String(p.Year || new Date().getFullYear()) !== targetYr
        )
      : [...currentData.plan];

  const formattedItems: SavePlanPayload[] = (payload.items || [])
    .map((it) => ({
      month: parseInt(String(it.Month || it.month), 10),
      category: String(it.Category || it.category || '').trim(),
      policies: it.Policies || it.policies || '',
      year: String(it.Year || it.year || targetYr).trim(),
    }))
    .filter((it) => it.month >= 1 && it.month <= 12 && it.category);

  let nextData: ReportData = { ...currentData, plan: nextPlan };
  for (const item of formattedItems) {
    if (payload.mode === 'merge') {
      const existing = getPlanItem(nextData.plan, item.month, item.category, item.year);
      if (existing && existing.Policies) {
        const merged = Array.from(
          new Set([...splitPolicies(existing.Policies), ...splitPolicies(String(item.policies))])
        );
        nextData = await savePlanAction(nextData, { ...item, policies: merged });
        continue;
      }
    }
    nextData = await savePlanAction(nextData, item);
  }

  if (payload.sheetId && payload.sheetId.trim()) {
    nextData = await saveSettingsItemAction(
      nextData,
      'Google_Sheet_ID',
      payload.sheetId.trim()
    );
  }
  return nextData;
};

const SINGLETON_SETTINGS = new Set([
  'Hospital_Name',
  'Hospital_Logo',
  'Hospital_Logo_Left',
  'IC_Manager_Title',
  'IC_Manager_Name',
  'Hospital_Manager_Title',
  'Hospital_Manager_Name',
  'Google_Sheet_ID',
]);

const saveSettingsItemAction = async (
  currentData: ReportData,
  type: string,
  value: string,
  handler?: ReportPersistenceHandlers['onSaveSettingsItem']
): Promise<ReportData> => {
  if (handler) {
    const res = await handler(type, value);
    if (res) return res;
  }
  let nextSettings = [...currentData.settings];
  if (SINGLETON_SETTINGS.has(type)) {
    nextSettings = nextSettings.filter((s) => s.Type !== type);
    nextSettings.push({ Type: type, Value: value });
  } else {
    const exists = nextSettings.some((s) => s.Type === type && s.Value === value);
    if (!exists) nextSettings.push({ Type: type, Value: value });
  }
  return {
    ...currentData,
    settings: nextSettings,
    categories: recomputeCategories(
      nextSettings,
      currentData.employees,
      currentData.categories
    ),
  };
};

const deleteSettingsItemAction = async (
  currentData: ReportData,
  type: string,
  value: string,
  handler?: ReportPersistenceHandlers['onDeleteSettingsItem']
): Promise<ReportData> => {
  if (handler) {
    const res = await handler(type, value);
    if (res) return res;
  }
  const nextSettings = currentData.settings.filter(
    (s) => !(s.Type === type && s.Value === value)
  );
  const nextExternalCats =
    type === 'Category'
      ? currentData.categories.filter((c) => c !== value)
      : currentData.categories;
  return {
    ...currentData,
    settings: nextSettings,
    categories: recomputeCategories(nextSettings, currentData.employees, nextExternalCats),
  };
};

const renamePolicyAction = async (
  currentData: ReportData,
  oldName: string,
  newName: string,
  handler?: ReportPersistenceHandlers['onRenamePolicy']
): Promise<ReportData> => {
  if (handler) {
    const res = await handler(oldName, newName);
    if (res) return res;
  }
  const replaceInPoliciesStr = (str?: string) => {
    if (!str) return str || '';
    return splitPolicies(str)
      .map((p) => {
        const parsed = parsePolicyDaysAndDates(p);
        if (parsed.base === oldName) {
          return formatPolicyNameAndDates(newName, parsed.days, parsed.dates);
        }
        return p;
      })
      .join(', ');
  };

  return {
    ...currentData,
    settings: currentData.settings.map((s) =>
      s.Type === 'Policy' && s.Value === oldName ? { ...s, Value: newName } : s
    ),
    plan: currentData.plan.map((p) => ({
      ...p,
      Policies: replaceInPoliciesStr(p.Policies),
    })),
    logs: currentData.logs.map((l) => ({
      ...l,
      Policies: replaceInPoliciesStr(l.Policies),
    })),
  };
};

// ============================================================================
// 4. STYLES, TOAST CONTEXT, ICONS & SHARED PRINT COMPONENTS
// ============================================================================

const ReportStyles: React.FC = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap');

    :root {
      --primary: #4f46e5;
      --primary-dark: #4338ca;
      --bg-body: #f8fafc;
      --bg-card: #ffffff;
    }

    .report-root {
      font-family: 'Cairo', sans-serif;
      background-color: var(--bg-body);
      color: #1e293b;
      -webkit-font-smoothing: antialiased;
    }

    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

    .fade-in { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

    .slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

    .glass {
      background: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.3);
    }

    .input-base {
      width: 100%;
      background-color: #ffffff;
      border: 1px solid #e2e8f0;
      color: #334155;
      font-weight: 500;
      border-radius: 0.75rem;
      padding: 0.75rem 1rem;
      outline: none;
      transition: all 0.2s;
    }
    .input-base:focus {
      border-color: #6366f1;
      box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    }

    .btn-primary {
      background: linear-gradient(to bottom right, #4f46e5, #2563eb);
      color: #ffffff;
      box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.3);
      transition: all 0.2s;
      border-radius: 0.75rem;
      font-weight: 700;
      padding: 0.75rem 1.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      position: relative;
      overflow: hidden;
    }
    .btn-primary:hover:not(:disabled) {
      background: linear-gradient(to bottom right, #4338ca, #1d4ed8);
    }
    .btn-primary:active:not(:disabled) {
      transform: scale(0.98);
    }
    .btn-primary:disabled {
      opacity: 0.7;
      cursor: not-allowed;
      box-shadow: none;
      filter: grayscale(100%);
    }
    .btn-primary::after {
      content: '';
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      background: linear-gradient(to bottom, rgba(255, 255, 255, 0.1), transparent);
      pointer-events: none;
    }

    .btn-secondary {
      background-color: #ffffff;
      color: #475569;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      transition: all 0.2s;
      border-radius: 0.75rem;
      font-weight: 700;
      padding: 0.625rem 1.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }
    .btn-secondary:hover {
      background-color: #f8fafc;
      border-color: #cbd5e1;
      color: #1e293b;
    }
    .btn-secondary:active {
      transform: scale(0.98);
    }

    .card {
      background-color: #ffffff;
      border-radius: 1.5rem;
      box-shadow: 0 8px 30px rgb(0, 0, 0, 0.04);
      border: 1px solid #f1f5f9;
      overflow: hidden;
      transition: all 0.3s;
    }
    .card:hover {
      box-shadow: 0 8px 30px rgb(0, 0, 0, 0.08);
      transform: translateY(-0.25rem);
    }

    .tag-select {
      cursor: pointer;
      user-select: none;
      transition: all 0.2s;
      border: 1px solid;
      border-radius: 0.75rem;
      padding: 0.75rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .tag-select.selected {
      background-color: #eef2ff;
      border-color: #c7d2fe;
      color: #4338ca;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      outline: 1px solid #c7d2fe;
    }
    .tag-select.unselected {
      background-color: #ffffff;
      border-color: #f1f5f9;
      color: #64748b;
    }
    .tag-select.unselected:hover {
      border-color: #cbd5e1;
      background-color: #f8fafc;
    }

    @media (min-width: 1024px) {
      .app-container { display: flex; height: 100vh; overflow: hidden; }
      .sidebar { width: 280px; flex-shrink: 0; background: white; border-left: 1px solid #e2e8f0; display: flex; flex-direction: column; z-index: 20; }
      .main-content { flex: 1; overflow-y: auto; overflow-x: hidden; position: relative; background-color: #f8fafc; }
    }

    @media print {
      @page { size: landscape; margin: 0; }
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
        transform: none !important;
      }
      html, body {
        width: 100%;
        height: auto !important;
        margin: 0 !important;
        padding: 0 !important;
        background: white !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      #root, .app-container, .main-content {
        display: block !important; width: 100% !important; margin: 0 !important; padding: 0 !important; overflow: visible !important;
      }
      .main-content > div {
        height: auto !important; overflow: visible !important; display: block !important; padding: 0 !important; margin: 0 !important;
      }
      .normal-print-content { padding: 10mm !important; padding-bottom: 0 !important; margin-bottom: 0 !important; }
      .normal-print-content > *:last-child { margin-bottom: 0 !important; }
      .bg-gradient-to-br, [class*="bg-gradient-"] {
        background: white !important; border: 2px solid #000 !important; color: black !important; box-shadow: none !important;
      }
      .text-white { color: black !important; }
      .card {
        box-shadow: none !important; border: none !important; padding: 0 !important; margin: 0 !important;
        break-inside: auto !important; background: white !important; display: block !important; overflow: visible !important;
      }
      .sidebar, .no-print, header button, .fixed-bottom, #initial-loader, .tab-nav, .floating-btn, .app-container > aside, .card.no-print {
        display: none !important;
      }
      .print-only { display: block !important; width: 100%; }
      tr.print-only { display: table-row !important; }

      body.print-mode-certificates { font-size: 12pt !important; width: 100% !important; margin: 0 !important; padding: 0 !important; background: white !important; }
      body.print-mode-certificates .card,
      body.print-mode-certificates .print-table,
      body.print-mode-certificates .print-header-row,
      body.print-mode-certificates header,
      body.print-mode-certificates .no-print,
      body.print-mode-certificates .normal-print-content,
      body.print-mode-certificates .print-only:not(.certificate-print-content *) {
        display: none !important;
      }
      body.print-mode-combined .certificate-print-content { display: block !important; margin: 0 !important; padding: 0 !important; }
      body.print-mode-combined .certificate-print-content > .certificate-page:first-child {
        page-break-before: always; break-before: page;
      }
      body.print-mode-certificates #root,
      body.print-mode-certificates .app-container,
      body.print-mode-certificates .main-content,
      body.print-mode-certificates .main-content > div,
      body.print-mode-certificates .main-content > div > div {
        margin: 0 !important; padding: 0 !important; width: 100% !important; overflow: visible !important;
      }
      body.print-mode-certificates .certificate-print-content {
        display: block !important; page-break-before: auto !important; break-before: auto !important; margin: 0 !important; padding: 0 !important;
      }

      .certificate-page {
        position: relative !important; width: 100% !important; max-width: 100% !important;
        height: 265mm !important; max-height: 268mm !important; margin: 0 auto !important; padding: 12mm 15mm !important;
        box-sizing: border-box !important; display: flex !important; flex-direction: column !important;
        justify-content: space-between !important; align-items: stretch !important;
        border: 3px double #0f172a !important; border-radius: 6px !important;
        page-break-after: always !important; break-after: page !important;
        page-break-inside: avoid !important; break-inside: avoid !important;
        overflow: hidden !important; background: white !important;
      }
      .certificate-print-content > .certificate-page:last-child {
        page-break-after: auto !important; break-after: auto !important; margin-bottom: 0 !important;
      }
      .certificate-header {
        position: relative !important; flex-shrink: 0 !important; text-align: center !important;
        border-bottom: 2px solid #0f172a !important; padding-bottom: 4mm !important; margin-bottom: 4mm !important; min-height: 75px !important;
      }
      .certificate-logo-box {
        position: absolute !important; top: 0 !important; border: none !important; border-radius: 0 !important; padding: 0 !important;
        width: 65px !important; height: 65px !important; display: flex !important; align-items: center !important;
        justify-content: center !important; background: transparent !important; box-sizing: border-box !important; overflow: hidden !important;
      }
      .certificate-logo-box-right { right: 0 !important; }
      .certificate-logo-box-left { left: 0 !important; }
      .certificate-logo-img {
        max-width: 100% !important; max-height: 100% !important; width: auto !important; height: auto !important;
        object-fit: contain !important; display: block !important; border: none !important; outline: none !important; box-shadow: none !important;
      }
      .certificate-header-center { width: 100% !important; box-sizing: border-box !important; }
      .certificate-header-center.pad-both { padding: 0 75px !important; }
      .certificate-header-center.pad-right { padding-right: 75px !important; padding-left: 10px !important; }
      .certificate-header-center.pad-left { padding-left: 75px !important; padding-right: 10px !important; }
      .certificate-header .hospital-title { font-size: 16pt !important; font-weight: 800 !important; line-height: 1.5 !important; color: #0f172a !important; margin-bottom: 2mm !important; }
      .certificate-header h1 { font-size: 26pt !important; font-weight: 900 !important; margin-top: 2mm !important; margin-bottom: 1mm !important; text-decoration: underline !important; text-underline-offset: 8px !important; text-align: center !important; color: #0f172a !important; letter-spacing: 1px !important; }
      .certificate-body { flex: 1 1 auto !important; display: flex !important; flex-direction: column !important; justify-content: center !important; font-size: 15pt !important; line-height: 1.7 !important; text-align: center !important; padding: 2mm 0 !important; margin: 0 !important; color: #0f172a !important; }
      .certificate-body p { margin: 2mm 0 !important; padding: 0 !important; }
      .certificate-body .intro-line { font-size: 15pt !important; font-weight: 700 !important; color: #1e293b !important; }
      .certificate-body .trainee-highlight { margin: 4mm 0 !important; padding: 3mm 4mm !important; background: #f8fafc !important; border-top: 1px solid #cbd5e1 !important; border-bottom: 1px solid #cbd5e1 !important; border-radius: 4px !important; }
      .certificate-body .trainee-name-line { font-size: 22pt !important; font-weight: 900 !important; color: #0f172a !important; margin: 0 0 1.5mm 0 !important; line-height: 1.3 !important; }
      .certificate-body .trainee-job-line { font-size: 13pt !important; font-weight: 700 !important; color: #475569 !important; margin: 0 !important; }
      .certificate-body .policy-intro-line { font-size: 15pt !important; font-weight: 800 !important; color: #0f172a !important; margin: 3mm 0 2mm 0 !important; }
      .policy-list-container { margin: 3mm auto !important; width: 100% !important; background: #ffffff !important; border: 1px solid #cbd5e1 !important; border-radius: 6px !important; padding: 3mm 8mm !important; box-sizing: border-box !important; }
      .policy-list { list-style-type: decimal !important; margin: 0 !important; padding-right: 25px !important; padding-left: 10px !important; column-count: 2 !important; column-gap: 30px !important; text-align: right !important; direction: rtl !important; }
      .policy-list li { margin-bottom: 1.5mm !important; font-size: 12pt !important; font-weight: 700 !important; line-height: 1.5 !important; color: #1e293b !important; break-inside: avoid !important; page-break-inside: avoid !important; }
      .certificate-body .certificate-conclusion { font-size: 13.5pt !important; line-height: 1.6 !important; color: #334155 !important; margin-top: 4mm !important; font-weight: 600 !important; }
      .certificate-body .certificate-statement { font-size: 15pt !important; font-weight: 900 !important; color: #0f172a !important; margin-top: 2.5mm !important; }
      .certificate-footer { flex-shrink: 0 !important; display: flex !important; justify-content: space-between !important; align-items: flex-start !important; font-weight: bold !important; font-size: 14pt !important; padding: 4mm 10mm 6mm 10mm !important; margin-top: 4mm !important; border-top: 2px solid #0f172a !important; }
      .certificate-footer .sig-block { text-align: center !important; min-width: 160px !important; }
      .certificate-footer .sig-title { font-size: 14pt !important; font-weight: 900 !important; color: #0f172a !important; margin-bottom: 3mm !important; line-height: 1.4 !important; }
      .certificate-footer .sig-name { font-size: 14pt !important; font-weight: 800 !important; color: #1e293b !important; margin: 0 !important; line-height: 1.4 !important; }

      .print-table { width: 100%; border-collapse: collapse; border: 2px solid #000; font-size: 10pt; direction: rtl; margin-top: 10px; }
      .print-table th, .print-table td { border: 1px solid #000; padding: 6px; text-align: center !important; color: #000 !important; vertical-align: middle; }
      .print-table th { background-color: #f0f0f0 !important; font-weight: 900; white-space: nowrap; border-bottom: 2px solid #000; }
      .print-table td { white-space: normal !important; overflow: visible !important; }
      thead { display: table-header-group !important; }
      .print-no-repeat-header { display: table-row-group !important; }
      tfoot { display: table-footer-group !important; }
      tr { break-inside: avoid; page-break-inside: avoid; }
      .print-header-row { display: table-row !important; border: none !important; }
      .print-header-cell { border: none !important; padding-bottom: 20px !important; background-color: white !important; }
      .print-title-container { position: relative; text-align: center; border-bottom: 3px double #000; padding-bottom: 10px; margin-bottom: 15px; width: 100%; display: block; min-height: 70px; }
      .print-logo-box { position: absolute; top: 0; border: none; border-radius: 0; padding: 0; width: 65px; height: 65px; display: flex; align-items: center; justify-content: center; background: transparent; box-sizing: border-box; overflow: hidden; }
      .print-logo-box-right { right: 0; }
      .print-logo-box-left { left: 0; }
      .print-logo-img { max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain; display: block; border: none; outline: none; box-shadow: none; }
      .print-header-center { width: 100%; box-sizing: border-box; }
      .print-header-center.pad-both { padding: 0 75px; }
      .print-header-center.pad-right { padding-right: 75px; padding-left: 10px; }
      .print-header-center.pad-left { padding-left: 75px; padding-right: 10px; }
      .print-header-center.no-logo-padding { padding: 0 10px; }
      .print-footer-cell { border: none !important; padding-top: 10px !important; }
      .print-footer { display: flex; justify-content: space-between; font-size: 8pt; color: #555; width: 100%; border-top: 1px solid #000; padding-top: 5px; }
      .print-trainee-name { font-size: 12pt !important; font-weight: bold !important; color: #000 !important; }
      .print-only > div:last-child { page-break-after: avoid !important; break-after: avoid !important; margin-bottom: 0 !important; }
    }

    .print-only, .print-footer, .certificate-print-content { display: none; }
  `}</style>
);

type ToastType = 'success' | 'error';
type ShowToastFn = (message: string, type?: ToastType) => void;

const ToastContext = createContext<ShowToastFn>(() => {});

const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const showToast: ShowToastFn = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 min-w-[300px] justify-center no-print ${
            toast.type === 'error'
              ? 'bg-red-50 text-red-600 border border-red-100'
              : 'bg-slate-800 text-white'
          }`}
        >
          {toast.type === 'success' ? <Icons.Check /> : <span className="font-bold text-lg">!</span>}
          <span className="font-bold text-sm">{toast.message}</span>
        </div>
      )}
    </ToastContext.Provider>
  );
};

const useToast = () => useContext(ToastContext);

const Icons = {
  Database: ({ size = 20 }: { size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  ),
  ImportCloud: ({ size = 20 }: { size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
      <path d="M12 12v9" />
      <path d="m8 17 4 4 4-4" />
    </svg>
  ),
  LogOut: ({ size = 18 }: { size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  Training: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  ),
  Stats: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M18 17V9" />
      <path d="M13 17V5" />
      <path d="M8 17v-3" />
    </svg>
  ),
  History: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Plan: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  Settings: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  Check: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Plus: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  UserPlus: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  ),
  Search: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  Trash: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  Edit: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  Clipboard: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  ),
  Logo: ({ size = 40 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="16" fill="#4f46e5" />
      <circle cx="32" cy="34" r="22" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeDasharray="4 2.5" opacity="0.6" />
      <path d="M26 21 h12 v7 h7 v12 h-7 v7 h-12 v-7 h-7 v-12 h7 z" fill="#ffffff" />
      <rect x="29" y="25" width="6" height="16" rx="1.5" fill="#10b981" />
      <rect x="24" y="30" width="16" height="6" rx="1.5" fill="#10b981" />
      <path d="M32 9 L47 15 L32 21 L17 15 Z" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1" />
      <path d="M43 16.5 v5 c0 1 -1.5 2 -3 2" fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  ChevronDown: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  Printer: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  ),
  Certificate: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M12 12v9" />
    </svg>
  ),
  Download: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  Restore: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  ),
  GoogleSheets: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
      <line x1="12" y1="9" x2="12" y2="21" />
    </svg>
  ),
  Image: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  ),
  Loading: () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  ),
};

interface PrintHeaderProps {
  title: string;
  subtitle?: string;
  hideLogo?: boolean;
  hospitalName?: string;
  hospitalLogo?: string;
  hospitalLogoLeft?: string;
}

const PrintHeader: React.FC<PrintHeaderProps> = ({
  title,
  subtitle,
  hideLogo = false,
  hospitalName = DEFAULT_HOSPITAL_NAME,
  hospitalLogo = '',
  hospitalLogoLeft = '',
}) => {
  const logoRightUrl = formatGoogleDriveImageUrl(hospitalLogo);
  const logoLeftUrl = formatGoogleDriveImageUrl(hospitalLogoLeft);
  const showRight = !hideLogo && !!logoRightUrl;
  const showLeft = !hideLogo && !!logoLeftUrl;

  let padClass = 'no-logo-padding';
  if (showRight && showLeft) padClass = 'pad-both';
  else if (showRight) padClass = 'pad-right';
  else if (showLeft) padClass = 'pad-left';

  return (
    <div className="print-title-container">
      {showRight && (
        <div className="print-logo-box print-logo-box-right">
          <img
            src={logoRightUrl}
            alt="الشعار الأيمن"
            className="print-logo-img"
            crossOrigin="anonymous"
            onError={handleDriveImgError}
          />
        </div>
      )}
      {showLeft && (
        <div className="print-logo-box print-logo-box-left">
          <img
            src={logoLeftUrl}
            alt="الشعار الأيسر"
            className="print-logo-img"
            crossOrigin="anonymous"
            onError={handleDriveImgError}
          />
        </div>
      )}
      <div className={`print-header-center ${padClass}`}>
        <div style={{ fontSize: '18pt', fontWeight: '800', marginBottom: '5px' }}>{hospitalName}</div>
        <div style={{ fontSize: '14pt', fontWeight: 'bold', marginBottom: '5px', color: '#333' }}>
          وحدة مكافحة العدوى
        </div>
        <div
          style={{
            fontSize: '12pt',
            fontWeight: 'bold',
            borderTop: '1px solid #000',
            paddingTop: '5px',
            marginTop: '5px',
            display: 'inline-block',
            paddingLeft: '20px',
            paddingRight: '20px',
          }}
        >
          {title} {subtitle && <span> - {subtitle}</span>}
        </div>
      </div>
      <div style={{ clear: 'both' }}></div>
    </div>
  );
};

const PrintFooter: React.FC = () => (
  <div className="print-footer">
    <span>تم استخراج التقرير بواسطة: نظام إدارة مكافحة العدوى | © 2026 Dr. Fady Ezzat. All Rights Reserved</span>
    <span>تاريخ الطباعة: {new Date().toLocaleString('ar-EG')}</span>
  </div>
);

// Helper subcomponent for session detail grid in History modals
const SessionInfoCard: React.FC<{
  date: string;
  category: string;
  policies: string;
  trainer: string;
  count?: number;
}> = ({ date, category, policies, trainer, count }) => (
  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-xs">
    <p><span className="text-slate-400">التاريخ:</span> <strong className="text-slate-700" dir="ltr">{formatLogDate(date)}</strong></p>
    <p><span className="text-slate-400">الفئة:</span> <strong className="text-slate-700">{category}</strong></p>
    <p><span className="text-slate-400">السياسات:</span> <strong className="text-slate-700">{policies}</strong></p>
    {trainer !== undefined && (
      <p><span className="text-slate-400">المدرب الحالي:</span> <strong className="text-indigo-600">{trainer || 'غير محدد'}</strong></p>
    )}
    {count !== undefined && (
      <p><span className="text-slate-400">عدد المتدربين المسجلين بهذه الجلسة:</span> <strong className="text-red-600">{count} متدرب</strong></p>
    )}
  </div>
);

// ============================================================================
// 5. STATS PAGE (إحصائيات وتقارير التغطية)
// ============================================================================

interface StatsPageProps {
  data: ReportData;
}

const StatsPage: React.FC<StatsPageProps> = ({ data }) => {
  const hospitalName =
    data?.settings?.slice().reverse().find((s) => s.Type === 'Hospital_Name')?.Value ||
    DEFAULT_HOSPITAL_NAME;
  const hospitalLogo =
    data?.settings?.slice().reverse().find((s) => s.Type === 'Hospital_Logo')?.Value || '';
  const hospitalLogoLeft =
    data?.settings?.slice().reverse().find((s) => s.Type === 'Hospital_Logo_Left')?.Value || '';

  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const [includePolicyTotals, setIncludePolicyTotals] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('stats_include_policy_totals');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });
  const [includeCategoryTotals, setIncludeCategoryTotals] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('stats_include_category_totals');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const togglePolicyTotals = () => {
    setIncludePolicyTotals((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('stats_include_policy_totals', String(next));
      } catch {}
      return next;
    });
  };

  const toggleCategoryTotals = () => {
    setIncludeCategoryTotals((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('stats_include_category_totals', String(next));
      } catch {}
      return next;
    });
  };

  const toggleAllTotals = () => {
    const nextVal = !(includePolicyTotals && includeCategoryTotals);
    setIncludePolicyTotals(nextVal);
    setIncludeCategoryTotals(nextVal);
    try {
      localStorage.setItem('stats_include_policy_totals', String(nextVal));
      localStorage.setItem('stats_include_category_totals', String(nextVal));
    } catch {}
  };

  const stats = useMemo(() => {
    const activeEmployees = data.employees || [];
    const activeEmpNamesSet = new Set(
      activeEmployees.map((e) => (e.Name || '').trim()).filter(Boolean)
    );
    const activeNamesByCat: Record<string, Set<string>> = {};
    (data.categories || []).forEach((c) => {
      activeNamesByCat[c] = new Set(
        activeEmployees
          .filter((e) => e.Category === c)
          .map((e) => (e.Name || '').trim())
          .filter(Boolean)
      );
    });

    const getLogYear = (l: TrainingLog) =>
      l.Year ? parseInt(String(l.Year), 10) : l.Date ? new Date(l.Date).getFullYear() : null;
    const getLogMonth = (l: TrainingLog) =>
      l.Month ? parseInt(String(l.Month), 10) : l.Date ? new Date(l.Date).getMonth() + 1 : null;

    const results = (data.categories || []).map((cat) => {
      const totalInCat = activeEmployees.filter((e) => e.Category === cat).length;
      const catValidNames = activeNamesByCat[cat] || new Set<string>();

      const trainedThisMonthGeneral = new Set(
        (data.logs || [])
          .filter(
            (l) =>
              l.Category === cat &&
              getLogMonth(l) == selectedMonth &&
              getLogYear(l) == selectedYear &&
              catValidNames.has((l.TraineeName || '').trim())
          )
          .map((l) => (l.TraineeName || '').trim())
      ).size;
      const coverageMonthGeneral =
        totalInCat > 0 ? Math.min(100, Math.round((trainedThisMonthGeneral / totalInCat) * 100)) : 0;

      const trainedThisYearGeneral = new Set(
        (data.logs || [])
          .filter(
            (l) =>
              l.Category === cat &&
              getLogYear(l) == selectedYear &&
              catValidNames.has((l.TraineeName || '').trim())
          )
          .map((l) => (l.TraineeName || '').trim())
      ).size;
      const coverageYearGeneral =
        totalInCat > 0 ? Math.min(100, Math.round((trainedThisYearGeneral / totalInCat) * 100)) : 0;

      const catLogsMonth = (data.logs || []).filter(
        (l) =>
          l.Category === cat &&
          getLogMonth(l) == selectedMonth &&
          getLogYear(l) == selectedYear &&
          catValidNames.has((l.TraineeName || '').trim())
      );
      const allPoliciesMonth: string[] = [];
      catLogsMonth.forEach((l) =>
        splitPolicies(l.Policies).forEach((p) => {
          const base = getBasePolicyName(p);
          if (base) allPoliciesMonth.push(base);
        })
      );
      const uniquePoliciesMonth = Array.from(new Set(allPoliciesMonth));

      const monthlyPolicyDetails = uniquePoliciesMonth.map((p) => {
        const uniqueTrainees = new Set(
          catLogsMonth
            .filter((l) => splitPolicies(l.Policies).map(getBasePolicyName).includes(p))
            .map((l) => (l.TraineeName || '').trim())
        ).size;
        return {
          name: p,
          percentage: totalInCat > 0 ? Math.min(100, Math.round((uniqueTrainees / totalInCat) * 100)) : 0,
          count: Math.min(totalInCat, uniqueTrainees),
        };
      });

      return {
        cat,
        total: totalInCat,
        coverageMonthGeneral,
        coverageYearGeneral,
        monthlyPolicyDetails,
      };
    });

    const totalEmployees = activeEmployees.length;
    const trainedThisMonthGeneral = new Set(
      (data.logs || [])
        .filter(
          (l) =>
            getLogMonth(l) == selectedMonth &&
            getLogYear(l) == selectedYear &&
            activeEmpNamesSet.has((l.TraineeName || '').trim())
        )
        .map((l) => (l.TraineeName || '').trim())
    ).size;
    const generalCoverage =
      totalEmployees > 0 ? Math.min(100, Math.round((trainedThisMonthGeneral / totalEmployees) * 100)) : 0;
    return { results, generalCoverage };
  }, [data.logs, data.employees, data.categories, selectedMonth, selectedYear]);

  const printTableData = useMemo(() => {
    const activeEmployees = data.employees || [];
    const activeEmpNamesSet = new Set(
      activeEmployees.map((e) => (e.Name || '').trim()).filter(Boolean)
    );
    const activeNamesByCat: Record<string, Set<string>> = {};
    const catCounts: Record<string, number> = {};
    (data.categories || []).forEach((c) => {
      activeNamesByCat[c] = new Set(
        activeEmployees
          .filter((e) => e.Category === c)
          .map((e) => (e.Name || '').trim())
          .filter(Boolean)
      );
      catCounts[c] = activeEmployees.filter((e) => e.Category === c).length;
    });

    const getLogYear = (l: TrainingLog) =>
      l.Year ? parseInt(String(l.Year), 10) : l.Date ? new Date(l.Date).getFullYear() : null;
    const getLogMonth = (l: TrainingLog) =>
      l.Month ? parseInt(String(l.Month), 10) : l.Date ? new Date(l.Date).getMonth() + 1 : null;

    const yearLogs = (data.logs || []).filter(
      (l) => getLogYear(l) === parseInt(String(selectedYear), 10) && activeEmpNamesSet.has((l.TraineeName || '').trim())
    );
    const monthLogs = yearLogs.filter((l) => getLogMonth(l) === parseInt(String(selectedMonth), 10));

    const allPolicies = new Set<string>();
    monthLogs.forEach((l) =>
      splitPolicies(l.Policies).forEach((p) => {
        const base = getBasePolicyName(p);
        if (base) allPolicies.add(base);
      })
    );

    (data.plan || [])
      .filter((p) => {
        const isSameMonth =
          parseInt(String(p.Month), 10) === parseInt(String(selectedMonth), 10) ||
          String(p.Month).trim() === String(selectedMonth);
        const isSameYear =
          parseInt(String(p.Year), 10) === parseInt(String(selectedYear), 10) ||
          String(p.Year || '').trim() === String(selectedYear);
        const isLegacyCurrentYear =
          (!p.Year || !String(p.Year).trim()) &&
          parseInt(String(selectedYear), 10) === new Date().getFullYear();
        return isSameMonth && (isSameYear || isLegacyCurrentYear);
      })
      .forEach((p) => {
        splitPolicies(p.Policies).forEach((pol) => {
          const base = getBasePolicyName(pol);
          if (base) allPolicies.add(base);
        });
      });

    const policiesArray = Array.from(allPolicies).sort((a, b) => a.localeCompare(b, 'ar'));

    const isPlanned = (cat: string, pol: string) => {
      const item = getPlanItem(data.plan, selectedMonth, cat, selectedYear);
      if (!item || !item.Policies) return false;
      return splitPolicies(item.Policies).map(getBasePolicyName).includes(pol);
    };

    const totalAll = activeEmployees.length;

    const rows = policiesArray.map((policy) => {
      const policyMonthLogs = monthLogs.filter((l) =>
        splitPolicies(l.Policies).map(getBasePolicyName).includes(policy)
      );
      const policyYearLogs = yearLogs.filter((l) =>
        splitPolicies(l.Policies).map(getBasePolicyName).includes(policy)
      );

      const catCoverage: Record<
        string,
        { planned: boolean; target: number; trained: number; totalInCat: number; rate: number }
      > = {};
      let totalMonthTargetForPolicy = 0;
      let anyCatPlannedMonth = false;

      (data.categories || []).forEach((cat) => {
        const planned = isPlanned(cat, policy);
        const catValidNames = activeNamesByCat[cat] || new Set<string>();
        const trainedInCat = new Set(
          policyMonthLogs
            .filter((l) => l.Category === cat && catValidNames.has((l.TraineeName || '').trim()))
            .map((l) => (l.TraineeName || '').trim())
        ).size;
        const totalInCat = catCounts[cat] || 0;

        if (planned) {
          anyCatPlannedMonth = true;
          totalMonthTargetForPolicy += totalInCat;
        }

        catCoverage[cat] = {
          planned,
          target: planned ? totalInCat : 0,
          trained: trainedInCat,
          totalInCat,
          rate: totalInCat > 0 ? Math.min(100, Math.round((trainedInCat / totalInCat) * 100)) : 0,
        };
      });

      const uniqueTrainedMonth = new Set(
        policyMonthLogs.map((l) => (l.TraineeName || '').trim())
      ).size;
      const policyMonthTarget = anyCatPlannedMonth ? totalMonthTargetForPolicy : 0;
      const policyMonthRate =
        policyMonthTarget > 0
          ? Math.min(100, Math.round((uniqueTrainedMonth / policyMonthTarget) * 100))
          : totalAll > 0 && uniqueTrainedMonth > 0
            ? Math.min(100, Math.round((uniqueTrainedMonth / totalAll) * 100))
            : 0;

      const annualPlannedCats = new Set<string>();
      (data.plan || [])
        .filter((p) => {
          const isSameYear =
            parseInt(String(p.Year), 10) === parseInt(String(selectedYear), 10) ||
            String(p.Year || '').trim() === String(selectedYear);
          const isLegacyCurrentYear =
            (!p.Year || !String(p.Year).trim()) &&
            parseInt(String(selectedYear), 10) === new Date().getFullYear();
          return isSameYear || isLegacyCurrentYear;
        })
        .forEach((p) => {
          if (splitPolicies(p.Policies).map(getBasePolicyName).includes(policy) && p.Category) {
            annualPlannedCats.add(p.Category);
          }
        });

      let totalYearTargetForPolicy = 0;
      const anyCatPlannedYear = annualPlannedCats.size > 0;
      if (anyCatPlannedYear) {
        annualPlannedCats.forEach((c) => {
          totalYearTargetForPolicy += catCounts[c] || 0;
        });
      } else {
        totalYearTargetForPolicy = totalAll;
      }

      const uniqueTrainedYear = new Set(
        policyYearLogs.map((l) => (l.TraineeName || '').trim())
      ).size;
      const policyYearTarget = totalYearTargetForPolicy;
      const policyYearRate =
        policyYearTarget > 0
          ? Math.min(100, Math.round((uniqueTrainedYear / policyYearTarget) * 100))
          : 0;

      return {
        policy,
        catCoverage,
        policyMonthTotal: {
          target: policyMonthTarget,
          trained: uniqueTrainedMonth,
          rate: policyMonthRate,
          anyPlanned: anyCatPlannedMonth,
        },
        policyYearTotal: {
          target: policyYearTarget,
          trained: uniqueTrainedYear,
          rate: policyYearRate,
          anyPlanned: anyCatPlannedYear,
        },
      };
    });

    const catMonthSummary: Record<string, { target: number; trained: number; rate: number }> = {};
    const catYearSummary: Record<string, { target: number; trained: number; rate: number }> = {};
    (data.categories || []).forEach((cat) => {
      const catValidNames = activeNamesByCat[cat] || new Set<string>();
      const totalInCat = catCounts[cat] || 0;

      const uniqueMonth = new Set(
        monthLogs
          .filter((l) => l.Category === cat && catValidNames.has((l.TraineeName || '').trim()))
          .map((l) => (l.TraineeName || '').trim())
      ).size;
      const rateMonth =
        totalInCat > 0 ? Math.min(100, Math.round((uniqueMonth / totalInCat) * 100)) : 0;
      catMonthSummary[cat] = { target: totalInCat, trained: uniqueMonth, rate: rateMonth };

      const uniqueYear = new Set(
        yearLogs
          .filter((l) => l.Category === cat && catValidNames.has((l.TraineeName || '').trim()))
          .map((l) => (l.TraineeName || '').trim())
      ).size;
      const rateYear =
        totalInCat > 0 ? Math.min(100, Math.round((uniqueYear / totalInCat) * 100)) : 0;
      catYearSummary[cat] = { target: totalInCat, trained: uniqueYear, rate: rateYear };
    });

    const hospitalMonthTrained = new Set(
      monthLogs.map((l) => (l.TraineeName || '').trim())
    ).size;
    const hospitalMonthRate =
      totalAll > 0 ? Math.min(100, Math.round((hospitalMonthTrained / totalAll) * 100)) : 0;

    const hospitalYearTrained = new Set(
      yearLogs.map((l) => (l.TraineeName || '').trim())
    ).size;
    const hospitalYearRate =
      totalAll > 0 ? Math.min(100, Math.round((hospitalYearTrained / totalAll) * 100)) : 0;

    return {
      rows,
      catMonthSummary,
      catYearSummary,
      hospitalMonthSummary: { target: totalAll, trained: hospitalMonthTrained, rate: hospitalMonthRate },
      hospitalYearSummary: { target: totalAll, trained: hospitalYearTrained, rate: hospitalYearRate },
      catCounts,
      totalEmployees: totalAll,
      categoriesToPrint: data.categories || [],
    };
  }, [data.logs, data.employees, data.plan, data.categories, selectedMonth, selectedYear]);

  const handlePdfSave = () => {
    const existing = document.getElementById('print-stats-style');
    if (existing) existing.remove();
    const style = document.createElement('style');
    style.id = 'print-stats-style';
    style.innerHTML = `@media print { @page { size: landscape !important; margin: 8mm !important; } }`;
    document.head.appendChild(style);

    document.title = `تقرير_إحصائيات_${ARABIC_MONTHS[selectedMonth - 1]}_${selectedYear}`;
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    const cleanup = () => {
      const el = document.getElementById('print-stats-style');
      if (el) el.remove();
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    setTimeout(() => {
      window.focus();
      window.print();
      setTimeout(cleanup, 1200);
    }, 80);
  };

  return (
    <div id="stats-print-area" className="space-y-6 lg:space-y-8 fade-in p-4 lg:p-6 pb-24 lg:pb-6 normal-print-content">
      <div className="print-only">
        <PrintHeader
          title="تقرير الإحصائيات الشهرية"
          subtitle={`${ARABIC_MONTHS[selectedMonth - 1]} ${selectedYear}`}
          hospitalName={hospitalName}
          hospitalLogo={hospitalLogo}
          hospitalLogoLeft={hospitalLogoLeft}
        />
      </div>

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2 lg:mb-4 slide-up no-print">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-slate-800">سجل التدريب</h2>
          <p className="text-sm text-slate-500">
            تحليل أداء التدريب لشهر {ARABIC_MONTHS[selectedMonth - 1]} / {selectedYear}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 hover:border-indigo-300 transition-all shadow-sm no-print">
            <span className="text-xs font-bold text-slate-400 whitespace-nowrap">الشهر:</span>
            <input
              type="month"
              value={`${selectedYear}-${String(selectedMonth).padStart(2, '0')}`}
              onChange={(e) => {
                if (e.target.value) {
                  const [y, m] = e.target.value.split('-').map(Number);
                  setSelectedMonth(m);
                  setSelectedYear(y);
                }
              }}
              className="bg-transparent outline-none text-xs lg:text-sm font-bold text-slate-700 cursor-pointer min-w-[130px]"
            />
          </div>
          <div className="flex items-center gap-2 no-print">
            <button
              type="button"
              onClick={toggleAllTotals}
              title="تحديد أو إلغاء تضمين إجماليات التغطية (السياسات والفئات) عند الطباعة"
              className={`btn-secondary self-start md:self-auto transition-colors px-3 text-xs font-bold ${
                includePolicyTotals && includeCategoryTotals
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                  : includePolicyTotals || includeCategoryTotals
                    ? 'bg-blue-50 text-blue-700 border-blue-300'
                    : 'bg-slate-50 text-slate-500 border-slate-200'
              }`}
            >
              <span>
                إجماليات الطباعة:{' '}
                {includePolicyTotals && includeCategoryTotals
                  ? 'مضمّنة بالكامل ✓'
                  : includePolicyTotals || includeCategoryTotals
                    ? 'مخصصة ⚙'
                    : 'مستبعدة ✕'}
              </span>
            </button>
            <button onClick={handlePdfSave} className="btn-secondary self-start md:self-auto hover:bg-slate-50 transition-colors px-3">
              <Icons.Download /> PDF
            </button>
            <button
              onClick={() =>
                exportHTMLToWord('stats-print-area', `تقرير_إحصائيات_${ARABIC_MONTHS[selectedMonth - 1]}_${selectedYear}`)
              }
              className="btn-secondary self-start md:self-auto hover:bg-indigo-50 hover:text-indigo-600 transition-colors px-3"
            >
              <Icons.Download /> Word
            </button>
          </div>
        </div>
      </header>

      <div
        className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-blue-600 to-sky-600 rounded-3xl lg:rounded-[2.5rem] p-6 lg:p-10 text-white shadow-2xl shadow-indigo-200 slide-up no-print"
        style={{ animationDelay: '0.1s' }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 animate-pulse no-print"></div>
        <div className="relative flex flex-col md:flex-row justify-between items-center gap-6 lg:gap-10">
          <div className="text-center md:text-right space-y-1 lg:space-y-2">
            <h2 className="text-3xl lg:text-4xl font-black tracking-tight">التغطية العامة</h2>
            <p className="text-blue-100 text-sm lg:text-lg opacity-90">إجمالي الحضور هذا الشهر</p>
          </div>
          <div className="relative w-32 h-32 lg:w-40 lg:h-40 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="50%" cy="50%" r="45%" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-indigo-900/30" />
              <circle
                cx="50%"
                cy="50%"
                r="45%"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                strokeDasharray="283"
                strokeDashoffset={283 - (283 * stats.generalCoverage) / 100}
                className="text-white transition-all duration-1000 ease-out"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl lg:text-5xl font-black">{stats.generalCoverage}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 no-print">
        {stats.results.map((r, i) => (
          <div
            key={r.cat}
            className="card p-6 lg:p-8 transition-all duration-300 group slide-up"
            style={{ animationDelay: `${0.2 + i * 0.1}s` }}
          >
            <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">{r.cat}</h3>
                <span className="text-xs text-slate-400 font-bold">عدد الموظفين: {r.total}</span>
              </div>
              <div className="flex gap-2">
                <div className="text-center px-3 py-1.5 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors">
                  <div className="text-[10px] text-blue-500 font-bold">حضور شهري</div>
                  <div className="font-bold text-sm lg:text-base text-blue-700">{r.coverageMonthGeneral}%</div>
                </div>
                <div className="text-center px-3 py-1.5 bg-indigo-50 rounded-xl group-hover:bg-indigo-100 transition-colors">
                  <div className="text-[10px] text-indigo-500 font-bold">حضور سنوي</div>
                  <div className="font-bold text-sm lg:text-base text-indigo-700">{r.coverageYearGeneral}%</div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-bold text-slate-500 mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                  تفاصيل السياسات ({ARABIC_MONTHS[selectedMonth - 1]})
                </h4>
                <div className="space-y-3">
                  {r.monthlyPolicyDetails.length > 0 ? (
                    r.monthlyPolicyDetails.map((p) => (
                      <div key={p.name}>
                        <div className="flex justify-between items-end mb-1 text-xs">
                          <span className="font-bold text-slate-700 truncate max-w-[70%]">{p.name}</span>
                          <span className="font-bold text-blue-600">
                            {p.percentage}% <span className="text-slate-300 font-normal">({p.count})</span>
                          </span>
                        </div>
                        <div className="w-full progress-bg bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className="h-full progress-fill bg-gradient-to-r from-blue-400 to-blue-600 rounded-full" style={{ width: `${p.percentage}%` }}></div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-400 italic text-center py-2 bg-slate-50 rounded-lg">
                      لا توجد تدريبات مسجلة هذا الشهر
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-4 lg:p-6 overflow-x-auto print:p-0 print:border-none print:shadow-none print:bg-transparent slide-up" style={{ animationDelay: '0.3s' }}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 no-print pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-800 text-base lg:text-lg">
              إحصائية تدريب السياسات (المستهدف والتغطية والنسبة)
            </h3>
            <p className="text-xs text-slate-400">
              المستهدف وعدد الحضور ونسب التغطية الشهرية والسنوية لكل فئة وسياسة وفقاً للخطة التدريبية لشهر{' '}
              {ARABIC_MONTHS[selectedMonth - 1]} {selectedYear}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 whitespace-nowrap ml-1">إجماليات الطباعة:</span>

            <button
              type="button"
              onClick={togglePolicyTotals}
              title="تضمين أو إخفاء أعمدة إجمالي التغطية الشهري والسنوي للسياسات عند الطباعة"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                includePolicyTotals
                  ? 'bg-blue-600 text-white hover:bg-blue-700 ring-2 ring-blue-300'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] ${
                  includePolicyTotals ? 'bg-white/20 text-white font-black' : 'border border-slate-400'
                }`}
              >
                {includePolicyTotals ? '✓' : ''}
              </span>
              <span>إجمالي السياسات (شهري وسنوي)</span>
            </button>

            <button
              type="button"
              onClick={toggleCategoryTotals}
              title="تضمين أو إخفاء صفوف إجمالي التغطية الشهري والسنوي للفئات عند الطباعة"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                includeCategoryTotals
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 ring-2 ring-indigo-300'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] ${
                  includeCategoryTotals ? 'bg-white/20 text-white font-black' : 'border border-slate-400'
                }`}
              >
                {includeCategoryTotals ? '✓' : ''}
              </span>
              <span>إجمالي الفئات (شهري وسنوي)</span>
            </button>

            <button
              type="button"
              onClick={toggleAllTotals}
              title="تبديل كافة الإجماليات (السياسات والفئات) معاً"
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-300 hover:border-slate-400 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              {includePolicyTotals && includeCategoryTotals ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
            </button>

            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg mr-auto md:mr-0">
              عدد السياسات: {printTableData.rows.length}
            </span>
          </div>
        </div>

        <table className="print-table w-full">
          <thead>
            <tr>
              <th rowSpan={2} style={{ width: includePolicyTotals ? '18%' : '26%', verticalAlign: 'middle', textAlign: 'center' }}>
                السياسات
              </th>
              {printTableData.categoriesToPrint.map((cat) => (
                <th key={cat} colSpan={3} style={{ textAlign: 'center' }}>
                  {cat}
                </th>
              ))}
              {includePolicyTotals && (
                <>
                  <th colSpan={3} style={{ textAlign: 'center', backgroundColor: '#dbeafe', color: '#1e3a8a' }}>
                    إجمالي التغطية الشهري للسياسة
                  </th>
                  <th colSpan={3} style={{ textAlign: 'center', backgroundColor: '#e0e7ff', color: '#3730a3' }}>
                    إجمالي التغطية السنوي للسياسة
                  </th>
                </>
              )}
            </tr>
            <tr>
              {printTableData.categoriesToPrint.map((cat) => (
                <Fragment key={cat}>
                  <th style={{ fontSize: '7.5pt', padding: '3px 1px', backgroundColor: '#e2e8f0', minWidth: '35px' }}>المستهدف</th>
                  <th style={{ fontSize: '7.5pt', padding: '3px 1px', backgroundColor: '#e2e8f0', minWidth: '35px' }}>التغطية</th>
                  <th style={{ fontSize: '7.5pt', padding: '3px 1px', backgroundColor: '#e2e8f0', minWidth: '45px' }}>النسبة</th>
                </Fragment>
              ))}
              {includePolicyTotals && (
                <>
                  <th style={{ fontSize: '7.5pt', padding: '3px 1px', backgroundColor: '#bfdbfe', color: '#1e3a8a', minWidth: '35px' }}>المستهدف</th>
                  <th style={{ fontSize: '7.5pt', padding: '3px 1px', backgroundColor: '#bfdbfe', color: '#1e3a8a', minWidth: '35px' }}>التغطية</th>
                  <th style={{ fontSize: '7.5pt', padding: '3px 1px', backgroundColor: '#bfdbfe', color: '#1e3a8a', minWidth: '45px' }}>النسبة</th>
                  <th style={{ fontSize: '7.5pt', padding: '3px 1px', backgroundColor: '#c7d2fe', color: '#3730a3', minWidth: '35px' }}>المستهدف</th>
                  <th style={{ fontSize: '7.5pt', padding: '3px 1px', backgroundColor: '#c7d2fe', color: '#3730a3', minWidth: '35px' }}>التغطية</th>
                  <th style={{ fontSize: '7.5pt', padding: '3px 1px', backgroundColor: '#c7d2fe', color: '#3730a3', minWidth: '45px' }}>النسبة</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {printTableData.rows.map((row, i) => (
              <tr key={i}>
                <td style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '8.5pt', padding: '3px 4px' }}>{row.policy}</td>
                {printTableData.categoriesToPrint.map((cat) => {
                  const cov = row.catCoverage[cat];
                  const isNotTrainedOrZero = !cov || cov.rate === 0 || cov.trained === 0;
                  return (
                    <Fragment key={cat}>
                      <td style={{ backgroundColor: cov?.planned ? '#ffffff' : '#f8fafc', fontSize: '8.5pt', padding: '3px 1px' }}>
                        {cov?.planned ? cov.target : <span className="text-slate-400 font-normal">-</span>}
                      </td>
                      <td style={{ backgroundColor: cov?.planned ? '#ffffff' : '#f8fafc', fontSize: '8.5pt', padding: '3px 1px' }}>
                        {cov?.trained > 0 ? cov.trained : cov?.planned ? 0 : <span className="text-slate-400 font-normal">-</span>}
                      </td>
                      <td
                        style={{
                          fontWeight: !isNotTrainedOrZero ? 'bold' : 'normal',
                          backgroundColor: cov?.planned ? '#ffffff' : '#f8fafc',
                          padding: '3px 1px',
                        }}
                      >
                        {isNotTrainedOrZero ? (
                          <span className="text-[9px] print:text-[6pt] text-slate-400 font-medium leading-tight block">
                            غير مدرجة بالخطة
                          </span>
                        ) : (
                          <span className="font-bold text-slate-800 text-[8.5pt]">{cov.rate}%</span>
                        )}
                      </td>
                    </Fragment>
                  );
                })}
                {includePolicyTotals && (
                  <>
                    <td style={{ backgroundColor: '#eff6ff', fontWeight: 'bold', fontSize: '8.5pt', padding: '3px 1px' }}>
                      {row.policyMonthTotal.anyPlanned
                        ? row.policyMonthTotal.target
                        : row.policyMonthTotal.target > 0
                          ? row.policyMonthTotal.target
                          : '-'}
                    </td>
                    <td style={{ backgroundColor: '#eff6ff', fontWeight: 'bold', fontSize: '8.5pt', padding: '3px 1px' }}>
                      {row.policyMonthTotal.trained}
                    </td>
                    <td style={{ backgroundColor: '#dbeafe', fontWeight: '800', color: '#1e40af', fontSize: '8.5pt', padding: '3px 1px' }}>
                      {row.policyMonthTotal.target > 0 || row.policyMonthTotal.trained > 0
                        ? `${row.policyMonthTotal.rate}%`
                        : '-'}
                    </td>

                    <td style={{ backgroundColor: '#f5f3ff', fontWeight: 'bold', fontSize: '8.5pt', padding: '3px 1px' }}>
                      {row.policyYearTotal.target > 0 ? row.policyYearTotal.target : '-'}
                    </td>
                    <td style={{ backgroundColor: '#f5f3ff', fontWeight: 'bold', fontSize: '8.5pt', padding: '3px 1px' }}>
                      {row.policyYearTotal.trained}
                    </td>
                    <td style={{ backgroundColor: '#e0e7ff', fontWeight: '800', color: '#3730a3', fontSize: '8.5pt', padding: '3px 1px' }}>
                      {row.policyYearTotal.target > 0 || row.policyYearTotal.trained > 0
                        ? `${row.policyYearTotal.rate}%`
                        : '-'}
                    </td>
                  </>
                )}
              </tr>
            ))}
            {printTableData.rows.length === 0 && (
              <tr>
                <td
                  colSpan={1 + printTableData.categoriesToPrint.length * 3 + (includePolicyTotals ? 6 : 0)}
                  className="py-6 text-slate-400 italic"
                >
                  لا توجد بيانات تدريب أو خطة لهذا الشهر
                </td>
              </tr>
            )}

            {printTableData.rows.length > 0 && includeCategoryTotals && (
              <>
                <tr style={{ borderTop: '2px solid #000' }}>
                  <td style={{ textAlign: 'right', fontWeight: '900', fontSize: '8.5pt', backgroundColor: '#e2e8f0', color: '#0f172a', padding: '4px' }}>
                    إجمالي التغطية الشهري للفئة
                  </td>
                  {printTableData.categoriesToPrint.map((cat) => {
                    const mSum = printTableData.catMonthSummary[cat] || { target: 0, trained: 0, rate: 0 };
                    return (
                      <Fragment key={cat}>
                        <td style={{ backgroundColor: '#f1f5f9', fontWeight: '800', fontSize: '8.5pt', padding: '3px 1px' }}>{mSum.target}</td>
                        <td style={{ backgroundColor: '#f1f5f9', fontWeight: '800', fontSize: '8.5pt', padding: '3px 1px' }}>{mSum.trained}</td>
                        <td style={{ backgroundColor: '#e2e8f0', fontWeight: '900', color: '#0f172a', fontSize: '8.5pt', padding: '3px 1px' }}>{mSum.rate}%</td>
                      </Fragment>
                    );
                  })}
                  {includePolicyTotals && (
                    <>
                      <td style={{ backgroundColor: '#dbeafe', fontWeight: '900', color: '#1e3a8a', fontSize: '8.5pt', padding: '3px 1px' }}>
                        {printTableData.hospitalMonthSummary.target}
                      </td>
                      <td style={{ backgroundColor: '#dbeafe', fontWeight: '900', color: '#1e3a8a', fontSize: '8.5pt', padding: '3px 1px' }}>
                        {printTableData.hospitalMonthSummary.trained}
                      </td>
                      <td style={{ backgroundColor: '#bfdbfe', fontWeight: '900', color: '#1e40af', fontSize: '8.5pt', padding: '3px 1px' }}>
                        {printTableData.hospitalMonthSummary.rate}%
                      </td>
                      <td style={{ backgroundColor: '#f8fafc', color: '#94a3b8', fontSize: '8pt' }}>-</td>
                      <td style={{ backgroundColor: '#f8fafc', color: '#94a3b8', fontSize: '8pt' }}>-</td>
                      <td style={{ backgroundColor: '#f8fafc', color: '#94a3b8', fontSize: '8pt' }}>-</td>
                    </>
                  )}
                </tr>

                <tr style={{ borderBottom: '2px solid #000' }}>
                  <td style={{ textAlign: 'right', fontWeight: '900', fontSize: '8.5pt', backgroundColor: '#e2e8f0', color: '#0f172a', padding: '4px' }}>
                    إجمالي التغطية السنوي للفئة
                  </td>
                  {printTableData.categoriesToPrint.map((cat) => {
                    const ySum = printTableData.catYearSummary[cat] || { target: 0, trained: 0, rate: 0 };
                    return (
                      <Fragment key={cat}>
                        <td style={{ backgroundColor: '#f1f5f9', fontWeight: '800', fontSize: '8.5pt', padding: '3px 1px' }}>{ySum.target}</td>
                        <td style={{ backgroundColor: '#f1f5f9', fontWeight: '800', fontSize: '8.5pt', padding: '3px 1px' }}>{ySum.trained}</td>
                        <td style={{ backgroundColor: '#e2e8f0', fontWeight: '900', color: '#0f172a', fontSize: '8.5pt', padding: '3px 1px' }}>{ySum.rate}%</td>
                      </Fragment>
                    );
                  })}
                  {includePolicyTotals && (
                    <>
                      <td style={{ backgroundColor: '#f8fafc', color: '#94a3b8', fontSize: '8pt' }}>-</td>
                      <td style={{ backgroundColor: '#f8fafc', color: '#94a3b8', fontSize: '8pt' }}>-</td>
                      <td style={{ backgroundColor: '#f8fafc', color: '#94a3b8', fontSize: '8pt' }}>-</td>
                      <td style={{ backgroundColor: '#e0e7ff', fontWeight: '900', color: '#3730a3', fontSize: '8.5pt', padding: '3px 1px' }}>
                        {printTableData.hospitalYearSummary.target}
                      </td>
                      <td style={{ backgroundColor: '#e0e7ff', fontWeight: '900', color: '#3730a3', fontSize: '8.5pt', padding: '3px 1px' }}>
                        {printTableData.hospitalYearSummary.trained}
                      </td>
                      <td style={{ backgroundColor: '#c7d2fe', fontWeight: '900', color: '#312e81', fontSize: '8.5pt', padding: '3px 1px' }}>
                        {printTableData.hospitalYearSummary.rate}%
                      </td>
                    </>
                  )}
                </tr>
              </>
            )}
          </tbody>
          <tfoot className="print-only" style={{ display: 'table-footer-group' }}>
            <tr>
              <td
                colSpan={1 + printTableData.categoriesToPrint.length * 3 + (includePolicyTotals ? 6 : 0)}
                className="print-footer-cell"
              >
                <PrintFooter />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

// ============================================================================
// 6. HISTORY PAGE (سجل التدريب وكشوف الحضور + النوافذ المنبثقة)
// ============================================================================

const formatHistoryDate = (dateVal: any): string => {
  if (!dateVal) return '';
  const dt = parseFlexibleDate(dateVal);
  if (dt) {
    return dt.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  return String(dateVal);
};

const formatHistoryDateWithWeekday = (dateVal: any): string => {
  if (!dateVal) return '';
  const dt = parseFlexibleDate(dateVal);
  if (dt) {
    return dt.toLocaleDateString('ar-EG', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
  return String(dateVal);
};

interface HistoryPageProps {
  data: ReportData;
  onUpdateTrainer: (payload: UpdateSessionTrainerPayload) => Promise<void>;
  onUpdatePolicies: (payload: UpdateSessionPoliciesPayload) => Promise<void>;
  onDeleteSession: (payload: DeleteTrainingSessionPayload) => Promise<void>;
  onAddTrainees: (payload: AddTraineesToSessionPayload) => Promise<void>;
}

interface EditingTrainerState {
  date: string;
  category: string;
  policies: string;
  currentTrainer: string;
  traineeNames: string[];
  logIds: Array<string | number>;
}

interface EditingPoliciesState {
  date: string;
  category: string;
  policies: string;
  trainer: string;
  traineeNames: string[];
  logIds: Array<string | number>;
}

interface AddingTraineesState {
  date: string;
  month?: string;
  year?: string;
  category: string;
  policies: string;
  trainer: string;
  existingTraineeNames: string[];
}

interface DeletingSessionState {
  date: string;
  category: string;
  policies: string;
  trainer: string;
  currentTrainee?: string;
  currentLogId?: string | number;
  traineeNames: string[];
  logIds: Array<string | number>;
}

const HistoryPage: React.FC<HistoryPageProps> = ({
  data,
  onUpdateTrainer,
  onUpdatePolicies,
  onDeleteSession,
  onAddTrainees,
}) => {
  const hospitalName =
    data?.settings?.slice().reverse().find((s) => s.Type === 'Hospital_Name')?.Value ||
    DEFAULT_HOSPITAL_NAME;
  const hospitalLogo =
    data?.settings?.slice().reverse().find((s) => s.Type === 'Hospital_Logo')?.Value || '';
  const hospitalLogoLeft =
    data?.settings?.slice().reverse().find((s) => s.Type === 'Hospital_Logo_Left')?.Value || '';

  const [filterCat, setFilterCat] = useState<string>('الكل');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<string>('الكل');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const showToast = useToast();

  // Trainer editing
  const [editingSession, setEditingSession] = useState<EditingTrainerState | null>(null);
  const [selectedNewTrainer, setSelectedNewTrainer] = useState<string>('');
  const [isUpdatingTrainer, setIsUpdatingTrainer] = useState<boolean>(false);

  const trainersList = useMemo(() => {
    const fromSettings = (data?.settings || [])
      .filter((s) => s.Type === 'Trainer')
      .map((s) => String(s.Value || '').trim())
      .filter(Boolean);
    const fromLogs = (data?.logs || [])
      .map((l) => String(l.Trainer || '').trim())
      .filter(Boolean);
    return Array.from(new Set([...fromSettings, ...fromLogs])).sort((a, b) =>
      a.localeCompare(b, 'ar')
    );
  }, [data?.settings, data?.logs]);

  const getMatchingSessionLogs = (log: TrainingLog) => {
    const logDateStr = String(log.Date || '').split('T')[0].trim();
    const logCat = String(log.Category || '').trim();
    const logPol = String(log.Policies || '').trim();
    const logTr = String(log.Trainer || '').trim();

    return (data.logs || []).filter((item) => {
      const itemDateStr = String(item.Date || '').split('T')[0].trim();
      const itemCat = String(item.Category || '').trim();
      const itemPol = String(item.Policies || '').trim();
      const itemTr = String(item.Trainer || '').trim();
      return (
        itemDateStr === logDateStr &&
        itemCat === logCat &&
        itemPol === logPol &&
        itemTr === logTr
      );
    });
  };

  const openEditTrainerModal = (log: TrainingLog) => {
    const sessionLogs = getMatchingSessionLogs(log);
    const traineeNames = sessionLogs.map((s) => s.TraineeName).filter(Boolean);
    const logIds = sessionLogs.map((s) => s.ID).filter((id): id is string | number => id !== undefined && id !== '');

    setEditingSession({
      date: log.Date,
      category: log.Category,
      policies: log.Policies,
      currentTrainer: log.Trainer,
      traineeNames,
      logIds,
    });
    setSelectedNewTrainer(log.Trainer || '');
  };

  const handleSaveTrainerUpdate = async () => {
    if (!editingSession) return;
    const finalTrainer = selectedNewTrainer ? String(selectedNewTrainer).trim() : '';
    if (!finalTrainer) {
      showToast('يرجى اختيار المدرب الجديد من قائمة المدربين', 'error');
      return;
    }
    if (finalTrainer === editingSession.currentTrainer) {
      showToast('المدرب المختار هو نفس المدرب الحالي للجلسة. يرجى اختيار مدرب آخر من القائمة', 'error');
      return;
    }

    setIsUpdatingTrainer(true);
    try {
      await onUpdateTrainer({
        date: editingSession.date,
        category: editingSession.category,
        policies: editingSession.policies,
        oldTrainer: editingSession.currentTrainer,
        newTrainer: finalTrainer,
        logIds: editingSession.logIds,
      });
      showToast(
        `تم تعديل المدرب بنجاح إلى "${finalTrainer}" لجميع المتدربين في الجلسة (${editingSession.traineeNames.length} متدرب)`,
        'success'
      );
      setEditingSession(null);
    } catch (err: any) {
      showToast(err?.message || 'حدث خطأ أثناء تعديل المدرب', 'error');
    } finally {
      setIsUpdatingTrainer(false);
    }
  };

  // Policy editing
  const [editingPoliciesSession, setEditingPoliciesSession] = useState<EditingPoliciesState | null>(null);
  const [selectedPoliciesList, setSelectedPoliciesList] = useState<string[]>([]);
  const [customPolicyInput, setCustomPolicyInput] = useState<string>('');
  const [policySearchTerm, setPolicySearchTerm] = useState<string>('');
  const [isUpdatingPolicies, setIsUpdatingPolicies] = useState<boolean>(false);

  const allHospitalPolicies = useMemo(() => {
    const fromSettings = (data?.settings || [])
      .filter((s) => s.Type === 'Policy')
      .map((s) => String(s.Value || '').trim())
      .filter(Boolean);
    const fromPlan = (data?.plan || [])
      .flatMap((p) => splitPolicies(p.Policies))
      .map((p) => getBasePolicyName(p).trim())
      .filter(Boolean);
    const fromLogs = (data?.logs || [])
      .flatMap((l) => splitPolicies(l.Policies))
      .map((p) => getBasePolicyName(p).trim())
      .filter(Boolean);
    return Array.from(new Set([...fromSettings, ...fromPlan, ...fromLogs])).sort((a, b) =>
      a.localeCompare(b, 'ar')
    );
  }, [data?.settings, data?.plan, data?.logs]);

  const sessionPlannedPolicies = useMemo(() => {
    if (!editingPoliciesSession?.date || !editingPoliciesSession?.category) return [];
    const d = new Date(editingPoliciesSession.date);
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    const planItem = getPlanItem(data.plan, m, editingPoliciesSession.category, y);
    if (!planItem?.Policies) return [];
    return splitPolicies(planItem.Policies);
  }, [editingPoliciesSession, data.plan]);

  const openEditPoliciesModal = (log: TrainingLog) => {
    const sessionLogs = getMatchingSessionLogs(log);
    const traineeNames = sessionLogs.map((s) => s.TraineeName).filter(Boolean);
    const logIds = sessionLogs.map((s) => s.ID).filter((id): id is string | number => id !== undefined && id !== '');

    setEditingPoliciesSession({
      date: log.Date,
      category: log.Category,
      policies: log.Policies,
      trainer: log.Trainer,
      traineeNames,
      logIds,
    });

    const initialList = splitPolicies(log.Policies);
    setSelectedPoliciesList(initialList.length > 0 ? initialList : log.Policies ? [log.Policies] : []);
    setCustomPolicyInput('');
    setPolicySearchTerm('');
  };

  const togglePolicySelection = (pol: string) => {
    const trimmed = String(pol || '').trim();
    if (!trimmed) return;
    setSelectedPoliciesList((prev) =>
      prev.includes(trimmed) ? prev.filter((p) => p !== trimmed) : [...prev, trimmed]
    );
  };

  const removePolicyFromSelection = (pol: string) => {
    setSelectedPoliciesList((prev) => prev.filter((p) => p !== pol));
  };

  const handleAddCustomPolicy = () => {
    const trimmed = customPolicyInput.trim();
    if (!trimmed) {
      showToast('يرجى إدخال اسم السياسة أو الموضوع', 'error');
      return;
    }
    if (selectedPoliciesList.includes(trimmed)) {
      showToast('هذه السياسة مضافة بالفعل في القائمة المختارة', 'error');
      return;
    }
    setSelectedPoliciesList((prev) => [...prev, trimmed]);
    setCustomPolicyInput('');
  };

  const handleSavePoliciesUpdate = async () => {
    if (!editingPoliciesSession) return;
    const finalPolicies = selectedPoliciesList.map((p) => String(p).trim()).filter(Boolean);
    if (finalPolicies.length === 0) {
      showToast('يرجى اختيار أو إدخال سياسة واحدة على الأقل للاعتماد', 'error');
      return;
    }
    const finalPoliciesStr = finalPolicies.join(', ');
    if (finalPoliciesStr === editingPoliciesSession.policies) {
      showToast('السياسات المختارة مطابقة للسياسات الحالية المسجلة للجلسة. يرجى اختيار أو تعديل السياسات', 'error');
      return;
    }

    setIsUpdatingPolicies(true);
    try {
      await onUpdatePolicies({
        date: editingPoliciesSession.date,
        category: editingPoliciesSession.category,
        oldPolicies: editingPoliciesSession.policies,
        newPolicies: finalPoliciesStr,
        trainer: editingPoliciesSession.trainer,
        logIds: editingPoliciesSession.logIds,
      });
      showToast(
        `تم تعديل السياسات بنجاح إلى "${finalPoliciesStr}" لجميع المتدربين في الجلسة (${editingPoliciesSession.traineeNames.length} متدرب)`,
        'success'
      );
      setEditingPoliciesSession(null);
    } catch (err: any) {
      showToast(err?.message || 'حدث خطأ أثناء تعديل السياسات', 'error');
    } finally {
      setIsUpdatingPolicies(false);
    }
  };

  // Adding trainees to session
  const [addingTraineesSession, setAddingTraineesSession] = useState<AddingTraineesState | null>(null);
  const [selectedNewTrainees, setSelectedNewTrainees] = useState<string[]>([]);
  const [newlyCreatedEmployees, setNewlyCreatedEmployees] = useState<Employee[]>([]);
  const [traineeSearchTerm, setTraineeSearchTerm] = useState<string>('');
  const [showAddCustomTrainee, setShowAddCustomTrainee] = useState<boolean>(false);
  const [customTraineeName, setCustomTraineeName] = useState<string>('');
  const [customTraineeJob, setCustomTraineeJob] = useState<string>('');
  const [saveCustomToEmployees, setSaveCustomToEmployees] = useState<boolean>(true);
  const [isSavingNewTrainees, setIsSavingNewTrainees] = useState<boolean>(false);
  const [filterTraineeCategory, setFilterTraineeCategory] = useState<'same' | 'all'>('same');

  const openAddTraineesModal = (log: TrainingLog) => {
    const sessionLogs = getMatchingSessionLogs(log);
    const existingTraineeNames = sessionLogs
      .map((s) => String(s.TraineeName || '').trim())
      .filter(Boolean);

    setAddingTraineesSession({
      date: log.Date,
      month: log.Month,
      year: log.Year,
      category: log.Category,
      policies: log.Policies,
      trainer: log.Trainer,
      existingTraineeNames,
    });
    setSelectedNewTrainees([]);
    setNewlyCreatedEmployees([]);
    setTraineeSearchTerm('');
    setShowAddCustomTrainee(false);
    setCustomTraineeName('');
    setCustomTraineeJob('');
    setSaveCustomToEmployees(true);
    setFilterTraineeCategory('same');
  };

  const toggleSelectNewTrainee = (name: string) => {
    const clean = String(name || '').trim();
    if (!clean) return;
    setSelectedNewTrainees((prev) =>
      prev.includes(clean) ? prev.filter((t) => t !== clean) : [...prev, clean]
    );
  };

  const handleCreateCustomTrainee = () => {
    const cleanName = customTraineeName.trim();
    if (!cleanName) {
      showToast('يرجى إدخال اسم المتدرب', 'error');
      return;
    }
    if (addingTraineesSession?.existingTraineeNames?.includes(cleanName)) {
      showToast(`المتدرب (${cleanName}) مسجل بالفعل في هذه الجلسة`, 'error');
      return;
    }
    if (selectedNewTrainees.includes(cleanName)) {
      showToast(`المتدرب (${cleanName}) محدد بالفعل للإضافة`, 'error');
      return;
    }

    setSelectedNewTrainees((prev) => [...prev, cleanName]);

    if (saveCustomToEmployees && addingTraineesSession) {
      const cleanJob = customTraineeJob.trim() || 'موظف';
      setNewlyCreatedEmployees((prev) => [
        ...prev,
        {
          ID: makeId(),
          Name: cleanName,
          Job: cleanJob,
          Category: addingTraineesSession.category,
        },
      ]);
    }

    showToast(`تمت إضافة وتحديد المتدرب (${cleanName})`, 'success');
    setCustomTraineeName('');
    setCustomTraineeJob('');
    setShowAddCustomTrainee(false);
  };

  const handleSaveAddTrainees = async () => {
    if (!addingTraineesSession) return;
    if (selectedNewTrainees.length === 0) {
      showToast('يرجى اختيار أو إضافة متدرب واحد على الأقل', 'error');
      return;
    }
    setIsSavingNewTrainees(true);
    try {
      await onAddTrainees({
        date: addingTraineesSession.date,
        month: addingTraineesSession.month,
        year: addingTraineesSession.year,
        category: addingTraineesSession.category,
        policies: addingTraineesSession.policies,
        trainer: addingTraineesSession.trainer,
        trainees: selectedNewTrainees,
        newEmployees: newlyCreatedEmployees,
      });
      showToast(`تمت إضافة (${selectedNewTrainees.length}) متدرب بنجاح إلى الجلسة التدريبية`, 'success');
      setAddingTraineesSession(null);
    } catch (err: any) {
      showToast(err?.message || 'حدث خطأ أثناء إضافة المتدربين للجلسة', 'error');
    } finally {
      setIsSavingNewTrainees(false);
    }
  };

  const candidateEmployeesForSession = useMemo(() => {
    if (!addingTraineesSession) return [];
    let list = data.employees || [];
    if (filterTraineeCategory === 'same') {
      list = list.filter(
        (e) =>
          String(e.Category || '').trim() === String(addingTraineesSession.category || '').trim()
      );
    }
    if (traineeSearchTerm.trim()) {
      const q = traineeSearchTerm.trim().toLowerCase();
      list = list.filter(
        (e) =>
          String(e.Name || '').toLowerCase().includes(q) ||
          String(e.Job || '').toLowerCase().includes(q) ||
          String(e.Category || '').toLowerCase().includes(q)
      );
    }
    return list.slice().sort((a, b) => {
      const aExists = addingTraineesSession.existingTraineeNames.includes(
        String(a.Name || '').trim()
      );
      const bExists = addingTraineesSession.existingTraineeNames.includes(
        String(b.Name || '').trim()
      );
      if (aExists !== bExists) return aExists ? 1 : -1;
      return String(a.Name || '').localeCompare(String(b.Name || ''), 'ar');
    });
  }, [data.employees, addingTraineesSession, filterTraineeCategory, traineeSearchTerm]);

  const unrecordedCandidates = useMemo(() => {
    if (!addingTraineesSession) return [];
    return candidateEmployeesForSession.filter(
      (e) => !addingTraineesSession.existingTraineeNames.includes(String(e.Name || '').trim())
    );
  }, [candidateEmployeesForSession, addingTraineesSession]);

  const handleSelectAllCandidates = () => {
    const names = unrecordedCandidates
      .map((e) => String(e.Name || '').trim())
      .filter(Boolean);
    setSelectedNewTrainees((prev) => Array.from(new Set([...prev, ...names])));
  };

  const handleDeselectAllCandidates = () => {
    setSelectedNewTrainees([]);
    setNewlyCreatedEmployees([]);
  };

  const handleRemoveSelectedTrainee = (name: string) => {
    setSelectedNewTrainees((prev) => prev.filter((t) => t !== name));
    setNewlyCreatedEmployees((prev) => prev.filter((e) => e.Name !== name));
  };

  // Session deletion
  const [deletingSession, setDeletingSession] = useState<DeletingSessionState | null>(null);
  const [isDeletingSession, setIsDeletingSession] = useState<boolean>(false);
  const [deleteMode, setDeleteMode] = useState<'session' | 'single'>('session');
  const [historyViewMode, setHistoryViewMode] = useState<'sessions' | 'table'>('sessions');

  const openDeleteSessionModal = (log: TrainingLog, singleTraineeOnly = false) => {
    const sessionLogs = getMatchingSessionLogs(log);
    const traineeNames = sessionLogs.map((s) => s.TraineeName).filter(Boolean);
    const logIds = sessionLogs.map((s) => s.ID).filter((id): id is string | number => id !== undefined && id !== '');

    setDeletingSession({
      date: log.Date,
      category: log.Category,
      policies: log.Policies,
      trainer: log.Trainer,
      currentTrainee: log.TraineeName,
      currentLogId: log.ID,
      traineeNames,
      logIds,
    });
    setDeleteMode(singleTraineeOnly ? 'single' : 'session');
  };

  const handleConfirmDelete = async () => {
    if (!deletingSession) return;
    setIsDeletingSession(true);
    try {
      const isSingle = deleteMode === 'single' && deletingSession.currentLogId !== undefined;
      const payload: DeleteTrainingSessionPayload = isSingle
        ? { singleLogId: deletingSession.currentLogId }
        : {
            date: deletingSession.date,
            category: deletingSession.category,
            policies: deletingSession.policies,
            trainer: deletingSession.trainer,
            logIds: deletingSession.logIds,
          };

      await onDeleteSession(payload);
      if (isSingle) {
        showToast(`تم حذف سجل المتدرب (${deletingSession.currentTrainee}) بنجاح`, 'success');
      } else {
        showToast(
          `تم حذف الجلسة التدريبية بنجاح بما تحتويه من (${deletingSession.traineeNames.length}) متدرب`,
          'success'
        );
      }
      setDeletingSession(null);
    } catch (err: any) {
      showToast(err?.message || 'حدث خطأ أثناء حذف الجلسة', 'error');
    } finally {
      setIsDeletingSession(false);
    }
  };

  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    const curY = new Date().getFullYear();
    yearsSet.add(curY);
    yearsSet.add(curY - 1);
    yearsSet.add(curY + 1);
    (data.logs || []).forEach((l) => {
      if (l.Year) yearsSet.add(parseInt(String(l.Year), 10));
      else if (l.Date) {
        const y = new Date(l.Date).getFullYear();
        if (!isNaN(y)) yearsSet.add(y);
      }
    });
    (data.plan || []).forEach((p) => {
      if (p.Year) yearsSet.add(parseInt(String(p.Year), 10));
    });
    return Array.from(yearsSet).filter(Boolean).sort((a, b) => b - a);
  }, [data.logs, data.plan]);

  const filteredLogs = useMemo(() => {
    return (data.logs || [])
      .filter((l) => {
        let logYear = l.Year ? parseInt(String(l.Year), 10) : null;
        let logMonth = l.Month ? parseInt(String(l.Month), 10) : null;
        if (!logYear || !logMonth) {
          const dStr = String(l.Date || '').split('T')[0].trim();
          if (dStr.includes('-')) {
            const parts = dStr.split('-');
            if (!logYear) logYear = parseInt(parts[0], 10);
            if (!logMonth) logMonth = parseInt(parts[1], 10);
          } else if (dStr.includes('/')) {
            const parts = dStr.split('/');
            if (parts[0].length === 4) {
              if (!logYear) logYear = parseInt(parts[0], 10);
              if (!logMonth) logMonth = parseInt(parts[1], 10);
            } else {
              if (!logYear) logYear = parseInt(parts[2], 10);
              if (!logMonth) logMonth = parseInt(parts[1], 10);
            }
          }
        }

        if (logYear && logYear !== selectedYear) return false;
        if (selectedMonth !== 'الكل') {
          const mNum = parseInt(selectedMonth, 10);
          if (logMonth && logMonth !== mNum) return false;
        }
        if (filterCat !== 'الكل' && String(l.Category || '').trim() !== String(filterCat).trim()) {
          return false;
        }
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          const trainee = String(l.TraineeName || '').toLowerCase();
          const pol = String(l.Policies || '').toLowerCase();
          const tr = String(l.Trainer || '').toLowerCase();
          if (!trainee.includes(term) && !pol.includes(term) && !tr.includes(term)) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        const timeA = parseDateToTime(a.Date);
        const timeB = parseDateToTime(b.Date);
        if (timeA !== timeB) return timeA - timeB;
        return Number(a.ID || 0) - Number(b.ID || 0);
      });
  }, [data.logs, selectedYear, selectedMonth, filterCat, searchTerm]);

  const groupedLogsForPrint = useMemo(() => {
    const groups: Record<
      string,
      { Date: string; Policies: string; Category: string; Trainer: string; records: TrainingLog[] }
    > = {};
    filteredLogs.forEach((log) => {
      const normDate = String(log.Date || '').split('T')[0].trim();
      const normPol = String(log.Policies || '').trim();
      const normTr = String(log.Trainer || '').trim();
      const normCat = String(log.Category || '').trim();
      const key = `${normDate}_${normPol}_${normTr}_${normCat}`;
      if (!groups[key]) {
        groups[key] = {
          Date: log.Date,
          Policies: log.Policies,
          Category: log.Category,
          Trainer: log.Trainer,
          records: [],
        };
      }
      groups[key].records.push(log);
    });
    return Object.values(groups).sort((a, b) => parseDateToTime(a.Date) - parseDateToTime(b.Date));
  }, [filteredLogs]);

  const handlePdfSave = () => {
    if (filteredLogs.length === 0) {
      showToast('لا توجد بيانات للطباعة', 'error');
      return;
    }

    const style = document.createElement('style');
    style.id = 'print-portrait-style';
    style.innerHTML = `@media print { @page { size: portrait !important; margin: 15mm 15mm 15mm 15mm !important; } }`;
    document.head.appendChild(style);

    const monthName =
      selectedMonth === 'الكل'
        ? 'سنوي'
        : ARABIC_MONTHS[parseInt(selectedMonth, 10) - 1] || selectedMonth;
    document.title = `سجل_التدريب_${filterCat}_${monthName}_${selectedYear}`;

    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();

    setTimeout(() => {
      window.focus();
      window.print();
      setTimeout(() => {
        const override = document.getElementById('print-portrait-style');
        if (override) override.remove();
      }, 1000);
    }, 500);
  };

  return (
    <div className="space-y-4 lg:space-y-6 fade-in p-4 lg:p-6 pb-24 lg:pb-6 h-full flex flex-col print:block print:h-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 slide-up no-print">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-slate-800">سجل التدريب</h2>
          <p className="text-slate-500 text-sm no-print">أرشيف الجلسات التدريبية لعام {selectedYear}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm w-full md:w-auto items-center">
          <div className="flex gap-2 w-full md:w-auto no-print">
            <button onClick={handlePdfSave} className="btn-secondary hover:bg-slate-50 flex-1 md:flex-none justify-center px-3">
              <Icons.Download /> <span className="whitespace-nowrap">PDF</span>
            </button>
            <button
              onClick={() => {
                const monthName =
                  selectedMonth === 'الكل'
                    ? 'سنوي'
                    : ARABIC_MONTHS[parseInt(selectedMonth, 10) - 1] || selectedMonth;
                exportHTMLToWord('logs-print-area', `سجل_التدريب_${filterCat}_${monthName}_${selectedYear}`);
              }}
              className="btn-secondary hover:bg-indigo-50 hover:text-indigo-600 flex-1 md:flex-none justify-center px-3"
            >
              <Icons.Download /> <span className="whitespace-nowrap">Word</span>
            </button>
          </div>
          <div className="flex items-center gap-2 no-print flex-wrap">
            <div className="bg-slate-100 text-slate-700 px-3.5 py-2 rounded-xl font-bold text-xs border border-slate-200 shadow-sm flex items-center gap-2 whitespace-nowrap">
              <span className="text-indigo-700 font-extrabold">{groupedLogsForPrint.length} جلسة تدريبية</span>
              <span className="text-slate-300">|</span>
              <span>{filteredLogs.length} حضور متدرب</span>
            </div>
            <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200 shadow-inner">
              <button
                type="button"
                onClick={() => setHistoryViewMode('sessions')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  historyViewMode === 'sessions'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                كشوف الجلسات
              </button>
              <button
                type="button"
                onClick={() => setHistoryViewMode('table')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  historyViewMode === 'table'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                جدول السجلات
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="card p-3 no-print slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1 group">
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث في السجلات (المتدرب، السياسة، المدرب)..."
              className="input-base pl-10 bg-white text-sm group-hover:shadow-sm"
            />
            <div className="absolute right-3 top-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors">
              <Icons.Search />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 pb-1">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 hover:border-indigo-300 transition-all shadow-sm">
              <span className="text-xs font-bold text-slate-400 whitespace-nowrap">السنة:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="bg-transparent outline-none text-xs lg:text-sm font-bold text-indigo-700 cursor-pointer min-w-[75px]"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 hover:border-indigo-300 transition-all shadow-sm">
              <span className="text-xs font-bold text-slate-400 whitespace-nowrap">الشهر:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent outline-none text-xs lg:text-sm font-bold text-slate-700 cursor-pointer min-w-[100px]"
              >
                <option value="الكل">كل الشهور</option>
                {ARABIC_MONTHS.map((mName, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {idx + 1} - {mName}
                  </option>
                ))}
              </select>
            </div>

            <select
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
              className="input-base w-auto min-w-[120px] bg-white cursor-pointer text-sm hover:border-indigo-300 font-bold"
            >
              <option value="الكل">كل الفئات</option>
              {data.categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* View Mode 1: Grouped Training Sessions Cards */}
      {historyViewMode === 'sessions' && (
        <div className="flex-1 space-y-4 overflow-y-auto no-print slide-up" style={{ animationDelay: '0.2s' }}>
          {groupedLogsForPrint.length === 0 ? (
            <div className="card p-12 text-center text-slate-400 bg-white">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <Icons.History />
              </div>
              <p className="font-bold text-base text-slate-600 mb-1">لا توجد جلسات تدريبية مطابقة للبحث</p>
              <p className="text-xs text-slate-400">جرب تغيير فلتر السنة أو الشهر أو الفئة، أو كتابة كلمة بحث أخرى</p>
            </div>
          ) : (
            groupedLogsForPrint.map((group, gIdx) => (
              <div key={gIdx} className="card p-4 lg:p-5 hover:shadow-md transition-all duration-200 border-slate-200/80 bg-white group">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                      📅 {formatHistoryDateWithWeekday(group.Date)}
                    </span>
                    <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      🏷️ {group.Category}
                    </span>
                    <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                      👥 {group.records.length} متدرب
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 self-end lg:self-auto flex-wrap">
                    <button
                      type="button"
                      onClick={() => group.records[0] && openAddTraineesModal(group.records[0])}
                      title="إضافة متدربين جدد لهذه الجلسة المحفوظة"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors border border-emerald-200 shadow-2xs"
                    >
                      <Icons.UserPlus />
                      <span>إضافة متدربين</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => group.records[0] && openEditPoliciesModal(group.records[0])}
                      title="تعديل السياسات لكافة المتدربين في هذه الجلسة"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors border border-indigo-200 shadow-2xs"
                    >
                      <Icons.Edit />
                      <span>تعديل السياسات</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => group.records[0] && openEditTrainerModal(group.records[0])}
                      title="تعديل المدرب لكافة المتدربين في هذه الجلسة"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors border border-indigo-200 shadow-2xs"
                    >
                      <Icons.Edit />
                      <span>تعديل المدرب</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => group.records[0] && openDeleteSessionModal(group.records[0], false)}
                      title="حذف هذه الجلسة التدريبية بالكامل"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors border border-rose-200 shadow-2xs"
                    >
                      <Icons.Trash />
                      <span>حذف الجلسة</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 text-xs">
                  <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-slate-400 font-semibold block mb-0.5">الموضوع (السياسات المشروحة):</span>
                    <span className="font-bold text-slate-800 text-sm leading-relaxed">{group.Policies}</span>
                  </div>
                  <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-slate-400 font-semibold block mb-0.5">القائم بالتدريب:</span>
                    <span className="font-bold text-indigo-900 text-sm">{group.Trainer || 'غير محدد'}</span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-500">
                      المتدربون الحاضرون في هذه الجلسة ({group.records.length}):
                    </span>
                    <button
                      type="button"
                      onClick={() => group.records[0] && openAddTraineesModal(group.records[0])}
                      title="إضافة متدربين جدد لهذه الجلسة"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors border border-emerald-200 shadow-2xs"
                    >
                      <Icons.UserPlus />
                      <span>+ إضافة متدربين للجلسة</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {group.records.map((rec, rIdx) => {
                      const emp = (data.employees || []).find(
                        (e) => (e.Name || '').trim() === (rec.TraineeName || '').trim()
                      );
                      const job = (emp?.Job || '').trim() || (emp?.Category || '').trim() || rec.Category;
                      return (
                        <div
                          key={rIdx}
                          className="flex items-center justify-between gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200/70 hover:border-slate-300 transition-colors text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-800 truncate" title={rec.TraineeName}>
                              {rIdx + 1}. {rec.TraineeName}
                            </div>
                            {job && <div className="text-[10px] text-slate-400 truncate">{job}</div>}
                          </div>
                          <button
                            type="button"
                            onClick={() => openDeleteSessionModal(rec, true)}
                            title={`حذف المتدرب (${rec.TraineeName}) فقط من هذه الجلسة`}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
                          >
                            <Icons.Trash />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* View Mode 2: Detailed Flat Records Table */}
      {historyViewMode === 'table' && (
        <div className="card flex-1 overflow-hidden flex flex-col no-print slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-right border-collapse min-w-[650px]">
              <thead className="bg-slate-50/80 sticky top-0 backdrop-blur-sm z-10 border-b border-slate-200">
                <tr>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-[10px] lg:text-xs font-bold text-slate-500 uppercase tracking-wider">التاريخ</th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-[10px] lg:text-xs font-bold text-slate-500 uppercase tracking-wider">المتدرب</th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-[10px] lg:text-xs font-bold text-slate-500 uppercase tracking-wider">الفئة</th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-[10px] lg:text-xs font-bold text-slate-500 uppercase tracking-wider">الموضوع</th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-[10px] lg:text-xs font-bold text-slate-500 uppercase tracking-wider">المدرب</th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-[10px] lg:text-xs font-bold text-slate-500 uppercase tracking-wider text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((l, i) => (
                  <tr key={i} className="group hover:bg-indigo-50/40 transition-colors duration-150 cursor-default">
                    <td className="px-4 lg:px-6 py-3 lg:py-4 text-xs lg:text-sm text-slate-500 font-medium whitespace-nowrap">
                      {formatHistoryDate(l.Date)}
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4">
                      <div className="font-bold text-slate-800 text-sm lg:text-base group-hover:text-indigo-700 transition-colors">
                        {l.TraineeName}
                      </div>
                      {(() => {
                        const emp = (data.employees || []).find(
                          (e) => (e.Name || '').trim() === (l.TraineeName || '').trim()
                        );
                        const job = (emp?.Job || '').trim() || (emp?.Category || '').trim() || l.Category;
                        return job ? <div className="text-[10px] text-slate-400 font-medium no-print">{job}</div> : null;
                      })()}
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] lg:text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap group-hover:bg-white group-hover:border-indigo-200 transition-colors">
                        {l.Category}
                      </span>
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs lg:text-sm text-slate-600 font-medium max-w-[150px] lg:max-w-[200px] truncate" title={l.Policies}>
                          {l.Policies}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditPoliciesModal(l);
                          }}
                          title="تعديل السياسات لكافة المتدربين في هذه الجلسة"
                          className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors border border-transparent hover:border-indigo-100 shrink-0"
                        >
                          <Icons.Edit />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs lg:text-sm text-slate-700 font-bold">{l.Trainer || 'غير محدد'}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditTrainerModal(l);
                          }}
                          title="تعديل المدرب لكافة المتدربين في هذه الجلسة"
                          className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors border border-transparent hover:border-indigo-100"
                        >
                          <Icons.Edit />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openAddTraineesModal(l);
                          }}
                          title="إضافة متدربين جدد لهذه الجلسة"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors border border-transparent hover:border-emerald-100"
                        >
                          <Icons.UserPlus />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDeleteSessionModal(l, false);
                          }}
                          title="حذف هذه الجلسة التدريبية بالكامل"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors border border-transparent hover:border-rose-100"
                        >
                          <Icons.Trash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      لا توجد سجلات لعام {selectedYear} مطابقة لبحثك
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Print Mode Content */}
      <div id="logs-print-area" className="print-only w-full">
        {groupedLogsForPrint.map((group, index) => (
          <div key={index} className="w-full" style={{ pageBreakAfter: 'always', marginBottom: '40px' }}>
            <PrintHeader
              title="كشف حضور تدريب"
              subtitle={`عام ${selectedYear}${
                selectedMonth !== 'الكل' ? ` - شهر ${ARABIC_MONTHS[parseInt(selectedMonth, 10) - 1]}` : ''
              }`}
              hospitalName={hospitalName}
              hospitalLogo={hospitalLogo}
              hospitalLogoLeft={hospitalLogoLeft}
            />

            <div className="flex flex-col gap-3 mb-6 mt-4 border-b-2 border-slate-800 pb-4">
              <div className="flex justify-between items-center text-sm lg:text-base font-bold text-slate-800">
                <p>اليوم والتاريخ: {formatHistoryDateWithWeekday(group.Date)}</p>
                <p>الفئة المستهدفة: {group.Category}</p>
              </div>
              <div className="flex justify-between items-center text-sm lg:text-base font-bold text-slate-800">
                <div className="flex items-center gap-2">
                  <p>الموضوع (السياسات): {group.Policies}</p>
                  <button
                    type="button"
                    onClick={() => group.records[0] && openEditPoliciesModal(group.records[0])}
                    title="تعديل السياسات لكافة المتدربين في هذا الكشف"
                    className="no-print inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors border border-indigo-200"
                  >
                    <Icons.Edit />
                    <span>تعديل السياسات</span>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <p>المدرب: {group.Trainer}</p>
                  <div className="flex items-center gap-1.5 no-print">
                    <button
                      type="button"
                      onClick={() => group.records[0] && openAddTraineesModal(group.records[0])}
                      title="إضافة متدربين جدد لهذا الكشف"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors border border-emerald-200"
                    >
                      <Icons.UserPlus />
                      <span>إضافة متدربين</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => group.records[0] && openEditTrainerModal(group.records[0])}
                      title="تعديل المدرب لكافة المتدربين في هذا الكشف"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors border border-indigo-200"
                    >
                      <Icons.Edit />
                      <span>تعديل المدرب</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => group.records[0] && openDeleteSessionModal(group.records[0], false)}
                      title="حذف هذه الجلسة التدريبية بالكامل"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors border border-rose-200"
                    >
                      <Icons.Trash />
                      <span>حذف الجلسة</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <table className="w-full text-right border-collapse print-table">
              <thead>
                <tr className="bg-slate-100">
                  <th className="px-4 py-3 font-bold text-slate-800 border border-slate-300 w-12 text-center">م</th>
                  <th className="px-4 py-3 font-bold text-slate-800 border border-slate-300 w-[30%]">الاسم</th>
                  <th className="px-4 py-3 font-bold text-slate-800 border border-slate-300 w-[30%]">الوظيفة</th>
                  <th className="px-4 py-3 font-bold text-slate-800 border border-slate-300 w-[25%]">التوقيع</th>
                </tr>
              </thead>
              <tbody>
                {group.records.map((r, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3 border border-slate-300 text-center text-sm">{i + 1}</td>
                    <td className="px-4 py-3 border border-slate-300 font-bold text-sm print-trainee-name">{r.TraineeName}</td>
                    <td className="px-4 py-3 border border-slate-300 text-sm">
                      {(data.employees || []).find((e) => (e.Name || '').trim() === (r.TraineeName || '').trim())?.Job?.trim() || r.Category}
                    </td>
                    <td className="px-4 py-3 border border-slate-300 text-center"></td>
                  </tr>
                ))}
              </tbody>
              <tfoot style={{ display: 'table-footer-group' }}>
                <tr>
                  <td colSpan={4} style={{ border: 'none', padding: '0', paddingTop: '20px' }}>
                    <PrintFooter />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ))}
      </div>

      {/* Modal for Editing Session Trainer */}
      {editingSession && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-6 sm:pt-8 md:pt-10 bg-slate-900/60 backdrop-blur-xs fade-in no-print overflow-y-auto"
          onClick={() => !isUpdatingTrainer && setEditingSession(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 slide-up space-y-4 text-right mb-8"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Icons.Edit />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base lg:text-lg">تعديل المدرب لكشف التدريب</h3>
                  <p className="text-xs text-slate-400">تحديث القائم بالتدريب لجميع المتدربين في هذه الجلسة</p>
                </div>
              </div>
              <button
                type="button"
                disabled={isUpdatingTrainer}
                onClick={() => setEditingSession(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-500 font-medium">تاريخ الجلسة:</span>
                <span className="font-bold text-slate-800">{formatHistoryDateWithWeekday(editingSession.date)}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-500 font-medium">الفئة المستهدفة:</span>
                <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{editingSession.category}</span>
              </div>
              <div className="flex justify-between items-start py-0.5">
                <span className="text-slate-500 font-medium">الموضوع (السياسات):</span>
                <span className="font-bold text-slate-800 max-w-[260px] text-right">{editingSession.policies}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-500 font-medium">المدرب الحالي:</span>
                <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                  {editingSession.currentTrainer || 'غير محدد'}
                </span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-t border-slate-200/70 pt-1.5">
                <span className="text-slate-500 font-medium">المتدربون المسجلون في الجلسة:</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {editingSession.traineeNames.length} متدرب
                </span>
              </div>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 text-indigo-800 p-3 rounded-xl text-xs flex items-start gap-2">
              <span className="font-bold text-base leading-none">ℹ</span>
              <span>
                سيتم تحديث اسم المدرب تلقائياً لدى جميع المتدربين في هذا الكشف ({editingSession.traineeNames.length} متدرب) في قاعدة البيانات فور الضغط على حفظ.
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>اختر المدرب الجديد من قائمة المدربين:</span>
                  <span className="text-[10px] text-slate-400 font-medium">({trainersList.length} مدرب متاح)</span>
                </label>
                <select
                  value={selectedNewTrainer}
                  onChange={(e) => setSelectedNewTrainer(e.target.value)}
                  className="input-base text-sm font-bold bg-white text-slate-800 cursor-pointer border-slate-200 hover:border-indigo-300 focus:border-indigo-500"
                >
                  <option value="">-- اضغط هنا للاختيار من قائمة المدربين --</option>
                  {trainersList.map((t) => (
                    <option key={t} value={t}>
                      {t} {t === editingSession.currentTrainer ? '(المدرب الحالي للجلسة)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {trainersList.length > 0 ? (
                <div>
                  <span className="text-[11px] font-bold text-slate-500 block mb-1.5">أو اضغط مباشرة على اسم المدرب من القائمة:</span>
                  <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1 scrollbar-thin">
                    {trainersList.map((t) => {
                      const isSelected = selectedNewTrainer === t;
                      const isCurrent = editingSession.currentTrainer === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setSelectedNewTrainer(t)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm scale-105 ring-2 ring-indigo-200'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50'
                          }`}
                        >
                          <span>{t}</span>
                          {isCurrent && (
                            <span
                              className={`text-[9px] px-1 py-0.2 rounded font-semibold ${
                                isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              الحالي
                            </span>
                          )}
                          {isSelected && <Icons.Check />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 p-2.5 rounded-xl">
                  لا توجد أسماء مدربين مسجلة في الإعدادات. يمكنك إضافة مدربين من صفحة الإعدادات.
                </div>
              )}

              {selectedNewTrainer && selectedNewTrainer !== editingSession.currentTrainer && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 rounded-xl text-xs flex items-center justify-between">
                  <span className="font-medium">المدرب المختار للاعتماد:</span>
                  <span className="font-bold text-sm bg-white text-emerald-900 px-2.5 py-0.5 rounded-lg border border-emerald-300 shadow-2xs">
                    {selectedNewTrainer}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isUpdatingTrainer}
                onClick={() => setEditingSession(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isUpdatingTrainer}
                onClick={handleSaveTrainerUpdate}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md shadow-indigo-100 flex items-center gap-1.5 disabled:opacity-50"
              >
                {isUpdatingTrainer ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>جاري التحديث...</span>
                  </>
                ) : (
                  <>
                    <Icons.Check />
                    <span>حفظ وتحديث المدرب</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Editing Session Policies */}
      {editingPoliciesSession && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-6 sm:pt-8 md:pt-10 bg-slate-900/60 backdrop-blur-xs fade-in no-print overflow-y-auto"
          onClick={() => !isUpdatingPolicies && setEditingPoliciesSession(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 slide-up space-y-4 text-right mb-8"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Icons.Edit />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base lg:text-lg">تعديل السياسات لكشف التدريب</h3>
                  <p className="text-xs text-slate-400">تحديث موضوع التدريب (السياسات) لجميع المتدربين في هذه الجلسة</p>
                </div>
              </div>
              <button
                type="button"
                disabled={isUpdatingPolicies}
                onClick={() => setEditingPoliciesSession(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-500 font-medium">تاريخ الجلسة:</span>
                <span className="font-bold text-slate-800">{formatHistoryDateWithWeekday(editingPoliciesSession.date)}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-500 font-medium">الفئة المستهدفة:</span>
                <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                  {editingPoliciesSession.category}
                </span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-500 font-medium">المدرب:</span>
                <span className="font-bold text-slate-800">{editingPoliciesSession.trainer || 'غير محدد'}</span>
              </div>
              <div className="flex justify-between items-start py-0.5">
                <span className="text-slate-500 font-medium">السياسات الحالية المسجلة:</span>
                <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 max-w-[240px] text-right">
                  {editingPoliciesSession.policies}
                </span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-t border-slate-200/70 pt-1.5">
                <span className="text-slate-500 font-medium">المتدربون المسجلون في الجلسة:</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {editingPoliciesSession.traineeNames.length} متدرب
                </span>
              </div>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 text-indigo-800 p-3 rounded-xl text-xs flex items-start gap-2">
              <span className="font-bold text-base leading-none">ℹ</span>
              <span>
                سيتم تحديث السياسات تلقائياً لدى جميع المتدربين في هذا الكشف ({editingPoliciesSession.traineeNames.length} متدرب) في قاعدة البيانات فور الضغط على حفظ.
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">السياسات المختارة للاعتماد حالياً:</label>
                  <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                    {selectedPoliciesList.length} سياسة
                  </span>
                </div>
                {selectedPoliciesList.length > 0 ? (
                  <div className="flex flex-wrap gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 min-h-[46px] max-h-36 overflow-y-auto scrollbar-thin">
                    {selectedPoliciesList.map((pol) => (
                      <span
                        key={pol}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-white text-indigo-900 border border-indigo-200 rounded-xl text-xs font-bold shadow-2xs group hover:border-rose-300 transition-colors"
                      >
                        <span className="truncate max-w-[260px]">{pol}</span>
                        <button
                          type="button"
                          onClick={() => removePolicyFromSelection(pol)}
                          title="إزالة هذه السياسة"
                          className="w-4 h-4 rounded-full bg-slate-100 hover:bg-rose-500 hover:text-white text-slate-500 flex items-center justify-center text-[10px] transition-colors"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-xl text-center font-bold">
                    لم يتم اختيار أي سياسة بعد. يرجى اختيار سياسة أو إضافتها أدناه.
                  </div>
                )}
              </div>

              {sessionPlannedPolicies.length > 0 && (
                <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <span>📅</span>
                      <span>السياسات المخططة لفئة {editingPoliciesSession.category} (خطة الشهر):</span>
                    </span>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded">
                      {sessionPlannedPolicies.length} في الخطة
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {sessionPlannedPolicies.map((p) => {
                      const isSelected = selectedPoliciesList.includes(p);
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => togglePolicySelection(p)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 ${
                            isSelected
                              ? 'bg-amber-600 text-white border-amber-600 shadow-2xs scale-102'
                              : 'bg-white text-amber-900 border-amber-200 hover:border-amber-400 hover:bg-amber-50'
                          }`}
                        >
                          <span>{p}</span>
                          {isSelected ? <Icons.Check /> : <span className="text-[10px] opacity-60">+</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>اختيار من قائمة سياسات المستشفى:</span>
                  <span className="text-[10px] text-slate-400 font-medium">({allHospitalPolicies.length} سياسة متاحة)</span>
                </label>
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) togglePolicySelection(e.target.value);
                  }}
                  className="input-base text-sm font-bold bg-white text-slate-800 cursor-pointer border-slate-200 hover:border-indigo-300 focus:border-indigo-500 mb-2"
                >
                  <option value="">-- اضغط هنا لاختيار سياسة وإضافتها --</option>
                  {allHospitalPolicies.map((p) => (
                    <option key={p} value={p}>
                      {p} {selectedPoliciesList.includes(p) ? '✓ (محددة بالفعل)' : ''}
                    </option>
                  ))}
                </select>

                <div className="space-y-1.5">
                  <input
                    type="text"
                    value={policySearchTerm}
                    onChange={(e) => setPolicySearchTerm(e.target.value)}
                    placeholder="بحث سريع في قائمة السياسات..."
                    className="input-base text-xs py-1.5 px-3 bg-slate-50 hover:bg-white focus:bg-white"
                  />
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1.5 bg-slate-50/70 rounded-xl border border-slate-200 scrollbar-thin">
                    {allHospitalPolicies
                      .filter((p) => !policySearchTerm || p.toLowerCase().includes(policySearchTerm.toLowerCase()))
                      .slice(0, 30)
                      .map((p) => {
                        const isSelected = selectedPoliciesList.includes(p);
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => togglePolicySelection(p)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50'
                            }`}
                          >
                            <span>{p}</span>
                            {isSelected ? <Icons.Check /> : <span className="text-[10px] text-slate-400">+</span>}
                          </button>
                        );
                      })}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  أو كتابة موضوع / سياسة مخصصة غير موجودة بالقائمة:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customPolicyInput}
                    onChange={(e) => setCustomPolicyInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomPolicy();
                      }
                    }}
                    placeholder="اكتب اسم السياسة أو الموضوع هنا..."
                    className="input-base text-xs py-2 flex-1"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomPolicy}
                    disabled={!customPolicyInput.trim()}
                    className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-100 transition-colors whitespace-nowrap flex items-center gap-1"
                  >
                    <Icons.Plus />
                    <span>إضافة</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isUpdatingPolicies}
                onClick={() => setEditingPoliciesSession(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isUpdatingPolicies || selectedPoliciesList.length === 0}
                onClick={handleSavePoliciesUpdate}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md shadow-indigo-100 flex items-center gap-1.5 disabled:opacity-50"
              >
                {isUpdatingPolicies ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>جاري التحديث...</span>
                  </>
                ) : (
                  <>
                    <Icons.Check />
                    <span>حفظ وتحديث السياسات</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Deleting Training Session */}
      {deletingSession && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-6 sm:pt-8 md:pt-10 bg-slate-900/60 backdrop-blur-xs fade-in no-print overflow-y-auto"
          onClick={() => !isDeletingSession && setDeletingSession(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-rose-100 slide-up space-y-4 text-right mb-8"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <Icons.Trash />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base lg:text-lg">حذف جلسة تدريبية</h3>
                  <p className="text-xs text-slate-400">تأكيد حذف الجلسة وسجلات الحضور المرتبطة بها</p>
                </div>
              </div>
              <button
                type="button"
                disabled={isDeletingSession}
                onClick={() => setDeletingSession(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl text-xs flex items-start gap-2.5">
              <span className="font-bold text-base leading-none text-rose-600">⚠️</span>
              <div className="space-y-1">
                <span className="font-bold block">تحذير مهم لا يمكن التراجع عنه:</span>
                <span className="text-rose-700 leading-relaxed block">
                  {deleteMode === 'session'
                    ? `سيتم حذف هذه الجلسة التدريبية نهائياً مع كافة سجلات حضور جميع المتدربين المسجلين بها (${deletingSession.traineeNames.length} متدرب).`
                    : `سيتم حذف سجل حضور المتدرب (${deletingSession.currentTrainee}) فقط من هذه الجلسة.`}
                </span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-500 font-medium">تاريخ الجلسة:</span>
                <span className="font-bold text-slate-800">{formatHistoryDateWithWeekday(deletingSession.date)}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-500 font-medium">الفئة المستهدفة:</span>
                <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                  {deletingSession.category}
                </span>
              </div>
              <div className="flex justify-between items-start py-0.5">
                <span className="text-slate-500 font-medium">الموضوع / السياسات:</span>
                <span className="font-bold text-slate-800 max-w-[260px] text-right">{deletingSession.policies}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-500 font-medium">المدرب:</span>
                <span className="font-bold text-slate-700">{deletingSession.trainer || 'غير محدد'}</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-t border-slate-200/70 pt-1.5">
                <span className="text-slate-500 font-medium">إجمالي المتدربين بالجلسة:</span>
                <span className="font-bold text-slate-800 bg-white px-2.5 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                  {deletingSession.traineeNames.length} متدرب
                </span>
              </div>
            </div>

            {deletingSession.currentTrainee && (
              <div className="space-y-1.5 pt-1">
                <span className="text-xs font-bold text-slate-700 block">نطاق الحذف المطلوب:</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeleteMode('session')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-right ${
                      deleteMode === 'session'
                        ? 'bg-rose-50 border-rose-300 text-rose-800 ring-2 ring-rose-200'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span>حذف الجلسة بالكامل</span>
                      {deleteMode === 'session' && <span className="text-rose-600 font-black">✓</span>}
                    </div>
                    <span className="text-[10px] text-slate-400 font-normal block">
                      حذف الجلسة لجميع المتدربين ({deletingSession.traineeNames.length})
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteMode('single')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-right ${
                      deleteMode === 'single'
                        ? 'bg-rose-50 border-rose-300 text-rose-800 ring-2 ring-rose-200'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span>حذف هذا المتدرب فقط</span>
                      {deleteMode === 'single' && <span className="text-rose-600 font-black">✓</span>}
                    </div>
                    <span className="text-[10px] text-slate-400 font-normal block truncate">
                      المتدرب: {deletingSession.currentTrainee}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {deleteMode === 'session' && deletingSession.traineeNames.length > 0 && (
              <div>
                <span className="text-[11px] font-bold text-slate-500 block mb-1">
                  قائمة المتدربين الذين سيتم حذف حضورهم:
                </span>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1.5 bg-slate-50 rounded-xl border border-slate-200 scrollbar-thin">
                  {deletingSession.traineeNames.map((name, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-white border border-slate-200 text-slate-700 rounded-md text-[10px] font-medium">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeletingSession}
                onClick={() => setDeletingSession(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                إلغاء وتراجع
              </button>
              <button
                type="button"
                disabled={isDeletingSession}
                onClick={handleConfirmDelete}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-md shadow-rose-100 flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeletingSession ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>جاري الحذف...</span>
                  </>
                ) : (
                  <>
                    <Icons.Trash />
                    <span>
                      {deleteMode === 'session'
                        ? `تأكيد حذف الجلسة (${deletingSession.traineeNames.length} متدرب)`
                        : `تأكيد حذف المتدرب (${deletingSession.currentTrainee})`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Adding Trainees to Session */}
      {addingTraineesSession && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 pt-6 sm:pt-8 md:pt-10 bg-slate-900/60 backdrop-blur-xs fade-in no-print overflow-y-auto"
          onClick={() => !isSavingNewTrainees && setAddingTraineesSession(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-100 slide-up space-y-4 text-right mb-8"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Icons.UserPlus />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base lg:text-lg">إضافة متدربين إلى الجلسة المحفوظة</h3>
                  <p className="text-xs text-slate-400">إدراج متدربين جدد في كشف التدريب المحفوظ وتحديث نسب التغطية تلقائياً</p>
                </div>
              </div>
              <button
                type="button"
                disabled={isSavingNewTrainees}
                onClick={() => setAddingTraineesSession(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-500 font-medium">تاريخ الجلسة:</span>
                <span className="font-bold text-slate-800">{formatHistoryDateWithWeekday(addingTraineesSession.date)}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-500 font-medium">الفئة المستهدفة:</span>
                <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                  {addingTraineesSession.category}
                </span>
              </div>
              <div className="flex justify-between items-start py-0.5">
                <span className="text-slate-500 font-medium">الموضوع (السياسات):</span>
                <span className="font-bold text-slate-800 max-w-[320px] text-right">{addingTraineesSession.policies}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-500 font-medium">القائم بالتدريب:</span>
                <span className="font-bold text-slate-800">{addingTraineesSession.trainer || 'غير محدد'}</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-t border-slate-200/70 pt-1.5">
                <span className="text-slate-500 font-medium">المتدربون المسجلون حالياً:</span>
                <span className="font-bold text-slate-700 bg-white px-2.5 py-0.5 rounded-full border border-slate-200">
                  {addingTraineesSession.existingTraineeNames.length} متدرب مسجل بالفعل
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setFilterTraineeCategory('same')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      filterTraineeCategory === 'same'
                        ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    فئة {addingTraineesSession.category} فقط
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTraineeCategory('all')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      filterTraineeCategory === 'all'
                        ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    جميع موظفي المستشفى
                  </button>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  {unrecordedCandidates.length > 0 && (
                    <button
                      type="button"
                      onClick={handleSelectAllCandidates}
                      className="px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-100"
                    >
                      تحديد كل المتاحين ({unrecordedCandidates.length})
                    </button>
                  )}
                  {selectedNewTrainees.length > 0 && (
                    <button
                      type="button"
                      onClick={handleDeselectAllCandidates}
                      className="px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-100"
                    >
                      إلغاء التحديد
                    </button>
                  )}
                </div>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={traineeSearchTerm}
                  onChange={(e) => setTraineeSearchTerm(e.target.value)}
                  placeholder="ابحث بالاسم أو الوظيفة لاختيار المتدرب..."
                  className="input-base text-xs py-2 px-3 pl-8 bg-slate-50 hover:bg-white focus:bg-white w-full"
                />
                {traineeSearchTerm && (
                  <button
                    type="button"
                    onClick={() => setTraineeSearchTerm('')}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="border border-slate-200 rounded-xl p-2 bg-slate-50/50">
                <div className="flex items-center justify-between px-1 py-1 mb-1.5 text-xs">
                  <span className="font-bold text-slate-700">اختر المتدربين من القائمة أدناه:</span>
                  <span
                    className={`font-bold px-2.5 py-0.5 rounded-full text-xs transition-colors ${
                      selectedNewTrainees.length > 0
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    محدد للإضافة: {selectedNewTrainees.length} متدرب
                  </span>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-1.5 p-1 scrollbar-thin">
                  {candidateEmployeesForSession.length > 0 ? (
                    candidateEmployeesForSession.map((emp) => {
                      const empName = String(emp.Name || '').trim();
                      const isAlreadyIn = addingTraineesSession.existingTraineeNames.includes(empName);
                      const isSelected = selectedNewTrainees.includes(empName);

                      if (isAlreadyIn) {
                        return (
                          <div
                            key={emp.ID || empName}
                            className="flex items-center justify-between p-2 rounded-xl bg-slate-100/80 border border-slate-200 text-slate-400 text-xs select-none opacity-80"
                          >
                            <div className="min-w-0 flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[10px] shrink-0 font-bold">
                                ✓
                              </span>
                              <div className="truncate">
                                <span className="font-bold text-slate-600 block truncate">{empName}</span>
                                <span className="text-[10px] text-slate-400 block truncate">
                                  {emp.Job || emp.Category || 'موظف'}
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold bg-white text-slate-500 px-2 py-0.5 rounded-md border border-slate-200 shrink-0">
                              مسجل بالفعل بالجلسة
                            </span>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={emp.ID || empName}
                          onClick={() => toggleSelectNewTrainee(empName)}
                          className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-emerald-50 border-emerald-400 text-emerald-950 shadow-2xs ring-2 ring-emerald-200'
                              : 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/20 text-slate-700'
                          }`}
                        >
                          <div className="min-w-0 flex items-center gap-2.5">
                            <div
                              className={`w-5 h-5 rounded-md flex items-center justify-center text-xs transition-colors ${
                                isSelected ? 'bg-emerald-600 text-white' : 'border border-slate-300 bg-slate-50'
                              }`}
                            >
                              {isSelected ? <Icons.Check /> : null}
                            </div>
                            <div className="truncate">
                              <span className={`font-bold block truncate ${isSelected ? 'text-emerald-950' : 'text-slate-800'}`}>
                                {empName}
                              </span>
                              <span className="text-[10px] text-slate-400 block truncate">
                                {emp.Job || emp.Category || 'موظف'}{' '}
                                {filterTraineeCategory === 'all' && emp.Category ? `(${emp.Category})` : ''}
                              </span>
                            </div>
                          </div>
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-lg shrink-0 ${
                              isSelected ? 'bg-emerald-600 text-white' : 'text-slate-400 bg-slate-100'
                            }`}
                          >
                            {isSelected ? 'محدد' : '+ تحديد'}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-6 text-slate-400 text-xs">لا يوجد موظفون مطابقون لمعايير البحث</div>
                  )}
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/70">
                {!showAddCustomTrainee ? (
                  <button
                    type="button"
                    onClick={() => setShowAddCustomTrainee(true)}
                    className="w-full py-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Icons.UserPlus />
                    <span>+ إضافة متدرب جديد غير مدرج في قائمة موظفي المستشفى</span>
                  </button>
                ) : (
                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 flex items-center gap-1">
                        <span>👤</span>
                        <span>إضافة متدرب جديد:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowAddCustomTrainee(false)}
                        className="text-slate-400 hover:text-slate-600 text-xs"
                      >
                        إلغاء ✕
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">اسم المتدرب *</label>
                        <input
                          type="text"
                          value={customTraineeName}
                          onChange={(e) => setCustomTraineeName(e.target.value)}
                          placeholder="الاسم ثلاثي أو رباعي..."
                          className="input-base text-xs py-1.5"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">الوظيفة (اختياري)</label>
                        <input
                          type="text"
                          value={customTraineeJob}
                          onChange={(e) => setCustomTraineeJob(e.target.value)}
                          placeholder="مثال: فني تمريض / طبيب مقيم..."
                          className="input-base text-xs py-1.5"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-600 font-medium">
                        <input
                          type="checkbox"
                          checked={saveCustomToEmployees}
                          onChange={(e) => setSaveCustomToEmployees(e.target.checked)}
                          className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                        />
                        <span>حفظ هذا المتدرب أيضاً في قائمة موظفي المستشفى الدائمة</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleCreateCustomTrainee}
                        disabled={!customTraineeName.trim()}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1"
                      >
                        <Icons.Check />
                        <span>إضافة وتحديد</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {selectedNewTrainees.length > 0 && (
                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900 flex items-center gap-1">
                      <span>👥</span>
                      <span>المتدربون المختارون للإضافة إلى الجلسة ({selectedNewTrainees.length}):</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleDeselectAllCandidates}
                      className="text-[10px] text-rose-600 hover:underline font-bold"
                    >
                      مسح الكل
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 scrollbar-thin">
                    {selectedNewTrainees.map((name) => (
                      <span
                        key={name}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-emerald-300 text-emerald-900 rounded-lg text-xs font-bold shadow-2xs"
                      >
                        <span>{name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSelectedTrainee(name)}
                          className="w-4 h-4 rounded-full bg-emerald-100 hover:bg-rose-500 hover:text-white text-emerald-700 flex items-center justify-center text-[10px] transition-colors"
                          title="إزالة من القائمة المختارة"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isSavingNewTrainees}
                onClick={() => setAddingTraineesSession(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isSavingNewTrainees || selectedNewTrainees.length === 0}
                onClick={handleSaveAddTrainees}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-md shadow-emerald-100 flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSavingNewTrainees ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>جاري إضافة المتدربين...</span>
                  </>
                ) : (
                  <>
                    <Icons.UserPlus />
                    <span>تأكيد إضافة ({selectedNewTrainees.length}) متدرب للجلسة</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 7. TRAINING PAGE (تسجيل تدريب جديد وإضافة متدرب سريعاً)
// ============================================================================

interface TrainingPageProps {
  data: ReportData;
  onSaveTrainingSession: (payload: SaveTrainingSessionPayload) => Promise<void>;
  onAddEmployee: (updatedEmployees: Employee[]) => Promise<void>;
}

const TrainingPage: React.FC<TrainingPageProps> = ({
  data,
  onSaveTrainingSession,
  onAddEmployee,
}) => {
  const hospitalName =
    data?.settings?.slice().reverse().find((s) => s.Type === 'Hospital_Name')?.Value ||
    DEFAULT_HOSPITAL_NAME;
  const hospitalLogo =
    data?.settings?.slice().reverse().find((s) => s.Type === 'Hospital_Logo')?.Value || '';
  const hospitalLogoLeft =
    data?.settings?.slice().reverse().find((s) => s.Type === 'Hospital_Logo_Left')?.Value || '';

  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<string>(data.categories[0] || '');
  const [selectedPolicies, setSelectedPolicies] = useState<string[]>([]);
  const [trainer, setTrainer] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [selectedTrainees, setSelectedTrainees] = useState<string[]>([]);
  const [showMobileDetails, setShowMobileDetails] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const showToast = useToast();

  // Quick add employee state
  const [newEmpName, setNewEmpName] = useState<string>('');
  const [newEmpJob, setNewEmpJob] = useState<string>('');
  const [newEmpCategory, setNewEmpCategory] = useState<string>(data.categories[0] || '');
  const [isAddingEmp, setIsAddingEmp] = useState<boolean>(false);
  const [showAddEmpForm, setShowAddEmpForm] = useState<boolean>(false);

  useEffect(() => {
    if (!category && data.categories.length > 0) {
      setCategory(data.categories[0]);
    }
  }, [category, data.categories]);

  useEffect(() => {
    if (!showAddEmpForm) {
      setNewEmpCategory(category || data.categories[0] || '');
    }
  }, [category, showAddEmpForm, data.categories]);

  const handleAddEmployee = async () => {
    if (!newEmpName.trim()) {
      return showToast('يرجى إدخال اسم الموظف', 'error');
    }
    if (!newEmpCategory) {
      return showToast('يرجى اختيار الفئة', 'error');
    }
    setIsAddingEmp(true);
    try {
      const newEmp: Employee = {
        ID: makeId(),
        Name: newEmpName.trim(),
        Job: newEmpJob.trim() || 'موظف',
        Category: newEmpCategory.trim(),
      };
      const updatedList = [...data.employees, newEmp];
      await onAddEmployee(updatedList);

      if (newEmp.Category === category) {
        setSelectedTrainees((prev) => [...prev, newEmp.Name]);
      } else {
        setCategory(newEmp.Category);
        setSelectedTrainees([newEmp.Name]);
      }

      showToast('تم إضافة الموظف وتحديده للتدريب بنجاح');
      setNewEmpName('');
      setNewEmpJob('');
      setShowAddEmpForm(false);
    } catch (e: any) {
      showToast(e?.message || 'حدث خطأ أثناء الإضافة', 'error');
    } finally {
      setIsAddingEmp(false);
    }
  };

  const currentMonth = date ? parseInt(date.split('-')[1], 10) : new Date().getMonth() + 1;
  const currentYear = date ? parseInt(date.split('-')[0], 10) : new Date().getFullYear();
  const trainers = data.settings.filter((s) => s.Type === 'Trainer').map((s) => s.Value);

  const allPlannedDaysForCategory = useMemo(() => {
    const planItem = getPlanItem(data.plan, currentMonth, category, currentYear);
    if (!planItem || !planItem.Policies) return [];

    const list = splitPolicies(planItem.Policies);
    const allDates = new Set<string>();
    list.forEach((p) => {
      const { dates } = parsePolicyDaysAndDates(p);
      dates.forEach((d) => {
        if (d) allDates.add(d);
      });
    });
    return Array.from(allDates).sort();
  }, [data.plan, category, currentMonth, currentYear]);

  const plannedDaysForCategory = useMemo(() => {
    const recordedDates = new Set<string>();
    (data.logs || []).forEach((l) => {
      if (String(l.Category || '').trim() === String(category || '').trim()) {
        const logDateStr = l.Date ? String(l.Date).split('T')[0].trim() : '';
        if (logDateStr) recordedDates.add(logDateStr);
      }
    });
    return allPlannedDaysForCategory.filter((d) => !recordedDates.has(d));
  }, [allPlannedDaysForCategory, data.logs, category]);

  useEffect(() => {
    if (plannedDaysForCategory.length > 0 && !plannedDaysForCategory.includes(date)) {
      setDate(plannedDaysForCategory[0]);
    }
  }, [category, plannedDaysForCategory]);

  const plannedPoliciesForThis = useMemo(() => {
    const planItem = getPlanItem(data.plan, currentMonth, category, currentYear);
    if (!planItem || !planItem.Policies) return [];

    const rawPolicies = splitPolicies(planItem.Policies);
    const filteredPolicies: string[] = [];
    rawPolicies.forEach((p) => {
      const { base, dates } = parsePolicyDaysAndDates(p);
      if (dates.length > 0) {
        if (dates.includes(date)) filteredPolicies.push(base);
      } else {
        filteredPolicies.push(base);
      }
    });
    return filteredPolicies;
  }, [data.plan, category, currentMonth, currentYear, date]);

  useEffect(() => {
    setSelectedPolicies([]);
  }, [plannedPoliciesForThis]);

  const filteredEmployees = useMemo(() => {
    return data.employees.filter((emp) => {
      const matchCategory = (emp.Category || '').trim() === (category || '').trim();
      if (!matchCategory) return false;
      if (!search) return true;
      const q = search.toLowerCase().trim();
      return (emp.Name || '').toLowerCase().includes(q) || (emp.Job || '').toLowerCase().includes(q);
    });
  }, [data.employees, category, search]);

  const registeredTraineesOnThisDate = useMemo(() => {
    const set = new Set<string>();
    (data.logs || []).forEach((l) => {
      const logDateStr = l.Date ? l.Date.split('T')[0] : '';
      if (logDateStr === date && l.Category === category && l.TraineeName) {
        set.add(l.TraineeName.trim());
      }
    });
    return set;
  }, [data.logs, date, category]);

  const handleSave = async () => {
    if (!selectedPolicies.length || !selectedTrainees.length || !trainer) {
      return showToast('يرجى استكمال البيانات (المتدربين، المواضيع، المدرب)', 'error');
    }
    setIsSaving(true);
    try {
      await onSaveTrainingSession({
        date,
        category,
        policies: selectedPolicies,
        trainees: selectedTrainees,
        trainer,
      });
      setSelectedTrainees([]);
      showToast('تم حفظ التدريب بنجاح');
    } catch (e: any) {
      showToast(e?.message || 'حدث خطأ أثناء الحفظ', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-4 lg:space-y-6 fade-in h-full flex flex-col lg:block pb-6 relative normal-print-content">
      <div className="print-only">
        <PrintHeader
          title="نموذج تسجيل تدريب"
          subtitle={date}
          hospitalName={hospitalName}
          hospitalLogo={hospitalLogo}
          hospitalLogoLeft={hospitalLogoLeft}
        />
      </div>

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2 slide-up no-print">
        <div className="flex justify-between items-center w-full md:w-auto">
          <div>
            <h2 className="text-xl lg:text-2xl font-bold text-slate-800">تسجيل تدريب جديد</h2>
            <p className="text-xs text-slate-400 font-medium mt-1">
              إجمالي المختارين: <span className="text-indigo-600 font-bold">{selectedTrainees.length}</span>
            </p>
          </div>
          <button
            onClick={() => setShowMobileDetails(!showMobileDetails)}
            className="lg:hidden text-indigo-600 font-bold text-xs bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-100 active:bg-indigo-100 whitespace-nowrap ml-2"
          >
            {showMobileDetails ? 'إخفاء التفاصيل' : 'تعديل التفاصيل'}
          </button>
        </div>

        <button
          onClick={handleSave}
          disabled={selectedTrainees.length === 0 || isSaving}
          className="w-full md:w-auto btn-primary py-3 px-8 text-sm lg:text-base shadow-lg shadow-indigo-500/30 transition-all duration-300 rounded-xl flex justify-center items-center order-last md:order-none"
        >
          {isSaving ? <Icons.Loading /> : <Icons.Check />}
          <span>{isSaving ? 'جاري الحفظ...' : 'اعتماد الحضور'}</span>
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start slide-up" style={{ animationDelay: '0.1s' }}>
        <div className={`lg:col-span-4 space-y-4 lg:space-y-6 ${showMobileDetails ? 'block' : 'hidden lg:block'}`}>
          <div className="card p-5 lg:p-6 space-y-4">
            <h3 className="font-bold text-slate-800 text-base lg:text-lg flex items-center gap-2">
              <span className="w-1 h-5 lg:h-6 bg-indigo-600 rounded-full"></span>
              بيانات الجلسة
            </h3>
            <div className="space-y-3 lg:space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">الفئة المستهدفة</label>
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setSelectedTrainees([]);
                  }}
                  className="input-base cursor-pointer text-sm lg:text-base hover:border-indigo-200 font-bold text-slate-700 bg-white"
                >
                  {data.categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2 flex items-center justify-between">
                  <span>أيام التدريب المخططة للفئة</span>
                  {allPlannedDaysForCategory.length > 0 && (
                    <span className="text-[10px] font-medium text-slate-400">
                      ({allPlannedDaysForCategory.length} أيام في خطة الشهر)
                    </span>
                  )}
                </label>
                {allPlannedDaysForCategory.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {allPlannedDaysForCategory.map((d) => {
                      const isSelected = date === d;
                      const isRecorded = (data.logs || []).some(
                        (l) =>
                          String(l.Category || '').trim() === String(category || '').trim() &&
                          String(l.Date || '').split('T')[0].trim() === d
                      );
                      const dateObj = new Date(d);
                      const dayNum = dateObj.getDate();
                      const monthNum = dateObj.getMonth();
                      const arabicMonth = ARABIC_MONTHS[monthNum];
                      const label = `${dayNum} ${arabicMonth}`;

                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setDate(d)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-105'
                              : isRecorded
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:border-emerald-300'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                          }`}
                        >
                          <span>{label}</span>
                          {isRecorded && !isSelected && (
                            <span className="text-[9px] text-emerald-600 bg-emerald-100/70 px-1 py-0.5 rounded font-bold">
                              مسجل
                            </span>
                          )}
                          {isSelected && <Icons.Check />}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-400 bg-slate-50 border border-dashed border-slate-200 p-2.5 rounded-xl text-center mb-2">
                    لا توجد أيام تدريب محددة في الخطة لهذا الشهر. يمكنك اختيار تاريخ يدوي أدناه.
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">تاريخ التدريب</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="input-base text-sm lg:text-base cursor-pointer hover:border-indigo-200"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">القائم بالتدريب</label>
                <select
                  value={trainer}
                  onChange={(e) => setTrainer(e.target.value)}
                  className="input-base cursor-pointer text-sm lg:text-base hover:border-indigo-200"
                >
                  <option value="">اختر المدرب...</option>
                  {trainers.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="card p-5 lg:p-6 flex flex-col max-h-[400px]">
            <h3 className="font-bold text-slate-800 text-base lg:text-lg mb-3 lg:mb-4 flex justify-between items-center">
              المواضيع
              <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg">
                تاريخ {new Date(date).getDate()} {ARABIC_MONTHS[currentMonth - 1]}
              </span>
            </h3>
            <div className="space-y-2 overflow-y-auto pr-2 flex-1 scrollbar-thin">
              {plannedPoliciesForThis.length > 0 ? (
                <div className="space-y-2">
                  {plannedPoliciesForThis.map((p) => (
                    <div
                      key={p}
                      onClick={() =>
                        selectedPolicies.includes(p)
                          ? setSelectedPolicies((x) => x.filter((v) => v !== p))
                          : setSelectedPolicies((x) => [...x, p])
                      }
                      className={`tag-select text-xs lg:text-sm ${
                        selectedPolicies.includes(p) ? 'selected' : 'unselected'
                      }`}
                    >
                      <span className="font-bold truncate leading-relaxed">{p}</span>
                      {selectedPolicies.includes(p) && <Icons.Check />}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-slate-400 py-8 flex flex-col items-center justify-center h-full">
                  <div className="mb-2 opacity-50">
                    <Icons.Plan />
                  </div>
                  <p className="text-xs">لا توجد مواضيع مخططة لهذا اليوم</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 card flex flex-col h-[65vh] lg:h-[680px]">
          <div className="p-3 lg:p-4 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-10">
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-6 bg-indigo-600 rounded-full"></span>
                <h3 className="font-bold text-slate-800 text-sm lg:text-base">
                  المستهدفون بالتدريب لفئة:{' '}
                  <span className="text-indigo-600">{category || 'لم يتم تحديد فئة'}</span>
                </h3>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => setShowAddEmpForm(!showAddEmpForm)}
                  className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-100 flex items-center justify-center gap-1 transition-all duration-200"
                >
                  <Icons.Plus />
                  <span>إضافة متدرب جديد</span>
                </button>
                <div className="relative w-full md:w-64 group">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="بحث عن اسم المتدرب..."
                    className="input-base pl-9 bg-slate-50 group-hover:bg-white text-sm py-2.5 transition-colors"
                  />
                  <div className="absolute right-3 top-3 text-slate-400 group-hover:text-indigo-500">
                    <Icons.Search />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center text-[10px] lg:text-xs font-bold text-slate-400 px-2">
              <span>
                تم اختيار{' '}
                <span key={selectedTrainees.length} className="text-indigo-600 text-sm transition-all duration-300 transform">
                  {selectedTrainees.length}
                </span>{' '}
                من المتدربين
              </span>
              <span>العدد الكلي لهذه الفئة: {filteredEmployees.length}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 lg:p-4 bg-slate-50/50">
            {showAddEmpForm && (
              <div className="bg-white border border-indigo-100 rounded-2xl p-4 lg:p-5 mb-4 shadow-sm relative overflow-hidden transition-all duration-300 slide-down">
                <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold text-slate-800 text-xs lg:text-sm flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
                    إضافة متدرب جديد لقاعدة البيانات
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddEmpForm(false);
                      setNewEmpName('');
                      setNewEmpJob('');
                    }}
                    className="text-slate-400 hover:text-slate-600 text-xs font-bold bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    إلغاء
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 mb-1">الاسم رباعي</label>
                    <input
                      type="text"
                      value={newEmpName}
                      onChange={(e) => setNewEmpName(e.target.value)}
                      placeholder="مثال: محمد أحمد علي حسن"
                      className="input-base text-xs py-2.5 bg-slate-50 hover:bg-white focus:bg-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 mb-1">الوظيفة</label>
                    <input
                      type="text"
                      value={newEmpJob}
                      onChange={(e) => setNewEmpJob(e.target.value)}
                      placeholder="مثال: فني تمريض"
                      className="input-base text-xs py-2.5 bg-slate-50 hover:bg-white focus:bg-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 mb-1">الفئة</label>
                    <select
                      value={newEmpCategory}
                      onChange={(e) => setNewEmpCategory(e.target.value)}
                      className="input-base text-xs py-2.5 bg-slate-50 hover:bg-white focus:bg-white cursor-pointer"
                    >
                      <option value="">اختر الفئة...</option>
                      {data.categories.map((catOpt) => (
                        <option key={catOpt} value={catOpt}>{catOpt}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleAddEmployee}
                    disabled={isAddingEmp || !newEmpName.trim() || !newEmpCategory}
                    className="w-full sm:w-auto px-5 py-2.5 text-xs text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-[0.98] transition-all"
                  >
                    {isAddingEmp ? <Icons.Loading /> : <Icons.Check />}
                    <span>{isAddingEmp ? 'جاري الحفظ...' : 'حفظ وإضافة للتدريب'}</span>
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 content-start">
              {filteredEmployees.map((emp) => {
                const isAlreadyRegistered = registeredTraineesOnThisDate.has(emp.Name);
                const isSelected = selectedTrainees.includes(emp.Name);
                return (
                  <div
                    key={emp.ID}
                    onClick={() =>
                      isSelected
                        ? setSelectedTrainees((x) => x.filter((v) => v !== emp.Name))
                        : setSelectedTrainees((x) => [...x, emp.Name])
                    }
                    className={`p-3 lg:p-4 rounded-xl flex justify-between items-center cursor-pointer transition-all duration-200 border ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-500 shadow-sm scale-[1.02]'
                        : 'bg-white border-transparent hover:border-indigo-200 hover:shadow-sm'
                    }`}
                  >
                    <div>
                      <div className={`font-bold text-xs lg:text-sm transition-colors ${isSelected ? 'text-indigo-700' : 'text-slate-700'}`}>
                        {emp.Name}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          {emp.Job || emp.Category || 'موظف'}
                        </span>
                        {isAlreadyRegistered && (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] px-1.5 py-0.5 rounded-md font-extrabold whitespace-nowrap">
                            تم تسجيل الحضور اليوم
                          </span>
                        )}
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 lg:w-6 lg:h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                        isSelected ? 'bg-indigo-600 border-indigo-600 scale-110' : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      {isSelected && (
                        <span className="text-white">
                          <Icons.Check />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 8. AFFIDAVITS PAGE (إفادات التدريب والشهادات المطبوعة)
// ============================================================================

interface AffidavitsPageProps {
  data: ReportData;
}

interface GroupedTraineeRow {
  key: string;
  TraineeName: string;
  Category: string;
  Job: string;
  PoliciesList: string[];
  Policies: string;
}

const AffidavitsPage: React.FC<AffidavitsPageProps> = ({ data }) => {
  const hospitalName =
    data?.settings?.slice().reverse().find((s) => s.Type === 'Hospital_Name')?.Value ||
    DEFAULT_HOSPITAL_NAME;

  const getSetting = (type: string, defaultVal: string) => {
    const s = data?.settings?.slice().reverse().find((item) => item.Type === type);
    return s !== undefined ? s.Value : defaultVal;
  };
  const hospitalLogo = getSetting('Hospital_Logo', '');
  const hospitalLogoLeft = getSetting('Hospital_Logo_Left', '');
  const icManagerTitle = getSetting('IC_Manager_Title', 'مدير فريق مكافحة العدوى');
  const icManagerName = getSetting('IC_Manager_Name', 'د/ محمود رمضان عبدالسميع');
  const hospitalManagerTitle = getSetting('Hospital_Manager_Title', 'مدير عام المستشفى');
  const hospitalManagerName = getSetting('Hospital_Manager_Name', 'أ.د/ أحمد عبدالحميد');

  const parseLogDateSafe = (dateVal: any): Date => {
    return parseFlexibleDate(dateVal) || new Date(0);
  };

  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    const curY = new Date().getFullYear();
    yearsSet.add(curY);
    yearsSet.add(curY - 1);
    yearsSet.add(curY + 1);
    (data.logs || []).forEach((l) => {
      if (l.Year) yearsSet.add(parseInt(String(l.Year), 10));
      else if (l.Date) {
        const y = parseLogDateSafe(l.Date).getFullYear();
        if (!isNaN(y) && y > 1970) yearsSet.add(y);
      }
    });
    (data.plan || []).forEach((p) => {
      if (p.Year) yearsSet.add(parseInt(String(p.Year), 10));
    });
    return Array.from(yearsSet).filter(Boolean).sort((a, b) => b - a);
  }, [data.logs, data.plan]);

  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [scopeType, setScopeType] = useState<'year' | 'month' | 'custom'>('year');
  const [selectedMonth, setSelectedMonth] = useState<number>(1);
  const [startDate, setStartDate] = useState<string>(`${new Date().getFullYear()}-01-01`);
  const [endDate, setEndDate] = useState<string>(`${new Date().getFullYear()}-12-31`);
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  const [searchTrainee, setSearchTrainee] = useState<string>('');
  const [selectedTraineeKeys, setSelectedTraineeKeys] = useState<string[]>([]);
  const [showSelectedOnly, setShowSelectedOnly] = useState<boolean>(false);
  const [showAllChips, setShowAllChips] = useState<boolean>(false);
  const [customPrintRows, setCustomPrintRows] = useState<GroupedTraineeRow[] | null>(null);
  const showToast = useToast();

  useEffect(() => {
    if (scopeType === 'year') {
      setStartDate(`${selectedYear}-01-01`);
      setEndDate(`${selectedYear}-12-31`);
    } else if (scopeType === 'month') {
      const mStr = String(selectedMonth).padStart(2, '0');
      const firstDay = `${selectedYear}-${mStr}-01`;
      const lastDayDate = new Date(selectedYear, selectedMonth, 0);
      const lastDay = `${selectedYear}-${mStr}-${String(lastDayDate.getDate()).padStart(2, '0')}`;
      setStartDate(firstDay);
      setEndDate(lastDay);
    }
  }, [selectedYear, scopeType, selectedMonth]);

  const baseGroupedData = useMemo<GroupedTraineeRow[]>(() => {
    if (!startDate || !endDate) return [];

    const start = parseLogDateSafe(startDate);
    start.setHours(0, 0, 0, 0);
    const end = parseLogDateSafe(endDate);
    end.setHours(23, 59, 59, 999);

    const activeNames = new Set(
      (data.employees || []).map((e) => (e.Name || '').trim()).filter(Boolean)
    );

    const filteredLogs = (data.logs || []).filter((l) => {
      let logYear = l.Year ? parseInt(String(l.Year), 10) : null;
      if (!logYear && l.Date) {
        const y = parseLogDateSafe(l.Date).getFullYear();
        if (!isNaN(y) && y > 1970) logYear = y;
      }
      if (logYear && logYear !== selectedYear) return false;

      const logDate = parseLogDateSafe(l.Date);
      if (!(logDate >= start && logDate <= end)) return false;

      if (
        selectedCategory !== 'الكل' &&
        String(l.Category || '').trim() !== String(selectedCategory).trim()
      ) {
        return false;
      }

      const traineeName = (l.TraineeName || '').trim();
      const isActive = activeNames.size === 0 || activeNames.has(traineeName);
      if (!isActive) return false;

      return true;
    });

    const grouped: Record<
      string,
      { key: string; TraineeName: string; Category: string; Job: string; Policies: Set<string> }
    > = {};

    filteredLogs.forEach((log) => {
      const traineeName = (log.TraineeName || '').trim();
      const category = (log.Category || '').trim();
      const key = `${traineeName}|${category}`;
      if (!grouped[key]) {
        const emp = (data.employees || []).find((e) => (e.Name || '').trim() === traineeName);
        const currentJob = (emp?.Job || '').trim() || (emp?.Category || '').trim() || category;
        const currentCategory = (emp?.Category || '').trim() || category;
        grouped[key] = {
          key,
          TraineeName: traineeName,
          Category: currentCategory,
          Job: currentJob,
          Policies: new Set(),
        };
      }
      splitPolicies(log.Policies).forEach((p) => {
        const trimmed = p.trim();
        if (trimmed) grouped[key].Policies.add(trimmed);
      });
    });

    return Object.values(grouped)
      .map((item) => ({
        key: item.key,
        TraineeName: item.TraineeName,
        Category: item.Category,
        Job: item.Job,
        PoliciesList: Array.from(item.Policies),
        Policies: Array.from(item.Policies).join('، '),
      }))
      .sort((a, b) => a.TraineeName.localeCompare(b.TraineeName, 'ar'));
  }, [data.logs, data.employees, selectedYear, startDate, endDate, selectedCategory]);

  useEffect(() => {
    const validKeys = new Set(baseGroupedData.map((item) => item.key));
    setSelectedTraineeKeys((prev) => {
      const next = prev.filter((k) => validKeys.has(k));
      return next.length === prev.length ? prev : next;
    });
  }, [baseGroupedData]);

  const selectedKeySet = useMemo(() => new Set(selectedTraineeKeys), [selectedTraineeKeys]);

  const selectedTraineeRows = useMemo(
    () => baseGroupedData.filter((item) => selectedKeySet.has(item.key)),
    [baseGroupedData, selectedKeySet]
  );

  useEffect(() => {
    if (selectedTraineeRows.length === 0 && showSelectedOnly) {
      setShowSelectedOnly(false);
    }
  }, [selectedTraineeRows.length, showSelectedOnly]);

  const searchFilteredData = useMemo(() => {
    if (!searchTrainee.trim()) return baseGroupedData;
    const q = searchTrainee.toLowerCase().trim();
    return baseGroupedData.filter(
      (item) =>
        item.TraineeName.toLowerCase().includes(q) || (item.Job || '').toLowerCase().includes(q)
    );
  }, [baseGroupedData, searchTrainee]);

  const filteredAndGroupedData = useMemo(() => {
    if (!showSelectedOnly) return searchFilteredData;
    return searchFilteredData.filter((item) => selectedKeySet.has(item.key));
  }, [searchFilteredData, showSelectedOnly, selectedKeySet]);

  const isAllVisibleSelected =
    filteredAndGroupedData.length > 0 &&
    filteredAndGroupedData.every((r) => selectedKeySet.has(r.key));
  const isSomeVisibleSelected =
    !isAllVisibleSelected && filteredAndGroupedData.some((r) => selectedKeySet.has(r.key));

  const toggleSelectTrainee = (key: string) => {
    setSelectedTraineeKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleSelectAllVisible = () => {
    if (filteredAndGroupedData.length === 0) return;
    const visibleKeys = filteredAndGroupedData.map((r) => r.key);
    if (isAllVisibleSelected) {
      const visibleSet = new Set(visibleKeys);
      setSelectedTraineeKeys((prev) => prev.filter((k) => !visibleSet.has(k)));
    } else {
      setSelectedTraineeKeys((prev) => Array.from(new Set([...prev, ...visibleKeys])));
    }
  };

  const clearSelection = () => {
    setSelectedTraineeKeys([]);
    setShowSelectedOnly(false);
    setShowAllChips(false);
  };

  const triggerCertificatesPrintWithRows = (
    rowsToPrint: GroupedTraineeRow[],
    docTitle: string,
    useOverride = false
  ) => {
    if (!rowsToPrint || rowsToPrint.length === 0) {
      showToast('لا توجد بيانات للطباعة', 'error');
      return;
    }
    setCustomPrintRows(useOverride ? rowsToPrint : null);

    const existing = document.getElementById('print-certificate-style');
    if (existing) existing.remove();
    const style = document.createElement('style');
    style.id = 'print-certificate-style';
    style.innerHTML = `@media print { @page { size: A4 portrait !important; margin: 10mm 12mm !important; } }`;
    document.head.appendChild(style);

    document.body.classList.add('print-mode-certificates');
    document.title = docTitle;
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();

    const cleanup = () => {
      document.body.classList.remove('print-mode-certificates');
      setCustomPrintRows(null);
      const override = document.getElementById('print-certificate-style');
      if (override) override.remove();
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);

    setTimeout(() => {
      window.focus();
      window.print();
      setTimeout(cleanup, 1200);
    }, 400);
  };

  const handlePrintCertificates = () => {
    if (selectedTraineeRows.length > 0) {
      triggerCertificatesPrintWithRows(
        selectedTraineeRows,
        `إفادات_المحددين_${selectedTraineeRows.length}_عام_${selectedYear}`,
        false
      );
    } else {
      triggerCertificatesPrintWithRows(
        filteredAndGroupedData,
        `إفادات_تدريب_عام_${selectedYear}_${selectedCategory}`,
        false
      );
    }
  };

  const handlePrintAllVisibleCertificates = () => {
    triggerCertificatesPrintWithRows(
      searchFilteredData,
      `إفادات_تدريب_عام_${selectedYear}_${selectedCategory}`,
      true
    );
  };

  const handlePrintSingleCertificate = (traineeRow: GroupedTraineeRow) => {
    triggerCertificatesPrintWithRows(
      [traineeRow],
      `إفادة_${traineeRow.TraineeName}_عام_${selectedYear}`,
      true
    );
  };

  const handlePrintCollectiveTable = () => {
    const rowsForTable =
      selectedTraineeRows.length > 0 ? selectedTraineeRows : filteredAndGroupedData;
    if (rowsForTable.length === 0) {
      showToast('لا توجد بيانات للطباعة', 'error');
      return;
    }
    document.title =
      selectedTraineeRows.length > 0
        ? `كشف_إفادات_المحددين_${selectedTraineeRows.length}_عام_${selectedYear}`
        : `كشف_إفادات_مجمعة_عام_${selectedYear}_${selectedCategory}`;
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setTimeout(() => {
      window.focus();
      window.print();
    }, 300);
  };

  const displayedCertificates = customPrintRows
    ? customPrintRows
    : selectedTraineeRows.length > 0
      ? selectedTraineeRows
      : filteredAndGroupedData;

  const tableRowsForPrint =
    selectedTraineeRows.length > 0 ? selectedTraineeRows : filteredAndGroupedData;
  const visibleChips = showAllChips ? selectedTraineeRows : selectedTraineeRows.slice(0, 10);

  return (
    <div className="space-y-4 lg:space-y-6 fade-in p-4 lg:p-6 pb-24 lg:pb-6 h-full flex flex-col print:block print:h-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 slide-up no-print">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-slate-800">إفادات التدريب</h2>
          <p className="text-slate-500 text-sm no-print">
            إفادات تدريب معتمدة لعام {selectedYear} — يمكنك تحديد أسماء معينة من القائمة لطباعتها فقط
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm w-full md:w-auto items-center">
          <button
            onClick={handlePrintCollectiveTable}
            className="no-print btn-secondary hover:text-indigo-600 flex-1 md:flex-none justify-center"
          >
            <Icons.Download />
            <span className="whitespace-nowrap">
              {selectedTraineeRows.length > 0
                ? `طباعة كشف المحددين (${selectedTraineeRows.length})`
                : 'طباعة الكشف المجمع'}
            </span>
          </button>
          {selectedTraineeRows.length > 0 ? (
            <>
              <button
                onClick={handlePrintCertificates}
                className="no-print bg-gradient-to-br from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/30 active:scale-[0.98] transition-all duration-200 rounded-xl font-bold py-3 px-6 flex items-center justify-center gap-2 flex-1 md:flex-none"
              >
                <Icons.Certificate />
                <span className="whitespace-nowrap">
                  طباعة إفادات المحددين ({selectedTraineeRows.length})
                </span>
              </button>
              <button
                onClick={handlePrintAllVisibleCertificates}
                className="no-print btn-secondary text-xs hover:text-indigo-600 justify-center px-3.5"
                title="طباعة جميع الأسماء الظاهرة دون مسح التحديد"
              >
                <Icons.Printer />
                <span className="whitespace-nowrap">طباعة الكل ({searchFilteredData.length})</span>
              </button>
            </>
          ) : (
            <button
              onClick={handlePrintCertificates}
              className="no-print btn-primary hover:text-white flex-1 md:flex-none justify-center"
            >
              <Icons.Certificate />
              <span className="whitespace-nowrap">
                طباعة جميع الإفادات ({filteredAndGroupedData.length})
              </span>
            </button>
          )}
          <div className="bg-slate-100 text-slate-700 px-4 py-2 rounded-xl font-bold no-print border border-slate-200 shadow-sm flex-1 md:flex-none text-center whitespace-nowrap">
            {baseGroupedData.length} متدرب
          </div>
        </div>
      </header>

      <div className="card p-4 no-print slide-up space-y-4" style={{ animationDelay: '0.1s' }}>
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 whitespace-nowrap">السنة التدريبية:</span>
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              {availableYears.map((y) => (
                <button
                  key={y}
                  onClick={() => setSelectedYear(y)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedYear === y
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 whitespace-nowrap">نطاق الإفادة:</span>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setScopeType('year')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  scopeType === 'year'
                    ? 'bg-white text-indigo-700 shadow-sm font-extrabold'
                    : 'text-slate-600 hover:bg-white/60'
                }`}
              >
                كامل عام {selectedYear}
              </button>
              <button
                onClick={() => setScopeType('month')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  scopeType === 'month'
                    ? 'bg-white text-indigo-700 shadow-sm font-extrabold'
                    : 'text-slate-600 hover:bg-white/60'
                }`}
              >
                شهر محدد
              </button>
              <button
                onClick={() => setScopeType('custom')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  scopeType === 'custom'
                    ? 'bg-white text-indigo-700 shadow-sm font-extrabold'
                    : 'text-slate-600 hover:bg-white/60'
                }`}
              >
                فترة مخصصة
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {scopeType === 'month' ? (
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-500">اختر الشهر</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                className="input-base w-full bg-white text-sm font-bold"
              >
                {ARABIC_MONTHS.map((mName, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {idx + 1} - {mName}
                  </option>
                ))}
              </select>
            </div>
          ) : scopeType === 'custom' ? (
            <>
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500">من تاريخ</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input-base w-full bg-white text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500">إلى تاريخ</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="input-base w-full bg-white text-sm"
                />
              </div>
            </>
          ) : (
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-500">الفترة المعتمدة</label>
              <div className="input-base w-full bg-slate-50 text-slate-600 text-xs font-bold flex items-center">
                من {startDate} إلى {endDate}
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-500">الفئة المستهدفة</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="input-base w-full bg-white text-sm font-bold cursor-pointer"
            >
              <option value="الكل">كل الفئات</option>
              {data.categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="block text-xs font-bold text-slate-500">
              بحث باسم المتدرب (يمكنك البحث وتحديد أكثر من اسم)
            </label>
            <div className="relative">
              <input
                value={searchTrainee}
                onChange={(e) => setSearchTrainee(e.target.value)}
                placeholder="اكتب اسم المتدرب أو الوظيفة للفلترة السريعة وتحديده..."
                className="input-base w-full pl-8 bg-white text-sm"
              />
              {searchTrainee && (
                <button
                  onClick={() => setSearchTrainee('')}
                  className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div
        className="card flex-1 overflow-hidden flex flex-col print:block print:shadow-none print:border-none print:overflow-visible slide-up"
        style={{ animationDelay: '0.2s' }}
      >
        <div
          className={`no-print px-4 py-3 border-b transition-colors ${
            selectedTraineeRows.length > 0
              ? 'bg-emerald-50/70 border-emerald-200/80'
              : 'bg-slate-50/70 border-slate-200/80'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={toggleSelectAllVisible}
                disabled={filteredAndGroupedData.length === 0}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  isAllVisibleSelected
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:text-indigo-700'
                }`}
              >
                <Icons.Check />
                <span>
                  {isAllVisibleSelected
                    ? `إلغاء تحديد الظاهرين (${filteredAndGroupedData.length})`
                    : `تحديد كل الظاهرين (${filteredAndGroupedData.length})`}
                </span>
              </button>

              {selectedTraineeRows.length > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  تم اختيار {selectedTraineeRows.length} من {baseGroupedData.length} متدرب للطباعة
                </span>
              ) : (
                <span className="text-xs font-medium text-slate-500">
                  حدد اسماً أو أكثر من القائمة لطباعة إفاداتهم فقط، أو اضغط "طباعة جميع الإفادات"
                </span>
              )}
            </div>

            {selectedTraineeRows.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSelectedOnly((prev) => !prev)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    showSelectedOnly
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
                  }`}
                >
                  {showSelectedOnly
                    ? `عرض كل القائمة (${searchFilteredData.length})`
                    : `عرض المحددين فقط (${selectedTraineeRows.length})`}
                </button>
                <button
                  type="button"
                  onClick={handlePrintCertificates}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1.5 transition-all"
                >
                  <Icons.Certificate />
                  <span>طباعة المحددين ({selectedTraineeRows.length})</span>
                </button>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-red-600 border border-red-200 hover:bg-red-50 transition-all"
                >
                  مسح التحديد ✕
                </button>
              </div>
            )}
          </div>

          {selectedTraineeRows.length > 0 && (
            <div className="mt-2.5 pt-2.5 border-t border-emerald-200/60 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-emerald-800 ml-1">الأسماء المحددة:</span>
              {visibleChips.map((item) => (
                <span
                  key={item.key}
                  className="inline-flex items-center gap-1.5 bg-white text-emerald-900 border border-emerald-300 px-2.5 py-1 rounded-lg text-xs font-bold shadow-xs"
                >
                  <span>{item.TraineeName}</span>
                  <button
                    type="button"
                    onClick={() => toggleSelectTrainee(item.key)}
                    className="w-4 h-4 rounded-full bg-emerald-100 hover:bg-red-100 text-emerald-700 hover:text-red-600 inline-flex items-center justify-center text-[10px] font-extrabold transition-colors"
                    title={`إزالة ${item.TraineeName} من التحديد`}
                  >
                    ✕
                  </button>
                </span>
              ))}
              {selectedTraineeRows.length > 10 && (
                <button
                  type="button"
                  onClick={() => setShowAllChips((prev) => !prev)}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline px-2 py-0.5"
                >
                  {showAllChips
                    ? 'طي القائمة'
                    : `+${selectedTraineeRows.length - 10} أسماء أخرى (عرض الكل)`}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="print-only mb-4">
          <PrintHeader
            title="إفادات التدريب المجمعة"
            subtitle={`عام ${selectedYear} - الفترة من ${startDate} إلى ${endDate}${
              selectedCategory !== 'الكل' ? ` - الفئة: ${selectedCategory}` : ''
            }${selectedTraineeRows.length > 0 ? ` (أسماء محددة: ${selectedTraineeRows.length})` : ''}`}
            hospitalName={hospitalName}
            hospitalLogo={hospitalLogo}
            hospitalLogoLeft={hospitalLogoLeft}
          />
        </div>

        <div className="overflow-x-auto flex-1 print:block print:overflow-visible">
          <table className="w-full text-right border-collapse min-w-[640px] print:w-full print-table">
            <thead className="bg-slate-50/80 sticky top-0 backdrop-blur-sm z-10 border-b border-slate-200 print:static print-no-repeat-header">
              <tr>
                <th className="w-12 px-3 py-3 lg:py-4 text-center no-print">
                  <input
                    type="checkbox"
                    checked={isAllVisibleSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isSomeVisibleSelected;
                    }}
                    onChange={toggleSelectAllVisible}
                    disabled={filteredAndGroupedData.length === 0}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                    title="تحديد / إلغاء تحديد كل الظاهرين"
                  />
                </th>
                <th className="px-4 lg:px-6 py-3 lg:py-4 text-[10px] lg:text-xs font-bold text-slate-500 uppercase tracking-wider print:w-[5%]">م</th>
                <th className="px-4 lg:px-6 py-3 lg:py-4 text-[10px] lg:text-xs font-bold text-slate-500 uppercase tracking-wider print:w-[25%]">المتدرب</th>
                <th className="px-4 lg:px-6 py-3 lg:py-4 text-[10px] lg:text-xs font-bold text-slate-500 uppercase tracking-wider print:w-[15%]">الفئة</th>
                <th className="px-4 lg:px-6 py-3 lg:py-4 text-[10px] lg:text-xs font-bold text-slate-500 uppercase tracking-wider print:w-[55%]">السياسات التدريبية المنجزة</th>
                <th className="px-4 lg:px-6 py-3 lg:py-4 text-[10px] lg:text-xs font-bold text-slate-500 uppercase tracking-wider no-print text-center w-28">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAndGroupedData.map((row, i) => {
                const isSelected = selectedKeySet.has(row.key);
                return (
                  <tr
                    key={row.key}
                    onClick={() => toggleSelectTrainee(row.key)}
                    className={`no-print group transition-colors duration-150 cursor-pointer select-none ${
                      isSelected ? 'bg-emerald-50/70 hover:bg-emerald-100/60' : 'hover:bg-indigo-50/40'
                    }`}
                  >
                    <td className="w-12 px-3 py-3 lg:py-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectTrainee(row.key)}
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                        aria-label={`تحديد ${row.TraineeName}`}
                      />
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 text-xs lg:text-sm text-slate-500 font-medium whitespace-nowrap">
                      {i + 1}
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4">
                      <div
                        className={`font-bold text-sm lg:text-base transition-colors ${
                          isSelected ? 'text-emerald-800' : 'text-slate-800 group-hover:text-indigo-700'
                        }`}
                      >
                        {row.TraineeName}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">{row.Job}</div>
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] lg:text-xs font-bold border whitespace-nowrap transition-colors ${
                          isSelected
                            ? 'bg-white text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200 group-hover:bg-white group-hover:border-indigo-200'
                        }`}
                      >
                        {row.Category}
                      </span>
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 text-xs lg:text-sm text-slate-600 font-medium leading-relaxed">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {row.PoliciesList.map((p, pIdx) => (
                          <span
                            key={pIdx}
                            className="bg-slate-50 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200 text-xs inline-block"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handlePrintSingleCertificate(row)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white rounded-lg border border-indigo-100 transition-colors shadow-xs"
                        title={`طباعة إفادة فردية للسيد/ ${row.TraineeName}`}
                      >
                        <Icons.Certificate />
                        <span>إفادة فردية</span>
                      </button>
                    </td>
                  </tr>
                );
              })}

              {tableRowsForPrint.map((row, i) => (
                <tr key={`print-${row.key}`} className="print-only">
                  <td className="px-4 py-3 text-xs font-medium whitespace-nowrap">{i + 1}</td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-sm">{row.TraineeName}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-bold">{row.Category}</span>
                  </td>
                  <td className="px-4 py-3 text-xs font-medium print:whitespace-normal print:max-w-none leading-relaxed">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {row.PoliciesList.map((p, pIdx) => (
                        <span key={pIdx} className="bg-slate-50 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200 text-xs inline-block">
                          {p}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredAndGroupedData.length === 0 && (
                <tr className="no-print">
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    لا توجد سجلات تدريب مطابقة لعام {selectedYear} خلال هذه الفترة
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="print-only" style={{ display: 'table-footer-group' }}>
              <tr>
                <td colSpan={4} style={{ border: 'none', padding: '0' }}>
                  <PrintFooter />
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="certificate-print-content">
        {displayedCertificates.map((row, i) => (
          <div key={row.key || i} className="certificate-page">
            <div className="certificate-header">
              {hospitalLogo && (
                <div className="certificate-logo-box certificate-logo-box-right">
                  <img
                    src={formatGoogleDriveImageUrl(hospitalLogo)}
                    alt="شعار المستشفى الأيمن"
                    className="certificate-logo-img"
                    crossOrigin="anonymous"
                    onError={handleDriveImgError}
                  />
                </div>
              )}
              {hospitalLogoLeft && (
                <div className="certificate-logo-box certificate-logo-box-left">
                  <img
                    src={formatGoogleDriveImageUrl(hospitalLogoLeft)}
                    alt="شعار المستشفى الأيسر"
                    className="certificate-logo-img"
                    crossOrigin="anonymous"
                    onError={handleDriveImgError}
                  />
                </div>
              )}
              <div
                className={`certificate-header-center ${
                  hospitalLogo && hospitalLogoLeft
                    ? 'pad-both'
                    : hospitalLogo
                      ? 'pad-right'
                      : hospitalLogoLeft
                        ? 'pad-left'
                        : ''
                }`}
              >
                <div className="hospital-title">
                  <div>{hospitalName}</div>
                  <div>وحدة مكافحة العدوى</div>
                </div>
                <h1>إفادة تدريب</h1>
              </div>
            </div>
            <div className="certificate-body">
              <p className="intro-line">تشهد وحدة مكافحة العدوى بـ {hospitalName}</p>
              <div className="trainee-highlight">
                <p className="trainee-name-line">بأن السيد (ة) / {row.TraineeName}</p>
                <p className="trainee-job-line">
                  الوظيفة: {row.Job || row.Category} | الفئة: {row.Category}
                </p>
              </div>
              <p className="policy-intro-line">قد حصل على تدريب على السياسات الآتية :</p>
              <div className="policy-list-container">
                <ul className="policy-list">
                  {row.PoliciesList.map((p, idx) => (
                    <li key={idx}>{p}</li>
                  ))}
                </ul>
              </div>
              <p className="certificate-conclusion">
                وذلك خلال عام {selectedYear} (في الفترة من {startDate} إلى {endDate}) ضمن الخطة التدريبية الخاصة بمكافحة العدوى
              </p>
              <p className="certificate-statement">وهذه إفادة منا بذلك ،،،</p>
            </div>
            <div className="certificate-footer">
              {icManagerTitle || icManagerName ? (
                <div className="sig-block">
                  {icManagerTitle && <p className="sig-title">{icManagerTitle}</p>}
                  {icManagerName && <p className="sig-name">{icManagerName}</p>}
                </div>
              ) : (
                <div></div>
              )}
              {hospitalManagerTitle || hospitalManagerName ? (
                <div className="sig-block">
                  {hospitalManagerTitle && <p className="sig-title">{hospitalManagerTitle}</p>}
                  {hospitalManagerName && <p className="sig-name">{hospitalManagerName}</p>}
                </div>
              ) : (
                <div></div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// 9. PLAN VIEW PAGE (الخطة السنوية + الاستعادة من السجلات + استيراد Google Sheets)
// ============================================================================

interface PlanViewPageProps {
  data: ReportData;
  onSavePlan: (payload: SavePlanPayload) => Promise<void>;
  onSavePlanBatch: (items: SavePlanPayload[]) => Promise<void>;
  onFetchPlanFromGoogleSheet: (
    payload: FetchPlanFromGoogleSheetPayload
  ) => Promise<FetchedPlanResult>;
  onSaveImportedPlan: (payload: SaveImportedPlanPayload) => Promise<void>;
}

interface EditingPolicyRow {
  original: string;
  base: string;
  days: number;
  dates: string[];
}

const PlanViewPage: React.FC<PlanViewPageProps> = ({
  data,
  onSavePlan,
  onSavePlanBatch,
  onFetchPlanFromGoogleSheet,
  onSaveImportedPlan,
}) => {
  const hospitalName =
    data?.settings?.slice().reverse().find((s) => s.Type === 'Hospital_Name')?.Value ||
    DEFAULT_HOSPITAL_NAME;
  const hospitalLogo =
    data?.settings?.slice().reverse().find((s) => s.Type === 'Hospital_Logo')?.Value || '';
  const hospitalLogoLeft =
    data?.settings?.slice().reverse().find((s) => s.Type === 'Hospital_Logo_Left')?.Value || '';

  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');

  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingPolicies, setEditingPolicies] = useState<EditingPolicyRow[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [policyToAdd, setPolicyToAdd] = useState<string>('');
  const showToast = useToast();

  // Plan restoration from logs state
  const [showRestoreModal, setShowRestoreModal] = useState<boolean>(false);
  const [restoreYear, setRestoreYear] = useState<number>(selectedYear);
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('replace');
  const [isRestoring, setIsRestoring] = useState<boolean>(false);

  // Google Sheets Plan Import state
  const [showGoogleSheetModal, setShowGoogleSheetModal] = useState<boolean>(false);
  const [googleSheetInput, setGoogleSheetInput] = useState<string>(() => {
    const saved = (data?.settings || []).find((s) => s.Type === 'Google_Sheet_ID');
    return saved ? saved.Value : '';
  });
  const [activeImportTab, setActiveImportTab] = useState<'url' | 'paste'>('url');
  const [googleSheetPastedText, setGoogleSheetPastedText] = useState<string>('');
  const [importTargetYear, setImportTargetYear] = useState<number>(selectedYear);
  const [importMode, setImportMode] = useState<'replace_year' | 'merge'>('replace_year');
  const [isFetchingSheet, setIsFetchingSheet] = useState<boolean>(false);
  const [isSavingImportedPlan, setIsSavingImportedPlan] = useState<boolean>(false);
  const [fetchedPlanResult, setFetchedPlanResult] = useState<FetchedPlanResult | null>(null);
  const [fetchErrorMsg, setFetchErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setRestoreYear(selectedYear);
    setImportTargetYear(selectedYear);
  }, [selectedYear]);

  const parsePastedTableText = (text: string, fallbackYear: number) => {
    if (!text || !text.trim()) return [];
    const lines = text
      .trim()
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return [];

    const monthNames = ARABIC_MONTHS;

    const parseLine = (l: string) => {
      if (l.includes('\t')) return l.split('\t').map((c) => c.trim().replace(/^["']|["']$/g, ''));
      const cells: string[] = [];
      let inQuotes = false;
      let current = '';
      for (let i = 0; i < l.length; i++) {
        const ch = l[i];
        if (ch === '"' || ch === "'") inQuotes = !inQuotes;
        else if (ch === ',' && !inQuotes) {
          cells.push(current.trim().replace(/^["']|["']$/g, ''));
          current = '';
        } else current += ch;
      }
      cells.push(current.trim().replace(/^["']|["']$/g, ''));
      return cells;
    };

    const firstCells = parseLine(lines[0]);
    const firstLower = firstCells.map((c) => String(c || '').toLowerCase());
    const isHeader = firstLower.some(
      (c) =>
        c.includes('month') ||
        c.includes('شهر') ||
        c.includes('category') ||
        c.includes('فئة') ||
        c.includes('policies') ||
        c.includes('سياس') ||
        c.includes('year') ||
        c.includes('سن')
    );

    let colMonth = 0,
      colCat = 1,
      colPol = 2,
      colYr = 3;
    let startIdx = 0;
    if (isHeader) {
      startIdx = 1;
      firstLower.forEach((c, idx) => {
        if (c.includes('month') || c.includes('شهر')) colMonth = idx;
        else if (c.includes('category') || c.includes('فئة')) colCat = idx;
        else if (
          c.includes('polic') ||
          c.includes('سياس') ||
          c.includes('موضوع') ||
          c.includes('تدريب')
        ) {
          colPol = idx;
        } else if (c.includes('year') || c.includes('سن')) colYr = idx;
      });
    }

    const items: Array<{ Month: string; Category: string; Policies: string; Year: string }> = [];
    for (let i = startIdx; i < lines.length; i++) {
      const cells = parseLine(lines[i]);
      if (cells.length === 0 || cells.every((c) => !c)) continue;
      const rawM = cells[colMonth] || '';
      const rawC = cells[colCat] || '';
      const rawP = cells[colPol] || '';
      const rawY = cells[colYr] || '';

      let mNum: number | null = null;
      if (/^\d+$/.test(rawM)) {
        mNum = parseInt(rawM, 10);
      } else {
        const idx = monthNames.findIndex((mn) => rawM.includes(mn));
        if (idx !== -1) mNum = idx + 1;
      }
      if (!mNum || mNum < 1 || mNum > 12) continue;
      if (!rawC) continue;

      items.push({
        Month: String(mNum),
        Category: rawC,
        Policies: rawP,
        Year: rawY && /^\d{4}$/.test(rawY) ? rawY : String(fallbackYear),
      });
    }
    return items;
  };

  const handleFetchFromGoogleSheet = async () => {
    if (!googleSheetInput || !googleSheetInput.trim()) {
      showToast('يرجى إدخال رابط أو معرّف جدول بيانات Google', 'error');
      return;
    }
    setIsFetchingSheet(true);
    setFetchErrorMsg(null);
    try {
      const res = await onFetchPlanFromGoogleSheet({
        sheetId: googleSheetInput.trim(),
        targetYear: importTargetYear,
      });
      if (res && res.items && res.items.length > 0) {
        setFetchedPlanResult(res);
        showToast(`تم جلب ${res.items.length} بنداً بنجاح من Google Sheet!`);
      } else {
        setFetchErrorMsg('تم الاتصال بالشيت بنجاح لكن لم يتم العثور على أي صفوف في جدول الخطة.');
      }
    } catch (err: any) {
      setFetchErrorMsg(err?.message || String(err));
    } finally {
      setIsFetchingSheet(false);
    }
  };

  const handleProcessPastedText = () => {
    if (!googleSheetPastedText || !googleSheetPastedText.trim()) {
      showToast('يرجى لصق بيانات جدول الخطة أولاً', 'error');
      return;
    }
    setFetchErrorMsg(null);
    try {
      const items = parsePastedTableText(googleSheetPastedText, importTargetYear);
      if (items.length > 0) {
        setFetchedPlanResult({
          items,
          source: 'نسخ ولصق يدوي من خلايا الشيت',
          totalItems: items.length,
        });
        showToast(`تم استخراج ${items.length} بنداً بنجاح من النص المنسوخ!`);
      } else {
        setFetchErrorMsg(
          'تعذر التعرف على أعمدة الخطة من النص المنسوخ. تأكد من نسخ الأعمدة: (الشهر - الفئة - السياسات - السنة).'
        );
      }
    } catch (err: any) {
      setFetchErrorMsg('خطأ أثناء قراءة النص المنسوخ: ' + (err?.message || err));
    }
  };

  const handleSaveImportedPlan = async () => {
    if (!fetchedPlanResult || !fetchedPlanResult.items || fetchedPlanResult.items.length === 0) {
      showToast('لا توجد بنود خطة للحفظ', 'error');
      return;
    }
    setIsSavingImportedPlan(true);
    try {
      await onSaveImportedPlan({
        items: fetchedPlanResult.items,
        mode: importMode,
        targetYear: importTargetYear,
        sheetId: googleSheetInput,
      });
      setSelectedYear(parseInt(String(importTargetYear), 10));
      setShowGoogleSheetModal(false);
      showToast(
        `تم حفظ واعتماد الخطة بنجاح لعام ${importTargetYear} (${fetchedPlanResult.items.length} بنداً)`
      );
    } catch (err: any) {
      showToast('حدث خطأ أثناء حفظ الخطة المستوردة: ' + (err?.message || err), 'error');
    } finally {
      setIsSavingImportedPlan(false);
    }
  };

  const availableLogYears = useMemo(() => {
    const s = new Set<number>();
    s.add(selectedYear);
    s.add(new Date().getFullYear());
    (data.logs || []).forEach((l) => {
      let y: number | null = null;
      if (l.Year && !isNaN(parseInt(String(l.Year), 10))) y = parseInt(String(l.Year), 10);
      else if (l.Date) {
        const p = String(l.Date).trim().split('-');
        if (p.length >= 1 && !isNaN(parseInt(p[0], 10))) y = parseInt(p[0], 10);
      }
      if (y) s.add(y);
    });
    return Array.from(s).sort((a, b) => b - a);
  }, [data.logs, selectedYear]);

  const reconstruction = useMemo(() => extractPlanFromLogs(data.logs, restoreYear), [data.logs, restoreYear]);

  const finalPlanItemsToSave = useMemo<SavePlanPayload[]>(() => {
    if (!reconstruction || !reconstruction.items) return [];
    if (restoreMode === 'replace') {
      return reconstruction.items;
    }

    const targetYr = parseInt(String(restoreYear), 10);
    const existingMap = new Map<string, string[]>();
    (data.plan || []).forEach((p) => {
      const pYear = parseInt(String(p.Year || new Date().getFullYear()), 10);
      if (pYear === targetYr) {
        const key = `${p.Month}___${p.Category}`;
        existingMap.set(key, splitPolicies(p.Policies));
      }
    });

    const mergedResult: SavePlanPayload[] = [];
    const handledKeys = new Set<string>();

    reconstruction.items.forEach((item) => {
      const key = `${item.month}___${item.category}`;
      handledKeys.add(key);
      const existingPols = existingMap.get(key) || [];

      const combinedMap = new Map<string, string>();
      existingPols.forEach((ep) => {
        const { base } = parsePolicyDaysAndDates(ep);
        combinedMap.set(base, ep);
      });
      item.policies.forEach((rp) => {
        const { base } = parsePolicyDaysAndDates(rp);
        if (!combinedMap.has(base)) combinedMap.set(base, rp);
      });

      mergedResult.push({
        year: targetYr,
        month: item.month,
        category: item.category,
        policies: Array.from(combinedMap.values()),
      });
    });

    existingMap.forEach((pols, key) => {
      if (!handledKeys.has(key)) {
        const [mStr, cat] = key.split('___');
        mergedResult.push({
          year: targetYr,
          month: parseInt(mStr, 10),
          category: cat,
          policies: pols,
        });
      }
    });

    mergedResult.sort(
      (a, b) => Number(a.month) - Number(b.month) || a.category.localeCompare(b.category)
    );
    return mergedResult;
  }, [reconstruction, restoreMode, restoreYear, data.plan]);

  const handleExecuteRestore = async () => {
    if (!finalPlanItemsToSave || finalPlanItemsToSave.length === 0) {
      return showToast('لا توجد بنود خطة للاستعادة', 'error');
    }
    setIsRestoring(true);
    try {
      await onSavePlanBatch(finalPlanItemsToSave);
      setSelectedYear(parseInt(String(restoreYear), 10));
      setShowRestoreModal(false);
      showToast(
        `تمت استعادة واعتماد الخطة بنجاح لعام ${restoreYear} (${finalPlanItemsToSave.length} شهراً وفئة)`
      );
    } catch (err: any) {
      showToast('حدث خطأ أثناء حفظ الخطة المستعادة: ' + (err?.message || err), 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  const allMonths = Array.from({ length: 12 }, (_, i) => i + 1);
  const filteredCategories = selectedCategory === 'الكل' ? data.categories : [selectedCategory];

  const allSettingsPolicies = useMemo(
    () => data.settings.filter((s) => s.Type === 'Policy').map((p) => p.Value),
    [data.settings]
  );

  const startEditing = (cat: string, currentPoliciesStr: string) => {
    setEditingCategory(cat);
    const list = splitPolicies(currentPoliciesStr);
    const parsed = list.map((p) => {
      const { base, days, dates } = parsePolicyDaysAndDates(p);
      return { original: p, base, days, dates };
    });
    setEditingPolicies(parsed);
    setPolicyToAdd('');
  };

  return (
    <div className="space-y-6 fade-in p-4 lg:p-6 pb-24 lg:pb-6 normal-print-content">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 slide-up no-print">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-slate-800">الخطة السنوية</h2>
          <p className="text-sm text-slate-500">استعراض المواضيع التدريبية المقررة بحسب الشهر والسنة والفئة</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setImportTargetYear(selectedYear);
              setFetchedPlanResult(null);
              setFetchErrorMsg(null);
              setShowGoogleSheetModal(true);
            }}
            className="btn-secondary flex items-center gap-2 text-xs lg:text-sm font-bold text-emerald-700 bg-emerald-50/90 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 shadow-sm transition-all cursor-pointer"
            title="جلب واستيراد الخطة السنوية مباشرة من Google Sheets"
          >
            <Icons.GoogleSheets />
            <span>جلب الخطة من Google Sheets</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setRestoreYear(selectedYear);
              setShowRestoreModal(true);
            }}
            className="btn-secondary flex items-center gap-2 text-xs lg:text-sm font-bold text-indigo-700 bg-indigo-50/90 border border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 shadow-sm transition-all cursor-pointer"
            title="استعادة وتوليد الخطة التدريبية آلياً من واقع كشوفات وسجلات التدريب المحفوظة"
          >
            <Icons.Restore />
            <span>استعادة الخطة من السجلات</span>
          </button>
          <button onClick={() => window.print()} className="btn-secondary flex items-center gap-2 text-sm shadow-sm">
            <Icons.Printer /> حفظ كـ PDF
          </button>
        </div>
      </header>

      <div className="no-print card p-4 lg:p-6 shadow-sm bg-white border border-slate-100 slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400">الشهر والسنة</label>
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 hover:border-indigo-300 transition-all shadow-sm">
              <input
                type="month"
                value={`${selectedYear}-${String(selectedMonth).padStart(2, '0')}`}
                onChange={(e) => {
                  if (e.target.value) {
                    const [y, m] = e.target.value.split('-').map(Number);
                    setSelectedMonth(m);
                    setSelectedYear(y);
                  }
                }}
                className="bg-transparent outline-none text-xs lg:text-sm font-bold text-slate-700 cursor-pointer w-full"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400">الفئة المستهدفة</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="input-base cursor-pointer font-bold hover:border-indigo-200"
            >
              <option value="الكل">كل الفئات</option>
              {data.categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="no-print grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 slide-up" style={{ animationDelay: '0.2s' }}>
        {filteredCategories.map((cat) => {
          const planItem = getPlanItem(data.plan, selectedMonth, cat, selectedYear);
          const isEditingThis = editingCategory === cat;

          return (
            <div key={cat} className="card p-6 lg:p-8 hover:shadow-md transition-shadow duration-300 border-t-4 border-t-indigo-500 bg-white">
              <h3 className="text-lg lg:text-xl font-bold text-slate-800 mb-4 lg:mb-6 flex justify-between items-center">
                <span>{cat}</span>
                <div className="flex items-center gap-2">
                  <span className="text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl text-xs font-bold">
                    {ARABIC_MONTHS[selectedMonth - 1]} {selectedYear}
                  </span>
                  {!isEditingThis && (
                    <button
                      onClick={() => startEditing(cat, planItem ? planItem.Policies : '')}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      title="تعديل السياسات"
                    >
                      <Icons.Edit />
                    </button>
                  )}
                </div>
              </h3>

              {isEditingThis ? (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="text-xs font-bold text-indigo-600 border-b pb-2">تعديل مواضيع الخطة والمدة التدريبية:</div>

                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {editingPolicies.map((p, idx) => {
                      const { base, days, dates = [] } = p;
                      return (
                        <div key={base} className="flex flex-col gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-indigo-100 transition-colors">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-800 text-sm">{base}</span>
                              <span className="text-[11px] font-bold text-indigo-500 mt-0.5">
                                المدة: {days === 1 ? 'يوم واحد' : days === 2 ? 'يومان' : 'غير محددة'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm text-[10px] font-bold">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditingPolicies((prev) =>
                                      prev.map((item, i) => (i === idx ? { ...item, days: 0, dates: [] } : item))
                                    )
                                  }
                                  className={`px-2 py-1 rounded-md transition-all ${
                                    days === 0 ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                                  }`}
                                >
                                  بدون أيام
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditingPolicies((prev) =>
                                      prev.map((item, i) =>
                                        i === idx
                                          ? { ...item, days: 1, dates: item.dates ? item.dates.slice(0, 1) : [] }
                                          : item
                                      )
                                    )
                                  }
                                  className={`px-2 py-1 rounded-md transition-all ${
                                    days === 1 ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                                  }`}
                                >
                                  يوم
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditingPolicies((prev) =>
                                      prev.map((item, i) =>
                                        i === idx ? { ...item, days: 2, dates: item.dates || [] } : item
                                      )
                                    )
                                  }
                                  className={`px-2 py-1 rounded-md transition-all ${
                                    days === 2 ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                                  }`}
                                >
                                  يومان
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => setEditingPolicies((prev) => prev.filter((_, i) => i !== idx))}
                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                                title="حذف السياسة"
                              >
                                <Icons.Trash />
                              </button>
                            </div>
                          </div>

                          {days > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white p-2 rounded-lg border border-slate-100 mt-1">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 mb-1">تاريخ اليوم الأول</label>
                                <input
                                  type="date"
                                  value={dates[0] || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setEditingPolicies((prev) =>
                                      prev.map((item, i) => {
                                        if (i === idx) {
                                          const newDates = [...(item.dates || [])];
                                          newDates[0] = val;
                                          return { ...item, dates: newDates };
                                        }
                                        return item;
                                      })
                                    );
                                  }}
                                  className="input-base text-xs font-bold py-1 px-2 w-full cursor-pointer hover:border-indigo-200"
                                />
                              </div>
                              {days === 2 && (
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-400 mb-1">تاريخ اليوم الثاني</label>
                                  <input
                                    type="date"
                                    value={dates[1] || ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setEditingPolicies((prev) =>
                                        prev.map((item, i) => {
                                          if (i === idx) {
                                            const newDates = [...(item.dates || [])];
                                            newDates[1] = val;
                                            return { ...item, dates: newDates };
                                          }
                                          return item;
                                        })
                                      );
                                    }}
                                    className="input-base text-xs font-bold py-1 px-2 w-full cursor-pointer hover:border-indigo-200"
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {editingPolicies.length === 0 && (
                      <div className="text-center py-4 text-slate-400 italic text-xs">
                        الخطة خالية، يرجى إضافة سياسات أدناه.
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex gap-2">
                    <select
                      value={policyToAdd}
                      onChange={(e) => setPolicyToAdd(e.target.value)}
                      className="input-base text-xs font-bold cursor-pointer flex-1 py-1.5"
                    >
                      <option value="">-- اختر سياسة لإضافتها --</option>
                      {allSettingsPolicies
                        .filter((name) => !editingPolicies.some((ep) => ep.base === name))
                        .map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        if (!policyToAdd) return;
                        setEditingPolicies((prev) => [
                          ...prev,
                          { original: policyToAdd, base: policyToAdd, days: 0, dates: [] },
                        ]);
                        setPolicyToAdd('');
                      }}
                      disabled={!policyToAdd}
                      className="btn-primary py-1.5 px-4 text-xs font-bold shrink-0 disabled:opacity-50"
                    >
                      إضافة
                    </button>
                  </div>

                  <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setEditingCategory(null)}
                      disabled={isSaving}
                      className="btn-secondary py-1.5 px-4 text-xs font-bold text-slate-600 hover:bg-slate-50"
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setIsSaving(true);
                        try {
                          const formattedList = editingPolicies.map((ep) =>
                            formatPolicyNameAndDates(ep.base, ep.days, ep.dates)
                          );
                          await onSavePlan({
                            month: selectedMonth,
                            category: cat,
                            policies: formattedList,
                            year: selectedYear,
                          });
                          setEditingCategory(null);
                          showToast('تم تحديث الخطة بنجاح');
                        } catch (err: any) {
                          showToast(err?.message || 'حدث خطأ أثناء الحفظ', 'error');
                        } finally {
                          setIsSaving(false);
                        }
                      }}
                      disabled={isSaving}
                      className="btn-primary py-1.5 px-4 text-xs font-bold flex items-center gap-1.5"
                    >
                      {isSaving ? <Icons.Loading /> : 'حفظ'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2.5">
                  {planItem && planItem.Policies ? (
                    splitPolicies(planItem.Policies).map((p) => {
                      const { base, days, dates } = parsePolicyDaysAndDates(p);
                      return (
                        <div
                          key={p}
                          className="bg-indigo-50 text-indigo-700 px-3 py-2.5 rounded-xl text-xs lg:text-sm font-bold border border-indigo-100 shadow-sm flex flex-col gap-1.5"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{base}</span>
                            {days > 0 && (
                              <span className="bg-indigo-100/80 text-indigo-800 text-[10px] px-1.5 py-0.5 rounded-md font-extrabold whitespace-nowrap">
                                {days === 1 ? 'يوم واحد' : 'يومان'}
                              </span>
                            )}
                          </div>
                          {dates && dates.length > 0 && (
                            <div className="text-[10px] text-indigo-500 font-extrabold flex items-center gap-1">
                              <span>التاريخ: {formatDatesArabic(dates)}</span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-slate-400 italic text-xs lg:text-sm py-4 w-full text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center gap-2">
                      <span>لا توجد خطة معتمدة لهذا الشهر</span>
                      <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-bold">
                        <button
                          type="button"
                          onClick={() => {
                            setImportTargetYear(selectedYear);
                            setFetchedPlanResult(null);
                            setFetchErrorMsg(null);
                            setShowGoogleSheetModal(true);
                          }}
                          className="text-emerald-700 hover:text-emerald-900 underline decoration-emerald-300 hover:decoration-emerald-600 transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Icons.GoogleSheets />
                          <span>جلب الخطة من Google Sheets</span>
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => {
                            setRestoreYear(selectedYear);
                            setShowRestoreModal(true);
                          }}
                          className="text-indigo-600 hover:text-indigo-800 underline decoration-indigo-300 hover:decoration-indigo-600 transition-all cursor-pointer"
                        >
                          استعادة من كشوفات التدريب
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {filteredCategories.length === 0 && (
          <div className="md:col-span-2 text-center text-slate-400 py-12 italic text-sm">
            يرجى إضافة فئات مستهدفة أولاً في صفحة الإعدادات.
          </div>
        )}
      </div>

      {/* Print Mode (All Months - Matrix Table) */}
      <div className="print-only">
        <div className="mb-4">
          <PrintHeader
            title="الخطة السنوية"
            subtitle={String(selectedYear)}
            hospitalName={hospitalName}
            hospitalLogo={hospitalLogo}
            hospitalLogoLeft={hospitalLogoLeft}
          />
        </div>
        <table className="print-table" style={{ width: '100%', direction: 'rtl' }}>
          <thead>
            <tr>
              <th style={{ width: '10%', backgroundColor: '#f3f4f6', fontWeight: 'bold' }}>الشهر</th>
              {data.categories.map((cat) => (
                <th key={cat} style={{ backgroundColor: '#f3f4f6', fontWeight: 'bold' }}>
                  {cat}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allMonths.map((m) => (
              <tr key={m}>
                <td style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>{ARABIC_MONTHS[m - 1]}</td>
                {data.categories.map((cat) => {
                  const planItem = getPlanItem(data.plan, m, cat, selectedYear);
                  return (
                    <td
                      key={cat}
                      style={{ fontSize: '9pt', whiteSpace: 'pre-wrap', verticalAlign: 'top', padding: '8px' }}
                    >
                      {planItem && planItem.Policies ? splitPolicies(planItem.Policies).join('\n') : '-'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot className="print-only" style={{ display: 'table-footer-group' }}>
            <tr>
              <td colSpan={data.categories.length + 1} className="print-footer-cell">
                <PrintFooter />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Restore Plan from Logs Modal */}
      {showRestoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] shadow-2xl flex flex-col border border-slate-100 overflow-hidden slide-up">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/80 via-white to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200 shrink-0">
                  <Icons.Restore />
                </div>
                <div>
                  <h3 className="text-base lg:text-lg font-bold text-slate-800">استعادة الخطة من كشوفات التدريب</h3>
                  <p className="text-xs text-slate-500">
                    استخراج موضوعات وسياسات التدريب الفعلية وتواريخها وإعادة بناء الخطة
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRestoreModal(false)}
                disabled={isRestoring}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs lg:text-sm">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">السنة المستهدفة للاستعادة:</label>
                  <span className="text-[11px] text-slate-400">سيتم البحث في كشوفات وسجلات التدريب المحفوظة لهذه السنة</span>
                </div>
                <select
                  value={restoreYear}
                  onChange={(e) => setRestoreYear(Number(e.target.value))}
                  disabled={isRestoring}
                  className="input-base text-xs lg:text-sm font-bold cursor-pointer py-1.5 px-3 min-w-[140px] bg-white"
                >
                  {availableLogYears.map((yr) => (
                    <option key={yr} value={yr}>عام {yr}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-100 text-center">
                  <div className="text-[11px] font-bold text-slate-500">سجلات الحضور</div>
                  <div className="text-lg font-black text-indigo-700 mt-0.5">{reconstruction.stats.totalLogs}</div>
                </div>
                <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100 text-center">
                  <div className="text-[11px] font-bold text-slate-500">الشهور المنفذة</div>
                  <div className="text-lg font-black text-emerald-700 mt-0.5">{reconstruction.stats.monthsCount}</div>
                </div>
                <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-100 text-center">
                  <div className="text-[11px] font-bold text-slate-500">الفئات المستهدفة</div>
                  <div className="text-lg font-black text-amber-700 mt-0.5">{reconstruction.stats.categoriesCount}</div>
                </div>
                <div className="bg-purple-50/60 p-3 rounded-xl border border-purple-100 text-center">
                  <div className="text-[11px] font-bold text-slate-500">السياسات المستعادة</div>
                  <div className="text-lg font-black text-purple-700 mt-0.5">{reconstruction.stats.policiesCount}</div>
                </div>
              </div>

              {reconstruction.stats.totalLogs === 0 ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-start gap-3">
                  <div>
                    <span className="font-bold block mb-1">لم يتم العثور على سجلات تدريب لعام {restoreYear}</span>
                    <span>
                      لا توجد جلسات أو سجلات تدريب محفوظة لهذا العام في قاعدة البيانات. يمكنك اختيار سنة أخرى من القائمة أعلاه.
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 block">طريقة التطبيق:</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label
                        className={`p-3 rounded-xl border cursor-pointer flex items-start gap-2.5 transition-all ${
                          restoreMode === 'replace'
                            ? 'bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-300'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="restoreMode"
                          value="replace"
                          checked={restoreMode === 'replace'}
                          onChange={() => setRestoreMode('replace')}
                          className="mt-1 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <div>
                          <span className="font-bold text-slate-800 block text-xs">استبدال الخطة الحالية بالكامل</span>
                          <span className="text-[11px] text-slate-500 leading-relaxed block mt-0.5">
                            اعتماد الخطة المستخرجة من سجلات التدريب كخطة معتمدة لهذا العام.
                          </span>
                        </div>
                      </label>
                      <label
                        className={`p-3 rounded-xl border cursor-pointer flex items-start gap-2.5 transition-all ${
                          restoreMode === 'merge'
                            ? 'bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-300'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="restoreMode"
                          value="merge"
                          checked={restoreMode === 'merge'}
                          onChange={() => setRestoreMode('merge')}
                          className="mt-1 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <div>
                          <span className="font-bold text-slate-800 block text-xs">دمج مع الخطة القائمة</span>
                          <span className="text-[11px] text-slate-500 leading-relaxed block mt-0.5">
                            إضافة السياسات المستعادة إلى الخطة الموجودة حالياً دون حذف أي سياسات أخرى مضافة.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">
                        معاينة الخطة المستعادة ({finalPlanItemsToSave.length} بنداً موزعة على الشهور):
                      </label>
                      <span className="text-[11px] text-indigo-600 font-bold">عام {restoreYear}</span>
                    </div>
                    <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/50">
                      {finalPlanItemsToSave.map((item, idx) => (
                        <div key={idx} className="p-3 bg-white hover:bg-indigo-50/30 transition-colors">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="bg-indigo-100 text-indigo-800 text-[10px] font-black px-2 py-0.5 rounded-md">
                                {ARABIC_MONTHS[Number(item.month) - 1]} ({item.month})
                              </span>
                              <span className="font-bold text-slate-800 text-xs">{item.category}</span>
                            </div>
                            <span className="text-[11px] text-slate-400 font-bold">
                              {Array.isArray(item.policies) ? item.policies.length : 0} مواضيع
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {(Array.isArray(item.policies) ? item.policies : splitPolicies(String(item.policies))).map(
                              (pol, pIdx) => {
                                const { base, days, dates } = parsePolicyDaysAndDates(pol);
                                return (
                                  <span
                                    key={pIdx}
                                    className="bg-slate-100 text-slate-700 px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 border border-slate-200"
                                  >
                                    <span>{base}</span>
                                    {days > 0 && (
                                      <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1 py-0.2 rounded font-extrabold">
                                        {days === 1 ? 'يوم' : 'يومان'}
                                      </span>
                                    )}
                                    {dates && dates.length > 0 && (
                                      <span className="text-[9px] text-slate-400 font-normal">({dates.join('، ')})</span>
                                    )}
                                  </span>
                                );
                              }
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2.5 bg-slate-50/80">
              <button
                type="button"
                onClick={() => setShowRestoreModal(false)}
                disabled={isRestoring}
                className="btn-secondary py-2 px-4 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleExecuteRestore}
                disabled={isRestoring || reconstruction.stats.totalLogs === 0 || finalPlanItemsToSave.length === 0}
                className="btn-primary py-2 px-5 text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-200 disabled:opacity-50 disabled:shadow-none cursor-pointer"
              >
                {isRestoring ? (
                  <>
                    <Icons.Loading />
                    <span>جاري حفظ واعتماد الخطة...</span>
                  </>
                ) : (
                  <>
                    <Icons.Check />
                    <span>اعتماد وحفظ الخطة في النظام</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Sheets Plan Import Modal */}
      {showGoogleSheetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in no-print" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-up">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/70 via-slate-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center shadow-sm">
                  <Icons.GoogleSheets />
                </div>
                <div>
                  <h3 className="text-base lg:text-lg font-bold text-slate-800">جلب الخطة من Google Sheets</h3>
                  <p className="text-xs text-slate-500">استيراد وتحديث موضوعات وسياسات الخطة السنوية مباشرة في قاعدة البيانات</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGoogleSheetModal(false)}
                disabled={isFetchingSheet || isSavingImportedPlan}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs lg:text-sm">
              <div className="flex border-b border-slate-200 gap-2">
                <button
                  type="button"
                  onClick={() => setActiveImportTab('url')}
                  className={`pb-2 px-3 font-bold transition-all border-b-2 cursor-pointer ${
                    activeImportTab === 'url'
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  عبر رابط أو معرّف Google Sheet
                </button>
                <button
                  type="button"
                  onClick={() => setActiveImportTab('paste')}
                  className={`pb-2 px-3 font-bold transition-all border-b-2 cursor-pointer ${
                    activeImportTab === 'paste'
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  نسخ ولصق مباشر من خلايا الشيت
                </button>
              </div>

              {activeImportTab === 'url' && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                  <label className="block text-xs font-bold text-slate-700">
                    رابط جدول Google Sheet أو المعرّف (Spreadsheet ID):
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={googleSheetInput}
                      onChange={(e) => setGoogleSheetInput(e.target.value)}
                      placeholder="الصق رابط ملف Google Sheet هنا أو المعرّف ID..."
                      className="input-base text-xs lg:text-sm py-2 px-3 flex-1 bg-white"
                      disabled={isFetchingSheet || isSavingImportedPlan}
                    />
                    <button
                      type="button"
                      onClick={handleFetchFromGoogleSheet}
                      disabled={isFetchingSheet || !googleSheetInput.trim()}
                      className="btn-primary bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white font-bold py-2 px-4 text-xs flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer disabled:opacity-50"
                    >
                      {isFetchingSheet ? (
                        <>
                          <Icons.Loading />
                          <span>جاري جلب البيانات...</span>
                        </>
                      ) : (
                        <>
                          <Icons.GoogleSheets />
                          <span>جلب ومعاينة الخطة</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    💡 ملاحظة: تأكد من مشاركة ملف Google Sheet ليكون متاحاً (Anyone with the link can view)، أو استخدام تبويب «نسخ ولصق مباشر» للصق الخلايا دون الحاجة لتغيير صلاحيات الملف.
                  </p>
                </div>
              )}

              {activeImportTab === 'paste' && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">
                      الصق الخلايا المنسوخة من جدول الخطة (Ctrl+V):
                    </label>
                    <span className="text-[11px] text-slate-400">يدعم الأعمدة: الشهر - الفئة - السياسات - السنة</span>
                  </div>
                  <textarea
                    rows={5}
                    value={googleSheetPastedText}
                    onChange={(e) => setGoogleSheetPastedText(e.target.value)}
                    placeholder={'الشهر\tالفئة\tالسياسات\tالسنة\n1\tتمريض\tسياسة مكافحة العدوى\t2026\n1\tأطباء\tالإنعاش القلبي الرئوي\t2026'}
                    className="input-base text-xs font-mono py-2 px-3 w-full bg-white leading-relaxed resize-y"
                    disabled={isSavingImportedPlan}
                    dir="ltr"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-500">
                      حدّد الجدول في Google Sheets أو Excel وانسخه ثم الصقه هنا مباشرة.
                    </span>
                    <button
                      type="button"
                      onClick={handleProcessPastedText}
                      disabled={!googleSheetPastedText.trim()}
                      className="btn-primary bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white font-bold py-2 px-4 text-xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer disabled:opacity-50"
                    >
                      <Icons.Check />
                      <span>معالجة واستخراج البنود</span>
                    </button>
                  </div>
                </div>
              )}

              {fetchErrorMsg && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-start gap-2.5">
                  <div>
                    <span className="font-bold block mb-0.5">تعذر استخراج الخطة:</span>
                    <span className="leading-relaxed">{fetchErrorMsg}</span>
                    <p className="mt-1 text-[11px] text-red-700">
                      نصيحة: يمكنك استخدام تبويب «نسخ ولصق مباشر» لتحديد جدول الخطة من الشيت ولصقه هنا فوراً بدون مشاكل الصلاحيات.
                    </p>
                  </div>
                </div>
              )}

              {fetchedPlanResult && fetchedPlanResult.items && fetchedPlanResult.items.length > 0 && (
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-100 text-center">
                      <div className="text-[11px] font-bold text-slate-500">إجمالي البنود</div>
                      <div className="text-lg font-black text-emerald-700 mt-0.5">{fetchedPlanResult.items.length}</div>
                    </div>
                    <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-100 text-center">
                      <div className="text-[11px] font-bold text-slate-500">الشهور المكتشفة</div>
                      <div className="text-lg font-black text-indigo-700 mt-0.5">
                        {new Set(fetchedPlanResult.items.map((it) => String(it.Month || it.month))).size}
                      </div>
                    </div>
                    <div className="bg-purple-50/60 p-3 rounded-xl border border-purple-100 text-center">
                      <div className="text-[11px] font-bold text-slate-500">الفئات المستهدفة</div>
                      <div className="text-lg font-black text-purple-700 mt-0.5">
                        {new Set(fetchedPlanResult.items.map((it) => String(it.Category || it.category))).size}
                      </div>
                    </div>
                    <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-100 text-center">
                      <div className="text-[11px] font-bold text-slate-500">المصدر</div>
                      <div className="text-xs font-bold text-amber-800 mt-1 truncate" title={fetchedPlanResult.source || 'Google Sheets'}>
                        {fetchedPlanResult.source
                          ? fetchedPlanResult.source.length > 18
                            ? fetchedPlanResult.source.substring(0, 18) + '...'
                            : fetchedPlanResult.source
                          : 'Google Sheets'}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">السنة المستهدفة لحفظ الخطة:</label>
                      <select
                        value={importTargetYear}
                        onChange={(e) => setImportTargetYear(Number(e.target.value))}
                        disabled={isSavingImportedPlan}
                        className="input-base text-xs font-bold cursor-pointer py-1.5 px-3 w-full bg-white"
                      >
                        {[selectedYear, selectedYear - 1, selectedYear + 1, 2024, 2025, 2026, 2027]
                          .filter((v, i, a) => a.indexOf(v) === i)
                          .sort((a, b) => b - a)
                          .map((yr) => (
                            <option key={yr} value={yr}>عام {yr}</option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">طريقة التطبيق في قاعدة البيانات:</label>
                      <select
                        value={importMode}
                        onChange={(e) => setImportMode(e.target.value as 'replace_year' | 'merge')}
                        disabled={isSavingImportedPlan}
                        className="input-base text-xs font-bold cursor-pointer py-1.5 px-3 w-full bg-white"
                      >
                        <option value="replace_year">استبدال خطة عام {importTargetYear} بالكامل (يوصى به)</option>
                        <option value="merge">دمج وتحديث (الاحتفاظ بالسياسات القديمة وإضافة الجديدة)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">معاينة البنود والشهور المستخرجة:</span>
                      <span className="text-[11px] text-slate-400">سيتم حفظها وتحديثها في البيانات</span>
                    </div>
                    <div className="max-h-56 overflow-y-auto space-y-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
                      {allMonths.map((m) => {
                        const monthItems = fetchedPlanResult.items.filter(
                          (it) => parseInt(String(it.Month || it.month), 10) === m
                        );
                        if (monthItems.length === 0) return null;
                        return (
                          <div key={m} className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-2xs space-y-1">
                            <div className="font-bold text-xs text-indigo-800 flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] flex items-center justify-center font-bold">
                                {m}
                              </span>
                              <span>شهر {ARABIC_MONTHS[m - 1]}</span>
                              <span className="text-[10px] text-slate-400 font-normal">({monthItems.length} فئات)</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                              {monthItems.map((it, idx) => (
                                <div key={idx} className="text-[11px] bg-slate-50 p-1.5 rounded border border-slate-100 flex flex-col gap-0.5">
                                  <span className="font-bold text-slate-700">{it.Category || it.category}:</span>
                                  <span className="text-slate-600 truncate" title={String(it.Policies || it.policies || '')}>
                                    {it.Policies || it.policies || <span className="italic text-slate-400">بدون سياسات</span>}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2.5 bg-slate-50/80">
              <button
                type="button"
                onClick={() => setShowGoogleSheetModal(false)}
                disabled={isSavingImportedPlan}
                className="btn-secondary py-2 px-4 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveImportedPlan}
                disabled={
                  isSavingImportedPlan ||
                  !fetchedPlanResult ||
                  !fetchedPlanResult.items ||
                  fetchedPlanResult.items.length === 0
                }
                className="btn-primary bg-emerald-600 hover:bg-emerald-700 border-emerald-600 py-2 px-5 text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-200 disabled:opacity-50 disabled:shadow-none cursor-pointer"
              >
                {isSavingImportedPlan ? (
                  <>
                    <Icons.Loading />
                    <span>جاري حفظ واعتماد الخطة...</span>
                  </>
                ) : (
                  <>
                    <Icons.Check />
                    <span>اعتماد وحفظ الخطة في النظام</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 10. SETTINGS PAGE, TURSO IMPORT MODAL & MAIN REPORT COMPONENT
// ============================================================================

interface SettingsPageProps {
  data: ReportData;
  onUpdateDataImmediate: (nextData: ReportData) => void;
  onUpdateEmployeesBulk: (employees: Employee[]) => Promise<void>;
  onDeleteEmployee: (
    employeeId: string | number | undefined,
    employeeName: string
  ) => Promise<void>;
  onSaveSettingsItem: (type: string, value: string) => Promise<void>;
  onDeleteSettingsItem: (type: string, value: string) => Promise<void>;
  onRenamePolicy: (oldName: string, newName: string) => Promise<void>;
  onTestPreviousTursoDb?: (payload: TursoCredentialsPayload) => Promise<TursoPreviewData>;
  onImportFromPreviousTursoDb?: (
    payload: ImportFromTursoPayload
  ) => Promise<ImportFromTursoResult>;
  onRefreshData?: (options?: { forceRefresh?: boolean }) => Promise<void>;
}

const SettingsPage: React.FC<SettingsPageProps> = ({
  data,
  onUpdateDataImmediate,
  onUpdateEmployeesBulk,
  onDeleteEmployee,
  onSaveSettingsItem,
  onDeleteSettingsItem,
  onRenamePolicy,
  onTestPreviousTursoDb,
  onImportFromPreviousTursoDb,
  onRefreshData,
}) => {
  const getSetting = useCallback(
    (type: string, defaultVal: string) => {
      const s = data?.settings?.slice().reverse().find((item) => item.Type === type);
      return s !== undefined ? s.Value : defaultVal;
    },
    [data?.settings]
  );

  const hospitalName = getSetting('Hospital_Name', DEFAULT_HOSPITAL_NAME);
  const hospitalLogo = getSetting('Hospital_Logo', '');
  const hospitalLogoLeft = getSetting('Hospital_Logo_Left', '');

  const [section, setSection] = useState<'trainee' | 'other'>('trainee');
  const [localEmployees, setLocalEmployees] = useState<Employee[]>(data.employees || []);
  const [empSearch, setEmpSearch] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [newItem, setNewItem] = useState<string>('');
  const [newTrainerInput, setNewTrainerInput] = useState<string>('');
  const [pasteContent, setPasteContent] = useState<string>('');
  const [singleEmpName, setSingleEmpName] = useState<string>('');
  const [singleEmpJob, setSingleEmpJob] = useState<string>('');
  const [singleEmpCategory, setSingleEmpCategory] = useState<string>(data?.categories?.[0] || '');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [hospitalNameInput, setHospitalNameInput] = useState<string>(hospitalName);
  const [hospitalLogoInput, setHospitalLogoInput] = useState<string>(hospitalLogo);
  const [hospitalLogoLeftInput, setHospitalLogoLeftInput] = useState<string>(hospitalLogoLeft);
  const [showTursoImport, setShowTursoImport] = useState<boolean>(false);

  const [icManagerTitle, setIcManagerTitle] = useState<string>(
    getSetting('IC_Manager_Title', 'مدير فريق مكافحة العدوى')
  );
  const [icManagerName, setIcManagerName] = useState<string>(
    getSetting('IC_Manager_Name', 'د/ محمود رمضان عبدالسميع')
  );
  const [hospitalManagerTitle, setHospitalManagerTitle] = useState<string>(
    getSetting('Hospital_Manager_Title', 'مدير عام المستشفى')
  );
  const [hospitalManagerName, setHospitalManagerName] = useState<string>(
    getSetting('Hospital_Manager_Name', 'أ.د/ أحمد عبدالحميد')
  );

  const showToast = useToast();
  const [newCategoryInput, setNewCategoryInput] = useState<string>('');
  const [editingPolicy, setEditingPolicy] = useState<string | null>(null);
  const [editingPolicyValue, setEditingPolicyValue] = useState<string>('');
  const [isRenamingPolicy, setIsRenamingPolicy] = useState<boolean>(false);
  const [pendingConfirm, setPendingConfirm] = useState<{
    message: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  useEffect(() => {
    setHospitalNameInput(getSetting('Hospital_Name', DEFAULT_HOSPITAL_NAME));
    setHospitalLogoInput(getSetting('Hospital_Logo', ''));
    setHospitalLogoLeftInput(getSetting('Hospital_Logo_Left', ''));
    setIcManagerTitle(getSetting('IC_Manager_Title', 'مدير فريق مكافحة العدوى'));
    setIcManagerName(getSetting('IC_Manager_Name', 'د/ محمود رمضان عبدالسميع'));
    setHospitalManagerTitle(getSetting('Hospital_Manager_Title', 'مدير عام المستشفى'));
    setHospitalManagerName(getSetting('Hospital_Manager_Name', 'أ.د/ أحمد عبدالحميد'));
  }, [getSetting]);

  useEffect(() => {
    if (!singleEmpCategory && data?.categories?.length > 0) {
      setSingleEmpCategory(data.categories[0]);
    }
  }, [data?.categories, singleEmpCategory]);

  useEffect(() => {
    setLocalEmployees(data.employees || []);
    setHasUnsavedChanges(false);
  }, [data.employees]);

  const handleSavePolicyRename = async (oldName: string) => {
    const newName = editingPolicyValue.trim();
    if (!newName) {
      showToast('اسم الموضوع لا يمكن أن يكون فارغاً', 'error');
      return;
    }
    if (newName === oldName) {
      setEditingPolicy(null);
      return;
    }
    setIsRenamingPolicy(true);
    try {
      await onRenamePolicy(oldName, newName);
      setEditingPolicy(null);
      showToast('تم تعديل اسم الموضوع وتحديث كافة الملفات والسجلات بنجاح', 'success');
    } catch (e: any) {
      showToast(e?.message || 'حدث خطأ أثناء تعديل اسم الموضوع', 'error');
    } finally {
      setIsRenamingPolicy(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryInput.trim()) {
      showToast('اسم الفئة لا يمكن أن يكون فارغاً', 'error');
      return;
    }
    setIsProcessing(true);
    try {
      await onSaveSettingsItem('Category', newCategoryInput.trim());
      setNewCategoryInput('');
      showToast('تمت إضافة الفئة بنجاح', 'success');
    } catch (e: any) {
      showToast(e?.message || 'حدث خطأ أثناء إضافة الفئة', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const executeDeleteSettingsItem = async (type: string, value: string) => {
    setIsProcessing(true);
    try {
      await onDeleteSettingsItem(type, value);
      showToast('تم الحذف بنجاح', 'success');
    } catch (e: any) {
      showToast(e?.message || 'حدث خطأ أثناء الحذف', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteSettingsItem = (type: string, value: string, confirmMessage?: string) => {
    if (confirmMessage) {
      setPendingConfirm({
        message: confirmMessage,
        onConfirm: () => executeDeleteSettingsItem(type, value),
      });
      return;
    }
    void executeDeleteSettingsItem(type, value);
  };

  const handleAddSingleEmployee = async () => {
    if (!singleEmpName.trim()) {
      showToast('يرجى إدخال اسم الموظف', 'error');
      return;
    }
    if (!singleEmpCategory.trim()) {
      showToast('يرجى اختيار أو كتابة الفئة', 'error');
      return;
    }
    setIsProcessing(true);
    try {
      const newEmp: Employee = {
        ID: makeId(),
        Name: singleEmpName.trim(),
        Job: singleEmpJob.trim() || 'موظف',
        Category: singleEmpCategory.trim(),
      };
      const updatedList = [...localEmployees, newEmp];
      await onUpdateEmployeesBulk(updatedList);
      setSingleEmpName('');
      setSingleEmpJob('');
      showToast('تمت إضافة الموظف بنجاح', 'success');
    } catch (e: any) {
      showToast(e?.message || 'حدث خطأ أثناء إضافة الموظف', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateEmployee = (index: number, field: 'Name' | 'Job' | 'Category', value: string) => {
    const next = [...localEmployees];
    next[index] = { ...next[index], [field]: value };
    setLocalEmployees(next);
    setHasUnsavedChanges(true);
    onUpdateDataImmediate({
      ...data,
      employees: next,
      categories: recomputeCategories(data.settings, next, data.categories),
    });
  };

  const handleEmployeeBlur = async () => {
    if (!hasUnsavedChanges || !localEmployees.length) return;
    try {
      await onUpdateEmployeesBulk(localEmployees);
      setHasUnsavedChanges(false);
    } catch (e) {
      console.error('Auto save error:', e);
    }
  };

  const handleBulkSaveEmployees = async () => {
    setIsProcessing(true);
    try {
      await onUpdateEmployeesBulk(localEmployees);
      setHasUnsavedChanges(false);
      showToast('تم حفظ وتحديث بيانات الموظفين بنجاح في كافة الصفحات وقاعدة البيانات', 'success');
    } catch (e: any) {
      showToast(e?.message || 'حدث خطأ أثناء حفظ بيانات الموظفين', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredLocalEmployees = useMemo(() => {
    if (!empSearch.trim()) {
      return localEmployees.map((emp, idx) => ({ emp, originalIndex: idx }));
    }
    const q = empSearch.toLowerCase().trim();
    return localEmployees
      .map((emp, idx) => ({ emp, originalIndex: idx }))
      .filter(
        ({ emp }) =>
          (emp.Name || '').toLowerCase().includes(q) ||
          (emp.Job || '').toLowerCase().includes(q) ||
          (emp.Category || '').toLowerCase().includes(q)
      );
  }, [localEmployees, empSearch]);

  const handleDeleteEmployeeClick = (emp: Employee, idx: number) => {
    const empName = (emp.Name || '').trim();
    if (!empName) {
      setLocalEmployees((prev) => prev.filter((_, i) => i !== idx));
      return;
    }
    const isSavedInDb = (data.employees || []).some(
      (e) => e.ID === emp.ID || (e.Name && e.Name.trim() === empName)
    );
    if (!isSavedInDb) {
      setLocalEmployees((prev) => prev.filter((_, i) => i !== idx));
      showToast('تمت إزالة الموظف من القائمة', 'success');
      return;
    }
    setPendingConfirm({
      message: `هل أنت متأكد من حذف الموظف "${empName}"؟\n\nتنبيه: سيتم حذف الموظف وكافة سجلات تدريبه وإفاداته نهائياً لضمان دقة الإحصائيات وعدم تجاوز 100%.`,
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          await onDeleteEmployee(emp.ID, empName);
          setLocalEmployees((prev) => prev.filter((_, i) => i !== idx));
          showToast(`تم حذف الموظف "${empName}" وكافة سجلاته بنجاح`, 'success');
        } catch (e: any) {
          showToast(e?.message || 'حدث خطأ أثناء حذف الموظف', 'error');
        } finally {
          setIsProcessing(false);
        }
      },
    });
  };

  const handleProcessPaste = () => {
    if (!pasteContent.trim()) {
      showToast('يرجى لصق بيانات', 'error');
      return;
    }
    setIsProcessing(true);
    try {
      const rows = pasteContent.trim().split(/\r?\n/);
      const newBatch: Employee[] = rows
        .map((row) => {
          const cols = row.split('\t');
          if (cols.length < 1 || !cols[0].trim()) return null;
          return {
            ID: makeId(),
            Name: cols[0].trim(),
            Job: cols[1] ? cols[1].trim() : '',
            Category: cols[2] ? cols[2].trim() : '',
          };
        })
        .filter((x): x is Employee => x !== null);
      setLocalEmployees((prev) => [...prev, ...newBatch]);
      setHasUnsavedChanges(true);
      setPasteContent('');
      showToast(`تمت إضافة ${newBatch.length} موظف.`, 'success');
    } catch (e: any) {
      showToast('خطأ: ' + (e?.message || 'تعذر تحليل البيانات'), 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddItem = async (type: 'Trainer' | 'Policy') => {
    const val = type === 'Trainer' ? newTrainerInput.trim() : newItem.trim();
    if (!val) return;
    try {
      await onSaveSettingsItem(type, val);
      if (type === 'Trainer') setNewTrainerInput('');
      else setNewItem('');
      showToast(
        type === 'Trainer' ? 'تمت إضافة المدرب بنجاح' : 'تمت إضافة الموضوع بنجاح',
        'success'
      );
    } catch (e: any) {
      showToast(e?.message || 'حدث خطأ أثناء الإضافة', 'error');
    }
  };

  const handleUpdateHospitalName = async () => {
    if (!hospitalNameInput.trim()) {
      showToast('مسمى المستشفى لا يمكن أن يكون فارغاً', 'error');
      return;
    }
    setIsProcessing(true);
    try {
      await onSaveSettingsItem('Hospital_Name', hospitalNameInput.trim());
      showToast('تم تحديث مسمى المستشفى بنجاح', 'success');
    } catch (e: any) {
      showToast(e?.message || 'حدث خطأ أثناء تحديث مسمى المستشفى', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateHospitalLogo = async () => {
    setIsProcessing(true);
    try {
      const clean = hospitalLogoInput.trim();
      await onSaveSettingsItem('Hospital_Logo', clean);
      showToast(clean ? 'تم تحديث وحفظ الشعار الأيمن بنجاح' : 'تم حذف الشعار الأيمن', 'success');
    } catch (e: any) {
      showToast(e?.message || 'حدث خطأ أثناء تحديث الشعار الأيمن', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveHospitalLogo = async () => {
    setIsProcessing(true);
    try {
      await onSaveSettingsItem('Hospital_Logo', '');
      setHospitalLogoInput('');
      showToast('تم إزالة الشعار الأيمن بنجاح', 'success');
    } catch (e: any) {
      showToast(e?.message || 'حدث خطأ أثناء إزالة الشعار الأيمن', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateHospitalLogoLeft = async () => {
    setIsProcessing(true);
    try {
      const clean = hospitalLogoLeftInput.trim();
      await onSaveSettingsItem('Hospital_Logo_Left', clean);
      showToast(clean ? 'تم تحديث وحفظ الشعار الأيسر بنجاح' : 'تم حذف الشعار الأيسر', 'success');
    } catch (e: any) {
      showToast(e?.message || 'حدث خطأ أثناء تحديث الشعار الأيسر', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveHospitalLogoLeft = async () => {
    setIsProcessing(true);
    try {
      await onSaveSettingsItem('Hospital_Logo_Left', '');
      setHospitalLogoLeftInput('');
      showToast('تم إزالة الشعار الأيسر بنجاح', 'success');
    } catch (e: any) {
      showToast(e?.message || 'حدث خطأ أثناء إزالة الشعار الأيسر', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateCertificateSettings = async () => {
    setIsProcessing(true);
    try {
      await onSaveSettingsItem('IC_Manager_Title', icManagerTitle);
      await onSaveSettingsItem('IC_Manager_Name', icManagerName);
      await onSaveSettingsItem('Hospital_Manager_Title', hospitalManagerTitle);
      await onSaveSettingsItem('Hospital_Manager_Name', hospitalManagerName);
      showToast('تم تحديث إعدادات الإفادة بنجاح', 'success');
    } catch (e: any) {
      showToast(e?.message || 'حدث خطأ أثناء تحديث إعدادات الإفادة', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const availableSections: Array<{ id: 'trainee' | 'other'; l: string }> = [
    { id: 'trainee', l: 'إدارة الموظفين' },
    { id: 'other', l: 'الإعدادات العامة' },
  ];

  return (
    <div className="max-w-5xl mx-auto p-4 lg:p-6 space-y-6 lg:space-y-8 fade-in pb-24 lg:pb-8 normal-print-content">
      {/* Print Header for Settings Page */}
      <div className="print-only">
        <PrintHeader
          title="إعدادات النظام"
          hospitalName={hospitalName}
          hospitalLogo={hospitalLogo}
          hospitalLogoLeft={hospitalLogoLeft}
        />
      </div>

      <div className="flex bg-slate-100 p-1.5 rounded-2xl shadow-inner w-full md:w-fit mx-auto overflow-x-auto hide-scrollbar slide-up">
        {availableSections.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id)}
            className={`px-4 lg:px-8 py-2 lg:py-3 rounded-xl text-xs lg:text-sm font-bold transition-all duration-200 flex-1 md:flex-none whitespace-nowrap ${
              section === s.id
                ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {s.l}
          </button>
        ))}
      </div>

      {section === 'trainee' && (
        <div className="space-y-8">
          {/* Single Employee Add Card */}
          <div className="card p-6 lg:p-8 space-y-4">
            <div className="flex items-center gap-3 text-indigo-700">
              <div className="bg-indigo-100 p-2 rounded-lg">
                <Icons.UserPlus />
              </div>
              <h4 className="font-bold text-base lg:text-lg">إضافة موظف جديد</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                value={singleEmpName}
                onChange={(e) => setSingleEmpName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSingleEmployee()}
                placeholder="اسم الموظف رباعي..."
                className="input-base text-sm"
              />
              <input
                value={singleEmpJob}
                onChange={(e) => setSingleEmpJob(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSingleEmployee()}
                placeholder="الوظيفة (مثال: فني تمريض)..."
                className="input-base text-sm"
              />
              <div className="flex gap-2">
                <select
                  value={singleEmpCategory}
                  onChange={(e) => setSingleEmpCategory(e.target.value)}
                  className="input-base text-sm font-bold cursor-pointer flex-1"
                >
                  <option value="">اختر الفئة...</option>
                  {data.categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddSingleEmployee}
                  disabled={isProcessing}
                  className="btn-primary px-5 whitespace-nowrap shrink-0"
                >
                  {isProcessing ? <Icons.Loading /> : 'إضافة'}
                </button>
              </div>
            </div>
          </div>

          <div className="card p-6 lg:p-8 border-dashed border-2 border-indigo-200 bg-indigo-50/50">
            <div className="flex items-center gap-4 mb-4 text-indigo-700">
              <div className="bg-indigo-100 p-2 rounded-lg">
                <Icons.Clipboard />
              </div>
              <h4 className="font-bold text-base lg:text-lg">إضافة سريعة (نسخ ولصق)</h4>
            </div>
            <textarea
              value={pasteContent}
              onChange={(e) => setPasteContent(e.target.value)}
              placeholder={'الصق البيانات هنا من Excel...\nالترتيب: الاسم [Tab] الوظيفة [Tab] الفئة'}
              className="w-full h-32 p-4 rounded-2xl bg-white border border-indigo-100 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none text-xs lg:text-sm font-mono leading-relaxed resize-none mb-4"
            />
            <button
              type="button"
              onClick={handleProcessPaste}
              disabled={isProcessing}
              className="btn-primary w-full md:w-fit px-8 md:ml-auto"
            >
              {isProcessing ? 'جاري المعالجة...' : 'تحليل وإضافة'}
            </button>
          </div>

          <div className="card p-6 lg:p-8 space-y-6">
            <div className="flex items-center gap-4 mb-2 text-indigo-700">
              <div className="bg-indigo-100 p-2 rounded-lg">
                <Icons.Plan />
              </div>
              <h4 className="font-bold text-base lg:text-lg">إضافة الفئات المستهدفة</h4>
            </div>
            <p className="text-xs text-slate-500">
              أضف الفئات التدريبية المستهدفة ليتم استخدامها في الخطة التدريبية، وسجلات الحضور، وفلتر الفئات.
            </p>
            <div className="flex gap-2">
              <input
                value={newCategoryInput}
                onChange={(e) => setNewCategoryInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                placeholder="أضف فئة مستهدفة جديدة (مثال: تمريض، أطباء)..."
                className="input-base"
              />
              <button
                type="button"
                onClick={handleAddCategory}
                disabled={isProcessing}
                className="btn-primary px-5 bg-slate-800 hover:bg-slate-900 shadow-none flex items-center justify-center shrink-0"
              >
                {isProcessing ? <Icons.Loading /> : <span className="text-xl font-bold">+</span>}
              </button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {data.settings
                  .filter((s) => s.Type === 'Category')
                  .map((s) => (
                    <div
                      key={s.Value}
                      className="p-3 bg-slate-50 rounded-xl flex justify-between items-center text-sm font-bold text-slate-600 group hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-100 transition-all"
                    >
                      <span>{s.Value}</span>
                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteSettingsItem(
                            'Category',
                            s.Value,
                            `هل أنت متأكد من حذف الفئة "${s.Value}"؟`
                          )
                        }
                        className="text-slate-300 group-hover:text-red-400 hover:scale-110 transition-transform"
                        title="حذف الفئة"
                      >
                        <Icons.Trash />
                      </button>
                    </div>
                  ))}
              </div>
              {data.settings.filter((s) => s.Type === 'Category').length === 0 && (
                <div className="text-center text-slate-400 text-xs py-4 italic">
                  لم يتم إضافة فئات مستهدفة مخصصة بعد. يتم الاعتماد حالياً على فئات الموظفين المسجلين.
                </div>
              )}
            </div>
          </div>

          <div className="card p-6 lg:p-8 space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800">
                  قائمة الموظفين{' '}
                  <span className="text-slate-400 text-sm font-medium">
                    ({localEmployees.length})
                  </span>
                </h3>
                {hasUnsavedChanges && (
                  <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full animate-pulse">
                    تعديلات قيد الحفظ
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
                <input
                  type="text"
                  value={empSearch}
                  onChange={(e) => setEmpSearch(e.target.value)}
                  placeholder="بحث بالاسم أو الوظيفة..."
                  className="input-base text-xs py-1.5 px-3 w-full sm:w-48 bg-slate-50 focus:bg-white"
                />
                {hasUnsavedChanges && (
                  <button
                    type="button"
                    onClick={handleBulkSaveEmployees}
                    disabled={isProcessing}
                    className="btn-primary text-xs py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 whitespace-nowrap shadow-sm shadow-emerald-600/20 flex items-center gap-1.5"
                  >
                    {isProcessing ? <Icons.Loading /> : <Icons.Check />}
                    <span>تثبيت التغييرات</span>
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto pr-2">
              {filteredLocalEmployees.map(({ emp, originalIndex: idx }) => (
                <div
                  key={emp.ID || idx}
                  className="p-4 border border-slate-100 rounded-2xl bg-white hover:shadow-md transition-all group relative"
                >
                  <input
                    value={emp.Name}
                    onChange={(e) => handleUpdateEmployee(idx, 'Name', e.target.value)}
                    onBlur={handleEmployeeBlur}
                    className="w-full font-bold text-sm bg-transparent border-none focus:ring-0 text-slate-800 mb-1 p-0"
                    placeholder="الاسم"
                  />
                  <div className="flex gap-2">
                    <input
                      value={emp.Job || ''}
                      onChange={(e) => handleUpdateEmployee(idx, 'Job', e.target.value)}
                      onBlur={handleEmployeeBlur}
                      className="w-1/2 text-[11px] bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-400 rounded px-1.5 py-0.5 text-slate-700 font-medium"
                      placeholder="الوظيفة (مثال: فني تمريض)"
                      title="تعديل الوظيفة (يتم تحديثها فوراً في باقي الصفحات)"
                    />
                    <input
                      list={`categories-list-${idx}`}
                      value={emp.Category}
                      onChange={(e) => handleUpdateEmployee(idx, 'Category', e.target.value)}
                      onBlur={handleEmployeeBlur}
                      className="w-1/2 text-[11px] font-bold text-indigo-600 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-400 rounded px-1.5 py-0.5 outline-none"
                      placeholder="الفئة"
                    />
                    <datalist id={`categories-list-${idx}`}>
                      {data.categories.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteEmployeeClick(emp, idx)}
                    disabled={isProcessing}
                    className="absolute top-2 left-2 text-red-300 opacity-0 group-hover:opacity-100 hover:text-red-600 transition-all bg-white rounded-full p-1.5 shadow-sm border border-red-50 hover:border-red-200"
                    title="حذف الموظف وسجلاته"
                  >
                    <Icons.Trash />
                  </button>
                </div>
              ))}
              {filteredLocalEmployees.length === 0 && (
                <div className="col-span-full text-center py-8 text-slate-400 text-xs font-medium">
                  لا يوجد موظف مطابق للبحث
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleBulkSaveEmployees}
              disabled={isProcessing}
              className="w-full btn-primary bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-200"
            >
              {isProcessing ? <Icons.Loading /> : 'تثبيت التغييرات في قاعدة البيانات'}
            </button>
          </div>
        </div>
      )}

      {section === 'other' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card p-6 lg:p-8 space-y-4 md:col-span-2">
            <h4 className="font-bold text-slate-800 flex items-center gap-2">
              <Icons.Settings /> مسمى المستشفى
            </h4>
            <div className="flex gap-2">
              <input
                value={hospitalNameInput}
                onChange={(e) => setHospitalNameInput(e.target.value)}
                placeholder="اسم المستشفى..."
                className="input-base"
              />
              <button
                type="button"
                onClick={handleUpdateHospitalName}
                disabled={isProcessing}
                className="btn-primary whitespace-nowrap bg-indigo-600 hover:bg-indigo-700"
              >
                {isProcessing ? <Icons.Loading /> : 'حفظ التعديل'}
              </button>
            </div>
          </div>

          {/* Dual Logos Management Card */}
          <div className="card p-6 lg:p-8 space-y-6 md:col-span-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-800 flex items-center gap-2 text-base lg:text-lg">
                <Icons.Image /> شعارات صفحات الطباعة والإفادات (شعار أقصى اليمين وشعار أقصى اليسار)
              </h4>
              <div className="flex flex-wrap gap-1.5 self-start sm:self-auto">
                {hospitalLogo && (
                  <span className="text-[11px] bg-emerald-50 text-emerald-700 font-bold px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    الشعار الأيمن مفعّل
                  </span>
                )}
                {hospitalLogoLeft && (
                  <span className="text-[11px] bg-blue-50 text-blue-700 font-bold px-2.5 py-1 rounded-full border border-blue-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    الشعار الأيسر مفعّل
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              يمكنك تخصيص شعارين ليظهرا تلقائياً في ترويسة جميع كشوفات التدريب، تقارير الإحصائيات،
              الخطة السنوية، والإفادات بصيغتي (PDF و Word): الشعار الأول يظهر في{' '}
              <strong>أقصى اليمين</strong> (شعار المستشفى/المنشأة)، والشعار الثاني يظهر في{' '}
              <strong>أقصى اليسار</strong> (شعار الجامعة، وزارة الصحة، الجودة، أو جهة الاعتماد).
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Right Logo */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    الشعار الأيمن (أقصى اليمين)
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                    مثال: شعار المستشفى
                  </span>
                </div>
                <div className="space-y-2">
                  <input
                    value={hospitalLogoInput}
                    onChange={(e) => setHospitalLogoInput(e.target.value)}
                    placeholder="رابط الشعار الأيمن من Google Drive أو رابط مباشر..."
                    className="input-base text-xs text-left w-full"
                    dir="ltr"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleUpdateHospitalLogo}
                      disabled={isProcessing}
                      className="btn-primary text-xs py-2 whitespace-nowrap bg-indigo-600 hover:bg-indigo-700 flex-1"
                    >
                      {isProcessing ? <Icons.Loading /> : 'حفظ الشعار الأيمن'}
                    </button>
                    {hospitalLogo && (
                      <button
                        type="button"
                        onClick={handleRemoveHospitalLogo}
                        disabled={isProcessing}
                        className="btn-secondary text-xs py-2 whitespace-nowrap text-red-600 hover:bg-red-50 hover:border-red-200 px-3"
                        title="إزالة الشعار الأيمن"
                      >
                        حذف
                      </button>
                    )}
                  </div>
                </div>

                {hospitalLogoInput.trim() ? (
                  <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200">
                    <div className="w-14 h-14 bg-slate-50 rounded-lg border border-slate-300 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                      <img
                        src={formatGoogleDriveImageUrl(hospitalLogoInput)}
                        alt="معاينة الشعار الأيمن"
                        className="max-w-full max-h-full object-contain"
                        crossOrigin="anonymous"
                        onError={handleDriveImgError}
                      />
                    </div>
                    <div className="text-[11px] text-slate-500 overflow-hidden">
                      <span className="font-bold text-slate-700 block mb-0.5">
                        معاينة الشعار الأيمن
                      </span>
                      <span className="text-emerald-600 font-medium block">
                        {hospitalLogoInput.includes('drive.google.com')
                          ? '✓ تم التعرف على رابط Google Drive'
                          : '✓ رابط مباشر'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 bg-white/60 rounded-xl border border-dashed border-slate-200 text-slate-400 text-[11px]">
                    لا يوجد شعار أيمن محدد حالياً
                  </div>
                )}
              </div>

              {/* Left Logo */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                    الشعار الأيسر (أقصى اليسار)
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                    مثال: شعار الجامعة / الوزارة
                  </span>
                </div>
                <div className="space-y-2">
                  <input
                    value={hospitalLogoLeftInput}
                    onChange={(e) => setHospitalLogoLeftInput(e.target.value)}
                    placeholder="رابط الشعار الأيسر من Google Drive أو رابط مباشر..."
                    className="input-base text-xs text-left w-full"
                    dir="ltr"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleUpdateHospitalLogoLeft}
                      disabled={isProcessing}
                      className="btn-primary text-xs py-2 whitespace-nowrap bg-blue-600 hover:bg-blue-700 flex-1"
                    >
                      {isProcessing ? <Icons.Loading /> : 'حفظ الشعار الأيسر'}
                    </button>
                    {hospitalLogoLeft && (
                      <button
                        type="button"
                        onClick={handleRemoveHospitalLogoLeft}
                        disabled={isProcessing}
                        className="btn-secondary text-xs py-2 whitespace-nowrap text-red-600 hover:bg-red-50 hover:border-red-200 px-3"
                        title="إزالة الشعار الأيسر"
                      >
                        حذف
                      </button>
                    )}
                  </div>
                </div>

                {hospitalLogoLeftInput.trim() ? (
                  <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200">
                    <div className="w-14 h-14 bg-slate-50 rounded-lg border border-slate-300 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                      <img
                        src={formatGoogleDriveImageUrl(hospitalLogoLeftInput)}
                        alt="معاينة الشعار الأيسر"
                        className="max-w-full max-h-full object-contain"
                        crossOrigin="anonymous"
                        onError={handleDriveImgError}
                      />
                    </div>
                    <div className="text-[11px] text-slate-500 overflow-hidden">
                      <span className="font-bold text-slate-700 block mb-0.5">
                        معاينة الشعار الأيسر
                      </span>
                      <span className="text-blue-600 font-medium block">
                        {hospitalLogoLeftInput.includes('drive.google.com')
                          ? '✓ تم التعرف على رابط Google Drive'
                          : '✓ رابط مباشر'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 bg-white/60 rounded-xl border border-dashed border-slate-200 text-slate-400 text-[11px]">
                    لا يوجد شعار أيسر محدد حالياً
                  </div>
                )}
              </div>
            </div>

            {/* Full Header Simulated Live Preview */}
            {(hospitalLogoInput.trim() || hospitalLogoLeftInput.trim()) && (
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>معاينة حية لشكل الترويسة في صفحات الطباعة وملفات Word:</span>
                  <span className="text-[11px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                    مظهر حقيقي للطباعة (2 لوجو: يمين ويسار)
                  </span>
                </div>
                <div className="bg-white p-4 rounded-xl border-2 border-slate-300 shadow-sm relative">
                  <div className="flex items-center justify-between border-b-2 border-double border-slate-800 pb-3">
                    <div
                      className={`w-16 h-16 flex items-center justify-center shrink-0 overflow-hidden ${
                        !hospitalLogoInput.trim()
                          ? 'border border-dashed border-slate-300 rounded-lg'
                          : ''
                      }`}
                    >
                      {hospitalLogoInput.trim() ? (
                        <img
                          src={formatGoogleDriveImageUrl(hospitalLogoInput)}
                          alt="لوجو اليمين"
                          className="max-w-full max-h-full object-contain"
                          crossOrigin="anonymous"
                          onError={handleDriveImgError}
                        />
                      ) : (
                        <span className="text-[10px] text-slate-300 font-bold text-center">
                          أقصى اليمين
                        </span>
                      )}
                    </div>

                    <div className="text-center px-4 flex-1">
                      <div className="font-extrabold text-base lg:text-lg text-slate-900">
                        {hospitalName}
                      </div>
                      <div className="font-bold text-xs lg:text-sm text-slate-600">
                        وحدة مكافحة العدوى
                      </div>
                      <div className="text-[11px] font-bold border-t border-slate-400 mt-1 pt-1 inline-block px-3">
                        كشف حضور تدريب / إفادة تدريب
                      </div>
                    </div>

                    <div
                      className={`w-16 h-16 flex items-center justify-center shrink-0 overflow-hidden ${
                        !hospitalLogoLeftInput.trim()
                          ? 'border border-dashed border-slate-300 rounded-lg'
                          : ''
                      }`}
                    >
                      {hospitalLogoLeftInput.trim() ? (
                        <img
                          src={formatGoogleDriveImageUrl(hospitalLogoLeftInput)}
                          alt="لوجو اليسار"
                          className="max-w-full max-h-full object-contain"
                          crossOrigin="anonymous"
                          onError={handleDriveImgError}
                        />
                      ) : (
                        <span className="text-[10px] text-slate-300 font-bold text-center">
                          أقصى اليسار
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Instructions for Google Drive */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50/60 border border-blue-200/80 rounded-2xl p-4 text-xs text-blue-900 space-y-2">
              <div className="font-bold flex items-center gap-2 text-blue-800 text-sm">
                <span>💡 خطوات الحصول على رابط الشعار من Google Drive:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1.5 text-xs text-blue-950/90 pr-1 leading-relaxed">
                <li>
                  افتح <strong>Google Drive</strong> وارفع صورة الشعار (يفضل بصيغة PNG أو JPG
                  بخلفية شفافة أو بيضاء).
                </li>
                <li>
                  اضغط بزر الفأرة الأيمن على الصورة، ثم اختر <strong>مشاركة (Share)</strong>.
                </li>
                <li>
                  تحت <strong>الوصول العام (General access)</strong>، تأكد من اختيار:{' '}
                  <strong>أي شخص لديه الرابط (Anyone with the link)</strong>.
                </li>
                <li>
                  اضغط على <strong>نسخ الرابط (Copy link)</strong> ثم الصقه في حقل الشعار المناسب
                  (الأيمن أو الأيسر) واضغط حفظ.
                </li>
              </ol>
            </div>
          </div>

          {/* Certificate Signatures Card */}
          <div className="card p-6 lg:p-8 space-y-4 md:col-span-2">
            <h4 className="font-bold text-slate-800 flex items-center gap-2">
              <Icons.Certificate /> توقيعات إفادة التدريب
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <label className="text-sm font-bold text-slate-600">توقيع مكافحة العدوى</label>
                <input
                  value={icManagerTitle}
                  onChange={(e) => setIcManagerTitle(e.target.value)}
                  placeholder="اللقب صفة (مثل: مدير فريق مكافحة العدوى)"
                  className="input-base text-sm"
                />
                <input
                  value={icManagerName}
                  onChange={(e) => setIcManagerName(e.target.value)}
                  placeholder="الاسم (مثل: د/ محمود رمضان)"
                  className="input-base text-sm"
                />
              </div>
              <div className="space-y-2 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <label className="text-sm font-bold text-slate-600">توقيع إدارة المستشفى</label>
                <input
                  value={hospitalManagerTitle}
                  onChange={(e) => setHospitalManagerTitle(e.target.value)}
                  placeholder="اللقب صفة (مثل: مدير عام المستشفى)"
                  className="input-base text-sm"
                />
                <input
                  value={hospitalManagerName}
                  onChange={(e) => setHospitalManagerName(e.target.value)}
                  placeholder="الاسم (مثل: أ.د/ أحمد عبدالحميد)"
                  className="input-base text-sm"
                />
              </div>
            </div>
            <p className="text-xs text-slate-500">اترك الحقول فارغة لإخفائها من الإفادة.</p>
            <button
              type="button"
              onClick={handleUpdateCertificateSettings}
              disabled={isProcessing}
              className="btn-primary w-full bg-indigo-600 hover:bg-indigo-700"
            >
              {isProcessing ? <Icons.Loading /> : 'حفظ التوقيعات'}
            </button>
          </div>

          {/* Policies Management Card */}
          <div className="card p-6 lg:p-8 space-y-6">
            <h4 className="font-bold text-slate-800 flex items-center gap-2">
              <Icons.Plan /> إدارة المواضيع
            </h4>
            <div className="flex gap-2">
              <input
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddItem('Policy')}
                placeholder="أضف موضوع جديد..."
                className="input-base"
              />
              <button
                type="button"
                onClick={() => handleAddItem('Policy')}
                className="btn-primary px-4 bg-slate-800 hover:bg-slate-900 shadow-none"
              >
                <span className="text-xl">+</span>
              </button>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
              {data.settings
                .filter((s) => s.Type === 'Policy')
                .map((s) =>
                  editingPolicy === s.Value ? (
                    <div
                      key={s.Value}
                      className="p-2 bg-indigo-50/70 rounded-xl flex items-center gap-2 border border-indigo-200"
                    >
                      <input
                        type="text"
                        value={editingPolicyValue}
                        onChange={(e) => setEditingPolicyValue(e.target.value)}
                        className="input-base text-sm py-1.5 flex-grow font-bold"
                        disabled={isRenamingPolicy}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSavePolicyRename(s.Value);
                          if (e.key === 'Escape') setEditingPolicy(null);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleSavePolicyRename(s.Value)}
                        disabled={isRenamingPolicy}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-sm disabled:opacity-50"
                      >
                        {isRenamingPolicy ? <Icons.Loading /> : 'حفظ'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingPolicy(null)}
                        disabled={isRenamingPolicy}
                        className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                      >
                        إلغاء
                      </button>
                    </div>
                  ) : (
                    <div
                      key={s.Value}
                      className="p-3 bg-slate-50 rounded-xl flex justify-between items-center text-sm font-bold text-slate-600 group hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-100 transition-all"
                    >
                      <span className="truncate max-w-[200px] md:max-w-[300px]">{s.Value}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPolicy(s.Value);
                            setEditingPolicyValue(s.Value);
                          }}
                          className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-slate-100 transition-all"
                          title="تعديل اسم الموضوع"
                        >
                          <Icons.Edit />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteSettingsItem(
                              'Policy',
                              s.Value,
                              `هل أنت متأكد من حذف الموضوع "${s.Value}"؟`
                            )
                          }
                          className="text-slate-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-slate-100 transition-all"
                          title="حذف"
                        >
                          <Icons.Trash />
                        </button>
                      </div>
                    </div>
                  )
                )}
            </div>
          </div>

          {/* Trainers Management Card */}
          <div className="card p-6 lg:p-8 space-y-6">
            <h4 className="font-bold text-slate-800 flex items-center gap-2">
              <Icons.Training /> إدارة المدربين
            </h4>
            <div className="flex gap-2">
              <input
                value={newTrainerInput}
                onChange={(e) => setNewTrainerInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddItem('Trainer')}
                placeholder="أضف مدرب جديد..."
                className="input-base"
              />
              <button
                type="button"
                onClick={() => handleAddItem('Trainer')}
                className="btn-primary px-4 bg-slate-800 hover:bg-slate-900 shadow-none"
              >
                <span className="text-xl">+</span>
              </button>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
              {data.settings
                .filter((s) => s.Type === 'Trainer')
                .map((s) => (
                  <div
                    key={s.Value}
                    className="p-3 bg-slate-50 rounded-xl flex justify-between items-center text-sm font-bold text-slate-600 group hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-100 transition-all"
                  >
                    <span>{s.Value}</span>
                    <button
                      type="button"
                      onClick={() =>
                        handleDeleteSettingsItem(
                          'Trainer',
                          s.Value,
                          `هل أنت متأكد من حذف المدرب "${s.Value}"؟`
                        )
                      }
                      className="text-slate-300 group-hover:text-red-400"
                      title="حذف"
                    >
                      <Icons.Trash />
                    </button>
                  </div>
                ))}
            </div>
          </div>

          {/* Turso Import Card */}
          <div className="card p-6 lg:p-8 space-y-4 md:col-span-2 bg-gradient-to-l from-indigo-50/60 to-white border-indigo-100">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                  <Icons.Database size={20} />
                  <span>استيراد السجلات من قاعدة بيانات Turso سابقة</span>
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  يمكنك جلب وترحيل سجلات التدريب والموظفين والخطة السنوية والإعدادات من قاعدة بيانات
                  Turso سابقة إلى هذه القاعدة مع خيار الدمج ومنع التكرار.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTursoImport(true)}
                className="btn-primary text-xs font-bold py-2.5 px-5 flex items-center gap-2 shrink-0"
              >
                <Icons.ImportCloud size={16} />
                <span>استيراد من Turso سابقة</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {pendingConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-100">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <Icons.Trash />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-bold text-base text-slate-800">تأكيد الحذف</h3>
                <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">
                  {pendingConfirm.message}
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPendingConfirm(null)}
                disabled={isProcessing}
                className="btn-secondary text-xs py-2 px-4"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={async () => {
                  const fn = pendingConfirm.onConfirm;
                  setPendingConfirm(null);
                  await fn();
                }}
                disabled={isProcessing}
                className="btn-primary text-xs py-2 px-5 bg-red-600 hover:bg-red-700"
              >
                {isProcessing ? <Icons.Loading /> : 'تأكيد الحذف'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Turso Previous DB Import Modal */}
      {showTursoImport && (
        <TursoImportModal
          isOpen={showTursoImport}
          onClose={() => setShowTursoImport(false)}
          onTestPreviousTursoDb={onTestPreviousTursoDb}
          onImportFromPreviousTursoDb={onImportFromPreviousTursoDb}
          onImportSuccess={async () => {
            setShowTursoImport(false);
            if (onRefreshData) {
              try {
                await onRefreshData({ forceRefresh: true });
                showToast('تم تحديث السجلات بنجاح بعد الاستيراد', 'success');
              } catch {
                // Handled silently if parent manages refresh externally
              }
            } else {
              showToast('تم استيراد السجلات بنجاح', 'success');
            }
          }}
        />
      )}
    </div>
  );
};

interface TursoImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess?: () => Promise<void> | void;
  onTestPreviousTursoDb?: (payload: TursoCredentialsPayload) => Promise<TursoPreviewData>;
  onImportFromPreviousTursoDb?: (
    payload: ImportFromTursoPayload
  ) => Promise<ImportFromTursoResult>;
}

const TursoImportModal: React.FC<TursoImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  onTestPreviousTursoDb,
  onImportFromPreviousTursoDb,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [tursoUrl, setTursoUrl] = useState<string>('');
  const [tursoToken, setTursoToken] = useState<string>('');
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [testError, setTestError] = useState<string>('');
  const [importError, setImportError] = useState<string>('');
  const [previewData, setPreviewData] = useState<TursoPreviewData | null>(null);
  const [importResult, setImportResult] = useState<ImportFromTursoResult | null>(null);

  const [importLogs, setImportLogs] = useState<boolean>(true);
  const [importEmployees, setImportEmployees] = useState<boolean>(true);
  const [importPlan, setImportPlan] = useState<boolean>(true);
  const [importSettings, setImportSettings] = useState<boolean>(true);
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');

  if (!isOpen) return null;

  const handleTestConnection = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanUrl = tursoUrl.trim();
    if (!cleanUrl) {
      setTestError('يرجى إدخال رابط قاعدة بيانات Turso السابقة (Database URL)');
      return;
    }
    if (!onTestPreviousTursoDb) {
      setTestError(
        'لم يتم ربط دالة فحص قاعدة بيانات Turso (onTestPreviousTursoDb) بالخصائص الخارجية بعد.'
      );
      return;
    }
    setTestError('');
    setIsTesting(true);
    try {
      const preview = await onTestPreviousTursoDb({
        url: cleanUrl,
        authToken: tursoToken.trim(),
      });
      setPreviewData(preview);
      setStep(2);
    } catch (err: any) {
      setTestError(
        err?.message || 'فشل الاتصال بقاعدة بيانات Turso السابقة. تأكد من صحة الرابط والرمز.'
      );
    } finally {
      setIsTesting(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!importLogs && !importEmployees && !importPlan && !importSettings) {
      setImportError('يرجى تحديد عنصر واحد على الأقل للاستيراد (سجلات، موظفين، خطة، إعدادات)');
      return;
    }
    if (!onImportFromPreviousTursoDb) {
      setImportError(
        'لم يتم ربط دالة استيراد قاعدة بيانات Turso (onImportFromPreviousTursoDb) بالخصائص الخارجية بعد.'
      );
      return;
    }

    setImportError('');
    setIsImporting(true);
    try {
      const result = await onImportFromPreviousTursoDb({
        url: tursoUrl.trim(),
        authToken: tursoToken.trim(),
        importLogs,
        importEmployees,
        importPlan,
        importSettings,
        mode,
      });
      setImportResult(result);
      setStep(3);
    } catch (err: any) {
      setImportError(err?.message || 'حدث خطأ أثناء استيراد البيانات');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto no-print">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 lg:p-8 space-y-6 shadow-2xl border border-slate-100 my-auto">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
              <Icons.ImportCloud size={24} />
            </div>
            <div>
              <h3 className="font-black text-lg text-slate-800">
                استيراد سجلات من قاعدة Turso سابقة
              </h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">
                ترحيل سجلات المتدربين والجلسات والخطة السنوية إلى قاعدة البيانات الحالية
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isTesting || isImporting}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-all text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Step Indicators */}
        <div className="flex items-center justify-between gap-2 px-2">
          <div
            className={`flex items-center gap-2 text-xs font-bold ${
              step >= 1 ? 'text-indigo-600' : 'text-slate-400'
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                step >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
              }`}
            >
              1
            </span>
            <span>الاتصال والفحص</span>
          </div>
          <div className={`h-0.5 flex-1 ${step >= 2 ? 'bg-indigo-500' : 'bg-slate-200'}`}></div>
          <div
            className={`flex items-center gap-2 text-xs font-bold ${
              step >= 2 ? 'text-indigo-600' : 'text-slate-400'
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                step >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
              }`}
            >
              2
            </span>
            <span>المعاينة والخيارات</span>
          </div>
          <div className={`h-0.5 flex-1 ${step >= 3 ? 'bg-indigo-500' : 'bg-slate-200'}`}></div>
          <div
            className={`flex items-center gap-2 text-xs font-bold ${
              step >= 3 ? 'text-indigo-600' : 'text-slate-400'
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                step >= 3 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
              }`}
            >
              3
            </span>
            <span>النتيجة والاعتماد</span>
          </div>
        </div>

        {/* Step 1: Credentials & Connect */}
        {step === 1 && (
          <form onSubmit={handleTestConnection} className="space-y-4">
            <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 text-xs text-indigo-900 leading-relaxed font-semibold">
              💡 <strong>ملاحظة:</strong> أدخل رابط قاعدة بيانات Turso السابقة والرمز الخاص بها.
              سيقوم النظام أولاً بفحص السجلات والجداول المتاحة وإظهار ملخص كامل للمعاينة قبل بدء
              الترحيل الفعلي.
            </div>

            {testError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs font-bold flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-black">فشل الاتصال بقاعدة البيانات السابقة:</p>
                  <p className="font-semibold text-red-800">{testError}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setTestError('')}
                  className="text-red-400 hover:text-red-600"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  رابط قاعدة بيانات Turso السابقة (Database URL) *
                </label>
                <input
                  type="text"
                  value={tursoUrl}
                  onChange={(e) => setTursoUrl(e.target.value)}
                  placeholder="libsql://your-database-name-username.turso.io"
                  className="input-base text-xs font-mono font-medium text-left"
                  dir="ltr"
                  disabled={isTesting}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  رمز الدخول أو التفويض (Auth Token)
                </label>
                <input
                  type="password"
                  value={tursoToken}
                  onChange={(e) => setTursoToken(e.target.value)}
                  placeholder="eyJhbGciOi..."
                  className="input-base text-xs font-mono font-medium text-left"
                  dir="ltr"
                  disabled={isTesting}
                />
                <p className="text-[11px] text-slate-400 font-semibold mt-1">
                  يمكنك الحصول على الـ Token من لوحة تحكم Turso الخاصة بالقاعدة السابقة.
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isTesting}
                className="btn-secondary py-3 px-5 text-xs font-bold flex-1"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isTesting || !tursoUrl.trim()}
                className="btn-primary py-3 px-6 text-xs font-bold flex-1 shadow-lg shadow-indigo-500/20"
              >
                {isTesting ? (
                  <>
                    <Icons.Loading />
                    <span>جارٍ الاتصال وفحص السجلات...</span>
                  </>
                ) : (
                  <>
                    <Icons.Database size={16} />
                    <span>فحص واختبار الاتصال</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Preview & Configuration */}
        {step === 2 && previewData && (
          <div className="space-y-5">
            {importError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between">
                <span>{importError}</span>
                <button
                  type="button"
                  onClick={() => setImportError('')}
                  className="text-red-400 hover:text-red-600"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Scanned Summary */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>تم الاتصال بنجاح. السجلات المكتشفة في القاعدة السابقة:</span>
                </h4>
                {previewData.detectedHospitalName && (
                  <span className="text-[11px] font-bold bg-white border border-slate-200 text-indigo-700 px-2.5 py-0.5 rounded-full">
                    {previewData.detectedHospitalName}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-white p-3 rounded-xl border border-slate-100 text-center shadow-xs">
                  <div className="text-lg font-black text-indigo-600">
                    {previewData.employeesCount || 0}
                  </div>
                  <div className="text-[11px] font-bold text-slate-500">👥 موظف ومتدرب</div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-100 text-center shadow-xs">
                  <div className="text-lg font-black text-blue-600">
                    {previewData.logsCount || 0}
                  </div>
                  <div className="text-[11px] font-bold text-slate-500">
                    📋 سجل تدريب ({previewData.sessionsCount || 0} جلسة)
                  </div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-100 text-center shadow-xs">
                  <div className="text-lg font-black text-amber-600">
                    {previewData.planCount || 0}
                  </div>
                  <div className="text-[11px] font-bold text-slate-500">📅 بنود الخطة السنوية</div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-100 text-center shadow-xs">
                  <div className="text-lg font-black text-emerald-600">
                    {previewData.settingsCount || 0}
                  </div>
                  <div className="text-[11px] font-bold text-slate-500">⚙️ سياسات وإعدادات</div>
                </div>
              </div>
            </div>

            {/* Scope of Data */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                السجلات والبيانات المطلوب استيرادها:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-bold">
                <label
                  className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                    importLogs
                      ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={importLogs}
                    onChange={(e) => setImportLogs(e.target.checked)}
                    className="accent-indigo-600"
                  />
                  <span>📋 سجلات وجلسات التدريب المنفذة</span>
                </label>
                <label
                  className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                    importEmployees
                      ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={importEmployees}
                    onChange={(e) => setImportEmployees(e.target.checked)}
                    className="accent-indigo-600"
                  />
                  <span>👥 قائمة الموظفين والمتدربين</span>
                </label>
                <label
                  className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                    importPlan
                      ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={importPlan}
                    onChange={(e) => setImportPlan(e.target.checked)}
                    className="accent-indigo-600"
                  />
                  <span>📅 بنود الخطة التدريبية السنوية</span>
                </label>
                <label
                  className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                    importSettings
                      ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={importSettings}
                    onChange={(e) => setImportSettings(e.target.checked)}
                    className="accent-indigo-600"
                  />
                  <span>⚙️ الإعدادات وسياسات التدريب</span>
                </label>
              </div>
            </div>

            {/* Merge Mode */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800">طريقة الترحيل والدمج:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <label
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    mode === 'merge'
                      ? 'bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-300'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 font-black text-slate-800">
                    <input
                      type="radio"
                      name="tursoImportMode"
                      checked={mode === 'merge'}
                      onChange={() => setMode('merge')}
                      className="accent-emerald-600"
                    />
                    <span>دمج ذكي ومنع التكرار (موصى به)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-semibold mt-1 pr-5">
                    يحتفظ بالسجلات الحالية ويضيف السجلات السابقة دون تكرار.
                  </p>
                </label>
                <label
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    mode === 'replace'
                      ? 'bg-red-50/80 border-red-300 ring-1 ring-red-300'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 font-black text-red-800">
                    <input
                      type="radio"
                      name="tursoImportMode"
                      checked={mode === 'replace'}
                      onChange={() => setMode('replace')}
                      className="accent-red-600"
                    />
                    <span>استبدال شامل للبيانات الحالية</span>
                  </div>
                  <p className="text-[11px] text-red-600/80 font-semibold mt-1 pr-5">
                    يمسح البيانات الحالية المختارة أولاً ثم يستورد السجلات السابقة مكانها.
                  </p>
                </label>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={isImporting}
                className="btn-secondary py-3 px-5 text-xs font-bold"
              >
                ← تعديل بيانات الاتصال
              </button>
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={isImporting}
                className="btn-primary py-3 px-6 text-xs font-bold flex-1 shadow-lg shadow-indigo-500/20"
              >
                {isImporting ? (
                  <>
                    <Icons.Loading />
                    <span>جارٍ استيراد وترحيل السجلات...</span>
                  </>
                ) : (
                  <>
                    <Icons.ImportCloud size={16} />
                    <span>بدء استيراد البيانات وترحيلها الآن</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Success Report */}
        {step === 3 && importResult && (
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl mx-auto flex items-center justify-center ring-8 ring-emerald-50">
              <Icons.Check size={32} />
            </div>

            <div className="space-y-2">
              <h4 className="text-xl font-black text-slate-800">
                تم استيراد وترحيل البيانات بنجاح!
              </h4>
              <p className="text-xs text-slate-500 font-semibold max-w-md mx-auto">
                تم حفظ جميع السجلات المستوردة بنجاح في قاعدة البيانات الحالية.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-right">
              <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-2xl text-center">
                <div className="text-xl font-black text-indigo-600">
                  {importResult.stats?.employees || 0}
                </div>
                <div className="text-xs font-bold text-slate-600 mt-0.5">موظف ومتدرب</div>
              </div>
              <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-2xl text-center">
                <div className="text-xl font-black text-blue-600">
                  {importResult.stats?.logs || 0}
                </div>
                <div className="text-xs font-bold text-slate-600 mt-0.5">سجل تدريب منجز</div>
              </div>
              <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-2xl text-center">
                <div className="text-xl font-black text-amber-600">
                  {importResult.stats?.plan || 0}
                </div>
                <div className="text-xs font-bold text-slate-600 mt-0.5">بند خطة سنوية</div>
              </div>
              <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-2xl text-center">
                <div className="text-xl font-black text-emerald-600">
                  {importResult.stats?.settings || 0}
                </div>
                <div className="text-xs font-bold text-slate-600 mt-0.5">عناصر وسياسات</div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  if (onImportSuccess) {
                    void onImportSuccess();
                  } else {
                    onClose();
                  }
                }}
                className="btn-primary w-full py-3.5 text-sm font-black shadow-xl shadow-indigo-500/25"
              >
                <span>إغلاق واستعراض السجلات الآن</span>
                <span>←</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN REPORT COMPONENT (المكون الرئيسي المستقل للواجهة)
// ============================================================================

export const Report: React.FC<ReportProps> = (props) => {
  const [data, setData] = useState<ReportData>(() => buildReportDataFromProps(props));
  const [view, setView] = useState<ReportView>(props.initialView || 'stats');

  useEffect(() => {
    setData(buildReportDataFromProps(props));
  }, [
    props.sessionData,
    props.logs,
    props.employees,
    props.departments,
    props.categories,
    props.plan,
    props.settings,
    props.hospitalName,
    props.hospitalLogo,
    props.hospitalLogoLeft,
  ]);

  useEffect(() => {
    if (props.initialView) {
      setView(props.initialView);
    }
  }, [props.initialView]);

  const resolvedHandlers: ReportPersistenceHandlers = useMemo(
    () => ({
      onRefreshData: props.onRefreshData ?? props.handlers?.onRefreshData,
      onDataChange: props.onDataChange ?? props.handlers?.onDataChange,
      onSaveTrainingSession:
        props.onSaveTrainingSession ?? props.handlers?.onSaveTrainingSession,
      onAddTraineesToSession:
        props.onAddTraineesToSession ?? props.handlers?.onAddTraineesToSession,
      onUpdateSessionTrainer:
        props.onUpdateSessionTrainer ?? props.handlers?.onUpdateSessionTrainer,
      onUpdateSessionPolicies:
        props.onUpdateSessionPolicies ?? props.handlers?.onUpdateSessionPolicies,
      onDeleteTrainingSession:
        props.onDeleteTrainingSession ?? props.handlers?.onDeleteTrainingSession,
      onUpdateEmployeesBulk:
        props.onUpdateEmployeesBulk ?? props.handlers?.onUpdateEmployeesBulk,
      onDeleteEmployee: props.onDeleteEmployee ?? props.handlers?.onDeleteEmployee,
      onSavePlan: props.onSavePlan ?? props.handlers?.onSavePlan,
      onSavePlanBatch: props.onSavePlanBatch ?? props.handlers?.onSavePlanBatch,
      onFetchPlanFromGoogleSheet:
        props.onFetchPlanFromGoogleSheet ?? props.handlers?.onFetchPlanFromGoogleSheet,
      onSaveImportedPlan: props.onSaveImportedPlan ?? props.handlers?.onSaveImportedPlan,
      onSaveSettingsItem: props.onSaveSettingsItem ?? props.handlers?.onSaveSettingsItem,
      onDeleteSettingsItem:
        props.onDeleteSettingsItem ?? props.handlers?.onDeleteSettingsItem,
      onRenamePolicy: props.onRenamePolicy ?? props.handlers?.onRenamePolicy,
      onTestPreviousTursoDb:
        props.onTestPreviousTursoDb ?? props.handlers?.onTestPreviousTursoDb,
      onImportFromPreviousTursoDb:
        props.onImportFromPreviousTursoDb ?? props.handlers?.onImportFromPreviousTursoDb,
    }),
    [props]
  );

  const commitNextData = useCallback(
    (nextData: ReportData) => {
      setData(nextData);
      resolvedHandlers.onDataChange?.(nextData);
    },
    [resolvedHandlers]
  );

  const handleSaveTrainingSession = useCallback(
    async (payload: SaveTrainingSessionPayload) => {
      const next = await saveTrainingSessionAction(
        data,
        payload,
        resolvedHandlers.onSaveTrainingSession
      );
      commitNextData(next);
    },
    [data, resolvedHandlers.onSaveTrainingSession, commitNextData]
  );

  const handleUpdateEmployeesBulk = useCallback(
    async (employees: Employee[]) => {
      const next = await updateEmployeesBulkAction(
        data,
        employees,
        resolvedHandlers.onUpdateEmployeesBulk
      );
      commitNextData(next);
    },
    [data, resolvedHandlers.onUpdateEmployeesBulk, commitNextData]
  );

  const handleAddTraineesToSession = useCallback(
    async (payload: AddTraineesToSessionPayload) => {
      const next = await addTraineesToSessionAction(
        data,
        payload,
        resolvedHandlers.onAddTraineesToSession
      );
      commitNextData(next);
    },
    [data, resolvedHandlers.onAddTraineesToSession, commitNextData]
  );

  const handleUpdateSessionTrainer = useCallback(
    async (payload: UpdateSessionTrainerPayload) => {
      const next = await updateSessionTrainerAction(
        data,
        payload,
        resolvedHandlers.onUpdateSessionTrainer
      );
      commitNextData(next);
    },
    [data, resolvedHandlers.onUpdateSessionTrainer, commitNextData]
  );

  const handleUpdateSessionPolicies = useCallback(
    async (payload: UpdateSessionPoliciesPayload) => {
      const next = await updateSessionPoliciesAction(
        data,
        payload,
        resolvedHandlers.onUpdateSessionPolicies
      );
      commitNextData(next);
    },
    [data, resolvedHandlers.onUpdateSessionPolicies, commitNextData]
  );

  const handleDeleteTrainingSession = useCallback(
    async (payload: DeleteTrainingSessionPayload) => {
      const next = await deleteTrainingSessionAction(
        data,
        payload,
        resolvedHandlers.onDeleteTrainingSession
      );
      commitNextData(next);
    },
    [data, resolvedHandlers.onDeleteTrainingSession, commitNextData]
  );

  const handleDeleteEmployee = useCallback(
    async (employeeId: string | number | undefined, employeeName: string) => {
      const next = await deleteEmployeeAction(
        data,
        employeeId,
        employeeName,
        resolvedHandlers.onDeleteEmployee
      );
      commitNextData(next);
    },
    [data, resolvedHandlers.onDeleteEmployee, commitNextData]
  );

  const handleSavePlan = useCallback(
    async (payload: SavePlanPayload) => {
      const next = await savePlanAction(data, payload, resolvedHandlers.onSavePlan);
      commitNextData(next);
    },
    [data, resolvedHandlers.onSavePlan, commitNextData]
  );

  const handleSavePlanBatch = useCallback(
    async (items: SavePlanPayload[]) => {
      const next = await savePlanBatchAction(data, items, resolvedHandlers.onSavePlanBatch);
      commitNextData(next);
    },
    [data, resolvedHandlers.onSavePlanBatch, commitNextData]
  );

  const handleFetchPlanFromGoogleSheet = useCallback(
    async (payload: FetchPlanFromGoogleSheetPayload): Promise<FetchedPlanResult> => {
      if (resolvedHandlers.onFetchPlanFromGoogleSheet) {
        return await resolvedHandlers.onFetchPlanFromGoogleSheet(payload);
      }
      throw new Error(
        'يرجى تمرير دالة onFetchPlanFromGoogleSheet لجلب الخطة من رابط Google Sheet، أو استخدام تبويب "نسخ ولصق مباشر".'
      );
    },
    [resolvedHandlers.onFetchPlanFromGoogleSheet]
  );

  const handleSaveImportedPlan = useCallback(
    async (payload: SaveImportedPlanPayload) => {
      const next = await saveImportedPlanAction(
        data,
        payload,
        resolvedHandlers.onSaveImportedPlan
      );
      commitNextData(next);
    },
    [data, resolvedHandlers.onSaveImportedPlan, commitNextData]
  );

  const handleSaveSettingsItem = useCallback(
    async (type: string, value: string) => {
      const next = await saveSettingsItemAction(
        data,
        type,
        value,
        resolvedHandlers.onSaveSettingsItem
      );
      commitNextData(next);
    },
    [data, resolvedHandlers.onSaveSettingsItem, commitNextData]
  );

  const handleDeleteSettingsItem = useCallback(
    async (type: string, value: string) => {
      const next = await deleteSettingsItemAction(
        data,
        type,
        value,
        resolvedHandlers.onDeleteSettingsItem
      );
      commitNextData(next);
    },
    [data, resolvedHandlers.onDeleteSettingsItem, commitNextData]
  );

  const handleRenamePolicy = useCallback(
    async (oldName: string, newName: string) => {
      const next = await renamePolicyAction(data, oldName, newName, resolvedHandlers.onRenamePolicy);
      commitNextData(next);
    },
    [data, resolvedHandlers.onRenamePolicy, commitNextData]
  );

  const handleRefreshData = useCallback(
    async (options?: { forceRefresh?: boolean }) => {
      if (!resolvedHandlers.onRefreshData) return;
      const fresh = await resolvedHandlers.onRefreshData(options);
      if (fresh) {
        commitNextData(fresh);
      }
    },
    [resolvedHandlers.onRefreshData, commitNextData]
  );

  const hospitalName =
    data?.settings?.slice().reverse().find((s) => s.Type === 'Hospital_Name')?.Value ||
    DEFAULT_HOSPITAL_NAME;
  const hospitalLogo =
    data?.settings?.slice().reverse().find((s) => s.Type === 'Hospital_Logo')?.Value || '';

  const navItems: Array<{ id: ReportView; l: string; i: React.ReactNode }> = [
    { id: 'stats', l: 'الإحصائيات', i: <Icons.Stats /> },
    { id: 'training', l: 'تسجيل تدريب', i: <Icons.Training /> },
    { id: 'history', l: 'سجل التدريب', i: <Icons.History /> },
    { id: 'affidavits', l: 'إفادات التدريب', i: <Icons.Certificate /> },
    { id: 'planView', l: 'الخطة السنوية', i: <Icons.Plan /> },
    { id: 'settings', l: 'الإعدادات', i: <Icons.Settings /> },
  ];

  return (
    <ToastProvider>
      <ReportStyles />
      <div className="report-root app-container font-sans bg-slate-50" dir="rtl">
        {/* Desktop Sidebar */}
        <aside className="sidebar shadow-xl shadow-slate-200/50 z-30 hidden lg:flex">
          <div className="p-8 pb-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-lg shadow-indigo-200 hover:rotate-12 transition-transform duration-500 w-12 h-12 flex items-center justify-center overflow-hidden">
                {hospitalLogo ? (
                  <img
                    src={formatGoogleDriveImageUrl(hospitalLogo)}
                    alt="شعار المستشفى"
                    className="w-full h-full object-contain rounded-lg bg-white p-0.5"
                    onError={handleDriveImgError}
                  />
                ) : (
                  <Icons.Logo />
                )}
              </div>
              <div>
                <h1 className="font-black text-xl text-slate-800 tracking-tight leading-none">
                  {hospitalName}
                </h1>
                <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
                  وحدة مكافحة العدوى
                </span>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setView(item.id)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold transition-all duration-200 group relative overflow-hidden ${
                  view === item.id
                    ? 'bg-indigo-50 text-indigo-600 shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                <span
                  className={`p-1 transition-transform group-hover:scale-110 ${
                    view === item.id ? 'scale-110' : ''
                  }`}
                >
                  {item.i}
                </span>
                <span className="relative z-10">{item.l}</span>
                {view === item.id && (
                  <span className="mr-auto w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                )}
                {view !== item.id && (
                  <span className="absolute inset-0 bg-slate-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 -z-0"></span>
                )}
              </button>
            ))}
          </nav>

          <div className="p-4 text-center text-xs text-slate-400 font-medium border-t border-slate-100 mt-auto">
            © 2026 Dr. Fady Ezzat. All Rights Reserved
          </div>
        </aside>

        <main className="main-content flex flex-col h-full">
          {/* Mobile Header */}
          <header className="lg:hidden bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0 no-print gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="bg-indigo-600 text-white p-1 rounded-lg shadow-lg shadow-indigo-200 w-8 h-8 flex items-center justify-center overflow-hidden shrink-0">
                {hospitalLogo ? (
                  <img
                    src={formatGoogleDriveImageUrl(hospitalLogo)}
                    alt="شعار المستشفى"
                    className="w-full h-full object-contain rounded bg-white p-0.5"
                    onError={handleDriveImgError}
                  />
                ) : (
                  <Icons.Logo size={24} />
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <h1 className="font-bold text-slate-800 text-xs leading-tight truncate">
                  {hospitalName}
                </h1>
                <span className="text-[10px] text-slate-400 font-bold truncate">
                  وحدة مكافحة العدوى
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                {view === 'stats' && 'الإحصائيات'}
                {view === 'training' && 'تسجيل'}
                {view === 'history' && 'السجل'}
                {view === 'affidavits' && 'الإفادات'}
                {view === 'planView' && 'الخطة'}
                {view === 'settings' && 'الإعدادات'}
              </div>
            </div>
          </header>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {view === 'stats' && <StatsPage data={data} />}
            {view === 'training' && (
              <TrainingPage
                data={data}
                onSaveTrainingSession={handleSaveTrainingSession}
                onAddEmployee={handleUpdateEmployeesBulk}
              />
            )}
            {view === 'history' && (
              <HistoryPage
                data={data}
                onUpdateTrainer={handleUpdateSessionTrainer}
                onUpdatePolicies={handleUpdateSessionPolicies}
                onDeleteSession={handleDeleteTrainingSession}
                onAddTrainees={handleAddTraineesToSession}
              />
            )}
            {view === 'affidavits' && <AffidavitsPage data={data} />}
            {view === 'planView' && (
              <PlanViewPage
                data={data}
                onSavePlan={handleSavePlan}
                onSavePlanBatch={handleSavePlanBatch}
                onFetchPlanFromGoogleSheet={handleFetchPlanFromGoogleSheet}
                onSaveImportedPlan={handleSaveImportedPlan}
              />
            )}
            {view === 'settings' && (
              <SettingsPage
                data={data}
                onUpdateDataImmediate={commitNextData}
                onUpdateEmployeesBulk={handleUpdateEmployeesBulk}
                onDeleteEmployee={handleDeleteEmployee}
                onSaveSettingsItem={handleSaveSettingsItem}
                onDeleteSettingsItem={handleDeleteSettingsItem}
                onRenamePolicy={handleRenamePolicy}
                onTestPreviousTursoDb={resolvedHandlers.onTestPreviousTursoDb}
                onImportFromPreviousTursoDb={resolvedHandlers.onImportFromPreviousTursoDb}
                onRefreshData={resolvedHandlers.onRefreshData ? handleRefreshData : undefined}
              />
            )}
          </div>
        </main>

        {/* Mobile Navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-200 pt-2 pb-3 px-2 flex flex-col z-50 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] no-print">
          <div className="flex justify-around mb-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setView(item.id)}
                className={`p-3 rounded-2xl transition-all duration-300 relative ${
                  view === item.id
                    ? 'text-indigo-600 bg-indigo-50 -translate-y-2 shadow-lg shadow-indigo-100'
                    : 'text-slate-400'
                }`}
              >
                {item.i}
                {view === item.id && (
                  <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-600"></span>
                )}
              </button>
            ))}
          </div>
          <div className="text-center text-[10px] text-slate-400 font-medium">
            © 2026 Dr. Fady Ezzat. All Rights Reserved
          </div>
        </nav>
      </div>
    </ToastProvider>
  );
};

export default Report;
