# About the LEVANTE Dashboard

Welcome to the LEVANTE Dashboard! The LEVANTE project is a scientific tool to collect behavioral and cognitive data from children, their caregivers, and their teachers. The tool is designed to be flexible to be used in a variety of recruitment contexts, and applicable to many different scientific aims. The `levante-dashboard` repo contains front-end code for our researcher and user dashboards

# Contributing
LEVANTE is an open-source project, both in terms of our code-base and releases of scientific data. Contributing to open-source projects is a fantastic way to advance one's coding skills. However, the tool is constantly evolving and there isn't always an easy way to jump in and contribute. When we have issues that might be good to pickup as an outside contributor, these will have the label `good first issue`. If we don't have any unassigned issues in the `Ready to Start` column with this label, there might not be any tasks suitable for one-off contributors at the moment.

## Guidelines

**Coming soon:** detailed developer documentation. Watch this space.

If we have issues labeled `good first issue` open and ready to go, here are our guidelines:

- Wherever possible, avoid creating new components/queries etc where one might already exist. Look around the repo for reusable parts before building new ones.
- Automated testing is great, but it has it's limits - make sure to look at and interact with things during testing.
- Test locally as thoroughly as you can before pushing your PR - note that this may involve testing at multiple permissions levels for researchers, as well as testing different kinds of participants, and testing the UI and functionality across multiple languages.
- When opening a PR, use the Development settings to link this to the issue the PR is meant to address.
- Use our PR template and provide sufficiently detailed information for a tester to pickup the automatically generated development link and test the specific changes in our live environment.
- Note that a testing link is only generated after automated ttesting workflows have run and tests have passed; these automated workflows will need to be manually triggered if a PR comes from an outside contributor. Your testing link may not be available right away, and/or our developers may have comments for you to address before we run these tests.
