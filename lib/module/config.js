import RNBlobUtil from 'react-native-blob-util';
export const WORK_DIR = `${RNBlobUtil.fs.dirs.CacheDir}/__rn-static-server__`;
export const ERROR_LOG_FILE = `${WORK_DIR}/errorlog.txt`;
export const UPLOADS_DIR = `${WORK_DIR}/uploads`;
function errorLogConfig(errorLogOptions) {
    const res = [];
    if (errorLogOptions) {
        const enable = (op) => res.push(`debug.log-${op} = "enable"`);
        if (errorLogOptions.conditionHandling)
            enable('condition-handling');
        if (errorLogOptions.fileNotFound)
            enable('file-not-found');
        if (errorLogOptions.requestHandling)
            enable('request-handling');
        if (errorLogOptions.requestHeader)
            enable('request-header');
        if (errorLogOptions.requestHeaderOnError)
            enable('request-header-on-error');
        if (errorLogOptions.responseHeader)
            enable('response-header');
        if (errorLogOptions.timeouts)
            enable('timeouts');
    }
    else {
        res.push('server.errorlog-use-syslog = "enable"');
    }
    return res.join('\n');
}
function standardConfig({ errorLog, extraConfig, fileDir, hostname, port, webdav, }) {
    let webdavConfig = '';
    if (webdav) {
        webdavConfig += 'server.modules += ("mod_webdav")';
        for (const path of webdav) {
            webdavConfig += `$HTTP["url"] =~ "${path}" { webdav.activate = "enable" }`;
        }
    }
    return `server.document-root = "${fileDir}"
  server.bind = "${hostname}"
  server.upload-dirs = ( "${UPLOADS_DIR}" )
  server.port = ${port}
  ${errorLogConfig(errorLog)}
  index-file.names += ("index.html", "default.htm")
  ${webdavConfig}
  ${extraConfig}`;
}
export async function newStandardConfigFile(options) {
    await RNBlobUtil.fs.mkdir(UPLOADS_DIR);
    const configFile = `${WORK_DIR}/config-${Date.now()}.txt`;
    await RNBlobUtil.fs.writeFile(configFile, standardConfig(options), 'utf8');
    return configFile;
}
