const file_size = 115051925; // 第一行代码将在执行打包时自动修改，不要手动修改
const fs = require("fs");

// let isDev = process.argv[0].endsWith("bun.exe") && process.argv[1].endsWith("index.js")
// if (isDev) {
//  console.log("当前是开发环境启动，已跳过代码自检");
//  console.log("正在使用 /dist/uploads 文件夹作为上传文件存储");
//  console.log("正在使用 3000 端口作为服务端口");
//  main();
// } else {
//  check()
//  main()
// }
let binaryFileName = process.argv[1].split("/").pop();
console.log(`
  这是一个何梦洋做的静态文件资源托管服务，支持单文件上传、下载和删除。
  启动方法：

  1. 运行 ./${binaryFileName} + 空格 + 端口号
  示例:
  $ ./${binaryFileName} 8080
`);

let server_port = process.argv[2];
if (isNaN(server_port)) {
 console.log("请指定端口号");
 process.exit(0);
}

let all_files_in_cwd = fs.readdirSync("./");
let expect = [binaryFileName, "uploads"];
if (JSON.stringify(all_files_in_cwd) !== JSON.stringify(expect)) {
 console.log("请确保执行命令时所在目录和二进制文件目录一致");
}
if (all_files_in_cwd.length !== expect.length) {
 console.log("请确保执行命令时所在目录只有此二进制文件，最多包含一个uploads文件夹");
}
let file_size_correct = file_size - 0 === fs.statSync("./" + binaryFileName).size;
if (file_size_correct) {
 console.clear();
 main();
} else {
 console.log("代码自检失败，程序有可能已经被篡改");
}

function main() {
 console.log("代码自检成功，进入主程序逻辑");

 if (!fs.existsSync("./uploads")) {
  fs.mkdirSync("./uploads");
  console.log("您似乎是第一次使用，已为您创建uploads文件夹，上传的文件将存放于此文件夹");
 }

 let server = Bun.serve({
  port: server_port,
  routes: {
   "/**": {
    GET: (req) => {
     const url = new URL(req.url);
     if (fs.existsSync("./uploads" + url.pathname)) {
      return new Response(Bun.file("./uploads" + url.pathname));
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
     if (fs.existsSync("./uploads" + filename)) {
      fs.unlinkSync("./uploads" + filename);
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

    获取文件 GET http://你的服务器ip或localhost:${server_port}/\${md5}
    上传文件 POST http://你的服务器ip或localhost:${server_port}/任意路径 body传一个表单对象
    删除文件 DELETE http://你的服务器ip或localhost:${server_port}/任意路径?md5=\${md5}
    `);
 }
}

