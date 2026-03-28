import { exec } from 'node:child_process'
import { mkdir, rm, access } from 'node:fs/promises'
import path from 'node:path'
import type { GitMergeResult } from '../types.js'

const MAX_CLONE_RETRIES = 2

export class GitService {
  private repoUrl: string
  private workDir: string

  constructor(repoUrl: string, workDir: string) {
    this.repoUrl = repoUrl
    this.workDir = workDir
  }

  private run(cmd: string, cwd?: string, timeoutMs = 120_000): Promise<string> {
    return new Promise((resolve, reject) => {
      exec(cmd, { cwd, maxBuffer: 10 * 1024 * 1024, timeout: timeoutMs }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Command failed: ${cmd}\n${stderr || error.message}`))
          return
        }
        resolve(stdout.trim())
      })
    })
  }

  getRepoPath(branch: string): string {
    const safeName = branch.replace(/[^a-zA-Z0-9_-]/g, '_')
    return path.join(this.workDir, safeName)
  }

  async cloneRepo(branch: string): Promise<string> {
    const repoPath = this.getRepoPath(branch)

    // Очистка предыдущей копии если есть
    try {
      await access(repoPath)
      await rm(repoPath, { recursive: true, force: true })
    } catch {
      // Директории нет — ок
    }

    await mkdir(this.workDir, { recursive: true })

    // Клонирование с retry
    for (let attempt = 1; attempt <= MAX_CLONE_RETRIES; attempt++) {
      try {
        await this.run(`git clone --depth 1 -b main "${this.repoUrl}" "${repoPath}"`)
        // Создаём рабочую ветку
        await this.run(`git checkout -b ${branch}`, repoPath)
        return repoPath
      } catch (err) {
        if (attempt === MAX_CLONE_RETRIES) {
          throw new Error(`git clone failed after ${MAX_CLONE_RETRIES} attempts: ${err instanceof Error ? err.message : String(err)}`)
        }
        // Ждём 3 секунды перед retry
        await new Promise(r => setTimeout(r, 3000))
        // Чистим неудачный клон
        try { await rm(repoPath, { recursive: true, force: true }) } catch { /* ignore */ }
      }
    }

    throw new Error('Unreachable: clone retries exhausted')
  }

  async commitAll(repoPath: string, message: string): Promise<string | null> {
    await this.run('git add -A', repoPath)

    // Проверяем есть ли что коммитить
    const status = await this.run('git status --porcelain', repoPath)
    if (!status) return null

    await this.run(`git commit -m "${message.replace(/"/g, '\\"')}"`, repoPath)
    const hash = await this.run('git rev-parse --short HEAD', repoPath)
    return hash
  }

  async pushBranch(repoPath: string, branch: string): Promise<void> {
    await this.run(`git push origin ${branch}`, repoPath)
  }

  /**
   * Auto-merge: checkout main → pull → merge branch → push
   */
  async autoMerge(repoPath: string, branch: string): Promise<GitMergeResult> {
    try {
      await this.run('git checkout main', repoPath)
      await this.run('git pull origin main', repoPath)
      await this.run(`git merge ${branch} --no-edit`, repoPath)
      await this.run('git push origin main', repoPath)
      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, error: message }
    }
  }

  async cleanup(repoPath: string): Promise<void> {
    try {
      await rm(repoPath, { recursive: true, force: true })
    } catch {
      // Не критично
    }
  }
}
