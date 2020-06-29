/*
 * @Author: your name
 * @Date: 2020-06-28 23:54:05
 * @LastEditTime: 2020-06-30 00:42:05
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \code\gulp\gulpfile.js
 */ 
// 实现这个项目的构建任务
const {src, dest, parallel, series, watch} = require('gulp');
const path = require('path')
const del = require('del'); // 删除编译
const bs = require('browser-sync').create(); // 本地服务
const loadPlug = require('gulp-load-plugins'); // 自动引入glup插件工具,可以不用像下面单个引入gulp插件
const plugins = loadPlug();
// const sass = require('gulp-sass'); // sass 编译插件
// const babel = require('gulp-babel'); // es6+编译插件
// const swig = require('gulp-swig'); // 模板插件
// const imagemin = require('gulp-imagemin'); // 压缩插件
// const eslint = require('gulp-eslint');//  eslint 插件

const cwd = process.cwd(); // 当前工作目录
// 默认配置
let config = {}

try {
    // 引入项目配置
    const loadConfig = require(path.join(cwd, 'page-config.js'))
    // 合并配置
    config = Object.assign({},config, loadConfig)
} catch (error) {}

// 处理样式文件的私有的构建任务,放到临时目录temp
const style = ()=>{
    // 设置基准路径base,保留原始的结构
    return src('src/assets/styles/*.scss', { base: 'src'})
    .pipe(plugins.sass({outputStyle:'expanded'})) // sass编译,并配置完全展开的属性
    .pipe(dest('temp')) // pipe到目标路径
}
// 处理js文件的私有构建任务,放到临时目录temp
const script = ()=>{
    // 设置基准路径base
    return src('src/assets/scripts/*.js', { base: 'src'})
    .pipe(plugins.babel({presets: ['@babel/preset-env']})) // 编译js文件,添加转换属性插件
    .pipe(dest('temp'))
}
// 处理html模板文件的私有构建任务,放到临时目录temp
const page = ()=>{
    return src('src/**/*.html', { base: 'src'})
    .pipe(plugins.swig({data: config.data}))
    .pipe(dest('temp'))
}
// 处理字体文件的私有构建任务
const font = ()=>{
    return src('src/assets/fonts/**', {base:'src'})
    .pipe(dest('dist'))
}
// 处理图片文件的私有构建任务
const image = ()=>{
    return src('src/assets/images/**', {base:'src'})
    // 图片压缩
    .pipe(plugins.imagemin())
    .pipe(dest('dist'))
}
// 其他文件的私有构建任务
const extra = ()=>{
    return src('public/**', {base: 'src'})
    .pipe(dest('dist'))
}
// js使用eslint检查
const lint = ()=>{
    return src('src/assets/scripts/*.js', { base: 'src'})
    // 将lint输出附加到“eslint”属性 以供其它模块使用
    .pipe(plugins.eslint())
    // format()将lint结果输出到控制台。
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
}
// 清除文件的私有构建任务
const clean = () => {
	return del(['dist','temp']);
}

const useref = ()=>{
    return src('temp/*.html',{base: 'temp'})
    // 查找dist路径以及项目的根目录
    .pipe(plugins.useref({searchPath: ['temp', '.']}))
    // 压缩js
    .pipe(plugins.if(/\.js$/,plugins.uglify()))
    // 压缩css
    .pipe(plugins.if(/\.css$/,plugins.cleanCss()))
    // 压缩html
    .pipe(plugins.if(/\.html$/,plugins.htmlmin({
        collapseWhitespace: true,
        minifyCSS: true,
        minifyJS: true
    })))
    .pipe(dest('dist'))
}

// 启动服务
const server = ()=>{
    // 监听文件变化操作编译
    watch('src/assets/styles/*.scss',style)
    watch('src/assets/scripts/*.js', script)
    watch('src/**/*.html', page)
    // 监听其他按文件变化
    watch(['src/assets/images/**','src/assets/fonts/**','public/**'],bs.reload)
    // 根据构建命令设置监听路径
    const argv = process.argv
    const path = argv[2] =='start'?'dist':'temp';
    bs.init({
        notify: false,
        port: 8080, // 端口
        // open: false, 配置是否自打开浏览器
        server: {
            baseDir: [path, 'src', 'pubilc'],
            // 优先配置规则
            routes: {
                '/node_modules': 'node_modules'
            }
        }
    })
}

// 基础构建合并--开发
const compile = parallel(style,script,page);
// 上线之前的编辑打包
const build = series(
    clean,
    parallel(
        series(compile,useref),
        image,
        font, 
        extra
    )
);
// 开发编译热更新服务,未进行也说编译操作
const serve = series(compile,server)
// 线上编译热更新服务，进行了js,css压缩编译操作
const start = series(build, server)
// 发布代码
const _deploy = () => {
    return src('dist/**/*')
    .pipe(plugins.ghPages())
}
// 将编译后的代码发布到gh-page
const deploy = series(build, _deploy)

module.exports = {
    clean,
    build,
    lint,
    serve,
    start,
    deploy
}