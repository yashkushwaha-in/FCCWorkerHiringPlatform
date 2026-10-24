document.addEventListener("DOMContentLoaded", async () => {
    const applicationsList = document.getElementById("applicationsList");
    const applicationsMessage = document.getElementById("applicationsMessage");
    const searchInput = document.getElementById("applicationSearch");
    const refreshButton = document.getElementById("refreshApplications");
    const heading = document.getElementById("applicationsHeading");
    const description = document.getElementById("applicationsDescription");

    if (!applicationsList) return;

    let applications = [];
    let isBuilder = false;

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]);
    }

    async function readJSON(response) {
        const contentType = response.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {
            throw new Error(`Unexpected server response (HTTP ${response.status}).`);
        }

        return response.json();
    }

    function renderApplications() {
        const query = (searchInput?.value || "").trim().toLowerCase();

        const filtered = applications.filter(application => {
            const searchable = [
                application.title,
                application.location,
                application.skill_required,
                application.status,
                application.builder_name,
                application.worker_name,
                application.skill
            ].join(" ").toLowerCase();

            return searchable.includes(query);
        });

        if (!filtered.length) {
            applicationsList.innerHTML = `
                <div class="empty-state">
                    <h2>No applications found</h2>
                    <p>${query ? "Try a different search." : "Applications will appear here when workers apply."}</p>
                </div>
            `;
            return;
        }

        applicationsList.innerHTML = filtered.map(application => {
            const person = isBuilder
                ? `
                    <p><strong>Worker:</strong> ${escapeHTML(application.worker_name)}</p>
                    <p><strong>Phone:</strong> ${escapeHTML(application.phone)}</p>
                    <p><strong>Skill:</strong> ${escapeHTML(application.skill)}</p>
                    <p><strong>Experience:</strong> ${escapeHTML(application.experience_years)} years</p>
                `
                : `<p><strong>Builder:</strong> ${escapeHTML(application.builder_name)}</p>`;

            const statusButtons = isBuilder && application.status === "Pending"
                ? `
                    <div class="application-actions">
                        <button class="button accept-button"
                            data-application-id="${escapeHTML(application.application_id)}"
                            data-status="Accepted" type="button">Accept</button>
                        <button class="button reject-button"
                            data-application-id="${escapeHTML(application.application_id)}"
                            data-status="Rejected" type="button">Reject</button>
                    </div>
                `
                : "";

            return `
                <article class="job-card">
                    <h2>${escapeHTML(application.title || "Job Application")}</h2>
                    ${person}
                    ${application.location
                        ? `<p><strong>Location:</strong> ${escapeHTML(application.location)}</p>`
                        : ""}
                    ${application.daily_wage != null
                        ? `<p><strong>Daily Wage:</strong> ₹${escapeHTML(application.daily_wage)}</p>`
                        : ""}
                    <p><strong>Application ID:</strong> ${escapeHTML(application.application_id)}</p>
                    <p><strong>Status:</strong> ${escapeHTML(application.status)}</p>
                    ${application.applied_at
                        ? `<p><strong>Applied:</strong> ${escapeHTML(new Date(application.applied_at).toLocaleString())}</p>`
                        : ""}
                    ${statusButtons}
                </article>
            `;
        }).join("");
    }

    async function loadApplications() {
        applicationsList.innerHTML = `
            <div class="empty-state">
                <h2>Loading applications...</h2>
                <p>Please wait.</p>
            </div>
        `;

        if (applicationsMessage) applicationsMessage.textContent = "";

        try {
            const response = await fetch("/api/applications/mine", {
                credentials: "same-origin",
                headers: { "Accept": "application/json" }
            });

            const data = await readJSON(response);

            if (response.status === 401) {
                window.location.href = "/login.html";
                return;
            }

            if (!response.ok) {
                throw new Error(data.message || "Unable to load applications.");
            }

            applications = Array.isArray(data)
                ? data
                : (data.applications || data.data || []);

            if (applications.length > 0) {
                isBuilder = applications.some(application => application.worker_name);
            } else {
                const userResponse = await fetch("/api/auth/me", {
                    credentials: "same-origin",
                    headers: { "Accept": "application/json" }
                });

                if (userResponse.ok) {
                    const userData = await readJSON(userResponse);
                    isBuilder = userData.user?.role === "Builder";
                }
            }

            if (heading) {
                heading.textContent = isBuilder ? "Received Applications" : "My Applications";
            }

            if (description) {
                description.textContent = isBuilder
                    ? "Review workers who have applied for your jobs."
                    : "Track the status of your job applications.";
            }

            renderApplications();
        } catch (error) {
            applications = [];

            applicationsList.innerHTML = `
                <div class="empty-state">
                    <h2>Could not load applications</h2>
                    <p>${escapeHTML(error.message)}</p>
                </div>
            `;

            if (applicationsMessage) {
                applicationsMessage.textContent = "Please refresh and try again.";
            }

            console.error("Load applications error:", error);
        }
    }

    applicationsList.addEventListener("click", async event => {
        const button = event.target.closest(".accept-button, .reject-button");

        if (!button) return;

        const applicationId = Number(button.dataset.applicationId);
        const status = button.dataset.status;

        if (!Number.isInteger(applicationId) || applicationId <= 0) return;

        const buttons = applicationsList.querySelectorAll(
            `[data-application-id="${applicationId}"]`
        );

        buttons.forEach(item => item.disabled = true);

        if (applicationsMessage) {
            applicationsMessage.textContent = `Updating application to ${status.toLowerCase()}...`;
        }

        try {
            const response = await fetch(
                `/api/applications/${applicationId}/status`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    credentials: "same-origin",
                    body: JSON.stringify({ status })
                }
            );

            const data = await readJSON(response);

            if (response.status === 401) {
                window.location.href = "/login.html";
                return;
            }

            if (!response.ok) {
                throw new Error(data.message || "Could not update application status.");
            }

            if (applicationsMessage) {
                applicationsMessage.textContent = data.message || `Application ${status.toLowerCase()}.`;
            }

            await loadApplications();
        } catch (error) {
            buttons.forEach(item => item.disabled = false);

            if (applicationsMessage) {
                applicationsMessage.textContent = error.message;
            }

            console.error("Update application error:", error);
        }
    });

    searchInput?.addEventListener("input", renderApplications);
    refreshButton?.addEventListener("click", loadApplications);

    await loadApplications();
});