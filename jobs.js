document.addEventListener("DOMContentLoaded", () => {
    const jobsList = document.getElementById("jobsList");
    const jobsMessage = document.getElementById("jobsMessage");
    const searchInput = document.getElementById("jobSearch");
    const refreshButton = document.getElementById("refreshJobs");
    const heading = document.getElementById("jobsHeading");

    if (!jobsList) return;

    const params = new URLSearchParams(window.location.search);
    const mineOnly = params.get("mine") === "1";

    let jobs = [];

    if (mineOnly && heading) {
        heading.textContent = "My Job Listings";
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]);
    }

    async function readResponse(response) {
        const contentType = response.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {
            await response.text();
            throw new Error(
                `Server returned a non-JSON response (HTTP ${response.status}). Check the API route.`
            );
        }

        return response.json();
    }

    function renderJobs() {
        const query = (searchInput?.value || "").trim().toLowerCase();

        const filtered = jobs.filter(job => {
            const searchable = [
                job.title,
                job.description,
                job.location,
                job.skill_required,
                job.company_name
            ].join(" ").toLowerCase();

            return searchable.includes(query);
        });

        if (!filtered.length) {
            jobsList.innerHTML = `
                <div class="empty-state">
                    <h2>No jobs found</h2>
                    <p>${query ? "Try a different search." : "No job listings are available yet."}</p>
                </div>
            `;
            return;
        }

        jobsList.innerHTML = filtered.map(job => `
            <article class="job-card">
                <h2>${escapeHTML(job.title)}</h2>
                <p>${escapeHTML(job.description)}</p>
                <p><strong>Location:</strong> ${escapeHTML(job.location)}</p>
                <p><strong>Skill:</strong> ${escapeHTML(job.skill_required)}</p>
                <p><strong>Workers:</strong> ${escapeHTML(job.workers_required)}</p>
                <p><strong>Daily Wage:</strong> ₹${escapeHTML(job.daily_wage)}</p>
                <p><strong>Duration:</strong> ${escapeHTML(job.duration_days)} days</p>
                <p class="job-meta">Status: ${escapeHTML(job.status)}</p>
                ${job.company_name ? `<p><strong>Builder:</strong> ${escapeHTML(job.company_name)}</p>` : ""}
                ${mineOnly ? "" : `
                    <button class="button apply-button"
                        data-job-id="${escapeHTML(job.job_id)}"
                        type="button">
                        Apply Now
                    </button>
                `}
            </article>
        `).join("");
    }

    async function loadJobs() {
        jobsList.innerHTML = `
            <div class="empty-state">
                <h2>Loading jobs...</h2>
                <p>Please wait.</p>
            </div>
        `;

        if (jobsMessage) jobsMessage.textContent = "";

        try {
            const endpoint = mineOnly ? "/api/jobs/mine" : "/api/jobs";

            const response = await fetch(endpoint, {
                credentials: "same-origin",
                headers: {
                    "Accept": "application/json"
                }
            });

            const data = await readResponse(response);

            if (!response.ok) {
                throw new Error(data.message || "Unable to load jobs.");
            }

            jobs = Array.isArray(data)
                ? data
                : (data.jobs || data.data || []);

            renderJobs();
        } catch (error) {
            jobs = [];

            jobsList.innerHTML = `
                <div class="empty-state">
                    <h2>Could not load jobs</h2>
                    <p>${escapeHTML(error.message)}</p>
                </div>
            `;

            if (jobsMessage) {
                jobsMessage.textContent = "Refresh the page or check the server response.";
            }

            console.error("Load jobs error:", error);
        }
    }

    jobsList.addEventListener("click", async event => {
        const button = event.target.closest(".apply-button");

        if (!button) return;

        const jobId = Number(button.dataset.jobId);

        if (!Number.isInteger(jobId) || jobId <= 0) {
            if (jobsMessage) jobsMessage.textContent = "Invalid job ID.";
            return;
        }

        button.disabled = true;
        button.textContent = "Submitting...";

        try {
            const response = await fetch("/api/applications", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                credentials: "same-origin",
                body: JSON.stringify({ job_id: jobId })
            });

            const data = await readResponse(response);

            if (response.status === 401 || response.status === 403) {
                window.location.href = "/login.html";
                return;
            }

            if (!response.ok) {
                throw new Error(data.message || "Could not apply for this job.");
            }

            if (jobsMessage) {
                jobsMessage.textContent = data.message || "Application submitted successfully.";
            }

            button.textContent = "Applied";
        } catch (error) {
            if (jobsMessage) jobsMessage.textContent = error.message;

            button.disabled = false;
            button.textContent = "Apply Now";

            console.error("Apply for job error:", error);
        }
    });

    searchInput?.addEventListener("input", renderJobs);
    refreshButton?.addEventListener("click", loadJobs);

    loadJobs();
});