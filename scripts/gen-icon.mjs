/**
 * 应用图标生成脚本（开发期使用）
 * 将手绘 SVG 渲染为 1024x1024 PNG，供 `tauri icon` 生成全套平台图标。
 * 运行：pnpm icon
 */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)))

/** 读取 SVG 并栅格化为 PNG 主图标 */
async function main() {
  const svg = await readFile(join(root, 'app-icon.svg'))
  await sharp(svg, { density: 300 })
    .resize(1024, 1024)
    .png()
    .toFile(join(root, 'app-icon.png'))
  console.log('app-icon.png generated')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})