
document.addEventListener("DOMContentLoaded", async () => {
    const button = document.getElementById("profileButton");
    const dropdown = document.getElementById("profileDropdown");

    if (!button || !dropdown) return;

    const nameElement = document.getElementById("profileName");
    const initialElement = document.getElementById("profileInitial");

    const loginLink = document.getElementById("profileLogin");
    const registerLink = document.getElementById("profileRegister");
    const workerLink = document.getElementById("profileWorker");
    const builderLink = document.getElementById("profileBuilder");
    const logoutLink = document.getElementById("profileLogout");

    button.addEventListener("click", () => {
        dropdown.hidden = !dropdown.hidden;
    });

    document.addEventListener("click", event => {
        if (!event.target.closest(".profile-menu")) {
            dropdown.hidden = true;
        }
    });

    try {
        const response = await fetch("/api/auth/me", {
            credentials: "same-origin"
        });

        if (!response.ok) return;

        const data = await response.json();

        if (!data.success || !data.user) return;

        const user = data.user;

        if (nameElement) {
            nameElement.textContent = `Hi, ${user.name || "User"}`;
        }

        if (initialElement) {
            initialElement.textContent = (user.name || "U").charAt(0).toUpperCase();
        }

        if (loginLink) loginLink.hidden = true;
        if (registerLink) registerLink.hidden = true;
        if (logoutLink) logoutLink.hidden = false;

        if (user.role === "Worker" && workerLink) {
            workerLink.hidden = false;
        }

        if (user.role === "Builder" && builderLink) {
            builderLink.hidden = false;
        }
    } catch (error) {
        console.error("Could not load profile:", error);
    }

    if (logoutLink) {
        logoutLink.addEventListener("click", async event => {
            event.preventDefault();

            try {
                const response = await fetch("/api/auth/logout", {
                    method: "POST",
                    credentials: "same-origin"
                });

                if (response.ok) {
                    window.location.href = "/";
                } else {
                    alert("Logout failed. Please try again.");
                }
            } catch (error) {
                alert("Could not connect to the server.");
            }
        });
    }
});
