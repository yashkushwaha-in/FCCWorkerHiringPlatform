
const registerForm = document.getElementById("registerForm");

if (registerForm) {
    const roleSelect = document.getElementById("role");
    const workerFields = document.getElementById("workerFields");
    const builderFields = document.getElementById("builderFields");
    const message = document.getElementById("registerMessage");

    function updateFields() {
        const isWorker = roleSelect.value === "Worker";
        const isBuilder = roleSelect.value === "Builder";

        workerFields.hidden = !isWorker;
        builderFields.hidden = !isBuilder;

        ["skill", "experience_years", "preferred_area", "expected_daily_wage"].forEach(id => {
            const field = document.getElementById(id);
            if (field) field.required = isWorker;
        });

        ["company_name", "work_area"].forEach(id => {
            const field = document.getElementById(id);
            if (field) field.required = isBuilder;
        });
    }

    roleSelect.addEventListener("change", updateFields);

    registerForm.addEventListener("submit", async event => {
        event.preventDefault();
        message.textContent = "Creating account...";

        const formData = new FormData(registerForm);
        const data = Object.fromEntries(formData.entries());

        data.experience_years = data.experience_years === "" ? 0 : Number(data.experience_years);
        data.expected_daily_wage = data.expected_daily_wage === "" ? 0 : Number(data.expected_daily_wage);

        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Registration failed.");
            }

            message.textContent = "Account created successfully! Redirecting to login...";

            setTimeout(() => {
                window.location.href = "/login.html";
            }, 1200);
        } catch (error) {
            message.textContent = error.message;
        }
    });

    updateFields();
}

const loginForm = document.getElementById("loginForm");

if (loginForm) {
    const message = document.getElementById("loginMessage");

    loginForm.addEventListener("submit", async event => {
        event.preventDefault();
        message.textContent = "Logging in...";

        const formData = new FormData(loginForm);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Login failed.");
            }

            message.textContent = "Login successful!";

            const userResponse = await fetch("/api/auth/me", {
                credentials: "same-origin"
            });

            if (!userResponse.ok) {
                throw new Error("Could not retrieve your account details.");
            }

            const userResult = await userResponse.json();

            window.location.href = userResult.user.role === "Builder"
                ? "/builder-dashboard.html"
                : "/worker-dashboard.html";
        } catch (error) {
            message.textContent = error.message;
        }
    });
}