/**
 * commitlint configuration for IOS LMS.
 *
 * Conventional Commits per CLAUDE.md §5. Allowed types match the list in the
 * style guide: feat, fix, refactor, perf, chore, docs, test (with build, ci,
 * style, revert added because they are useful and harmless).
 */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'refactor',
        'perf',
        'chore',
        'docs',
        'test',
        'build',
        'ci',
        'style',
        'revert',
      ],
    ],
    'subject-case': [2, 'always', ['lower-case', 'sentence-case']],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 100],
    'body-max-line-length': [1, 'always', 200],
  },
};
