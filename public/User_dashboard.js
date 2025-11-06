
        document.addEventListener('DOMContentLoaded', () => {    
            lucide.createIcons(); // Initialize Lucide icons        
            const dashboardLink = document.getElementById('dashboardLink');
            const logbookReportLink = document.getElementById('logbookReportLink');
            const complaintSuggestionLink = document.getElementById('complaintSuggestionLink');
            const uploadProjectLink = document.getElementById('uploadProjectLink');
            const editDetailsLink = document.getElementById('editDetailsLink'); 
            const requestPermissionLink = document.getElementById('requestPermissionLink'); // New request permission link
            const messagesLink = document.getElementById('messagesLink');

            const dashboardContent = document.getElementById('dashboardContent'); 
            const logbookReportContainer = document.getElementById('logbookReportContainer');
            const complaintSuggestionContainer = document.getElementById('complaintSuggestionContainer');
            const uploadProjectContainer = document.getElementById('uploadProjectContainer');
            const editDetailsContainer = document.getElementById('editDetailsContainer'); 
            const requestPermissionContainer = document.getElementById('requestPermissionContainer'); // New request permission container
            const messagesContainer = document.getElementById('messagesContainer');
            const defaultDashboard = document.getElementById('default-dashboard');
            const userProfileName = document.getElementById('user-profile-name');
            const logoutLink = document.getElementById('logout-link');


            // Dashboard specific elements
            const dashboardUserName = document.getElementById('dashboard-user-name');
            const totalReportsCount = document.getElementById('total-reports-count');
            const pendingLeaveCount = document.getElementById('pending-leave-count');
            const projectsUploadedCount = document.getElementById('projects-uploaded-count');
            const latestActivitiesList = document.getElementById('latest-activities-list');

            // Quick Action Buttons (New)
            const uploadProjectBtn = document.getElementById('uploadProjectBtn');
            const submitReportBtn = document.getElementById('submitReportBtn');
            const requestLeaveBtn = document.getElementById('requestLeaveBtn');
            const viewComplaintsBtn = document.getElementById('viewComplaintsBtn');


            // Logbook Report Form Elements
            const weeklyReportForm = document.getElementById('weeklyReportForm');
            const reportUserAvatar = document.getElementById('report-user-avatar');
            const reportUserName = document.getElementById('report-user-name');
            const reportUserEmail = document.getElementById('report-user-email'); 
            const selectedWeekDateInput = document.getElementById('selectedWeekDate');
            const weekRangeDisplay = document.getElementById('week-range-display');
            const weekRangeText = document.getElementById('week-range-text');
            const fileAttachmentInput = document.getElementById('fileAttachment');
            const selectedFileNameDisplay = document.getElementById('selected-file-name');
            const submitButton = document.getElementById('submitButton');
            const submitText = document.getElementById('submit-text'); 
            const submitLoader = document.getElementById('submit-loader'); 
            const messageContainer = document.getElementById('message-container');
            const messageText = document.getElementById('message-text');

            const dayTextareas = {
                monday: document.getElementById('monday'),
                tuesday: document.getElementById('tuesday'),
                wednesday: document.getElementById('wednesday'),
                thursday: document.getElementById('thursday'),
                friday: document.getElementById('friday'),
                saturday: document.getElementById('saturday'),
            };

            // Complaint & Suggestion Form Elements
            const complaintSuggestionForm = document.getElementById('complaintSuggestionForm');
            const complaintUserAvatar = document.getElementById('complaint-user-avatar');
            const complaintUserName = document.getElementById('complaint-user-name');
            const complaintUserEmail = document.getElementById('complaint-user-email');
            const complaintSubjectInput = document.getElementById('complaintSubject');
            const complaintMessageInput = document.getElementById('complaintMessage');
            const incidentDateTimeInput = document.getElementById('incidentDateTime');
            const incidentLocationInput = document.getElementById('incidentLocation');
            const complaintDetailsTextarea = document.getElementById('complaintDetails');
            const participantsContainer = document.getElementById('participants-container');
            const addParticipantBtn = document.getElementById('add-participant-btn');
            const submitComplaintButton = document.getElementById('submitComplaintButton');
            const complaintSubmitText = document.getElementById('complaint-submit-text');
            const complaintSubmitLoader = document.getElementById('complaint-submit-loader');
            const complaintMessageContainer = document.getElementById('complaint-message-container');
            const complaintMessageText = document.getElementById('complaint-message-text');

            // Upload Project Elements
            const dropArea = document.getElementById('drop-area');
            const projectFileInput = document.getElementById('projectFile');
            const uploadedFilesList = document.getElementById('uploaded-files-list');
            const uploadMessageContainer = document.getElementById('upload-message-container');
            const uploadMessageText = document.getElementById('upload-message-text');
            const uploadProjectNameInput = document.getElementById('uploadProjectName');
            const uploadProjectDescriptionInput = document.getElementById('uploadProjectDescription');

            // Request Leave/Permission Elements (UPDATED)
            const leaveRequestForm = document.getElementById('leaveRequestForm');
            const leaveUserAvatar = document.getElementById('leave-user-avatar');
            const leaveUserName = document.getElementById('leave-user-name');
            const leaveUserEmail = document.getElementById('leave-user-email');
            const leaveTypeInput = document.getElementById('leaveType');
            const leaveStartDateInput = document.getElementById('leaveStartDate');
            const leaveEndDateInput = document.getElementById('leaveEndDate');
            const leaveReasonInput = document.getElementById('leaveReason');
            const leaveAttachmentInput = document.getElementById('leaveAttachment');
            const submitLeaveRequestBtn = document.getElementById('submitLeaveRequestBtn');
            const leaveSubmitText = document.getElementById('leave-submit-text');
            const leaveSubmitLoader = document.getElementById('leave-submit-loader');
            const permissionMessageContainer = document.getElementById('permission-message-container'); 
            const permissionMessageText = document.getElementById('permission-message-text'); 


            // Edit Details Form Elements 
            const editProfileImage = document.getElementById('edit-profile-image');
            const editFirstNameInput = document.getElementById('editFirstName');
            const editMiddleNameInput = document.getElementById('editMiddleName'); 
            const editLastNameInput = document.getElementById('editLastName');
            const saveProfileBtn = document.getElementById('saveProfileBtn'); 

            const editEmailInput = document.getElementById('editEmail');
            const changeEmailBtn = document.getElementById('changeEmailBtn');

            const imgIds = [
            "profile-image",
            "report-user-avatar",
            "complaint-user-avatar",
            "edit-profile-image",
            "leave-user-avatar"
            ];


            const editPasswordInput = document.getElementById('editPassword');
            const changePasswordBtn = document.getElementById('changePasswordBtn');
            const newPasswordFields = document.getElementById('newPasswordFields'); 
            const currentPasswordInput = document.getElementById('currentPassword');
            const newPasswordInput = document.getElementById('newPassword');
            const confirmNewPasswordInput = document.getElementById('confirmNewPassword');
            const savePasswordBtn = document.getElementById('savePasswordBtn'); 


        // --- USER DATA LOADING FROM SESSION ---
        let sessionUserData = null; 

            async function fetchSessionUserData() {

             try {
        const res = await fetch('/users/intern-info', {
            credentials: 'include'  // Add this
        });
        if (res.status === 401) {
            window.location.href = '/Sign_in.html';
            return null;
        }

                 if (!res.ok) throw new Error("Failed to fetch session user data.");
             const data = await res.json();

                if (!data.success) throw new Error(data.message || "Invalid session user data.");

            // --- Save globally ---
        sessionUserData = data;

        // --- Update profile UI (dashboard top bar) ---
        const dashboardUserName = document.getElementById('user-profile-name');
        const dashboardUserAvatar = document.getElementById('profile-image');
        if (dashboardUserName) dashboardUserName.textContent = `
        ${data.first_name} ${data.last_name}` || "Intern";
        if (dashboardUserAvatar) {
            dashboardUserAvatar.src = data.profile_image_url || `https://placehold.co/40x40/cccccc/ffffff?text=${(data.first_name?.[0] || 'U')}`;
        }

        // --- Update avatars and forms ---
        const initials = ((data.first_name?.[0] || 'U') + (data.last_name?.[0] || '')).toUpperCase();
        const fallback40 = `https://placehold.co/40x40/cccccc/ffffff?text=${initials}`;
        const fallback64 = `https://placehold.co/64x64/cccccc/ffffff?text=${initials}`;
        const fallback96 = `https://placehold.co/96x96/cccccc/ffffff?text=${initials}`;


        //const profileImageElement = document.getElementById('profile-image');
        const reportUserAvatar = document.getElementById('report-user-avatar');
        const complaintUserAvatar = document.getElementById('complaint-user-avatar');
        const leaveUserAvatar = document.getElementById('leave-user-avatar');
        const editProfileImage = document.getElementById('edit-profile-image');

       // if (profileImageElement) profileImageElement.src = data.profile_image_url || fallback40;
        if (reportUserAvatar) reportUserAvatar.src = data.profile_image_url || fallback64;
        if (complaintUserAvatar) complaintUserAvatar.src = data.profile_image_url || fallback64;
        if (leaveUserAvatar) leaveUserAvatar.src = data.profile_image_url || fallback64;
        if (editProfileImage) editProfileImage.src = data.profile_image_url || fallback96;



        // Populate forms
        if (document.getElementById('reportUserName')) document.getElementById('report-user-name').textContent = `${data.first_name || ''} ${data.last_name || ''}`;
        if (document.getElementById('reportUserEmail')) document.getElementById('report-user-email').textContent = data.email || '';
        if (document.getElementById('complaintUserName')) document.getElementById('complaint-user-name').textContent = `${data.first_name || ''} ${data.last_name || ''}`;
        if (document.getElementById('complaintUserEmail')) document.getElementById('complaint-user-email').textContent = data.email || '';
        if (document.getElementById('leaveUserName')) document.getElementById('leave-user-name').textContent = `${data.first_name || ''} ${data.last_name || ''}`;
        if (document.getElementById('leaveUserEmail')) document.getElementById('leave-user-email').textContent = data.email || '';

        if (document.getElementById('editFirstNameInput')) document.getElementById('editFirstName').value = data.first_name || '';
        if (document.getElementById('editMiddleNameInput')) document.getElementById('editMiddleName').value = data.middle_name || '';
        if (document.getElementById('editLastNameInput')) document.getElementById('editLastName').value = data.last_name || '';
        if (document.getElementById('editEmailInput')) document.getElementById('editEmail').value = data.email || '';

        console.log("Session user data loaded:", sessionUserData);
        return data;

    } catch (err) {
        console.error("Error fetching session user data:", err);
        return null;
    }
}

    
async function loadDashboard() {
    // Show skeleton
    document.getElementById('dashboardSkeleton').classList.remove('hidden');
    document.getElementById('dashboardContent').classList.add('hidden');
    document.getElementById('dashboardStats').classList.add('hidden');

    const userData = await fetchSessionUserData();
 

    if (!userData) return;

   try {
    // Fetch stats
    const res = await fetch(`/users/dashboard/summary?userId=${userData.user_id}`, {
        credentials: 'include'  // Add this
    });
    if (!res.ok) throw new Error("Failed to fetch dashboard stats");
        const stats = await res.json();
        

        document.getElementById('total-reports-count').textContent = stats.stats.total_reports ?? "0";
        document.getElementById('pending-leave-count').textContent = stats.stats.pending_leave ?? "0";
        document.getElementById('projects-uploaded-count').textContent = stats.stats.projects_uploaded ?? "0";

        const activitiesList = document.getElementById("latest-activities-list");
activitiesList.innerHTML = "";

if (stats.activities && stats.activities.length > 0) {
  stats.activities.forEach((activity) => {
    const li = document.createElement("li");
    li.className = "flex items-center text-sm"; 

    let iconSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
      </svg>`;

    if (activity.type === "report") {
      iconSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <path d="m9 11 3 3L22 4"/>
        </svg>`;
    }
    if (activity.type === "leave") {
      iconSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-yellow-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>`;
    }
    if (activity.type === "project") {
      iconSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-purple-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>`;
    }

    li.innerHTML = `${iconSvg} <span>${activity.description || activity}</span>`;
    activitiesList.appendChild(li);
  });
} else {
  activitiesList.innerHTML =
    '<li class="text-gray-500 text-center text-sm">No recent activities.</li>';
}

        // Hide skeleton, show dashboard
        document.getElementById('dashboardSkeleton').classList.add('hidden');
        document.getElementById('dashboardContent').classList.remove('hidden');
document.getElementById('dashboardStats').classList.remove('hidden');


    } catch (err) {
        console.error("Error fetching dashboard stats:", err);
    }
}

loadDashboard();

            // Handle logout link click
            logoutLink.addEventListener('click', async (e) => {
    e.preventDefault(); 
    try {
        const response = await fetch('/auth/logout', { 
            method: 'POST',
            credentials: 'include'  
        });
        const result = await response.json();
        if (response.ok && result.success) {
            console.log('Logged out successfully.');
            sessionUserData = null; 
            window.location.href = 'Sign_in.html'; 
        } else {
            console.error('Logout failed:', result.message);
            showMessage(`Logout failed: ${result.message || 'Please try again.'}`, true, messageContainer, messageText); 
        }
    } catch (error) {
        console.error('Error during logout:', error);
        showMessage(`An error occurred during logout: ${error.message}`, true, messageContainer, messageText); 
    }
});


            // ===== PROFILE DROPDOWN (tap/click) =====
            const profileButton = document.getElementById('profileButton');
            const profileDropdown = document.getElementById('profileDropdown');

             //Continuation of profile toggle
            if (profileButton && profileDropdown) {
                const open = () => {
                 profileDropdown.classList.remove('opacity-0', 'invisible', 'scale-95');
                profileDropdown.classList.add('opacity-100', 'visible', 'scale-100');
                 profileButton.setAttribute('aria-expanded', 'true');
                 };

  const close = () => {
    profileDropdown.classList.remove('opacity-100', 'visible', 'scale-100');
    profileDropdown.classList.add('opacity-0', 'invisible', 'scale-95');
    profileButton.setAttribute('aria-expanded', 'false');
  };

  const toggle = () => {
    const isOpen = profileDropdown.classList.contains('opacity-100');
    isOpen ? close() : open();
  };

  profileButton.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggle();
  });

  // Prevent clicks inside the dropdown from closing it immediately
  profileDropdown.addEventListener('click', (e) => e.stopPropagation());

  // Click outside to close
  document.addEventListener('click', (e) => {
    if (!profileDropdown.contains(e.target) && !profileButton.contains(e.target)) close();
  });

  // ESC to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });

  // ===== PROFILE IMAGE UPLOAD/REMOVE FUNCTIONALITY =====
  const editProfileImage = document.getElementById("edit-profile-image");
  const fileInputProfile = document.getElementById("profileImageInput");
  const changeBtn = document.getElementById("changeImageBtn");
  const removeBtn = document.getElementById("removeImageBtn");


  // Change image → open file picker
  if (changeBtn) {
  changeBtn.addEventListener("click", () => fileInputProfile.click());
}

  // Upload & preview
 // Upload & preview
