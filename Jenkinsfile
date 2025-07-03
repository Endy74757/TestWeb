// This Jenkinsfile is loaded by a parent "wrapper" pipeline.
// It contains the specific build, test, and deploy logic for this project.

// Define local variables. The 'params' and 'BUILD_NUMBER' are inherited from the parent pipeline.
def imageName = "${params.GIT_REPO_URL.split('/').last().split('\\.git').first()}"
def imageVersion = "v1.0.${BUILD_NUMBER}"

stage('Build and Push Docker Image') {
    script {
        // Use Docker Hub credentials stored in Jenkins
        withCredentials([usernamePassword(credentialsId: 'dockerhub-credentials', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
            
            echo "Building Docker image: ${DOCKER_USER}/${imageName}:${imageVersion}"
            
            // Login to Docker Hub
            sh "echo ${DOCKER_PASS} | docker login -u ${DOCKER_USER} --password-stdin"

            // Build the Docker image from the Dockerfile in this repository's root
            sh "docker build -t ${DOCKER_USER}/${imageName}:${imageVersion} ."

            // Push the image to Docker Hub
            sh "docker push ${DOCKER_USER}/${imageName}:${imageVersion}"

            // Logout for security
            sh "docker logout"
        }
    }
}

echo 'Project pipeline finished.'
