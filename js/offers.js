const API_BASE_URL = "https://abdulrahmanantar.com/outbye/admin/";
const ENDPOINTS = {
    OFFERS: `${API_BASE_URL}offers/view.php`,
    ADD_OFFER: `${API_BASE_URL}offers/add.php`,
    EDIT_OFFER: `${API_BASE_URL}offers/edit.php`,
    DELETE_OFFER: `${API_BASE_URL}offers/delete.php`
};

const DEFAULT_IMAGE = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

let originalOffersData = [];

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

function renderOffers(offers) {
    const offersGrid = document.getElementById("offers-grid");
    if (!offersGrid) {
        console.error("Offers grid not found");
        return;
    }

    offersGrid.innerHTML = "";
    if (offers.length === 0) {
        offersGrid.innerHTML = '<p class="text-center text-muted w-100">No offers found.</p>';
        return;
    }

    offers.forEach(offer => {
        const image = offer.image || DEFAULT_IMAGE;
        const card = `
            <div class="offer-card">
                <img src="${image}" alt="${offer.title}" loading="lazy" onerror="this.src='${DEFAULT_IMAGE}'">
                <h5>Offer #${offer.id}</h5>
                <div class="offer-info">Title: ${offer.title}</div>
                <div class="offer-info">Price: ${offer.price}</div>
                <div class="offer-info">Service ID: ${offer.service_id}</div>
                <div class="actions">
                    <div>
                        <button class="btn btn-action btn-edit" data-tooltip="Edit offer" data-offer='${JSON.stringify(offer)}' onclick="handleEditOffer(this)">Edit</button>
                        <button class="btn btn-action btn-delete" data-tooltip="Delete offer" onclick="deleteOffer('${offer.id}', '${offer.image}')">Delete</button>
                    </div>
                </div>
            </div>
        `;
        offersGrid.innerHTML += card;
    });
}

function clearSearch() {
    const searchInput = document.getElementById("global-search-input");
    const clearSearchBtn = document.getElementById("clear-search");
    if (searchInput && clearSearchBtn) {
        searchInput.value = "";
        clearSearchBtn.style.display = "none";
        renderOffers(originalOffersData);
    }
}

function searchOffers() {
    const searchInput = document.getElementById("global-search-input");
    if (!searchInput) {
        console.error("Search input not found");
        return;
    }

    const searchValue = searchInput.value.trim().toLowerCase();
    const clearSearchBtn = document.getElementById("clear-search");
    clearSearchBtn.style.display = searchValue ? "block" : "none";

    if (!searchValue) {
        renderOffers(originalOffersData);
        return;
    }

    const filteredOffers = originalOffersData.filter(offer =>
        (offer.id && offer.id.toString().includes(searchValue)) ||
        (offer.title && offer.title.toLowerCase().includes(searchValue)) ||
        (offer.description && offer.description.toLowerCase().includes(searchValue)) ||
        (offer.price && offer.price.toString().includes(searchValue)) ||
        (offer.service_id && offer.service_id.toString().includes(searchValue))
    );
    renderOffers(filteredOffers);
}

async function loadOffers() {
    if (!isLoggedIn()) {
        showAlert("error", "Unauthorized", "Please log in to continue", () => {
            window.location.href = 'login.html';
        });
        return;
    }

    const offersSkeleton = document.getElementById("offers-skeleton");
    if (!offersSkeleton) {
        console.error("Skeleton grid not found");
        return;
    }

    offersSkeleton.style.display = "grid";

    try {
        const response = await fetchWithToken(ENDPOINTS.OFFERS, { method: "GET" });
        offersSkeleton.style.display = "none";

        if (response.success && response.data) {
            if (response.data.status === "success" && response.data.data) {
                originalOffersData = response.data.data;
                renderOffers(originalOffersData);
            } else {
                renderOffers([]);
            }
        } else {
            renderOffers([]);
            console.error("Failed to load offers:", response.error || "Unknown error");
        }
    } catch (error) {
        offersSkeleton.style.display = "none";
        renderOffers([]);
        console.error("Load Offers Error:", error);
    }
}

function handleEditOffer(button) {
    const offer = JSON.parse(button.getAttribute('data-offer'));
    openEditOfferModal(offer);
}

function openAddOfferModal() {
    document.getElementById('addOfferForm').reset();
    new bootstrap.Modal(document.getElementById('addOfferModal')).show();
}

