// Adding "Training_" prefix
const SHEET_EMPLOYEES = "Training_Employees";
const SHEET_LOGS = "Training_TrainingLogs";
const SHEET_SETTINGS = "Training_Settings";
const SHEET_PLAN = "Training_TrainingPlan";

/**
 * Handle POST requests from Vercel Serverless API
 */
function doPost(e) {
  try {
    var payloadStr = e.parameter && e.parameter.payload ? e.parameter.payload : null;
    
    if (!payloadStr && e.postData && e.postData.contents) {
      payloadStr = e.postData.contents;
    }
    
    if (!payloadStr) {
      throw new Error("No payload data received.");
    }
    
    var incoming = JSON.parse(payloadStr);
    var func = incoming.func;
    var args = incoming.args || [];
    var sheetId = incoming.sheetId; // Fetch the sheet ID dynamically mapped by Vercel
    
    if (!sheetId) {
      throw new Error("No Sheet ID provided in payload.");
    }
    
    var result;
    
    // Pass the sheetId into all related functions dynamically
    if (func === 'getAllData') result = getAllData(sheetId);
    else if (func === 'saveTrainingSession') result = saveTrainingSession(sheetId, args[0]);
    else if (func === 'savePlan') result = savePlan(sheetId, args[0]);
    else if (func === 'savePlanBatch') result = savePlanBatch(sheetId, args[0]);
    else if (func === 'fetchPlanFromGoogleSheet') result = fetchPlanFromGoogleSheet(sheetId, args[0]);
    else if (func === 'saveImportedPlan') result = saveImportedPlan(sheetId, args[0]);
    else if (func === 'updateEmployeesBulk') result = updateEmployeesBulk(sheetId, args[0]);
    else if (func === 'deleteEmployee') result = deleteEmployee(sheetId, args[0]);
    else if (func === 'saveSettingsItem') result = saveSettingsItem(sheetId, args[0], args[1]);
    else if (func === 'deleteSettingsItem') result = deleteSettingsItem(sheetId, args[0], args[1]);
    else if (func === 'renamePolicy') result = renamePolicy(sheetId, args[0], args[1]);
    else if (func === 'updateSessionTrainer') result = updateSessionTrainer(sheetId, args[0]);
    else if (func === 'updateSessionPolicies') result = updateSessionPolicies(sheetId, args[0]);
    else if (func === 'deleteTrainingSession') result = deleteTrainingSession(sheetId, args[0]);
    else if (func === 'addTraineesToSession') result = addTraineesToSession(sheetId, args[0]);
    else throw new Error("Function not found: " + func);
    
    // Add CORS headers by returning JSON
    return ContentService.createTextOutput(JSON.stringify({ status: "success", data: result }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService.createTextOutput("API is running. Use POST requests to interact with the data.")
    .setMimeType(ContentService.MimeType.TEXT);
}

// Open by sheetId instead of global definition
function getMasterSpreadsheet(sheetId) {
  const ss = SpreadsheetApp.openById(sheetId);
  return ss;
}

function getSheetData(sheetId, sheetName) {
  const ss = getMasterSpreadsheet(sheetId);
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (sheetName === SHEET_EMPLOYEES) sheet.appendRow(["ID", "Name", "Job", "Category"]);
    if (sheetName === SHEET_LOGS) sheet.appendRow(["ID", "Date", "Month", "Year", "Category", "Policies", "TraineeName", "Trainer", "Timestamp"]);
    if (sheetName === SHEET_SETTINGS) {
       sheet.appendRow(["Type", "Value"]);
       sheet.appendRow(["Hospital_Name", "مستشفى المنيا الجامعى للعيون"]);
       sheet.appendRow(["Policy", "غسل الأيدي"]);
       sheet.appendRow(["Trainer", "مدرب مكافحة العدوى"]);
       sheet.appendRow(["Category", "تمريض"]);
       sheet.appendRow(["Category", "أطباء"]);
       sheet.appendRow(["Category", "عمال"]);
       sheet.appendRow(["Category", "إداريين"]);
       sheet.appendRow(["Password_user", "user"]);
       sheet.appendRow(["Password_manger", "manger"]);
       sheet.appendRow(["Password_admin", "admin"]);
    }
    if (sheetName === SHEET_PLAN) sheet.appendRow(["Month", "Category", "Policies", "Year"]);
  }
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) {
    if (sheetName === SHEET_PLAN && values.length === 1 && values[0].indexOf("Year") === -1) {
      sheet.getRange(1, values[0].length + 1).setValue("Year");
    }
    if (sheetName === SHEET_LOGS && values.length === 1 && values[0].indexOf("Year") === -1) {
      sheet.getRange(1, values[0].length + 1).setValue("Year");
    }
    return [];
  }
  const headers = values.shift();
  if (sheetName === SHEET_PLAN && headers.indexOf("Year") === -1) {
    headers.push("Year");
    sheet.getRange(1, headers.length).setValue("Year");
  }
  if (sheetName === SHEET_LOGS && headers.indexOf("Year") === -1) {
    headers.push("Year");
    sheet.getRange(1, headers.length).setValue("Year");
  }
  return values.map(row => {
    let obj = {};
    headers.forEach((h, i) => {
      let val = row[i];
      if (val instanceof Date) obj[h] = val.toISOString();
      else obj[h] = (typeof val === 'string') ? val.trim() : (val === undefined || val === null ? "" : String(val).trim());
    });
    // Ensure logs have Year and Month derived if missing
    if (sheetName === SHEET_LOGS && (!obj.Year || !obj.Month) && obj.Date) {
      const dateStr = String(obj.Date).split('T')[0].trim();
      if (dateStr.indexOf('-') !== -1) {
        const p = dateStr.split('-');
        if (p.length === 3) {
          if (!obj.Year) obj.Year = p[0];
          if (!obj.Month) obj.Month = String(parseInt(p[1], 10));
        }
      }
    }
    return obj;
  });
}

function getAllData(sheetId) {
  try {
    const employees = getSheetData(sheetId, SHEET_EMPLOYEES);
    const plan = getSheetData(sheetId, SHEET_PLAN);
    const settings = getSheetData(sheetId, SHEET_SETTINGS);
    
    let uniqueCategories = [];
    
    // 1. Load categories explicitly saved in settings
    settings.forEach(s => {
      if (s.Type === 'Category') {
        let cat = String(s.Value || "").trim();
        if (cat && uniqueCategories.indexOf(cat) === -1) {
          uniqueCategories.push(cat);
        }
      }
    });
    
    // 2. Load categories from existing employees (for robustness/legacy data)
    employees.forEach(emp => {
      let cat = String(emp.Category || "").trim();
      if (cat && uniqueCategories.indexOf(cat) === -1) {
        uniqueCategories.push(cat);
      }
    });
    
    // 3. Fallback to default categories if none exist
    if (uniqueCategories.length === 0) {
      uniqueCategories = ["تمريض", "أطباء", "عمال", "إداريين"];
    }
    
    return {
      employees: employees,
      logs: getSheetData(sheetId, SHEET_LOGS),
      settings: settings,
      plan: plan,
      categories: uniqueCategories
    };
  } catch (e) { 
    Logger.log(e.message);
    throw new Error("فشل جلب البيانات: " + e.message); 
  }
}

function saveTrainingSession(sheetId, data) {
  const ss = getMasterSpreadsheet(sheetId);
  const sheet = ss.getSheetByName(SHEET_LOGS);
  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
  
  let year = null;
  let month = null;
  const dateStr = String(data.date || "").split('T')[0].trim();
  if (dateStr.indexOf('-') !== -1) {
    const p = dateStr.split('-');
    if (p.length === 3) {
      year = parseInt(p[0], 10);
      month = parseInt(p[1], 10);
    }
  }
  if (!year || !month) {
    const dateObj = new Date(data.date);
    month = dateObj.getMonth() + 1;
    year = dateObj.getFullYear();
  }
  
  const rows = data.trainees.map(t => [
    Utilities.getUuid(), 
    data.date, 
    month, 
    year, 
    data.category.trim(), 
    data.policies.join(", "), 
    t.trim(), 
    data.trainer.trim(), 
    timestamp
  ]);
  if (rows.length > 0) sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  return getAllData(sheetId);
}

function savePlan(sheetId, planData) {
  const ss = getMasterSpreadsheet(sheetId);
  let sheet = ss.getSheetByName(SHEET_PLAN);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_PLAN);
    sheet.appendRow(["Month", "Category", "Policies", "Year"]);
  }
  
  let values = sheet.getDataRange().getValues();
  if (values.length === 0 || values[0].length === 0) {
    sheet.appendRow(["Month", "Category", "Policies", "Year"]);
    values = sheet.getDataRange().getValues();
  }
  
  let headers = values[0];
  let yearColIndex = headers.indexOf("Year");
  if (yearColIndex === -1) {
    sheet.getRange(1, headers.length + 1).setValue("Year");
    yearColIndex = headers.length;
    headers.push("Year");
    values = sheet.getDataRange().getValues();
  }
  
  const targetYear = planData.year ? String(planData.year).trim() : String(new Date().getFullYear());
  const targetMonth = String(planData.month).trim();
  const targetCategory = String(planData.category).trim();
  const currentYear = String(new Date().getFullYear());
  const isCurrentYear = targetYear === currentYear;
  
  let foundRow = -1;
  const duplicateRows = [];
  
  for (let i = 1; i < values.length; i++) {
    const rowMonth = String(values[i][0]).trim();
    const rowCategory = String(values[i][1]).trim();
    const rowYear = String(values[i][yearColIndex] || "").trim();
    
    const isSameMonth = parseInt(rowMonth, 10) === parseInt(targetMonth, 10) || rowMonth === targetMonth;
    const isSameCategory = rowCategory === targetCategory;
    const isMatchingYear = rowYear === targetYear || (!rowYear && isCurrentYear);
    
    if (isSameMonth && isSameCategory && isMatchingYear) {
      if (foundRow === -1) {
        foundRow = i + 1;
      } else {
        duplicateRows.push(i + 1);
      }
    }
  }
  
  const policiesStr = Array.isArray(planData.policies) ? planData.policies.join(", ") : String(planData.policies || "");
  const policiesColIndex = headers.indexOf("Policies") !== -1 ? headers.indexOf("Policies") : 2;
  
  if (foundRow > 0) {
    sheet.getRange(foundRow, policiesColIndex + 1).setValue(policiesStr);
    sheet.getRange(foundRow, yearColIndex + 1).setValue(targetYear);
    // Delete duplicate rows for this exact year from bottom to top so indices don't shift
    for (let d = duplicateRows.length - 1; d >= 0; d--) {
      sheet.deleteRow(duplicateRows[d]);
    }
  } else {
    const newRow = [];
    newRow[0] = targetMonth;
    newRow[1] = targetCategory;
    newRow[policiesColIndex] = policiesStr;
    newRow[yearColIndex] = targetYear;
    for (let col = 0; col <= Math.max(yearColIndex, 3); col++) {
      if (newRow[col] === undefined) newRow[col] = "";
    }
    sheet.appendRow(newRow);
  }
  return getAllData(sheetId);
}

