import 'dotenv/config';
import { createClient } from "@libsql/client";

// Get database URL and auth token from environment variables or fallback to a local sqlite file
const url = process.env.TURSO_DATABASE_URL || "file:local.db";
const authToken = process.env.TURSO_AUTH_TOKEN || "";

const rawDb = createClient({
  url,
  authToken,
});

function sanitizeArgs(args) {
  if (!args) return [];
  if (Array.isArray(args)) {
    return args.map(arg => (arg === undefined ? null : arg));
  }
  if (typeof args === 'object') {
    const clean = {};
    for (const [k, v] of Object.entries(args)) {
      clean[k] = v === undefined ? null : v;
    }
    return clean;
  }
  return args;
}

export const db = {
  ...rawDb,
  execute: async (stmt) => {
    if (typeof stmt === 'string') {
      return rawDb.execute(stmt);
    }
    if (stmt && stmt.args) {
      stmt = { ...stmt, args: sanitizeArgs(stmt.args) };
    }
    return rawDb.execute(stmt);
  },
  batch: async (stmts, mode = "write") => {
    const sanitized = stmts.map(s => {
      if (typeof s === 'string') return s;
      if (s && s.args) {
        return { ...s, args: sanitizeArgs(s.args) };
      }
      return s;
    });
    return rawDb.batch(sanitized, mode);
  }
};

// ==============================================================================
// In-Memory Cache Partitioned By Center (Zero Row Reads on Cache Hit)
// ==============================================================================
let inMemoryCache = {}; // centerName -> { data, expiresAt }
let centersCache = null; // { data, expiresAt }
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL

export function invalidateCentersCache() {
  centersCache = null;
}

export function invalidateCache(center = null) {
  if (center && typeof center === 'string') {
    delete inMemoryCache[center.trim()];
  } else {
    inMemoryCache = {};
    centersCache = null;
  }
}

export function getCachedData(center = "") {
  const cKey = String(center || "").trim();
  const entry = inMemoryCache[cKey];
  if (entry && Date.now() < entry.expiresAt) {
    return entry.data;
  }
  return null;
}

export function setCacheData(center, data) {
  const cKey = String(center || "").trim();
  inMemoryCache[cKey] = {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS
  };
}

export function computeUniqueCategories(settings = [], employees = []) {
  let uniqueCategories = [];
  settings.forEach(s => {
    if (s.Type === 'Category') {
      let cat = String(s.Value || "").trim();
      if (cat && uniqueCategories.indexOf(cat) === -1) {
        uniqueCategories.push(cat);
      }
    }
  });

  employees.forEach(emp => {
    let cat = String(emp.Category || "").trim();
    if (cat && uniqueCategories.indexOf(cat) === -1) {
      uniqueCategories.push(cat);
    }
  });

  if (uniqueCategories.length === 0) {
    uniqueCategories = ["تمريض", "أطباء", "عمال", "إداريين"];
  }
  return uniqueCategories;
}

let migrationDone = false;
let migrationPromise = null;

/**
 * Automatically creates tables if they don't exist, defines mandatory composite indexes,
 * and migrates schema to support multi-tenant Centers isolation.
 * Runs only once per server/serverless instance to avoid repeated Turso row reads.
 */
export async function createTablesAndMigrate() {
  if (migrationDone) return;
  if (migrationPromise) return migrationPromise;

  migrationPromise = (async () => {
    try {
      // 1. Create Tables
      await db.execute(`
        CREATE TABLE IF NOT EXISTS Training_Centers (
          ID TEXT PRIMARY KEY,
          Name TEXT UNIQUE NOT NULL,
          CreatedAt TEXT
        );
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS Training_Employees (
          ID TEXT PRIMARY KEY,
          Name TEXT NOT NULL,
          Job TEXT,
          Category TEXT NOT NULL,
          Center TEXT
        );
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS Training_TrainingLogs (
          ID TEXT PRIMARY KEY,
          Date TEXT NOT NULL,
          Month INTEGER,
          Year INTEGER,
          Category TEXT NOT NULL,
          Policies TEXT NOT NULL,
          TraineeName TEXT NOT NULL,
          Trainer TEXT NOT NULL,
          Timestamp TEXT NOT NULL,
          Center TEXT
        );
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS Training_Settings (
          Type TEXT NOT NULL,
          Value TEXT NOT NULL,
          Center TEXT
        );
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS Training_TrainingPlan (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          Month TEXT NOT NULL,
          Category TEXT NOT NULL,
          Policies TEXT NOT NULL,
          Year TEXT NOT NULL,
          Center TEXT
        );
      `);

      // Ensure Center & Year columns exist if tables were created in an older schema
      const alterQueries = [
        "ALTER TABLE Training_Employees ADD COLUMN Center TEXT;",
        "ALTER TABLE Training_TrainingLogs ADD COLUMN Center TEXT;",
        "ALTER TABLE Training_Settings ADD COLUMN Center TEXT;",
        "ALTER TABLE Training_TrainingPlan ADD COLUMN Center TEXT;",
        "ALTER TABLE Training_TrainingPlan ADD COLUMN Year TEXT;"
      ];

      for (const q of alterQueries) {
        try {
          await db.execute(q);
        } catch (e) {
          // Column already exists
        }
      }

      // 2. Mandatory Single & Composite Indexes (Center-leading for Search Instead of Scan)
      const indexQueries = [
        `CREATE INDEX IF NOT EXISTS idx_centers_name ON Training_Centers (Name);`,
        `CREATE INDEX IF NOT EXISTS idx_emp_center ON Training_Employees (Center);`,
        `CREATE INDEX IF NOT EXISTS idx_emp_center_cat ON Training_Employees (Center, Category);`,
        `CREATE INDEX IF NOT EXISTS idx_emp_center_name ON Training_Employees (Center, Name);`,
        `CREATE INDEX IF NOT EXISTS idx_emp_category ON Training_Employees (Category);`,
        `CREATE INDEX IF NOT EXISTS idx_emp_name ON Training_Employees (Name);`,

        `CREATE INDEX IF NOT EXISTS idx_logs_center ON Training_TrainingLogs (Center);`,
        `CREATE INDEX IF NOT EXISTS idx_logs_center_date ON Training_TrainingLogs (Center, Date);`,
        `CREATE INDEX IF NOT EXISTS idx_logs_center_ym ON Training_TrainingLogs (Center, Year, Month);`,
        `CREATE INDEX IF NOT EXISTS idx_logs_center_cat ON Training_TrainingLogs (Center, Category);`,
        `CREATE INDEX IF NOT EXISTS idx_logs_center_trainer ON Training_TrainingLogs (Center, Trainer);`,
        `CREATE INDEX IF NOT EXISTS idx_logs_center_trainee ON Training_TrainingLogs (Center, TraineeName);`,
        `CREATE INDEX IF NOT EXISTS idx_logs_center_session ON Training_TrainingLogs (Center, Date, Category, Policies, Trainer);`,
        `CREATE INDEX IF NOT EXISTS idx_logs_date ON Training_TrainingLogs (Date);`,
        `CREATE INDEX IF NOT EXISTS idx_logs_year_month ON Training_TrainingLogs (Year, Month);`,
        `CREATE INDEX IF NOT EXISTS idx_logs_category ON Training_TrainingLogs (Category);`,
        `CREATE INDEX IF NOT EXISTS idx_logs_trainer ON Training_TrainingLogs (Trainer);`,
        `CREATE INDEX IF NOT EXISTS idx_logs_trainee ON Training_TrainingLogs (TraineeName);`,
        `CREATE INDEX IF NOT EXISTS idx_logs_session ON Training_TrainingLogs (Date, Category, Policies, Trainer);`,

        `CREATE INDEX IF NOT EXISTS idx_settings_center ON Training_Settings (Center);`,
        `CREATE INDEX IF NOT EXISTS idx_settings_center_type ON Training_Settings (Center, Type, Value);`,
        `CREATE INDEX IF NOT EXISTS idx_settings_type ON Training_Settings (Type);`,

        `CREATE INDEX IF NOT EXISTS idx_plan_center ON Training_TrainingPlan (Center);`,
        `CREATE INDEX IF NOT EXISTS idx_plan_center_lookup ON Training_TrainingPlan (Center, Year, Category, Month);`,
        `CREATE INDEX IF NOT EXISTS idx_plan_lookup ON Training_TrainingPlan (Year, Month, Category);`,
        `CREATE INDEX IF NOT EXISTS idx_plan_year ON Training_TrainingPlan (Year);`
      ];

      await db.batch(indexQueries, "write");

      // 3. Ensure at least one default center exists and backfill any NULL/empty Center rows using indexed lookups
      const centersRes = await db.execute("SELECT Name FROM Training_Centers ORDER BY CreatedAt ASC LIMIT 1;");
      let defaultCenterName = centersRes.rows[0]?.Name ? String(centersRes.rows[0].Name).trim() : "";

      if (!defaultCenterName) {
        defaultCenterName = "مستشفى المنيا الجامعى للعيون";
        try {
          const sRes = await db.execute("SELECT Value FROM Training_Settings WHERE Type = 'Hospital_Name' LIMIT 1;");
          if (sRes.rows[0]?.Value && String(sRes.rows[0].Value).trim()) {
            defaultCenterName = String(sRes.rows[0].Value).trim();
          }
        } catch (e) {}

        const id = Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
        await db.execute({
          sql: "INSERT INTO Training_Centers (ID, Name, CreatedAt) VALUES (?, ?, ?);",
          args: [id, defaultCenterName, new Date().toISOString()]
        });
      }

      // Indexed backfill ONLY for rows where Center IS NULL or '' (O(1) via idx_*_center if none exist)
      await db.batch([
        { sql: "UPDATE Training_Employees SET Center = ? WHERE Center IS NULL OR Center = '';", args: [defaultCenterName] },
        { sql: "UPDATE Training_TrainingLogs SET Center = ? WHERE Center IS NULL OR Center = '';", args: [defaultCenterName] },
        { sql: "UPDATE Training_Settings SET Center = ? WHERE Center IS NULL OR Center = '';", args: [defaultCenterName] },
        { sql: "UPDATE Training_TrainingPlan SET Center = ? WHERE Center IS NULL OR Center = '';", args: [defaultCenterName] }
      ], "write");

      // 4. Check if settings table has any rows for default center to trigger initial seed
      const settingsCheckResult = await db.execute({
        sql: "SELECT 1 FROM Training_Settings WHERE Center = ? LIMIT 1;",
        args: [defaultCenterName]
      });

      if (settingsCheckResult.rows.length === 0) {
        const defaultSettings = [
          ["Hospital_Name", defaultCenterName],
          ["Policy", "غسل الأيدي"],
          ["Trainer", "مدرب مكافحة العدوى"],
          ["Category", "تمريض"],
          ["Category", "أطباء"],
          ["Category", "عمال"],
          ["Category", "إداريين"]
        ];

        await db.batch(
          defaultSettings.map(([type, val]) => ({
            sql: "INSERT INTO Training_Settings (Type, Value, Center) VALUES (?, ?, ?)",
            args: [type, val, defaultCenterName]
          })),
          "write"
        );
      }

      migrationDone = true;
    } catch (err) {
      migrationPromise = null;
      console.error("فشل في تهيئة قاعدة البيانات في Turso:", err);
    }
  })();

  return migrationPromise;
}

/**
 * Normalizes Arabic-Indic / Persian digits to standard ASCII 0-9
 */
