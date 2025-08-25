const API_ENDPOINT = '/.netlify/functions/fetch_jobs';

const dom = {
  container: document.getElementById('jobsContainer'),
  statCount: document.getElementById('statCount'),
  statUpdated: document.getElementById('statUpdated'),
  statNext: document.getElementById('statNext'),
  emptyState: document.getElementById('emptyState'),
};

function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function createJobCard(job) {
  const card = document.createElement('div');
  card.className = 'card';

  card.innerHTML = `
    <h3>${job.title || 'Untitled Position'}</h3>
    <p class="muted">${job.school || 'Unknown School'} · ${job.location || 'Unknown Location'}</p>
    <p>${job.description?.slice(0, 200) || ''}</p>
    <p class="muted small">
      ${job.category || '—'} · ${job.experience || '—'} · 
      Posted: ${job.posted ? formatDate(job.posted) : '—'} · 
      Deadline: ${job.deadline ? formatDate(job.deadline) : '—'}
    </p>
    <a class="btn btn-outline" href="${job.url || '#'}" target="_blank">Details</a>
  `;
  return card;
}

async function loadJobs() {
  dom.container.innerHTML = '';
  dom.statCount.textContent = 'Loading...';

  try {
    const res = await fetch(`${API_ENDPOINT}?debug=1`);
    const data = await res.json();

    const jobs = Array.isArray(data.jobs) ? data.jobs : [];

    if (jobs.length === 0) {
      dom.emptyState.classList.remove('hidden');
      dom.statCount.textContent = '0 jobs';
      dom.statUpdated.textContent = 'Updated: —';
      dom.statNext.textContent = 'Next check: —';
      return;
    }

    dom.emptyState.classList.add('hidden');
    jobs.forEach(job => {
      const card = createJobCard(job);
      dom.container.appendChild(card);
    });

    dom.statCount.textContent = `${jobs.length} job${jobs.length !== 1 ? 's' : ''}`;
    dom.statUpdated.textContent = `Updated: ${formatDate(data.updated)}`;
    dom.statNext.textContent = `Next check: ${formatDate(data.nextCheck)}`;

  } catch (error) {
    console.error('Fetch error:', error);
    dom.container.innerHTML = '';
    dom.emptyState.classList.remove('hidden');
    dom.statCount.textContent = 'Error loading jobs.';
    dom.statUpdated.textContent = 'Updated: —';
    dom.statNext.textContent = 'Next check: —';
  }
}

loadJobs();







