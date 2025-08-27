
// Minimal client-side rendering from static JSON
async function loadData() {
  try {
    const res = await fetch('data/creators.json');
    return await res.json();
  } catch (e) {
    console.error('Failed to load creators.json', e);
    return { creators: [], last_updated: '' };
  }
}
function fmt(n){ return (n||0).toLocaleString(); }

function renderCards(creators){
  const list = document.getElementById('creator-list');
  if (!list) return;
  list.innerHTML = creators.map(c => `
    <div class="card">
      <h4><a href="creator/?id=${encodeURIComponent(c.creator_id)}">${c.display_name}</a></h4>
      <div class="muted">${fmt(c.subs_total)} subs · avg ${fmt(c.avg_views)} views</div>
      <div class="chips">${(c.destinations||[]).slice(0,6).map(d=>`<span class="chip">${d}</span>`).join(' ')}</div>
      <p><a class="btn" href="${c.channel_url}" target="_blank" rel="noopener">Open Channel</a></p>
    </div>
  `).join('');
}

function renderRecentVideos(creators){
  const box = document.getElementById('recent-videos');
  if (!box) return;
  const vids = [];
  creators.forEach(c => (c.recent_videos||[]).forEach(v => vids.push({...v, display_name:c.display_name})));
  vids.sort((a,b)=> (b.views||0)-(a.views||0));
  box.innerHTML = vids.slice(0,6).map(v => `
    <div class="card">
      <h4><a href="${v.url}" target="_blank" rel="noopener">${v.title}</a></h4>
      <div class="muted">${v.display_name} — ${fmt(v.views)} views — ${v.published_at}</div>
    </div>
  `).join('');
}

async function renderHome(){
  const data = await loadData();
  const creators = data.creators.slice().sort((a,b)=>(b.subs_total||0)-(a.subs_total||0));
  const lu = document.getElementById('last-updated');
  if (lu) lu.textContent = data.last_updated || '—';
  renderCards(creators);
  renderRecentVideos(creators);
}

async function renderCreators(){
  const data = await loadData();
  const creators = data.creators.slice().sort((a,b)=>(b.subs_total||0)-(a.subs_total||0));
  // Add a filter input if not present
  let input = document.getElementById('creator-filter');
  if (!input) {
    input = document.createElement('input');
    input.id = 'creator-filter';
    input.placeholder = 'Filter creators…';
    input.className = 'input';
    const h2 = document.querySelector('h2');
    if (h2) h2.insertAdjacentElement('afterend', input);
  }
  function doFilter(){
    const t = input.value.toLowerCase();
    const filtered = creators.filter(c =>
      (c.display_name||'').toLowerCase().includes(t) ||
      (c.destinations||[]).join(',').toLowerCase().includes(t)
    );
    renderCards(filtered);
  }
  input.addEventListener('input', doFilter);
  renderCards(creators);
}

async function renderCreatorDetail(){
  const data = await loadData();
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  const c = data.creators.find(x => x.creator_id === id) || data.creators[0];
  const box = document.getElementById('creator-detail');
  if (!box || !c) return;
  box.innerHTML = `
    <div class="card">
      <h2>${c.display_name}</h2>
      <div class="muted">${fmt(c.subs_total)} subscribers · avg ${fmt(c.avg_views)} views</div>
      <p><a class="btn" href="${c.channel_url}" target="_blank" rel="noopener">Open YouTube Channel</a></p>
      <h3>Destinations</h3>
      <p>${(c.destinations||[]).map(d=>`<span class="chip">${d}</span>`).join(' ')}</p>
      <h3>Recent Videos</h3>
      <ul>${(c.recent_videos||[]).map(v=>`
        <li><a href="${v.url}" target="_blank" rel="noopener">${v.title}</a> — ${fmt(v.views)} views (${v.published_at})</li>
      `).join('')}</ul>
    </div>
  `;
}

// Router
document.addEventListener('DOMContentLoaded', () => {
  const path = location.pathname;
  if (path.endsWith('/creators/') || path.endsWith('/creators')) return renderCreators();
  if (path.includes('/creator/')) return renderCreatorDetail();
  return renderHome();
});
