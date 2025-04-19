const API_BASE_URL = "https://abdulrahmanantar.com/outbye/admin/categories/";
const ENDPOINTS = {
    ADD: `${API_BASE_URL}add.php`,
    VIEW: `${API_BASE_URL}view.php`,
    EDIT: `${API_BASE_URL}edit.php`,
    DELETE: `${API_BASE_URL}delete.php`
};

const DEFAULT_IMAGE = 'https://cdn-icons-png.flaticon.com/512/149/149071.png'; // Default avatar
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB in bytes
const CORRECT_IMAGE_PATH = 'https://abdulrahmanantar.com/outbye/upload/categories/';

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
        confirmButtonText: 'OK'
    }).then(() => {
        if (callback) callback();
    });
}

async function searchCategories(query) {
    const lowerQuery = query.toLowerCase();
    try {
        const data = await fetchWithToken(ENDPOINTS.VIEW, { method: "GET" });
        if (data.status === "success") {
            return data.data.filter(category =>
                category.categories_name.toLowerCase().includes(lowerQuery) ||
                category.categories_name_ar.toLowerCase().includes(lowerQuery) ||
                category.categories_id.toString().includes(lowerQuery)
            );
        }
        return [];
    } catch (error) {
        console.error("Search Categories Error:", error);
        showAlert("error", "Error", "Failed to search categories: " + error.message);
        return [];
    }
}

async function loadCategories(searchQuery = "") {
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
        let categories = [];
        if (searchQuery) {
            categories = await searchCategories(searchQuery);
        } else {
            const data = await fetchWithToken(ENDPOINTS.VIEW, { method: "GET" });
            if (data.status === "success") {
                categories = data.data;
            }
        }

        spinner.stop();
        spinnerContainer.innerHTML = '';

        const tableBody = document.getElementById("categories-table");
        tableBody.innerHTML = "";
        if (categories.length > 0) {
            categories.forEach(category => {
                let imageSrc = DEFAULT_IMAGE;
                if (category.categories_image && category.categories_image !== "null" && category.categories_image !== "") {
                    let correctedImageSrc = category.categories_image;
                    if (correctedImageSrc.includes('/outbye/categories/')) {
                        const fileName = correctedImageSrc.split('/').pop();
                        correctedImageSrc = `${CORRECT_IMAGE_PATH}${fileName}`;
                    }
                    imageSrc = correctedImageSrc;
                }

                tableBody.innerHTML += `
                    <tr>
                        <td>${category.categories_id}</td>
                        <td>${category.categories_name}</td>
                        <td>${category.categories_name_ar}</td>
                        <td><img src="${imageSrc}" alt="Category Image" onerror="this.src='${DEFAULT_IMAGE}'"></td>
                        <td>${category.categories_datetime}</td>
                        <td>
                            <button class="btn btn-sm btn-info btn-action me-2" onclick="viewServices(${category.categories_id})">
                                View
                            </button>
                            <button class="btn btn-sm btn-warning btn-action me-2" onclick="prepareEditCategory('${category.categories_id}', '${category.categories_name}', '${category.categories_name_ar}', '${category.categories_image}')">
                                Edit
                            </button>
                            <button class="btn btn-sm btn-danger btn-action" onclick="deleteCategory('${category.categories_id}', '${category.categories_image}')">
                                Delete
                            </button>
                        </td>
                    </tr>
                `;
            });
        } else {
            tableBody.innerHTML = `<tr><td colspan="6">No categories found</td></tr>`;
        }
    } catch (error) {
        spinner.stop();
        spinnerContainer.innerHTML = '';
        showAlert("error", "Error", `Failed to load categories: ${error.message}`);
    }
}

function viewServices(categoryId) {
    window.location.href = `category_services.html?category_id=${categoryId}`;
}

function prepareAddCategory() {
    document.getElementById("categoryModalLabel").textContent = "Add Category";
    document.getElementById("categoryForm").reset();
    document.getElementById("category-id").value = "";
    document.getElementById("category-image-old").value = "";
    document.getElementById("saveCategoryBtn").onclick = addCategory;
}