function savePlanBatch(sheetId, items) {
  if (!items || !Array.isArray(items)) return getAllData(sheetId);
  for (var i = 0; i < items.length; i++) {
    if (items[i] && items[i].month && items[i].category) {
      savePlan(sheetId, items[i]);
    }
  }
  return getAllData(sheetId);
}

function fetchPlanFromGoogleSheet(sheetId, options) {
  var targetId = (options && options.sheetId) ? options.sheetId : sheetId;
  var targetYear = (options && options.targetYear) ? String(options.targetYear) : String(new Date().getFullYear());
  var plan = getSheetData(targetId, SHEET_PLAN);
  return {
    success: true,
    sheetId: targetId,
    totalItems: plan.length,
    items: plan
  };
}

function saveImportedPlan(sheetId, payload) {
  var items = (payload && payload.items) ? payload.items : [];
  var mode = (payload && payload.mode) ? payload.mode : 'replace_year';
  var targetYear = (payload && payload.targetYear) ? String(payload.targetYear) : String(new Date().getFullYear());
  
  if (mode === 'replace_year') {
    var ss = getMasterSpreadsheet(sheetId);
    var sheet = ss.getSheetByName(SHEET_PLAN);
    if (sheet) {
      var values = sheet.getDataRange().getValues();
      var headers = values[0] || [];
      var yearColIndex = headers.indexOf("Year");
      if (yearColIndex !== -1) {
        for (var r = values.length - 1; r >= 1; r--) {
          var rowYr = String(values[r][yearColIndex] || "").trim();
          if (rowYr === targetYear || (!rowYr && targetYear === String(new Date().getFullYear()))) {
            sheet.deleteRow(r + 1);
          }
        }
      }
    }
  }
  
  for (var i = 0; i < items.length; i++) {
    var itm = items[i];
    if (itm && (itm.Month || itm.month) && (itm.Category || itm.category)) {
      savePlan(sheetId, {
        month: itm.Month || itm.month,
        category: itm.Category || itm.category,
        policies: itm.Policies || itm.policies,
        year: itm.Year || itm.year || targetYear
      });
    }
  }
  return getAllData(sheetId);
}

