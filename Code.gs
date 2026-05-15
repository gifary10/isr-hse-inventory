// ISR Inventory - Google Apps Script Backend
// Deploy this as a Web App

const SPREADSHEET_ID = '1wffykcbrb8oGyGJWX0ZeGZ_Vt4yttgHjvlfzvd-Tg74';

// ✅ CORS FIX: Hanya perlu doGet karena semua request sekarang dikirim via GET.
// doPost tetap ada sebagai fallback tapi tidak lagi dipanggil dari frontend.
function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  // ✅ JSONP: jika ada parameter callback, kembalikan sebagai JavaScript bukan JSON murni.
  // Browser menyisipkan <script src="...?callback=fn"> — tidak ada CORS check.
  const callback = e.parameter?.callback;

  let result;
  const action = e.parameter?.action;

  // ✅ Baca payload dari query parameter (dikirim oleh services.js sebagai JSON string)
  let payload = {};
  if (e.parameter?.payload) {
    try {
      payload = JSON.parse(e.parameter.payload);
    } catch (err) {
      payload = e.parameter;
    }
  }

  // Fallback: jika masih ada POST request lama dengan body JSON
  if (e.postData && e.postData.contents) {
    try {
      const postPayload = JSON.parse(e.postData.contents);
      payload = Object.assign(postPayload, payload);
    } catch (err) {}
  }

  try {
    switch (action) {
      case 'getItems':
        result = { success: true, data: getItems() };
        break;
      case 'saveStockOpname':
        result = saveStockOpname(payload);
        break;
      case 'saveDistribution':
        result = saveDistribution(payload);
        break;
      case 'getStockHistory':
        result = { success: true, data: getStockHistory() };
        break;
      case 'getDistributionHistory':
        result = { success: true, data: getDistributionHistory() };
        break;
      case 'searchEmployees':
        result = { success: true, data: searchEmployees(payload.query || e.parameter?.query || '') };
        break;
      case 'getDashboardStats':
        result = { success: true, data: getDashboardStats() };
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
      default:
        result = { success: false, error: 'Invalid action: ' + action };
    }
  } catch (error) {
    result = { success: false, error: error.toString() };
  }

  // Jika ada callback parameter → JSONP response (text/javascript)
  // Jika tidak ada → JSON biasa (untuk testing langsung di browser)
  if (callback) {
    const jsonpOutput = ContentService.createTextOutput(
      `${callback}(${JSON.stringify(result)})`
    );
    jsonpOutput.setMimeType(ContentService.MimeType.JAVASCRIPT);
    return jsonpOutput;
  }

  const jsonOutput = ContentService.createTextOutput(JSON.stringify(result));
  jsonOutput.setMimeType(ContentService.MimeType.JSON);
  return jsonOutput;
}

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
  if (sheet.getLastRow() <= 1) {
    initializeItems();
  }
  const data = sheet.getRange(2,1,sheet.getLastRow()-1,8).getValues();
  return data.map(row => ({
    id: row[0],
    name: row[1],
    category_id: row[2],
    category: row[3],
    current_stock: row[4],
    unit: row[5],
    min_stock: row[6],
    last_updated: row[7]
  }));
}

function initializeItems() {
  const sheet = getSheet('Items');
  const items = [];
  const itemNames = {
    1: ['Paracetamol', 'Amoxicillin', 'Ibuprofen', 'Cetirizine', 'Omeprazole'],
    2: ['Vitamin C', 'Vitamin D3', 'Vitamin B Complex', 'Multivitamin', 'Vitamin E'],
    3: ['Plaster', 'Betadine', 'Kassa Steril', 'Minyak Kayu Putih', 'Antiseptik'],
    4: ['Masker Medis', 'Sarung Tangan', 'Face Shield', 'Hand Sanitizer', 'Apron']
  };
  const categories = ['Obat', 'Vitamin', 'Isi P3K', 'APD'];

  for (let catId = 1; catId <= 4; catId++) {
    const names = itemNames[catId];
    names.forEach((name, idx) => {
      items.push([
        `${catId}-${idx + 1}`,
        name,
        catId,
        categories[catId-1],
        Math.floor(Math.random() * 500) + 50,
        catId === 4 ? 'pcs' : 'tablet',
        50,
        new Date().toISOString()
      ]);
    });
  }

  if (sheet.getLastRow() > 1) {
    sheet.getRange(2,1,sheet.getLastRow()-1,8).clear();
  }
  sheet.getRange(2,1,items.length,8).setValues(items);
}

function addItem(itemData) {
  const sheet = getSheet('Items');
  const newRow = [
    itemData.id || Date.now().toString(),
    itemData.name,
    itemData.category_id,
    itemData.category,
    itemData.current_stock || 0,
    itemData.unit || 'pcs',
    itemData.min_stock || 50,
    new Date().toISOString()
  ];
  sheet.appendRow(newRow);
  return { success: true, id: newRow[0] };
}

