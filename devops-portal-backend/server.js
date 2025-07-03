// server.js
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path'); // เพิ่ม path module

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

const JENKINS_JOB_NAME = 'dynamic-git-pipeline'; // ชื่อ Job ที่สร้างใน Jenkins

// สร้าง Authorization Header สำหรับ Jenkins API
const jenkinsAuth = Buffer.from(`${JENKINS_USER}:${JENKINS_TOKEN}`).toString('base64');

// API Endpoint สำหรับรับ Git Repo URL และสั่ง Jenkins ทำงาน
app.post('/api/trigger-pipeline', async (req, res) => {
    const { gitUrl } = req.body;

    if (!gitUrl) {
        return res.status(400).json({ success: false, message: 'Git repository URL is required.' });
    }

    // URL สำหรับ trigger Jenkins job with parameters
    const triggerUrl = `${JENKINS_URL}/job/${JENKINS_JOB_NAME}/buildWithParameters`;

    console.log(`Received request to trigger pipeline for: ${gitUrl}`);
    console.log(`Sending request to Jenkins at: ${triggerUrl}`);

    try {
        const response = await axios.post(triggerUrl, null, {
            params: {
                GIT_REPO_URL: gitUrl // ส่ง URL ไปเป็นพารามิเตอร์
            },
            headers: {
                'Authorization': `Basic ${jenkinsAuth}`
            }
        });

        // Jenkins API จะตอบกลับด้วย status 201 Created เมื่อรับคำสั่งสำเร็จ
        if (response.status === 201) {
            const queueUrl = response.headers.location;
            console.log(`Successfully triggered Jenkins job. Queue URL: ${queueUrl}`);
            res.status(200).json({ 
                success: true, 
                message: 'Pipeline triggered successfully! Fetching status...',
                queueUrl: queueUrl // ส่ง URL สำหรับติดตามสถานะกลับไปให้ Frontend
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
    const { queueUrl } = req.query;
    if (!queueUrl) return res.status(400).json({ error: 'queueUrl is required' });

    try {
        // 1. ตรวจสอบคิวเพื่อหา Build Number
        const queueResponse = await axios.get(`${queueUrl}api/json`, {
            headers: { 'Authorization': `Basic ${jenkinsAuth}` }
        });

        const queueItem = queueResponse.data;

        if (queueItem.cancelled) return res.json({ status: 'CANCELLED', stages: [] });
        if (!queueItem.executable) return res.json({ status: 'QUEUED', stages: [] });

        const buildNumber = queueItem.executable.number;
        const buildUrl = `${JENKINS_URL}/job/${JENKINS_JOB_NAME}/${buildNumber}`;

        // 2. ดึงข้อมูลสถานะและ Stages จาก Workflow API
        const wfApiResponse = await axios.get(`${buildUrl}/wfapi/describe`, {
            headers: { 'Authorization': `Basic ${jenkinsAuth}` }
        });

        const buildData = wfApiResponse.data;

        // ส่งข้อมูลที่สรุปแล้วกลับไปให้ Frontend
        res.json({
            status: buildData.status,
            stages: buildData.stages.map(stage => ({
                name: stage.name, status: stage.status, duration: stage.durationMillis
            }))
        });
    } catch (error) {
        console.error('Error triggering Jenkins job:', error.response ? error.response.data : error.message);
        res.status(500).json({ success: false, message: 'Failed to trigger Jenkins pipeline.', error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
