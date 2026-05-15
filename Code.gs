// ============================================================
// Google Apps Script Backend untuk Inventaris ISR
// ID Spreadsheet: 1wffykcbrb8oGyGJWX0ZeGZ_Vt4yttgHjvlfzvd-Tg74
// 
// CARA DEPLOY:
// 1. Buka script.google.com
// 2. Buat project baru, paste seluruh kode ini
// 3. Klik Deploy > New deployment
// 4. Pilih type: Web app
// 5. Execute as: Me
// 6. Who has access: Anyone
// 7. Copy URL Web App yang dihasilkan
// 8. Paste URL tersebut ke dalam file gsheet.js (variabel SCRIPT_URL)
// ============================================================

const SPREADSHEET_ID = '1wffykcbrb8oGyGJWX0ZeGZ_Vt4yttgHjvlfzvd-Tg74';
const SHEETS = {
  ITEMS: 'Items',
  EMPLOYEES: 'Employees',
  DISTRIBUTIONS: 'Distributions',
  STOCK_OPNAME: 'StockOpname'
};

// Header definitions
const HEADERS = {
  Items: ['id', 'nama', 'kategori', 'stok', 'minStok', 'satuan', 'lokasi'],
  Employees: ['id', 'nama', 'departemen', 'jabatan'],
  Distributions: ['id', 'employeeId', 'employeeName', 'tanggal', 'waktu', 'items', 'catatan', 'signature'],
  StockOpname: ['id', 'itemId', 'itemName', 'stokLama', 'stokBaru', 'catatan', 'tanggal', 'waktu']
};

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    const params = e.parameter || {};
    const postData = e.postData ? JSON.parse(e.postData.contents || '{}') : {};
    const action = params.action || postData.action;
    const sheet = params.sheet || postData.sheet;

    let result;

    switch (action) {
      case 'getAll':
        result = getAllRows(sheet);
        break;
      case 'insert':
        result = insertRow(sheet, postData.data);
        break;
      case 'update':
        result = updateRow(sheet, postData.id, postData.data);
        break;
      case 'delete':
        result = deleteRow(sheet, postData.id || params.id);
        break;
      case 'updateStock':
        result = updateStock(postData.id, postData.stok);
        break;
      case 'batchInsert':
        result = batchInsert(sheet, postData.rows);
        break;
      default:
        result = { success: false, error: 'Unknown action: ' + action };
    }

    output.setContent(JSON.stringify(result));
  } catch (err) {
    output.setContent(JSON.stringify({ success: false, error: err.message }));
  }

  return output;
}

function getSheet(sheetName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Sheet tidak ditemukan: ' + sheetName);
  return sheet;
}

function getAllRows(sheetName) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) return { success: true, data: [] };

  const headers = data[0];
  const rows = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      let val = row[i];
      // Parse JSON fields
      if ((h === 'items') && typeof val === 'string' && val.startsWith('[')) {
        try { val = JSON.parse(val); } catch (e) { val = []; }
      }
      // Parse numbers
      if ((h === 'stok' || h === 'minStok' || h === 'stokLama' || h === 'stokBaru') && val !== '') {
        val = Number(val);
      }
      obj[h] = val;
    });
    return obj;
  }).filter(row => row.id && row.id !== '');

  return { success: true, data: rows };
}

function insertRow(sheetName, data) {
  const sheet = getSheet(sheetName);
  const headers = HEADERS[sheetName];
  if (!headers) throw new Error('Headers tidak ditemukan untuk: ' + sheetName);

  const row = headers.map(h => {
    let val = data[h] !== undefined ? data[h] : '';
    if (typeof val === 'object') val = JSON.stringify(val);
    return val;
  });

  sheet.appendRow(row);
  return { success: true, data: data };
}

function updateRow(sheetName, id, data) {
  const sheet = getSheet(sheetName);
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const idIdx = headers.indexOf('id');

  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][idIdx]) === String(id)) {
      headers.forEach((h, colIdx) => {
        if (data[h] !== undefined) {
          let val = data[h];
          if (typeof val === 'object') val = JSON.stringify(val);
          sheet.getRange(i + 1, colIdx + 1).setValue(val);
        }
      });
      return { success: true };
    }
  }

  return { success: false, error: 'Row tidak ditemukan dengan id: ' + id };
}

function deleteRow(sheetName, id) {
  const sheet = getSheet(sheetName);
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const idIdx = headers.indexOf('id');

  for (let i = allData.length - 1; i >= 1; i--) {
    if (String(allData[i][idIdx]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }

  return { success: false, error: 'Row tidak ditemukan dengan id: ' + id };
}

function updateStock(itemId, newStok) {
  const sheet = getSheet(SHEETS.ITEMS);
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const idIdx = headers.indexOf('id');
  const stokIdx = headers.indexOf('stok');

  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][idIdx]) === String(itemId)) {
      sheet.getRange(i + 1, stokIdx + 1).setValue(newStok);
      return { success: true };
    }
  }

  return { success: false, error: 'Item tidak ditemukan: ' + itemId };
}

function batchInsert(sheetName, rows) {
  const sheet = getSheet(sheetName);
  const headers = HEADERS[sheetName];
  if (!headers) throw new Error('Headers tidak ditemukan untuk: ' + sheetName);

  rows.forEach(data => {
    const row = headers.map(h => {
      let val = data[h] !== undefined ? data[h] : '';
      if (typeof val === 'object') val = JSON.stringify(val);
      return val;
    });
    sheet.appendRow(row);
  });

  return { success: true, count: rows.length };
}