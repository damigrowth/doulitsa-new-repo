export const getPathSegments = (path) => {
  return path.split('/').filter(Boolean);
};

export const getPathname = (path, index) => {
  const segments = getPathSegments(path);

  return segments[index];
};
