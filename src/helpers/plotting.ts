export const chart = {};

// Define interfaces for clarity
interface BorderRadiusValue {
  topLeft: number;
  topRight: number;
  bottomLeft: number;
  bottomRight: number;
}

interface BorderRadius {
  left: BorderRadiusValue;
  middle: BorderRadiusValue;
  right: BorderRadiusValue;
}

interface OrgStats {
  assigned?: number;
  started?: number;
  completed?: number;
}

// Define a simplified type for Chart.js data/options,
// or import specific types from 'chart.js' if needed
type ChartJsData = any;
type ChartJsOptions = any;

const getBorderRadius = (left: number, middle: number, right: number): BorderRadius => {
  const defaultRadius: BorderRadiusValue = {
    topLeft: 0,
    topRight: 0,
    bottomLeft: 0,
    bottomRight: 0,
  };

  const borderRadius: BorderRadius = {
    left: { ...defaultRadius }, // completed
    middle: { ...defaultRadius }, // started
    right: { ...defaultRadius }, // not started
  };

  if (left > 0) {
    borderRadius.left.topLeft = Number.MAX_VALUE;
    borderRadius.left.bottomLeft = Number.MAX_VALUE;
  } else if (middle > 0) {
    borderRadius.middle.topLeft = Number.MAX_VALUE;
    borderRadius.middle.bottomLeft = Number.MAX_VALUE;
  } else {
    borderRadius.right.topLeft = Number.MAX_VALUE;
    borderRadius.right.bottomLeft = Number.MAX_VALUE;
  }

  if (right > 0) {
    borderRadius.right.topRight = Number.MAX_VALUE;
    borderRadius.right.bottomRight = Number.MAX_VALUE;
  } else if (middle > 0) {
    borderRadius.middle.topRight = Number.MAX_VALUE;
    borderRadius.middle.bottomRight = Number.MAX_VALUE;
  } else {
    borderRadius.left.topRight = Number.MAX_VALUE;
    borderRadius.left.bottomRight = Number.MAX_VALUE;
  }

  // If all completed
  if (middle === 0 && right === 0) {
    borderRadius.left.topRight = Number.MAX_VALUE;
    borderRadius.left.bottomRight = Number.MAX_VALUE;
  }

  // If all started
  if (left === 0 && right === 0) {
    borderRadius.middle.topRight = Number.MAX_VALUE;
    borderRadius.middle.bottomRight = Number.MAX_VALUE;
  }

  return borderRadius;
};

export const setBarChartData = (orgStats: OrgStats | null | undefined): ChartJsData => {
  const documentStyle = getComputedStyle(document.documentElement);

  const { assigned = 0, started = 0, completed = 0 } = orgStats || {};
  const numOfCompleted = Number(completed) || 0;
  const numOfAssigned = Number(assigned) || 0;
  const numOfStarted = Number(started) || 0;
  const numOfIncomplete = numOfStarted - numOfCompleted;
  const numOfNotStarted = numOfAssigned - numOfIncomplete - numOfCompleted;

  const borderRadius = getBorderRadius(numOfCompleted, numOfIncomplete, numOfNotStarted);
  const borderWidth = 0;

  const chartData = {
    labels: [''],
    datasets: [
      {
        type: 'bar',
        label: 'Completed',
        backgroundColor: documentStyle.getPropertyValue('--bright-green'),
        data: [numOfCompleted],
        borderWidth: borderWidth,
        borderSkipped: false,
        borderRadius: borderRadius.left,
      },
      {
        type: 'bar',
        label: 'Started',
        backgroundColor: documentStyle.getPropertyValue('--yellow-100'),
        data: [numOfIncomplete],
        borderWidth: borderWidth,
        borderSkipped: false,
        borderRadius: borderRadius.middle,
      },
      {
        type: 'bar',
        label: 'Not Started',
        backgroundColor: documentStyle.getPropertyValue('--surface-d'),
        data: [numOfNotStarted],
        borderWidth: borderWidth,
        borderSkipped: false,
        borderRadius: borderRadius.right,
      },
    ],
  };

  return chartData;
};

export const setBarChartOptions = (orgStats: OrgStats | null | undefined): ChartJsOptions => {
  let { assigned = 0 } = orgStats || {};

  assigned = Number(assigned) || 0;

  const min = 0;
  const max = assigned;

  return {
    indexAxis: 'y',
    maintainAspectRatio: false,
    aspectRatio: 9,
    plugins: {
      tooltips: {
        mode: 'index',
        intersect: false,
      },
      legend: false,
    },
    scales: {
      x: {
        stacked: true,
        ticks: {
          display: false,
        },
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        min,
        max,
      },
      y: {
        stacked: true,
        ticks: {
          display: false,
        },
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        min,
        max,
      },
    },
  };
};
