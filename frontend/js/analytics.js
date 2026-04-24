/**
 * analytics.js — Analytics page logic
 * Pie chart + Bar chart using Chart.js, category breakdown table, period filtering
 */

// ── Chart.js global defaults (dark theme) ─────────────────────────────────────
Chart.defaults.color = '#C4A8C6';
Chart.defaults.borderColor = 'rgba(192,132,188,0.1)';
Chart.defaults.font.family = "'Inter', sans-serif";

// ── Category colors ────────────────────────────────────────────────────────────
const CAT_COLORS = {
  Salary:'#4CAF82', Freelance:'#60A5FA', Investment:'#F4C55F', Gift:'#C084BC', 'Other Income':'#A78BFA',
  Food:'#E05C6A', House:'#F59E0B', Electricity:'#FCD34D', Shopping:'#FB923C',
  Transport:'#34D399', Healthcare:'#22D3EE', Education:'#818CF8',
  Entertainment:'#F472B6', Travel:'#A3E635', 'Other Expense':'#94A3B8',
};

let pieChart = null;
let barChart = null;
let allTx    = [];
let currentPeriod = 'all';

initSidebar('analytics');

// ── Period filtering ──────────────────────────────────────────────────────────
document.querySelectorAll('.period-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.period-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentPeriod = btn.dataset.period;
    renderCharts(filterByPeriod(allTx));
  });
});

