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

stage('Deploy To Kubernetes'){
    steps {
        // 1. ดึง Kubeconfig credential
        withKubeConfig(credentialsId: "kubeconfig") {
            // 2. ดึง Docker Hub credential เพื่อให้ DOCKER_USER พร้อมใช้งาน
            withCredentials([usernamePassword(credentialsId: 'dockerhub-credentials', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                script{
                    sh('''
                    echo =======Deploy To Kubernetes==========
                    echo "Applying deployment for image ${DOCKER_USER}/${imageName}:${imageVersion}"

                    # 3. แก้ไข kubectl ให้รับค่าจาก pipe โดยใช้ "-f -"
                    cat k8s/testing-api-deploy.yaml | envsubst | kubectl apply -f -
                    kubectl apply -f k8s/testing-api-svc.yaml
                    sleep 10
                    echo "Successfully deployed version: ${imageVersion}"
                    ''')
                }
            }
        }
    }
}