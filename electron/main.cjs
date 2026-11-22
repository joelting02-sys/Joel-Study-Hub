var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// electron/main.ts
var import_electron = require("electron");
var import_path2 = __toESM(require("path"), 1);
var import_os2 = __toESM(require("os"), 1);

// server/storage.ts
var import_fs = __toESM(require("fs"), 1);
var import_os = __toESM(require("os"), 1);
var import_path = __toESM(require("path"), 1);
var import_events = require("events");

// node_modules/chokidar/index.js
var import_node_events = require("node:events");
var import_node_fs2 = require("node:fs");
var import_promises5 = require("node:fs/promises");
var sp6 = __toESM(require("node:path"), 1);

// node_modules/readdirp/index.js
var import_promises = require("node:fs/promises");
var import_node_path = require("node:path");
var import_node_stream = require("node:stream");
var EntryTypes = {
  FILE_TYPE: "files",
  DIR_TYPE: "directories",
  FILE_DIR_TYPE: "files_directories",
  EVERYTHING_TYPE: "all"
};
var defaultOptions = {
  root: ".",
  fileFilter: (_entryInfo) => true,
  directoryFilter: (_entryInfo) => true,
  type: EntryTypes.FILE_TYPE,
  lstat: false,
  depth: 2147483648,
  alwaysStat: false,
  // Throughput is flat from 16 to 65536 (traversal is I/O-bound), but
  // batches of 1024+ entries survive young-gen GC and bloat RSS ~20-60%.
  highWaterMark: 256
};
Object.freeze(defaultOptions);
var RECURSIVE_ERROR_CODE = "READDIRP_RECURSIVE_ERROR";
var NORMAL_FLOW_ERRORS = /* @__PURE__ */ new Set(["ENOENT", "EPERM", "EACCES", "ELOOP", RECURSIVE_ERROR_CODE]);
var ALL_TYPES = [
  EntryTypes.DIR_TYPE,
  EntryTypes.EVERYTHING_TYPE,
  EntryTypes.FILE_DIR_TYPE,
  EntryTypes.FILE_TYPE
];
var DIR_TYPES = /* @__PURE__ */ new Set([
  EntryTypes.DIR_TYPE,
  EntryTypes.EVERYTHING_TYPE,
  EntryTypes.FILE_DIR_TYPE
]);
var FILE_TYPES = /* @__PURE__ */ new Set([
  EntryTypes.EVERYTHING_TYPE,
  EntryTypes.FILE_DIR_TYPE,
  EntryTypes.FILE_TYPE
]);
var isNormalFlowError = (error) => NORMAL_FLOW_ERRORS.has(error.code);
var wantBigintFsStats = process.platform === "win32";
var emptyFn = (_entryInfo) => true;
var normalizeFilter = (filter) => {
  if (filter === void 0)
    return emptyFn;
  if (typeof filter === "function")
    return filter;
  if (typeof filter === "string") {
    const fl = filter.trim();
    return (entry) => entry.basename === fl;
  }
  if (Array.isArray(filter)) {
    const trItems = filter.map((item) => item.trim());
    return (entry) => trItems.some((f) => entry.basename === f);
  }
  return emptyFn;
};
var ReaddirpStream = class extends import_node_stream.Readable {
  /**
   * Directories discovered but not yet emitted from. Listings are read
   * lazily (on pop, plus one prefetch) instead of eagerly on discovery:
   * keeping whole listings for every queued dir balloons RAM on wide trees.
   */
  parents;
  reading;
  parent;
  _stat;
  _maxDepth;
  _wantsDir;
  _wantsFile;
  _wantsEverything;
  _root;
  _isDirent;
  _statsProp;
  _rdOptions;
  _fileFilter;
  _directoryFilter;
  _relStart;
  constructor(options = {}) {
    super({
      objectMode: true,
      autoDestroy: true,
      highWaterMark: options.highWaterMark ?? defaultOptions.highWaterMark
    });
    const opts = { ...defaultOptions, ...options };
    const root = opts.root ?? defaultOptions.root;
    const type = opts.type ?? defaultOptions.type;
    this._fileFilter = normalizeFilter(opts.fileFilter);
    this._directoryFilter = normalizeFilter(opts.directoryFilter);
    const statMethod = opts.lstat ? import_promises.lstat : import_promises.stat;
    if (wantBigintFsStats) {
      this._stat = (path3) => statMethod(path3, { bigint: true });
    } else {
      this._stat = statMethod;
    }
    this._maxDepth = opts.depth != null && Number.isSafeInteger(opts.depth) ? opts.depth : defaultOptions.depth;
    this._wantsDir = DIR_TYPES.has(type);
    this._wantsFile = FILE_TYPES.has(type);
    this._wantsEverything = type === EntryTypes.EVERYTHING_TYPE;
    this._root = (0, import_node_path.resolve)(root);
    this._relStart = this._root.endsWith(import_node_path.sep) ? this._root.length : this._root.length + 1;
    this._isDirent = !opts.alwaysStat;
    this._statsProp = this._isDirent ? "dirent" : "stats";
    this._rdOptions = { encoding: "utf8", withFileTypes: this._isDirent };
    const rootDir = { path: this._root, depth: 1 };
    rootDir.pending = this._exploreDir(this._root, 1);
    this.parents = [rootDir];
    this.reading = false;
    this.parent = void 0;
  }
  async _read(batch) {
    if (this.reading)
      return;
    this.reading = true;
    try {
      while (!this.destroyed && batch > 0) {
        const par = this.parent;
        const fil = par && par.files;
        if (fil && fil.length > 0) {
          const { path: path3, depth } = par;
          const slice = fil.splice(0, batch).map((dirent) => this._formatEntry(dirent, path3));
          const awaited = this._isDirent ? slice : await Promise.all(slice);
          for (const entry of awaited) {
            if (!entry)
              continue;
            if (this.destroyed)
              return;
            let entryType = this._getEntryType(entry);
            if (typeof entryType !== "string")
              entryType = await entryType;
            if (entryType === "directory" && this._directoryFilter(entry)) {
              if (depth <= this._maxDepth) {
                this.parents.push({ path: entry.fullPath, depth: depth + 1 });
              }
              if (this._wantsDir) {
                this.push(entry);
                batch--;
              }
            } else if ((entryType === "file" || this._includeAsFile(entry)) && this._fileFilter(entry)) {
              if (this._wantsFile) {
                this.push(entry);
                batch--;
              }
            }
          }
        } else {
          const parent = this.parents.pop();
          if (!parent) {
            this.push(null);
            break;
          }
          const dir = parent.pending ?? this._exploreDir(parent.path, parent.depth);
          const next = this.parents[this.parents.length - 1];
          if (next && !next.pending) {
            next.pending = this._exploreDir(next.path, next.depth);
          }
          this.parent = await dir;
          if (this.destroyed)
            return;
        }
      }
    } catch (error) {
      this.destroy(error);
    } finally {
      this.reading = false;
    }
  }
  // NOTE: native `readdir(path, { recursive: true })` was evaluated as a
  // replacement for this per-directory traversal and rejected:
  // - Not faster: node implements it in JS, walking directories sequentially
  //   just like this loop, but with extra path bookkeeping. Benchmarks
  //   (node 24): ~10% slower on wide trees, ~40% slower on small ones,
  //   parity on deep ones.
  // - Much more RAM: it buffers the entire subtree listing in one array,
  //   instead of one directory at a time, defeating streaming.
  // - Semantics diverge: it can't limit depth, can't skip directories a
  //   directoryFilter rejects, doesn't follow symlinked dirs, and fails
  //   wholesale (all entries lost) if anything in the subtree is unreadable,
  //   instead of emitting a 'warn' and continuing.
  async _exploreDir(path3, depth) {
    let files;
    try {
      files = await (0, import_promises.readdir)(path3, this._rdOptions);
    } catch (error) {
      this._onError(error);
    }
    return { files, depth, path: path3 };
  }
  // Synchronous in dirent mode; returns a promise only when stats are needed.
  _formatEntry(dirent, path3) {
    const basename5 = this._isDirent ? dirent.name : dirent;
    const fullPath = (0, import_node_path.join)(path3, basename5);
    const entry = { path: fullPath.slice(this._relStart), fullPath, basename: basename5 };
    if (this._isDirent) {
      entry.dirent = dirent;
      return entry;
    }
    return this._stat(fullPath).then((stats) => {
      entry.stats = stats;
      return entry;
    }, (err) => {
      this._onError(err);
      return void 0;
    });
  }
  _onError(err) {
    if (isNormalFlowError(err) && !this.destroyed) {
      this.emit("warn", err);
    } else {
      this.destroy(err);
    }
  }
  // Synchronous for regular files and directories; returns a promise only for
  // symlinks, which need realpath() to be classified.
  _getEntryType(entry) {
    if (!entry || !(this._statsProp in entry)) {
      return "";
    }
    const stats = entry[this._statsProp];
    if (stats.isFile())
      return "file";
    if (stats.isDirectory())
      return "directory";
    if (stats.isSymbolicLink())
      return this._getSymlinkEntryType(entry);
    return "";
  }
  async _getSymlinkEntryType(entry) {
    const full = entry.fullPath;
    try {
      const entryRealPath = await (0, import_promises.realpath)(full);
      const entryRealPathStats = await (0, import_promises.lstat)(entryRealPath);
      if (entryRealPathStats.isFile()) {
        return "file";
      }
      if (entryRealPathStats.isDirectory()) {
        const len = entryRealPath.length;
        if (full.startsWith(entryRealPath) && full[len] === import_node_path.sep) {
          const recursiveError = new Error(`Circular symlink detected: "${full}" points to "${entryRealPath}"`);
          recursiveError.code = RECURSIVE_ERROR_CODE;
          this._onError(recursiveError);
          return "";
        }
        return "directory";
      }
    } catch (error) {
      this._onError(error);
    }
    return "";
  }
  _includeAsFile(entry) {
    const stats = entry && entry[this._statsProp];
    return stats && this._wantsEverything && !stats.isDirectory();
  }
};
function readdirp(root, options = {}) {
  let type = options.entryType || options.type;
  if (type === "both")
    type = EntryTypes.FILE_DIR_TYPE;
  if (!root) {
    throw new Error("readdirp: root argument is required. Usage: readdirp(root, options)");
  } else if (typeof root !== "string") {
    throw new TypeError("readdirp: root argument must be a string. Usage: readdirp(root, options)");
  } else if (type && !ALL_TYPES.includes(type)) {
    throw new Error(`readdirp: Invalid type passed. Use one of ${ALL_TYPES.join(", ")}`);
  }
  const opts = { ...options, root };
  if (type)
    opts.type = type;
  return new ReaddirpStream(opts);
}

// node_modules/chokidar/backend.js
var import_node_fs = require("node:fs");
var import_promises2 = require("node:fs/promises");
var sp2 = __toESM(require("node:path"), 1);

// node_modules/chokidar/runtime.js
var import_node_os = require("node:os");
var sp = __toESM(require("node:path"), 1);
var platform = process.platform;
var isWindows = platform === "win32";
var isMacos = platform === "darwin";
var isLinux = platform === "linux";
var isIBMi = (0, import_node_os.type)() === "OS400";
function errorCode(error) {
  return error?.code;
}
function classifyError(error) {
  const code = errorCode(error);
  if (code === "ENOENT" || code === "ENOTDIR")
    return "missing";
  if (code === "EPERM" || code === "EACCES")
    return "permission";
  if (code === "ERR_FEATURE_UNAVAILABLE_ON_PLATFORM")
    return "recursive-unsupported";
  return "other";
}
function isMissingError(error) {
  return classifyError(error) === "missing";
}
function isPermissionError(error) {
  return classifyError(error) === "permission";
}
function isRecursiveWatchUnsupported(error) {
  return classifyError(error) === "recursive-unsupported";
}
var systemScheduler = Object.freeze({
  now: () => Date.now(),
  setTimeout: (callback, delay) => setTimeout(callback, delay),
  clearTimeout: (timer) => {
    if (timer)
      clearTimeout(timer);
  }
});
var EVENTS = {
  ALL: "all",
  READY: "ready",
  ADD: "add",
  CHANGE: "change",
  ADD_DIR: "addDir",
  UNLINK: "unlink",
  UNLINK_DIR: "unlinkDir",
  RAW: "raw",
  ERROR: "error"
};
var BACK_SLASH_RE = /\\/g;
var DOUBLE_SLASH_RE = /\/\//g;
function normalizePath(path3) {
  if (typeof path3 !== "string")
    throw new TypeError("string expected");
  const unix = path3.replace(BACK_SLASH_RE, "/");
  const unc = unix.startsWith("//");
  let normalized = sp.normalize(unix).replace(BACK_SLASH_RE, "/").replace(DOUBLE_SLASH_RE, "/");
  if (unc && !normalized.startsWith("//"))
    normalized = `/${normalized}`;
  return normalized;
}
function statIdentity(stats) {
  if (typeof stats.mtimeMs !== "bigint")
    return stats;
  const big = stats;
  const sec = big.mtimeNs / 1000000000n;
  const nsec = big.mtimeNs % 1000000000n;
  const mtimeMs = Number(sec) * 1e3 + Number(nsec) / 1e6;
  return { size: Number(big.size), mtimeMs, ino: Number(big.ino) };
}
function logicalPathKey(path3) {
  const resolved = sp.resolve(path3);
  return isWindows || !resolved.includes("\\") ? resolved.replace(BACK_SLASH_RE, "/") : normalizePath(resolved);
}
function isInsideRelativePath(relative6) {
  return relative6 !== ".." && !relative6.startsWith(`..${sp.sep}`) && !sp.isAbsolute(relative6);
}
function isSameOrInside(root, candidate) {
  const relative6 = sp.relative(root, candidate);
  return relative6 === "" || isInsideRelativePath(relative6);
}
function isStrictlyInside(root, candidate) {
  const relative6 = sp.relative(root, candidate);
  return relative6 !== "" && isInsideRelativePath(relative6);
}
function isMatcherObject(matcher) {
  return typeof matcher === "object" && matcher !== null && !(matcher instanceof RegExp);
}
function cloneOwnedMatcher(matcher) {
  if (matcher instanceof RegExp)
    return new RegExp(matcher.source, matcher.flags);
  if (isMatcherObject(matcher))
    return Object.freeze({ ...matcher });
  return matcher;
}
function compileMatcher(matcher) {
  if (typeof matcher === "function")
    return matcher;
  if (typeof matcher === "string")
    return (candidate) => matcher === candidate;
  if (matcher instanceof RegExp) {
    return (candidate) => {
      matcher.lastIndex = 0;
      return matcher.test(candidate);
    };
  }
  if (isMatcherObject(matcher)) {
    return (candidate) => matcher.path === candidate || Boolean(matcher.recursive && isStrictlyInside(matcher.path, candidate));
  }
  return () => false;
}
function compileMatchers(matchers) {
  const patterns = matchers.map(compileMatcher);
  return (candidate, stats) => {
    if (patterns.length === 0)
      return false;
    const normalized = normalizePath(candidate);
    return patterns.some((pattern) => pattern(normalized, stats));
  };
}
function normalizeMatcher(matcher, cwd = process.cwd()) {
  if (typeof matcher === "string") {
    return normalizePath(sp.isAbsolute(matcher) ? matcher : sp.join(cwd, matcher));
  }
  if (isMatcherObject(matcher)) {
    return {
      path: normalizePath(sp.isAbsolute(matcher.path) ? matcher.path : sp.join(cwd, matcher.path)),
      recursive: matcher.recursive
    };
  }
  return matcher;
}
var REPLACER_RE = /^\.[/\\]/;
var WatchHelper = class _WatchHelper {
  watchPath;
  followSymlinks;
  recursiveRoot;
  recursiveDisabled;
  observationTrigger;
  realpathAncestry;
  pathGeneration;
  context;
  constructor(path3, follow, context) {
    this.context = context;
    this.watchPath = path3.replace(REPLACER_RE, "");
    this.followSymlinks = follow;
    this.realpathAncestry = /* @__PURE__ */ new Set();
    this.pathGeneration = context.capturePathGeneration();
  }
  fork(path3) {
    const helper = new _WatchHelper(path3, this.followSymlinks, this.context);
    helper.recursiveRoot = this.recursiveRoot;
    helper.recursiveDisabled = this.recursiveDisabled;
    helper.observationTrigger = this.observationTrigger;
    helper.realpathAncestry = new Set(this.realpathAncestry);
    helper.pathGeneration = this.pathGeneration;
    return helper;
  }
  withObservation(trigger) {
    const helper = Object.create(this);
    helper.observationTrigger = trigger;
    return helper;
  }
  filterPath(entry) {
    return entry.stats?.isSymbolicLink() ? this.filterDir(entry) : this.context.isntIgnored(sp.join(this.watchPath, entry.path), entry.stats);
  }
  filterDir(entry) {
    return this.context.isntIgnored(sp.join(this.watchPath, entry.path), entry.stats);
  }
};

// node_modules/chokidar/backend.js
var nextGeneration = 0;
function allocateSharedResourceGeneration() {
  return ++nextGeneration;
}
function attachSharedSubscriber(resource, subscriber) {
  if (resource.closed)
    return false;
  resource.subscribers.add(subscriber);
  return true;
}
function detachSharedSubscriber(resource, subscriber) {
  if (resource.closed || !resource.subscribers.delete(subscriber))
    return;
  return resource.subscribers.size > 0 ? "remaining" : "last";
}
function invalidateSharedResource(resource) {
  if (resource.closed)
    return;
  resource.closed = true;
  const subscribers = [...resource.subscribers];
  resource.subscribers.clear();
  return subscribers;
}
function reconfigureWatcherPersistence(resource) {
  const persistent = [...resource.subscribers].some((subscriber) => subscriber.persistent);
  if (persistent)
    resource.watcher.ref();
  else
    resource.watcher.unref();
}
function invalidateWatcherResource(resource, registry) {
  const subscribers = invalidateSharedResource(resource);
  if (!subscribers)
    return;
  if (registry.get(resource.resource) === resource)
    registry.delete(resource.resource);
  resource.watcher.close();
  return subscribers;
}
function attachWatcherSubscriber(resource, subscriber) {
  attachSharedSubscriber(resource, subscriber);
  reconfigureWatcherPersistence(resource);
}
function createWatcherSubscription(resource, subscriber, registry) {
  let closed = false;
  return {
    resource: resource.resource,
    close: () => {
      if (closed)
        return;
      closed = true;
      const remaining = detachSharedSubscriber(resource, subscriber);
      if (remaining === "remaining")
        reconfigureWatcherPersistence(resource);
      else if (remaining === "last" && registry.get(resource.resource) === resource) {
        invalidateWatcherResource(resource, registry);
      }
    }
  };
}
function selectBackend(options) {
  const preferRecursive = options.backend === "native-recursive" || options.backend === "auto" && (isMacos || isWindows);
  const kind = options.backend === "polling" ? "polling" : preferRecursive && options.depth === void 0 ? "native-recursive-preferred" : "native-per-directory";
  return Object.freeze({
    kind,
    polling: kind === "polling",
    recursive: kind === "native-recursive-preferred",
    perDirectory: kind === "native-per-directory"
  });
}
var EV = EVENTS;
var POLL_DIRECTORY_RECHECK_DELAY = 1e3;
function backendNow() {
  return performance.now();
}
function toNativeWatchPath(path3) {
  const nativePath = sp2.normalize(path3);
  if (!isWindows)
    return nativePath;
  try {
    return import_node_fs.realpathSync.native(nativePath);
  } catch {
    return nativePath;
  }
}
function projectNativeRelativePath(nativeRoot, relativePath) {
  if (!isWindows || relativePath === null || !sp2.isAbsolute(relativePath))
    return relativePath;
  const root = sp2.normalize(sp2.toNamespacedPath(nativeRoot));
  const candidate = sp2.normalize(sp2.toNamespacedPath(relativePath));
  const projected = sp2.relative(root, candidate);
  if (!isSameOrInside(root, candidate))
    return relativePath;
  return projected || null;
}
var FsWatchInstances = /* @__PURE__ */ new Map();
function systemNativeWatchFactory(path3, options, listener) {
  return (0, import_node_fs.watch)(path3, options, listener);
}
var nativeWatchFactory = systemNativeWatchFactory;
var RecursiveWatchInstances = /* @__PURE__ */ new Map();
var recursiveWatchUnsupported = false;
function systemRecursiveWatchFactory(path3, options, listener) {
  return (0, import_node_fs.watch)(path3, options, listener);
}
var recursiveWatchFactory = systemRecursiveWatchFactory;
function failRecursiveResource(resource, error) {
  const subscribers = invalidateWatcherResource(resource, RecursiveWatchInstances);
  if (!subscribers)
    return;
  subscribers.forEach((subscriber) => subscriber.failure(error));
}
function subscribeRecursiveNative(path3, persistent, handlers, signal) {
  if (recursiveWatchUnsupported)
    return { kind: "unsupported" };
  const resourceKey = sp2.resolve(path3);
  const subscriber = {
    ...handlers,
    watchedPath: path3,
    persistent
  };
  let resource = RecursiveWatchInstances.get(resourceKey);
  if (!resource) {
    let watcher;
    let created;
    const nativePath = toNativeWatchPath(path3);
    try {
      watcher = recursiveWatchFactory(nativePath, { persistent, recursive: true }, (rawEvent, relativePath) => {
        const active = created;
        if (!active || active.closed)
          return;
        if (RecursiveWatchInstances.get(resourceKey) !== active)
          return;
        const trigger = {
          kind: "native",
          resource: resourceKey,
          rawEvent,
          relativePath: projectNativeRelativePath(nativePath, relativePath),
          sequence: ++active.sequence,
          observedAt: backendNow()
        };
        active.subscribers.forEach((current) => {
          current.rawEmitter(rawEvent, relativePath, { watchedPath: current.watchedPath });
          current.publish(trigger);
        });
      });
    } catch (error) {
      if (isRecursiveWatchUnsupported(error)) {
        recursiveWatchUnsupported = true;
        return { kind: "unsupported" };
      }
      return { kind: "failed", error };
    }
    created = resource = {
      resource: resourceKey,
      generation: allocateSharedResourceGeneration(),
      subscribers: /* @__PURE__ */ new Set(),
      closed: false,
      watcher,
      sequence: 0
    };
    RecursiveWatchInstances.set(resourceKey, resource);
    watcher.on(EV.ERROR, (error) => failRecursiveResource(resource, error));
  }
  attachWatcherSubscriber(resource, subscriber);
  const subscription = createWatcherSubscription(resource, subscriber, RecursiveWatchInstances);
  if (signal.aborted)
    void subscription.close();
  return { kind: "subscribed", subscription };
}
function createFsWatchInstance(path3, options, listener, errHandler) {
  try {
    return nativeWatchFactory(path3, {
      persistent: options.persistent
    }, listener);
  } catch (error) {
    errHandler(error);
    return void 0;
  }
}
function publishNativeTrigger(cont, rawEvent, relativePath, emitRaw, rawRelativePath = relativePath) {
  if (cont.closed || FsWatchInstances.get(cont.resource) !== cont)
    return;
  const trigger = {
    kind: "native",
    resource: cont.resource,
    rawEvent,
    relativePath,
    sequence: ++cont.sequence,
    observedAt: backendNow()
  };
  cont.subscribers.forEach((subscriber) => {
    if (emitRaw) {
      subscriber.rawEmitter(rawEvent, rawRelativePath, { watchedPath: subscriber.watchedPath });
    }
    subscriber.publish(trigger);
  });
}
function broadcastNativeError(cont, error) {
  if (cont.closed || FsWatchInstances.get(cont.resource) !== cont)
    return;
  cont.subscribers.forEach((subscriber) => subscriber.errHandler(error));
}
function closeFailedNativeResource(cont, error) {
  const subscribers = invalidateWatcherResource(cont, FsWatchInstances);
  subscribers?.forEach((subscriber) => subscriber.failure?.(error));
}
async function handleNativeError(path3, cont, error) {
  if (isWindows && error.code === "EPERM") {
    try {
      const fd = await (0, import_promises2.open)(path3, "r");
      await fd.close();
      broadcastNativeError(cont, error);
    } catch {
      publishNativeTrigger(cont, "rename", null, false);
    }
  } else {
    broadcastNativeError(cont, error);
  }
  closeFailedNativeResource(cont, error);
}
async function retireIfSelfRemoved(cont, nativePath) {
  try {
    await (0, import_promises2.lstat)(sp2.join(nativePath, sp2.basename(nativePath)));
    return;
  } catch (error) {
    if (!isMissingError(error))
      return;
  }
  try {
    if (!(await (0, import_promises2.stat)(nativePath)).isDirectory())
      return;
  } catch {
    return;
  }
  if (cont.closed || FsWatchInstances.get(cont.resource) !== cont)
    return;
  closeFailedNativeResource(cont, new Error(`Watched directory was replaced: ${nativePath}`));
}
function createNativeContainer(path3, nativePath, resourceKey, options, subscriber) {
  let cont;
  const watcher = createFsWatchInstance(nativePath, options, (rawEvent, relativePath) => {
    const projectedPath = projectNativeRelativePath(nativePath, relativePath);
    publishNativeTrigger(cont, rawEvent, projectedPath, true, relativePath);
    if (isLinux && rawEvent === "rename" && relativePath === sp2.basename(nativePath)) {
      void retireIfSelfRemoved(cont, nativePath);
    }
  }, subscriber.errHandler);
  if (!watcher)
    return;
  cont = {
    resource: resourceKey,
    generation: allocateSharedResourceGeneration(),
    subscribers: /* @__PURE__ */ new Set([subscriber]),
    closed: false,
    watcher,
    sequence: 0
  };
  FsWatchInstances.set(resourceKey, cont);
  watcher.on(EV.ERROR, (error) => {
    void handleNativeError(path3, cont, error);
  });
  return cont;
}
function setFsWatchListener(path3, fullPath, options, handlers, signal) {
  const resourceKey = fullPath;
  const subscriber = {
    ...handlers,
    watchedPath: path3,
    persistent: options.persistent ?? true
  };
  let cont = FsWatchInstances.get(resourceKey);
  if (cont) {
    attachWatcherSubscriber(cont, subscriber);
  } else {
    cont = createNativeContainer(path3, toNativeWatchPath(path3), resourceKey, options, subscriber);
    if (!cont)
      return;
  }
  const subscription = createWatcherSubscription(cont, subscriber, FsWatchInstances);
  if (signal.aborted) {
    void subscription.close();
    return;
  }
  return subscription;
}
var MISSING_POLL_OBSERVATION = Object.freeze({ missing: true });
var PollingInstances = /* @__PURE__ */ new Map();
function isMissingObservation(observation) {
  return "missing" in observation;
}
function observationsDiffer(previous, current) {
  const previousMissing = isMissingObservation(previous);
  const currentMissing = isMissingObservation(current);
  if (previousMissing || currentMissing)
    return previousMissing !== currentMissing;
  const reliableInodeChanged = !isWindows && previous.ino !== 0 && current.ino !== 0 && previous.ino !== current.ino;
  return previous.size !== current.size || previous.mtimeMs !== current.mtimeMs || reliableInodeChanged;
}
function setTimerPersistence(resource) {
  if (!resource.timer)
    return;
  if (resource.persistent)
    resource.timer.ref();
  else
    resource.timer.unref();
}
function schedulePoll(resource, delay = resource.interval) {
  if (resource.closed || resource.subscribers.size === 0)
    return;
  resource.timer = resource.scheduler.setTimeout(() => {
    resource.timer = void 0;
    const currentPoll = pollResource(resource);
    resource.currentPoll = currentPoll;
    void currentPoll.then(() => {
      if (resource.currentPoll === currentPoll)
        resource.currentPoll = void 0;
    }, () => {
      if (resource.currentPoll === currentPoll)
        resource.currentPoll = void 0;
    });
  }, delay);
  setTimerPersistence(resource);
}
async function pollResource(resource) {
  if (resource.closed || resource.running || resource.subscribers.size === 0)
    return;
  resource.running = true;
  const startedAt = resource.scheduler.now();
  let current;
  try {
    current = await (0, import_promises2.stat)(resource.resource);
  } catch (error) {
    if (isMissingError(error)) {
      current = MISSING_POLL_OBSERVATION;
    } else {
      resource.subscribers.forEach((subscriber) => subscriber.errHandler(error));
    }
  }
  if (!resource.closed && current) {
    const previous = resource.previous;
    resource.previous = current;
    const now = resource.scheduler.now();
    const changed = previous && observationsDiffer(previous, current);
    const directoryReplayDue = resource.directoryReplayAt !== void 0 && now >= resource.directoryReplayAt;
    if (!isMissingObservation(current) && current.isDirectory()) {
      if (changed)
        resource.directoryReplayAt = now + POLL_DIRECTORY_RECHECK_DELAY;
      else if (directoryReplayDue)
        resource.directoryReplayAt = void 0;
    } else {
      resource.directoryReplayAt = void 0;
    }
    if (previous && (changed || directoryReplayDue)) {
      const trigger = {
        kind: "poll",
        resource: resource.resource,
        current,
        previous,
        sequence: ++resource.sequence,
        observedAt: resource.scheduler.now()
      };
      resource.subscribers.forEach((subscriber) => {
        subscriber.rawEmitter(EV.CHANGE, resource.resource, { current, previous });
        subscriber.publish(trigger);
      });
    }
  }
  resource.running = false;
  if (!resource.closed && resource.subscribers.size > 0) {
    const elapsed = resource.scheduler.now() - startedAt;
    schedulePoll(resource, Math.max(0, resource.interval - elapsed));
  }
}
function reconfigurePollResource(resource) {
  if (resource.closed || resource.subscribers.size === 0)
    return;
  const interval = Math.min(...[...resource.subscribers].map((subscriber) => subscriber.interval));
  const persistent = [...resource.subscribers].some((subscriber) => subscriber.persistent);
  const intervalChanged = resource.interval !== interval;
  resource.interval = interval;
  resource.persistent = persistent;
  if (resource.timer && intervalChanged) {
    resource.scheduler.clearTimeout(resource.timer);
    resource.timer = void 0;
    schedulePoll(resource);
  } else if (resource.timer) {
    setTimerPersistence(resource);
  } else if (!resource.running) {
    schedulePoll(resource);
  }
}
function setPollingListener(path3, fullPath, options, scheduler, handlers, initialStats, signal) {
  const resourceKey = fullPath;
  const subscriber = { watchedPath: path3, ...options, ...handlers };
  let resources = PollingInstances.get(resourceKey);
  if (!resources) {
    resources = /* @__PURE__ */ new Map();
    PollingInstances.set(resourceKey, resources);
  }
  let resource = resources.get(scheduler);
  if (!resource) {
    resource = {
      resource: resourceKey,
      generation: allocateSharedResourceGeneration(),
      scheduler,
      subscribers: /* @__PURE__ */ new Set(),
      interval: options.interval,
      persistent: options.persistent,
      previous: initialStats,
      running: false,
      closed: false,
      sequence: 0
    };
    resources.set(scheduler, resource);
  } else if (!resource.previous && initialStats) {
    resource.previous = initialStats;
  }
  resource.subscribers.add(subscriber);
  reconfigurePollResource(resource);
  let closed = false;
  let closePromise;
  const subscription = {
    resource: resourceKey,
    close: () => {
      if (closePromise)
        return closePromise;
      closePromise = (async () => {
        if (closed)
          return;
        closed = true;
        resource.subscribers.delete(subscriber);
        if (resource.subscribers.size > 0) {
          reconfigurePollResource(resource);
          return;
        }
        if (resource.closed)
          return;
        resource.closed = true;
        if (resource.timer)
          resource.scheduler.clearTimeout(resource.timer);
        resource.timer = void 0;
        const currentResources = PollingInstances.get(resourceKey);
        if (currentResources?.get(scheduler) === resource) {
          currentResources.delete(scheduler);
          if (currentResources.size === 0)
            PollingInstances.delete(resourceKey);
        }
        if (resource.currentPoll) {
          await Promise.allSettled([resource.currentPoll]);
        }
      })();
      return closePromise;
    }
  };
  if (signal.aborted) {
    void subscription.close();
    return;
  }
  return subscription;
}

// node_modules/chokidar/policy.js
var import_promises3 = require("node:fs/promises");
var sp4 = __toESM(require("node:path"), 1);

