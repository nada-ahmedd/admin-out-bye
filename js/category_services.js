const API_BASE_URL = "https://abdulrahmanantar.com/outbye/admin/";
const ENDPOINTS = {
    ADD: `${API_BASE_URL}services/add.php`,
    VIEW: `${API_BASE_URL}services/view.php`,
    EDIT: `${API_BASE_URL}services/edit.php`,
    DELETE: `${API_BASE_URL}services/delete.php`,
    CATEGORIES: `${API_BASE_URL}categories/view.php`
};

const DEFAULT_IMAGE = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
const MAX_FILE_SIZE = 5 * 1024 * 1024;
let originalServicesData = [];
let categoryId;

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

        if (url.includes('add.php') && response.status === 200 && !text.trim()) {
            return { status: "success", message: "Service added successfully." };
        }

        let data;
        try {
            const trimmedText = text.trim();
            if (!trimmedText) {
                throw new Error("Empty response received");
            }

            if (trimmedText.startsWith('[') || trimmedText.startsWith('{')) {
                data = JSON.parse(trimmedText);
            } else {
                throw new Error("No valid JSON found in response");
            }
        } catch (e) {
            console.error("JSON Parse Error:", e, "Raw:", text);
            if (text.includes('"status":"success"')) {
                return { status: "success", message: "Operation completed successfully (parsed from raw response)" };
            }
            throw new Error("Invalid JSON response: " + e.message);
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
        confirmButtonText: 'OK'
    }).then(() => {
        if (callback) callback();
    });
}

async function getCategoryName(categoryId) {
    try {
        const response = await fetchWithToken(ENDPOINTS.CATEGORIES, { method: "GET" });
        let categories = response;
        if (response && response.status === "success" && Array.isArray(response.data)) {
            categories = response.data;
        }
        const category = categories.find(cat => String(cat.categories_id) === String(categoryId));
        return category ? category.categories_name : null;
    } catch (error) {
        console.error("Error fetching category name:", error);
        return null;
    }
}

