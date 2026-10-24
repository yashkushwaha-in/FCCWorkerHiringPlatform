document.addEventListener("DOMContentLoaded", async () => {
    const message = document.getElementById("builderProfileMessage");
    const details = document.getElementById("builderProfileDetails");

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]);
    }

    try {
        const response = await fetch("/api/builders/profile", {
            credentials: "same-origin",
            headers: { "Accept": "application/json" }
        });

        const data = await response.json();

        if (response.status === 401) {
            window.location.href = "/login.html";
            return;
        }

        if (!response.ok) {
            throw new Error(data.message || "Unable to load your profile.");
        }

        const profile = data.profile;

        message.textContent = "Profile loaded successfully.";

        details.innerHTML = `
            <h2>${escapeHTML(profile.name)}</h2>
            <p><strong>Email:</strong> ${escapeHTML(profile.email)}</p>
            <p><strong>Phone:</strong> ${escapeHTML(profile.phone)}</p>
            <p><strong>Company:</strong> ${escapeHTML(profile.company_name)}</p>
            <p><strong>Work Area:</strong> ${escapeHTML(profile.work_area)}</p>
        `;
    } catch (error) {
        message.textContent = error.message;
        console.error("Builder profile page error:", error);
    }
});