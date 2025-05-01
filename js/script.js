const API_BASE_URL = "https://abdulrahmanantar.com/outbye/admin/";
const SEARCH_API_URL = "https://abdulrahmanantar.com/outbye/items/search.php";
const FEEDBACK_API_URL = "https://abdulrahmanantar.com/outbye/user_review/view.php";
const DELETE_FEEDBACK_API = "https://abdulrahmanantar.com/outbye/user_review/delete.php";

const ENDPOINTS = {
    CATEGORIES: `${API_BASE_URL}categories/view.php`,
    SERVICES: `${API_BASE_URL}services/view.php`,
    ITEMS: `${API_BASE_URL}items/view.php`,
    ORDERS: `${API_BASE_URL}orders/view.php`,
    ARCHIVE: `${API_BASE_URL}orders/archive.php`,
    REJECT_ARCHIVE: `${API_BASE_URL}orders/archive_reject.php`,
    APPROVE: `${API_BASE_URL}orders/approve.php`,
    REJECT: `${API_BASE_URL}orders/reject_order.php`,
    USERS: `${API_BASE_URL}users/view.php`,
    SEND_NOTIFICATION: `${API_BASE_URL}send_notification_all.php`
};

const DEFAULT_IMAGE = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
let originalFeedbackData = [];
let ordersChartInstance = null;

// Check if user is logged in
function isLoggedIn() {
    const isLoggedIn = localStorage.getItem('isAdminLoggedIn') === 'true' && localStorage.getItem('adminToken');
    console.log("Are you logged in?", isLoggedIn, "Token:", localStorage.getItem('adminToken'));
    return isLoggedIn;
}

// Log out user
function logout() {
    localStorage.removeItem('isAdminLoggedIn');
    localStorage.removeItem('adminId');
    localStorage.removeItem('adminToken');
    window.location.href = 'login.html';
}

// Toggle sidebar visibility
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('active');
    }
}

// Fetch data with authorization token
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

    // Set Content-Type only if not using FormData
    if (!(options.body instanceof FormData)) {
        options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }

    console.log("Requesting:", url, "Options:", options);
    console.log("Token being sent:", token);

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

        let data;
        try {
            const trimmedText = text.trim();
            if (!trimmedText) {
                throw new Error("Empty response received");
            }

            if (trimmedText.startsWith('[')) {
                data = JSON.parse(trimmedText);
            } else if (trimmedText.startsWith('{')) {
                data = JSON.parse(trimmedText);
            } else {
                throw new Error("No valid JSON found in response");
            }
        } catch (e) {
            console.error("JSON Parse Error:", e, "Raw:", text);
            throw new Error("Invalid JSON response: " + e.message);
        }
        return data;
    } catch (error) {
        console.error("Fetch Error:", error);
        throw error;
    }
}

// Show alert using SweetAlert2
function showAlert(icon, title, text, callback) {
    Swal.fire({
        icon,
        title,
        text,
        confirmButtonText: 'OK',
        confirmButtonColor: '#f26b0a',
        position: 'top-end',
        toast: true,
        showConfirmButton: false,
        timer: 3000
    }).then(() => {
        if (callback) callback();
    });
}

// Delete feedback
async function deleteFeedback(feedbackId) {
    if (!isLoggedIn()) {
        showAlert("error", "Unauthorized", "Please log in to continue", () => {
            window.location.href = 'login.html';
        });
        return;
    }

    const confirmed = await Swal.fire({
        icon: 'warning',
        title: 'Are you sure?',
        text: 'This feedback will be permanently deleted.',
        showCancelButton: true,
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#f26b0a',
        cancelButtonColor: '#6c757d'
    });

    if (!confirmed.isConfirmed) return;

    try {
        const response = await fetchWithToken(DELETE_FEEDBACK_API, {
            method: 'POST',
            body: new URLSearchParams({ id: feedbackId })
        });

        if (response.status === 'success') {
            showAlert('success', 'Deleted', 'Feedback deleted successfully');
            // Update UI by removing the deleted feedback
            originalFeedbackData = originalFeedbackData.filter(item => item.id !== feedbackId);
            renderFeedback(originalFeedbackData);
        } else {
            showAlert('error', 'Error', response.message || 'Failed to delete feedback');
        }
    } catch (error) {
        console.error("Delete Feedback Error:", error);
        showAlert('error', 'Error', 'Failed to delete feedback: ' + error.message);
    }
}

