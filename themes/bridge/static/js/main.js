// ---------- Data loading ----------
async function loadData() {
  const res = await fetch('data/creators.json'); // relative to <base>
  return await res.json();
}
const fmt = n => (n ?? 0).toLocaleString();
const pct = x => (x == null ? '—' : `${(x * 100).toFixed(1)}%`);
const isoToYmd = s => (s ? String(s).slice(0, 10) : '—');

// Normalize incoming JSON so UI code is robust
function normalizeCreators(raw) {
  return (raw || []).map(c => ({
    creator_id: c.creator_id,
    display_name: c.display_name || '—',
    channel_url: c.channel_url || '#',
    subs_total: Number(c.subs_total ?? 0),

    // Expect growth_30d as percent (e.g., 8.2 for +8.2%). If you store 0.082, switch below.
    growth_30d: (c.growth_30d == null ? null : Number(c.growth_30d)), // %
    // If you store fraction: growth_30d: c.growth_30d == null ? null : Number(c.growth_30d * 100),

    avg_views: Number(c.avg_views ?? 0),

    // engagement_rate as fraction (0..1) preferred. If you already store % (e.g., 4.3), divide by 100 here.
    engagement_rate: (c.engagement_rate == null ? null : Number(c.engagement_rate)), // fraction

    uploads_30d: Number(c.uploads_30d ?? 0),
    last_upload: c.last_upload || null
  }));
}

// ---------- Home: table ----------
function growthCell(c) {
  if (c.growth_30d == null) return '—';
  const v = Number(c.growth_30d);
  const cls = v >= 0 ? 'growth-up' : 'growth-down';
  const arrow = v >= 0 ? '▲' : '▼';
  return `<span class="${cls}">${arrow} ${Math.abs(v).toFixed(1)}%</span>`;
}
function rateCell(c) {
  if (c.engagement_rate == null) return '—';
  // c.engagement_rate expected as fraction (0..1)
  return `${(c.engagement_rate * 100).toFixed(1)}%`;
}

function renderTableRows(creators) {
  const tbody = document.querySelector('#creators-table tbody');
  if (!tbody) return;
  tbody.innerHTML = creators.map(c => `
    <tr>
      <td class="left"><a href="creator/?id=${encodeURIComponent(c.creator_id)}">${c.display_name}</a></td>
      <td class="right">${fmt(c.subs_total)}</td>
      <td class="right">${growthCell(c)}</td>
      <td class="right">${fmt(c.avg_views)}</td>
      <td class="right">${rateCell(c)}</td>
      <td class="right">${fmt(c.uploads_30d)}</td>
      <td class="left">${isoToYmd(c.last_upload)}</td>
      <td class="left"><a class="link" href="${c.channel_url}" target="_blank" rel="noopener">Open</a></td>
    </tr>
  `).join('');
}

function makeSortable(creators) {
  const thead = document.querySelector('#creators-table thead');
  let state = { key: 'subs_total', dir: 'desc' };

  function toComparable(v, key) {
    if (key === 'display_name' || key === 'last_upload') return String(v ?? '').toLowerCase();
    if (key === 'growth_30d' || key === 'engagement_rate') return Number(v ?? 0);
    return Number(v ?? 0);
  }

  function sortData() {
    const { key, dir } = state;
    const sorted = creators.slice().sort((a,b) => {
      const av = toComparable(a[key], key);
      const bv = toComparable(b[key], key);
      if (av < bv) return dir === 'asc' ? -1 : 1;
      if (av > bv) return dir === 'asc' ? 1 : -1;
      return 0;
    });
    renderTableRows(sorted);
    thead.querySelectorAll('th').forEach(th => th.classList.remove('sort-asc','sort-desc'));
    const active = thead.querySelector(`th[data-key="${key}"]`);
    if (active) active.classList.add(dir === 'asc' ? 'sort-asc' : 'sort-desc');
  }

  thead.addEventListener('click', e => {
    const th = e.target.closest('th[data-key]');
    if (!th) return;
    const k = th.getAttribute('data-key');
    state.dir = (state.key === k && state.dir === 'asc') ? 'desc' : 'asc';
    state.key = k;
    sortData();
  });

  sortData();
}

function wireFilter(creators) {
  const input = document.getElementById('creator-filter');
  if (!input) return;
  input.addEventListener('input', () => {
    const t = input.value.toLowerCase();
    const filtered = creators.filter(c => c.display_name.toLowerCase().includes(t));
    renderTableRows(filtered);
  });
}

// ---------- Creator detail (kept working) ----------
function renderCreatorDetail(c) {
  const box = document.getElementById('creator-detail');
  if (!box) return;
  box.innerHTML = `
    <div class="card">
      <h2>${c.display_name}</h2>
      <div class="muted">${fmt(c.subs_total)} subscribers · avg ${fmt(c.avg_views)} views · ${(c.engagement_rate!=null)?(c.engagement_rate*100).toFixed(1)+'% ER':'— ER'}</div>
      <p><a class="btn" href="${c.channel_url}" target="_blank" rel="noopener">Open YouTube Channel</a></p>
    </div>
  `;
}

// ---------- Router ----------
document.addEventListener('DOMContentLoaded', async () => {
  const data = await loadData();
  if (document.getElementById('last-updated')) {
    document.getElementById('last-updated').textContent = data.last_updated || '—';
  }
  const creators = normalizeCreators(data.creators || []);

  const path = location.pathname;
  if (path.includes('/creators/')) {
    // (Optional) could render a card view here
    renderTableRows(creators);
    makeSortable(creators);
    wireFilter(creators);
    return;
  }
  if (path.includes('/creator/')) {
    const id = new URLSearchParams(location.search).get('id');
    const c = creators.find(x => x.creator_id === id) || creators[0];
    if (c) renderCreatorDetail(c);
    return;
  }
  // Home: table view
  renderTableRows(creators);
  makeSortable(creators);
  wireFilter(creators);
});
