/**
 * dashboard.js — Dashboard page logic
 * Handles: stats, transaction CRUD, filters, recent list, top categories
 */

// ── Category definitions ──────────────────────────────────────────────────────
const INCOME_CATS  = ['Salary','Freelance','Investment','Gift','Other Income'];
const EXPENSE_CATS = ['Food','House','Electricity','Shopping','Transport','Healthcare','Education','Entertainment','Travel','Other Expense'];
const CAT_COLORS   = {
  Salary:'#4CAF82', Freelance:'#60A5FA', Investment:'#F4C55F', Gift:'#C084BC', 'Other Income':'#A78BFA',
  Food:'#E05C6A', House:'#F59E0B', Electricity:'#FCD34D', Shopping:'#FB923C',
  Transport:'#34D399', Healthcare:'#22D3EE', Education:'#818CF8',
  Entertainment:'#F472B6', Travel:'#A3E635', 'Other Expense':'#94A3B8',
};

// ── State ─────────────────────────────────────────────────────────────────────
let allTransactions = [];
let activeType = 'income';

// ── Init ──────────────────────────────────────────────────────────────────────
initSidebar('dashboard');

// Set topbar date
(function() {
  const d = new Date();
  document.getElementById('topbarDate').textContent =
    d.toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
})();

// Initialize page with data
loadAll();

// Set up filter listeners
document.getElementById('filterType').addEventListener('change', loadTransactions);
document.getElementById('filterCategory').addEventListener('change', loadTransactions);

// ── DOM refs ─────────────────────────────────────────────────────────────────
const modal        = document.getElementById('transactionModal');
const txForm       = document.getElementById('transactionForm');
const txCategory   = document.getElementById('txCategory');
const filterType   = document.getElementById('filterType');
const filterCat    = document.getElementById('filterCategory');

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n) { return '₹' + parseFloat(n).toLocaleString('en-IN', { minimumFractionDigits: 2 }); }
function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
}
function showError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg; el.classList.toggle('show', !!msg);
}

function buildCategoryDropdown(type) {
  const cats = type === 'income' ? INCOME_CATS : EXPENSE_CATS;
  txCategory.innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join('');
}

function buildFilterCategory() {
  const all = [...new Set(allTransactions.map(t => t.category))].sort();
  filterCat.innerHTML = '<option value="">All Categories</option>' +
    all.map(c => `<option value="${c}">${c}</option>`).join('');
}

// ── Load data ─────────────────────────────────────────────────────────────────
async function loadAll() {
  await Promise.all([loadSummary(), loadTransactions()]);
}

async function loadSummary() {
  const res = await api.get('/api/transactions/summary');
  if (res.success) {
    const { totalIncome, totalExpense, balance } = res.data;
    animateCounter('statIncome',  totalIncome);
    animateCounter('statExpense', totalExpense);
    animateCounter('statBalance', balance);
  }
}

