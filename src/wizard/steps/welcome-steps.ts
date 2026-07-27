import type { DriveStep } from 'driver.js';

export const welcomeSteps: Array<DriveStep> = [
  {
    element: undefined,
    popover: {
      title: 'Welcome to the<br>LEVANTE dashboard',
      description:
        "Since this is your first time here, we'd like to give you a quick tour. Every page has it's own tour you can access from this button. If you'd like to skip this for now, just press the \"x\" on the upper right of the dialog.",
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: 'body',
    popover: {
      title: 'Your welcome page',
      description: 'Login lands you on the welcome page, where you can see basic site stats.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '.--djs-site-selector',
    popover: {
      title: 'Always check your site',
      description:
        "The site selector on the upper right determines what site you're working in — any actions you take in the dashboard apply only to the currently selected site.",
      side: 'bottom',
      align: 'end',
    },
  },
  {
    element: '.--djs-docs-button',
    popover: {
      title: 'Researcher documentation',
      description:
        'All of our pages have links to relevant researcher documentation at the top — when in doubt, check this first.',
      side: 'left',
      align: 'start',
    },
  },
  {
    element: '.--djs-options-help',
    popover: {
      title: 'Help menu',
      description: 'You can also open the docs from the help menu, or open a ticket if you have a problem.',
      side: 'bottom',
      align: 'end',
    },
  },
  {
    element: '.--djs-wizard-link',
    popover: {
      title: 'Page walkthroughs',
      description:
        'Each page has its own walkthrough like this one that will help you understand what to do: just click the wizard icon on any page to trigger the walkthrough.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '.--djs-groups-link',
    popover: {
      title: 'Get started',
      description:
        'The starting point for every project is adding your groups. Head to the Groups page to get started.',
      side: 'bottom',
      align: 'start',
    },
  },
];
