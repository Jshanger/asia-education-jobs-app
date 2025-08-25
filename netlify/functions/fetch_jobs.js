// netlify/functions/fetch_jobs.js
// ===============================================
// Asia Education Jobs Aggregator (CommonJS)
// - Pulls RSS/Atom feeds for NEA/SEA education roles
// - Optional simple HTML fallback for PIE Jobs list page
// - Debug endpoint: /.netlify/functions/fetch_jobs?debug=1
//
// Netlify Environment Variables (recommended):
//   STRICT_ASIA_ONLY = 0        # don't over-filter on server
//   ALLOW_HTML_SCRAPE = 1       # optional; enables PIE Jobs HTML fallback
//   EXTRA_RSS = (newline/comma/semicolon-separated OR JSON array of feed URLs)
//
// After setting env vars, trigger: Deploys → "Clear cache and deploy site"
// ===============================================

// ---- Env flags ----
const ALLOW_HTML_SCRAPE = process.env.ALLOW_HTML_SCRAPE === "1";
// default STRICT to OFF to avoid dropping valid items
const STRICT_ASIA_ONLY  = (process.env.STRICT_ASIA_ONLY ?? "0") === "1";

// ---- Parse EXTRA_RSS from env (supports JSON array or newline/comma/semicolon list)
function parseExtraFeeds(raw) {
  if (!raw) return [];
  const s = raw.trim();
  try {
    if (s.startsWith("[")) {
      const arr = JSON.parse(s);
      return Array.isArray(arr) ? arr.map(x => String(x).trim()).filter(Boolean) : [];
    }
  } catch (_) { /* fall through */ }
  return s.split(/\r?\n|,|;/).map(x => x.trim()).filter(Boolean);
}
const EXTRA_RSS = parseExtraFeeds(process.env.EXTRA_RSS || "");

// ---- NEA/SEA keywords (used only if STRICT_ASIA_ONLY=1) ----
const ASIA_WORDS = [
  // NEA
  "China","Hong Kong","Macao","Macau","Taiwan","Japan","South Korea","Korea","North Korea","Mongolia",
  // SEA
  "Brunei","Cambodia","Indonesia","Laos","Malaysia","Myanmar","Burma","Philippines","Singapore",
  "Thailand","Timor-Leste","East Timor","Vietnam","Viet Nam",
  // big cities often listed without country
  "Beijing","Shanghai","Shenzhen","Guangzhou","Chengdu","Wuhan","Nanjing","Hangzhou","Suzhou","Tianjin",
  "Xi'an","Chongqing","Hanoi","Ho Chi Minh","Saigon","Da Nang","Bangkok","Chiang Mai","Phuket",
  "Kuala Lumpur","Penang","Selangor","Manila","Cebu","Davao","Jakarta","Surabaya","Bandung","Yogyakarta",
  "Seoul","Busan","Tokyo","Osaka","Kyoto","Nagoya","Fukuoka","Singapore"
];
const ASIA_RE = new RegExp(
  `\\b(${ASIA_WORDS.map(w => w.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")).join("|")})\\b`,
  "i"
);

// ---- Feed URL helpers ----
const ja   = q => `https://www.jobs.ac.uk/search/feed?keywords=${encodeURIComponent(q)}`;
const the  = q => `https://www.timeshighereducation.com/unijobs/jobsrss/?keywords=${encodeURIComponent(q)}`;
const wish = q => `https://www.wishlistjobs.com/jobs?search=${encodeURIComponent(q)}&format=rss`;
const guardian = q => `https://jobs.theguardian.com/jobsrss/?Keywords=${encodeURIComponent(q)}`;

