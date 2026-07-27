export const welcomeSteps = [
  {
    element: "body",
    popover: {
      title: "Welcome to the<br>LEVANTE dashboard",
      description:
        "Login lands you on the welcome page, where you can see basic site stats.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: ".levante-logo",
    popover: {
      title: "Return to the welcome page",
      description: "Click the LEVANTE logo anytime to return here.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: '[data-cy="site-selector"]',
    popover: {
      title: "Always check your site",
      description:
        "The site selector on the upper right determines what site you're working in — any actions you take in the dashboard apply only to the currently selected site.",
      side: "bottom",
      align: "end",
    },
  },
  {
    element: '[data-cy="docs-button"]',
    popover: {
      title: "Researcher documentation",
      description:
        "All of our pages have links to relevant researcher documentation at the top — when in doubt, check this first.",
      side: "left",
      align: "start",
    },
  },
  {
    element: ".options-help",
    popover: {
      title: "Help menu",
      description:
        "You can also open the docs from the help menu, or open a ticket if you have a problem.",
      side: "bottom",
      align: "end",
    },
  },
  {
    element: ".--djs-wizard-link",
    popover: {
      title: "Get started",
      description:
        "Each page has its own walkthrough like this one that will help you understand what to do: just click the wizard icon to trigger the walkthrough. The best place to start is by adding Groups.",
      side: "bottom",
      align: "start",
    },
  },
];
