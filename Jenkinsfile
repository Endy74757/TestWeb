// Jenkinsfile for the 'dynamic-git-pipeline' job

pipeline {
    // กำหนดให้ Pipeline ทำงานบน Agent ใดก็ได้ที่มี Docker ติดตั้งอยู่
    agent any

    // กำหนดพารามิเตอร์ที่ Pipeline จะรับค่าเข้ามา
    parameters {
        string(name: 'GIT_REPO_URL', defaultValue: '', description: 'Git repository URL to build')
    }

    // กำหนด Environment Variables ที่จะใช้ภายใน Pipeline
    environment {
        // ดึงชื่อ Repository จาก URL เพื่อใช้เป็นชื่อ Docker Image
        // ตัวอย่าง: https://github.com/user/my-app.git -> my-app
        IMAGE_NAME = "${params.GIT_REPO_URL.split('/').last().split('\\.git').first()}"
        
        // สร้าง Version ของ Image โดยใช้ Build Number เพื่อให้ไม่ซ้ำกัน
        IMAGE_VERSION = "v1.0.${BUILD_NUMBER}"
    }

    stages {
        stage('1. Checkout Target Repository') {
            steps {
                script {
                    if (params.GIT_REPO_URL.trim().isEmpty()) {
                        error "Git repository URL was not provided."
                    }
                    echo "Checking out code from: ${params.GIT_REPO_URL}"

                    // Clean workspace before checkout for a fresh start
                    cleanWs()

                    // Checkout the repository that contains the actual build logic
                    checkout([
                        $class: 'GitSCM',
                        branches: [[name: '*/main']], // Use '*/master' if that is your default branch
                        userRemoteConfigs: [[url: params.GIT_REPO_URL]]
                    ])
                }
            }
        }


        stage('2. Build and Push Docker Image') {
            steps {
                script {
                    echo "Building Docker image: ${env.IMAGE_NAME}:${env.IMAGE_VERSION}"
                    
                    // ใช้ Credentials ของ Docker Hub ที่เก็บไว้ใน Jenkins
                    // **ตรวจสอบให้แน่ใจว่าคุณได้สร้าง Credential ประเภท 'Username with password'
                    // และตั้ง ID เป็น 'dockerhub-credentials' ใน Jenkins แล้ว**
                    withCredentials([usernamePassword(credentialsId: 'dockerhub-credentials', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                        
                        // ล็อกอินเข้า Docker Hub
                        // หมายเหตุ: เราได้ลบ 'sudo' ออกไปแล้ว
                        // ผู้ใช้ 'jenkins' บนเครื่อง Agent ควรจะอยู่ในกลุ่ม 'docker'
                        // สามารถทำได้โดยรันคำสั่ง: sudo usermod -aG docker jenkins
                        sh "echo ${DOCKER_PASS} | docker login -u ${DOCKER_USER} --password-stdin"

                        // สร้าง Docker Image โดยอ้างอิงจาก Dockerfile ใน root ของ repo ที่ clone มา
                        // Image จะถูกตั้งชื่อเป็น 'your-dockerhub-username/repo-name:version'
                        sh "docker build -t ${DOCKER_USER}/${env.IMAGE_NAME}:${env.IMAGE_VERSION} ."

                        // Push Image ขึ้นไปยัง Docker Hub
                        sh "docker push ${DOCKER_USER}/${env.IMAGE_NAME}:${env.IMAGE_VERSION}"

                        // ล็อกเอาท์ออกจาก Docker Hub เพื่อความปลอดภัย
                        sh "docker logout"
                    }
                }
            }
        }

        // คุณสามารถเพิ่ม Stage สำหรับ Deploy ต่อได้ในอนาคต
        // stage('3. Deploy to Kubernetes') {
        //     steps {
        //         echo "Deploying image ${DOCKER_USER}/${env.IMAGE_NAME}:${env.IMAGE_VERSION}..."
        //         // ... ใส่คำสั่ง deploy ของคุณที่นี่ ...
        //     }
        // }
    }

    // ส่วนที่จะทำงานเสมอ ไม่ว่า Pipeline จะสำเร็จหรือล้มเหลว
    post {
        always {
            echo 'Pipeline finished.'
            // ล้าง Workspace เพื่อไม่ให้เปลืองพื้นที่
            cleanWs()
        }
    }
}