function updateEmployeesBulk(sheetId, updatedEmployees) {
  const ss = getMasterSpreadsheet(sheetId);
  const sheet = ss.getSheetByName(SHEET_EMPLOYEES);
  const headers = ["ID", "Name", "Job", "Category"];
  
  // Find previous names to detect removed employees
  const oldData = sheet.getDataRange().getValues();
  const oldNames = [];
  for (let i = 1; i < oldData.length; i++) {
    const n = String(oldData[i][1] || "").trim();
    if (n) oldNames.push(n);
  }

  const validUpdated = (updatedEmployees || []).filter(function(e) { return e && e.Name && String(e.Name).trim(); });
  const newNames = validUpdated.map(function(e) { return String(e.Name).trim(); });
  const deletedNames = oldNames.filter(function(n) { return newNames.indexOf(n) === -1; });

  const newData = [headers];
  validUpdated.forEach(function(emp) {
    newData.push([emp.ID || Utilities.getUuid(), emp.Name.trim(), (emp.Job || "").trim(), (emp.Category || "").trim()]);
  });
  sheet.clearContents();
  sheet.getRange(1, 1, newData.length, headers.length).setValues(newData);

  // Delete logs for removed employees
  if (deletedNames.length > 0) {
    const logsSheet = ss.getSheetByName(SHEET_LOGS);
    if (logsSheet) {
      const logsData = logsSheet.getDataRange().getValues();
      for (let i = logsData.length - 1; i >= 1; i--) {
        const trainee = String(logsData[i][6] || "").trim();
        if (deletedNames.indexOf(trainee) !== -1) {
          logsSheet.deleteRow(i + 1);
        }
      }
    }
  }

  return getAllData(sheetId);
}

