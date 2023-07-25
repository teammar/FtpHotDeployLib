let Ftp = require('ftp');
let fs = require('fs');
let path = require('path');


/* 配置区 */
const defOpt = {
    exclude: ['.git'], // 不处理的文件或者文件夹
    ftpTargetPath: 'Daito/mfp-entry/nb/html', // ftp目标目录
    listenPath: '../nb/AIP-86101', // 监听目标（文件或文件夹）
    listenIsFolder: true, // 监听目标是否为文件夹
    ftpPort: 21, // ftp服务端口号
    ftpHost: '', // ftp服务地址
    ftpUser: '', // ftp服务用户
    ftpPass: '', // ftp服务用户密码
    beforePutFileEvent: (targetPath, filename) => { // 文件上传之前的处理
        console.log(logPrefix, 'beforePutFileEvent,', targetPath, filename);
    },
};
let commonOpt = null;
// let ftpTargetPath = defOpt.ftpTargetPath; // ftp目标目录
// let listenPath = defOpt.listenPath; // 监听目标（文件或文件夹）
// let listenIsFolder = defOpt.listenIsFolder; // 监听目标是否为文件夹
// let beforePutFileEvent = defOpt.beforePutFileEvent;

let logPrefix = 'FtpHotDeployLib Log:';

/**
 * @class
 * @description FHDLib ftp热部署静态网页库
 * @author Teammar
 * */
function FtpHotDeployLib(options) {
    if (typeof options !== 'object') options = {};
    commonOpt = commonOpt || {};
    let exclude = Object.assign([], defOpt.exclude, commonOpt.exclude, options.exclude);
    this.opts = Object.assign({}, defOpt, commonOpt, options);
    this.opts.exclude = exclude;
    this.ftpClient = new Ftp();
}

async function startFtp() {
    return new Promise(async (resolve, reject) => {
        await this.connectFtp();
        await this.cwdFtp();
        resolve();
    });
}

async function connectFtp() {
    return new Promise(async (resolve, reject) => {
        this.ftpClient.connect({
            host: this.opts.ftpHost,
            port: this.opts.ftpPort,
            user: this.opts.ftpUser,
            password: this.opts.ftpPass,
        });
        resolve();
    });
}

async function cwdFtp(path) {
    return new Promise((resolve, reject) => {
        this.ftpClient.cwd(path || this.opts.ftpTargetPath, () => {
            console.log(logPrefix, `Ftp切换到 ${this.opts.ftpTargetPath} 目录`);
            resolve();
        });
    });
}

async function listenLocalPath() {
    return new Promise(resolve => {
        console.log(logPrefix, `开始监听 ${this.opts.listenPath} 目录变更`);
        let totalTime = Date.now() - 101, isRunning = false;
        let event = async (event, filename) => {
            let nowTime = Date.now();
            if (nowTime - totalTime < 100 || isRunning) return;
            totalTime = nowTime;
            isRunning = true;
            if (!this.ftpClient.connected) {
                await this.startFtp();
            }
            await this.delFtpPath();
            // if (!filename.endsWith('~')) {
            // console.log(logPrefix, event, filename);
            await this.putAll();
            // }
            isRunning = false;
            console.log(logPrefix, '本次执行时间 -', displayTime(Date.now() - nowTime));
        };
        fs.watch(this.opts.listenPath, {recursive: this.opts.listenIsFolder}, event);
        resolve();
    });
}

async function postAll() {
    if (!this.ftpClient.connected) {
        await this.startFtp();
    }
    await this.delFtpPath();
    await this.putAll();
    await this.endFtp();
}

async function putAll(lp) {
    return new Promise(async (resolve, reject) => {
        let lsnReg = new RegExp(this.opts.listenPath.replace(/\\/g, '/'), 'g');
        let rootPath = lp || this.opts.listenPath,
            prefix = rootPath.replace(/\\/g, '/').replace(lsnReg, '');
        prefix = prefix.startsWith('/') ? prefix.substring(1) : prefix;
        if (lp) await this.mkdir(prefix);
        let fileList = fs.readdirSync(lp || this.opts.listenPath);
        fileList = fileList || [];
        for (const file of fileList) {
            if (this.opts.exclude.includes(file)) continue;
            let curPath = rootPath + path.sep + file.replace(/\\/g, '/');
            let stats = fs.statSync(curPath);
            if (stats.isFile()) {
                let putPath = (prefix ? prefix + '/' : '') + file;
                if (this.opts.beforePutFileEvent) putPath = this.opts.beforePutFileEvent((prefix ? prefix + '/' : ''), file) || putPath;
                await this.putFile(curPath, putPath);
            } else {
                await this.putAll(curPath);
            }
        }
        resolve();
    })
}

