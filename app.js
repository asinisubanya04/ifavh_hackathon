
'use strict';

//supabase init
const { createClient } = supabase;

const db = createClient(
  'https://gvhamvrocyxtjtcegjbw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2aGFtdnJvY3l4dGp0Y2VnamJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0NjMyOTUsImV4cCI6MjA4OTAzOTI5NX0.4ToHpDI3bJdW4F2BCZLPocHD-OhK9z4gswSCBwAHcVU'
);

/**
 * returns the Anthropic API key
 * @returns {string}
 */
const getKey = () => document.getElementById('apiKey').value.trim();

/**
 * a toast notification at the bottom right
 * @param {string} msg   
 * @param {boolean} ok   - green border if true, default if false
 */
function toast(msg, ok = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show';
  t.style.borderColor = ok ? 'rgba(52,211,153,.5)' : 'var(--border2)';
  setTimeout(() => { t.className = 'toast'; }, 3200);
}

/**
 * open a modal overlay by ID
 * @param {string} id
 */
function openModal(id) {
  document.getElementById(id).style.display = 'flex';
}

/**
 * closes a modal overlay by ID
 * @param {string} id
 */
function closeModal(id) {
  document.getElementById(id).style.display = 'none';
}

/**
 * CSS class for a score ring based on value
 * @param {number} s - 0-100 score
 * @returns {string}
 */
function sClass(s) {
  return s >= 70 ? 'score-high' : s >= 50 ? 'score-mid' : 'score-low';
}

/**
 *  a CSS color variable string for a given score
 * @param {number} s
 * @returns {string}
 */
function sColor(s) {
  return s >= 70 ? 'var(--green)' : s >= 50 ? 'var(--amber)' : 'var(--red)';
}

/**
 * a badge class for investor readiness status
 * @param {string} r - 'ready' / 'needs work' /'not ready'
 * @returns {string}
 */
function rBadge(r) {
  return r === 'ready' ? 'badge-green' : r === 'needs work' ? 'badge-amber' : 'badge-red';
}

const AVATAR_COLORS = ['#7c6dfa', '#34d399', '#60a5fa', '#fbbf24', '#f87171', '#a78bfa'];

/**
 * @param {string} name
 * @returns {string} 
 */
const aColor = (name) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

/**
 * @param {string} name
 * @returns {string}
 */
const aInit = (name) => name.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase();

// navigation

/**
 * @param {HTMLElement} el   
 * @param {string}      page - dashboard | startups | investors | events | network
 */
function navigate(el, page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  el.classList.add('active');

  const loaders = {
    dashboard: loadDashboard,
    startups:  loadStartups,
    investors: loadInvestors,
    events:    loadEvents,
    network:   loadNetwork
  };
  loaders[page]?.();
}

// dashboard

/**
 * loads all dashboard data
 */
async function loadDashboard() {
  const [r1, r2, r3, r4, r5] = await Promise.all([
    db.from('startups').select('*', { count: 'exact', head: true }),
    db.from('investors').select('*', { count: 'exact', head: true }),
    db.from('connections').select('*', { count: 'exact', head: true }),
    db.from('startups').select('id,name,sector,stage,ai_score')
      .not('ai_score', 'is', null)
      .order('ai_score', { ascending: false })
      .limit(3),
    db.from('events').select('*')
      .order('event_date', { ascending: true })
      .limit(3)
  ]);

  document.getElementById('stat-startups').textContent   = r1.count ?? 0;
  document.getElementById('stat-investors').textContent  = r2.count ?? 0;
  document.getElementById('stat-connections').textContent = r3.count ?? 0;

  // top startups leaderboard
  const top = r4.data || [];
  document.getElementById('top-startups').innerHTML = top.length
    ? top.map((s, i) => `
        <div style="display:flex;align-items:center;gap:12px;padding:10px 0;
          ${i < top.length - 1 ? 'border-bottom:1px solid var(--border)' : ''}">
          <div style="font-size:16px;color:var(--muted);width:20px;text-align:center">${i + 1}</div>
          <div style="flex:1">
            <div style="font-size:14px;font-weight:500">${s.name}</div>
            <div style="font-size:12px;color:var(--muted)">${s.sector || ''} · ${s.stage || ''}</div>
          </div>
          <div style="font-size:20px;font-weight:600;color:${sColor(s.ai_score)}">${s.ai_score}</div>
        </div>`).join('')
    : '<div class="empty"><div class="empty-text">Evaluate startups to see rankings</div></div>';

  // upcoming events list
  const evs = r5.data || [];
  document.getElementById('upcoming-events').innerHTML = evs.length
    ? evs.map(ev => `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
          <div style="font-size:12px;color:var(--accent2);font-family:'DM Mono',monospace;min-width:52px">
            ${new Date(ev.event_date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
          </div>
          <div style="flex:1;font-size:14px">${ev.title}</div>
          <span class="badge badge-blue">${ev.event_type}</span>
        </div>`).join('')
    : '<div class="empty"><div class="empty-text">No upcoming events</div></div>';
}

