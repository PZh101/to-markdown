const { randomUUID } = require('crypto');
const fs = require('fs');
const path = require('path')
// {
//     "data": {
//         "id": "",
//         "created": 0,
//         "text": "B",
//         "image": "base64字符串",
//         "imageTitle": "图片标题",
//         "note": "备注",
//         "hyperlink": "超链接",
//         "hyperlinkTitle": "标题",
//         "progress": "进度"
//     },
//     "children": [
//         {
//             "data":{},
//             "children":[]
//         }
//     ]
// }
/**
 * 生成markdown
 * @param {文件句柄} fd 
 * @param {markdown文件名称} name 
 * @param {节点} node 
 * @param {等级} level 
 */
function generateMarkdown(fd, name, node, level) {
    // let markdown = ""
    if (!level) {
        level = 0
    }
    //处理节点文本
    if (node.data.text) {
        let prefix = ''
        for (let i = 0; i < level; i++) {
            prefix += '#'
        }
        let markdown = `${prefix} ${node.data.text}\n\n`
        myWriteFile(fd, markdown)
    }
    //处理tag
    if (node.data.resource) {
        let resources = node.data.resource
        let tags = ""
        for (let r of resources) {
            tags += `- [ ] ${r}\n\n`
        }
        myWriteFile(fd, tags)
    }
    //处理进度图标
    if (node.data.progress) {
        let content = `> 当前进度: ${name.data.progress}/8 \n\n`
        if (node.data.progress == 0) {
            content = `> 当前进度: 未开始 \n\n`
        }
        myWriteFile(fd, content);
    }
    //处理备注
    if (node.data.note) {
        let markdown = node.data.note + "\n\n"
        myWriteFile(fd, markdown)
    }
    //处理图片
    if (node.data.image) {
        let originalString = node.data.image;
        let result = originalString.match(/^data:image\/\w+/)
        //提取图片类型
        let suffix = result[0].replace("data:image/", "")
        //提取图片base64字符串
        let baseString = originalString.replace(/^data:image\/\w+;base64,/, '')
        const bufferData = Buffer.from(baseString, 'base64');
        let attachDir = `${name}.attachments`
        if (!fs.existsSync(attachDir)) {
            fs.mkdirSync(attachDir);
        }
        let uuid = node.data.imageTitle || randomUUID()
        let imagePath = `${attachDir}/${uuid}.${suffix}`
        //保存图片
        fs.writeFile(imagePath, bufferData, (err) => {
            if (err) {
                console.error(err);
                return
            }
        })
        //将图片写入到markdown
        let title = node.data.imageTitle || "defaultTitle"
        let imageContent = `![${title}](${imagePath})\n\n`;
        myWriteFile(fd, imageContent)
    }
    //处理超链接
    if (node.data.hyperlink) {
        let hyperlinkTitle = node.data.hyperlinkTitle || "linkTitle"
        let hyperlinkContent = `[${hyperlinkTitle}](${node.data.hyperlink})\n\n`
        myWriteFile(fd, hyperlinkContent)
    }
    //处理子节点
    if (node.children && node.children.length > 0) {
        node.children.forEach(element => {
            generateMarkdown(fd, name, element, level + 1);
        });
    }
}
/**
 * 向文件中写入内容
 * @param {markdown文件} fd 
 * @param {要写入的内容} content 
 */
function myWriteFile(fd, content) {
    fs.writeFileSync(fd, content);
    // fs.writeFile(fd, markdown, (err) => {
    //     if (err) {
    //         console.error(err);
    //         return
    //     }
    // })
}
/**
 * 
 * @param {markdwon文件名称} name 
 * @param {要导出的节点} node 
 */
function outputMarkdown(name, node) {
    fd = fs.openSync(`${name}.md`, 'w+');
    generateMarkdown(fd, name, node, 1);
    console.log(`${name}.md generated.`);
    console.log("markdown export successful!");
}

/**
 * 函数入口
 * @returns promise 
 */
function entry() {
    let args = process.argv
    const i = args.findIndex((value, index, arr) => '-f' === value)
    if (i > args.length - 2) {
        console.err("usage: node kmToMarkdown.cjs -f xxxx.km");
        return
    }
    let km = args[i + 1]
    let filename = km.split(path.sep).pop()
    filename = filename.replace(".km", "")
    return new Promise((resolve, reject) => {
        fs.readFile(km, { encoding: 'utf-8', }, (err, data) => {
            if (err) {
                reject(err)
            }
            let kmJson = JSON.parse(data)
            // console.log(`名字:${filename}`);
            resolve({ data: kmJson, name: filename })
        })

    })


}
entry().then(({ data, name }) => {
    outputMarkdown(name, data.root);
}).catch(err => {
    console.log(err);
})