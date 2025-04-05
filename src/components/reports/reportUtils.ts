// This file contains items that are likely to be used by multiple reports.  For instance, strings
// like "Extra Support Needed" that we want to be consistent in all the reports.

// Define type for the records
type ReportConstantRecord = Record<string, string>;

export const supportLevelsType: ReportConstantRecord = {
  average: 'Average or Above Average',
  some: 'Some Support Needed',
  extra: 'Extra Support Needed',
};

export const automaticityLevelsType: ReportConstantRecord = {
  average: 'Average or Above Average',
  limited: 'Limited',
};

export const graphColorType: ReportConstantRecord = {
  mediumPink: '#cc79a7',
  mediumYellow: '#f0e442',
  mediumBlue: '#0072b2',
  lightBlueGreen: '#44aa99',
  darkPurple: '#342288',
  black: '#000000',
}; 