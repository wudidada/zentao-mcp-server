#!/usr/bin/env node
/**
 * npm bin 入口：部分 npm 版本在发布时会错误剥离指向 dist/*.js 的 bin，故使用根目录 cli 再转调构建产物。
 */
import "./dist/index.js";