async function mkdir(path) {
    return new Promise((resolve, reject) => {
        console.log(logPrefix, '创建目录', path);
        this.ftpClient.mkdir(path, true, (e) => {
            if (e) {
                reject(e);
            } else {
                resolve();
            }
        })
    })
}

async function putFile(curFile, targetFile) {
    return new Promise((resolve, reject) => {
        this.ftpClient.put(fs.createReadStream(curFile), targetFile, (err, res) => {
            console.log(logPrefix, `已经将 ${curFile} 传送到 ${this.opts.ftpTargetPath + path.sep + targetFile}`);
            resolve();
        })
    });
}

async function delFtpPath() {
    return new Promise((resolve, reject) => {
        this.ftpClient.list(async (err, res) => {
            if (err) {
                reject(err);
            } else {
                if (!res || res.length === 0) {
                    resolve();
                    return;
                }
                let allPromise = [];
                for (const item of res) {
                    console.log(logPrefix, 'Delete Name ', item.name);
                    allPromise.push(new Promise((resolve1, reject1) => {
                        let delEvent = (e, result) => {
                            if (e) {
                                console.log(logPrefix, item.name + ' 删除失败：' + e);
                            } else {
                                console.log(logPrefix, item.name + '删除结果：' + result);
                            }
                            resolve1();
                        };
                        if (item.type === 'd') {
                            this.ftpClient.rmdir(item.name, true, delEvent)
                        } else {
                            this.ftpClient.delete(item.name, delEvent);
                        }
                    }))
                }
                await Promise.all(allPromise);
                resolve();
            }
        })
    });
}

async function endFtp() {
    this.ftpClient.logout();
    this.ftpClient.end();
}

function displayTime(ms) {
    ms = parseInt(ms) || 0;
    let unit = 'ms', value = ms, lastFix = '';
    if (ms > 1000) {
        unit = 's';
        value = Math.floor(ms / 1000);
    }
    if (unit === 's' && value > 60) {
        unit = 'm';
        lastFix = value % 60 + 's';
        value = Math.floor(value / 60);
    }
    if (unit === 'm' && value > 60) {
        unit = 'h';
        lastFix = value % 60 + 'm ' + lastFix;
        value = Math.floor(value / 60);
    }

    return `${value}${unit} ${lastFix}`;
}

function setOpts(options) {
    let opts = Object.assign({}, defOpt, commonOpt, options)
    this.opts.beforePutFileEvent = opts.beforePutFileEvent;
    this.opts.ftpTargetPath = opts.ftpTargetPath;
    this.opts.listenPath = opts.listenPath;
    this.opts.listenIsFolder = opts.listenIsFolder;
}

FtpHotDeployLib.prototype.startFtp = startFtp;
FtpHotDeployLib.prototype.connectFtp = connectFtp;
FtpHotDeployLib.prototype.cwdFtp = cwdFtp;
FtpHotDeployLib.prototype.listenLocalPath = listenLocalPath;
FtpHotDeployLib.prototype.postAll = postAll;
FtpHotDeployLib.prototype.putAll = putAll;
FtpHotDeployLib.prototype.mkdir = mkdir;
FtpHotDeployLib.prototype.putFile = putFile;
FtpHotDeployLib.prototype.delFtpPath = delFtpPath;
FtpHotDeployLib.prototype.endFtp = endFtp;
FtpHotDeployLib.prototype.setOpts = setOpts;

