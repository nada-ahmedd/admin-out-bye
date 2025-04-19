const API_BASE_URL = "https://abdulrahmanantar.com/outbye/admin/";
const ENDPOINTS = {
    ORDERS: `${API_BASE_URL}orders/view.php`,
    ARCHIVE: `${API_BASE_URL}orders/archive.php`,
    APPROVE: `${API_BASE_URL}orders/approve.php`
};

let originalOrdersData = [];
let originalArchiveData = [];

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
        showAlert("error", "Unauthorized", "Please log in to continue");
        window.location.href = 'login.html';
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
                showAlert("error", "Session Expired", "Please log in again");
                logout();
                throw new Error("Unauthorized");
            }
            throw new Error(`HTTP error! Status: ${response.status}, Response: ${text}`);
        }
        return { status: response.status, text };
    } catch (error) {
        console.error("Request error at:", url, "Error:", error);
        throw error;
    }
}

function showAlert(icon, title, text) {
    Swal.fire({
        icon,
        title,
        text,
        confirmButtonText: 'OK'
    });
}

async function approveOrder(orderId, userId) {
    console.log("Approving order:", { ordersid: orderId, usersid: userId });
    try {
        const formData = new FormData();
        formData.append('ordersid', orderId);
        formData.append('usersid', userId);
        console.log("Request body (form-data):", formData);

        const result = await fetchWithToken(ENDPOINTS.APPROVE, {
            method: "POST",
            body: formData
        });
        console.log("After approval - Status:", result.status, "Response:", result.text);
        let responseData = { status: "error" };
        try {
            responseData = JSON.parse(result.text);
        } catch (e) {
            console.error("Error parsing approval response:", e);
        }
        if (result.status === 200 && responseData.status === "success") {
            showAlert("success", "Approved", "Order approved successfully");
            await loadOrders();
        } else {
            showAlert("error", "Error", `Failed to approve order: ${result.text}`);
        }
    } catch (error) {
        console.error("Approval error:", error);
        showAlert("error", "Error", "Failed to approve order: " + error.message);
    }
}

async function loadOrders() {
    if (!isLoggedIn()) {
        showAlert("error", "Unauthorized", "Please log in to continue");
        window.location.href = 'login.html';
        return;
    }
    const ordersSpinnerContainer = document.getElementById("orders-spinner");
    const archiveSpinnerContainer = document.getElementById("archive-spinner");
    ordersSpinnerContainer.classList.add("spinner-active");
    archiveSpinnerContainer.classList.add("spinner-active");
    ordersSpinnerContainer.innerHTML = '<div class="spinner"></div>';
    archiveSpinnerContainer.innerHTML = '<div class="spinner"></div>';
    const ordersSpinner = new Spinner({ color: '#f26b0a', lines: 12 }).spin(ordersSpinnerContainer.querySelector('.spinner'));
    const archiveSpinner = new Spinner({ color: '#f26b0a', lines: 12 }).spin(archiveSpinnerContainer.querySelector('.spinner'));

    try {
        let ordersData = { status: 0, text: "" };
        try {
            ordersData = await fetchWithToken(ENDPOINTS.ORDERS, { method: "GET" });
            console.log("Pending orders status:", ordersData.status);
        } catch (e) {
            console.error("Error fetching pending orders:", e);
        }
        let orders = [];
        if (ordersData.status === 200) {
            try {
                orders = JSON.parse(ordersData.text).data || [];
                console.log("Pending orders data:", orders);
            } catch (e) {
                console.error("Error parsing pending orders data:", e);
            }
        }
        originalOrdersData = orders;
        renderOrders(originalOrdersData);

        let archiveData = { status: 0, text: "" };
        try {
            archiveData = await fetchWithToken(ENDPOINTS.ARCHIVE, { method: "GET" });
            console.log("Archived orders status:", archiveData.status);
        } catch (e) {
            console.error("Error fetching archived orders:", e);
        }
        let archiveOrders = [];
        if (archiveData.status === 200) {
            try {
                archiveOrders = JSON.parse(archiveData.text).data || [];
                console.log("Archived orders data:", archiveOrders);
            } catch (e) {
                console.error("Error parsing archived orders data:", e);
            }
        }
        originalArchiveData = archiveOrders;
        renderArchive(originalArchiveData);

        ordersSpinner.stop();
        archiveSpinner.stop();
        ordersSpinnerContainer.classList.remove("spinner-active");
        archiveSpinnerContainer.classList.remove("spinner-active");
        ordersSpinnerContainer.innerHTML = '';
        archiveSpinnerContainer.innerHTML = '';
    } catch (error) {
        ordersSpinner.stop();
        archiveSpinner.stop();
        ordersSpinnerContainer.classList.remove("spinner-active");
        archiveSpinnerContainer.classList.remove("spinner-active");
        ordersSpinnerContainer.innerHTML = '';
        archiveSpinnerContainer.innerHTML = '';
        showAlert("error", "Error", "Failed to load orders: " + error.message);
    }
}

