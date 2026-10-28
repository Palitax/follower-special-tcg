---
trigger: always_on
description: Always commit and push changes to Git after completing modifications
---

# Always Push to Git

1. After completing any code, styling, configuration, or asset changes for a task, automatically stage (`git add`), commit (`git commit -m "<descriptive message>"`), and push (`git push`) the changes to the remote Git repository.
2. Ensure `.gitignore` is respected so build outputs (`.next/`, `node_modules/`) and sensitive files (`.env*`) are never committed.
3. If no Git repository or remote is configured yet, inform the user and ask for the remote repository URL before pushing.
