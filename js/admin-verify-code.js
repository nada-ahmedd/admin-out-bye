       let lastResendTime = Date.now();
        const RESEND_COOLDOWN = 30000; // 30 ثانية

        // دالة لعرض رسائل الخطأ
        function showError(message) {
            const errorElement = document.getElementById('codeError');
            if (errorElement) {
                errorElement.textContent = message;
            } else {
                console.warn('Error element not found!');
            }
        }

        // دالة لعرض رسائل النجاح
        function showSuccess(message, redirectUrl = null) {
            Swal.fire({
                icon: 'success',
                title: 'Success',
                text: message,
                timer: 2000,
                showConfirmButton: false
            }).then(() => {
                if (redirectUrl) window.location.href = redirectUrl;
            });
        }

        // دالة للتحقق من وجود البريد الإلكتروني
        function getEmail() {
            const email = localStorage.getItem('adminResetEmail');
            if (!email) {
                showError('Email not found in storage. Please start the password reset process again.');
                setTimeout(() => window.location.href = 'signin.html', 2000);
                return null;
            }
            return email;
        }

        // دالة للتحقق من الكود
        async function verifyAdminCode(email, code) {
            try {
                const response = await fetch('https://abdulrahmanantar.com/outbye/admin/forgetpassword/verifycode.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({ email, verifycode: code })
                });
                const data = await response.json();
                console.log("Verify Code API Response:", data);

                if (data.status === "success") {
                    showSuccess('Your code is correct. Redirecting to reset password...', 'admin-reset-password.html');
                } else {
                    showError(data.message || 'Verification code is incorrect.');
                }
            } catch (error) {
                console.error('Error in verifyAdminCode:', error);
                if (error.message.includes('Failed to fetch')) {
                    showError('Network error: Unable to connect to the server.');
                } else {
                    showError('Error occurred during verification: ' + error.message);
                }
            }
        }

        // دالة لإعادة إرسال الكود
        async function resendCode(email) {
            try {
                const response = await fetch('https://abdulrahmanantar.com/outbye/admin/auth/resend.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({ email })
                });
                const data = await response.json();
                console.log("Resend Code API Response:", data);

                if (data.status === "success") {
                    showSuccess('The code has been sent again.');
                    document.querySelectorAll('.verify-code-field').forEach(field => field.value = '');
                    document.getElementById('verifyCodeField1').focus();
                    lastResendTime = Date.now();
                    startResendTimer();
                    updateTimer();
                } else {
                    showError(data.message || 'Failed to resend the code.');
                }
            } catch (error) {
                console.error('Error in resendCode:', error);
                if (error.message.includes('Failed to fetch')) {
                    showError('Network error: Unable to connect to the server.');
                } else {
                    showError('Error occurred while resending the code: ' + error.message);
                }
            }
        }

        // دالة لبدء المؤقت
        function startResendTimer() {
            const resendLink = document.getElementById('resendCodeLink');
            if (resendLink) {
                resendLink.classList.remove('enabled');
                setTimeout(() => {
                    resendLink.classList.add('enabled');
                    document.getElementById('timer').textContent = '';
                }, RESEND_COOLDOWN);
            } else {
                console.warn('Resend link not found!');
            }
        }

        // دالة لتحديث المؤقت
        function updateTimer() {
            const timerElement = document.getElementById('timer');
            if (timerElement) {
                const interval = setInterval(() => {
                    const timeLeft = Math.ceil((lastResendTime + RESEND_COOLDOWN - Date.now()) / 1000);
                    if (timeLeft > 0) {
                        timerElement.textContent = `Resend available in ${timeLeft} second${timeLeft > 1 ? 's' : ''}`;
                    } else {
                        timerElement.textContent = '';
                        clearInterval(interval);
                    }
                }, 1000);
            } else {
                console.warn('Timer element not found!');
            }
        }

        // حدث تحميل الصفحة
        document.addEventListener('DOMContentLoaded', () => {
            const email = getEmail();
            if (email) {
                startResendTimer();
                updateTimer();
            }
        });

        // حدث إرسال النموذج
        document.getElementById('adminVerifyCodeForm').addEventListener('submit', async (event) => {
            event.preventDefault();

            let code = '';
            const fields = document.querySelectorAll('.verify-code-field');
            fields.forEach(field => code += field.value.trim());

            if (code.length !== 5) {
                showError('Please enter all five digits.');
                return;
            }

            const email = getEmail();
            if (email) await verifyAdminCode(email, code);
        });

        // حدث النقر على رابط Resend
        document.getElementById('resendCodeLink').addEventListener('click', async (event) => {
            event.preventDefault();

            const email = getEmail();
            if (!email) return;

            const resendLink = event.target;
            if (!resendLink.classList.contains('enabled')) {
                const timeLeft = Math.ceil((lastResendTime + RESEND_COOLDOWN - Date.now()) / 1000);
                Swal.fire({
                    icon: 'warning',
                    title: 'Wait Required',
                    text: `Try again after ${timeLeft} second${timeLeft > 1 ? 's' : ''}.`
                });
                return;
            }

            await resendCode(email);
        });

        // أحداث تحسين تجربة المستخدم
        document.querySelectorAll('.verify-code-field').forEach((input, index, fields) => {
            input.addEventListener('input', () => {
                if (input.value.length === 1 && index < fields.length - 1) fields[index + 1].focus();
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && input.value.length === 0 && index > 0) fields[index - 1].focus();
            });

            input.addEventListener('paste', (e) => {
                const pastedData = e.clipboardData.getData('text');
                if (pastedData.length === 5) {
                    pastedData.split('').forEach((char, i) => fields[i].value = char);
                    fields[fields.length - 1].focus();
                    e.preventDefault();
                }
            });
        });