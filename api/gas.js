import {
  createTablesAndMigrate,
  getAllDataDb,
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
  updateSessionDateDb,
  deleteTrainingSessionDb,
  addTraineesToSessionDb,
  testPreviousTursoDb,
  importFromPreviousTursoDb,
  getCentersDb,
  addCenterDb,
  deleteCenterDb,
  saveVisitDaysDb
} from './db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
  }

  try {
    const { func, args = [], center: bodyCenter } = req.body || {};
    const activeCenter =
      (typeof bodyCenter === 'string' && bodyCenter.trim() && !bodyCenter.includes('[object'))
        ? bodyCenter.trim()
        : (args[0] && typeof args[0] === 'object' && typeof args[0].center === 'string' && args[0].center.trim())
          ? args[0].center.trim()
          : "";

    console.log(`Executing database operation via Vercel Serverless Function: ${func}${activeCenter ? ` [Center: ${activeCenter}]` : ''}`);

    // Ensure database is initialized
    await createTablesAndMigrate();

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
    } else if (func === 'saveVisitDays') {
      result = await saveVisitDaysDb(args[0], activeCenter);
    } else if (func === 'updateSessionTrainer') {
      result = await updateSessionTrainerDb(args[0], activeCenter);
    } else if (func === 'updateSessionPolicies') {
      result = await updateSessionPoliciesDb(args[0], activeCenter);
    } else if (func === 'updateSessionDate') {
      result = await updateSessionDateDb(args[0], activeCenter);
    } else if (func === 'deleteTrainingSession') {
      result = await deleteTrainingSessionDb(args[0], activeCenter);
    } else {
      return res.status(400).json({ status: 'error', message: `Function not found: ${func}` });
    }

    return res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    console.error(`Error executing serverless function:`, err);
    return res.status(500).json({ status: 'error', message: err.toString() });
  }
}