// startups

/**
 * fetches all startups from supabase and renders them as cards
 */
async function loadStartups() {
  const { data, error } = await db.from('startups').select('*').order('created_at', { ascending: false });
  const el = document.getElementById('startups-list');

  if (error || !data?.length) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">◎</div><div class="empty-text">No startups yet. Add the first one!</div></div>';
    return;
  }

  el.innerHTML = data.map(s => {
    const sc = s.ai_score;
    const ring = (sc !== null && sc !== undefined)
      ? `<div class="score-ring ${sClass(sc)}" style="width:54px;height:54px;font-size:17px">${sc}</div>`
      : `<div class="score-ring score-na" style="width:54px;height:54px;font-size:11px">N/A</div>`;

    return `
    <div class="card">
      <div style="display:flex;align-items:flex-start;gap:16px">
        ${ring}
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">
            <span style="font-size:16px;font-weight:500">${s.name}</span>
            ${s.sector ? `<span class="badge badge-purple">${s.sector}</span>` : ''}
            ${s.stage  ? `<span class="badge badge-blue">${s.stage}</span>` : ''}
            ${s.investor_readiness ? `<span class="badge ${rBadge(s.investor_readiness)}">${s.investor_readiness}</span>` : ''}
          </div>
          <div style="font-size:13px;color:var(--muted);margin-bottom:6px;line-height:1.5">
            ${s.tagline || (s.description || '').slice(0, 100)}
          </div>
          ${s.traction   ? `<div style="font-size:12px;color:var(--green)">◎ ${s.traction}</div>` : ''}
          ${s.funding_ask ? `<div style="font-size:12px;color:var(--muted);margin-top:2px">Raising: $${Number(s.funding_ask).toLocaleString()}</div>` : ''}
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
          <button class="btn btn-secondary btn-sm" onclick="editStartup('${s.id}')">Edit</button>
          <button class="btn btn-secondary btn-sm" onclick="matchInvestors('${s.id}','${s.name.replace(/'/g, "\\'").replace(/"/g, '\\"')}')">AI Match ✦</button>
          <button class="btn btn-danger btn-sm" onclick="deleteStartup('${s.id}')">Delete</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

/**
 * @param {Object|null} s 
 */
function openStartupModal(s = null) {
  document.getElementById('sm-title').textContent   = s ? 'Edit Startup' : 'New Startup';
  document.getElementById('s-id').value             = s?.id || '';
  document.getElementById('s-name').value           = s?.name || '';
  document.getElementById('s-sector').value         = s?.sector || '';
  document.getElementById('s-stage').value          = s?.stage || 'Idea';
  document.getElementById('s-team').value           = s?.team_size || '';
  document.getElementById('s-tagline').value        = s?.tagline || '';
  document.getElementById('s-desc').value           = s?.description || '';
  document.getElementById('s-traction').value       = s?.traction || '';
  document.getElementById('s-ask').value            = s?.funding_ask || '';
  document.getElementById('s-ai-result').innerHTML  = '';
  openModal('startup-modal');
}

/**
 * fetches a startup by ID and opens the edit modal
 * @param {string} id
 */
async function editStartup(id) {
  const { data } = await db.from('startups').select('*').eq('id', id).single();
  if (data) openStartupModal(data);
}

/**
 * deletes a startup and its evaluations from Supabase
 * @param {string} id
 */
async function deleteStartup(id) {
  if (!confirm('Delete this startup?')) return;
  await db.from('startups').delete().eq('id', id);
  loadStartups();
  loadDashboard();
  toast('Startup deleted');
}

/**
 * saves a startup, triggering AI evaluation if needed
 * @param {boolean} evaluate - If true, calls Claude API after saving
 */
async function saveStartup(evaluate = false) {
  const name   = document.getElementById('s-name').value.trim();
  const sector = document.getElementById('s-sector').value;
  const desc   = document.getElementById('s-desc').value.trim();

  if (!name || !sector) { toast('Name and sector are required'); return; }
  if (evaluate && !desc) { toast('Add a description for AI evaluation'); return; }
  if (evaluate && !getKey()) { toast('Paste your Anthropic API key in the sidebar'); return; }

  const payload = {
    name,
    sector,
    stage:       document.getElementById('s-stage').value,
    team_size:   parseInt(document.getElementById('s-team').value)   || null,
    tagline:     document.getElementById('s-tagline').value          || null,
    description: desc                                                 || null,
    traction:    document.getElementById('s-traction').value         || null,
    funding_ask: parseFloat(document.getElementById('s-ask').value)  || null
  };

  const editId = document.getElementById('s-id').value;
  let startup;

  if (editId) {
    const { data } = await db.from('startups').update(payload).eq('id', editId).select().single();
    startup = data;
  } else {
    const { data } = await db.from('startups').insert(payload).select().single();
    startup = data;
  }

  if (!startup) { toast('Database error — check Supabase config'); return; }

  if (!evaluate) {
    closeModal('startup-modal');
    loadStartups();
    loadDashboard();
    toast('Startup saved to Supabase!', true);
    return;
  }

  // ai evaluations
  const resultDiv = document.getElementById('s-ai-result');
  resultDiv.innerHTML = `<div class="ai-loading"><div class="spinner"></div>Claude is evaluating your startup...</div>`;

  try {
    const prompt = `You are a senior VC analyst. Evaluate this startup and return ONLY valid JSON with no extra text.

Startup:
- Name: ${startup.name}
- Sector: ${startup.sector}
- Stage: ${startup.stage}
- Team Size: ${startup.team_size}
- Description: ${startup.description}
- Traction: ${startup.traction}
- Funding Ask: $${startup.funding_ask}

Return EXACTLY this JSON structure:
{
  "overall_score": <integer 0-100>,
  "breakdown": {
    "problem_clarity":     {"score": <0-10>, "feedback": "<one sentence>"},
    "market_opportunity":  {"score": <0-10>, "feedback": "<one sentence>"},
    "solution_uniqueness": {"score": <0-10>, "feedback": "<one sentence>"},
    "team_strength":       {"score": <0-10>, "feedback": "<one sentence>"},
    "traction":            {"score": <0-10>, "feedback": "<one sentence>"}
  },
  "improvements": [
    {"priority": "high",   "suggestion": "<specific actionable advice>"},
    {"priority": "medium", "suggestion": "<specific actionable advice>"},
    {"priority": "low",    "suggestion": "<specific actionable advice>"}
  ],
  "investor_readiness": "<not ready|needs work|ready>",
  "verdict": "<one compelling sentence about this startup>"
}`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': getKey(),
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const raw = await res.json();
    if (raw.error) throw new Error(raw.error.message);

    let text = raw.content[0].text.trim();
    if (text.startsWith('```')) text = text.replace(/```json\n?|```/g, '').trim();
    const result = JSON.parse(text);

    await Promise.all([
      db.from('startups').update({
        ai_score:           result.overall_score,
        ai_feedback:        result,
        investor_readiness: result.investor_readiness
      }).eq('id', startup.id),

      db.from('ai_evaluations').insert({
        startup_id:     startup.id,
        overall_score:  result.overall_score,
        problem_score:  result.breakdown.problem_clarity.score,
        market_score:   result.breakdown.market_opportunity.score,
        solution_score: result.breakdown.solution_uniqueness.score,
        team_score:     result.breakdown.team_strength.score,
        traction_score: result.breakdown.traction.score,
        improvements:   result.improvements,
        verdict:        result.verdict
      })
    ]);

    const sc = result.overall_score;
    resultDiv.innerHTML = `
      <div class="ai-result">
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px">
          <div class="score-ring ${sClass(sc)}" style="width:76px;height:76px;font-size:24px">${sc}</div>
          <div>
            <div style="font-weight:600;font-size:16px;margin-bottom:6px">${startup.name}</div>
            <span class="badge ${rBadge(result.investor_readiness)}">${result.investor_readiness}</span>
            <div style="font-size:13px;color:var(--muted);margin-top:8px;line-height:1.5">${result.verdict}</div>
          </div>
        </div>
        <hr class="divider" style="margin:12px 0">
        ${Object.entries(result.breakdown).map(([k, v]) => `
          <div class="criteria-bar">
            <div class="criteria-name">${k.replace(/_/g, ' ')}</div>
            <div class="bar-track">
              <div class="bar-fill" style="width:${v.score * 10}%;background:${v.score >= 7 ? 'var(--green)' : v.score >= 5 ? 'var(--amber)' : 'var(--red)'}"></div>
            </div>
            <div class="bar-score" style="color:${v.score >= 7 ? 'var(--green)' : v.score >= 5 ? 'var(--amber)' : 'var(--red)'}">${v.score}</div>
          </div>
          <div style="font-size:12px;color:var(--muted);margin-bottom:10px;padding-left:150px;line-height:1.4">${v.feedback}</div>
        `).join('')}
        <hr class="divider" style="margin:12px 0">
        <div style="font-size:13px;font-weight:500;margin-bottom:10px">Suggested Improvements</div>
        ${result.improvements.map(imp => `
          <div class="improvement-item">
            <div class="imp-bar" style="background:${imp.priority === 'high' ? 'var(--red)' : imp.priority === 'medium' ? 'var(--amber)' : 'var(--green)'}"></div>
            <div>
              <span class="badge ${imp.priority === 'high' ? 'badge-red' : imp.priority === 'medium' ? 'badge-amber' : 'badge-green'}">${imp.priority}</span>
              <div style="font-size:13px;color:var(--muted);margin-top:5px;line-height:1.5">${imp.suggestion}</div>
            </div>
          </div>`).join('')}
      </div>`;

    loadStartups();
    loadDashboard();
    toast('Evaluation saved to Supabase! ✦', true);

  } catch (e) {
    resultDiv.innerHTML = `<div style="color:var(--red);font-size:13px;padding:12px;background:rgba(248,113,113,.08);border-radius:8px">Error: ${e.message}</div>`;
  }
}

