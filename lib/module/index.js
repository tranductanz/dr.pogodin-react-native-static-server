import { AppState, NativeEventEmitter, } from "react-native";
import RNBlobUtil from "react-native-blob-util";
import { Emitter, Semaphore } from "@dr.pogodin/js-utils";
import { ERROR_LOG_FILE, newStandardConfigFile, } from "./config";
import { SIGNALS, STATES } from "./constants";
import ReactNativeStaticServer from "./NativeReactNativeStaticServer";
import { resolveAssetsPath } from "./utils";
export { ERROR_LOG_FILE, WORK_DIR, UPLOADS_DIR } from "./config";
export { STATES, resolveAssetsPath };
// ID-to-StaticServer map for all potentially active server instances
const servers = {};
const nativeEventEmitter = new NativeEventEmitter(ReactNativeStaticServer);
const LOOPBACK_ADDRESS = "127.0.0.1";
nativeEventEmitter.addListener("RNStaticServer", ({ serverId, event, details }) => {
    const group = servers[serverId];
    if (group) {
        switch (event) {
            case SIGNALS.CRASHED:
                const error = Error(details);
                group.forEach((item) => item._setState(STATES.CRASHED, details, error));
                break;
            default:
                throw Error(`Unexpected signal ${event}`);
        }
    }
});
class StaticServer {
    get errorLog() {
        return this._errorLog || false;
    }
    get fileDir() {
        return this._fileDir;
    }
    get hostname() {
        return this._hostname;
    }
    get id() {
        return this._id;
    }
    get nonLocal() {
        return this._nonLocal;
    }
    get origin() {
        return this._origin;
    }
    get stopInBackground() {
        return this._stopInBackground;
    }
    get port() {
        return this._port;
    }
    get state() {
        return this._state;
    }
    _setState(neu, details = "", error) {
        this._state = neu;
        this._stateChangeEmitter.emit(neu, details, error);
    }
    constructor({ errorLog = false, extraConfig = "", fileDir, hostname, id = Date.now() % 65535, nonLocal = false, port = 0, state = STATES.INACTIVE, stopInBackground = false, webdav, }) {
        this._hostname = "";
        this._origin = "";
        this._stateChangeEmitter = new Emitter();
        this._sem = new Semaphore(true);
        if (errorLog)
            this._errorLog = errorLog === true ? {} : errorLog;
        this._extraConfig = extraConfig;
        this._id = id;
        this._nonLocal = nonLocal;
        this._hostname = hostname || (nonLocal ? "" : LOOPBACK_ADDRESS);
        this._port = port;
        this._stopInBackground = stopInBackground;
        this._state = state;
        if (!fileDir)
            throw Error("`fileDir` MUST BE a non-empty string");
        this._fileDir = resolveAssetsPath(fileDir);
        this._webdav = webdav;
        if (state === STATES.ACTIVE || state === STATES.STARTING)
            this._registerSelf();
    }
    addStateListener(listener) {
        return this._stateChangeEmitter.addListener(listener);
    }
    _configureAppStateHandling() {
        if (this._stopInBackground) {
            if (!this._appStateSub) {
                this._appStateSub = AppState.addEventListener("change", this._handleAppStateChange.bind(this));
            }
        }
        else if (this._appStateSub) {
            this._appStateSub.remove();
            this._appStateSub = undefined;
        }
    }
    async _removeConfigFile() {
        if (this._configPath) {
            const p = this._configPath;
            this._configPath = undefined;
            try {
                await RNBlobUtil.fs.unlink(p);
            }
            catch {
                /* ignore */
            }
        }
    }
    _registerSelf() {
        let group = servers[this._id];
        if (group)
            group.add(this);
        else
            servers[this._id] = new Set([this]);
    }
    _stableStateGuard() {
        if (![STATES.ACTIVE, STATES.CRASHED, STATES.INACTIVE].includes(this._state)) {
            throw Error(`Server is in unstable state ${this._state}`);
        }
    }
    removeAllStateListeners() {
        this._stateChangeEmitter.removeAllListeners();
    }
    removeStateListener(listener) {
        this._stateChangeEmitter.removeListener(listener);
    }
    async start(details) {
        await this._sem.seize();
        this._stableStateGuard();
        if (this._state === STATES.ACTIVE)
            return this._origin;
        this._registerSelf();
        this._setState(STATES.STARTING, details);
        this._configureAppStateHandling();
        if (!this._hostname) {
            this._hostname = await ReactNativeStaticServer.getLocalIpAddress();
        }
        if (!this._port) {
            this._port = await ReactNativeStaticServer.getOpenPort(this._hostname);
        }
        this._origin = `http://${this._hostname}:${this._port}`;
        await this._removeConfigFile();
        this._configPath = await newStandardConfigFile({
            errorLog: this._errorLog,
            extraConfig: this._extraConfig,
            fileDir: this._fileDir,
            hostname: this._hostname,
            port: this._port,
            webdav: this._webdav,
        });
        await ReactNativeStaticServer.start(this._id, this._configPath, this._errorLog ? ERROR_LOG_FILE : "");
        this._setState(STATES.ACTIVE);
        await this._removeConfigFile();
        this._sem.setReady(true);
        return this._origin;
    }
    async _stop(details) {
        await this._sem.seize();
        this._stableStateGuard();
        if (this._state !== STATES.ACTIVE)
            return;
        this._setState(STATES.STOPPING, details);
        await ReactNativeStaticServer.stop();
        this._setState(STATES.INACTIVE);
        const set = servers[this._id];
        set?.delete(this);
        if (!set?.size)
            delete servers[this._id];
        this._sem.setReady(true);
    }
    async stop(details) {
        if (this._appStateSub) {
            this._appStateSub.remove();
            this._appStateSub = undefined;
        }
        await this._stop(details);
    }
    async _handleAppStateChange(appState) {
        const starting = appState === "active" || appState === "inactive";
        try {
            if (starting)
                await this.start("App entered foreground");
            else
                await this._stop("App entered background");
        }
        catch (e) {
            if (!this._stateChangeEmitter.hasListeners)
                throw e;
        }
    }
}
export default StaticServer;
export function getActiveServerSet() {
    return Object.values(servers).find((group) => {
        const server = group.values().next().value;
        const state = server?.state;
        return state !== STATES.INACTIVE && state !== STATES.CRASHED;
    });
}
export function getActiveServer() {
    const set = getActiveServerSet();
    return set?.values().next().value;
}
export const getActiveServerId = ReactNativeStaticServer.getActiveServerId;
