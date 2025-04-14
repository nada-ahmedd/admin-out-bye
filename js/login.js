      // Handle Admin Login Form Submission
        document.getElementById("adminLoginForm").addEventListener("submit", async function (event) {
            event.preventDefault();
            const submitButton = document.getElementById("submitAdminLogin");
            submitButton.disabled = true;
            submitButton.textContent = "Processing...";
            const email = document.getElementById("adminEmail").value;
            const password = document.getElementById("adminPassword").value;
            const data = { email, password };
            try {
                const response = await fetch("https://abdulrahmanantar.com/outbye/admin/auth/login.php", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams(data).toString(),
                });
                const text = await response.text();
                console.log("Raw response:", text); // Debugging
                let result;
                try {
                    result = JSON.parse(text);
                } catch (e) {
                    console.error("JSON Parse Error:", e, "Raw:", text);
                    throw new Error("Invalid JSON response");
                }
                if (result.status === "success") {
                    localStorage.setItem("isAdminLoggedIn", "true");
                    localStorage.setItem("adminId", result.user_id);
                    localStorage.setItem("adminToken", result.token);
                    Swal.fire({
                        icon: "success",
                        title: "Admin Login Successful!",
                        text: "Redirecting to dashboard...",
                        timer: 2000,
                        showConfirmButton: false,
                    }).then(() => {
                        window.location.href = "index.html";
                    });
                } else {
                    showError("adminLoginError", result.message || "Incorrect email or password.");
                }
            } catch (error) {
                showError("adminLoginError", `Login failed: ${error.message}`);
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = "Sign In";
            }
        });

        // Show Forgot Password Modal
        document.getElementById("adminForgotPasswordLink").addEventListener("click", (e) => {
            e.preventDefault();
            document.getElementById("adminForgotPasswordModal").style.display = "flex";
        });

        // Handle Forgot Password Email Submission
        document.getElementById("submitAdminEmail").addEventListener("click", async () => {
            const email = document.getElementById("adminForgotEmail").value;
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                showError("adminEmailError", "Please enter a valid email.");
                return;
            }
            try {
                const response = await fetch("https://abdulrahmanantar.com/outbye/admin/forgetpassword/checkemail.php", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams({ email }).toString(),
                });
                const text = await response.text();
                console.log("Raw forgot password response:", text); // Debugging
                let data;
                try {
                    data = JSON.parse(text);
                } catch (e) {
                    console.error("JSON Parse Error:", e, "Raw:", text);
                    throw new Error("Invalid JSON response");
                }
                if (data.success) {
                    localStorage.setItem("adminResetEmail", email);
                    document.getElementById("adminForgotPasswordModal").style.display = "none";
                    window.location.href = "admin-verify-code.html";
                } else {
                    showError("adminEmailError", data.message || "Email not found.");
                }
            } catch (error) {
                showError("adminEmailError", `Error: ${error.message}`);
            }
        });

        // Display Error Message
        function showError(elementId, message) {
            const errorElement = document.getElementById(elementId);
            errorElement.textContent = message;
            errorElement.style.display = "block";
        }