function deleteEmployee(sheetId, id, optName) {
  const ss = getMasterSpreadsheet(sheetId);
  const sheet = ss.getSheetByName(SHEET_EMPLOYEES);
  let empName = String(optName || "").trim();
  if (sheet) {
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == id || (empName && String(data[i][1]).trim() === empName)) {
        if (!empName) empName = String(data[i][1]).trim();
        sheet.deleteRow(i + 1);
        break;
      }
    }
  }

  // Also delete all logs for this employee
  if (empName) {
    const logsSheet = ss.getSheetByName(SHEET_LOGS);
    if (logsSheet) {
      const logsData = logsSheet.getDataRange().getValues();
      for (let i = logsData.length - 1; i >= 1; i--) {
        const trainee = String(logsData[i][6] || "").trim();
        if (trainee === empName) {
          logsSheet.deleteRow(i + 1);
        }
      }
    }
  }

  return getAllData(sheetId);
}

function saveSettingsItem(sheetId, type, value) {
  const ss = getMasterSpreadsheet(sheetId);
  const sheet = ss.getSheetByName(SHEET_SETTINGS);
  
  const singleValueTypes = [
    'Hospital_Name', 'Hospital_Logo', 'Hospital_Logo_Left', 'IC_Manager_Title', 'IC_Manager_Name', 'Hospital_Manager_Title', 'Hospital_Manager_Name',
    'Password_user', 'Password_manger', 'Password_admin'
  ];
  
  if (type.startsWith('Password_') || singleValueTypes.includes(type)) {
    const data = sheet.getDataRange().getValues();
    for (let i = data.length - 1; i >= 1; i--) {
      if (data[i][0] === type) {
        sheet.deleteRow(i + 1);
      }
    }
  }
  
  sheet.appendRow([type, String(value || "").trim()]);
  return getAllData(sheetId);
}

