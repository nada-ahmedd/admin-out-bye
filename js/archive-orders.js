const API_BASE_URL = "https://abdulrahmanantar.com/outbye/admin/";
const ENDPOINTS = {
    ARCHIVE: `${API_BASE_URL}orders/archive.php`,
    REJECT_ARCHIVE: `${API_BASE_URL}orders/archive_reject.php`
};

let originalArchiveData = [];
let originalRejectData = [];

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

async function loadArchive() {
    if (!isLoggedIn()) {
        showAlert("error", "Unauthorized", "Please log in to continue");
        window.location.href = 'login.html';
        return;
    }
    const archiveSpinnerContainer = document.getElementById("archive-spinner");
    const rejectSpinnerContainer = document.getElementById("reject-spinner");
    archiveSpinnerContainer.classList.add("spinner-active");
    rejectSpinnerContainer.classList.add("spinner-active");
    archiveSpinnerContainer.innerHTML = '<div class="spinner"></div>';
    rejectSpinnerContainer.innerHTML = '<div class="spinner"></div>';
    const archiveSpinner = new Spinner({ color: '#f26b0a', lines: 12 }).spin(archiveSpinnerContainer.querySelector('.spinner'));
    const rejectSpinner = new Spinner({ color: '#f26b0a', lines: 12 }).spin(rejectSpinnerContainer.querySelector('.spinner'));

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
        renderArchive(originalArchiveData);

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
        renderRejected(originalRejectData);

        archiveSpinner.stop();
        rejectSpinner.stop();
        archiveSpinnerContainer.classList.remove("spinner-active");
        rejectSpinnerContainer.classList.remove("spinner-active");
        archiveSpinnerContainer.innerHTML = '';
        rejectSpinnerContainer.innerHTML = '';
    } catch (error) {
        archiveSpinner.stop();
        rejectSpinner.stop();
        archiveSpinnerContainer.classList.remove("spinner-active");
        rejectSpinnerContainer.classList.remove("spinner-active");
        archiveSpinnerContainer.innerHTML = '';
        rejectSpinnerContainer.innerHTML = '';
        showAlert("error", "Error", "Failed to load orders: " + error.message);
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

function renderRejected(rejectedOrders) {
    const rejectTable = document.getElementById("reject-table");
    rejectTable.innerHTML = "";
    if (rejectedOrders.length > 0) {
        rejectedOrders.forEach(order => {
            const address = order.address_name ? `${order.address_name}, ${order.address_street}, ${order.address_city}` : "No address";
            console.log("Rejected order:", order.orders_id, "orders_status:", order.orders_status);
            rejectTable.innerHTML += `
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
        rejectTable.innerHTML = `<tr><td colspan="10">No rejected orders</td></tr>`;
    }
}

function clearSearch() {
    const searchInput = document.getElementById("global-search-input");
    searchInput.value = "";
    document.getElementById("clear-search").style.display = "none";
    renderArchive(originalArchiveData);
    renderRejected(originalRejectData);
}

function searchOrders() {
    const searchInput = document.getElementById("global-search-input").value.trim().toLowerCase();
    if (!searchInput) {
        renderArchive(originalArchiveData);
        renderRejected(originalRejectData);
        return;
    }

    const filteredArchive = originalArchiveData.filter(order => {
        const address = order.address_name ? `${order.address_name}, ${order.address_street}, ${order.address_city}` : "No address";
        return (
            (order.orders_id && order.orders_id.toString().includes(searchInput)) ||
            (order.orders_usersid && order.orders_usersid.toString().includes(searchInput)) ||
            (address && address.toLowerCase().includes(searchInput)) ||
            (order.orders_type != null && (order.orders_type == 0 ? "delivery" : "pickup").includes(searchInput))
        );
    });

    const filteredReject = originalRejectData.filter(order => {
        const address = order.address_name ? `${order.address_name}, ${order.address_street}, ${order.address_city}` : "No address";
        return (
            (order.orders_id && order.orders_id.toString().includes(searchInput)) ||
            (order.orders_usersid && order.orders_usersid.toString().includes(searchInput)) ||
            (address && address.toLowerCase().includes(searchInput)) ||
            (order.orders_type != null && (order.orders_type == 0 ? "delivery" : "pickup").includes(searchInput))
        );
    });

    renderArchive(filteredArchive);
    renderRejected(filteredReject);
}

document.addEventListener("DOMContentLoaded", () => {
    loadArchive();

    const searchInput = document.getElementById("global-search-input");
    const clearSearchBtn = document.getElementById("clear-search");

    searchInput.addEventListener("input", () => {
        clearSearchBtn.style.display = searchInput.value ? "block" : "none";
        searchOrders();
    });

    searchInput.addEventListener("blur", () => {
        if (!searchInput.value) {
            clearSearchBtn.style.display = "none";
            renderArchive(originalArchiveData);
            renderRejected(originalRejectData);
        }
    });
});