if (fileInputProfile) {
  fileInputProfile.addEventListener("change", async () => {
    const file = fileInputProfile.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("File must be under 10MB.");
      return;
    }


    const formData = new FormData();
    formData.append("profileImage", file);

     try {
     const response = await fetch('/users/upload-project-file', {
    method: 'POST',
    body: formData,
    credentials: 'include'  // Add this
});

      const data = await res.json();
      if (data.success) {
        editProfileImage.src = `/users/profile-picture/${data.userId || "me"}?t=${Date.now()}`;
      } else {
        alert("Failed to upload image.");
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("Error uploading image.");
    }
  });

  // Remove image
if (removeBtn) {
  removeBtn.addEventListener("click", async () => {
    if (!confirm("Remove your profile picture?")) return;

    try {
      const res = await fetch("/users/remove-profile-picture", {
        method: "DELETE",
        credentials: "include"
      });

      const data = await res.json();
      if (data.success) {
        editProfileImage.src = `/users/profile-picture/${data.userId || "me"}?t=${Date.now()}`;
      } else {
        alert("Failed to remove image.");
      }
    } catch (err) {
      console.error("Remove error:", err);
      alert("Error removing image.");
    }
  });
}
}
 }


// --- Professional User Notification System ---
const notificationBell = document.getElementById('notification-bell');
const notificationCountSpan = document.getElementById('notification-count');
const notificationDropdown = document.getElementById('notification-dropdown');
const notificationList = document.getElementById('notification-list');
const notificationLoading = document.getElementById('notification-loading');
const noNotifications = document.getElementById('no-notifications');
const notificationFooter = document.getElementById('notification-footer');
const markAllReadBtn = document.getElementById('mark-all-read');

let notifications = []; // Store all fetched notifications
let isNotificationDropdownOpen = false;
let notificationRefreshInterval = null;

// Professional notification state management
const NotificationState = {
    isLoading: false,
    hasError: false,
    lastFetchTime: null,
    unreadCount: 0
};

