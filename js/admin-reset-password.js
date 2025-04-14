  function showError(elementId, message) {
            document.getElementById(elementId).textContent = message;
        }

        document.getElementById("adminResetPasswordForm").addEventListener("submit", async function (event) {
            event.preventDefault();

            const email = localStorage.getItem("adminResetEmail");
            const newPassword = document.getElementById("newPassword").value;
            const confirmPassword = document.getElementById("confirmPassword").value;

            if (newPassword !== confirmPassword) {
                showError("passwordError", "Passwords do not match.");
                return;
            }

            if (!newPassword || newPassword.length < 3) {
                showError("passwordError", "Password must be at least 3 characters.");
                return;
            }

            const data = { email, password: newPassword };

            try {
                const response = await fetch("https://abdulrahmanantar.com/outbye/admin/forgetpassword/resetpassword.php", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams(data).toString(),
                });
                const result = await response.json();

                if (result.status === "success") {
                    localStorage.removeItem("adminResetEmail");
                    Swal.fire({
                        icon: "success",
                        title: "Password Reset Successful!",
                        text: "Redirecting to login...",
                        timer: 2000,
                        showConfirmButton: false,
                    }).then(() => {
                        window.location.href = "login.html";
                    });
                } else {
                    showError("passwordError", result.message || "Failed to reset password.");
                }
            } catch (error) {
                showError("passwordError", "Network Error: Please try again later.");
            }
        });