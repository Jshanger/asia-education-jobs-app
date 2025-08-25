// app.js — Updated to support more reliable job loading from new fetch_jobs endpoint

const API_ENDPOINT = '/.netlify/functions/fetch_jobs';

async function fetchJobs() {
  const countEl = document.getElementById('statCount');
  const updatedEl = document.getElementById('statUpdated');
  const nextCheckEl = document.getElementById('statNext');
  const jobsContainer = document.getElementById('jobsContainer');
  const emptyState = document.getElementById('emptyState');

  try {
    const response = await fetch(`${API_ENDPOINT}?debug=1`);
    if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);

    const data = await response.json();
    const jobs = data.jobs || [];

    // Show stats
    countEl.textContent = `${jobs.length} jobs`;
    updatedEl.textContent = `Updated: ${formatDateTime(data.lastUpdated)}`;
    nextCheckEl.textContent = `Next check: ${formatDateTime(data.nextUpdate)}`;

    // Render jobs
    jobsContainer.innerHTML = '';
    emptyState.classList.toggle('hidden', jobs.length > 0);

    jobs.forEach(job => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <h3 class="job-title">${job.title}</h3>
        <p class="muted">${job.school || 'Unknown'} • ${job.location || ''}</p>
        <p>${job.description || ''}</p>
        <p class="muted">${job.category || ''} ${job.level || ''}</p>
        <p class="muted">Posted: ${job.posted || '—'} Deadline: ${job.deadline || '—'}</p>
        <button class="btn btn-outline" onclick="showJobModal(${encodeURIComponent(JSON.stringify(job))})">Details</button>
      `;
      jobsContainer.appendChild(card);
    });
  } catch (err) {
    console.error('Error fetching jobs:', err);
    countEl.textContent = 'Error loading jobs.';
    updatedEl.textContent = 'Updated: —';
    nextCheckEl.textContent = 'Next check: —';
  }
}

function formatDateTime(timestamp) {
  if (!timestamp) return '—';
  const dt = new Date(timestamp);
  return dt.toLocaleString();
}

function showJobModal(encodedJob) {
  const job = JSON.parse(decodeURIComponent(encodedJob));
  document.getElementById('modalJobTitle').textContent = job.title;
  document.getElementById('modalMeta').textContent = `${job.school || ''} • ${job.location || ''}`;
  document.getElementById('modalJobDescription').textContent = job.description || '';
  document.getElementById('viewPostingBtn').href = job.link || '#';
  document.getElementById('applyJobBtn').href = job.link || '#';
  document.getElementById('jobModal').classList.remove('hidden');
}

document.getElementById('closeModal').onclick = () => {
  document.getElementById('jobModal').classList.add('hidden');
};

document.addEventListener('DOMContentLoaded', fetchJobs);








