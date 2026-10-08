export type HomeFocusableDestination = {
  url: string;
};

export const resolvePreferredDestinationIndex = (
  destinations: readonly HomeFocusableDestination[],
  preferredUrl?: string,
): number => {
  if (destinations.length === 0) {
    return -1;
  }

  if (!preferredUrl) {
    return 0;
  }

  const preferredIndex = destinations.findIndex(
    destination => destination.url === preferredUrl,
  );

  return preferredIndex >= 0 ? preferredIndex : 0;
};
