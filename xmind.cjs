const fs = require('fs')
const path = require('path')
const AdmZip = require('adm-zip-iconv')

/**
 * 解压文件到指定目录
 * @param {待解压的文件} filepath 
 * @param {指定解压的目录} target 
 */
function unzip(filepath, target) {
  const zip = new AdmZip(filepath, 'gbk')
  // 检查目标解压目录是否存在，如果不存在，则创建
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true })
  }

  // 解压缩zip文件到目标目录
  zip.extractAllTo(target, /*overwrite*/ true)
  console.log(`文件${filepath}已解压缩到目标目录:${target}`)
}

function toMarkdown(filename, xmindDir) {
  let files = fs.readdirSync(xmindDir)
  fd = fs.openSync(`${filename}.md`, 'w+')
  for (let file of files) {
    let absfile = path.join(xmindDir, file)
    // let tempFD = fs.openSync(file)
    if (fs.statSync(absfile).isDirectory()) {
      //暂时不处理
      continue
    } else {
      if (file === 'content.json') {
        let buffer = fs.readFileSync(absfile)
        let contentJsonArray = JSON.parse(buffer.toString('utf8'))
        let context = {
          name: filename,
          baseDir: xmindDir,
          fd: fd
        }
        for (let contentJson of contentJsonArray) {
          let root = contentJson.rootTopic
          traverse(context, root, 1)
        }
      }
    }
  }
  fs.closeSync(fd)
  console.log("转换完成")
}
function myWrite(context, content) {
  fs.writeFileSync(context.fd, content)
}
/**
 * 递归遍历节点
 */
function traverse(context, node, level) {
  if (!node) {
    return
  }

  if (node.title) {
    let prefix = signMultiplication('#', level)
    let title = `${prefix} ${node.title}\n\n`
    console.log(title)
    myWrite(context, title)
  }

  if (node.notes && node.notes.plain.content) {
    let content = `${node.notes.plain.content}\n\n`
    console.log(content)
    myWrite(context, content)

  }

  if (node.image) {
    let src = node.image.src.slice(4)
    let imageTitle = node.title || "default"
    let imageDir = `${context.name}.attachment`
    let imageName = src.slice(src.lastIndexOf("/") + 1)
    let newImageSrc = `${imageDir}/${imageName}`
    if (!fs.existsSync(imageDir)) {
      fs.mkdirSync(imageDir, { recursive: true })
    }
    let realSrc = path.join(context.baseDir, src)
    if (!fs.existsSync(newImageSrc)) {
      fs.copyFileSync(realSrc, newImageSrc)
    }
    let content = `![${imageTitle}](${newImageSrc})`
    console.log(content)
    myWrite(context, content)
  }

  if (node.children && node.children.attached && node.children.attached.length > 0) {
    let children = node.children.attached
    for (let child of children) {
      traverse(context, child, level + 1)
    }
  }
}

/**
 * 符号乘法
 */
function signMultiplication(sign, n) {
  let result = ''
  for (let i = 0; i < n; i++) {
    result += sign
  }
  return result
}


function entry() {
  let filepath = findOption('-f')
  let filename = filepath.split(path.sep).pop()
  filename = filename.replace(".xmind", "")
  const extractToPath = 'extracted/'
  if (!fs.existsSync(filepath)) {
    console.error(`未找到${filepath}文件`);
  }
  if (fs.existsSync(extractToPath)) {
    fs.rmSync(extractToPath, { force: true, recursive: true })
  }
  unzip(filepath, extractToPath)
  toMarkdown(filename, extractToPath)
  fs.rmSync(extractToPath, { force: true, recursive: true })
}

function findOption(option) {
  let args = process.argv
  const i = args.findIndex((value, _index, _arr) => option === value)
  if (i > args.length - 2) {
    console.err("usage: node xmind.cjs -f xxxx.xmind");
    return
  }
  return args[i + 1]
}
entry()
