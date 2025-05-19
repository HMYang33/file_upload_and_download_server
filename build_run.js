import { execSync } from 'child_process'
import { statSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
let entry = './index.js'
let outfileName = 'file_upload_and_download_server'
let outfilepath = platform => './dist/' + outfileName + platform
let prevSize = 0;
let currSize = 1;
let buildCmdMaker = (target, outfile) => `bun build --compile --minify --target=${target} ${entry} --outfile ${outfile}`
let buildWorks = [
 ["bun-linux-x64", "-linux-x64"],
 ["bun-linux-arm64", "-linux-arm64"],
 ["bun-windows-x64", "-windows-x64.exe"],
 ["bun-darwin-x64", "-darwin-x64"],
 ["bun-darwin-arm64", "-darwin-arm64"]
]

main()
function main() {
 existsSync('./dist') || mkdirSync('./dist');
 for (let i = 0; i < buildWorks.length; i++) {
  console.log("开始构建" + buildWorks[i][1] + "版本")
  let [target, outfile] = buildWorks[i];
  prevSize = 0;
  currSize = 1;
  buildForOnePlatform(target, outfile)
 }
}


function buildForOnePlatform(target, outfile) {
 while (prevSize !== currSize) {
  let { size } = build(target, outfilepath(outfile))
  prevSize = currSize
  currSize = size
  injectFileSizeToCode(entry, currSize)
 }

 function build(target, outfile) {
  execSync(buildCmdMaker(target, outfile), { stdio: 'inherit' })
  return {
   outfilepath,
   size: statSync(outfile).size
  }
 }
 function injectFileSizeToCode(codeFilePath, size) {
  let code = readFileSync(codeFilePath).toString().split('\n')
  code[0] = `const file_size = ${size}; // 第一行代码将在执行打包时自动修改，不要手动修改`
  writeFileSync(codeFilePath, code.join('\n'))
 }
}

