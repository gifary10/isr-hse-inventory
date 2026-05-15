// services.js — Data layer menggunakan Google Sheets sebagai database
// localStorage telah dihapus sepenuhnya

import {
  fetchAll,
  insertRow,
  updateRow,
  deleteRow,
  updateStockInSheet,
  SHEETS
} from './gsheet.js';

// In-memory cache
let items = [];
let employees = [];
let distributions = [];
let stockOpnameHistory = [];

// ─────────────────────────────────────────────
// INIT — Load semua data dari Google Sheets
// ─────────────────────────────────────────────
export async function initData() {
  try {
    const [
      fetchedItems,
      fetchedEmployees,
      fetchedDistributions,
      fetchedOpname
    ] = await Promise.all([
      fetchAll(SHEETS.ITEMS),
      fetchAll(SHEETS.EMPLOYEES),
      fetchAll(SHEETS.DISTRIBUTIONS),
      fetchAll(SHEETS.STOCK_OPNAME)
    ]);

    items = fetchedItems;
    employees = fetchedEmployees;
    distributions = fetchedDistributions;
    stockOpnameHistory = fetchedOpname;

    console.log(`✅ Data loaded — Items: ${items.length}, Employees: ${employees.length}, Distributions: ${distributions.length}, Opname: ${stockOpnameHistory.length}`);
  } catch (err) {
    console.error('❌ initData error:', err);
    throw err;
  }
}

// ─────────────────────────────────────────────
// ITEMS
// ─────────────────────────────────────────────
export function getItems() {
  return [...items];
}

export function getItem(id) {
  return items.find(i => i.id === id);
}

export async function saveItem(itemData) {
  if (itemData.id) {
    // UPDATE existing
    const index = items.findIndex(i => i.id === itemData.id);
    if (index !== -1) {
      items[index] = { ...items[index], ...itemData };
      await updateRow(SHEETS.ITEMS, itemData.id, items[index]);
    }
  } else {
    // INSERT new
    const newId = Date.now().toString();
    const newItem = { ...itemData, id: newId };
    items.push(newItem);
    await insertRow(SHEETS.ITEMS, newItem);
  }
}

export async function deleteItem(id) {
  items = items.filter(i => i.id !== id);
  await deleteRow(SHEETS.ITEMS, id);
}

export async function updateItemStock(id, newStock) {
  const item = items.find(i => i.id === id);
  if (item) {
    item.stok = newStock;
    await updateStockInSheet(id, newStock);
  }
}

// ─────────────────────────────────────────────
// EMPLOYEES
// ─────────────────────────────────────────────
export function getEmployees() {
  return [...employees];
}

export function getEmployee(id) {
  return employees.find(e => e.id === id);
}

export async function saveEmployee(employeeData) {
  if (employeeData.id) {
    const index = employees.findIndex(e => e.id === employeeData.id);
    if (index !== -1) {
      employees[index] = { ...employees[index], ...employeeData };
      await updateRow(SHEETS.EMPLOYEES, employeeData.id, employees[index]);
    }
  } else {
    const newId = Date.now().toString();
    const newEmployee = { ...employeeData, id: newId };
    employees.push(newEmployee);
    await insertRow(SHEETS.EMPLOYEES, newEmployee);
  }
}

export async function deleteEmployee(id) {
  employees = employees.filter(e => e.id !== id);
  await deleteRow(SHEETS.EMPLOYEES, id);
}

// ─────────────────────────────────────────────
// DISTRIBUTIONS
// ─────────────────────────────────────────────
export function getDistributions() {
  return [...distributions].sort((a, b) => new Date(b.waktu) - new Date(a.waktu));
}

export async function addDistribution(distributionData) {
  const newId = Date.now().toString();
  const newDist = { ...distributionData, id: newId };

  // Temukan nama karyawan untuk disimpan di sheet
  const employee = employees.find(e => e.id === newDist.employeeId);
  newDist.employeeName = employee?.nama || '';

  distributions.unshift(newDist);
  await insertRow(SHEETS.DISTRIBUTIONS, newDist);
}

// ─────────────────────────────────────────────
// STOCK OPNAME
// ─────────────────────────────────────────────
export function getStockOpnameHistory() {
  return [...stockOpnameHistory].sort((a, b) => new Date(b.waktu) - new Date(a.waktu));
}

export async function addStockOpname(opnameData) {
  const newId = Date.now().toString();
  const item = items.find(i => i.id === opnameData.itemId);
  const newOpname = {
    ...opnameData,
    id: newId,
    itemName: item?.nama || ''
  };

  stockOpnameHistory.unshift(newOpname);
  await insertRow(SHEETS.STOCK_OPNAME, newOpname);
}

// ─────────────────────────────────────────────
// CATEGORIES (static)
// ─────────────────────────────────────────────
export function getCategories() {
  return ['Obat', 'Vitamin', 'P3K', 'APD'];
}

// ─────────────────────────────────────────────
// DASHBOARD STATS
// ─────────────────────────────────────────────
export function getDashboardStats() {
  const today = new Date().toISOString().split('T')[0];
  const todayDistributions = distributions.filter(d => d.tanggal === today);

  return {
    totalItems: items.length,
    totalStock: items.reduce((sum, i) => sum + (Number(i.stok) || 0), 0),
    lowStock: items.filter(i => Number(i.stok) <= Number(i.minStok) && Number(i.stok) > 0).length,
    outOfStock: items.filter(i => Number(i.stok) === 0).length,
    todayDistribution: todayDistributions.length,
    todayItemsDistributed: todayDistributions.reduce((sum, d) => {
      const distItems = Array.isArray(d.items) ? d.items : [];
      return sum + distItems.reduce((s, i) => s + (Number(i.jumlah) || 0), 0);
    }, 0)
  };
}