// Enhanced time formatting for notifications
function formatNotificationTime(timestamp) {
    const now = new Date();
    const notificationDate = new Date(timestamp);
    const diffInSeconds = Math.floor((now - notificationDate) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInSeconds < 30) {
        return 'Just now';
    } else if (diffInSeconds < 60) {
        return `${diffInSeconds}s ago`;
    } else if (diffInMinutes < 60) {
        return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
        return `${diffInHours}h ago`;
    } else if (diffInDays < 7) {
        return `${diffInDays}d ago`;
    } else {
        return notificationDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            ...(notificationDate.getFullYear() !== now.getFullYear() && { year: 'numeric' })
        });
    }
}

// Keep spinner element in DOM — just toggle its visibility
  function showNotificationLoading() {
    if (notificationLoading) {
      notificationLoading.style.display = 'flex'; // use flex so it's centered by your CSS
    }
    if (noNotifications) noNotifications.style.display = 'none';
    // remove only notification items, leave spinner and other static elements intact
    notificationList.querySelectorAll('.notification-item').forEach(item => item.remove());
  }

  function hideNotificationLoading() {
    if (notificationLoading) notificationLoading.style.display = 'none';
  }

  function showNoNotifications() {
    if (noNotifications) noNotifications.style.display = 'block';
    if (notificationFooter) notificationFooter.style.display = 'none';
  }

  function hideNoNotifications() {
    if (noNotifications) noNotifications.style.display = 'none';
  }

  function showNotificationError(message) {
    notificationList.innerHTML = `
      <div class="notification-error" style="padding: 20px; text-align: center;">
        <i data-lucide="wifi-off" class="w-8 h-8 mx-auto mb-2 text-red-400"></i>
        <div class="text-sm font-medium text-red-600 mb-1">Connection Error</div>
        <div class="text-xs text-red-500">${String(message)}</div>
        <button id="notification-try-again" class="mt-2 text-xs text-blue-600 hover:text-blue-800">
          Try again
        </button>
      </div>
    `;
    // make sure icons render
    if (window.lucide) lucide.createIcons();

    // attach try-again handler
    const tryBtn = document.getElementById('notification-try-again');
    if (tryBtn) tryBtn.addEventListener('click', () => fetchNotifications(true));
  }

  function hideNotificationError() {
    const err = notificationList.querySelector('.notification-error');
    if (err) err.remove();
  }

  function updateNotificationState() {
    const unreadNotifications = notifications.filter(notif => !notif.is_read);
    NotificationState.unreadCount = unreadNotifications.length;

    if (notificationCountSpan) {
      if (NotificationState.unreadCount > 0) {
        notificationCountSpan.textContent = NotificationState.unreadCount > 99 ? '99+' : String(NotificationState.unreadCount);
        notificationCountSpan.style.display = 'flex';
      } else {
        notificationCountSpan.style.display = 'none';
      }
    }

    if (markAllReadBtn) {
      markAllReadBtn.style.display = NotificationState.unreadCount > 0 ? 'block' : 'none';
    }
  }

  function renderNotifications() {
    hideNotificationLoading();
    hideNotificationError();

    // remove prior items but keep spinner/no-notifications blocks
    notificationList.querySelectorAll('.notification-item, .notification-empty-placeholder').forEach(el => el.remove());

    if (!notifications || notifications.length === 0) {
      showNoNotifications();
      return;
    }

    hideNoNotifications();

    // Group unread first then read
    const unread = notifications.filter(n => !n.is_read);
    const read = notifications.filter(n => n.is_read);
    const sorted = [...unread, ...read];

    sorted.forEach(notif => {
      const itemDiv = document.createElement('div');
      itemDiv.className = `notification-item ${!notif.is_read ? 'unread' : ''}`;
      itemDiv.dataset.id = notif.notification_id;

      const senderName = (notif.first_name && notif.last_name)
        ? `${notif.first_name} ${notif.last_name}`
        : (notif.email || 'System');

      itemDiv.innerHTML = `
        <div class="notification-content px-4 py-3 border-b border-gray-100">
          <div class="flex items-start justify-between gap-2">
            <div>
              <div class="notification-sender text-sm font-medium text-gray-800">${senderName}</div>
              <div class="notification-message text-sm text-gray-700 mt-1">${notif.message}</div>
              <div class="notification-time text-xs text-gray-400 mt-1">${formatNotificationTime(notif.created_at)}</div>
            </div>
          </div>
        </div>
      `;

      itemDiv.addEventListener('click', () => handleNotificationClick(notif, itemDiv));
      notificationList.appendChild(itemDiv);
    });

    // footer visibility
    if (notificationFooter) {
      notificationFooter.style.display = notifications.length >= 5 ? 'block' : 'none';
    }
  }


// Professional notification fetching with error handling
async function fetchNotifications(showLoading = false) {
    if (NotificationState.isLoading) return;
    
    NotificationState.isLoading = true;
    NotificationState.hasError = false;

    if (showLoading && isNotificationDropdownOpen) {
        showNotificationLoading();
    }

    try {
       const response = await fetch('/users/notifications', {
    method: 'GET',
    headers: {
        'Content-Type': 'application/json'
    },
    credentials: 'include'  // Add this
});

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        notifications = Array.isArray(data) ? data : [];
        NotificationState.lastFetchTime = new Date();
        
        updateNotificationState();
        if (isNotificationDropdownOpen) {
            renderNotifications();
        }

    } catch (error) {
        console.error('Error fetching notifications:', error);
        NotificationState.hasError = true;
        
        if (isNotificationDropdownOpen) {
            showNotificationError(error.message);
        }
    } finally {
        NotificationState.isLoading = false;
    }
}


// Handle notification click with professional UX
async function handleNotificationClick(notif, itemElement) {
    // Mark as read if unread
    if (!notif.is_read) {
        try {
            const response = await fetch(`/users/notifications/${notif.notification_id}/read`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                // Update local state
                notif.is_read = true;
                itemElement.classList.remove('unread');
                
                // Update global state
                NotificationState.unreadCount = Math.max(0, NotificationState.unreadCount - 1);
                updateNotificationState();
            }
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    }

    // Navigate to link if provided
    if (notif.link && notif.link.trim()) {
    closeNotificationDropdown();
    setTimeout(() => {
        // USER DASHBOARD LINK HANDLING
        if (notif.link.startsWith('/User_dashboard.html#')) {
            const hash = notif.link.split('#')[1];
            window.location.hash = hash; // handle internal user navigation
        } else if (notif.link.startsWith('/User_dashboard.html')) {
            // If full user dashboard path
            window.location.href = notif.link;
        } else {
            // If link does not match user dashboard, ignore or log error
            console.warn('Notification link not valid for user dashboard:', notif.link);
        }
    }, 150);
}

}

// Function to handle internal navigation within user dashboard
function handleInternalNavigation(hash) {
    switch (hash) {
        case 'leave-requests':
            // Navigate to leave requests section
            if (document.getElementById('requestPermissionLink')) {
                document.getElementById('requestPermissionLink').click();
            }
            break;
        case 'logbook':
            // Navigate to logbook section
            if (document.getElementById('logbookReportLink')) {
                document.getElementById('logbookReportLink').click();
            }
            break;
        case 'complaints':
            // Navigate to complaints section
            if (document.getElementById('complaintSuggestionLink')) {
                document.getElementById('complaintSuggestionLink').click();
            }
            break;
        case 'projects':
            // Navigate to projects section
            if (document.getElementById('uploadProjectLink')) {
                document.getElementById('uploadProjectLink').click();
            }
            break;
        default:
            // Navigate to dashboard
            if (document.getElementById('dashboardLink')) {
                document.getElementById('dashboardLink').click();
            }
            break;
    }
}

// Mark all notifications as read
async function markAllNotificationsAsRead() {
    if (NotificationState.unreadCount === 0) return;

    try {
        const response = await fetch('/users/notifications/mark-all-read', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
            // Update all notifications to read
            notifications.forEach(notif => {
                notif.is_read = true;
            });
            
            NotificationState.unreadCount = 0;
            updateNotificationState();
            
            // Re-render notifications
            renderNotifications();
            
            // Show success feedback
            showToast('All notifications marked as read', 'success');
        }
    } catch (error) {
        console.error('Failed to mark all notifications as read:', error);
        showToast('Failed to mark notifications as read', 'error');
    }
}

// Professional dropdown management
function openNotificationDropdown() {
    if (isNotificationDropdownOpen) return;
    
    isNotificationDropdownOpen = true;
    notificationDropdown.classList.add('active');
    
    // Fetch latest notifications when opening
    fetchNotifications(true);
    
    // Update bell icon to active state
    notificationBell.classList.add('ring-2', 'ring-blue-500', 'ring-opacity-50');
}

function closeNotificationDropdown() {
    if (!isNotificationDropdownOpen) return;
    
    isNotificationDropdownOpen = false;
    notificationDropdown.classList.remove('active');
    
    // Remove active state from bell
    notificationBell.classList.remove('ring-2', 'ring-blue-500', 'ring-opacity-50');
}

function toggleNotificationDropdown() {
    if (isNotificationDropdownOpen) {
        closeNotificationDropdown();
    } else {
        openNotificationDropdown();
    }
}

// Simple toast notification system
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 transition-all duration-300 transform translate-x-full`;
    
    const colors = {
        success: 'bg-green-500 text-white',
        error: 'bg-red-500 text-white',
        info: 'bg-blue-500 text-white'
    };
    
    toast.className += ` ${colors[type] || colors.info}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Animate in
    requestAnimationFrame(() => {
        toast.classList.remove('translate-x-full');
    });
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.classList.add('translate-x-full');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Event Listeners
notificationBell.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleNotificationDropdown();
});

