let currentUser = null;

function showAuthPage() {
    const landing = document.getElementById('landing-page');
    const authPage = document.getElementById('auth-page');
    landing.style.transform = 'translateY(-100%)';
    landing.style.opacity = '0';
    setTimeout(() => { landing.style.display = 'none'; authPage.style.display = 'flex'; }, 600);
}

function switchTab(tabName) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');
    document.getElementById(`${tabName}-form`).classList.add('active');
}

// ==========================================
// AUTHENTICATION LOGIC (NEW)
// ==========================================

async function handleLogin() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();
    
    if (!username || !password) return alert("Please enter both username and password!");

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        
        if (data.error) {
            alert(data.error); // Show error if wrong password/username
        } else {
            currentUser = data;
            enterMainApp();
        }
    } catch (err) {
        alert("Something went wrong!");
    }
}

// STEP 1: Request OTP
async function requestOTP() {
    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const username = document.getElementById('register-username').value.trim();
    const password = document.getElementById('register-password').value.trim();
    
    if (!name || !email || !username || !password) return alert("Please fill all fields!");
    if (password.length < 6) return alert("Password must be at least 6 characters!");

    const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
    });
    const data = await res.json();
    
    if (data.success) {
        // Show OTP step
        document.getElementById('register-step-1').style.display = 'none';
        document.getElementById('register-step-2').style.display = 'block';
        
        // FOR INTERNSHIP DEMO: Alert the OTP so you can copy-paste it!
        alert(`DEMO MODE: Your OTP for ${email} is ${data.mockOtp}`);
    }
}

// STEP 2: Verify OTP and Register
async function verifyAndRegister() {
    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const username = document.getElementById('register-username').value.trim();
    const password = document.getElementById('register-password').value.trim();
    const otp = document.getElementById('register-otp').value.trim();

    if (!otp) return alert("Please enter the OTP!");

    const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, username, password, otp })
    });
    const data = await res.json();

    if (data.error) {
        alert(data.error); // Invalid OTP or Username taken
    } else {
        alert("Registration Successful! Welcome to VibeConnect.");
        currentUser = data;
        enterMainApp();
    }
}

function logout() {
    currentUser = null;
    document.getElementById('main-app').style.display = 'none';
    document.getElementById('auth-page').style.display = 'flex';
    document.getElementById('auth-page').style.opacity = '1';
    document.getElementById('login-password').value = '';
}

function enterMainApp() {
    const authPage = document.getElementById('auth-page');
    const mainApp = document.getElementById('main-app');
    authPage.style.opacity = '0';
    
    setTimeout(() => {
        authPage.style.display = 'none';
        mainApp.style.display = 'block';
        
        document.getElementById('user-info-nav').innerHTML = `
            <div class="user-info-sm" style="color:var(--text-main);">
                <div class="avatar-placeholder" style="width:35px;height:35px;font-size:1rem;">${currentUser.name[0]}</div>
                <span><strong>${currentUser.name}</strong> (@${currentUser.username})</span>
            </div>
        `;
        loadPosts();
        loadUsers();
    }, 500);
}

// ==========================================
// APP FUNCTIONALITY LOGIC (Same as before)
// ==========================================

async function loadPosts() {
    const res = await fetch('/api/posts');
    const posts = await res.json();
    const feed = document.getElementById('posts-feed');
    feed.innerHTML = '';

    posts.forEach(post => {
        const commentsHtml = post.comments.map(c => `
            <div class="comment"><strong>@${c.username}</strong> <span>${c.content}</span></div>
        `).join('');

        const postEl = document.createElement('div');
        postEl.className = 'glass-card';
        postEl.style.marginBottom = '1.5rem';
        postEl.innerHTML = `
            <div class="post-header">
                <div class="avatar-placeholder">${post.name ? post.name[0] : 'U'}</div>
                <div class="post-header-info">
                    <span class="post-author">${post.name} <span style="color:var(--text-muted);font-weight:400;">@${post.username}</span></span>
                    <span class="post-time">Posted recently</span>
                </div>
            </div>
            <div class="post-content">${post.content}</div>
            <div class="post-actions">
                <button class="action-btn" onclick="toggleLike(${post.id})"><i class="fa-solid fa-heart"></i> ${post.likeCount} Likes</button>
                <button class="action-btn" onclick="document.getElementById('comment-input-${post.id}').focus()"><i class="fa-regular fa-comment"></i> ${post.comments.length} Comments</button>
            </div>
            <div class="comments-section">
                ${commentsHtml}
                <div class="add-comment">
                    <input type="text" id="comment-input-${post.id}" placeholder="Write a comment...">
                    <button onclick="addComment(${post.id})">Post</button>
                </div>
            </div>
        `;
        feed.appendChild(postEl);
    });
}

async function createPost() {
    const content = document.getElementById('post-content').value;
    if (!content) return;
    await fetch('/api/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: currentUser.id, content }) });
    document.getElementById('post-content').value = '';
    loadPosts();
}

async function toggleLike(postId) {
    await fetch(`/api/posts/${postId}/like`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: currentUser.id }) });
    loadPosts();
}

async function addComment(postId) {
    const input = document.getElementById(`comment-input-${postId}`);
    const content = input.value;
    if (!content) return;
    await fetch(`/api/posts/${postId}/comment`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: currentUser.id, content }) });
    input.value = '';
    loadPosts();
}

async function loadUsers() {
    const res = await fetch('/api/users');
    const users = await res.json();
    const list = document.getElementById('users-list');
    list.innerHTML = '';
    
    users.filter(u => u.id !== currentUser.id).forEach(user => {
        list.innerHTML += `
            <div class="user-item">
                <div class="user-info-sm">
                    <div class="avatar-placeholder" style="width:35px;height:35px;font-size:0.9rem;">${user.name ? user.name[0] : 'U'}</div>
                    <div style="display:flex; flex-direction:column;">
                        <strong>${user.name}</strong>
                        <span style="font-size:0.8rem; color:var(--text-muted);">@${user.username}</span>
                    </div>
                </div>
                <button class="btn-follow" onclick="toggleFollow(${user.id})">Follow</button>
            </div>
        `;
    });
}

async function toggleFollow(userId) {
    const res = await fetch(`/api/users/${userId}/follow`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ follower_id: currentUser.id }) });
    const data = await res.json();
    alert(data.followed ? "Followed!" : "Unfollowed!");
}