function deleteSettingsItem(sheetId, type, value) {
  const ss = getMasterSpreadsheet(sheetId);
  const sheet = ss.getSheetByName(SHEET_SETTINGS);
  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i][0] == type && data[i][1] == value) sheet.deleteRow(i + 1);
  }
  return getAllData(sheetId);
}

function renamePolicy(sheetId, oldPolicy, newPolicy) {
  const oldTrimmed = String(oldPolicy || "").trim();
  const newTrimmed = String(newPolicy || "").trim();
  if (!oldTrimmed || !newTrimmed || oldTrimmed === newTrimmed) {
    return getAllData(sheetId);
  }

  const ss = getMasterSpreadsheet(sheetId);

  // 1. Update in Settings
  const settingsSheet = ss.getSheetByName(SHEET_SETTINGS);
  if (settingsSheet) {
    const settingsData = settingsSheet.getDataRange().getValues();
    for (let i = 1; i < settingsData.length; i++) {
      if (settingsData[i][0] === 'Policy' && String(settingsData[i][1]).trim() === oldTrimmed) {
        settingsSheet.getRange(i + 1, 2).setValue(newTrimmed);
      }
    }
  }

  function replacePolicyStr(policiesStr) {
    if (!policiesStr) return "";
    var items = [];
    var current = "";
    var parenCount = 0;
    for (var i = 0; i < policiesStr.length; i++) {
      var char = policiesStr[i];
      if (char === '(') parenCount++;
      else if (char === ')') parenCount--;
      if (char === ',' && parenCount === 0) {
        items.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    if (current.trim()) items.push(current.trim());

    var updatedItems = items.map(function(item) {
      var match = item.match(/^(.*?)\s*(\(.*?\))\s*$/);
      var base = item.trim();
      var parens = "";
      if (match) {
        base = match[1].trim();
        parens = match[2];
      }
      if (base === oldTrimmed) {
        return parens ? (newTrimmed + " " + parens) : newTrimmed;
      }
      return item;
    });
    return updatedItems.join(", ");
  }

  // 2. Update in TrainingPlan
  const planSheet = ss.getSheetByName(SHEET_PLAN);
  if (planSheet) {
    const planData = planSheet.getDataRange().getValues();
    for (let i = 1; i < planData.length; i++) {
      var currentPolicies = String(planData[i][2] || "");
      if (currentPolicies.indexOf(oldTrimmed) !== -1) {
        var updated = replacePolicyStr(currentPolicies);
        if (updated !== currentPolicies) {
          planSheet.getRange(i + 1, 3).setValue(updated);
        }
      }
    }
  }

  // 3. Update in TrainingLogs
  const logsSheet = ss.getSheetByName(SHEET_LOGS);
  if (logsSheet) {
    const logsData = logsSheet.getDataRange().getValues();
    for (let i = 1; i < logsData.length; i++) {
      var currentPolicies = String(logsData[i][5] || "");
      if (currentPolicies.indexOf(oldTrimmed) !== -1) {
        var updated = replacePolicyStr(currentPolicies);
        if (updated !== currentPolicies) {
          logsSheet.getRange(i + 1, 6).setValue(updated);
        }
      }
    }
  }

  return getAllData(sheetId);
}

function updateSessionTrainer(sheetId, payload) {
  const ss = getMasterSpreadsheet(sheetId);
  const sheet = ss.getSheetByName(SHEET_LOGS);
  if (!sheet) return getAllData(sheetId);

  const payloadObj = payload || {};
  const newTrainer = String(payloadObj.newTrainer || "").trim();
  const dateStr = payloadObj.date ? String(payloadObj.date).split('T')[0].trim() : "";
  const cat = payloadObj.category ? String(payloadObj.category).trim() : "";
  const pol = payloadObj.policies ? String(payloadObj.policies).trim() : "";
  const oldTrainer = payloadObj.oldTrainer ? String(payloadObj.oldTrainer).trim() : "";
  const logIds = Array.isArray(payloadObj.logIds) ? payloadObj.logIds.map(String) : [];

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowId = String(row[0] || "");
    const rowDate = String(row[1] || "").split('T')[0].trim();
    const rowCat = String(row[3] || "").trim();
    const rowPol = String(row[4] || "").trim();
    const rowTr = String(row[5] || "").trim();

    const matchesId = logIds.length > 0 && logIds.indexOf(rowId) !== -1;
    const matchesComposite = dateStr && cat && pol && rowDate === dateStr && rowCat === cat && rowPol === pol && (!oldTrainer || rowTr === oldTrainer);

    if (matchesId || matchesComposite) {
      sheet.getRange(i + 1, 6).setValue(newTrainer);
    }
  }

  return getAllData(sheetId);
}

function updateSessionPolicies(sheetId, payload) {
  const ss = getMasterSpreadsheet(sheetId);
  const sheet = ss.getSheetByName(SHEET_LOGS);
  if (!sheet) return getAllData(sheetId);

  const payloadObj = payload || {};
  const newPolicies = String(payloadObj.newPolicies || "").trim();
  const dateStr = payloadObj.date ? String(payloadObj.date).split('T')[0].trim() : "";
  const cat = payloadObj.category ? String(payloadObj.category).trim() : "";
  const oldPolicies = payloadObj.oldPolicies ? String(payloadObj.oldPolicies).trim() : "";
  const trainer = payloadObj.trainer ? String(payloadObj.trainer).trim() : "";
  const logIds = Array.isArray(payloadObj.logIds) ? payloadObj.logIds.map(String) : [];

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowId = String(row[0] || "");
    const rowDate = String(row[1] || "").split('T')[0].trim();
    const rowCat = String(row[3] || "").trim();
    const rowPol = String(row[4] || "").trim();
    const rowTr = String(row[5] || "").trim();

    const matchesId = logIds.length > 0 && logIds.indexOf(rowId) !== -1;
    const matchesComposite = dateStr && cat && rowDate === dateStr && rowCat === cat && (!oldPolicies || rowPol === oldPolicies) && (!trainer || rowTr === trainer);

    if (matchesId || matchesComposite) {
      sheet.getRange(i + 1, 5).setValue(newPolicies);
    }
  }

  return getAllData(sheetId);
}

