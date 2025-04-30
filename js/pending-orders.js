const API_BASE_URL = "https://abdulrahmanantar.com/outbye/admin/";
const ENDPOINTS = {
    ORDERS: `${API_BASE_URL}orders/view.php`,
    APPROVE: `${API_BASE_URL}orders/approve.php`,
    REJECT: `${API_BASE_URL}orders/reject_order.php`
};

let originalOrdersData = [];

function isLoggedIn() {
    return localStorage.getItem('isAdminLoggedIn') === 'true' && localStorage.getItem('adminToken');
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
        showAlert("error", "Unauthorized", "Please log in to continue.", () => {
            window.location.href = 'login.html';
        });
        throw new Error("No token found");
    }

    const token = localStorage.getItem('adminToken');
    options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
    };

    if (!(options.body instanceof FormData)) {
        options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        if (typeof options.body === 'object') {
            options.body = new URLSearchParams(options.body).toString();
        }
    }

    try {
        console.log(`Fetching ${url} with method ${options.method || 'GET'}`);
        const response = await fetch(url, options);
        console.log(`Response status: ${response.status}`);
        if (!response.ok) {
            if (response.status === 401) {
                showAlert("error", "Session Expired", "Please log in again.", () => {
                    logout();
                });
                throw new Error("Unauthorized");
            }
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const text = await response.text();
        console.log(`Raw response: ${text}`);

        let data;
        try {
            const jsonMatch = text.match(/{.*}/s);
            if (jsonMatch) {
                data = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error("No JSON found in response");
            }
        } catch (e) {
            console.error("JSON Parse Error:", e, "Raw:", text);
            if (text.includes('"status":"success"')) {
                return { status: "success", message: "Operation completed successfully (parsed from raw response)" };
            }
            throw new Error("Invalid JSON response");
        }
        return data;
    } catch (error) {
        console.error(`Fetch Error for ${url}:`, error);
        throw error;
    }
}

function showAlert(icon, title, text, callback) {
    Swal.fire({
        icon,
        title,
        text,
        confirmButtonText: 'OK',
        confirmButtonColor: '#f26b0a'
    }).then(() => {
        if (callback) callback();
    });
}

async function approveOrder(orderId, userId) {
    const formData = new FormData();
    formData.append('ordersid', orderId);
    formData.append('usersid', userId);

    try {
        const data = await fetchWithToken(ENDPOINTS.APPROVE, { method: "POST", body: formData });
        if (data.status === "success") {
            showAlert("success", "Approved", data.message || "Order approved successfully.");
            await loadOrders();
        } else {
            showAlert("error", "Error", data.message || "Failed to approve order.");
        }
    } catch (error) {
        showAlert("error", "Error", `Failed to approve order: ${error.message}`);
    }
}

async function rejectOrder(orderId, userId) {
    const formData = new FormData();
    formData.append('ordersid', orderId);
    formData.append('usersid', userId);

    try {
        const data = await fetchWithToken(ENDPOINTS.REJECT, { method: "POST", body: formData });
        if (data.status === "success") {
            showAlert("success", "Rejected", data.message || "Order rejected successfully.");
            await loadOrders();
        } else {
            showAlert("error", "Error", data.message || "Failed to reject order.");
        }
    } catch (error) {
        showAlert("error", "Error", `Failed to reject order: ${error.message}`);
    }
}

async function loadOrders() {
    if (!isLoggedIn()) {
        showAlert("error", "Unauthorized", "Please log in to continue.", () => {
            window.location.href = 'login.html';
        });
        return;
    }

    const spinnerContainer = document.getElementById("orders-spinner");
    spinnerContainer.classList.add("spinner-active");
    const spinner = new Spinner({ color: '#f26b0a', lines: 12 }).spin(spinnerContainer);

    try {
        const data = await fetchWithToken(ENDPOINTS.ORDERS, { method: "GET" });
        if (data.status === "success") {
            originalOrdersData = data.data.filter(order => order.orders_status == 0);
            renderOrders(originalOrdersData);
        } else {
            showAlert("error", "Error", data.message || "Failed to load orders.");
        }
    } catch (error) {
        showAlert("error", "Error", `Failed to load orders: ${error.message}`);
    } finally {
        spinner.stop();
        spinnerContainer.classList.remove("spinner-active");
    }
}

