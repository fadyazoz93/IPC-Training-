import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import {
  createTablesAndMigrate,
  getAllDataDb,
  saveTrainingSessionDb,
  savePlanDb,
  savePlanBatchDb,
  fetchPlanFromGoogleSheetDb,
  saveImportedPlanDb,
  updateEmployeesBulkDb,
  deleteEmployeeDb,
  saveSettingsItemDb,
  deleteSettingsItemDb,
  renamePolicyDb,
  updateSessionTrainerDb,
  updateSessionPoliciesDb,
  deleteTrainingSessionDb,
  addTraineesToSessionDb,
  testPreviousTursoDb,
  importFromPreviousTursoDb,
  getCentersDb,
  addCenterDb,
  deleteCenterDb
} from './api/db.js';

// Simple Vite plugin to run the Vercel serverless function locally with SQLite / Turso database
const vercelApiMock = () => {
  return {
    name: 'vercel-api-mock',
    configureServer(server) {
      // Initialize tables only on local dev server startup, never during vite build
      createTablesAndMigrate()
        .then(() => console.log('Database initialized in Vite dev mode.'))
        .catch(err => console.error('Failed to initialize database in Vite dev mode:', err));

      server.middlewares.use(async (req, res, next) => {
        if (req.url?.split('?')[0] === '/api/gas' && req.method === 'POST') {
          // Parse body
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              const { func, args = [], center: bodyCenter } = JSON.parse(body || '{}');
              const activeCenter =
                (typeof bodyCenter === 'string' && bodyCenter.trim() && !bodyCenter.includes('[object'))
                  ? bodyCenter.trim()
                  : (args[0] && typeof args[0] === 'object' && typeof args[0].center === 'string' && args[0].center.trim())
                    ? args[0].center.trim()
                    : "";

              console.log(`Vite Dev Middleware executing: ${func}${activeCenter ? ` [Center: ${activeCenter}]` : ''}`);

              let result;

              if (func === 'getCenters') {
                result = await getCentersDb(Boolean(args[0]?.forceRefresh || args[0] === true));
              } else if (func === 'addCenter') {
                const centerName = typeof args[0] === 'string' ? args[0] : args[0]?.name;
                result = await addCenterDb(centerName);
              } else if (func === 'deleteCenter') {
                const centerName = typeof args[0] === 'string' ? args[0] : args[0]?.name;
                result = await deleteCenterDb(centerName);
              } else if (func === 'testPreviousTursoDb') {
                result = await testPreviousTursoDb(args[0]);
              } else if (func === 'importFromPreviousTursoDb') {
                const importPayload = args[0] && typeof args[0] === 'object'
                  ? { ...args[0], targetCenter: args[0].targetCenter || activeCenter }
                  : args[0];
                result = await importFromPreviousTursoDb(importPayload);
              } else if (func === 'getAllData') {
                if (typeof args[0] === 'string') {
                  result = await getAllDataDb({ center: args[0], forceRefresh: Boolean(args[1]) });
                } else if (args[0] && typeof args[0] === 'object') {
                  result = await getAllDataDb({ ...args[0], center: args[0].center || activeCenter });
                } else {
                  result = await getAllDataDb({ center: activeCenter });
                }
              } else if (func === 'saveTrainingSession') {
                result = await saveTrainingSessionDb(args[0], activeCenter);
              } else if (func === 'addTraineesToSession') {
                result = await addTraineesToSessionDb(args[0], activeCenter);
              } else if (func === 'savePlan') {
                result = await savePlanDb(args[0], activeCenter);
              } else if (func === 'savePlanBatch') {
                result = await savePlanBatchDb(args[0], activeCenter);
              } else if (func === 'fetchPlanFromGoogleSheet') {
                result = await fetchPlanFromGoogleSheetDb(args[0], activeCenter);
              } else if (func === 'saveImportedPlan') {
                result = await saveImportedPlanDb(args[0], activeCenter);
              } else if (func === 'updateEmployeesBulk') {
                result = await updateEmployeesBulkDb(args[0], activeCenter);
              } else if (func === 'deleteEmployee') {
                result = await deleteEmployeeDb(args[0], args[1], activeCenter);
              } else if (func === 'saveSettingsItem') {
                result = await saveSettingsItemDb(args[0], args[1], activeCenter);
              } else if (func === 'deleteSettingsItem') {
                result = await deleteSettingsItemDb(args[0], args[1], activeCenter);
              } else if (func === 'renamePolicy') {
                result = await renamePolicyDb(args[0], args[1], activeCenter);
              } else if (func === 'updateSessionTrainer') {
                result = await updateSessionTrainerDb(args[0], activeCenter);
              } else if (func === 'updateSessionPolicies') {
                result = await updateSessionPoliciesDb(args[0], activeCenter);
              } else if (func === 'deleteTrainingSession') {
                result = await deleteTrainingSessionDb(args[0], activeCenter);
              } else {
                res.statusCode = 400;
                res.end(JSON.stringify({ status: 'error', message: `Function not found: ${func}` }));
                return;
              }

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ status: 'success', data: result }));
            } catch (err: any) {
              res.statusCode = 500;
              res.end(JSON.stringify({ status: 'error', message: err.toString() }));
            }
          });
        } else {
          next();
        }
      });
    }
  }
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    process.env.TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL || env.TURSO_DATABASE_URL;
    process.env.TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN || env.TURSO_AUTH_TOKEN;

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [vercelApiMock()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
