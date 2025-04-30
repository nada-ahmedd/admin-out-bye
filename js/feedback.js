const API_BASE_URL = "https://abdulrahmanantar.com/outbye/admin/";
const ENDPOINTS = {
    FEEDBACK: `${API_BASE_URL}feedback/view.php`
};

const DEFAULT_IMAGE = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

let originalFeedbackData = [];

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
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('active');
    }
}

async function fetchWithToken(url, options = {}) {
    if (!isLoggedIn()) {
        showAlert("error", "Unauthorized", "Please log in to continue");
        window.location.href = 'login.html';
        return { success: false, error: "No token found" };
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
                return { success: false, error: "Unauthorized" };
            }
            return { success: false, error: `HTTP error! Status: ${response.status}` };
        }

        try {
            const parsed = JSON.parse(text.trim());
            return { success: true, data: parsed };
        } catch (e) {
            return { success: true, raw: text, error: "Invalid JSON response: " + e.message };
        }
    } catch (error) {
        console.error("Fetch Error:", error);
        return { success: false, error: error.message };
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

function renderFeedback(feedback) {
    const feedbackGrid = document.getElementById("feedback-table");
    if (!feedbackGrid) {
        console.error("Feedback grid not found");
        return;
    }

    feedbackGrid.innerHTML = "";
    if (feedback.length === 0) {
        feedbackGrid.innerHTML = '<p class="text-center text-muted w-100">No feedback found.</p>';
        return;
    }

    feedback.forEach(item => {
        const image = item.user_image || DEFAULT_IMAGE;
        const card = `
            <div class="feedback-card">
                <img src="${image}" alt="${item.user_name}" loading="lazy" onerror="this.src='${DEFAULT_IMAGE}'">
                <h5>Feedback #${item.id}</h5>
                <div class="feedback-info">User: ${item.user_name}</div>
                <div class="feedback-info">Rating: ${item.rating}</div>
                <div class="feedback-info">Service: ${item.service_type}</div>
            </div>
        `;
        feedbackGrid.innerHTML += card;
    });
}

function clearSearch() {
    const searchInput = document.getElementById("global-search-input");
    const clearSearchBtn = document.getElementById("clear-search");
    if (searchInput && clearSearchBtn) {
        searchInput.value = "";
        clearSearchBtn.style.display = "none";
        renderFeedback(originalFeedbackData);
    }
}

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
        (item.user_name && item.user_name.toLowerCase().includes(searchValue)) ||
        (item.user_id && item.user_id.toString().includes(searchValue)) ||
        (item.service_type && item.service_type.toLowerCase().includes(searchValue)) ||
        (item.rating && item.rating.toString().includes(searchValue))
    );
    renderFeedback(filteredFeedback);
}

async function loadFeedback() {
    if (!isLoggedIn()) {
        showAlert("error", "Unauthorized", "Please log in to continue", () => {
            window.location.href = 'login.html';
        });
        return;
    }

    const feedbackSkeleton = document.getElementById("feedback-skeleton");
    if (!feedbackSkeleton) {
        console.error("Skeleton grid not found");
        return;
    }

    feedbackSkeleton.style.display = "grid";

    try {
        const response = await fetchWithToken(ENDPOINTS.FEEDBACK, { method: "GET" });
        feedbackSkeleton.style.display = "none";

        if (response.success && response.data) {
            if (response.data.status === "success" && response.data.data) {
                originalFeedbackData = response.data.data;
                renderFeedback(originalFeedbackData);
            } else {
                renderFeedback([]);
            }
        } else {
            renderFeedback([]);
            console.error("Failed to load feedback:", response.error || "Unknown error");
        }
    } catch (error) {
        feedbackSkeleton.style.display = "none";
        renderFeedback([]);
        console.error("Load Feedback Error:", error);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    if (!isLoggedIn()) {
        showAlert("error", "Unauthorized", "Please log in to continue", () => {
            window.location.href = 'login.html';
        });
        return;
    }
    loadFeedback();

    const searchInput = document.getElementById("global-search-input");
    const clearSearchBtn = document.getElementById("clear-search");

    if (searchInput && clearSearchBtn) {
        searchInput.addEventListener("input", () => {
            searchFeedback();
        });

        searchInput.addEventListener("blur", () => {
            if (!searchInput.value) {
                clearSearchBtn.style.display = "none";
                renderFeedback(originalFeedbackData);
            }
        });
    } else {
        console.error("Search input or clear button not found");
    }
});