function normalizeDigits(str) {
  return String(str ?? "")
    .replace(/[٠-٩]/g, d => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
}

/**
 * Safely extracts finite integer { month, year } from any date format
 */
function resolveYearAndMonth(dateVal, explicitMonth = null, explicitYear = null, fallbackToNow = true) {
  let m = explicitMonth !== null && explicitMonth !== undefined && String(explicitMonth).trim() !== ""
    ? parseInt(normalizeDigits(explicitMonth).trim(), 10)
    : null;
  let y = explicitYear !== null && explicitYear !== undefined && String(explicitYear).trim() !== ""
    ? parseInt(normalizeDigits(explicitYear).trim(), 10)
    : null;

  if (!Number.isFinite(m) || m < 1 || m > 12) m = null;
  if (!Number.isFinite(y) || y < 1900 || y > 2100) y = null;

  if (m === null || y === null) {
    const rawStr = normalizeDigits(String(dateVal || "")).split('T')[0].trim();
    const ymdMatch = rawStr.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    const dmyMatch = rawStr.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);

    if (ymdMatch) {
      const parsedY = parseInt(ymdMatch[1], 10);
      let parsedM = parseInt(ymdMatch[2], 10);
      const parsedD = parseInt(ymdMatch[3], 10);
      if (parsedM > 12 && parsedD >= 1 && parsedD <= 12) parsedM = parsedD;
      if (y === null && parsedY >= 1900 && parsedY <= 2100) y = parsedY;
      if (m === null && parsedM >= 1 && parsedM <= 12) m = parsedM;
    } else if (dmyMatch) {
      const first = parseInt(dmyMatch[1], 10);
      const second = parseInt(dmyMatch[2], 10);
      const parsedY = parseInt(dmyMatch[3], 10);
      const parsedM = (second >= 1 && second <= 12) ? second : ((first >= 1 && first <= 12) ? first : null);
      if (y === null && parsedY >= 1900 && parsedY <= 2100) y = parsedY;
      if (m === null && parsedM !== null) m = parsedM;
    } else if (rawStr) {
      const dObj = new Date(rawStr);
      if (!isNaN(dObj.getTime())) {
        if (y === null) y = dObj.getFullYear();
        if (m === null) m = dObj.getMonth() + 1;
      }
    }
  }

  if (fallbackToNow) {
    const now = new Date();
    if (!Number.isFinite(m) || m < 1 || m > 12) m = now.getMonth() + 1;
    if (!Number.isFinite(y) || y < 1900 || y > 2100) y = now.getFullYear();
  } else {
    if (!Number.isFinite(m) || m < 1 || m > 12) m = null;
    if (!Number.isFinite(y) || y < 1900 || y > 2100) y = null;
  }

  return {
    month: m !== null ? Math.trunc(m) : null,
    year: y !== null ? Math.trunc(y) : null
  };
}

/**
 * Ensures SQL arguments never contain NaN, Infinity, or undefined
 */
function sanitizeSqlArgs(args = []) {
  return args.map(val => {
    if (val === undefined) return null;
    if (typeof val === 'number' && !Number.isFinite(val)) return null;
    return val;
  });
}

/**
 * Returns default/first center name
 */
export async function getDefaultCenterDb() {
  try {
    const res = await db.execute("SELECT Name FROM Training_Centers ORDER BY CreatedAt ASC LIMIT 1;");
    if (res.rows.length > 0 && res.rows[0].Name) {
      return String(res.rows[0].Name).trim();
    }
  } catch (e) {}
  return "مستشفى المنيا الجامعى للعيون";
}

/**
 * Fetches all registered centers with their employee & session counts.
 * Uses In-Memory Cache and covering index GROUP BY queries (no full table scans).
 */
export async function getCentersDb(forceRefresh = false) {
  if (!forceRefresh && centersCache && Date.now() < centersCache.expiresAt) {
    return centersCache.data;
  }

  await createTablesAndMigrate();

  const [centersRes, empCountsRes, sessionCountsRes] = await Promise.all([
    db.execute("SELECT ID, Name, CreatedAt FROM Training_Centers ORDER BY CreatedAt ASC;"),
    db.execute("SELECT Center, COUNT(*) as count FROM Training_Employees GROUP BY Center;"),
    db.execute(`
      SELECT Center, COUNT(*) as count
      FROM (
        SELECT Center, Date, Category, Policies, Trainer
        FROM Training_TrainingLogs
        GROUP BY Center, Date, Category, Policies, Trainer
      )
      GROUP BY Center;
    `)
  ]);

  const empCountMap = new Map();
  for (const r of empCountsRes.rows) {
    const cName = String(r.Center || "").trim();
    if (cName) empCountMap.set(cName, (empCountMap.get(cName) || 0) + Number(r.count || 0));
  }

  const sessionCountMap = new Map();
  for (const r of sessionCountsRes.rows) {
    const cName = String(r.Center || "").trim();
    if (cName) sessionCountMap.set(cName, (sessionCountMap.get(cName) || 0) + Number(r.count || 0));
  }

  const centers = [];
  for (const row of centersRes.rows) {
    const name = String(row.Name || "").trim();
    if (!name) continue;

    centers.push({
      ID: String(row.ID || ""),
      Name: name,
      CreatedAt: String(row.CreatedAt || ""),
      employeesCount: empCountMap.get(name) || 0,
      sessionsCount: sessionCountMap.get(name) || 0
    });
  }

  centersCache = {
    data: centers,
    expiresAt: Date.now() + CACHE_TTL_MS
  };

  return centers;
}

/**
 * Adds a new center and seeds basic default settings for it
 */
export async function addCenterDb(centerName) {
  if (!centerName || !String(centerName).trim()) {
    throw new Error("يرجى إدخال اسم المركز");
  }
  const cleanName = String(centerName).trim();
  await createTablesAndMigrate();

  const existing = await db.execute({
    sql: "SELECT Name FROM Training_Centers WHERE Name = ? LIMIT 1;",
    args: [cleanName]
  });
  if (existing.rows.length > 0) {
    throw new Error(`المركز "${cleanName}" مسجل بالفعل مسبقاً`);
  }

  const id = Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  const defaultSettings = [
    ["Hospital_Name", cleanName],
    ["Policy", "غسل الأيدي"],
    ["Trainer", "مدرب مكافحة العدوى"],
    ["Category", "تمريض"],
    ["Category", "أطباء"],
    ["Category", "عمال"],
    ["Category", "إداريين"]
  ];

  await db.batch([
    {
      sql: "INSERT INTO Training_Centers (ID, Name, CreatedAt) VALUES (?, ?, ?);",
      args: [id, cleanName, new Date().toISOString()]
    },
    ...defaultSettings.map(([type, val]) => ({
      sql: "INSERT INTO Training_Settings (Type, Value, Center) VALUES (?, ?, ?);",
      args: [type, val, cleanName]
    }))
  ], "write");

  invalidateCache(cleanName);
  invalidateCentersCache();
  return getCentersDb(true);
}

/**
 * Deletes a center and permanently purges ALL data belonging to that center across all tables
 */
export async function deleteCenterDb(centerName) {
  if (!centerName || !String(centerName).trim()) {
    throw new Error("يرجى تحديد اسم المركز المراد حذفه");
  }
  const cleanName = String(centerName).trim();
  await createTablesAndMigrate();

  await db.batch([
    { sql: "DELETE FROM Training_Employees WHERE Center = ?;", args: [cleanName] },
    { sql: "DELETE FROM Training_TrainingLogs WHERE Center = ?;", args: [cleanName] },
    { sql: "DELETE FROM Training_TrainingPlan WHERE Center = ?;", args: [cleanName] },
    { sql: "DELETE FROM Training_Settings WHERE Center = ?;", args: [cleanName] },
    { sql: "DELETE FROM Training_Centers WHERE Name = ?;", args: [cleanName] }
  ], "write");

  invalidateCache(cleanName);
  invalidateCentersCache();

  return getCentersDb(true);
}

/**
 * Fetches all database tables strictly isolated by Center.
 * Uses In-Memory Cache-Aside BEFORE touching the database (0 row reads on cache hit).
 */
export async function getAllDataDb(options = {}) {
  let targetCenter = "";
  let forceRefresh = false;

  if (typeof options === 'string') {
    targetCenter = options.trim();
  } else if (options && typeof options === 'object') {
    targetCenter = String(options.center || options.currentCenter || "").trim();
    forceRefresh = !!options.forceRefresh;
  }

  // Fast path: if both center data & centers list are cached, return immediately (0 Turso reads)
  if (!forceRefresh && targetCenter && inMemoryCache[targetCenter] && Date.now() < inMemoryCache[targetCenter].expiresAt) {
    const cachedCenters = centersCache && Date.now() < centersCache.expiresAt ? centersCache.data : await getCentersDb();
    if (cachedCenters.some(c => c.Name === targetCenter)) {
      return {
        ...inMemoryCache[targetCenter].data,
        centers: cachedCenters,
        currentCenter: targetCenter
      };
    }
  }

  await createTablesAndMigrate();

  // Fetch available centers (uses centersCache when valid)
  const centersList = await getCentersDb(forceRefresh);
  const centerNames = centersList.map(c => c.Name);

  if (!targetCenter || !centerNames.includes(targetCenter)) {
    targetCenter = centerNames.length > 0 ? centerNames[0] : await getDefaultCenterDb();
  }

  // Check in-memory cache again after resolving default targetCenter
  const cached = inMemoryCache[targetCenter];
  if (!forceRefresh && cached && Date.now() < cached.expiresAt) {
    return {
      ...cached.data,
      centers: centersList,
      currentCenter: targetCenter
    };
  }

  // Query isolated data for this center using direct indexed equality (SEARCH ... USING INDEX)
  const [employeesResult, logsResult, settingsResult, planResult] = await Promise.all([
    db.execute({
      sql: "SELECT ID, Name, Job, Category FROM Training_Employees WHERE Center = ?;",
      args: [targetCenter]
    }),
    db.execute({
      sql: "SELECT ID, Date, Month, Year, Category, Policies, TraineeName, Trainer, Timestamp FROM Training_TrainingLogs WHERE Center = ?;",
      args: [targetCenter]
    }),
    db.execute({
      sql: "SELECT Type, Value FROM Training_Settings WHERE Center = ?;",
      args: [targetCenter]
    }),
    db.execute({
      sql: "SELECT rowid, Month, Category, Policies, Year FROM Training_TrainingPlan WHERE Center = ?;",
      args: [targetCenter]
    })
  ]);

  const employees = employeesResult.rows.map(r => ({
    ID: String(r.ID),
    Name: String(r.Name || ""),
    Job: String(r.Job || ""),
    Category: String(r.Category || "")
  }));

  const logs = logsResult.rows.map(r => {
    const { month: m, year: y } = resolveYearAndMonth(r.Date, r.Month, r.Year, false);
    return {
      ID: String(r.ID),
      Date: String(r.Date || ""),
      Month: m,
      Year: y,
      Category: String(r.Category || ""),
      Policies: String(r.Policies || ""),
      TraineeName: String(r.TraineeName || ""),
      Trainer: String(r.Trainer || ""),
      Timestamp: String(r.Timestamp || "")
    };
  });

  const settings = settingsResult.rows.map(r => ({
    Type: String(r.Type || ""),
    Value: String(r.Value || "")
  }));

  const plan = planResult.rows.map(r => ({
    Month: String(r.Month || ""),
    Category: String(r.Category || ""),
    Policies: String(r.Policies || ""),
    Year: String(r.Year || "")
  }));

  const uniqueCategories = computeUniqueCategories(settings, employees);

  const fullData = {
    employees,
    logs,
    settings,
    plan,
    categories: uniqueCategories,
    centers: centersList,
    currentCenter: targetCenter
  };

  inMemoryCache[targetCenter] = {
    data: fullData,
    expiresAt: Date.now() + CACHE_TTL_MS
  };

  return fullData;
}

/**
 * Saves a training session for a specific center
 */
