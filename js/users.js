const API_BASE_URL = "https://abdulrahmanantar.com/outbye/admin/";
const ENDPOINTS = {
    USERS: `${API_BASE_URL}users/view.php`,
    EDIT_USER: `${API_BASE_URL}users/edit.php`,
    DELETE_USER: `${API_BASE_URL}users/delete.php`
};

const DEFAULT_IMAGE = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

let originalUsersData = [];

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
        try {
            return JSON.parse(text);
        } catch (e) {
            console.error("JSON Parse Error:", e, "Raw:", text);
            throw new Error("Invalid JSON response");
        }
    } catch (error) {
        console.error("Fetch Error:", error);
        throw error;
    }
}

function showAlert(icon, title, text) {
    Swal.fire({
        icon,
        title,
        text,
        confirmButtonText: 'OK',
        confirmButtonColor: '#f26b0a'
    });
}

async function editUser(userId, currentName, currentEmail, currentPhone) {
    const { value: formValues } = await Swal.fire({
        title: 'Edit User',
        html:
            `<input id="swal-input1" class="swal2-input" value="${currentName}" placeholder="Name">` +
            `<input id="swal-input2" class="swal2-input" value="${currentEmail}" placeholder="Email">` +
            `<input id="swal-input3" class="swal2-input" value="${currentPhone}" placeholder="Phone">`,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Save',
        confirmButtonColor: '#f26b0a',
        preConfirm: () => {
            return {
                users_id: userId,
                users_name: document.getElementById('swal-input1').value,
                users_email: document.getElementById('swal-input2').value,
                users_phone: document.getElementById('swal-input3').value
            };
        }
    });

    if (formValues) {
        try {
            const formData = new FormData();
            formData.append('users_id', formValues.users_id);
            formData.append('users_name', formValues.users_name);
            formData.append('users_email', formValues.users_email);
            formData.append('users_phone', formValues.users_phone);
            console.log("Editing user:", formValues);

            const response = await fetchWithToken(ENDPOINTS.EDIT_USER, {
                method: "POST",
                body: formData
            });
            console.log("Edit Response:", response);
            if (response.status === "success") {
                showAlert("success", "Updated", "User updated successfully");
                loadUsers();
            } else {
                showAlert("error", "Error", response.message || "Failed to update user");
            }
        } catch (error) {
            console.error("Edit Error:", error);
            showAlert("error", "Error", "Failed to update user: " + error.message);
        }
    }
}

async function deleteUser(userId) {
    const result = await Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, delete it!',
        cancelButtonText: 'No, cancel',
        confirmButtonColor: '#f26b0a'
    });

    if (result.isConfirmed) {
        try {
            const formData = new FormData();
            formData.append('users_id', userId);
            console.log("Deleting user:", userId);

            const response = await fetchWithToken(ENDPOINTS.DELETE_USER, {
                method: "POST",
                body: formData
            });
            console.log("Delete Response:", response);
            if (response.status === "success") {
                showAlert("success", "Deleted", "User deleted successfully");
                loadUsers();
            } else {
                showAlert("error", "Error", response.message || "Failed to delete user");
            }
        } catch (error) {
            console.error("Delete Error:", error);
            showAlert("error", "Error", "Failed to delete user: " + error.message);
        }
    }
}

function renderUsers(users) {
    const usersGrid = document.getElementById("users-grid");
    if (!usersGrid) {
        console.error("Users grid not found");
        return;
    }

    usersGrid.innerHTML = "";
    if (users.length === 0) {
        usersGrid.innerHTML = '<p class="text-center text-muted w-100">No users found.</p>';
        return;
    }

    users.forEach(user => {
        const avatar = user.users_image || DEFAULT_IMAGE;
        const card = `
            <div class="user-card">
                <img src="${avatar}" alt="User Image" loading="lazy" onerror="this.src='${DEFAULT_IMAGE}'">
                <h5>User #${user.users_id}</h5>
                <div class="user-info">Name: ${user.users_name}</div>
                <div class="user-info">Email: ${user.users_email}</div>
                <div class="user-info">Phone: ${user.users_phone}</div>
                <div class="actions">
                    <div>
                        <button class="btn btn-action btn-edit" data-tooltip="Edit user" onclick="editUser(${user.users_id}, '${user.users_name}', '${user.users_email}', '${user.users_phone}')">Edit</button>
                        <button class="btn btn-action btn-delete" data-tooltip="Delete user" onclick="deleteUser(${user.users_id})">Delete</button>
                    </div>
                </div>
            </div>
        `;
        usersGrid.innerHTML += card;
    });
}

function clearSearch() {
    const searchInput = document.getElementById("global-search-input");
    const clearSearchBtn = document.getElementById("clear-search");
    if (searchInput && clearSearchBtn) {
        searchInput.value = "";
        clearSearchBtn.style.display = "none";
        renderUsers(originalUsersData);
    }
}

function searchUsers() {
    const searchInput = document.getElementById("global-search-input");
    if (!searchInput) {
        console.error("Search input not found");
        return;
    }

    const searchValue = searchInput.value.trim().toLowerCase();
    const clearSearchBtn = document.getElementById("clear-search");
    clearSearchBtn.style.display = searchValue ? "block" : "none";

    if (!searchValue) {
        renderUsers(originalUsersData);
        return;
    }

    const filteredUsers = originalUsersData.filter(user =>
        (user.users_id && user.users_id.toString().includes(searchValue)) ||
        (user.users_name && user.users_name.toLowerCase().includes(searchValue)) ||
        (user.users_email && user.users_email.toLowerCase().includes(searchValue)) ||
        (user.users_phone && user.users_phone.toLowerCase().includes(searchValue))
    );
    renderUsers(filteredUsers);
}

async function loadUsers() {
    if (!isLoggedIn()) {
        showAlert("error", "Unauthorized", "Please log in to continue");
        window.location.href = 'login.html';
        return;
    }

    const usersSkeleton = document.getElementById("users-skeleton");
    if (!usersSkeleton) {
        console.error("Skeleton grid not found");
        return;
    }

    usersSkeleton.style.display = "grid";

    try {
        let usersData = { status: "error", data: [] };
        try {
            usersData = await fetchWithToken(ENDPOINTS.USERS, { method: "GET" });
            console.log("Users Data:", usersData);
        } catch (e) {
            console.error("Users Error:", e);
        }

        usersSkeleton.style.display = "none";

        if (usersData.status === "success" && usersData.data.length > 0) {
            originalUsersData = usersData.data;
            renderUsers(originalUsersData);
        } else {
            const usersGrid = document.getElementById("users-grid");
            if (usersGrid) {
                usersGrid.innerHTML = '<p class="text-center text-muted w-100">No users found.</p>';
            }
        }
    } catch (error) {
        usersSkeleton.style.display = "none";
        showAlert("error", "Error", "Failed to load users: " + error.message);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadUsers();

    const searchInput = document.getElementById("global-search-input");
    const clearSearchBtn = document.getElementById("clear-search");

    if (searchInput && clearSearchBtn) {
        searchInput.addEventListener("input", () => {
            searchUsers();
        });

        searchInput.addEventListener("blur", () => {
            if (!searchInput.value) {
                clearSearchBtn.style.display = "none";
                renderUsers(originalUsersData);
            }
        });
    } else {
        console.error("Search input or clear button not found");
    }
});