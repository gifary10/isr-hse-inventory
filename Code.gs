// ISR Inventory - Google Apps Script Backend with CacheService
// Deploy this as a Web App

const SPREADSHEET_ID = '1m7FF85UULA0nb-9m6q5QB2z_UYkwSzBhpNSUtkR9kdQ';
const SIGNATURE_FOLDER_ID = '1Q-yXI6FrD0mGumL-cK9ZBy8jvHxTY6od';

// Konfigurasi cache TTL (detik)
const CACHE_TTL = {
  ITEMS: 300,           // 5 menit
  DASHBOARD: 300,       // 5 menit
  HISTORY: 120,         // 2 menit
  EMPLOYEES: 600        // 10 menit
};

// ----------------------------------------------------------------
// doGet & doPost
// ----------------------------------------------------------------
function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const callback = e.parameter && e.parameter.callback;

  let action = (e.parameter && e.parameter.action) || '';
  let payload = {};

  // Baca payload dari query string (GET / JSONP)
  if (e.parameter && e.parameter.payload) {
    try { payload = JSON.parse(e.parameter.payload); } catch(err) {}
  }

  // Baca payload dari POST body
  if (e.postData && e.postData.contents) {
    if (e.postData.type === 'application/x-www-form-urlencoded' ||
        e.postData.type === 'multipart/form-data') {
      if (e.parameter && e.parameter.action) action = e.parameter.action;
      if (e.parameter && e.parameter.payload) {
        try { payload = JSON.parse(e.parameter.payload); } catch(err) {}
      }
    } else {
      try {
        const body = JSON.parse(e.postData.contents);
        if (body.action) action = body.action;
        if (body.payload) payload = typeof body.payload === 'string'
          ? JSON.parse(body.payload) : body.payload;
      } catch(err) {}
    }
  }

  let result;
  try {
    switch (action) {
      case 'getItems':
        result = { success: true, data: getItemsCached() };
        break;
      case 'saveStockOpname':
        result = saveStockOpname(payload);
        break;
      case 'saveDistribution':
        result = saveDistribution(payload);
        break;
      case 'getStockHistory':
        result = { success: true, data: getStockHistoryCached() };
        break;
      case 'getDistributionHistory':
        result = { success: true, data: getDistributionHistoryCached() };
        break;
      case 'searchEmployees':
        result = { success: true, data: searchEmployeesCached(payload.query || (e.parameter && e.parameter.query) || '') };
        break;
      case 'getDashboardStats':
        result = { success: true, data: getDashboardStatsCached() };
        break;
      case 'addItem':
        result = addItem(payload);
        break;
      case 'updateItem':
        result = updateItem(payload);
        break;
      case 'deleteItem':
        result = deleteItem(payload.id);
        break;
      case 'uploadSignature':
        result = uploadSignature(payload);
        break;
      case 'updateDistributionSignature':
        result = updateDistributionSignature(payload);
        break;
      default:
        result = { success: false, error: 'Invalid action: ' + action };
    }
  } catch (error) {
    Logger.log('handleRequest ERROR: ' + error.toString());
    result = { success: false, error: error.toString() };
  }

  const json = JSON.stringify(result);

  if (callback) {
    const out = ContentService.createTextOutput(callback + '(' + json + ')');
    out.setMimeType(ContentService.MimeType.JAVASCRIPT);
    return out;
  }

  const out = ContentService.createTextOutput(json);
  out.setMimeType(ContentService.MimeType.JSON);
  return out;
}

// ======================= CACHE WRAPPER FUNCTIONS =======================

function getItemsCached() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('items');
  if (cached) {
    Logger.log('[Cache] getItems from cache');
    return JSON.parse(cached);
  }
  Logger.log('[Cache] getItems from sheet');
  const items = getItems();
  cache.put('items', JSON.stringify(items), CACHE_TTL.ITEMS);
  return items;
}

function getDashboardStatsCached() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('dashboard_stats');
  if (cached) {
    Logger.log('[Cache] dashboard_stats from cache');
    return JSON.parse(cached);
  }
  Logger.log('[Cache] dashboard_stats from sheet');
  const stats = getDashboardStats();
  cache.put('dashboard_stats', JSON.stringify(stats), CACHE_TTL.DASHBOARD);
  return stats;
}

function getDistributionHistoryCached() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('distribution_history');
  if (cached) {
    Logger.log('[Cache] distribution_history from cache');
    return JSON.parse(cached);
  }
  Logger.log('[Cache] distribution_history from sheet');
  const history = getDistributionHistory();
  cache.put('distribution_history', JSON.stringify(history), CACHE_TTL.HISTORY);
  return history;
}