async function loadServices() {
    if (!isLoggedIn()) {
        showAlert("error", "Unauthorized", "Please log in to continue.", () => {
            window.location.href = 'login.html';
        });
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    categoryId = urlParams.get('category_id');
    if (!categoryId) {
        showAlert("error", "Error", "Category ID not found in URL.");
        return;
    }

    const spinnerContainer = document.getElementById("table-spinner");
    spinnerContainer.classList.add("spinner-active");
    spinnerContainer.innerHTML = '<div class="spinner"></div>';
    const spinner = new Spinner({ color: '#f26b0a', lines: 12 }).spin(spinnerContainer.querySelector('.spinner'));

    try {
        const data = await fetchWithToken(ENDPOINTS.VIEW, { method: "GET" });
        spinner.stop();
        spinnerContainer.classList.remove("spinner-active");
        spinnerContainer.innerHTML = '';

        if (Array.isArray(data)) {
            originalServicesData = data.filter(service => service.service_cat === categoryId);
            if (originalServicesData.length > 0) {
                const categoryName = originalServicesData[0].categories_name;
                document.getElementById("service-type-title").textContent = `${categoryName} Services`;
            } else {
                document.getElementById("service-type-title").textContent = "No Services Found";
            }
            renderServices(originalServicesData);
        } else {
            showAlert("error", "Error", "Failed to load services: Invalid response format.");
            document.getElementById("service-type-title").textContent = "Services";
        }
    } catch (error) {
        spinner.stop();
        spinnerContainer.classList.remove("spinner-active");
        spinnerContainer.innerHTML = '';
        showAlert("error", "Error", `Failed to load services: ${error.message}`);
        document.getElementById("service-type-title").textContent = "Services";
    }
}

function renderServices(services) {
    const tableBody = document.getElementById("services-table");
    tableBody.innerHTML = "";
    services.forEach(service => {
        let imageSrc = DEFAULT_IMAGE;
        if (service.service_image && service.service_image !== "null" && service.service_image !== "") {
            imageSrc = service.service_image;
        }

        const activeStatus = service.service_active === "1" ? "Yes" : "No";

        tableBody.innerHTML += `
            <tr>
                <td>${service.service_id}</td>
                <td>${service.service_name}</td>
                <td>${service.service_name_ar}</td>
                <td><img src="${imageSrc}" alt="Service Image" onerror="this.src='${DEFAULT_IMAGE}'"></td>
                <td>${activeStatus}</td>
                <td>${service.service_created}</td>
                <td>
                    <button class="btn btn-sm btn-info btn-action me-2" onclick="window.location.href='service_items.html?service_id=${service.service_id}'">
                        View Items
                    </button>
                    <button class="btn btn-sm btn-warning btn-action me-2" data-bs-toggle="modal" data-bs-target="#serviceModal" data-service-id="${service.service_id}">
                        Edit
                    </button>
                    <button class="btn btn-sm btn-danger btn-action" onclick="deleteService('${service.service_id}', '${service.service_image}')">
                        Delete
                    </button>
                </td>
            </tr>
        `;
    });
}

function clearSearch() {
    const searchInput = document.getElementById("global-search-input");
    searchInput.value = "";
    document.getElementById("clear-search").style.display = "none";
    renderServices(originalServicesData);
}

function searchServices() {
    const searchInput = document.getElementById("global-search-input").value.trim().toLowerCase();
    if (!searchInput) {
        renderServices(originalServicesData);
        return;
    }

    const filteredServices = originalServicesData.filter(service =>
        (service.service_name && service.service_name.toLowerCase().includes(searchInput)) ||
        (service.service_name_ar && service.service_name_ar.toLowerCase().includes(searchInput)) ||
        (service.service_id && service.service_id.toString().includes(searchInput))
    );
    renderServices(filteredServices);
}

function prepareAddService() {
    document.getElementById("serviceModalLabel").textContent = "Add Service";
    document.getElementById("serviceForm").reset();
    document.getElementById("service-id").value = "";
    document.getElementById("service-image-old").value = "";
    document.getElementById("service-cat").value = categoryId;
    document.getElementById("service-active").value = "1";
    document.getElementById("saveServiceBtn").onclick = addService;
}

function prepareEditService(id, name, nameAr, description, descriptionAr, location, rating, phone, email, website, cat, active, image) {
    document.getElementById("serviceModalLabel").textContent = "Edit Service";
    document.getElementById("service-id").value = id;
    document.getElementById("service-name").value = name || "";
    document.getElementById("service-name-ar").value = nameAr || "";
    document.getElementById("service-description").value = description || "";
    document.getElementById("service-description-ar").value = descriptionAr || "";
    document.getElementById("service-location").value = location || "";
    document.getElementById("service-rating").value = rating || "";
    document.getElementById("service-phone").value = phone || "";
    document.getElementById("service-email").value = email || "";
    document.getElementById("service-website").value = website || "";
    document.getElementById("service-cat").value = cat || "";
    document.getElementById("service-image-old").value = image || "";
    document.getElementById("service-image").value = "";
    document.getElementById("service-active").value = active || "1";
    document.getElementById("saveServiceBtn").onclick = editService;
}

async function addService() {
    const name = document.getElementById("service-name").value.trim();
    const nameAr = document.getElementById("service-name-ar").value.trim();
    const description = document.getElementById("service-description").value.trim();
    const descriptionAr = document.getElementById("service-description-ar").value.trim();
    const location = document.getElementById("service-location").value.trim();
    const rating = document.getElementById("service-rating").value.trim();
    const phone = document.getElementById("service-phone").value.trim();
    const email = document.getElementById("service-email").value.trim();
    const website = document.getElementById("service-website").value.trim();
    const cat = document.getElementById("service-cat").value.trim();
    const active = document.getElementById("service-active").value;
    const image = document.getElementById("service-image").files[0];

    if (!name || !nameAr || !description || !descriptionAr || !location || !rating || !phone || !email || !cat) {
        showAlert("error", "Error", "Please fill all required fields (Name, Name AR, Description, Description AR, Location, Rating, Phone, Email, Category ID).");
        return;
    }

    if (image && image.size > MAX_FILE_SIZE) {
        showAlert("error", "Error", "Image size exceeds 5 MB limit.");
        return;
    }

    const categoryName = await getCategoryName(cat);
    if (!categoryName) {
        showAlert("error", "Error", "Failed to fetch category name for the provided Category ID.");
        return;
    }

    const formData = new FormData();
    formData.append("service_name", name);
    formData.append("service_name_ar", nameAr);
    formData.append("service_description", description);
    formData.append("service_description_ar", descriptionAr);
    formData.append("service_location", location);
    formData.append("service_rating", rating);
    formData.append("service_phone", phone);
    formData.append("service_email", email);
    formData.append("service_website", website);
    formData.append("category_name", categoryName);
    formData.append("service_cat", cat);
    formData.append("service_active", active);
    if (image) formData.append("files", image);

    document.getElementById("saveServiceBtn").disabled = true;
    try {
        const data = await fetchWithToken(ENDPOINTS.ADD, { method: "POST", body: formData });
        if (data.status === "success") {
            showAlert("success", "Success", data.message || "Service added successfully.");
            bootstrap.Modal.getInstance(document.getElementById("serviceModal")).hide();
            loadServices();
        } else {
            showAlert("error", "Error", data.message || "Failed to add service.");
        }
    } catch (error) {
        showAlert("error", "Error", `Failed to add service: ${error.message}`);
    } finally {
        document.getElementById("saveServiceBtn").disabled = false;
    }
}

async function editService() {
    const id = document.getElementById("service-id").value;
    const name = document.getElementById("service-name").value.trim();
    const nameAr = document.getElementById("service-name-ar").value.trim();
    const description = document.getElementById("service-description").value.trim();
    const descriptionAr = document.getElementById("service-description-ar").value.trim();
    const location = document.getElementById("service-location").value.trim();
    const rating = document.getElementById("service-rating").value.trim();
    const phone = document.getElementById("service-phone").value.trim();
    const email = document.getElementById("service-email").value.trim();
    const website = document.getElementById("service-website").value.trim();
    const cat = document.getElementById("service-cat").value.trim();
    const active = document.getElementById("service-active").value;
    const imageOld = document.getElementById("service-image-old").value;
    const image = document.getElementById("service-image").files[0];

    if (!name && !nameAr && !description && !descriptionAr && !location && !rating && !phone && !email && !website && !cat && !active && !image) {
        showAlert("error", "Error", "At least one field must be provided to update.");
        return;
    }

    if (image && image.size > MAX_FILE_SIZE) {
        showAlert("error", "Error", "Image size exceeds 5 MB limit.");
        return;
    }

    let categoryName;
    if (cat) {
        categoryName = await getCategoryName(cat);
        if (!categoryName) {
            showAlert("error", "Error", "Failed to fetch category name for the provided Category ID.");
            return;
        }
    }

    const formData = new FormData();
    formData.append("id", id);
    if (name) formData.append("service_name", name);
    if (nameAr) formData.append("service_name_ar", nameAr);
    if (description) formData.append("service_description", description);
    if (descriptionAr) formData.append("service_description_ar", descriptionAr);
    if (location) formData.append("service_location", location);
    if (rating) formData.append("service_rating", rating);
    if (phone) formData.append("service_phone", phone);
    if (email) formData.append("service_email", email);
    if (website) formData.append("service_website", website);
    if (categoryName) formData.append("category_name", categoryName);
    if (cat) formData.append("service_cat", cat);
    if (active) formData.append("service_active", active);
    if (imageOld) formData.append("imageold", imageOld);
    if (image) formData.append("files", image);

    document.getElementById("saveServiceBtn").disabled = true;
    try {
        const data = await fetchWithToken(ENDPOINTS.EDIT, { method: "POST", body: formData });
        if (data.status === "success") {
            showAlert("success", "Success", data.message || "Service updated successfully.");
            bootstrap.Modal.getInstance(document.getElementById("serviceModal")).hide();
            loadServices();
        } else {
            showAlert("error", "Error", data.message || "Failed to update service.");
        }
    } catch (error) {
        showAlert("error", "Error", `Failed to update service: ${error.message}`);
    } finally {
        document.getElementById("saveServiceBtn").disabled = false;
    }
}

async function deleteService(id, imageName) {
    const result = await Swal.fire({
        title: 'Are you sure?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, delete it!',
        cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    const formData = new FormData();
    formData.append("id", id);
    formData.append("imagename", imageName || "");

    try {
        const data = await fetchWithToken(ENDPOINTS.DELETE, { method: "POST", body: formData });
        if (data.status === "success") {
            showAlert("success", "Success", data.message || "Service deleted successfully.");
            loadServices();
        } else {
            showAlert("error", "Error", data.message || "Failed to delete service.");
        }
    } catch (error) {
        showAlert("error", "Error", `Failed to delete service: ${error.message}`);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadServices();

    const searchInput = document.getElementById("global-search-input");
    const clearSearchBtn = document.getElementById("clear-search");

    searchInput.addEventListener("input", () => {
        clearSearchBtn.style.display = searchInput.value ? "block" : "none";
        searchServices();
    });

    searchInput.addEventListener("blur", () => {
        if (!searchInput.value) {
            clearSearchBtn.style.display = "none";
            renderServices(originalServicesData);
        }
    });

    // Handle Modal events for Add/Edit Service
    const serviceModal = document.getElementById("serviceModal");
    serviceModal.addEventListener('shown.bs.modal', (event) => {
        const button = event.relatedTarget; // Button that triggered the modal
        const serviceId = button.getAttribute('data-service-id'); // Check if it's Edit button
        if (serviceId) {
            const serviceData = originalServicesData.find(service => service.service_id === serviceId);
            if (serviceData) {
                prepareEditService(
                    serviceData.service_id,
                    serviceData.service_name,
                    serviceData.service_name_ar,
                    serviceData.service_description,
                    serviceData.service_description_ar,
                    serviceData.service_location,
                    serviceData.service_rating,
                    serviceData.service_phone,
                    serviceData.service_email,
                    serviceData.service_website,
                    serviceData.service_cat,
                    serviceData.service_active,
                    serviceData.service_image
                );
            }
        } else {
            prepareAddService();
        }
    });

    // Reset modal when hidden
    serviceModal.addEventListener('hidden.bs.modal', () => {
        document.getElementById("serviceForm").reset();
        document.getElementById("serviceModalLabel").textContent = "Add Service";
        document.getElementById("saveServiceBtn").onclick = null;
    });
});