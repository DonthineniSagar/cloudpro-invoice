#!/bin/bash
# Kiro hook: Gather context about what changed for documentation updates
# Triggered via postToolUse on execute_bash (git commit) or stop hook

EVENT=$(cat)
CWD=$(echo "$EVENT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('cwd',''))" 2>/dev/null)

if [ -z "$CWD" ]; then
  CWD="$(pwd)"
fi

cd "$CWD" 2>/dev/null || exit 0

# Get recent commit info
LAST_COMMIT=$(git log -1 --pretty=format:"%h %s" 2>/dev/null)
CHANGED_FILES=$(git diff-tree --no-commit-id --name-only -r HEAD 2>/dev/null)

if [ -z "$CHANGED_FILES" ]; then
  exit 0
fi

echo "Recent commit: $LAST_COMMIT"
echo "Changed files:"
echo "$CHANGED_FILES"

# Flag if steering-relevant files changed
echo "$CHANGED_FILES" | grep -qE "^amplify/" && echo "FLAG: Amplify backend changed - review steering/tech-stack.md and steering/aws-security.md"
echo "$CHANGED_FILES" | grep -qE "^amplify/data/resource\.ts$" && echo "FLAG: Data schema changed - review steering/product.md"
echo "$CHANGED_FILES" | grep -qE "^amplify/functions/" && echo "FLAG: Lambda functions changed - review steering/workflow.md"
echo "$CHANGED_FILES" | grep -qE "^app/" && echo "FLAG: Pages changed - review steering/design.md"
echo "$CHANGED_FILES" | grep -qE "^package\.json$" && echo "FLAG: Dependencies changed - review steering/tech-stack.md"
echo "$CHANGED_FILES" | grep -qE "^lib/" && echo "FLAG: Utilities changed - review steering/coding-standards.md"
echo "$CHANGED_FILES" | grep -qE "^components/" && echo "FLAG: Components changed - review steering/design.md"

exit 0
