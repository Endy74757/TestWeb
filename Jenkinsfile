// c:\jenkins\jobs\dynamic-git-pipeline\config.xml (This is a conceptual path)
// The actual content below goes into the "Pipeline script" box in the Jenkins UI.

pipeline {
    agent any

    // ดึงค่าพารามิเตอร์ที่ส่งเข้ามา
    parameters {
        string(name: 'GIT_REPO_URL', defaultValue: '', description: 'Git repository URL provided by the API')
    }

    stages {
        stage('1. Checkout Code') {
            steps {
                script {
                    // ตรวจสอบว่า GIT_REPO_URL มีค่าหรือไม่
                    if (params.GIT_REPO_URL.trim().isEmpty()) {
                        error "Git repository URL was not provided."
                    }
                    echo "Cloning repository from: ${params.GIT_REPO_URL}"

                    // ลบ workspace เก่า (ถ้ามี) เพื่อความสะอาด
                    cleanWs()

                    // ทำการ Clone Git Repository โดยใช้ URL ที่ได้รับมา
                    git url: params.GIT_REPO_URL, branch: 'main' // หรือ 'master' ตาม repo ของคุณ
                }
            }
        }

        stage('2. Build') {
            steps {
                echo "Building the project..."
                // --- ตัวอย่างคำสั่ง Build ---
                // คุณต้องปรับเปลี่ยนส่วนนี้ให้เข้ากับโปรเจกต์ของคุณ
                // ตัวอย่างสำหรับ Node.js: sh 'npm install'
                // ตัวอย่างสำหรับ Java (Maven): sh 'mvn clean install'
                // ตัวอย่างสำหรับ .NET: sh 'dotnet build'
                sh 'ls -la' // คำสั่งตัวอย่างเพื่อแสดงไฟล์ใน workspace
            }
        }

        stage('3. Test') {
            steps {
                echo "Running tests..."
                // --- ตัวอย่างคำสั่ง Test ---
                // ตัวอย่างสำหรับ Node.js: sh 'npm test'
                // ตัวอย่างสำหรับ Java (Maven): sh 'mvn test'
                // ตัวอย่างสำหรับ .NET: sh 'dotnet test'
            }
        }

        // คุณสามารถเพิ่ม Stage อื่นๆ ได้ตามต้องการ เช่น Deploy
        // stage('4. Deploy') {
        //     steps {
        //         echo "Deploying to production..."
        //     }
        // }
    }

    post {
        always {
            echo 'Pipeline finished.'
        }
        success {
            echo 'Pipeline executed successfully!'
        }
        failure {
            echo 'Pipeline failed!'
        }
    }
}
