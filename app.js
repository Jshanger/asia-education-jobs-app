// ---------- helpers ----------
function mergeDedup(existing, incoming) {
  const toKey = (j) => (j?.original_url || j?.apply_url || j?.id || '').toString().trim();
  const map = new Map(existing.map(j => [toKey(j), j]));
  (incoming || []).forEach(j => { const k = toKey(j); if (k && !map.has(k)) map.set(k, j); });
  return [...map.values()].sort((a,b)=>(new Date(b.posting_date)-new Date(a.posting_date)));
}

// strip tags/entities; collapse whitespace
function cleanText(html) {
  if (!html) return '';
  let t = String(html)
    .replace(/<[^>]*>/g, ' ')                // remove HTML tags
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#\d+;|&[a-z]+;/gi, ' ')       // other entities → space
    .replace(/\s+/g, ' ')
    .trim();
  return t;
}

// keep only meaningful descriptions; trim to 280 chars
function sanitizeDesc(s) {
  const t = cleanText(s);
  if (!t || t.length < 10 || /^[\.\-–—•·]+$/.test(t)) return '';
  return t.length > 280 ? t.slice(0, 277) + '…' : t;
}

// sometimes titles look like "UNIVERSITY: Role" → infer school if missing
function enrichFromTitle(job) {
  if (!job.school && job.title && job.title.includes(':')) {
    const [left, ...rest] = job.title.split(':');
    const leftTrim = left.trim();
    if (leftTrim.length > 3 && leftTrim === leftTrim.toUpperCase()) {
      job.school = leftTrim;
      job.title = rest.join(':').trim() || job.title;
    }
  }
  return job;
}

class JobApp {
  constructor() {
    this.jobs = [];
    this.filteredJobs = [];
    this.lastUpdate = null;
    this.nextUpdate = null;

    this.$container   = document.getElementById('jobsContainer');
    this.$empty       = document.getElementById('emptyState');
    this.$statCount   = document.getElementById('statCount');
    this.$statUpdated = document.getElementById('statUpdated');
    this.$statNext    = document.getElementById('statNext');

    this.$search   = document.getElementById('searchInput');
    this.$country  = document.getElementById('countryFilter');
    this.$category = document.getElementById('categoryFilter');
    this.$sort     = document.getElementById('sortBy');

    this.$modal      = document.getElementById('jobModal');
    this.$closeModal = document.getElementById('closeModal');
    this.$modalTitle = document.getElementById('modalJobTitle');
    this.$modalMeta  = this.$modal?.querySelector('.muted') || null;
    this.$modalSchool= document.getElementById('modalJobSchool');
    this.$modalLoc   = document.getElementById('modalJobLocation');
    this.$modalDesc  = document.getElementById('modalJobDescription');
    this.$viewBtn    = document.getElementById('viewPostingBtn');
    this.$applyBtn   = document.getElementById('applyJobBtn');

    this.bindEvents();
    this.init();
  }

  bindEvents() {
    const apply = () => { this.applyFilters(); this.renderJobs(); };
    this.$search?.addEventListener('input', apply);
    this.$country?.addEventListener('change', apply);
    this.$category?.addEventListener('change', apply);
    this.$sort?.addEventListener('change', apply);
    this.$closeModal?.addEventListener('click', () => this.hideModal());
    this.$modal?.addEventListener('click', (e) => { if (e.target === this.$modal) this.hideModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.hideModal(); });
  }

  async init() {
    await this.loadRealJobData();
    await this.loadFromFunction();
    this.applyFilters();
    this.populateFilters();
    this.renderJobs();
    this.updateStats();
  }

  async loadRealJobData() {
    try {
      const safeFetch = async (p) => {
        const r = await fetch(p, { cache: 'no-store' });
        if (!r.ok) throw new Error(`${p} ${r.status}`);
        return r.json();
      };
      const [db1, db2] = await Promise.allSettled([
        safeFetch('real_asia_education_jobs.json'),
        safeFetch('asia_education_jobs_database.json'),
      ]);

      const arr1 = db1.status === 'fulfilled' ? (Array.isArray(db1.value) ? db1.value : []) : [];
      const arr2raw = db2.status === 'fulfilled' ? db2.value : null;
      const arr2 = Array.isArray(arr2raw?.jobs) ? arr2raw.jobs : Array.isArray(arr2raw) ? arr2raw : [];

      const coerceDate = (d) => (d ? new Date(d) : null);

      const merged = [...arr1, ...arr2].map(j => {
        const job = {
          ...j,
          posting_date: j.posting_date instanceof Date ? j.posting_date : coerceDate(j.posting_date),
          application_deadline: j.application_deadline instanceof Date ? j.application_deadline : coerceDate(j.application_deadline),
          country: j.country || j.location || '',
          id: j.id || (j.original_url || j.apply_url),
          description: sanitizeDesc(j.description)
        };
        return enrichFromTitle(job);
      }).filter(j => j?.title && (j?.original_url || j?.apply_url));

      this.jobs = merged.sort((a,b)=> (b.posting_date?.getTime?.()||0) - (a.posting_date?.getTime?.()||0));
      this.lastUpdate = new Date();
      this.nextUpdate = new Date(Date.now() + 6*60*60*1000);
    } catch (err) {
      console.error('Error loading job data:', err);
      this.jobs = [];
    }
  }