export async function saveTrainingSessionDb(data, centerArg = "") {
  await createTablesAndMigrate();
  const center = String(data?.center || centerArg || "").trim() || await getDefaultCenterDb();
  const timestamp = new Date().toISOString().replace('T', ' ').substr(0, 19);
  const { month, year } = resolveYearAndMonth(data.date, data.month, data.year, true);
  
  const newLogs = [];
  const batchStatements = [];
  for (const t of data.trainees) {
    const uuid = Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    const newLog = {
      ID: uuid,
      Date: data.date,
      Month: month,
      Year: year,
      Category: data.category.trim(),
      Policies: data.policies.join(", "),
      TraineeName: t.trim(),
      Trainer: data.trainer.trim(),
      Timestamp: timestamp,
      Center: center
    };
    newLogs.push(newLog);
    batchStatements.push({
      sql: `INSERT INTO Training_TrainingLogs 
        (ID, Date, Month, Year, Category, Policies, TraineeName, Trainer, Timestamp, Center) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: sanitizeSqlArgs([
        uuid,
        data.date,
        month,
        year,
        data.category.trim(),
        data.policies.join(", "),
        t.trim(),
        data.trainer.trim(),
        timestamp,
        center
      ])
    });
  }

  if (batchStatements.length > 0) {
    const chunkSize = 500;
    for (let i = 0; i < batchStatements.length; i += chunkSize) {
      const chunk = batchStatements.slice(i, i + chunkSize);
      await db.batch(chunk, "write");
    }
  }

  // Ensure trainer is added to settings for this center (uses idx_settings_center_type)
  const cleanTrainer = data.trainer ? data.trainer.trim() : "";
  if (cleanTrainer) {
    try {
      const existing = await db.execute({
        sql: "SELECT Value FROM Training_Settings WHERE Center = ? AND Type = 'Trainer' AND Value = ? LIMIT 1;",
        args: [center, cleanTrainer]
      });
      if (existing.rows.length === 0) {
        await db.execute({
          sql: "INSERT INTO Training_Settings (Type, Value, Center) VALUES ('Trainer', ?, ?);",
          args: [cleanTrainer, center]
        });
      }
    } catch (e) {}
  }

  invalidateCentersCache();

  // Update in-memory cache optimistically
  if (inMemoryCache[center]?.data) {
    inMemoryCache[center].data.logs.push(...newLogs);
    if (cleanTrainer && !inMemoryCache[center].data.settings.some(s => s.Type === 'Trainer' && String(s.Value).trim() === cleanTrainer)) {
      inMemoryCache[center].data.settings.push({ Type: 'Trainer', Value: cleanTrainer });
    }
    inMemoryCache[center].data.categories = computeUniqueCategories(inMemoryCache[center].data.settings, inMemoryCache[center].data.employees);
    inMemoryCache[center].expiresAt = Date.now() + CACHE_TTL_MS;
    return inMemoryCache[center].data;
  }

  return getAllDataDb({ center, forceRefresh: true });
}

/**
 * Adds new trainees to an existing training session
 */
export async function addTraineesToSessionDb(payload = {}, centerArg = "") {
  await createTablesAndMigrate();
  const { date, month: payloadMonth, year: payloadYear, category, policies, trainer, trainees = [], newEmployees = [] } = payload;
  const center = String(payload.center || centerArg || "").trim() || await getDefaultCenterDb();

  if (!trainees || trainees.length === 0) {
    throw new Error("يرجى اختيار أو إدخال متدرب واحد على الأقل لإضافته إلى الجلسة");
  }

  const rawDate = date !== null && date !== undefined ? String(date).trim() : "";
  const cleanDate = rawDate.split('T')[0].trim();
  const cleanCat = category ? String(category).trim() : "";
  const cleanPol = Array.isArray(policies) ? policies.join(", ") : String(policies || "").trim();
  const cleanTrainer = trainer ? String(trainer).trim() : "";
  const timestamp = new Date().toISOString().replace('T', ' ').substr(0, 19);

  // 1. If any new employees were created on the fly, save them to Training_Employees with Center
  const addedEmployees = [];
  if (Array.isArray(newEmployees) && newEmployees.length > 0) {
    const empBatch = [];
    for (const emp of newEmployees) {
      if (emp && emp.Name && String(emp.Name).trim()) {
        const empId = String(emp.ID || (Math.random().toString(36).substr(2, 9) + Date.now().toString(36)));
        const empName = String(emp.Name).trim();
        const empJob = String(emp.Job || "").trim() || "موظف";
        const empCat = String(emp.Category || cleanCat).trim();

        empBatch.push({
          sql: `INSERT OR IGNORE INTO Training_Employees (ID, Name, Job, Category, Center) VALUES (?, ?, ?, ?, ?)`,
          args: sanitizeSqlArgs([empId, empName, empJob, empCat, center])
        });
        addedEmployees.push({ ID: empId, Name: empName, Job: empJob, Category: empCat });
      }
    }
    if (empBatch.length > 0) {
      await db.batch(empBatch, "write");
    }
  }

  // 2. Fetch existing trainee names in session for this center (uses idx_logs_center_date)
  const existingNamesInSession = new Set();
  let matchedSessionMonth = null;
  let matchedSessionYear = null;
  let matchedExactDate = rawDate || cleanDate;

  if (inMemoryCache[center]?.data) {
    inMemoryCache[center].data.logs.forEach(l => {
      const lDate = String(l.Date || "").split('T')[0].trim();
      if (lDate === cleanDate && 
          String(l.Category || "").trim() === cleanCat && 
          String(l.Policies || "").trim() === cleanPol && 
          (!cleanTrainer || String(l.Trainer || "").trim() === cleanTrainer)) {
        existingNamesInSession.add(String(l.TraineeName || "").trim());
        if (l.Date) matchedExactDate = String(l.Date);
        if (matchedSessionMonth === null && l.Month) matchedSessionMonth = l.Month;
        if (matchedSessionYear === null && l.Year) matchedSessionYear = l.Year;
      }
    });
  } else if (cleanDate && cleanCat) {
    const sessionCheck = await db.execute({
      sql: `SELECT Date, Month, Year, TraineeName, Policies, Trainer FROM Training_TrainingLogs 
            WHERE Center = ? AND Date = ? AND Category = ? LIMIT 250`,
      args: [center, rawDate || cleanDate, cleanCat]
    });
    for (const r of sessionCheck.rows) {
      if (String(r.Policies || "").trim() === cleanPol &&
          (!cleanTrainer || String(r.Trainer || "").trim() === cleanTrainer)) {
        existingNamesInSession.add(String(r.TraineeName || "").trim());
        if (r.Date) matchedExactDate = String(r.Date);
        if (matchedSessionMonth === null && r.Month !== null && r.Month !== undefined) matchedSessionMonth = r.Month;
        if (matchedSessionYear === null && r.Year !== null && r.Year !== undefined) matchedSessionYear = r.Year;
      }
    }
  }

  const { month, year } = resolveYearAndMonth(
    matchedExactDate || cleanDate,
    payloadMonth ?? matchedSessionMonth,
    payloadYear ?? matchedSessionYear,
    true
  );

  const batchStatements = [];
  const newLogs = [];

  for (const t of trainees) {
    const cleanTrainee = String(t || "").trim();
    if (!cleanTrainee) continue;
    if (existingNamesInSession.has(cleanTrainee)) {
      continue;
    }
    existingNamesInSession.add(cleanTrainee);

    const uuid = Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    const newLog = {
      ID: uuid,
      Date: matchedExactDate,
      Month: month,
      Year: year,
      Category: cleanCat,
      Policies: cleanPol,
      TraineeName: cleanTrainee,
      Trainer: cleanTrainer,
      Timestamp: timestamp,
      Center: center
    };
    newLogs.push(newLog);
    batchStatements.push({
      sql: `INSERT INTO Training_TrainingLogs 
        (ID, Date, Month, Year, Category, Policies, TraineeName, Trainer, Timestamp, Center) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: sanitizeSqlArgs([
        uuid,
        matchedExactDate,
        month,
        year,
        cleanCat,
        cleanPol,
        cleanTrainee,
        cleanTrainer,
        timestamp,
        center
      ])
    });
  }

  if (batchStatements.length > 0) {
    const chunkSize = 500;
    for (let i = 0; i < batchStatements.length; i += chunkSize) {
      const chunk = batchStatements.slice(i, i + chunkSize);
      await db.batch(chunk, "write");
    }
  }

  invalidateCentersCache();

  if (inMemoryCache[center]?.data) {
    inMemoryCache[center].data.logs.push(...newLogs);
    if (addedEmployees.length > 0) {
      inMemoryCache[center].data.employees.push(...addedEmployees);
    }
    inMemoryCache[center].data.categories = computeUniqueCategories(inMemoryCache[center].data.settings, inMemoryCache[center].data.employees);
    inMemoryCache[center].expiresAt = Date.now() + CACHE_TTL_MS;
    return inMemoryCache[center].data;
  }

  return getAllDataDb({ center, forceRefresh: true });
}

/**
 * Updates the trainer for an entire training session
 */
export async function updateSessionTrainerDb(payload = {}, centerArg = "") {
  await createTablesAndMigrate();
  const { date, category, policies, oldTrainer, newTrainer, logIds } = payload;
  const center = String(payload.center || centerArg || "").trim() || await getDefaultCenterDb();

  if (!newTrainer || !String(newTrainer).trim()) {
    throw new Error("يرجى إدخال أو اختيار اسم المدرب الجديد");
  }
  const cleanNewTrainer = String(newTrainer).trim();
  const cleanOldTrainer = oldTrainer ? String(oldTrainer).trim() : "";
  const cleanDate = date ? String(date).split('T')[0].trim() : "";
  const cleanCat = category ? String(category).trim() : "";
  const cleanPol = policies ? String(policies).trim() : "";

  // 1. Update by specific Log IDs if provided (uses PRIMARY KEY)
  if (Array.isArray(logIds) && logIds.length > 0) {
    const validIds = logIds.filter(Boolean);
    for (let i = 0; i < validIds.length; i += 50) {
      const chunk = validIds.slice(i, i + 50);
      const placeholders = chunk.map(() => '?').join(',');
      await db.execute({
        sql: `UPDATE Training_TrainingLogs SET Trainer = ? WHERE ID IN (${placeholders}) AND Center = ?`,
        args: [cleanNewTrainer, ...chunk, center]
      });
    }
  }

  // 2. Also update by session composite match (uses idx_logs_center_cat)
  if (cleanDate && cleanCat && cleanPol) {
    let sql = `UPDATE Training_TrainingLogs 
               SET Trainer = ? 
               WHERE Center = ? 
                 AND Category = ? 
                 AND Policies = ?
                 AND (Date = ? OR Date LIKE ?)`;
    const args = [cleanNewTrainer, center, cleanCat, cleanPol, cleanDate, `${cleanDate}%`];
    if (cleanOldTrainer) {
      sql += ` AND Trainer = ?`;
      args.push(cleanOldTrainer);
    }
    await db.execute({ sql, args });
  }

  // 3. Ensure the new trainer exists in Training_Settings for this center (uses idx_settings_center_type)
  try {
    const existing = await db.execute({
      sql: "SELECT Value FROM Training_Settings WHERE Center = ? AND Type = 'Trainer' AND Value = ? LIMIT 1",
      args: [center, cleanNewTrainer]
    });
    if (existing.rows.length === 0) {
      await db.execute({
        sql: "INSERT INTO Training_Settings (Type, Value, Center) VALUES ('Trainer', ?, ?)",
        args: [cleanNewTrainer, center]
      });
    }
  } catch (err) {}

  invalidateCentersCache();

  if (inMemoryCache[center]?.data) {
    const validIdsSet = new Set(Array.isArray(logIds) ? logIds.filter(Boolean).map(String) : []);
    inMemoryCache[center].data.logs.forEach(l => {
      const matchesId = validIdsSet.size > 0 && validIdsSet.has(String(l.ID));
      const lDate = String(l.Date || "").split('T')[0].trim();
      const matchesComp = cleanDate && cleanCat && cleanPol && 
        lDate === cleanDate && 
        String(l.Category || "").trim() === cleanCat && 
        String(l.Policies || "").trim() === cleanPol && 
        (!cleanOldTrainer || String(l.Trainer || "").trim() === cleanOldTrainer);
      if (matchesId || matchesComp) {
        l.Trainer = cleanNewTrainer;
      }
    });
    if (!inMemoryCache[center].data.settings.some(s => s.Type === 'Trainer' && String(s.Value).trim() === cleanNewTrainer)) {
      inMemoryCache[center].data.settings.push({ Type: 'Trainer', Value: cleanNewTrainer });
    }
    inMemoryCache[center].expiresAt = Date.now() + CACHE_TTL_MS;
    return inMemoryCache[center].data;
  }

  return getAllDataDb({ center, forceRefresh: true });
}

/**
 * Updates policies for an entire training session
 */
