#!/usr/bin/env bash
set -e

#修改npm地址源
npm config get registry
npm config set registry=https://registry.npmjs.org

#登录npm账号
echo '登录账号'
#npm login

#发布库、更新库
echo '正在发布...'
npm publish

#改回npm地址源
echo '正在修改回地址源'
npm config set registry=https://registry.npmmirror.com/

echo -e '发布完成！'
exit
