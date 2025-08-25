// netlify/functions/fetch_jobs.js
// Aggregates public RSS/Atom feeds for Asia education jobs.
// Also supports user-provided third-party RSS (e.g., RSS.app) and an optional HTML fallback for PIE Jobs.
// Use: set env vars in Netlify UI:
//  - ALLOW_HTML_SCRAPE = "1" (optional, enables best-effort PIE HTML parsing)
//  - STRICT_ASIA_ONLY  = "1" (default: "1") keep only NEA/SEA hits by keyword
//  - EXTRA_RSS         = "<one URL per line>" (third-party RSS feeds you create, e.g., LinkedIn search via RSS.app)

const ALLOW_HTML_SCRAPE = process.env.ALLOW_HTML_SCRAPE === "1";
const STRICT_ASIA_ONLY  = (process.env.STRICT_ASIA_ONLY ?? "1") === "1";

const EXTRA_RSS =
  (process.env.EXTRA_RSS || "")
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(Boolean);

// --- Regions / country keywords for NEA + SEA filtering
const ASIA_WORDS = [
  // NEA
  "China","Hong Kong","Macao","Macau","Taiwan","Japan","South Korea","Korea","North Korea","Mongolia",
  // SEA
  "Brunei","Cambodia","Indonesia","Laos","Malaysia","Myanmar","Burma","Philippines","Singapore",
  "Thailand","Timor-Leste","East Timor","Vietnam","Viet Nam",
  // big cities that often appear without country
  "Beijing","Shanghai","Shenzhen","Guangzhou","Chengdu","Wuhan","Nanjing","Hangzhou","Suzhou","Tianjin",
  "Xi'an","Chongqing","Hanoi","Ho Chi Minh","Saigon","Da Nang","Bangkok","Chiang Mai","Phuket",
  "Kuala Lumpur","Penang","Selangor","Manila","Cebu","Davao","Jakarta","Surabaya","Bandung","Yogyakarta",
  "Seoul","Busan","Tokyo","Osaka","Kyoto","Nagoya","Fukuoka","Singapore"
];

const ASIA_RE = new RegExp(`\\b(${ASIA_WORDS.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "i");

// -------------------------------------------------------------------------------------
// 1) Source definitions (public RSS or Atom)
//   • Jobs.ac.uk feeds accept ?keywords=… and return valid RSS
//   • THEunijobs supports ?keywords=… (RSS)
//   • WISHlistjobs supports ?search=…&format=rss
//   • ChinaUniversityJobs provides WordPress RSS
//   • Guardian Jobs has jobsrss with Keywords=…
//   • EXTRA_RSS: any third-party RSS you add (e.g., RSS.app for LinkedIn queries)
// -------------------------------------------------------------------------------------

function ja(query) {
  return `https://www.jobs.ac.uk/search/feed?keywords=${encodeURIComponent(query)}`;
}
function the(query) {
  return `https://www.timeshighereducation.com/unijobs/jobsrss/?keywords=${encodeURIComponent(query)}`;
}
function wish(query) {
  return `https://www.wishlistjobs.com/jobs?search=${encodeURIComponent(query)}&format=rss`;
}
function guardian(query) {
  return `https://jobs.theguardian.com/jobsrss/?Keywords=${encodeURIComponent(query)}`;
}

const RSS_SOURCES = [
  // ---- Jobs.ac.uk: functional roles + region terms ----
  { name: "jobs.ac.uk: student recruitment asia", url: ja("student recruitment asia") },
  { name: "jobs.ac.uk: international student recruitment asia", url: ja("international student recruitment asia") },
  { name: "jobs.ac.uk: admissions asia", url: ja("admissions asia") },
  { name: "jobs.ac.uk: marketing asia education", url: ja("marketing asia education") },
  { name: "jobs.ac.uk: international office asia", url: ja("international office asia") },
  { name: "jobs.ac.uk: partnerships asia", url: ja("partnerships asia") },
  { name: "jobs.ac.uk: regional manager asia", url: ja("regional manager asia") },
  { name: "jobs.ac.uk: country manager asia", url: ja("country manager asia") },
  { name: "jobs.ac.uk: project manager education asia", url: ja("project manager education asia") },
  { name: "jobs.ac.uk: dean asia", url: ja("dean asia") },
  { name: "jobs.ac.uk: director asia education", url: ja("director asia education") },
  // country keywords
  { name: "jobs.ac.uk: china", url: ja("china education") },
  { name: "jobs.ac.uk: hong kong", url: ja("hong kong education") },
  { name: "jobs.ac.uk: singapore", url: ja("singapore education") },
  { name: "jobs.ac.uk: malaysia", url: ja("malaysia education") },
  { name: "jobs.ac.uk: thailand", url: ja("thailand education") },
  { name: "jobs.ac.uk: vietnam", url: ja("vietnam education") },
  { name: "jobs.ac.uk: indonesia", url: ja("indonesia education") },
  { name: "jobs.ac.uk: philippines", url: ja("philippines education") },
  { name: "jobs.ac.uk: japan", url: ja("japan education") },
  { name: "jobs.ac.uk: korea", url: ja("korea education") },
  { name: "jobs.ac.uk: taiwan", url: ja("taiwan education") },

  // ---- THEunijobs (Times Higher Education) ----
  { name: "THE: dean asia", url: the("dean asia") },
  { name: "THE: director asia education", url: the("director asia education") },
  { name: "THE: marketing asia", url: the("marketing asia") },
  { name: "THE: admissions asia", url: the("admissions asia") },
  { name: "THE: recruitment asia", url: the("recruitment asia") },
  { name: "THE: partnerships asia", url: the("partnerships asia") },
  { name: "THE: china", url: the("china") },
  { name: "THE: hong kong", url: the("hong kong") },
  { name: "THE: singapore", url: the("singapore") },
  { name: "THE: malaysia", url: the("malaysia") },
  { name: "THE: thailand", url: the("thailand") },
  { name: "THE: vietnam", url: the("vietnam") },
  { name: "THE: indonesia", url: the("indonesia") },
  { name: "THE: philippines", url: the("philippines") },
  { name: "THE: japan", url: the("japan") },
  { name: "THE: korea", url: the("korea") },
  { name: "THE: taiwan", url: the("taiwan") },

  // ---- WISHlistjobs (international schools) ----
  { name: "WISH: asia", url: wish("asia") },
  { name: "WISH: china", url: wish("china") },
  { name: "WISH: hong kong", url: wish("hong kong") },
  { name: "WISH: singapore", url: wish("singapore") },
  { name: "WISH: malaysia", url: wish("malaysia") },
  { name: "WISH: thailand", url: wish("thailand") },
  { name: "WISH: vietnam", url: wish("vietnam") },
  { name: "WISH: indonesia", url: wish("indonesia") },
  { name: "WISH: philippines", url: wish("philippines") },
  { name: "WISH: japan", url: wish("japan") },
  { name: "WISH: korea", url: wish("korea") },
  { name: "WISH: taiwan", url: wish("taiwan") },

  // ---- Guardian Jobs (general; education+asia) ----
  { name: "Guardian: education asia", url: guardian("education asia") },
  { name: "Guardian: student recruitment asia", url: guardian("student recruitment asia") },
  { name: "Guardian: marketing asia education", url: guardian("marketing asia education") },

  // ---- ChinaUniversityJobs (WordPress RSS) ----
  { name: "ChinaUniversityJobs feed", url: "https://www.chinauniversityjobs.com/feed/" },

  // ---- PIE Jobs (try RSS endpoints; real site has no official RSS) ----
  { name: "PIE (try /feed)", url: "https://thepiejobs.com/feed/" },
  { name: "PIE (try /jobs/feed)", url: "https://thepiejobs.com/jobs/feed/" },
  // Note: if these return HTML (not RSS), we skip; optional HTML fallback below if ALLOW_HTML_SCRAPE=1.
];