// Send notification to all users
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
            console.log("FormData:", [...formData.entries()]);

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

// Approve an order
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

// Reject an order
async function rejectOrder(orderId, userId) {
    console.log("Rejecting order:", { ordersid: orderId, usersid: userId });
    try {
        const formData = new FormData();
        formData.append('ordersid', orderId);
        formData.append('usersid', userId);
        console.log("Request body (form-data):", formData);

        const response = await fetchWithToken(ENDPOINTS.REJECT, {
            method: "POST",
            body: formData
        });
        console.log("Reject Response:", response);
        if (response.status === "success") {
            showAlert("success", "Rejected", "Order rejected successfully", () => {
                loadDashboard();
            });
        } else {
            showAlert("error", "Error", response.message || "Failed to reject order");
        }
    } catch (error) {
        console.error("Reject Error:", error);
        showAlert("error", "Error", "Failed to reject order: " + error.message);
    }
}

// Load overview data
async function loadOverview() {
    const overviewSpinnerContainer = document.getElementById("overview-spinner");
    if (!overviewSpinnerContainer) {
        console.error("Overview spinner container not found");
        return;
    }

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
            if (Array.isArray(servicesData)) {
                servicesCount = servicesData.length;
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

        const categoriesCountElement = document.getElementById("categories-count");
        const servicesCountElement = document.getElementById("services-count");
        const itemsCountElement = document.getElementById("items-count");
        const usersCountElement = document.getElementById("users-count");

        if (categoriesCountElement) categoriesCountElement.textContent = categoriesCount;
        if (servicesCountElement) servicesCountElement.textContent = servicesCount;
        if (itemsCountElement) itemsCountElement.textContent = itemsCount;
        if (usersCountElement) usersCountElement.textContent = usersCount;
    } catch (error) {
        console.error("Overview Error:", error);
        showAlert("error", "Error", "Failed to load overview: " + error.message);
    } finally {
        overviewSpinner.stop();
        overviewSpinnerContainer.style.display = "none";
    }
}

// Load orders chart
async function loadOrdersChart() {
    const canvas = document.getElementById('ordersChart');
    const ctx = canvas?.getContext('2d');
    if (!ctx) {
        console.error("Orders chart canvas not found");
        return;
    }

    const existingChart = Chart.getChart('ordersChart');
    if (existingChart) {
        existingChart.destroy();
    }

    if (ordersChartInstance) {
        ordersChartInstance.destroy();
        ordersChartInstance = null;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    try {
        const ordersData = await fetchWithToken(ENDPOINTS.ORDERS, { method: "GET" });
        const archiveData = await fetchWithToken(ENDPOINTS.ARCHIVE, { method: "GET" });
        const rejectArchiveData = await fetchWithToken(ENDPOINTS.REJECT_ARCHIVE, { method: "GET" });

        let pendingCount = 0, approvedCount = 0, rejectedCount = 0;

        // Count pending orders from ORDERS endpoint
        if (ordersData.status === "success" && Array.isArray(ordersData.data)) {
            pendingCount = ordersData.data.filter(order => order.orders_status == 0).length;
        }

        // Count approved orders from ARCHIVE endpoint
        if (archiveData.status === "success" && Array.isArray(archiveData.data)) {
            approvedCount = archiveData.data.length; // Assuming all orders in ARCHIVE are approved
        }

        // Count rejected orders from REJECT_ARCHIVE endpoint
        if (rejectArchiveData.status === "success" && Array.isArray(rejectArchiveData.data)) {
            rejectedCount = rejectArchiveData.data.length; // Assuming all orders in REJECT_ARCHIVE are rejected
        }

        ordersChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Pending', 'Approved', 'Rejected'],
                datasets: [{
                    data: [pendingCount, approvedCount, rejectedCount],
                    backgroundColor: ['#f26b0a', '#2b5c3b', '#dc3545'],
                    borderColor: '#fff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: {
                                size: 12,
                                family: 'Inter'
                            }
                        }
                    },
                    tooltip: {
                        enabled: true
                    }
                }
            }
        });
    } catch (error) {
        console.error("Orders Chart Error:", error);
        showAlert("error", "Error", "Failed to load orders chart: " + error.message);
    }
}