// ---- Source list (student recruitment, marketing/sales, partnerships, senior leadership, PM) ----
const RSS_SOURCES = [
  // Jobs.ac.uk – functional
  { name: "jobs.ac.uk: student recruitment asia",         url: ja("student recruitment asia") },
  { name: "jobs.ac.uk: international student recruitment asia", url: ja("international student recruitment asia") },
  { name: "jobs.ac.uk: admissions asia",                  url: ja("admissions asia") },
  { name: "jobs.ac.uk: marketing asia education",         url: ja("marketing asia education") },
  { name: "jobs.ac.uk: international office asia",        url: ja("international office asia") },
  { name: "jobs.ac.uk: partnerships asia",                url: ja("partnerships asia") },
  { name: "jobs.ac.uk: regional manager asia",            url: ja("regional manager asia") },
  { name: "jobs.ac.uk: country manager asia",             url: ja("country manager asia") },
  { name: "jobs.ac.uk: project manager education asia",   url: ja("project manager education asia") },
  { name: "jobs.ac.uk: dean asia",                        url: ja("dean asia") },
  { name: "jobs.ac.uk: director asia education",          url: ja("director asia education") },
  // Jobs.ac.uk – by country keyword
  { name: "jobs.ac.uk: china",       url: ja("china education") },
  { name: "jobs.ac.uk: hong kong",   url: ja("hong kong education") },
  { name: "jobs.ac.uk: singapore",   url: ja("singapore education") },
  { name: "jobs.ac.uk: malaysia",    url: ja("malaysia education") },
  { name: "jobs.ac.uk: thailand",    url: ja("thailand education") },
  { name: "jobs.ac.uk: vietnam",     url: ja("vietnam education") },
  { name: "jobs.ac.uk: indonesia",   url: ja("indonesia education") },
  { name: "jobs.ac.uk: philippines", url: ja("philippines education") },
  { name: "jobs.ac.uk: japan",       url: ja("japan education") },
  { name: "jobs.ac.uk: korea",       url: ja("korea education") },
  { name: "jobs.ac.uk: taiwan",      url: ja("taiwan education") },

  // Times Higher Education
  { name: "THE: dean asia",             url: the("dean asia") },
  { name: "THE: director asia education",url: the("director asia education") },
  { name: "THE: marketing asia",        url: the("marketing asia") },
  { name: "THE: admissions asia",       url: the("admissions asia") },
  { name: "THE: recruitment asia",      url: the("recruitment asia") },
  { name: "THE: partnerships asia",     url: the("partnerships asia") },
  { name: "THE: china", url: the("china") }, { name: "THE: hong kong", url: the("hong kong") },
  { name: "THE: singapore", url: the("singapore") }, { name: "THE: malaysia", url: the("malaysia") },
  { name: "THE: thailand", url: the("thailand") },   { name: "THE: vietnam", url: the("vietnam") },
  { name: "THE: indonesia", url: the("indonesia") }, { name: "THE: philippines", url: the("philippines") },
  { name: "THE: japan", url: the("japan") },         { name: "THE: korea", url: the("korea") },
  { name: "THE: taiwan", url: the("taiwan") },

  // WISHlistjobs (international schools)
  { name: "WISH: asia", url: wish("asia") },
  { name: "WISH: china", url: wish("china") },           { name: "WISH: hong kong", url: wish("hong kong") },
  { name: "WISH: singapore", url: wish("singapore") },   { name: "WISH: malaysia", url: wish("malaysia") },
  { name: "WISH: thailand", url: wish("thailand") },     { name: "WISH: vietnam", url: wish("vietnam") },
  { name: "WISH: indonesia", url: wish("indonesia") },   { name: "WISH: philippines", url: wish("philippines") },
  { name: "WISH: japan", url: wish("japan") },           { name: "WISH: korea", url: wish("korea") },
  { name: "WISH: taiwan", url: wish("taiwan") },

  // Guardian Jobs (broad edu+Asia)
  { name: "Guardian: education asia",           url: guardian("education asia") },
  { name: "Guardian: student recruitment asia", url: guardian("student recruitment asia") },
  { name: "Guardian: marketing asia education", url: guardian("marketing asia education") },

  // ChinaUniversityJobs (WordPress RSS)
  { name: "ChinaUniversityJobs feed", url: "https://www.chinauniversityjobs.com/feed/" },

  // PIE Jobs – unofficial endpoints; may be HTML (fallback below)
  { name: "PIE (try /feed)",      url: "https://thepiejobs.com/feed/" },
  { name: "PIE (try /jobs/feed)", url: "https://thepiejobs.com/jobs/feed/" }
];

// Add any third-party feeds from env (e.g., LinkedIn via RSS.app)
for (const url of EXTRA_RSS) RSS_SOURCES.push({ name: "EXTRA_RSS", url });

