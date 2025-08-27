/* =======================
   Data loading & helpers
   ======================= */
async function loadData() {
  const res = await fetch('data/creators.json'); // relative to <base>
  return await res.json();
}
const fmt = n => (n ?? 0).toLocaleString();
const isoToYmd = s => (s ? String(s).slice(0, 10) : '—');

function normalizeCreators(raw) {
  return (raw || []).map(c => ({
    creator_id: c.creator_id,
    display_name: c.display_name || '—',
    channel_url: c.channel_url || '#',
    subs_total: Number(c.subs_total ?? 0),

    // home metrics
    growth_30d: (c.growth_30d == null ? null : Number(c.growth_30d)), // percent (e.g., 6.8)
    avg_views: Number(c.avg_views ?? 0),
    engagement_rate: (c.engagement_rate == null ? null : Number(c.engagement_rate)), // fraction 0..1
    uploads_30d: Number(c.uploads_30d ?? 0),
    last_upload: c.last_upload || null,

    // creator page metrics
    channel_created: c.channel_created || null, // ISO date
    total_uploads: (c.total_uploads == null ? null : Number(c.total_uploads)),
    views_30d: (c.views_30d == null ? null : Number(c.views_30d)),
    views_90d: (c.views_90d == null ? null : Number(c.views_90d)),
    views_365d: (c.views_365d == null ? null : Number(c.views_365d)),
    velocity_7d: (c.velocity_7d == null ? null : Number(c.velocity_7d)),
    shorts_ratio_90d: (c.shorts_ratio_90d == null ? null : Number(c.shorts_ratio_90d)), // 0..1

    top5_recent: (c.top5_recent || []).map(v => ({
      title: v.title || '—',
      url: v.url || '#',
      published_at: v.published_at || null,
      views: Number(v.views ?? 0)
    })),
    top5_alltime: (c.top5_alltime || []).map(v => ({
      title: v.title || '—',
      url: v.url || '#',
      published_at: v.published_at || null,
      views: Number(v.views ?? 0)
    })),

    recent_videos: (c.recent_videos || []).map(v => ({
      title: v.title || '—',
      url: v.url || '#',
      published_at: v.published_at || null,
      views: Number(v.views ?? 0),
      likes: Number(v.likes ?? 0),
      comments: Number(v.comments ?? 0),
      is_short: !!v.is_short
    }))
  }));
}

/* =======================
   Tooltips (for ℹ️ icons)
   ======================= */
function setupTooltips(scope = document) {
  scope.querySelectorAll('.info').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      document.querySelectorAll('.tooltip').forEach(t => t.remove());
      const tip = document.createElement('div');
      tip.className = 'tooltip';
      tip.textContent = el.dataset.info || '';
      el.appendChild(tip);
    });
  });
  document.body.addEventListener('click', () => {
    document.querySelectorAll('.tooltip').forEach(t => t.remove());
  });
}

/* =======================
   Home: Excel-style table
   ======================= */
function growthCell(c) {
  if (c.growth_30d == null) return '—';
  const v = Number(c.growth_30d);
  const cls = v >= 0 ? 'growth-up' : 'growth-down';
  const arrow = v >= 0 ? '▲' : '▼';
  return `<span class="${cls}">${arrow} ${Math.abs(v).toFixed(1)}%</span>`;
}
function rateCell(c) {
  if (c.engagement_rate == null) return '—';
  return `${(c.engagement_rate * 100).toFixed(1)}%`;
}

