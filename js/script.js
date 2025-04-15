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

async function loadOverview() {
    const overviewSpinnerContainer = document.getElementById("overview-spinner");
    overviewSpinnerContainer.style.display = "flex";
    const overviewSpinner = new Spinner({ color: '#f26b0a', lines: 12 }).spin(overviewSpinnerContainer.querySelector('.spinner'));

    try {
        let categoriesCount = 0;
        try {
            const categoriesData = await fetchWithToken(ENDPOINTS.CATEGORIES, { method: "GET" });
            if (categoriesData.status === "success") {
                categoriesCount = categoriesData.data.length;
            }
        } catch (e) {
            console.error("Categories Error:", e);
        }

        let servicesCount = 0;
        try {
            const servicesData = await fetchWithToken(ENDPOINTS.SERVICES, { method: "GET" });
            if (servicesData.status === "success") {
                servicesCount = servicesData.data.length;
            }
        } catch (e) {
            console.error("Services Error:", e);
        }

        let itemsCount = 0;
        try {
            const itemsData = await fetchWithToken(ENDPOINTS.ITEMS, { method: "GET" });
            if (itemsData.status === "success") {
                itemsCount = itemsData.data.length;
            }
        } catch (e) {
            console.error("Items Error:", e);
        }

        let usersCount = 0;
        try {
            const usersData = await fetchWithToken(ENDPOINTS.USERS, { method: "GET" });
            if (usersData.status === "success") {
                usersCount = usersData.data.length;
            }
        } catch (e) {
            console.error("Users Error:", e);
        }

        document.getElementById("categories-count").textContent = categoriesCount;
        document.getElementById("services-count").textContent = servicesCount;
        document.getElementById("items-count").textContent = itemsCount;
        document.getElementById("users-count").textContent = usersCount;
    } catch (error) {
        console.error("Overview Error:", error);
        showAlert("error", "Error", "Failed to load overview: " + error.message);
    } finally {
        overviewSpinner.stop();
        overviewSpinnerContainer.style.display = "none";
    }
}

async function loadRecentUpdates() {
    const tableSpinnerContainer = document.getElementById("table-spinner");
    tableSpinnerContainer.classList.add("spinner-active");
    const tableSpinner = new Spinner({ color: '#f26b0a', lines: 12 }).spin(tableSpinnerContainer.querySelector('.spinner'));

    try {
        let recentCategories = [];
        try {
            const categoriesData = await fetchWithToken(ENDPOINTS.CATEGORIES, { method: "GET" });
            if (categoriesData.status === "success") {
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

        let recentServices = [];
        try {
            const servicesData = await fetchWithToken(ENDPOINTS.SERVICES, { method: "GET" });
            if (servicesData.status === "success") {
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

        let recentItems = [];
        try {
            const itemsData = await fetchWithToken(ENDPOINTS.ITEMS, { method: "GET" });
            if (itemsData.status === "success") {
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
    } catch (error) {
        console.error("Recent Updates Error:", error);
        showAlert("error", "Error", "Failed to load recent updates: " + error.message);
    } finally {
        tableSpinner.stop();
        tableSpinnerContainer.classList.remove("spinner-active");
    }
}

async function loadRecentUsers() {
    const usersSpinnerContainer = document.getElementById("users-spinner");
    usersSpinnerContainer.classList.add("spinner-active");
    const usersSpinner = new Spinner({ color: '#f26b0a', lines: 12 }).spin(usersSpinnerContainer.querySelector('.spinner'));

    try {
        let recentUsers = [];
        try {
            const usersData = await fetchWithToken(ENDPOINTS.USERS, { method: "GET" });
            if (usersData.status === "success") {
                recentUsers = usersData.data.slice(0, 5);
            }
        } catch (e) {
            console.error("Users Error:", e);
        }

        const usersTable = document.getElementById("users-table");
        usersTable.innerHTML = "";
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
    } catch (error) {
        console.error("Recent Users Error:", error);
        showAlert("error", "Error", "Failed to load recent users: " + error.message);
    } finally {
        usersSpinner.stop();
        usersSpinnerContainer.classList.remove("spinner-active");
    }
}

async function loadPendingOrders() {
    const ordersSpinnerContainer = document.getElementById("orders-spinner");
    ordersSpinnerContainer.classList.add("spinner-active");
    const ordersSpinner = new Spinner({ color: '#f26b0a', lines: 12 }).spin(ordersSpinnerContainer.querySelector('.spinner'));

    try {
        let ordersData = { status: "error", data: [] };
        try {
            ordersData = await fetchWithToken(ENDPOINTS.ORDERS, { method: "GET" });
            console.log("Orders Data:", ordersData);
        } catch (e) {
            console.error("Orders Error:", e);
        }

        const ordersTable = document.getElementById("orders-table");
        ordersTable.innerHTML = "";
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
    } catch (error) {
        console.error("Pending Orders Error:", error);
        showAlert("error", "Error", "Failed to load pending orders: " + error.message);
    } finally {
        ordersSpinner.stop();
        ordersSpinnerContainer.classList.remove("spinner-active");
    }
}

async function loadArchivedOrders() {
    const archiveSpinnerContainer = document.getElementById("archive-spinner");
    archiveSpinnerContainer.classList.add("spinner-active");
    const archiveSpinner = new Spinner({ color: '#f26b0a', lines: 12 }).spin(archiveSpinnerContainer.querySelector('.spinner'));

    try {
        let archiveData = { status: "error", data: [] };
        try {
            archiveData = await fetchWithToken(ENDPOINTS.ARCHIVE, { method: "GET" });
            console.log("Archive Data:", archiveData);
        } catch (e) {
            console.error("Archive Error:", e);
        }

        const archiveTable = document.getElementById("archive-table");
        archiveTable.innerHTML = "";
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
    } catch (error) {
        console.error("Archived Orders Error:", error);
        showAlert("error", "Error", "Failed to load archived orders: " + error.message);
    } finally {
        archiveSpinner.stop();
        archiveSpinnerContainer.classList.remove("spinner-active");
    }
}

async function loadDashboard() {
    if (!isLoggedIn()) {
        showAlert("error", "Unauthorized", "Please log in to continue", () => {
            window.location.href = 'login.html';
        });
        return;
    }

    // Load each section independently
    Promise.all([
        loadOverview(),
        loadRecentUpdates(),
        loadRecentUsers(),
        loadPendingOrders(),
        loadArchivedOrders()
    ]).catch(error => {
        console.error("Dashboard Load Error:", error);
        showAlert("error", "Error", "An error occurred while loading the dashboard: " + error.message);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    loadDashboard();
});