// node_modules/chokidar/tree.js
var sp3 = __toESM(require("node:path"), 1);
var LifecycleScope = class {
  state = "OPEN";
  generation = 0;
  abortController = new AbortController();
  tasks = /* @__PURE__ */ new Set();
  closers = /* @__PURE__ */ new Map();
  onTaskSettled;
  onTaskError;
  constructor(onTaskSettled, onTaskError) {
    this.onTaskSettled = onTaskSettled;
    this.onTaskError = onTaskError;
  }
  isActive(generation) {
    return this.state === "OPEN" && this.generation === generation;
  }
  track(task) {
    const tracked = Promise.resolve(task).finally(() => {
      this.tasks.delete(tracked);
      this.onTaskSettled();
    });
    this.tasks.add(tracked);
    void tracked.catch(this.onTaskError);
    return tracked;
  }
  addCloser(key, closer) {
    const existing = this.closers.get(key);
    if (existing)
      existing.push(closer);
    else
      this.closers.set(key, [closer]);
  }
  takeClosers(key) {
    const closers = this.closers.get(key) ?? [];
    this.closers.delete(key);
    return closers;
  }
  beginClose() {
    if (this.state !== "OPEN")
      return [];
    this.state = "CLOSING";
    this.generation += 1;
    this.abortController.abort();
    const closing = [];
    this.closers.forEach((closers) => {
      closers.forEach((closer) => {
        try {
          closing.push(Promise.resolve(closer()));
        } catch (error) {
          closing.push(Promise.reject(error));
        }
      });
    });
    this.closers.clear();
    return closing;
  }
  async drain() {
    while (this.tasks.size > 0) {
      await Promise.allSettled([...this.tasks]);
    }
  }
  finishClose() {
    this.state = "CLOSED";
  }
};
function IGNORE_RECONCILIATION_ERROR() {
}
function resolveRecursiveCandidate(root, relativePath) {
  if (sp3.isAbsolute(relativePath))
    return;
  const absoluteRoot = sp3.resolve(root);
  const absoluteCandidate = sp3.resolve(absoluteRoot, relativePath);
  if (!isSameOrInside(absoluteRoot, absoluteCandidate))
    return;
  return sp3.join(root, relativePath);
}
var ReconciliationQueue = class {
  queues = /* @__PURE__ */ new Map();
  pending = /* @__PURE__ */ new Map();
  lifecycle;
  constructor(lifecycle) {
    this.lifecycle = lifecycle;
  }
  enqueue(scope, work, coalescePath = scope) {
    const key = logicalPathKey(scope);
    const pendingKey = coalescePath === false ? void 0 : `${key}\0${logicalPathKey(coalescePath)}`;
    const existing = pendingKey ? this.pending.get(pendingKey) : void 0;
    if (existing) {
      existing.work = work;
      existing.replay = true;
      return existing.promise;
    }
    const generation = this.lifecycle.generation;
    const reconciliation = {
      promise: Promise.resolve(),
      work,
      replay: false
    };
    const previous = this.queues.get(key) ?? Promise.resolve();
    const task = previous.catch(IGNORE_RECONCILIATION_ERROR).then(async () => {
      do {
        const currentWork = reconciliation.work;
        reconciliation.replay = false;
        if (!this.lifecycle.isActive(generation))
          return;
        await currentWork();
      } while (reconciliation.replay);
    }).finally(() => {
      if (this.queues.get(key) === task)
        this.queues.delete(key);
      if (pendingKey && this.pending.get(pendingKey) === reconciliation) {
        this.pending.delete(pendingKey);
      }
    });
    this.queues.set(key, task);
    const tracked = this.lifecycle.track(task);
    reconciliation.promise = tracked;
    if (pendingKey)
      this.pending.set(pendingKey, reconciliation);
    return tracked;
  }
  forgetPending(predicate) {
    for (const key of this.pending.keys()) {
      const [scope, candidate] = key.split("\0", 2);
      if (predicate(scope, candidate))
        this.pending.delete(key);
    }
  }
  clear() {
    this.queues.clear();
    this.pending.clear();
  }
};
var CURRENT = ".";
var PARENT = "..";
var RECURSIVE_CREATE_BURST_WINDOW = 25;
var RECURSIVE_WRITE_BURST_WINDOW = 10;
var INITIAL_OBSERVATION_FACT = Object.freeze({
  size: 0,
  mtimeMs: 0,
  ino: 0,
  kind: "other",
  initialRecursive: true
});
function statKind(stats) {
  return stats.isSymbolicLink() ? "symlink" : stats.isDirectory() ? "directory" : stats.isFile() ? "file" : "other";
}
function sameStatFact(fact, stats) {
  const current = statIdentity(stats);
  return fact?.size === current.size && fact.mtimeMs === current.mtimeMs && fact.ino === current.ino && fact.kind === statKind(stats);
}
function withinWindow(fact, trigger, window) {
  return fact?.observedAt !== void 0 && trigger.observedAt >= fact.observedAt && trigger.observedAt - fact.observedAt <= window;
}
var DirEntry = class {
  path;
  items = /* @__PURE__ */ new Set();
  constructor(dir) {
    this.path = dir;
  }
  add(item) {
    if (item !== CURRENT && item !== PARENT && item !== "")
      this.items.add(item);
  }
  /** Returns true when removing `item` left the directory empty. */
  remove(item) {
    return this.items.delete(item) && this.items.size === 0;
  }
  has(item) {
    return this.items.has(item);
  }
  getChildren() {
    return [...this.items];
  }
  dispose() {
    this.items.clear();
    this.path = "";
  }
};
var TreeState = class {
  watched = /* @__PURE__ */ new Map();
  observed = /* @__PURE__ */ new Map();
  symlinkPaths = /* @__PURE__ */ new Map();
  recursiveRoots = /* @__PURE__ */ new Set();
  observesNative;
  constructor(observesNative) {
    this.observesNative = observesNative;
  }
  getDirectory(directory) {
    const dir = sp3.resolve(directory);
    const key = logicalPathKey(dir);
    let entry = this.watched.get(key);
    if (!entry) {
      entry = new DirEntry(dir);
      this.watched.set(key, entry);
    }
    return entry;
  }
  /** Looks up a directory entry without creating one. */
  peekDirectory(directory) {
    return this.watched.get(logicalPathKey(sp3.resolve(directory)));
  }
  recordObserved(path3, stats, transition, trigger, initialRecursive = false, retainWithoutTrigger = false) {
    if (!this.observesNative())
      return;
    if (!trigger && !initialRecursive && !retainWithoutTrigger)
      return;
    const { size, mtimeMs, ino } = statIdentity(stats);
    this.observed.set(logicalPathKey(path3), {
      size,
      mtimeMs,
      ino,
      kind: statKind(stats),
      transition,
      rawEvent: trigger?.rawEvent,
      relativePath: trigger?.relativePath,
      observedAt: trigger?.observedAt,
      initialRecursive
    });
  }
  consumeInitialCreate(path3, stats, trigger, ignoreInitial) {
    const previous = this.observed.get(logicalPathKey(path3));
    if (!previous?.initialRecursive || trigger.rawEvent !== "rename")
      return;
    this.recordObserved(path3, stats, "add", trigger);
    if (!ignoreInitial)
      return false;
    return stats.isDirectory() ? EVENTS.ADD_DIR : EVENTS.ADD;
  }
  markInitialCreate(path3) {
    const key = logicalPathKey(path3);
    const fact = this.observed.get(key);
    if (fact)
      fact.initialRecursive = true;
    else
      this.observed.set(key, { ...INITIAL_OBSERVATION_FACT });
  }
  clearInitialCreate(path3) {
    const fact = this.observed.get(logicalPathKey(path3));
    if (fact)
      fact.initialRecursive = false;
  }
  clearInitialCreates(root) {
    const rootKey = logicalPathKey(root);
    for (const [path3, fact] of this.observed) {
      if (isSameOrInside(rootKey, path3) && fact.initialRecursive)
        fact.initialRecursive = false;
    }
  }
  /** True when a tracked directory path now names a different directory inode. */
  replacedSinceObserved(path3, stats) {
    const previous = this.observed.get(logicalPathKey(path3));
    const { ino } = statIdentity(stats);
    return previous?.kind === "directory" && stats.isDirectory() && previous.ino !== 0 && ino !== 0 && previous.ino !== ino;
  }
  /** True when `stats` no longer matches a recorded fact of the same kind. */
  changedSinceObserved(path3, stats) {
    const previous = this.observed.get(logicalPathKey(path3));
    return previous !== void 0 && previous.kind === statKind(stats) && !sameStatFact(previous, stats);
  }
  isDuplicateObservation(path3, stats, trigger) {
    const previous = this.observed.get(logicalPathKey(path3));
    const sameFact = sameStatFact(previous, stats);
    const duplicateCreate = sameFact && previous?.transition === "add" && previous?.relativePath === trigger.relativePath && previous.rawEvent === "rename" && trigger.rawEvent === "change" && withinWindow(previous, trigger, RECURSIVE_CREATE_BURST_WINDOW);
    const duplicateUnchanged = sameFact && stats.isFile() && !previous?.initialRecursive && (previous?.transition === "add" || trigger.relativePath === null);
    const duplicateWrite = sameFact && previous?.transition === "change" && previous.relativePath === trigger.relativePath && withinWindow(previous, trigger, RECURSIVE_WRITE_BURST_WINDOW) && previous.rawEvent === trigger.rawEvent;
    const duplicate = duplicateUnchanged || duplicateCreate || duplicateWrite;
    const transition = duplicateWrite ? void 0 : duplicateUnchanged ? previous?.transition : "change";
    this.recordObserved(path3, stats, transition, trigger);
    return duplicate;
  }
  dispose() {
    this.watched.forEach((entry) => entry.dispose());
    this.watched.clear();
    this.observed.clear();
    this.symlinkPaths.clear();
    this.recursiveRoots.clear();
  }
};

// node_modules/chokidar/policy.js
var EMPTY_FILE_HOLD = 10;
function isEmptyFile(stats) {
  return stats !== void 0 && stats.isFile() && statIdentity(stats).size === 0;
}
function sameChangeStats(left, right) {
  if (left === void 0 || right === void 0)
    return false;
  const a = statIdentity(left);
  const b = statIdentity(right);
  return a.size === b.size && a.mtimeMs === b.mtimeMs && a.ino === b.ino;
}
var EventPolicy = class {
  pendingWrites = /* @__PURE__ */ new Map();
  pendingUnlinks = /* @__PURE__ */ new Map();
  pendingChanges = /* @__PURE__ */ new Map();
  heldAdds = /* @__PURE__ */ new Map();
  throttled = /* @__PURE__ */ new Map();
  context;
  constructor(context) {
    this.context = context;
  }
  presentPath(path3) {
    if (isWindows)
      path3 = sp4.normalize(path3);
    return this.context.options.cwd ? sp4.relative(this.context.options.cwd, path3) : path3;
  }
  dropHeldAdd(logicalKey) {
    const held = this.heldAdds.get(logicalKey);
    if (held)
      this.context.scheduler.clearTimeout(held.timer);
    this.heldAdds.delete(logicalKey);
  }
  dropPendingChange(logicalKey) {
    const pending = this.pendingChanges.get(logicalKey);
    if (pending?.held)
      this.context.scheduler.clearTimeout(pending.held.timer);
    this.pendingChanges.delete(logicalKey);
  }
  setTimeout(callback, delay) {
    const timer = this.context.scheduler.setTimeout(callback, delay);
    if (!this.context.options.persistent)
      timer.unref();
    return timer;
  }
  async emit(event, path3, stats) {
    if (this.context.isClosed())
      return;
    const { options, scheduler } = this.context;
    const sourcePath = path3;
    const logicalKey = logicalPathKey(path3);
    const generation = this.context.lifecycle.generation;
    const pathGeneration = this.context.capturePathGeneration();
    path3 = this.presentPath(path3);
    const args = [path3];
    if (stats != null)
      args.push(stats);
    const heldAdd = this.heldAdds.get(logicalKey);
    if (heldAdd) {
      if (event === EVENTS.CHANGE) {
        heldAdd.path = sourcePath;
        if (stats)
          heldAdd.stats = stats;
        if (!isEmptyFile(stats))
          heldAdd.release();
        return;
      }
      heldAdd.release();
    }
    if (event === EVENTS.UNLINK || event === EVENTS.UNLINK_DIR) {
      this.dropPendingChange(logicalKey);
      this.throttled.get(EVENTS.CHANGE)?.get(logicalKey)?.clear(false);
    }
    const awf = options.awaitWriteFinish;
    const pendingWrite = awf ? this.pendingWrites.get(logicalKey) : void 0;
    if (pendingWrite) {
      pendingWrite.lastChange = scheduler.now();
      return;
    }
    if (options.atomic) {
      if (event === EVENTS.UNLINK) {
        const existing = this.pendingUnlinks.get(logicalKey);
        if (existing)
          scheduler.clearTimeout(existing.timer);
        const entry = [event, ...args];
        const timer = this.setTimeout(() => {
          const pending = this.pendingUnlinks.get(logicalKey);
          if (!pending || pending.timer !== timer)
            return;
          this.pendingUnlinks.delete(logicalKey);
          if (this.context.isClosed())
            return;
          const [pendingEvent, ...pendingArgs] = pending.event;
          this.context.publish(pendingEvent, pendingArgs);
        }, typeof options.atomic === "number" ? options.atomic : 100);
        this.pendingUnlinks.set(logicalKey, { event: entry, timer });
        return;
      }
      const pendingUnlink = this.pendingUnlinks.get(logicalKey);
      if (event === EVENTS.ADD && pendingUnlink) {
        event = EVENTS.CHANGE;
        scheduler.clearTimeout(pendingUnlink.timer);
        this.pendingUnlinks.delete(logicalKey);
      }
    }
    if (awf && (event === EVENTS.ADD || event === EVENTS.CHANGE) && this.context.isReady()) {
      const awfEmit = (error, currentStats) => {
        if (this.context.isClosed())
          return;
        if (error) {
          event = EVENTS.ERROR;
          args[0] = error;
          this.context.publish(event, args);
        } else if (currentStats) {
          if (args.length > 1)
            args[1] = currentStats;
          else
            args.push(currentStats);
          this.context.publish(event, args);
        }
      };
      this.awaitWriteFinish(path3, awf.stabilityThreshold, event, awfEmit, logicalKey);
      return;
    }
    if (event === EVENTS.ADD && isEmptyFile(stats) && this.context.isReady()) {
      const held = {
        path: sourcePath,
        stats,
        release: () => {
          this.context.scheduler.clearTimeout(held.timer);
          if (this.heldAdds.get(logicalKey) !== held)
            return;
          this.heldAdds.delete(logicalKey);
          if (this.context.isClosed() || !this.context.lifecycle.isActive(generation) || !this.context.isPathGenerationActive(logicalKey, pathGeneration)) {
            return;
          }
          const heldArgs = [this.presentPath(held.path)];
          if (held.stats)
            heldArgs.push(held.stats);
          this.context.publish(EVENTS.ADD, heldArgs);
        }
      };
      held.timer = this.setTimeout(held.release, EMPTY_FILE_HOLD);
      this.heldAdds.set(logicalKey, held);
      return;
    }
    if (event === EVENTS.CHANGE) {
      const throttler = this.throttle(EVENTS.CHANGE, sourcePath, 50, (suppressedCount) => {
        const pending2 = this.pendingChanges.get(logicalKey);
        this.dropPendingChange(logicalKey);
        if (suppressedCount > 0 && pending2?.replay && this.context.lifecycle.isActive(generation) && this.context.isPathGenerationActive(logicalKey, pathGeneration)) {
          void this.emit(EVENTS.CHANGE, pending2.path, pending2.stats);
        }
      });
      if (!throttler) {
        const pending2 = this.pendingChanges.get(logicalKey);
        if (pending2 && !sameChangeStats(pending2.stats, stats)) {
          pending2.path = sourcePath;
          pending2.stats = stats;
          pending2.replay = true;
          if (pending2.held && !isEmptyFile(stats))
            pending2.held.release();
        }
        return;
      }
      const pending = { path: sourcePath, stats, replay: false };
      this.pendingChanges.set(logicalKey, pending);
      if (isEmptyFile(stats)) {
        const release = () => {
          if (pending.held)
            this.context.scheduler.clearTimeout(pending.held.timer);
          pending.held = void 0;
          if (this.pendingChanges.get(logicalKey) !== pending || this.context.isClosed() || !this.context.lifecycle.isActive(generation) || !this.context.isPathGenerationActive(logicalKey, pathGeneration)) {
            return;
          }
          pending.replay = false;
          const heldArgs = [this.presentPath(pending.path)];
          if (pending.stats)
            heldArgs.push(pending.stats);
          this.context.publish(EVENTS.CHANGE, heldArgs);
        };
        pending.held = { timer: this.setTimeout(release, EMPTY_FILE_HOLD), release };
        return;
      }
    }
    if (options.alwaysStat && stats === void 0 && (event === EVENTS.ADD || event === EVENTS.ADD_DIR || event === EVENTS.CHANGE)) {
      const fullPath = options.cwd ? sp4.join(options.cwd, path3) : path3;
      try {
        stats = await (0, import_promises3.stat)(fullPath);
      } catch (error) {
        this.context.handleError(error);
      }
      if (!stats || !this.context.lifecycle.isActive(generation) || !this.context.isPathGenerationActive(logicalKey, pathGeneration)) {
        return;
      }
      args.push(stats);
    }
    this.context.publish(event, args);
  }
  throttle(actionType, path3, timeout, onRelease) {
    let action = this.throttled.get(actionType);
    if (!action) {
      action = /* @__PURE__ */ new Map();
      this.throttled.set(actionType, action);
    }
    const key = actionType === "readdir" ? path3 : logicalPathKey(path3);
    const active = action.get(key);
    if (active) {
      active.count += 1;
      return false;
    }
    let timeoutObject;
    const clear = (invokeRelease = true) => {
      const item = action.get(key);
      const count = item?.count ?? 0;
      action.delete(key);
      this.context.scheduler.clearTimeout(timeoutObject);
      if (item)
        this.context.scheduler.clearTimeout(item.timeoutObject);
      if (invokeRelease && onRelease)
        onRelease(count);
      return count;
    };
    timeoutObject = this.setTimeout(clear, timeout);
    const throttler = { timeoutObject, clear, count: 0 };
    action.set(key, throttler);
    return throttler;
  }
  awaitWriteFinish(path3, threshold, event, awfEmit, logicalKey) {
    const awf = this.context.options.awaitWriteFinish;
    if (typeof awf !== "object")
      return;
    const pollInterval = awf.pollInterval;
    let timeoutHandler;
    let fullPath = path3;
    if (this.context.options.cwd && !sp4.isAbsolute(path3)) {
      fullPath = sp4.join(this.context.options.cwd, path3);
    }
    const writeKey = logicalKey ?? logicalPathKey(fullPath);
    if (this.pendingWrites.has(writeKey))
      return;
    const generation = this.context.lifecycle.generation;
    const pending = {
      lastChange: this.context.scheduler.now(),
      cancelWait: () => {
        if (this.pendingWrites.get(writeKey) === pending)
          this.pendingWrites.delete(writeKey);
        this.context.scheduler.clearTimeout(timeoutHandler);
        return event;
      }
    };
    const isCurrent = () => this.context.lifecycle.isActive(generation) && this.pendingWrites.get(writeKey) === pending;
    const inspect = (previous) => {
      const task = (async () => {
        let current;
        try {
          current = await (0, import_promises3.stat)(fullPath);
        } catch (error) {
          if (!isCurrent())
            return;
          if (isMissingError(error)) {
            this.context.remove(sp4.dirname(fullPath), sp4.basename(fullPath));
            if (this.pendingWrites.get(writeKey) === pending)
              pending.cancelWait();
          } else {
            this.pendingWrites.delete(writeKey);
            awfEmit(error);
          }
          return;
        }
        if (!isCurrent())
          return;
        const now = this.context.scheduler.now();
        if (previous && current.size !== previous.size)
          pending.lastChange = now;
        if (now - pending.lastChange >= threshold) {
          this.pendingWrites.delete(writeKey);
          awfEmit(void 0, current);
        } else {
          timeoutHandler = this.setTimeout(() => inspect(current), pollInterval);
        }
      })();
      this.context.lifecycle.track(task);
    };
    this.pendingWrites.set(writeKey, pending);
    timeoutHandler = this.setTimeout(inspect, pollInterval);
  }
  cancelPath(path3) {
    const logicalKey = logicalPathKey(path3);
    const pendingUnlink = this.pendingUnlinks.get(logicalKey);
    if (pendingUnlink) {
      this.context.scheduler.clearTimeout(pendingUnlink.timer);
      this.pendingUnlinks.delete(logicalKey);
    }
    this.pendingWrites.get(logicalKey)?.cancelWait();
    this.dropPendingChange(logicalKey);
    this.dropHeldAdd(logicalKey);
    ["watch", "add", "remove", "change"].forEach((actionType) => {
      this.throttled.get(actionType)?.get(logicalKey)?.clear(false);
    });
    const readdirEntries = this.throttled.get("readdir");
    readdirEntries?.get(logicalKey)?.clear(false);
    readdirEntries?.get(`${logicalPathKey(sp4.dirname(logicalKey))}\0${sp4.basename(logicalKey)}`)?.clear(false);
  }
  cancelWhere(contains) {
    const paths = /* @__PURE__ */ new Set([
      ...this.pendingUnlinks.keys(),
      ...this.pendingWrites.keys(),
      ...this.pendingChanges.keys(),
      ...this.heldAdds.keys()
    ]);
    [...paths].filter(contains).forEach((path3) => this.cancelPath(path3));
    this.throttled.forEach((entries, actionType) => {
      [...entries.keys()].filter((key) => contains(actionType === "readdir" ? key.split("\0", 1)[0] : key)).forEach((key) => entries.get(key)?.clear(false));
    });
  }
  close() {
    this.pendingWrites.forEach((pending) => pending.cancelWait());
    this.pendingUnlinks.forEach(({ timer }) => this.context.scheduler.clearTimeout(timer));
    this.pendingUnlinks.clear();
    this.pendingChanges.forEach(({ held }) => this.context.scheduler.clearTimeout(held?.timer));
    this.pendingChanges.clear();
    this.heldAdds.forEach(({ timer }) => this.context.scheduler.clearTimeout(timer));
    this.heldAdds.clear();
    this.throttled.forEach((entries) => {
      entries.forEach((throttler) => throttler.clear(false));
    });
    this.throttled.clear();
  }
};

