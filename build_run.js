import { execSync } from 'child_process'
import { statSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
let entry = './index.js'
let outfilepath = './dist/mycli.exe'
let prevSize = 0;
let currSize = 1;
let buildResult = {}

existsSync('./dist') || mkdirSync('./dist');

while (prevSize !== currSize) {
 buildResult = build(entry)
 prevSize = currSize
 currSize = buildResult.size
 injectFileSizeToCode(entry, currSize)
}
execSync(`mycli.exe ${process.argv[2] || ''}`, { stdio: 'inherit',cwd: './dist'})

function build(file) {
 execSync(`bun build ${file} --outfile ${outfilepath} --compile`)
 return {
  outfilepath,
  size: statSync('./dist/mycli.exe').size
 }
}
function injectFileSizeToCode(codeFilePath, size) {
 let code = readFileSync(codeFilePath).toString().split('\n')
 code[0] = `const file_size = ${size}; // 第一行代码将在执行打包时自动修改，不要手动修改`
 writeFileSync(codeFilePath, code.join('\n'))
}