function prepareEditCategory(id, name, nameAr, image) {
    document.getElementById("categoryModalLabel").textContent = "Edit Category";
    document.getElementById("category-id").value = id;
    document.getElementById("category-name").value = name || "";
    document.getElementById("category-name-ar").value = nameAr || "";
    document.getElementById("category-image-old").value = image || "";
    document.getElementById("category-image").value = "";
    document.getElementById("saveCategoryBtn").onclick = editCategory;
    new bootstrap.Modal(document.getElementById("categoryModal")).show();
}

async function addCategory() {
    const name = document.getElementById("category-name").value.trim();
    const nameAr = document.getElementById("category-name-ar").value.trim();
    const image = document.getElementById("category-image").files[0];

    if (!name || !nameAr) {
        showAlert("error", "Error", "Name and Name (Arabic) are required.");
        return;
    }

    if (image) {
        if (image.size > MAX_FILE_SIZE) {
            showAlert("error", "Error", "Image size exceeds 5 MB limit.");
            return;
        }
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("namear", nameAr);
    if (image) formData.append("files", image);

    document.getElementById("saveCategoryBtn").disabled = true;
    try {
        const data = await fetchWithToken(ENDPOINTS.ADD, { method: "POST", body: formData });
        if (data.status === "success") {
            showAlert("success", "Success", data.message || "Category added successfully.");
            bootstrap.Modal.getInstance(document.getElementById("categoryModal")).hide();
            loadCategories();
        } else {
            showAlert("error", "Error", data.message || "Failed to add category.");
        }
    } catch (error) {
        showAlert("error", "Error", `Failed to add category: ${error.message}`);
    } finally {
        document.getElementById("saveCategoryBtn").disabled = false;
    }
}

async function editCategory() {
    const id = document.getElementById("category-id").value;
    const name = document.getElementById("category-name").value.trim();
    const nameAr = document.getElementById("category-name-ar").value.trim();
    const imageOld = document.getElementById("category-image-old").value;
    const image = document.getElementById("category-image").files[0];

    if (!name && !nameAr && !image) {
        showAlert("error", "Error", "At least one field (Name, Name (Arabic), or Image) must be provided.");
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
    if (name) formData.append("name", name);
    if (nameAr) formData.append("namear", nameAr);
    if (imageOld) formData.append("imageold", imageOld);
    if (image) formData.append("files", image);

    document.getElementById("saveCategoryBtn").disabled = true;
    try {
        const data = await fetchWithToken(ENDPOINTS.EDIT, { method: "POST", body: formData });
        if (data.status === "success") {
            showAlert("success", "Success", data.message || "Category updated successfully.");
            bootstrap.Modal.getInstance(document.getElementById("categoryModal")).hide();
            loadCategories();
        } else {
            showAlert("error", "Error", data.message || "Failed to update category.");
        }
    } catch (error) {
        showAlert("error", "Error", `Failed to update category: ${error.message}`);
    } finally {
        document.getElementById("saveCategoryBtn").disabled = false;
    }
}

async function deleteCategory(id, imageName) {
    const result = await Swal.fire({
        title: 'Are you sure?',
        text: "This category will be deleted permanently!",
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
            showAlert("success", "Success", data.message || "Category deleted successfully.");
            loadCategories();
        } else {
            showAlert("error", "Error", data.message || "Failed to delete category.");
        }
    } catch (error) {
        showAlert("error", "Error", `Failed to delete category: ${error.message}`);
    }
}

function handleSearch() {
    const searchQuery = document.getElementById("global-search-input").value.trim();
    loadCategories(searchQuery);
    const clearButton = document.getElementById("clear-search");
    clearButton.style.display = searchQuery ? "block" : "none";
}

function clearSearch() {
    const searchInput = document.getElementById("global-search-input");
    searchInput.value = "";
    document.getElementById("clear-search").style.display = "none";
    loadCategories("");
}

document.addEventListener("DOMContentLoaded", () => {
    loadCategories("");
    const searchInput = document.getElementById("global-search-input");
    if (searchInput) {
        searchInput.addEventListener("input", handleSearch);
        searchInput.addEventListener("blur", clearSearch);
    }
});