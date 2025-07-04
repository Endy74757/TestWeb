document.addEventListener('DOMContentLoaded', () => {
    const triggerForm = document.getElementById('trigger-form');
    const triggerBtn = document.getElementById('trigger-btn');
    const statusSection = document.getElementById('status-section');
    const statusMessage = document.getElementById('status-message');
    const statusDetails = document.getElementById('status-details');
    const statusLinks = document.getElementById('status-links');
    const historyBody = document.getElementById('history-body');

    const API_BASE_URL = 'http://localhost:3000/api';
    let statusInterval;

    // --- Event Listeners ---

    triggerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        triggerBtn.disabled = true;
        triggerBtn.textContent = 'Triggering...';

        const gitUrl = document.getElementById('git-url').value;
        const branchName = document.getElementById('branch-name').value;

        try {
            const response = await fetch(`${API_BASE_URL}/trigger-pipeline`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gitUrl, branchName }),
            });

            const data = await response.json();

            if (data.success) {
                statusSection.style.display = 'block';
                statusMessage.textContent = 'Pipeline accepted! Tracking status...';
                statusMessage.className = 'status-QUEUED';
                statusDetails.innerHTML = '';
                statusLinks.innerHTML = '';
                trackBuildStatus(data.buildId);
            } else {
                throw new Error(data.message || 'Failed to trigger pipeline.');
            }
        } catch (error) {
            statusMessage.textContent = `Error: ${error.message}`;
            statusMessage.className = 'status-FAILURE';
            triggerBtn.disabled = false;
            triggerBtn.textContent = 'Build Now';
        }
    });

    // --- NEW: Event Delegation for Deploy Button ---
    historyBody.addEventListener('click', (e) => {
        // ตรวจสอบว่าปุ่มที่คลิกคือปุ่ม Deploy หรือไม่
        if (e.target && e.target.classList.contains('deploy-btn')) {
            // ดึง build number จาก data attribute
            const buildNumber = e.target.dataset.buildNumber;
            if (buildNumber) {
                // เรียกใช้ฟังก์ชัน deployBuild โดยตรง
                deployBuild(buildNumber);
            }
        }
    });


    // --- Core Functions ---

    const trackBuildStatus = (buildId) => {
        if (statusInterval) clearInterval(statusInterval);

        statusInterval = setInterval(async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/build-status?buildId=${buildId}`);
                const data = await res.json();

                if (res.ok) {
                    updateStatusUI(data);
                    if (data.status !== 'IN_PROGRESS' && data.status !== 'QUEUED') {
                        clearInterval(statusInterval);
                        triggerBtn.disabled = false;
                        triggerBtn.textContent = 'Build Now';
                        fetchDashboard(); // Refresh dashboard after build finishes
                    }
                } else {
                    throw new Error(data.message || 'Could not fetch status.');
                }
            } catch (error) {
                statusMessage.textContent = `Error tracking status: ${error.message}`;
                statusMessage.className = 'status-FAILURE';
                clearInterval(statusInterval);
                triggerBtn.disabled = false;
                triggerBtn.textContent = 'Build Now';
            }
        }, 3000); // Poll every 3 seconds
    };

    const fetchDashboard = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/dashboard`);
            const data = await res.json();
            if (data.success) {
                renderHistory(data.builds);
            }
        } catch (error) {
            console.error('Failed to fetch dashboard:', error);
        }
    };

    const deployBuild = async (buildNumber) => {
        const environment = prompt('Enter environment to deploy (e.g., uat, production):');
        if (!environment) return;

        alert(`Triggering deployment of build #${buildNumber} to ${environment}...`);

        try {
            const response = await fetch(`${API_BASE_URL}/deploy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ buildNumber, environment }),
            });
            const data = await response.json();
            if (response.ok) {
                alert(data.message);
                // Optionally, you can start tracking the deployment status here
                // trackBuildStatus(data.buildId);
            } else {
                throw new Error(data.message || 'Deployment failed.');
            }
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    // --- UI Rendering Functions ---

    const updateStatusUI = (data) => {
        statusMessage.textContent = `Status: ${data.status}`;
        statusMessage.className = `status-${data.status}`;

        if (data.stages && data.stages.length > 0) {
            statusDetails.innerHTML = data.stages.map(stage => `
                <div class="stage stage-${stage.status}">
                    <div class="stage-status"></div>
                    <div class="stage-name">${stage.name}</div>
                    <div class="stage-duration">${(stage.duration / 1000).toFixed(2)}s</div>
                </div>
            `).join('');
        }

        if (data.buildUrl) {
            statusLinks.innerHTML = `
                <a href="${data.buildUrl}" target="_blank">View in Jenkins</a>
                <a href="${data.logUrl}" target="_blank">View Console Log</a>
            `;
        }
    };

    const renderHistory = (builds) => {
        if (!builds || builds.length === 0) {
            historyBody.innerHTML = '<tr><td colspan="6">No build history found.</td></tr>';
            return;
        }

        historyBody.innerHTML = builds.map(build => `
            <tr>
                <td>#${build.number}</td>
                <td><span class="status-${build.status}">${build.status || 'IN_PROGRESS'}</span></td>
                <td>${build.gitBranch}</td>
                <td>${formatDuration(build.duration)}</td>
                <td>${new Date(build.timestamp).toLocaleString()}</td>
                <td>
                    ${build.status === 'SUCCESS' ? 
                        `<button class="deploy-btn" data-build-number="${build.number}">Deploy</button>` : 
                        `<a href="${build.url}" target="_blank">Details</a>`
                    }
                </td>
            </tr>
        `).join('');
    };

    // --- Utility Functions ---

    const formatDuration = (ms) => {
        if (ms === 0) return '...';
        const seconds = ms / 1000;
        if (seconds < 60) return `${seconds.toFixed(1)}s`;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.round(seconds % 60);
        return `${minutes}m ${remainingSeconds}s`;
    };

    // --- Initial Load ---
    fetchDashboard();
});