export async function updateSessionPoliciesDb(payload = {}, centerArg = "") {
  await createTablesAndMigrate();
  const { date, category, oldPolicies, newPolicies, trainer, logIds } = payload;
  const center = String(payload.center || centerArg || "").trim() || await getDefaultCenterDb();

  let cleanNewPolicies = "";
  if (Array.isArray(newPolicies)) {
    cleanNewPolicies = newPolicies.map(p => String(p).trim()).filter(Boolean).join(", ");
  } else if (newPolicies) {
    cleanNewPolicies = String(newPolicies).trim();
  }

  if (!cleanNewPolicies) {
    throw new Error("يرجى إدخال أو اختيار السياسات الجديدة");
  }

  const cleanOldPolicies = oldPolicies ? String(oldPolicies).trim() : "";
  const cleanDate = date ? String(date).split('T')[0].trim() : "";
  const cleanCat = category ? String(category).trim() : "";
  const cleanTrainer = trainer ? String(trainer).trim() : "";

  // 1. Update by specific Log IDs if provided (uses PRIMARY KEY)
  if (Array.isArray(logIds) && logIds.length > 0) {
    const validIds = logIds.filter(Boolean);
    for (let i = 0; i < validIds.length; i += 50) {
      const chunk = validIds.slice(i, i + 50);
      const placeholders = chunk.map(() => '?').join(',');
      await db.execute({
        sql: `UPDATE Training_TrainingLogs SET Policies = ? WHERE ID IN (${placeholders}) AND Center = ?`,
        args: [cleanNewPolicies, ...chunk, center]
      });
    }
  }

  // 2. Also update by session composite match (uses idx_logs_center_cat)
  if (cleanDate && cleanCat && cleanOldPolicies) {
    let sql = `UPDATE Training_TrainingLogs 
               SET Policies = ? 
               WHERE Center = ? 
                 AND Category = ? 
                 AND Policies = ?
                 AND (Date = ? OR Date LIKE ?)`;
    const args = [cleanNewPolicies, center, cleanCat, cleanOldPolicies, cleanDate, `${cleanDate}%`];
    if (cleanTrainer) {
      sql += ` AND Trainer = ?`;
      args.push(cleanTrainer);
    }
    await db.execute({ sql, args });
  }

  // 3. Ensure any new policy names exist in Training_Settings for this center (uses idx_settings_center_type)
  try {
    const parts = cleanNewPolicies.split(/[,،\n]+/).map(p => p.trim()).filter(Boolean);
    for (const pol of parts) {
      const baseName = pol.replace(/\([^)]*\)/g, '').trim();
      const targetToAdd = baseName || pol;
      if (targetToAdd) {
        const existing = await db.execute({
          sql: "SELECT Value FROM Training_Settings WHERE Center = ? AND Type = 'Policy' AND Value = ? LIMIT 1",
          args: [center, targetToAdd]
        });
        if (existing.rows.length === 0) {
          await db.execute({
            sql: "INSERT INTO Training_Settings (Type, Value, Center) VALUES ('Policy', ?, ?)",
            args: [targetToAdd, center]
          });
        }
      }
    }
  } catch (err) {}

  invalidateCentersCache();

  if (inMemoryCache[center]?.data) {
    const validIdsSet = new Set(Array.isArray(logIds) ? logIds.filter(Boolean).map(String) : []);
    inMemoryCache[center].data.logs.forEach(l => {
      const matchesId = validIdsSet.size > 0 && validIdsSet.has(String(l.ID));
      const lDate = String(l.Date || "").split('T')[0].trim();
      const matchesComp = cleanDate && cleanCat && cleanOldPolicies && 
        lDate === cleanDate && 
        String(l.Category || "").trim() === cleanCat && 
        String(l.Policies || "").trim() === cleanOldPolicies && 
        (!cleanTrainer || String(l.Trainer || "").trim() === cleanTrainer);
      if (matchesId || matchesComp) {
        l.Policies = cleanNewPolicies;
      }
    });
    inMemoryCache[center].expiresAt = Date.now() + CACHE_TTL_MS;
    return inMemoryCache[center].data;
  }

  return getAllDataDb({ center, forceRefresh: true });
}

/**
 * Updates the date (and corresponding month & year) for an entire saved training session within a center
 */
export async function updateSessionDateDb(payload = {}, centerArg = "") {
  await createTablesAndMigrate();
  const { oldDate, newDate, category, policies, trainer, logIds } = payload;
  const center = String(payload.center || centerArg || "").trim() || await getDefaultCenterDb();

  const parsedNew = parseYmdSafe(newDate);
  if (!parsedNew) {
    throw new Error("يرجى اختيار تاريخ صحيح للجلسة");
  }

  const cleanNewDate = parsedNew.clean;
  const newMonth = parsedNew.month;
  const newYear = parsedNew.year;

  const cleanOldDate = oldDate ? String(oldDate).split('T')[0].trim() : "";
  const cleanCat = category ? String(category).trim() : "";
  const cleanPol = policies ? String(policies).trim() : "";
  const cleanTrainer = trainer ? String(trainer).trim() : "";

  // 1. Update by specific Log IDs if provided (uses PRIMARY KEY)
  if (Array.isArray(logIds) && logIds.length > 0) {
    const validIds = logIds.filter(Boolean);
    for (let i = 0; i < validIds.length; i += 50) {
      const chunk = validIds.slice(i, i + 50);
      const placeholders = chunk.map(() => '?').join(',');
      await db.execute({
        sql: `UPDATE Training_TrainingLogs SET Date = ?, Month = ?, Year = ? WHERE ID IN (${placeholders}) AND Center = ?`,
        args: [cleanNewDate, newMonth, newYear, ...chunk, center]
      });
    }
  }

  // 2. Also update by composite session match (uses idx_logs_center_cat)
  if (cleanOldDate && cleanCat && cleanPol) {
    let sql = `UPDATE Training_TrainingLogs
               SET Date = ?, Month = ?, Year = ?
               WHERE Center = ?
                 AND Category = ?
                 AND Policies = ?
                 AND (Date = ? OR Date LIKE ?)`;
    const args = [cleanNewDate, newMonth, newYear, center, cleanCat, cleanPol, cleanOldDate, `${cleanOldDate}%`];
    if (cleanTrainer) {
      sql += ` AND Trainer = ?`;
      args.push(cleanTrainer);
    }
    await db.execute({ sql, args });
  }

  invalidateCentersCache();

  if (inMemoryCache[center]?.data) {
    const validIdsSet = new Set(Array.isArray(logIds) ? logIds.filter(Boolean).map(String) : []);
    inMemoryCache[center].data.logs.forEach(l => {
      const matchesId = validIdsSet.size > 0 && validIdsSet.has(String(l.ID));
      const lDate = String(l.Date || "").split('T')[0].trim();
      const matchesComp = cleanOldDate && cleanCat && cleanPol &&
        lDate === cleanOldDate &&
        String(l.Category || "").trim() === cleanCat &&
        String(l.Policies || "").trim() === cleanPol &&
        (!cleanTrainer || String(l.Trainer || "").trim() === cleanTrainer);
      if (matchesId || matchesComp) {
        l.Date = cleanNewDate;
        l.Month = newMonth;
        l.Year = newYear;
      }
    });
    inMemoryCache[center].expiresAt = Date.now() + CACHE_TTL_MS;
    return inMemoryCache[center].data;
  }

  return getAllDataDb({ center, forceRefresh: true });
}

/**
 * Deletes an entire training session or a single trainee record within a center
 */
export async function deleteTrainingSessionDb(payload = {}, centerArg = "") {
  await createTablesAndMigrate();
  const { date, category, policies, trainer, logIds, singleLogId } = payload;
  const center = String(payload.center || centerArg || "").trim() || await getDefaultCenterDb();

  // Case 1: Delete only a single trainee record by ID (uses PRIMARY KEY)
  if (singleLogId) {
    await db.execute({
      sql: `DELETE FROM Training_TrainingLogs WHERE ID = ? AND Center = ?`,
      args: [String(singleLogId), center]
    });
    invalidateCentersCache();
    if (inMemoryCache[center]?.data) {
      inMemoryCache[center].data.logs = inMemoryCache[center].data.logs.filter(l => String(l.ID) !== String(singleLogId));
      inMemoryCache[center].expiresAt = Date.now() + CACHE_TTL_MS;
      return inMemoryCache[center].data;
    }
    return getAllDataDb({ center, forceRefresh: true });
  }

  // Case 2: Delete entire session by specific Log IDs if provided
  if (Array.isArray(logIds) && logIds.length > 0) {
    const validIds = logIds.filter(Boolean).map(String);
    for (let i = 0; i < validIds.length; i += 50) {
      const chunk = validIds.slice(i, i + 50);
      const placeholders = chunk.map(() => '?').join(',');
      await db.execute({
        sql: `DELETE FROM Training_TrainingLogs WHERE ID IN (${placeholders}) AND Center = ?`,
        args: [...chunk, center]
      });
    }
  }

  // Also delete by session composite match (uses idx_logs_center_cat)
  const cleanTrainer = trainer ? String(trainer).trim() : "";
  const cleanDate = date ? String(date).split('T')[0].trim() : "";
  const cleanCat = category ? String(category).trim() : "";
  const cleanPol = policies ? String(policies).trim() : "";

  if (cleanDate && cleanCat && cleanPol) {
    let sql = `DELETE FROM Training_TrainingLogs 
               WHERE Center = ? 
                 AND Category = ? 
                 AND Policies = ?
                 AND (Date = ? OR Date LIKE ?)`;
    const args = [center, cleanCat, cleanPol, cleanDate, `${cleanDate}%`];
    if (cleanTrainer) {
      sql += ` AND Trainer = ?`;
      args.push(cleanTrainer);
    }
    await db.execute({ sql, args });
  }

  invalidateCentersCache();

  if (inMemoryCache[center]?.data) {
    const validIdsSet = new Set(Array.isArray(logIds) ? logIds.filter(Boolean).map(String) : []);
    inMemoryCache[center].data.logs = inMemoryCache[center].data.logs.filter(l => {
      if (validIdsSet.size > 0 && validIdsSet.has(String(l.ID))) {
        return false;
      }
      const lDate = String(l.Date || "").split('T')[0].trim();
      const matchesComp = cleanDate && cleanCat && cleanPol && 
        lDate === cleanDate && 
        String(l.Category || "").trim() === cleanCat && 
        String(l.Policies || "").trim() === cleanPol && 
        (!cleanTrainer || String(l.Trainer || "").trim() === cleanTrainer);
      return !matchesComp;
    });
    inMemoryCache[center].expiresAt = Date.now() + CACHE_TTL_MS;
    return inMemoryCache[center].data;
  }

  return getAllDataDb({ center, forceRefresh: true });
}

/**
 * Saves training plan data - strictly isolated by Center, Year, Month, and Category
 */
