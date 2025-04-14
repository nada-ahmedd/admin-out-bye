     const API_BASE_URL = "https://abdulrahmanantar.com/outbye/admin/";
        const ENDPOINTS = {
            CATEGORIES: `${API_BASE_URL}categories/view.php`,
            SERVICES: `${API_BASE_URL}services/view.php`,
            ITEMS: `${API_BASE_URL}items/view.php`,
            ORDERS: `${API_BASE_URL}orders/view.php`,
            ARCHIVE: `${API_BASE_URL}orders/archive.php`,
            APPROVE: `${API_BASE_URL}orders/approve.php`,
            USERS: `${API_BASE_URL}users/view.php`,
            SEND_NOTIFICATION: `${API_BASE_URL}send_notification_all.php`
        };

        function isLoggedIn() {
            const isLoggedIn = localStorage.getItem('isAdminLoggedIn') === 'true' && localStorage.getItem('adminToken');
            console.log("Are you logged in?", isLoggedIn, "Token:", localStorage.getItem('adminToken'));
            return isLoggedIn;
        }

        function logout() {
            localStorage.removeItem('isAdminLoggedIn');
            localStorage.removeItem('adminId');
            localStorage.removeItem('adminToken');
            window.location.href = 'login.html';
        }

        function toggleSidebar() {
            document.getElementById('sidebar').classList.toggle('active');
        }

        async function fetchWithToken(url, options = {}) {
            if (!isLoggedIn()) {
                showAlert("error", "Unauthorized", "Please log in to continue", () => {
                    window.location.href = 'login.html';
                });
                throw new Error("No token found");
            }
            const token = localStorage.getItem('adminToken');
            options.headers = {
                ...options.headers,
                'Authorization': `Bearer ${token}`
            };
            console.log("Requesting:", url, "Options:", options);
            try {
                const response = await fetch(url, options);
                const text = await response.text();
                console.log("Raw response from:", url, "Response:", text, "Status:", response.status);
                if (!response.ok) {
                    if (response.status === 401) {
                        showAlert("error", "Session Expired", "Please log in again", () => {
                            logout();
                        });
                        throw new Error("Unauthorized");
                    }
                    throw new Error(`HTTP error! Status: ${response.status}, Response: ${text}`);
                }
                try {
                    return JSON.parse(text);
                } catch (e) {
                    console.error("JSON Parse Error:", e, "Raw:", text);
                    throw new Error("Invalid JSON response");
                }
            } catch (error) {
                console.error("Fetch Error:", error);
                throw error;
            }
        }

        function showAlert(icon, title, text, callback) {
            Swal.fire({
                icon,
                title,
                text,
                confirmButtonText: 'OK'
            }).then(() => {
                if (callback) callback();
            });
        }

        async function sendNotification() {
            const { value: formValues } = await Swal.fire({
                title: 'Send Notification to All Users',
                html:
                    `<input id="swal-input1" class="swal2-input" placeholder="Notification Title">` +
                    `<textarea id="swal-input2" class="swal2-textarea" placeholder="Notification Body"></textarea>`,
                focusConfirm: false,
                showCancelButton: true,
                confirmButtonText: 'Send',
                preConfirm: () => {
                    const title = document.getElementById('swal-input1').value;
                    const body = document.getElementById('swal-input2').value;
                    if (!title || !body) {
                        Swal.showValidationMessage('Both title and body are required');
                        return false;
                    }
                    return { title, body };
                }
            });

            if (formValues) {
                try {
                    const formData = new FormData();
                    formData.append('title', formValues.title);
                    formData.append('body', formValues.body);
                    console.log("Sending notification:", formValues);

                    const response = await fetchWithToken(ENDPOINTS.SEND_NOTIFICATION, {
                        method: "POST",
                        body: formData
                    });
                    console.log("Send Notification Response:", response);
                    if (response.status === "success") {
                        showAlert("success", "Sent", "Notification sent successfully");
                    } else {
                        showAlert("error", "Error", response.message || "Failed to send notification");
                    }
                } catch (error) {
                    console.error("Send Notification Error:", error);
                    showAlert("error", "Error", "Failed to send notification: " + error.message);
                }
            }
        }

        async function approveOrder(orderId, userId) {
            console.log("Approving order:", { ordersid: orderId, usersid: userId });
            try {
                const formData = new FormData();
                formData.append('ordersid', orderId);
                formData.append('usersid', userId);
                console.log("Request body (form-data):", formData);

                const response = await fetchWithToken(ENDPOINTS.APPROVE, {
                    method: "POST",
                    body: formData
                });
                console.log("Approve Response:", response);
                if (response.status === "success") {
                    showAlert("success", "Approved", "Order approved successfully", () => {
                        loadDashboard();
                    });
                } else {
                    showAlert("error", "Error", response.message || "Failed to approve order");
                }
            } catch (error) {
                console.error("Approve Error:", error);
                showAlert("error", "Error", "Failed to approve order: " + error.message);
            }
        }

        async function loadDashboard() {
            if (!isLoggedIn()) {
                showAlert("error", "Unauthorized", "Please log in to continue", () => {
                    window.location.href = 'login.html';
                });
                return;
            }

            const spinnerContainer = document.getElementById("table-spinner");
            spinnerContainer.innerHTML = '<div class="spinner"></div>';
            const spinner = new Spinner({ color: '#f26b0a', lines: 12 }).spin(spinnerContainer.querySelector('.spinner'));

            try {
                let categoriesCount = 0;
                let recentCategories = [];
                try {
                    const categoriesData = await fetchWithToken(ENDPOINTS.CATEGORIES, { method: "GET" });
                    if (categoriesData.status === "success") {
                        categoriesCount = categoriesData.data.length;
                        recentCategories = categoriesData.data.slice(0, 4).map(item => ({
                            type: "Category",
                            name: item.categories_name,
                            image: item.categories_image,
                            date: item.categories_datetime
                        }));
                    }
                } catch (e) {
                    console.error("Categories Error:", e);
                }

                let servicesCount = 0;
                let recentServices = [];
                try {
                    const servicesData = await fetchWithToken(ENDPOINTS.SERVICES, { method: "GET" });
                    if (servicesData.status === "success") {
                        servicesCount = servicesData.data.length;
                        recentServices = servicesData.data.slice(0, 4).map(item => ({
                            type: "Service",
                            name: item.service_name || "Unknown",
                            image: item.service_image || "",
                            date: item.service_datetime || ""
                        }));
                    }
                } catch (e) {
                    console.error("Services Error:", e);
                }

                let itemsCount = 0;
                let recentItems = [];
                try {
                    const itemsData = await fetchWithToken(ENDPOINTS.ITEMS, { method: "GET" });
                    if (itemsData.status === "success") {
                        itemsCount = itemsData.data.length;
                        recentItems = itemsData.data.slice(0, 4).map(item => ({
                            type: "Item",
                            name: item.item_name || "Unknown",
                            image: item.item_image || "",
                            date: item.item_datetime || ""
                        }));
                    }
                } catch (e) {
                    console.error("Items Error:", e);
                }

                let usersCount = 0;
                let recentUsers = [];
                try {
                    const usersData = await fetchWithToken(ENDPOINTS.USERS, { method: "GET" });
                    if (usersData.status === "success") {
                        usersCount = usersData.data.length;
                        recentUsers = usersData.data.slice(0, 5);
                    }
                } catch (e) {
                    console.error("Users Error:", e);
                }
                const usersTable = document.getElementById("users-table");
                usersTable.innerHTML = "";
                const usersSpinnerContainer = document.getElementById("users-spinner");
                usersSpinnerContainer.innerHTML = '<div class="spinner"></div>';
                const usersSpinner = new Spinner({ color: '#f26b0a', lines: 12 }).spin(usersSpinnerContainer.querySelector('.spinner'));
                if (recentUsers.length > 0) {
                    recentUsers.forEach(user => {
                        usersTable.innerHTML += `
                            <tr>
                                <td>${user.users_id}</td>
                                <td>${user.users_name}</td>
                                <td>${user.users_email}</td>
                                <td>${user.users_phone}</td>
                                <td>${user.users_create}</td>
                            </tr>
                        `;
                    });
                } else {
                    usersTable.innerHTML = `<tr><td colspan="5">No users found</td></tr>`;
                }

                let ordersData = { status: "error", data: [] };
                try {
                    ordersData = await fetchWithToken(ENDPOINTS.ORDERS, { method: "GET" });
                    console.log("Orders Data:", ordersData);
                } catch (e) {
                    console.error("Orders Error:", e);
                }
                const ordersTable = document.getElementById("orders-table");
                ordersTable.innerHTML = "";
                const ordersSpinnerContainer = document.getElementById("orders-spinner");
                ordersSpinnerContainer.innerHTML = '<div class="spinner"></div>';
                const ordersSpinner = new Spinner({ color: '#f26b0a', lines: 12 }).spin(ordersSpinnerContainer.querySelector('.spinner'));
                if (ordersData.status === "success" && ordersData.data.length > 0) {
                    ordersData.data.slice(0, 5).forEach(order => {
                        ordersTable.innerHTML += `
                            <tr>
                                <td>${order.orders_id}</td>
                                <td>${order.orders_usersid}</td>
                                <td>${order.orders_totalprice || 0}</td>
                                <td>${order.orders_datetime}</td>
                                <td><button class="btn btn-sm btn-custom" onclick="approveOrder(${order.orders_id}, ${order.orders_usersid})">Approve</button></td>
                            </tr>
                        `;
                    });
                } else {
                    ordersTable.innerHTML = `<tr><td colspan="5">No pending orders</td></tr>`;
                }

                let archiveData = { status: "error", data: [] };
                try {
                    archiveData = await fetchWithToken(ENDPOINTS.ARCHIVE, { method: "GET" });
                    console.log("Archive Data:", archiveData);
                } catch (e) {
                    console.error("Archive Error:", e);
                }
                const archiveTable = document.getElementById("archive-table");
                archiveTable.innerHTML = "";
                const archiveSpinnerContainer = document.getElementById("archive-spinner");
                archiveSpinnerContainer.innerHTML = '<div class="spinner"></div>';
                const archiveSpinner = new Spinner({ color: '#f26b0a', lines: 12 }).spin(archiveSpinnerContainer.querySelector('.spinner'));
                if (archiveData.status === "success" && archiveData.data.length > 0) {
                    archiveData.data.slice(0, 5).forEach(order => {
                        archiveTable.innerHTML += `
                            <tr>
                                <td>${order.orders_id}</td>
                                <td>${order.orders_usersid}</td>
                                <td>${order.orders_totalprice || 0}</td>
                                <td>${order.orders_datetime}</td>
                            </tr>
                        `;
                    });
                } else {
                    archiveTable.innerHTML = `<tr><td colspan="4">No archived orders</td></tr>`;
                }

                document.getElementById("categories-count").textContent = categoriesCount;
                document.getElementById("services-count").textContent = servicesCount;
                document.getElementById("items-count").textContent = itemsCount;
                document.getElementById("users-count").textContent = usersCount;

                const recentUpdates = [...recentCategories, ...recentServices, ...recentItems]
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .slice(0, 4);
                const tableBody = document.getElementById("recent-updates-table");
                tableBody.innerHTML = "";
                recentUpdates.forEach(item => {
                    tableBody.innerHTML += `
                        <tr>
                            <td>${item.type}</td>
                            <td>${item.name}</td>
                            <td><img src="${item.image || 'images/placeholder.png'}" alt="${item.type} Image"></td>
                            <td>${item.date}</td>
                        </tr>
                    `;
                });

                spinner.stop();
                spinnerContainer.innerHTML = '';
                usersSpinner.stop();
                usersSpinnerContainer.innerHTML = '';
                ordersSpinner.stop();
                ordersSpinnerContainer.innerHTML = '';
                archiveSpinner.stop();
                archiveSpinnerContainer.innerHTML = '';
            } catch (error) {
                spinner.stop();
                spinnerContainer.innerHTML = '';
                usersSpinner.stop();
                usersSpinnerContainer.innerHTML = '';
                ordersSpinner.stop();
                ordersSpinnerContainer.innerHTML = '';
                archiveSpinner.stop();
                archiveSpinnerContainer.innerHTML = '';
                showAlert("error", "Error", "Failed to load dashboard: " + error.message);
            }
        }

        document.addEventListener("DOMContentLoaded", () => {
            loadDashboard();
        });