if (markAllReadBtn) {
    markAllReadBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        markAllNotificationsAsRead();
    });
}

// Close dropdown when clicking outside
document.addEventListener('click', (event) => {
    if (!notificationDropdown.contains(event.target) && !notificationBell.contains(event.target)) {
        closeNotificationDropdown();
    }
});

// Keyboard navigation
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isNotificationDropdownOpen) {
        closeNotificationDropdown();
    }
});

// Professional polling system
function startNotificationPolling() {
    // Initial fetch
    fetchNotifications();
    
    // Set up intelligent polling
    notificationRefreshInterval = setInterval(() => {
        // Only poll if not actively viewing notifications
        if (!isNotificationDropdownOpen) {
            fetchNotifications();
        }
    }, 45000); // Poll every 45 seconds
}

function stopNotificationPolling() {
    if (notificationRefreshInterval) {
        clearInterval(notificationRefreshInterval);
        notificationRefreshInterval = null;
    }
}

// Initialize notification system when page loads
document.addEventListener('DOMContentLoaded', () => {
    startNotificationPolling();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    stopNotificationPolling();
});

// Helper function to show notification badge immediately when user gets new notifications
function showNewNotificationBadge() {
    if (notificationCountSpan) {
        const currentCount = parseInt(notificationCountSpan.textContent) || 0;
        notificationCountSpan.textContent = currentCount + 1;
        notificationCountSpan.style.display = 'flex';
    }
}

// Function to manually refresh notifications (can be called from anywhere)
function refreshNotifications() {
    fetchNotifications();
}




                    // --- UI LOGIC ---
            const showPanel = (panelId) => {
                const panels = [dashboardContent, logbookReportContainer, complaintSuggestionContainer, uploadProjectContainer, editDetailsContainer, requestPermissionContainer, messagesContainer];
                panels.forEach(panel => {
                    if (panel) {
                        if (panel.id === panelId) {
                            panel.classList.remove('hidden');
                        } else {
                            panel.classList.add('hidden');
                        }
                    }
                });
            };

            //Helper Function to prefill forms with session user data
       
   function prefillLogbookForm(user) {
  reportUserName.textContent = `${user.first_name || ''} ${user.last_name || ''}`.trim();
  reportUserEmail.textContent = user.email || '';
}

function prefillComplaintForm(user) {
  complaintUserName.textContent = `${user.first_name || ''} ${user.last_name || ''}`.trim();
  complaintUserEmail.textContent = user.email || '';
}

function prefillEditDetails(user) {
    editFirstNameInput.value = user.first_name || '';
    editMiddleNameInput.value = user.middle_name || '';
    editLastNameInput.value = user.last_name || '';
    editEmailInput.value = user.email || '';
}

function prefillPermissionForm(user) {
    leaveUserName.textContent =`${user.first_name || ''} ${user.last_name || ''}`.trim();
    leaveUserEmail.textContent = user.email || '';
}


            // --- SIDEBAR NAVIGATION ---

dashboardLink.addEventListener('click', (e) => {
    e.preventDefault();
    showPanel('dashboardContent'); 
     //setUserBreadcrumb('Dashboard'); 
    if (sessionUserData && sessionUserData.user_id) {
        loadDashboard(); // already uses sessionUserData
    } else {
        fetchSessionUserData().then(() => loadDashboard());
    }
});


logbookReportLink.addEventListener('click', (e) => {
    e.preventDefault();
    showPanel('logbookReportContainer');
   // setUserBreadcrumb('Logbook Report');
    if (sessionUserData && sessionUserData.user_id) {
        prefillLogbookForm(sessionUserData);
    } else {
        fetchSessionUserData().then(user => {
           if (user) prefillLogbookForm(user);
        });   
    }
});


complaintSuggestionLink.addEventListener('click', (e) => {
    e.preventDefault();
    showPanel('complaintSuggestionContainer');
    // setUserBreadcrumb('Complaint & Suggestion');
    if (sessionUserData && sessionUserData.user_id) {
        prefillComplaintForm(sessionUserData);
    } else {
        fetchSessionUserData().then(user => {
            if (user) prefillComplaintForm(user);
        });
    }
});

uploadProjectLink.addEventListener('click', (e) => {
    e.preventDefault();
    showPanel('uploadProjectContainer');
   // setUserBreadcrumb('Upload Project');
    fetchUploadedProjects();
});

editDetailsLink.addEventListener('click', (e) => {
    e.preventDefault();
    showPanel('editDetailsContainer');
   // setUserBreadcrumb('Edit Details');
    if (sessionUserData && sessionUserData.user_id) {
        prefillEditDetails(sessionUserData);
    } else {
        fetchSessionUserData().then(user => {
            if(user) prefillEditDetails(user);
        });
    }
});

requestPermissionLink.addEventListener('click', (e) => {
    e.preventDefault();
    showPanel('requestPermissionContainer');
    if (sessionUserData && sessionUserData.user_id) {
        prefillPermissionForm(sessionUserData);
    } else {
        fetchSessionUserData().then(user => {
            if (user) refillPermissionForm(user);
        });    
    }
});

messagesLink.addEventListener('click', (e) => {
    e.preventDefault();
    showPanel('messagesContainer');
});


            // Quick Actions Button Event Listeners (NEW)
            if (uploadProjectBtn) {
                uploadProjectBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    showPanel('uploadProjectContainer'); 
                    fetchSessionUserData();
                    showMessage('Mark attendance functionality coming soon!', false, messageContainer, messageText);
                });
            }

            if (submitReportBtn){
            submitReportBtn.addEventListener('click', (e) => {
                e.preventDefault();
                showPanel('logbookReportContainer'); 
                fetchSessionUserData();
            });
             }

            if (requestLeaveBtn) {
            requestLeaveBtn.addEventListener('click', (e) => {
                e.preventDefault();
                showPanel('requestPermissionContainer'); 
                fetchSessionUserData();
                leaveRequestForm.reset();
                clearMessage(permissionMessageContainer, permissionMessageText);
            });
            }

            if (viewComplaintsBtn) {
            viewComplaintsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                showPanel('complaintSuggestionContainer'); 
                fetchSessionUserData();
            });
         }


            // Generic show message function (for all forms, or specify target)
            const showMessage = (msg, isError = false, targetContainer, targetText) => {
                const container = targetContainer || messageContainer; 
                const text = targetText || messageText; 

                if (text && container) {
                    text.textContent = msg;
                    container.classList.remove('hidden');
                    if (isError) {
                        container.classList.remove('bg-green-100', 'border-green-400', 'text-green-700');
                        container.classList.add('bg-red-100', 'border-red-400', 'text-red-700');
                    } else {
                        container.classList.remove('bg-red-100', 'border-red-400', 'text-red-700');
                        container.classList.add('bg-green-100', 'border-green-400', 'text-green-700');
                    }
                }
            };

            const clearMessage = (targetContainer, targetText) => {
                const container = targetContainer || messageContainer;
                const text = targetText || messageText;

                if (container && text) {
                    container.classList.add('hidden');
                    text.textContent = '';
                }
            };


            // Normalize to Monday
            function normalizeToMonday(dateString) {
                const date = new Date(dateString);
                const day = date.getDay();
                const diff = (day === 0 ? -6 : 1) - day; 
                date.setDate(date.getDate() + diff);
                return date.toISOString().split('T')[0]; 
            }

            // Display normalized week range
           /* selectedWeekDateInput.addEventListener('change', function () {
                const selectedDate = selectedWeekDateInput.value;
                const mondayDate = normalizeToMonday(selectedDate);
                weekRangeText.textContent = mondayDate;
                weekRangeDisplay.classList.remove('hidden');
            });**/


            const getWeekRange = (dateString) => {
                if (!dateString) return '';
                const date = new Date(dateString + 'T00:00:00');
                const dayOfWeek = date.getDay();
                const startOfWeek = new Date(date);
                startOfWeek.setDate(date.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 5); 
                const options = { month: 'long', day: 'numeric', year: 'numeric' };
                const formatter = new Intl.DateTimeFormat('en-US', options);

                return `${formatter.format(startOfWeek)} - ${formatter.format(endOfWeek)}`;
            };

            selectedWeekDateInput.addEventListener('change', (e) => {
                const dateValue = e.target.value;
                const range = getWeekRange(dateValue);
                if (range) {
                    weekRangeText.textContent = range;
                    weekRangeDisplay.classList.remove('hidden');
                } else {
                    weekRangeDisplay.classList.add('hidden');
                }
            });



            // Get a reference to all interactive form elements 
            const interactiveElements = document.querySelectorAll(
             '#selectedWeekDate, .day-report-field textarea'
                );

            // Function to hide the reminder
                    function hideReminder() {
                    const reminderContainer = document.getElementById('reminder-message-container');
                        reminderContainer.style.display = 'none';
                    }

              
                        interactiveElements.forEach(element => {
                            element.addEventListener('focus', hideReminder); 
                        });

            // Function to check the submission deadline and update the UI accordingly
