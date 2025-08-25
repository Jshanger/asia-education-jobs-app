// netlify/functions/fetch_jobs.js
// Fetch public RSS/Atom feeds, normalize to a common job shape, and return JSON.
// Add ?debug=1 to the URL to see per-source counts and total.

export const handler = async (event) => {
  try {
    const debug = event?.queryStringParameters?.debug === '1';

    // 🔎 Feeds that publicly expose RSS/Atom (no scraping).
    // Feel free to add/remove sources as needed.
    const sources = [
      // jobs.ac.uk – several variants
      { name: 'jobs.ac.uk: international recruitment asia', url: 'https://www.jobs.ac.uk/search/feed?keywords=international%20recruitment%20asia' },
      { name: 'jobs.ac.uk: international student recruitment', url: 'https://www.jobs.ac.uk/search/feed?keywords=international%20student%20recruitment' },
      { name: 'jobs.ac.uk: china education', url: 'https://www.jobs.ac.uk/search/feed?keywords=china%20education' },

      // ✅ your requested additions
      { name: 'jobs.ac.uk: china', url: 'https://www.jobs.ac.uk/search/feed?keywords=china' },
      { name: 'jobs.ac.uk: hong kong', url: 'https://www.jobs.ac.uk/search/feed?keywords=hong%20kong' },

      // WISHlistjobs
      { name: 'WISHlistjobs: asia broad', url: 'https://www.wishlistjobs.com/jobs?search=asia&format=rss' },
      { name: 'WISHlistjobs: international school', url: 'https://www.wishlistjobs.com/jobs?search=international%20school&format=rss' },
      // ✅ your requested addition
      { name: 'WISHlistjobs: china', url: 'https://www.wishlistjobs.com/jobs?search=china&format=rss' },

      // THE UniJobs (Times Higher Education)
      { name: 'THE UniJobs: China', url: 'https://www.timeshighereducation.com/unijobs/jobsrss/?keywords=china' },
      { name: 'THE UniJobs: Asia', url: 'https://www.timeshighereducation.com/unijobs/jobsrss/?keywords=asia' },
      // ✅ your requested addition
      { name: 'THE UniJobs: Hong Kong', url: 'https://www.timeshighereducation.com/unijobs/jobsrss/?keywords=hong+kong' },

      // Guardian Jobs (broad; often UK-based but can show intl roles)
      { name: 'Guardian Jobs: education asia', url: 'https://jobs.theguardian.com/jobsrss/?Keywords=education%20asia' }
    ];

    // Some hosts prefer a UA header
    const fetchOpts = { headers: { 'User-Agent': 'Mozilla/5.0 (+https://netlify.com/)' } };

    const clean = (s = '') => s.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();
    const pick = (raw, tag) =>
      clean((raw.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i')) || [, ''])[1]);

    // Parse both RSS <item> and Atom <entry>
    const parseRssOrAtom = (xml) => {
      const out = [];

      // RSS items
      const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)];
      for (const m of items) {
        const raw = m[1];
        const title = pick(raw, 'title');
        const link = pick(raw, 'link') || pick(raw, 'guid');
        const desc = pick(raw, 'description') || pick(raw, 'content:encoded');
        const pub = pick(raw, 'pubDate') || pick(raw, 'date');
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

      // Atom entries
      const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)];
      for (const m of entries) {
        const raw = m[1];
        const title = pick(raw, 'title');
        const linkHref = (raw.match(/<link[^>]*href="([^"]+)"/i) || [, ''])[1];
        const desc = pick(raw, 'summary') || pick(raw, 'content');
        const pub = pick(raw, 'updated') || pick(raw, 'published');
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

    let jobs = [];
    const notes = [];

    for (const s of sources) {
      try {
        const res = await fetch(s.url, fetchOpts);
        const xml = await res.text();
        const parsed = parseRssOrAtom(xml);
        jobs.push(...parsed);
        notes.push(`${s.name}: ${parsed.length}`);
      } catch (err) {
        notes.push(`${s.name}: ERROR ${err?.message || err}`);
      }
    }

    // De-dupe by canonical URL (or id)
    const map = new Map();
    for (const j of jobs) {
      const key = (j.original_url || j.apply_url || j.id || '').toString().trim();
      if (!key) continue;
      if (!map.has(key)) map.set(key, j);
    }
    const merged = [...map.values()].slice(0, 300);

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