function renderHomeRows(creators) {
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

function makeSortable(dataArray, tableSelector, defaultKey = 'subs_total', defaultDir = 'desc', renderer) {
  const table = document.querySelector(tableSelector);
  const thead = table?.querySelector('thead');
  if (!thead) return;
  let state = { key: defaultKey, dir: defaultDir };

  function toComparable(v, key) {
    if (['display_name','last_upload','title','published_at'].includes(key)) return String(v ?? '').toLowerCase();
    return Number(v ?? 0);
  }

  function sortData() {
    const { key, dir } = state;
    const sorted = dataArray.slice().sort((a,b) => {
      const av = toComparable(a[key], key);
      const bv = toComparable(b[key], key);
      if (av < bv) return dir === 'asc' ? -1 : 1;
      if (av > bv) return dir === 'asc' ? 1 : -1;
      return 0;
    });
    renderer(sorted);
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

function wireHomeFilter(creators) {
  const input = document.getElementById('creator-filter');
  if (!input) return;
  input.addEventListener('input', () => {
    const t = input.value.toLowerCase();
    const filtered = creators.filter(c => c.display_name.toLowerCase().includes(t));
    renderHomeRows(filtered);
  });
}

/* =======================
   Creator page
   ======================= */
function renderCreatorHeader(c) {
  const hero = document.getElementById('creator-hero');
  if (!hero) return;
  hero.innerHTML = `
    <div class="hero-head">
      <h2>${c.display_name}</h2>
      <a class="btn" href="${c.channel_url}" target="_blank" rel="noopener">Open Channel</a>
    </div>
  `;
}
function metric(label, value) {
  return `
    <div class="metric">
      <div class="metric-label">${label}</div>
      <div class="metric-value">${value ?? '—'}</div>
    </div>
  `;
}
function renderCreatorMetrics(c) {
  const basic = document.getElementById('metrics-basic');
  const perf  = document.getElementById('metrics-performance');
  if (!basic || !perf) return;

  // BASIC: creation date, total uploads, uploads in 30d, last upload
  basic.innerHTML = [
    metric('Created', isoToYmd(c.channel_created)),
    metric('Total uploads', c.total_uploads==null ? '—' : fmt(c.total_uploads)),
    metric('Uploads (30d)', fmt(c.uploads_30d)),
    metric('Last upload', isoToYmd(c.last_upload)),
  ].join('');

  // PERFORMANCE: subs, growth, avg views, ER, views (30/90/365), velocity, Shorts %
  const growth = c.growth_30d == null ? '—'
    : `<span class="${c.growth_30d>=0?'growth-up':'growth-down'}">${c.growth_30d>=0?'▲':'▼'} ${Math.abs(c.growth_30d).toFixed(1)}%</span>`;
  const er = c.engagement_rate == null ? '—' : `${(c.engagement_rate*100).toFixed(1)}%`;
  const shorts = c.shorts_ratio_90d == null ? '—' : `${Math.round(c.shorts_ratio_90d*100)}%`;
  const viewsCombo = [c.views_30d, c.views_90d, c.views_365d].map(v => v==null ? '—' : fmt(v)).join(' / ');

  perf.innerHTML = [
    metric('Subscribers', fmt(c.subs_total)),
    metric('Growth (30d)', growth),
    metric('Avg views (10)', fmt(c.avg_views)),
    metric('ER', er),
    metric('Views 30/90/365d', viewsCombo),
    metric('7-day velocity', c.velocity_7d==null ? '—' : fmt(c.velocity_7d)),
    metric('Shorts % (90d)', shorts),
  ].join('');
}

function renderVideoRows(videos) {
  const tbody = document.querySelector('#videos-table tbody');
  if (!tbody) return;
  if (!videos || videos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="left muted">No recent videos found.</td></tr>`;
    return;
  }
  tbody.innerHTML = videos.map(v => `
    <tr>
      <td class="left">${v.title}</td>
      <td class="left">${isoToYmd(v.published_at)}</td>
      <td class="right">${fmt(v.views)}</td>
      <td class="right">${v.likes ? fmt(v.likes) : '—'}</td>
      <td class="right">${v.comments ? fmt(v.comments) : '—'}</td>
      <td class="left">${v.is_short ? 'Yes' : 'No'}</td>
      <td class="left"><a class="link" href="${v.url}" target="_blank" rel="noopener">Watch</a></td>
    </tr>
  `).join('');
}

function renderTop5Rows(list, targetId) {
  const tbody = document.getElementById(targetId);
  if (!tbody) return;
  if (!list || !list.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="left muted">No data.</td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(v => `
    <tr>
      <td class="left">${v.title}</td>
      <td class="left">${isoToYmd(v.published_at)}</td>
      <td class="right">${fmt(v.views)}</td>
      <td class="left"><a class="link" href="${v.url}" target="_blank" rel="noopener">Watch</a></td>
    </tr>
  `).join('');
}

/* =======================
   Router
   ======================= */
document.addEventListener('DOMContentLoaded', async () => {
  setupTooltips();

  const data = await loadData();
  if (document.getElementById('last-updated')) {
    document.getElementById('last-updated').textContent = data.last_updated || '—';
  }
  const creators = normalizeCreators(data.creators || []);
  const path = location.pathname;

  // Creator detail page
  if (path.includes('/creator/')) {
    const id = new URLSearchParams(location.search).get('id');
    const c = creators.find(x => x.creator_id === id) || creators[0];
    if (!c) return;

    renderCreatorHeader(c);
    renderCreatorMetrics(c);

    // Recent videos first (new order)
    const vids = (c.recent_videos || [])
      .slice()
      .sort((a,b) => String(b.published_at).localeCompare(String(a.published_at)))
      .slice(0, 20);
    renderVideoRows(vids);
    makeSortable(vids, '#videos-table', 'published_at', 'desc', rows => renderVideoRows(rows));

    // Then top videos (recent & all-time)
    renderTop5Rows(c.top5_recent || [], 'top5-recent');
    renderTop5Rows(c.top5_alltime || [], 'top5-alltime');
    return;
  }

  // Home (table)
  if (!path.includes('/creators/')) {
    renderHomeRows(creators);
    makeSortable(creators, '#creators-table', 'subs_total', 'desc', rows => renderHomeRows(rows));
    wireHomeFilter(creators);
    return;
  }

  // Creators directory (fallback = same table)
  renderHomeRows(creators);
  makeSortable(creators, '#creators-table', 'subs_total', 'desc', rows => renderHomeRows(rows));
  wireHomeFilter(creators);
});