// ai investor matching

/**
 * uses Claude to rank all investors by fit for a given startup
 * @param {string} sid   - Startup ID
 * @param {string} sname - Startup name 
 */
async function matchInvestors(sid, sname) {
  if (!getKey()) { toast('Add your Anthropic API key first'); return; }

  document.getElementById('mm-title').textContent = `AI Matches for ${sname}`;
  document.getElementById('match-results').innerHTML = `<div class="ai-loading"><div class="spinner"></div>Finding best investor matches...</div>`;
  openModal('match-modal');

  const [{ data: startup }, { data: investors }] = await Promise.all([
    db.from('startups').select('*').eq('id', sid).single(),
    db.from('investors').select('*')
  ]);

  if (!investors?.length) {
    document.getElementById('match-results').innerHTML = '<div class="empty"><div class="empty-text">Add some investors first!</div></div>';
    return;
  }

  try {
    const prompt = `Rank these investors by fit for this startup. Return ONLY JSON, no other text.

Startup: ${JSON.stringify({ name: startup.name, sector: startup.sector, stage: startup.stage, description: startup.description, traction: startup.traction })}

Investors: ${JSON.stringify(investors.map(i => ({ id: i.id, name: i.name, firm: i.firm, sectors: i.focus_sectors, stage: i.stage_preference, thesis: i.thesis })))}

Return:
{"matches":[{"investor_id":"<id>","match_score":<0-100>,"reason":"<one clear sentence why they match>"}]}
Order by match_score descending.`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': getKey(),
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const raw = await res.json();
    if (raw.error) throw new Error(raw.error.message);

    let text = raw.content[0].text.trim();
    if (text.startsWith('```')) text = text.replace(/```json\n?|```/g, '').trim();
    const result = JSON.parse(text);

    const invMap = Object.fromEntries(investors.map(i => [i.id, i]));

    document.getElementById('match-results').innerHTML = result.matches.map(m => {
      const inv = invMap[m.investor_id];
      if (!inv) return '';
      const c = m.match_score >= 75 ? 'var(--green)' : m.match_score >= 50 ? 'var(--amber)' : 'var(--red)';
      return `
        <div class="card">
          <div style="display:flex;align-items:center;gap:14px">
            <div style="font-size:24px;font-weight:700;color:${c};min-width:56px;text-align:center">${m.match_score}%</div>
            <div>
              <div style="font-weight:500;font-size:15px">${inv.name}${inv.firm ? ' · <span style="color:var(--muted);font-weight:400">' + inv.firm + '</span>' : ''}</div>
              <div style="font-size:13px;color:var(--muted);margin-top:5px;line-height:1.5">${m.reason}</div>
            </div>
          </div>
        </div>`;
    }).join('') || '<div class="empty"><div class="empty-text">No matches found</div></div>';

  } catch (e) {
    document.getElementById('match-results').innerHTML = `<div style="color:var(--red);font-size:13px;padding:12px">${e.message}</div>`;
  }
}

