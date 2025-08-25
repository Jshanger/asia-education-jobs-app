// ---------- helpers ----------

// Merge two job arrays and de-dupe by canonical URL/id
function mergeDedup(existing, incoming) {
  const toKey = (j) => (j?.original_url || j?.apply_url || j?.id || '').toString().trim();
  const map = new Map(existing.map(j => [toKey(j), j]));
  (incoming || []).forEach(j => {
    const k = toKey(j);
    if (!k) return;
    if (!map.has(k)) map.set(k, j);
  });
  // newest first
  return [...map.values()].sort((a, b) =>
    (new Date(b.posting_date).getTime() || 0) - (new Date(a.posting_date).getTime() || 0)
  );
}

class JobApp {
  constructor() {
    this.jobs = [];
    this.filteredJobs = [];
    this.lastUpdate = null;
    this.nextUpdate = null;

    // UI refs
    this.$container   = document.getElementById('jobsContainer');
    this.$empty       = document.getElementById('emptyState');
    this.$statCount   = document.getElementById('statCount');
    this.$statUpdated = document.getElementById('statUpdated');
    this.$statNext    = document.getElementById('statNext');

    this.$search   = document.getElementById('searchInput');
    this.$country  = document.getElementById('countryFilter');
    this.$category = document.getElementById('categoryFilter');
    this.$sort     = document.getElementById('sortBy');

    // Modal refs
    this.$modal      = document.getElementById('jobModal');
    this.$closeModal = document.getElementById('closeModal');
    this.$modalTitle = document.getElementById('modalJobTitle');
    this.$modalMeta  = this.$modal?.querySelector('.muted') || null; // the line with school · location
    this.$modalSchool= document.getElementById('modalJobSchool');
    this.$modalLoc   = document.getElementById('modalJobLocation');
    this.$modalDesc  = document.getElementById('modalJobDescription');
    this.$viewBtn    = document.getElementById('viewPostingBtn');
    this.$applyBtn   = document.getElementById('applyJobBtn');

    this.bindEvents();
    this.init();
  }

  bindEvents() {
    const applyFilters = () => { this.applyFilters(); this.renderJobs(); };

    this.$search?.addEventListener('input', applyFilters);
    this.$country?.addEventListener('change', applyFilters);
    this.$category?.addEventListener('change', applyFilters);
    this.$sort?.addEventListener('change', applyFilters);

    this.$closeModal?.addEventListener('click', () => this.hideModal());
    this.$modal?.addEventListener('click', (e) => {
      if (e.target === this.$modal) this.hideModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.hideModal();
    });
  }

  async init() {
    await this.loadRealJobData();    // from repo JSONs
    await this.loadFromFunction();   // from Netlify function (RSS)
    this.applyFilters();
    this.populateFilters();
    this.renderJobs();
    this.updateStats();
  }

  // ---------- data loaders ----------

  async loadRealJobData() {
    try {
      const safeFetch = async (path) => {
        const res = await fetch(path, { cache: 'no-store' });
        if (!res.ok) throw new Error(`${path} ${res.status}`);
        return res.json();
      };

      const [db1, db2] = await Promise.allSettled([
        safeFetch('real_asia_education_jobs.json'),
        safeFetch('asia_education_jobs_database.json'),
      ]);

      const arr1 = db1.status === 'fulfilled'
        ? (Array.isArray(db1.value) ? db1.value : [])
        : [];

      // db2 could be { jobs:[...] } or already an array
      const arr2raw = db2.status === 'fulfilled' ? db2.value : null;
      const arr2 = Array.isArray(arr2raw?.jobs) ? arr2raw.jobs
                : Array.isArray(arr2raw) ? arr2raw
                : [];

      // merge + basic normalization
      const map = new Map();
      const ingest = (job) => {
        if (!job) return;
        const key = ((job.original_url || job.apply_url || job.id || '').toString().trim()) ||
                    Math.random().toString(36);
        if (!map.has(key)) map.set(key, job);
      };
      [...arr1, ...arr2].forEach(ingest);

      const toDate = (d) => d ? new Date(d) : null;
      this.jobs = [...map.values()]
        .filter(j => j?.title && (j?.original_url || j?.apply_url))
        .map(j => ({
          ...j,
          posting_date: j.posting_date instanceof Date ? j.posting_date : toDate(j.posting_date),
          application_deadline: j.application_deadline instanceof Date ? j.application_deadline : toDate(j.application_deadline),
          country: j.country || j.location || '',
          id: j.id || (j.original_url || j.apply_url)
        }))
        .sort((a,b)=> (b.posting_date?.getTime?.()||0) - (a.posting_date?.getTime?.()||0));

      this.lastUpdate = new Date();
      this.nextUpdate = new Date(Date.now() + 6*60*60*1000);
    } catch (err) {
      console.error('Error loading job data:', err);
      this.jobs = [];
    }
  }

  // Pull live jobs from serverless function and merge
  async loadFromFunction() {
    try {
      const res = await fetch('/.netlify/functions/fetch_jobs', { cache: 'no-store' });
      if (!res.ok) throw new Error(`Function error ${res.status}`);
      const live = await res.json();

      // normalize dates
      (live || []).forEach(j => {
        j.posting_date = j.posting_date ? new Date(j.posting_date) : null;
        j.application_deadline = j.application_deadline ? new Date(j.application_deadline) : null;
      });

      this.jobs = mergeDedup(this.jobs, live);
    } catch (e) {
      console.warn('Could not fetch live jobs:', e.message);
    }
  }

  // ---------- filters / render ----------

