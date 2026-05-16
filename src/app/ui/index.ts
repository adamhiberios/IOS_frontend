// UI layer — in-house design-system primitives (ios-button, ios-input, ios-modal, …).
// Every export here MUST use the `ios-` selector prefix per CLAUDE.md §3, §5.
// No Material, PrimeNG, or NG-Zorro — see CLAUDE.md §4 banned-patterns table.
// Tailwind utility classes only; design tokens live in src/styles.css under @theme.

export { AccentBars } from './accent-bars/accent-bars';
export { CanadaFlag } from './canada-flag/canada-flag';
export { Button, type ButtonVariant, type ButtonSize, type ButtonType } from './button';
export { Checkbox } from './checkbox/checkbox';
export { Dropdown, type DropdownOption } from './dropdown';
export { IconButton, type IconButtonVariant, type IconButtonSize } from './icon-button';
export { Input, type InputState } from './input/input';
export { LanguageSelector } from './language-selector/language-selector';
export { WarningCard } from './warning-card/warning-card';
export { PasswordStrength, type PasswordRules } from './password-strength/password-strength';
export { Select, type SelectOption, type SelectState } from './select';
export { SocialButton, type SocialProvider } from './social-button/social-button';
export { AppleIcon, GoogleIcon, LinkedinIcon, MapleLeafIcon } from './social-button/social-icons';
export { IosIcon } from './icon/icon';
export { provideIcons, type LucideIconClass } from './icon/icon-registry';
export type { LucideIconName } from './icon/icon-names';
export { SectionBadge, type SectionBadgeVariant } from './section-badge/section-badge';
export { ScrollToTop } from './scroll-to-top/scroll-to-top';
export { CertificatesBadge } from './certificates-badge/certificates-badge';
export { BulletStepList } from './bullet-step-list/bullet-step-list';
export { BarChart } from './bar-chart/bar-chart';
export { LineChart } from './line-chart/line-chart';
export { DonutChart } from './donut-chart/donut-chart';
