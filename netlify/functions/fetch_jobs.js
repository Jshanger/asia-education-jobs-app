// netlify/functions/fetch_jobs.js
export const handler = async (event) => {
  try {
    // Toggle with .../fetch_jobs?debug=1 to see counts per source
    const debug = event?.queryStringParameters?.debug === '1';

    // A broader set of feeds/queries that often return items.
    // Only include feeds that publicly allow RSS consumption.
    const sources = [
      // jobs.ac.uk – several keyword variants
      { name: 'jobs.ac.uk: international recruitment asia', url: 'https://www.jobs.ac.uk/search/feed?keywords=international%20recruitment%20asia' },
      { name: 'jobs.ac.uk: international student recruitment', url: 'https://www.jobs.ac.uk/search/feed?keywords=international%20student%20recruitment' },
      { name: 'jobs.ac.uk: china education', url: 'https://www.jobs.ac.uk/search/feed?keywords=china%20education' },

      // WISHlistjobs – broad search + RSS
      { name: 'WISHlistjobs: asia broad', url: 'https://www.wishlistjobs.com/jobs?search=asia&format=rss' },
      { name: 'WISHlistjobs: international school', url: 'https://www.wishlistjobs.com/jobs?search=international%20school&format=rss' },

      // THE UniJobs – keyword RSS (supports RSS/Atom)
      { name: 'THE UniJobs: China', url: 'https://www.timeshighereducation.com/unijobs/jobsrss/?keywords=china' },
      { name: 'THE UniJobs: Asia', url: 'https://www.timeshighereducation.com/unijobs/jobsrss/?keywords=asia' },

      // Guardian Jobs – “education asia” (often UK-focused but can surface intl roles)
      { name: 'Guardian Jobs: education asia', url: 'https://jobs.theguardian.com/jobsrss/?Keywords=education%20asia' }
    ];

    // Some hosts require a UA; harmless elsewhere.
    const commonFetchOpts = {
      headers: { 'User-Agent': 'Mozilla/5.0 (+https://netlify.com/)' }
    };

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

      // Atom <entry>
      const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)];
      for (const m of entries) {
        const raw = m[1];
        const title = pick(raw, 'title');
        // Atom <link href="...">


