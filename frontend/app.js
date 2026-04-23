const API_URL = "http://localhost:8000/api";

let currentUser = null;

// Utility function to parse error details from the backend
function parseError(detail) {
    if (!detail) return "An unknown error occurred.";
    if (Array.isArray(detail)) return detail.map(e => e.msg).join(", ");
    return detail;
}

// USER FUNCTIONS
async function loadUsers() {
    const token = getToken()
    if (!token) {
        alert("Please log in to view users.");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/users`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (response.status === 401) {
            alert("Session expired. Please log in again.");
            logout();
            return;
        }

        if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`);}

        const users = await response.json();
        displayUsers(users);
    } catch (error) {
        console.error("Error loading users:", error);
        alert("Failed to load users. Please try again later.");
    }
}

async function displayUsers(users) {
     const usersContainer = document.getElementById("users-container");

    if (users.length === 0) {
        usersContainer.innerHTML = "<p>No users found.</p>";
        return;
    }
    
    usersContainer.innerHTML = users.map(user => `
        <div class="user-card">
            <h3>${user.username}</h3>
            <p>ID: ${user.id}</p>
            <p>Email: ${user.email}</p>
            <p>Role: ${user.role}</p>
            <p>Joined: ${new Date(user.created_at).toLocaleDateString()}</p>
            <p>Active: ${user.is_active ? "Yes" : "No"}</p>
        </div>
    `).join("");
}

async function deleteUser(userId) {
    if (!confirm("Are you sure you want to delete this user?")) { return; }

    try {
        const response = await fetch(`${API_URL}/users/${userId}`, { method: "DELETE" });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(parseError(errorData.detail) || `HTTP error! status: ${response.status}`);
        }

        console.log(`User with ID ${userId} deleted.`);
        loadUsers(); // Refresh the user list
    } catch (error) {
        console.error("Error deleting user:", error);
        alert("An error occurred while deleting the user.");
    }
}

async function updateUser(event) {
    event.preventDefault();

    if(!currentUser) {
        alert("No user is currently logged in.");
        return;
    }

    const newUsername = document.getElementById("edit-username").value;
    const newEmail = document.getElementById("edit-email").value;
    const newRole = document.getElementById("edit-role").value;

    const body = {};
    if (newUsername != currentUser.username) { body.username = newUsername; }
    if (newEmail != currentUser.email) { body.email = newEmail; }
    if (newRole != currentUser.role) { body.role = newRole; }

    if (Object.keys(body).length === 0) {
        alert("No changes provided.");
        closeEditModal();
        return;
    }

    try {
        const response = await fetch(`${API_URL}/users/${currentUser.id}`, {
            method: "PUT",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${getToken()}`
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(parseError(errorData.detail) || `HTTP error! status: ${response.status}`);
        }

        const updatedUser = await response.json();
        currentUser = updatedUser; // Update current user info with the response

        document.getElementById("current-user").textContent = `${updatedUser.username} - ${updatedUser.role}`;

        console.log("User updated: ", updatedUser.username);
        alert("Profile updated successfully.");
        closeEditModal();
    } catch (error) {
        console.error("Error updating user:", error);
        alert(`ERROR: ${error.message}`);
    }
}

async function updateUserPassword(event) {
    event.preventDefault();

    if(!currentUser) {
        alert("No user is currently logged in.");
        return;
    }

    const oldPassword = document.getElementById("current-password").value;
    const newPassword = document.getElementById("new-password").value;
    const confirmPassword = document.getElementById("confirm-new-password").value;

    if (!oldPassword || !newPassword || !confirmPassword) {
        alert("Please fill in all password fields.");
        return;
    }

    if (newPassword !== confirmPassword) {
        alert("New password and confirmation do not match.");
        return;
    }

    if (newPassword == oldPassword) {
        alert("New password cannot be the same as the current password.");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/users/${currentUser.id}`, {
            method: "PUT",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${getToken()}`
            },
            body: JSON.stringify({ password: newPassword })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(parseError(errorData.detail) || `HTTP error! status: ${response.status}`);
        }

        alert("Password updated successfully.");
        document.getElementById("update-password-form").reset();
        document.getElementById("edit-password-modal").classList.add("hidden");
    } catch (error) {
        console.error("Error updating password:", error);
        alert(`ERROR: ${error.message}`);
    }
}

async function searchUsers(event) {
    event.preventDefault();

    const query = document.getElementById("search-query").value.trim();
    const token = getToken();

    if (!query) {
        alert("Please enter a search query.");
        return;
    }

    const url = query 
        ? `${API_URL}/users?search=${encodeURIComponent(query)}`
        : `${API_URL}/users`;
        
    try {
        const response = await fetch(url, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (response.status === 401) {
            alert("Session expired. Please log in again.");
            logout();
            return;
        }
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(parseError(errorData.detail) || `HTTP error! status: ${response.status}`);
        }

        const users = await response.json();
        displayUsers(users);
    } catch (error) {
        console.error("Error searching users:", error);
        alert("An error occurred while searching for users.");
    }
}

async function createUser(event) {
    event.preventDefault(); // Prevent form submission

    const username = document.getElementById("create-username").value;
    const email = document.getElementById("create-email").value;
    const password = document.getElementById("create-password").value;
    const role = document.getElementById("role-selector").value;

    if (!username || !email || !password || !role) {
        alert("Please fill in all fields.");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, email, password, role })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(parseError(errorData.detail) || `HTTP error! status: ${response.status}`);
        }

        const newUser = await response.json();
        console.log("New user created:", newUser);
        
        const loginTab = document.querySelector('.tab[data-tab="login"]');
        showTab("login", loginTab);

        document.getElementById("create-form-el").reset();
    } catch (error) {
        console.error(error);
        alert(`ERROR: ${error.message}`);  
    }
}

function getCurrentUser() { return localStorage.getItem("user_id"); }

function setCurrentUser(userId) { localStorage.setItem("user_id", userId); }

function clearCurrentUser() { localStorage.removeItem("user_id"); }

// POST FUNCTIONS
async function createPost(event) {
    event.preventDefault();

    const title = document.getElementById("post-title").value;
    const content = document.getElementById("post-content").value;
    const token = getToken();

    if (!title || !content) {
        alert("Please enter both title and content for the post.");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/posts`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ title, content })
        });

        if (response.status === 401) {
            alert("Session expired. Please log in again.");
            logout();
            return;
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(parseError(errorData.detail) || `HTTP error! status: ${response.status}`);
        }

        document.getElementById("post-form").reset();
        loadPosts();
        const newPost = await response.json();
        console.log("New post created:", newPost);
    } catch (error) {
        console.error("Error creating post:", error);
        alert(`ERROR: ${error.message}`);
    }
}