export async function savePlanDb(planData, centerArg = "") {
  await createTablesAndMigrate();
  const center = String(planData?.center || centerArg || "").trim() || await getDefaultCenterDb();
  const targetYear = planData.year ? String(planData.year).trim() : String(new Date().getFullYear());
  const targetMonth = String(planData.month).trim();
  const targetCategory = String(planData.category).trim();
  const policiesStr = Array.isArray(planData.policies) ? planData.policies.join(", ") : String(planData.policies || "");

  const currentYearStr = String(new Date().getFullYear());
  const isCurrentYear = targetYear === currentYearStr;

  const yearCondition = isCurrentYear ? "(Year = ? OR Year = '' OR Year IS NULL)" : "Year = ?";
  const checkResult = await db.execute({
    sql: `SELECT rowid, Month, Category, Year FROM Training_TrainingPlan 
          WHERE Center = ? 
            AND ${yearCondition}
            AND Category = ? 
            AND (Month = ? OR CAST(Month AS INT) = CAST(? AS INT))`,
    args: [center, targetYear, targetCategory, targetMonth, targetMonth]
  });

  let matchingRow = null;
  if (checkResult.rows.length > 0) {
    matchingRow = checkResult.rows.find(r => String(r.Year || "").trim() === targetYear) || checkResult.rows[0];
  }

  if (matchingRow) {
    const rowId = matchingRow.rowid ?? matchingRow[0];
    await db.execute({
      sql: "UPDATE Training_TrainingPlan SET Policies = ?, Month = ?, Category = ?, Year = ?, Center = ? WHERE rowid = ?",
      args: [policiesStr, targetMonth, targetCategory, targetYear, center, rowId]
    });
    if (checkResult.rows.length > 1) {
      const dupIds = checkResult.rows
        .map(r => r.rowid ?? r[0])
        .filter(id => id !== rowId);
      if (dupIds.length > 0) {
        const placeholders = dupIds.map(() => '?').join(',');
        await db.execute({
          sql: `DELETE FROM Training_TrainingPlan WHERE rowid IN (${placeholders})`,
          args: dupIds
        });
      }
    }
  } else {
    await db.execute({
      sql: "INSERT INTO Training_TrainingPlan (Month, Category, Policies, Year, Center) VALUES (?, ?, ?, ?, ?)",
      args: [targetMonth, targetCategory, policiesStr, targetYear, center]
    });
  }

  if (inMemoryCache[center]?.data) {
    const existingIndex = inMemoryCache[center].data.plan.findIndex(p => {
      const mMatches = parseInt(String(p.Month), 10) === parseInt(targetMonth, 10) || String(p.Month).trim() === targetMonth;
      const cMatches = String(p.Category).trim() === targetCategory;
      const yMatches = String(p.Year || "").trim() === targetYear || (isCurrentYear && (!p.Year || String(p.Year).trim() === ''));
      return mMatches && cMatches && yMatches;
    });

    const updatedPlanItem = {
      Month: targetMonth,
      Category: targetCategory,
      Policies: policiesStr,
      Year: targetYear
    };

    if (existingIndex !== -1) {
      inMemoryCache[center].data.plan[existingIndex] = updatedPlanItem;
    } else {
      inMemoryCache[center].data.plan.push(updatedPlanItem);
    }
    inMemoryCache[center].expiresAt = Date.now() + CACHE_TTL_MS;
    return inMemoryCache[center].data;
  }

  return getAllDataDb({ center, forceRefresh: true });
}

/**
 * Saves training plan items in bulk
 */
export async function savePlanBatchDb(items, centerArg = "") {
  if (!items || !Array.isArray(items)) return getAllDataDb();
  const center = String(items[0]?.center || centerArg || "").trim() || await getDefaultCenterDb();
  for (const item of items) {
    if (item && item.month && item.category) {
      await savePlanDb({ ...item, center });
    }
  }
  return inMemoryCache[center]?.data || getAllDataDb({ center, forceRefresh: true });
}

/**
 * Parses raw CSV or Tab-Separated text into structured plan items
 */
