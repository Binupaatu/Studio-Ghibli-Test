pipeline {
    agent any
    
    stages {
        stage('Build and Test') {
            steps {
                script {
                    def folders = ['admin_frontend', 'backend/gateway', 'backend/users', 'backend/customers', 'backend/courses', 'backend/enrollment', 'frontend/studio-ghibli']
                    for (folder in folders) {
                        // Build Docker image
                        sh "docker build -f ./${folder}/Dockerfiles/Dockerfile -t aneeshrp/${folder}:latest ./${folder}"
                        // Run SonarQube analysis
                        //sh "sonar-scanner -Dsonar.projectKey=${folder} -Dsonar.sources=./${folder}"
                    }
                }
            }
        }
        stage('Push to Docker Hub') {
            steps {
                script {
                    // Define Docker Hub credentials ID
                    def dockerHubCredentialsId = 'docker-sg-group-1-cred'
                    
                    // Docker login command with secure password input
                    withCredentials([usernamePassword(credentialsId: dockerHubCredentialsId, passwordVariable: 'DOCKERHUB_PASSWORD', usernameVariable: 'DOCKERHUB_USERNAME')]) {
                        sh "echo \$DOCKERHUB_PASSWORD | docker login -u \$DOCKERHUB_USERNAME --password-stdin"
                    }
                    
                    def folders = ['admin_frontend', 'backend/gateway', 'backend/users', 'backend/customers', 'backend/courses', 'backend/enrollment', 'frontend']
                    for (folder in folders) {
                        // Push Docker image to Docker Hub
                        sh "docker push aneeshrp/${folder}:latest"
                    }
                }
            }
        }
    }
}