// investors

/**
 * fetches all investors and renders them as grid cards
 */
async function loadInvestors() {
  const { data } = await db.from('investors').select('*').order('created_at', { ascending: false });
  const el = document.getElementById('investors-list');

  if (!data?.length) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">◇</div><div class="empty-text">No investors yet. Add the first one!</div></div>';
    return;
  }

  el.innerHTML = `<div class="grid-2">${data.map(inv => {
    const c = aColor(inv.name);
    return `
    <div class="card">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
        <div class="avatar" style="background:${c}22;color:${c}">${aInit(inv.name)}</div>
        <div>
          <div style="font-weight:500">${inv.name}</div>
          <div style="font-size:13px;color:var(--muted)">${inv.firm || 'Independent'}</div>
        </div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">
        ${inv.focus_sectors ? inv.focus_sectors.split(',').map(s => `<span class="badge badge-purple">${s.trim()}</span>`).join('') : ''}
        <span class="badge badge-blue">${inv.stage_preference || 'Any stage'}</span>
      </div>
      ${(inv.min_ticket || inv.max_ticket) ? `<div style="font-size:13px;color:var(--muted);margin-bottom:6px">Ticket: $${Number(inv.min_ticket || 0).toLocaleString()} – $${Number(inv.max_ticket || 0).toLocaleString()}</div>` : ''}
      ${inv.thesis ? `<div style="font-size:13px;color:var(--muted);line-height:1.5">${inv.thesis.slice(0, 110)}${inv.thesis.length > 110 ? '...' : ''}</div>` : ''}
      <hr class="divider">
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary btn-sm" onclick="editInvestor('${inv.id}')">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteInvestor('${inv.id}')">Delete</button>
      </div>
    </div>`;
  }).join('')}</div>`;
}