function renderOrders(orders) {
    const ordersGrid = document.getElementById("orders-grid");
    if (!ordersGrid) {
        console.error("Error: orders-grid element not found in the DOM");
        return;
    }
    ordersGrid.innerHTML = "";

    const pendingOrders = orders.filter(order => order.orders_status == 0);
    if (pendingOrders.length > 0) {
        pendingOrders.forEach(order => {
            const orderType = order.orders_type == 0 ? "Delivery" : "Takeaway";
            ordersGrid.innerHTML += `
                <div class="order-card">
                    <h5>Order #${order.orders_id}</h5>
                    <div class="order-info">User ID: ${order.orders_usersid}</div>
                    <div class="order-info">Type: ${orderType}</div>
                    <div class="order-info">Total: ${order.orders_totalprice || 0}</div>
                    <div class="order-info">Date: ${order.orders_datetime}</div>
                    <div class="actions">
                        <button class="btn btn-action btn-approve" onclick="approveOrder(${order.orders_id}, ${order.orders_usersid})">
                            <i class="fas fa-check"></i> Approve
                        </button>
                        <button class="btn btn-action btn-reject" onclick="rejectOrder(${order.orders_id}, ${order.orders_usersid})">
                            <i class="fas fa-times"></i> Reject
                        </button>
                        <button class="btn-show-more" onclick="showOrderDetails(${order.orders_id}, ${order.orders_usersid}, '${order.address_name || ''}', '${order.address_street || ''}', '${order.address_city || ''}', ${order.orders_type}, ${order.orders_price || 0}, ${order.orders_pricedelivery || 0}, ${order.orders_totalprice || 0}, ${order.orders_coupon}, ${order.orders_paymentmethod}, '${order.orders_datetime}')">
                            <i class="fas fa-info-circle"></i> Show More
                        </button>
                    </div>
                </div>
            `;
        });
    } else {
        ordersGrid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 20px;">No pending orders</div>`;
    }
}

function showOrderDetails(id, userId, addressName, addressStreet, addressCity, type, price, deliveryPrice, totalPrice, coupon, paymentMethod, datetime) {
    const address = addressName ? `${addressName}, ${addressStreet}, ${addressCity}` : "No address";
    const orderType = type == 0 ? "Delivery" : "Takeaway";
    const couponStatus = coupon == 1 ? "Yes" : "No";
    const payment = paymentMethod == 0 ? "Cash" : "Other";

    Swal.fire({
        title: `Order #${id}`,
        html: `
            <div style="text-align: left; font-size: 0.9rem; line-height: 1.5;">
                <p><strong>Order ID:</strong> ${id}</p>
                <p><strong>User ID:</strong> ${userId}</p>
                <p><strong>Address:</strong> ${address}</p>
                <p><strong>Type:</strong> ${orderType}</p>
                <p><strong>Price:</strong> ${price}</p>
                <p><strong>Delivery Price:</strong> ${deliveryPrice}</p>
                <p><strong>Total Price:</strong> ${totalPrice}</p>
                <p><strong>Coupon:</strong> ${couponStatus}</p>
                <p><strong>Payment Method:</strong> ${payment}</p>
                <p><strong>Date:</strong> ${datetime}</p>
            </div>
        `,
        confirmButtonText: 'Close',
        confirmButtonColor: '#f26b0a'
    });
}

function clearSearch() {
    const searchInput = document.getElementById("global-search-input");
    searchInput.value = "";
    document.getElementById("clear-search").style.display = "none";
    renderOrders(originalOrdersData);
}

function searchOrders() {
    const searchInput = document.getElementById("global-search-input").value.trim().toLowerCase();
    const clearSearchBtn = document.getElementById("clear-search");
    clearSearchBtn.style.display = searchInput ? "block" : "none";

    if (!searchInput) {
        renderOrders(originalOrdersData);
        return;
    }

    const filteredOrders = originalOrdersData.filter(order => {
        const address = order.address_name ? `${order.address_name}, ${order.address_street}, ${order.address_city}` : "No address";
        return (
            (order.orders_id && order.orders_id.toString().includes(searchInput)) ||
            (order.orders_usersid && order.orders_usersid.toString().includes(searchInput)) ||
            (address && address.toLowerCase().includes(searchInput)) ||
            (order.orders_type != null && (order.orders_type == 0 ? "delivery" : "takeaway").includes(searchInput))
        );
    });

    renderOrders(filteredOrders);
}

document.addEventListener("DOMContentLoaded", () => {
    loadOrders();

    const searchInput = document.getElementById("global-search-input");
    searchInput.addEventListener("input", searchOrders);
    searchInput.addEventListener("blur", clearSearch);
});