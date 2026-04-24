/**
 * budget.js — Budget Goals page logic
 * Features: Create/Edit/Delete budget goals, progress tracking,
 * achievement popup, expired deadline warning popup
 */

initSidebar('budget');

let budgets = [];
let alreadyAlerted = new Set();

const modal  = document.getElementById('budgetModal');
const form   = document.getElementById('budgetForm');

function fmt(n) { return '₹' + parseFloat(n).toLocaleString('en-IN', { minimumFractionDigits: 2 }); }
function fmtDate(d) { return new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }); }

// ── Modal helpers ─────────────────────────────────────────────────────────────
function openModal(budget = null) {
  form.reset();
  document.getElementById('budgetEditId').value = budget ? budget._id : '';
  document.getElementById('budgetModalTitle').innerHTML = budget
    ? '<i class="fa-solid fa-pen" style="color:var(--accent);margin-right:8px"></i>Edit Budget Goal'
    : '<i class="fa-solid fa-plus" style="color:var(--accent);margin-right:8px"></i>New Budget Goal';

  if (budget) {
    document.getElementById('budgetName').value     = budget.name;
    document.getElementById('budgetAmount').value   = budget.targetAmount;
    document.getElementById('budgetDeadline').value = new Date(budget.deadline).toISOString().split('T')[0];
  } else {
    // Default deadline: 1 month from today
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    document.getElementById('budgetDeadline').value = d.toISOString().split('T')[0];
  }
  modal.classList.add('active');
}
function closeModal() { modal.classList.remove('active'); }

document.getElementById('openBudgetModal').addEventListener('click', () => openModal());
document.getElementById('closeBudgetModal').addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

// ── Form validation helper ─────────────────────────────────────────────────────
function showError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg; el.classList.toggle('show', !!msg);
}

// ── Form submit ───────────────────────────────────────────────────────────────
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  showError('budgetNameError', '');
  showError('budgetAmountError', '');
  showError('budgetDeadlineError', '');

  const name     = document.getElementById('budgetName').value.trim();
  const amount   = parseFloat(document.getElementById('budgetAmount').value);
  const deadline = document.getElementById('budgetDeadline').value;

  let valid = true;
  if (!name)            { showError('budgetNameError', 'Goal name is required'); valid = false; }
  if (!amount || amount <= 0) { showError('budgetAmountError', 'Enter a valid amount'); valid = false; }
  if (!deadline)        { showError('budgetDeadlineError', 'Select a deadline date'); valid = false; }
  if (!valid) return;

  const btn = document.getElementById('budgetSubmitBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px"></span> Saving...';

  const editId = document.getElementById('budgetEditId').value;
  const body = { name, targetAmount: amount, deadline };
  const res = editId
    ? await api.put(`/api/budgets/${editId}`, body)
    : await api.post('/api/budgets', body);

  btn.disabled = false;
  btn.innerHTML = '<i class="fa-solid fa-check"></i> Save Goal';

  if (res.success) {
    showToast(editId ? 'Updated' : 'Created', `Budget goal "${name}" saved!`, 'success');
    closeModal();
    loadBudgets();
  } else {
    showToast('Error', res.message, 'error');
  }
});

// ── Load budgets ──────────────────────────────────────────────────────────────
async function loadBudgets() {
  const res = await api.get('/api/budgets');
  if (!res.success) { showToast('Error', res.message, 'error'); return; }
  budgets = res.data;
  renderBudgets();
  updateBanner();
  checkAlerts();
}

// ── Update banner ─────────────────────────────────────────────────────────────
function updateBanner() {
  if (!budgets.length) return;
  const balance  = budgets[0]?.currentBalance ?? 0;
  const achieved = budgets.filter(b => b.isAchieved).length;
  const expired  = budgets.filter(b => b.isExpired).length;
  const active   = budgets.length - achieved - expired;
  document.getElementById('balanceBanner').textContent = fmt(balance);
  document.getElementById('bannerActive').textContent  = active;
  document.getElementById('bannerAchieved').textContent = achieved;
  document.getElementById('bannerExpired').textContent  = expired;
}