  populateFilters() {
    const uniq = (arr) => [...new Set(arr.filter(Boolean))].sort((a,b)=>a.localeCompare(b));
    const countries = uniq(this.jobs.map(j => j.country));
    const categories = uniq(this.jobs.map(j => j.category));

    if (this.$country)
      this.$country.innerHTML = '<option value="">All countries</option>' +
        countries.map(c=>`<option value="${c}">${c}</option>`).join('');

    if (this.$category)
      this.$category.innerHTML = '<option value="">All categories</option>' +
        categories.map(c=>`<option value="${c}">${c}</option>`).join('');
  }

  applyFilters() {
    const q    = (this.$search?.value || '').trim().toLowerCase();
    const ctry = this.$country?.value || '';
    const cat  = this.$category?.value || '';
    const sort = this.$sort?.value || 'date_desc';

    this.filteredJobs = this.jobs.filter(j => {
      const blob = [j.title,j.school,j.location,j.country,j.city,j.category].join(' ').toLowerCase();
      const matchQ   = !q || blob.includes(q);
      const matchC   = !ctry || j.country === ctry;
      const matchCat = !cat || j.category === cat;
      return matchQ && matchC && matchCat;
    });

    const byDate = (a,b) => (a.posting_date?.getTime?.()||0) - (b.posting_date?.getTime?.()||0);
    if (sort === 'date_asc') this.filteredJobs.sort(byDate);
    else if (sort === 'title_asc') this.filteredJobs.sort((a,b)=> (a.title||'').localeCompare(b.title||'')); 
    else this.filteredJobs.sort((a,b)=> byDate(b,a)); // newest
  }

  renderJobs() {
    const c = this.$container;
    if (!c) return;
    c.innerHTML = '';

    if (this.filteredJobs.length === 0) {
      this.$empty?.classList.remove('hidden');
      this.updateStats();
      return;
    }
    this.$empty?.classList.add('hidden');

    const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '—';

    this.filteredJobs.forEach(job => {
      const card = document.createElement('div');
      card.className = 'job-card';

      const viewUrl  = job.original_url || job.apply_url || '#';
      const applyUrl = job.apply_url   || job.original_url || '#';

      card.innerHTML = `
        <div class="job-card-header">
          <h3 class="job-title">${job.title || 'Untitled role'}</h3>
          <div class="job-meta">
            <span class="job-school">${job.school || ''}</span>
            <span class="job-location"> • ${job.location || job.city || job.country || ''}</span>
          </div>
        </div>
        <div class="job-card-body">
          <p class="job-desc">${job.description ? job.description : ''}</p>
          <div class="job-fields">
            <span>${job.category || ''}</span>
            <span>${job.experience_level || ''}</span>
            <span>Posted: ${fmtDate(job.posting_date)}</span>
            <span>Deadline: ${fmtDate(job.application_deadline)}</span>
          </div>
        </div>
        <div class="job-card-actions">
          <a class="btn btn-secondary" href="${viewUrl}" target="_blank" rel="noopener noreferrer">View posting</a>
          <a class="btn btn-primary" href="${applyUrl}" target="_blank" rel="noopener noreferrer">Apply</a>
          <button class="btn btn-ghost" data-open-modal>Details</button>
        </div>
      `;

      card.querySelector('[data-open-modal]')?.addEventListener('click', () => this.openJobModal(job));
      c.appendChild(card);
    });

    this.updateStats();
  }

  // ---------- modal ----------

  openJobModal(job) {
    if (!job || typeof job !== 'object') {
      console.warn('openJobModal called with bad job:', job);
      return;
    }

    const viewUrl  = job.original_url || job.apply_url || '#';
    const applyUrl = job.apply_url   || job.original_url || '#';
    const title    = job.title || 'Untitled role';
    const school   = job.school || '';
    const loc      = job.location || job.city || job.country || '';
    const desc     = (job.description && job.description.trim()) ? job.description : 'No description provided.';

    // Title & description
    if (this.$modalTitle) this.$modalTitle.textContent = title;
    if (this.$modalDesc)  this.$modalDesc.textContent  = desc;

    // School / location line:
    // show nothing when both empty; show only the available one; show dot only if both exist
    if (this.$modalMeta) {
      // find the text node that holds " · " and toggle it
      let dotNode = null;
      for (const n of this.$modalMeta.childNodes) {
        if (n.nodeType === Node.TEXT_NODE) { dotNode = n; break; }
      }
      if (this.$modalSchool) this.$modalSchool.textContent = school;
      if (this.$modalLoc)    this.$modalLoc.textContent    = loc;

      if (!school && !loc) {
        this.$modalMeta.style.display = 'none';
      } else {
        this.$modalMeta.style.display = '';
        if (dotNode) dotNode.nodeValue = (school && loc) ? ' · ' : '';
      }
    }

    // Buttons
    if (this.$viewBtn)  this.$viewBtn.href  = viewUrl;
    if (this.$applyBtn) this.$applyBtn.href = applyUrl;

    // Show modal
    this.$modal?.classList.remove('hidden');
    this.$modal?.setAttribute('aria-hidden', 'false');

    // Debug
    console.debug('Opened job modal:', { title, school, loc, viewUrl, applyUrl });
  }

  hideModal() {
    this.$modal?.classList.add('hidden');
    this.$modal?.setAttribute('aria-hidden', 'true');
  }

  // ---------- stats ----------

  updateStats() {
    if (this.$statCount)  this.$statCount.textContent  = `${this.filteredJobs.length} job${this.filteredJobs.length===1?'':'s'}`;
    if (this.$statUpdated)this.$statUpdated.textContent= `Updated: ${this.lastUpdate ? this.lastUpdate.toLocaleString() : '—'}`;
    if (this.$statNext)   this.$statNext.textContent   = `Next check: ${this.nextUpdate ? this.nextUpdate.toLocaleString() : '—'}`;
  }
}

// boot
document.addEventListener('DOMContentLoaded', () => new JobApp());


