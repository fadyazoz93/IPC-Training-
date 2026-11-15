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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
  }

  try {
    const { func, args = [], center: bodyCenter } = req.body;
    console.log(`Executing database operation via Vercel Serverless Function: ${func}`);

    // Ensure database is initialized
    await createTablesAndMigrate();

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
    } else if (func === 'fetchPlanFromGoogleSheet') {
      result = await fetchPlanFromGoogleSheetDb(args[0], center);
    } else if (func === 'saveImportedPlan') {
      result = await saveImportedPlanDb(args[0], center);
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
    } else if (func === 'updateSessionTrainer') {
      result = await updateSessionTrainerDb(args[0], center);
    } else if (func === 'updateSessionPolicies') {
      result = await updateSessionPoliciesDb(args[0], center);
    } else if (func === 'deleteTrainingSession') {
      result = await deleteTrainingSessionDb(args[0], center);
    } else {
      return res.status(400).json({ status: 'error', message: `Function not found: ${func}` });
    }

    return res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    console.error(`Error executing serverless function:`, err);
    return res.status(500).json({ status: 'error', message: err.toString() });
  }
}