// Append user-provided third-party RSS
for (const url of EXTRA_RSS) RSS_SOURCES.push({ name: "EXTRA_RSS", url });

// -------------------------------------------------------------------------------------
// 2) Fetch utilities + parsers (RSS + Atom)
// -------------------------------------------------------------------------------------
const fetchOpts = { headers: { "User-Agent": "Mozilla/5.0 (+https://netlify.com/)" } };
const clean = (s = "") => s.replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1").trim();
const pick = (raw, tag) => clean((raw.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i")) || [, ""])[1]);

function parseRssOrAtom(xml) {
  const out = [];

  // RSS <item>
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
    const raw = m[1];
    const title = pick(raw, "title");
    const link = pick(raw, "link") || pick(raw, "guid");
    const desc = pick(raw, "description") || pick(raw, "content:encoded");
    const pub  = pick(raw, "pubDate") || pick(raw, "date");
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
    const raw = m[1];
    const title = pick(raw, "title");
    const linkHref = (raw.match(/<link[^>]*href="([^"]+)"/i) || [, ""])[1];
    const desc = pick(raw, "summary") || pick(raw, "content");
    const pub  = pick(raw, "updated") || pick(raw, "published");
    const link = linkHref || pick(raw, "id");
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

// -------------------------------------------------------------------------------------
// 3) Optional HTML fallback for PIE Jobs (best effort)
// -------------------------------------------------------------------------------------
async function scrapePIE() {
  const list = [];
  try {
    const res = await fetch("https://thepiejobs.com/jobs", fetchOpts);
    const html = await res.text();
    // Very light extraction: anchors that point to /job/… pages
    const matches = [...html.matchAll(/<a[^>]+href="([^"]+\/job\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
    for (const m of matches) {
      const link = m[1];
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

// -------------------------------------------------------------------------------------
// 4) Main handler
// -------------------------------------------------------------------------------------
export const handler = async (event) => {
  try {
    const debug = event?.queryStringParameters?.debug === "1";

    const notes = [];
    let jobs = [];

    // Fetch all RSS/Atom sources
    for (const s of RSS_SOURCES) {
      try {
        const res = await fetch(s.url, fetchOpts);
        const body = await res.text();

        // Skip if clearly HTML and not RSS/Atom
        if (/<(html|head|body)\b/i.test(body) && !/<(rss|feed|rdf|entry|item)\b/i.test(body)) {
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

    // Optional PIE HTML fallback
    if (ALLOW_HTML_SCRAPE) {
      const pie = await scrapePIE();
      if (pie.length) notes.push(`PIE (HTML fallback): ${pie.length}`);
      jobs.push(...pie);
    }

    // De-dupe by URL
    const map = new Map();
    for (const j of jobs) {
      const key = (j.original_url || j.apply_url || j.id || "").toString().trim();
      if (!key) continue;
      if (!map.has(key)) map.set(key, j);
    }
    let merged = [...map.values()];

    // Keep only NEA/SEA if STRICT_ASIA_ONLY
    if (STRICT_ASIA_ONLY) {
      merged = merged.filter(j => {
        const blob = [
          j.title, j.description, j.school, j.location, j.city, j.country, j.original_url
        ].filter(Boolean).join(" ").toString();
        return ASIA_RE.test(blob);
      });
    }

    // Trim to sane size
    merged = merged.slice(0, 1000);

    if (debug) {
      return {
        statusCode: 200,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ total: merged.length, notes, items: merged }, null, 2),
      };
    }
    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(merged),
    };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
};






