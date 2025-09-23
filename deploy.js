#!/usr/bin/env node

/**
 * Deployment Script for DreamLogTogether Blog
 * This script handles the deployment and initialization of the super user account
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 DreamLogTogether Deployment Script');
console.log('=====================================\n');

// Configuration
const SUPER_USER = {
    username: 'Alfredoxrock',
    email: 'alfredoxrock@dreamlog.com',
    password: '1936413gjhfa78d6',
    displayName: 'Alfred (Super Admin)',
    role: 'super_admin'
};

async function runCommand(command, description) {
    return new Promise((resolve, reject) => {
        console.log(`📦 ${description}...`);
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`❌ Error: ${error.message}`);
                reject(error);
                return;
            }
            if (stderr) {
                console.log(`⚠️  Warning: ${stderr}`);
            }
            console.log(`✅ ${description} completed`);
            if (stdout) console.log(stdout);
            resolve(stdout);
        });
    });
}

async function checkFirebaseLogin() {
    try {
        await runCommand('firebase projects:list', 'Checking Firebase authentication');
        return true;
    } catch (error) {
        console.log('🔑 Please login to Firebase first:');
        console.log('   firebase login');
        return false;
    }
}

async function deployFirestoreRules() {
    try {
        await runCommand('firebase deploy --only firestore:rules', 'Deploying Firestore security rules');
        return true;
    } catch (error) {
        console.error('❌ Failed to deploy Firestore rules:', error.message);
        return false;
    }
}

async function deployToFirebase() {
    try {
        await runCommand('firebase deploy --only hosting', 'Deploying to Firebase Hosting');
        return true;
    } catch (error) {
        console.error('❌ Failed to deploy to Firebase Hosting:', error.message);
        return false;
    }
}

function createInitializationPage() {
    const initPageContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Initialize Super User - DreamLogTogether</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            max-width: 600px; 
            margin: 50px auto; 
            padding: 20px;
            background: #0a0b1e;
            color: #fff;
        }
        .container {
            background: rgba(45, 25, 85, 0.95);
            padding: 30px;
            border-radius: 15px;
            border: 1px solid rgba(255, 215, 0, 0.3);
        }
        h1 { color: #FFD700; }
        .btn {
            background: linear-gradient(135deg, #FFD700, #B8860B);
            color: #1a0933;
            padding: 15px 30px;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            margin: 10px 0;
        }
        .status {
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
            display: none;
        }
        .success { background: rgba(34, 197, 94, 0.2); border: 1px solid rgba(34, 197, 94, 0.4); color: #86EFAC; }
        .error { background: rgba(220, 38, 38, 0.2); border: 1px solid rgba(220, 38, 38, 0.4); color: #FCA5A5; }
        .info { background: rgba(59, 130, 246, 0.2); border: 1px solid rgba(59, 130, 246, 0.4); color: #93C5FD; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔐 Super User Initialization</h1>
        <p>Click the button below to initialize the super admin account for DreamLogTogether.</p>
        
        <div class="info status" id="infoStatus">
            <strong>Super User Credentials:</strong><br>
            Username: ${SUPER_USER.username}<br>
            Email: ${SUPER_USER.email}<br>
            Role: Super Administrator
        </div>

        <button id="initBtn" class="btn">Initialize Super User</button>
        
        <div id="successStatus" class="success status">
            ✅ Super user initialized successfully!<br>
            You can now <a href="login.html" style="color: #86EFAC;">sign in</a> with the super admin credentials.
        </div>
        
        <div id="errorStatus" class="error status"></div>
        
        <div id="loadingStatus" class="info status">
            🔄 Initializing super user account...
        </div>
    </div>

    <script type="module" src="scripts/init-superuser.js"></script>
    <script type="module">
        document.getElementById('initBtn').addEventListener('click', async () => {
            const btn = document.getElementById('initBtn');
            const loading = document.getElementById('loadingStatus');
            const success = document.getElementById('successStatus');
            const error = document.getElementById('errorStatus');
            
            // Hide all status messages
            [success, error].forEach(el => el.style.display = 'none');
            
            // Show loading
            loading.style.display = 'block';
            btn.disabled = true;
            btn.textContent = 'Initializing...';
            
            try {
                const result = await window.initializeSuperUser();
                
                loading.style.display = 'none';
                
                if (result.success) {
                    success.style.display = 'block';
                    btn.textContent = 'Completed';
                } else {
                    error.textContent = '❌ ' + result.error;
                    error.style.display = 'block';
                    btn.disabled = false;
                    btn.textContent = 'Try Again';
                }
            } catch (err) {
                loading.style.display = 'none';
                error.textContent = '❌ Initialization failed: ' + err.message;
                error.style.display = 'block';
                btn.disabled = false;
                btn.textContent = 'Try Again';
            }
        });
        
        // Show info on load
        document.getElementById('infoStatus').style.display = 'block';
    </script>
</body>
</html>`;

    const initPagePath = path.join(__dirname, 'public', 'init-super-user.html');
    fs.writeFileSync(initPagePath, initPageContent);
    console.log('📄 Created super user initialization page');
}

async function main() {
    try {
        // Check if Firebase CLI is logged in
        const isLoggedIn = await checkFirebaseLogin();
        if (!isLoggedIn) {
            process.exit(1);
        }

        // Create initialization page
        createInitializationPage();

        // Deploy Firestore rules first
        console.log('\n🔒 Deploying security rules...');
        const rulesDeployed = await deployFirestoreRules();
        if (!rulesDeployed) {
            console.error('❌ Failed to deploy security rules. Aborting deployment.');
            process.exit(1);
        }

        // Deploy to Firebase Hosting
        console.log('\n🌐 Deploying to Firebase Hosting...');
        const hostingDeployed = await deployToFirebase();
        if (!hostingDeployed) {
            console.error('❌ Failed to deploy to hosting. Please check your configuration.');
            process.exit(1);
        }

        // Success message
        console.log('\n🎉 Deployment completed successfully!');
        console.log('\n📋 Next Steps:');
        console.log('1. Visit your deployed site');
        console.log('2. Navigate to /init-super-user.html');
        console.log('3. Click "Initialize Super User" to create the admin account');
        console.log('4. Sign in with the super admin credentials:');
        console.log(`   Username: ${SUPER_USER.username}`);
        console.log(`   Password: [PROTECTED]`);
        console.log('\n🔧 Configure Firebase Authentication:');
        console.log('- Go to Firebase Console → Authentication → Sign-in method');
        console.log('- Enable Email/Password provider');
        console.log('- Optionally enable Google provider');
        console.log('\n✨ Your blog is ready to use!');

    } catch (error) {
        console.error('\n❌ Deployment failed:', error.message);
        process.exit(1);
    }
}

// Run the deployment script
if (require.main === module) {
    main();
}

module.exports = { runCommand, checkFirebaseLogin, deployFirestoreRules, deployToFirebase };