async function loadPosts() {
    try {
        const response = await fetch(`${API_URL}/posts`);

        if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`);}

        const posts = await response.json();
        displayPosts(posts);
    } catch (error) {
        console.error("Error loading posts:", error);
        alert("Failed to load posts. Please try again later.");
    }
}

function displayPosts(posts) {
    const postsContainer = document.getElementById("posts-container");

    if (posts.length === 0) {
        postsContainer.innerHTML = "<p>No posts yet. Be the first to create one!</p>";
        return;
    }
    
    postsContainer.innerHTML = posts.map(post => `
        <div class="post-card">
            <h3>${escapeHtml(post.title)}</h3>
            <div class="post-meta">
                By: <strong>${escapeHtml(post.authorship.username)}</strong>
                On: ${new Date(post.created_at).toLocaleString()}
            </div>
            <div class="post-content">
                ${escapeHtml(post.content).replace(/\n/g, "<br>")}
            </div>
            ${isMyPost(post) ? 
                `<div class="post-actions">
                <button onclick="deletePost(${post.id})" class="logout-btn">Delete</button>
                </div>`
            : ""}
        </div>
    `).join("");
}

function isMyPost(post) {
    if (!currentUser) return false;  
    return post.user_id == currentUser.id;
}

async function deletePost(postId) {
    if (!confirm("Are you sure you want to delete this post?")) { return; }

    try {
        const response = await fetch(`${API_URL}/posts/${postId}`, { 
            method: "DELETE",
            headers: { "Authorization": `Bearer ${getToken()}` }
        });

        if (response.status === 401) {
            alert("Session expired. Please log in again.");
            logout();
            return;
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(parseError(errorData.detail) || `HTTP error! status: ${response.status}`);
        }

        console.log(`Post with ID ${postId} deleted.`);
        loadPosts(); // Refresh the post list
    } catch (error) {
        console.error("Error deleting post:", error);
        alert("An error occurred while deleting the post.");
    }
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

// DISPLAY UI FUNCTIONS
function showAppUI() {
    document.getElementById("auth-ui").classList.add("hidden");
    document.getElementById("app-ui").classList.remove("hidden");
}

function showAuthUI() {
    document.getElementById("app-ui").classList.add("hidden");
    document.getElementById("auth-ui").classList.remove("hidden");
}

function showSearchUI() {
    document.getElementById("search-ui").classList.remove("hidden");
    document.getElementById("post-ui").classList.add("hidden");
    loadUsers();
}

function showPostUI() {
    document.getElementById("search-ui").classList.add("hidden");
    document.getElementById("post-ui").classList.remove("hidden");
    loadPosts();
}

function showTab(tab, selectedTab) {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    selectedTab.classList.add("active");

    const login = document.getElementById("login-form");
    const signup = document.getElementById("create-form");
    const search = document.getElementById("search-ui");
    const post = document.getElementById("post-ui");

    if (tab === "login") {
        login.classList.remove("hidden");
        signup.classList.add("hidden");
    } else if (tab == "search-user") {
        post.classList.add("hidden");
        search.classList.remove("hidden");
    } else if (tab == "post") {
        search.classList.add("hidden");
        post.classList.remove("hidden");
    } else {
        signup.classList.remove("hidden");
        login.classList.add("hidden");
    }
}

function showEditModal() {
    if (!currentUser) { return; }

    document.getElementById("edit-username").value = currentUser.username;
    document.getElementById("edit-email").value = currentUser.email;
    document.getElementById("edit-role").value = currentUser.role;

    document.getElementById("edit-profile-modal").classList.remove("hidden");
}

function closeEditModal() {
    document.getElementById("edit-profile-modal").classList.add("hidden");
    document.getElementById("edit-profile-form").reset();
}

function showUpdatePasswordModal() {
        if (!currentUser) { return; }

        document.getElementById("edit-profile-modal").classList.add("hidden");
        document.getElementById("edit-password-modal").classList.remove("hidden");
}

function closeUpdatePasswordModal() {
    document.getElementById("edit-password-modal").classList.add("hidden");
    document.getElementById("update-password-form").reset();
    document.getElementById("edit-profile-modal").classList.remove("hidden");
}

// AUTH functions
function getToken() { return localStorage.getItem("access_token"); }

function setToken(token) { localStorage.setItem("access_token", token); }

function clearToken() { localStorage.removeItem("access_token"); }

function isLoggedIn() { return getToken() != null; }

async function login(event) {
    event.preventDefault();

    const username = document.getElementById("login-username").value;
    const password = document.getElementById("login-password").value;

    if (!username || !password) {
        alert("Please enter username and password.");
        return;
    }

    try {
        const formData = new FormData();
        formData.append("username", username);
        formData.append("password", password);

        const response = await fetch(`${API_URL}/token`, {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(parseError(errorData.detail) || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setToken(data.access_token);

        document.getElementById("login-form-el").reset();

        await loadCurrentUser(); // Load current user info after login
        showAppUI();
        showPostUI();
    } catch (error) {
        console.error(error);
        alert(`ERROR: ${error.message}`);
    }
}

function logout() {
    clearToken();
    clearCurrentUser();
    currentUser = null;
    showAuthUI();
}

async function loadCurrentUser() {
    try {
        const response = await fetch(`${API_URL}/me`, {
            headers: { "Authorization": `Bearer ${getToken()}` }
        });

        if (!response.ok) {
            alert("Failed to load current user info. Please log in again.");
        }

        const userData = await response.json();
        currentUser = userData;

        console.log("Current user data:", userData);

        document.getElementById("current-user").textContent = `${userData.username} - ${userData.role}`;
    } catch (error) {
        console.error("Error loading user: ", error);
        logout(); // Clear token and show auth UI if there's an error loading current user
    }
}

// LOAD/SETUP FUNCTIONS
function setUpEventListeners() {
    document.querySelectorAll(".tab").forEach(tab => {
        tab.addEventListener("click", () =>  {
            const targetTab = tab.getAttribute("data-tab");
            showTab(targetTab, tab);
        });
    });

    const loginForm = document.getElementById("login-form-el");
    if (loginForm) {
        loginForm.addEventListener("submit", login);
    }

    const signupForm = document.getElementById("create-form-el");
    if (signupForm) {
        signupForm.addEventListener("submit", createUser);
    }

    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", logout);
    }

    const updateBtn = document.getElementById("update-btn");
    if (updateBtn) {
        updateBtn.addEventListener("click", showEditModal);
    }

    const editForm = document.getElementById("edit-profile-form");
    if (editForm) {
        editForm.addEventListener("submit", updateUser);
    }

    document.querySelector(".close-modal")?.addEventListener("click", closeEditModal);
    document.querySelector(".cancel-modal")?.addEventListener("click", closeEditModal);

    document.getElementById('edit-profile-modal')?.addEventListener("click", function(e) {
        if (e.target === this) {
            closeEditModal();
        }
    });
    
    const updatePasswordBtn = document.getElementById("update-password-btn");
    if (updatePasswordBtn) {
        updatePasswordBtn.addEventListener("click", showUpdatePasswordModal);
    }

    const editPasswordForm = document.getElementById("update-password-form");
    if (editPasswordForm) {
        editPasswordForm.addEventListener("submit", updateUserPassword);
    }

    document.querySelector(".close-password-modal")?.addEventListener("click", closeUpdatePasswordModal);
    document.querySelector(".cancel-password-modal")?.addEventListener("click", closeUpdatePasswordModal);

    document.getElementById('edit-password-modal')?.addEventListener("click", function(e) {
        if (e.target === this) {
            closeUpdatePasswordModal();
        }
    });

    const searchForm = document.getElementById("search-form");
    if (searchForm) {
        searchForm.addEventListener("submit", searchUsers);
    }

    const allUsersBtn = document.getElementById("show-all-btn");
    if (allUsersBtn) {
        allUsersBtn.addEventListener("click", loadUsers);
    }

    const postForm = document.getElementById("post-form");
    if (postForm) {
        postForm.addEventListener("submit", createPost);
    }
}

window.addEventListener("load", async () => {
    setUpEventListeners();

    if (isLoggedIn()) {
        await loadCurrentUser();

        showAppUI();
        showPostUI();
    } else {
        showAuthUI();
    }
});