function deleteTrainingSession(sheetId, payload) {
  const ss = getMasterSpreadsheet(sheetId);
  const sheet = ss.getSheetByName(SHEET_LOGS);
  if (!sheet) return getAllData(sheetId);

  const payloadObj = payload || {};
  const dateStr = payloadObj.date ? String(payloadObj.date).split('T')[0].trim() : "";
  const cat = payloadObj.category ? String(payloadObj.category).trim() : "";
  const pol = payloadObj.policies ? String(payloadObj.policies).trim() : "";
  const trainer = payloadObj.trainer ? String(payloadObj.trainer).trim() : "";
  const singleLogId = payloadObj.singleLogId ? String(payloadObj.singleLogId) : null;
  const logIds = Array.isArray(payloadObj.logIds) ? payloadObj.logIds.map(String) : [];

  const data = sheet.getDataRange().getValues();
  // Loop backwards to safely delete rows
  for (let i = data.length - 1; i >= 1; i--) {
    const row = data[i];
    const rowId = String(row[0] || "");
    const rowDate = String(row[1] || "").split('T')[0].trim();
    const rowCat = String(row[3] || "").trim();
    const rowPol = String(row[4] || "").trim();
    const rowTr = String(row[5] || "").trim();

    if (singleLogId) {
      if (rowId === singleLogId) {
        sheet.deleteRow(i + 1);
      }
      continue;
    }

    const matchesId = logIds.length > 0 && logIds.indexOf(rowId) !== -1;
    const matchesComposite = dateStr && cat && pol && rowDate === dateStr && rowCat === cat && rowPol === pol && (!trainer || rowTr === trainer);

    if (matchesId || matchesComposite) {
      sheet.deleteRow(i + 1);
    }
  }

  return getAllData(sheetId);
}

