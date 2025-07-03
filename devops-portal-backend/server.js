// server.js
require('dotenv').config();
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

// ดึงค่าจาก environment variables
const { JENKINS_URL, JENKINS_USER, JENKINS_TOKEN } = process.env;
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
            console.log('Successfully triggered Jenkins job.');
            res.status(200).json({ success: true, message: 'Pipeline triggered successfully! Check your Jenkins dashboard.' });
        } else {
            throw new Error(`Jenkins responded with status: ${response.status}`);
        }

    } catch (error) {
        console.error('Error triggering Jenkins job:', error.response ? error.response.data : error.message);
        res.status(500).json({ success: false, message: 'Failed to trigger Jenkins pipeline.', error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
