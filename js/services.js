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
let filteredServicesData = [];
let displayedServicesCount = 10;
let isServicesExpanded = false;
const SERVICES_PER_PAGE = 10;

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
            data = JSON.parse(text);
            console.log("Parsed response data:", data);
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
        confirmButtonText: 'OK',
        confirmButtonColor: '#f26b0a'
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
        const category = categories.find(cat => cat.categories_id == categoryId);
        return category ? category.categories_name : null;
    } catch (error) {
        console.error("Error fetching category name:", error);
        return null;
    }
}

function determineServiceType(categoryName) {
    if (!categoryName) return "unknown";
    const name = categoryName.toLowerCase();
    if (name.includes("restaurant")) return "restaurant";
    if (name.includes("cafe")) return "cafe";
    if (name.includes("hotel")) return "hotel";
    return "other";
}

async function loadServices() {
    if (!isLoggedIn()) {
        showAlert("error", "Unauthorized", "Please log in to continue.", () => {
            window.location.href = 'login.html';
        });
        return;
    }

    const skeletonGrid = document.getElementById("services-skeleton");
    skeletonGrid.style.display = "grid";

    try {
        const data = await fetchWithToken(ENDPOINTS.VIEW, { method: "GET" });
        console.log("Services loaded:", data);
        skeletonGrid.style.display = "none";

        if (Array.isArray(data)) {
            originalServicesData = data;
            filteredServicesData = [...originalServicesData];
            renderServices(filteredServicesData, displayedServicesCount);
        } else {
            showAlert("error", "Error", "Failed to load services: Invalid response format.");
        }
    } catch (error) {
        skeletonGrid.style.display = "none";
        showAlert("error", "Error", `Failed to load services: ${error.message}`);
    }
}

