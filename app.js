// app.js (relaxed version - guarantees more jobs will show)

const searchInput = document.getElementById("searchInput");
const countryFilter = document.getElementById("countryFilter");
const categoryFilter = document.getElementById("categoryFilter");
const sortBy = document.getElementById("sortBy");
const jobsContainer = document.getElementById("jobsContainer");
const emptyState = document.getElementById("emptyState");
const statCount = document.getElementById("statCount");
const statUpdated = document.getElementById("statUpdated");
const statNext = document.getElementById("statNext");
const modal = document.getElementById("jobModal");
const closeModal = document.getElementById("closeModal");

let allJobs = [];

function sanitize(str) {
  return (str || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB");
}

function renderJobs(jobs) {
  jobsContainer.innerHTML = "";
  if (jobs.length === 0) {
    emptyState.classList.remove("hidden");
    return;
  } else {
    emptyState.classList.add("hidden");
  }

  for (const job of jobs) {
    const el = document.createElement("div");
    el.className = "card";
    el.innerHTML = `
      <h2>${sanitize(job.title)}</h2>
      <p class="muted">${sanitize(job.school || "Unknown School")} • ${sanitize(job.city || job.country || "Unknown Location")}</p>
      <p>${sanitize(job.description || "No description available.")}</p>
      <p class="muted">
        ${sanitize(job.category || "Uncategorized")} 
        ${sanitize(job.experience_level || "")} 
        Posted: ${formatDate(job.posting_date)}
      </p>
      <p class="muted">Deadline: ${formatDate(job.application_deadline)}</p>
      <button class="btn btn-outline" onclick='openModal(${JSON.stringify(job)})'>Details</button>
    `;
    jobsContainer.appendChild(el);
  }
}

function openModal(job) {
  document.getElementById("modalJobTitle").textContent = job.title;
  document.getElementById("modalMeta").textContent = `${job.school || "Unknown"} • ${job.city || job.country || "Unknown location"}`;
  document.getElementById("modalJobDescription").innerHTML = sanitize(job.description || "No description provided.");
  document.getElementById("viewPostingBtn").href = job.original_url || job.apply_url || "#";
  document.getElementById("applyJobBtn").href = job.apply_url || job.original_url || "#";
  modal.classList.remove("hidden");
}

closeModal.onclick = () => modal.classList.add("hidden");

function applyFilters() {
  const searchText = searchInput.value.toLowerCase();
  const selectedCountry = countryFilter.value;
  const selectedCategory = categoryFilter.value;
  const sortOption = sortBy.value;

  let filtered = allJobs.filter(job => {
    const haystack = `${job.title} ${job.description} ${job.school} ${job.location} ${job.city} ${job.country}`.toLowerCase();
    const matchesSearch = haystack.includes(searchText);
    const matchesCountry = !selectedCountry || (job.country || job.city || "").includes(selectedCountry);
    const matchesCategory = !selectedCategory || (job.category || "").includes(selectedCategory);
    return matchesSearch && matchesCountry && matchesCategory;
  });

  filtered.sort((a, b) => {
    if (sortOption === "date_desc") return new Date(b.posting_date) - new Date(a.posting_date);
    if (sortOption === "date_asc") return new Date(a.posting_date) - new Date(b.posting_date);
    if (sortOption === "title_asc") return a.title.localeCompare(b.title);
    return 0;
  });

  statCount.textContent = `${filtered.length} jobs`;
  renderJobs(filtered);
}

function populateFilters(jobs) {
  const countries = new Set();
  const categories = new Set();

  for (const job of jobs) {
    if (job.country) countries.add(job.country);
    else if (job.city) countries.add(job.city);
    if (job.category) categories.add(job.category);
  }

  for (const c of [...countries].sort()) {
    const opt = document.createElement("option");
    opt.value = opt.textContent = c;
    countryFilter.appendChild(opt);
  }

  for (const c of [...categories].sort()) {
    const opt = document.createElement("option");
    opt.value = opt.textContent = c;
    categoryFilter.appendChild(opt);
  }
}

async function fetchJobs() {
  try {
    const res = await fetch("/.netlify/functions/fetch_jobs");
    const jobs = await res.json();
    allJobs = jobs.map(j => ({
      ...j,
      title: j.title || "Untitled",
      description: j.description || "No description provided.",
      posting_date: j.posting_date || new Date().toISOString()
    }));
    statUpdated.textContent = `Updated: ${new Date().toLocaleString()}`;
    const nextCheck = new Date(Date.now() + 24 * 60 * 60 * 1000);
    statNext.textContent = `Next check: ${nextCheck.toLocaleString()}`;
    populateFilters(allJobs);
    applyFilters();
  } catch (e) {
    statCount.textContent = "Error loading jobs.";
    console.error(e);
  }
}

searchInput.oninput = applyFilters;
countryFilter.onchange = applyFilters;
categoryFilter.onchange = applyFilters;
sortBy.onchange = applyFilters;

fetchJobs();






