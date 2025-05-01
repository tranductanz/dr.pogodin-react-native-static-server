// src/config.ts (after fix)

import RNBlobUtil from 'react-native-blob-util';

export const WORK_DIR = `${RNBlobUtil.fs.dirs.CacheDir}/__rn-static-server__`;
export const ERROR_LOG_FILE = `${WORK_DIR}/errorlog.txt`;
export const UPLOADS_DIR = `${WORK_DIR}/uploads`;

export type ErrorLogOptions = {
  conditionHandling?: boolean;
  fileNotFound?: boolean;
  requestHandling?: boolean;
  requestHeader?: boolean;
  requestHeaderOnError?: boolean;
  responseHeader?: boolean;
  timeouts?: boolean;
};

export type StandardConfigOptions = {
  errorLog?: ErrorLogOptions;
  extraConfig: string;
  fileDir: string;
  hostname: string;
  port: number;
  webdav?: string[];
};

async function safeMkdir(path: string) {
  const exists = await RNBlobUtil.fs.exists(path);
  if (!exists) {
    await RNBlobUtil.fs.mkdir(path);
  }
}

function errorLogConfig(errorLogOptions?: ErrorLogOptions): string {
  const res = [];
  if (errorLogOptions) {
    const ops = errorLogOptions;
    const enable = (op: string) => {
      res.push(`debug.log-${op} = "enable"`);
    };
    if (ops.conditionHandling) enable('condition-handling');
    if (ops.fileNotFound) enable('file-not-found');
    if (ops.requestHandling) enable('request-handling');
    if (ops.requestHeader) enable('request-header');
    if (ops.requestHeaderOnError) enable('request-header-on-error');
    if (ops.responseHeader) enable('response-header');
    if (ops.timeouts) enable('timeouts');
  } else {
    res.push('server.errorlog-use-syslog = "enable"');
  }
  return res.join('\n');
}

function standardConfig({
  errorLog,
  extraConfig,
  fileDir,
  hostname,
  port,
  webdav,
}: StandardConfigOptions) {
  let webdavConfig = '';
  if (webdav) {
    webdavConfig += 'server.modules += ("mod_webdav")';
    for (let i = 0; i < webdav.length; ++i) {
      webdavConfig += `$HTTP["url"] =~ "${webdav[i]}" { webdav.activate = "enable" }`;
    }
  }

  return `server.document-root = "${fileDir}"
server.bind = "${hostname}"
server.upload-dirs = ( "${UPLOADS_DIR}" )
server.port = ${port}
${errorLogConfig(errorLog)}
index-file.names += ("index.xhtml", "index.html", "index.htm", "default.htm", "index.php")

${webdavConfig}
${extraConfig}`;
}

export async function newStandardConfigFile(options: StandardConfigOptions): Promise<string> {
  await safeMkdir(UPLOADS_DIR);
  const configFile = `${WORK_DIR}/config-${Date.now()}.txt`;
  await RNBlobUtil.fs.writeFile(configFile, standardConfig(options), 'utf8');
  return configFile;
}