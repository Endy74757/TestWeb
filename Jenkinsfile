pipeline {
    // It's best practice to run pipelines on a specific agent type.
    agent any

    // Define parameters for the pipeline for reusability.
    parameters {
        string(name: 'GIT_REPO_URL', defaultValue: 'https://github.com/your-user/your-repo.git', description: 'The Git repository URL to build.')
    }

    // Define environment variables globally for the entire pipeline.
    // This is the standard and most reliable way to manage variables.
    environment {
        IMAGE_NAME    = "${params.GIT_REPO_URL.split('/').last().split('\\.git').first().toLowerCase()}"
        IMAGE_VERSION = "v1.0.${BUILD_NUMBER}"
    }

    stages {
        stage('Checkout Code') {
            steps {
                echo "Cloning repository from: ${params.GIT_REPO_URL}"
                // Clean the workspace before checking out code to ensure a fresh start.
                cleanWs()
                git url: params.GIT_REPO_URL, branch: 'main'
            }
        }

        stage('Build and Push Docker Image') {
            steps {
                // Use credentials stored securely in Jenkins.
                withCredentials([usernamePassword(credentialsId: 'dockerhub-credentials', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {

                    // Use env.VAR_NAME to access environment variables in Groovy strings.
                    echo "Building Docker image: ${DOCKER_USER}/${IMAGE_NAME}:${IMAGE_VERSION}"
                    
                    // SECURITY: Removed 'sudo'. The 'jenkins' user on the agent should be in the 'docker' group.
                    // Run this on the agent once: sudo usermod -aG docker jenkins
                    sh "echo ${DOCKER_PASS} | sudo docker login -u ${DOCKER_USER} --password-stdin"

                    sh """
                        sudo docker build \\
                            --build-arg http_proxy=http://192.168.1.6:3128 \\
                            --build-arg https_proxy=http://192.168.1.6:3128 \\
                            -t ${DOCKER_USER}/${IMAGE_NAME}:${IMAGE_VERSION} \\
                            -f Dockerfile devops-portal-backend/.
                    """

                    sh "sudo docker push ${DOCKER_USER}/${IMAGE_NAME}:${IMAGE_VERSION}"
                    sh "sudo docker logout"
                }
            }
        }

        stage('Deploy To Kubernetes') {
            steps {
                
                withKubeConfig(credentialsId: "kubeconfig") {
                    // DOCKER_USER is only needed for the echo statement, but it's good practice
                    // to wrap steps needing credentials.
                    withCredentials([usernamePassword(credentialsId: 'dockerhub-credentials', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                        // The environment block at the top level makes IMAGE_NAME and IMAGE_VERSION available to the shell.
                        // DOCKER_USER is made available by withCredentials.
                        sh '''
                            echo "Deploying image ${DOCKER_USER}/${IMAGE_NAME}:${IMAGE_VERSION}..."
                            echo "Applying deployment for image ${DOCKER_USER}/${IMAGE_NAME}:${IMAGE_VERSION}"
                            
                            # Use envsubst to substitute variables from the shell environment into the YAML
                            cat k8s/TestWebdeploy.yaml | envsubst | kubectl apply -f -
                            kubectl apply -f k8s/TestWebSVC.yaml
                            echo "Successfully deployed version: ${IMAGE_VERSION}"
                        '''
                    }
                }
            }
        }
    }

    post {
        always {
            echo 'Pipeline finished.'
            cleanWs()
        }
    }
}