/**
 * If given `path` is relative, it returns the corresponding absolute path,
 * resolved relative to the platform-specific base location for bundled assets;
 * otherwise, it just returns given absolute path as is.
 */
export declare function resolveAssetsPath(path: string): string;
