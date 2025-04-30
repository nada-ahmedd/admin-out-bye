const API_BASE_URL = "https://abdulrahmanantar.com/outbye/admin/";
const ENDPOINTS = {
    ARCHIVE: `${API_BASE_URL}orders/archive.php`,
    REJECT_ARCHIVE: `${API_BASE_URL}orders/archive_reject.php`
};

let originalArchiveData = [];
let originalRejectData = [];
let displayedArchiveCount = 10;
let displayedRejectCount = 10;
let isArchiveExpanded = false;
let isRejectExpanded = false;
const ITEMS_PER_PAGE = 10;

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
    console.log("Requesting:", url, "Options:", options);

    try {
        const response = await fetch(url, options);
        const text = await response.text();
        console.log("Raw response from:", url, "Response:", text, "Status:", response.status);
        if (!response.ok) {
            if (response.status === 401) {
                showAlert("error", "Session Expired", "Please log in again.", () => {
                    logout();
                });
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

function renderArchive(archiveOrders, limit = displayedArchiveCount) {
    const grid = document.getElementById("archive-grid");
    grid.innerHTML = ''; // Clear existing content

    if (!archiveOrders || archiveOrders.length === 0) {
        grid.innerHTML = '<p class="text-center text-muted w-100">No approved orders found.</p>';
        document.getElementById("archive-view-more").style.display = "none";
        return;
    }

    const ordersToShow = archiveOrders.slice(0, limit);
    ordersToShow.forEach(order => {
        const address = order.address_name ? `${order.address_name}, ${order.address_street}, ${order.address_city}` : "No address";
        const card = `
            <div class="order-card">
                <h5>Order #${order.orders_id}</h5>
                <div class="order-info">User ID: ${order.orders_usersid}</div>
                <div class="order-info">Address: ${address}</div>
                <div class="order-info">Total: ${order.orders_totalprice || 0}</div>
                <div class="actions">
                    <button class="btn btn-action btn-details" data-tooltip="View order details" onclick="showOrderDetails('Approved', ${order.orders_id}, '${order.orders_usersid}', '${address}', '${order.orders_type}', '${order.orders_price}', '${order.orders_pricedelivery}', '${order.orders_totalprice}', '${order.orders_coupon}', '${order.orders_paymentmethod}', '${order.orders_datetime}', '${order.orders_rating}', '${order.orders_noterating}')">Show Details</button>
                </div>
            </div>
        `;
        grid.innerHTML += card;
    });

    // Update View More/View Less button
    const viewMoreContainer = document.getElementById("archive-view-more");
    const toggleBtn = document.getElementById("archive-toggle-btn");
    const toggleBtnText = toggleBtn.querySelector('span');
    const toggleBtnIcon = toggleBtn.querySelector('i');

    if (archiveOrders.length > ITEMS_PER_PAGE) {
        viewMoreContainer.style.display = "block";
        if (isArchiveExpanded) {
            toggleBtnText.textContent = "View Less";
            toggleBtn.classList.add("view-less");
            toggleBtnIcon.classList.replace("fa-chevron-down", "fa-chevron-up");
        } else {
            toggleBtnText.textContent = "View More";
            toggleBtn.classList.remove("view-less");
            toggleBtnIcon.classList.replace("fa-chevron-up", "fa-chevron-down");
        }
        toggleBtn.classList.add("pulse");
        setTimeout(() => toggleBtn.classList.remove("pulse"), 500);
    } else {
        viewMoreContainer.style.display = "none";
    }
}

function renderRejected(rejectedOrders, limit = displayedRejectCount) {
    const grid = document.getElementById("reject-grid");
    grid.innerHTML = ''; // Clear existing content

    if (!rejectedOrders || rejectedOrders.length === 0) {
        grid.innerHTML = '<p class="text-center text-muted w-100">No rejected orders found.</p>';
        document.getElementById("reject-view-more").style.display = "none";
        return;
    }

    const ordersToShow = rejectedOrders.slice(0, limit);
    ordersToShow.forEach(order => {
        const address = order.address_name ? `${order.address_name}, ${order.address_street}, ${order.address_city}` : "No address";
        const card = `
            <div class="order-card">
                <h5>Order #${order.orders_id}</h5>
                <div class="order-info">User ID: ${order.orders_usersid}</div>
                <div class="order-info">Address: ${address}</div>
                <div class="order-info">Total: ${order.orders_totalprice || 0}</div>
                <div class="actions">
                    <button class="btn btn-action btn-details" data-tooltip="View order details" onclick="showOrderDetails('Rejected', ${order.orders_id}, '${order.orders_usersid}', '${address}', '${order.orders_type}', '${order.orders_price}', '${order.orders_pricedelivery}', '${order.orders_totalprice}', '${order.orders_coupon}', '${order.orders_paymentmethod}', '${order.orders_datetime}')">Show Details</button>
                </div>
            </div>
        `;
        grid.innerHTML += card;
    });

    // Update View More/View Less button
    const viewMoreContainer = document.getElementById("reject-view-more");
    const toggleBtn = document.getElementById("reject-toggle-btn");
    const toggleBtnText = toggleBtn.querySelector('span');
    const toggleBtnIcon = toggleBtn.querySelector('i');

    if (rejectedOrders.length > ITEMS_PER_PAGE) {
        viewMoreContainer.style.display = "block";
        if (isRejectExpanded) {
            toggleBtnText.textContent = "View Less";
            toggleBtn.classList.add("view-less");
            toggleBtnIcon.classList.replace("fa-chevron-down", "fa-chevron-up");
        } else {
            toggleBtnText.textContent = "View More";
            toggleBtn.classList.remove("view-less");
            toggleBtnIcon.classList.replace("fa-chevron-up", "fa-chevron-down");
        }
        toggleBtn.classList.add("pulse");
        setTimeout(() => toggleBtn.classList.remove("pulse"), 500);
    } else {
        viewMoreContainer.style.display = "none";
    }
}

function toggleView(type) {
    if (type === "archive") {
        isArchiveExpanded = !isArchiveExpanded;
        displayedArchiveCount = isArchiveExpanded ? originalArchiveData.length : ITEMS_PER_PAGE;
        renderArchive(originalArchiveData, displayedArchiveCount);
        // Smooth scroll to the bottom of the grid
        const grid = document.getElementById("archive-grid");
        grid.scrollIntoView({ behavior: "smooth", block: "end" });
    } else if (type === "reject") {
        isRejectExpanded = !isRejectExpanded;
        displayedRejectCount = isRejectExpanded ? originalRejectData.length : ITEMS_PER_PAGE;
        renderRejected(originalRejectData, displayedRejectCount);
        // Smooth scroll to the bottom of the grid
        const grid = document.getElementById("reject-grid");
        grid.scrollIntoView({ behavior: "smooth", block: "end" });
    }
}

function showOrderDetails(type, id, userId, address, orderType, price, deliveryPrice, totalPrice, coupon, paymentMethod, datetime, rating = null, noteRating = null) {
    const detailsHtml = `
        <div style="text-align: center;">
            <h5 style="font-size: 1.2rem; margin-bottom: 15px;">${type} Order #${id}</h5>
            <div style="text-align: left; font-size: 0.9rem; line-height: 1.5;">
                <p><strong>User ID:</strong> ${userId}</p>
                <p><strong>Address:</strong> ${address}</p>
                <p><strong>Type:</strong> ${orderType == 0 ? "Delivery" : "Takeaway"}</p>
                <p><strong>Price:</strong> ${price || 0}</p>
                <p><strong>Delivery Price:</strong> ${deliveryPrice || 0}</p>
                <p><strong>Total Price:</strong> ${totalPrice || 0}</p>
                <p><strong>Coupon:</strong> ${coupon == 1 ? "Yes" : "No"}</p>
                <p><strong>Payment Method:</strong> ${paymentMethod == 0 ? "Cash" : "Other"}</p>
                <p><strong>Date:</strong> ${datetime}</p>
                ${type === "Approved" && rating ? `<p><strong>Rating:</strong> ${rating || "Not rated"}</p>` : ""}
                ${type === "Approved" && noteRating ? `<p><strong>Note Rating:</strong> ${noteRating || "No comment"}</p>` : ""}
            </div>
        </div>
    `;

    Swal.fire({
        title: `${type} Order Details`,
        html: detailsHtml,
        confirmButtonText: 'Close',
        confirmButtonColor: '#f26b0a'
    });
}

function exportToCSV() {
    const csvRows = [];
    const headers = ['Type', 'Order ID', 'User ID', 'Address', 'Type', 'Price', 'Delivery Price', 'Total Price', 'Coupon', 'Payment Method', 'Date', 'Rating', 'Note Rating'];
    csvRows.push(headers.join(','));

    // Approved Orders
    originalArchiveData.forEach(order => {
        const address = order.address_name ? `${order.address_name}, ${order.address_street}, ${order.address_city}` : "No address";
        const values = [
            'Approved',
            order.orders_id,
            order.orders_usersid,
            `"${address}"`,
            order.orders_type == 0 ? "Delivery" : "Takeaway",
            order.orders_price || 0,
            order.orders_pricedelivery || 0,
            order.orders_totalprice || 0,
            order.orders_coupon == 1 ? "Yes" : "No",
            order.orders_paymentmethod == 0 ? "Cash" : "Other",
            order.orders_datetime,
            order.orders_rating || "Not rated",
            `"${order.orders_noterating || "No comment"}"`
        ];
        csvRows.push(values.join(','));
    });

    // Rejected Orders
    originalRejectData.forEach(order => {
        const address = order.address_name ? `${order.address_name}, ${order.address_street}, ${order.address_city}` : "No address";
        const values = [
            'Rejected',
            order.orders_id,
            order.orders_usersid,
            `"${address}"`,
            order.orders_type == 0 ? "Delivery" : "Takeaway",
            order.orders_price || 0,
            order.orders_pricedelivery || 0,
            order.orders_totalprice || 0,
            order.orders_coupon == 1 ? "Yes" : "No",
            order.orders_paymentmethod == 0 ? "Cash" : "Other",
            order.orders_datetime,
            '',
            ''
        ];
        csvRows.push(values.join(','));
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', 'archive-orders.csv');
    a.click();
    window.URL.revokeObjectURL(url);
}

async function loadArchive() {
    if (!isLoggedIn()) {
        showAlert("error", "Unauthorized", "Please log in to continue.", () => {
            window.location.href = 'login.html';
        });
        return;
    }

    const archiveSpinnerContainer = document.getElementById("archive-spinner");
    const rejectSpinnerContainer = document.getElementById("reject-spinner");
    archiveSpinnerContainer.classList.add("spinner-active");
    rejectSpinnerContainer.classList.add("spinner-active");
    const archiveSpinner = new Spinner({ color: '#f26b0a', lines: 12 }).spin(archiveSpinnerContainer);
    const rejectSpinner = new Spinner({ color: '#f26b0a', lines: 12 }).spin(rejectSpinnerContainer);

    try {
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
        renderArchive(originalArchiveData, displayedArchiveCount);

        let rejectData = { status: 0, text: "" };
        try {
            rejectData = await fetchWithToken(ENDPOINTS.REJECT_ARCHIVE, { method: "GET" });
            console.log("Rejected orders status:", rejectData.status);
        } catch (e) {
            console.error("Error fetching rejected orders:", e);
        }
        let rejectOrders = [];
        if (rejectData.status === 200) {
            try {
                rejectOrders = JSON.parse(rejectData.text).data || [];
                console.log("Rejected orders data:", rejectOrders);
            } catch (e) {
                console.error("Error parsing rejected orders data:", e);
            }
        }
        originalRejectData = rejectOrders;
        renderRejected(originalRejectData, displayedRejectCount);
    } catch (error) {
        showAlert("error", "Error", "Failed to load orders: " + error.message);
    } finally {
        archiveSpinner.stop();
        rejectSpinner.stop();
        archiveSpinnerContainer.classList.remove("spinner-active");
        rejectSpinnerContainer.classList.remove("spinner-active");
    }
}

function searchOrders() {
    const searchInput = document.getElementById("global-search-input").value.trim().toLowerCase();
    const clearSearchBtn = document.getElementById("clear-search");
    clearSearchBtn.style.display = searchInput ? "block" : "none";

    if (!searchInput) {
        displayedArchiveCount = ITEMS_PER_PAGE;
        displayedRejectCount = ITEMS_PER_PAGE;
        isArchiveExpanded = false;
        isRejectExpanded = false;
        renderArchive(originalArchiveData, displayedArchiveCount);
        renderRejected(originalRejectData, displayedRejectCount);
        return;
    }

    const filteredArchive = originalArchiveData.filter(order => {
        const address = order.address_name ? `${order.address_name}, ${order.address_street}, ${order.address_city}` : "No address";
        return (
            (order.orders_id && order.orders_id.toString().toLowerCase().includes(searchInput)) ||
            (order.orders_usersid && order.orders_usersid.toString().toLowerCase().includes(searchInput)) ||
            (address && address.toLowerCase().includes(searchInput)) ||
            (order.orders_type != null && (order.orders_type == 0 ? "delivery" : "Takeaway").includes(searchInput)) ||
            (order.orders_rating && order.orders_rating.toString().toLowerCase().includes(searchInput)) ||
            (order.orders_noterating && order.orders_noterating.toLowerCase().includes(searchInput))
        );
    });

    const filteredReject = originalRejectData.filter(order => {
        const address = order.address_name ? `${order.address_name}, ${order.address_street}, ${order.address_city}` : "No address";
        return (
            (order.orders_id && order.orders_id.toString().toLowerCase().includes(searchInput)) ||
            (order.orders_usersid && order.orders_usersid.toString().toLowerCase().includes(searchInput)) ||
            (address && address.toLowerCase().includes(searchInput)) ||
            (order.orders_type != null && (order.orders_type == 0 ? "delivery" : "Takeaway").includes(searchInput))
        );
    });

    displayedArchiveCount = ITEMS_PER_PAGE;
    displayedRejectCount = ITEMS_PER_PAGE;
    isArchiveExpanded = false;
    isRejectExpanded = false;
    renderArchive(filteredArchive, displayedArchiveCount);
    renderRejected(filteredReject, displayedRejectCount);
}

function clearSearch() {
    const searchInput = document.getElementById("global-search-input");
    searchInput.value = "";
    document.getElementById("clear-search").style.display = "none";
    displayedArchiveCount = ITEMS_PER_PAGE;
    displayedRejectCount = ITEMS_PER_PAGE;
    isArchiveExpanded = false;
    isRejectExpanded = false;
    renderArchive(originalArchiveData, displayedArchiveCount);
    renderRejected(originalRejectData, displayedRejectCount);
}

document.addEventListener("DOMContentLoaded", () => {
    loadArchive();

    const searchInput = document.getElementById("global-search-input");
    if (searchInput) {
        searchInput.addEventListener("input", searchOrders);
        searchInput.addEventListener("blur", clearSearch);
    }
});