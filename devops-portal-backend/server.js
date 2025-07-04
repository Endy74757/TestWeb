// server.js
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path'); // เพิ่ม path module
const { v4: uuidv4 } = require('uuid'); // <-- เพิ่มเข้ามาเพื่อสร้าง Unique ID

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // อนุญาต Cross-Origin Requests
app.use(express.json()); // สำหรับ parse JSON body
app.use(express.urlencoded({ extended: true })); // สำหรับ parse form data

// --- เพิ่มส่วนนี้ ---
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from the 'public' directory

// --- IMPROVEMENT: Validate required environment variables on startup ---
const { JENKINS_URL, JENKINS_USER, JENKINS_TOKEN } = process.env;
const requiredEnvVars = { JENKINS_URL, JENKINS_USER, JENKINS_TOKEN };

for (const [key, value] of Object.entries(requiredEnvVars)) {
    if (!value) {
        console.error(`FATAL ERROR: Environment variable ${key} is not defined.`);
        // Exit the process with a "fatal exception" code
        process.exit(1);
    }
}
// --- End of improvement ---

const JENKINS_BUILD_JOB_NAME = 'dynamic-git-pipeline'; // ชื่อ Job สำหรับ Build
const JENKINS_DEPLOY_JOB_NAME = 'deploy-app-pipeline';   // ชื่อ Job ใหม่สำหรับ Deploy

// สร้าง Authorization Header สำหรับ Jenkins API
const jenkinsAuth = Buffer.from(`${JENKINS_USER}:${JENKINS_TOKEN}`).toString('base64');

// API Endpoint สำหรับรับ Git Repo URL และสั่ง Jenkins ทำงาน
app.post('/api/trigger-pipeline', async (req, res) => {
    const { gitUrl, branchName } = req.body;
    const buildId = uuidv4(); // สร้าง ID ที่ไม่ซ้ำกันสำหรับ Build นี้

    if (!gitUrl) {
        return res.status(400).json({ success: false, message: 'Git repository URL is required.' });
    }

    // หากไม่ได้ระบุ branch มา จะใช้ 'main' เป็นค่าเริ่มต้น
    const gitBranch = branchName || 'main';

    // URL สำหรับ trigger Jenkins job with parameters
    const triggerUrl = `${JENKINS_URL}/job/${JENKINS_BUILD_JOB_NAME}/buildWithParameters`;

    console.log(`Triggering pipeline for: ${gitUrl} on branch: ${gitBranch} with Build ID: ${buildId}`);

    try {
        const response = await axios.post(triggerUrl, null, {
            params: {
                GIT_REPO_URL: gitUrl, // ส่ง URL ไปเป็นพารามิเตอร์
                GIT_BRANCH: gitBranch, // ส่ง branch ไปเป็นพารามิเตอร์
                BUILD_ID: buildId // ส่ง ID ที่สร้างขึ้นไปด้วย
            },
            headers: {
                'Authorization': `Basic ${jenkinsAuth}`
            }
        });

        // Jenkins API จะตอบกลับด้วย status 201 Created เมื่อเข้าคิวสำเร็จ
        if (response.status === 201) {
            console.log(`Successfully queued Jenkins job. Build ID: ${buildId}`);
            // ตอบกลับด้วย 202 Accepted และส่ง buildId กลับไปให้ Frontend ใช้ติดตาม
            res.status(202).json({
                success: true, 
                message: 'Pipeline trigger accepted. Use the buildId to track status.',
                buildId: buildId
            });
        } else {
            throw new Error(`Jenkins responded with status: ${response.status}`);
        }

    } catch (error) {
        console.error('Error triggering Jenkins job:', error.response ? error.response.data : error.message);
        res.status(500).json({ success: false, message: 'Failed to trigger Jenkins pipeline.', error: error.message });
    }
});

