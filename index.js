const file_size = 57702384; // 第一行代码将在执行打包时自动修改，不要手动修改
const fs = require("fs");
var tcpPortUsed = require('tcp-port-used');
let config = {}
let isDev = process.argv[0].endsWith("bun.exe") && process.argv[1].endsWith("index.js")
config.isDev = isDev
if (isDev) {
 config.fileHandlerDirectory = "/dist/uploads"
 config.server_port = 0
 console.log("当前是开发环境启动，已跳过代码自检");
 console.log("即将使用 " + config.fileHandlerDirectory + " 文件夹作为上传文件存储");
 console.log("即将使用 \'自动分配\' 端口作为服务端口");
 main();
} else {
 config.fileHandlerDirectory = "/uploads"
 config.binaryFileName = process.argv0.split("\\").pop();
 config.server_port = process.argv[2] || 0;
 console.log(`
  这是一个何梦洋做的静态文件资源托管服务，支持单文件上传、下载和删除。

启动方法：

 1. 自动分配端口模式
直接运行: ./${config.binaryFileName}
这将自动分配端口

 2. 指定端口号模式
说明: ./${config.binaryFileName} + 空格 + 端口号
使用: ./${config.binaryFileName} 3000
`);
 let checkResult = await checkPort() && await checkEnv()
 if (checkResult) {
  console.log("程序自检成功，进入主程序逻辑");
  main()
 }
}

async function checkPort() {
 if (isNaN(config.server_port)) {
  console.log("你指定的端口号不是一个数字");
  return false
 } else {
  config.server_port = parseInt(config.server_port)
  // config.server_port should between 0 and 65535
  if (config.server_port < 0 || config.server_port > 65535) {
   console.log("端口号不正确，应该在0到65535之间");
   return false
  }
  let inUse = await tcpPortUsed.check(config.server_port)
  if (inUse) {
   console.log("端口" + config.server_port + "已经被占用");
   return false
  } else {
   if (config.server_port === 0) {
    console.log("即将使用 \'自动分配\' 端口作为服务端口");
   } else {
    console.log("即将使用 " + config.server_port + " 端口作为服务端口");
   }
   return true
  }
 }
}

async function checkEnv() {
 let all_files_in_cwd = fs.readdirSync("./");
 if (all_files_in_cwd.includes(config.binaryFileName)) {
  if (file_size === fs.statSync("./" + config.binaryFileName).size) {
   return true
  } else {
   console.log("当前执行命令时所在目录确实有" + config.binaryFileName + "文件，但是它们只是文件名一样，并不是同一个文件");
   console.log("提示：程序文件位置在:" + process.argv0);
   return false
  }
 } else {
  console.log("请确保执行命令时所在目录和本程序文件所在的目录一样");
  return false
 }
}


function main() {

 if (!fs.existsSync(config.fileHandlerDirectory)) {
  fs.mkdirSync(config.fileHandlerDirectory, { recursive: true });
  console.log("您似乎是第一次使用，已为您创建" + config.fileHandlerDirectory + "文件夹，上传的文件将存放于此文件夹");
 }

 let server = Bun.serve({
  port: config.server_port,
  routes: {
   "/**": {
    GET: (req) => {
     const url = new URL(req.url);
     if (fs.existsSync(config.fileHandlerDirectory + url.pathname)) {
      return new Response(Bun.file(config.fileHandlerDirectory + url.pathname));
     } else {
      return new Response("无文件", { status: 404 });
     }
    },
    POST: async (req) => {
     const formdata = await req.formData();
     const keys = Array.from(formdata.keys());
     if (keys.length !== 1) {
      return new Response("只能上传一个二进制文件，且不能包含其他表单字段", { status: 400 });
     }
     const file = formdata.get(keys[0]);
     if (!(file instanceof Blob)) {
      return new Response("上传内容必须是二进制文件", { status: 400 });
     }
     const bytes = await file.arrayBuffer();
     const md5 = Bun.CryptoHasher("md5", bytes).digest("hex");
     await Bun.write(`./uploads/${md5}`, file);
     return new Response(md5, { status: 200 });
    },
    DELETE: (req) => {
     const url = new URL(req.url);
     let filename = url.searchParams.get("md5");
     if (fs.existsSync(config.fileHandlerDirectory + filename)) {
      fs.unlinkSync(config.fileHandlerDirectory + filename);
      return new Response("删除成功", { status: 200 });
     } else {
      return new Response("无文件", { status: 404 });
     }
    },
   },
  },
  error: (err, req) => {
   return new Response(`Internal Error: ${err.message}`, {
    status: 500,
   });
  },
 });
 if (server) {
  console.log(`启动成功 使用方法：

    获取文件 GET http://localhost:${server.port}/\${md5}
    上传文件 POST http://localhost:${server.port}/任意路径    body传一个表单对象
    删除文件 DELETE http://localhost:${server.port}/任意路径?md5=\${md5}
    `);
 }
}

