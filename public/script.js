// public/script.js

// IMPORTANT: The import below might cause issues if '@tailwindplus/elements' is
// not properly configured as an ES module for direct browser use or if
// you're not using a module bundler. Consider loading it via a <script> tag in HTML if problematic.
// import '@tailwindplus/elements'; // Commenting out to prevent potential client-side module errors

console.log('Main page script running!'); // Consolidated log message

// Optional: Lucide Icons initialization (if you keep lucide script in head)
// Add null check to prevent errors if lucide is not loaded
if (typeof lucide !== 'undefined' && lucide) {
    lucide.createIcons();
}




// --- Global variable for modal redirect URL ---
let modalRedirectTarget = null;

// --- Custom Modal Functions ---
function showModal(title, message, redirectUrl = null) {
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    
    // Check if modal elements exist before trying to use them
    if (!modalTitle || !modalMessage) {
        console.warn('Modal elements not found on this page');
        // Fallback to alert for pages without modal
        alert(`${title}: ${message}`);
        if (redirectUrl) {
            window.location.href = redirectUrl;
        }
        return;
    }
    
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modalRedirectTarget = redirectUrl; // Store the redirect URL
    
    if (customModal) {
        customModal.style.display = 'flex'; // Make the modal visible
    }
}

function closeModal() {
    const customModal = document.getElementById('customModal');
    if (customModal) {
        customModal.style.display = 'none'; // Hide the modal
    }
    if (modalRedirectTarget) {
        window.location.href = modalRedirectTarget; // Perform redirect if a target is set
        modalRedirectTarget = null; // Clear the redirect target after use
    }
}



// --- Function to toggle password visibility and icons, defined once ---
function togglePasswordVisibility(input, openIcon, closedIcon) {
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';

    if (isPassword) {
        openIcon.classList.add('hidden');
        closedIcon.classList.remove('hidden');
    } else {
        openIcon.classList.remove('hidden');
        closedIcon.classList.add('hidden');
    }
}


const BACKEND_API_URL = 'http://localhost:4000';

// --- Logic for Sign_in.html form ---
// Get elements at a global scope to be accessible for all listeners
const signInForm = document.getElementById('signin-form');
const customModal = document.getElementById('customModal');
const signInPasswordInput = document.getElementById('passwords');
const signInToggleBtn = document.getElementById('togglePasswordBtn');


