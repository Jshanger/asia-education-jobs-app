/* =========================================
   CURATED ASIA COUNTRIES + CATEGORIES
   ========================================= */

// Region lists (used to build <optgroup>s)
const NEA = ['China','Hong Kong SAR','Macao SAR','Taiwan','Japan','South Korea','North Korea','Mongolia'];
const SEA = ['Brunei','Cambodia','Indonesia','Laos','Malaysia','Myanmar','Philippines','Singapore','Thailand','Timor-Leste','Vietnam'];
const SOUTH_ASIA = ['India','Pakistan','Bangladesh','Sri Lanka','Nepal','Bhutan','Maldives','Afghanistan'];
const CENTRAL_ASIA = ['Kazakhstan','Uzbekistan','Kyrgyzstan','Tajikistan','Turkmenistan'];
const WEST_ASIA = [
  'United Arab Emirates','Saudi Arabia','Qatar','Oman','Bahrain','Kuwait',
  'Jordan','Lebanon','Israel','Palestine','Iran','Iraq','Turkey','Syria','Yemen',
  'Georgia','Armenia','Azerbaijan'
];

const COUNTRY_GROUPS = [
  { label: 'Northeast Asia', items: NEA },
  { label: 'Southeast Asia', items: SEA },
  { label: 'South Asia', items: SOUTH_ASIA },
  { label: 'Central Asia', items: CENTRAL_ASIA },
  { label: 'West Asia / Middle East', items: WEST_ASIA },
];

const ALL_CURATED_COUNTRIES = COUNTRY_GROUPS.flatMap(g => g.items);

// Patterns to normalise country strings from feeds/locations
const COUNTRY_PATTERNS = [
  { re: /hong\s*kong/i,               name: 'Hong Kong SAR' },
  { re: /macau|macao/i,               name: 'Maco SAR' }, // typo fixed in normalizeCountry
  { re: /\bmacau\b|\bmacao\b/i,       name: 'Macao SAR' },
  { re: /\bchina\b|prc|mainland/i,    name: 'China' },
  { re: /taiwan/i,                    name: 'Taiwan' },
  { re: /japan/i,                     name: 'Japan' },
  { re: /south\s*korea|republic.*korea|\bkorea\b(?!.*north)/i, name: 'South Korea' },
  { re: /north\s*korea|dprk/i,        name: 'North Korea' },
  { re: /mongolia/i,                  name: 'Mongolia' },

  { re: /brunei/i,                    name: 'Brunei' },
  { re: /cambodia|kampuchea/i,        name: 'Cambodia' },
  { re: /indonesia/i,                 name: 'Indonesia' },
  { re: /\blaos\b|lao\s?pdr/i,        name: 'Laos' },
  { re: /malaysia/i,                  name: 'Malaysia' },
  { re: /myanmar|burma/i,             name: 'Myanmar' },
  { re: /philippines/i,               name: 'Philippines' },
  { re: /singapore/i,                 name: 'Singapore' },
  { re: /thailand/i,                  name: 'Thailand' },
  { re: /timor[-\s]?leste|east\s*timor/i, name: 'Timor-Leste' },
  { re: /viet\s*nam|vietnam/i,        name: 'Vietnam' },

  { re: /\bindia\b/i,                 name: 'India' },
  { re: /pakistan/i,                  name: 'Pakistan' },
  { re: /bangladesh/i,                name: 'Bangladesh' },
  { re: /sri\s*-?\s*lanka/i,          name: 'Sri Lanka' },
  { re: /nepal/i,                     name: 'Nepal' },
  { re: /bhutan/i,                    name: 'Bhutan' },
  { re: /maldives/i,                  name: 'Maldives' },
  { re: /afghanistan/i,               name: 'Afghanistan' },

  { re: /kazakhstan/i,                name: 'Kazakhstan' },
  { re: /uzbekistan/i,                name: 'Uzbekistan' },
  { re: /kyrgyzstan|kirghiz/i,        name: 'Kyrgyzstan' },
  { re: /tajikistan/i,                name: 'Tajikistan' },
  { re: /turkmenistan/i,              name: 'Turkmenistan' },

  { re: /\buae\b|united\s*arab\s*emirates/i,  name: 'United Arab Emirates' },
  { re: /\bksa\b|saudi\s*arabia/i,            name: 'Saudi Arabia' },
  { re: /qatar/i,                              name: 'Qatar' },
  { re: /oman/i,                               name: 'Oman' },
  { re: /bahrain/i,                            name: 'Bahrain' },
  { re: /kuwait/i,                             name: 'Kuwait' },
  { re: /jordan/i,                             name: 'Jordan' },
  { re: /lebanon/i,                            name: 'Lebanon' },
  { re: /israel/i,                             name: 'Israel' },
  { re: /palestin(e|ian)/i,                    name: 'Palestine' },
  { re: /iran/i,                               name: 'Iran' },
  { re: /iraq/i,                               name: 'Iraq' },
  { re: /turkiye|türkiye|turkey/i,             name: 'Turkey' },
  { re: /syria/i,                              name: 'Syria' },
  { re: /yemen/i,                              name: 'Yemen' },
  { re: /georgia(?!\s*state)/i,                name: 'Georgia' },
  { re: /armenia/i,                            name: 'Armenia' },
  { re: /azerbaijan/i,                         name: 'Azerbaijan' },
];