function filterByPeriod(data) {
  const now = new Date();
  if (currentPeriod === 'month') {
    return data.filter(t => {
      const d = new Date(t.date);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
  }
  if (currentPeriod === 'week') {
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    return data.filter(t => new Date(t.date) >= weekAgo);
  }
  return data;
}

// ── Load data ─────────────────────────────────────────────────────────────────
async function loadAnalytics() {
  const res = await api.get('/api/transactions');
  if (!res.success) { showToast('Error', res.message, 'error'); return; }
  allTx = res.data;
  renderCharts(filterByPeriod(allTx));
}

function fmt(n) { return '₹' + parseFloat(n).toLocaleString('en-IN', { minimumFractionDigits: 2 }); }

// ── Render everything ─────────────────────────────────────────────────────────
function renderCharts(data) {
  // Summary stats
  let totalIncome = 0, totalExpense = 0;
  data.forEach(t => {
    if (t.type === 'income') totalIncome += t.amount;
    else totalExpense += t.amount;
  });
  document.getElementById('aStatIncome').textContent  = fmt(totalIncome);
  document.getElementById('aStatExpense').textContent = fmt(totalExpense);
  document.getElementById('aStatBalance').textContent = fmt(totalIncome - totalExpense);

  // Category aggregation for expenses
  const expCats = {};
  data.filter(t => t.type === 'expense').forEach(t => {
    expCats[t.category] = (expCats[t.category] || 0) + t.amount;
  });
  const incCats = {};
  data.filter(t => t.type === 'income').forEach(t => {
    incCats[t.category] = (incCats[t.category] || 0) + t.amount;
  });

  renderPie(expCats, totalExpense);
  renderBar(incCats, expCats);
  renderTable(data, totalExpense, totalIncome);
}

// ── Pie Chart ─────────────────────────────────────────────────────────────────
function renderPie(expCats, total) {
  const labels  = Object.keys(expCats);
  const values  = Object.values(expCats);
  const colors  = labels.map(l => CAT_COLORS[l] || '#666');

  // Legend
  const legend = document.getElementById('pieLegend');
  if (!labels.length) {
    legend.innerHTML = '<div style="color:var(--text-muted);font-size:0.82rem;text-align:center;grid-column:1/-1">No expense data for this period</div>';
  } else {
    legend.innerHTML = labels.map((l,i) => `
      <div class="legend-item">
        <span class="legend-dot" style="background:${colors[i]}"></span>
        <span>${l}</span>
        <span style="margin-left:auto;font-weight:600;color:var(--text-primary)">${fmt(values[i])}</span>
      </div>
    `).join('');
  }

  const ctx = document.getElementById('pieChart').getContext('2d');
  if (pieChart) pieChart.destroy();

  if (!labels.length) return;

  pieChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors.map(c => c + 'CC'),
        borderColor:     colors,
        borderWidth: 2,
        hoverOffset: 16,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      animation: { animateRotate: true, duration: 900 },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${fmt(ctx.raw)} (${((ctx.raw/total)*100).toFixed(1)}%)`,
          },
          backgroundColor: '#1E1020',
          borderColor: 'rgba(192,132,188,0.3)',
          borderWidth: 1,
          padding: 12,
          titleFont: { size: 12 },
          bodyFont: { size: 12 },
        },
      },
    }
  });
}

// ── Bar Chart ─────────────────────────────────────────────────────────────────
function renderBar(incCats, expCats) {
  const allCats = [...new Set([...Object.keys(incCats), ...Object.keys(expCats)])];

  const ctx = document.getElementById('barChart').getContext('2d');
  if (barChart) barChart.destroy();

  if (!allCats.length) return;

  barChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: allCats,
      datasets: [
        {
          label: 'Income',
          data: allCats.map(c => incCats[c] || 0),
          backgroundColor: 'rgba(76,175,130,0.7)',
          borderColor: '#4CAF82',
          borderWidth: 1.5,
          borderRadius: 6,
        },
        {
          label: 'Expense',
          data: allCats.map(c => expCats[c] || 0),
          backgroundColor: 'rgba(224,92,106,0.7)',
          borderColor: '#E05C6A',
          borderWidth: 1.5,
          borderRadius: 6,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 800 },
      scales: {
        x: {
          ticks: { color: '#8A6A8C', font: { size: 10 }, maxRotation: 45 },
          grid: { color: 'rgba(192,132,188,0.06)' },
        },
        y: {
          ticks: {
            color: '#8A6A8C',
            callback: v => '₹' + v.toLocaleString('en-IN'),
          },
          grid: { color: 'rgba(192,132,188,0.06)' },
        }
      },
      plugins: {
        legend: {
          labels: { color: '#C4A8C6', boxWidth: 12, padding: 16 }
        },
        tooltip: {
          callbacks: { label: ctx => ` ${ctx.dataset.label}: ${fmt(ctx.raw)}` },
          backgroundColor: '#1E1020',
          borderColor: 'rgba(192,132,188,0.3)',
          borderWidth: 1,
          padding: 12,
        }
      }
    }
  });
}

// ── Category breakdown table ───────────────────────────────────────────────────
function renderTable(data, totalExp, totalInc) {
  const tbody = document.getElementById('catTableBody');
  const rows = {};
  data.forEach(t => {
    const key = `${t.category}|${t.type}`;
    if (!rows[key]) rows[key] = { category: t.category, type: t.type, total: 0 };
    rows[key].total += t.amount;
  });
  const sorted = Object.values(rows).sort((a,b) => b.total - a.total);
  if (!sorted.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="fa-solid fa-chart-pie"></i><p>No transactions in this period</p></div></td></tr>`;
    return;
  }
  const grandTotal = totalExp + totalInc || 1;
  tbody.innerHTML = sorted.map(r => {
    const pct = ((r.total / grandTotal) * 100).toFixed(1);
    return `
      <tr class="anim-fadeIn">
        <td>
          <span style="display:inline-flex;align-items:center;gap:8px">
            <span class="cat-dot" style="background:${CAT_COLORS[r.category]||'#888'}"></span>
            <span style="font-weight:500">${r.category}</span>
          </span>
        </td>
        <td><span class="badge badge-${r.type}">${r.type}</span></td>
        <td style="font-weight:700;color:${r.type==='income'?'var(--success)':'var(--danger)'}">${fmt(r.total)}</td>
        <td style="color:var(--text-muted)">${pct}%</td>
        <td style="min-width:120px">
          <div class="progress-track">
            <div class="progress-fill" style="width:${pct}%;background:${CAT_COLORS[r.category]||'var(--accent)'}"></div>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

loadAnalytics();