function getStockHistoryCached() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('stock_history');
  if (cached) {
    Logger.log('[Cache] stock_history from cache');
    return JSON.parse(cached);
  }
  Logger.log('[Cache] stock_history from sheet');
  const history = getStockHistory();
  cache.put('stock_history', JSON.stringify(history), CACHE_TTL.HISTORY);
  return history;
}

function searchEmployeesCached(query) {
  const cache = CacheService.getScriptCache();
  const cacheKey = 'employees_' + (query || 'all');
  const cached = cache.get(cacheKey);
  if (cached) {
    Logger.log('[Cache] employees from cache: ' + cacheKey);
    return JSON.parse(cached);
  }
  Logger.log('[Cache] employees from sheet: ' + cacheKey);
  const employees = searchEmployees(query);
  cache.put(cacheKey, JSON.stringify(employees), CACHE_TTL.EMPLOYEES);
  return employees;
}

// ======================= INVALIDATE CACHE SAAT DATA BERUBAH =======================

function invalidateCache() {
  const cache = CacheService.getScriptCache();
  cache.removeAll([
    'items',
    'dashboard_stats',
    'distribution_history',
    'stock_history'
  ]);
  Logger.log('[Cache] Core caches invalidated');
}

// ======================= ORIGINAL FUNCTIONS (READ SHEET) =======================

function getSheet(sheetName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (sheetName === 'Items') {
      sheet.getRange(1,1,1,8).setValues([['id','name','category_id','category','current_stock','unit','min_stock','last_updated']]);
    } else if (sheetName === 'StockOpname') {
      sheet.getRange(1,1,1,9).setValues([['id','item_id','item_name','category','old_stock','new_stock','notes','adjusted_by','timestamp']]);
    } else if (sheetName === 'Distribution') {
      sheet.getRange(1,1,1,14).setValues([['id','employee_id','employee_name','department','position','item_id','item_name','category','quantity','signature','distributor','notes','timestamp','status']]);
    } else if (sheetName === 'Employees') {
      sheet.getRange(1,1,1,5).setValues([['id','name','department','position','status']]);
    }
  }
  return sheet;
}

function getItems() {
  const sheet = getSheet('Items');
  if (sheet.getLastRow() <= 1) initializeItems();
  const data = sheet.getRange(2,1,sheet.getLastRow()-1,8).getValues();
  return data.map(function(row) {
    return { id:row[0], name:row[1], category_id:row[2], category:row[3],
             current_stock:row[4], unit:row[5], min_stock:row[6], last_updated:row[7] };
  });
}

function initializeItems() {
  const sheet = getSheet('Items');
  const itemNames = {
    1: ['Paracetamol','Amoxicillin','Ibuprofen','Cetirizine','Omeprazole'],
    2: ['Vitamin C','Vitamin D3','Vitamin B Complex','Multivitamin','Vitamin E'],
    3: ['Plaster','Betadine','Kassa Steril','Minyak Kayu Putih','Antiseptik'],
    4: ['Masker Medis','Sarung Tangan','Face Shield','Hand Sanitizer','Apron']
  };
  const categories = ['Obat','Vitamin','Isi P3K','APD'];
  const items = [];
  for (var catId = 1; catId <= 4; catId++) {
    itemNames[catId].forEach(function(name, idx) {
      items.push([catId+'-'+(idx+1), name, catId, categories[catId-1],
                  Math.floor(Math.random()*500)+50,
                  catId===4?'pcs':'tablet', 50, new Date().toISOString()]);
    });
  }
  if (sheet.getLastRow() > 1) sheet.getRange(2,1,sheet.getLastRow()-1,8).clear();
  sheet.getRange(2,1,items.length,8).setValues(items);
}

function addItem(itemData) {
  const sheet = getSheet('Items');
  const newRow = [itemData.id||Date.now().toString(), itemData.name,
                  itemData.category_id, itemData.category,
                  itemData.current_stock||0, itemData.unit||'pcs',
                  itemData.min_stock||50, new Date().toISOString()];
  sheet.appendRow(newRow);
  invalidateCache(); // Hapus cache karena data berubah
  return { success:true, id:newRow[0] };
}