// Categories (curated) with grouping
const CATEGORY_GROUPS = [
  { label: 'Teaching & Academic', items: [
    'Early Years Teaching','Primary Teaching','Secondary Teaching','IB (PYP/MYP/DP)','IGCSE','EAL / ESL',
    'K-12 Leadership','University Faculty','University Professional','Research'
  ]},
  { label: 'International & Recruitment', items: [
    'Senior Management','International Office','Recruitment & Admissions','Student Recruitment',
    'Agent Relations','TNE / Partnerships','Sales / Partnerships','Business Development',
    'Alumni & Advancement','Global Mobility / Study Abroad'
  ]},
  { label: 'Student Support & Services', items: [
    'Student Services & Welfare','Counselling / Pastoral','Career Services / Employability',
    'Scholarships / Financial Aid'
  ]},
  { label: 'Exams & Learning Support', items: [
    'Exams & Assessment','Test Centre / IELTS','Library / Learning Resources'
  ]},
  { label: 'Operations & Enablers', items: [
    'Program / Project Management','Admin & Operations','Finance','HR','IT / EdTech',
    'Quality Assurance / Compliance','Data & CRM / Analytics','Marketing & Communications',
    'Digital Marketing','Events'
  ]},
];
const ALL_CURATED_CATEGORIES = CATEGORY_GROUPS.flatMap(g => g.items);

/* =========================================
   HELPERS
   ========================================= */
