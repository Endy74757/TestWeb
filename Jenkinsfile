def imageName = "${params.GIT_REPO_URL.split('/').last().split('\\.git').first()}".toLowerCase()
def imageVersion = "v1.0.${BUILD_NUMBER}"

stage('Build and Push Docker Image') {
    script {
        withCredentials([usernamePassword(credentialsId: 'dockerhub-credentials', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {

            echo "Building Docker image: ${DOCKER_USER}/${imageName}:${imageVersion}"
            
            sh "echo ${DOCKER_PASS} | sudo docker login -u ${DOCKER_USER} --password-stdin"

            sh """
                sudo docker build \
                    --build-arg http_proxy=http://192.168.1.6:3128 \
                    --build-arg https_proxy=http://192.168.1.6:3128 \
                    -t ${DOCKER_USER}/${imageName}:${imageVersion} \
                    -f Dockerfile .
            """

            sh "sudo docker push ${DOCKER_USER}/${imageName}:${imageVersion}"
            sh "sudo docker logout"
        }
    }
}

stage('Deploy To Kubernetes') {
    // กำหนด Environment Variables สำหรับ Stage นี้โดยเฉพาะ
    // เพื่อให้ shell script (envsubst) สามารถมองเห็นค่าจาก Groovy ได้
    environment {
        IMAGE_NAME    = imageName
        IMAGE_VERSION = imageVersion
    }
    script {
        // 1. ดึง Kubeconfig credential
        withKubeConfig(credentialsId: "kubeconfig") {
            // 2. ดึง Docker Hub credential เพื่อให้ DOCKER_USER พร้อมใช้งาน
            withCredentials([usernamePassword(credentialsId: 'dockerhub-credentials', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                // ไม่จำเป็นต้องใช้ script {} เพราะมีแค่ sh step เดียว
                sh '''
                    echo =======Deploy To Kubernetes==========
                    # ตัวแปรเหล่านี้ถูกส่งมาจาก environment block ด้านบน
                    echo "Applying deployment for image ${DOCKER_USER}/${IMAGE_NAME}:${IMAGE_VERSION}"

                    # 3. envsubst จะแทนที่ตัวแปรในไฟล์ YAML ด้วยค่าจาก environment
                    cat k8s/testing-api-deploy.yaml | envsubst | kubectl apply -f -
                    kubectl apply -f k8s/testing-api-svc.yaml
                    sleep 10
                    echo "Successfully deployed version: ${IMAGE_VERSION}"
                '''
            }
        }
    }
}