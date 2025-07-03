// This Jenkinsfile is loaded by a parent "wrapper" pipeline.
// It contains the specific build, test, and deploy logic for this project.

pipeline {
    // Run on any available agent
    agent any

    // Environment variables for this pipeline
    environment {
        // The GIT_REPO_URL is passed from the Jenkins Job parameter.
        // We derive the image name from it.
        IMAGE_NAME = "${params.GIT_REPO_URL.split('/').last().split('\\.git').first()}"
        
        // Create a unique version tag using the build number
        IMAGE_VERSION = "v1.0.${BUILD_NUMBER}"
    }

    stages {
        stage('Build and Push Docker Image') {
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

    post {
        always {
            echo 'Pipeline finished.'
        }
    }
}
