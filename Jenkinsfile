def imageName = "${params.GIT_REPO_URL.split('/').last().split('\\.git').first()}".toLowerCase()
def imageVersion = "v1.0.${BUILD_NUMBER}"

stage('Build and Push Docker Image') {
    script {
        withCredentials([usernamePassword(credentialsId: 'dockerhub-credentials', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {

            echo "Building Docker image: ${DOCKER_USER}/${imageName}:${imageVersion}"
            
            sh "echo ${DOCKER_PASS} | docker login -u ${DOCKER_USER} --password-stdin"

            sh """
                docker build \
                    --build-arg http_proxy=http://192.168.1.6:3128 \
                    --build-arg https_proxy=http://192.168.1.6:3128 \
                    -t ${DOCKER_USER}/${imageName}:${imageVersion} \
                    -f Dockerfile .
            """

            sh "docker push ${DOCKER_USER}/${imageName}:${imageVersion}"
            sh "docker logout"
        }
    }
}
