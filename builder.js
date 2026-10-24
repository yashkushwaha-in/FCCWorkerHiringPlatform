document.addEventListener("DOMContentLoaded", async () => {
    const message = document.getElementById("builderMessage");
    const jobForm = document.getElementById("jobForm");

    async function getCurrentUser() {
        const response = await fetch("/api/auth/me", {
            credentials: "same-origin"
        });

        if (!response.ok) {
            window.location.href = "/login.html";
            return null;
        }

        const data = await response.json();

        if (!data.success || !data.user) {
            window.location.href = "/login.html";
            return null;
        }

        if (data.user.role !== "Builder") {
            window.location.href = data.user.role === "Worker"
                ? "/worker-dashboard.html"
                : "/login.html";
            return null;
        }

        return data.user;
    }

    const user = await getCurrentUser();

    if (!user) return;

    const welcome = document.getElementById("welcomeMessage");

    if (welcome) {
        welcome.textContent = `Welcome, ${user.name}`;
    }

    if (jobForm) {
        jobForm.addEventListener("submit", async event => {
            event.preventDefault();

            if (message) message.textContent = "Posting job...";

            const formData = new FormData(jobForm);
            const data = Object.fromEntries(formData.entries());

            data.workers_required = Number(data.workers_required);
            data.daily_wage = Number(data.daily_wage);
            data.duration_days = Number(data.duration_days);

            try {
                const response = await fetch("/api/jobs", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    credentials: "same-origin",
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || "Could not post job.");
                }

                if (message) {
                    message.textContent = result.message || "Job posted successfully.";
                }

                jobForm.reset();
            } catch (error) {
                if (message) message.textContent = error.message;
                console.error("Post job error:", error);
            }
        });
    }
});