const API_BASE_URL = "https://abdulrahmanantar.com/outbye/admin/";
const ENDPOINTS = {
    USERS: `${API_BASE_URL}users/view.php`,
    EDIT_USER: `${API_BASE_URL}users/edit.php`,
    DELETE_USER: `${API_BASE_URL}users/delete.php`
};

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
        confirmButtonText: 'OK'
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
        cancelButtonText: 'No, cancel'
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

async function loadUsers() {
    if (!isLoggedIn()) {
        showAlert("error", "Unauthorized", "Please log in to continue");
        window.location.href = 'login.html';
        return;
    }
    const usersSpinnerContainer = document.getElementById("users-spinner");
    usersSpinnerContainer.innerHTML = '<div class="spinner"></div>';
    const usersSpinner = new Spinner({ color: '#f26b0a', lines: 12 }).spin(usersSpinnerContainer.querySelector('.spinner'));

    try {
        let usersData = { status: "error", data: [] };
        try {
            usersData = await fetchWithToken(ENDPOINTS.USERS, { method: "GET" });
            console.log("Users Data:", usersData);
        } catch (e) {
            console.error("Users Error:", e);
        }
        const usersTable = document.getElementById("users-table");
        usersTable.innerHTML = "";
        if (usersData.status === "success" && usersData.data.length > 0) {
            usersData.data.forEach(user => {
                const avatar = user.users_image || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
                usersTable.innerHTML += `
                    <tr>
                        <td>${user.users_id}</td>
                        <td>${user.users_name}</td>
                        <td>${user.users_email}</td>
                        <td>${user.users_phone}</td>
                        <td><img src="${avatar}" alt="User Image" onerror="this.src='https://cdn-icons-png.flaticon.com/512/149/149071.png'"></td>
                        <td>${user.users_create}</td>
                        <td>
                            <button class="btn btn-sm btn-custom me-2" onclick="editUser(${user.users_id}, '${user.users_name}', '${user.users_email}', '${user.users_phone}')">Edit</button>
                            <button class="btn btn-sm btn-danger" onclick="deleteUser(${user.users_id})">Delete</button>
                        </td>
                    </tr>
                `;
            });
        } else {
            usersTable.innerHTML = `<tr><td colspan="7">No users found</td></tr>`;
        }

        usersSpinner.stop();
        usersSpinnerContainer.innerHTML = '';
    } catch (error) {
        usersSpinner.stop();
        usersSpinnerContainer.innerHTML = '';
        showAlert("error", "Error", "Failed to load users: " + error.message);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadUsers();
});