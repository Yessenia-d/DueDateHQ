# Issue tracker: GitHub

Issues and PRDs for this repo live as GitHub issues in `Yessenia-d/DueDateHQ`. Use the `gh` CLI for issue tracker operations.

## Conventions

- Create an issue: `gh issue create --title "..." --body "..."`
- Read an issue: `gh issue view <number> --comments --json number,title,body,labels,comments,state,author,createdAt,updatedAt`
- List issues: `gh issue list --state open --json number,title,body,labels,comments,updatedAt`
- Comment on an issue: `gh issue comment <number> --body "..."`
- Apply or remove labels: `gh issue edit <number> --add-label "..."` or `--remove-label "..."`
- Close an issue: `gh issue close <number> --comment "..."`

When a skill says "publish to the issue tracker", create a GitHub issue.

When a skill says "fetch the relevant ticket", run `gh issue view <number> --comments`.
