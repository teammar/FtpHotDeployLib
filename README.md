# 静态网页Ftp热部署（FtpHotDeployLib）

[![NPM Version](https://img.shields.io/badge/build-passing-green?style=flat&logo=gitea)](http://192.168.38.243:8000/cqhr_cs_inset_project/pkg_app_cli.git)
[![NODE Version](https://img.shields.io/badge/node-v10.18.0-blue?style=flat&logo=nodedotjs)](http://192.168.38.243:7000/-/web/detail/pac_cli)
[![NPM Version](https://img.shields.io/badge/npm-v6.13.4-blue?style=flat&logo=npm)](http://192.168.38.243:7000/-/web/detail/pac_cli)

#### **一、安装**
```shell
npm i fhdplib
```

#### **二、使用**
```javascript
// 引入本库
let {FtpHotDeployLib} = require('./FtpHotDeployLib');

// 设置公共配置，一定要写在 deployForChange 和 deployAll 函数调用之前。
// 当公共配置设置了，且也分别在deployForChange 和 deployAll参数中设置了，优先使用各自参数中的设置。
FtpHotDeployLib.setCommonConfig({
    exclude: ['.git'],          // 指定不上传的文件或文件夹名称集合,默认指定 ['.git']
    ftpTargetPath: 'xxxx',      // Ftp目标目录
    listenPath: './yyyyy',      // 本地监听目标（文件或文件夹）
    ftpHost: '127.0.0.1',       // ftp服务地址，默认localhost
    ftpPort: 21,                // ftp服务端口号，默认21
    ftpUser: 'root',            // ftp服务用户，默认 anonymous
    ftpPass: '123456',          // ftp服务用户密码，默认 anonymous@
                                // 每个文件上传部署之前的函数
    beforePutFileEvent(targetPath, filename) {
        // targetPath: 该文件要部署的目标目录,filename: 文件名称
    }
});

// 部署所有文件和文件夹到ftp (本函数不监听，执行完就会退出)
await FtpHotDeployLib.deployAll({
    exclude: ['.git'],          // 指定不上传的文件或文件夹名称集合,默认指定 ['.git']
    ftpTargetPath: 'xxxx',      // Ftp目标目录
    listenPath: './yyyyy',      // 本地监听目标（文件或文件夹）
    ftpHost: '127.0.0.1',       // ftp服务地址，默认localhost
    ftpPort: 21,                // ftp服务端口号，默认21
    ftpUser: 'root',            // ftp服务用户，默认 anonymous
    ftpPass: '123456',          // ftp服务用户密码，默认 anonymous@
                                // 每个文件上传部署之前的函数
    beforePutFileEvent(targetPath, filename) {
        // targetPath: 该文件要部署的目标目录,filename: 文件名称
    }
});


// 监听指定目录有内容变更，就部署该目录下的文件和文件夹到ftp（可以同时启动多个监听）
await FtpHotDeployLib.deployForChange({
    exclude: ['.git'],          // 指定不上传的文件或文件夹名称集合,默认指定 ['.git']
    ftpTargetPath: 'xxxx',      // Ftp目标目录
    listenPath: './yyyyy',      // 本地监听目标（文件或文件夹）
    ftpHost: '127.0.0.1',       // ftp服务地址，默认localhost
    ftpPort: 21,                // ftp服务端口号，默认21
    ftpUser: 'root',            // ftp服务用户，默认 anonymous
    ftpPass: '123456',          // ftp服务用户密码，默认 anonymous@
                                // 每个文件上传部署之前的函数
    beforePutFileEvent(targetPath, filename) {
        // targetPath: 该文件要部署的目标目录,filename: 文件名称
    }
});
```