/**
 * opens the investor modal, pre-filled for editing if needed
 * @param {Object|null} inv
 */
function openInvestorModal(inv = null) {
  document.getElementById('im-title').textContent  = inv ? 'Edit Investor' : 'New Investor';
  document.getElementById('i-id').value            = inv?.id || '';
  document.getElementById('i-name').value          = inv?.name || '';
  document.getElementById('i-firm').value          = inv?.firm || '';
  document.getElementById('i-sectors').value       = inv?.focus_sectors || '';
  document.getElementById('i-stage').value         = inv?.stage_preference || 'Seed';
  document.getElementById('i-min').value           = inv?.min_ticket || '';
  document.getElementById('i-max').value           = inv?.max_ticket || '';
  document.getElementById('i-thesis').value        = inv?.thesis || '';
  openModal('investor-modal');
}

/**
 * fetches investor by ID and opens edit modal
 * @param {string} id
 */
async function editInvestor(id) {
  const { data } = await db.from('investors').select('*').eq('id', id).single();
  if (data) openInvestorModal(data);
}

/**
 * creates/ updates an investor record in Supabase
 */
async function saveInvestor() {
  const name = document.getElementById('i-name').value.trim();
  if (!name) { toast('Name is required'); return; }

  const editId = document.getElementById('i-id').value;
  const payload = {
    name,
    firm:             document.getElementById('i-firm').value    || null,
    focus_sectors:    document.getElementById('i-sectors').value || null,
    stage_preference: document.getElementById('i-stage').value,
    min_ticket:       parseFloat(document.getElementById('i-min').value) || null,
    max_ticket:       parseFloat(document.getElementById('i-max').value) || null,
    thesis:           document.getElementById('i-thesis').value  || null
  };

  if (editId) await db.from('investors').update(payload).eq('id', editId);
  else        await db.from('investors').insert(payload);

  closeModal('investor-modal');
  loadInvestors();
  loadDashboard();
  toast('Investor saved to Supabase!', true);
}

/**
 * deletes an investor from Supabase.
 * @param {string} id
 */
