// Super Admin Access Control
// This script provides centralized access control for super admin pages

class SuperAdminGuard {
    constructor() {
        this.checkInterval = null;
        this.isChecking = false;
    }

    // Initialize the guard with options
    init(options = {}) {
        this.options = {
            redirectUrl: options.redirectUrl || 'user-dashboard.html',
            loginUrl: options.loginUrl || 'login.html',
            showError: options.showError !== false, // default true
            errorMessage: options.errorMessage || 'Access denied. Super Administrator privileges required.',
            checkInterval: options.checkInterval || 5000, // 5 seconds
            ...options
        };

        // Start access control
        this.startGuard();
    }

    // Start the access control guard
    startGuard() {
        console.log('🛡️ Starting Super Admin Guard...');

        // Initial check
        this.checkAccess();

        // Set up auth state listener
        if (window.authService) {
            window.authService.onAuthStateChange = (user, role) => {
                this.handleAuthStateChange(user, role);
            };
        }

        // Set up periodic checks
        this.checkInterval = setInterval(() => {
            this.periodicCheck();
        }, this.options.checkInterval);

        // Set up page visibility check (when user returns to tab)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.checkAccess();
            }
        });
    }

    // Handle authentication state changes
    handleAuthStateChange(user, role) {
        console.log('🔄 Auth state changed:', { user: user?.email, role });

        if (!user) {
            this.denyAccess('Not authenticated', this.options.loginUrl);
            return;
        }

        this.checkAccess();
    }

    // Check access permissions
    async checkAccess() {
        if (this.isChecking) return;
        this.isChecking = true;

        try {
            console.log('🔍 Checking super admin access...');

            // Check if auth service is loaded
            if (!window.authService) {
                console.log('⏳ Auth service not loaded yet, waiting...');
                setTimeout(() => {
                    this.isChecking = false;
                    this.checkAccess();
                }, 1000);
                return;
            }

            // Check if user is authenticated
            const currentUser = window.authService.currentUser;
            if (!currentUser) {
                this.denyAccess('No authenticated user', this.options.loginUrl);
                return;
            }

            // Check if user is super admin
            const isSuperAdmin = window.authService.isSuperAdmin();
            if (!isSuperAdmin) {
                console.log('❌ User is not super admin:', {
                    email: currentUser.email,
                    role: window.authService.userRole
                });
                this.denyAccess('Insufficient privileges', this.options.redirectUrl);
                return;
            }

            // Additional checks - verify in database
            const userDoc = await window.db.collection('users').doc(currentUser.uid).get();
            if (!userDoc.exists) {
                this.denyAccess('User profile not found', this.options.redirectUrl);
                return;
            }

            const userData = userDoc.data();
            if (userData.role !== 'super_admin') {
                this.denyAccess('Database role mismatch', this.options.redirectUrl);
                return;
            }

            if (userData.isActive === false) {
                this.denyAccess('Account deactivated', this.options.redirectUrl);
                return;
            }

            console.log('✅ Super admin access granted');
            this.onAccessGranted(currentUser, userData);

        } catch (error) {
            console.error('❌ Error checking access:', error);
            this.denyAccess('Access check failed', this.options.redirectUrl);
        } finally {
            this.isChecking = false;
        }
    }

    // Periodic security check
    periodicCheck() {
        // Only do lightweight checks periodically
        if (!window.authService?.currentUser) {
            this.denyAccess('Session expired', this.options.loginUrl);
            return;
        }

        if (!window.authService?.isSuperAdmin()) {
            this.denyAccess('Privileges revoked', this.options.redirectUrl);
            return;
        }
    }

    // Deny access with reason
    denyAccess(reason, redirectUrl) {
        console.log('🚫 Access denied:', reason);

        if (this.options.showError) {
            this.showAccessDeniedMessage(reason);
        }

        // Clear any existing content
        this.hidePageContent();

        // Redirect after a delay
        setTimeout(() => {
            window.location.href = redirectUrl;
        }, 2000);
    }

    // Show access denied message
    showAccessDeniedMessage(reason) {
        // Try to find existing error container
        let errorContainer = document.getElementById('accessDeniedMessage');

        if (!errorContainer) {
            // Create error container
            errorContainer = document.createElement('div');
            errorContainer.id = 'accessDeniedMessage';
            errorContainer.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: linear-gradient(145deg, #dc2626, #b91c1c);
                color: white;
                padding: 30px 40px;
                border-radius: 12px;
                text-align: center;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            `;
            document.body.appendChild(errorContainer);
        }

        errorContainer.innerHTML = `
            <h2 style="margin: 0 0 15px 0; font-size: 1.5rem;">🚫 Access Denied</h2>
            <p style="margin: 0 0 15px 0; font-size: 1.1rem;">${this.options.errorMessage}</p>
            <p style="margin: 0 0 20px 0; font-size: 0.9rem; opacity: 0.8;">Reason: ${reason}</p>
            <p style="margin: 0; font-size: 0.9rem;">Redirecting in 2 seconds...</p>
        `;
    }

    // Hide page content
    hidePageContent() {
        // Hide main content areas
        const selectors = [
            '.management-container',
            '.container',
            'main',
            '.content',
            '.admin-panel'
        ];

        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                el.style.opacity = '0.3';
                el.style.pointerEvents = 'none';
            });
        });
    }

    // Called when access is granted
    onAccessGranted(user, userData) {
        // Override this method in specific pages if needed
        console.log('✅ Super admin access confirmed for:', user.email);

        // Ensure page content is visible
        this.showPageContent();

        // Trigger custom event
        window.dispatchEvent(new CustomEvent('superAdminAccessGranted', {
            detail: { user, userData }
        }));
    }

    // Show page content
    showPageContent() {
        const selectors = [
            '.management-container',
            '.container',
            'main',
            '.content',
            '.admin-panel'
        ];

        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                el.style.opacity = '1';
                el.style.pointerEvents = 'auto';
            });
        });
    }

    // Stop the guard
    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        console.log('🛡️ Super Admin Guard stopped');
    }
}

// Create global instance
window.superAdminGuard = new SuperAdminGuard();

console.log('🔒 Super Admin Guard script loaded');