const API_BASE_URL = "https://abdulrahmanantar.com/outbye/admin/items/";
const ENDPOINTS = {
    ADD: `${API_BASE_URL}add.php`,
    VIEW: `${API_BASE_URL}view.php`,
    EDIT: `${API_BASE_URL}edit.php`,
    DELETE: `${API_BASE_URL}delete.php`
};

const DEFAULT_IMAGE = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
const MAX_FILE_SIZE = 5 * 1024 * 1024;

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
            if (url.includes('edit.php') && response.status === 200) {
                return { status: "success", message: "Item updated successfully (status 200)." };
            }
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

async function loadItems() {
    if (!isLoggedIn()) {
        showAlert("error", "Unauthorized", "Please log in to continue.", () => {
            window.location.href = 'login.html';
        });
        return;
    }

    const spinnerContainer = document.getElementById("table-spinner");
    spinnerContainer.innerHTML = '<div class="spinner"></div>';
    const spinner = new Spinner({ color: '#f26b0a', lines: 12 }).spin(spinnerContainer.querySelector('.spinner'));

    try {
        const data = await fetchWithToken(ENDPOINTS.VIEW, { method: "GET" });
        spinner.stop();
        spinnerContainer.innerHTML = '';

        if (data.status === "success") {
            const tableBody = document.getElementById("items-table");
            tableBody.innerHTML = "";
            data.data.forEach(item => {
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
        } else {
            showAlert("error", "Error", data.message || "Failed to load items.");
        }
    } catch (error) {
        spinner.stop();
        spinnerContainer.innerHTML = '';
        showAlert("error", "Error", `Failed to load items: ${error.message}`);
    }
}

function prepareAddItem() {
    document.getElementById("itemModalLabel").textContent = "Add Item";
    document.getElementById("itemForm").reset();
    document.getElementById("item-id").value = "";
    document.getElementById("item-image-old").value = "";
    document.getElementById("saveItemBtn").onclick = addItem;
}

function prepareEditItem(id, serviceId, name, nameAr, description, descriptionAr, count, active, price, discount, cat, image) {
    document.getElementById("itemModalLabel").textContent = "Edit Item";
    document.getElementById("item-id").value = id;
    document.getElementById("item-service-id").value = serviceId || "";
    document.getElementById("item-name").value = name || "";
    document.getElementById("item-name-ar").value = nameAr || "";
    document.getElementById("item-description").value = description || "";
    document.getElementById("item-description-ar").value = descriptionAr || "";
    document.getElementById("item-count").value = count || "";
    document.getElementById("item-active").value = active || "1";
    document.getElementById("item-price").value = price || "";
    document.getElementById("item-discount").value = discount || "";
    document.getElementById("item-cat").value = cat || "";
    document.getElementById("item-image-old").value = image || "";
    document.getElementById("item-image").value = "";
    document.getElementById("saveItemBtn").onclick = editItem;
    new bootstrap.Modal(document.getElementById("itemModal")).show();
}

async function addItem() {
    const serviceId = document.getElementById("item-service-id").value.trim();
    const name = document.getElementById("item-name").value.trim();
    const nameAr = document.getElementById("item-name-ar").value.trim();
    const description = document.getElementById("item-description").value.trim();
    const descriptionAr = document.getElementById("item-description-ar").value.trim();
    const count = document.getElementById("item-count").value.trim();
    const active = document.getElementById("item-active").value;
    const price = document.getElementById("item-price").value.trim();
    const discount = document.getElementById("item-discount").value.trim();
    const cat = document.getElementById("item-cat").value.trim();
    const image = document.getElementById("item-image").files[0];

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

    document.getElementById("saveItemBtn").disabled = true;
    try {
        const data = await fetchWithToken(ENDPOINTS.ADD, { method: "POST", body: formData });
        if (data.status === "success") {
            showAlert("success", "Success", data.message || "Item added successfully.");
            bootstrap.Modal.getInstance(document.getElementById("itemModal")).hide();
            loadItems();
        } else {
            showAlert("error", "Error", data.message || "Failed to add item.");
        }
    } catch (error) {
        showAlert("error", "Error", `Failed to add item: ${error.message}`);
    } finally {
        document.getElementById("saveItemBtn").disabled = false;
    }
}

async function editItem() {
    const id = document.getElementById("item-id").value;
    const serviceId = document.getElementById("item-service-id").value.trim();
    const name = document.getElementById("item-name").value.trim();
    const nameAr = document.getElementById("item-name-ar").value.trim();
    const description = document.getElementById("item-description").value.trim();
    const descriptionAr = document.getElementById("item-description-ar").value.trim();
    const count = document.getElementById("item-count").value.trim();
    const active = document.getElementById("item-active").value;
    const price = document.getElementById("item-price").value.trim();
    const discount = document.getElementById("item-discount").value.trim();
    const cat = document.getElementById("item-cat").value.trim();
    const imageOld = document.getElementById("item-image-old").value;
    const image = document.getElementById("item-image").files[0];

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

    document.getElementById("saveItemBtn").disabled = true;
    try {
        const data = await fetchWithToken(ENDPOINTS.EDIT, { method: "POST", body: formData });
        if (data.status === "success") {
            showAlert("success", "Success", data.message || "Item updated successfully.");
            bootstrap.Modal.getInstance(document.getElementById("itemModal")).hide();
            loadItems();
        } else {
            showAlert("error", "Error", data.message || "Failed to update item.");
        }
    } catch (error) {
        showAlert("error", "Error", `Failed to update item: ${error.message}`);
    } finally {
        document.getElementById("saveItemBtn").disabled = false;
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
            showAlert("error", "Error", data.message || "Failed to delete item.");
        }
    } catch (error) {
        showAlert("error", "Error", `Failed to delete item: ${error.message}`);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadItems();
});