/**
 * @lang zh-cn
 * @description 配置公共设定，当监听多个目录时就可以使用本函数。
 * 监听一个目录，或者deployAll时没必要使用本函数
 * @param {Object} options 参数对象
 * @param {string[]} [options.exclude] 指定不上传的文件或文件夹名称集合,默认指定 ['.git']
 * @param {string} options.ftpTargetPath Ftp目标目录
 * @param {string} options.listenPath 本地监听目标（文件或文件夹）
 * @param {boolean} [options.listenIsFolder] 监听目标是否为文件夹，默认为true
 * @param {string} [options.ftpHost] ftp服务地址，默认localhost
 * @param {number} [options.ftpPort] ftp服务端口号，默认21
 * @param {string} [options.ftpUser] ftp服务用户，默认 anonymous
 * @param {string} [options.ftpPass] ftp服务用户密码，默认 anonymous@
 * @param {function} [options.beforePutFileEvent] 每个文件上传部署之前的函数
 * */
FtpHotDeployLib.setCommonConfig = function(options) {
    commonOpt = JSON.parse(JSON.stringify(options));
}

/**
 * @lang zh-cn
 * @desc 监听指定目录有内容变更，就部署该目录下的文件和文件夹到ftp（可以同时启动多个监听）
 * @param {Object} options 参数对象
 * @param {string[]} [options.exclude] 指定不上传的文件或文件夹名称集合,默认指定 ['.git']
 * @param {string} options.ftpTargetPath Ftp目标目录
 * @param {string} options.listenPath 本地监听目标（文件或文件夹）
 * @param {boolean} [options.listenIsFolder] 监听目标是否为文件夹，默认为true
 * @param {string} [options.ftpHost] ftp服务地址，默认localhost
 * @param {number} [options.ftpPort] ftp服务端口号，默认21
 * @param {string} [options.ftpUser] ftp服务用户，默认 anonymous
 * @param {string} [options.ftpPass] ftp服务用户密码，默认 anonymous@
 * @param {function} [options.beforePutFileEvent] 每个文件上传部署之前的函数
 * @example
 * FtpHotDeployLib.deployForChange({
 *      exclude: ['.git'],
 *      ftpTargetPath: 'xxxx',
 *      listenPath: './yyyyy',
 *      beforePutFileEvent(targetPath, filename) {
 *          // targetPath: 该文件要部署的目标目录
 *          // filename: 文件名称
 *          if (filename === 'a.js') {
 *              filename = 'b.js';
 *          }
 *          return targetPath + filename;
 *      }
 * })
 * */
FtpHotDeployLib.deployForChange = async function (options) {
    let ftpHotDeployLib = new FtpHotDeployLib(options)
    await ftpHotDeployLib.startFtp();
    await ftpHotDeployLib.listenLocalPath();
}

/**
 * @lang zh-cn
 * @description 部署所有文件和文件夹到ftp (本函数不监听，执行完就会退出)
 * @param {Object} options 参数对象
 * @param {string[]} [options.exclude] 指定不上传的文件或文件夹名称集合,默认指定 ['.git']
 * @param {string} options.ftpTargetPath Ftp目标目录
 * @param {string} options.listenPath 本地监听目标（文件或文件夹）
 * @param {boolean} [options.listenIsFolder] 监听目标是否为文件夹，默认为true
 * @param {string} [options.ftpHost] ftp服务地址，默认localhost
 * @param {number} [options.ftpPort] ftp服务端口号，默认21
 * @param {string} [options.ftpUser] ftp服务用户，默认 anonymous
 * @param {string} [options.ftpPass] ftp服务用户密码，默认 anonymous@
 * @param {function} [options.beforePutFileEvent] 每个文件上传部署之前的函数,
 * targetPath: 该文件要部署的目标目录,filename: 文件名称
 * @example
 * FtpHotDeployLib.deployAll({
 *      exclude: ['.git'],
 *      ftpTargetPath: 'xxxx',
 *      listenPath: './yyyyy',
 *      beforePutFileEvent(targetPath, filename) {
 *          // targetPath: 该文件要部署的目标目录
 *          // filename: 文件名称
 *          if (filename === 'a.js') {
 *              filename = 'b.js';
 *          }
 *          return targetPath + filename;
 *      }
 * })
 * */
FtpHotDeployLib.deployAll = async function (options) {
    let ftpHotDeployLib = new FtpHotDeployLib(options)
    let startTime = Date.now();
    await ftpHotDeployLib.startFtp();
    await ftpHotDeployLib.postAll();
    console.log(logPrefix, '共计花费', displayTime(Date.now() - startTime));
}

module.exports = {
    FtpHotDeployLib
}