function updateFormForSubmissionDeadline() {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const currentHour = now.getHours();
    const reminderContainer = document.getElementById('reminder-message-container');
    const submitButton = document.getElementById('submitButton'); 
    const messageContainer = document.getElementById('message-container');
    const messageText = document.getElementById('message-text');

    // Hide all messages and disable the button by default
    if (submitButton) {
        submitButton.disabled = true;
    }
    
    // Clear the message container
    if (messageContainer && messageText) {
        messageContainer.classList.add('hidden');
        messageText.textContent = '';
    }
    
    if (reminderContainer) {
        reminderContainer.style.display = 'none';
    }

    // Check if it's Monday and the time is before 9:00 AM (the submission window)
    if (dayOfWeek === 2 && currentHour < 12) {
        // It's Monday morning, so show the reminder and enable the button
        if (reminderContainer) {
            reminderContainer.style.display = 'block';
        }
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.title = 'You can submit your logbook now.';
        }
    } else if (dayOfWeek === 2 && currentHour >= 12) {
        // It's Monday at or after 9:00 AM (deadline passed)
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.title = 'The submission deadline has passed for this week.';
        }
        showMessage('The weekly report submission deadline has passed.', true, messageContainer, messageText);
    } else {
        // It's any other day of the week, so disable the button
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.title = 'You can only submit your logbook on Mondays.';
        }
    }
}

// Call the function on page load
updateFormForSubmissionDeadline();


//Function to Fetch & Render Messages
async function renderUserMessage(messageId) {
    try {
        const res = await fetch(`/api/admin/messages/${messageId}`);
        if (!res.ok) throw new Error('Failed to fetch message');
        const msg = await res.json();

        const messageContent = document.getElementById('messageContent');
        messageContent.innerHTML = `
            <h2 class="text-2xl font-bold mb-4">${msg.title || 'Message'}</h2>
            <p class="text-gray-700 mb-4">${msg.body || ''}</p>
            ${msg.file_url 
                ? `<a href="${msg.file_url}" class="text-blue-600 underline" target="_blank">View Attachment</a>` 
                : ''
            }
        `;

        // show messages panel + update breadcrumb
        showPanel('messagesContainer');
       // setUserBreadcrumb('Messages');
    } catch (err) {
        console.error('Error loading message:', err);
        document.getElementById('messageContent').innerHTML =
            `<p class="text-red-500">Failed to load message.</p>`;
    }
}


//Handle #messages?id=123 in Hash
function handleHashNavigation() {
    const hash = window.location.hash;
    if (hash.startsWith('#messages')) {
        const params = new URLSearchParams(hash.split('?')[1]);
        const id = params.get('id');
        if (id) {
            renderUserMessage(id);
        }
    }
}

// Run on first page load
handleHashNavigation();

// Run whenever hash changes
window.addEventListener('hashchange', handleHashNavigation);


            // --- FILE UPLOAD PREVIEW ---
            fileAttachmentInput.addEventListener('change', (e) => {
                 const file = e.target.files ? e.target.files[0] : null;
                if (file) {
                    selectedFileNameDisplay.querySelector('span').textContent = file.name;
                    selectedFileNameDisplay.classList.remove('hidden');
                } else {
                    selectedFileNameDisplay.classList.add('hidden');
                }
            });

            
            // --- LOGBOOK REPORT FORM SUBMISSION LOGIC ---
            weeklyReportForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                clearMessage(messageContainer, messageText); 

                if (!sessionUserData || !sessionUserData.user_id) {
                    showMessage('User data not found. Please ensure you are logged in.', true, messageContainer, messageText);
                    return;
                }
             
                const selectedWeekDate = selectedWeekDateInput.value;
                const currentWeekRange = weekRangeText.textContent;

                if (!selectedWeekDate || !currentWeekRange) {
                    showMessage('select a week date.', true, messageContainer, messageText);
                    return;
                }

                const reports = {};
                let hasReportContent = false;
                for (const day in dayTextareas) {
                    const textarea = dayTextareas[day];
                    if (textarea && textarea.value.trim() !== '') {
                        reports[day] = textarea.value.trim();
                        hasReportContent = true;
                    }
                }

                if (!hasReportContent) {
                    showMessage('Please write at least one daily report for the week.', true, messageContainer, messageText);
                    return;
                }

                submitButton.disabled = true;
                submitText.classList.add('hidden');
                submitLoader.classList.remove('hidden');

                const formData = new FormData();
                formData.append('userId', sessionUserData.user_id); 
                formData.append('firstName', sessionUserData.first_name || '');
                formData.append('lastName', sessionUserData.last_name || '');
                formData.append('email', sessionUserData.email || '');
                formData.append('weekDate', selectedWeekDate);
                formData.append('weekRange', currentWeekRange);
                formData.append('reports', JSON.stringify(reports));
                formData.append('submittedAt', new Date().toISOString());

                const file = fileAttachmentInput.files[0];
                if (file) {
                    formData.append('fileAttachment', file);
                }

                try {
                    const response = await fetch(`/users/submit-logbook-report`, {
                     method: 'POST',
                     body: formData,
                    credentials: 'include' 
                    });

                    const result = await response.json();
                    
                    if (response.ok) {
                        showMessage(result.message || 'Weekly report submitted successfully!', false, messageContainer, messageText);
                        weeklyReportForm.reset();
                        weekRangeDisplay.classList.add('hidden');
                        selectedFileNameDisplay.classList.add('hidden');
                    } else {
                        showMessage(result.message || 'Failed to submit report. Please try again.', true, messageContainer, messageText);
                    }
                } catch (error) {
                    console.error('Error submitting logbook report:', error);
                    showMessage(`An error occurred while submitting: ${error.message}`, true, messageContainer, messageText);
                } finally {
                    submitButton.disabled = false;
                    submitText.classList.remove('hidden');
                    submitLoader.classList.add('hidden');
                }
            });

             // Show the dashboard by default on load
            showPanel('dashboardContent');

           

let participantCount = 0;

const addParticipantRow = () => {
    const newRow = document.createElement('div');
    newRow.className = 'grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-gray-50 p-3 rounded-md border border-gray-200 relative';
    newRow.innerHTML = `
        <div>
            <label for="participantName-${participantCount}" class="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input type="text" id="participantName-${participantCount}" name="participantName" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm" placeholder="Participant name">
        </div>
        <div>
            <label for="participantInvolvement-${participantCount}" class="block text-sm font-medium text-gray-700 mb-1">How Involved</label>
            <input type="text" id="participantInvolvement-${participantCount}" name="participantInvolvement" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm" placeholder="e.g., Witness, Victim">
        </div>
        <div>
            <label for="participantMobile-${participantCount}" class="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
            <input type="text" id="participantMobile-${participantCount}" name="participantMobile" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm" placeholder="e.g., +1234567890">
        </div>
        <button type="button" class="remove-participant-btn absolute top-2 right-2 text-red-500 hover:text-red-700 p-1 rounded-full bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x">
                <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
        </button>
    `;
    participantsContainer.appendChild(newRow);

    // Add event listener to the new remove button
    newRow.querySelector('.remove-participant-btn').addEventListener('click', () => {
        newRow.remove();
    });

    participantCount++;
};