function updateItem(itemData) {
  const sheet = getSheet('Items');
  const data = sheet.getRange(2,1,sheet.getLastRow()-1,8).getValues();
  for (var i=0; i<data.length; i++) {
    if (String(data[i][0]) === String(itemData.id)) {
      sheet.getRange(i+2,2).setValue(itemData.name);
      sheet.getRange(i+2,3).setValue(itemData.category_id);
      sheet.getRange(i+2,4).setValue(itemData.category);
      sheet.getRange(i+2,5).setValue(itemData.current_stock);
      sheet.getRange(i+2,6).setValue(itemData.unit);
      sheet.getRange(i+2,7).setValue(itemData.min_stock);
      sheet.getRange(i+2,8).setValue(new Date().toISOString());
      invalidateCache();
      return { success:true };
    }
  }
  return { success:false, error:'Item not found' };
}

function deleteItem(itemId) {
  const sheet = getSheet('Items');
  const data = sheet.getRange(2,1,sheet.getLastRow()-1,8).getValues();
  for (var i=0; i<data.length; i++) {
    if (String(data[i][0]) === String(itemId)) {
      sheet.deleteRow(i+2);
      invalidateCache();
      return { success:true };
    }
  }
  return { success:false, error:'Item not found' };
}

function saveStockOpname(data) {
  const sheet = getSheet('StockOpname');
  const newRow = [Date.now().toString(), data.item_id, data.item_name,
                  data.category, data.old_stock, data.new_stock,
                  data.notes||'', data.adjusted_by||'System', new Date().toISOString()];
  sheet.appendRow(newRow);
  updateItemStock(data.item_id, data.new_stock);
  invalidateCache(); // Hapus cache karena stok berubah
  return { success:true, id:newRow[0] };
}

function updateItemStock(itemId, newStock) {
  const sheet = getSheet('Items');
  const data = sheet.getRange(2,1,sheet.getLastRow()-1,8).getValues();
  for (var i=0; i<data.length; i++) {
    if (String(data[i][0]) === String(itemId)) {
      sheet.getRange(i+2,5).setValue(newStock);
      sheet.getRange(i+2,8).setValue(new Date().toISOString());
      break;
    }
  }
}

function saveDistribution(data) {
  try {
    const sheet = getSheet('Distribution');
    var signatureUrl = data.signature || '';
    if (data.signature_file_id) {
      signatureUrl = 'https://drive.google.com/file/d/' + data.signature_file_id + '/view';
    }
    var newRow = [
      Date.now().toString(),
      data.employee_id,
      data.employee_name,
      data.department,
      data.position,
      data.item_id,
      data.item_name,
      data.category,
      data.quantity,
      signatureUrl,
      data.distributor || 'System',
      data.notes || '',
      new Date().toISOString(),
      'completed'
    ];
    sheet.appendRow(newRow);
    Logger.log('Distribution saved: ' + newRow[0]);
    var itemSheet = getSheet('Items');
    var lastRow = itemSheet.getLastRow();
    if (lastRow > 1) {
      var itemData = itemSheet.getRange(2, 1, lastRow - 1, 8).getValues();
      for (var i = 0; i < itemData.length; i++) {
        if (String(itemData[i][0]) === String(data.item_id)) {
          var newStock = Number(itemData[i][4]) - Number(data.quantity);
          itemSheet.getRange(i+2, 5).setValue(newStock);
          itemSheet.getRange(i+2, 8).setValue(new Date().toISOString());
          break;
        }
      }
    }
    invalidateCache(); // Hapus cache karena stok berubah
    return { success:true, id:newRow[0] };
  } catch(err) {
    Logger.log('saveDistribution ERROR: ' + err.toString());
    return { success:false, error:err.toString() };
  }
}

function getStockHistory() {
  const sheet = getSheet('StockOpname');
  if (sheet.getLastRow() <= 1) return [];
  const data = sheet.getRange(2,1,sheet.getLastRow()-1,9).getValues();
  return data.map(function(row) {
    return { id:row[0], item_id:row[1], item_name:row[2], category:row[3],
             old_stock:row[4], new_stock:row[5], notes:row[6],
             adjusted_by:row[7], timestamp:row[8] };
  }).reverse();
}

function getDistributionHistory() {
  const sheet = getSheet('Distribution');
  if (sheet.getLastRow() <= 1) return [];
  const data = sheet.getRange(2,1,sheet.getLastRow()-1,14).getValues();
  return data.map(function(row) {
    return { id:row[0], employee_id:row[1], employee_name:row[2],
             department:row[3], position:row[4], item_id:row[5],
             item_name:row[6], category:row[7], quantity:row[8],
             signature:row[9], distributor:row[10], notes:row[11],
             timestamp:row[12], status:row[13] };
  }).reverse();
}