// API ใหม่สำหรับดึงสถานะของ Build
app.get('/api/build-status', async (req, res) => {
    const { buildId } = req.query; // รับ buildId จาก query string
    if (!buildId) return res.status(400).json({ error: 'buildId is required' });

    try {
        // 1. ค้นหา Build Number จาก Build ID ที่เราส่งไปตอนแรก
        // เราจะค้นหาจาก 50 builds ล่าสุดเพื่อประสิทธิภาพ
        const findBuildUrl = `${JENKINS_URL}/job/${JENKINS_BUILD_JOB_NAME}/api/json?tree=builds[number,actions[parameters[name,value]]]{0,50}`;
        const buildsResponse = await axios.get(findBuildUrl, {
            headers: { 'Authorization': `Basic ${jenkinsAuth}` }
        });

        let buildNumber = null;
        const builds = buildsResponse.data.builds || [];

        for (const build of builds) {
            const paramsAction = build.actions.find(a => a._class === 'hudson.model.ParametersAction');
            if (paramsAction && paramsAction.parameters) {
                const idParam = paramsAction.parameters.find(p => p.name === 'BUILD_ID' && p.value === buildId);
                if (idParam) {
                    buildNumber = build.number;
                    break; // เจอ Build ที่ต้องการแล้ว
                }
            }
        }

        // 2. ถ้ายังไม่เจอ Build Number แสดงว่า Job ยังอยู่ในคิว หรือยังไม่ได้เริ่ม
        if (!buildNumber) {
            return res.json({ status: 'QUEUED', message: 'Build is waiting in the queue to start.', stages: [] });
        }

        // 3. เมื่อได้ Build Number แล้ว, ดึงข้อมูลสถานะและ Stages จาก Workflow API เหมือนเดิม
        const buildUrl = `${JENKINS_URL}/job/${JENKINS_BUILD_JOB_NAME}/${buildNumber}`;
        const wfApiResponse = await axios.get(`${buildUrl}/wfapi/describe`, {
            headers: { 'Authorization': `Basic ${jenkinsAuth}` }
        });

        const buildData = wfApiResponse.data;

        // 4. ส่งข้อมูลที่สรุปแล้วกลับไปให้ Frontend
        res.json({
            status: buildData.status,
            buildUrl: buildUrl, // URL ของ build นี้ใน Jenkins
            logUrl: `${buildUrl}/console`, // URL สำหรับดู Console Log
            stages: buildData.stages.map(stage => ({
                name: stage.name,
                status: stage.status,
                duration: stage.durationMillis,
                error: stage.error // ส่งข้อมูล error กลับไป ถ้ามี
            }))
        });
    } catch (error) {
        console.error(`Error fetching build status for buildId ${buildId}:`, error.response ? error.response.data : error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch build status.', error: error.message });
    }
});

// --- NEW: Dashboard and Deployment Features ---

// API สำหรับดึงข้อมูล Dashboard และประวัติการ Build (หมวด 1)
app.get('/api/dashboard', async (req, res) => {
    // ดึงข้อมูล 15 builds ล่าสุดเพื่อแสดงใน Dashboard
    const historyUrl = `${JENKINS_URL}/job/${JENKINS_BUILD_JOB_NAME}/api/json?tree=builds[number,result,duration,timestamp,url,actions[parameters[name,value]]]{0,15}`;

    try {
        const response = await axios.get(historyUrl, {
            headers: { 'Authorization': `Basic ${jenkinsAuth}` }
        });

        // จัดรูปแบบข้อมูลให้ใช้งานง่ายขึ้นในฝั่ง Frontend
        const builds = response.data.builds.map(build => {
            const paramsAction = build.actions.find(a => a._class === 'hudson.model.ParametersAction');
            let gitUrl = 'N/A';
            let gitBranch = 'N/A';
            if (paramsAction && paramsAction.parameters) {
                gitUrl = paramsAction.parameters.find(p => p.name === 'GIT_REPO_URL')?.value || 'N/A';
                gitBranch = paramsAction.parameters.find(p => p.name === 'GIT_BRANCH')?.value || 'N/A';
            }
            return {
                number: build.number,
                status: build.result, // SUCCESS, FAILURE, ABORTED
                duration: build.duration,
                timestamp: build.timestamp,
                url: build.url, // Link to Jenkins build page
                gitUrl,
                gitBranch
            };
        });

        res.json({ success: true, builds });

    } catch (error) {
        console.error('Error fetching dashboard data:', error.response ? error.response.data : error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch dashboard data.', error: error.message });
    }
});

// API สำหรับสั่ง Deploy (One-Click Deployment) (หมวด 2)
app.post('/api/deploy', async (req, res) => {
    const { buildNumber, environment } = req.body;

    if (!buildNumber || !environment) {
        return res.status(400).json({ success: false, message: 'buildNumber and environment are required.' });
    }

    const triggerUrl = `${JENKINS_URL}/job/${JENKINS_DEPLOY_JOB_NAME}/buildWithParameters`;
    const deployId = uuidv4();

    console.log(`Triggering deployment for build #${buildNumber} to [${environment}] with Deploy ID: ${deployId}`);

    try {
        await axios.post(triggerUrl, null, {
            params: {
                SOURCE_BUILD_NUMBER: buildNumber, // Build number จาก Job แรกที่ต้องการ Deploy
                TARGET_ENVIRONMENT: environment,  // Environment ที่จะ Deploy ไป (e.g., UAT, PROD)
                BUILD_ID: deployId                // ID สำหรับติดตามการ Deploy นี้โดยเฉพาะ
            },
            headers: { 'Authorization': `Basic ${jenkinsAuth}` }
        });

        console.log(`Successfully queued deployment job. Deploy ID: ${deployId}`);
        res.status(202).json({
            success: true,
            message: `Deployment of build #${buildNumber} to ${environment} triggered successfully.`,
            buildId: deployId // ส่ง buildId กลับไปให้ Frontend ใช้ติดตามสถานะการ Deploy
        });

    } catch (error) {
        const errorMessage = error.response ? (error.response.data || error.message) : error.message;
        console.error('Error triggering deployment job:', errorMessage);
        if (error.response && error.response.status === 404) {
             return res.status(404).json({ success: false, message: `Deployment job '${JENKINS_DEPLOY_JOB_NAME}' not found in Jenkins. Please create it and configure parameters.` });
        }
        res.status(500).json({ success: false, message: 'Failed to trigger deployment pipeline.', error: errorMessage });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
