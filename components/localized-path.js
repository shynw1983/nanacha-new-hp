export const localizedPath = (language, path) => (language && language !== "ja" ? `/${language}${path}` : path);