// Update the login section in your script.js
if (signInForm) {
    signInForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const email = document.getElementById('email')?.value;
        const passwords = signInPasswordInput?.value;
        
        if (!email || !passwords) {
            showModal("Validation Error", "Please enter both email and password.");
            return;
        }

        try {
            const response = await fetch(`${BACKEND_API_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, passwords }),
            });

            const result = await response.json();

            // Handle pending approval status
            if (result.status === 'pending_approval') {
                showModal(
                    'Account Pending Approval', 
                    'Your account is awaiting admin approval. You will be notified once your account has been approved.',
                    '/home.html' // Redirect to home page
                );
                return;
            }

            if (response.ok && result.success) {
                // Store user data and redirect as before
                const currentUser = {
                    user_id: result.user_id,
                    email: result.email,
                    role: result.role,
                    first_name: result.first_name,
                    middle_name: result.middle_name,
                    last_name: result.last_name,
                };
                sessionStorage.setItem('currentUser', JSON.stringify(currentUser));

                if (result.role === 'admin' || result.role === 'superadmin') {
                    showModal('Login Successful', `Welcome, ${result.first_name}! Redirecting to your admin dashboard.`, '/admin_dashboard.html'); 
                } else if (result.role === 'intern') {
                    showModal('Login Successful', `Welcome, ${result.first_name}! Redirecting to your dashboard.`, '/user_dashboard.html');
                } else {
                    showModal('Login Successful', "Login successful! Redirecting to user dashboard.", '/user_dashboard.html');
                }
            } else {
                showModal('Login Failed', result.message || "Login failed. Please check your credentials.");
            }
        } catch (error) {
            console.error('Error during login:', error);
            showModal('Network Error', 'Could not connect to the server. Please check your network connection.');
        }
    });


// Event listener for the sign-in password toggle button
if (signInToggleBtn && signInPasswordInput) {
        signInToggleBtn.addEventListener('click', () => {
            const openEye = signInToggleBtn.querySelector('#OpenEye');
            const closedEye = signInToggleBtn.querySelector('#ClosedEye');
            togglePasswordVisibility(signInPasswordInput, openEye, closedEye);
        });
    }
}


// --- Logic for Sign_up.html form ---
const signUpForm = document.getElementById('signup-form');


if (signUpForm) {
    // File upload listeners
    document.getElementById('user-image-input')?.addEventListener('change', function() {
        const fileNameDisplay = document.getElementById('user-image-file-name');
        if (this.files.length > 0) {
            fileNameDisplay.textContent = `Selected file: ${this.files[0].name}`;
        } else {
            fileNameDisplay.textContent = '';
        }
    });

    document.getElementById('acceptance-letter-input')?.addEventListener('change', function() {
        const fileNameDisplay = document.getElementById('acceptance-letter-file-name');
        if (this.files.length > 0) {
            fileNameDisplay.textContent = `Selected file: ${this.files[0].name}`;
        } else {
            fileNameDisplay.textContent = '';
        }
    });

    // Grab elements for signup form
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const togglePasswordBtn = document.getElementById('togglePassword');
    const toggleConfirmPasswordBtn = document.getElementById('toggleConfirmPassword');
    const passwordStrengthMsg = document.getElementById('passwordStrength');
    const confirmMessage = document.getElementById('confirmMessage');

    // Event listener for the password toggle button
    if (togglePasswordBtn && passwordInput) {
  togglePasswordBtn.addEventListener('click', () => {
    const eyeOpen = togglePasswordBtn.querySelector('#eyeOpen');
    const eyeClosed = togglePasswordBtn.querySelector('#eyeClosed');
    togglePasswordVisibility(passwordInput, eyeOpen, eyeClosed);
  });
}


    // Event listener for the confirm password toggle button
    if (toggleConfirmPasswordBtn && confirmPasswordInput) {
  toggleConfirmPasswordBtn.addEventListener('click', () => {
    const eyeOpenConfirm = toggleConfirmPasswordBtn.querySelector('#eyeOpenConfirm');
    const eyeClosedConfirm = toggleConfirmPasswordBtn.querySelector('#eyeClosedConfirm');
    togglePasswordVisibility(confirmPasswordInput, eyeOpenConfirm, eyeClosedConfirm);
  });
}

    // Password strength and confirm password live checks
    passwordInput.addEventListener('input', () => {
        const val = passwordInput.value;
        let strength = "";
        let color = "";

        if (val.length === 0) {
            strength = "";
        } else if (val.length < 6) {
            strength = "Weak password";
            color = "text-red-500";
        } else if (/[A-Z]/.test(val) && /[0-9]/.test(val) && /[^A-Za-z0-9]/.test(val)) {
            strength = "Strong password";
            color = "text-green-500";
        } else {
            strength = "Medium strength password";
            color = "text-yellow-500";
        }

        if (passwordStrengthMsg) {
            passwordStrengthMsg.textContent = strength;
            passwordStrengthMsg.className = `mt-1 text-xs ${color}`;
        }
    });

    confirmPasswordInput.addEventListener('input', () => {
        if (confirmPasswordInput.value !== passwordInput.value) {
            if (confirmMessage) {
                confirmMessage.textContent = "Passwords do not match";
                confirmMessage.classList.remove("text-green-500", "hidden");
                confirmMessage.classList.add("text-red-500");
            }
        } else {
            if (confirmMessage) {
                confirmMessage.textContent = "Passwords match";
                confirmMessage.classList.remove("text-red-500", "hidden");
                confirmMessage.classList.add("text-green-500");
            }
        }
        if (confirmPasswordInput.value === "" && confirmMessage) {
            confirmMessage.textContent = "";
            confirmMessage.classList.add("hidden");
        }
    });

    // Form submission for signup
        signUpForm.addEventListener('submit', async (event) => {
            event.preventDefault();
    
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;
            const termsAccepted = document.getElementById('terms')?.checked;
    
            if (password !== confirmPassword) {
                showModal("Validation Error", "Passwords do not match.");
                return;
            }
    
            if (document.getElementById('terms') && !termsAccepted) {
                showModal("Validation Error", "You must accept the Terms of Use & Privacy Policy.");
                return;
            }
    
            if (password.length < 6) {
                showModal("Validation Error", "Password should be at least 6 characters.");
                return;
            }
    
            // Show processing modal (you might want to add a spinner or disable the form)
            showModal("Processing", "Registering your account...");
    
            const formData = new FormData(event.target);
    
            try {
                const response = await fetch('/auth/register', {
                    method: 'POST',
                    body: formData
                });
    
                const result = await response.json();
    
                if (response.ok) {
                    showModal('Registration Successful', 
                        'Your account has been created and is pending admin approval. You will be notified via email once approved.',
                        '/pending_approval.html' // Fixed: Use string instead of function call
                    );
                } else {
                    showModal("Registration Failed", result.message || "Registration failed. Please try again.");
                }
            } catch (error) {
                console.error('Error during registration:', error);
                showModal("Network Error", "An unexpected error occurred. Please try again later.");
            }
        });
    }