  async loadFromFunction() {
    try {
      const res = await fetch('/.netlify/functions/fetch_jobs', { cache: 'no-store' });
      if (!res.ok) throw new Error(`Function error ${res.status}`);
      const live = await res.json();

      const cleaned = (live || []).map(j => enrichFromTitle({
        ...j,
        posting_date: j.posting_date ? new Date(j.posting_date) : null,
        application_deadline: j.application_deadline ? new Date(j.application_deadline) : null,
        description: sanitizeDesc(j.description),
        country: j.country || j.location || ''
      }));

      this.jobs = mergeDedup(this.jobs, cleaned);
    } catch (e) {
      console.warn('Could not fetch live jobs:', e.message);
    }
  }

  populateFilters() {
    const uniq = (a) => [...new Set(a.filter(Boolean))].sort((x,y)=>x.localeCompare(y));
    const countries = uniq(this.jobs.map(j => j.country));
    const categories = uniq(this.jobs.map(j => j.category));
    if (this.$country)  this.$country.innerHTML  = '<option value="">All countries</option>' + countries.map(c=>`<option>${c}</option>`).join('');
    if (this.$category) this.$category.innerHTML = '<option value="">All categories</option>' + categories.map(c=>`<option>${c}</option>`).join('');
  }

  applyFilters() {
    const q=(this.$search?.value||'').trim().toLowerCase(), ctry=this.$country?.value||'', cat=this.$category?.value||'', sort=this.$sort?.value||'date_desc';
    this.filteredJobs = this.jobs.filter(j=>{
      const blob=[j.title,j.school,j.location,j.country,j.city,j.category].join(' ').toLowerCase();
      return (!q||blob.includes(q)) && (!ctry||j.country===ctry) && (!cat||j.category===cat);
    });
    const byDate=(a,b)=>(a.posting_date?.getTime?.()||0)-(b.posting_date?.getTime?.()||0);
    if (sort==='date_asc') this.filteredJobs.sort(byDate);
    else if (sort==='title_asc') this.filteredJobs.sort((a,b)=>(a.title||'').localeCompare(b.title||'')); 
    else this.filteredJobs.sort((a,b)=>byDate(b,a));
  }

  renderJobs() {
    const c=this.$container; if (!c) return; c.innerHTML='';
    if (this.filteredJobs.length===0){ this.$empty?.classList.remove('hidden'); this.updateStats(); return; }
    this.$empty?.classList.add('hidden');
    const fmt=(d)=>d?new Date(d).toLocaleDateString():'—';

    this.filteredJobs.forEach(job=>{
      const viewUrl=job.original_url||job.apply_url||'#';
      const applyUrl=job.apply_url||job.original_url||'#';
      const card=document.createElement('div'); card.className='job-card';
      card.innerHTML=`
        <div class="job-card-header">
          <h3 class="job-title">${job.title || 'Untitled role'}</h3>
          <div class="job-meta">
            <span class="job-school">${job.school || ''}</span>
            <span class="job-location"> • ${job.location || job.city || job.country || ''}</span>
          </div>
        </div>
        <div class="job-card-body">
          <p class="job-desc">${job.description || ''}</p>
          <div class="job-fields">
            <span>${job.category || ''}</span>
            <span>${job.experience_level || ''}</span>
            <span>Posted: ${fmt(job.posting_date)}</span>
            <span>Deadline: ${fmt(job.application_deadline)}</span>
          </div>
        </div>
        <div class="job-card-actions">
          <a class="btn btn-secondary" href="${viewUrl}" target="_blank" rel="noopener noreferrer">View posting</a>
          <a class="btn btn-primary" href="${applyUrl}" target="_blank" rel="noopener noreferrer">Apply</a>
          <button class="btn btn-ghost" data-open-modal>Details</button>
        </div>`;
      card.querySelector('[data-open-modal]')?.addEventListener('click',()=>this.openJobModal(job));
      c.appendChild(card);
    });
    this.updateStats();
  }

  openJobModal(job) {
    if (!job) return;
    const viewUrl=job.original_url||job.apply_url||'#';
    const applyUrl=job.apply_url||job.original_url||'#';
    const title=job.title||'Untitled role';
    const school=job.school||'';
    const loc=job.location||job.city||job.country||'';
    const desc=job.description||'No description provided.';

    this.$modalTitle && (this.$modalTitle.textContent=title);
    this.$modalDesc && (this.$modalDesc.textContent=desc);

    if (this.$modalMeta) {
      // find the " · " text node and toggle it based on availability
      let dotNode=null;
      for (const n of this.$modalMeta.childNodes) if (n.nodeType===Node.TEXT_NODE){ dotNode=n; break; }
      if (this.$modalSchool) this.$modalSchool.textContent=school;
      if (this.$modalLoc) this.$modalLoc.textContent=loc;
      if (!school && !loc) {
        this.$modalMeta.style.display='none';
      } else {
        this.$modalMeta.style.display='';
        if (dotNode) dotNode.nodeValue = (school && loc) ? ' · ' : '';
      }
    }

    if (this.$viewBtn)  this.$viewBtn.href=viewUrl;
    if (this.$applyBtn) this.$applyBtn.href=applyUrl;

    this.$modal?.classList.remove('hidden');
    this.$modal?.setAttribute('aria-hidden','false');
  }

  hideModal(){ this.$modal?.classList.add('hidden'); this.$modal?.setAttribute('aria-hidden','true'); }

  updateStats(){
    this.$statCount  && (this.$statCount.textContent  = `${this.filteredJobs.length} job${this.filteredJobs.length===1?'':'s'}`);
    this.$statUpdated&& (this.$statUpdated.textContent= `Updated: ${this.lastUpdate ? this.lastUpdate.toLocaleString() : '—'}`);
    this.$statNext   && (this.$statNext.textContent   = `Next check: ${this.nextUpdate ? this.nextUpdate.toLocaleString() : '—'}`);
  }
}
document.addEventListener('DOMContentLoaded',()=>new JobApp());



