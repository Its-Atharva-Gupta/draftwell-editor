# Draftwell Architecture

Draftwell is a lightweight desktop Markdown editor with independent in-memory file tabs. Its complete current architecture is documented in [10-desktop-file-editor.md](10-desktop-file-editor.md).

## Product boundary

- Open normal Markdown files from unrelated directories through the operating system.
- Edit each file in an independent tab and inspect a sanitized, task-interactive preview.
- Save each tab directly to its path or choose a new path with Save As.
- Keep no document database, vault, workspace index, account, or cloud copy.
- Preserve user control over filenames, directories, backups, and synchronization tools.

Documents `00` through `09` describe an earlier workspace/cloud concept. They are retained as historical design material and are not the implementation target. The desktop architecture supersedes them.