function animateCounter(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = 0, duration = 900;
  const step = timestamp => {
    if (!step.start) step.start = timestamp;
    const progress = Math.min((timestamp - step.start) / duration, 1);
    const val = start + (target - start) * easeOut(progress);
    el.textContent = fmt(val);
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

async function loadTransactions() {
  const typeVal = filterType.value;
  const catVal  = filterCat.value;
  let url = '/api/transactions';
  const params = [];
  if (typeVal) params.push(`type=${typeVal}`);
  if (catVal)  params.push(`category=${encodeURIComponent(catVal)}`);
  if (params.length) url += '?' + params.join('&');

  const res = await api.get(url);
  if (res.success) {
    allTransactions = res.data;
    buildFilterCategory();
    renderTable(res.data);
    renderRecent(res.data);
    renderTopCategories(res.data);
  }
}

// ── Render table ──────────────────────────────────────────────────────────────
function renderTable(data) {
  const tbody = document.getElementById('transactionBody');
  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="fa-solid fa-receipt"></i><p>No transactions found</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(t => `
    <tr class="anim-fadeIn">
      <td style="color:var(--text-muted);font-size:0.82rem">${fmtDate(t.date)}</td>
      <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.description || '—'}</td>
      <td>
        <span style="display:inline-flex;align-items:center;gap:6px;font-size:0.84rem">
          <span class="cat-dot" style="background:${CAT_COLORS[t.category] || '#888'}"></span>
          ${t.category}
        </span>
      </td>
      <td><span class="badge badge-${t.type}">${t.type === 'income' ? '▲ Income' : '▼ Expense'}</span></td>
      <td class="amount-${t.type}">${fmt(t.amount)}</td>
      <td>
        <div class="action-btns">
          <button class="btn btn-outline btn-sm btn-icon" onclick="openEdit('${t._id}')" title="Edit">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button class="btn btn-danger btn-sm btn-icon" onclick="deleteTransaction('${t._id}')" title="Delete">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ── Render recent list ────────────────────────────────────────────────────────
function renderRecent(data) {
  const container = document.getElementById('recentList');
  const recent = data.slice(0, 6);
  if (!recent.length) {
    container.innerHTML = `<div class="empty-state" style="padding:24px 10px"><i class="fa-solid fa-receipt"></i><p>No activity yet</p></div>`;
    return;
  }
  container.innerHTML = recent.map(t => `
    <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
      <div style="width:34px;height:34px;border-radius:var(--radius-sm);background:${t.type==='income'?'rgba(76,175,130,0.15)':'rgba(224,92,106,0.15)'};display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <i class="fa-solid fa-arrow-${t.type==='income'?'up':'down'}" style="color:${t.type==='income'?'var(--success)':'var(--danger)'};font-size:0.8rem"></i>
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:0.85rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.category}</div>
        <div style="font-size:0.72rem;color:var(--text-muted)">${fmtDate(t.date)}</div>
      </div>
      <div class="amount-${t.type}" style="font-size:0.88rem">${fmt(t.amount)}</div>
    </div>
  `).join('');
}

// ── Render top categories ─────────────────────────────────────────────────────
function renderTopCategories(data) {
  const container = document.getElementById('topCategories');
  const catTotals = {};
  data.filter(t => t.type === 'expense').forEach(t => {
    catTotals[t.category] = (catTotals[t.category] || 0) + t.amount;
  });
  const sorted = Object.entries(catTotals).sort((a,b) => b[1]-a[1]).slice(0, 5);
  const max = sorted[0]?.[1] || 1;

  if (!sorted.length) {
    container.innerHTML = `<div style="color:var(--text-muted);font-size:0.85rem;text-align:center;padding:16px">No expense data yet</div>`;
    return;
  }
  container.innerHTML = sorted.map(([cat, total]) => `
    <div style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
        <span style="font-size:0.82rem;display:flex;align-items:center;gap:6px">
          <span class="cat-dot" style="background:${CAT_COLORS[cat]||'#888'}"></span>${cat}
        </span>
        <span style="font-size:0.82rem;font-weight:600;color:var(--danger)">${fmt(total)}</span>
      </div>
      <div class="progress-track">
        <div class="progress-fill" style="width:${(total/max*100).toFixed(1)}%;background:${CAT_COLORS[cat]||'var(--accent)'}"></div>
      </div>
    </div>
  `).join('');
}

// ── Modal open/close ──────────────────────────────────────────────────────────
function openModal() {
  document.getElementById('modalTitle').innerHTML = '<i class="fa-solid fa-plus" style="color:var(--accent);margin-right:8px"></i>Add Transaction';
  document.getElementById('editId').value = '';
  txForm.reset();
  activateTab('income');
  buildCategoryDropdown('income');
  document.getElementById('txDate').value = new Date().toISOString().split('T')[0];
  modal.classList.add('active');
}
function closeModal() { modal.classList.remove('active'); }

document.getElementById('openAddModal').addEventListener('click', openModal);
document.getElementById('closeModal').addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

// ── Type tabs ─────────────────────────────────────────────────────────────────
function activateTab(type) {
  activeType = type;
  document.getElementById('tabIncome').classList.toggle('active', type === 'income');
  document.getElementById('tabExpense').classList.toggle('active', type === 'expense');
  buildCategoryDropdown(type);
}
document.getElementById('tabIncome').addEventListener('click',  () => activateTab('income'));
document.getElementById('tabExpense').addEventListener('click', () => activateTab('expense'));

// ── Edit transaction ──────────────────────────────────────────────────────────
function openEdit(id) {
  const t = allTransactions.find(x => x._id === id);
  if (!t) return;
  document.getElementById('modalTitle').innerHTML = '<i class="fa-solid fa-pen" style="color:var(--accent);margin-right:8px"></i>Edit Transaction';
  document.getElementById('editId').value = id;
  activateTab(t.type);
  buildCategoryDropdown(t.type);
  txCategory.value = t.category;
  document.getElementById('txAmount').value = t.amount;
  document.getElementById('txDesc').value = t.description || '';
  document.getElementById('txDate').value = new Date(t.date).toISOString().split('T')[0];
  modal.classList.add('active');
}

// ── Delete transaction ────────────────────────────────────────────────────────
async function deleteTransaction(id) {
  if (!confirm('Delete this transaction? This cannot be undone.')) return;
  const res = await api.delete(`/api/transactions/${id}`);
  if (res.success) {
    showToast('Deleted', 'Transaction removed successfully', 'success');
    loadAll();
  } else {
    showToast('Error', res.message, 'error');
  }
}

// ── Form submit ───────────────────────────────────────────────────────────────
txForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  showError('categoryError', '');
  showError('amountError', '');

  const amount = parseFloat(document.getElementById('txAmount').value);
  if (!amount || amount <= 0) { showError('amountError', 'Enter a valid amount'); return; }

  const body = {
    type:        activeType,
    amount,
    category:    txCategory.value,
    description: document.getElementById('txDesc').value.trim(),
    date:        document.getElementById('txDate').value,
  };

  const btn = document.getElementById('txSubmitBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px"></span> Saving...';

  const editId = document.getElementById('editId').value;
  const res = editId
    ? await api.put(`/api/transactions/${editId}`, body)
    : await api.post('/api/transactions', body);

  btn.disabled = false;
  btn.innerHTML = '<i class="fa-solid fa-check"></i> Save Transaction';

  if (res.success) {
    showToast(editId ? 'Updated' : 'Added', 'Transaction saved successfully', 'success');
    closeModal();
    loadAll();
  } else {
    showToast('Error', res.message, 'error');
  }
});

// ── Filters ───────────────────────────────────────────────────────────────────
filterType.addEventListener('change', loadTransactions);
filterCat.addEventListener('change',  loadTransactions);

// ── Initial load ──────────────────────────────────────────────────────────────
loadAll();
