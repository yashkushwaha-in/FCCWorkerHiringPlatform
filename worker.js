
document.addEventListener("DOMContentLoaded", async () => {
    const message = document.getElementById("workerMessage");

    try {
        const response = await fetch("/api/auth/me", {
            credentials: "same-origin"
        });

        if (!response.ok) {
            window.location.href = "/login.html";
            return;
        }

        const data = await response.json();

        if (!data.success || !data.user) {
            window.location.href = "/login.html";
            return;
        }

        if (data.user.role !== "Worker") {
            window.location.href = data.user.role === "Builder"
                ? "/builder-dashboard.html"
                : "/login.html";
            return;
        }

        const title = document.getElementById("dashboardTitle");
        const welcome = document.getElementById("welcomeMessage");

        if (title) {
            title.textContent = `Welcome, ${data.user.name}`;
        }

        if (welcome) {
            welcome.textContent =
                "Find work opportunities that match your skills and experience.";
        }

        if (message) {
            message.textContent = "";
        }
    } catch (error) {
        console.error("Worker dashboard error:", error);

        if (message) {
            message.textContent = "Unable to verify your login. Please try again.";
        }
    }
});
