// netlify/functions/fetch_jobs.js
// Aggregates public RSS/Atom job feeds. Optional HTML fallback (disabled by default).
// Add ?debug=1 to see per-source counts.

const ALLOW_HTML_SCRAPE = process.env.ALLOW_HTML_SCRAPE === '1';

export const handler = async (event) => {
  try {
    const debug = event?.queryStringParameters?.debug === '1';

    // ---------- 1) PUBLIC RSS/ATOM SOURCES ----------
    // You can add university/job-board RSS URLs here freely.
    const RSS_SOURCES = [
      // jobs.ac.uk – keyword feeds
      { name: 'jobs.ac.uk: international recruitment asia', url: 'https://www.jobs.ac.uk/search/feed?keywords=international%20recruitment%20asia' },
      { name: 'jobs.ac.uk: international student recruitment', url: 'https://www.jobs.ac.uk/search/feed?keywords=international%20student%20recruitment' },
      { name: 'jobs.ac.uk: china education', url: 'https://www.jobs.ac.uk/search/feed?keywords=china%20education' },
      { name: 'jobs.ac.uk: china', url: 'https://www.jobs.ac.uk/search/feed?keywords=china' },
      { name: 'jobs.ac.uk: hong kong', url: 'https://www.jobs.ac.uk/search/feed?keywords=hong%20kong' },

      // WISHlistjobs – keyword feeds
      { name: 'WISHlistjobs: asia broad', url: 'https://www.wishlistjobs.com/jobs?search=asia&format=rss' },
      { name: 'WISHlistjobs: international school', url: 'https://www.wishlistjobs.com/jobs?search=international%20school&format=rss' },
      { name: 'WISHlistjobs: china', url: 'https://www.wishlistjobs.com/jobs?search=china&format=rss' },

      // THE UniJobs (Times Higher Education)
      { name: 'THE UniJobs: China', url: 'https://www.timeshighereducation.com/unijobs/jobsrss/?keywords=china' },
      { name: 'THE UniJobs: Asia', url: 'https://www.timeshighereducation.com/unijobs/jobsrss/?keywords=asia' },
      { name: 'THE UniJobs: Hong Kong', url: 'https://www.timeshighereducation.com/unijobs/jobsrss/?keywords=hong+kong' },

      // Guardian Jobs
      { name: 'Guardian Jobs: education asia', url: 'https://jobs.theguardian.com/jobsrss/?Keywords=education%20asia' },

      // NEW: ChinaUniversityJobs (WordPress RSS)
      { name: 'ChinaUniversityJobs', url: 'https://www.chinauniversityjobs.com/feed/' },

      // NEW: The PIE Jobs – try the usual RSS endpoints first
      // (If none exist, we optionally do a small HTML fallback below.)
      { name: 'The PIE Jobs (try /feed)', url: 'https://thepiejobs.com/feed/' },
      { name: 'The PIE Jobs (try /jobs/feed)', url: 'https://thepiejobs.com/jobs/feed/' },
    ];

    // ---------- 2) FRIENDLY FETCH + PARSERS ----------
    const fetchOpts = { headers: { 'User-Agent': 'Mozilla/5.0 (+https://netlify.com/)' } };

    const clean = (s = '') => s.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();
    const pick = (raw, tag) =>
      clean((raw.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i')) || [, ''])[1]);

    const parseRssOrAtom = (xml) => {
      const out = [];

      // RSS <item>
      const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)];
      for (const m of items) {
        const raw = m[1];
        const title = pick(raw, 'title');
        const link = pick(raw, 'link') || pick(raw, 'guid');
        const desc = pick(raw, 'description') || pick(raw, 'content:encoded');
        const pub  = pick(raw, 'pubDate') || pick(raw, 'date');
        if (title && link) {
          out.push({
            id: link || title,
            title,
            school: '',
            location: '',
            country: '',
            city: '',
            source: 'RSS',
            posting_date: pub ? new Date(pub).toISOString() : new Date().toISOString(),
            application_deadline: null,
            category: '',
            experience_level: '',
            description: desc,
            original_url: link,
            apply_url: link
          });
        }
      }

      // Atom <entry>
      const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)];
      for (const m of entries) {
        const raw = m[1];
        const title = pick(raw, 'title');
        const linkHref = (raw.match(/<link[^>]*href="([^"]+)"/i) || [, ''])[1];
        const desc = pick(raw, 'summary') || pick(raw, 'content');
        const pub  = pick(raw, 'updated') || pick(raw, 'published');
        const link = linkHref || pick(raw, 'id');
        if (title && link) {
          out.push({
            id: link || title,
            title,
            school: '',
            location: '',
            country: '',
            city: '',
            source: 'Atom',
            posting_date: pub ? new Date(pub).toISOString() : new Date().toISOString(),
            application_deadline: null,
            category: '',
            experience_level: '',
            description: desc,
            original_url: link,
            apply_url: link
          });
        }
      }

      return out;
    };

    const notes = [];
    let jobs = [];

    // Fetch all RSS/Atom sources
    for (const s of RSS_SOURCES) {
      try {
        const res = await fetch(s.url, fetchOpts);
        const body = await res.text();

        // Some sites return HTML for missing RSS endpoints; detect & skip
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

    // ---------- 3) OPTIONAL HTML FALLBACK (OFF BY DEFAULT) ----------
    // If a site doesn't expose RSS/Atom but clearly lists jobs, you can enable
    // a *very* light HTML fallback by setting ALLOW_HTML_SCRAPE=1 in Netlify env.
    if (ALLOW_HTML_SCRAPE) {
      // The PIE Jobs lightweight fallback (best-effort; may change if site structure changes)
      try {
        const res = await fetch('https://thepiejobs.com/jobs', fetchOpts);
        const html = await res.text();

        // Look for /job/ links
        const matches = [...html.matchAll(/<a[^>]+href="([^"]+\/job\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
        const found = [];
        for (const m of matches) {
          const link = m[1];
          // filter out nav/duplicate links
          if (!/thepiejobs\.com\/job\//i.test(link)) continue;
          const title = clean(m[2].replace(/<[^>]*>/g, ' '));
          if (title && link && !found.some(x => x.original_url === link)) {
            found.push({
              id: link,
              title,
              description: '',
              school: '',
              location: '',
              country: '',
              city: '',
              source: 'HTML',
              posting_date: new Date().toISOString(),
              application_deadline: null,
              original_url: link,
              apply_url: link,
              category: ''
            });
          }
          if (found.length >= 100) break;
        }
        jobs.push(...found);
        notes.push(`The PIE Jobs (HTML fallback): ${found.length}`);
      } catch (e) {
        notes.push(`The PIE Jobs (HTML fallback): ERROR ${e?.message || e}`);
      }
    }

    // ---------- 4) DEDUPE ----------
    const map = new Map();
    for (const j of jobs) {
      const key = (j.original_url || j.apply_url || j.id || '').toString().trim();
      if (!key) continue;
      if (!map.has(key)) map.set(key, j);
    }
    const merged = [...map.values()].slice(0, 500);

    // Debug view
    if (debug) {
      return {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ counts: notes, total: merged.length, items: merged }, null, 2)
      };
    }

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(merged)
    };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
};




