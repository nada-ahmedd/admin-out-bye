const API_BASE_URL = "https://abdulrahmanantar.com/outbye/admin/items/";
const SERVICE_API_BASE_URL = "https://abdulrahmanantar.com/outbye/admin/services/";
const ENDPOINTS = {
    ADD: `${API_BASE_URL}add.php`,
    VIEW: `${API_BASE_URL}view.php`,
    EDIT: `${API_BASE_URL}edit.php`,
    DELETE: `${API_BASE_URL}delete.php`,
    SERVICE_VIEW: `${SERVICE_API_BASE_URL}view.php`
};

const DEFAULT_IMAGE = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
const MAX_FILE_SIZE = 5 * 1024 * 1024;

let serviceId, categoryId;
let originalItemsData = [];

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
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('active');
    }
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
        const response = await fetch(url, options);
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
        let data;
        try {
            const cleanedText = text.replace(/^\ufeff/, '').trim();
            if (!cleanedText) {
                throw new Error("Empty response received");
            }

            if (cleanedText.startsWith('[')) {
                data = JSON.parse(cleanedText);
            } else if (cleanedText.startsWith('{')) {
                data = JSON.parse(cleanedText);
            } else {
                throw new Error("No valid JSON found in response");
            }
        } catch (e) {
            if (text.includes('"status":"success"')) {
                return { status: "success", message: "Operation completed successfully (parsed from raw response)" };
            }
            throw new Error("Invalid JSON response: " + e.message);
        }
        return data;
    } catch (error) {
        throw new Error("Fetch error: " + error.message);
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

async function loadItems() {
    if (!isLoggedIn()) {
        showAlert("error", "Unauthorized", "Please log in to continue.", () => {
            window.location.href = 'login.html';
        });
        return;
    }

    const params = new URLSearchParams(window.location.search);
    serviceId = params.get('service_id');
    categoryId = params.get('category_id');

    if (!serviceId) {
        showAlert("error", "Error", "Service ID is missing.", () => {
            window.location.href = 'services.html';
        });
        return;
    }

    const spinnerContainer = document.getElementById("table-spinner");
    if (!spinnerContainer) {
        console.error("Spinner container not found");
        return;
    }

    spinnerContainer.classList.add("spinner-active");
    spinnerContainer.innerHTML = '<div class="spinner"></div>';
    const spinner = new Spinner({ color: '#f26b0a', lines: 12 }).spin(spinnerContainer.querySelector('.spinner'));

    try {
        const itemsData = await fetchWithToken(ENDPOINTS.VIEW, { method: "GET" });
        const servicesData = await fetchWithToken(ENDPOINTS.SERVICE_VIEW, { method: "GET" });

        spinner.stop();
        spinnerContainer.classList.remove("spinner-active");
        spinnerContainer.innerHTML = '';

        if (itemsData.status === "success" && Array.isArray(itemsData.data)) {
            let filteredItems = itemsData.data.filter(item => item.service_id === serviceId);
            if (categoryId) {
                filteredItems = filteredItems.filter(item => item.items_cat === categoryId);
            }

            originalItemsData = filteredItems;

            let serviceName = "Unknown Service";
            if (Array.isArray(servicesData)) {
                const service = servicesData.find(s => s.service_id === serviceId);
                serviceName = service ? service.service_name : "Unknown Service";
                categoryId = service ? service.service_cat : categoryId;
            }

            if (!categoryId && filteredItems.length > 0) {
                categoryId = filteredItems[0].items_cat || "";
            }

            const serviceNameTitle = document.getElementById("service-name-title");
            if (serviceNameTitle) {
                serviceNameTitle.textContent = serviceName;
            }

            renderItems(originalItemsData);
        } else {
            showAlert("error", "Error", "Failed to load data.");
            const serviceNameTitle = document.getElementById("service-name-title");
            if (serviceNameTitle) {
                serviceNameTitle.textContent = "Error Loading Service";
            }
        }
    } catch (error) {
        spinner.stop();
        spinnerContainer.classList.remove("spinner-active");
        spinnerContainer.innerHTML = '';
        showAlert("error", "Error", `Failed to load items: ${error.message}`);
        const serviceNameTitle = document.getElementById("service-name-title");
        if (serviceNameTitle) {
            serviceNameTitle.textContent = "Error Loading Service";
        }
    }
}

function renderItems(items) {
    const tableBody = document.getElementById("items-table");
    if (!tableBody) {
        console.error("Items table body not found");
        return;
    }

    tableBody.innerHTML = "";
    if (items.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="12">No items found for this service and category.</td></tr>`;
        return;
    }

    items.forEach(item => {
        const imageSrc = item.items_image && item.items_image !== "null" && item.items_image !== ""
            ? item.items_image
            : DEFAULT_IMAGE;
        const activeStatus = item.items_active === "1" ? "Yes" : "No";
        const discount = item.items_discount || "N/A";
        tableBody.innerHTML += `
            <tr>
                <td>${item.items_id}</td>
                <td>${item.service_id}</td>
                <td>${item.items_name}</td>
                <td>${item.items_name_ar}</td>
                <td><img src="${imageSrc}" alt="Item Image" onerror="this.src='${DEFAULT_IMAGE}'"></td>
                <td>${item.items_count}</td>
                <td>${activeStatus}</td>
                <td>${item.items_price}</td>
                <td>${discount}</td>
                <td>${item.items_cat}</td>
                <td>${item.items_date}</td>
                <td>
                    <button class="btn btn-sm btn-warning btn-action me-2" onclick="prepareEditItem('${item.items_id}', '${item.service_id}', '${item.items_name}', '${item.items_name_ar}', '${item.items_des}', '${item.items_des_ar}', '${item.items_count}', '${item.items_active}', '${item.items_price}', '${item.items_discount}', '${item.items_cat}', '${item.items_image}')">
                        Edit
                    </button>
                    <button class="btn btn-sm btn-danger btn-action" onclick="deleteItem('${item.items_id}', '${item.items_image}')">
                        Delete
                    </button>
                </td>
            </tr>
        `;
    });
}

function clearSearch() {
    const searchInput = document.getElementById("global-search-input");
    const clearSearchBtn = document.getElementById("clear-search");
    if (searchInput && clearSearchBtn) {
        searchInput.value = "";
        clearSearchBtn.style.display = "none";
        renderItems(originalItemsData);
    }
}

function searchItems() {
    const searchInput = document.getElementById("global-search-input");
    if (!searchInput) {
        console.error("Search input not found");
        return;
    }

    const searchValue = searchInput.value.trim().toLowerCase();
    if (!searchValue) {
        renderItems(originalItemsData);
        return;
    }

    const filteredItems = originalItemsData.filter(item =>
        (item.items_id && item.items_id.toString().includes(searchValue)) ||
        (item.service_id && item.service_id.toString().includes(searchValue)) ||
        (item.items_name && item.items_name.toLowerCase().includes(searchValue)) ||
        (item.items_name_ar && item.items_name_ar.toLowerCase().includes(searchValue)) ||
        (item.items_cat && item.items_cat.toString().includes(searchValue))
    );
    renderItems(filteredItems);
}

function prepareAddItem() {
    const itemModalLabel = document.getElementById("itemModalLabel");
    const itemForm = document.getElementById("itemForm");
    const itemId = document.getElementById("item-id");
    const itemImageOld = document.getElementById("item-image-old");
    const itemServiceId = document.getElementById("item-service-id");
    const itemCat = document.getElementById("item-cat");
    const saveItemBtn = document.getElementById("saveItemBtn");

    if (itemModalLabel && itemForm && itemId && itemImageOld && itemServiceId && itemCat && saveItemBtn) {
        itemModalLabel.textContent = "Add Item";
        itemForm.reset();
        itemId.value = "";
        itemImageOld.value = "";
        itemServiceId.value = serviceId || "";
        itemCat.value = categoryId || "";

        saveItemBtn.onclick = addItem;
        new bootstrap.Modal(document.getElementById("itemModal")).show();
    } else {
        console.error("Required form elements not found");
    }
}

function prepareEditItem(id, serviceId, name, nameAr, description, descriptionAr, count, active, price, discount, cat, image) {
    const itemModalLabel = document.getElementById("itemModalLabel");
    const itemId = document.getElementById("item-id");
    const itemServiceId = document.getElementById("item-service-id");
    const itemName = document.getElementById("item-name");
    const itemNameAr = document.getElementById("item-name-ar");
    const itemDescription = document.getElementById("item-description");
    const itemDescriptionAr = document.getElementById("item-description-ar");
    const itemCount = document.getElementById("item-count");
    const itemActive = document.getElementById("item-active");
    const itemPrice = document.getElementById("item-price");
    const itemDiscount = document.getElementById("item-discount");
    const itemCat = document.getElementById("item-cat");
    const itemImageOld = document.getElementById("item-image-old");
    const itemImage = document.getElementById("item-image");
    const saveItemBtn = document.getElementById("saveItemBtn");

    if (itemModalLabel && itemId && itemServiceId && itemName && itemNameAr && itemDescription && itemDescriptionAr && itemCount && itemActive && itemPrice && itemDiscount && itemCat && itemImageOld && itemImage && saveItemBtn) {
        itemModalLabel.textContent = "Edit Item";
        itemId.value = id;
        itemServiceId.value = serviceId || "";
        itemName.value = name || "";
        itemNameAr.value = nameAr || "";
        itemDescription.value = description || "";
        itemDescriptionAr.value = descriptionAr || "";
        itemCount.value = count || "";
        itemActive.value = active || "1";
        itemPrice.value = price || "";
        itemDiscount.value = discount || "";
        itemCat.value = cat || "";
        itemImageOld.value = image || "";
        itemImage.value = "";
        saveItemBtn.onclick = editItem;
        new bootstrap.Modal(document.getElementById("itemModal")).show();
    }
}

async function addItem() {
    const serviceId = document.getElementById("item-service-id")?.value.trim();
    const name = document.getElementById("item-name")?.value.trim();
    const nameAr = document.getElementById("item-name-ar")?.value.trim();
    const description = document.getElementById("item-description")?.value.trim();
    const descriptionAr = document.getElementById("item-description-ar")?.value.trim();
    const count = document.getElementById("item-count")?.value.trim();
    const active = document.getElementById("item-active")?.value;
    const price = document.getElementById("item-price")?.value.trim();
    const discount = document.getElementById("item-discount")?.value.trim();
    const cat = document.getElementById("item-cat")?.value.trim();
    const image = document.getElementById("item-image")?.files[0];

    if (!serviceId || !name || !nameAr || !description || !descriptionAr || !count || !price || !cat) {
        showAlert("error", "Error", "Please fill all required fields (Service ID, Name, Name AR, Description, Description AR, Count, Price, Category ID).");
        return;
    }

    if (image) {
        if (image.size > MAX_FILE_SIZE) {
            showAlert("error", "Error", "Image size exceeds 5 MB limit.");
            return;
        }
    } else {
        showAlert("error", "Error", "Image is required for adding a new item.");
        return;
    }

    const formData = new FormData();
    formData.append("service_id", serviceId);
    formData.append("items_name", name);
    formData.append("items_name_ar", nameAr);
    formData.append("items_des", description);
    formData.append("items_des_ar", descriptionAr);
    formData.append("items_count", count);
    formData.append("items_active", active);
    formData.append("items_price", price);
    if (discount) formData.append("items_discount", discount);
    formData.append("items_cat", cat);
    formData.append("files", image);

    const modalSpinnerContainer = document.getElementById("modal-spinner");
    const saveItemBtn = document.getElementById("saveItemBtn");
    if (!modalSpinnerContainer || !saveItemBtn) return;

    modalSpinnerContainer.style.display = "flex";
    const spinner = new Spinner({ color: '#f26b0a', lines: 12 }).spin(modalSpinnerContainer.querySelector('.spinner'));

    saveItemBtn.disabled = true;
    try {
        const data = await fetchWithToken(ENDPOINTS.ADD, { method: "POST", body: formData });
        spinner.stop();
        modalSpinnerContainer.style.display = "none";
        if (data.status === "success") {
            showAlert("success", "Success", data.message || "Item added successfully.");
            bootstrap.Modal.getInstance(document.getElementById("itemModal")).hide();
            loadItems();
        } else {
            showAlert("error", "Error", data.message ? `Failed to add item: ${data.message}` : "Failed to add item.");
        }
    } catch (error) {
        spinner.stop();
        modalSpinnerContainer.style.display = "none";
        showAlert("error", "Error", `Failed to add item: ${error.message}`);
    } finally {
        saveItemBtn.disabled = false;
    }
}

async function editItem() {
    const id = document.getElementById("item-id")?.value;
    const serviceId = document.getElementById("item-service-id")?.value.trim();
    const name = document.getElementById("item-name")?.value.trim();
    const nameAr = document.getElementById("item-name-ar")?.value.trim();
    const description = document.getElementById("item-description")?.value.trim();
    const descriptionAr = document.getElementById("item-description-ar")?.value.trim();
    const count = document.getElementById("item-count")?.value.trim();
    const active = document.getElementById("item-active")?.value;
    const price = document.getElementById("item-price")?.value.trim();
    const discount = document.getElementById("item-discount")?.value.trim();
    const cat = document.getElementById("item-cat")?.value.trim();
    const imageOld = document.getElementById("item-image-old")?.value;
    const image = document.getElementById("item-image")?.files[0];

    if (!serviceId && !name && !nameAr && !description && !descriptionAr && !count && !active && !price && !discount && !cat && !image) {
        showAlert("error", "Error", "At least one field must be provided to update.");
        return;
    }

    if (image) {
        if (image.size > MAX_FILE_SIZE) {
            showAlert("error", "Error", "Image size exceeds 5 MB limit.");
            return;
        }
    }

    const formData = new FormData();
    formData.append("id", id);
    if (serviceId) formData.append("service_id", serviceId);
    if (name) formData.append("items_name", name);
    if (nameAr) formData.append("items_name_ar", nameAr);
    if (description) formData.append("items_des", description);
    if (descriptionAr) formData.append("items_des_ar", descriptionAr);
    if (count) formData.append("items_count", count);
    formData.append("items_active", active);
    if (price) formData.append("items_price", price);
    if (discount) formData.append("items_discount", discount);
    if (cat) formData.append("items_cat", cat);
    if (imageOld) formData.append("imageold", imageOld);
    if (image) formData.append("files", image);

    const modalSpinnerContainer = document.getElementById("modal-spinner");
    const saveItemBtn = document.getElementById("saveItemBtn");
    if (!modalSpinnerContainer || !saveItemBtn) return;

    modalSpinnerContainer.style.display = "flex";
    const spinner = new Spinner({ color: '#f26b0a', lines: 12 }).spin(modalSpinnerContainer.querySelector('.spinner'));

    saveItemBtn.disabled = true;
    try {
        const data = await fetchWithToken(ENDPOINTS.EDIT, { method: "POST", body: formData });
        spinner.stop();
        modalSpinnerContainer.style.display = "none";
        if (data.status === "success") {
            showAlert("success", "Success", data.message || "Item updated successfully.");
            bootstrap.Modal.getInstance(document.getElementById("itemModal")).hide();
            loadItems();
        } else {
            showAlert("error", "Error", data.message ? `Failed to update item: ${data.message}` : "Failed to update item.");
        }
    } catch (error) {
        spinner.stop();
        modalSpinnerContainer.style.display = "none";
        showAlert("error", "Error", `Failed to update item: ${error.message}`);
    } finally {
        saveItemBtn.disabled = false;
    }
}

async function deleteItem(id, imageName) {
    const result = await Swal.fire({
        title: 'Are you sure?',
        text: "This item will be deleted permanently!",
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
            showAlert("success", "Success", data.message || "Item deleted successfully.");
            loadItems();
        } else {
            showAlert("error", "Error", data.message ? `Failed to delete item: ${data.message}` : "Failed to delete item.");
        }
    } catch (error) {
        showAlert("error", "Error", `Failed to delete item: ${error.message}`);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadItems();

    const searchInput = document.getElementById("global-search-input");
    const clearSearchBtn = document.getElementById("clear-search");

    if (searchInput && clearSearchBtn) {
        searchInput.addEventListener("input", () => {
            clearSearchBtn.style.display = searchInput.value ? "block" : "none";
            searchItems();
        });

        searchInput.addEventListener("blur", () => {
            if (!searchInput.value) {
                clearSearchBtn.style.display = "none";
                renderItems(originalItemsData);
            }
        });
    } else {
        console.error("Search input or clear button not found");
    }
});