async function deleteInvestor(id) {
  if (!confirm('Delete this investor?')) return;
  await db.from('investors').delete().eq('id', id);
  loadInvestors();
  loadDashboard();
  toast('Investor deleted');
}

// events

async function loadEvents() {
  const { data } = await db.from('events').select('*').order('event_date', { ascending: true });
  const el = document.getElementById('events-list');

  if (!data?.length) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">◻</div><div class="empty-text">No events yet. Create the first one!</div></div>';
    return;
  }

  const typeColor = {
    'Pitch Night':   'badge-purple',
    'Networking':    'badge-green',
    'Workshop':      'badge-blue',
    'Demo Day':      'badge-amber',
    'Fireside Chat': 'badge-red'
  };

  el.innerHTML = `<div class="grid-2">${data.map(ev => {
    const d = new Date(ev.event_date);
    return `
    <div class="card">
      <div style="display:flex;gap:14px;align-items:flex-start">
        <div class="event-date-box">
          <div class="event-month">${d.toLocaleString('default', { month: 'short' }).toUpperCase()}</div>
          <div class="event-day">${d.getDate()}</div>
        </div>
        <div style="flex:1">
          <div style="font-weight:500;margin-bottom:6px">${ev.title}</div>
          <span class="badge ${typeColor[ev.event_type] || 'badge-blue'}">${ev.event_type}</span>
          ${ev.location    ? `<div style="font-size:13px;color:var(--muted);margin-top:6px">◻ ${ev.location}</div>` : ''}
          ${ev.description ? `<div style="font-size:13px;color:var(--muted);margin-top:4px;line-height:1.4">${ev.description.slice(0, 90)}${ev.description.length > 90 ? '...' : ''}</div>` : ''}
          <div style="font-size:12px;color:var(--muted);margin-top:6px">
            ${ev.current_attendees || 0} attending${ev.max_attendees ? ' / ' + ev.max_attendees + ' max' : ''}
          </div>
        </div>
      </div>
      <hr class="divider">
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary btn-sm"    onclick="joinEvent('${ev.id}')">Join</button>
        <button class="btn btn-secondary btn-sm"  onclick="editEvent('${ev.id}')">Edit</button>
        <button class="btn btn-danger btn-sm"     onclick="deleteEvent('${ev.id}')">Delete</button>
      </div>
    </div>`;
  }).join('')}</div>`;
}

/**
 * @param {Object|null} ev
 */
function openEventModal(ev = null) {
  document.getElementById('em-title').textContent  = ev ? 'Edit Event' : 'Create Event';
  document.getElementById('e-id').value            = ev?.id || '';
  document.getElementById('e-title').value         = ev?.title || '';
  document.getElementById('e-type').value          = ev?.event_type || 'Pitch Night';
  document.getElementById('e-date').value          = ev?.event_date || '';
  document.getElementById('e-location').value      = ev?.location || '';
  document.getElementById('e-max').value           = ev?.max_attendees || '';
  document.getElementById('e-desc').value          = ev?.description || '';
  openModal('event-modal');
}

/**
 * fetches event by ID and opens edit modal
 * @param {string} id
 */
async function editEvent(id) {
  const { data } = await db.from('events').select('*').eq('id', id).single();
  if (data) openEventModal(data);
}

/**
 * creates or updates an event in Supabase
 */
async function saveEvent() {
  const title = document.getElementById('e-title').value.trim();
  const date  = document.getElementById('e-date').value;
  if (!title || !date) { toast('Title and date are required'); return; }

  const editId = document.getElementById('e-id').value;
  const payload = {
    title,
    event_type:    document.getElementById('e-type').value,
    event_date:    date,
    location:      document.getElementById('e-location').value || null,
    max_attendees: parseInt(document.getElementById('e-max').value) || null,
    description:   document.getElementById('e-desc').value || null
  };

  if (editId) await db.from('events').update(payload).eq('id', editId);
  else        await db.from('events').insert(payload);

  closeModal('event-modal');
  loadEvents();
  loadDashboard();
  toast('Event saved!', true);
}

/**
 * increments the attendee count for an event
 * @param {string} id
 */
async function joinEvent(id) {
  const { data: ev } = await db.from('events').select('current_attendees').eq('id', id).single();
  await db.from('events').update({ current_attendees: (ev?.current_attendees || 0) + 1 }).eq('id', id);
  loadEvents();
  toast('You joined the event!', true);
}

/**
 * deletes an event from Supabase
 * @param {string} id
 */