// Search across all entities
async function searchAll(query) {
    try {
        const formData = new FormData();
        formData.append('search', query);
        const response = await fetchWithToken(SEARCH_API_URL, {
            method: "POST",
            body: formData
        });

        return {
            categories: Array.isArray(response.categories) ? response.categories : [],
            services: Array.isArray(response.services) ? response.services : [],
            items: Array.isArray(response.items) ? response.items : [],
            users: Array.isArray(response.users) ? response.users : [],
            orders: Array.isArray(response.orders) ? response.orders : [],
            archivedOrders: Array.isArray(response.archivedOrders) ? response.archivedOrders : []
        };
    } catch (error) {
        console.error("Search Error:", error);
        showAlert("error", "Error", "Failed to search: " + error.message);
        return {
            categories: [],
            services: [],
            items: [],
            users: [],
            orders: [],
            archivedOrders: []
        };
    }
}

// Load recent updates
async function loadRecentUpdates(searchData = null) {
    const tableSpinnerContainer = document.getElementById("table-spinner");
    if (!tableSpinnerContainer) {
        console.error("Table spinner container not found");
        return;
    }

    tableSpinnerContainer.classList.add("spinner-active");
    const tableSpinner = new Spinner({ color: '#f26b0a', lines: 12 }).spin(tableSpinnerContainer.querySelector('.spinner'));

    try {
        let recentUpdates = [];
        const defaultDate = new Date().toISOString();

        if (searchData) {
            const categories = Array.isArray(searchData.categories) ? searchData.categories : [];
            const services = Array.isArray(searchData.services) ? searchData.services : [];
            const items = Array.isArray(searchData.items) ? searchData.items : [];

            recentUpdates = [
                ...categories.map(item => ({
                    type: "Category",
                    name: item.categories_name || "Unknown",
                    image: item.categories_image || "",
                    date: item.categories_datetime || defaultDate
                })),
                ...services.map(item => ({
                    type: "Service",
                    name: item.service_name || "Unknown",
                    image: item.service_image || "",
                    date: item.service_datetime || item.service_created || defaultDate
                })),
                ...items.map(item => ({
                    type: "Item",
                    name: item.items_name || "Unknown",
                    image: item.items_image || "",
                    date: item.items_date || defaultDate
                }))
            ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 4);
        } else {
            let recentCategories = [];
            try {
                const categoriesData = await fetchWithToken(ENDPOINTS.CATEGORIES, { method: "GET" });
                if (categoriesData.status === "success") {
                    recentCategories = categoriesData.data.slice(0, 4).map(item => ({
                        type: "Category",
                        name: item.categories_name,
                        image: item.categories_image,
                        date: item.categories_datetime && !isNaN(new Date(item.categories_datetime)) ? item.categories_datetime : defaultDate
                    }));
                }
            } catch (e) {
                console.error("Categories Error:", e);
            }

            let recentServices = [];
            try {
                const servicesData = await fetchWithToken(ENDPOINTS.SERVICES, { method: "GET" });
                if (Array.isArray(servicesData)) {
                    recentServices = servicesData.slice(0, 4).map(item => ({
                        type: "Service",
                        name: item.service_name || "Unknown",
                        image: item.service_image || "",
                        date: item.service_datetime && !isNaN(new Date(item.service_datetime)) ? item.service_datetime : (item.service_created && !isNaN(new Date(item.service_created)) ? item.service_created : defaultDate)
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
                        name: item.items_name || "Unknown",
                        image: item.items_image || "",
                        date: item.items_date && !isNaN(new Date(item.items_date)) ? item.items_date : defaultDate
                    }));
                }
            } catch (e) {
                console.error("Items Error:", e);
            }

            recentUpdates = [...recentCategories, ...recentServices, ...recentItems]
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 4);
        }

        const tableBody = document.getElementById("recent-updates-table");
        if (!tableBody) {
            console.error("Recent updates table not found");
            return;
        }

        tableBody.innerHTML = "";
        if (recentUpdates.length > 0) {
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
        } else {
            tableBody.innerHTML = `<tr><td colspan="4">No results found</td></tr>`;
        }
    } catch (error) {
        console.error("Recent Updates Error:", error);
        showAlert("error", "Error", "Failed to load recent updates: " + error.message);
    } finally {
        tableSpinner.stop();
        tableSpinnerContainer.classList.remove("spinner-active");
    }
}

