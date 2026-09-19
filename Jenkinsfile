pipeline {
    agent any

    environment {
        APP_NAME = "freshharvest-supermarket-pos"
        DOCKER_PORT = "3000"
        GIT_REPO = "https://github.com/kalaiyaransakthi402-del/Supermarket.git"
    }

    stages {
        stage("Checkout") {
            steps {
                echo "Checking out code from Git repository..."
                checkout scm
            }
        }

        stage("Code Audit & Syntax Check") {
            steps {
                echo "Validating all JavaScript files and HTML structures..."
                bat "node scripts/test-suite.js"
            }
        }

        stage("Docker Configuration Validate") {
            steps {
                echo "Validating Docker Compose configuration..."
                bat "docker compose config"
            }
        }

        stage("Docker Build") {
            steps {
                echo "Building FreshHarvest production Docker image..."
                bat "docker compose build --no-cache"
            }
        }

        stage("Deploy & Launch Container") {
            steps {
                echo "Deploying FreshHarvest container on port 3000..."
                bat "docker compose up -d"
            }
        }

        stage("Health Check") {
            steps {
                echo "Verifying container health on http://localhost:3000..."
                bat "curl -I http://localhost:3000/"
            }
        }
    }

    post {
        always {
            echo "Pipeline execution completed."
        }
        success {
            echo "🎉 FreshHarvest POS deployed successfully!"
        }
        failure {
            echo "❌ Deployment failed. Please check Jenkins logs."
        }
    }
}