function renderServices(services, limit = displayedServicesCount) {
    const grid = document.getElementById("services-grid");
    grid.innerHTML = '';

    if (!services || services.length === 0) {
        grid.innerHTML = '<p class="text-center text-muted w-100">No services found.</p>';
        document.getElementById("services-view-more").style.display = "none";
        return;
    }

    const servicesToShow = services.slice(0, limit);
    servicesToShow.forEach(service => {
        const imageSrc = service.service_image && service.service_image !== "null" && service.service_image !== ""
            ? service.service_image
            : DEFAULT_IMAGE;

        const card = `
            <div class="service-card">
                <img src="${imageSrc}" alt="Service Image" loading="lazy" onerror="this.src='${DEFAULT_IMAGE}'">
                <h5>Service #${service.service_id}</h5>
                <div class="service-info">Name: ${service.service_name}</div>
                <div class="service-info">Category: ${service.categories_name || 'Unknown'}</div>
                <div class="actions">
                    <div>
                        <button class="btn btn-action btn-view" data-tooltip="View items" onclick="window.location.href='service_items.html?service_id=${service.service_id}'">View Items</button>
                        <button class="btn btn-action btn-edit" data-tooltip="Edit service" data-bs-toggle="modal" data-bs-target="#serviceModal" data-service-id="${service.service_id}">Edit</button>
                        <button class="btn btn-action btn-delete" data-tooltip="Delete service" onclick="deleteService('${service.service_id}', '${service.service_image}')">Delete</button>
                    </div>
                    <button class="btn-show-more" onclick="showServiceDetails('${service.service_id}', '${service.service_name}', '${service.service_name_ar}', '${service.service_description}', '${service.service_description_ar}', '${service.service_location}', '${service.service_rating}', '${service.service_phone}', '${service.service_email}', '${service.service_website}', '${service.service_cat}', '${service.service_type}', '${service.service_active}', '${service.service_created}', '${service.service_image}')">Show More</button>
                </div>
            </div>
        `;
        grid.innerHTML += card;
    });

    const viewMoreContainer = document.getElementById("services-view-more");
    const toggleBtn = document.getElementById("services-toggle-btn");
    const toggleBtnText = toggleBtn.querySelector('span');
    const toggleBtnIcon = toggleBtn.querySelector('i');

    if (services.length > SERVICES_PER_PAGE) {
        viewMoreContainer.style.display = "block";
        if (isServicesExpanded) {
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

function showServiceDetails(id, name, nameAr, description, descriptionAr, location, rating, phone, email, website, cat, type, active, created, image) {
    const imageSrc = image && image !== "null" && image !== "" ? image : DEFAULT_IMAGE;
    const activeStatus = active === "1" ? "Yes" : "No";
    const categoryName = originalServicesData.find(service => service.service_id == id)?.categories_name || "Unknown";

    Swal.fire({
        title: `Service: ${name}`,
        html: `
            <div style="text-align: center;">
                <img src="${imageSrc}" alt="${name}" style="width: 100%; max-width: 200px; border-radius: 8px; margin-bottom: 15px;" onerror="this.src='${DEFAULT_IMAGE}'">
                <div style="text-align: left; font-size: 0.9rem; line-height: 1.5;">
                    <p><strong>ID:</strong> ${id}</p>
                    <p><strong>Name:</strong> ${name || 'N/A'}</p>
                    <p><strong>Name (Arabic):</strong> ${nameAr || 'N/A'}</p>
                    <p><strong>Description:</strong> ${description || 'N/A'}</p>
                    <p><strong>Description (Arabic):</strong> ${descriptionAr || 'N/A'}</p>
                    <p><strong>Location:</strong> ${location || 'N/A'}</p>
                    <p><strong>Rating:</strong> ${rating || 'N/A'}</p>
                    <p><strong>Phone:</strong> ${phone || 'N/A'}</p>
                    <p><strong>Email:</strong> ${email || 'N/A'}</p>
                    <p><strong>Website:</strong> ${website || 'N/A'}</p>
                    <p><strong>Category:</strong> ${categoryName}</p>
                    <p><strong>Category ID:</strong> ${cat || 'N/A'}</p>
                    <p><strong>Type:</strong> ${type || 'N/A'}</p>
                    <p><strong>Active:</strong> ${activeStatus}</p>
                    <p><strong>Created:</strong> ${created || 'N/A'}</p>
                </div>
            </div>
        `,
        confirmButtonText: 'Close',
        confirmButtonColor: '#f26b0a'
    });
}

function toggleView() {
    isServicesExpanded = !isServicesExpanded;
    displayedServicesCount = isServicesExpanded ? filteredServicesData.length : SERVICES_PER_PAGE;
    renderServices(filteredServicesData, displayedServicesCount);
    const grid = document.getElementById("services-grid");
    grid.scrollIntoView({ behavior: "smooth", block: "end" });
}

function clearSearch() {
    const searchInput = document.getElementById("global-search-input");
    searchInput.value = "";
    document.getElementById("clear-search").style.display = "none";
    filteredServicesData = [...originalServicesData];
    displayedServicesCount = SERVICES_PER_PAGE;
    isServicesExpanded = false;
    renderServices(filteredServicesData, displayedServicesCount);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

const searchServicesDebounced = debounce(() => {
    const searchInput = document.getElementById("global-search-input").value.trim().toLowerCase();
    const clearSearchBtn = document.getElementById("clear-search");
    clearSearchBtn.style.display = searchInput ? "block" : "none";

    if (!searchInput) {
        filteredServicesData = [...originalServicesData];
        displayedServicesCount = SERVICES_PER_PAGE;
        isServicesExpanded = false;
        renderServices(filteredServicesData, displayedServicesCount);
        return;
    }

    filteredServicesData = originalServicesData.filter(service =>
        (service.service_name && service.service_name.toLowerCase().includes(searchInput)) ||
        (service.service_name_ar && service.service_name_ar.toLowerCase().includes(searchInput)) ||
        (service.service_id && service.service_id.toString().includes(searchInput)) ||
        (service.categories_name && service.categories_name.toLowerCase().includes(searchInput))
    );
    displayedServicesCount = SERVICES_PER_PAGE;
    isServicesExpanded = false;
    renderServices(filteredServicesData, displayedServicesCount);
}, 300);

function closeModal() {
    const modal = document.getElementById("serviceModal");
    const modalInstance = bootstrap.Modal.getInstance(modal) || new bootstrap.Modal(modal);
    modalInstance.hide();
}

function prepareAddService() {
    console.log("Preparing to add a new service");
    document.getElementById("serviceModalLabel").textContent = "Add Service";
    document.getElementById("serviceForm").reset();
    document.getElementById("service-id").value = "";
    document.getElementById("service-image-old").value = "";
    document.getElementById("service-cat").value = "";
    document.getElementById("service-active").value = "1";

    const saveButton = document.getElementById("saveServiceBtn");
    if (saveButton) {
        console.log("Save button found, setting event listener for addService");
        saveButton.removeEventListener("click", addService);
        saveButton.addEventListener("click", addService);
    } else {
        console.error("Save button not found in the DOM");
        showAlert("error", "Error", "Save button not found. Please check the modal HTML.");
    }

    const modal = new bootstrap.Modal(document.getElementById("serviceModal"));
    modal.show();
}

function prepareEditService(id, name, nameAr, description, descriptionAr, location, rating, phone, email, website, cat, active, image) {
    console.log("Preparing to edit service with ID:", id);
    console.log("Values passed to prepareEditService:", { id, name, nameAr, description, descriptionAr, location, rating, phone, email, website, cat, active, image });

    document.getElementById("serviceModalLabel").textContent = "Edit Service";
    document.getElementById("service-id").value = id || "";
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
    document.getElementById("service-active").value = active || "1";
    document.getElementById("service-image-old").value = image || "";
    document.getElementById("service-image").value = "";

    const saveButton = document.getElementById("saveServiceBtn");
    if (saveButton) {
        console.log("Save button found, setting event listener for editService");
        saveButton.removeEventListener("click", editService);
        saveButton.addEventListener("click", editService);
    } else {
        console.error("Save button not found in the DOM");
        showAlert("error", "Error", "Save button not found. Please check the modal HTML.");
    }

    console.log("Form values after setting:", {
        id: document.getElementById("service-id").value,
        name: document.getElementById("service-name").value,
        nameAr: document.getElementById("service-name-ar").value,
        description: document.getElementById("service-description").value,
        descriptionAr: document.getElementById("service-description-ar").value,
        location: document.getElementById("service-location").value,
        rating: document.getElementById("service-rating").value,
        phone: document.getElementById("service-phone").value,
        email: document.getElementById("service-email").value,
        website: document.getElementById("service-website").value,
        cat: document.getElementById("service-cat").value,
        active: document.getElementById("service-active").value,
        imageOld: document.getElementById("service-image-old").value
    });
}

async function addService() {
    console.log("addService called");

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

    console.log("Form values before validation:", { name, nameAr, description, descriptionAr, location, rating, phone, email, website, cat, active, image });

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
        showAlert("error", "Error", "Invalid Category ID. Please check and try again.");
        return;
    }

    const serviceType = determineServiceType(categoryName);

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
    formData.append("service_type", serviceType);
    formData.append("service_cat", cat);
    formData.append("service_active", active);
    if (image) formData.append("files", image);

    document.getElementById("saveServiceBtn").disabled = true;
    const spinnerContainer = document.getElementById("modal-spinner");
    spinnerContainer.classList.add("active");
    const spinner = new Spinner({ color: '#f26b0a', lines: 12 }).spin(spinnerContainer);

    try {
        const data = await fetchWithToken(ENDPOINTS.ADD, { method: "POST", body: formData });
        spinner.stop();
        spinnerContainer.classList.remove("active");
        if (data.status === "success") {
            showAlert("success", "Success", data.message || "Service added successfully.", closeModal);
            loadServices();
        } else {
            showAlert("error", "Error", data.message || "Failed to add service.", closeModal);
        }
    } catch (error) {
        spinner.stop();
        spinnerContainer.classList.remove("active");
        showAlert("error", "Error", `Failed to add service: ${error.message}`, closeModal);
    } finally {
        document.getElementById("saveServiceBtn").disabled = false;
    }
}

async function editService() {
    console.log("editService called");

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

    console.log("Form values before edit:", { id, name, nameAr, description, descriptionAr, location, rating, phone, email, website, cat, active, imageOld, image });

    const hasChanges = name || nameAr || description || descriptionAr || location || rating || phone || email || website || cat || active || image;
    if (!hasChanges) {
        showAlert("error", "Error", "No changes detected. Please modify at least one field.", closeModal);
        return;
    }

    if (!id) {
        showAlert("error", "Error", "Service ID is missing. Cannot update service.", closeModal);
        return;
    }

    if (image && image.size > MAX_FILE_SIZE) {
        showAlert("error", "Error", "Image size exceeds 5 MB limit.", closeModal);
        return;
    }

    let serviceType;
    if (cat) {
        const categoryName = await getCategoryName(cat);
        if (!categoryName) {
            showAlert("error", "Error", "Invalid Category ID. Please check and try again.", closeModal);
            return;
        }
        serviceType = determineServiceType(categoryName);
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
    if (serviceType) formData.append("service_type", serviceType);
    if (cat) formData.append("service_cat", cat);
    if (active) formData.append("service_active", active);
    if (imageOld) formData.append("imageold", imageOld);
    if (image) formData.append("files", image);

    for (let pair of formData.entries()) {
        console.log(`FormData: ${pair[0]} = ${pair[1]}`);
    }

    document.getElementById("saveServiceBtn").disabled = true;
    const spinnerContainer = document.getElementById("modal-spinner");
    spinnerContainer.classList.add("active");
    const spinner = new Spinner({ color: '#f26b0a', lines: 12 }).spin(spinnerContainer);

    try {
        const data = await fetchWithToken(ENDPOINTS.EDIT, { method: "POST", body: formData });
        spinner.stop();
        spinnerContainer.classList.remove("active");
        if (data.status === "success") {
            showAlert("success", "Success", data.message || "Service updated successfully.", closeModal);
            loadServices();
        } else {
            showAlert("error", "Error", data.message || "Failed to update service.", closeModal);
        }
    } catch (error) {
        spinner.stop();
        spinnerContainer.classList.remove("active");
        showAlert("error", "Error", `Failed to update service: ${error.message}`, closeModal);
    } finally {
        document.getElementById("saveServiceBtn").disabled = false;
    }
}

async function deleteService(id, imageName) {
    const result = await Swal.fire({
        title: 'Are you sure?',
        text: "This service will be deleted permanently!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, delete it!',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#f26b0a'
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
    searchInput.addEventListener("input", searchServicesDebounced);

    const serviceModal = document.getElementById("serviceModal");
    if (serviceModal) {
        console.log("Service modal element found in the DOM");
        serviceModal.addEventListener('shown.bs.modal', (event) => {
            console.log("Modal shown event triggered");
            const button = event.relatedTarget;
            const serviceId = button?.getAttribute('data-service-id');
            console.log("Service ID from button:", serviceId);
            if (serviceId) {
                const serviceData = originalServicesData.find(service => service.service_id === serviceId);
                console.log("Found service data:", serviceData);
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
                } else {
                    showAlert("error", "Error", `Service with ID ${serviceId} not found in loaded data.`, closeModal);
                }
            }
        });

        serviceModal.addEventListener('hidden.bs.modal', () => {
            console.log("Modal hidden event triggered");
            document.getElementById("serviceForm").reset();
            document.getElementById("serviceModalLabel").textContent = "Add Service";
            const saveButton = document.getElementById("saveServiceBtn");
            if (saveButton) {
                saveButton.removeEventListener("click", addService);
                saveButton.removeEventListener("click", editService);
            }
        });
    } else {
        console.error("Service modal element not found in the DOM. Check if <div id='serviceModal'> exists in the HTML.");
    }
});