document.addEventListener("DOMContentLoaded", async () => {
  const jobsContainer = document.getElementById("jobsContainer");
  const statCount = document.getElementById("statCount");
  const statUpdated = document.getElementById("statUpdated");
  const statNext = document.getElementById("statNext");

  // Utility: format date
  const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });

  // Load and render jobs
  const loadJobs = async () => {
    try {
      const res = await fetch("/.netlify/functions/fetch_jobs?debug=1");

      if (!res.ok) {
        throw new Error(`Fetch failed: ${res.status}`);
      }

      const jobs = await res.json();

      if (!Array.isArray(jobs) || jobs.length === 0) {
        throw new Error("No jobs found in response.");
      }

      // Update stats
      statCount.textContent = `${jobs.length} jobs`;
      statUpdated.textContent = `Updated: ${formatDate(new Date())}`;
      statNext.textContent = `Next check: ${formatDate(
        new Date(Date.now() + 6 * 60 * 60 * 1000)
      )}`; // every 6 hrs

      // Clear previous
      jobsContainer.innerHTML = "";

      // Render each job
      jobs.forEach((job) => {
        const card = document.createElement("div");
        card.className = "job-card";
        card.innerHTML = `
          <h3><a href="${job.link}" target="_blank">${job.title}</a></h3>
          <p><strong>${job.source || "Unknown Source"}</strong></p>
          <p>${job.content || "No description available."}</p>
          <p class="muted">Posted: ${job.pubDate ? formatDate(job.pubDate) : "—"}</p>
        `;
        jobsContainer.appendChild(card);
      });
    } catch (err) {
      console.error("Fetch error:", err.message);
      statCount.textContent = "Error loading jobs.";
      statUpdated.textContent = "Updated: —";
      statNext.textContent = "Next check: —";
      jobsContainer.innerHTML = "<p>⚠️ Could not load job data.</p>";
    }
  };

  await loadJobs();
});