// ---- Fetch + parse helpers ----
const fetchOpts = { headers: { "User-Agent": "Mozilla/5.0 (+https://netlify.com/)" } };
const clean = (s = "") => s.replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1").trim();
const pick  = (raw, tag) => clean((raw.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i")) || [, ""])[1]);

function parseRssOrAtom(xml) {
  const out = [];

  // RSS <item>
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
    const raw   = m[1];
    const title = pick(raw, "title");
    const link  = pick(raw, "link") || pick(raw, "guid");
    const desc  = pick(raw, "description") || pick(raw, "content:encoded");
    const pub   = pick(raw, "pubDate") || pick(raw, "date");
    if (title && link) out.push({
      id: link || title, title,
      school: "", location: "", country: "", city: "",
      source: "RSS",
      posting_date: pub ? new Date(pub).toISOString() : new Date().toISOString(),
      application_deadline: null,
      category: "", experience_level: "",
      description: desc,
      original_url: link, apply_url: link
    });
  }

  // Atom <entry>
  for (const m of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)) {
    const raw   = m[1];
    const title = pick(raw, "title");
    const linkHref = (raw.match(/<link[^>]*href="([^"]+)"/i) || [, ""])[1];
    const desc  = pick(raw, "summary") || pick(raw, "content");
    const pub   = pick(raw, "updated") || pick(raw, "published");
    const link  = linkHref || pick(raw, "id");
    if (title && link) out.push({
      id: link || title, title,
      school: "", location: "", country: "", city: "",
      source: "Atom",
      posting_date: pub ? new Date(pub).toISOString() : new Date().toISOString(),
      application_deadline: null,
      category: "", experience_level: "",
      description: desc,
      original_url: link, apply_url: link
    });
  }
  return out;
}

// ---- Optional, best-effort HTML fallback for PIE Jobs list page ----
async function scrapePIE() {
  const list = [];
  try {
    const res = await fetch("https://thepiejobs.com/jobs", fetchOpts);
    const html = await res.text();
    if (!/<html/i.test(html)) return list;
    const matches = [...html.matchAll(/<a[^>]+href="([^"]+\/job\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
    for (const m of matches) {
      const link  = m[1];
      if (!/thepiejobs\.com\/job\//i.test(link)) continue;
      const title = clean(m[2].replace(/<[^>]*>/g, " "));
      if (title && link && !list.some(x => x.original_url === link)) {
        list.push({
          id: link, title, description: "",
          school: "", location: "", country: "", city: "",
          source: "HTML",
          posting_date: new Date().toISOString(),
          application_deadline: null,
          original_url: link, apply_url: link, category: ""
        });
      }
      if (list.length >= 200) break;
    }
  } catch (_) { /* ignore */ }
  return list;
}

// ---- URL normalizer (for de-duping) ----
function normalizeUrl(u = "") {
  try {
    const url = new URL(u);
    // remove common tracking params
    ["utm_source","utm_medium","utm_campaign","utm_term","utm_content","gclid","fbclid"].forEach(k => url.searchParams.delete(k));
    return url.toString();
  } catch { return u; }
}

// ---- Handler ----
module.exports.handler = async (event) => {
  try {
    const debug = event?.queryStringParameters?.debug === "1";
    const notes = [];
    let jobs = [];

    // Pull all feeds
    for (const s of RSS_SOURCES) {
      try {
        const res  = await fetch(s.url, fetchOpts);
        const body = await res.text();

        // If it looks like HTML (not RSS/Atom) skip this source here;
        // PIE will be handled by the optional HTML fallback.
        if (/<(html|head|body)\b/i.test(body) && !/(<rss|<feed|<rdf|<entry|<item)\b/i.test(body)) {
          notes.push(`${s.name}: no RSS here`);
          continue;
        }

        const parsed = parseRssOrAtom(body);
        jobs.push(...parsed);
        notes.push(`${s.name}: ${parsed.length}`);
      } catch (err) {
        notes.push(`${s.name}: ERROR ${err?.message || err}`);
      }
    }

    // Optional PIE fallback
    if (ALLOW_HTML_SCRAPE) {
      const pie = await scrapePIE();
      notes.push(`PIE (HTML fallback): ${pie.length}`);
      jobs.push(...pie);
    }

    // De-dupe by normalized URL (or id)
    const map = new Map();
    for (const j of jobs) {
      const key = normalizeUrl(j.original_url || j.apply_url || j.id || "");
      if (key && !map.has(key)) map.set(key, j);
    }
    let merged = [...map.values()];

    // Optional strict Asia filter (server-side)
    if (STRICT_ASIA_ONLY) {
      merged = merged.filter(j => ASIA_RE.test(
        [j.title, j.description, j.school, j.location, j.city, j.country, j.original_url]
          .filter(Boolean).join(" ")
      ));
    }

    // Plenty of headroom
    merged = merged.slice(0, 2000);

    if (debug) {
      return {
        statusCode: 200,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ total: merged.length, notes, items: merged }, null, 2)
      };
    }

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(merged)
    };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
};








