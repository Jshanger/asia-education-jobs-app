// netlify/functions/fetch_jobs.js
export const handler = async () => {
  try {
    // Public RSS sources (edit/expand these as needed and only use feeds that allow it)
    const sources = [
      {
        name: 'Jobs.ac.uk (East Asia recruitment)',
        url: 'https://www.jobs.ac.uk/search/feed?keywords=international%20recruitment%20officer%20asia'
      },
      {
        name: 'WISHlistjobs (Asia search)',
        url: 'https://www.wishlistjobs.com/jobs?search=asia&format=rss'
      }
    ];

    const clean = (s = '') => s.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();
    const pick = (raw, tag) =>
      clean((raw.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i')) || [, ''])[1]);

    const parseRssItems = (xml) => {
      const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)];
      return items.map((m) => {
        const raw = m[1];
        const title = pick(raw, 'title');
        const link = pick(raw, 'link');
        const desc = pick(raw, 'description');
        const pub = pick(raw, 'pubDate');
        return {
          id: link || title,
          title,
          school: '',
          location: '',
          country: '',
          city: '',
          source: 'RSS',
          posting_date: pub ? new Date(pub).toISOString() : new Date().toISOString(),
          application_deadline: null,
          category: 'Teaching',
          experience_level: '',
          description: desc,
          original_url: link,
          apply_url: link
        };
      });
    };

    let jobs = [];
    for (const s of sources) {
      try {
        const res = await fetch(s.url);
        const xml = await res.text();
        jobs.push(...parseRssItems(xml));
      } catch (err) {
        console.error('Source failed:', s.name, err);
      }
    }

    // De-dupe by URL
    const map = new Map();
    for (const j of jobs) {
      const key = j.original_url || j.apply_url || j.id;
      if (!map.has(key)) map.set(key, j);
    }

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify([...map.values()].slice(0, 200))
    };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
};