function updateItem(itemData) {
  const sheet = getSheet('Items');
  const data = sheet.getRange(2,1,sheet.getLastRow()-1,8).getValues();
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === itemData.id) {
      sheet.getRange(i+2,2).setValue(itemData.name);
      sheet.getRange(i+2,3).setValue(itemData.category_id);
      sheet.getRange(i+2,4).setValue(itemData.category);
      sheet.getRange(i+2,5).setValue(itemData.current_stock);
      sheet.getRange(i+2,6).setValue(itemData.unit);
      sheet.getRange(i+2,7).setValue(itemData.min_stock);
      sheet.getRange(i+2,8).setValue(new Date().toISOString());
      return { success: true };
    }
  }
  return { success: false, error: 'Item not found' };
}

function deleteItem(itemId) {
  const sheet = getSheet('Items');
  const data = sheet.getRange(2,1,sheet.getLastRow()-1,8).getValues();
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === itemId) {
      sheet.deleteRow(i+2);
      return { success: true };
    }
  }
  return { success: false, error: 'Item not found' };
}

function saveStockOpname(data) {
  const sheet = getSheet('StockOpname');
  const newRow = [
    Date.now().toString(),
    data.item_id,
    data.item_name,
    data.category,
    data.old_stock,
    data.new_stock,
    data.notes || '',
    data.adjusted_by || 'System',
    new Date().toISOString()
  ];
  sheet.appendRow(newRow);
  updateItemStock(data.item_id, data.new_stock);
  return { success: true, id: newRow[0] };
}

function updateItemStock(itemId, newStock) {
  const sheet = getSheet('Items');
  const data = sheet.getRange(2,1,sheet.getLastRow()-1,8).getValues();
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === itemId) {
      sheet.getRange(i+2,5).setValue(newStock);
      sheet.getRange(i+2,8).setValue(new Date().toISOString());
      break;
    }
  }
}

function saveDistribution(data) {
  const sheet = getSheet('Distribution');
  const newRow = [
    Date.now().toString(),
    data.employee_id,
    data.employee_name,
    data.department,
    data.position,
    data.item_id,
    data.item_name,
    data.category,
    data.quantity,
    data.signature || '',
    data.distributor || 'System',
    data.notes || '',
    new Date().toISOString(),
    'completed'
  ];
  sheet.appendRow(newRow);

  const itemSheet = getSheet('Items');
  const itemData = itemSheet.getRange(2,1,itemSheet.getLastRow()-1,8).getValues();
  for (let i = 0; i < itemData.length; i++) {
    if (itemData[i][0] === data.item_id) {
      const newStock = itemData[i][4] - data.quantity;
      itemSheet.getRange(i+2,5).setValue(newStock);
      itemSheet.getRange(i+2,8).setValue(new Date().toISOString());
      break;
    }
  }

  return { success: true, id: newRow[0] };
}

function getStockHistory() {
  const sheet = getSheet('StockOpname');
  if (sheet.getLastRow() <= 1) return [];
  const data = sheet.getRange(2,1,sheet.getLastRow()-1,9).getValues();
  return data.map(row => ({
    id: row[0],
    item_id: row[1],
    item_name: row[2],
    category: row[3],
    old_stock: row[4],
    new_stock: row[5],
    notes: row[6],
    adjusted_by: row[7],
    timestamp: row[8]
  })).reverse();
}

function getDistributionHistory() {
  const sheet = getSheet('Distribution');
  if (sheet.getLastRow() <= 1) return [];
  const data = sheet.getRange(2,1,sheet.getLastRow()-1,14).getValues();
  return data.map(row => ({
    id: row[0],
    employee_id: row[1],
    employee_name: row[2],
    department: row[3],
    position: row[4],
    item_id: row[5],
    item_name: row[6],
    category: row[7],
    quantity: row[8],
    signature: row[9],
    distributor: row[10],
    notes: row[11],
    timestamp: row[12],
    status: row[13]
  })).reverse();
}

function searchEmployees(query) {
  const sheet = getSheet('Employees');
  if (sheet.getLastRow() <= 1) {
    initializeEmployees();
  }
  const data = sheet.getRange(2,1,sheet.getLastRow()-1,5).getValues();
  const employees = data.filter(row => row[4] === 'active').map(row => ({
    id: row[0],
    name: row[1],
    department: row[2],
    position: row[3],
    status: row[4]
  }));

  if (!query) return employees;

  const lowerQuery = query.toLowerCase();
  return employees.filter(e =>
    e.name.toLowerCase().includes(lowerQuery) ||
    e.id.toLowerCase().includes(lowerQuery)
  );
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
  const items = getItems();
  const distribution = getDistributionHistory();

  const categories = [
    { id: 1, name: 'Obat', count: 0, low_stock: 0 },
    { id: 2, name: 'Vitamin', count: 0, low_stock: 0 },
    { id: 3, name: 'Isi P3K', count: 0, low_stock: 0 },
    { id: 4, name: 'APD', count: 0, low_stock: 0 }
  ];

  let totalStock = 0;
  let lowStockCount = 0;

  items.forEach(item => {
    totalStock += item.current_stock;
    const cat = categories.find(c => c.id === item.category_id);
    if (cat) {
      cat.count++;
      if (item.current_stock < item.min_stock) {
        cat.low_stock++;
        lowStockCount++;
      }
    }
  });

  const totalDistributed = distribution.reduce((sum, d) => sum + d.quantity, 0);

  return {
    total_items: items.length,
    low_stock: lowStockCount,
    total_stock: totalStock,
    total_distributed: totalDistributed,
    categories: categories
  };
}