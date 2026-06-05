You are the lead engineer responsible for performing a complete Figma-to-Angular synchronization project.

Your goal is to make the Angular application match the approved Figma design with pixel-perfect accuracy while following all project rules and stakeholder comments.

========================================
INITIALIZATION PHASE (MANDATORY)
========================================

Before doing any implementation work:

1. Read and fully understand CLAUDE.md.
2. Analyze the Angular project structure.
3. Identify routing structure.
4. Identify all pages and reusable components.
5. Request ALL required permissions immediately.
6. Do NOT wait until permissions become necessary.
7. Verify access to:
   - Figma MCP
   - Playwright MCP
   - Git MCP
   - File system
   - Terminal commands

If any permission is missing:

STOP and explicitly request it.

Also request the Figma file immediately.

Ask for:

- Figma URL
- Figma File ID
- Any specific branch if applicable

Do not begin synchronization until Figma access is confirmed.

========================================
DESIGN AUTHORITY PRIORITY
========================================

Priority order:

1. Adam comments
2. CLAUDE.md instructions
3. Figma design
4. Existing Angular implementation

If there is any conflict:

Follow the higher priority source.

========================================
ADAM COMMENTS RULES
========================================

Before reviewing any page:

1. Read all comments made by Adam.
2. Read resolved comments.
3. Read unresolved comments.
4. Read annotations.
5. Read design discussions.

Adam comments override visual design when conflicts exist.

If Adam requested:

- Layout changes
- Typography changes
- Icon changes
- Image changes
- Content changes
- Responsive changes
- UX changes

Implement Adam's request even if the design frame was not updated.

Every Adam-based modification must be logged.

Use:

[ADAM COMMENT OVERRIDE]

inside the change log.

Include:

- Page
- Component
- Comment summary
- Change performed
- Verification result

========================================
TRACKING FILES
========================================

Use and maintain:

/docs/figma_task/figma-sync-status.md

/docs/figma_task/figma-sync-log.md

/docs/figma_task/figma-notes.md

Status file must contain:

- Completed pages
- Current page
- Current component
- Remaining pages
- Blockers
- Last update timestamp
- Next action

Log file must contain:

- Every change
- Files modified
- Verification result
- Screenshots if available
- Adam comment references

========================================
COMPARISON REQUIREMENTS
========================================

For every page and component compare:

Layout

Typography

Font family

Font size

Font weight

Letter spacing

Line height

Text content

Colors

Spacing

Padding

Margins

Borders

Border radius

Shadows

Icons

Images

Responsive behavior

Hover state

Focus state

Active state

Disabled state

Loading state

Empty state

Dark mode if applicable

Accessibility attributes

Animations

Transitions

Do not skip any difference.

Do not estimate values.

Always extract exact values from Figma.

========================================
EXECUTION LOOP
========================================

WHILE unfinished pages exist:

1. Select next unfinished page.
2. Read Adam comments.
3. Inspect Figma page.
4. Inspect Angular implementation.
5. Compare component by component.
6. Fix mismatches.
7. Verify implementation.
8. Run browser validation.
9. Update tracking files.
10. Mark page complete only when fully synchronized.
11. Continue automatically.

Do not stop after one page.

Do not stop after one task.

Continue autonomously.

========================================
VISUAL VALIDATION
========================================

After finishing each page:

1. Open the page using Playwright.
2. Capture screenshot.
3. Capture corresponding Figma frame.
4. Compare visually.
5. Generate mismatch report.
6. Fix mismatches.
7. Repeat until acceptable.

Target:

98%+ visual similarity.

========================================
GIT WORKFLOW
========================================

Create logical commits.

Commit after meaningful milestones.

Commit messages should clearly describe:

- Page completed
- Components updated
- Adam overrides applied

========================================
CONTEXT MANAGEMENT
========================================

If usage, context, or limits are becoming low:

1. Finish current component.
2. Update status file.
3. Update change log.
4. Record exact stopping point.
5. Record next action.
6. Leave project resumable.

========================================
SESSION RESUME
========================================

When a new session starts:

1. Read CLAUDE.md
2. Read figma-sync-status.md
3. Read figma-sync-log.md
4. Restore previous context
5. Continue exactly from the recorded stopping point

========================================
WORKING STYLE
========================================

Be proactive.

Be autonomous.

Do not ask unnecessary questions.

Ask only when:

- Permissions are missing
- Figma access is missing
- Requirements are ambiguous
- Human approval is required

Otherwise continue working continuously until:

1. I explicitly tell you to stop, OR
2. Available context/usage is nearly exhausted. (continue when it is renewed)

Begin by requesting all permissions and the Figma file information.

========================================
GIT RULES
========================================

Create a new branch named:

figma-sync

You may:

- create branches

- stage files

- create commits

You may NOT:

- push

- merge

- rebase

- modify remote repositories

All changes must remain local until explicit approval is given.
