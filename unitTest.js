
async function testHotDeploy() {
    let {FtpHotDeployLib} = require('./FtpHotDeployLib');
    await FtpHotDeployLib.deployAll({
        exclude: ['.git'],
        ftpTargetPath: 'xxxx',
        listenPath: './yyyyy',
        ftpHost: '127.0.0.1',
        ftpPort: 21,
        ftpUser: 'root',
        ftpPass: '123456',
        beforePutFileEvent(targetPath, filename) {

        }
    });
}

(async function () {
    await testHotDeploy();
})();