addParticipantBtn.addEventListener('click', addParticipantRow);

complaintSuggestionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessage(complaintMessageContainer, complaintMessageText);

    if (!sessionUserData || !sessionUserData.user_id) {
        showMessage('User data not found. Please ensure you are logged in.', true, complaintMessageContainer, complaintMessageText);
        return;
    }

    const subject = complaintSubjectInput.value.trim();
    const message = complaintMessageInput.value.trim();
    const incidentDateTime = incidentDateTimeInput.value.trim();
    const incidentLocation = incidentLocationInput.value.trim();
    const complaintDetails = complaintDetailsTextarea.value.trim();

    const participants = [];
    participantsContainer.querySelectorAll('.grid').forEach(row => {
        const name = row.querySelector('[name="participantName"]').value.trim();
        const involvement = row.querySelector('[name="participantInvolvement"]').value.trim();
        const mobile = row.querySelector('[name="participantMobile"]').value.trim();
        if (name || involvement || mobile) {
            participants.push({ name, involvement, mobile });
        }
    });

    // --- UPDATED VALIDATION LOGIC ---
    const isSuggestionProvided = subject !== '' || message !== '';
    const isComplaintProvided = incidentDateTime !== '' || incidentLocation !== '' || complaintDetails !== '' || participants.length > 0;
    
    // The form is only invalid if BOTH suggestions and complaints are empty.
    if (!isSuggestionProvided && !isComplaintProvided) {
        showMessage('Please provide either a suggestion or fill out the complaint details.', true, complaintMessageContainer, complaintMessageText);
        return;
    }

    // --- End of UPDATED VALIDATION LOGIC ---

    submitComplaintButton.disabled = true;
    complaintSubmitText.classList.add('hidden');
    complaintSubmitLoader.classList.remove('hidden');

    const formData = new FormData();
    formData.append('userId', sessionUserData.user_id);
    formData.append('firstName', sessionUserData.first_name || '');
    formData.append('lastName', sessionUserData.last_name || '');
    formData.append('email', sessionUserData.email || '');

    // --- CORRECTION: ALWAYS append subject and message, even if empty. ---
    formData.append('subject', subject);
    formData.append('message', message);
    
    formData.append('submittedAt', new Date().toISOString());

    // Only append complaint fields if they have content
    if (incidentDateTime) formData.append('incidentDateTime', incidentDateTime);
    if (incidentLocation) formData.append('incidentLocation', incidentLocation);
    if (complaintDetails) formData.append('complaintDetails', complaintDetails);
    
    if (participants.length > 0) {
        formData.append('participants', JSON.stringify(participants));
    }

    try {
        const response = await fetch(`/users/submit-complaint-suggestion`, {
    method: 'POST',
    body: formData,
    credentials: 'include'  
});

        const result = await response.json();

        if (response.ok) {
            showMessage(result.message || 'Complaint/Suggestion submitted successfully!', false, complaintMessageContainer, complaintMessageText);
            complaintSuggestionForm.reset();
            participantsContainer.innerHTML = '';
            // Reset participantCount to 0 for a clean form
            participantCount = 0; 
        } else {
            showMessage(result.message || 'Failed to submit complaint/suggestion. Please try again.', true, complaintMessageContainer, complaintMessageText);
        }
    } catch (error) {
        console.error('Error submitting complaint/suggestion:', error);
        showMessage(`An error occurred while submitting: ${error.message}`, true, complaintMessageContainer, complaintMessageText);
    } finally {
        submitComplaintButton.disabled = false;
        complaintSubmitText.classList.remove('hidden');
        complaintSubmitLoader.classList.add('hidden');
    }
});
            
            
           
            // --- Edit Details Functionality ---


            const passwordModal = document.getElementById('passwordModal');
            const confirmPasswordInput = document.getElementById('confirmPasswordInput');
            const cancelPasswordBtn = document.getElementById('cancelPasswordBtn');
            const submitPasswordBtn = document.getElementById('submitPasswordBtn');

            // Function to show messages specifically for the Edit Details section
            const showEditDetailsMessage = (msg, isError = false) => {
            const container = document.getElementById('editDetailsMessageContainer');
            const text = document.getElementById('editDetailsMessageText');

            if (text && container) {
                text.textContent = msg;
                container.classList.remove('hidden');

            if (isError) {
                 container.classList.remove('bg-green-100', 'border-green-400', 'text-green-700');
                container.classList.add('bg-red-100', 'border-red-400', 'text-red-700');
            } else {
                 container.classList.remove('bg-red-100', 'border-red-400', 'text-red-700');
                container.classList.add('bg-green-100', 'border-green-400', 'text-green-700');

                // Auto-hide success after 4 s
                setTimeout(() => {
                container.classList.add('hidden');
                text.textContent = '';
                    }, 4000);
                     }
                 }
            };


            const clearEditDetailsMessage = () => {
                const container = document.getElementById('editDetailsMessageContainer') || messageContainer;
                const text = document.getElementById('editDetailsMessageText') || messageText;
                if (container && text) {
                    container.classList.add('hidden');
                    text.textContent = '';
                }
            };


            // Save Profile Changes (First Name, Middle Name, Last Name)
            saveProfileBtn.addEventListener('click', async () => {
                clearEditDetailsMessage();

                if (!sessionUserData || !sessionUserData.user_id) {
                    showEditDetailsMessage('User data not found. Please log in.', true);
                    return;
                }

                const updatedProfile = {
                    first_name: editFirstNameInput.value.trim(),
                    middle_name: editMiddleNameInput.value.trim(),
                    last_name: editLastNameInput.value.trim(),
                    user_id: sessionUserData.user_id 
                };

                if (!updatedProfile.first_name || !updatedProfile.last_name) {
                    showEditDetailsMessage('First Name and Last Name cannot be empty.', true);
                    return;
                }

                try {
                    const response = await fetch('/users/update-profile', { 
                        method: 'PUT', 
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(updatedProfile),
                    });

                    const result = await response.json();

                    if (response.ok) {
                        showEditDetailsMessage(result.message || 'Profile updated successfully!', false);
                        sessionUserData.first_name = updatedProfile.first_name;
                        sessionUserData.middle_name = updatedProfile.middle_name;
                        sessionUserData.last_name = updatedProfile.last_name;
                        userProfileName.textContent = `${sessionUserData.first_name || ''} ${sessionUserData.last_name || ''}`;
                    } else {
                        showEditDetailsMessage(result.message || 'Failed to update profile. Please try again.', true);
                    }
                } catch (error) {
                    console.error('Error updating profile:', error);
                    showEditDetailsMessage(`An error occurred: ${error.message}`, true);
                }
            });

            // Change Email functionality
            changeEmailBtn.addEventListener('click', () => {
                clearEditDetailsMessage();
                const isReadonly = editEmailInput.readOnly;
                editEmailInput.readOnly = !isReadonly;
                editEmailInput.classList.toggle('bg-gray-100');
                editEmailInput.classList.toggle('bg-white');
                saveEmailBtn.classList.toggle('hidden');
                changeEmailBtn.textContent = isReadonly ? 'Cancel' : 'Change email';
            });

            // Save Email Changes
            saveEmailBtn.addEventListener('click', () => {
    clearEditDetailsMessage();

    if (!sessionUserData?.user_id) {
        showEditDetailsMessage('User data not found. Please log in.', true);
        return;
    }

    const newEmail = editEmailInput.value.trim();
    if (!newEmail || !newEmail.includes('@') || !newEmail.includes('.')) {
        showEditDetailsMessage('Please enter a valid email address.', true);
        return;
    }

    // show password modal instead of prompt
    confirmPasswordInput.value = '';
    passwordModal.classList.remove('hidden');
});

/* ---------- Modal Buttons ---------- */
cancelPasswordBtn.addEventListener('click', () => {
    passwordModal.classList.add('hidden');
});