// node_modules/chokidar/reconcile.js
var import_promises4 = require("node:fs/promises");
var sp5 = __toESM(require("node:path"), 1);
var EV2 = EVENTS;
var RECURSIVE_TRIGGER_BUFFER_LIMIT = 1024;
var MAX_NATIVE_RESUBSCRIBES = 3;
var FALLBACK_SUBSCRIBE_CONCURRENCY = 16;
var EXACT_CANDIDATE = Object.freeze({});
function recoveryTrigger(resource) {
  return {
    kind: "native",
    resource,
    rawEvent: EV2.CHANGE,
    relativePath: null,
    sequence: Number.MAX_SAFE_INTEGER,
    observedAt: backendNow()
  };
}
function sameMappedFileSnapshot(left, right) {
  if (left === false || right === false)
    return left === right;
  return left.size === right.size && left.mtimeMs === right.mtimeMs && left.ctimeMs === right.ctimeMs && left.ino === right.ino && left.mode === right.mode;
}
var ReplayBuffer = class {
  entries = [];
  overflow;
  limit;
  constructor(limit) {
    this.limit = limit;
  }
  get overflowed() {
    return this.overflow !== void 0;
  }
  push(value) {
    if (this.entries.length < this.limit && !this.overflowed)
      this.entries.push(value);
    else
      this.overflow = value;
  }
  clear() {
    this.entries.length = 0;
    this.overflow = void 0;
  }
};
function consumeDirectoryStream(stream, onEntry) {
  const tasks = [];
  stream.on("data", (entry) => {
    let result;
    try {
      result = onEntry(entry);
    } catch (error) {
      result = Promise.reject(error);
    }
    if (!result)
      return;
    tasks.push(Promise.resolve(result));
  });
  return new Promise((resolve6) => {
    stream.once("end", () => resolve6({ complete: true }));
    stream.once("close", () => resolve6({ complete: false }));
    stream.once(EV2.ERROR, (error) => resolve6({ complete: false, error }));
  }).then(async ({ complete, error }) => {
    const settled = await Promise.allSettled(tasks);
    const failures = settled.filter((result) => result.status === "rejected").map((result) => result.reason);
    return { complete: complete && failures.length === 0, error, failures };
  });
}
var binaryExtensions = new Set(`3dm 3ds 3g2 3gp 7z a aac adp afdesign afphoto afpub ai aif aiff alz ape apk appimage ar arj asf au avi bak baml bh bin bk bmp btif bz2 bzip2 cab caf cgm class cmx cpio cr2 cur dat dcm deb dex djvu dll dmg dng doc docm docx dot dotm dra ds_store dsk dts dtshd dvb dwg dxf ecelp4800 ecelp7470 ecelp9600 egg eol eot epub exe f4v fbs fh fla flac flatpak fli flv fpx fst fvt g3 gh gif graffle gz gzip h261 h263 h264 icns ico ief img ipa iso jar jpeg jpg jpgv jpm jxr key ktx lha lib lvp lz lzh lzma lzo m3u m4a m4v mar mdi mht mid midi mj2 mka mkv mmr mng mobi mov movie mp3 mp4 mp4a mpeg mpg mpga mxu nef npx numbers nupkg o odp ods odt oga ogg ogv otf ott pages pbm pcx pdb pdf pea pgm pic png pnm pot potm potx ppa ppam ppm pps ppsm ppsx ppt pptm pptx psd pya pyc pyo pyv qt rar ras raw resources rgb rip rlc rmf rmvb rpm rtf rz s3m s7z scpt sgi shar snap sil sketch slk smv snk so stl suo sub swf tar tbz tbz2 tga tgz thmx tif tiff tlz ttc ttf txz udf uvh uvi uvm uvp uvs uvu viv vob war wav wax wbmp wdp weba webm webp whl wim wm wma wmv wmx woff woff2 wrm wvx xbm xif xla xlam xls xlsb xlsm xlsx xlt xltm xltx xm xmind xpi xpm xwd xz z zip zipx`.split(" "));
function isBinaryPath(filePath) {
  return binaryExtensions.has(sp5.extname(filePath).slice(1).toLowerCase());
}
var ObservationEngine = class {
  fsw;
  reportError;
  constructor(fsW) {
    this.fsw = fsW;
    this.reportError = (error) => fsW.handleError(error);
  }
  /**
   * Watch a path with the owned polling scheduler or fs.watch.
   * @param path to file or dir
   * @param listener on fs change
   * @returns closer for the watcher instance
   */
  subscribePath(path3, listener, initialStats, mapRelative = false, queueScope = path3) {
    const opts = this.fsw.options;
    const basename5 = sp5.basename(path3);
    const absolutePath = sp5.resolve(path3);
    const options = {
      persistent: opts.persistent
    };
    const generation = this.fsw.lifecycle.generation;
    let active = true;
    const trackedListener = (watchedPath, stats, trigger) => {
      if (!active || !this.fsw.lifecycle.isActive(generation))
        return;
      return listener(watchedPath, stats, trigger);
    };
    const publish = (trigger) => {
      void this.reconcileBackendTrigger(path3, mapRelative, trigger, (candidate) => trackedListener(candidate, trigger.kind === "poll" && !isMissingObservation(trigger.current) ? trigger.current : void 0, trigger), () => active && this.fsw.lifecycle.isActive(generation), true, queueScope);
    };
    let subscription;
    let resubscribes = 0;
    const subscribeNative = () => setFsWatchListener(path3, absolutePath, options, {
      publish: (trigger) => {
        resubscribes = 0;
        publish(trigger);
      },
      errHandler: this.reportError,
      rawEmitter: (...args) => this.fsw.emitRaw(...args),
      failure: () => {
        if (!active || !this.fsw.lifecycle.isActive(generation))
          return;
        subscription = resubscribes++ < MAX_NATIVE_RESUBSCRIBES ? subscribeNative() : void 0;
        publish(recoveryTrigger(absolutePath));
      }
    }, this.fsw.lifecycle.abortController.signal);
    if (opts.backendCapabilities.polling) {
      const enableBin = opts.pollingInterval !== opts.pollingBinaryInterval;
      const pollingInterval = enableBin && isBinaryPath(basename5) ? opts.pollingBinaryInterval : opts.pollingInterval;
      subscription = setPollingListener(path3, absolutePath, { interval: pollingInterval, persistent: opts.persistent }, this.fsw.scheduler, {
        publish,
        errHandler: this.reportError,
        rawEmitter: (...args) => this.fsw.emitRaw(...args)
      }, initialStats, this.fsw.lifecycle.abortController.signal);
    } else {
      subscription = subscribeNative();
    }
    if (!subscription)
      return;
    return () => {
      if (!active)
        return;
      active = false;
      return subscription?.close();
    };
  }
  /**
   * Watch a followed file symlink through the target's parent directory.
   * macOS also starts a one-shot exact-target fallback: FSEvents can omit the
   * first directory callback immediately after a subscription is established.
   */
  subscribeMappedFile(logicalPath, targetPath, helper, depth, useExactFallback = isMacos) {
    if (this.fsw.options.backendCapabilities.polling)
      return;
    const targetDirectory = sp5.dirname(targetPath);
    const targetKey = logicalPathKey(targetPath);
    const logicalParent = sp5.dirname(logicalPath);
    const generation = this.fsw.lifecycle.generation;
    let active = true;
    let exactActive = useExactFallback;
    let suppressDirectoryEcho = false;
    let fallbackSnapshot;
    let directorySubscription;
    let exactSubscription;
    const isActive = () => active && this.fsw.lifecycle.isActive(generation) && this.isHelperActive(helper, logicalPath);
    const matchesTarget = (relativePath) => {
      if (relativePath === null)
        return true;
      const candidate = sp5.isAbsolute(relativePath) ? relativePath : sp5.resolve(targetDirectory, relativePath);
      const candidateKey = logicalPathKey(candidate);
      return isWindows ? candidateKey.toLowerCase() === targetKey.toLowerCase() : candidateKey === targetKey;
    };
    const retireExact = () => {
      if (!exactActive)
        return;
      exactActive = false;
      if (exactSubscription)
        void exactSubscription.close();
    };
    const publish = (source, trigger) => {
      if (trigger.kind !== "native" || !matchesTarget(trigger.relativePath) || !isActive())
        return;
      const deduplicateAgainstFallback = source === "directory" && suppressDirectoryEcho;
      if (source === "directory") {
        suppressDirectoryEcho = false;
        retireExact();
      } else if (directorySubscription) {
        suppressDirectoryEcho = true;
        retireExact();
      }
      void this.reconcileBackendTrigger(targetDirectory, true, trigger, async () => {
        if (deduplicateAgainstFallback && fallbackSnapshot !== void 0) {
          const current = await this.mappedFileSnapshot(targetPath);
          if (current !== void 0 && sameMappedFileSnapshot(fallbackSnapshot, current))
            return;
        }
        await this.reconcileNativeTrigger(logicalParent, helper, trigger, logicalPath, depth - 1, EXACT_CANDIDATE);
        if (source === "exact")
          fallbackSnapshot = await this.mappedFileSnapshot(targetPath);
      }, isActive, false, logicalPath);
    };
    let resubscribes = 0;
    const handlers = (source) => ({
      publish: (trigger) => {
        if (source === "directory")
          resubscribes = 0;
        publish(source, trigger);
      },
      errHandler: this.reportError,
      rawEmitter: (event, relativePath) => {
        if ((source === "directory" || exactActive) && matchesTarget(relativePath) && isActive()) {
          this.fsw.emitRaw(event, relativePath, { watchedPath: logicalPath });
        }
      },
      failure: () => {
        if (source === "exact") {
          exactSubscription = void 0;
          exactActive = false;
          return;
        }
        directorySubscription = void 0;
        if (!isActive())
          return;
        if (resubscribes++ < MAX_NATIVE_RESUBSCRIBES)
          directorySubscription = subscribe(source);
        publish(source, recoveryTrigger(sp5.resolve(targetDirectory)));
      }
    });
    const subscribe = (source) => {
      const path3 = source === "directory" ? targetDirectory : targetPath;
      return setFsWatchListener(path3, sp5.resolve(path3), { persistent: this.fsw.options.persistent }, handlers(source), this.fsw.lifecycle.abortController.signal);
    };
    directorySubscription = subscribe("directory");
    exactSubscription = useExactFallback ? subscribe("exact") : void 0;
    if (!exactSubscription)
      exactActive = false;
    if (!directorySubscription && !exactSubscription)
      return;
    return async () => {
      if (!active)
        return;
      active = false;
      const subscriptions = [directorySubscription, exactSubscription].filter((subscription) => subscription !== void 0);
      await Promise.allSettled(subscriptions.map((subscription) => subscription.close()));
    };
  }
  async mappedFileSnapshot(path3) {
    try {
      return await (0, import_promises4.lstat)(path3);
    } catch (error) {
      if (isMissingError(error))
        return false;
      this.reportError(error);
      return;
    }
  }
  /**
   * macOS can follow an exact symlink handle and miss the link's own removal.
   * Check only link existence so target-directory activity stays invisible when
   * followSymlinks is disabled.
   */
  watchSymlinkDeletion(path3, force = false) {
    if (!isMacos && !force || this.fsw.options.backendCapabilities.polling)
      return;
    const fsw = this.fsw;
    const generation = fsw.lifecycle.generation;
    const directory = sp5.dirname(path3);
    const basename5 = sp5.basename(path3);
    let active = true;
    let timer;
    const schedule = () => {
      timer = fsw.scheduler.setTimeout(() => {
        timer = void 0;
        void (async () => {
          try {
            await (0, import_promises4.lstat)(path3);
          } catch (error) {
            if (!active || !fsw.lifecycle.isActive(generation))
              return;
            if (isMissingError(error)) {
              active = false;
              fsw.removePath(directory, basename5);
              return;
            }
            this.reportError(error);
          }
          if (active && fsw.lifecycle.isActive(generation))
            schedule();
        })();
      }, fsw.options.pollingInterval);
      if (!fsw.options.persistent)
        timer.unref();
    };
    schedule();
    return () => {
      if (!active)
        return;
      active = false;
      fsw.scheduler.clearTimeout(timer);
      timer = void 0;
    };
  }
  /**
   * Map one backend notification into a logical candidate and serialize its
   * filesystem reconciliation in the owning watcher instance.
   */
  reconcileBackendTrigger(scope, mapRelative, trigger, reconcile, isActive = () => true, coalesce = true, queueScope = scope) {
    let candidate = scope;
    if (mapRelative && trigger.kind === "native" && trigger.relativePath !== null) {
      const resolved = resolveRecursiveCandidate(scope, trigger.relativePath);
      if (!resolved) {
        this.reportError(new Error(`Watcher reported a path outside its root: ${trigger.relativePath}`));
        return Promise.resolve();
      }
      candidate = resolved;
    }
    if (!isActive() || this.fsw.isUnwatched(candidate))
      return Promise.resolve();
    const rootKey = logicalPathKey(queueScope);
    const candidateKey = logicalPathKey(candidate);
    return this.fsw.reconciliation.enqueue(rootKey, async () => {
      if (!isActive() || this.fsw.isUnwatched(candidateKey))
        return;
      await reconcile(candidate);
    }, coalesce ? candidateKey : false);
  }
  /**
   * Watch a file and emit add event if warranted.
   * @returns closer for the watcher instance
   */
  handleFile(file, stats, initialAdd, watchResource = true, trigger, initialRecursive = false, retainObservation = false) {
    if (this.fsw.closed) {
      return;
    }
    const dirname4 = sp5.dirname(file);
    const basename5 = sp5.basename(file);
    const parent = this.fsw.tree.getDirectory(dirname4);
    let prevStats = stats;
    if (parent.has(basename5))
      return;
    const pathGeneration = this.fsw.capturePathGeneration();
    const isActive = () => this.fsw.isPathGenerationActive(file, pathGeneration);
    const listener = async (_path, newStats) => {
      if (!newStats || newStats.mtimeMs === 0) {
        try {
          const newStats2 = prevStats.isSymbolicLink() && !this.fsw.options.followSymlinks ? await (0, import_promises4.lstat)(file) : await (0, import_promises4.stat)(file);
          if (!isActive())
            return;
          const at = newStats2.atimeMs;
          const mt = newStats2.mtimeMs;
          if (!at || at <= mt || mt !== prevStats.mtimeMs) {
            this.fsw.emitEvent(EV2.CHANGE, file, newStats2);
          }
          this.fsw.tree.recordObserved(file, newStats2, "change");
          prevStats = newStats2;
        } catch (error) {
          if (!isActive())
            return;
          if (isMissingError(error)) {
            this.fsw.removePath(dirname4, basename5);
          } else {
            this.reportError(error);
          }
        }
      } else if (parent.has(basename5)) {
        const at = newStats.atimeMs;
        const mt = newStats.mtimeMs;
        if (!at || at <= mt || mt !== prevStats.mtimeMs) {
          this.fsw.emitEvent(EV2.CHANGE, file, newStats);
        }
        this.fsw.tree.recordObserved(file, newStats, "change");
        prevStats = newStats;
      }
    };
    const watchesFile = watchResource && this.fsw.options.backendCapabilities.polling;
    const closer = watchesFile ? this.subscribePath(file, listener, stats) : void 0;
    parent.add(basename5);
    this.fsw.tree.recordObserved(file, stats, "add", trigger, initialRecursive, retainObservation);
    if (!(initialAdd && this.fsw.options.ignoreInitial) && !this.fsw.isIgnored(file, stats)) {
      this.fsw.emitEvent(EV2.ADD, file, stats);
    }
    return closer;
  }
  /**
   * Handle symlinks encountered while reading a dir.
   * @param entry returned by readdirp
   * @param directory path of dir being read
   * @param path of this item
   * @param item basename of this item
   * @returns true if no more processing is needed for this entry.
   */
  async handleSymlink(entry, directory, path3, item, initialAdd, wh) {
    if (this.fsw.closed || wh && !this.isHelperActive(wh, path3)) {
      return;
    }
    const full = logicalPathKey(entry.fullPath);
    const dir = this.fsw.tree.getDirectory(directory);
    if (!this.fsw.options.followSymlinks) {
      let linkPath;
      try {
        linkPath = await (0, import_promises4.readlink)(path3);
      } catch (error) {
        if (!isMissingError(error))
          this.reportError(error);
        return true;
      }
      if (this.fsw.closed || wh && !this.isHelperActive(wh, path3)) {
        return true;
      }
      if (dir.has(item)) {
        if (this.fsw.tree.symlinkPaths.get(full) !== linkPath) {
          this.fsw.tree.symlinkPaths.set(full, linkPath);
          this.fsw.emitEvent(EV2.CHANGE, path3, entry.stats);
        }
      } else {
        dir.add(item);
        this.fsw.tree.symlinkPaths.set(full, linkPath);
        this.fsw.tree.recordObserved(path3, entry.stats, "add", wh?.observationTrigger, initialAdd && Boolean(wh?.recursiveRoot));
        if (!(initialAdd && this.fsw.options.ignoreInitial)) {
          this.fsw.emitEvent(EV2.ADD, path3, entry.stats);
        }
      }
      return true;
    }
    if (this.fsw.tree.symlinkPaths.has(full)) {
      return true;
    }
    this.fsw.tree.symlinkPaths.set(full, true);
  }
  readDirectory(directory, initialAdd, wh, target, dir, depth) {
    if (!this.isHelperActive(wh, directory))
      return;
    directory = sp5.join(directory, "");
    const directoryKey = logicalPathKey(directory);
    const previous = this.fsw.tree.getDirectory(wh.watchPath);
    const current = /* @__PURE__ */ new Set();
    const stream = this.fsw.createScanStream(directory, {
      fileFilter: (entry) => wh.filterPath(entry),
      directoryFilter: (entry) => wh.filterDir(entry)
    });
    if (!stream)
      return;
    const scan = consumeDirectoryStream(stream, (entry) => {
      if (!this.isHelperActive(wh, directory))
        return;
      const stats = entry.stats;
      if (!stats)
        return;
      const item = entry.path;
      let path3 = sp5.join(directory, item);
      if (!this.isHelperActive(wh, path3))
        return;
      current.add(item);
      const shouldAdd = item === target || !target && !previous.has(item);
      if (target === void 0 && !stats.isSymbolicLink() && !stats.isDirectory()) {
        if (!shouldAdd)
          return;
        path3 = sp5.join(dir, sp5.relative(dir, path3));
        const closer = this.handleFile(path3, stats, initialAdd, !wh.recursiveRoot, wh.observationTrigger, initialAdd && Boolean(wh.recursiveRoot));
        if (closer)
          this.fsw.addPathCloser(path3, closer);
        return;
      }
      return (async () => {
        if (stats.isSymbolicLink() && await this.handleSymlink(entry, directory, path3, item, initialAdd, wh)) {
          return;
        }
        if (!this.isHelperActive(wh, path3))
          return;
        if (shouldAdd) {
          path3 = sp5.join(dir, sp5.relative(dir, path3));
          await this.addPathOnce(path3, initialAdd, wh, depth + 1);
        }
      })();
    });
    return scan.then(async ({ complete, error, failures }) => {
      failures.forEach(this.reportError);
      if (error) {
        if (isMissingError(error) && this.isHelperActive(wh, directory)) {
          const affectedPath = target ? sp5.join(directory, target) : directory;
          let disappeared = false;
          let becameNonDirectory = false;
          try {
            const currentStats = target ? await (0, import_promises4.lstat)(affectedPath) : await (0, import_promises4.stat)(affectedPath);
            becameNonDirectory = !target && !currentStats.isDirectory();
          } catch (stateError) {
            if (isMissingError(stateError))
              disappeared = true;
            else
              this.reportError(stateError);
          }
          if (target) {
            if (disappeared && previous.has(target))
              this.fsw.removePath(directory, target);
          } else if ((disappeared || becameNonDirectory) && this.fsw.tree.watched.has(directoryKey)) {
            this.fsw.removePath(sp5.dirname(directory), sp5.basename(directory), true);
            if (becameNonDirectory) {
              await this.addPathOnce(directory, false, wh, depth);
            }
          }
        } else {
          this.reportError(error);
        }
      }
      if (!complete || !this.isHelperActive(wh, directory)) {
        return;
      }
      await Promise.all(previous.getChildren().filter((item) => !current.has(item)).map((item) => this.removeIfMissing(wh, directory, item, previous)));
    });
  }
  async removeIfMissing(wh, directory, item, entry) {
    const path3 = sp5.join(directory, item);
    if (!this.isHelperActive(wh, path3))
      return;
    try {
      await (0, import_promises4.lstat)(path3);
      return;
    } catch (error) {
      if (!isMissingError(error))
        return;
    }
    if (this.isHelperActive(wh, path3) && entry.has(item))
      this.fsw.removePath(directory, item);
  }
  /**
   * Populate the logical directory tree beneath one native recursive watcher.
   * Regular entries are consumed synchronously from readdirp's stat-bearing
   * stream; only symlinks need the full per-path add machinery.
   */
  scanRecursiveTree(dir, initialAdd, wh, baseDepth, rescan) {
    if (!this.isHelperActive(wh, dir))
      return;
    const fsw = this.fsw;
    const maxDepth = fsw.options.depth;
    const remainingDepth = maxDepth === void 0 ? void 0 : maxDepth - baseDepth;
    const stream = fsw.createScanStream(dir, {
      fileFilter: (entry) => wh.filterPath(entry),
      directoryFilter: (entry) => !entry.stats?.isSymbolicLink() && wh.filterDir(entry),
      depth: remainingDepth
    });
    if (!stream)
      return;
    return consumeDirectoryStream(stream, (entry) => {
      if (!this.isHelperActive(wh, dir))
        return;
      const stats = entry.stats;
      if (!stats)
        return;
      const path3 = sp5.join(dir, entry.path);
      if (!this.isHelperActive(wh, path3))
        return;
      const directory = sp5.dirname(path3);
      const item = sp5.basename(path3);
      if (rescan) {
        rescan.seen.add(logicalPathKey(path3));
        if (stats.isDirectory())
          rescan.directories.push(path3);
      }
      if (stats.isSymbolicLink()) {
        return (async () => {
          if (await this.handleSymlink(entry, directory, path3, item, initialAdd, wh))
            return;
          if (!this.isHelperActive(wh, path3))
            return;
          const entryDepth = baseDepth + entry.path.split(/[/\\]/).length;
          await this.addPathOnce(path3, initialAdd, wh, entryDepth);
        })();
      }
      const parent = fsw.tree.getDirectory(directory);
      if (parent.has(item)) {
        if (rescan && stats.isFile() && fsw.tree.changedSinceObserved(path3, stats)) {
          fsw.tree.recordObserved(path3, stats, "change", void 0, false, true);
          fsw.emitEvent(EV2.CHANGE, path3, stats);
        }
        return;
      }
      parent.add(item);
      const isDirectory = stats.isDirectory();
      if (isDirectory)
        fsw.tree.getDirectory(path3);
      fsw.tree.recordObserved(path3, stats, "add", wh.observationTrigger, initialAdd);
      if (!(initialAdd && fsw.options.ignoreInitial)) {
        fsw.emitEvent(isDirectory ? EV2.ADD_DIR : EV2.ADD, path3, stats);
      }
    }).then((outcome) => {
      if (outcome.error)
        this.reportError(outcome.error);
      outcome.failures.forEach(this.reportError);
      if (rescan)
        rescan.complete = outcome.complete;
    });
  }
  /**
   * Reconcile a whole recursive root after an invalidation that names no path
   * (a backend buffer overflow) or a replay buffer overflow. A shallow root
   * listing would miss every change below the first level.
   */
  async rescanRecursiveTree(dir, wh, baseDepth) {
    const rescan = { seen: /* @__PURE__ */ new Set(), directories: [dir], complete: false };
    await this.scanRecursiveTree(dir, false, wh, baseDepth, rescan);
    if (!rescan.complete || !this.isHelperActive(wh, dir))
      return;
    const missing = [];
    for (const directory of rescan.directories) {
      for (const item of this.fsw.tree.peekDirectory(directory)?.getChildren() ?? []) {
        const path3 = sp5.join(directory, item);
        if (!rescan.seen.has(logicalPathKey(path3)))
          missing.push(path3);
      }
    }
    missing.sort((left, right) => left.length - right.length);
    for (const path3 of missing) {
      const entry = this.fsw.tree.peekDirectory(sp5.dirname(path3));
      if (entry?.has(sp5.basename(path3))) {
        await this.removeIfMissing(wh, sp5.dirname(path3), sp5.basename(path3), entry);
      }
    }
  }
  isHelperActive(wh, path3 = wh.watchPath) {
    return this.fsw.isPathGenerationActive(path3, wh.pathGeneration);
  }
  candidateDepth(root, candidate) {
    const relative6 = sp5.relative(root, candidate);
    return relative6 ? relative6.split(sp5.sep).length : 0;
  }
  candidateIgnored(root, candidate, stats) {
    const relative6 = sp5.relative(root, candidate);
    let ancestor = root;
    if (this.fsw.isIgnored(ancestor))
      return true;
    if (relative6) {
      const parts = relative6.split(sp5.sep);
      for (let index = 0; index < parts.length - 1; index++) {
        ancestor = sp5.join(ancestor, parts[index]);
        if (this.fsw.isIgnored(ancestor))
          return true;
      }
    }
    return this.fsw.isIgnored(candidate, stats);
  }
  async highestMissingPath(root, candidate) {
    let missing = candidate;
    let ancestor = sp5.dirname(candidate);
    while (true) {
      try {
        await (0, import_promises4.lstat)(ancestor);
        return missing;
      } catch (error) {
        if (!isMissingError(error)) {
          this.reportError(error);
          return missing;
        }
      }
      missing = ancestor;
      if (ancestor === root)
        return missing;
      const parent = sp5.dirname(ancestor);
      if (parent === ancestor)
        return missing;
      ancestor = parent;
    }
  }
  async reconcileNativeTrigger(root, rootHelper, trigger, candidateOverride, baseDepth = 0, exact) {
    const fsw = this.fsw;
    if (!this.isHelperActive(rootHelper, root))
      return;
    let localHelper;
    const helper = () => localHelper ??= rootHelper.withObservation(trigger);
    const candidate = candidateOverride ?? (trigger.relativePath === null ? root : resolveRecursiveCandidate(root, trigger.relativePath));
    if (!candidate) {
      this.reportError(new Error(`Native watcher reported a path outside its root: ${trigger.relativePath}`));
      return;
    }
    const depth = baseDepth + this.candidateDepth(root, candidate);
    const maxDepth = fsw.options.depth;
    if (maxDepth !== void 0 && depth > maxDepth + 1)
      return;
    if (this.candidateIgnored(root, candidate))
      return;
    let stats;
    try {
      stats = await (0, import_promises4.lstat)(candidate);
    } catch (error) {
      if (!isMissingError(error)) {
        this.reportError(error);
        if (exact)
          return;
        const ancestor = candidate === root ? root : sp5.dirname(candidate);
        const ancestorDepth = Math.max(0, baseDepth + this.candidateDepth(root, ancestor));
        await this.readDirectory(ancestor, false, helper().fork(ancestor), void 0, ancestor, ancestorDepth);
        return;
      }
      if (fsw.closed)
        return;
      const missingPath = candidate === root ? root : await this.highestMissingPath(root, candidate);
      if (fsw.closed)
        return;
      if (missingPath === root) {
        fsw.removePath(sp5.dirname(root), sp5.basename(root), true);
        exact?.onRootMissing?.();
        return;
      }
      const parentPath2 = sp5.dirname(missingPath);
      const item2 = sp5.basename(missingPath);
      if (fsw.tree.getDirectory(parentPath2).has(item2)) {
        fsw.removePath(parentPath2, item2);
      } else if (!exact) {
        await this.readDirectory(parentPath2, false, helper().fork(parentPath2), void 0, parentPath2, Math.max(0, baseDepth + this.candidateDepth(root, parentPath2)));
      }
      return;
    }
    if (!this.isHelperActive(rootHelper, candidate) || this.candidateIgnored(root, candidate, stats)) {
      return;
    }
    if (!stats.isDirectory() && !(stats.isSymbolicLink() && fsw.options.followSymlinks)) {
      const initialCreate = fsw.tree.consumeInitialCreate(candidate, stats, trigger, fsw.options.ignoreInitial);
      if (initialCreate !== void 0) {
        if (initialCreate)
          fsw.emitEvent(initialCreate, candidate, stats);
        return;
      }
    }
    if (candidate === root) {
      if (!stats.isDirectory())
        return;
      if (rootHelper.recursiveRoot === root) {
        await this.rescanRecursiveTree(root, helper(), baseDepth);
      } else {
        await this.readDirectory(root, false, helper(), void 0, root, baseDepth);
      }
      return;
    }
    const parentPath = sp5.dirname(candidate);
    const item = sp5.basename(candidate);
    const parent = fsw.tree.getDirectory(parentPath);
    const tracked = parent.has(item);
    if (stats.isSymbolicLink()) {
      if (!fsw.options.followSymlinks) {
        let target = true;
        try {
          target = await (0, import_promises4.readlink)(candidate);
        } catch {
        }
        if (!tracked)
          parent.add(item);
        fsw.tree.symlinkPaths.set(logicalPathKey(candidate), target);
        if (!tracked || !fsw.tree.isDuplicateObservation(candidate, stats, trigger)) {
          fsw.emitEvent(tracked ? EV2.CHANGE : EV2.ADD, candidate, stats);
        }
        if (!tracked)
          fsw.tree.recordObserved(candidate, stats, "add", trigger);
        return;
      }
      const logicalKey = logicalPathKey(candidate);
      const previousTarget = fsw.tree.symlinkPaths.get(logicalKey);
      let currentTarget;
      try {
        currentTarget = await (0, import_promises4.realpath)(candidate);
      } catch (error) {
        if (!isMissingError(error)) {
          this.reportError(error);
          return;
        }
      }
      const targetChanged = tracked && typeof previousTarget === "string" && (currentTarget === void 0 || logicalPathKey(previousTarget) !== logicalPathKey(currentTarget));
      if (targetChanged) {
        const previousKind = fsw.tree.observed.get(logicalKey)?.kind;
        fsw.removePath(parentPath, item, previousKind === "directory");
        if (!currentTarget || !this.isHelperActive(rootHelper, candidate))
          return;
        const linkHelper = helper().fork(candidate);
        linkHelper.recursiveRoot = void 0;
        await this.addPathOnce(candidate, false, linkHelper, depth);
        return;
      }
      const initialCreate = fsw.tree.consumeInitialCreate(candidate, stats, trigger, fsw.options.ignoreInitial);
      if (initialCreate !== void 0) {
        if (initialCreate) {
          fsw.closePath(candidate, true);
          const linkHelper = helper().fork(candidate);
          linkHelper.recursiveRoot = void 0;
          await this.addPathOnce(candidate, false, linkHelper, depth);
        }
        return;
      }
      if (!tracked) {
        const linkHelper = helper().fork(candidate);
        linkHelper.recursiveRoot = void 0;
        await this.addPathOnce(candidate, false, linkHelper, depth);
      } else {
        fsw.emitEvent(EV2.CHANGE, candidate, stats);
      }
      return;
    }
    if (stats.isDirectory()) {
      const directoryHelper = helper().fork(candidate);
      const initialCreate = fsw.tree.consumeInitialCreate(candidate, stats, trigger, fsw.options.ignoreInitial);
      if (initialCreate !== void 0) {
        if (initialCreate) {
          fsw.closePath(candidate, true);
          await this.addPathOnce(candidate, false, directoryHelper, depth);
        }
        return;
      }
      if (!tracked) {
        await this.addPathOnce(candidate, false, directoryHelper, depth);
      } else if (fsw.tree.replacedSinceObserved(candidate, stats)) {
        fsw.removePath(parentPath, item, true);
        await this.addPathOnce(candidate, false, directoryHelper, depth);
      } else if (maxDepth === void 0 || depth <= maxDepth) {
        await this.readDirectory(candidate, false, directoryHelper, void 0, candidate, depth);
      }
      return;
    }
    if (!tracked) {
      await this.addPathOnce(candidate, false, helper(), depth);
    } else if (!fsw.tree.isDuplicateObservation(candidate, stats, trigger)) {
      fsw.emitEvent(EV2.CHANGE, candidate, stats);
    }
  }
  /**
   * Keep a Windows parent handle for a directly watched directory. Windows can
   * silently retire the directory's own handle when an empty root is removed;
   * its parent still receives the namespace transition and can reconcile it.
   */
  watchRootParent(dir, wh) {
    if (!this.fsw.options.backendCapabilities.perDirectory || !isWindows)
      return;
    const parentPath = sp5.dirname(dir);
    if (sp5.resolve(parentPath) === sp5.resolve(dir))
      return;
    const canonicalParent = sp5.normalize(sp5.toNamespacedPath(sp5.resolve(parentPath))).toLowerCase();
    const rootName = sp5.basename(dir).toLowerCase();
    const generation = this.fsw.lifecycle.generation;
    let active = true;
    const matchesRoot = (relativePath) => {
      if (relativePath === null)
        return true;
      const candidate = sp5.isAbsolute(relativePath) ? sp5.resolve(relativePath) : sp5.resolve(parentPath, relativePath);
      return sp5.normalize(sp5.toNamespacedPath(sp5.dirname(candidate))).toLowerCase() === canonicalParent && sp5.basename(candidate).toLowerCase() === rootName;
    };
    const isActive = () => active && this.fsw.lifecycle.isActive(generation) && this.isHelperActive(wh, dir);
    const publish = (trigger) => {
      if (trigger.kind !== "native" || !matchesRoot(trigger.relativePath) || !isActive())
        return;
      void this.reconcileBackendTrigger(dir, false, trigger, async () => {
        let rootStats;
        try {
          rootStats = await (0, import_promises4.lstat)(dir);
        } catch (error) {
          if (isMissingError(error)) {
            this.fsw.removePath(parentPath, sp5.basename(dir), true);
          } else {
            this.reportError(error);
          }
          return;
        }
        if (!isActive())
          return;
        if (!rootStats.isDirectory()) {
          this.fsw.removePath(parentPath, sp5.basename(dir), true);
          await this.addPathOnce(dir, false, wh, 0);
          return;
        }
        await this.readDirectory(dir, false, wh, void 0, dir, 0);
      }, isActive);
    };
    const subscription = setFsWatchListener(parentPath, sp5.resolve(parentPath), { persistent: this.fsw.options.persistent }, {
      publish,
      errHandler: this.reportError,
      rawEmitter: (event, relativePath, details) => {
        if (matchesRoot(relativePath))
          this.fsw.emitRaw(event, relativePath, details);
      }
    }, this.fsw.lifecycle.abortController.signal);
    if (!subscription)
      return;
    return () => {
      if (!active)
        return;
      active = false;
      return subscription.close();
    };
  }
  async watchRecursiveDirectory(dir, initialAdd, depth, wh) {
    const fsw = this.fsw;
    const generation = fsw.lifecycle.generation;
    const rootKey = logicalPathKey(dir);
    const buffered = new ReplayBuffer(RECURSIVE_TRIGGER_BUFFER_LIMIT);
    const fallbackClosers = [];
    let phase = "scanning";
    let pendingFailure;
    let hasPendingFailure = false;
    let recovery;
    let subscription;
    const scopeActive = (path3 = dir) => fsw.lifecycle.isActive(generation) && fsw.isPathGenerationActive(path3, wh.pathGeneration);
    const acceptsTrigger = (path3 = dir) => phase !== "recovering" && phase !== "closed" && scopeActive(path3);
    const establishFallback = async (error) => {
      if (!scopeActive())
        return;
      wh.recursiveRoot = void 0;
      wh.recursiveDisabled = true;
      let currentStats;
      try {
        currentStats = await (0, import_promises4.lstat)(dir);
      } catch (statError) {
        if (isMissingError(statError))
          fsw.removePath(sp5.dirname(dir), sp5.basename(dir), true);
        else
          this.reportError(statError);
        this.reportError(error);
        return;
      }
      const closer = await this.handleDirectory(dir, currentStats, false, depth, void 0, wh);
      if (!scopeActive()) {
        if (closer)
          await closer();
        return;
      }
      if (closer)
        fallbackClosers.push(closer);
      await this.subscribeTrackedDirectories(dir, wh, depth);
      this.reportError(error);
    };
    const handleFailure = (error) => {
      if (!acceptsTrigger())
        return;
      const initializing = phase !== "live";
      phase = "recovering";
      fsw.tree.recursiveRoots.delete(rootKey);
      pendingFailure = error;
      hasPendingFailure = true;
      if (!initializing) {
        recovery = fsw.reconciliation.enqueue(dir, () => establishFallback(error), false);
      }
    };
    const processTrigger = (trigger) => {
      if (!acceptsTrigger())
        return;
      if (phase !== "live") {
        buffered.push(trigger);
        return;
      }
      const coalescePath = trigger.relativePath === null ? dir : resolveRecursiveCandidate(dir, trigger.relativePath) ?? dir;
      void this.reconcileBackendTrigger(dir, true, trigger, () => acceptsTrigger() ? this.reconcileNativeTrigger(dir, wh, trigger) : void 0, () => acceptsTrigger(coalescePath));
    };
    const result = subscribeRecursiveNative(dir, fsw.options.persistent, {
      publish: processTrigger,
      failure: handleFailure,
      rawEmitter: (...args) => fsw.emitRaw(...args)
    }, fsw.lifecycle.abortController.signal);
    if (result.kind === "unsupported")
      return false;
    if (result.kind === "failed")
      throw result.error;
    subscription = result.subscription;
    fsw.tree.recursiveRoots.add(rootKey);
    wh.recursiveRoot = dir;
    const close = async () => {
      if (phase === "closed")
        return;
      phase = "closed";
      fsw.tree.recursiveRoots.delete(rootKey);
      buffered.clear();
      await subscription?.close();
      if (recovery)
        await Promise.allSettled([recovery]);
      await Promise.allSettled(fallbackClosers.map((closer) => closer()));
    };
    try {
      await this.scanRecursiveTree(dir, initialAdd, wh, depth);
      if (!hasPendingFailure) {
        phase = "replaying";
        let index = 0;
        while (acceptsTrigger()) {
          if (buffered.overflowed) {
            buffered.clear();
            index = 0;
            const overflowTrigger = {
              kind: "native",
              resource: subscription.resource,
              rawEvent: EV2.CHANGE,
              relativePath: null,
              sequence: Number.MAX_SAFE_INTEGER,
              observedAt: backendNow()
            };
            await this.reconcileBackendTrigger(dir, true, overflowTrigger, () => this.reconcileNativeTrigger(dir, wh, overflowTrigger), () => acceptsTrigger(), false);
            continue;
          }
          if (index >= buffered.entries.length)
            break;
          const trigger = buffered.entries[index++];
          if (trigger.rawEvent === "rename" && trigger.relativePath !== null) {
            const candidate = resolveRecursiveCandidate(dir, trigger.relativePath);
            if (candidate && candidate !== dir && fsw.tree.getDirectory(sp5.dirname(candidate)).has(sp5.basename(candidate))) {
              fsw.tree.markInitialCreate(candidate);
            }
          }
          await this.reconcileBackendTrigger(dir, true, trigger, () => this.reconcileNativeTrigger(dir, wh, trigger), () => acceptsTrigger(), false);
        }
        if (phase !== "recovering")
          phase = "live";
      }
      if (hasPendingFailure) {
        buffered.clear();
        await establishFallback(pendingFailure);
      }
      buffered.clear();
      fsw.tree.clearInitialCreates(dir);
    } catch (error) {
      await close();
      throw error;
    }
    if (!scopeActive()) {
      await close();
      return;
    }
    return close;
  }
  /**
   * A recursive root that falls back to per-directory handles already tracks
   * every subdirectory, so the fallback scan sees none of them as new. Give
   * each its own subscription; existing entries emit nothing.
   */
  async subscribeTrackedDirectories(root, wh, baseDepth) {
    const fsw = this.fsw;
    const absoluteRoot = sp5.resolve(root);
    const needsSubscription = (path3) => {
      const key = logicalPathKey(path3);
      return this.isHelperActive(wh, path3) && !fsw.lifecycle.closers.has(key) && !fsw.tree.symlinkPaths.has(key) && (fsw.tree.peekDirectory(sp5.dirname(path3))?.has(sp5.basename(path3)) ?? false);
    };
    const directories = [...fsw.tree.watched.values()].filter((entry) => isStrictlyInside(absoluteRoot, entry.path)).map((entry) => sp5.join(root, sp5.relative(absoluteRoot, entry.path))).filter(needsSubscription).sort((left, right) => left.length - right.length);
    let next = 0;
    const subscribeNext = async () => {
      while (next < directories.length) {
        const directory = directories[next++];
        if (!needsSubscription(directory))
          continue;
        await this.addPathOnce(directory, false, wh, baseDepth + this.candidateDepth(root, directory));
      }
    };
    const workers = Math.min(FALLBACK_SUBSCRIBE_CONCURRENCY, directories.length);
    await Promise.all(Array.from({ length: workers }, subscribeNext));
  }
  /**
   * Read directory to add / remove files from `@watched` list and re-read it on change.
   * @param dir fs path
   * @param stats
   * @param initialAdd
   * @param depth relative to user-supplied path
   * @param target child path targeted for watch
   * @param wh Common watch helpers for this path
   * @returns closer for the watcher instance.
   */
  async handleDirectory(dir, stats, initialAdd, depth, target, wh) {
    if (!this.isHelperActive(wh, dir))
      return;
    if (target) {
      this.fsw.tree.getDirectory(dir);
    } else {
      const parentDir = this.fsw.tree.getDirectory(sp5.dirname(dir));
      const tracked = parentDir.has(sp5.basename(dir));
      if (!(initialAdd && this.fsw.options.ignoreInitial) && !tracked) {
        this.fsw.emitEvent(EV2.ADD_DIR, dir, stats);
      }
      parentDir.add(sp5.basename(dir));
      this.fsw.tree.getDirectory(dir);
      this.fsw.tree.recordObserved(dir, stats, tracked ? void 0 : "add", wh.observationTrigger, initialAdd && Boolean(wh.recursiveRoot), true);
    }
    let closer;
    const oDepth = this.fsw.options.depth;
    if (oDepth == null || depth <= oDepth) {
      if (this.fsw.options.backendCapabilities.recursive && depth === 0 && !target && !wh.recursiveRoot && !wh.recursiveDisabled) {
        const recursiveCloser = await this.watchRecursiveDirectory(dir, initialAdd, depth, wh);
        if (recursiveCloser !== false)
          return recursiveCloser;
      }
      if (wh.recursiveRoot) {
        if (!target) {
          await this.scanRecursiveTree(dir, initialAdd, wh, depth);
        }
        return;
      }
      const buffered = new ReplayBuffer(RECURSIVE_TRIGGER_BUFFER_LIMIT);
      const replayCreates = /* @__PURE__ */ new Set();
      let initializing = !target;
      let active = true;
      let rescanOnFirstCallback = isMacos && !target;
      const targetPath = target ? sp5.join(dir, target) : void 0;
      const rewatchTarget = () => {
        if (targetPath && active && this.isHelperActive(wh, targetPath)) {
          this.fsw.rewatchMissingPath(targetPath);
        }
      };
      const removeObserved = (dirPath) => {
        if (target) {
          if (this.fsw.tree.getDirectory(dirPath).has(target))
            this.fsw.removePath(dirPath, target);
          rewatchTarget();
          return;
        }
        this.fsw.removePath(sp5.dirname(dirPath), sp5.basename(dirPath), true);
      };
      const observeDirectory = async (dirPath, currentStats, trigger) => {
        if (!active || !this.isHelperActive(wh, dirPath))
          return;
        if (this.fsw.options.backendCapabilities.polling && !currentStats) {
          removeObserved(dirPath);
          return;
        }
        if (trigger.kind === "native") {
          let observedStats;
          try {
            const linkStats = await (0, import_promises4.lstat)(dirPath);
            observedStats = linkStats.isSymbolicLink() && this.fsw.options.followSymlinks ? await (0, import_promises4.stat)(dirPath) : linkStats;
          } catch (error) {
            if (isMissingError(error)) {
              removeObserved(dirPath);
            } else {
              this.reportError(error);
            }
            return;
          }
          if (!observedStats.isDirectory()) {
            removeObserved(dirPath);
            if (!target)
              await this.addPathOnce(dirPath, false, wh, depth);
            return;
          }
        }
        await this.readDirectory(dirPath, false, wh, target, dir, depth);
      };
      const reconcile = (candidate, currentStats, trigger) => {
        if (!active || !this.isHelperActive(wh, candidate))
          return;
        if (initializing) {
          buffered.push({ path: candidate, stats: currentStats, trigger });
          return;
        }
        if (trigger.kind === "native" && !target) {
          if (rescanOnFirstCallback) {
            rescanOnFirstCallback = false;
            return (async () => {
              await this.reconcileNativeTrigger(dir, wh, trigger, candidate, depth);
              await observeDirectory(dir, void 0, trigger);
            })();
          }
          return this.reconcileNativeTrigger(dir, wh, trigger, candidate, depth);
        }
        if (trigger.kind === "native" && target) {
          const matchesTarget = candidate === dir || (isWindows ? sp5.basename(candidate).toLowerCase() === target.toLowerCase() : sp5.basename(candidate) === target);
          if (matchesTarget) {
            return this.reconcileNativeTrigger(dir, wh, trigger, targetPath, depth, {
              onRootMissing: rewatchTarget
            });
          }
        }
        return observeDirectory(dir, currentStats, trigger);
      };
      const rootParentCloser = depth === 0 && !target ? this.watchRootParent(dir, wh) : void 0;
      closer = this.subscribePath(dir, reconcile, stats.isDirectory() ? stats : void 0, true, target ? sp5.join(dir, target) : dir);
      if (target && targetPath && closer) {
        const check = recoveryTrigger(sp5.resolve(dir));
        await this.fsw.reconciliation.enqueue(targetPath, async () => {
          if (this.fsw.tree.getDirectory(dir).has(target))
            return;
          await reconcile(targetPath, void 0, check);
        }, targetPath);
      }
      if (!target) {
        await this.readDirectory(dir, initialAdd, wh, target, dir, depth);
        let index = 0;
        while (!this.fsw.closed) {
          if (buffered.overflow) {
            const overflow = buffered.overflow;
            buffered.clear();
            index = 0;
            await observeDirectory(dir, overflow.stats, overflow.trigger);
            continue;
          }
          if (index >= buffered.entries.length)
            break;
          const event = buffered.entries[index++];
          if (event.trigger.kind === "native" && event.trigger.rawEvent === "rename" && event.path !== dir && this.fsw.tree.getDirectory(sp5.dirname(event.path)).has(sp5.basename(event.path))) {
            this.fsw.tree.markInitialCreate(event.path);
            replayCreates.add(event.path);
          }
          await this.reconcileBackendTrigger(dir, true, event.trigger, () => {
            if (event.trigger.kind === "native" && !target) {
              return this.reconcileNativeTrigger(dir, wh, event.trigger, event.path, depth);
            }
            return observeDirectory(dir, event.stats, event.trigger);
          }, () => active && this.isHelperActive(wh, event.path), false);
        }
        buffered.clear();
        replayCreates.forEach((path3) => this.fsw.tree.clearInitialCreate(path3));
        initializing = false;
      }
      if (!this.isHelperActive(wh, dir)) {
        active = false;
        if (closer)
          await closer();
        if (rootParentCloser)
          await rootParentCloser();
        return;
      }
      if (closer || rootParentCloser) {
        const backendClosers = [closer, rootParentCloser].filter((candidate) => candidate !== void 0);
        closer = async () => {
          if (!active)
            return;
          active = false;
          buffered.clear();
          await Promise.allSettled(backendClosers.map((backendCloser) => backendCloser()));
        };
      }
    }
    return closer;
  }
  /**
   * Handle added file, directory, or glob pattern.
   * Delegates call to handleFile / handleDirectory after checks.
   * @param path to file or ir
   * @param initialAdd was the file added at watch instantiation?
   * @param priorWh depth relative to user-supplied path
   * @param depth Child path actually targeted for watch
   * @param target Child path actually targeted for watch
   */
  async addRoot(path3, initialAdd, pathGeneration, target) {
    let candidate = path3;
    let childTarget = target;
    const generation = this.fsw.lifecycle.generation;
    while (this.fsw.lifecycle.isActive(generation)) {
      const outcome = await this.addPathOnce(candidate, initialAdd, void 0, 0, childTarget, pathGeneration);
      if (outcome === "complete")
        return;
      const parent = sp5.dirname(candidate);
      if (parent === candidate)
        return;
      childTarget = sp5.basename(candidate);
      candidate = parent;
    }
  }
  async addPathOnce(path3, initialAdd, priorWh, depth, target, pathGeneration) {
    if (this.fsw.isIgnored(path3) || this.fsw.closed) {
      return "complete";
    }
    const wh = priorWh ? priorWh.fork(path3) : this.fsw.createHelper(path3);
    if (!priorWh && pathGeneration !== void 0)
      wh.pathGeneration = pathGeneration;
    if (!this.isHelperActive(wh)) {
      return "complete";
    }
    try {
      const linkStats = await (0, import_promises4.lstat)(wh.watchPath);
      if (!this.isHelperActive(wh)) {
        return "complete";
      }
      if (this.fsw.isIgnored(wh.watchPath, linkStats)) {
        return "complete";
      }
      const follow = this.fsw.options.followSymlinks;
      const isSymbolicLink = linkStats.isSymbolicLink();
      const stats = isSymbolicLink && follow ? await (0, import_promises4.stat)(wh.watchPath) : linkStats;
      const followedTarget = isSymbolicLink && follow ? await (0, import_promises4.realpath)(path3) : void 0;
      let closer;
      if (stats.isDirectory()) {
        const absPath = logicalPathKey(path3);
        const ancestryPath = follow ? await (0, import_promises4.realpath)(path3) : path3;
        const targetPath = followedTarget ?? path3;
        const targetKey = logicalPathKey(ancestryPath);
        if (!this.isHelperActive(wh)) {
          return "complete";
        }
        if (isSymbolicLink && wh.realpathAncestry.has(targetKey)) {
          const parent = this.fsw.tree.getDirectory(sp5.dirname(wh.watchPath));
          parent.add(sp5.basename(wh.watchPath));
          this.fsw.tree.getDirectory(wh.watchPath);
          this.fsw.tree.symlinkPaths.set(absPath, targetPath);
          this.fsw.tree.recordObserved(wh.watchPath, stats, "add", wh.observationTrigger, initialAdd && Boolean(wh.recursiveRoot));
          if (!(initialAdd && this.fsw.options.ignoreInitial)) {
            this.fsw.emitEvent(EV2.ADD_DIR, wh.watchPath, stats);
          }
          return "complete";
        }
        wh.realpathAncestry.add(targetKey);
        if (wh.recursiveRoot && isSymbolicLink) {
          wh.recursiveRoot = void 0;
        }
        if (isSymbolicLink)
          wh.recursiveDisabled = true;
        closer = await this.handleDirectory(wh.watchPath, stats, initialAdd, depth, target, wh);
        if (!this.isHelperActive(wh)) {
          if (closer)
            await closer();
          return "complete";
        }
        if (target && !closer)
          return "watch-parent";
        if (isSymbolicLink) {
          this.fsw.tree.symlinkPaths.set(absPath, targetPath);
        }
      } else if (isSymbolicLink && !follow) {
        const linkTarget = await (0, import_promises4.readlink)(path3);
        const retainsNativeFact = !this.fsw.options.backendCapabilities.polling && !wh.recursiveRoot && !priorWh;
        const fileCloser = this.handleFile(wh.watchPath, stats, initialAdd, !wh.recursiveRoot, wh.observationTrigger, initialAdd && Boolean(wh.recursiveRoot), retainsNativeFact);
        if (wh.recursiveRoot) {
          this.fsw.tree.symlinkPaths.set(logicalPathKey(path3), linkTarget);
          return "complete";
        }
        const parent = sp5.dirname(wh.watchPath);
        const parentStats = await (0, import_promises4.stat)(parent);
        const parentHelper = this.fsw.createHelper(parent);
        parentHelper.pathGeneration = wh.pathGeneration;
        const parentCloser = await this.handleDirectory(parent, parentStats, initialAdd, depth, sp5.basename(wh.watchPath), parentHelper);
        const deletionCloser = this.watchSymlinkDeletion(wh.watchPath);
        if (!this.isHelperActive(wh)) {
          if (fileCloser)
            await fileCloser();
          if (parentCloser)
            await parentCloser();
          if (deletionCloser)
            deletionCloser();
          return "complete";
        }
        closer = async () => {
          await Promise.allSettled([fileCloser, parentCloser, deletionCloser].filter((candidate) => candidate !== void 0).map((backendCloser) => backendCloser()));
        };
        this.fsw.tree.symlinkPaths.set(logicalPathKey(path3), linkTarget);
      } else {
        if (followedTarget) {
          this.fsw.tree.symlinkPaths.set(logicalPathKey(path3), followedTarget);
        }
        const retainsNativeFact = !this.fsw.options.backendCapabilities.polling && !wh.recursiveRoot && !priorWh;
        const fileCloser = this.handleFile(wh.watchPath, stats, initialAdd, !wh.recursiveRoot, wh.observationTrigger, initialAdd && Boolean(wh.recursiveRoot), retainsNativeFact);
        const targetPath = followedTarget ?? (retainsNativeFact ? wh.watchPath : void 0);
        const targetCloser = targetPath ? this.subscribeMappedFile(wh.watchPath, targetPath, wh, depth, isMacos && stats.isFile()) : void 0;
        let parentCloser;
        if (retainsNativeFact && followedTarget) {
          const parent = sp5.dirname(wh.watchPath);
          const parentStats = await (0, import_promises4.stat)(parent);
          const parentHelper = this.fsw.createHelper(parent);
          parentHelper.pathGeneration = wh.pathGeneration;
          parentCloser = await this.handleDirectory(parent, parentStats, initialAdd, depth, sp5.basename(wh.watchPath), parentHelper);
        }
        const fileClosers = [fileCloser, targetCloser, parentCloser].filter((candidate) => candidate !== void 0);
        closer = fileClosers.length === 0 ? void 0 : async () => {
          await Promise.allSettled(fileClosers.map((fileCloser2) => fileCloser2()));
        };
      }
      if (!this.isHelperActive(wh)) {
        if (closer)
          await closer();
        return "complete";
      }
      if (closer)
        this.fsw.addPathCloser(target ? sp5.join(path3, target) : path3, closer);
      return "complete";
    } catch (error) {
      if (!this.isHelperActive(wh)) {
        return "complete";
      }
      this.fsw.handleError(error);
      return "watch-parent";
    }
  }
};