function addTraineesToSession(sheetId, payload) {
  const ss = getMasterSpreadsheet(sheetId);
  const sheet = ss.getSheetByName(SHEET_LOGS);
  if (!sheet) return getAllData(sheetId);

  const payloadObj = payload || {};
  const rawDate = payloadObj.date ? String(payloadObj.date).trim() : "";
  const dateStr = rawDate.split('T')[0].trim();
  const cat = payloadObj.category ? String(payloadObj.category).trim() : "";
  const pol = Array.isArray(payloadObj.policies) ? payloadObj.policies.join(", ") : String(payloadObj.policies || "").trim();
  const trainer = payloadObj.trainer ? String(payloadObj.trainer).trim() : "";
  const trainees = Array.isArray(payloadObj.trainees) ? payloadObj.trainees : [];
  const newEmployees = Array.isArray(payloadObj.newEmployees) ? payloadObj.newEmployees : [];
  const timestamp = Utilities.formatDate(new Date(), "GMT+2", "yyyy-MM-dd HH:mm:ss");

  let month = payloadObj.month ? parseInt(String(payloadObj.month), 10) : null;
  let year = payloadObj.year ? parseInt(String(payloadObj.year), 10) : null;
  if (!month || isNaN(month) || !year || isNaN(year)) {
    const ymd = dateStr.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    const dmy = dateStr.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (ymd) {
      year = parseInt(ymd[1], 10);
      month = parseInt(ymd[2], 10);
    } else if (dmy) {
      month = parseInt(dmy[2], 10);
      year = parseInt(dmy[3], 10);
    } else {
      const dObj = new Date(dateStr);
      if (!isNaN(dObj.getTime())) {
        month = dObj.getMonth() + 1;
        year = dObj.getFullYear();
      } else {
        const now = new Date();
        month = now.getMonth() + 1;
        year = now.getFullYear();
      }
    }
  }

  if (newEmployees.length > 0) {
    const empSheet = ss.getSheetByName(SHEET_EMPLOYEES);
    if (empSheet) {
      const empRows = [];
      for (let k = 0; k < newEmployees.length; k++) {
        const emp = newEmployees[k];
        if (emp && emp.Name) {
          empRows.push([emp.ID || Utilities.getUuid(), String(emp.Name).trim(), String(emp.Job || "موظف").trim(), String(emp.Category || cat).trim()]);
        }
      }
      if (empRows.length > 0) {
        empSheet.getRange(empSheet.getLastRow() + 1, 1, empRows.length, 4).setValues(empRows);
      }
    }
  }

  const existingData = sheet.getDataRange().getValues();
  const existingNames = new Set();
  for (let i = 1; i < existingData.length; i++) {
    const rDate = String(existingData[i][1] || "").split('T')[0].trim();
    const rCat = String(existingData[i][4] || "").trim();
    const rPol = String(existingData[i][5] || "").trim();
    const rTrainee = String(existingData[i][6] || "").trim();
    const rTr = String(existingData[i][7] || "").trim();
    if (rDate === dateStr && rCat === cat && rPol === pol && (!trainer || rTr === trainer)) {
      existingNames.add(rTrainee);
    }
  }

  const newRows = [];
  for (let j = 0; j < trainees.length; j++) {
    const tName = String(trainees[j] || "").trim();
    if (!tName || existingNames.has(tName)) continue;
    existingNames.add(tName);
    const newId = Utilities.getUuid();
    newRows.push([newId, rawDate || dateStr, month, year, cat, pol, tName, trainer, timestamp]);
  }

  if (newRows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, newRows[0].length).setValues(newRows);
  }

  return getAllData(sheetId);
}