async function addOffer() {
    const form = document.getElementById('addOfferForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const formData = new FormData();
    formData.append('service_id', document.getElementById('add-service-id').value);
    formData.append('title', document.getElementById('add-title').value);
    formData.append('description', document.getElementById('add-description').value);
    formData.append('price', document.getElementById('add-price').value);
    formData.append('start_date', document.getElementById('add-start-date').value);
    formData.append('end_date', document.getElementById('add-end-date').value);
    formData.append('files', document.getElementById('add-image').files[0]);

    try {
        const response = await fetchWithToken(ENDPOINTS.ADD_OFFER, {
            method: "POST",
            body: formData
        });
        if (response.success) {
            showAlert("success", "Success", "Offer added successfully", () => {
                bootstrap.Modal.getInstance(document.getElementById('addOfferModal')).hide();
                loadOffers();
            });
        } else {
            showAlert("error", "Error", response.error || "Failed to add offer");
        }
    } catch (error) {
        showAlert("error", "Error", "Failed to add offer: " + error.message);
    }
}

function openEditOfferModal(offer) {
    document.getElementById('edit-id').value = offer.id;
    document.getElementById('edit-service-id').value = offer.service_id;
    document.getElementById('edit-title').value = offer.title;
    document.getElementById('edit-description').value = offer.description;
    document.getElementById('edit-price').value = offer.price;
    document.getElementById('edit-start-date').value = offer.start_date;
    document.getElementById('edit-end-date').value = offer.end_date;
    document.getElementById('edit-image-old').value = offer.image;
    document.getElementById('edit-image').value = '';
    new bootstrap.Modal(document.getElementById('editOfferModal')).show();
}

async function editOffer() {
    const form = document.getElementById('editOfferForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const formData = new FormData();
    formData.append('id', document.getElementById('edit-id').value);
    formData.append('service_id', document.getElementById('edit-service-id').value);
    formData.append('title', document.getElementById('edit-title').value);
    formData.append('description', document.getElementById('edit-description').value);
    formData.append('price', document.getElementById('edit-price').value);
    formData.append('start_date', document.getElementById('edit-start-date').value);
    formData.append('end_date', document.getElementById('edit-end-date').value);
    formData.append('imageold', document.getElementById('edit-image-old').value);
    const newImage = document.getElementById('edit-image').files[0];
    if (newImage) formData.append('files', newImage);

    try {
        const response = await fetchWithToken(ENDPOINTS.EDIT_OFFER, {
            method: "POST",
            body: formData
        });
        if (response.success) {
            showAlert("success", "Success", "Offer updated successfully", () => {
                bootstrap.Modal.getInstance(document.getElementById('editOfferModal')).hide();
                loadOffers();
            });
        } else {
            showAlert("error", "Error", response.error || "Failed to update offer");
        }
    } catch (error) {
        showAlert("error", "Error", "Failed to update offer: " + error.message);
    }
}

async function deleteOffer(id, image) {
    Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, delete it!',
        confirmButtonColor: '#f26b0a'
    }).then(async (result) => {
        if (result.isConfirmed) {
            const formData = new FormData();
            formData.append('id', id);
            formData.append('imagename', image);

            try {
                const response = await fetchWithToken(ENDPOINTS.DELETE_OFFER, {
                    method: "POST",
                    body: formData
                });
                if (response.success) {
                    showAlert("success", "Success", "Offer deleted successfully", loadOffers);
                } else {
                    showAlert("error", "Error", response.error || "Failed to delete offer");
                }
            } catch (error) {
                showAlert("error", "Error", "Failed to delete offer: " + error.message);
            }
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    if (!isLoggedIn()) {
        showAlert("error", "Unauthorized", "Please log in to continue", () => {
            window.location.href = 'login.html';
        });
        return;
    }
    loadOffers();

    const searchInput = document.getElementById("global-search-input");
    const clearSearchBtn = document.getElementById("clear-search");

    if (searchInput && clearSearchBtn) {
        searchInput.addEventListener("input", () => {
            searchOffers();
        });

        searchInput.addEventListener("blur", () => {
            if (!searchInput.value) {
                clearSearchBtn.style.display = "none";
                renderOffers(originalOffersData);
            }
        });
    } else {
        console.error("Search input or clear button not found");
    }
});