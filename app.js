const API_ENDPOINT = '/.netlify/functions/fetch_jobs';

async function fetchJobs(debug = false) {
  try {
    const url = debug ? `${API_ENDPOINT}?debug=1` : API_ENDPOINT;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error('Invalid jobs format from API');
    }

    return data;
  } catch (error) {
    console.error('Error fetching jobs:', error);
    document.getElementById('jobs-container').innerHTML = `<p style="color:red;">Error loading jobs. ${error.message}</p>`;
    return [];
  }
}

function renderJobs(jobs) {
  const container = document.getElementById('jobs-container');
  container.innerHTML = '';

  if (jobs.length === 0) {
    container.innerHTML = '<p>No jobs found.</p>';
    return;
  }

  jobs.forEach(job => {
    const jobCard = document.createElement('div');
    jobCard.classList.add('job-card');

    jobCard.innerHTML = `
      <h3>${job.title}</h3>
      <p><strong>${job.school}</strong> &bullet; ${job.city || job.location || ''}</p>
      <p>${job.description?.slice(0, 200) || ''}</p>
      <p><small>Posted: ${new Date(job.posting_date).toLocaleDateString()}</small></p>
      <a href="${job.original_url}" target="_blank" class="details-button">Details</a>
    `;

    container.appendChild(jobCard);
  });
}

// Init on load
document.addEventListener('DOMContentLoaded', async () => {
  const jobs = await fetchJobs(); // use `fetchJobs(true)` for debug mode
  renderJobs(jobs);
});