// Load recent users
async function loadRecentUsers(searchData = null) {
    const usersSpinnerContainer = document.getElementById("users-spinner");
    if (!usersSpinnerContainer) {
        console.error("Users spinner container not found");
        return;
    }

    usersSpinnerContainer.classList.add("spinner-active");
    const usersSpinner = new Spinner({ color: '#f26b0a', lines: 12 }).spin(usersSpinnerContainer.querySelector('.spinner'));

    try {
        let recentUsers = [];
        if (searchData) {
            recentUsers = Array.isArray(searchData.users) ? searchData.users.slice(0, 5) : [];
        } else {
            try {
                const usersData = await fetchWithToken(ENDPOINTS.USERS, { method: "GET" });
                if (usersData.status === "success") {
                    recentUsers = usersData.data.slice(0, 5);
                }
            } catch (e) {
                console.error("Users Error:", e);
            }
        }

        const usersTable = document.getElementById("users-table");
        if (!usersTable) {
            console.error("Users table not found");
            return;
        }

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

// Load pending orders
async function loadPendingOrders(searchData = null) {
    const ordersSpinnerContainer = document.getElementById("orders-spinner");
    if (!ordersSpinnerContainer) {
        console.error("Orders spinner container not found");
        return;
    }

    ordersSpinnerContainer.classList.add("spinner-active");
    const ordersSpinner = new Spinner({ color: '#f26b0a', lines: 12 }).spin(ordersSpinnerContainer.querySelector('.spinner'));

    try {
        let ordersData = [];
        if (searchData) {
            ordersData = Array.isArray(searchData.orders) ? searchData.orders.filter(order => order.orders_status == 0).slice(0, 5) : [];
        } else {
            try {
                const response = await fetchWithToken(ENDPOINTS.ORDERS, { method: "GET" });
                if (response.status === "success") {
                    ordersData = response.data.filter(order => order.orders_status == 0).slice(0, 5);
                }
            } catch (e) {
                console.error("Orders Error:", e);
            }
        }

        const ordersTable = document.getElementById("orders-table");
        if (!ordersTable) {
            console.error("Orders table not found");
            return;
        }

        ordersTable.innerHTML = "";
        if (ordersData.length > 0) {
            ordersData.forEach(order => {
                ordersTable.innerHTML += `
                    <tr>
                        <td>${order.orders_id}</td>
                        <td>${order.orders_usersid}</td>
                        <td>${order.orders_totalprice || 0}</td>
                        <td>${order.orders_datetime}</td>
                        <td>
                            <button class="btn btn-sm btn-custom" onclick="approveOrder(${order.orders_id}, ${order.orders_usersid})">Approve</button>
                            <button class="btn btn-sm btn-danger" onclick="rejectOrder(${order.orders_id}, ${order.orders_usersid})">Reject</button>
                        </td>
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

// Load archived orders
async function loadArchivedOrders(searchData = null) {
    const archiveSpinnerContainer = document.getElementById("archive-spinner");
    if (!archiveSpinnerContainer) {
        console.error("Archive spinner container not found");
        return;
    }

    archiveSpinnerContainer.classList.add("spinner-active");
    const archiveSpinner = new Spinner({ color: '#f26b0a', lines: 12 }).spin(archiveSpinnerContainer.querySelector('.spinner'));

    try {
        let archiveData = [];
        let rejectArchiveData = [];

        if (searchData) {
            archiveData = Array.isArray(searchData.archivedOrders) ? searchData.archivedOrders.filter(order => order.orders_status == 2).slice(0, 5) : [];
            rejectArchiveData = Array.isArray(searchData.archivedOrders) ? searchData.archivedOrders.filter(order => order.orders_status == 1).slice(0, 5) : [];
        } else {
            try {
                const archiveResponse = await fetchWithToken(ENDPOINTS.ARCHIVE, { method: "GET" });
                if (archiveResponse.status === "success") {
                    archiveData = archiveResponse.data.map(order => ({ ...order, orders_status: 2 })); // Mark as approved
                }
            } catch (e) {
                console.error("Archive Error:", e);
            }

            try {
                const rejectResponse = await fetchWithToken(ENDPOINTS.REJECT_ARCHIVE, { method: "GET" });
                if (rejectResponse.status === "success") {
                    rejectArchiveData = rejectResponse.data.map(order => ({ ...order, orders_status: 1 })); // Mark as rejected
                }
            } catch (e) {
                console.error("Reject Archive Error:", e);
            }
        }

        // Combine and sort archived orders (approved and rejected)
        const combinedArchiveData = [...archiveData, ...rejectArchiveData]
            .sort((a, b) => new Date(b.orders_datetime) - new Date(a.orders_datetime))
            .slice(0, 5);

        const archiveTable = document.getElementById("archive-table");
        if (!archiveTable) {
            console.error("Archive table not found");
            return;
        }

        archiveTable.innerHTML = "";
        if (combinedArchiveData.length > 0) {
            combinedArchiveData.forEach(order => {
                const statusText = order.orders_status == 1 ? "Rejected" : order.orders_status == 2 ? "Approved" : "Unknown";
                archiveTable.innerHTML += `
                    <tr>
                        <td>${order.orders_id}</td>
                        <td>${order.orders_usersid}</td>
                        <td>${order.orders_totalprice || 0}</td>
                        <td>${order.orders_datetime}</td>
                        <td>${statusText}</td>
                    </tr>
                `;
            });
        } else {
            archiveTable.innerHTML = `<tr><td colspan="5">No archived orders</td></tr>`;
        }
    } catch (error) {
        console.error("Archived Orders Error:", error);
        showAlert("error", "Error", "Failed to load archived orders: " + error.message);
    } finally {
        archiveSpinner.stop();
        archiveSpinnerContainer.classList.remove("spinner-active");
    }
}

// Render feedback data as cards
function renderFeedback(feedback) {
    const feedbackGrid = document.getElementById("feedback-table");
    if (!feedbackGrid) {
        console.error("Feedback grid not found");
        return;
    }

    feedbackGrid.innerHTML = "";
    if (!feedback || feedback.length === 0) {
        feedbackGrid.innerHTML = '<p class="text-center text-muted w-100">No feedback found.</p>';
        return;
    }

    feedback.forEach(item => {
        const image = item.users_image || DEFAULT_IMAGE;
        const stars = Array(5).fill('<i class="fas fa-star text-warning"></i>').map((star, index) => {
            return index < item.rating ? star : '<i class="far fa-star text-warning"></i>';
        }).join("");
        const card = `
            <div class="feedback-card">
                <img src="${image}" alt="${item.users_name}" loading="lazy" onerror="this.src='${DEFAULT_IMAGE}'">
                <h5>${item.users_name}</h5>
                <div class="feedback-info">User ID: ${item.user_id}</div>
                <div class="feedback-info">Comment: ${item.comment}</div>
                <div class="feedback-info">Rating: ${stars}</div>
                <div class="feedback-info">Service: ${item.service_type}</div>
                <button class="delete-btn" onclick="deleteFeedback('${item.id}')">
                    <i class="fas fa-trash-alt"></i> Delete
                </button>
            </div>
        `;
        feedbackGrid.innerHTML += card;
    });
}

// Clear search input
function clearSearch() {
    const searchInput = document.getElementById("global-search-input");
    const clearSearchBtn = document.getElementById("clear-search");
    if (searchInput && clearSearchBtn) {
        searchInput.value = "";
        clearSearchBtn.style.display = "none";
        renderFeedback(originalFeedbackData);
    }
}

// Search feedback data
function searchFeedback() {
    const searchInput = document.getElementById("global-search-input");
    if (!searchInput) {
        console.error("Search input not found");
        return;
    }

    const searchValue = searchInput.value.trim().toLowerCase();
    const clearSearchBtn = document.getElementById("clear-search");
    clearSearchBtn.style.display = searchValue ? "block" : "none";

    if (!searchValue) {
        renderFeedback(originalFeedbackData);
        return;
    }

    const filteredFeedback = originalFeedbackData.filter(item =>
        (item.id && item.id.toString().includes(searchValue)) ||
        (item.users_name && item.users_name.toLowerCase().includes(searchValue)) ||
        (item.user_id && item.user_id.toString().includes(searchValue)) ||
        (item.service_type && item.service_type.toLowerCase().includes(searchValue)) ||
        (item.rating && item.rating.toString().includes(searchValue))
    );
    renderFeedback(filteredFeedback);
}

// Load feedback data
async function loadFeedback() {
    const feedbackSkeleton = document.getElementById("feedback-skeleton");
    if (!feedbackSkeleton) {
        console.error("Feedback skeleton grid not found");
        return;
    }

    feedbackSkeleton.style.display = "grid";
    const feedbackSpinner = new Spinner({ color: '#f26b0a', lines: 12 }).spin(feedbackSkeleton);

    try {
        const feedbackData = await fetchWithToken(FEEDBACK_API_URL, { method: "GET" });
        feedbackSkeleton.style.display = "none";
        feedbackSpinner.stop();

        if (feedbackData && Array.isArray(feedbackData) && feedbackData.length > 0) {
            originalFeedbackData = feedbackData;
            renderFeedback(feedbackData);
        } else {
            originalFeedbackData = [];
            renderFeedback([]);
        }
    } catch (error) {
        console.error("Feedback Error:", error);
        showAlert("error", "Error", "Failed to load feedback: " + error.message);
        feedbackSkeleton.style.display = "none";
        feedbackSpinner.stop();
        renderFeedback([]);
    }
}

// Load dashboard data
async function loadDashboard(searchQuery = "") {
    if (!isLoggedIn()) {
        showAlert("error", "Unauthorized", "Please log in to continue", () => {
            window.location.href = 'login.html';
        });
        return;
    }

    let searchData = null;
    if (searchQuery) {
        searchData = await searchAll(searchQuery);
    }

    await Promise.all([
        loadOverview(),
        loadRecentUpdates(searchData),
        loadRecentUsers(searchData),
        loadPendingOrders(searchData),
        loadArchivedOrders(searchData),
        loadOrdersChart()
    ]).catch(error => {
        console.error("Dashboard Load Error:", error);
        showAlert("error", "Error", "An error occurred while loading the dashboard: " + error.message);
    });
}

// Handle search input
function handleSearch() {
    const searchQuery = document.getElementById("global-search-input")?.value.trim();
    loadDashboard(searchQuery);
    const clearButton = document.getElementById("clear-search");
    if (clearButton) {
        clearButton.style.display = searchQuery ? "block" : "none";
    }
}

// Initialize page
document.addEventListener("DOMContentLoaded", () => {
    const currentPage = window.location.pathname.split('/').pop();
    if (currentPage === 'feedback.html') {
        loadFeedback();

        const searchInput = document.getElementById("global-search-input");
        const clearSearchBtn = document.getElementById("clear-search");

        if (searchInput && clearSearchBtn) {
            searchInput.addEventListener("input", searchFeedback);
            searchInput.addEventListener("blur", () => {
                if (!searchInput.value) {
                    clearSearchBtn.style.display = "none";
                    renderFeedback(originalFeedbackData);
                }
            });
        }
    } else {
        loadDashboard("");
    }

    const searchInput = document.getElementById("global-search-input");
    if (searchInput) {
        searchInput.addEventListener("input", handleSearch);
    }

    setInterval(() => {
        const searchQuery = document.getElementById("global-search-input")?.value.trim() || "";
        if (currentPage === 'feedback.html') {
            loadFeedback();
        } else {
            loadDashboard(searchQuery);
        }
    }, 300000);
});