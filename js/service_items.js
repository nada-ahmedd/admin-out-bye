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
        let filteredItemsData = [];
        let displayedItemsCount = 10;
        let isItemsExpanded = false;
        const ITEMS_PER_PAGE = 10;

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
                confirmButtonText: 'OK',
                confirmButtonColor: '#f26b0a'
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

            const spinnerContainer = document.getElementById("items-spinner");
            spinnerContainer.classList.add("spinner-active");
            const spinner = new Spinner({ color: '#f26b0a', lines: 12 }).spin(spinnerContainer);

            try {
                const itemsData = await fetchWithToken(ENDPOINTS.VIEW, { method: "GET" });
                const servicesData = await fetchWithToken(ENDPOINTS.SERVICE_VIEW, { method: "GET" });

                spinner.stop();
                spinnerContainer.classList.remove("spinner-active");

                if (itemsData.status === "success" && Array.isArray(itemsData.data)) {
                    let filteredItems = itemsData.data.filter(item => item.service_id === serviceId);
                    if (categoryId) {
                        filteredItems = filteredItems.filter(item => item.items_cat === categoryId);
                    }

                    originalItemsData = filteredItems;
                    filteredItemsData = [...originalItemsData];

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
                        serviceNameTitle.textContent = `${serviceName} Items Management`;
                    }

                    renderItems(filteredItemsData, displayedItemsCount);
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
                showAlert("error", "Error", `Failed to load items: ${error.message}`);
                const serviceNameTitle = document.getElementById("service-name-title");
                if (serviceNameTitle) {
                    serviceNameTitle.textContent = "Error Loading Service";
                }
            }
        }

        function renderItems(items, limit = displayedItemsCount) {
            const grid = document.getElementById("items-grid");
            grid.innerHTML = '';

            if (!items || items.length === 0) {
                grid.innerHTML = '<p class="text-center text-muted w-100">No items found for this service and category.</p>';
                document.getElementById("items-view-more").style.display = "none";
                return;
            }

            const itemsToShow = items.slice(0, limit);
            itemsToShow.forEach(item => {
                const imageSrc = item.items_image && item.items_image !== "null" && item.items_image !== ""
                    ? item.items_image
                    : DEFAULT_IMAGE;

                const card = `
                    <div class="item-card">
                        <img src="${imageSrc}" alt="Item Image" onerror="this.src='${DEFAULT_IMAGE}'">
                        <h5>Item #${item.items_id}</h5>
                        <div class="item-info">Name: ${item.items_name}</div>
                        <div class="item-info">Price: ${item.items_price}</div>
                        <div class="actions">
                            <div>
                                <button class="btn btn-action btn-view" data-tooltip="View details" onclick="showItemDetails('${item.items_id}', '${item.service_id}', '${item.items_name}', '${item.items_name_ar}', '${item.items_des}', '${item.items_des_ar}', '${item.items_count}', '${item.items_active}', '${item.items_price}', '${item.items_discount}', '${item.items_cat}', '${item.items_date}', '${item.items_image}')">View</button>
                                <button class="btn btn-action btn-edit" data-tooltip="Edit item" onclick="prepareEditItem('${item.items_id}', '${item.service_id}', '${item.items_name}', '${item.items_name_ar}', '${item.items_des}', '${item.items_des_ar}', '${item.items_count}', '${item.items_active}', '${item.items_price}', '${item.items_discount}', '${item.items_cat}', '${item.items_image}')">Edit</button>
                                <button class="btn btn-action btn-delete" data-tooltip="Delete item" onclick="deleteItem('${item.items_id}', '${item.items_image}')">Delete</button>
                            </div>
                            <button class="btn-show-more" onclick="showItemDetails('${item.items_id}', '${item.service_id}', '${item.items_name}', '${item.items_name_ar}', '${item.items_des}', '${item.items_des_ar}', '${item.items_count}', '${item.items_active}', '${item.items_price}', '${item.items_discount}', '${item.items_cat}', '${item.items_date}', '${item.items_image}')">Show More</button>
                        </div>
                    </div>
                `;
                grid.innerHTML += card;
            });

            const viewMoreContainer = document.getElementById("items-view-more");
            const toggleBtn = document.getElementById("items-toggle-btn");
            const toggleBtnText = toggleBtn.querySelector('span');
            const toggleBtnIcon = toggleBtn.querySelector('i');

            if (items.length > ITEMS_PER_PAGE) {
                viewMoreContainer.style.display = "block";
                if (isItemsExpanded) {
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

        function showItemDetails(id, serviceId, name, nameAr, description, descriptionAr, count, active, price, discount, cat, date, image) {
            const imageSrc = image && image !== "null" && image !== "" ? image : DEFAULT_IMAGE;
            const activeStatus = active === "1" ? "Yes" : "No";
            const discountValue = discount || "N/A";

            Swal.fire({
                title: `Item: ${name}`,
                html: `
                    <div style="text-align: center;">
                        <img src="${imageSrc}" alt="${name}" style="width: 100%; max-width: 200px; border-radius: 8px; margin-bottom: 15px;" onerror="this.src='${DEFAULT_IMAGE}'">
                        <div style="text-align: left; font-size: 0.9rem; line-height: 1.5;">
                            <p><strong>ID:</strong> ${id}</p>
                            <p><strong>Service ID:</strong> ${serviceId || 'N/A'}</p>
                            <p><strong>Name:</strong> ${name || 'N/A'}</p>
                            <p><strong>Name (Arabic):</strong> ${nameAr || 'N/A'}</p>
                            <p><strong>Description:</strong> ${description || 'N/A'}</p>
                            <p><strong>Description (Arabic):</strong> ${descriptionAr || 'N/A'}</p>
                            <p><strong>Count:</strong> ${count || 'N/A'}</p>
                            <p><strong>Active:</strong> ${activeStatus}</p>
                            <p><strong>Price:</strong> ${price || 'N/A'}</p>
                            <p><strong>Discount:</strong> ${discountValue}</p>
                            <p><strong>Category ID:</strong> ${cat || 'N/A'}</p>
                            <p><strong>Date Added:</strong> ${date || 'N/A'}</p>
                        </div>
                    </div>
                `,
                confirmButtonText: 'Close',
                confirmButtonColor: '#f26b0a'
            });
        }

        function toggleView() {
            isItemsExpanded = !isItemsExpanded;
            displayedItemsCount = isItemsExpanded ? filteredItemsData.length : ITEMS_PER_PAGE;
            renderItems(filteredItemsData, displayedItemsCount);
            const grid = document.getElementById("items-grid");
            grid.scrollIntoView({ behavior: "smooth", block: "end" });
        }

        function clearSearch() {
            const searchInput = document.getElementById("global-search-input");
            searchInput.value = "";
            document.getElementById("clear-search").style.display = "none";
            filteredItemsData = [...originalItemsData];
            displayedItemsCount = ITEMS_PER_PAGE;
            isItemsExpanded = false;
            renderItems(filteredItemsData, displayedItemsCount);
        }

        function searchItems() {
            const searchInput = document.getElementById("global-search-input").value.trim().toLowerCase();
            const clearSearchBtn = document.getElementById("clear-search");
            clearSearchBtn.style.display = searchInput ? "block" : "none";

            if (!searchInput) {
                filteredItemsData = [...originalItemsData];
                displayedItemsCount = ITEMS_PER_PAGE;
                isItemsExpanded = false;
                renderItems(filteredItemsData, displayedItemsCount);
                return;
            }

            filteredItemsData = originalItemsData.filter(item =>
                (item.items_id && item.items_id.toString().includes(searchInput)) ||
                (item.service_id && item.service_id.toString().includes(searchInput)) ||
                (item.items_name && item.items_name.toLowerCase().includes(searchInput)) ||
                (item.items_name_ar && item.items_name_ar.toLowerCase().includes(searchInput)) ||
                (item.items_cat && item.items_cat.toString().includes(searchInput))
            );
            displayedItemsCount = ITEMS_PER_PAGE;
            isItemsExpanded = false;
            renderItems(filteredItemsData, displayedItemsCount);
        }

        function prepareAddItem() {
            document.getElementById("itemModalLabel").textContent = "Add Item";
            document.getElementById("itemForm").reset();
            document.getElementById("item-id").value = "";
            document.getElementById("item-image-old").value = "";
            document.getElementById("item-service-id").value = serviceId || "";
            document.getElementById("item-cat").value = categoryId || "";
            document.getElementById("item-active").value = "1";
            document.getElementById("saveItemBtn").onclick = addItem;
            new bootstrap.Modal(document.getElementById("itemModal")).show();
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

            const spinnerContainer = document.getElementById("modal-spinner");
            spinnerContainer.classList.add("active");
            const spinner = new Spinner({ color: '#f26b0a', lines: 12 }).spin(spinnerContainer);

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
                spinner.stop();
                spinnerContainer.classList.remove("active");
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

            if (image && image.size > MAX_FILE_SIZE) {
                showAlert("error", "Error", "Image size exceeds 5 MB limit.");
                return;
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

            const spinnerContainer = document.getElementById("modal-spinner");
            spinnerContainer.classList.add("active");
            const spinner = new Spinner({ color: '#f26b0a', lines: 12 }).spin(spinnerContainer);

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
                spinner.stop();
                spinnerContainer.classList.remove("active");
            }
        }

        async function deleteItem(id, imageName) {
            const result = await Swal.fire({
                title: 'Are you sure?',
                text: "This item will be deleted permanently!",
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

            const searchInput = document.getElementById("global-search-input");
            searchInput.addEventListener("input", searchItems);
            searchInput.addEventListener("blur", clearSearch);
        });
