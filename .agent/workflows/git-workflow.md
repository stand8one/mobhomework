---
description: Git 分支开发工作流
---

# Git 工作流

## 远程仓库
- 地址: `git@github.com:stand8one/mobhomework.git` (SSH)
- 主分支: `main`

## 开发流程

// turbo-all

1. 从 main 创建 feature 分支:
```bash
git checkout main && git pull origin main
git checkout -b feature/<功能名>
```

2. 在 feature 分支上开发并提交

3. 完成后推送分支:
```bash
git push origin feature/<功能名>
```

4. 合并回 main:
```bash
git checkout main
git merge feature/<功能名>
git push origin main
```

5. 清理分支:
```bash
git branch -d feature/<功能名>
```

## 分支命名规范
- `feature/<功能>` — 新功能开发
- `fix/<问题>` — 修复 bug
- `refactor/<范围>` — 重构