export function parseCsvOrTsvToPlan(rawText, fallbackYear = new Date().getFullYear()) {
  if (!rawText || typeof rawText !== 'string') return [];
  
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const results = [];
  let colMonth = 0;
  let colCategory = 1;
  let colPolicies = 2;
  let colYear = 3;
  let startIndex = 0;

  const parseRow = (line) => {
    if (line.includes('\t')) {
      return line.split('\t').map(c => c.trim().replace(/^["']|["']$/g, ''));
    }
    const cells = [];
    let inQuotes = false;
    let current = '';
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        cells.push(current.trim().replace(/^["']|["']$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    cells.push(current.trim().replace(/^["']|["']$/g, ''));
    return cells;
  };

  const firstRow = parseRow(lines[0]);
  const firstRowLower = firstRow.map(c => String(c || "").toLowerCase());
  
  const isHeader = firstRowLower.some(c => 
    c.includes("month") || c.includes("شهر") || 
    c.includes("category") || c.includes("فئة") || 
    c.includes("policies") || c.includes("سياس") || 
    c.includes("year") || c.includes("سن")
  );

  if (isHeader) {
    startIndex = 1;
    firstRowLower.forEach((c, idx) => {
      if (c.includes("month") || c.includes("شهر")) colMonth = idx;
      else if (c.includes("category") || c.includes("فئة")) colCategory = idx;
      else if (c.includes("polic") || c.includes("سياس") || c.includes("موضوع") || c.includes("تدريب")) colPolicies = idx;
      else if (c.includes("year") || c.includes("سن")) colYear = idx;
    });
  }

  const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

  for (let i = startIndex; i < lines.length; i++) {
    const cells = parseRow(lines[i]);
    if (cells.length === 0 || cells.every(c => !c)) continue;

    let rawMonth = cells[colMonth] || "";
    let rawCat = cells[colCategory] || "";
    let rawPol = cells[colPolicies] || "";
    let rawYr = cells[colYear] || "";

    let mNum = null;
    if (/^\d+$/.test(rawMonth)) {
      mNum = parseInt(rawMonth, 10);
    } else {
      const idx = monthNames.findIndex(mn => rawMonth.includes(mn));
      if (idx !== -1) mNum = idx + 1;
    }
    if (!mNum || mNum < 1 || mNum > 12) continue;

    if (!rawCat) continue;

    let yrVal = String(fallbackYear);
    if (rawYr && /^\d{4}$/.test(rawYr)) {
      yrVal = rawYr;
    }

    results.push({
      Month: String(mNum),
      Category: rawCat,
      Policies: rawPol,
      Year: yrVal
    });
  }

  return results;
}

/**
 * Fetches plan directly from Google Sheets
 */
export async function fetchPlanFromGoogleSheetDb(options = {}, centerArg = "") {
  await createTablesAndMigrate();
  const center = String(options.center || centerArg || "").trim() || await getDefaultCenterDb();
  let { sheetId, targetYear } = options;
  if (!sheetId) {
    const settingRes = await db.execute({
      sql: "SELECT Value FROM Training_Settings WHERE Center = ? AND Type = 'Google_Sheet_ID' LIMIT 1;",
      args: [center]
    });
    sheetId = settingRes.rows[0]?.Value;
  }
  if (!sheetId || !String(sheetId).trim()) {
    throw new Error("يرجى إدخال رابط أو معرّف جدول بيانات Google (Sheet ID أو الرابط الكامل)");
  }

  let cleanId = String(sheetId).trim();
  const urlMatch = cleanId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch) {
    cleanId = urlMatch[1];
  }

  let planItems = [];
  try {
    const directExportUrl = `https://docs.google.com/spreadsheets/d/${cleanId}/export?format=csv`;
    const directRes = await fetch(directExportUrl);
    if (directRes.ok) {
      const csvText = await directRes.text();
      if (csvText && !csvText.includes("<!DOCTYPE html>") && !csvText.includes("google-site-verification")) {
        const parsedRows = parseCsvOrTsvToPlan(csvText, targetYear);
        if (parsedRows.length > 0) {
          planItems = parsedRows;
        }
      }
    }
  } catch (directErr) {}

  return planItems;
}

/**
 * Saves imported plan items into database for a specific center
 */
export async function saveImportedPlanDb(payload = {}, centerArg = "") {
  await createTablesAndMigrate();
  const { items = [], mode = 'replace_year', targetYear } = payload;
  const center = String(payload.center || centerArg || "").trim() || await getDefaultCenterDb();
  const yr = String(targetYear || new Date().getFullYear()).trim();

  if (!items || items.length === 0) {
    throw new Error("لا توجد عناصر خطة صالحة للحفظ");
  }

  if (mode === 'replace_year') {
    await db.execute({
      sql: "DELETE FROM Training_TrainingPlan WHERE Center = ? AND Year = ?;",
      args: [center, yr]
    });
  }

  const planBatch = [];
  for (const item of items) {
    const m = String(item.Month || item.month || "").trim();
    const cat = String(item.Category || item.category || "").trim();
    const pol = Array.isArray(item.policies || item.Policies) 
      ? (item.policies || item.Policies).join(", ") 
      : String(item.Policies || item.policies || "").trim();
    const itemYear = String(item.Year || item.year || yr).trim();

    if (!m || !cat) continue;

    if (mode === 'merge') {
      const existing = await db.execute({
        sql: `SELECT rowid FROM Training_TrainingPlan 
              WHERE Center = ?
                AND Year = ?
                AND Category = ?
                AND (Month = ? OR CAST(Month AS INT) = CAST(? AS INT))
              LIMIT 1;`,
        args: [center, itemYear, cat, m, m]
      });

      if (existing.rows.length > 0) {
        const rowId = existing.rows[0].rowid ?? existing.rows[0][0];
        planBatch.push({
          sql: `UPDATE Training_TrainingPlan SET Policies = ?, Center = ? WHERE rowid = ?;`,
          args: [pol, center, rowId]
        });
        continue;
      }
    }

    planBatch.push({
      sql: `INSERT INTO Training_TrainingPlan (Month, Category, Policies, Year, Center) VALUES (?, ?, ?, ?, ?);`,
      args: [m, cat, pol, itemYear, center]
    });
  }

  if (planBatch.length > 0) {
    await db.batch(planBatch, "write");
  }

  invalidateCache(center);
  return getAllDataDb({ center, forceRefresh: true });
}

/**
 * Updates employees in bulk strictly scoped by Center
 */
export async function updateEmployeesBulkDb(updatedEmployees, centerArg = "") {
  await createTablesAndMigrate();
  const center = String(centerArg || "").trim() || await getDefaultCenterDb();

  // 1. Fetch current employees in database for this center (uses idx_emp_center)
  const existingResult = await db.execute({
    sql: "SELECT ID, Name FROM Training_Employees WHERE Center = ?;",
    args: [center]
  });
  const existingMap = new Map();
  const existingNames = new Set();
  for (const row of existingResult.rows) {
    const id = String(row.ID || "").trim();
    const name = String(row.Name || "").trim();
    if (id) existingMap.set(id, name);
    if (name) existingNames.add(name);
  }

  const validUpdated = (updatedEmployees || []).filter(e => e && e.Name && String(e.Name).trim());
  const updatedNames = new Set(validUpdated.map(e => String(e.Name).trim()));
  const updatedIds = new Set(validUpdated.filter(e => e.ID).map(e => String(e.ID).trim()));

  // 2. Check for renamed employees (uses idx_logs_center_trainee)
  const renamedPairs = [];
  const logMutationBatch = [];
  for (const emp of validUpdated) {
    if (emp.ID && existingMap.has(String(emp.ID).trim())) {
      const oldName = existingMap.get(String(emp.ID).trim());
      const newName = String(emp.Name).trim();
      if (oldName && newName && oldName !== newName) {
        renamedPairs.push([oldName, newName]);
        logMutationBatch.push({
          sql: "UPDATE Training_TrainingLogs SET TraineeName = ? WHERE Center = ? AND TraineeName = ?",
          args: [newName, center, oldName]
        });
      }
    }
  }

  // 3. Find and delete logs for all deleted employees of this center (uses idx_logs_center_trainee)
  const deletedNames = new Set();
  for (const [id, oldName] of existingMap.entries()) {
    if (!updatedIds.has(id) && !updatedNames.has(oldName)) {
      if (oldName) deletedNames.add(oldName);
    }
  }
  for (const oldName of existingNames) {
    if (!updatedNames.has(oldName)) {
      deletedNames.add(oldName);
    }
  }

  for (const name of deletedNames) {
    logMutationBatch.push({
      sql: "DELETE FROM Training_TrainingLogs WHERE Center = ? AND TraineeName = ?",
      args: [center, name]
    });
  }

  if (logMutationBatch.length > 0) {
    await db.batch(logMutationBatch, "write");
  }

  // 4. Update Training_Employees for this center ONLY (uses idx_emp_center)
  await db.execute({
    sql: "DELETE FROM Training_Employees WHERE Center = ?;",
    args: [center]
  });

  const batchStatements = [];
  const finalEmployees = [];
  for (const emp of validUpdated) {
    const id = String(emp.ID || (Math.random().toString(36).substr(2, 9) + Date.now().toString(36))).trim();
    const name = emp.Name.trim();
    const job = (emp.Job || "").trim();
    const category = (emp.Category || "").trim();
    finalEmployees.push({ ID: id, Name: name, Job: job, Category: category });
    batchStatements.push({
      sql: "INSERT OR REPLACE INTO Training_Employees (ID, Name, Job, Category, Center) VALUES (?, ?, ?, ?, ?)",
      args: [id, name, job, category, center]
    });
  }

  if (batchStatements.length > 0) {
    const chunkSize = 500;
    for (let i = 0; i < batchStatements.length; i += chunkSize) {
      const chunk = batchStatements.slice(i, i + chunkSize);
      await db.batch(chunk, "write");
    }
  }

  invalidateCentersCache();

  if (inMemoryCache[center]?.data) {
    inMemoryCache[center].data.employees = finalEmployees;
    if (renamedPairs.length > 0 || deletedNames.size > 0) {
      const renameMap = new Map(renamedPairs);
      inMemoryCache[center].data.logs = inMemoryCache[center].data.logs
        .filter(l => !deletedNames.has(String(l.TraineeName || "").trim()))
        .map(l => {
          const tName = String(l.TraineeName || "").trim();
          return renameMap.has(tName) ? { ...l, TraineeName: renameMap.get(tName) } : l;
        });
    }
    inMemoryCache[center].data.categories = computeUniqueCategories(inMemoryCache[center].data.settings, finalEmployees);
    inMemoryCache[center].expiresAt = Date.now() + CACHE_TTL_MS;
    return inMemoryCache[center].data;
  }

  return getAllDataDb({ center, forceRefresh: true });
}

/**
 * Deletes an employee and their corresponding training logs within a center
 */
export async function deleteEmployeeDb(id, fallbackName, centerArg = "") {
  await createTablesAndMigrate();
  const center = String(centerArg || "").trim() || await getDefaultCenterDb();
  let empName = (fallbackName || "").trim();

  if (id) {
    const existing = await db.execute({
      sql: "SELECT Name FROM Training_Employees WHERE ID = ? AND Center = ?",
      args: [id, center]
    });
    if (existing.rows.length > 0 && existing.rows[0].Name) {
      empName = String(existing.rows[0].Name).trim();
    }
  }

  const deleteBatch = [];
  if (id) {
    deleteBatch.push({
      sql: "DELETE FROM Training_Employees WHERE ID = ? AND Center = ?",
      args: [id, center]
    });
  }
  if (empName) {
    deleteBatch.push({
      sql: "DELETE FROM Training_Employees WHERE Center = ? AND Name = ?",
      args: [center, empName]
    });
    deleteBatch.push({
      sql: "DELETE FROM Training_TrainingLogs WHERE Center = ? AND TraineeName = ?",
      args: [center, empName]
    });
  }

  if (deleteBatch.length > 0) {
    await db.batch(deleteBatch, "write");
  }

  invalidateCentersCache();

  if (inMemoryCache[center]?.data) {
    inMemoryCache[center].data.employees = inMemoryCache[center].data.employees.filter(e => {
      if (id && String(e.ID) === String(id)) return false;
      if (empName && String(e.Name || "").trim() === empName) return false;
      return true;
    });
    if (empName) {
      inMemoryCache[center].data.logs = inMemoryCache[center].data.logs.filter(l => String(l.TraineeName || "").trim() !== empName);
    }
    inMemoryCache[center].data.categories = computeUniqueCategories(inMemoryCache[center].data.settings, inMemoryCache[center].data.employees);
    inMemoryCache[center].expiresAt = Date.now() + CACHE_TTL_MS;
    return inMemoryCache[center].data;
  }

  return getAllDataDb({ center, forceRefresh: true });
}

/**
 * Saves a setting item for a specific center
 */
export async function saveSettingsItemDb(type, value, centerArg = "") {
  await createTablesAndMigrate();
  const center = String(centerArg || "").trim() || await getDefaultCenterDb();
  const cleanType = String(type || "").trim();
  const cleanVal = String(value || "").trim();
  const singleValueTypes = [
    'Hospital_Name', 'Hospital_Logo', 'Hospital_Logo_Left', 'IC_Manager_Title', 'IC_Manager_Name', 'Hospital_Manager_Title', 'Hospital_Manager_Name',
    'Google_Sheet_ID', 'Visit_Days'
  ];

  const isSingle = cleanType.startsWith('Password_') || singleValueTypes.includes(cleanType);
  const stmts = [];
  if (isSingle) {
    stmts.push({
      sql: "DELETE FROM Training_Settings WHERE Center = ? AND Type = ?",
      args: [center, cleanType]
    });
  }
  stmts.push({
    sql: "INSERT INTO Training_Settings (Type, Value, Center) VALUES (?, ?, ?)",
    args: [cleanType, cleanVal, center]
  });

  await db.batch(stmts, "write");

  if (inMemoryCache[center]?.data) {
    if (isSingle) {
      inMemoryCache[center].data.settings = inMemoryCache[center].data.settings.filter(s => s.Type !== cleanType);
    }
    inMemoryCache[center].data.settings.push({ Type: cleanType, Value: cleanVal });
    inMemoryCache[center].data.categories = computeUniqueCategories(inMemoryCache[center].data.settings, inMemoryCache[center].data.employees);
    inMemoryCache[center].expiresAt = Date.now() + CACHE_TTL_MS;
    return inMemoryCache[center].data;
  }

  return getAllDataDb({ center, forceRefresh: true });
}

/**
 * Deletes a setting item for a specific center
 */
export async function deleteSettingsItemDb(type, value, centerArg = "") {
  await createTablesAndMigrate();
  const center = String(centerArg || "").trim() || await getDefaultCenterDb();
  const cleanType = String(type || "").trim();
  const cleanVal = String(value || "").trim();

  await db.execute({
    sql: "DELETE FROM Training_Settings WHERE Center = ? AND Type = ? AND Value = ?",
    args: [center, cleanType, cleanVal]
  });

  if (inMemoryCache[center]?.data) {
    inMemoryCache[center].data.settings = inMemoryCache[center].data.settings.filter(
      s => !(String(s.Type || "").trim() === cleanType && String(s.Value || "").trim() === cleanVal)
    );
    inMemoryCache[center].data.categories = computeUniqueCategories(inMemoryCache[center].data.settings, inMemoryCache[center].data.employees);
    inMemoryCache[center].expiresAt = Date.now() + CACHE_TTL_MS;
    return inMemoryCache[center].data;
  }

  return getAllDataDb({ center, forceRefresh: true });
}

/**
 * Helper function to replace policy name inside a comma-separated policies string
 */
function replacePolicyInString(policiesStr, oldPolicy, newPolicy) {
  if (!policiesStr) return "";
  const oldTrimmed = String(oldPolicy || "").trim();
  const newTrimmed = String(newPolicy || "").trim();
  if (!oldTrimmed || !newTrimmed || oldTrimmed === newTrimmed) return policiesStr;

  const items = [];
  let current = "";
  let parenCount = 0;
  for (let i = 0; i < policiesStr.length; i++) {
    const char = policiesStr[i];
    if (char === '(') parenCount++;
    else if (char === ')') parenCount--;

    if (char === ',' && parenCount === 0) {
      items.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) {
    items.push(current.trim());
  }

  const updatedItems = items.map(item => {
    const match = item.match(/^(.*?)\s*(\(.*?\))\s*$/);
    let base = item.trim();
    let parens = "";
    if (match) {
      base = match[1].trim();
      parens = match[2];
    }
    if (base === oldTrimmed) {
      return parens ? `${newTrimmed} ${parens}` : newTrimmed;
    }
    return item;
  });

  return updatedItems.join(", ");
}

/**
 * Renames a Policy across Settings, TrainingPlan, and TrainingLogs within a center
 */
export async function renamePolicyDb(oldPolicy, newPolicy, centerArg = "") {
  await createTablesAndMigrate();
  const center = String(centerArg || "").trim() || await getDefaultCenterDb();
  const oldTrimmed = String(oldPolicy || "").trim();
  const newTrimmed = String(newPolicy || "").trim();

  if (!oldTrimmed || !newTrimmed || oldTrimmed === newTrimmed) {
    return getAllDataDb({ center });
  }

  // 1. Update in Training_Settings (uses idx_settings_center_type)
  await db.execute({
    sql: "UPDATE Training_Settings SET Value = ? WHERE Center = ? AND Type = 'Policy' AND Value = ?",
    args: [newTrimmed, center, oldTrimmed]
  });

  // 2. Update in Training_TrainingPlan (uses idx_plan_center)
  const planRows = await db.execute({
    sql: "SELECT rowid, Policies FROM Training_TrainingPlan WHERE Center = ? AND Policies LIKE ?",
    args: [center, `%${oldTrimmed}%`]
  });
  const updateBatch = [];
  for (const row of planRows.rows) {
    const updatedPolicies = replacePolicyInString(String(row.Policies || ""), oldTrimmed, newTrimmed);
    if (updatedPolicies !== row.Policies) {
      const rowId = row.rowid ?? row[0];
      updateBatch.push({
        sql: "UPDATE Training_TrainingPlan SET Policies = ?, Center = ? WHERE rowid = ?",
        args: [updatedPolicies, center, rowId]
      });
    }
  }

  // 3. Update in Training_TrainingLogs (uses idx_logs_center)
  const logRows = await db.execute({
    sql: "SELECT ID, rowid, Policies FROM Training_TrainingLogs WHERE Center = ? AND Policies LIKE ?",
    args: [center, `%${oldTrimmed}%`]
  });
  for (const row of logRows.rows) {
    const updatedPolicies = replacePolicyInString(String(row.Policies || ""), oldTrimmed, newTrimmed);
    if (updatedPolicies !== row.Policies) {
      const logId = row.ID || row.rowid;
      updateBatch.push({
        sql: "UPDATE Training_TrainingLogs SET Policies = ? WHERE (ID = ? OR rowid = ?) AND Center = ?",
        args: [updatedPolicies, logId, logId, center]
      });
    }
  }

  if (updateBatch.length > 0) {
    const chunkSize = 500;
    for (let i = 0; i < updateBatch.length; i += chunkSize) {
      await db.batch(updateBatch.slice(i, i + chunkSize), "write");
    }
  }

  invalidateCentersCache();

  if (inMemoryCache[center]?.data) {
    inMemoryCache[center].data.settings.forEach(s => {
      if (s.Type === 'Policy' && String(s.Value || "").trim() === oldTrimmed) {
        s.Value = newTrimmed;
      }
    });
    inMemoryCache[center].data.plan.forEach(p => {
      p.Policies = replacePolicyInString(String(p.Policies || ""), oldTrimmed, newTrimmed);
    });
    inMemoryCache[center].data.logs.forEach(l => {
      l.Policies = replacePolicyInString(String(l.Policies || ""), oldTrimmed, newTrimmed);
    });
    inMemoryCache[center].expiresAt = Date.now() + CACHE_TTL_MS;
    return inMemoryCache[center].data;
  }

  return getAllDataDb({ center, forceRefresh: true });
}

/**
 * Normalizes a Visit_Days input (array or comma-separated string) into sorted unique weekday ints (0=Sun..6=Sat).
 */
function normalizeVisitDays(input) {
  let raw = [];
  if (Array.isArray(input)) {
    raw = input;
  } else if (typeof input === 'string') {
    raw = input.split(',');
  } else if (input && typeof input === 'object' && Array.isArray(input.visitDays)) {
    raw = input.visitDays;
  }
  const set = new Set();
  for (const v of raw) {
    const num = parseInt(String(v).trim(), 10);
    if (!Number.isNaN(num) && num >= 0 && num <= 6) {
      set.add(num);
    }
  }
  return Array.from(set).sort((a, b) => a - b);
}

/**
 * Parses a YYYY-MM-DD date string safely without timezone shift.
 */
function parseYmdSafe(dateStr) {
  if (!dateStr) return null;
  const clean = String(dateStr).split('T')[0].trim();
  const m = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const day = parseInt(m[3], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day, clean };
}

function formatYmdSafe(year, month, day) {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Snaps a YYYY-MM-DD date to the nearest matching weekday in visitDays within the SAME month.
 * Optionally avoids dates in excludeDatesSet (used for 2-day policies so both dates stay distinct).
 */
function snapDateToNearestVisitDay(dateStr, visitDays, excludeDatesSet = null) {
  const parsed = parseYmdSafe(dateStr);
  if (!parsed) return dateStr;
  if (!visitDays || visitDays.length === 0 || visitDays.length >= 7) {
    return parsed.clean;
  }

  const { year, month, day, clean } = parsed;
  const currentDow = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  if (visitDays.includes(currentDow) && (!excludeDatesSet || !excludeDatesSet.has(clean))) {
    return clean;
  }

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  let bestDay = null;
  let bestDiff = Infinity;

  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(Date.UTC(year, month - 1, d)).getUTCDay();
    if (!visitDays.includes(dow)) continue;
    const candidate = formatYmdSafe(year, month, d);
    if (excludeDatesSet && excludeDatesSet.has(candidate)) continue;
    const diff = Math.abs(d - day);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestDay = d;
    }
  }

  // Fallback if all valid dates in month were excluded
  if (bestDay === null) {
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(Date.UTC(year, month - 1, d)).getUTCDay();
      if (!visitDays.includes(dow)) continue;
      const diff = Math.abs(d - day);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestDay = d;
      }
    }
  }

  return bestDay !== null ? formatYmdSafe(year, month, bestDay) : clean;
}

/**
 * Splits a policies string by commas outside parentheses, snaps any embedded dates
 * (e.g., "غسل الأيدي (يوم واحد - 2026-11-12)") to the nearest visit days, and rebuilds the string.
 */
function snapDatesInPoliciesString(policiesStr, visitDays) {
  if (!policiesStr || !visitDays || visitDays.length === 0 || visitDays.length >= 7) {
    return policiesStr;
  }
  const items = [];
  let current = "";
  let parenCount = 0;
  for (let i = 0; i < policiesStr.length; i++) {
    const ch = policiesStr[i];
    if (ch === '(') parenCount++;
    else if (ch === ')') parenCount--;
    if (ch === ',' && parenCount === 0) {
      items.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) items.push(current.trim());

  const updatedItems = items.map(item => {
    const match = item.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
    if (!match) return item;
    const base = match[1].trim();
    const inner = match[2].trim();
    const parts = inner.split(" - ");
    if (parts.length < 2) return item;

    const dayLabel = parts[0].trim();
    const rawDates = parts.slice(1).join(" - ").split(",").map(s => s.trim()).filter(Boolean);
    if (rawDates.length === 0) return item;

    const usedDates = new Set();
    const snappedDates = rawDates.map(rawD => {
      const snapped = snapDateToNearestVisitDay(rawD, visitDays, rawDates.length > 1 ? usedDates : null);
      usedDates.add(snapped);
      return snapped;
    }).sort((a, b) => a.localeCompare(b));

    return `${base} (${dayLabel} - ${snappedDates.join(", ")})`;
  });

  return updatedItems.join(", ");
}

/**
 * Saves weekly Visit_Days for a center and automatically migrates all saved dates
 * in Training_TrainingPlan and Training_TrainingLogs to the nearest matching visit day in the same month.
 */
export async function saveVisitDaysDb(visitDaysArg, centerArg = "") {
  await createTablesAndMigrate();
  const center = String(centerArg || "").trim() || await getDefaultCenterDb();
  const visitDays = normalizeVisitDays(visitDaysArg);
  // If all 7 days are selected, treat as unrestricted (empty) or keep all 7 — keeping normalized string makes checkboxes persist accurately
  const serialized = visitDays.join(",");

  // 1. Persist Visit_Days setting for this center
  await db.batch([
    {
      sql: "DELETE FROM Training_Settings WHERE Center = ? AND Type = 'Visit_Days';",
      args: [center]
    },
    {
      sql: "INSERT INTO Training_Settings (Type, Value, Center) VALUES ('Visit_Days', ?, ?);",
      args: [serialized, center]
    }
  ], "write");

  let updatedPlansCount = 0;
  let updatedLogsCount = 0;

  // 2. If specific visit days are active (1..6 days), shift all saved dates to the nearest visit day
  if (visitDays.length > 0 && visitDays.length < 7) {
    const updateBatch = [];

    // 2a. Migrate dates inside Training_TrainingPlan.Policies (indexed by Center)
    const planRows = await db.execute({
      sql: "SELECT rowid, Policies FROM Training_TrainingPlan WHERE Center = ?;",
      args: [center]
    });

    for (const row of planRows.rows) {
      const oldPolicies = String(row.Policies || "");
      const newPolicies = snapDatesInPoliciesString(oldPolicies, visitDays);
      if (newPolicies !== oldPolicies) {
        const rowId = row.rowid ?? row[0];
        updateBatch.push({
          sql: "UPDATE Training_TrainingPlan SET Policies = ? WHERE rowid = ? AND Center = ?;",
          args: [newPolicies, rowId, center]
        });
        updatedPlansCount++;
      }
    }

    // 2b. Migrate Date (and any embedded dates in Policies) in Training_TrainingLogs (indexed by Center)
    const logRows = await db.execute({
      sql: "SELECT ID, rowid, Date, Month, Year, Policies FROM Training_TrainingLogs WHERE Center = ?;",
      args: [center]
    });

    for (const row of logRows.rows) {
      const rawDate = String(row.Date || "").split('T')[0].trim();
      const newDate = snapDateToNearestVisitDay(rawDate, visitDays);
      const oldPolicies = String(row.Policies || "");
      const newPolicies = snapDatesInPoliciesString(oldPolicies, visitDays);

      if (newDate !== rawDate || newPolicies !== oldPolicies) {
        const parsedNew = parseYmdSafe(newDate);
        const newMonth = parsedNew ? parsedNew.month : row.Month;
        const newYear = parsedNew ? parsedNew.year : row.Year;
        const logId = row.ID || row.rowid;
        updateBatch.push({
          sql: "UPDATE Training_TrainingLogs SET Date = ?, Month = ?, Year = ?, Policies = ? WHERE (ID = ? OR rowid = ?) AND Center = ?;",
          args: [newDate, newMonth, newYear, newPolicies, logId, logId, center]
        });
        updatedLogsCount++;
      }
    }

    if (updateBatch.length > 0) {
      const chunkSize = 500;
      for (let i = 0; i < updateBatch.length; i += chunkSize) {
        await db.batch(updateBatch.slice(i, i + chunkSize), "write");
      }
    }
  }

  invalidateCache(center);
  invalidateCentersCache();

  const freshData = await getAllDataDb({ center, forceRefresh: true });
  return {
    ...freshData,
    _visitDaysUpdateSummary: {
      visitDays,
      updatedPlansCount,
      updatedLogsCount
    }
  };
}

/**
 * Tests connection to a previous Turso database and inspects existing records and tables
 */
export async function testPreviousTursoDb({ url, authToken }) {
  if (!url || !String(url).trim()) {
    throw new Error("يرجى إدخال رابط قاعدة بيانات Turso السابقة (Database URL)");
  }
  const cleanUrl = String(url).trim();
  const cleanToken = authToken ? String(authToken).trim() : "";

  let remoteDb;
  try {
    remoteDb = createClient({
      url: cleanUrl,
      authToken: cleanToken,
    });
  } catch (err) {
    throw new Error(`تعذر إنشاء عميل الاتصال بقاعدة بيانات Turso: ${err.message}`);
  }

  try {
    const tablesRes = await remoteDb.execute("SELECT name FROM sqlite_master WHERE type='table';");
    const tableNames = tablesRes.rows.map(r => String(r.name || r[0]));

    const hasEmployees = tableNames.includes('Training_Employees');
    const hasLogs = tableNames.includes('Training_TrainingLogs');
    const hasSettings = tableNames.includes('Training_Settings');
    const hasPlan = tableNames.includes('Training_TrainingPlan');
    const hasCenters = tableNames.includes('Training_Centers');

    let employeesCount = 0;
    let logsCount = 0;
    let sessionsCount = 0;
    let planCount = 0;
    let settingsCount = 0;
    let detectedHospitalName = "";
    let detectedCenters = [];

    if (hasEmployees) {
      const eRes = await remoteDb.execute("SELECT COUNT(*) as count FROM Training_Employees;");
      employeesCount = Number(eRes.rows[0]?.count || 0);
    }

    if (hasLogs) {
      const lRes = await remoteDb.execute("SELECT COUNT(*) as count FROM Training_TrainingLogs;");
      logsCount = Number(lRes.rows[0]?.count || 0);

      try {
        const sRes = await remoteDb.execute("SELECT COUNT(DISTINCT Date || Category || Policies || Trainer) as count FROM Training_TrainingLogs;");
        sessionsCount = Number(sRes.rows[0]?.count || 0);
      } catch (e) {
        sessionsCount = logsCount;
      }

      try {
        const cRes = await remoteDb.execute("SELECT DISTINCT Center FROM Training_TrainingLogs WHERE Center IS NOT NULL AND TRIM(Center) != '';");
        for (const row of cRes.rows) {
          const cName = String(row.Center || row[0] || "").trim();
          if (cName && !detectedCenters.includes(cName)) detectedCenters.push(cName);
        }
      } catch (e) {}
    }

    if (hasSettings) {
      const sRes = await remoteDb.execute("SELECT COUNT(*) as count FROM Training_Settings;");
      settingsCount = Number(sRes.rows[0]?.count || 0);

      try {
        const hRes = await remoteDb.execute("SELECT Value FROM Training_Settings WHERE Type = 'Hospital_Name' LIMIT 1;");
        if (hRes.rows[0]?.Value) {
          detectedHospitalName = String(hRes.rows[0].Value).trim();
          if (detectedHospitalName && !detectedCenters.includes(detectedHospitalName)) {
            detectedCenters.unshift(detectedHospitalName);
          }
        }
      } catch (e) {}
    }

    if (hasPlan) {
      const pRes = await remoteDb.execute("SELECT COUNT(*) as count FROM Training_TrainingPlan;");
      planCount = Number(pRes.rows[0]?.count || 0);
    }

    if (hasCenters) {
      try {
        const centersRes = await remoteDb.execute("SELECT DISTINCT Name FROM Training_Centers;");
        for (const row of centersRes.rows) {
          const cName = String(row.Name || row[0] || "").trim();
          if (cName && !detectedCenters.includes(cName)) detectedCenters.push(cName);
        }
      } catch (e) {}
    }

    return {
      connected: true,
      tablesFound: tableNames,
      employeesCount,
      logsCount,
      sessionsCount,
      planCount,
      settingsCount,
      detectedHospitalName: detectedHospitalName || (detectedCenters[0] || ""),
      detectedCenters
    };
  } catch (err) {
    const msg = String(err.message || err);
    if (/AUTH_TOKEN|UNAUTHORIZED|401|403|SQLITE_AUTH/i.test(msg)) {
      throw new Error("فشل التحقق: رمز التفويض (Auth Token) غير صالح أو منتهي الصلاحية.");
    }
    if (/getaddrinfo|ENOTFOUND|ECONNREFUSED|network/i.test(msg)) {
      throw new Error("تعذر الوصول إلى عنوان قاعدة بيانات Turso السابقة. تأكد من صحة الرابط URL.");
    }
    throw new Error(`خطأ أثناء الاتصال بقاعدة بيانات Turso السابقة: ${msg}`);
  }
}

/**
 * Imports records from a previous Turso database into the current database for a target center
 */
export async function importFromPreviousTursoDb(payload = {}) {
  await createTablesAndMigrate();

  const {
    url,
    authToken,
    targetCenter,
    sourceCenter = null,
    importEmployees = true,
    importLogs = true,
    importPlan = true,
    importSettings = true,
    mode = 'merge'
  } = payload;

  if (!url || !String(url).trim()) {
    throw new Error("يرجى إدخال رابط قاعدة بيانات Turso السابقة");
  }
  const cleanUrl = String(url).trim();
  const cleanToken = authToken ? String(authToken).trim() : "";

  // 1. Resolve Target Center
  let cleanTargetCenter = String(targetCenter || "").trim();
  if (!cleanTargetCenter) {
    cleanTargetCenter = await getDefaultCenterDb();
  }

  // Ensure target center exists in Training_Centers
  const existingCenter = await db.execute({
    sql: "SELECT Name FROM Training_Centers WHERE Name = ? LIMIT 1;",
    args: [cleanTargetCenter]
  });
  if (existingCenter.rows.length === 0) {
    const id = Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    await db.execute({
      sql: "INSERT INTO Training_Centers (ID, Name, CreatedAt) VALUES (?, ?, ?);",
      args: [id, cleanTargetCenter, new Date().toISOString()]
    });
  }

  // 2. Connect to remote Turso database
  let remoteDb;
  try {
    remoteDb = createClient({
      url: cleanUrl,
      authToken: cleanToken,
    });
  } catch (err) {
    throw new Error(`فشل إنشاء عميل الاتصال بقاعدة البيانات السابقة: ${err.message}`);
  }

  // 3. Inspect remote tables
  const tablesRes = await remoteDb.execute("SELECT name FROM sqlite_master WHERE type='table';");
  const remoteTables = tablesRes.rows.map(r => String(r.name || r[0]));

  let importedEmployeesCount = 0;
  let importedLogsCount = 0;
  let importedPlanCount = 0;
  let importedSettingsCount = 0;

  // 4. If mode is 'replace', clear existing records for cleanTargetCenter (uses idx_*_center)
  if (mode === 'replace') {
    const clearBatch = [];
    if (importEmployees) {
      clearBatch.push({ sql: "DELETE FROM Training_Employees WHERE Center = ?;", args: [cleanTargetCenter] });
    }
    if (importLogs) {
      clearBatch.push({ sql: "DELETE FROM Training_TrainingLogs WHERE Center = ?;", args: [cleanTargetCenter] });
    }
    if (importPlan) {
      clearBatch.push({ sql: "DELETE FROM Training_TrainingPlan WHERE Center = ?;", args: [cleanTargetCenter] });
    }
    if (importSettings) {
      clearBatch.push({ sql: "DELETE FROM Training_Settings WHERE Center = ?;", args: [cleanTargetCenter] });
    }
    if (clearBatch.length > 0) {
      await db.batch(clearBatch, "write");
    }
  }

  // 5. Import Employees
  if (importEmployees && remoteTables.includes('Training_Employees')) {
    let remoteEmployeesQuery = "SELECT ID, Name, Job, Category FROM Training_Employees";
    try {
      const colCheck = await remoteDb.execute("PRAGMA table_info(Training_Employees);");
      const hasCenterCol = colCheck.rows.some(r => String(r.name).toLowerCase() === 'center');
      if (hasCenterCol && sourceCenter && String(sourceCenter).trim() && sourceCenter !== 'all') {
        remoteEmployeesQuery += ` WHERE TRIM(Center) = '${String(sourceCenter).replace(/'/g, "''")}'`;
      }
    } catch (e) {}

    const remoteEmployeesRes = await remoteDb.execute(remoteEmployeesQuery);

    const existingLocalEmpRes = await db.execute({
      sql: "SELECT ID, Name FROM Training_Employees WHERE Center = ?;",
      args: [cleanTargetCenter]
    });
    const existingEmpNames = new Set(existingLocalEmpRes.rows.map(r => String(r.Name || "").trim()));
    const existingEmpIds = new Set(existingLocalEmpRes.rows.map(r => String(r.ID || "").trim()));

    const empBatch = [];
    for (const r of remoteEmployeesRes.rows) {
      const empName = String(r.Name || "").trim();
      if (!empName) continue;

      if (mode === 'merge' && existingEmpNames.has(empName)) {
        continue;
      }

      let empId = String(r.ID || "").trim();
      if (!empId || existingEmpIds.has(empId)) {
        empId = Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
      }
      existingEmpNames.add(empName);
      existingEmpIds.add(empId);

      const empJob = String(r.Job || "").trim() || "موظف";
      const empCat = String(r.Category || "تمريض").trim();

      empBatch.push({
        sql: "INSERT OR REPLACE INTO Training_Employees (ID, Name, Job, Category, Center) VALUES (?, ?, ?, ?, ?);",
        args: sanitizeSqlArgs([empId, empName, empJob, empCat, cleanTargetCenter])
      });
      importedEmployeesCount++;
    }

    if (empBatch.length > 0) {
      const chunkSize = 500;
      for (let i = 0; i < empBatch.length; i += chunkSize) {
        await db.batch(empBatch.slice(i, i + chunkSize), "write");
      }
    }
  }

  // 6. Import Training Logs
  if (importLogs && remoteTables.includes('Training_TrainingLogs')) {
    let remoteLogsQuery = "SELECT ID, Date, Month, Year, Category, Policies, TraineeName, Trainer, Timestamp FROM Training_TrainingLogs";
    try {
      const colCheck = await remoteDb.execute("PRAGMA table_info(Training_TrainingLogs);");
      const hasCenterCol = colCheck.rows.some(r => String(r.name).toLowerCase() === 'center');
      if (hasCenterCol && sourceCenter && String(sourceCenter).trim() && sourceCenter !== 'all') {
        remoteLogsQuery += ` WHERE TRIM(Center) = '${String(sourceCenter).replace(/'/g, "''")}'`;
      }
    } catch (e) {}

    const remoteLogsRes = await remoteDb.execute(remoteLogsQuery);

    const existingLocalLogsRes = await db.execute({
      sql: "SELECT Date, TraineeName, Category, Policies FROM Training_TrainingLogs WHERE Center = ?;",
      args: [cleanTargetCenter]
    });
    const existingLogSigs = new Set();
    for (const r of existingLocalLogsRes.rows) {
      const d = String(r.Date || "").split('T')[0].trim();
      const t = String(r.TraineeName || "").trim();
      const c = String(r.Category || "").trim();
      const p = String(r.Policies || "").trim();
      existingLogSigs.add(`${d}|${t}|${c}|${p}`);
    }

    const logBatch = [];
    const timestamp = new Date().toISOString().replace('T', ' ').substr(0, 19);

    for (const r of remoteLogsRes.rows) {
      const tName = String(r.TraineeName || "").trim();
      if (!tName) continue;

      const rawDate = String(r.Date || "").trim();
      const cleanDate = rawDate.split('T')[0].trim();
      const cat = String(r.Category || "").trim();
      const pol = String(r.Policies || "").trim();
      const trainer = String(r.Trainer || "").trim();

      const sig = `${cleanDate}|${tName}|${cat}|${pol}`;
      if (mode === 'merge' && existingLogSigs.has(sig)) {
        continue;
      }
      existingLogSigs.add(sig);

      const { month, year } = resolveYearAndMonth(rawDate, r.Month, r.Year, true);
      const uuid = Math.random().toString(36).substr(2, 9) + Date.now().toString(36);

      logBatch.push({
        sql: `INSERT INTO Training_TrainingLogs 
              (ID, Date, Month, Year, Category, Policies, TraineeName, Trainer, Timestamp, Center) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        args: sanitizeSqlArgs([
          uuid,
          cleanDate || rawDate,
          month,
          year,
          cat,
          pol,
          tName,
          trainer,
          r.Timestamp || timestamp,
          cleanTargetCenter
        ])
      });
      importedLogsCount++;
    }

    if (logBatch.length > 0) {
      const chunkSize = 500;
      for (let i = 0; i < logBatch.length; i += chunkSize) {
        await db.batch(logBatch.slice(i, i + chunkSize), "write");
      }
    }
  }

  // 7. Import Training Plan
  if (importPlan && remoteTables.includes('Training_TrainingPlan')) {
    let remotePlanQuery = "SELECT Month, Category, Policies, Year FROM Training_TrainingPlan";
    try {
      const colCheck = await remoteDb.execute("PRAGMA table_info(Training_TrainingPlan);");
      const hasCenterCol = colCheck.rows.some(r => String(r.name).toLowerCase() === 'center');
      if (hasCenterCol && sourceCenter && String(sourceCenter).trim() && sourceCenter !== 'all') {
        remotePlanQuery += ` WHERE TRIM(Center) = '${String(sourceCenter).replace(/'/g, "''")}'`;
      }
    } catch (e) {}

    const remotePlanRes = await remoteDb.execute(remotePlanQuery);

    for (const r of remotePlanRes.rows) {
      const m = String(r.Month || "").trim();
      const cat = String(r.Category || "").trim();
      const pol = String(r.Policies || "").trim();
      const yr = String(r.Year || new Date().getFullYear()).trim();

      if (!m || !cat) continue;

      if (mode === 'merge') {
        const existingPlanRes = await db.execute({
          sql: `SELECT rowid, Policies FROM Training_TrainingPlan 
                WHERE Center = ?
                  AND Year = ?
                  AND Category = ?
                  AND (Month = ? OR CAST(Month AS INT) = CAST(? AS INT))
                LIMIT 1;`,
          args: [cleanTargetCenter, yr, cat, m, m]
        });

        if (existingPlanRes.rows.length > 0) {
          const rowId = existingPlanRes.rows[0].rowid ?? existingPlanRes.rows[0][0];
          await db.execute({
            sql: "UPDATE Training_TrainingPlan SET Policies = ? WHERE rowid = ?;",
            args: [pol, rowId]
          });
          importedPlanCount++;
          continue;
        }
      }

      await db.execute({
        sql: "INSERT INTO Training_TrainingPlan (Month, Category, Policies, Year, Center) VALUES (?, ?, ?, ?, ?);",
        args: [m, cat, pol, yr, cleanTargetCenter]
      });
      importedPlanCount++;
    }
  }

  // 8. Import Settings (Trainers, Policies, Categories, etc.)
  if (importSettings && remoteTables.includes('Training_Settings')) {
    let remoteSettingsQuery = "SELECT Type, Value FROM Training_Settings";
    try {
      const colCheck = await remoteDb.execute("PRAGMA table_info(Training_Settings);");
      const hasCenterCol = colCheck.rows.some(r => String(r.name).toLowerCase() === 'center');
      if (hasCenterCol && sourceCenter && String(sourceCenter).trim() && sourceCenter !== 'all') {
        remoteSettingsQuery += ` WHERE TRIM(Center) = '${String(sourceCenter).replace(/'/g, "''")}'`;
      }
    } catch (e) {}

    const remoteSettingsRes = await remoteDb.execute(remoteSettingsQuery);

    const existingSettingsRes = await db.execute({
      sql: "SELECT Type, Value FROM Training_Settings WHERE Center = ?;",
      args: [cleanTargetCenter]
    });
    const existingSettingsSet = new Set(
      existingSettingsRes.rows.map(r => `${String(r.Type || "").trim()}|${String(r.Value || "").trim()}`)
    );

    const settingsBatch = [];
    for (const r of remoteSettingsRes.rows) {
      const type = String(r.Type || "").trim();
      const val = String(r.Value || "").trim();

      if (type.startsWith('Password_') || !val) continue;

      if (type === 'Hospital_Name') {
        const hasHospitalName = existingSettingsRes.rows.some(er => String(er.Type || "").trim() === 'Hospital_Name');
        if (!hasHospitalName) {
          settingsBatch.push({
            sql: "INSERT INTO Training_Settings (Type, Value, Center) VALUES ('Hospital_Name', ?, ?);",
            args: [val, cleanTargetCenter]
          });
          importedSettingsCount++;
        }
        continue;
      }

      const sig = `${type}|${val}`;
      if (existingSettingsSet.has(sig)) continue;
      existingSettingsSet.add(sig);

      settingsBatch.push({
        sql: "INSERT INTO Training_Settings (Type, Value, Center) VALUES (?, ?, ?);",
        args: [type, val, cleanTargetCenter]
      });
      importedSettingsCount++;
    }

    if (settingsBatch.length > 0) {
      await db.batch(settingsBatch, "write");
    }
  }

  // 9. Invalidate cache for the target center
  invalidateCache(cleanTargetCenter);
  invalidateCentersCache();

  return {
    success: true,
    targetCenter: cleanTargetCenter,
    stats: {
      employees: importedEmployeesCount,
      logs: importedLogsCount,
      plan: importedPlanCount,
      settings: importedSettingsCount
    }
  };
}
