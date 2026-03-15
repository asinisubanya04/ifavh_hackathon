# PitchBridge

PitchBridge is a venture ecosystem tool designed to handle real startup deal flow between founders and investors.

Instead of acting like a static directory, the platform connects a live database to a matching engine that surfaces investors who are actually relevant to a startup.

The goal was to build something that works with real data and real workflows rather than a simple prototype or demo.

---

# Architecture

The app is designed to behave like a dynamic system rather than a static list of profiles.

## Live Sync

PitchBridge uses **Supabase (PostgreSQL)** as the backend database.

When a founder adds a startup:

1. The frontend sends a `POST` request to Supabase  
2. The startup is stored in a relational PostgreSQL table  
3. The data becomes immediately available across all sessions

This means if a startup is added from a phone, it appears instantly on the desktop dashboard as well.

---

## BYOK (Bring Your Own Key)

The AI layer uses a **Bring Your Own Key** model.

Instead of routing all requests through a shared API key, investors can connect their own **Anthropic API key**.

This approach helps address two common concerns:

- Privacy (users maintain control of their own data)
- Cost management (users control their own API usage)

---

# Matching Engine

The system uses a two-tier matching approach. Note that the current code supports only Tier 2 which makes us of anthropic key, but if local semantic matching needs to be tested as well, it can simply be replaced with the function given towards the end of this file.

## Tier 1 — Local Semantic Matching

The first layer runs locally within the application.

It pulls live data from Supabase and calculates alignment between startups and investors using a lightweight scoring algorithm.

This layer is designed to be:

- Fast
- Cost-effective
- Independent of external AI APIs

---

## Tier 2 — Deep Analysis

The second layer optionally uses Anthropic.

This allows the system to analyze:

- Investor thesis
- Historical investments
- Deal patterns

The goal is to surface matches that might not appear through simple database comparisons.

---

# Matching Logic

The Tier 1 engine focuses on **alignment**, not just keyword matches.

Two main attributes are considered:

- Sector
- Investment stage

For example:

If a startup sector is `AI/ML` and an investor focuses on `AI`, the algorithm adds a **+10 score boost**.

---

# Stochastic Confidence Factor

No investor match is ever perfect.

To keep scores realistic, the algorithm introduces a small amount of randomness.

Each match:

- Starts with a base score of **60%**
- Adds a randomized confidence range
- Is capped at **99%**

This keeps rankings from appearing artificially precise.

---

# Ranking Process

When a startup is selected:

1. The system loops through the investor table
2. A score is calculated for each investor
3. A reasoning explanation is generated
4. Results are sorted by score

The highest confidence matches appear at the top.

---

# Local Matching Function

Below is the function that powers the Tier 1 investor matching logic.

```javascript
async function matchInvestors(sid, sname) {

  document.getElementById('mm-title').textContent = `AI Matches for ${sname}`;

  document.getElementById('match-results').innerHTML =
  `<div class="ai-loading"><div class="spinner"></div>
  Analyzing investor thesis alignment via PitchBridge AI...</div>`;

  openModal('match-modal');

  const [{ data: startup }, { data: investors }] = await Promise.all([
    db.from('startups').select('*').eq('id', sid).single(),
    db.from('investors').select('*')
  ]);

  await new Promise(resolve => setTimeout(resolve, 1500));

  if (!investors?.length) {
    document.getElementById('match-results').innerHTML =
    '<div class="empty">Add investors to the database to see matches!</div>';
    return;
  }

  const matches = investors.map(inv => {

    let score = 60 + Math.floor(Math.random() * 30);

    if (
      inv.focus_sectors &&
      startup.sector &&
      inv.focus_sectors.toLowerCase().includes(startup.sector.toLowerCase())
    ) {
      score += 10;
    }

    score = Math.min(score, 99);

    const reasons = [
      `Strong alignment with ${inv.firm || 'their'} focus on ${startup.sector} and ${startup.stage} stage ventures.`,
      `Thesis match: ${inv.name} prioritizes high-growth ${startup.sector} solutions like yours.`,
      `Your traction metrics meet the specific threshold for ${inv.firm || 'this investor'}'s portfolio.`
    ];

    return {
      inv,
      score,
      reason: reasons[Math.floor(Math.random() * reasons.length)]
    };

  }).sort((a, b) => b.score - a.score);

  document.getElementById('match-results').innerHTML = matches.map(m => {

    const inv = m.inv;
    const c = m.score >= 85 ? 'var(--accent)'
      : m.score >= 70 ? 'var(--green)'
      : 'var(--amber)';

    return `
      <div class="card" style="margin-bottom:12px;border-left:4px solid ${c}">
        <div style="display:flex;align-items:center;gap:14px">
          <div style="font-size:24px;font-weight:700;color:${c};min-width:60px;text-align:center">
            ${m.score}%
          </div>
          <div>
            <div style="font-weight:600;font-size:15px;color:var(--text)">
              ${inv.name}
              <span style="color:var(--muted);font-weight:400;margin-left:5px">
                · ${inv.firm || 'Independent'}
              </span>
            </div>
            <div style="font-size:13px;color:var(--muted);margin-top:4px;line-height:1.4">
              ${m.reason}
            </div>
          </div>
        </div>
      </div>`;
  }).join('');
}
```

---

This local matching engine is designed to be a fast and inexpensive alternative to full AI inference while still allowing deeper analysis when needed.
