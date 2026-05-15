// gsheet.js — Layer komunikasi dengan Google Apps Script Web App
// 
// ⚠️  GANTI nilai SCRIPT_URL di bawah dengan URL Web App Anda setelah deploy!
//
export const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxstHrATRVLWYd3HBgu8EH2Wd1npORPB71mpRc4mLnj41luDB2txHDely_rokSz_zZuPA/exec';

const SHEETS = {
  ITEMS: 'Items',
  EMPLOYEES: 'Employees',
  DISTRIBUTIONS: 'Distributions',
  STOCK_OPNAME: 'StockOpname'
};

/**
 * GET semua baris dari sheet tertentu
 */
export async function fetchAll(sheetName) {
  const url = `${SCRIPT_URL}?action=getAll&sheet=${sheetName}`;
  const res = await fetch(url);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Gagal mengambil data dari ' + sheetName);
  return json.data;
}

/**
 * INSERT baris baru ke sheet
 */
export async function insertRow(sheetName, data) {
  const res = await fetch(SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'insert', sheet: sheetName, data })
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Gagal menyimpan data');
  return json;
}

/**
 * UPDATE baris berdasarkan id
 */
export async function updateRow(sheetName, id, data) {
  const res = await fetch(SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'update', sheet: sheetName, id, data })
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Gagal mengupdate data');
  return json;
}

/**
 * DELETE baris berdasarkan id
 */
export async function deleteRow(sheetName, id) {
  const res = await fetch(SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'delete', sheet: sheetName, id })
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Gagal menghapus data');
  return json;
}

/**
 * UPDATE stok item secara langsung (optimized)
 */
export async function updateStockInSheet(itemId, newStok) {
  const res = await fetch(SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'updateStock', id: itemId, stok: newStok })
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Gagal update stok');
  return json;
}

export { SHEETS };