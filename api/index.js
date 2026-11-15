import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createTablesAndMigrate,
  getAllDataDb,
  getCentersDb,
  addCenterDb,
  deleteCenterDb,
  saveTrainingSessionDb,
  savePlanDb,
  savePlanBatchDb,
  updateEmployeesBulkDb,
  deleteEmployeeDb,
  saveSettingsItemDb,
  deleteSettingsItemDb,
  renamePolicyDb,
  fetchPlanFromGoogleSheetDb,
  saveImportedPlanDb,
  updateSessionTrainerDb,
  updateSessionPoliciesDb,
  deleteTrainingSessionDb,
  addTraineesToSessionDb,
  testPreviousTursoDb,
  importFromPreviousTursoDb
} from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

// Initialize database on startup
createTablesAndMigrate().then(() => {
  console.log("Database initialization finished.");
}).catch(err => {
  console.error("Database initialization failed:", err);
});

app.post('/api/gas', async (req, res) => {
  try {
    const { func, args = [], center: bodyCenter } = req.body;
    console.log(`Executing database operation via Express: ${func}`);
    
    const center = bodyCenter || (args[0] && typeof args[0] === 'object' ? args[0].center : null) || (func === 'getAllData' && typeof args[0] === 'string' ? args[0] : null);

    let result;
    
    if (func === 'getCenters') {
      result = await getCentersDb();
    } else if (func === 'addCenter') {
      result = await addCenterDb(args[0]);
    } else if (func === 'deleteCenter') {
      result = await deleteCenterDb(args[0]);
    } else if (func === 'testPreviousTursoDb') {
      result = await testPreviousTursoDb(args[0]);
    } else if (func === 'importFromPreviousTursoDb') {
      result = await importFromPreviousTursoDb(args[0]);
    } else if (func === 'getAllData') {
      result = await getAllDataDb(center || args[0]);
    } else if (func === 'saveTrainingSession') {
      result = await saveTrainingSessionDb(args[0], center);
    } else if (func === 'addTraineesToSession') {
      result = await addTraineesToSessionDb(args[0], center);
    } else if (func === 'savePlan') {
      result = await savePlanDb(args[0], center);
    } else if (func === 'savePlanBatch') {
      result = await savePlanBatchDb(args[0], center);
    } else if (func === 'updateEmployeesBulk') {
      result = await updateEmployeesBulkDb(args[0], center);
    } else if (func === 'deleteEmployee') {
      result = await deleteEmployeeDb(args[0], args[1], center);
    } else if (func === 'saveSettingsItem') {
      result = await saveSettingsItemDb(args[0], args[1], center);
    } else if (func === 'deleteSettingsItem') {
      result = await deleteSettingsItemDb(args[0], args[1], center);
    } else if (func === 'renamePolicy') {
      result = await renamePolicyDb(args[0], args[1], center);
    } else if (func === 'fetchPlanFromGoogleSheet') {
      result = await fetchPlanFromGoogleSheetDb(args[0], center);
    } else if (func === 'saveImportedPlan') {
      result = await saveImportedPlanDb(args[0], center);
    } else if (func === 'updateSessionTrainer') {
      result = await updateSessionTrainerDb(args[0], center);
    } else if (func === 'updateSessionPolicies') {
      result = await updateSessionPoliciesDb(args[0], center);
    } else if (func === 'deleteTrainingSession') {
      result = await deleteTrainingSessionDb(args[0], center);
    } else {
      return res.status(400).json({ status: 'error', message: `Function not found: ${func}` });
    }
    
    res.json({ status: 'success', data: result });
  } catch (err) {
    console.error(`Error executing ${req.body?.func || 'unknown'}:`, err);
    res.status(500).json({ status: 'error', message: err.toString() });
  }
});

// Serve static files from the React app
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// The catchall handler
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || path.extname(req.path)) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

export default app;
