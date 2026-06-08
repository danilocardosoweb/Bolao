export function getFirstMatchDate(matches: any[]) {
  const dates = matches
    .map((match) => new Date(match.match_date).getTime())
    .filter((timestamp) => Number.isFinite(timestamp));

  if (dates.length === 0) return null;
  return new Date(Math.min(...dates));
}

export function getPredictionDeadline(matches: any[]) {
  const firstMatchDate = getFirstMatchDate(matches);
  if (!firstMatchDate) return null;

  return new Date(firstMatchDate.getTime() - 60 * 60 * 1000);
}

export function canSubmitPredictions(matches: any[], now = new Date()) {
  const deadline = getPredictionDeadline(matches);
  if (!deadline) return true;

  return now.getTime() < deadline.getTime();
}