function renderOrders(orders) {
    const ordersTable = document.getElementById("orders-table");
    ordersTable.innerHTML = "";
    if (orders.length > 0) {
        orders.forEach(order => {
            const address = order.address_name ? `${order.address_name}, ${order.address_street}, ${order.address_city}` : "No address";
            console.log("Pending order:", order.orders_id, "orders_status:", order.orders_status);
            ordersTable.innerHTML += `
                <tr>
                    <td>${order.orders_id}</td>
                    <td>${order.orders_usersid}</td>
                    <td>${address}</td>
                    <td>${order.orders_type == 0 ? "Delivery" : "Pickup"}</td>
                    <td>${order.orders_price || 0}</td>
                    <td>${order.orders_pricedelivery || 0}</td>
                    <td>${order.orders_totalprice || 0}</td>
                    <td>${order.orders_coupon == 1 ? "Yes" : "No"}</td>
                    <td>${order.orders_paymentmethod == 0 ? "Cash" : "Other"}</td>
                    <td>${order.orders_datetime}</td>
                    <td><button class="btn btn-sm btn-custom" onclick="approveOrder(${order.orders_id}, ${order.orders_usersid})">Approve</button></td>
                </tr>
            `;
        });
    } else {
        ordersTable.innerHTML = `<tr><td colspan="11">No pending orders</td></tr>`;
    }
}

function renderArchive(archiveOrders) {
    const archiveTable = document.getElementById("archive-table");
    archiveTable.innerHTML = "";
    if (archiveOrders.length > 0) {
        archiveOrders.forEach(order => {
            const address = order.address_name ? `${order.address_name}, ${order.address_street}, ${order.address_city}` : "No address";
            console.log("Archived order:", order.orders_id, "orders_status:", order.orders_status);
            archiveTable.innerHTML += `
                <tr>
                    <td>${order.orders_id}</td>
                    <td>${order.orders_usersid}</td>
                    <td>${address}</td>
                    <td>${order.orders_type == 0 ? "Delivery" : "Pickup"}</td>
                    <td>${order.orders_price || 0}</td>
                    <td>${order.orders_pricedelivery || 0}</td>
                    <td>${order.orders_totalprice || 0}</td>
                    <td>${order.orders_coupon == 1 ? "Yes" : "No"}</td>
                    <td>${order.orders_paymentmethod == 0 ? "Cash" : "Other"}</td>
                    <td>${order.orders_datetime}</td>
                </tr>
            `;
        });
    } else {
        archiveTable.innerHTML = `<tr><td colspan="10">No archived orders</td></tr>`;
    }
}

function clearSearch() {
    const searchInput = document.getElementById("global-search-input");
    searchInput.value = "";
    document.getElementById("clear-search").style.display = "none";
    renderOrders(originalOrdersData);
    renderArchive(originalArchiveData);
}

function searchOrders() {
    const searchInput = document.getElementById("global-search-input").value.trim().toLowerCase();
    if (!searchInput) {
        renderOrders(originalOrdersData);
        renderArchive(originalArchiveData);
        return;
    }

    const filteredOrders = originalOrdersData.filter(order => {
        const address = order.address_name ? `${order.address_name}, ${order.address_street}, ${order.address_city}` : "No address";
        return (
            (order.orders_id && order.orders_id.toString().includes(searchInput)) ||
            (order.orders_usersid && order.orders_usersid.toString().includes(searchInput)) ||
            (address && address.toLowerCase().includes(searchInput)) ||
            (order.orders_type != null && (order.orders_type == 0 ? "delivery" : "pickup").includes(searchInput))
        );
    });

    const filteredArchive = originalArchiveData.filter(order => {
        const address = order.address_name ? `${order.address_name}, ${order.address_street}, ${order.address_city}` : "No address";
        return (
            (order.orders_id && order.orders_id.toString().includes(searchInput)) ||
            (order.orders_usersid && order.orders_usersid.toString().includes(searchInput)) ||
            (address && address.toLowerCase().includes(searchInput)) ||
            (order.orders_type != null && (order.orders_type == 0 ? "delivery" : "pickup").includes(searchInput))
        );
    });

    renderOrders(filteredOrders);
    renderArchive(filteredArchive);
}

document.addEventListener("DOMContentLoaded", () => {
    loadOrders();

    const searchInput = document.getElementById("global-search-input");
    const clearSearchBtn = document.getElementById("clear-search");

    searchInput.addEventListener("input", () => {
        clearSearchBtn.style.display = searchInput.value ? "block" : "none";
        searchOrders();
    });

    searchInput.addEventListener("blur", () => {
        if (!searchInput.value) {
            clearSearchBtn.style.display = "none";
            renderOrders(originalOrdersData);
            renderArchive(originalArchiveData);
        }
    });
});