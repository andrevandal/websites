// lefthook pre-push: git passes "<local ref> <local sha> <remote ref> <remote sha>"
// lines on stdin. Rejects remote branch deletions and non-fast-forward pushes
// whatever command produced them; `git push --no-verify` bypasses it on purpose.
import { execFileSync } from "node:child_process"

const ZERO_SHA = /^0+$/

// A missing object (exit 128) counts as not an ancestor, which fails closed.
const gitIsAncestor = (ancestor: string, descendant: string): boolean => {
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", ancestor, descendant], {
      stdio: "ignore",
    })
    return true
  } catch {
    return false
  }
}

const findBlockedPushes = (
  stdin: string,
  isAncestor: (ancestor: string, descendant: string) => boolean = gitIsAncestor
): string[] => {
  const findings: string[] = []
  for (const line of stdin.split("\n")) {
    if (!line.trim()) continue
    const [, localSha, remoteRef, remoteSha] = line.trim().split(/\s+/)
    if (ZERO_SHA.test(localSha)) {
      findings.push(
        `pre-push: deleting ${remoteRef} is blocked; delete the branch on GitHub or ask the user`
      )
      continue
    }
    if (ZERO_SHA.test(remoteSha)) continue
    if (!isAncestor(remoteSha, localSha)) {
      findings.push(
        `pre-push: ${remoteRef} is not a fast-forward (${remoteSha.slice(0, 7)} is not an ancestor of ${localSha.slice(0, 7)}); push a new commit instead, or fetch first`
      )
    }
  }
  return findings
}

if (import.meta.main) {
  const findings = findBlockedPushes(await Bun.stdin.text())
  for (const finding of findings) console.error(finding)
  process.exit(findings.length > 0 ? 1 : 0)
}

export { findBlockedPushes }
