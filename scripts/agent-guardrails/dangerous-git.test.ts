import { describe, expect, test } from "bun:test"
import { findDangerousGit } from "./dangerous-git"

const blocked = [
  "git push --force",
  "git push -f origin main",
  "git push -uf origin feat/x",
  "git push --force-with-lease",
  "git push origin +main",
  "git push --mirror",
  "git push origin --delete feat/x",
  "git push origin :feat/x",
  "git reset --hard",
  "git reset --hard HEAD~1",
  "git clean -fd",
  "git clean -xdf",
  "git branch -D feat/x",
  "git branch --delete --force feat/x",
  "git checkout -- .",
  "git checkout .",
  "git checkout -f main",
  "git restore .",
  "git restore --staged --worktree .",
  "git filter-branch --tree-filter x",
  "git update-ref -d refs/heads/x",
  "git stash drop",
  "git stash clear",
  "bun test && git reset --hard",
  "git status; git clean -f",
  "git -C ../other reset --hard",
  "git -c core.pager=cat push --force",
  "GIT_TRACE=1 git push -f",
  "sudo git clean -f",
  "echo $(git reset --hard)",
  `sh -c "git push --force"`,
  "bash -c 'git reset --hard'",
  `bash -lc "git clean -fd"`,
  "eval git reset --hard",
  "xargs git branch -D",
  "xargs -n 1 git branch -D",
  "/usr/bin/git push -f",
  "env -i git reset --hard",
  "sudo -u me git push -f",
  "/usr/bin/env git clean -f",
  "timeout 10 git push --force",
]

const allowed = [
  "git push",
  "git push -u origin feat/x",
  "git push origin feat/x",
  "git reset --soft HEAD~1",
  "git reset HEAD file.ts",
  "git clean -n",
  "git branch -d feat/x",
  "git checkout -b feat/x",
  "git checkout main",
  "git checkout -- src/file.ts",
  "git restore src/file.ts",
  "git restore --staged .",
  "git stash",
  "git stash pop",
  "git log --oneline | head",
  "git -C ../other status",
  "ls -f && echo --force",
  "rg reset --hard docs",
  `sh -c "git status"`,
  "bash scripts/deploy.sh",
  "xargs echo",
  "/usr/bin/git log --oneline",
  "env -u FOO git status",
]

describe("findDangerousGit", () => {
  test.each(blocked)("blocks %s", command => {
    expect(findDangerousGit(command)).toBeString()
  })

  test.each(allowed)("allows %s", command => {
    expect(findDangerousGit(command)).toBeUndefined()
  })
})