function mergeDedup(existing, incoming) {
  const toKey = (j) => (j?.original_url || j?.apply_url || j?.id || '').toString().trim();
  const map = new Map(existing.map(j => [toKey(j), j]));
  (incoming || []).forEach(j => { const k = toKey(j); if (k && !map.has(k)) map.set(k, j); });
  return [...map.values()].sort((a,b)=>(new Date(b.posting_date)-new Date(a.posting_date)));
}
function cleanText(html) {
  if (!html) return '';
  return String(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&#\d+;|&[a-z]+;/gi, ' ')
    .replace(/\s+/g,' ').trim();
}
function sanitizeDesc(s) {
  const t = cleanText(s);
  if (!t || t.length < 10 || /^[\.\-–—•·]+$/.test(t)) return '';
  return t.length > 280 ? t.slice(0,277)+'…' : t;
}
function enrichFromTitle(job) {
  if (!job.school && job.title && job.title.includes(':')) {
    const [left, ...rest] = job.title.split(':'); const L = left.trim();
    if (L.length>3 && L===L.toUpperCase()) { job.school=L; job.title=rest.join(':').trim()||job.title; }
  }
  return job;
}
function normalizeCountry(raw) {
  const s = (raw || '').toString();
  for (const m of COUNTRY_PATTERNS) if (m.re.test(s)) return m.name;
  return s.trim();
}
function inferCategoryFromTitle(title='') {
  const t = title.toLowerCase();
  if (/(principal|head of school|headteacher|deputy head|vice principal|dean|provost|director\b(?!.*assistant)|chief)/.test(t)) return 'Senior Management';
  if (/(head of|director of|vp|vice president).*admissions|recruitment|international|marketing|partnerships/.test(t)) return 'Senior Management';
  if (/(head of year|head of department|curriculum lead)/.test(t)) return 'K-12 Leadership';
  if (/(early years|eyfs)/.test(t)) return 'Early Years Teaching';
  if (/(primary|elementary) (teacher|teaching)/.test(t)) return 'Primary Teaching';
  if (/(secondary|high school) (teacher|teaching)/.test(t)) return 'Secondary Teaching';
  if (/\bib\b|pyp|myp|dp/.test(t)) return 'IB (PYP/MYP/DP)';
  if (/\bigcse\b/.test(t)) return 'IGCSE';
  if (/(esl|eal|ell|english language (teacher|instructor))/.test(t)) return 'EAL / ESL';
  if (/(professor|lecturer|assistant professor|associate professor|post-?doc|postdoctoral)/.test(t)) return 'University Faculty';
  if (/(recruitment|admissions|enrol?ment|student recruitment)/.test(t)) return 'Recruitment & Admissions';
  if (/(international (officer|manager|relations|partnerships|engagement)|regional (manager|director)|country (manager|director))/.test(t)) return 'International Office';
  if (/(agent relations|agent manager|channel manager)/.test(t)) return 'Agent Relations';
  if (/(tne|transnational education|articulation|dual degree|joint program|mou|partnerships)/.test(t)) return 'TNE / Partnerships';
  if (/(sales|partnerships|business development|bdm)/.test(t)) return 'Sales / Partnerships';
  if (/(alumni|advancement|fundraising)/.test(t)) return 'Alumni & Advancement';
  if (/(study abroad|global mobility|exchange (program|coordinator))/.test(t)) return 'Global Mobility / Study Abroad';
  if (/(student services|student affairs|welfare|pastoral|wellbeing)/.test(t)) return 'Student Services & Welfare';
  if (/(counsellor|counselor|counselling|counseling|psycholog)/.test(t)) return 'Counselling / Pastoral';
  if (/(career services|careers advisor|employability)/.test(t)) return 'Career Services / Employability';
  if (/(scholarship|financial aid|bursary)/.test(t)) return 'Scholarships / Financial Aid';
  if (/(ielts|exams? officer|assessment|invigilator|test( |-)centre|testing)/.test(t)) return 'Exams & Assessment';
  if (/(library|librarian|learning resources)/.test(t)) return 'Library / Learning Resources';
  if (/(project|programme|program) (manager|officer|coordinator)/.test(t)) return 'Program / Project Management';
  if (/(administrator|admin|operations|office manager)/.test(t)) return 'Admin & Operations';
  if (/(finance|accountant|bursar)/.test(t)) return 'Finance';
  if (/(human resources|^hr\b|\shr\b|people partner)/.test(t)) return 'HR';
  if (/(it\b|edtech|systems?|developer|engineer)/.test(t)) return 'IT / EdTech';
  if (/(quality assurance|qa|accreditation|compliance|ukvi|visa)/.test(t)) return 'Quality Assurance / Compliance';
  if (/(crm|salesforce|hubspot|data|analytics|insight|power bi|tableau|sql)/.test(t)) return 'Data & CRM / Analytics';
  if (/(marketing|communications|marcom|brand)/.test(t)) return 'Marketing & Communications';
  if (/(digital marketing|seo|sem|ppc|social media|content|copywriter|graphic|designer|web)/.test(t)) return 'Digital Marketing';
  if (/(events|fair|exhibition|roadshow)/.test(t)) return 'Events';
  if (/(research (assistant|associate)|research fellow)/.test(t)) return 'Research';
  return '';
}

/* =========================================
   APP
   ========================================= */
class JobApp {
  constructor() {
    this.jobs = [];
    this.filteredJobs = [];
    this.lastUpdate = null;
    this.nextUpdate  = null;

    // UI
    this.$container   = document.getElementById('jobsContainer');
    this.$empty       = document.getElementById('emptyState');
    this.$statCount   = document.getElementById('statCount');
    this.$statUpdated = document.getElementById('statUpdated');
    this.$statNext    = document.getElementById('statNext');

    this.$search   = document.getElementById('searchInput');
    this.$country  = document.getElementById('countryFilter');
    this.$category = document.getElementById('categoryFilter');
    this.$sort     = document.getElementById('sortBy');

    // Modal
    this.$modal      = document.getElementById('jobModal');
    this.$closeModal = document.getElementById('closeModal');
    this.$modalTitle = document.getElementById('modalJobTitle');
    this.$modalMeta  = document.getElementById('modalMeta');
    this.$modalDesc  = document.getElementById('modalJobDescription');
    this.$viewBtn    = document.getElementById('viewPostingBtn');
    this.$applyBtn   = document.getElementById('applyJobBtn');

    this.bindEvents();
    this.hideModal();      // safety
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
    await this.loadLocal();
    await this.loadLive();
    this.applyFilters();
    this.populateFilters(); // curated + extras
    this.renderJobs();
    this.updateStats();
  }

  /* -------- data loaders -------- */
  async loadLocal() {
    try {
      const fetchJSON = p => fetch(p,{cache:'no-store'}).then(r=>{ if(!r.ok) throw new Error(`${p} ${r.status}`); return r.json(); });
      const [a,b] = await Promise.allSettled([
        fetchJSON('real_asia_education_jobs.json'),
        fetchJSON('asia_education_jobs_database.json')
      ]);
      const arr1 = a.status==='fulfilled' ? (Array.isArray(a.value)?a.value:[]) : [];
      const raw2 = b.status==='fulfilled' ? b.value : null;
      const arr2 = Array.isArray(raw2?.jobs) ? raw2.jobs : Array.isArray(raw2) ? raw2 : [];

      const toDate = d=>d?new Date(d):null;
      const merged = [...arr1, ...arr2].map(j => {
        const job = enrichFromTitle({
          ...j,
          posting_date: j.posting_date instanceof Date ? j.posting_date : toDate(j.posting_date),
          application_deadline: j.application_deadline instanceof Date ? j.application_deadline : toDate(j.application_deadline),
          original_url: j.original_url || j.apply_url,
          country: normalizeCountry(j.country || j.location || ''),
          id: j.id || (j.original_url || j.apply_url),
          description: sanitizeDesc(j.description),
          category: j.category || inferCategoryFromTitle(j.title || '')
        });
        return job;
      }).filter(j => j?.title && (j?.original_url || j?.apply_url));

      this.jobs = merged.sort((a,b)=>(b.posting_date?.getTime?.()||0)-(a.posting_date?.getTime?.()||0));
      this.lastUpdate=new Date(); this.nextUpdate=new Date(Date.now()+6*60*60*1000);
    } catch (e) { console.error('Local load error',e); this.jobs=[]; }
  }

  async loadLive() {
    try {
      const r = await fetch('/.netlify/functions/fetch_jobs',{cache:'no-store'});
      if(!r.ok) throw new Error(`fn ${r.status}`);
      const live = await r.json();

      const cleaned = (live||[]).map(j => {
        const job = enrichFromTitle({
          ...j,
          posting_date: j.posting_date ? new Date(j.posting_date) : null,
          application_deadline: j.application_deadline ? new Date(j.application_deadline) : null,
          description: sanitizeDesc(j.description),
          country: normalizeCountry(j.country || j.location || ''),
          category: j.category || inferCategoryFromTitle(j.title || '')
        });
        job.original_url = job.original_url || job.apply_url;
        return job;
      });

      this.jobs = mergeDedup(this.jobs, cleaned);
    } catch (e) { console.warn('Live load warn',e.message); }
  }

  /* -------- filters UI -------- */
  populateFilters() {
    // Countries: curated groups FIRST; then extras from data in an "Other (from data)" group
    const fromData = [...new Set(this.jobs.map(j => j.country).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
    const curatedSet = new Set(ALL_CURATED_COUNTRIES);
    const extras = fromData.filter(c => !curatedSet.has(c));

    if (this.$country) {
      this.$country.innerHTML = '';
      const optAll = document.createElement('option');
      optAll.value = ''; optAll.textContent = 'All countries';
      this.$country.appendChild(optAll);

      COUNTRY_GROUPS.forEach(group => {
        const og = document.createElement('optgroup');
        og.label = group.label;
        group.items.forEach(c => {
          const o = document.createElement('option');
          o.value = c; o.textContent = c;
          og.appendChild(o);
        });
        this.$country.appendChild(og);
      });

      if (extras.length) {
        const og = document.createElement('optgroup');
        og.label = 'Other (from data)';
        extras.forEach(c => {
          const o = document.createElement('option');
          o.value = c; o.textContent = c;
          og.appendChild(o);
        });
        this.$country.appendChild(og);
      }
    }

    // Categories: curated + extras
    const catsFromData = [...new Set(this.jobs.map(j => j.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
    const curatedCats = new Set(ALL_CURATED_CATEGORIES);
    const catExtras = catsFromData.filter(c => !curatedCats.has(c));

    if (this.$category) {
      this.$category.innerHTML = '';
      const optAll = document.createElement('option');
      optAll.value = ''; optAll.textContent = 'All categories';
      this.$category.appendChild(optAll);

      CATEGORY_GROUPS.forEach(group => {
        const og = document.createElement('optgroup');
        og.label = group.label;
        group.items.forEach(c => {
          const o = document.createElement('option');
          o.value = c; o.textContent = c;
          og.appendChild(o);
        });
        this.$category.appendChild(og);
      });

      if (catExtras.length) {
        const og = document.createElement('optgroup');
        og.label = 'Other (from data)';
        catExtras.forEach(c => {
          const o = document.createElement('option');
          o.value = c; o.textContent = c;
          og.appendChild(o);
        });
        this.$category.appendChild(og);
      }
    }
  }

  /* -------- filter + render -------- */
  applyFilters() {
    const q=(this.$search?.value||'').trim().toLowerCase(),
          c=this.$country?.value||'',
          cat=this.$category?.value||'',
          sort=this.$sort?.value||'date_desc';

    this.filteredJobs = this.jobs.filter(j=>{
      const blob=[j.title,j.school,j.location,j.country,j.city,j.category].join(' ').toLowerCase();
      const matchQ   = !q   || blob.includes(q);
      const matchC   = !c   || j.country === c;
      const matchCat = !cat || j.category === cat;
      return matchQ && matchC && matchCat;
    });

    const byDate=(a,b)=>(a.posting_date?.getTime?.()||0)-(b.posting_date?.getTime?.()||0);
    if (sort==='date_asc') this.filteredJobs.sort(byDate);
    else if (sort==='title_asc') this.filteredJobs.sort((a,b)=>(a.title||'').localeCompare(b.title||'')); 
    else this.filteredJobs.sort((a,b)=>byDate(b,a));
  }

  renderJobs() {
    const c=this.$container; if(!c) return; c.innerHTML='';
    if(this.filteredJobs.length===0){ this.$empty?.classList.remove('hidden'); this.updateStats(); return; }
    this.$empty?.classList.add('hidden');
    const fmt=d=>d?new Date(d).toLocaleDateString():'—';

    this.filteredJobs.forEach(job=>{
      const viewUrl = job.original_url || job.apply_url || '#';
      const loc = job.location || job.city || job.country || '';
      const meta = [job.school, loc].filter(Boolean).join(' • ');
      const card=document.createElement('div'); card.className='job-card';
      const desc = job.description ? `<p class="job-desc">${job.description}</p>` : '';

      card.innerHTML = `
        <div class="job-card-header">
          <h3 class="job-title">
            <a href="${viewUrl}" target="_blank" rel="noopener noreferrer">${job.title || 'Untitled role'}</a>
          </h3>
          <div class="job-meta">${meta}</div>
        </div>
        <div class="job-card-body">
          ${desc}
          <div class="job-fields">
            <span>${job.category || ''}</span>
            <span>${job.experience_level || ''}</span>
            <span>Posted: ${fmt(job.posting_date)}</span>
            <span>Deadline: ${fmt(job.application_deadline)}</span>
          </div>
        </div>
        <div class="job-card-actions">
          <button class="btn btn-outline" data-open-modal>Details</button>
        </div>
      `;
      card.querySelector('[data-open-modal]')?.addEventListener('click', ()=> this.openJobModal(job));
      c.appendChild(card);
    });
    this.updateStats();
  }

  openJobModal(job){
    if(!job) return;
    const viewUrl  = job.original_url || job.apply_url || '#';
    const applyUrl = job.apply_url   || job.original_url || '#';
    const title    = job.title || 'Untitled role';
    const school   = job.school || '';
    const loc      = job.location || job.city || job.country || '';
    const meta     = [school, loc].filter(Boolean).join(' · ');
    const desc     = job.description || 'No description provided.';

    if (this.$modalTitle) this.$modalTitle.textContent = title;
    if (this.$modalMeta)  { this.$modalMeta.textContent = meta; this.$modalMeta.style.display = meta ? '' : 'none'; }
    if (this.$modalDesc)  this.$modalDesc.textContent  = desc;
    if (this.$viewBtn)    this.$viewBtn.href = viewUrl;
    if (this.$applyBtn)   this.$applyBtn.href = applyUrl;

    this.$modal?.classList.remove('hidden');
    this.$modal?.setAttribute('aria-hidden','false');
  }
  hideModal(){
    this.$modal?.classList.add('hidden');
    this.$modal?.setAttribute('aria-hidden','true');
  }

  updateStats(){
    if (this.$statCount)   this.$statCount.textContent   = `${this.filteredJobs.length} job${this.filteredJobs.length===1?'':'s'}`;
    if (this.$statUpdated) this.$statUpdated.textContent = `Updated: ${this.lastUpdate ? this.lastUpdate.toLocaleString() : '—'}`;
    if (this.$statNext)    this.$statNext.textContent    = `Next check: ${this.nextUpdate ? this.nextUpdate.toLocaleString() : '—'}`;
  }
}

document.addEventListener('DOMContentLoaded',()=>new JobApp());