// ── Render budget cards ────────────────────────────────────────────────────────
function renderBudgets() {
  const grid = document.getElementById('budgetGrid');
  if (!budgets.length) {
    grid.innerHTML = `<div style="grid-column:1/-1"><div class="empty-state"><i class="fa-solid fa-bullseye"></i><p>No budget goals yet. Create your first one!</p></div></div>`;
    return;
  }
  grid.innerHTML = budgets.map((b, i) => {
    const statusClass = b.isAchieved ? 'achieved' : b.isExpired ? 'expired' : '';
    const pct         = Math.min(Math.max(b.progress, 0), 100).toFixed(1);
    const daysLeft    = Math.ceil((new Date(b.deadline) - new Date()) / (1000*60*60*24));
    const daysLabel   = b.isAchieved
      ? 'Achieved'
      : b.isExpired
        ? 'Deadline passed'
        : daysLeft === 0 ? 'Due today' : `${daysLeft}d remaining`;

    let statusBadge = '';
    if (b.isAchieved) {
      statusBadge = `<span class="status-badge status-achieved"><i class="fa-solid fa-check-circle"></i> Achieved</span>`;
    } else if (b.isExpired) {
      statusBadge = `<span class="status-badge status-expired"><i class="fa-solid fa-triangle-exclamation"></i> Expired</span>`;
    } else {
      statusBadge = `<span class="status-badge status-active"><i class="fa-solid fa-clock"></i> Active</span>`;
    }

    const fillColor = b.isAchieved ? 'var(--success)' : b.isExpired ? 'var(--warning)' : 'linear-gradient(90deg, var(--primary-light), var(--accent))';

    return `
      <div class="budget-card ${statusClass}" style="animation-delay:${i * 0.08}s">
        <div class="budget-header">
          <div>
            <div class="budget-name">${b.name}</div>
            <div class="budget-meta"><i class="fa-solid fa-calendar" style="margin-right:4px"></i>Due: ${fmtDate(b.deadline)}</div>
          </div>
          ${statusBadge}
        </div>

        <div class="budget-amounts">
          <div>
            <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:2px">Current Balance</div>
            <div class="budget-current">${fmt(b.currentBalance)}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:2px">Goal Target</div>
            <div class="budget-target">${fmt(b.targetAmount)}</div>
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <span style="font-size:0.72rem;color:var(--text-muted)">Progress</span>
          <span class="budget-pct">${pct}%</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width:${pct}%;background:${b.isAchieved ? 'var(--success)' : b.isExpired ? 'var(--warning)' : ''}"></div>
        </div>

        <div class="budget-deadline">
          <i class="fa-solid fa-${b.isAchieved ? 'check-circle' : b.isExpired ? 'triangle-exclamation' : 'hourglass-half'}"
             style="color:${b.isAchieved ? 'var(--success)' : b.isExpired ? 'var(--warning)' : 'var(--info)'}"></i>
          ${daysLabel}
        </div>

        <div class="budget-actions">
          <button class="btn btn-outline btn-sm" style="flex:1" onclick="editBudget('${b._id}')">
            <i class="fa-solid fa-pen"></i> Edit
          </button>
          <button class="btn btn-danger btn-sm" onclick="deleteBudget('${b._id}')">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// ── Alerts / Popups ───────────────────────────────────────────────────────────
function checkAlerts() {
  budgets.forEach(b => {
    const key = b._id;
    if (alreadyAlerted.has(key)) return;

    if (b.isAchieved) {
      alreadyAlerted.add(key);
      setTimeout(() => showPopup(
        '🎉',
        'Congratulations!',
        `Your budget goal "<strong>${b.name}</strong>" is achieved! Your current balance of ${fmt(b.currentBalance)} meets the target of ${fmt(b.targetAmount)}.`,
        'popup-achieved'
      ), 600);
    } else if (b.isExpired) {
      alreadyAlerted.add(key);
      setTimeout(() => showPopup(
        '⚠️',
        'Deadline Missed',
        `Budget goal "<strong>${b.name}</strong>" was not achieved within the expected date. Balance: ${fmt(b.currentBalance)} / Target: ${fmt(b.targetAmount)}.`,
        'popup-expired'
      ), 800);
    }
  });
}

function showPopup(emoji, title, msg, cls) {
  const popup = document.getElementById('budgetPopup');
  const box   = document.getElementById('popupBox');
  document.getElementById('popupEmoji').textContent = emoji;
  document.getElementById('popupTitle').textContent = title;
  document.getElementById('popupMsg').innerHTML = msg;
  box.className = `popup-box ${cls}`;
  popup.classList.add('active');
}

// ── Edit / Delete ─────────────────────────────────────────────────────────────
function editBudget(id) {
  const b = budgets.find(x => x._id === id);
  if (b) openModal(b);
}

async function deleteBudget(id) {
  if (!confirm('Delete this budget goal?')) return;
  const res = await api.delete(`/api/budgets/${id}`);
  if (res.success) {
    showToast('Deleted', 'Budget goal removed', 'success');
    loadBudgets();
  } else {
    showToast('Error', res.message, 'error');
  }
}

// ── Initial load ──────────────────────────────────────────────────────────────
loadBudgets();