function searchEmployees(query) {
  const sheet = getSheet('Employees');
  if (sheet.getLastRow() <= 1) initializeEmployees();
  const data = sheet.getRange(2,1,sheet.getLastRow()-1,5).getValues();
  const employees = data.filter(function(row) { return row[4]==='active'; })
    .map(function(row) {
      return { id:row[0], name:row[1], department:row[2], position:row[3], status:row[4] };
    });
  if (!query) return employees;
  const q = query.toLowerCase();
  return employees.filter(function(e) {
    return e.name.toLowerCase().includes(q) || e.id.toLowerCase().includes(q);
  });
}

function initializeEmployees() {
  const sheet = getSheet('Employees');
  const employees = [
    ['EMP001','Ahmad Wijaya','Produksi','Operator','active'],
    ['EMP002','Budi Santoso','Logistik','Staff','active'],
    ['EMP003','Citra Dewi','HRD','Manager','active'],
    ['EMP004','Dian Purnama','Produksi','Supervisor','active'],
    ['EMP005','Eko Prasetyo','Kesehatan','Dokter','active'],
    ['EMP006','Fajar Nugroho','Logistik','Supervisor','active'],
    ['EMP007','Gita Saraswati','Kesehatan','Perawat','active'],
    ['EMP008','Hendra Kurniawan','Produksi','Operator','active'],
    ['EMP009','Indah Permata','Kesehatan','Apoteker','active'],
    ['EMP010','Joko Susilo','Logistik','Staff','active']
  ];
  sheet.getRange(2,1,employees.length,5).setValues(employees);
}

function getDashboardStats() {
  const items = getItems(); // fungsi asli (baca sheet)
  const distribution = getDistributionHistory();
  const categories = [
    { id:1, name:'Obat',    count:0, low_stock:0 },
    { id:2, name:'Vitamin', count:0, low_stock:0 },
    { id:3, name:'Isi P3K', count:0, low_stock:0 },
    { id:4, name:'APD',     count:0, low_stock:0 }
  ];
  var totalStock = 0, lowStockCount = 0;
  items.forEach(function(item) {
    totalStock += item.current_stock;
    var cat = categories.find(function(c) { return c.id===item.category_id; });
    if (cat) {
      cat.count++;
      if (item.current_stock < item.min_stock) { cat.low_stock++; lowStockCount++; }
    }
  });
  const totalDistributed = distribution.reduce(function(s,d) { return s+d.quantity; }, 0);
  return { total_items:items.length, low_stock:lowStockCount,
           total_stock:totalStock, total_distributed:totalDistributed,
           categories:categories };
}

function updateDistributionSignature(data) {
  try {
    if (!data.id || !data.signature) {
      return { success: false, error: 'id dan signature wajib diisi' };
    }
    const sheet = getSheet('Distribution');
    if (sheet.getLastRow() <= 1) return { success: false, error: 'Data distribusi kosong' };
    const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 14).getValues();
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i][0]) === String(data.id)) {
        sheet.getRange(i + 2, 10).setValue(data.signature);
        Logger.log('Signature updated for distribution: ' + data.id);
        invalidateCache(); // Hapus cache history
        return { success: true };
      }
    }
    return { success: false, error: 'ID distribusi tidak ditemukan: ' + data.id };
  } catch (err) {
    Logger.log('updateDistributionSignature ERROR: ' + err.toString());
    return { success: false, error: err.toString() };
  }
}

function uploadSignature(payload) {
  try {
    const imageBase64 = payload.imageBase64;
    const fileName    = payload.fileName;
    if (!imageBase64 || !fileName) {
      return { success: false, error: 'imageBase64 dan fileName wajib diisi' };
    }
    Logger.log('uploadSignature: ' + fileName + ' (' + Math.round(imageBase64.length * 0.75 / 1024) + ' KB)');
    const decoded = Utilities.base64Decode(imageBase64);
    const blob    = Utilities.newBlob(decoded, 'image/png', fileName);
    const folder  = DriveApp.getFolderById(SIGNATURE_FOLDER_ID);
    const file    = folder.createFile(blob);
    const fileId  = file.getId();
    const viewUrl = 'https://drive.google.com/file/d/' + fileId + '/view';
    Logger.log('uploadSignature OK: ' + fileId);
    return { success: true, url: viewUrl, fileId: fileId };
  } catch (err) {
    Logger.log('uploadSignature ERROR: ' + err.toString());
    return { success: false, error: 'Upload gagal: ' + err.toString() };
  }
}

// Jalankan fungsi ini SEKALI dari editor untuk memberikan izin DriveApp
function authorizeApp() {
  const folder = DriveApp.getFolderById(SIGNATURE_FOLDER_ID);
  Logger.log('Folder: ' + folder.getName());
}