submitPasswordBtn.addEventListener('click', async () => {
    const currentPassword = confirmPasswordInput.value.trim();
    if (!currentPassword) {
        showEditDetailsMessage('Current password is required.', true);
        return;
    }
    passwordModal.classList.add('hidden');

    try {
        const res = await fetch('/users/update-email', {
            method : 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body   : JSON.stringify({
                user_id        : sessionUserData.user_id,
                new_email      : editEmailInput.value.trim(),
                current_password: currentPassword
            }),
        });
        const data = await res.json();
        if (res.ok) {
            showEditDetailsMessage(data.message || 'Email updated successfully!', false);
            sessionUserData.email = editEmailInput.value.trim();
            editEmailInput.readOnly = true;
            editEmailInput.classList.add('bg-gray-100');
            editEmailInput.classList.remove('bg-white');
            saveEmailBtn.classList.add('hidden');
            changeEmailBtn.textContent = 'Change email';
        } else {
            showEditDetailsMessage(data.message || 'Failed to update email.', true);
        }
    } catch (err) {
        console.error('Error updating email:', err);
        showEditDetailsMessage(`An error occurred: ${err.message}`, true);
    }
});


            // Change Password functionality
            changePasswordBtn.addEventListener('click', () => {
                clearEditDetailsMessage();
                newPasswordFields.classList.toggle('hidden');
                currentPasswordInput.value = '';
                newPasswordInput.value = '';
                confirmNewPasswordInput.value = '';
                changePasswordBtn.textContent = newPasswordFields.classList.contains('hidden') ? 'Change password' : 'Cancel Change';
            });

            // Save New Password
            savePasswordBtn.addEventListener('click', async () => {
                clearEditDetailsMessage();

                if (!sessionUserData || !sessionUserData.user_id) {
                    showEditDetailsMessage('User data not found. Please log in.', true);
                    return;
                }

                const currentPassword = currentPasswordInput.value;
                const newPassword = newPasswordInput.value;
                const confirmNewPassword = confirmNewPasswordInput.value;

                if (!currentPassword || !newPassword || !confirmNewPassword) {
                    showEditDetailsMessage('All password fields are required.', true);
                    return;
                }

                if (newPassword.length < 6) {
                    showEditDetailsMessage('New password must be at least 6 characters long.', true);
                    return;
                }

                if (newPassword !== confirmNewPassword) {
                    showEditDetailsMessage('New password and confirm new password do not match.', true);
                    return;
                }

                if (currentPassword === newPassword) {
                    showEditDetailsMessage('New password cannot be the same as the current password.', true);
                    return;
                }

                try {
                    const response = await fetch('/users/update-password', { 
                        method: 'PUT', 
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            user_id: sessionUserData.user_id,
                            current_password: currentPassword,
                            new_password: newPassword,
                            confirm_new_password: confirmNewPassword,
                        }),
                    });

                    const result = await response.json();

                    if (response.ok) {
                        showEditDetailsMessage(result.message || 'Password updated successfully!', false);
                        currentPasswordInput.value = '';
                        newPasswordInput.value = '';
                        confirmNewPasswordInput.value = '';
                        newPasswordFields.classList.add('hidden');
                        changePasswordBtn.textContent = 'Change password';
                    } else {
                        showEditDetailsMessage(result.message || 'Failed to update password. Please try again.', true);
                    }
                } catch (error) {
                    console.error('Error updating password:', error);
                    showEditDetailsMessage(`An error occurred: ${error.message}`, true);
                }
            });

            // --- Upload Project Functionality ---
            let uploadedFiles = []; // Array to store information about uploaded files

            // Function to render uploaded files in the list
            const renderUploadedFiles = () => {
                uploadedFilesList.innerHTML = ''; 
                if (uploadedFiles.length === 0) {
                    uploadedFilesList.innerHTML = '<p class="text-center text-gray-500">No files uploaded yet.</p>';
                    return;
                }

                uploadedFiles.forEach((file, index) => {
                    const fileItem = document.createElement('div');
                    fileItem.className = 'flex items-center justify-between p-3 border border-gray-200 rounded-md bg-gray-50';
                    fileItem.innerHTML = `
                        <div class="flex items-center flex-grow mr-4">
                            ${getFileIcon(file.mime_type || file.type)}
                            <div class="flex-grow">
                                <p class="text-sm font-medium text-gray-800 truncate">${file.project_name || file.name}</p>
                                <div class="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                    <div class="bg-blue-600 h-1.5 rounded-full" style="width: ${file.progress || 100}%;"></div>
                                </div>
                                <p class="text-xs text-gray-500 mt-1">${file.status || 'Uploaded'} - ${(file.file_size / (1024 * 1024)).toFixed(2)} MB</p>
                            </div>
                        </div>
                        <button class="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-gray-100 transition-colors duration-200 delete-file-btn" data-id="${file.id}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2">
                                <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>
                            </svg>
                        </button>
                    `;
                    uploadedFilesList.appendChild(fileItem);
                });

                // Add event listeners for delete buttons
                uploadedFilesList.querySelectorAll('.delete-file-btn').forEach(button => {
                    button.addEventListener('click', (e) => {
                        const fileIdToDelete = parseInt(e.currentTarget.dataset.id);
                        deleteFile(fileIdToDelete);
                    });
                });
            };

            // Helper to get file icon based on type
            const getFileIcon = (fileType) => {
                if (!fileType) return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file mr-3 text-gray-500"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L15 2Z"/><path d="M14 2v6h6"/></svg>`;

                if (fileType.includes('image')) {
                    return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-image mr-3 text-blue-500"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`;
                } else if (fileType.includes('pdf')) {
                    return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-text mr-3 text-red-500"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L15 2Z"/><path d="M14 2v6h6"/><path d="M10 12H8"/><path d="M16 12h-2"/><path d="M16 16h-6"/></svg>`;
                } else if (fileType.includes('video')) {
                    return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-video mr-3 text-green-500"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="1" y="6" rx="2" ry="2"/></svg>`;
                } else {
                    return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file mr-3 text-gray-500"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L15 2Z"/><path d="M14 2v6h6"/></svg>`;
                }
            };

           // Real file upload function
            const uploadFile = async (file) => {
                clearMessage(uploadMessageContainer, uploadMessageText);

                const projectName = uploadProjectNameInput.value.trim();
                const description = uploadProjectDescriptionInput.value.trim();

                if (!projectName) {
                    showMessage('Project Name is required before uploading a file.', true, uploadMessageContainer, uploadMessageText);
                    return;
                }

                // Add a temporary entry to show immediate progress
                const tempFileEntry = {
                    id: 'temp-' + Date.now(),
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    progress: 0,
                    status: 'Uploading...',
                    project_name: projectName,
                    description: description
                };
                uploadedFiles.unshift(tempFileEntry); 
                renderUploadedFiles();

                const formData = new FormData();
                formData.append('projectFile', file);
                formData.append('projectName', projectName);
                formData.append('description', description);

                // Simulate progress for the temp file entry
                let progress = 0;
                const progressInterval = setInterval(() => {
                    progress = Math.min(progress + 5, 95); 
                    const idx = uploadedFiles.findIndex(f => f.id === tempFileEntry.id);
                    if (idx !== -1) {
                        uploadedFiles[idx].progress = progress;
                        renderUploadedFiles();
                    }
                }, 100);


                try {
                    const response = await fetch('/users/upload-project-file', {
                        method: 'POST',
                        body: formData,
                    });

                    clearInterval(progressInterval); // Stop simulation

                    const result = await response.json();

                    if (response.ok) {
                        const idx = uploadedFiles.findIndex(f => f.id === tempFileEntry.id);
                        if (idx !== -1) {
                            // Corrected line: Access result.project instead of result.file
                            uploadedFiles[idx] = {
                                id: result.project.id, // Use result.project
                                name: result.project.original_file_name,
                                project_name: result.project.project_name,
                                description: result.project.description,
                                file_size: result.project.file_size,
                                mime_type: result.project.project_file_mime_type, 
                                uploaded_at: result.project.uploaded_at,
                                progress: 100,
                                status: 'Upload Successful!',
                            };
                        }
                        showMessage(result.message, false, uploadMessageContainer, uploadMessageText);
                        uploadProjectNameInput.value = '';
                        uploadProjectDescriptionInput.value = '';
                        projectFileInput.value = '';
                        fetchUploadedProjects();
                    } else {
                        const idx = uploadedFiles.findIndex(f => f.id === tempFileEntry.id);
                        if (idx !== -1) {
                            uploadedFiles[idx].status = `Upload failed: ${result.message || 'Server error'}`;
                            uploadedFiles[idx].progress = 0;
                        }
                        showMessage(result.message || 'Failed to upload file.', true, uploadMessageContainer, uploadMessageText);
                    }
                } catch (error) {
                    clearInterval(progressInterval);
                    const idx = uploadedFiles.findIndex(f => f.id === tempFileEntry.id);
                    if (idx !== -1) {
                        uploadedFiles[idx].status = `Network error: ${error.message}`;
                        uploadedFiles[idx].progress = 0;
                    }
                    console.error('Error during file upload:', error);
                    showMessage(`An error occurred: ${error.message}`, true, uploadMessageContainer, uploadMessageText);
                } finally {
                    renderUploadedFiles();
                }
            };

            // Function to fetch already uploaded projects from the backend
            const fetchUploadedProjects = async () => {
                clearMessage(uploadMessageContainer, uploadMessageText);
                uploadedFilesList.innerHTML = '<p class="text-center text-gray-500">Loading files...</p>';
                try {
                    const response = await fetch('/users/get-uploaded-projects');
                    const result = await response.json();

                    if (response.ok) {
                        uploadedFiles = result.projects.map(p => ({
                            id: p.id,
                            project_name: p.project_name,
                            description: p.description,
                            name: p.original_file_name, 
                            file_size: p.file_size,
                            mime_type: p.mime_type,
                            uploaded_at: p.uploaded_at,
                            progress: 100, 
                            status: 'Uploaded',
                        }));
                        renderUploadedFiles();
                    } else {
                        uploadedFilesList.innerHTML = `<p class="text-center text-red-500">Error loading files: ${result.message || 'Server error'}</p>`;
                        showMessage(result.message || 'Failed to load uploaded projects.', true, uploadMessageContainer, uploadMessageText);
                    }
                } catch (error) {
                    console.error('Error fetching uploaded projects:', error);
                    uploadedFilesList.innerHTML = `<p class="text-center text-red-500">Network error loading files: ${error.message}</p>`;
                    showMessage(`An error occurred while fetching projects: ${error.message}`, true, uploadMessageContainer, uploadMessageText);
                }
            };

            // Real file deletion function
            const deleteFile = async (fileId) => {
                clearMessage(uploadMessageContainer, uploadMessageText);
                const fileToDelete = uploadedFiles.find(f => f.id === fileId);

                if (!fileToDelete) {
                    showMessage('Cannot delete file: ID missing.', true, uploadMessageContainer, uploadMessageText);
                    return;
                }

                const confirmDelete = confirm(`Are you sure you want to delete "${fileToDelete.project_name || fileToDelete.name}"? This action cannot be undone.`);
                if (!confirmDelete) return;

                const idx = uploadedFiles.findIndex(f => f.id === fileId);
                if (idx !== -1) {
                    uploadedFiles[idx].status = 'Deleting...';
                    renderUploadedFiles();
                }

                try {
                    const response = await fetch(`/users/delete-project-file/${fileId}`, {
                        method: 'DELETE',
                    });

                    const result = await response.json();

                    if (response.ok) {
                        showMessage(result.message, false, uploadMessageContainer, uploadMessageText);
                        uploadedFiles = uploadedFiles.filter(f => f.id !== fileId); 
                        renderUploadedFiles();
                    } else {
                        // Revert status on failure
                        if (idx !== -1) {
                            uploadedFiles[idx].status = 'Deletion failed.';
                            renderUploadedFiles();
                        }
                        showMessage(result.message || 'Failed to delete file.', true, uploadMessageContainer, uploadMessageText);
                    }
                } catch (error) {
                    // Revert status on network error
                    if (idx !== -1) {
                        uploadedFiles[idx].status = `Network error: ${error.message}`;
                        renderUploadedFiles();
                    }
                    console.error('Error deleting file:', error);
                    showMessage(`An error occurred while deleting: ${error.message}`, true, uploadMessageContainer, uploadMessageText);
                }
            };

            // Handle file input change
            projectFileInput.addEventListener('change', (e) => {
                const files = e.target.files;
                if (files.length > 0) {
                    Array.from(files).forEach(file => {
                        // Basic client-side validation for file size (10MB) and type
                        const maxFileSize = 10 * 1024 * 1024; // 10 MB
                        const allowedTypes = ['image/svg+xml', 'image/jpeg', 'image/png', 'application/pdf'];

                        if (file.size > maxFileSize) {
                            showMessage(`File "${file.name}" is too large. Max size is 10MB.`, true, uploadMessageContainer, uploadMessageText);
                            return;
                        }
                        if (!allowedTypes.includes(file.type)) {
                            showMessage(`File "${file.name}" has an unsupported format. Supported: SVG, JPG, PNG, PDF.`, true, uploadMessageContainer, uploadMessageText);
                            return;
                        }
                        uploadFile(file);
                    });
                }
            });

            // Handle drag and drop events
            dropArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropArea.classList.add('border-purple-500', 'bg-purple-50');
            });

            dropArea.addEventListener('dragleave', (e) => {
                e.preventDefault();
                dropArea.classList.remove('border-purple-500', 'bg-purple-50');
            });

            dropArea.addEventListener('drop', (e) => {
                e.preventDefault();
                dropArea.classList.remove('border-purple-500', 'bg-purple-50');
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    Array.from(files).forEach(file => {
                        const maxFileSize = 10 * 1024 * 1024; // 10 MB
                        const allowedTypes = ['image/svg+xml', 'image/jpeg', 'image/png', 'application/pdf'];

                        if (file.size > maxFileSize) {
                            showMessage(`File "${file.name}" is too large. Max size is 10MB.`, true, uploadMessageContainer, uploadMessageText);
                            return;
                        }
                        if (!allowedTypes.includes(file.type)) {
                            showMessage(`File "${file.name}" has an unsupported format. Supported: SVG, JPG, PNG, PDF.`, true, uploadMessageContainer, uploadMessageText);
                            return;
                        }
                        uploadFile(file);
                    });
                }
            });

            // --- Request Leave/Permission Functionality (UPDATED) ---
            leaveRequestForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                clearMessage(permissionMessageContainer, permissionMessageText); 

                if (!sessionUserData || !sessionUserData.user_id) {
                    showMessage('User data not found. Please ensure you are logged in.', true, permissionMessageContainer, permissionMessageText);
                    return;
                }

                const leaveType = leaveTypeInput.value;
                const startDate = leaveStartDateInput.value;
                const endDate = leaveEndDateInput.value;
                const reason = leaveReasonInput.value.trim();
                const attachmentFile = leaveAttachmentInput.files[0];

                if (!leaveType || !startDate || !endDate || !reason) {
                    showMessage('Please fill out all required fields: Leave Type, Start Date, End Date, and Reason.', true, permissionMessageContainer, permissionMessageText);
                    return;
                }

                // Date validation: Start date should not be after end date
                if (new Date(startDate) > new Date(endDate)) {
                    showMessage('Start Date cannot be after End Date.', true, permissionMessageContainer, permissionMessageText);
                    return;
                }
                
                // Optional client-side attachment validation
                if (attachmentFile) {
                    const maxFileSize = 5 * 1024 * 1024; // 5MB
                    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];

                    if (attachmentFile.size > maxFileSize) {
                        showMessage('Attachment is too large. Max size is 5MB.', true, permissionMessageContainer, permissionMessageText);
                        return;
                    }
                    if (!allowedTypes.includes(attachmentFile.type)) {
                        showMessage('Unsupported attachment format. Supported: PDF, DOCX, Images.', true, permissionMessageContainer, permissionMessageText);
                        return;
                    }
                }


                submitLeaveRequestBtn.disabled = true;
                leaveSubmitText.classList.add('hidden');
                leaveSubmitLoader.classList.remove('hidden');

                const formData = new FormData();
                formData.append('userId', sessionUserData.user_id);
                formData.append('firstName', sessionUserData.first_name || '');
                formData.append('lastName', sessionUserData.last_name || '');
                formData.append('email', sessionUserData.email || '');
                formData.append('leaveType', leaveType);
                formData.append('startDate', startDate);
                formData.append('endDate', endDate);
                formData.append('reason', reason);
                formData.append('requestedAt', new Date().toISOString());
                if (attachmentFile) {
                    formData.append('attachment', attachmentFile);
                }

                try {
                    // This is a placeholder. You'll need to implement this endpoint on your backend.
                    const response = await fetch('/users/submit-leave-request', {
    method: 'POST',
    body: formData,
    credentials: 'include'  // Add this
});

                    const result = await response.json();

                    if (response.ok) {
                        showMessage(result.message || 'Leave request submitted successfully!', false, permissionMessageContainer, permissionMessageText);
                        leaveRequestForm.reset(); 
                    } else {
                        showMessage(result.message || 'Failed to submit leave request. Please try again.', true, permissionMessageContainer, permissionMessageText);
                    }
                } catch (error) {
                    console.error('Error submitting leave request:', error);
                    showMessage(`An error occurred while submitting: ${error.message}`, true, permissionMessageContainer, permissionMessageText);
                } finally {
                    submitLeaveRequestBtn.disabled = false;
                    leaveSubmitText.classList.remove('hidden');
                    leaveSubmitLoader.classList.add('hidden');
                }
            });

        });
    