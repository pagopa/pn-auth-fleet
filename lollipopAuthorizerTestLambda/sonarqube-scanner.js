const scanner = require('sonarqube-scanner');

scanner(
    {
        serverUrl: process.env.SONAR_HOST_URL || 'https://sonarcloud.io',
        options: {
            'sonar.projectKey': 'lollipop-dummy-service',
            'sonar.projectName': 'Lollipop Dummy Service',
            'sonar.projectVersion': '1.0.0',
            'sonar.sources': 'src/app',
            'sonar.tests': 'src/test',
            'sonar.javascript.lcov.reportPaths': 'coverage/lcov.info',
            'sonar.exclusions': 'src/test/**,node_modules/**,coverage/**',
            'sonar.test.exclusions': 'src/test/**',
            'sonar.coverage.exclusions': 'src/test/**'
        }
    },
    () => {
        console.log('SonarQube scan completed');
        process.exit();
    }
);
