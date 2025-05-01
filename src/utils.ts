import { Platform } from 'react-native';
import RNBlobUtil from 'react-native-blob-util';

type PLATFORM = 'ANDROID' | 'IOS' | 'MACOS' | 'WINDOWS';

function getPlatform(): PLATFORM {
  switch (Platform.OS) {
    case 'android':
      return 'ANDROID';
    case 'ios':
      return 'IOS'; // Giả sử bạn không cần hỗ trợ Mac Catalyst ở đây
    case 'windows':
      return 'WINDOWS';
    default:
      throw Error(`Unsupported platform ${Platform.OS}`);
  }
}

const PLATFORM_CONST: PLATFORM = getPlatform();

const BASE_ASSET_DIRS: { [key in PLATFORM]: string } = {
  ANDROID: RNBlobUtil.fs.dirs.DocumentDir,
  IOS: RNBlobUtil.fs.dirs.MainBundleDir || '',  // MainBundleDir có thể null Android
  MACOS: RNBlobUtil.fs.dirs.MainBundleDir || '',
  WINDOWS: RNBlobUtil.fs.dirs.DocumentDir, // Windows không hỗ trợ sẵn
};

const BASE_ASSET_DIR = BASE_ASSET_DIRS[PLATFORM_CONST];

const SEP = PLATFORM_CONST === 'WINDOWS' ? '\\' : '/';

/**
 * Returns `true` if given path is absolute, `false` otherwise.
 */
function isAbsolutePath(path: string): boolean {
  if (!path) return false;

  if (Platform.OS === 'windows') {
    return !!path.match(/^[a-zA-Z]:\\/);
  }

  // Android, iOS
  return path.startsWith('/') || path.startsWith('file:///');
}

/**
 * If given `path` is relative, it returns the corresponding absolute path,
 * resolved relative to the platform-specific base location for bundled assets;
 * otherwise, it just returns given absolute path as is.
 */
export function resolveAssetsPath(path: string): string {
  return isAbsolutePath(path) ? path : `${BASE_ASSET_DIR}${SEP}${path}`;
}
