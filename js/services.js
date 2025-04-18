const API_BASE_URL = "https://abdulrahmanantar.com/outbye/admin/services/";
const ENDPOINTS = {
    ADD: `${API_BASE_URL}add.php`,
    VIEW: `${API_BASE_URL}view.php`,
    EDIT: `${API_BASE_URL}edit.php`,
    DELETE: `${API_BASE_URL}delete.php`
};

const DEFAULT_IMAGE = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
const MAX_FILE_SIZE = 5 * 1024 * 1024;
let originalServicesData = [];

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
        confirmButtonText: 'OK'
    }).then(() => {
        if (callback) callback();
    });
}

async function loadServiceTypes() {
    try {
        const data = await fetchWithToken(ENDPOINTS.VIEW, { method: "GET" });
        if (data.status === "success" && Array.isArray(data.data)) {
            const serviceTypes = [...new Set(data.data.map(service => service.service_type).filter(type => type))];
            const typeSelect = document.getElementById("service-type");

            typeSelect.innerHTML = '<option value="">Select Type</option>';

            if (serviceTypes.length === 0) {
                typeSelect.innerHTML = `<option value="">No types available</option>`;
                return;
            }

            serviceTypes.forEach(type => {
                const option = document.createElement("option");
                option.value = type;
                option.textContent = type.charAt(0).toUpperCase() + type.slice(1);
                typeSelect.appendChild(option);
            });
        } else {
            showAlert("error", "Error", data.message || "Failed to load service types.");
        }
    } catch (error) {
        showAlert("error", "Error", `Failed to load service types: ${error.message}`);
    }
}

async function loadServices() {
    if (!isLoggedIn()) {
        showAlert("error", "Unauthorized", "Please log in to continue.", () => {
            window.location.href = 'login.html';
        });
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

        if (data.status === "success" && Array.isArray(data.data)) {
            originalServicesData = data.data;
            renderServices(originalServicesData);
        } else {
            showAlert("error", "Error", data.message || "Failed to load services.");
        }
    } catch (error) {
        spinner.stop();
        spinnerContainer.classList.remove("spinner-active");
        spinnerContainer.innerHTML = '';
        showAlert("error", "Error", `Failed to load services: ${error.message}`);
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
                <td>${service.service_type}</td>
                <td><img src="${imageSrc}" alt="Service Image" onerror="this.src='${DEFAULT_IMAGE}'"></td>
                <td>${activeStatus}</td>
                <td>${service.service_created}</td>
                <td>
                    <button class="btn btn-sm btn-info btn-action me-2" onclick="window.location.href='service_items.html?service_id=${service.service_id}'">
                        View Items
                    </button>
                    <button class="btn btn-sm btn-warning btn-action me-2" onclick="prepareEditService('${service.service_id}', '${service.service_name}', '${service.service_name_ar}', '${service.service_description}', '${service.service_description_ar}', '${service.service_location}', '${service.service_rating}', '${service.service_phone}', '${service.service_email}', '${service.service_website}', '${service.service_type}', '${service.service_active}', '${service.service_image}')">
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
        (service.service_type && service.service_type.toLowerCase().includes(searchInput)) ||
        (service.service_id && service.service_id.toString().includes(searchInput))
    );
    renderServices(filteredServices);
}

function prepareAddService() {
    document.getElementById("serviceModalLabel").textContent = "Add Service";
    document.getElementById("serviceForm").reset();
    document.getElementById("service-id").value = "";
    document.getElementById("service-image-old").value = "";
    document.getElementById("service-active").value = "1";
    document.getElementById("saveServiceBtn").onclick = addService;

    loadServiceTypes().then(() => {
        new bootstrap.Modal(document.getElementById("serviceModal")).show();
    });
}

function prepareEditService(id, name, nameAr, description, descriptionAr, location, rating, phone, email, website, type, active, image) {
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
    document.getElementById("service-image-old").value = image || "";
    document.getElementById("service-image").value = "";
    document.getElementById("saveServiceBtn").onclick = editService;

    loadServiceTypes().then(() => {
        document.getElementById("service-type").value = type || "";
        document.getElementById("service-active").value = active || "1";
        new bootstrap.Modal(document.getElementById("serviceModal")).show();
    });
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
    const type = document.getElementById("service-type").value.trim();
    const active = document.getElementById("service-active").value;
    const image = document.getElementById("service-image").files[0];

    if (!name || !nameAr || !description || !descriptionAr || !location || !rating || !phone || !email || !type) {
        showAlert("error", "Error", "Please fill all required fields (Name, Name AR, Description, Description AR, Location, Rating, Phone, Email, Type).");
        return;
    }

    if (image && image.size > MAX_FILE_SIZE) {
        showAlert("error", "Error", "Image size exceeds 5 MB limit.");
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
    formData.append("service_type", type);
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
    const type = document.getElementById("service-type").value.trim();
    const active = document.getElementById("service-active").value;
    const imageOld = document.getElementById("service-image-old").value;
    const image = document.getElementById("service-image").files[0];

    if (!name && !nameAr && !description && !descriptionAr && !location && !rating && !phone && !email && !website && !type && !active && !image) {
        showAlert("error", "Error", "At least one field must be provided to update.");
        return;
    }

    if (image && image.size > MAX_FILE_SIZE) {
        showAlert("error", "Error", "Image size exceeds 5 MB limit.");
        return;
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
    if (type) formData.append("service_type", type);
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
});