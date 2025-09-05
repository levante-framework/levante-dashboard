export const levanteLikeTheme = {
  themeName: 'default',
  colorPalette: 'light',
  isPanelless: true,
  cssVariables: {
    '--sjs-font-family': 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
    '--sjs-base-unit': '8px',
    '--sjs-corner-radius': '14px',
    '--sjs-corner-radius-small': '10px',
    '--sjs-border-width': '1px',

    '--sjs-general-backcolor': '#F7F8FA',
    '--sjs-general-forecolor': '#0B1526',
    '--sjs-general-dim-forecolor': '#6B7280',
    '--sjs-primary-backcolor': '#1F6FEB',
    '--sjs-primary-forecolor': '#FFFFFF',
    '--sjs-primary-backcolor-light': '#E6F0FF',
    '--sjs-primary-backcolor-dark': '#1654B8',
    '--sjs-border-default': '#E5E7EB',
    '--sjs-border-inside': '#EEF2F7',

    '--sjs-panel-backcolor': '#FFFFFF',
    '--sjs-shadow-small': '0 2px 8px rgba(15, 23, 42, 0.06)',
    '--sjs-shadow-medium': '0 6px 18px rgba(15, 23, 42, 0.08)',

    '--sjs-font-size': '15px',
    '--sjs-font-size-small': '13px',
    '--sjs-font-size-h2': '22px',
    '--sjs-font-weight-regular': '500',
    '--sjs-font-weight-bold': '700',

    '--sjs-editor-background': '#FFFFFF',
    '--sjs-editor-foreground': '#0B1526',
    '--sjs-editor-placeholder-foreground': '#9CA3AF',
    '--sjs-editor-border': '#E5E7EB',
    '--sjs-editor-hover-border': '#CBD5E1',
    '--sjs-editor-focus-border': '#1F6FEB',
    '--sjs-editor-corner-radius': '12px',
    '--sjs-editor-padding-horizontal': '16px',
    '--sjs-editor-padding-vertical': '14px',

    '--sjs-primary-button-padding-horizontal': '18px',
    '--sjs-primary-button-padding-vertical': '14px',
    '--sjs-primary-button-corner-radius': '12px',

    '--sjs-outer-padding': '24px',
    '--sjs-inner-padding': '16px',
    '--sjs-question-title-margin-bottom': '8px',
    '--sjs-question-inline-same-line': '0',

    '--sjs-control-corner-radius': '10px',
    '--sjs-control-label-foreground': '#0B1526',
    '--sjs-control-disabled-foreground': '#9CA3AF',

    '--sjs-focus-outline': '2px solid rgba(31,111,235,0.35)',
    '--sjs-focus-outline-inset': '0 0 0 3px rgba(31,111,235,0.18)'
  },
  questionPanel: {
    questionTitleLocation: 'top',
    removeQuestionTitle: false,
    questionErrorLocation: 'bottom',
  },
  header: {
    height: 0,
    extend: false,
  },
} as const;
