const Parser = require('rss-parser');
const parser = new Parser({
  timeout: 5000,
});

const RSS_FEEDS = [
  'https://academicpositions.com/jobs.rss',
  'https://www.jobs.ac.uk/search/?q=international+student+recruitment&sort=1&rss=1',
  'https://careers.insidehighered.com/jobsrss/?keywords=asia+education',
  'https://www.timeshighereducation.com/unijobs/rss/?keywords=asia+education',
  'https://www.schrole.com/rss/jobs',
  'https://rss.jobsearch.monster.com/rssquery.ashx?q=international+education&where=Asia&rad=20&rad_units=miles&cy=US&pp=25&sort=rv.di.dt',
];

// Helper to fetch and parse all feeds safely
async function fetchAllFeeds() {
  const jobs = [];

  for (const url of RSS_FEEDS) {
    try {
      const feed = await parser.parseURL(url);
      feed.items.forEach(item => {
        jobs.push({
          title: item.title || '',
          link: item.link || '',
          content: item.contentSnippet || '',
          pubDate: item.pubDate || '',
          source: feed.title || '',
        });
      });
    } catch (err) {
      console.error(`❌ Failed to fetch ${url}:`, err.message);
    }
  }

  return jobs;
}

exports.handler = async function (event, context) {
  try {
    const jobs = await fetchAllFeeds();

    if (!jobs.length) {
      console.warn("⚠️ No jobs fetched from RSS feeds.");
    }

    return {
      statusCode: 200,
      body: JSON.stringify(jobs),
    };
  } catch (err) {
    console.error('❌ Error in fetch_jobs:', err.message);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to load jobs' }),
    };
  }
};