async function deleteEvent(id) {
  if (!confirm('Delete this event?')) return;
  await db.from('events').delete().eq('id', id);
  loadEvents();
  loadDashboard();
  toast('Event deleted');
}

// network

/**
 * fetches all founders and renders them as network cards
 */
async function loadNetwork() {
  const { data } = await db.from('founders').select('*').order('created_at', { ascending: false });
  const el = document.getElementById('network-list');

  if (!data?.length) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">◉</div><div class="empty-text">No founders yet. Build your network!</div></div>';
    return;
  }

  el.innerHTML = `<div class="grid-2">${data.map(f => {
    const c = aColor(f.name);
    return `
    <div class="card">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
        <div class="avatar" style="background:${c}22;color:${c}">${aInit(f.name)}</div>
        <div style="flex:1">
          <div style="font-weight:500">${f.name}</div>
          <div style="font-size:13px;color:var(--muted)">${f.role || 'Founder'}${f.startup_name ? ' at ' + f.startup_name : ''}</div>
        </div>
        ${f.connected ? '<span class="badge badge-green">Connected</span>' : ''}
      </div>
      ${f.bio ? `<div style="font-size:13px;color:var(--muted);margin-bottom:10px;line-height:1.5">${f.bio.slice(0, 110)}${f.bio.length > 110 ? '...' : ''}</div>` : ''}
      ${f.icebreaker ? `
        <div style="background:rgba(124,109,250,.08);border:1px solid rgba(124,109,250,.2);border-radius:8px;padding:10px;font-size:13px;color:var(--accent2);margin-bottom:10px;line-height:1.5">
          ✦ <em>${f.icebreaker}</em>
        </div>` : ''}
      <div style="display:flex;gap:8px">
        ${!f.connected ? `<button class="btn btn-primary btn-sm" onclick="connectFounder('${f.id}')">Connect ✦</button>` : ''}
        <button class="btn btn-danger btn-sm" onclick="deleteFounder('${f.id}')">Remove</button>
      </div>
    </div>`;
  }).join('')}</div>`;
}


function openFounderModal() {
  ['f-name', 'f-startup', 'f-role', 'f-bio'].forEach(id => document.getElementById(id).value = '');
  openModal('founder-modal');
}

async function saveFounder() {
  const name = document.getElementById('f-name').value.trim();
  if (!name) { toast('Name is required'); return; }

  await db.from('founders').insert({
    name,
    startup_name: document.getElementById('f-startup').value || null,
    role:         document.getElementById('f-role').value    || null,
    bio:          document.getElementById('f-bio').value     || null
  });

  closeModal('founder-modal');
  loadNetwork();
  toast('Founder added to network!', true);
}

/**
 * marks a founder as connected and generates an AI icebreaker via Claude.
 * + records the connection in the connections table
 * @param {string} id - Founder ID
 */
async function connectFounder(id) {
  const btn = document.querySelector(`button[onclick="connectFounder('${id}')"]`);
  if (btn) { btn.textContent = 'Connecting...'; btn.disabled = true; }

  const { data: founder } = await db.from('founders').select('*').eq('id', id).single();
  let icebreaker = "Great to connect! I'd love to hear more about your journey.";

  // generate AI icebreaker if API key and bio are available
  if (getKey() && founder?.bio) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': getKey(),
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 120,
          messages: [{
            role: 'user',
            content: `Write a friendly 1-2 sentence conversation starter for two startup founders connecting. The other founder's bio: "${founder.bio}". Return only the icebreaker text, nothing else.`
          }]
        })
      });
      const raw = await res.json();
      if (!raw.error) icebreaker = raw.content[0].text.trim();
    } catch (e) {
      // fallback to default icebreaker
    }
  }

  // update founder record and log connection
  await db.from('founders').update({ connected: true, icebreaker }).eq('id', id);
  await db.from('connections').insert({ founder_id: id });

  loadNetwork();
  loadDashboard();
  toast('Connected! AI icebreaker generated ✦', true);
}

/**
 * removes a founder and their connection record from Supabase.
 * @param {string} id
 */
async function deleteFounder(id) {
  if (!confirm('Remove this founder?')) return;
  await db.from('connections').delete().eq('founder_id', id);
  await db.from('founders').delete().eq('id', id);
  loadNetwork();
  loadDashboard();
  toast('Founder removed');
}

// init
loadDashboard();