// node_modules/chokidar/index.js
var DOT_RE = /\..*\.(sw[px])$|~$|\.subl.*\.tmp/;
var WATCH_BACKENDS = /* @__PURE__ */ new Set(["auto", "native", "native-recursive", "polling"]);
var DEF_AWF = Object.freeze({ stabilityThreshold: 2e3, pollInterval: 100 });
function* ancestorKeys(path3) {
  let current = sp6.resolve(path3);
  for (let parent = sp6.dirname(current); parent !== current; parent = sp6.dirname(parent)) {
    yield logicalPathKey(parent);
    current = parent;
  }
}
function arrify(item) {
  return Array.isArray(item) ? item : [item];
}
function unifyPaths(paths_) {
  const paths = arrify(paths_).flat();
  if (!paths.every((p) => typeof p === "string")) {
    throw new TypeError(`Non-string provided as watch path: ${paths}`);
  }
  return paths.map(normalizePath);
}
function getAbsolutePath(path3, cwd) {
  if (sp6.isAbsolute(path3)) {
    return path3;
  }
  return sp6.join(cwd, path3);
}
function validatePositiveFinite(name, value) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new TypeError(`${name} must be a finite number greater than zero`);
  }
}
function validateNonNegativeFinite(name, value) {
  if (!Number.isFinite(value) || value < 0) {
    throw new TypeError(`${name} must be a finite non-negative number`);
  }
}
function validateOptions(opts) {
  validatePositiveFinite("pollingInterval", opts.pollingInterval);
  validatePositiveFinite("pollingBinaryInterval", opts.pollingBinaryInterval);
  if (typeof opts.atomic === "number")
    validateNonNegativeFinite("atomic", opts.atomic);
  else if (typeof opts.atomic !== "boolean") {
    throw new TypeError("atomic must be a boolean or finite non-negative number");
  }
  if (opts.depth !== void 0 && (!Number.isSafeInteger(opts.depth) || opts.depth < 0)) {
    throw new TypeError("depth must be a non-negative safe integer");
  }
  if (opts.awaitWriteFinish) {
    validatePositiveFinite("awaitWriteFinish.pollInterval", opts.awaitWriteFinish.pollInterval);
    validateNonNegativeFinite("awaitWriteFinish.stabilityThreshold", opts.awaitWriteFinish.stabilityThreshold);
  }
}
var FSWatcher = class extends import_node_events.EventEmitter {
  options;
  /** @internal */
  lifecycle;
  /** @internal */
  tree;
  /** @internal */
  reconciliation;
  /** @internal */
  events;
  /** @internal */
  scheduler;
  /** @internal */
  handler;
  /** @internal */
  readyEmitted;
  /** @internal */
  streams;
  get closed() {
    return this.lifecycle !== void 0 && this.lifecycle.state !== "OPEN";
  }
  #ignoredPaths;
  #pendingAdds;
  #pathMutation;
  #pathBarriers;
  #closePromise;
  #userIgnored;
  #realDirs;
  #roots;
  #rootAncestors;
  #unwatchIgnored;
  #readyPending;
  #readyScheduled;
  // Not indenting methods for history sake; for now.
  constructor(_opts = {}, scheduler = systemScheduler) {
    super();
    if (_opts.backend !== void 0 && !WATCH_BACKENDS.has(_opts.backend)) {
      throw new TypeError("backend must be auto, native, native-recursive, or polling");
    }
    this.#ignoredPaths = /* @__PURE__ */ new Set();
    this.streams = /* @__PURE__ */ new Set();
    this.#pendingAdds = /* @__PURE__ */ new Map();
    this.#pathMutation = 0;
    this.#pathBarriers = /* @__PURE__ */ new Map();
    this.#realDirs = /* @__PURE__ */ new Map();
    this.#roots = /* @__PURE__ */ new Set();
    this.#rootAncestors = /* @__PURE__ */ new Map();
    this.readyEmitted = false;
    this.#readyPending = false;
    this.#readyScheduled = false;
    this.scheduler = scheduler;
    const awf = _opts.awaitWriteFinish;
    const opts = {
      ..._opts,
      // Defaults
      persistent: _opts.persistent ?? true,
      ignoreInitial: _opts.ignoreInitial ?? false,
      ignorePermissionErrors: _opts.ignorePermissionErrors ?? false,
      pollingInterval: _opts.pollingInterval ?? _opts.interval ?? 100,
      pollingBinaryInterval: _opts.pollingBinaryInterval ?? _opts.binaryInterval ?? 300,
      interval: 100,
      binaryInterval: 300,
      followSymlinks: _opts.followSymlinks ?? true,
      backend: _opts.backend ?? "auto",
      usePolling: _opts.usePolling ?? false,
      // `undefined` already means unlimited traversal. Preserve the common
      // `depth: Infinity` spelling without forcing the per-directory backend.
      depth: _opts.depth === Number.POSITIVE_INFINITY ? void 0 : _opts.depth,
      backendStrategy: "native-per-directory",
      backendCapabilities: void 0,
      // useAsync: false,
      atomic: _opts.atomic ?? true,
      // Change format
      ignored: Object.freeze(_opts.ignored ? arrify(_opts.ignored).map(cloneOwnedMatcher) : []),
      awaitWriteFinish: awf === true ? DEF_AWF : typeof awf === "object" ? Object.freeze({ ...DEF_AWF, ...awf }) : false
    };
    if (_opts.usePolling === true || isIBMi)
      opts.backend = "polling";
    const envPoll = process.env.CHOKIDAR_USEPOLLING;
    if (envPoll !== void 0) {
      const envLower = envPoll.toLowerCase();
      const envPolling = envLower === "false" || envLower === "0" ? false : envLower === "true" || envLower === "1" ? true : !!envLower;
      if (envPolling)
        opts.backend = "polling";
      else if (opts.backend === "polling")
        opts.backend = "auto";
    }
    const envInterval = process.env.CHOKIDAR_INTERVAL;
    if (envInterval !== void 0)
      opts.pollingInterval = Number(envInterval);
    opts.interval = opts.pollingInterval;
    opts.binaryInterval = opts.pollingBinaryInterval;
    opts.usePolling = opts.backend === "polling";
    opts.backendCapabilities = selectBackend(opts);
    opts.backendStrategy = opts.backendCapabilities.kind;
    if (_opts.atomic === void 0)
      opts.atomic = !opts.usePolling;
    validateOptions(opts);
    this.options = opts;
    this.lifecycle = new LifecycleScope(() => {
      if (this.#readyPending)
        this.queueReady();
    }, (error) => {
      if (!this.closed)
        this.handleError(error instanceof Error ? error : new Error(String(error)));
    });
    this.tree = new TreeState(() => !this.options.backendCapabilities.polling);
    this.reconciliation = new ReconciliationQueue(this.lifecycle);
    this.events = new EventPolicy({
      options: this.options,
      scheduler: this.scheduler,
      lifecycle: this.lifecycle,
      isClosed: () => this.closed,
      capturePathGeneration: () => this.capturePathGeneration(),
      isPathGenerationActive: (path3, generation) => this.isPathGenerationActive(path3, generation),
      isReady: () => this.readyEmitted,
      remove: (directory, item) => this.removePath(directory, item),
      handleError: (error) => this.handleError(error),
      publish: (event, args) => this.emitWithAll(event, args)
    });
    this.handler = new ObservationEngine(this);
    Object.freeze(opts);
  }
  addIgnoredPath(matcher) {
    matcher = this.ignoredMatcher(matcher);
    if (isMatcherObject(matcher)) {
      for (const ignored of this.#ignoredPaths) {
        if (isMatcherObject(ignored) && ignored.path === matcher.path && ignored.recursive === matcher.recursive) {
          return;
        }
      }
    }
    this.#ignoredPaths.add(matcher);
    this.#unwatchIgnored = void 0;
  }
  removeIgnoredPath(matcher) {
    matcher = this.ignoredMatcher(matcher);
    this.#ignoredPaths.delete(matcher);
    if (typeof matcher === "string") {
      for (const ignored of this.#ignoredPaths) {
        if (isMatcherObject(ignored) && ignored.path === matcher) {
          this.#ignoredPaths.delete(ignored);
        }
      }
    }
    this.#unwatchIgnored = void 0;
  }
  ignoredMatcher(matcher) {
    if (typeof matcher === "string")
      return logicalPathKey(matcher);
    if (isMatcherObject(matcher)) {
      return { path: logicalPathKey(matcher.path), recursive: matcher.recursive };
    }
    return matcher;
  }
  /** @internal */
  capturePathGeneration() {
    return this.#pathMutation;
  }
  invalidatePath(path3) {
    this.#pathBarriers.set(logicalPathKey(path3), ++this.#pathMutation);
  }
  /** @internal */
  isPathGenerationActive(path3, generation) {
    if (this.lifecycle.state !== "OPEN")
      return false;
    if (this.#pathBarriers.size === 0)
      return true;
    const logicalKey = logicalPathKey(path3);
    for (const [barrier, barrierGeneration] of this.#pathBarriers) {
      if (barrierGeneration <= generation)
        continue;
      if (isSameOrInside(barrier, logicalKey))
        return false;
    }
    return true;
  }
  queueReady() {
    if (this.closed || this.readyEmitted)
      return;
    this.#readyPending = true;
    if (this.lifecycle.tasks.size > 0 || this.#readyScheduled)
      return;
    this.#readyScheduled = true;
    process.nextTick(() => {
      this.#readyScheduled = false;
      if (this.closed || this.readyEmitted || this.lifecycle.tasks.size > 0)
        return;
      this.#readyPending = false;
      this.readyEmitted = true;
      this.emit(EVENTS.READY);
    });
  }
  // Public methods
  /**
   * Adds paths to be watched on an existing FSWatcher instance.
   * @param paths_ file or file list
   */
  add(paths_) {
    if (this.closed) {
      throw new Error("Cannot add paths after FSWatcher.close() has been called");
    }
    const { cwd } = this.options;
    let paths = unifyPaths(paths_);
    if (cwd) {
      paths = paths.map((path3) => {
        const absPath = getAbsolutePath(path3, cwd);
        return absPath;
      });
    }
    paths.forEach((path3) => {
      this.removeIgnoredPath(path3);
      this.addRootAncestors(path3);
    });
    if (!this.readyEmitted)
      this.#readyPending = true;
    const addTask = Promise.all(paths.map(async (path3) => {
      const key = logicalPathKey(path3);
      if (this.lifecycle.closers.has(key) || this.#pendingAdds.has(key))
        return;
      const pendingToken = Symbol(key);
      const pathGeneration = this.capturePathGeneration();
      this.#pendingAdds.set(key, pendingToken);
      try {
        await this.handler.addRoot(path3, true, pathGeneration);
      } finally {
        if (this.#pendingAdds.get(key) === pendingToken)
          this.#pendingAdds.delete(key);
      }
    }));
    this.lifecycle.track(addTask);
    if (!this.readyEmitted)
      this.queueReady();
    return this;
  }
  /**
   * Close watchers or start ignoring events from specified paths.
   */
  unwatch(paths_) {
    if (this.closed)
      return this;
    let paths = unifyPaths(paths_);
    const { cwd } = this.options;
    if (cwd)
      paths = paths.map((path3) => getAbsolutePath(path3, cwd));
    paths.forEach((path3) => {
      const key = logicalPathKey(path3);
      const isDirectory = this.tree.watched.has(key);
      this.invalidatePath(key);
      this.removeRootAncestors(key);
      this.#pendingAdds.delete(key);
      this.events.cancelPath(key);
      this.closePath(key, isDirectory);
      this.addIgnoredPath(key);
      if (isDirectory) {
        this.addIgnoredPath({
          path: key,
          recursive: true
        });
      }
      this.#unwatchIgnored = void 0;
    });
    return this;
  }
  /**
   * Close watchers and remove all listeners from watched paths.
   */
  close() {
    if (this.#closePromise) {
      return this.#closePromise;
    }
    const closers = this.lifecycle.beginClose();
    this.removeAllListeners();
    this.events.close();
    this.#pendingAdds.clear();
    this.#roots.clear();
    this.#rootAncestors.clear();
    this.streams.forEach((stream) => stream.destroy());
    this.#userIgnored = void 0;
    this.#unwatchIgnored = void 0;
    this.readyEmitted = false;
    this.tree.dispose();
    this.#pathBarriers.clear();
    this.streams.clear();
    this.reconciliation.clear();
    this.#realDirs.clear();
    this.#closePromise = (async () => {
      const closerResults = await Promise.allSettled(closers);
      await this.lifecycle.drain();
      this.lifecycle.finishClose();
      const failed = closerResults.find((result) => result.status === "rejected");
      if (failed)
        throw failed.reason;
    })();
    return this.#closePromise;
  }
  /**
   * Expose list of watched paths. The result has a null prototype, so a
   * directory named `__proto__` is an ordinary own key.
   */
  getWatched() {
    const watchList = /* @__PURE__ */ Object.create(null);
    this.tree.watched.forEach((entry) => {
      const dir = entry.path;
      const key = this.options.cwd ? sp6.relative(this.options.cwd, dir) : dir;
      const index = key || ".";
      watchList[index] = entry.getChildren().sort();
    });
    return watchList;
  }
  /** @internal */
  emitRaw(...args) {
    if (!this.closed)
      this.emit(EVENTS.RAW, ...args);
  }
  emitWithAll(event, args) {
    this.emit(event, ...args);
    if (event !== EVENTS.ERROR)
      this.emit(EVENTS.ALL, event, ...args);
  }
  // Common helpers
  // --------------
  /**
   * Normalize and emit events.
   * Calling emitEvent DOES NOT MEAN emit() would be called!
   * @param event Type of event
   * @param path File or directory path
   * @param stats arguments to be passed with event
   * @internal
   */
  async emitEvent(event, path3, stats) {
    if (this.closed)
      return;
    await this.events.emit(event, path3, stats);
  }
  /**
   * Common handler for backend and reconciliation failures.
   * @internal
   */
  handleError(error) {
    if (this.closed)
      return;
    const normalized = error instanceof Error ? error : new Error(String(error));
    if (!isMissingError(normalized) && (!this.options.ignorePermissionErrors || !isPermissionError(normalized))) {
      this.emit(EVENTS.ERROR, normalized);
    }
  }
  /**
   * Determines whether user has asked to ignore this path.
   * @internal
   */
  isIgnored(path3, stats) {
    if (this.options.atomic && DOT_RE.test(path3))
      return true;
    if (!this.#userIgnored) {
      const { cwd } = this.options;
      const ign = this.options.ignored;
      const ignored = (ign || []).map((matcher) => normalizeMatcher(matcher, cwd));
      const direct = compileMatchers(ignored);
      const pathMatchers = ignored.filter((matcher) => typeof matcher === "string" || isMatcherObject(matcher));
      const canonical = compileMatchers(pathMatchers);
      this.#userIgnored = (candidate, candidateStats) => {
        if (direct(candidate, candidateStats))
          return true;
        if (isWindows || pathMatchers.length === 0)
          return false;
        const absoluteCandidate = sp6.resolve(candidate);
        let realPath;
        if (candidateStats?.isDirectory()) {
          realPath = this.realDirectory(absoluteCandidate);
        } else {
          const realDir = this.realDirectory(sp6.dirname(absoluteCandidate));
          if (realDir !== void 0)
            realPath = sp6.join(realDir, sp6.basename(absoluteCandidate));
        }
        return realPath !== void 0 && realPath !== absoluteCandidate && canonical(realPath, candidateStats);
      };
    }
    if (this.#userIgnored(path3, stats) && !this.isRootAncestor(path3, stats))
      return true;
    if (this.#ignoredPaths.size === 0)
      return false;
    if (!this.#unwatchIgnored) {
      this.#unwatchIgnored = compileMatchers([...this.#ignoredPaths]);
    }
    return this.#unwatchIgnored(logicalPathKey(path3), stats);
  }
  isRootAncestor(path3, stats) {
    if (stats?.isFile())
      return false;
    return this.#rootAncestors.has(logicalPathKey(path3));
  }
  /** Records every directory above a requested root; refcounted across roots. */
  addRootAncestors(path3) {
    const key = logicalPathKey(path3);
    if (this.#roots.has(key))
      return;
    this.#roots.add(key);
    for (const ancestor of ancestorKeys(path3)) {
      this.#rootAncestors.set(ancestor, (this.#rootAncestors.get(ancestor) ?? 0) + 1);
    }
  }
  removeRootAncestors(path3) {
    if (!this.#roots.delete(logicalPathKey(path3)))
      return;
    for (const ancestor of ancestorKeys(path3)) {
      const count = (this.#rootAncestors.get(ancestor) ?? 1) - 1;
      if (count > 0)
        this.#rootAncestors.set(ancestor, count);
      else
        this.#rootAncestors.delete(ancestor);
    }
  }
  realDirectory(directory) {
    const key = logicalPathKey(directory);
    if (this.#realDirs.has(key))
      return this.#realDirs.get(key);
    let realPath;
    try {
      realPath = import_node_fs2.realpathSync.native(directory);
    } catch {
    }
    this.#realDirs.set(key, realPath);
    return realPath;
  }
  /** @internal */
  isUnwatched(path3) {
    if (this.#ignoredPaths.size === 0)
      return false;
    if (!this.#unwatchIgnored) {
      this.#unwatchIgnored = compileMatchers([...this.#ignoredPaths]);
    }
    return this.#unwatchIgnored(logicalPathKey(path3));
  }
  /**
   * Provides a set of common helpers and properties relating to symlink handling.
   * @param path file or directory pattern being watched
   * @internal
   */
  createHelper(path3) {
    return new WatchHelper(path3, this.options.followSymlinks, {
      capturePathGeneration: () => this.capturePathGeneration(),
      isntIgnored: (candidate, stats) => !this.isIgnored(candidate, stats)
    });
  }
  removeTreeItem(directory, item) {
    const entry = this.tree.peekDirectory(directory);
    if (!entry?.remove(item))
      return;
    const path3 = entry.path;
    const generation = this.lifecycle.generation;
    this.lifecycle.track((async () => {
      try {
        await (0, import_promises5.readdir)(path3);
      } catch (error) {
        if (isMissingError(error) && this.lifecycle.isActive(generation)) {
          this.removePath(sp6.dirname(path3), sp6.basename(path3));
        }
      }
    })());
  }
  // File helpers
  // ------------
  /**
   * Handles emitting unlink events for
   * files and directories, and via recursion, for
   * files and directories within directories that are unlinked
   * @param directory within which the following item is located
   * @param item      base path of item/directory
   * @internal
   */
  removePath(directory, item, isDirectory) {
    const path3 = sp6.join(directory, item);
    const logicalKey = logicalPathKey(path3);
    isDirectory = isDirectory != null ? isDirectory : this.tree.watched.has(logicalKey);
    const nestedDirectoryChildren = this.tree.peekDirectory(path3)?.getChildren() ?? [];
    for (const nested of nestedDirectoryChildren)
      this.removePath(path3, nested);
    const wasTracked = this.tree.peekDirectory(directory)?.has(item) ?? false;
    const hadClosers = this.lifecycle.closers.has(logicalKey);
    this.removeTreeItem(directory, item);
    if (this.tree.symlinkPaths.has(logicalKey)) {
      this.tree.symlinkPaths.delete(logicalKey);
    }
    const pendingWrite = this.events.pendingWrites.get(logicalKey);
    let suppressEvent = false;
    if (this.options.awaitWriteFinish && pendingWrite) {
      const event = pendingWrite.cancelWait();
      suppressEvent = event === EVENTS.ADD;
    }
    this.tree.watched.delete(logicalKey);
    this.tree.observed.delete(logicalKey);
    const eventName = isDirectory ? EVENTS.UNLINK_DIR : EVENTS.UNLINK;
    if (wasTracked && !suppressEvent && !this.isIgnored(path3))
      this.emitEvent(eventName, path3);
    this.closePath(path3);
    if ((wasTracked || hadClosers) && this.#roots.has(logicalKey))
      this.rewatchMissingPath(path3);
  }
  /**
   * Replaces every watch keyed at `path` with a wait from its nearest existing
   * ancestor, so the path is reported again when it reappears.
   * @internal
   */
  rewatchMissingPath(path3) {
    if (this.closed || this.isUnwatched(path3))
      return;
    this.closePath(path3);
    this.lifecycle.track(this.handler.addRoot(path3, false, this.capturePathGeneration()));
  }
  /**
   * Closes all watchers for a path
   * @internal
   */
  closePath(path3, recursive = false) {
    const logicalKey = logicalPathKey(path3);
    const contains = (candidate) => {
      if (candidate === logicalKey)
        return true;
      if (!recursive)
        return false;
      return isStrictlyInside(logicalKey, candidate);
    };
    [...this.lifecycle.closers.keys()].filter(contains).forEach((key) => this.closeFile(key));
    if (this.#realDirs.delete(logicalKey) || recursive) {
      const prefix = logicalKey.endsWith("/") ? logicalKey : `${logicalKey}/`;
      for (const key of this.#realDirs.keys()) {
        if (key.startsWith(prefix))
          this.#realDirs.delete(key);
      }
    }
    if (recursive) {
      for (const [key, entry] of this.tree.watched) {
        if (!contains(key))
          continue;
        entry.dispose();
        this.tree.watched.delete(key);
      }
      for (const key of this.tree.observed.keys()) {
        if (contains(key))
          this.tree.observed.delete(key);
      }
      for (const key of this.tree.symlinkPaths.keys()) {
        if (contains(key))
          this.tree.symlinkPaths.delete(key);
      }
      this.events.cancelWhere(contains);
      this.reconciliation.forgetPending((scope, candidate) => contains(scope) || contains(candidate));
      for (const key of this.#pendingAdds.keys()) {
        if (contains(key))
          this.#pendingAdds.delete(key);
      }
    }
    const dir = sp6.dirname(logicalKey);
    this.removeTreeItem(dir, sp6.basename(logicalKey));
  }
  /**
   * Closes only file-specific watchers
   */
  closeFile(path3) {
    const key = logicalPathKey(path3);
    const closers = this.lifecycle.takeClosers(key);
    if (closers.length === 0)
      return;
    closers.forEach((closer) => {
      try {
        const result = closer();
        if (result instanceof Promise)
          this.lifecycle.track(result);
      } catch (error) {
        this.lifecycle.track(Promise.reject(error));
      }
    });
  }
  /** @internal */
  addPathCloser(path3, closer) {
    if (!closer)
      return;
    if (this.closed || this.isUnwatched(path3)) {
      try {
        const result = closer();
        if (result instanceof Promise)
          this.lifecycle.track(result);
      } catch (error) {
        this.lifecycle.track(Promise.reject(error));
      }
      return;
    }
    const key = logicalPathKey(path3);
    this.lifecycle.addCloser(key, closer);
  }
  /** @internal */
  createScanStream(root, opts) {
    if (this.closed)
      return;
    const options = { type: EVENTS.ALL, alwaysStat: true, lstat: true, depth: 0, ...opts };
    const stream = readdirp(root, options);
    this.streams.add(stream);
    const finalize = () => this.streams.delete(stream);
    stream.once("close", finalize);
    stream.once("end", finalize);
    stream.once(EVENTS.ERROR, finalize);
    return stream;
  }
};
function watch(paths, options = {}) {
  const watcher = new FSWatcher(options);
  watcher.add(paths);
  return watcher;
}
var chokidar_default = { watch, FSWatcher };

// src/lib/ecdictSeed.ts
var BUILTIN_ECDICT_RECORDS = [
  // 高频不规则与常见动词（重点演示 ECDICT exchange 词形还原）
  { word: "go", phonetic: "\u0261\u0259\u028A", pos: "v.", translation: "\u53BB\uFF1B\u8FD0\u884C\uFF1B\u53D8\u5F97", exchange: "p:went/d:gone/i:going/3:goes" },
  { word: "plan", phonetic: "pl\xE6n", pos: "n./v.", translation: "\u8BA1\u5212\uFF1B\u65B9\u6848\uFF1B\u89C4\u5212", exchange: "s:plans/p:planned/d:planned/i:planning/3:plans" },
  { word: "be", phonetic: "bi\u02D0", pos: "v.", translation: "\u662F\uFF1B\u5B58\u5728\uFF1B\u6210\u4E3A", exchange: "p:was/d:been/i:being/3:is/0:are/1:were" },
  { word: "have", phonetic: "h\xE6v", pos: "v.", translation: "\u62E5\u6709\uFF1B\u5177\u6709\uFF1B\u8FDB\u884C", exchange: "p:had/d:had/i:having/3:has" },
  { word: "do", phonetic: "du\u02D0", pos: "v.", translation: "\u505A\uFF1B\u6267\u884C\uFF1B\u5B8C\u6210", exchange: "p:did/d:done/i:doing/3:does" },
  { word: "make", phonetic: "me\u026Ak", pos: "v.", translation: "\u5236\u9020\uFF1B\u4F7F\u6210\u4E3A\uFF1B\u5236\u5B9A", exchange: "p:made/d:made/i:making/3:makes" },
  { word: "take", phonetic: "te\u026Ak", pos: "v.", translation: "\u91C7\u53D6\uFF1B\u9700\u8981\uFF1B\u83B7\u53D6", exchange: "p:took/d:taken/i:taking/3:takes" },
  { word: "give", phonetic: "\u0261\u026Av", pos: "v.", translation: "\u7ED9\u4E88\uFF1B\u63D0\u4F9B\uFF1B\u4EA7\u751F", exchange: "p:gave/d:given/i:giving/3:gives" },
  { word: "get", phonetic: "\u0261et", pos: "v.", translation: "\u83B7\u5F97\uFF1B\u53D8\u5F97\uFF1B\u4FC3\u4F7F", exchange: "p:got/d:gotten/i:getting/3:gets" },
  { word: "find", phonetic: "fa\u026And", pos: "v.", translation: "\u53D1\u73B0\uFF1B\u627E\u5230\uFF1B\u8BA4\u4E3A", exchange: "p:found/d:found/i:finding/3:finds" },
  { word: "keep", phonetic: "ki\u02D0p", pos: "v.", translation: "\u4FDD\u6301\uFF1B\u7EF4\u6301\uFF1B\u4FDD\u5B58", exchange: "p:kept/d:kept/i:keeping/3:keeps" },
  { word: "run", phonetic: "r\u028Cn", pos: "v.", translation: "\u8FD0\u884C\uFF1B\u7ECF\u8425\uFF1B\u8FD0\u8F6C", exchange: "p:ran/d:run/i:running/3:runs" },
  { word: "build", phonetic: "b\u026Ald", pos: "v.", translation: "\u6784\u5EFA\uFF1B\u5EFA\u7ACB\uFF1B\u5F00\u53D1", exchange: "p:built/d:built/i:building/3:builds" },
  { word: "buy", phonetic: "ba\u026A", pos: "v.", translation: "\u8D2D\u4E70\uFF1B\u91C7\u8D2D", exchange: "p:bought/d:bought/i:buying/3:buys" },
  { word: "sell", phonetic: "sel", pos: "v.", translation: "\u9500\u552E\uFF1B\u51FA\u552E", exchange: "p:sold/d:sold/i:selling/3:sells" },
  { word: "lead", phonetic: "li\u02D0d", pos: "v./n.", translation: "\u5BFC\u81F4\uFF1B\u5F15\u9886\uFF1B\u9886\u5148\u5730\u4F4D", exchange: "p:led/d:led/i:leading/3:leads" },
  { word: "drive", phonetic: "dra\u026Av", pos: "v./n.", translation: "\u9A71\u52A8\uFF1B\u63A8\u52A8\uFF1B\u9A71\u52A8\u5668", exchange: "p:drove/d:driven/i:driving/3:drives" },
  { word: "grow", phonetic: "\u0261r\u0259\u028A", pos: "v.", translation: "\u589E\u957F\uFF1B\u53D1\u5C55\uFF1B\u6269\u5927", exchange: "p:grew/d:grown/i:growing/3:grows" },
  { word: "rise", phonetic: "ra\u026Az", pos: "v./n.", translation: "\u4E0A\u5347\uFF1B\u589E\u957F\uFF1B\u4E0A\u6DA8", exchange: "p:rose/d:risen/i:rising/3:rises" },
  { word: "fall", phonetic: "f\u0254\u02D0l", pos: "v./n.", translation: "\u4E0B\u964D\uFF1B\u8DCC\u843D\uFF1B\u51CF\u5C11", exchange: "p:fell/d:fallen/i:falling/3:falls" },
  { word: "choose", phonetic: "t\u0283u\u02D0z", pos: "v.", translation: "\u9009\u62E9\uFF1B\u6311\u9009", exchange: "p:chose/d:chosen/i:choosing/3:chooses" },
  { word: "good", phonetic: "\u0261\u028Ad", pos: "adj./n.", translation: "\u597D\u7684\uFF1B\u5546\u54C1\uFF1B\u76CA\u5904", exchange: "r:better/t:best/s:goods" },
  { word: "high", phonetic: "ha\u026A", pos: "adj.", translation: "\u9AD8\u7684\uFF1B\u9AD8\u7EA7\u7684\uFF1B\u5F3A\u70C8\u7684", exchange: "r:higher/t:highest" },
  { word: "low", phonetic: "l\u0259\u028A", pos: "adj.", translation: "\u4F4E\u7684\uFF1B\u4F4E\u5EC9\u7684\uFF1B\u4E0D\u8DB3\u7684", exchange: "r:lower/t:lowest" },
  { word: "large", phonetic: "l\u0251\u02D0d\u0292", pos: "adj.", translation: "\u5927\u7684\uFF1B\u5927\u89C4\u6A21\u7684", exchange: "r:larger/t:largest" },
  { word: "small", phonetic: "sm\u0254\u02D0l", pos: "adj.", translation: "\u5C0F\u7684\uFF1B\u5C0F\u89C4\u6A21\u7684", exchange: "r:smaller/t:smallest" },
  { word: "easy", phonetic: "\u02C8i\u02D0zi", pos: "adj.", translation: "\u5BB9\u6613\u7684\uFF1B\u8F7B\u677E\u7684", exchange: "r:easier/t:easiest" },
  { word: "fast", phonetic: "f\u0251\u02D0st", pos: "adj./adv.", translation: "\u5FEB\u901F\u7684\uFF1B\u8FC5\u901F\u5730", exchange: "r:faster/t:fastest" },
  { word: "strong", phonetic: "str\u0252\u014B", pos: "adj.", translation: "\u5F3A\u5927\u7684\uFF1B\u7A33\u56FA\u7684\uFF1B\u6FC0\u70C8\u7684", exchange: "r:stronger/t:strongest" },
  { word: "weak", phonetic: "wi\u02D0k", pos: "adj.", translation: "\u5F31\u7684\uFF1B\u8584\u5F31\u7684", exchange: "r:weaker/t:weakest" },
  // ICT 信息系统与管理信息系统核心词
  { word: "information", phonetic: "\u02CC\u026Anf\u0259\u02C8me\u026A\u0283n", pos: "n.", translation: "\u4FE1\u606F\uFF1B\u60C5\u62A5\uFF1B\u8D44\u6599" },
  { word: "system", phonetic: "\u02C8s\u026Ast\u0259m", pos: "n.", translation: "\u7CFB\u7EDF\uFF1B\u4F53\u7CFB\uFF1B\u5236\u5EA6", exchange: "s:systems" },
  { word: "technology", phonetic: "tek\u02C8n\u0252l\u0259d\u0292i", pos: "n.", translation: "\u6280\u672F\uFF1B\u79D1\u6280\uFF1B\u5DE5\u827A", exchange: "s:technologies" },
  { word: "organization", phonetic: "\u02CC\u0254\u02D0\u0261\u0259na\u026A\u02C8ze\u026A\u0283n", pos: "n.", translation: "\u7EC4\u7EC7\uFF1B\u673A\u6784\uFF1B\u4F01\u4E1A", exchange: "s:organizations" },
  { word: "organisation", phonetic: "\u02CC\u0254\u02D0\u0261\u0259na\u026A\u02C8ze\u026A\u0283n", pos: "n.", translation: "\u7EC4\u7EC7\uFF1B\u673A\u6784\uFF1B\u4F01\u4E1A", exchange: "s:organisations" },
  { word: "enterprise", phonetic: "\u02C8ent\u0259pra\u026Az", pos: "n.", translation: "\u4F01\u4E1A\uFF1B\u4E8B\u4E1A\uFF1B\u8FDB\u53D6\u5FC3", exchange: "s:enterprises" },
  { word: "cloud", phonetic: "kla\u028Ad", pos: "n.", translation: "\u4E91\uFF1B\u4E91\u8BA1\u7B97\uFF1B\u4E91\u7AEF", exchange: "s:clouds" },
  { word: "hybrid", phonetic: "\u02C8ha\u026Abr\u026Ad", pos: "adj./n.", translation: "\u6DF7\u5408\u7684\uFF1B\u6DF7\u5408\u6A21\u5F0F\uFF1B\u6742\u5408\u4F53", exchange: "s:hybrids" },
  { word: "infrastructure", phonetic: "\u02C8\u026Anfr\u0259str\u028Ckt\u0283\u0259(r)", pos: "n.", translation: "\u57FA\u7840\u8BBE\u65BD\uFF1B\u5E95\u5C42\u67B6\u6784", exchange: "s:infrastructures" },
  { word: "architecture", phonetic: "\u02C8\u0251\u02D0k\u026Atekt\u0283\u0259(r)", pos: "n.", translation: "\u67B6\u6784\uFF1B\u4F53\u7CFB\u7ED3\u6784\uFF1B\u5EFA\u7B51\u5B66", exchange: "s:architectures" },
  { word: "database", phonetic: "\u02C8de\u026At\u0259be\u026As", pos: "n.", translation: "\u6570\u636E\u5E93\uFF1B\u8D44\u6599\u5E93", exchange: "s:databases" },
  { word: "warehouse", phonetic: "\u02C8we\u0259ha\u028As", pos: "n.", translation: "\u4ED3\u5E93\uFF1B\u6570\u636E\u4ED3\u5E93", exchange: "s:warehouses" },
  { word: "software", phonetic: "\u02C8s\u0252ftwe\u0259(r)", pos: "n.", translation: "\u8F6F\u4EF6\uFF1B\u7A0B\u5E8F" },
  { word: "hardware", phonetic: "\u02C8h\u0251\u02D0dwe\u0259(r)", pos: "n.", translation: "\u786C\u4EF6\uFF1B\u8BA1\u7B97\u673A\u8BBE\u5907" },
  { word: "network", phonetic: "\u02C8netw\u025C\u02D0k", pos: "n./v.", translation: "\u7F51\u7EDC\uFF1B\u7F51\u72B6\u7CFB\u7EDF\uFF1B\u8054\u7F51", exchange: "s:networks/i:networking/d:networked" },
  { word: "security", phonetic: "s\u026A\u02C8kj\u028A\u0259r\u0259ti", pos: "n.", translation: "\u5B89\u5168\uFF1B\u4FE1\u606F\u5B89\u5168\uFF1B\u4FDD\u969C", exchange: "s:securities" },
  { word: "privacy", phonetic: "\u02C8pr\u026Av\u0259si", pos: "n.", translation: "\u9690\u79C1\uFF1B\u4FDD\u5BC6\u6027" },
  { word: "encryption", phonetic: "\u026An\u02C8kr\u026Ap\u0283n", pos: "n.", translation: "\u52A0\u5BC6\uFF1B\u7F16\u7801" },
  { word: "authentication", phonetic: "\u0254\u02D0\u02CC\u03B8ent\u026A\u02C8ke\u026A\u0283n", pos: "n.", translation: "\u8EAB\u4EFD\u9A8C\u8BC1\uFF1B\u8BA4\u8BC1" },
  { word: "vulnerability", phonetic: "\u02CCv\u028Cln\u0259r\u0259\u02C8b\u026Al\u0259ti", pos: "n.", translation: "\u6F0F\u6D1E\uFF1B\u8106\u5F31\u6027", exchange: "s:vulnerabilities" },
  { word: "cybersecurity", phonetic: "\u02CCsa\u026Ab\u0259s\u026A\u02C8kj\u028A\u0259r\u0259ti", pos: "n.", translation: "\u7F51\u7EDC\u5B89\u5168" },
  { word: "scalability", phonetic: "\u02CCske\u026Al\u0259\u02C8b\u026Al\u0259ti", pos: "n.", translation: "\u53EF\u6269\u5C55\u6027\uFF1B\u4F38\u7F29\u6027" },
  { word: "scalable", phonetic: "\u02C8ske\u026Al\u0259bl", pos: "adj.", translation: "\u53EF\u6269\u5C55\u7684\uFF1B\u53EF\u4F38\u7F29\u7684" },
  { word: "latency", phonetic: "\u02C8le\u026At\u0259nsi", pos: "n.", translation: "\u5EF6\u8FDF\uFF1B\u6F5C\u4F0F\u671F" },
  { word: "bandwidth", phonetic: "\u02C8b\xE6ndw\u026Ad\u03B8", pos: "n.", translation: "\u5E26\u5BBD\uFF1B\u9891\u5BBD" },
  { word: "protocol", phonetic: "\u02C8pr\u0259\u028At\u0259k\u0252l", pos: "n.", translation: "\u534F\u8BAE\uFF1B\u89C4\u7A0B\uFF1B\u8349\u6848", exchange: "s:protocols" },
  { word: "algorithm", phonetic: "\u02C8\xE6l\u0261\u0259r\u026A\xF0\u0259m", pos: "n.", translation: "\u7B97\u6CD5\uFF1B\u8FD0\u7B97\u6CD5\u5219", exchange: "s:algorithms" },
  { word: "analytics", phonetic: "\u02CC\xE6n\u0259\u02C8l\u026At\u026Aks", pos: "n.", translation: "\u5206\u6790\u5B66\uFF1B\u6570\u636E\u5206\u6790" },
  { word: "analyze", phonetic: "\u02C8\xE6n\u0259la\u026Az", pos: "v.", translation: "\u5206\u6790\uFF1B\u89E3\u6790\uFF1B\u7814\u7A76", exchange: "p:analyzed/d:analyzed/i:analyzing/3:analyzes" },
  { word: "analyse", phonetic: "\u02C8\xE6n\u0259la\u026Az", pos: "v.", translation: "\u5206\u6790\uFF1B\u89E3\u6790\uFF1B\u7814\u7A76", exchange: "p:analysed/d:analysed/i:analysing/3:analyses" },
  { word: "analysis", phonetic: "\u0259\u02C8n\xE6l\u0259s\u026As", pos: "n.", translation: "\u5206\u6790\uFF1B\u89E3\u6790\u62A5\u544A", exchange: "s:analyses" },
  { word: "integrate", phonetic: "\u02C8\u026Ant\u026A\u0261re\u026At", pos: "v.", translation: "\u6574\u5408\uFF1B\u96C6\u6210\uFF1B\u878D\u5408", exchange: "p:integrated/d:integrated/i:integrating/3:integrates" },
  { word: "integration", phonetic: "\u02CC\u026Ant\u026A\u02C8\u0261re\u026A\u0283n", pos: "n.", translation: "\u6574\u5408\uFF1B\u96C6\u6210\uFF1B\u4E00\u4F53\u5316" },
  { word: "automate", phonetic: "\u02C8\u0254\u02D0t\u0259me\u026At", pos: "v.", translation: "\u4F7F\u81EA\u52A8\u5316\uFF1B\u81EA\u52A8\u8FD0\u884C", exchange: "p:automated/d:automated/i:automating/3:automates" },
  { word: "automation", phonetic: "\u02CC\u0254\u02D0t\u0259\u02C8me\u026A\u0283n", pos: "n.", translation: "\u81EA\u52A8\u5316\uFF1B\u81EA\u52A8\u63A7\u5236" },
  { word: "deploy", phonetic: "d\u026A\u02C8pl\u0254\u026A", pos: "v.", translation: "\u90E8\u7F72\uFF1B\u914D\u7F6E\uFF1B\u5C55\u5F00", exchange: "p:deployed/d:deployed/i:deploying/3:deploys" },
  { word: "deployment", phonetic: "d\u026A\u02C8pl\u0254\u026Am\u0259nt", pos: "n.", translation: "\u90E8\u7F72\uFF1B\u4E0A\u7EBF\u53D1\u5E03", exchange: "s:deployments" },
  { word: "migrate", phonetic: "ma\u026A\u02C8\u0261re\u026At", pos: "v.", translation: "\u8FC1\u79FB\uFF1B\u79FB\u690D\uFF1B\u8F6C\u79FB", exchange: "p:migrated/d:migrated/i:migrating/3:migrates" },
  { word: "migration", phonetic: "ma\u026A\u02C8\u0261re\u026A\u0283n", pos: "n.", translation: "\u8FC1\u79FB\uFF1B\u6570\u636E\u8FC1\u79FB" },
  { word: "virtualization", phonetic: "\u02CCv\u025C\u02D0t\u0283u\u0259la\u026A\u02C8ze\u026A\u0283n", pos: "n.", translation: "\u865A\u62DF\u5316" },
  { word: "server", phonetic: "\u02C8s\u025C\u02D0v\u0259(r)", pos: "n.", translation: "\u670D\u52A1\u5668\uFF1B\u670D\u52A1\u7A0B\u5E8F", exchange: "s:servers" },
  { word: "client", phonetic: "\u02C8kla\u026A\u0259nt", pos: "n.", translation: "\u5BA2\u6237\u7AEF\uFF1B\u5BA2\u6237\uFF1B\u59D4\u6258\u4EBA", exchange: "s:clients" },
  { word: "vendor", phonetic: "\u02C8vend\u0259(r)", pos: "n.", translation: "\u4F9B\u5E94\u5546\uFF1B\u5356\u65B9\uFF1B\u8F6F\u4EF6\u5382\u5546", exchange: "s:vendors" },
  { word: "outsource", phonetic: "\u02C8a\u028Ats\u0254\u02D0s", pos: "v.", translation: "\u5916\u5305\uFF1B\u5916\u90E8\u91C7\u8D2D", exchange: "p:outsourced/d:outsourced/i:outsourcing/3:outsources" },
  { word: "outsourcing", phonetic: "\u02C8a\u028Ats\u0254\u02D0s\u026A\u014B", pos: "n.", translation: "\u5916\u5305\uFF1B\u4E1A\u52A1\u5916\u5305" },
  { word: "transaction", phonetic: "tr\xE6n\u02C8z\xE6k\u0283n", pos: "n.", translation: "\u4EA4\u6613\uFF1B\u4E8B\u52A1\u5904\u7406\uFF1B\u4E1A\u52A1", exchange: "s:transactions" },
  { word: "workflow", phonetic: "\u02C8w\u025C\u02D0kfl\u0259\u028A", pos: "n.", translation: "\u5DE5\u4F5C\u6D41\uFF1B\u4E1A\u52A1\u6D41\u7A0B", exchange: "s:workflows" },
  { word: "dashboard", phonetic: "\u02C8d\xE6\u0283b\u0254\u02D0d", pos: "n.", translation: "\u4EEA\u8868\u76D8\uFF1B\u6570\u636E\u770B\u677F", exchange: "s:dashboards" },
  { word: "metric", phonetic: "\u02C8metr\u026Ak", pos: "n.", translation: "\u6307\u6807\uFF1B\u5EA6\u91CF\u6807\u51C6", exchange: "s:metrics" },
  { word: "compliance", phonetic: "k\u0259m\u02C8pla\u026A\u0259ns", pos: "n.", translation: "\u5408\u89C4\u6027\uFF1B\u9075\u4ECE\uFF1B\u670D\u4ECE" },
  { word: "governance", phonetic: "\u02C8\u0261\u028Cv\u0259n\u0259ns", pos: "n.", translation: "\u6CBB\u7406\uFF1B\u7BA1\u6CBB\uFF1B\u7BA1\u63A7\u4F53\u7CFB" },
  { word: "redundancy", phonetic: "r\u026A\u02C8d\u028Cnd\u0259nsi", pos: "n.", translation: "\u5197\u4F59\uFF1B\u5907\u4EFD\u673A\u5236\uFF1B\u88C1\u5458", exchange: "s:redundancies" },
  { word: "availability", phonetic: "\u0259\u02CCve\u026Al\u0259\u02C8b\u026Al\u0259ti", pos: "n.", translation: "\u53EF\u7528\u6027\uFF1B\u53EF\u83B7\u5F97\u6027" },
  { word: "reliability", phonetic: "r\u026A\u02CCla\u026A\u0259\u02C8b\u026Al\u0259ti", pos: "n.", translation: "\u53EF\u9760\u6027\uFF1B\u53EF\u4FE1\u5EA6" },
  { word: "agile", phonetic: "\u02C8\xE6d\u0292a\u026Al", pos: "adj.", translation: "\u654F\u6377\u7684\uFF1B\u7075\u6D3B\u7684" },
  { word: "prototype", phonetic: "\u02C8pr\u0259\u028At\u0259ta\u026Ap", pos: "n./v.", translation: "\u539F\u578B\uFF1B\u6837\u673A\uFF1B\u5236\u4F5C\u539F\u578B", exchange: "s:prototypes/i:prototyping" },
  { word: "legacy", phonetic: "\u02C8le\u0261\u0259si", pos: "n./adj.", translation: "\u9057\u7559\u7CFB\u7EDF\uFF1B\u5386\u53F2\u9057\u7559\u7684" },
  { word: "sensitive", phonetic: "\u02C8sens\u0259t\u026Av", pos: "adj.", translation: "\u654F\u611F\u7684\uFF1B\u673A\u5BC6\u7684\uFF1B\u7075\u654F\u7684" },
  { word: "confidential", phonetic: "\u02CCk\u0252nf\u026A\u02C8den\u0283l", pos: "adj.", translation: "\u673A\u5BC6\u7684\uFF1B\u4FDD\u5BC6\u7684" },
  { word: "public", phonetic: "\u02C8p\u028Cbl\u026Ak", pos: "adj./n.", translation: "\u516C\u5171\u7684\uFF1B\u516C\u6709\u7684\uFF1B\u516C\u4F17" },
  { word: "private", phonetic: "\u02C8pra\u026Av\u0259t", pos: "adj.", translation: "\u79C1\u6709\u7684\uFF1B\u4E13\u7528\u7684\uFF1B\u79C1\u4EBA\u7684" },
  { word: "premises", phonetic: "\u02C8prem\u026As\u026Az", pos: "n.", translation: "\u672C\u5730\u673A\u623F\uFF1B\u7ECF\u8425\u573A\u6240\uFF1B\u524D\u63D0" },
  { word: "workload", phonetic: "\u02C8w\u025C\u02D0kl\u0259\u028Ad", pos: "n.", translation: "\u5DE5\u4F5C\u8D1F\u8F7D\uFF1B\u5DE5\u4F5C\u91CF", exchange: "s:workloads" },
  // 商业战略、经济学（BE）、企业系统（ES）与运营（BO）核心词
  { word: "strategy", phonetic: "\u02C8str\xE6t\u0259d\u0292i", pos: "n.", translation: "\u6218\u7565\uFF1B\u7B56\u7565\uFF1B\u89C4\u5212", exchange: "s:strategies" },
  { word: "strategic", phonetic: "str\u0259\u02C8ti\u02D0d\u0292\u026Ak", pos: "adj.", translation: "\u6218\u7565\u6027\u7684\uFF1B\u5173\u952E\u7684" },
  { word: "competitive", phonetic: "k\u0259m\u02C8pet\u0259t\u026Av", pos: "adj.", translation: "\u7ADE\u4E89\u6027\u7684\uFF1B\u6709\u7ADE\u4E89\u529B\u7684" },
  { word: "competitor", phonetic: "k\u0259m\u02C8pet\u026At\u0259(r)", pos: "n.", translation: "\u7ADE\u4E89\u5BF9\u624B\uFF1B\u7ADE\u4E89\u8005", exchange: "s:competitors" },
  { word: "competition", phonetic: "\u02CCk\u0252mp\u0259\u02C8t\u026A\u0283n", pos: "n.", translation: "\u7ADE\u4E89\uFF1B\u7ADE\u8D5B" },
  { word: "compete", phonetic: "k\u0259m\u02C8pi\u02D0t", pos: "v.", translation: "\u7ADE\u4E89\uFF1B\u5BF9\u6297", exchange: "p:competed/d:competed/i:competing/3:competes" },
  { word: "advantage", phonetic: "\u0259d\u02C8v\u0251\u02D0nt\u026Ad\u0292", pos: "n.", translation: "\u4F18\u52BF\uFF1B\u6709\u5229\u6761\u4EF6\uFF1B\u5229\u76CA", exchange: "s:advantages" },
  { word: "bargain", phonetic: "\u02C8b\u0251\u02D0\u0261\u0259n", pos: "v./n.", translation: "\u8BA8\u4EF7\u8FD8\u4EF7\uFF1B\u8BAE\u4EF7\uFF1B\u5212\u7B97\u4EA4\u6613", exchange: "i:bargaining/p:bargained/d:bargained/s:bargains" },
  { word: "bargaining", phonetic: "\u02C8b\u0251\u02D0\u0261\u0259n\u026A\u014B", pos: "n.", translation: "\u8BAE\u4EF7\uFF1B\u8C08\u5224\uFF1B\u8BA8\u4EF7\u8FD8\u4EF7" },
  { word: "power", phonetic: "\u02C8pa\u028A\u0259(r)", pos: "n.", translation: "\u529B\u91CF\uFF1B\u6743\u529B\uFF1B\u5F71\u54CD\u529B", exchange: "s:powers" },
  { word: "supplier", phonetic: "s\u0259\u02C8pla\u026A\u0259(r)", pos: "n.", translation: "\u4F9B\u5E94\u5546\uFF1B\u4F9B\u8D27\u5546", exchange: "s:suppliers" },
  { word: "supply", phonetic: "s\u0259\u02C8pla\u026A", pos: "n./v.", translation: "\u4F9B\u7ED9\uFF1B\u4F9B\u5E94\uFF1B\u8865\u7ED9", exchange: "s:supplies/p:supplied/d:supplied/i:supplying/3:supplies" },
  { word: "demand", phonetic: "d\u026A\u02C8m\u0251\u02D0nd", pos: "n./v.", translation: "\u9700\u6C42\uFF1B\u8981\u6C42\uFF1B\u9700\u8981", exchange: "s:demands/p:demanded/d:demanded/i:demanding/3:demands" },
  { word: "buyer", phonetic: "\u02C8ba\u026A\u0259(r)", pos: "n.", translation: "\u4E70\u65B9\uFF1B\u91C7\u8D2D\u5546\uFF1B\u8D2D\u4E70\u8005", exchange: "s:buyers" },
  { word: "customer", phonetic: "\u02C8k\u028Cst\u0259m\u0259(r)", pos: "n.", translation: "\u5BA2\u6237\uFF1B\u987E\u5BA2\uFF1B\u6D88\u8D39\u8005", exchange: "s:customers" },
  { word: "consumer", phonetic: "k\u0259n\u02C8sju\u02D0m\u0259(r)", pos: "n.", translation: "\u6D88\u8D39\u8005\uFF1B\u7528\u6237", exchange: "s:consumers" },
  { word: "intimacy", phonetic: "\u02C8\u026Ant\u026Am\u0259si", pos: "n.", translation: "\u4EB2\u5BC6\u5EA6\uFF1B\u5BC6\u5207\u5173\u7CFB\uFF1B\u6DF1\u5165\u4E86\u89E3" },
  { word: "loyalty", phonetic: "\u02C8l\u0254\u026A\u0259lti", pos: "n.", translation: "\u5FE0\u8BDA\u5EA6\uFF1B\u5FE0\u5B9E" },
  { word: "retention", phonetic: "r\u026A\u02C8ten\u0283n", pos: "n.", translation: "\u7559\u5B58\uFF1B\u4FDD\u7559\uFF1B\u7EF4\u6301" },
  { word: "substitute", phonetic: "\u02C8s\u028Cbst\u026Atju\u02D0t", pos: "n./v.", translation: "\u66FF\u4EE3\u54C1\uFF1B\u4EE3\u66FF\uFF1B\u66FF\u6362", exchange: "s:substitutes/p:substituted/d:substituted/i:substituting/3:substitutes" },
  { word: "threat", phonetic: "\u03B8ret", pos: "n.", translation: "\u5A01\u80C1\uFF1B\u9690\u60A3\uFF1B\u98CE\u9669", exchange: "s:threats" },
  { word: "entrant", phonetic: "\u02C8entr\u0259nt", pos: "n.", translation: "\u65B0\u8FDB\u5165\u8005\uFF1B\u53C2\u8D5B\u8005", exchange: "s:entrants" },
  { word: "rivalry", phonetic: "\u02C8ra\u026Avlri", pos: "n.", translation: "\u7ADE\u4E89\u5BF9\u6297\uFF1B\u654C\u5BF9\u72B6\u6001", exchange: "s:rivalries" },
  { word: "barrier", phonetic: "\u02C8b\xE6ri\u0259(r)", pos: "n.", translation: "\u58C1\u5792\uFF1B\u969C\u788D\uFF1B\u95E8\u69DB", exchange: "s:barriers" },
  { word: "entry", phonetic: "\u02C8entri", pos: "n.", translation: "\u8FDB\u5165\uFF1B\u51C6\u5165\uFF1B\u6761\u76EE", exchange: "s:entries" },
  { word: "switch", phonetic: "sw\u026At\u0283", pos: "v./n.", translation: "\u8F6C\u6362\uFF1B\u5207\u6362\uFF1B\u5F00\u5173", exchange: "i:switching/p:switched/d:switched/3:switches/s:switches" },
  { word: "switching", phonetic: "\u02C8sw\u026At\u0283\u026A\u014B", pos: "n./adj.", translation: "\u8F6C\u6362\uFF1B\u5207\u6362\uFF1B\u8F6C\u79FB\u7684" },
  { word: "cost", phonetic: "k\u0252st", pos: "n./v.", translation: "\u6210\u672C\uFF1B\u8D39\u7528\uFF1B\u82B1\u8D39", exchange: "s:costs/p:cost/d:cost/i:costing/3:costs" },
  { word: "differentiation", phonetic: "\u02CCd\u026Af\u0259ren\u0283i\u02C8e\u026A\u0283n", pos: "n.", translation: "\u5DEE\u5F02\u5316\uFF1B\u533A\u5206\uFF1B\u5206\u5316" },
  { word: "differentiate", phonetic: "\u02CCd\u026Af\u0259\u02C8ren\u0283ie\u026At", pos: "v.", translation: "\u4F7F\u5DEE\u5F02\u5316\uFF1B\u533A\u5206", exchange: "p:differentiated/d:differentiated/i:differentiating/3:differentiates" },
  { word: "leadership", phonetic: "\u02C8li\u02D0d\u0259\u0283\u026Ap", pos: "n.", translation: "\u9886\u5148\u5730\u4F4D\uFF1B\u9886\u5BFC\u529B" },
  { word: "niche", phonetic: "ni\u02D0\u0283", pos: "n./adj.", translation: "\u7EC6\u5206\u5E02\u573A\uFF1B\u5229\u57FA\uFF1B\u5C0F\u4F17\u7684", exchange: "s:niches" },
  { word: "segment", phonetic: "\u02C8se\u0261m\u0259nt", pos: "n./v.", translation: "\u7EC6\u5206\u5E02\u573A\uFF1B\u7247\u6BB5\uFF1B\u5206\u5272", exchange: "s:segments/p:segmented/d:segmented/i:segmenting" },
  { word: "value", phonetic: "\u02C8v\xE6lju\u02D0", pos: "n./v.", translation: "\u4EF7\u503C\uFF1B\u4F30\u503C\uFF1B\u91CD\u89C6", exchange: "s:values/p:valued/d:valued/i:valuing" },
  { word: "chain", phonetic: "t\u0283e\u026An", pos: "n.", translation: "\u94FE\u6761\uFF1B\u8FDE\u9501\uFF1B\u4EF7\u503C\u94FE", exchange: "s:chains" },
  { word: "primary", phonetic: "\u02C8pra\u026Am\u0259ri", pos: "adj.", translation: "\u4E3B\u8981\u7684\uFF1B\u57FA\u672C\u7684\uFF1B\u6838\u5FC3\u7684" },
  { word: "support", phonetic: "s\u0259\u02C8p\u0254\u02D0t", pos: "v./n.", translation: "\u652F\u6301\uFF1B\u8F85\u52A9\uFF1B\u652F\u6491", exchange: "p:supported/d:supported/i:supporting/3:supports/s:supports" },
  { word: "activity", phonetic: "\xE6k\u02C8t\u026Av\u0259ti", pos: "n.", translation: "\u6D3B\u52A8\uFF1B\u4E1A\u52A1\u73AF\u8282\uFF1B\u6D3B\u8DC3\u5EA6", exchange: "s:activities" },
  { word: "logistics", phonetic: "l\u0259\u02C8d\u0292\u026Ast\u026Aks", pos: "n.", translation: "\u7269\u6D41\uFF1B\u540E\u52E4\u7BA1\u7406" },
  { word: "inbound", phonetic: "\u02C8\u026Anba\u028And", pos: "adj.", translation: "\u8FDB\u6599\u7684\uFF1B\u5165\u7AD9\u7684\uFF1B\u8FDB\u6E2F\u7684" },
  { word: "outbound", phonetic: "\u02C8a\u028Atba\u028And", pos: "adj.", translation: "\u51FA\u8D27\u7684\uFF1B\u51FA\u7AD9\u7684\uFF1B\u53D1\u51FA\u7684" },
  { word: "operation", phonetic: "\u02CC\u0252p\u0259\u02C8re\u026A\u0283n", pos: "n.", translation: "\u8FD0\u8425\uFF1B\u8FD0\u4F5C\uFF1B\u64CD\u4F5C", exchange: "s:operations" },
  { word: "operational", phonetic: "\u02CC\u0252p\u0259\u02C8re\u026A\u0283\u0259nl", pos: "adj.", translation: "\u8FD0\u8425\u7684\uFF1B\u64CD\u4F5C\u5C42\u9762\u7684" },
  { word: "efficiency", phonetic: "\u026A\u02C8f\u026A\u0283nsi", pos: "n.", translation: "\u6548\u7387\uFF1B\u6548\u80FD" },
  { word: "efficient", phonetic: "\u026A\u02C8f\u026A\u0283nt", pos: "adj.", translation: "\u9AD8\u6548\u7684\uFF1B\u6709\u6548\u7387\u7684" },
  { word: "effectiveness", phonetic: "\u026A\u02C8fekt\u026Avn\u0259s", pos: "n.", translation: "\u6709\u6548\u6027\uFF1B\u6210\u6548" },
  { word: "productivity", phonetic: "\u02CCpr\u0252d\u028Ck\u02C8t\u026Av\u0259ti", pos: "n.", translation: "\u751F\u4EA7\u529B\uFF1B\u751F\u4EA7\u7387" },
  { word: "inventory", phonetic: "\u02C8\u026Anv\u0259ntri", pos: "n.", translation: "\u5E93\u5B58\uFF1B\u5B58\u8D27\u6E05\u5355", exchange: "s:inventories" },
  { word: "procurement", phonetic: "pr\u0259\u02C8kj\u028A\u0259m\u0259nt", pos: "n.", translation: "\u91C7\u8D2D\uFF1B\u7269\u6599\u83B7\u53D6" },
  { word: "forecast", phonetic: "\u02C8f\u0254\u02D0k\u0251\u02D0st", pos: "v./n.", translation: "\u9884\u6D4B\uFF1B\u9884\u4F30", exchange: "p:forecasted/d:forecasted/i:forecasting/3:forecasts/s:forecasts" },
  { word: "bottleneck", phonetic: "\u02C8b\u0252tlnek", pos: "n.", translation: "\u74F6\u9888\uFF1B\u5236\u7EA6\u73AF\u8282", exchange: "s:bottlenecks" },
  { word: "capacity", phonetic: "k\u0259\u02C8p\xE6s\u0259ti", pos: "n.", translation: "\u4EA7\u80FD\uFF1B\u5BB9\u91CF\uFF1B\u80FD\u529B", exchange: "s:capacities" },
  { word: "quality", phonetic: "\u02C8kw\u0252l\u0259ti", pos: "n.", translation: "\u8D28\u91CF\uFF1B\u54C1\u8D28\uFF1B\u7279\u6027", exchange: "s:qualities" },
  { word: "defect", phonetic: "\u02C8di\u02D0fekt", pos: "n.", translation: "\u7F3A\u9677\uFF1B\u7455\u75B5\uFF1B\u6545\u969C", exchange: "s:defects" },
  { word: "lean", phonetic: "li\u02D0n", pos: "adj.", translation: "\u7CBE\u76CA\u7684\uFF1B\u7CBE\u7B80\u7684" },
  { word: "margin", phonetic: "\u02C8m\u0251\u02D0d\u0292\u026An", pos: "n.", translation: "\u5229\u6DA6\u7387\uFF1B\u8FB9\u9645\uFF1B\u4F59\u5730", exchange: "s:margins" },
  { word: "profit", phonetic: "\u02C8pr\u0252f\u026At", pos: "n./v.", translation: "\u5229\u6DA6\uFF1B\u6536\u76CA\uFF1B\u83B7\u5229", exchange: "s:profits/p:profited/d:profited/i:profiting" },
  { word: "revenue", phonetic: "\u02C8rev\u0259nju\u02D0", pos: "n.", translation: "\u8425\u6536\uFF1B\u603B\u6536\u5165\uFF1B\u7A0E\u6536", exchange: "s:revenues" },
  { word: "elasticity", phonetic: "\u02CCi\u02D0l\xE6\u02C8st\u026As\u0259ti", pos: "n.", translation: "\u5F39\u6027\uFF1B\u4EF7\u683C\u5F39\u6027" },
  { word: "elastic", phonetic: "\u026A\u02C8l\xE6st\u026Ak", pos: "adj.", translation: "\u6709\u5F39\u6027\u7684\uFF1B\u7075\u6D3B\u7684" },
  { word: "inelastic", phonetic: "\u02CC\u026An\u026A\u02C8l\xE6st\u026Ak", pos: "adj.", translation: "\u7F3A\u4E4F\u5F39\u6027\u7684\uFF1B\u521A\u6027\u7684" },
  { word: "equilibrium", phonetic: "\u02CCi\u02D0kw\u026A\u02C8l\u026Abri\u0259m", pos: "n.", translation: "\u5747\u8861\uFF1B\u5E73\u8861\u72B6\u6001" },
  { word: "monopoly", phonetic: "m\u0259\u02C8n\u0252p\u0259li", pos: "n.", translation: "\u5784\u65AD\uFF1B\u4E13\u5356\uFF1B\u72EC\u5360", exchange: "s:monopolies" },
  { word: "oligopoly", phonetic: "\u02CC\u0252l\u026A\u02C8\u0261\u0252p\u0259li", pos: "n.", translation: "\u5BE1\u5934\u5784\u65AD", exchange: "s:oligopolies" },
  { word: "market", phonetic: "\u02C8m\u0251\u02D0k\u026At", pos: "n./v.", translation: "\u5E02\u573A\uFF1B\u884C\u60C5\uFF1B\u8425\u9500", exchange: "s:markets/i:marketing/p:marketed" },
  { word: "marketing", phonetic: "\u02C8m\u0251\u02D0k\u0259t\u026A\u014B", pos: "n.", translation: "\u5E02\u573A\u8425\u9500\uFF1B\u63A8\u5E7F" },
  { word: "price", phonetic: "pra\u026As", pos: "n./v.", translation: "\u4EF7\u683C\uFF1B\u4EE3\u4EF7\uFF1B\u5B9A\u4EF7", exchange: "s:prices/p:priced/d:priced/i:pricing" },
  { word: "pricing", phonetic: "\u02C8pra\u026As\u026A\u014B", pos: "n.", translation: "\u5B9A\u4EF7\uFF1B\u5B9A\u4EF7\u7B56\u7565" },
  { word: "quantity", phonetic: "\u02C8kw\u0252nt\u0259ti", pos: "n.", translation: "\u6570\u91CF\uFF1B\u4EA7\u91CF", exchange: "s:quantities" },
  { word: "marginal", phonetic: "\u02C8m\u0251\u02D0d\u0292\u026Anl", pos: "adj.", translation: "\u8FB9\u9645\u7684\uFF1B\u5FAE\u5C0F\u7684\uFF1B\u8FB9\u7F18\u7684" },
  { word: "opportunity", phonetic: "\u02CC\u0252p\u0259\u02C8tju\u02D0n\u0259ti", pos: "n.", translation: "\u673A\u4F1A\uFF1B\u673A\u9047\uFF1B\u65F6\u673A", exchange: "s:opportunities" },
  { word: "scarcity", phonetic: "\u02C8ske\u0259s\u0259ti", pos: "n.", translation: "\u7A00\u7F3A\u6027\uFF1B\u77ED\u7F3A" },
  { word: "inflation", phonetic: "\u026An\u02C8fle\u026A\u0283n", pos: "n.", translation: "\u901A\u8D27\u81A8\u80C0" },
  { word: "recession", phonetic: "r\u026A\u02C8se\u0283n", pos: "n.", translation: "\u7ECF\u6D4E\u8870\u9000\uFF1B\u4E0D\u666F\u6C14", exchange: "s:recessions" },
  { word: "subsidy", phonetic: "\u02C8s\u028Cbs\u0259di", pos: "n.", translation: "\u8865\u8D34\uFF1B\u6D25\u8D34\uFF1B\u8865\u52A9\u91D1", exchange: "s:subsidies" },
  { word: "tariff", phonetic: "\u02C8t\xE6r\u026Af", pos: "n.", translation: "\u5173\u7A0E\uFF1B\u6536\u8D39\u8868", exchange: "s:tariffs" },
  { word: "externality", phonetic: "\u02CCekst\u025C\u02D0\u02C8n\xE6l\u0259ti", pos: "n.", translation: "\u5916\u90E8\u6027\uFF1B\u5916\u90E8\u6548\u5E94", exchange: "s:externalities" },
  { word: "stakeholder", phonetic: "\u02C8ste\u026Akh\u0259\u028Ald\u0259(r)", pos: "n.", translation: "\u5229\u76CA\u76F8\u5173\u8005\uFF1B\u5E72\u7CFB\u4EBA", exchange: "s:stakeholders" },
  { word: "shareholder", phonetic: "\u02C8\u0283e\u0259h\u0259\u028Ald\u0259(r)", pos: "n.", translation: "\u80A1\u4E1C\uFF1B\u80A1\u7968\u6301\u6709\u4EBA", exchange: "s:shareholders" },
  { word: "incentive", phonetic: "\u026An\u02C8sent\u026Av", pos: "n.", translation: "\u6FC0\u52B1\uFF1B\u52A8\u673A\uFF1B\u5956\u52B1\u673A\u5236", exchange: "s:incentives" },
  { word: "allocate", phonetic: "\u02C8\xE6l\u0259ke\u026At", pos: "v.", translation: "\u5206\u914D\uFF1B\u914D\u7F6E\uFF1B\u62E8\u51FA", exchange: "p:allocated/d:allocated/i:allocating/3:allocates" },
  { word: "allocation", phonetic: "\u02CC\xE6l\u0259\u02C8ke\u026A\u0283n", pos: "n.", translation: "\u5206\u914D\uFF1B\u8D44\u6E90\u914D\u7F6E" },
  { word: "resource", phonetic: "r\u026A\u02C8s\u0254\u02D0s", pos: "n.", translation: "\u8D44\u6E90\uFF1B\u8D22\u529B\uFF1B\u8D44\u6599", exchange: "s:resources" },
  { word: "leverage", phonetic: "\u02C8li\u02D0v\u0259r\u026Ad\u0292", pos: "v./n.", translation: "\u5145\u5206\u5229\u7528\uFF1B\u6760\u6746\u4F5C\u7528", exchange: "p:leveraged/d:leveraged/i:leveraging/3:leverages" },
  { word: "optimize", phonetic: "\u02C8\u0252pt\u026Ama\u026Az", pos: "v.", translation: "\u4F18\u5316\uFF1B\u4F7F\u6700\u4F18\u5316", exchange: "p:optimized/d:optimized/i:optimizing/3:optimizes" },
  { word: "streamline", phonetic: "\u02C8stri\u02D0mla\u026An", pos: "v.", translation: "\u7CBE\u7B80\uFF1B\u7B80\u5316\u6D41\u7A0B\uFF1B\u63D0\u9AD8\u6548\u7387", exchange: "p:streamlined/d:streamlined/i:streamlining/3:streamlines" },
  { word: "collaborate", phonetic: "k\u0259\u02C8l\xE6b\u0259re\u026At", pos: "v.", translation: "\u534F\u4F5C\uFF1B\u5408\u4F5C", exchange: "p:collaborated/d:collaborated/i:collaborating/3:collaborates" },
  { word: "collaboration", phonetic: "k\u0259\u02CCl\xE6b\u0259\u02C8re\u026A\u0283n", pos: "n.", translation: "\u534F\u4F5C\uFF1B\u5408\u4F5C" },
  { word: "personalize", phonetic: "\u02C8p\u025C\u02D0s\u0259n\u0259la\u026Az", pos: "v.", translation: "\u4E2A\u6027\u5316\uFF1B\u5B9A\u5236", exchange: "p:personalized/d:personalized/i:personalizing/3:personalizes" },
  { word: "customize", phonetic: "\u02C8k\u028Cst\u0259ma\u026Az", pos: "v.", translation: "\u5B9A\u5236\uFF1B\u81EA\u5B9A\u4E49", exchange: "p:customized/d:customized/i:customizing/3:customizes" },
  { word: "tailor", phonetic: "\u02C8te\u026Al\u0259(r)", pos: "v.", translation: "\u91CF\u8EAB\u5B9A\u5236\uFF1B\u4E13\u95E8\u9002\u914D", exchange: "p:tailored/d:tailored/i:tailoring/3:tailors" },
  { word: "preference", phonetic: "\u02C8prefr\u0259ns", pos: "n.", translation: "\u504F\u597D\uFF1B\u4F18\u5148\u6743", exchange: "s:preferences" },
  { word: "insight", phonetic: "\u02C8\u026Ansa\u026At", pos: "n.", translation: "\u6D1E\u5BDF\uFF1B\u6DF1\u523B\u89C1\u89E3", exchange: "s:insights" },
  { word: "decision", phonetic: "d\u026A\u02C8s\u026A\u0292n", pos: "n.", translation: "\u51B3\u7B56\uFF1B\u51B3\u5B9A\uFF1B\u5224\u65AD", exchange: "s:decisions" },
  { word: "model", phonetic: "\u02C8m\u0252dl", pos: "n./v.", translation: "\u6A21\u578B\uFF1B\u6A21\u5F0F\uFF1B\u5EFA\u6A21", exchange: "s:models/p:modeled/d:modeled/i:modeling" },
  { word: "framework", phonetic: "\u02C8fre\u026Amw\u025C\u02D0k", pos: "n.", translation: "\u6846\u67B6\uFF1B\u4F53\u7CFB\uFF1B\u7ED3\u6784", exchange: "s:frameworks" },
  { word: "force", phonetic: "f\u0254\u02D0s", pos: "n./v.", translation: "\u529B\u91CF\uFF1B\u56E0\u7D20\uFF1B\u8FEB\u4F7F", exchange: "s:forces/p:forced/d:forced/i:forcing" },
  { word: "industry", phonetic: "\u02C8\u026And\u0259stri", pos: "n.", translation: "\u884C\u4E1A\uFF1B\u4EA7\u4E1A\uFF1B\u5DE5\u4E1A", exchange: "s:industries" },
  { word: "firm", phonetic: "f\u025C\u02D0m", pos: "n./adj.", translation: "\u4F01\u4E1A\uFF1B\u516C\u53F8\uFF1B\u7A33\u56FA\u7684", exchange: "s:firms" },
  { word: "company", phonetic: "\u02C8k\u028Cmp\u0259ni", pos: "n.", translation: "\u516C\u53F8\uFF1B\u4F01\u4E1A", exchange: "s:companies" },
  { word: "business", phonetic: "\u02C8b\u026Azn\u0259s", pos: "n.", translation: "\u5546\u4E1A\uFF1B\u4E1A\u52A1\uFF1B\u4F01\u4E1A", exchange: "s:businesses" },
  { word: "process", phonetic: "\u02C8pr\u0259\u028Ases", pos: "n./v.", translation: "\u6D41\u7A0B\uFF1B\u8FC7\u7A0B\uFF1B\u5904\u7406", exchange: "s:processes/p:processed/d:processed/i:processing/3:processes" },
  { word: "product", phonetic: "\u02C8pr\u0252d\u028Ckt", pos: "n.", translation: "\u4EA7\u54C1\uFF1B\u4EA7\u7269", exchange: "s:products" },
  { word: "service", phonetic: "\u02C8s\u025C\u02D0v\u026As", pos: "n./v.", translation: "\u670D\u52A1\uFF1B\u4E1A\u52A1\uFF1B\u7EF4\u62A4", exchange: "s:services/p:serviced/d:serviced/i:servicing" },
  { word: "feature", phonetic: "\u02C8fi\u02D0t\u0283\u0259(r)", pos: "n./v.", translation: "\u7279\u5F81\uFF1B\u529F\u80FD\uFF1B\u4EE5\u2026\u4E3A\u7279\u8272", exchange: "s:features/p:featured/d:featured/i:featuring" },
  { word: "benefit", phonetic: "\u02C8ben\u026Af\u026At", pos: "n./v.", translation: "\u76CA\u5904\uFF1B\u4F18\u52BF\uFF1B\u53D7\u76CA", exchange: "s:benefits/p:benefited/d:benefited/i:benefiting/3:benefits" },
  { word: "risk", phonetic: "r\u026Ask", pos: "n./v.", translation: "\u98CE\u9669\uFF1B\u9690\u60A3\uFF1B\u5192\u2026\u7684\u98CE\u9669", exchange: "s:risks/p:risked/d:risked/i:risking" },
  { word: "impact", phonetic: "\u02C8\u026Amp\xE6kt", pos: "n./v.", translation: "\u5F71\u54CD\uFF1B\u51B2\u51FB\uFF1B\u5BF9\u2026\u4EA7\u751F\u5F71\u54CD", exchange: "s:impacts/p:impacted/d:impacted/i:impacting" },
  { word: "factor", phonetic: "\u02C8f\xE6kt\u0259(r)", pos: "n.", translation: "\u56E0\u7D20\uFF1B\u8981\u7D20\uFF1B\u7CFB\u6570", exchange: "s:factors" },
  { word: "trend", phonetic: "trend", pos: "n.", translation: "\u8D8B\u52BF\uFF1B\u8D70\u5411\uFF1B\u52A8\u5411", exchange: "s:trends" },
  { word: "shift", phonetic: "\u0283\u026Aft", pos: "v./n.", translation: "\u8F6C\u79FB\uFF1B\u8F6C\u53D8\uFF1B\u79FB\u52A8", exchange: "p:shifted/d:shifted/i:shifting/3:shifts/s:shifts" },
  { word: "curve", phonetic: "k\u025C\u02D0v", pos: "n.", translation: "\u66F2\u7EBF\uFF1B\u8D8B\u52BF\u7EBF", exchange: "s:curves" },
  { word: "increase", phonetic: "\u026An\u02C8kri\u02D0s", pos: "v./n.", translation: "\u589E\u52A0\uFF1B\u589E\u957F\uFF1B\u63D0\u9AD8", exchange: "p:increased/d:increased/i:increasing/3:increases/s:increases" },
  { word: "decrease", phonetic: "d\u026A\u02C8kri\u02D0s", pos: "v./n.", translation: "\u51CF\u5C11\uFF1B\u964D\u4F4E\uFF1B\u4E0B\u964D", exchange: "p:decreased/d:decreased/i:decreasing/3:decreases/s:decreases" },
  { word: "reduce", phonetic: "r\u026A\u02C8dju\u02D0s", pos: "v.", translation: "\u51CF\u5C11\uFF1B\u964D\u4F4E\uFF1B\u7F29\u51CF", exchange: "p:reduced/d:reduced/i:reducing/3:reduces" },
  { word: "improve", phonetic: "\u026Am\u02C8pru\u02D0v", pos: "v.", translation: "\u6539\u8FDB\uFF1B\u63D0\u5347\uFF1B\u5B8C\u5584", exchange: "p:improved/d:improved/i:improving/3:improves" },
  { word: "enhance", phonetic: "\u026An\u02C8h\u0251\u02D0ns", pos: "v.", translation: "\u589E\u5F3A\uFF1B\u63D0\u9AD8\uFF1B\u5F3A\u5316", exchange: "p:enhanced/d:enhanced/i:enhancing/3:enhances" },
  { word: "enable", phonetic: "\u026A\u02C8ne\u026Abl", pos: "v.", translation: "\u4F7F\u80FD\u591F\uFF1B\u8D4B\u80FD\uFF1B\u542F\u7528", exchange: "p:enabled/d:enabled/i:enabling/3:enables" },
  { word: "allow", phonetic: "\u0259\u02C8la\u028A", pos: "v.", translation: "\u5141\u8BB8\uFF1B\u4F7F\u6210\u4E3A\u53EF\u80FD", exchange: "p:allowed/d:allowed/i:allowing/3:allows" },
  { word: "require", phonetic: "r\u026A\u02C8kwa\u026A\u0259(r)", pos: "v.", translation: "\u9700\u8981\uFF1B\u8981\u6C42\uFF1B\u89C4\u5B9A", exchange: "p:required/d:required/i:requiring/3:requires" },
  { word: "provide", phonetic: "pr\u0259\u02C8va\u026Ad", pos: "v.", translation: "\u63D0\u4F9B\uFF1B\u4F9B\u7ED9\uFF1B\u89C4\u5B9A", exchange: "p:provided/d:provided/i:providing/3:provides" },
  { word: "offer", phonetic: "\u02C8\u0252f\u0259(r)", pos: "v./n.", translation: "\u63D0\u4F9B\uFF1B\u63D0\u51FA\uFF1B\u62A5\u4EF7", exchange: "p:offered/d:offered/i:offering/3:offers/s:offers" },
  { word: "deliver", phonetic: "d\u026A\u02C8l\u026Av\u0259(r)", pos: "v.", translation: "\u4EA4\u4ED8\uFF1B\u4F20\u9012\uFF1B\u5B9E\u73B0", exchange: "p:delivered/d:delivered/i:delivering/3:delivers" },
  { word: "create", phonetic: "kri\u02C8e\u026At", pos: "v.", translation: "\u521B\u9020\uFF1B\u521B\u5EFA\uFF1B\u4EA7\u751F", exchange: "p:created/d:created/i:creating/3:creates" },
  { word: "manage", phonetic: "\u02C8m\xE6n\u026Ad\u0292", pos: "v.", translation: "\u7BA1\u7406\uFF1B\u7ECF\u8425\uFF1B\u8BBE\u6CD5\u5B8C\u6210", exchange: "p:managed/d:managed/i:managing/3:manages" },
  { word: "management", phonetic: "\u02C8m\xE6n\u026Ad\u0292m\u0259nt", pos: "n.", translation: "\u7BA1\u7406\uFF1B\u7ECF\u8425\uFF1B\u7BA1\u7406\u5C42" },
  { word: "control", phonetic: "k\u0259n\u02C8tr\u0259\u028Al", pos: "n./v.", translation: "\u63A7\u5236\uFF1B\u7BA1\u63A7\uFF1B\u652F\u914D", exchange: "p:controlled/d:controlled/i:controlling/3:controls/s:controls" },
  { word: "monitor", phonetic: "\u02C8m\u0252n\u026At\u0259(r)", pos: "v./n.", translation: "\u76D1\u63A7\uFF1B\u76D1\u6D4B\uFF1B\u76D1\u89C6\u5668", exchange: "p:monitored/d:monitored/i:monitoring/3:monitors/s:monitors" },
  { word: "measure", phonetic: "\u02C8me\u0292\u0259(r)", pos: "v./n.", translation: "\u8861\u91CF\uFF1B\u6D4B\u91CF\uFF1B\u63AA\u65BD", exchange: "p:measured/d:measured/i:measuring/3:measures/s:measures" },
  { word: "evaluate", phonetic: "\u026A\u02C8v\xE6ljue\u026At", pos: "v.", translation: "\u8BC4\u4F30\uFF1B\u8BC4\u4EF7\uFF1B\u4F30\u7B97", exchange: "p:evaluated/d:evaluated/i:evaluating/3:evaluates" },
  { word: "identify", phonetic: "a\u026A\u02C8dent\u026Afa\u026A", pos: "v.", translation: "\u8BC6\u522B\uFF1B\u786E\u5B9A\uFF1B\u627E\u51FA", exchange: "p:identified/d:identified/i:identifying/3:identifies" },
  { word: "determine", phonetic: "d\u026A\u02C8t\u025C\u02D0m\u026An", pos: "v.", translation: "\u51B3\u5B9A\uFF1B\u786E\u5B9A\uFF1B\u67E5\u660E", exchange: "p:determined/d:determined/i:determining/3:determines" },
  { word: "implement", phonetic: "\u02C8\u026Ampl\u026Ament", pos: "v.", translation: "\u5B9E\u65BD\uFF1B\u6267\u884C\uFF1B\u843D\u5730", exchange: "p:implemented/d:implemented/i:implementing/3:implements" },
  { word: "implementation", phonetic: "\u02CC\u026Ampl\u026Amen\u02C8te\u026A\u0283n", pos: "n.", translation: "\u5B9E\u65BD\uFF1B\u6267\u884C\uFF1B\u90E8\u7F72" },
  { word: "adopt", phonetic: "\u0259\u02C8d\u0252pt", pos: "v.", translation: "\u91C7\u7528\uFF1B\u91C7\u7EB3\uFF1B\u6B63\u5F0F\u901A\u8FC7", exchange: "p:adopted/d:adopted/i:adopting/3:adopts" },
  { word: "adoption", phonetic: "\u0259\u02C8d\u0252p\u0283n", pos: "n.", translation: "\u91C7\u7528\uFF1B\u91C7\u7EB3\u7387" },
  { word: "maintain", phonetic: "me\u026An\u02C8te\u026An", pos: "v.", translation: "\u7EF4\u62A4\uFF1B\u7EF4\u6301\uFF1B\u4FDD\u6301", exchange: "p:maintained/d:maintained/i:maintaining/3:maintains" },
  { word: "achieve", phonetic: "\u0259\u02C8t\u0283i\u02D0v", pos: "v.", translation: "\u5B9E\u73B0\uFF1B\u8FBE\u5230\uFF1B\u83B7\u5F97", exchange: "p:achieved/d:achieved/i:achieving/3:achieves" },
  { word: "focus", phonetic: "\u02C8f\u0259\u028Ak\u0259s", pos: "v./n.", translation: "\u805A\u7126\uFF1B\u96C6\u4E2D\uFF1B\u91CD\u70B9", exchange: "p:focused/d:focused/i:focusing/3:focuses" },
  { word: "rely", phonetic: "r\u026A\u02C8la\u026A", pos: "v.", translation: "\u4F9D\u8D56\uFF1B\u4F9D\u9760\uFF1B\u4FE1\u8D56", exchange: "p:relied/d:relied/i:relying/3:relies" },
  { word: "depend", phonetic: "d\u026A\u02C8pend", pos: "v.", translation: "\u53D6\u51B3\u4E8E\uFF1B\u4F9D\u8D56", exchange: "p:depended/d:depended/i:depending/3:depends" },
  { word: "combine", phonetic: "k\u0259m\u02C8ba\u026An", pos: "v.", translation: "\u7ED3\u5408\uFF1B\u7EC4\u5408\uFF1B\u517C\u5907", exchange: "p:combined/d:combined/i:combining/3:combines" },
  { word: "store", phonetic: "st\u0254\u02D0(r)", pos: "v./n.", translation: "\u5B58\u50A8\uFF1B\u4FDD\u5B58\uFF1B\u5546\u5E97", exchange: "p:stored/d:stored/i:storing/3:stores/s:stores" },
  { word: "share", phonetic: "\u0283e\u0259(r)", pos: "v./n.", translation: "\u5171\u4EAB\uFF1B\u5206\u4EAB\uFF1B\u5E02\u573A\u4EFD\u989D", exchange: "p:shared/d:shared/i:sharing/3:shares/s:shares" },
  { word: "access", phonetic: "\u02C8\xE6kses", pos: "n./v.", translation: "\u8BBF\u95EE\uFF1B\u63A5\u5165\uFF1B\u83B7\u53D6", exchange: "p:accessed/d:accessed/i:accessing/3:accesses" },
  { word: "protect", phonetic: "pr\u0259\u02C8tekt", pos: "v.", translation: "\u4FDD\u62A4\uFF1B\u9632\u62A4", exchange: "p:protected/d:protected/i:protecting/3:protects" },
  { word: "prevent", phonetic: "pr\u026A\u02C8vent", pos: "v.", translation: "\u9632\u6B62\uFF1B\u963B\u6B62\uFF1B\u9884\u9632", exchange: "p:prevented/d:prevented/i:preventing/3:prevents" },
  { word: "avoid", phonetic: "\u0259\u02C8v\u0254\u026Ad", pos: "v.", translation: "\u907F\u514D\uFF1B\u89C4\u907F", exchange: "p:avoided/d:avoided/i:avoiding/3:avoids" },
  { word: "respond", phonetic: "r\u026A\u02C8sp\u0252nd", pos: "v.", translation: "\u54CD\u5E94\uFF1B\u56DE\u5E94\uFF1B\u505A\u51FA\u53CD\u5E94", exchange: "p:responded/d:responded/i:responding/3:responds" },
  { word: "response", phonetic: "r\u026A\u02C8sp\u0252ns", pos: "n.", translation: "\u54CD\u5E94\uFF1B\u56DE\u590D\uFF1B\u53CD\u5E94", exchange: "s:responses" },
  { word: "describe", phonetic: "d\u026A\u02C8skra\u026Ab", pos: "v.", translation: "\u63CF\u8FF0\uFF1B\u8BF4\u660E\uFF1B\u523B\u753B", exchange: "p:described/d:described/i:describing/3:describes" },
  { word: "explain", phonetic: "\u026Ak\u02C8sple\u026An", pos: "v.", translation: "\u89E3\u91CA\uFF1B\u8BF4\u660E", exchange: "p:explained/d:explained/i:explaining/3:explains" },
  { word: "refer", phonetic: "r\u026A\u02C8f\u025C\u02D0(r)", pos: "v.", translation: "\u6307\u7684\u662F\uFF1B\u53C2\u8003\uFF1B\u63D0\u53CA", exchange: "p:referred/d:referred/i:referring/3:refers" },
  { word: "indicate", phonetic: "\u02C8\u026And\u026Ake\u026At", pos: "v.", translation: "\u8868\u660E\uFF1B\u6307\u793A\uFF1B\u663E\u793A", exchange: "p:indicated/d:indicated/i:indicating/3:indicates" },
  { word: "represent", phonetic: "\u02CCrepr\u026A\u02C8zent", pos: "v.", translation: "\u4EE3\u8868\uFF1B\u8868\u793A\uFF1B\u4F53\u73B0", exchange: "p:represented/d:represented/i:representing/3:represents" },
  { word: "illustrate", phonetic: "\u02C8\u026Al\u0259stre\u026At", pos: "v.", translation: "\u8BF4\u660E\uFF1B\u4E3E\u4F8B\u9610\u660E", exchange: "p:illustrated/d:illustrated/i:illustrating/3:illustrates" },
  { word: "compare", phonetic: "k\u0259m\u02C8pe\u0259(r)", pos: "v.", translation: "\u6BD4\u8F83\uFF1B\u5BF9\u6BD4", exchange: "p:compared/d:compared/i:comparing/3:compares" },
  { word: "contrast", phonetic: "\u02C8k\u0252ntr\u0251\u02D0st", pos: "n./v.", translation: "\u5BF9\u6BD4\uFF1B\u5DEE\u5F02\uFF1B\u5BF9\u7167", exchange: "p:contrasted/d:contrasted/i:contrasting/3:contrasts" },
  { word: "replace", phonetic: "r\u026A\u02C8ple\u026As", pos: "v.", translation: "\u53D6\u4EE3\uFF1B\u66FF\u6362\uFF1B\u66F4\u6362", exchange: "p:replaced/d:replaced/i:replacing/3:replaces" },
  { word: "eliminate", phonetic: "\u026A\u02C8l\u026Am\u026Ane\u026At", pos: "v.", translation: "\u6D88\u9664\uFF1B\u6DD8\u6C70\uFF1B\u6392\u9664", exchange: "p:eliminated/d:eliminated/i:eliminating/3:eliminates" },
  { word: "minimize", phonetic: "\u02C8m\u026An\u026Ama\u026Az", pos: "v.", translation: "\u4F7F\u6700\u5C0F\u5316\uFF1B\u6700\u5927\u9650\u5EA6\u51CF\u5C11", exchange: "p:minimized/d:minimized/i:minimizing/3:minimizes" },
  { word: "maximize", phonetic: "\u02C8m\xE6ks\u026Ama\u026Az", pos: "v.", translation: "\u4F7F\u6700\u5927\u5316\uFF1B\u5145\u5206\u5229\u7528", exchange: "p:maximized/d:maximized/i:maximizing/3:maximizes" },
  { word: "balance", phonetic: "\u02C8b\xE6l\u0259ns", pos: "n./v.", translation: "\u5E73\u8861\uFF1B\u6743\u8861\uFF1B\u4F59\u989D", exchange: "p:balanced/d:balanced/i:balancing/3:balances" },
  { word: "flexibility", phonetic: "\u02CCfleks\u0259\u02C8b\u026Al\u0259ti", pos: "n.", translation: "\u7075\u6D3B\u6027\uFF1B\u5F39\u6027" },
  { word: "flexible", phonetic: "\u02C8fleks\u0259bl", pos: "adj.", translation: "\u7075\u6D3B\u7684\uFF1B\u67D4\u6027\u7684" },
  { word: "standard", phonetic: "\u02C8st\xE6nd\u0259d", pos: "n./adj.", translation: "\u6807\u51C6\uFF1B\u89C4\u8303\uFF1B\u6807\u51C6\u7684", exchange: "s:standards" },
  { word: "unique", phonetic: "ju\u02C8ni\u02D0k", pos: "adj.", translation: "\u72EC\u7279\u7684\uFF1B\u552F\u4E00\u7684" },
  { word: "rare", phonetic: "re\u0259(r)", pos: "adj.", translation: "\u7A00\u6709\u7684\uFF1B\u7F55\u89C1\u7684" },
  { word: "critical", phonetic: "\u02C8kr\u026At\u026Akl", pos: "adj.", translation: "\u5173\u952E\u7684\uFF1B\u81F3\u5173\u91CD\u8981\u7684\uFF1B\u6279\u5224\u6027\u7684" },
  { word: "essential", phonetic: "\u026A\u02C8sen\u0283l", pos: "adj.", translation: "\u5FC5\u4E0D\u53EF\u5C11\u7684\uFF1B\u672C\u8D28\u7684" },
  { word: "significant", phonetic: "s\u026A\u0261\u02C8n\u026Af\u026Ak\u0259nt", pos: "adj.", translation: "\u663E\u8457\u7684\uFF1B\u91CD\u5927\u7684" },
  { word: "major", phonetic: "\u02C8me\u026Ad\u0292\u0259(r)", pos: "adj.", translation: "\u4E3B\u8981\u7684\uFF1B\u91CD\u5927\u7684" },
  { word: "minor", phonetic: "\u02C8ma\u026An\u0259(r)", pos: "adj.", translation: "\u6B21\u8981\u7684\uFF1B\u8F7B\u5FAE\u7684" },
  { word: "central", phonetic: "\u02C8sentr\u0259l", pos: "adj.", translation: "\u6838\u5FC3\u7684\uFF1B\u4E2D\u592E\u7684\uFF1B\u96C6\u4E2D\u7684" },
  { word: "centralized", phonetic: "\u02C8sentr\u0259la\u026Azd", pos: "adj.", translation: "\u96C6\u4E2D\u5F0F\u7684\uFF1B\u4E2D\u592E\u96C6\u6743\u7684" },
  { word: "distributed", phonetic: "d\u026A\u02C8str\u026Abju\u02D0t\u026Ad", pos: "adj.", translation: "\u5206\u5E03\u5F0F\u7684\uFF1B\u5206\u6563\u7684" },
  { word: "real-time", phonetic: "\u02CCr\u026A\u0259l \u02C8ta\u026Am", pos: "adj.", translation: "\u5B9E\u65F6\u7684\uFF1B\u5373\u65F6\u7684" },
  { word: "manual", phonetic: "\u02C8m\xE6nju\u0259l", pos: "adj./n.", translation: "\u624B\u5DE5\u7684\uFF1B\u4EBA\u5DE5\u7684\uFF1B\u624B\u518C" },
  { word: "digital", phonetic: "\u02C8d\u026Ad\u0292\u026Atl", pos: "adj.", translation: "\u6570\u5B57\u7684\uFF1B\u6570\u5B57\u5316\u7684" },
  { word: "global", phonetic: "\u02C8\u0261l\u0259\u028Abl", pos: "adj.", translation: "\u5168\u7403\u7684\uFF1B\u6574\u4F53\u7684" },
  { word: "local", phonetic: "\u02C8l\u0259\u028Akl", pos: "adj.", translation: "\u672C\u5730\u7684\uFF1B\u5F53\u5730\u7684" },
  { word: "internal", phonetic: "\u026An\u02C8t\u025C\u02D0nl", pos: "adj.", translation: "\u5185\u90E8\u7684\uFF1B\u4F01\u4E1A\u5185\u90E8\u7684" },
  { word: "external", phonetic: "\u026Ak\u02C8st\u025C\u02D0nl", pos: "adj.", translation: "\u5916\u90E8\u7684\uFF1B\u5916\u754C\u7684" },
  { word: "direct", phonetic: "da\u026A\u02C8rekt", pos: "adj./v.", translation: "\u76F4\u63A5\u7684\uFF1B\u6307\u5BFC\uFF1B\u5F15\u5BFC", exchange: "p:directed/d:directed/i:directing/3:directs" },
  { word: "indirect", phonetic: "\u02CC\u026Anda\u026A\u02C8rekt", pos: "adj.", translation: "\u95F4\u63A5\u7684" },
  { word: "fixed", phonetic: "f\u026Akst", pos: "adj.", translation: "\u56FA\u5B9A\u7684\uFF1B\u4E0D\u53D8\u7684" },
  { word: "variable", phonetic: "\u02C8ve\u0259ri\u0259bl", pos: "adj./n.", translation: "\u53EF\u53D8\u7684\uFF1B\u53D8\u91CF", exchange: "s:variables" },
  { word: "total", phonetic: "\u02C8t\u0259\u028Atl", pos: "adj./n.", translation: "\u603B\u7684\uFF1B\u5168\u90E8\u7684\uFF1B\u603B\u8BA1" },
  { word: "average", phonetic: "\u02C8\xE6v\u0259r\u026Ad\u0292", pos: "adj./n.", translation: "\u5E73\u5747\u7684\uFF1B\u5E73\u5747\u6570" },
  { word: "percentage", phonetic: "p\u0259\u02C8sent\u026Ad\u0292", pos: "n.", translation: "\u767E\u5206\u6BD4\uFF1B\u6BD4\u4F8B", exchange: "s:percentages" },
  { word: "proportion", phonetic: "pr\u0259\u02C8p\u0254\u02D0\u0283n", pos: "n.", translation: "\u6BD4\u4F8B\uFF1B\u4EFD\u989D\uFF1B\u90E8\u5206", exchange: "s:proportions" },
  { word: "change", phonetic: "t\u0283e\u026And\u0292", pos: "n./v.", translation: "\u53D8\u5316\uFF1B\u53D8\u52A8\uFF1B\u6539\u53D8", exchange: "s:changes/p:changed/d:changed/i:changing/3:changes" },
  { word: "level", phonetic: "\u02C8levl", pos: "n.", translation: "\u6C34\u5E73\uFF1B\u5C42\u7EA7\uFF1B\u7A0B\u5EA6", exchange: "s:levels" },
  { word: "rate", phonetic: "re\u026At", pos: "n.", translation: "\u6BD4\u7387\uFF1B\u901F\u5EA6\uFF1B\u8D39\u7387", exchange: "s:rates" },
  { word: "data", phonetic: "\u02C8de\u026At\u0259", pos: "n.", translation: "\u6570\u636E\uFF1B\u8D44\u6599" },
  { word: "record", phonetic: "\u02C8rek\u0254\u02D0d", pos: "n./v.", translation: "\u8BB0\u5F55\uFF1B\u6863\u6848\uFF1B\u8BB0\u8F7D", exchange: "s:records/p:recorded/d:recorded/i:recording/3:records" },
  { word: "report", phonetic: "r\u026A\u02C8p\u0254\u02D0t", pos: "n./v.", translation: "\u62A5\u544A\uFF1B\u62A5\u8868\uFF1B\u6C47\u62A5", exchange: "s:reports/p:reported/d:reported/i:reporting/3:reports" },
  { word: "department", phonetic: "d\u026A\u02C8p\u0251\u02D0tm\u0259nt", pos: "n.", translation: "\u90E8\u95E8\uFF1B\u79D1\u5BA4", exchange: "s:departments" },
  { word: "function", phonetic: "\u02C8f\u028C\u014Bk\u0283n", pos: "n./v.", translation: "\u804C\u80FD\uFF1B\u529F\u80FD\uFF1B\u8FD0\u4F5C", exchange: "s:functions/i:functioning/3:functions" },
  { word: "module", phonetic: "\u02C8m\u0252dju\u02D0l", pos: "n.", translation: "\u6A21\u5757\uFF1B\u7EC4\u4EF6", exchange: "s:modules" },
  { word: "finance", phonetic: "\u02C8fa\u026An\xE6ns", pos: "n.", translation: "\u8D22\u52A1\uFF1B\u91D1\u878D\uFF1B\u878D\u8D44" },
  { word: "accounting", phonetic: "\u0259\u02C8ka\u028Ant\u026A\u014B", pos: "n.", translation: "\u4F1A\u8BA1\uFF1B\u8D26\u52A1\u6838\u7B97" },
  { word: "human", phonetic: "\u02C8hju\u02D0m\u0259n", pos: "adj./n.", translation: "\u4EBA\u7C7B\u7684\uFF1B\u4EBA\u529B\u7684\uFF1B\u4EBA" },
  { word: "employee", phonetic: "\u026Am\u02C8pl\u0254\u026Ai\u02D0", pos: "n.", translation: "\u5458\u5DE5\uFF1B\u96C7\u5458", exchange: "s:employees" },
  { word: "manager", phonetic: "\u02C8m\xE6n\u026Ad\u0292\u0259(r)", pos: "n.", translation: "\u7BA1\u7406\u8005\uFF1B\u7ECF\u7406", exchange: "s:managers" },
  { word: "executive", phonetic: "\u026A\u0261\u02C8zekj\u0259t\u026Av", pos: "n./adj.", translation: "\u9AD8\u7BA1\uFF1B\u4E3B\u7BA1\uFF1B\u884C\u653F\u7684", exchange: "s:executives" },
  { word: "user", phonetic: "\u02C8ju\u02D0z\u0259(r)", pos: "n.", translation: "\u7528\u6237\uFF1B\u4F7F\u7528\u8005", exchange: "s:users" },
  { word: "use", phonetic: "ju\u02D0z", pos: "v./n.", translation: "\u4F7F\u7528\uFF1B\u8FD0\u7528\uFF1B\u7528\u9014", exchange: "p:used/d:used/i:using/3:uses/s:uses" },
  { word: "help", phonetic: "help", pos: "v./n.", translation: "\u5E2E\u52A9\uFF1B\u6709\u52A9\u4E8E\uFF1B\u534F\u52A9", exchange: "p:helped/d:helped/i:helping/3:helps" },
  { word: "need", phonetic: "ni\u02D0d", pos: "v./n.", translation: "\u9700\u8981\uFF1B\u9700\u6C42", exchange: "p:needed/d:needed/i:needing/3:needs/s:needs" },
  { word: "work", phonetic: "w\u025C\u02D0k", pos: "v./n.", translation: "\u5DE5\u4F5C\uFF1B\u8FD0\u8F6C\uFF1B\u8D77\u4F5C\u7528", exchange: "p:worked/d:worked/i:working/3:works" },
  { word: "example", phonetic: "\u026A\u0261\u02C8z\u0251\u02D0mpl", pos: "n.", translation: "\u4F8B\u5B50\uFF1B\u6848\u4F8B\uFF1B\u8303\u4F8B", exchange: "s:examples" },
  { word: "statement", phonetic: "\u02C8ste\u026Atm\u0259nt", pos: "n.", translation: "\u9648\u8FF0\uFF1B\u58F0\u660E\uFF1B\u62A5\u8868", exchange: "s:statements" },
  { word: "following", phonetic: "\u02C8f\u0252l\u0259\u028A\u026A\u014B", pos: "adj.", translation: "\u4E0B\u5217\u7684\uFF1B\u4EE5\u4E0B\u6240\u8FF0\u7684" },
  { word: "best", phonetic: "best", pos: "adj./adv.", translation: "\u6700\u597D\u7684\uFF1B\u6700\u6070\u5F53\u5730" },
  { word: "most", phonetic: "m\u0259\u028Ast", pos: "adv./pron.", translation: "\u6700\uFF1B\u5927\u591A\u6570" },
  { word: "only", phonetic: "\u02C8\u0259\u028Anli", pos: "adv./adj.", translation: "\u4EC5\u4EC5\uFF1B\u53EA\u6709\uFF1B\u552F\u4E00\u7684" },
  { word: "however", phonetic: "ha\u028A\u02C8ev\u0259(r)", pos: "adv.", translation: "\u7136\u800C\uFF1B\u4F46\u662F\uFF1B\u4E0D\u8FC7" },
  { word: "therefore", phonetic: "\u02C8\xF0e\u0259f\u0254\u02D0(r)", pos: "adv.", translation: "\u56E0\u6B64\uFF1B\u6240\u4EE5" },
  { word: "whereas", phonetic: "\u02CCwe\u0259r\u02C8\xE6z", pos: "conj.", translation: "\u800C\uFF1B\u7136\u800C\uFF1B\u9274\u4E8E" },
  { word: "although", phonetic: "\u0254\u02D0l\u02C8\xF0\u0259\u028A", pos: "conj.", translation: "\u5C3D\u7BA1\uFF1B\u867D\u7136" },
  { word: "because", phonetic: "b\u026A\u02C8k\u0252z", pos: "conj.", translation: "\u56E0\u4E3A\uFF1B\u7531\u4E8E" },
  { word: "when", phonetic: "wen", pos: "conj./adv.", translation: "\u5F53\u2026\u65F6\uFF1B\u4F55\u65F6" },
  { word: "which", phonetic: "w\u026At\u0283", pos: "pron.", translation: "\u54EA\u4E00\u4E2A\uFF1B\u54EA\u4E9B" },
  { word: "true", phonetic: "tru\u02D0", pos: "adj.", translation: "\u6B63\u786E\u7684\uFF1B\u771F\u5B9E\u7684" },
  { word: "false", phonetic: "f\u0254\u02D0ls", pos: "adj.", translation: "\u9519\u8BEF\u7684\uFF1B\u865A\u5047\u7684" },
  { word: "both", phonetic: "b\u0259\u028A\u03B8", pos: "det./pron.", translation: "\u4E24\u8005\u90FD\uFF1B\u53CC\u65B9" },
  { word: "single", phonetic: "\u02C8s\u026A\u014B\u0261l", pos: "adj.", translation: "\u5355\u4E00\u7684\uFF1B\u5355\u4E2A\u7684" },
  { word: "multiple", phonetic: "\u02C8m\u028Clt\u026Apl", pos: "adj.", translation: "\u591A\u4E2A\u7684\uFF1B\u591A\u91CD\u7684" },
  { word: "different", phonetic: "\u02C8d\u026Afr\u0259nt", pos: "adj.", translation: "\u4E0D\u540C\u7684\uFF1B\u5404\u79CD\u7684" },
  { word: "similar", phonetic: "\u02C8s\u026Am\u0259l\u0259(r)", pos: "adj.", translation: "\u76F8\u4F3C\u7684\uFF1B\u7C7B\u4F3C\u7684" },
  { word: "common", phonetic: "\u02C8k\u0252m\u0259n", pos: "adj.", translation: "\u5171\u540C\u7684\uFF1B\u5E38\u89C1\u7684\uFF1B\u901A\u7528\u7684" },
  { word: "few", phonetic: "fju\u02D0", pos: "det./adj.", translation: "\u5F88\u5C11\u7684\uFF1B\u5C48\u6307\u53EF\u6570\u7684", exchange: "r:fewer/t:fewest" },
  { word: "many", phonetic: "\u02C8meni", pos: "det./pron.", translation: "\u8BB8\u591A\u7684\uFF1B\u5927\u91CF\u7684", exchange: "r:more/t:most" },
  { word: "less", phonetic: "les", pos: "det./adv.", translation: "\u66F4\u5C11\u7684\uFF1B\u8F83\u5C11\u5730" },
  { word: "more", phonetic: "m\u0254\u02D0(r)", pos: "det./adv.", translation: "\u66F4\u591A\u7684\uFF1B\u66F4\u52A0" },
  { word: "than", phonetic: "\xF0\xE6n", pos: "conj./prep.", translation: "\u6BD4\uFF1B\u8D85\u8FC7" },
  { word: "between", phonetic: "b\u026A\u02C8twi\u02D0n", pos: "prep.", translation: "\u5728\u2026\u4E4B\u95F4" },
  { word: "across", phonetic: "\u0259\u02C8kr\u0252s", pos: "prep.", translation: "\u8DE8\u8D8A\uFF1B\u904D\u53CA\uFF1B\u8D2F\u7A7F" },
  { word: "through", phonetic: "\u03B8ru\u02D0", pos: "prep.", translation: "\u901A\u8FC7\uFF1B\u7ECF\u7531\uFF1B\u8D2F\u7A7F" },
  { word: "within", phonetic: "w\u026A\u02C8\xF0\u026An", pos: "prep.", translation: "\u5728\u2026\u4E4B\u5185\uFF1B\u4E0D\u8D85\u8FC7" },
  { word: "without", phonetic: "w\u026A\u02C8\xF0a\u028At", pos: "prep.", translation: "\u6CA1\u6709\uFF1B\u7F3A\u4E4F" },
  { word: "during", phonetic: "\u02C8dj\u028A\u0259r\u026A\u014B", pos: "prep.", translation: "\u5728\u2026\u671F\u95F4" },
  { word: "instead", phonetic: "\u026An\u02C8sted", pos: "adv.", translation: "\u53CD\u800C\uFF1B\u4EE3\u66FF" },
  { word: "typically", phonetic: "\u02C8t\u026Ap\u026Akli", pos: "adv.", translation: "\u901A\u5E38\uFF1B\u5178\u578B\u5730" },
  { word: "significantly", phonetic: "s\u026A\u0261\u02C8n\u026Af\u026Ak\u0259ntli", pos: "adv.", translation: "\u663E\u8457\u5730\uFF1B\u5927\u5E45\u5730" },
  { word: "directly", phonetic: "da\u026A\u02C8rektli", pos: "adv.", translation: "\u76F4\u63A5\u5730" },
  { word: "closely", phonetic: "\u02C8kl\u0259\u028Asli", pos: "adv.", translation: "\u7D27\u5BC6\u5730\uFF1B\u5BC6\u5207\u5730" },
  { word: "rapidly", phonetic: "\u02C8r\xE6p\u026Adli", pos: "adv.", translation: "\u8FC5\u901F\u5730\uFF1B\u5FEB\u901F\u5730" },
  { word: "strict", phonetic: "str\u026Akt", pos: "adj.", translation: "\u4E25\u683C\u7684\uFF1B\u4E25\u5BC6\u7684", exchange: "r:stricter/t:strictest" },
  { word: "regulation", phonetic: "\u02CCre\u0261ju\u02C8le\u026A\u0283n", pos: "n.", translation: "\u6CD5\u89C4\uFF1B\u76D1\u7BA1\uFF1B\u89C4\u7AE0", exchange: "s:regulations" },
  { word: "regulatory", phonetic: "\u02C8re\u0261j\u0259l\u0259t\u0259ri", pos: "adj.", translation: "\u76D1\u7BA1\u7684\uFF1B\u6CD5\u89C4\u8981\u6C42\u7684" },
  { word: "policy", phonetic: "\u02C8p\u0252l\u0259si", pos: "n.", translation: "\u653F\u7B56\uFF1B\u65B9\u9488\uFF1B\u7B56\u7565", exchange: "s:policies" },
  { word: "budget", phonetic: "\u02C8b\u028Cd\u0292\u026At", pos: "n./v.", translation: "\u9884\u7B97\uFF1B\u7ECF\u8D39\uFF1B\u505A\u9884\u7B97", exchange: "s:budgets/i:budgeting" },
  { word: "investment", phonetic: "\u026An\u02C8vestm\u0259nt", pos: "n.", translation: "\u6295\u8D44\uFF1B\u6295\u5165", exchange: "s:investments" },
  { word: "return", phonetic: "r\u026A\u02C8t\u025C\u02D0n", pos: "n./v.", translation: "\u56DE\u62A5\uFF1B\u6536\u76CA\uFF1B\u8FD4\u56DE", exchange: "s:returns/p:returned/d:returned/i:returning" },
  { word: "capital", phonetic: "\u02C8k\xE6p\u026Atl", pos: "n.", translation: "\u8D44\u672C\uFF1B\u8D44\u91D1\uFF1B\u9996\u90FD" },
  { word: "asset", phonetic: "\u02C8\xE6set", pos: "n.", translation: "\u8D44\u4EA7\uFF1B\u6709\u5229\u8D44\u6E90", exchange: "s:assets" },
  { word: "scale", phonetic: "ske\u026Al", pos: "n./v.", translation: "\u89C4\u6A21\uFF1B\u5C3A\u5EA6\uFF1B\u6269\u5C55", exchange: "s:scales/i:scaling/p:scaled" },
  { word: "economy", phonetic: "\u026A\u02C8k\u0252n\u0259mi", pos: "n.", translation: "\u7ECF\u6D4E\uFF1B\u8282\u7EA6\uFF1B\u7ECF\u6D4E\u4F53", exchange: "s:economies" },
  { word: "economic", phonetic: "\u02CCi\u02D0k\u0259\u02C8n\u0252m\u026Ak", pos: "adj.", translation: "\u7ECF\u6D4E\u7684\uFF1B\u7ECF\u6D4E\u5B66\u7684" },
  { word: "consumerism", phonetic: "k\u0259n\u02C8sju\u02D0m\u0259r\u026Az\u0259m", pos: "n.", translation: "\u6D88\u8D39\u4E3B\u4E49" },
  { word: "luxury", phonetic: "\u02C8l\u028Ck\u0283\u0259ri", pos: "n./adj.", translation: "\u5962\u4F88\u54C1\uFF1B\u5962\u534E\u7684", exchange: "s:luxuries" },
  { word: "necessity", phonetic: "n\u0259\u02C8ses\u0259ti", pos: "n.", translation: "\u5FC5\u9700\u54C1\uFF1B\u5FC5\u8981\u6027", exchange: "s:necessities" },
  { word: "silo", phonetic: "\u02C8sa\u026Al\u0259\u028A", pos: "n.", translation: "\u4FE1\u606F\u5B64\u5C9B\uFF1B\u90E8\u95E8\u58C1\u5792", exchange: "s:silos" },
  { word: "seamless", phonetic: "\u02C8si\u02D0ml\u0259s", pos: "adj.", translation: "\u65E0\u7F1D\u7684\uFF1B\u987A\u7545\u8854\u63A5\u7684" },
  { word: "realize", phonetic: "\u02C8r\u026A\u0259la\u026Az", pos: "v.", translation: "\u5B9E\u73B0\uFF1B\u610F\u8BC6\u5230", exchange: "p:realized/d:realized/i:realizing/3:realizes" },
  { word: "generate", phonetic: "\u02C8d\u0292en\u0259re\u026At", pos: "v.", translation: "\u4EA7\u751F\uFF1B\u751F\u6210\uFF1B\u5E26\u6765", exchange: "p:generated/d:generated/i:generating/3:generates" },
  { word: "collect", phonetic: "k\u0259\u02C8lekt", pos: "v.", translation: "\u6536\u96C6\uFF1B\u91C7\u96C6\uFF1B\u6C47\u603B", exchange: "p:collected/d:collected/i:collecting/3:collects" },
  { word: "predict", phonetic: "pr\u026A\u02C8d\u026Akt", pos: "v.", translation: "\u9884\u6D4B\uFF1B\u9884\u8A00", exchange: "p:predicted/d:predicted/i:predicting/3:predicts" },
  { word: "predictive", phonetic: "pr\u026A\u02C8d\u026Akt\u026Av", pos: "adj.", translation: "\u9884\u6D4B\u6027\u7684\uFF1B\u9884\u89C1\u6027\u7684" },
  { word: "behavior", phonetic: "b\u026A\u02C8he\u026Avj\u0259(r)", pos: "n.", translation: "\u884C\u4E3A\uFF1B\u8868\u73B0", exchange: "s:behaviors" },
  { word: "behaviour", phonetic: "b\u026A\u02C8he\u026Avj\u0259(r)", pos: "n.", translation: "\u884C\u4E3A\uFF1B\u8868\u73B0", exchange: "s:behaviours" },
  { word: "pattern", phonetic: "\u02C8p\xE6tn", pos: "n.", translation: "\u6A21\u5F0F\uFF1B\u89C4\u5F8B\uFF1B\u5F62\u6001", exchange: "s:patterns" },
  { word: "relationship", phonetic: "r\u026A\u02C8le\u026A\u0283n\u0283\u026Ap", pos: "n.", translation: "\u5173\u7CFB\uFF1B\u8054\u7CFB\uFF1B\u5BA2\u6237\u5173\u7CFB", exchange: "s:relationships" },
  { word: "platform", phonetic: "\u02C8pl\xE6tf\u0254\u02D0m", pos: "n.", translation: "\u5E73\u53F0\uFF1B\u64CD\u4F5C\u7CFB\u7EDF", exchange: "s:platforms" },
  { word: "ecosystem", phonetic: "\u02C8i\u02D0k\u0259\u028As\u026Ast\u0259m", pos: "n.", translation: "\u751F\u6001\u7CFB\u7EDF\uFF1B\u5546\u4E1A\u751F\u6001", exchange: "s:ecosystems" },
  { word: "dominant", phonetic: "\u02C8d\u0252m\u026An\u0259nt", pos: "adj.", translation: "\u5360\u4E3B\u5BFC\u5730\u4F4D\u7684\uFF1B\u652F\u914D\u6027\u7684" },
  { word: "fragmented", phonetic: "\u02C8fr\xE6\u0261ment\u026Ad", pos: "adj.", translation: "\u788E\u7247\u5316\u7684\uFF1B\u5206\u6563\u7684" },
  { word: "concentrated", phonetic: "\u02C8k\u0252nsntre\u026At\u026Ad", pos: "adj.", translation: "\u96C6\u4E2D\u7684\uFF1B\u5BC6\u96C6\u7684" },
  { word: "unique", phonetic: "ju\u02C8ni\u02D0k", pos: "adj.", translation: "\u72EC\u7279\u7684\uFF1B\u72EC\u4E00\u65E0\u4E8C\u7684" },
  { word: "scarce", phonetic: "ske\u0259s", pos: "adj.", translation: "\u7A00\u7F3A\u7684\uFF1B\u7D27\u7F3A\u7684" },
  { word: "abundant", phonetic: "\u0259\u02C8b\u028Cnd\u0259nt", pos: "adj.", translation: "\u5145\u88D5\u7684\uFF1B\u4E30\u5BCC\u7684" },
  { word: "peak", phonetic: "pi\u02D0k", pos: "n./adj.", translation: "\u5CF0\u503C\uFF1B\u9AD8\u5CF0\uFF1B\u5C16\u5CF0\u7684", exchange: "s:peaks" },
  { word: "spike", phonetic: "spa\u026Ak", pos: "n./v.", translation: "\u6FC0\u589E\uFF1B\u5C16\u5CF0\uFF1B\u731B\u589E", exchange: "s:spikes/p:spiked/i:spiking" },
  { word: "burst", phonetic: "b\u025C\u02D0st", pos: "n./v.", translation: "\u7A81\u53D1\u6D41\u91CF\uFF1B\u7206\u53D1\uFF1B\u5F39\u6027\u6269\u5BB9", exchange: "i:bursting/s:bursts" },
  { word: "infrastructure", phonetic: "\u02C8\u026Anfr\u0259str\u028Ckt\u0283\u0259(r)", pos: "n.", translation: "\u57FA\u7840\u8BBE\u65BD\uFF1B\u5E95\u5C42\u67B6\u6784" }
];

// src/lib/textTokenize.ts
function cleanToken(raw) {
  if (!raw) return "";
  let s = raw.trim();
  s = s.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9'’]+$/g, "");
  s = s.replace(/['’]s$/i, "");
  s = s.replace(/['’]+$/g, "");
  s = s.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, "");
  return s;
}

// src/lib/dictionary.ts
var UPPERCASE_ACRONYMS = {
  IS: { word: "IS", pos: "abbr.", meaning_zh: "\u4FE1\u606F\u7CFB\u7EDF (Information System)" },
  IT: { word: "IT", pos: "abbr.", meaning_zh: "\u4FE1\u606F\u6280\u672F (Information Technology)" },
  ICT: { word: "ICT", pos: "abbr.", meaning_zh: "\u4FE1\u606F\u4E0E\u901A\u4FE1\u6280\u672F (Information & Communications Technology)" },
  MIS: { word: "MIS", pos: "abbr.", meaning_zh: "\u7BA1\u7406\u4FE1\u606F\u7CFB\u7EDF (Management Information System)" },
  ERP: { word: "ERP", pos: "abbr.", meaning_zh: "\u4F01\u4E1A\u8D44\u6E90\u8BA1\u5212 (Enterprise Resource Planning)" },
  CRM: { word: "CRM", pos: "abbr.", meaning_zh: "\u5BA2\u6237\u5173\u7CFB\u7BA1\u7406 (Customer Relationship Management)" },
  SCM: { word: "SCM", pos: "abbr.", meaning_zh: "\u4F9B\u5E94\u94FE\u7BA1\u7406 (Supply Chain Management)" },
  TPS: { word: "TPS", pos: "abbr.", meaning_zh: "\u4E8B\u52A1\u5904\u7406\u7CFB\u7EDF (Transaction Processing System)" },
  DSS: { word: "DSS", pos: "abbr.", meaning_zh: "\u51B3\u7B56\u652F\u6301\u7CFB\u7EDF (Decision Support System)" },
  ESS: { word: "ESS", pos: "abbr.", meaning_zh: "\u9AD8\u7BA1\u652F\u6301\u7CFB\u7EDF (Executive Support System)" },
  BI: { word: "BI", pos: "abbr.", meaning_zh: "\u5546\u4E1A\u667A\u80FD (Business Intelligence)" },
  AI: { word: "AI", pos: "abbr.", meaning_zh: "\u4EBA\u5DE5\u667A\u80FD (Artificial Intelligence)" },
  API: { word: "API", pos: "abbr.", meaning_zh: "\u5E94\u7528\u7A0B\u5E8F\u63A5\u53E3 (Application Programming Interface)" },
  SQL: { word: "SQL", pos: "abbr.", meaning_zh: "\u7ED3\u6784\u5316\u67E5\u8BE2\u8BED\u8A00 (Structured Query Language)" },
  SLA: { word: "SLA", pos: "abbr.", meaning_zh: "\u670D\u52A1\u7EA7\u522B\u534F\u8BAE (Service Level Agreement)" },
  KPI: { word: "KPI", pos: "abbr.", meaning_zh: "\u5173\u952E\u7EE9\u6548\u6307\u6807 (Key Performance Indicator)" },
  ROI: { word: "ROI", pos: "abbr.", meaning_zh: "\u6295\u8D44\u56DE\u62A5\u7387 (Return on Investment)" },
  B2B: { word: "B2B", pos: "abbr.", meaning_zh: "\u4F01\u4E1A\u5BF9\u4F01\u4E1A (Business-to-Business)" },
  B2C: { word: "B2C", pos: "abbr.", meaning_zh: "\u4F01\u4E1A\u5BF9\u6D88\u8D39\u8005 (Business-to-Consumer)" },
  GDP: { word: "GDP", pos: "abbr.", meaning_zh: "\u56FD\u5185\u751F\u4EA7\u603B\u503C (Gross Domestic Product)" },
  CPI: { word: "CPI", pos: "abbr.", meaning_zh: "\u6D88\u8D39\u8005\u7269\u4EF7\u6307\u6570 (Consumer Price Index)" },
  PED: { word: "PED", pos: "abbr.", meaning_zh: "\u9700\u6C42\u4EF7\u683C\u5F39\u6027 (Price Elasticity of Demand)" },
  SWOT: { word: "SWOT", pos: "abbr.", meaning_zh: "\u4F18\u52BF/\u52A3\u52BF/\u673A\u4F1A/\u5A01\u80C1\u5206\u6790" },
  SaaS: { word: "SaaS", pos: "abbr.", meaning_zh: "\u8F6F\u4EF6\u5373\u670D\u52A1 (Software as a Service)" },
  PaaS: { word: "PaaS", pos: "abbr.", meaning_zh: "\u5E73\u53F0\u5373\u670D\u52A1 (Platform as a Service)" },
  IaaS: { word: "IaaS", pos: "abbr.", meaning_zh: "\u57FA\u7840\u8BBE\u65BD\u5373\u670D\u52A1 (Infrastructure as a Service)" }
};
function condenseMeaningZh(rawTranslation, maxSenses = 3) {
  if (!rawTranslation) return "";
  const cleaned = rawTranslation.replace(/\\n/g, "\n").split(/\n/).map((line) => line.replace(/^[a-z]+\.\s*/i, "").trim()).filter(Boolean).join("\uFF1B");
  const parts = cleaned.split(/[；;，,]/).map((p) => p.trim()).filter(Boolean);
  const unique = [];
  for (const p of parts) {
    if (!unique.includes(p)) {
      unique.push(p);
    }
    if (unique.length >= maxSenses) break;
  }
  return unique.join("\uFF1B");
}
function buildDictionaryIndex(records) {
  const byWord = /* @__PURE__ */ new Map();
  const inflectionToLemma = /* @__PURE__ */ new Map();
  for (const rec of records) {
    const lower = rec.word.trim().toLowerCase();
    if (!lower) continue;
    if (!byWord.has(lower)) {
      byWord.set(lower, rec);
    }
    if (rec.exchange) {
      const pairs = rec.exchange.split("/");
      for (const pair of pairs) {
        const colonIdx = pair.indexOf(":");
        if (colonIdx === -1) continue;
        const tag = pair.slice(0, colonIdx).trim();
        const val = pair.slice(colonIdx + 1).trim().toLowerCase();
        if (!val) continue;
        if (tag === "0") {
          if (!inflectionToLemma.has(lower)) {
            inflectionToLemma.set(lower, val);
          }
        } else if (["p", "d", "i", "3", "s", "r", "t"].includes(tag)) {
          if (!inflectionToLemma.has(val)) {
            inflectionToLemma.set(val, lower);
          }
        }
      }
    }
  }
  return { byWord, inflectionToLemma };
}
function ruleBasedLemmaCandidates(lower) {
  const candidates = [];
  if (lower.endsWith("ies") && lower.length > 4) {
    candidates.push(lower.slice(0, -3) + "y");
  }
  if (lower.endsWith("es") && lower.length > 3) {
    candidates.push(lower.slice(0, -2));
    candidates.push(lower.slice(0, -1));
  }
  if (lower.endsWith("s") && !lower.endsWith("ss") && lower.length > 2) {
    candidates.push(lower.slice(0, -1));
  }
  if (lower.endsWith("ied") && lower.length > 4) {
    candidates.push(lower.slice(0, -3) + "y");
  }
  if (lower.endsWith("ed") && lower.length > 3) {
    candidates.push(lower.slice(0, -2));
    candidates.push(lower.slice(0, -1));
    const stem = lower.slice(0, -2);
    if (stem.length >= 2 && stem[stem.length - 1] === stem[stem.length - 2]) {
      candidates.push(stem.slice(0, -1));
    }
  }
  if (lower.endsWith("ing") && lower.length > 4) {
    const stem = lower.slice(0, -3);
    candidates.push(stem);
    candidates.push(stem + "e");
    if (stem.length >= 2 && stem[stem.length - 1] === stem[stem.length - 2]) {
      candidates.push(stem.slice(0, -1));
    }
  }
  return candidates;
}
var DEFAULT_INDEX = buildDictionaryIndex(BUILTIN_ECDICT_RECORDS);
function lookupWord(rawSurface, options = {}) {
  const { glossary, matchedGlossaryKey, dictIndex = DEFAULT_INDEX } = options;
  const cleanedSurface = cleanToken(rawSurface);
  if (glossary) {
    if (matchedGlossaryKey && glossary[matchedGlossaryKey] !== void 0) {
      return {
        word: matchedGlossaryKey,
        surface: rawSurface.trim(),
        phonetic: "",
        pos: "\u672F\u8BED",
        meaning_zh: glossary[matchedGlossaryKey],
        source: "glossary",
        found: true
      };
    }
    const targetLower = cleanedSurface.toLowerCase();
    const keys = Object.keys(glossary).sort((a, b) => b.length - a.length);
    for (const key of keys) {
      if (key.trim().toLowerCase() === targetLower || key.trim().toLowerCase() === rawSurface.trim().toLowerCase()) {
        return {
          word: key,
          surface: rawSurface.trim(),
          phonetic: "",
          pos: "\u672F\u8BED",
          meaning_zh: glossary[key],
          source: "glossary",
          found: true
        };
      }
    }
  }
  if (cleanedSurface && UPPERCASE_ACRONYMS[cleanedSurface]) {
    const abbr = UPPERCASE_ACRONYMS[cleanedSurface];
    return {
      word: abbr.word,
      surface: cleanedSurface,
      phonetic: "",
      pos: abbr.pos,
      meaning_zh: abbr.meaning_zh,
      source: "acronym",
      found: true
    };
  }
  const lower = cleanedSurface.toLowerCase();
  if (lower) {
    const mappedLemma = dictIndex.inflectionToLemma.get(lower);
    if (mappedLemma && mappedLemma !== lower) {
      const lemmaRec = dictIndex.byWord.get(mappedLemma);
      if (lemmaRec) {
        return {
          word: lemmaRec.word,
          surface: cleanedSurface,
          phonetic: lemmaRec.phonetic,
          pos: lemmaRec.pos,
          meaning_zh: condenseMeaningZh(lemmaRec.translation, 3),
          source: "ecdict",
          lemmaNote: `${cleanedSurface} \u2192 ${lemmaRec.word}`,
          found: true
        };
      }
    }
    const directRec = dictIndex.byWord.get(lower);
    if (directRec) {
      return {
        word: directRec.word,
        surface: cleanedSurface,
        phonetic: directRec.phonetic,
        pos: directRec.pos,
        meaning_zh: condenseMeaningZh(directRec.translation, 3),
        source: "ecdict",
        found: true
      };
    }
    for (const cand of ruleBasedLemmaCandidates(lower)) {
      const candRec = dictIndex.byWord.get(cand);
      if (candRec) {
        return {
          word: candRec.word,
          surface: cleanedSurface,
          phonetic: candRec.phonetic,
          pos: candRec.pos,
          meaning_zh: condenseMeaningZh(candRec.translation, 3),
          source: "ecdict",
          lemmaNote: `${cleanedSurface} \u2192 ${candRec.word}`,
          found: true
        };
      }
    }
  }
  return {
    word: cleanedSurface || rawSurface.trim(),
    surface: cleanedSurface || rawSurface.trim(),
    phonetic: "",
    pos: "",
    meaning_zh: "",
    source: "not_found",
    found: false
  };
}

// src/types/studyhub.ts
var SUBJECT_OPTIONS = ["ICT", "BE", "ES", "BO", "\u5176\u4ED6"];

// src/lib/vocabLogic.ts
var REVIEW_INTERVAL_STEPS = [1, 3, 7, 14];
function normalizeWordKey(word) {
  return word.trim().toLowerCase().replace(/\s+/g, " ");
}
function normalizeSubject(subject) {
  if (!subject) return "\u5176\u4ED6";
  const upper = subject.trim().toUpperCase();
  if (upper === "ICT" || upper === "BE" || upper === "ES" || upper === "BO") {
    return upper;
  }
  return SUBJECT_OPTIONS.includes(subject) ? subject : "\u5176\u4ED6";
}
function formatDateYmd(date = /* @__PURE__ */ new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function addDaysToYmd(ymd, days) {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  dt.setUTCDate(dt.getUTCDate() + days);
  const ny = dt.getUTCFullYear();
  const nm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const nd = String(dt.getUTCDate()).padStart(2, "0");
  return `${ny}-${nm}-${nd}`;
}
function calculateNextReview(currentIntervalDays, remembered, todayYmd = formatDateYmd()) {
  if (!remembered) {
    return {
      interval_days: 1,
      next_review: addDaysToYmd(todayYmd, 1)
    };
  }
  let nextInterval = 14;
  for (const step of REVIEW_INTERVAL_STEPS) {
    if (step > currentIntervalDays) {
      nextInterval = step;
      break;
    }
  }
  return {
    interval_days: nextInterval,
    next_review: addDaysToYmd(todayYmd, nextInterval)
  };
}
function addOrIncrementVocab(words, input, options = {}) {
  const now = options.now ?? /* @__PURE__ */ new Date();
  const idFactory = options.idFactory ?? (() => typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `w-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
  const key = normalizeWordKey(input.word);
  const existingIdx = words.findIndex((w) => normalizeWordKey(w.word) === key);
  if (existingIdx !== -1) {
    const existing = words[existingIdx];
    const updated = {
      ...existing,
      lookup_count: existing.lookup_count + 1,
      // 如果旧条目没有中文释义而本次提供了，则补充
      meaning_zh: existing.meaning_zh || input.meaning_zh.trim(),
      phonetic: existing.phonetic || (input.phonetic ?? "").trim(),
      pos: existing.pos || (input.pos ?? "").trim()
    };
    const nextWords = [...words];
    nextWords[existingIdx] = updated;
    return { words: nextWords, entry: updated, isNew: false };
  }
  const todayYmd = formatDateYmd(now);
  const newEntry = {
    id: idFactory(),
    word: input.word.trim(),
    meaning_zh: input.meaning_zh.trim(),
    phonetic: (input.phonetic ?? "").trim(),
    pos: (input.pos ?? "").trim(),
    context: (input.context ?? "").trim(),
    source: (input.source ?? "").trim() || "\u7C98\u8D34\u7684\u6587\u672C",
    subject: normalizeSubject(input.subject),
    status: "learning",
    added_at: now.toISOString(),
    learned_at: null,
    lookup_count: 1,
    review: {
      next_review: addDaysToYmd(todayYmd, 1),
      interval_days: 1
    }
  };
  return {
    words: [newEntry, ...words],
    entry: newEntry,
    isNew: true
  };
}
function mergeInboxWords(words, inboxItems, options = {}) {
  const existingKeys = new Set(words.map((w) => normalizeWordKey(w.word)));
  let current = [...words];
  let addedCount = 0;
  for (const item of inboxItems) {
    if (!item || typeof item.word !== "string" || !item.word.trim()) continue;
    const key = normalizeWordKey(item.word);
    if (existingKeys.has(key)) continue;
    const res = addOrIncrementVocab(
      current,
      {
        word: item.word,
        meaning_zh: item.meaning_zh ?? "",
        phonetic: item.phonetic ?? "",
        pos: item.pos ?? "",
        context: item.context ?? "",
        source: item.source ?? "AI \u79C1\u6559\u63A8\u8350",
        subject: item.subject ?? "\u5176\u4ED6"
      },
      options
    );
    current = res.words;
    existingKeys.add(key);
    addedCount++;
  }
  return { words: current, addedCount };
}
function markWordStatus(words, id, status, now = /* @__PURE__ */ new Date()) {
  return words.map((w) => {
    if (w.id !== id) return w;
    return {
      ...w,
      status,
      learned_at: status === "learned" ? now.toISOString() : null
    };
  });
}
function exportVocabToMarkdown(words) {
  const escapeCell = (val) => (val || "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim();
  const header = [
    "# StudyHub \u5355\u8BCD\u5E93",
    "",
    `> \u5171 ${words.length} \u8BCD \xB7 \u5B66\u4E60\u4E2D ${words.filter((w) => w.status === "learning").length} \xB7 \u5DF2\u5B66\u4F1A ${words.filter((w) => w.status === "learned").length}`,
    "",
    "| \u5355\u8BCD | \u4E2D\u6587 | \u539F\u53E5 | \u79D1\u76EE | \u72B6\u6001 |",
    "| --- | --- | --- | --- | --- |"
  ];
  const rows = words.map((w) => {
    const statusLabel = w.status === "learned" ? "\u5DF2\u5B66\u4F1A" : "\u5B66\u4E60\u4E2D";
    return `| ${escapeCell(w.word)} | ${escapeCell(w.meaning_zh)} | ${escapeCell(w.context)} | ${escapeCell(w.subject)} | ${statusLabel} |`;
  });
  return [...header, ...rows, ""].join("\n");
}

// server/agentGuide.ts
var AGENT_GUIDE_CONTENT = `# StudyHub \u2014 AI Agent Integration Guide

StudyHub is a local-first Windows desktop study client for Joel.
**You (the AI Agent) interact with StudyHub exclusively through local files in the StudyHub data directory.**
There is no login, no cloud database, and no HTTP API required on Windows. StudyHub watches this directory in real time (\`chokidar\`) and refreshes the UI automatically.

---

## 1. Data Directory Layout & Read/Write Rules

Default Windows path: \`C:\\Users\\<username>\\Documents\\StudyHub\\\` (or the custom path configured in StudyHub Settings).

| Path | Agent Permission | Purpose |
| --- | --- | --- |
| \`quizzes/*.json\` | **WRITE** | Put new quiz files here. StudyHub detects them live without restart. |
| \`vocab_inbox/*.json\` | **WRITE** | Suggest new vocabulary here. StudyHub deduplicates, merges into \`vocab.json\`, updates \`exports/\u5355\u8BCD\u5E93.md\`, and **automatically deletes** the inbox file. |
| \`vocab.json\` | **READ-ONLY** | Joel's vocabulary database. **NEVER write directly to \`vocab.json\`** (StudyHub is the sole writer). Read it to see \`learning\` vs \`learned\` words and high \`lookup_count\` weak spots. |
| \`results/*.json\` | **READ-ONLY** | Written automatically by StudyHub each time Joel finishes a quiz. Read these to analyze mistakes, skipped questions, hints used, and \`words_looked_up\`. |
| \`exports/\u5355\u8BCD\u5E93.md\` | **READ-ONLY** | Auto-generated Markdown table of \`vocab.json\`. |
| \`dict/\` | **OPTIONAL WRITE** | Optional offline ECDICT dictionary (\`ecdict.csv\` or \`*.json\`) for click-to-translate. |

### Safe Atomic Write Rule (Important)
When writing files into \`quizzes/\` or \`vocab_inbox/\`:
1. Write to a temporary filename containing \`.tmp.\` (e.g., \`quizzes/my-quiz.json.tmp.1\`). StudyHub ignores any file whose name contains \`.tmp.\`.
2. Rename/move the temporary file to the final \`.json\` filename (e.g., \`quizzes/my-quiz.json\`).

---

## 2. Schema: \`quizzes/<quiz_id>.json\` (Agent Writes)

Write UTF-8 JSON with the following structure:

\`\`\`json
{
  "quiz_id": "<unique-slug-id>",
  "title": "<display title>",
  "subject": "ICT | BE | ES | BO | \u5176\u4ED6",
  "pass_rate": 80,
  "glossary": {
    "<english term or multi-word phrase>": "<concise Chinese translation>"
  },
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "stem": "<English question stem>",
      "options": ["<option A>", "<option B>", "<option C>", "<option D>"],
      "correct_index": 0,
      "explanation_zh": "<Chinese explanation shown after answering>",
      "hint": "<optional hint shown when Joel clicks Hint>",
      "source": "<optional textbook chapter or reference>"
    },
    {
      "id": "q2",
      "type": "true_false",
      "stem": "<English statement>",
      "options": ["True", "False"],
      "correct_index": 0,
      "explanation_zh": "<Chinese explanation>",
      "hint": "<optional hint>",
      "source": "<optional reference>"
    }
  ]
}
\`\`\`

### Field Rules
- \`subject\`: Must be one of \`"ICT"\`, \`"BE"\`, \`"ES"\`, \`"BO"\`, \`"\u5176\u4ED6"\` (other values automatically normalize to \`"\u5176\u4ED6"\`).
- \`pass_rate\`: Number 0\u2013100 (defaults to \`80\` if omitted).
- \`glossary\`: Optional key-value map of domain phrases (lowercase recommended). StudyHub prioritizes \`glossary\` with **longest-phrase match first** when Joel clicks any word in the quiz.
- \`questions[].type\`: Only \`"multiple_choice"\` (4 options) or \`"true_false"\` (\`["True", "False"]\`).
- \`questions[].correct_index\`: 0-based integer index into \`options\`.

---

## 3. Schema: \`vocab_inbox/<batch_name>.json\` (Agent Writes)

Drop a JSON file into \`vocab_inbox/\` to recommend words/phrases for Joel's vocabulary library:

\`\`\`json
{
  "words": [
    {
      "word": "<word or phrase in base form>",
      "meaning_zh": "<concise Chinese meaning>",
      "phonetic": "<optional IPA>",
      "pos": "<optional part of speech, e.g. n. / v. / adj.>",
      "context": "<optional English sentence containing the word>",
      "source": "<optional source label>",
      "subject": "ICT | BE | ES | BO | \u5176\u4ED6"
    }
  ]
}
\`\`\`

- Deduplication is case-insensitive on \`word\`: if the word already exists in \`vocab.json\`, it is skipped without overwriting Joel's status or review schedule.
- Newly merged words start with \`status: "learning"\`, \`lookup_count: 1\`, and \`review.interval_days: 1\`.
- StudyHub deletes the \`vocab_inbox/*.json\` file immediately after merging.

---

## 4. Schema: \`results/<quiz_id>_<YYYY-MM-DD_HH-mm-ss>.json\` (Agent Reads)

Generated automatically by StudyHub when Joel completes a quiz:

\`\`\`json
{
  "quiz_id": "<quiz_id>",
  "title": "<title>",
  "subject": "ICT | BE | ES | BO | \u5176\u4ED6",
  "finished_at": "<ISO-8601 timestamp>",
  "score": 8,
  "total": 10,
  "percent": 80,
  "answers": [
    {
      "id": "q1",
      "chosen_index": 0,
      "correct": true,
      "used_hint": false
    }
  ],
  "words_looked_up": ["<words Joel clicked during this quiz>"]
}
\`\`\`

- \`chosen_index: -1\` means Joel skipped that question.
- \`words_looked_up\` lists unique words/phrases Joel clicked for translation during the quiz \u2014 ideal input for generating follow-up explanations or \`vocab_inbox\` entries.

---

## 5. Schema: \`vocab.json\` (Agent Reads Only)

\`\`\`json
{
  "version": 1,
  "words": [
    {
      "id": "<uuid>",
      "word": "<word or phrase>",
      "meaning_zh": "<Chinese meaning>",
      "phonetic": "<IPA>",
      "pos": "<part of speech>",
      "context": "<English sentence>",
      "source": "<source label>",
      "subject": "ICT | BE | ES | BO | \u5176\u4ED6",
      "status": "learning | learned",
      "added_at": "<ISO-8601>",
      "learned_at": "<ISO-8601 | null>",
      "lookup_count": 1,
      "review": {
        "next_review": "YYYY-MM-DD",
        "interval_days": 1
      }
    }
  ]
}
\`\`\`

- \`lookup_count\` increments every time Joel clicks the same word again \u2014 high counts highlight words Joel repeatedly forgets.
- Only Joel manually marks words as \`"learned"\`; do not overwrite \`vocab.json\`.
`;

// server/storage.ts
var CONFIG_FILE_PATH = import_path.default.resolve(process.cwd(), "studyhub-config.json");
function atomicWriteFileSync(targetPath, content) {
  const dir = import_path.default.dirname(targetPath);
  import_fs.default.mkdirSync(dir, { recursive: true });
  const tmpPath = `${targetPath}.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
  import_fs.default.writeFileSync(tmpPath, content, "utf-8");
  import_fs.default.renameSync(tmpPath, targetPath);
}
function parseCsvLine(line) {
  const fields = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}
var StudyHubStorage = class extends import_events.EventEmitter {
  constructor() {
    super();
    this.watcher = null;
    this.hasExternalEcdict = false;
    this.lastSyncedAt = (/* @__PURE__ */ new Date()).toISOString();
    this.dataDir = this.resolveInitialDataDir();
    this.dictIndex = buildDictionaryIndex(BUILTIN_ECDICT_RECORDS);
    this.initializeDataDir();
    this.loadExternalDictionary();
    this.startWatching();
  }
  getDefaultWindowsDir() {
    if (process.platform === "win32") {
      return import_path.default.join(import_os.default.homedir(), "Documents", "StudyHub");
    }
    return "C:\\Users\\joelt\\Documents\\StudyHub";
  }
  resolveInitialDataDir() {
    try {
      if (import_fs.default.existsSync(CONFIG_FILE_PATH)) {
        const parsed = JSON.parse(import_fs.default.readFileSync(CONFIG_FILE_PATH, "utf-8"));
        if (parsed && typeof parsed.dataDir === "string" && parsed.dataDir.trim()) {
          return parsed.dataDir.trim();
        }
      }
    } catch {
    }
    if (process.env.STUDYHUB_DATA_DIR) {
      return process.env.STUDYHUB_DATA_DIR;
    }
    if (process.platform === "win32") {
      return import_path.default.join(import_os.default.homedir(), "Documents", "StudyHub");
    }
    return import_path.default.resolve(process.cwd(), "StudyHub-Data");
  }
  getDataDir() {
    return this.dataDir;
  }
  getSubPath(...parts) {
    return import_path.default.join(this.dataDir, ...parts);
  }
  /**
   * 初始化 StudyHub 所需的全部子目录（零预设示例数据，直接供外部 AI Agent 使用）
   * 并在数据根目录生成 AGENT_GUIDE.md，方便 Agent 直接读懂全部文件协议
   */
  initializeDataDir() {
    const dirs = [
      this.dataDir,
      this.getSubPath("vocab_inbox"),
      this.getSubPath("quizzes"),
      this.getSubPath("results"),
      this.getSubPath("dict"),
      this.getSubPath("exports")
    ];
    for (const d of dirs) {
      import_fs.default.mkdirSync(d, { recursive: true });
    }
    const vocabPath = this.getSubPath("vocab.json");
    if (!import_fs.default.existsSync(vocabPath)) {
      this.writeVocabFile({ version: 1, words: [] });
    } else {
      const exportPath = this.getSubPath("exports", "\u5355\u8BCD\u5E93.md");
      if (!import_fs.default.existsSync(exportPath)) {
        this.exportMarkdown(this.readVocabFile().words);
      }
    }
    const guidePath = this.getSubPath("AGENT_GUIDE.md");
    if (!import_fs.default.existsSync(guidePath)) {
      atomicWriteFileSync(guidePath, AGENT_GUIDE_CONTENT);
    }
    this.processAllInboxFiles();
  }
  /**
   * 切换数据文件夹路径并重新初始化监听
   */
  setDataDir(newDir) {
    const trimmed = newDir.trim();
    if (!trimmed) {
      throw new Error("\u6570\u636E\u76EE\u5F55\u8DEF\u5F84\u4E0D\u80FD\u4E3A\u7A7A");
    }
    const resolved = import_path.default.resolve(trimmed);
    import_fs.default.mkdirSync(resolved, { recursive: true });
    this.dataDir = resolved;
    atomicWriteFileSync(
      CONFIG_FILE_PATH,
      JSON.stringify({ dataDir: this.dataDir }, null, 2)
    );
    this.initializeDataDir();
    this.loadExternalDictionary();
    this.startWatching();
    this.notify({ type: "vocab_updated", message: "\u5DF2\u5207\u6362\u6570\u636E\u76EE\u5F55" });
    this.notify({ type: "quizzes_updated" });
    return this.getStatus();
  }
  /**
   * 启动 chokidar 实时文件监听：
   * - quizzes/*.json 新增/修改/删除 -> 自动通知前端刷新测验列表
   * - vocab_inbox/*.json 新增 -> 自动合并进 vocab.json 并删除原文件
   * - dict/ 变化 -> 自动重载离线词典
   */
  startWatching() {
    if (this.watcher) {
      void this.watcher.close();
      this.watcher = null;
    }
    const watchTargets = [
      this.getSubPath("quizzes"),
      this.getSubPath("vocab_inbox"),
      this.getSubPath("dict")
    ];
    this.watcher = chokidar_default.watch(watchTargets, {
      ignoreInitial: true,
      depth: 1,
      awaitWriteFinish: {
        stabilityThreshold: 250,
        pollInterval: 50
      }
    });
    const quizzesDir = import_path.default.resolve(this.getSubPath("quizzes"));
    const inboxDir = import_path.default.resolve(this.getSubPath("vocab_inbox"));
    const dictDir = import_path.default.resolve(this.getSubPath("dict"));
    this.watcher.on("all", (event, filePath) => {
      const resolved = import_path.default.resolve(filePath);
      const lower = resolved.toLowerCase();
      if (lower.includes(".tmp.")) return;
      if (resolved.startsWith(inboxDir) && lower.endsWith(".json") && (event === "add" || event === "change")) {
        this.processSingleInboxFile(resolved);
      } else if (resolved.startsWith(quizzesDir) && lower.endsWith(".json")) {
        this.lastSyncedAt = (/* @__PURE__ */ new Date()).toISOString();
        this.notify({ type: "quizzes_updated", message: "\u68C0\u6D4B\u5230\u6D4B\u9A8C\u6587\u4EF6\u66F4\u65B0" });
      } else if (resolved.startsWith(dictDir) && (lower.endsWith(".csv") || lower.endsWith(".json"))) {
        this.loadExternalDictionary();
        this.notify({ type: "dict_updated", message: "\u79BB\u7EBF\u8BCD\u5178\u5DF2\u91CD\u8F7D" });
      }
    });
  }
  async close() {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
  }
  notify(event) {
    this.lastSyncedAt = (/* @__PURE__ */ new Date()).toISOString();
    this.emit("change", event);
  }
  /**
   * 加载 dict/ 目录下可选的外部 ECDICT 文件（ecdict.csv 或 ecdict.json）
   * 与内置基础词典合并，实现开箱即用 + 支持完整 77 万词库扩展
   */
  loadExternalDictionary() {
    const dictDir = this.getSubPath("dict");
    const records = [...BUILTIN_ECDICT_RECORDS];
    let loadedExternal = false;
    try {
      const files = import_fs.default.readdirSync(dictDir);
      const jsonFile = files.find((f) => f.toLowerCase().endsWith(".json"));
      const csvFile = files.find((f) => f.toLowerCase().endsWith(".csv"));
      if (jsonFile) {
        const parsed = JSON.parse(import_fs.default.readFileSync(import_path.default.join(dictDir, jsonFile), "utf-8"));
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item && typeof item.word === "string") {
              records.push({
                word: item.word,
                phonetic: item.phonetic || "",
                pos: item.pos || "",
                translation: item.translation || item.meaning_zh || "",
                exchange: item.exchange || ""
              });
            }
          }
          loadedExternal = true;
        }
      }
      if (csvFile) {
        const raw = import_fs.default.readFileSync(import_path.default.join(dictDir, csvFile), "utf-8");
        const lines = raw.split(/\r?\n/);
        if (lines.length > 1) {
          const header = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
          const wordIdx = header.indexOf("word");
          const phoneticIdx = header.indexOf("phonetic");
          const transIdx = header.indexOf("translation");
          const posIdx = header.indexOf("pos");
          const exchangeIdx = header.indexOf("exchange");
          if (wordIdx !== -1 && transIdx !== -1) {
            for (let i = 1; i < lines.length; i++) {
              const line = lines[i];
              if (!line) continue;
              const cols = parseCsvLine(line);
              const word = (cols[wordIdx] || "").trim();
              const translation = (cols[transIdx] || "").trim();
              if (!word || !translation) continue;
              records.push({
                word,
                phonetic: phoneticIdx !== -1 ? (cols[phoneticIdx] || "").trim() : "",
                pos: posIdx !== -1 ? (cols[posIdx] || "").trim() : "",
                translation,
                exchange: exchangeIdx !== -1 ? (cols[exchangeIdx] || "").trim() : ""
              });
            }
            loadedExternal = true;
          }
        }
      }
    } catch (err) {
      console.error("[StudyHub] \u52A0\u8F7D\u5916\u90E8\u79BB\u7EBF\u8BCD\u5178\u5931\u8D25:", err);
    }
    this.dictIndex = buildDictionaryIndex(records);
    this.hasExternalEcdict = loadedExternal;
  }
  saveExternalDictCsv(filename, csvContent) {
    const safeName = filename.replace(/[^A-Za-z0-9._-]/g, "_") || "ecdict.csv";
    const finalName = safeName.endsWith(".csv") ? safeName : `${safeName}.csv`;
    atomicWriteFileSync(this.getSubPath("dict", finalName), csvContent);
    this.loadExternalDictionary();
    this.notify({ type: "dict_updated", message: `\u5DF2\u5BFC\u5165\u79BB\u7EBF\u8BCD\u5178 ${finalName}` });
    return this.getStatus();
  }
  lookup(surface, options = {}) {
    return lookupWord(surface, {
      ...options,
      dictIndex: this.dictIndex
    });
  }
  // ==================== Vocab 读写 ====================
  readVocabFile() {
    const vocabPath = this.getSubPath("vocab.json");
    try {
      if (!import_fs.default.existsSync(vocabPath)) {
        return { version: 1, words: [] };
      }
      const parsed = JSON.parse(import_fs.default.readFileSync(vocabPath, "utf-8"));
      if (parsed && Array.isArray(parsed.words)) {
        return { version: 1, words: parsed.words };
      }
    } catch (err) {
      console.error("[StudyHub] \u8BFB\u53D6 vocab.json \u5931\u8D25:", err);
    }
    return { version: 1, words: [] };
  }
  writeVocabFile(vocabFile) {
    const vocabPath = this.getSubPath("vocab.json");
    atomicWriteFileSync(vocabPath, JSON.stringify(vocabFile, null, 2));
    this.exportMarkdown(vocabFile.words);
  }
  exportMarkdown(words) {
    const list = words ?? this.readVocabFile().words;
    const md = exportVocabToMarkdown(list);
    atomicWriteFileSync(this.getSubPath("exports", "\u5355\u8BCD\u5E93.md"), md);
    return md;
  }
  addVocab(input) {
    const current = this.readVocabFile();
    const res = addOrIncrementVocab(current.words, input);
    const updatedFile = { version: 1, words: res.words };
    this.writeVocabFile(updatedFile);
    this.notify({ type: "vocab_updated" });
    return { entry: res.entry, isNew: res.isNew, vocab: updatedFile };
  }
  updateVocab(id, patch) {
    const current = this.readVocabFile();
    let words = current.words;
    if (patch.status) {
      words = markWordStatus(words, id, patch.status);
    }
    words = words.map((w) => {
      if (w.id !== id) return w;
      return {
        ...w,
        meaning_zh: patch.meaning_zh !== void 0 ? patch.meaning_zh.trim() : w.meaning_zh,
        subject: patch.subject !== void 0 ? normalizeSubject(patch.subject) : w.subject,
        context: patch.context !== void 0 ? patch.context.trim() : w.context
      };
    });
    const updatedFile = { version: 1, words };
    this.writeVocabFile(updatedFile);
    this.notify({ type: "vocab_updated" });
    return updatedFile;
  }
  deleteVocab(id) {
    const current = this.readVocabFile();
    const words = current.words.filter((w) => w.id !== id);
    const updatedFile = { version: 1, words };
    this.writeVocabFile(updatedFile);
    this.notify({ type: "vocab_updated" });
    return updatedFile;
  }
  recordReview(id, remembered) {
    const current = this.readVocabFile();
    const today = formatDateYmd();
    const words = current.words.map((w) => {
      if (w.id !== id) return w;
      const nextReview = calculateNextReview(w.review.interval_days, remembered, today);
      return {
        ...w,
        review: nextReview
      };
    });
    const updatedFile = { version: 1, words };
    this.writeVocabFile(updatedFile);
    this.notify({ type: "vocab_updated" });
    return updatedFile;
  }
  // ==================== vocab_inbox 合并 ====================
  processAllInboxFiles() {
    const inboxDir = this.getSubPath("vocab_inbox");
    if (!import_fs.default.existsSync(inboxDir)) return;
    const files = import_fs.default.readdirSync(inboxDir).filter((f) => f.toLowerCase().endsWith(".json") && !f.includes(".tmp."));
    for (const file of files) {
      this.processSingleInboxFile(import_path.default.join(inboxDir, file));
    }
  }
  processSingleInboxFile(filePath) {
    try {
      if (!import_fs.default.existsSync(filePath)) return 0;
      const raw = import_fs.default.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw);
      const inboxWords = Array.isArray(parsed) ? parsed : parsed && Array.isArray(parsed.words) ? parsed.words : null;
      if (!inboxWords) return 0;
      const current = this.readVocabFile();
      const merged = mergeInboxWords(current.words, inboxWords);
      if (merged.addedCount > 0) {
        this.writeVocabFile({ version: 1, words: merged.words });
      }
      import_fs.default.unlinkSync(filePath);
      this.notify({
        type: "inbox_merged",
        addedCount: merged.addedCount,
        message: `\u5DF2\u4ECE vocab_inbox \u5408\u5E76 ${merged.addedCount} \u4E2A\u65B0\u5355\u8BCD`
      });
      return merged.addedCount;
    } catch (err) {
      console.error(`[StudyHub] \u5904\u7406 vocab_inbox \u6587\u4EF6\u5931\u8D25 (${filePath}):`, err);
      return 0;
    }
  }
  dropInboxFile(filename, content) {
    const safeName = filename.replace(/[^A-Za-z0-9._-]/g, "_") || `inbox_${Date.now()}.json`;
    const finalName = safeName.endsWith(".json") ? safeName : `${safeName}.json`;
    const filePath = this.getSubPath("vocab_inbox", finalName);
    atomicWriteFileSync(filePath, JSON.stringify(content, null, 2));
    const addedCount = this.processSingleInboxFile(filePath);
    return { addedCount, vocab: this.readVocabFile() };
  }
  // ==================== Quizzes & Results ====================
  normalizeQuiz(raw, filename) {
    const questions = raw.questions.map((q, idx) => {
      const options = Array.isArray(q.options) ? q.options.map(String) : ["True", "False"];
      const inferredType = q.type === "true_false" || q.type === "multiple_choice" ? q.type : options.length === 2 ? "true_false" : "multiple_choice";
      return {
        ...q,
        id: q.id || `q${idx + 1}`,
        type: inferredType,
        options,
        explanation_zh: q.explanation_zh ?? ""
      };
    });
    return {
      ...raw,
      title: raw.title || raw.quiz_id,
      subject: normalizeSubject(raw.subject),
      pass_rate: typeof raw.pass_rate === "number" ? raw.pass_rate : 80,
      glossary: raw.glossary && typeof raw.glossary === "object" ? raw.glossary : {},
      questions,
      _filename: filename
    };
  }
  listQuizzes() {
    const quizzesDir = this.getSubPath("quizzes");
    if (!import_fs.default.existsSync(quizzesDir)) return [];
    const files = import_fs.default.readdirSync(quizzesDir).filter((f) => f.toLowerCase().endsWith(".json") && !f.includes(".tmp.")).sort();
    const quizzes = [];
    for (const f of files) {
      try {
        const parsed = JSON.parse(import_fs.default.readFileSync(import_path.default.join(quizzesDir, f), "utf-8"));
        if (parsed && parsed.quiz_id && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
          quizzes.push(this.normalizeQuiz(parsed, f));
        }
      } catch (err) {
        console.error(`[StudyHub] \u89E3\u6790\u6D4B\u9A8C\u6587\u4EF6\u5931\u8D25 (${f}):`, err);
      }
    }
    return quizzes;
  }
  importQuiz(filename, quiz) {
    if (!quiz || !quiz.quiz_id || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
      throw new Error("\u6D4B\u9A8C JSON \u683C\u5F0F\u65E0\u6548\uFF1A\u9700\u8981\u5305\u542B quiz_id \u548C\u975E\u7A7A\u7684 questions \u6570\u7EC4");
    }
    const safeName = filename.replace(/[^A-Za-z0-9._-]/g, "_") || `${quiz.quiz_id}.json`;
    const finalName = safeName.endsWith(".json") ? safeName : `${safeName}.json`;
    const normalized = this.normalizeQuiz(quiz, finalName);
    const { _filename: _ignored, ...cleanQuiz } = normalized;
    void _ignored;
    const targetPath = this.getSubPath("quizzes", finalName);
    atomicWriteFileSync(targetPath, JSON.stringify(cleanQuiz, null, 2));
    this.notify({ type: "quizzes_updated", message: `\u5DF2\u5BFC\u5165\u6D4B\u9A8C\uFF1A${normalized.title}` });
    return normalized;
  }
  saveQuizResult(filename, result) {
    const safeName = filename.replace(/[^A-Za-z0-9._-]/g, "_");
    const finalName = safeName.endsWith(".json") ? safeName : `${safeName}.json`;
    const targetPath = this.getSubPath("results", finalName);
    const { _filename: _ignored, ...cleanResult } = result;
    void _ignored;
    atomicWriteFileSync(targetPath, JSON.stringify(cleanResult, null, 2));
    this.notify({ type: "results_updated", message: `\u6D4B\u9A8C\u7ED3\u679C\u5DF2\u4FDD\u5B58\uFF1A${finalName}` });
    return { ...cleanResult, _filename: finalName };
  }
  listResults() {
    const resultsDir = this.getSubPath("results");
    if (!import_fs.default.existsSync(resultsDir)) return [];
    const files = import_fs.default.readdirSync(resultsDir).filter((f) => f.toLowerCase().endsWith(".json") && !f.includes(".tmp.")).sort().reverse();
    const results = [];
    for (const f of files.slice(0, 50)) {
      try {
        const parsed = JSON.parse(import_fs.default.readFileSync(import_path.default.join(resultsDir, f), "utf-8"));
        if (parsed && parsed.quiz_id) {
          results.push({ ...parsed, _filename: f });
        }
      } catch {
      }
    }
    return results;
  }
  getStatus() {
    const vocab = this.readVocabFile();
    const learningCount = vocab.words.filter((w) => w.status === "learning").length;
    const learnedCount = vocab.words.filter((w) => w.status === "learned").length;
    const quizzes = this.listQuizzes();
    const results = this.listResults();
    const exportPath = this.getSubPath("exports", "\u5355\u8BCD\u5E93.md");
    return {
      dataDir: this.dataDir,
      defaultWindowsDir: this.getDefaultWindowsDir(),
      platform: process.platform,
      vocabCount: vocab.words.length,
      learningCount,
      learnedCount,
      quizCount: quizzes.length,
      resultCount: results.length,
      ecdictEntriesCount: this.dictIndex.byWord.size,
      hasExternalEcdict: this.hasExternalEcdict,
      exportExists: import_fs.default.existsSync(exportPath),
      exportPath,
      lastSyncedAt: this.lastSyncedAt
    };
  }
};

// electron/main.ts
var mainWindow = null;
var storage = null;
function ensureStorage() {
  if (!storage) {
    if (!process.env.STUDYHUB_DATA_DIR && process.platform === "win32") {
      process.env.STUDYHUB_DATA_DIR = import_path2.default.join(import_os2.default.homedir(), "Documents", "StudyHub");
    }
    storage = new StudyHubStorage();
    storage.on("change", (event) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("studyhub:event", event);
      }
    });
  }
  return storage;
}
function registerIpcHandlers() {
  const store = ensureStorage();
  import_electron.ipcMain.handle("studyhub:getStatus", () => store.getStatus());
  import_electron.ipcMain.handle("studyhub:setDataDir", (_evt, dataDir) => store.setDataDir(dataDir));
  import_electron.ipcMain.handle("studyhub:pickDataDir", async () => {
    const win = mainWindow ?? void 0;
    const res = await import_electron.dialog.showOpenDialog(win, {
      title: "\u9009\u62E9 StudyHub \u6570\u636E\u6587\u4EF6\u5939",
      defaultPath: store.getDataDir(),
      properties: ["openDirectory", "createDirectory"]
    });
    if (res.canceled || res.filePaths.length === 0) {
      return { canceled: true, status: store.getStatus() };
    }
    const status = store.setDataDir(res.filePaths[0]);
    return { canceled: false, status };
  });
  import_electron.ipcMain.handle("studyhub:openDataDir", async () => {
    const err = await import_electron.shell.openPath(store.getDataDir());
    return { ok: !err, error: err || void 0 };
  });
  import_electron.ipcMain.handle("studyhub:getVocab", () => store.readVocabFile());
  import_electron.ipcMain.handle(
    "studyhub:addVocab",
    (_evt, payload) => store.addVocab(payload)
  );
  import_electron.ipcMain.handle(
    "studyhub:updateVocab",
    (_evt, id, patch) => store.updateVocab(id, patch)
  );
  import_electron.ipcMain.handle("studyhub:deleteVocab", (_evt, id) => store.deleteVocab(id));
  import_electron.ipcMain.handle(
    "studyhub:recordReview",
    (_evt, id, remembered) => store.recordReview(id, Boolean(remembered))
  );
  import_electron.ipcMain.handle("studyhub:exportMarkdown", () => ({
    markdown: store.exportMarkdown(),
    path: store.getStatus().exportPath
  }));
  import_electron.ipcMain.handle(
    "studyhub:importInbox",
    (_evt, filename, data) => store.dropInboxFile(filename, data)
  );
  import_electron.ipcMain.handle("studyhub:getQuizzes", () => ({ quizzes: store.listQuizzes() }));
  import_electron.ipcMain.handle("studyhub:importQuiz", (_evt, filename, quiz) => {
    const saved = store.importQuiz(filename, quiz);
    return { quiz: saved, quizzes: store.listQuizzes() };
  });
  import_electron.ipcMain.handle("studyhub:getResults", () => ({ results: store.listResults() }));
  import_electron.ipcMain.handle("studyhub:saveResult", (_evt, filename, result) => ({
    result: store.saveQuizResult(filename, result)
  }));
  import_electron.ipcMain.handle(
    "studyhub:lookup",
    (_evt, surface, options = {}) => store.lookup(surface, options)
  );
  import_electron.ipcMain.handle(
    "studyhub:importDictCsv",
    (_evt, filename, content) => store.saveExternalDictCsv(filename, content)
  );
}
async function createMainWindow() {
  mainWindow = new import_electron.BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: "StudyHub",
    autoHideMenuBar: true,
    backgroundColor: "#F8FAFC",
    webPreferences: {
      preload: import_path2.default.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  const indexHtmlPath = import_path2.default.join(__dirname, "..", "dist", "index.html");
  await mainWindow.loadFile(indexHtmlPath);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
var gotSingleLock = import_electron.app.requestSingleInstanceLock();
if (!gotSingleLock) {
  import_electron.app.quit();
} else {
  import_electron.app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
  import_electron.app.whenReady().then(() => {
    registerIpcHandlers();
    void createMainWindow();
    import_electron.app.on("activate", () => {
      if (import_electron.BrowserWindow.getAllWindows().length === 0) {
        void createMainWindow();
      }
    });
  });
  import_electron.app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      import_electron.app.quit();
    }
  });
}
/*! Bundled license information:

chokidar/index.js:
  (*! chokidar - MIT License (c) 2012 Paul Miller (paulmillr.com) *)
*/
