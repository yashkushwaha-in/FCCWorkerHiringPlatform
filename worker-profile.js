
document.addEventListener("DOMContentLoaded", async () => {
    const message = document.getElementById("profileMessage");
    const details = document.getElementById("workerProfileDetails");
    const editButton = document.getElementById("editProfileButton");
    const form = document.getElementById("workerEditForm");
    const cancelButton = document.getElementById("cancelEditButton");
    const editMessage = document.getElementById("editProfileMessage");
    let profile = null;

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]);
    }

    function setField(id, value) {
        document.getElementById(id).value = value ?? "";
    }

    function fillForm(data) {
        setField("workerName", data.name);
        setField("workerPhone", data.phone);
        setField("workerSkill", data.skill);
        setField("workerExperience", data.experience_years);
        setField("workerArea", data.preferred_area);
        setField("workerWage", data.expected_daily_wage);
        setField("workerAvailability", data.availability);
    }

    function displayProfile(data) {
        details.innerHTML = `
            <h2>${escapeHTML(data.name)}</h2>
            <p><strong>Email:</strong> ${escapeHTML(data.email)}</p>
            <p><strong>Phone:</strong> ${escapeHTML(data.phone)}</p>
            <p><strong>Skill:</strong> ${escapeHTML(data.skill)}</p>
            <p><strong>Experience:</strong> ${escapeHTML(data.experience_years)} years</p>
            <p><strong>Preferred Area:</strong> ${escapeHTML(data.preferred_area)}</p>
            <p><strong>Expected Daily Wage:</strong> ₹${escapeHTML(data.expected_daily_wage)}</p>
            <p><strong>Availability:</strong> ${escapeHTML(data.availability)}</p>
        `;
    }

    async function loadProfile() {
        const response = await fetch("/api/workers/profile", {
            credentials: "same-origin",
            headers: { "Accept": "application/json" }
        });

        const data = await response.json();

        if (response.status === 401) {
            window.location.href = "/login.html";
            return false;
        }

        if (!response.ok) {
            throw new Error(data.message || "Unable to load your profile.");
        }

        profile = data.profile;
        displayProfile(profile);
        fillForm(profile);
        editButton.hidden = false;
        message.textContent = "Profile loaded successfully.";
        return true;
    }

    editButton.addEventListener("click", () => {
        fillForm(profile);
        editMessage.textContent = "";
        form.hidden = false;
        editButton.hidden = true;
    });

    cancelButton.addEventListener("click", () => {
        form.hidden = true;
        editButton.hidden = false;
        editMessage.textContent = "";
        fillForm(profile);
    });

    form.addEventListener("submit", async event => {
        event.preventDefault();
        editMessage.textContent = "Saving changes...";

        const body = {
            name: document.getElementById("workerName").value.trim(),
            phone: document.getElementById("workerPhone").value.trim(),
            skill: document.getElementById("workerSkill").value.trim(),
            experience_years: document.getElementById("workerExperience").value,
            preferred_area: document.getElementById("workerArea").value.trim(),
            expected_daily_wage: document.getElementById("workerWage").value,
            availability: document.getElementById("workerAvailability").value
        };

        try {
            const response = await fetch("/api/workers/profile", {
                method: "PUT",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (response.status === 401) {
                window.location.href = "/login.html";
                return;
            }

            if (!response.ok) {
                throw new Error(data.message || "Unable to save profile.");
            }

            await loadProfile();
            form.hidden = true;
            editButton.hidden = false;
            message.textContent = "Profile updated successfully.";
        } catch (error) {
            editMessage.textContent = error.message;
        }
    });

    try {
        await loadProfile();
    } catch (error) {
        message.textContent = error.message;
        console.error("Worker profile page error:", error);
    }
});
