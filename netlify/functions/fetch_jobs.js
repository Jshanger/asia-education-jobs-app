const Parser = require('rss-parser');
const parser = new Parser();

// Replace with a few reliable URLs to begin with.
const urls = [
  'https://www.jobs.ac.uk/search/?format=rss&keywords=asia%20education',
  'https://www.jobs.ac.uk/search/?format=rss&keywords=china%20education'
];

const TIMEOUT = 5000; // ms per feed

function fetchWithTimeout(url, timeout = TIMEOUT) {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const id = setTimeout(() => {
      controller.abort();
      reject(new Error('Timeout'));
    }, timeout);

    fetch(url, { signal: controller.signal })
      .then(res => res.text())
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(id));
  });
}

exports.handler = async function () {
  const jobs = [];

  for (const url of urls) {
    try {
      const xml = await fetchWithTimeout(url);
      const feed = await parser.parseString(xml);
      feed.items.forEach(item => {
        jobs.push({
          title: item.title,
          url: item.link,
          description: item.contentSnippet || '',
          posted: item.pubDate || '',
          source: url
        });
      });
    } catch (err) {
      console.warn(`Failed to fetch ${url}:`, err.message);
    }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jobs,
      updated: new Date().toISOString(),
      nextCheck: new Date(Date.now() + 1000 * 60 * 60).toISOString()
    })
  };
};









