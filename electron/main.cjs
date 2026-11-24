var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
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

// node_modules/universalify/index.js
var require_universalify = __commonJS({
  "node_modules/universalify/index.js"(exports2) {
    "use strict";
    exports2.fromCallback = function(fn) {
      return Object.defineProperty(function(...args) {
        if (typeof args[args.length - 1] === "function") fn.apply(this, args);
        else {
          return new Promise((resolve6, reject) => {
            args.push((err, res) => err != null ? reject(err) : resolve6(res));
            fn.apply(this, args);
          });
        }
      }, "name", { value: fn.name });
    };
    exports2.fromPromise = function(fn) {
      return Object.defineProperty(function(...args) {
        const cb = args[args.length - 1];
        if (typeof cb !== "function") return fn.apply(this, args);
        else {
          args.pop();
          fn.apply(this, args).then((r) => cb(null, r), cb);
        }
      }, "name", { value: fn.name });
    };
  }
});

// node_modules/graceful-fs/polyfills.js
var require_polyfills = __commonJS({
  "node_modules/graceful-fs/polyfills.js"(exports2, module2) {
    var constants = require("constants");
    var origCwd = process.cwd;
    var cwd = null;
    var platform2 = process.env.GRACEFUL_FS_PLATFORM || process.platform;
    process.cwd = function() {
      if (!cwd)
        cwd = origCwd.call(process);
      return cwd;
    };
    try {
      process.cwd();
    } catch (er) {
    }
    if (typeof process.chdir === "function") {
      chdir = process.chdir;
      process.chdir = function(d) {
        cwd = null;
        chdir.call(process, d);
      };
      if (Object.setPrototypeOf) Object.setPrototypeOf(process.chdir, chdir);
    }
    var chdir;
    module2.exports = patch;
    function patch(fs3) {
      if (constants.hasOwnProperty("O_SYMLINK") && process.version.match(/^v0\.6\.[0-2]|^v0\.5\./)) {
        patchLchmod(fs3);
      }
      if (!fs3.lutimes) {
        patchLutimes(fs3);
      }
      fs3.chown = chownFix(fs3.chown);
      fs3.fchown = chownFix(fs3.fchown);
      fs3.lchown = chownFix(fs3.lchown);
      fs3.chmod = chmodFix(fs3.chmod);
      fs3.fchmod = chmodFix(fs3.fchmod);
      fs3.lchmod = chmodFix(fs3.lchmod);
      fs3.chownSync = chownFixSync(fs3.chownSync);
      fs3.fchownSync = chownFixSync(fs3.fchownSync);
      fs3.lchownSync = chownFixSync(fs3.lchownSync);
      fs3.chmodSync = chmodFixSync(fs3.chmodSync);
      fs3.fchmodSync = chmodFixSync(fs3.fchmodSync);
      fs3.lchmodSync = chmodFixSync(fs3.lchmodSync);
      fs3.stat = statFix(fs3.stat);
      fs3.fstat = statFix(fs3.fstat);
      fs3.lstat = statFix(fs3.lstat);
      fs3.statSync = statFixSync(fs3.statSync);
      fs3.fstatSync = statFixSync(fs3.fstatSync);
      fs3.lstatSync = statFixSync(fs3.lstatSync);
      if (fs3.chmod && !fs3.lchmod) {
        fs3.lchmod = function(path3, mode, cb) {
          if (cb) process.nextTick(cb);
        };
        fs3.lchmodSync = function() {
        };
      }
      if (fs3.chown && !fs3.lchown) {
        fs3.lchown = function(path3, uid, gid, cb) {
          if (cb) process.nextTick(cb);
        };
        fs3.lchownSync = function() {
        };
      }
      if (platform2 === "win32") {
        fs3.rename = typeof fs3.rename !== "function" ? fs3.rename : (function(fs$rename) {
          function rename(from, to, cb) {
            var start = Date.now();
            var backoff = 0;
            fs$rename(from, to, function CB(er) {
              if (er && (er.code === "EACCES" || er.code === "EPERM" || er.code === "EBUSY") && Date.now() - start < 6e4) {
                setTimeout(function() {
                  fs3.stat(to, function(stater, st) {
                    if (stater && stater.code === "ENOENT")
                      fs$rename(from, to, CB);
                    else
                      cb(er);
                  });
                }, backoff);
                if (backoff < 100)
                  backoff += 10;
                return;
              }
              if (cb) cb(er);
            });
          }
          if (Object.setPrototypeOf) Object.setPrototypeOf(rename, fs$rename);
          return rename;
        })(fs3.rename);
      }
      fs3.read = typeof fs3.read !== "function" ? fs3.read : (function(fs$read) {
        function read(fd, buffer, offset, length, position, callback_) {
          var callback;
          if (callback_ && typeof callback_ === "function") {
            var eagCounter = 0;
            callback = function(er, _, __) {
              if (er && er.code === "EAGAIN" && eagCounter < 10) {
                eagCounter++;
                return fs$read.call(fs3, fd, buffer, offset, length, position, callback);
              }
              callback_.apply(this, arguments);
            };
          }
          return fs$read.call(fs3, fd, buffer, offset, length, position, callback);
        }
        if (Object.setPrototypeOf) Object.setPrototypeOf(read, fs$read);
        return read;
      })(fs3.read);
      fs3.readSync = typeof fs3.readSync !== "function" ? fs3.readSync : /* @__PURE__ */ (function(fs$readSync) {
        return function(fd, buffer, offset, length, position) {
          var eagCounter = 0;
          while (true) {
            try {
              return fs$readSync.call(fs3, fd, buffer, offset, length, position);
            } catch (er) {
              if (er.code === "EAGAIN" && eagCounter < 10) {
                eagCounter++;
                continue;
              }
              throw er;
            }
          }
        };
      })(fs3.readSync);
      function patchLchmod(fs4) {
        fs4.lchmod = function(path3, mode, callback) {
          fs4.open(
            path3,
            constants.O_WRONLY | constants.O_SYMLINK,
            mode,
            function(err, fd) {
              if (err) {
                if (callback) callback(err);
                return;
              }
              fs4.fchmod(fd, mode, function(err2) {
                fs4.close(fd, function(err22) {
                  if (callback) callback(err2 || err22);
                });
              });
            }
          );
        };
        fs4.lchmodSync = function(path3, mode) {
          var fd = fs4.openSync(path3, constants.O_WRONLY | constants.O_SYMLINK, mode);
          var threw = true;
          var ret;
          try {
            ret = fs4.fchmodSync(fd, mode);
            threw = false;
          } finally {
            if (threw) {
              try {
                fs4.closeSync(fd);
              } catch (er) {
              }
            } else {
              fs4.closeSync(fd);
            }
          }
          return ret;
        };
      }
      function patchLutimes(fs4) {
        if (constants.hasOwnProperty("O_SYMLINK") && fs4.futimes) {
          fs4.lutimes = function(path3, at, mt, cb) {
            fs4.open(path3, constants.O_SYMLINK, function(er, fd) {
              if (er) {
                if (cb) cb(er);
                return;
              }
              fs4.futimes(fd, at, mt, function(er2) {
                fs4.close(fd, function(er22) {
                  if (cb) cb(er2 || er22);
                });
              });
            });
          };
          fs4.lutimesSync = function(path3, at, mt) {
            var fd = fs4.openSync(path3, constants.O_SYMLINK);
            var ret;
            var threw = true;
            try {
              ret = fs4.futimesSync(fd, at, mt);
              threw = false;
            } finally {
              if (threw) {
                try {
                  fs4.closeSync(fd);
                } catch (er) {
                }
              } else {
                fs4.closeSync(fd);
              }
            }
            return ret;
          };
        } else if (fs4.futimes) {
          fs4.lutimes = function(_a, _b, _c, cb) {
            if (cb) process.nextTick(cb);
          };
          fs4.lutimesSync = function() {
          };
        }
      }
      function chmodFix(orig) {
        if (!orig) return orig;
        return function(target, mode, cb) {
          return orig.call(fs3, target, mode, function(er) {
            if (chownErOk(er)) er = null;
            if (cb) cb.apply(this, arguments);
          });
        };
      }
      function chmodFixSync(orig) {
        if (!orig) return orig;
        return function(target, mode) {
          try {
            return orig.call(fs3, target, mode);
          } catch (er) {
            if (!chownErOk(er)) throw er;
          }
        };
      }
      function chownFix(orig) {
        if (!orig) return orig;
        return function(target, uid, gid, cb) {
          return orig.call(fs3, target, uid, gid, function(er) {
            if (chownErOk(er)) er = null;
            if (cb) cb.apply(this, arguments);
          });
        };
      }
      function chownFixSync(orig) {
        if (!orig) return orig;
        return function(target, uid, gid) {
          try {
            return orig.call(fs3, target, uid, gid);
          } catch (er) {
            if (!chownErOk(er)) throw er;
          }
        };
      }
      function statFix(orig) {
        if (!orig) return orig;
        return function(target, options, cb) {
          if (typeof options === "function") {
            cb = options;
            options = null;
          }
          function callback(er, stats) {
            if (stats) {
              if (stats.uid < 0) stats.uid += 4294967296;
              if (stats.gid < 0) stats.gid += 4294967296;
            }
            if (cb) cb.apply(this, arguments);
          }
          return options ? orig.call(fs3, target, options, callback) : orig.call(fs3, target, callback);
        };
      }
      function statFixSync(orig) {
        if (!orig) return orig;
        return function(target, options) {
          var stats = options ? orig.call(fs3, target, options) : orig.call(fs3, target);
          if (stats) {
            if (stats.uid < 0) stats.uid += 4294967296;
            if (stats.gid < 0) stats.gid += 4294967296;
          }
          return stats;
        };
      }
      function chownErOk(er) {
        if (!er)
          return true;
        if (er.code === "ENOSYS")
          return true;
        var nonroot = !process.getuid || process.getuid() !== 0;
        if (nonroot) {
          if (er.code === "EINVAL" || er.code === "EPERM")
            return true;
        }
        return false;
      }
    }
  }
});

// node_modules/graceful-fs/legacy-streams.js
var require_legacy_streams = __commonJS({
  "node_modules/graceful-fs/legacy-streams.js"(exports2, module2) {
    var Stream = require("stream").Stream;
    module2.exports = legacy;
    function legacy(fs3) {
      return {
        ReadStream,
        WriteStream
      };
      function ReadStream(path3, options) {
        if (!(this instanceof ReadStream)) return new ReadStream(path3, options);
        Stream.call(this);
        var self2 = this;
        this.path = path3;
        this.fd = null;
        this.readable = true;
        this.paused = false;
        this.flags = "r";
        this.mode = 438;
        this.bufferSize = 64 * 1024;
        options = options || {};
        var keys = Object.keys(options);
        for (var index = 0, length = keys.length; index < length; index++) {
          var key = keys[index];
          this[key] = options[key];
        }
        if (this.encoding) this.setEncoding(this.encoding);
        if (this.start !== void 0) {
          if ("number" !== typeof this.start) {
            throw TypeError("start must be a Number");
          }
          if (this.end === void 0) {
            this.end = Infinity;
          } else if ("number" !== typeof this.end) {
            throw TypeError("end must be a Number");
          }
          if (this.start > this.end) {
            throw new Error("start must be <= end");
          }
          this.pos = this.start;
        }
        if (this.fd !== null) {
          process.nextTick(function() {
            self2._read();
          });
          return;
        }
        fs3.open(this.path, this.flags, this.mode, function(err, fd) {
          if (err) {
            self2.emit("error", err);
            self2.readable = false;
            return;
          }
          self2.fd = fd;
          self2.emit("open", fd);
          self2._read();
        });
      }
      function WriteStream(path3, options) {
        if (!(this instanceof WriteStream)) return new WriteStream(path3, options);
        Stream.call(this);
        this.path = path3;
        this.fd = null;
        this.writable = true;
        this.flags = "w";
        this.encoding = "binary";
        this.mode = 438;
        this.bytesWritten = 0;
        options = options || {};
        var keys = Object.keys(options);
        for (var index = 0, length = keys.length; index < length; index++) {
          var key = keys[index];
          this[key] = options[key];
        }
        if (this.start !== void 0) {
          if ("number" !== typeof this.start) {
            throw TypeError("start must be a Number");
          }
          if (this.start < 0) {
            throw new Error("start must be >= zero");
          }
          this.pos = this.start;
        }
        this.busy = false;
        this._queue = [];
        if (this.fd === null) {
          this._open = fs3.open;
          this._queue.push([this._open, this.path, this.flags, this.mode, void 0]);
          this.flush();
        }
      }
    }
  }
});

// node_modules/graceful-fs/clone.js
var require_clone = __commonJS({
  "node_modules/graceful-fs/clone.js"(exports2, module2) {
    "use strict";
    module2.exports = clone;
    var getPrototypeOf = Object.getPrototypeOf || function(obj) {
      return obj.__proto__;
    };
    function clone(obj) {
      if (obj === null || typeof obj !== "object")
        return obj;
      if (obj instanceof Object)
        var copy = { __proto__: getPrototypeOf(obj) };
      else
        var copy = /* @__PURE__ */ Object.create(null);
      Object.getOwnPropertyNames(obj).forEach(function(key) {
        Object.defineProperty(copy, key, Object.getOwnPropertyDescriptor(obj, key));
      });
      return copy;
    }
  }
});

// node_modules/graceful-fs/graceful-fs.js
var require_graceful_fs = __commonJS({
  "node_modules/graceful-fs/graceful-fs.js"(exports2, module2) {
    var fs3 = require("fs");
    var polyfills = require_polyfills();
    var legacy = require_legacy_streams();
    var clone = require_clone();
    var util = require("util");
    var gracefulQueue;
    var previousSymbol;
    if (typeof Symbol === "function" && typeof Symbol.for === "function") {
      gracefulQueue = /* @__PURE__ */ Symbol.for("graceful-fs.queue");
      previousSymbol = /* @__PURE__ */ Symbol.for("graceful-fs.previous");
    } else {
      gracefulQueue = "___graceful-fs.queue";
      previousSymbol = "___graceful-fs.previous";
    }
    function noop() {
    }
    function publishQueue(context, queue2) {
      Object.defineProperty(context, gracefulQueue, {
        get: function() {
          return queue2;
        }
      });
    }
    var debug = noop;
    if (util.debuglog)
      debug = util.debuglog("gfs4");
    else if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || ""))
      debug = function() {
        var m = util.format.apply(util, arguments);
        m = "GFS4: " + m.split(/\n/).join("\nGFS4: ");
        console.error(m);
      };
    if (!fs3[gracefulQueue]) {
      queue = global[gracefulQueue] || [];
      publishQueue(fs3, queue);
      fs3.close = (function(fs$close) {
        function close(fd, cb) {
          return fs$close.call(fs3, fd, function(err) {
            if (!err) {
              resetQueue();
            }
            if (typeof cb === "function")
              cb.apply(this, arguments);
          });
        }
        Object.defineProperty(close, previousSymbol, {
          value: fs$close
        });
        return close;
      })(fs3.close);
      fs3.closeSync = (function(fs$closeSync) {
        function closeSync(fd) {
          fs$closeSync.apply(fs3, arguments);
          resetQueue();
        }
        Object.defineProperty(closeSync, previousSymbol, {
          value: fs$closeSync
        });
        return closeSync;
      })(fs3.closeSync);
      if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || "")) {
        process.on("exit", function() {
          debug(fs3[gracefulQueue]);
          require("assert").equal(fs3[gracefulQueue].length, 0);
        });
      }
    }
    var queue;
    if (!global[gracefulQueue]) {
      publishQueue(global, fs3[gracefulQueue]);
    }
    module2.exports = patch(clone(fs3));
    if (process.env.TEST_GRACEFUL_FS_GLOBAL_PATCH && !fs3.__patched) {
      module2.exports = patch(fs3);
      fs3.__patched = true;
    }
    function patch(fs4) {
      polyfills(fs4);
      fs4.gracefulify = patch;
      fs4.createReadStream = createReadStream;
      fs4.createWriteStream = createWriteStream;
      var fs$readFile = fs4.readFile;
      fs4.readFile = readFile;
      function readFile(path3, options, cb) {
        if (typeof options === "function")
          cb = options, options = null;
        return go$readFile(path3, options, cb);
        function go$readFile(path4, options2, cb2, startTime) {
          return fs$readFile(path4, options2, function(err) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$readFile, [path4, options2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      var fs$writeFile = fs4.writeFile;
      fs4.writeFile = writeFile;
      function writeFile(path3, data, options, cb) {
        if (typeof options === "function")
          cb = options, options = null;
        return go$writeFile(path3, data, options, cb);
        function go$writeFile(path4, data2, options2, cb2, startTime) {
          return fs$writeFile(path4, data2, options2, function(err) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$writeFile, [path4, data2, options2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      var fs$appendFile = fs4.appendFile;
      if (fs$appendFile)
        fs4.appendFile = appendFile;
      function appendFile(path3, data, options, cb) {
        if (typeof options === "function")
          cb = options, options = null;
        return go$appendFile(path3, data, options, cb);
        function go$appendFile(path4, data2, options2, cb2, startTime) {
          return fs$appendFile(path4, data2, options2, function(err) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$appendFile, [path4, data2, options2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      var fs$copyFile = fs4.copyFile;
      if (fs$copyFile)
        fs4.copyFile = copyFile;
      function copyFile(src, dest, flags, cb) {
        if (typeof flags === "function") {
          cb = flags;
          flags = 0;
        }
        return go$copyFile(src, dest, flags, cb);
        function go$copyFile(src2, dest2, flags2, cb2, startTime) {
          return fs$copyFile(src2, dest2, flags2, function(err) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$copyFile, [src2, dest2, flags2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      var fs$readdir = fs4.readdir;
      fs4.readdir = readdir3;
      var noReaddirOptionVersions = /^v[0-5]\./;
      function readdir3(path3, options, cb) {
        if (typeof options === "function")
          cb = options, options = null;
        var go$readdir = noReaddirOptionVersions.test(process.version) ? function go$readdir2(path4, options2, cb2, startTime) {
          return fs$readdir(path4, fs$readdirCallback(
            path4,
            options2,
            cb2,
            startTime
          ));
        } : function go$readdir2(path4, options2, cb2, startTime) {
          return fs$readdir(path4, options2, fs$readdirCallback(
            path4,
            options2,
            cb2,
            startTime
          ));
        };
        return go$readdir(path3, options, cb);
        function fs$readdirCallback(path4, options2, cb2, startTime) {
          return function(err, files) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([
                go$readdir,
                [path4, options2, cb2],
                err,
                startTime || Date.now(),
                Date.now()
              ]);
            else {
              if (files && files.sort)
                files.sort();
              if (typeof cb2 === "function")
                cb2.call(this, err, files);
            }
          };
        }
      }
      if (process.version.substr(0, 4) === "v0.8") {
        var legStreams = legacy(fs4);
        ReadStream = legStreams.ReadStream;
        WriteStream = legStreams.WriteStream;
      }
      var fs$ReadStream = fs4.ReadStream;
      if (fs$ReadStream) {
        ReadStream.prototype = Object.create(fs$ReadStream.prototype);
        ReadStream.prototype.open = ReadStream$open;
      }
      var fs$WriteStream = fs4.WriteStream;
      if (fs$WriteStream) {
        WriteStream.prototype = Object.create(fs$WriteStream.prototype);
        WriteStream.prototype.open = WriteStream$open;
      }
      Object.defineProperty(fs4, "ReadStream", {
        get: function() {
          return ReadStream;
        },
        set: function(val) {
          ReadStream = val;
        },
        enumerable: true,
        configurable: true
      });
      Object.defineProperty(fs4, "WriteStream", {
        get: function() {
          return WriteStream;
        },
        set: function(val) {
          WriteStream = val;
        },
        enumerable: true,
        configurable: true
      });
      var FileReadStream = ReadStream;
      Object.defineProperty(fs4, "FileReadStream", {
        get: function() {
          return FileReadStream;
        },
        set: function(val) {
          FileReadStream = val;
        },
        enumerable: true,
        configurable: true
      });
      var FileWriteStream = WriteStream;
      Object.defineProperty(fs4, "FileWriteStream", {
        get: function() {
          return FileWriteStream;
        },
        set: function(val) {
          FileWriteStream = val;
        },
        enumerable: true,
        configurable: true
      });
      function ReadStream(path3, options) {
        if (this instanceof ReadStream)
          return fs$ReadStream.apply(this, arguments), this;
        else
          return ReadStream.apply(Object.create(ReadStream.prototype), arguments);
      }
      function ReadStream$open() {
        var that = this;
        open2(that.path, that.flags, that.mode, function(err, fd) {
          if (err) {
            if (that.autoClose)
              that.destroy();
            that.emit("error", err);
          } else {
            that.fd = fd;
            that.emit("open", fd);
            that.read();
          }
        });
      }
      function WriteStream(path3, options) {
        if (this instanceof WriteStream)
          return fs$WriteStream.apply(this, arguments), this;
        else
          return WriteStream.apply(Object.create(WriteStream.prototype), arguments);
      }
      function WriteStream$open() {
        var that = this;
        open2(that.path, that.flags, that.mode, function(err, fd) {
          if (err) {
            that.destroy();
            that.emit("error", err);
          } else {
            that.fd = fd;
            that.emit("open", fd);
          }
        });
      }
      function createReadStream(path3, options) {
        return new fs4.ReadStream(path3, options);
      }
      function createWriteStream(path3, options) {
        return new fs4.WriteStream(path3, options);
      }
      var fs$open = fs4.open;
      fs4.open = open2;
      function open2(path3, flags, mode, cb) {
        if (typeof mode === "function")
          cb = mode, mode = null;
        return go$open(path3, flags, mode, cb);
        function go$open(path4, flags2, mode2, cb2, startTime) {
          return fs$open(path4, flags2, mode2, function(err, fd) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$open, [path4, flags2, mode2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      return fs4;
    }
    function enqueue(elem) {
      debug("ENQUEUE", elem[0].name, elem[1]);
      fs3[gracefulQueue].push(elem);
      retry();
    }
    var retryTimer;
    function resetQueue() {
      var now = Date.now();
      for (var i = 0; i < fs3[gracefulQueue].length; ++i) {
        if (fs3[gracefulQueue][i].length > 2) {
          fs3[gracefulQueue][i][3] = now;
          fs3[gracefulQueue][i][4] = now;
        }
      }
      retry();
    }
    function retry() {
      clearTimeout(retryTimer);
      retryTimer = void 0;
      if (fs3[gracefulQueue].length === 0)
        return;
      var elem = fs3[gracefulQueue].shift();
      var fn = elem[0];
      var args = elem[1];
      var err = elem[2];
      var startTime = elem[3];
      var lastTime = elem[4];
      if (startTime === void 0) {
        debug("RETRY", fn.name, args);
        fn.apply(null, args);
      } else if (Date.now() - startTime >= 6e4) {
        debug("TIMEOUT", fn.name, args);
        var cb = args.pop();
        if (typeof cb === "function")
          cb.call(null, err);
      } else {
        var sinceAttempt = Date.now() - lastTime;
        var sinceStart = Math.max(lastTime - startTime, 1);
        var desiredDelay = Math.min(sinceStart * 1.2, 100);
        if (sinceAttempt >= desiredDelay) {
          debug("RETRY", fn.name, args);
          fn.apply(null, args.concat([startTime]));
        } else {
          fs3[gracefulQueue].push(elem);
        }
      }
      if (retryTimer === void 0) {
        retryTimer = setTimeout(retry, 0);
      }
    }
  }
});

// node_modules/fs-extra/lib/fs/index.js
var require_fs = __commonJS({
  "node_modules/fs-extra/lib/fs/index.js"(exports2) {
    "use strict";
    var u = require_universalify().fromCallback;
    var fs3 = require_graceful_fs();
    var api = [
      "access",
      "appendFile",
      "chmod",
      "chown",
      "close",
      "copyFile",
      "fchmod",
      "fchown",
      "fdatasync",
      "fstat",
      "fsync",
      "ftruncate",
      "futimes",
      "lchmod",
      "lchown",
      "link",
      "lstat",
      "mkdir",
      "mkdtemp",
      "open",
      "opendir",
      "readdir",
      "readFile",
      "readlink",
      "realpath",
      "rename",
      "rm",
      "rmdir",
      "stat",
      "symlink",
      "truncate",
      "unlink",
      "utimes",
      "writeFile"
    ].filter((key) => {
      return typeof fs3[key] === "function";
    });
    Object.assign(exports2, fs3);
    api.forEach((method) => {
      exports2[method] = u(fs3[method]);
    });
    exports2.exists = function(filename, callback) {
      if (typeof callback === "function") {
        return fs3.exists(filename, callback);
      }
      return new Promise((resolve6) => {
        return fs3.exists(filename, resolve6);
      });
    };
    exports2.read = function(fd, buffer, offset, length, position, callback) {
      if (typeof callback === "function") {
        return fs3.read(fd, buffer, offset, length, position, callback);
      }
      return new Promise((resolve6, reject) => {
        fs3.read(fd, buffer, offset, length, position, (err, bytesRead, buffer2) => {
          if (err) return reject(err);
          resolve6({ bytesRead, buffer: buffer2 });
        });
      });
    };
    exports2.write = function(fd, buffer, ...args) {
      if (typeof args[args.length - 1] === "function") {
        return fs3.write(fd, buffer, ...args);
      }
      return new Promise((resolve6, reject) => {
        fs3.write(fd, buffer, ...args, (err, bytesWritten, buffer2) => {
          if (err) return reject(err);
          resolve6({ bytesWritten, buffer: buffer2 });
        });
      });
    };
    if (typeof fs3.writev === "function") {
      exports2.writev = function(fd, buffers, ...args) {
        if (typeof args[args.length - 1] === "function") {
          return fs3.writev(fd, buffers, ...args);
        }
        return new Promise((resolve6, reject) => {
          fs3.writev(fd, buffers, ...args, (err, bytesWritten, buffers2) => {
            if (err) return reject(err);
            resolve6({ bytesWritten, buffers: buffers2 });
          });
        });
      };
    }
    if (typeof fs3.realpath.native === "function") {
      exports2.realpath.native = u(fs3.realpath.native);
    } else {
      process.emitWarning(
        "fs.realpath.native is not a function. Is fs being monkey-patched?",
        "Warning",
        "fs-extra-WARN0003"
      );
    }
  }
});

// node_modules/fs-extra/lib/mkdirs/utils.js
var require_utils = __commonJS({
  "node_modules/fs-extra/lib/mkdirs/utils.js"(exports2, module2) {
    "use strict";
    var path3 = require("path");
    module2.exports.checkPath = function checkPath(pth) {
      if (process.platform === "win32") {
        const pathHasInvalidWinCharacters = /[<>:"|?*]/.test(pth.replace(path3.parse(pth).root, ""));
        if (pathHasInvalidWinCharacters) {
          const error = new Error(`Path contains invalid characters: ${pth}`);
          error.code = "EINVAL";
          throw error;
        }
      }
    };
  }
});

// node_modules/fs-extra/lib/mkdirs/make-dir.js
var require_make_dir = __commonJS({
  "node_modules/fs-extra/lib/mkdirs/make-dir.js"(exports2, module2) {
    "use strict";
    var fs3 = require_fs();
    var { checkPath } = require_utils();
    var getMode = (options) => {
      const defaults = { mode: 511 };
      if (typeof options === "number") return options;
      return { ...defaults, ...options }.mode;
    };
    module2.exports.makeDir = async (dir, options) => {
      checkPath(dir);
      return fs3.mkdir(dir, {
        mode: getMode(options),
        recursive: true
      });
    };
    module2.exports.makeDirSync = (dir, options) => {
      checkPath(dir);
      return fs3.mkdirSync(dir, {
        mode: getMode(options),
        recursive: true
      });
    };
  }
});

// node_modules/fs-extra/lib/mkdirs/index.js
var require_mkdirs = __commonJS({
  "node_modules/fs-extra/lib/mkdirs/index.js"(exports2, module2) {
    "use strict";
    var u = require_universalify().fromPromise;
    var { makeDir: _makeDir, makeDirSync } = require_make_dir();
    var makeDir = u(_makeDir);
    module2.exports = {
      mkdirs: makeDir,
      mkdirsSync: makeDirSync,
      // alias
      mkdirp: makeDir,
      mkdirpSync: makeDirSync,
      ensureDir: makeDir,
      ensureDirSync: makeDirSync
    };
  }
});

// node_modules/fs-extra/lib/path-exists/index.js
var require_path_exists = __commonJS({
  "node_modules/fs-extra/lib/path-exists/index.js"(exports2, module2) {
    "use strict";
    var u = require_universalify().fromPromise;
    var fs3 = require_fs();
    function pathExists(path3) {
      return fs3.access(path3).then(() => true).catch(() => false);
    }
    module2.exports = {
      pathExists: u(pathExists),
      pathExistsSync: fs3.existsSync
    };
  }
});

// node_modules/fs-extra/lib/util/utimes.js
var require_utimes = __commonJS({
  "node_modules/fs-extra/lib/util/utimes.js"(exports2, module2) {
    "use strict";
    var fs3 = require_graceful_fs();
    function utimesMillis(path3, atime, mtime, callback) {
      fs3.open(path3, "r+", (err, fd) => {
        if (err) return callback(err);
        fs3.futimes(fd, atime, mtime, (futimesErr) => {
          fs3.close(fd, (closeErr) => {
            if (callback) callback(futimesErr || closeErr);
          });
        });
      });
    }
    function utimesMillisSync(path3, atime, mtime) {
      const fd = fs3.openSync(path3, "r+");
      fs3.futimesSync(fd, atime, mtime);
      return fs3.closeSync(fd);
    }
    module2.exports = {
      utimesMillis,
      utimesMillisSync
    };
  }
});

// node_modules/fs-extra/lib/util/stat.js
var require_stat = __commonJS({
  "node_modules/fs-extra/lib/util/stat.js"(exports2, module2) {
    "use strict";
    var fs3 = require_fs();
    var path3 = require("path");
    var util = require("util");
    function getStats(src, dest, opts) {
      const statFunc = opts.dereference ? (file) => fs3.stat(file, { bigint: true }) : (file) => fs3.lstat(file, { bigint: true });
      return Promise.all([
        statFunc(src),
        statFunc(dest).catch((err) => {
          if (err.code === "ENOENT") return null;
          throw err;
        })
      ]).then(([srcStat, destStat]) => ({ srcStat, destStat }));
    }
    function getStatsSync(src, dest, opts) {
      let destStat;
      const statFunc = opts.dereference ? (file) => fs3.statSync(file, { bigint: true }) : (file) => fs3.lstatSync(file, { bigint: true });
      const srcStat = statFunc(src);
      try {
        destStat = statFunc(dest);
      } catch (err) {
        if (err.code === "ENOENT") return { srcStat, destStat: null };
        throw err;
      }
      return { srcStat, destStat };
    }
    function checkPaths(src, dest, funcName, opts, cb) {
      util.callbackify(getStats)(src, dest, opts, (err, stats) => {
        if (err) return cb(err);
        const { srcStat, destStat } = stats;
        if (destStat) {
          if (areIdentical(srcStat, destStat)) {
            const srcBaseName = path3.basename(src);
            const destBaseName = path3.basename(dest);
            if (funcName === "move" && srcBaseName !== destBaseName && srcBaseName.toLowerCase() === destBaseName.toLowerCase()) {
              return cb(null, { srcStat, destStat, isChangingCase: true });
            }
            return cb(new Error("Source and destination must not be the same."));
          }
          if (srcStat.isDirectory() && !destStat.isDirectory()) {
            return cb(new Error(`Cannot overwrite non-directory '${dest}' with directory '${src}'.`));
          }
          if (!srcStat.isDirectory() && destStat.isDirectory()) {
            return cb(new Error(`Cannot overwrite directory '${dest}' with non-directory '${src}'.`));
          }
        }
        if (srcStat.isDirectory() && isSrcSubdir(src, dest)) {
          return cb(new Error(errMsg(src, dest, funcName)));
        }
        return cb(null, { srcStat, destStat });
      });
    }
    function checkPathsSync(src, dest, funcName, opts) {
      const { srcStat, destStat } = getStatsSync(src, dest, opts);
      if (destStat) {
        if (areIdentical(srcStat, destStat)) {
          const srcBaseName = path3.basename(src);
          const destBaseName = path3.basename(dest);
          if (funcName === "move" && srcBaseName !== destBaseName && srcBaseName.toLowerCase() === destBaseName.toLowerCase()) {
            return { srcStat, destStat, isChangingCase: true };
          }
          throw new Error("Source and destination must not be the same.");
        }
        if (srcStat.isDirectory() && !destStat.isDirectory()) {
          throw new Error(`Cannot overwrite non-directory '${dest}' with directory '${src}'.`);
        }
        if (!srcStat.isDirectory() && destStat.isDirectory()) {
          throw new Error(`Cannot overwrite directory '${dest}' with non-directory '${src}'.`);
        }
      }
      if (srcStat.isDirectory() && isSrcSubdir(src, dest)) {
        throw new Error(errMsg(src, dest, funcName));
      }
      return { srcStat, destStat };
    }
    function checkParentPaths(src, srcStat, dest, funcName, cb) {
      const srcParent = path3.resolve(path3.dirname(src));
      const destParent = path3.resolve(path3.dirname(dest));
      if (destParent === srcParent || destParent === path3.parse(destParent).root) return cb();
      fs3.stat(destParent, { bigint: true }, (err, destStat) => {
        if (err) {
          if (err.code === "ENOENT") return cb();
          return cb(err);
        }
        if (areIdentical(srcStat, destStat)) {
          return cb(new Error(errMsg(src, dest, funcName)));
        }
        return checkParentPaths(src, srcStat, destParent, funcName, cb);
      });
    }
    function checkParentPathsSync(src, srcStat, dest, funcName) {
      const srcParent = path3.resolve(path3.dirname(src));
      const destParent = path3.resolve(path3.dirname(dest));
      if (destParent === srcParent || destParent === path3.parse(destParent).root) return;
      let destStat;
      try {
        destStat = fs3.statSync(destParent, { bigint: true });
      } catch (err) {
        if (err.code === "ENOENT") return;
        throw err;
      }
      if (areIdentical(srcStat, destStat)) {
        throw new Error(errMsg(src, dest, funcName));
      }
      return checkParentPathsSync(src, srcStat, destParent, funcName);
    }
    function areIdentical(srcStat, destStat) {
      return destStat.ino && destStat.dev && destStat.ino === srcStat.ino && destStat.dev === srcStat.dev;
    }
    function isSrcSubdir(src, dest) {
      const srcArr = path3.resolve(src).split(path3.sep).filter((i) => i);
      const destArr = path3.resolve(dest).split(path3.sep).filter((i) => i);
      return srcArr.reduce((acc, cur, i) => acc && destArr[i] === cur, true);
    }
    function errMsg(src, dest, funcName) {
      return `Cannot ${funcName} '${src}' to a subdirectory of itself, '${dest}'.`;
    }
    module2.exports = {
      checkPaths,
      checkPathsSync,
      checkParentPaths,
      checkParentPathsSync,
      isSrcSubdir,
      areIdentical
    };
  }
});

// node_modules/fs-extra/lib/copy/copy.js
var require_copy = __commonJS({
  "node_modules/fs-extra/lib/copy/copy.js"(exports2, module2) {
    "use strict";
    var fs3 = require_graceful_fs();
    var path3 = require("path");
    var mkdirs = require_mkdirs().mkdirs;
    var pathExists = require_path_exists().pathExists;
    var utimesMillis = require_utimes().utimesMillis;
    var stat5 = require_stat();
    function copy(src, dest, opts, cb) {
      if (typeof opts === "function" && !cb) {
        cb = opts;
        opts = {};
      } else if (typeof opts === "function") {
        opts = { filter: opts };
      }
      cb = cb || function() {
      };
      opts = opts || {};
      opts.clobber = "clobber" in opts ? !!opts.clobber : true;
      opts.overwrite = "overwrite" in opts ? !!opts.overwrite : opts.clobber;
      if (opts.preserveTimestamps && process.arch === "ia32") {
        process.emitWarning(
          "Using the preserveTimestamps option in 32-bit node is not recommended;\n\n	see https://github.com/jprichardson/node-fs-extra/issues/269",
          "Warning",
          "fs-extra-WARN0001"
        );
      }
      stat5.checkPaths(src, dest, "copy", opts, (err, stats) => {
        if (err) return cb(err);
        const { srcStat, destStat } = stats;
        stat5.checkParentPaths(src, srcStat, dest, "copy", (err2) => {
          if (err2) return cb(err2);
          if (opts.filter) return handleFilter(checkParentDir, destStat, src, dest, opts, cb);
          return checkParentDir(destStat, src, dest, opts, cb);
        });
      });
    }
    function checkParentDir(destStat, src, dest, opts, cb) {
      const destParent = path3.dirname(dest);
      pathExists(destParent, (err, dirExists) => {
        if (err) return cb(err);
        if (dirExists) return getStats(destStat, src, dest, opts, cb);
        mkdirs(destParent, (err2) => {
          if (err2) return cb(err2);
          return getStats(destStat, src, dest, opts, cb);
        });
      });
    }
    function handleFilter(onInclude, destStat, src, dest, opts, cb) {
      Promise.resolve(opts.filter(src, dest)).then((include) => {
        if (include) return onInclude(destStat, src, dest, opts, cb);
        return cb();
      }, (error) => cb(error));
    }
    function startCopy(destStat, src, dest, opts, cb) {
      if (opts.filter) return handleFilter(getStats, destStat, src, dest, opts, cb);
      return getStats(destStat, src, dest, opts, cb);
    }
    function getStats(destStat, src, dest, opts, cb) {
      const stat6 = opts.dereference ? fs3.stat : fs3.lstat;
      stat6(src, (err, srcStat) => {
        if (err) return cb(err);
        if (srcStat.isDirectory()) return onDir(srcStat, destStat, src, dest, opts, cb);
        else if (srcStat.isFile() || srcStat.isCharacterDevice() || srcStat.isBlockDevice()) return onFile(srcStat, destStat, src, dest, opts, cb);
        else if (srcStat.isSymbolicLink()) return onLink(destStat, src, dest, opts, cb);
        else if (srcStat.isSocket()) return cb(new Error(`Cannot copy a socket file: ${src}`));
        else if (srcStat.isFIFO()) return cb(new Error(`Cannot copy a FIFO pipe: ${src}`));
        return cb(new Error(`Unknown file: ${src}`));
      });
    }
    function onFile(srcStat, destStat, src, dest, opts, cb) {
      if (!destStat) return copyFile(srcStat, src, dest, opts, cb);
      return mayCopyFile(srcStat, src, dest, opts, cb);
    }
    function mayCopyFile(srcStat, src, dest, opts, cb) {
      if (opts.overwrite) {
        fs3.unlink(dest, (err) => {
          if (err) return cb(err);
          return copyFile(srcStat, src, dest, opts, cb);
        });
      } else if (opts.errorOnExist) {
        return cb(new Error(`'${dest}' already exists`));
      } else return cb();
    }
    function copyFile(srcStat, src, dest, opts, cb) {
      fs3.copyFile(src, dest, (err) => {
        if (err) return cb(err);
        if (opts.preserveTimestamps) return handleTimestampsAndMode(srcStat.mode, src, dest, cb);
        return setDestMode(dest, srcStat.mode, cb);
      });
    }
    function handleTimestampsAndMode(srcMode, src, dest, cb) {
      if (fileIsNotWritable(srcMode)) {
        return makeFileWritable(dest, srcMode, (err) => {
          if (err) return cb(err);
          return setDestTimestampsAndMode(srcMode, src, dest, cb);
        });
      }
      return setDestTimestampsAndMode(srcMode, src, dest, cb);
    }
    function fileIsNotWritable(srcMode) {
      return (srcMode & 128) === 0;
    }
    function makeFileWritable(dest, srcMode, cb) {
      return setDestMode(dest, srcMode | 128, cb);
    }
    function setDestTimestampsAndMode(srcMode, src, dest, cb) {
      setDestTimestamps(src, dest, (err) => {
        if (err) return cb(err);
        return setDestMode(dest, srcMode, cb);
      });
    }
    function setDestMode(dest, srcMode, cb) {
      return fs3.chmod(dest, srcMode, cb);
    }
    function setDestTimestamps(src, dest, cb) {
      fs3.stat(src, (err, updatedSrcStat) => {
        if (err) return cb(err);
        return utimesMillis(dest, updatedSrcStat.atime, updatedSrcStat.mtime, cb);
      });
    }
    function onDir(srcStat, destStat, src, dest, opts, cb) {
      if (!destStat) return mkDirAndCopy(srcStat.mode, src, dest, opts, cb);
      return copyDir(src, dest, opts, cb);
    }
    function mkDirAndCopy(srcMode, src, dest, opts, cb) {
      fs3.mkdir(dest, (err) => {
        if (err) return cb(err);
        copyDir(src, dest, opts, (err2) => {
          if (err2) return cb(err2);
          return setDestMode(dest, srcMode, cb);
        });
      });
    }
    function copyDir(src, dest, opts, cb) {
      fs3.readdir(src, (err, items) => {
        if (err) return cb(err);
        return copyDirItems(items, src, dest, opts, cb);
      });
    }
    function copyDirItems(items, src, dest, opts, cb) {
      const item = items.pop();
      if (!item) return cb();
      return copyDirItem(items, item, src, dest, opts, cb);
    }
    function copyDirItem(items, item, src, dest, opts, cb) {
      const srcItem = path3.join(src, item);
      const destItem = path3.join(dest, item);
      stat5.checkPaths(srcItem, destItem, "copy", opts, (err, stats) => {
        if (err) return cb(err);
        const { destStat } = stats;
        startCopy(destStat, srcItem, destItem, opts, (err2) => {
          if (err2) return cb(err2);
          return copyDirItems(items, src, dest, opts, cb);
        });
      });
    }
    function onLink(destStat, src, dest, opts, cb) {
      fs3.readlink(src, (err, resolvedSrc) => {
        if (err) return cb(err);
        if (opts.dereference) {
          resolvedSrc = path3.resolve(process.cwd(), resolvedSrc);
        }
        if (!destStat) {
          return fs3.symlink(resolvedSrc, dest, cb);
        } else {
          fs3.readlink(dest, (err2, resolvedDest) => {
            if (err2) {
              if (err2.code === "EINVAL" || err2.code === "UNKNOWN") return fs3.symlink(resolvedSrc, dest, cb);
              return cb(err2);
            }
            if (opts.dereference) {
              resolvedDest = path3.resolve(process.cwd(), resolvedDest);
            }
            if (stat5.isSrcSubdir(resolvedSrc, resolvedDest)) {
              return cb(new Error(`Cannot copy '${resolvedSrc}' to a subdirectory of itself, '${resolvedDest}'.`));
            }
            if (destStat.isDirectory() && stat5.isSrcSubdir(resolvedDest, resolvedSrc)) {
              return cb(new Error(`Cannot overwrite '${resolvedDest}' with '${resolvedSrc}'.`));
            }
            return copyLink(resolvedSrc, dest, cb);
          });
        }
      });
    }
    function copyLink(resolvedSrc, dest, cb) {
      fs3.unlink(dest, (err) => {
        if (err) return cb(err);
        return fs3.symlink(resolvedSrc, dest, cb);
      });
    }
    module2.exports = copy;
  }
});

// node_modules/fs-extra/lib/copy/copy-sync.js
var require_copy_sync = __commonJS({
  "node_modules/fs-extra/lib/copy/copy-sync.js"(exports2, module2) {
    "use strict";
    var fs3 = require_graceful_fs();
    var path3 = require("path");
    var mkdirsSync = require_mkdirs().mkdirsSync;
    var utimesMillisSync = require_utimes().utimesMillisSync;
    var stat5 = require_stat();
    function copySync(src, dest, opts) {
      if (typeof opts === "function") {
        opts = { filter: opts };
      }
      opts = opts || {};
      opts.clobber = "clobber" in opts ? !!opts.clobber : true;
      opts.overwrite = "overwrite" in opts ? !!opts.overwrite : opts.clobber;
      if (opts.preserveTimestamps && process.arch === "ia32") {
        process.emitWarning(
          "Using the preserveTimestamps option in 32-bit node is not recommended;\n\n	see https://github.com/jprichardson/node-fs-extra/issues/269",
          "Warning",
          "fs-extra-WARN0002"
        );
      }
      const { srcStat, destStat } = stat5.checkPathsSync(src, dest, "copy", opts);
      stat5.checkParentPathsSync(src, srcStat, dest, "copy");
      return handleFilterAndCopy(destStat, src, dest, opts);
    }
    function handleFilterAndCopy(destStat, src, dest, opts) {
      if (opts.filter && !opts.filter(src, dest)) return;
      const destParent = path3.dirname(dest);
      if (!fs3.existsSync(destParent)) mkdirsSync(destParent);
      return getStats(destStat, src, dest, opts);
    }
    function startCopy(destStat, src, dest, opts) {
      if (opts.filter && !opts.filter(src, dest)) return;
      return getStats(destStat, src, dest, opts);
    }
    function getStats(destStat, src, dest, opts) {
      const statSync = opts.dereference ? fs3.statSync : fs3.lstatSync;
      const srcStat = statSync(src);
      if (srcStat.isDirectory()) return onDir(srcStat, destStat, src, dest, opts);
      else if (srcStat.isFile() || srcStat.isCharacterDevice() || srcStat.isBlockDevice()) return onFile(srcStat, destStat, src, dest, opts);
      else if (srcStat.isSymbolicLink()) return onLink(destStat, src, dest, opts);
      else if (srcStat.isSocket()) throw new Error(`Cannot copy a socket file: ${src}`);
      else if (srcStat.isFIFO()) throw new Error(`Cannot copy a FIFO pipe: ${src}`);
      throw new Error(`Unknown file: ${src}`);
    }
    function onFile(srcStat, destStat, src, dest, opts) {
      if (!destStat) return copyFile(srcStat, src, dest, opts);
      return mayCopyFile(srcStat, src, dest, opts);
    }
    function mayCopyFile(srcStat, src, dest, opts) {
      if (opts.overwrite) {
        fs3.unlinkSync(dest);
        return copyFile(srcStat, src, dest, opts);
      } else if (opts.errorOnExist) {
        throw new Error(`'${dest}' already exists`);
      }
    }
    function copyFile(srcStat, src, dest, opts) {
      fs3.copyFileSync(src, dest);
      if (opts.preserveTimestamps) handleTimestamps(srcStat.mode, src, dest);
      return setDestMode(dest, srcStat.mode);
    }
    function handleTimestamps(srcMode, src, dest) {
      if (fileIsNotWritable(srcMode)) makeFileWritable(dest, srcMode);
      return setDestTimestamps(src, dest);
    }
    function fileIsNotWritable(srcMode) {
      return (srcMode & 128) === 0;
    }
    function makeFileWritable(dest, srcMode) {
      return setDestMode(dest, srcMode | 128);
    }
    function setDestMode(dest, srcMode) {
      return fs3.chmodSync(dest, srcMode);
    }
    function setDestTimestamps(src, dest) {
      const updatedSrcStat = fs3.statSync(src);
      return utimesMillisSync(dest, updatedSrcStat.atime, updatedSrcStat.mtime);
    }
    function onDir(srcStat, destStat, src, dest, opts) {
      if (!destStat) return mkDirAndCopy(srcStat.mode, src, dest, opts);
      return copyDir(src, dest, opts);
    }
    function mkDirAndCopy(srcMode, src, dest, opts) {
      fs3.mkdirSync(dest);
      copyDir(src, dest, opts);
      return setDestMode(dest, srcMode);
    }
    function copyDir(src, dest, opts) {
      fs3.readdirSync(src).forEach((item) => copyDirItem(item, src, dest, opts));
    }
    function copyDirItem(item, src, dest, opts) {
      const srcItem = path3.join(src, item);
      const destItem = path3.join(dest, item);
      const { destStat } = stat5.checkPathsSync(srcItem, destItem, "copy", opts);
      return startCopy(destStat, srcItem, destItem, opts);
    }
    function onLink(destStat, src, dest, opts) {
      let resolvedSrc = fs3.readlinkSync(src);
      if (opts.dereference) {
        resolvedSrc = path3.resolve(process.cwd(), resolvedSrc);
      }
      if (!destStat) {
        return fs3.symlinkSync(resolvedSrc, dest);
      } else {
        let resolvedDest;
        try {
          resolvedDest = fs3.readlinkSync(dest);
        } catch (err) {
          if (err.code === "EINVAL" || err.code === "UNKNOWN") return fs3.symlinkSync(resolvedSrc, dest);
          throw err;
        }
        if (opts.dereference) {
          resolvedDest = path3.resolve(process.cwd(), resolvedDest);
        }
        if (stat5.isSrcSubdir(resolvedSrc, resolvedDest)) {
          throw new Error(`Cannot copy '${resolvedSrc}' to a subdirectory of itself, '${resolvedDest}'.`);
        }
        if (fs3.statSync(dest).isDirectory() && stat5.isSrcSubdir(resolvedDest, resolvedSrc)) {
          throw new Error(`Cannot overwrite '${resolvedDest}' with '${resolvedSrc}'.`);
        }
        return copyLink(resolvedSrc, dest);
      }
    }
    function copyLink(resolvedSrc, dest) {
      fs3.unlinkSync(dest);
      return fs3.symlinkSync(resolvedSrc, dest);
    }
    module2.exports = copySync;
  }
});

// node_modules/fs-extra/lib/copy/index.js
var require_copy2 = __commonJS({
  "node_modules/fs-extra/lib/copy/index.js"(exports2, module2) {
    "use strict";
    var u = require_universalify().fromCallback;
    module2.exports = {
      copy: u(require_copy()),
      copySync: require_copy_sync()
    };
  }
});

// node_modules/fs-extra/lib/remove/rimraf.js
var require_rimraf = __commonJS({
  "node_modules/fs-extra/lib/remove/rimraf.js"(exports2, module2) {
    "use strict";
    var fs3 = require_graceful_fs();
    var path3 = require("path");
    var assert = require("assert");
    var isWindows2 = process.platform === "win32";
    function defaults(options) {
      const methods = [
        "unlink",
        "chmod",
        "stat",
        "lstat",
        "rmdir",
        "readdir"
      ];
      methods.forEach((m) => {
        options[m] = options[m] || fs3[m];
        m = m + "Sync";
        options[m] = options[m] || fs3[m];
      });
      options.maxBusyTries = options.maxBusyTries || 3;
    }
    function rimraf(p, options, cb) {
      let busyTries = 0;
      if (typeof options === "function") {
        cb = options;
        options = {};
      }
      assert(p, "rimraf: missing path");
      assert.strictEqual(typeof p, "string", "rimraf: path should be a string");
      assert.strictEqual(typeof cb, "function", "rimraf: callback function required");
      assert(options, "rimraf: invalid options argument provided");
      assert.strictEqual(typeof options, "object", "rimraf: options should be object");
      defaults(options);
      rimraf_(p, options, function CB(er) {
        if (er) {
          if ((er.code === "EBUSY" || er.code === "ENOTEMPTY" || er.code === "EPERM") && busyTries < options.maxBusyTries) {
            busyTries++;
            const time = busyTries * 100;
            return setTimeout(() => rimraf_(p, options, CB), time);
          }
          if (er.code === "ENOENT") er = null;
        }
        cb(er);
      });
    }
    function rimraf_(p, options, cb) {
      assert(p);
      assert(options);
      assert(typeof cb === "function");
      options.lstat(p, (er, st) => {
        if (er && er.code === "ENOENT") {
          return cb(null);
        }
        if (er && er.code === "EPERM" && isWindows2) {
          return fixWinEPERM(p, options, er, cb);
        }
        if (st && st.isDirectory()) {
          return rmdir(p, options, er, cb);
        }
        options.unlink(p, (er2) => {
          if (er2) {
            if (er2.code === "ENOENT") {
              return cb(null);
            }
            if (er2.code === "EPERM") {
              return isWindows2 ? fixWinEPERM(p, options, er2, cb) : rmdir(p, options, er2, cb);
            }
            if (er2.code === "EISDIR") {
              return rmdir(p, options, er2, cb);
            }
          }
          return cb(er2);
        });
      });
    }
    function fixWinEPERM(p, options, er, cb) {
      assert(p);
      assert(options);
      assert(typeof cb === "function");
      options.chmod(p, 438, (er2) => {
        if (er2) {
          cb(er2.code === "ENOENT" ? null : er);
        } else {
          options.stat(p, (er3, stats) => {
            if (er3) {
              cb(er3.code === "ENOENT" ? null : er);
            } else if (stats.isDirectory()) {
              rmdir(p, options, er, cb);
            } else {
              options.unlink(p, cb);
            }
          });
        }
      });
    }
    function fixWinEPERMSync(p, options, er) {
      let stats;
      assert(p);
      assert(options);
      try {
        options.chmodSync(p, 438);
      } catch (er2) {
        if (er2.code === "ENOENT") {
          return;
        } else {
          throw er;
        }
      }
      try {
        stats = options.statSync(p);
      } catch (er3) {
        if (er3.code === "ENOENT") {
          return;
        } else {
          throw er;
        }
      }
      if (stats.isDirectory()) {
        rmdirSync(p, options, er);
      } else {
        options.unlinkSync(p);
      }
    }
    function rmdir(p, options, originalEr, cb) {
      assert(p);
      assert(options);
      assert(typeof cb === "function");
      options.rmdir(p, (er) => {
        if (er && (er.code === "ENOTEMPTY" || er.code === "EEXIST" || er.code === "EPERM")) {
          rmkids(p, options, cb);
        } else if (er && er.code === "ENOTDIR") {
          cb(originalEr);
        } else {
          cb(er);
        }
      });
    }
    function rmkids(p, options, cb) {
      assert(p);
      assert(options);
      assert(typeof cb === "function");
      options.readdir(p, (er, files) => {
        if (er) return cb(er);
        let n = files.length;
        let errState;
        if (n === 0) return options.rmdir(p, cb);
        files.forEach((f) => {
          rimraf(path3.join(p, f), options, (er2) => {
            if (errState) {
              return;
            }
            if (er2) return cb(errState = er2);
            if (--n === 0) {
              options.rmdir(p, cb);
            }
          });
        });
      });
    }
    function rimrafSync(p, options) {
      let st;
      options = options || {};
      defaults(options);
      assert(p, "rimraf: missing path");
      assert.strictEqual(typeof p, "string", "rimraf: path should be a string");
      assert(options, "rimraf: missing options");
      assert.strictEqual(typeof options, "object", "rimraf: options should be object");
      try {
        st = options.lstatSync(p);
      } catch (er) {
        if (er.code === "ENOENT") {
          return;
        }
        if (er.code === "EPERM" && isWindows2) {
          fixWinEPERMSync(p, options, er);
        }
      }
      try {
        if (st && st.isDirectory()) {
          rmdirSync(p, options, null);
        } else {
          options.unlinkSync(p);
        }
      } catch (er) {
        if (er.code === "ENOENT") {
          return;
        } else if (er.code === "EPERM") {
          return isWindows2 ? fixWinEPERMSync(p, options, er) : rmdirSync(p, options, er);
        } else if (er.code !== "EISDIR") {
          throw er;
        }
        rmdirSync(p, options, er);
      }
    }
    function rmdirSync(p, options, originalEr) {
      assert(p);
      assert(options);
      try {
        options.rmdirSync(p);
      } catch (er) {
        if (er.code === "ENOTDIR") {
          throw originalEr;
        } else if (er.code === "ENOTEMPTY" || er.code === "EEXIST" || er.code === "EPERM") {
          rmkidsSync(p, options);
        } else if (er.code !== "ENOENT") {
          throw er;
        }
      }
    }
    function rmkidsSync(p, options) {
      assert(p);
      assert(options);
      options.readdirSync(p).forEach((f) => rimrafSync(path3.join(p, f), options));
      if (isWindows2) {
        const startTime = Date.now();
        do {
          try {
            const ret = options.rmdirSync(p, options);
            return ret;
          } catch {
          }
        } while (Date.now() - startTime < 500);
      } else {
        const ret = options.rmdirSync(p, options);
        return ret;
      }
    }
    module2.exports = rimraf;
    rimraf.sync = rimrafSync;
  }
});

// node_modules/fs-extra/lib/remove/index.js
var require_remove = __commonJS({
  "node_modules/fs-extra/lib/remove/index.js"(exports2, module2) {
    "use strict";
    var fs3 = require_graceful_fs();
    var u = require_universalify().fromCallback;
    var rimraf = require_rimraf();
    function remove(path3, callback) {
      if (fs3.rm) return fs3.rm(path3, { recursive: true, force: true }, callback);
      rimraf(path3, callback);
    }
    function removeSync(path3) {
      if (fs3.rmSync) return fs3.rmSync(path3, { recursive: true, force: true });
      rimraf.sync(path3);
    }
    module2.exports = {
      remove: u(remove),
      removeSync
    };
  }
});

// node_modules/fs-extra/lib/empty/index.js
var require_empty = __commonJS({
  "node_modules/fs-extra/lib/empty/index.js"(exports2, module2) {
    "use strict";
    var u = require_universalify().fromPromise;
    var fs3 = require_fs();
    var path3 = require("path");
    var mkdir = require_mkdirs();
    var remove = require_remove();
    var emptyDir = u(async function emptyDir2(dir) {
      let items;
      try {
        items = await fs3.readdir(dir);
      } catch {
        return mkdir.mkdirs(dir);
      }
      return Promise.all(items.map((item) => remove.remove(path3.join(dir, item))));
    });
    function emptyDirSync(dir) {
      let items;
      try {
        items = fs3.readdirSync(dir);
      } catch {
        return mkdir.mkdirsSync(dir);
      }
      items.forEach((item) => {
        item = path3.join(dir, item);
        remove.removeSync(item);
      });
    }
    module2.exports = {
      emptyDirSync,
      emptydirSync: emptyDirSync,
      emptyDir,
      emptydir: emptyDir
    };
  }
});

// node_modules/fs-extra/lib/ensure/file.js
var require_file = __commonJS({
  "node_modules/fs-extra/lib/ensure/file.js"(exports2, module2) {
    "use strict";
    var u = require_universalify().fromCallback;
    var path3 = require("path");
    var fs3 = require_graceful_fs();
    var mkdir = require_mkdirs();
    function createFile(file, callback) {
      function makeFile() {
        fs3.writeFile(file, "", (err) => {
          if (err) return callback(err);
          callback();
        });
      }
      fs3.stat(file, (err, stats) => {
        if (!err && stats.isFile()) return callback();
        const dir = path3.dirname(file);
        fs3.stat(dir, (err2, stats2) => {
          if (err2) {
            if (err2.code === "ENOENT") {
              return mkdir.mkdirs(dir, (err3) => {
                if (err3) return callback(err3);
                makeFile();
              });
            }
            return callback(err2);
          }
          if (stats2.isDirectory()) makeFile();
          else {
            fs3.readdir(dir, (err3) => {
              if (err3) return callback(err3);
            });
          }
        });
      });
    }
    function createFileSync(file) {
      let stats;
      try {
        stats = fs3.statSync(file);
      } catch {
      }
      if (stats && stats.isFile()) return;
      const dir = path3.dirname(file);
      try {
        if (!fs3.statSync(dir).isDirectory()) {
          fs3.readdirSync(dir);
        }
      } catch (err) {
        if (err && err.code === "ENOENT") mkdir.mkdirsSync(dir);
        else throw err;
      }
      fs3.writeFileSync(file, "");
    }
    module2.exports = {
      createFile: u(createFile),
      createFileSync
    };
  }
});

// node_modules/fs-extra/lib/ensure/link.js
var require_link = __commonJS({
  "node_modules/fs-extra/lib/ensure/link.js"(exports2, module2) {
    "use strict";
    var u = require_universalify().fromCallback;
    var path3 = require("path");
    var fs3 = require_graceful_fs();
    var mkdir = require_mkdirs();
    var pathExists = require_path_exists().pathExists;
    var { areIdentical } = require_stat();
    function createLink(srcpath, dstpath, callback) {
      function makeLink(srcpath2, dstpath2) {
        fs3.link(srcpath2, dstpath2, (err) => {
          if (err) return callback(err);
          callback(null);
        });
      }
      fs3.lstat(dstpath, (_, dstStat) => {
        fs3.lstat(srcpath, (err, srcStat) => {
          if (err) {
            err.message = err.message.replace("lstat", "ensureLink");
            return callback(err);
          }
          if (dstStat && areIdentical(srcStat, dstStat)) return callback(null);
          const dir = path3.dirname(dstpath);
          pathExists(dir, (err2, dirExists) => {
            if (err2) return callback(err2);
            if (dirExists) return makeLink(srcpath, dstpath);
            mkdir.mkdirs(dir, (err3) => {
              if (err3) return callback(err3);
              makeLink(srcpath, dstpath);
            });
          });
        });
      });
    }
    function createLinkSync(srcpath, dstpath) {
      let dstStat;
      try {
        dstStat = fs3.lstatSync(dstpath);
      } catch {
      }
      try {
        const srcStat = fs3.lstatSync(srcpath);
        if (dstStat && areIdentical(srcStat, dstStat)) return;
      } catch (err) {
        err.message = err.message.replace("lstat", "ensureLink");
        throw err;
      }
      const dir = path3.dirname(dstpath);
      const dirExists = fs3.existsSync(dir);
      if (dirExists) return fs3.linkSync(srcpath, dstpath);
      mkdir.mkdirsSync(dir);
      return fs3.linkSync(srcpath, dstpath);
    }
    module2.exports = {
      createLink: u(createLink),
      createLinkSync
    };
  }
});

// node_modules/fs-extra/lib/ensure/symlink-paths.js
var require_symlink_paths = __commonJS({
  "node_modules/fs-extra/lib/ensure/symlink-paths.js"(exports2, module2) {
    "use strict";
    var path3 = require("path");
    var fs3 = require_graceful_fs();
    var pathExists = require_path_exists().pathExists;
    function symlinkPaths(srcpath, dstpath, callback) {
      if (path3.isAbsolute(srcpath)) {
        return fs3.lstat(srcpath, (err) => {
          if (err) {
            err.message = err.message.replace("lstat", "ensureSymlink");
            return callback(err);
          }
          return callback(null, {
            toCwd: srcpath,
            toDst: srcpath
          });
        });
      } else {
        const dstdir = path3.dirname(dstpath);
        const relativeToDst = path3.join(dstdir, srcpath);
        return pathExists(relativeToDst, (err, exists) => {
          if (err) return callback(err);
          if (exists) {
            return callback(null, {
              toCwd: relativeToDst,
              toDst: srcpath
            });
          } else {
            return fs3.lstat(srcpath, (err2) => {
              if (err2) {
                err2.message = err2.message.replace("lstat", "ensureSymlink");
                return callback(err2);
              }
              return callback(null, {
                toCwd: srcpath,
                toDst: path3.relative(dstdir, srcpath)
              });
            });
          }
        });
      }
    }
    function symlinkPathsSync(srcpath, dstpath) {
      let exists;
      if (path3.isAbsolute(srcpath)) {
        exists = fs3.existsSync(srcpath);
        if (!exists) throw new Error("absolute srcpath does not exist");
        return {
          toCwd: srcpath,
          toDst: srcpath
        };
      } else {
        const dstdir = path3.dirname(dstpath);
        const relativeToDst = path3.join(dstdir, srcpath);
        exists = fs3.existsSync(relativeToDst);
        if (exists) {
          return {
            toCwd: relativeToDst,
            toDst: srcpath
          };
        } else {
          exists = fs3.existsSync(srcpath);
          if (!exists) throw new Error("relative srcpath does not exist");
          return {
            toCwd: srcpath,
            toDst: path3.relative(dstdir, srcpath)
          };
        }
      }
    }
    module2.exports = {
      symlinkPaths,
      symlinkPathsSync
    };
  }
});

// node_modules/fs-extra/lib/ensure/symlink-type.js
var require_symlink_type = __commonJS({
  "node_modules/fs-extra/lib/ensure/symlink-type.js"(exports2, module2) {
    "use strict";
    var fs3 = require_graceful_fs();
    function symlinkType(srcpath, type, callback) {
      callback = typeof type === "function" ? type : callback;
      type = typeof type === "function" ? false : type;
      if (type) return callback(null, type);
      fs3.lstat(srcpath, (err, stats) => {
        if (err) return callback(null, "file");
        type = stats && stats.isDirectory() ? "dir" : "file";
        callback(null, type);
      });
    }
    function symlinkTypeSync(srcpath, type) {
      let stats;
      if (type) return type;
      try {
        stats = fs3.lstatSync(srcpath);
      } catch {
        return "file";
      }
      return stats && stats.isDirectory() ? "dir" : "file";
    }
    module2.exports = {
      symlinkType,
      symlinkTypeSync
    };
  }
});

// node_modules/fs-extra/lib/ensure/symlink.js
var require_symlink = __commonJS({
  "node_modules/fs-extra/lib/ensure/symlink.js"(exports2, module2) {
    "use strict";
    var u = require_universalify().fromCallback;
    var path3 = require("path");
    var fs3 = require_fs();
    var _mkdirs = require_mkdirs();
    var mkdirs = _mkdirs.mkdirs;
    var mkdirsSync = _mkdirs.mkdirsSync;
    var _symlinkPaths = require_symlink_paths();
    var symlinkPaths = _symlinkPaths.symlinkPaths;
    var symlinkPathsSync = _symlinkPaths.symlinkPathsSync;
    var _symlinkType = require_symlink_type();
    var symlinkType = _symlinkType.symlinkType;
    var symlinkTypeSync = _symlinkType.symlinkTypeSync;
    var pathExists = require_path_exists().pathExists;
    var { areIdentical } = require_stat();
    function createSymlink(srcpath, dstpath, type, callback) {
      callback = typeof type === "function" ? type : callback;
      type = typeof type === "function" ? false : type;
      fs3.lstat(dstpath, (err, stats) => {
        if (!err && stats.isSymbolicLink()) {
          Promise.all([
            fs3.stat(srcpath),
            fs3.stat(dstpath)
          ]).then(([srcStat, dstStat]) => {
            if (areIdentical(srcStat, dstStat)) return callback(null);
            _createSymlink(srcpath, dstpath, type, callback);
          });
        } else _createSymlink(srcpath, dstpath, type, callback);
      });
    }
    function _createSymlink(srcpath, dstpath, type, callback) {
      symlinkPaths(srcpath, dstpath, (err, relative6) => {
        if (err) return callback(err);
        srcpath = relative6.toDst;
        symlinkType(relative6.toCwd, type, (err2, type2) => {
          if (err2) return callback(err2);
          const dir = path3.dirname(dstpath);
          pathExists(dir, (err3, dirExists) => {
            if (err3) return callback(err3);
            if (dirExists) return fs3.symlink(srcpath, dstpath, type2, callback);
            mkdirs(dir, (err4) => {
              if (err4) return callback(err4);
              fs3.symlink(srcpath, dstpath, type2, callback);
            });
          });
        });
      });
    }
    function createSymlinkSync(srcpath, dstpath, type) {
      let stats;
      try {
        stats = fs3.lstatSync(dstpath);
      } catch {
      }
      if (stats && stats.isSymbolicLink()) {
        const srcStat = fs3.statSync(srcpath);
        const dstStat = fs3.statSync(dstpath);
        if (areIdentical(srcStat, dstStat)) return;
      }
      const relative6 = symlinkPathsSync(srcpath, dstpath);
      srcpath = relative6.toDst;
      type = symlinkTypeSync(relative6.toCwd, type);
      const dir = path3.dirname(dstpath);
      const exists = fs3.existsSync(dir);
      if (exists) return fs3.symlinkSync(srcpath, dstpath, type);
      mkdirsSync(dir);
      return fs3.symlinkSync(srcpath, dstpath, type);
    }
    module2.exports = {
      createSymlink: u(createSymlink),
      createSymlinkSync
    };
  }
});

// node_modules/fs-extra/lib/ensure/index.js
var require_ensure = __commonJS({
  "node_modules/fs-extra/lib/ensure/index.js"(exports2, module2) {
    "use strict";
    var { createFile, createFileSync } = require_file();
    var { createLink, createLinkSync } = require_link();
    var { createSymlink, createSymlinkSync } = require_symlink();
    module2.exports = {
      // file
      createFile,
      createFileSync,
      ensureFile: createFile,
      ensureFileSync: createFileSync,
      // link
      createLink,
      createLinkSync,
      ensureLink: createLink,
      ensureLinkSync: createLinkSync,
      // symlink
      createSymlink,
      createSymlinkSync,
      ensureSymlink: createSymlink,
      ensureSymlinkSync: createSymlinkSync
    };
  }
});

// node_modules/jsonfile/utils.js
var require_utils2 = __commonJS({
  "node_modules/jsonfile/utils.js"(exports2, module2) {
    function stringify(obj, { EOL = "\n", finalEOL = true, replacer = null, spaces } = {}) {
      const EOF = finalEOL ? EOL : "";
      const str = JSON.stringify(obj, replacer, spaces);
      if (str === void 0) {
        throw new TypeError(`Converting ${typeof obj} value to JSON is not supported`);
      }
      return str.replace(/\n/g, EOL) + EOF;
    }
    function stripBom(content) {
      if (Buffer.isBuffer(content)) content = content.toString("utf8");
      return content.replace(/^\uFEFF/, "");
    }
    module2.exports = { stringify, stripBom };
  }
});

// node_modules/jsonfile/index.js
var require_jsonfile = __commonJS({
  "node_modules/jsonfile/index.js"(exports2, module2) {
    var _fs;
    try {
      _fs = require_graceful_fs();
    } catch (_) {
      _fs = require("fs");
    }
    var universalify = require_universalify();
    var { stringify, stripBom } = require_utils2();
    async function _readFile(file, options = {}) {
      if (typeof options === "string") {
        options = { encoding: options };
      }
      const fs3 = options.fs || _fs;
      const shouldThrow = "throws" in options ? options.throws : true;
      let data = await universalify.fromCallback(fs3.readFile)(file, options);
      data = stripBom(data);
      let obj;
      try {
        obj = JSON.parse(data, options ? options.reviver : null);
      } catch (err) {
        if (shouldThrow) {
          err.message = `${file}: ${err.message}`;
          throw err;
        } else {
          return null;
        }
      }
      return obj;
    }
    var readFile = universalify.fromPromise(_readFile);
    function readFileSync(file, options = {}) {
      if (typeof options === "string") {
        options = { encoding: options };
      }
      const fs3 = options.fs || _fs;
      const shouldThrow = "throws" in options ? options.throws : true;
      try {
        let content = fs3.readFileSync(file, options);
        content = stripBom(content);
        return JSON.parse(content, options.reviver);
      } catch (err) {
        if (shouldThrow) {
          err.message = `${file}: ${err.message}`;
          throw err;
        } else {
          return null;
        }
      }
    }
    async function _writeFile(file, obj, options = {}) {
      const fs3 = options.fs || _fs;
      const str = stringify(obj, options);
      await universalify.fromCallback(fs3.writeFile)(file, str, options);
    }
    var writeFile = universalify.fromPromise(_writeFile);
    function writeFileSync(file, obj, options = {}) {
      const fs3 = options.fs || _fs;
      const str = stringify(obj, options);
      return fs3.writeFileSync(file, str, options);
    }
    module2.exports = {
      readFile,
      readFileSync,
      writeFile,
      writeFileSync
    };
  }
});

// node_modules/fs-extra/lib/json/jsonfile.js
var require_jsonfile2 = __commonJS({
  "node_modules/fs-extra/lib/json/jsonfile.js"(exports2, module2) {
    "use strict";
    var jsonFile = require_jsonfile();
    module2.exports = {
      // jsonfile exports
      readJson: jsonFile.readFile,
      readJsonSync: jsonFile.readFileSync,
      writeJson: jsonFile.writeFile,
      writeJsonSync: jsonFile.writeFileSync
    };
  }
});

// node_modules/fs-extra/lib/output-file/index.js
var require_output_file = __commonJS({
  "node_modules/fs-extra/lib/output-file/index.js"(exports2, module2) {
    "use strict";
    var u = require_universalify().fromCallback;
    var fs3 = require_graceful_fs();
    var path3 = require("path");
    var mkdir = require_mkdirs();
    var pathExists = require_path_exists().pathExists;
    function outputFile(file, data, encoding, callback) {
      if (typeof encoding === "function") {
        callback = encoding;
        encoding = "utf8";
      }
      const dir = path3.dirname(file);
      pathExists(dir, (err, itDoes) => {
        if (err) return callback(err);
        if (itDoes) return fs3.writeFile(file, data, encoding, callback);
        mkdir.mkdirs(dir, (err2) => {
          if (err2) return callback(err2);
          fs3.writeFile(file, data, encoding, callback);
        });
      });
    }
    function outputFileSync(file, ...args) {
      const dir = path3.dirname(file);
      if (fs3.existsSync(dir)) {
        return fs3.writeFileSync(file, ...args);
      }
      mkdir.mkdirsSync(dir);
      fs3.writeFileSync(file, ...args);
    }
    module2.exports = {
      outputFile: u(outputFile),
      outputFileSync
    };
  }
});

// node_modules/fs-extra/lib/json/output-json.js
var require_output_json = __commonJS({
  "node_modules/fs-extra/lib/json/output-json.js"(exports2, module2) {
    "use strict";
    var { stringify } = require_utils2();
    var { outputFile } = require_output_file();
    async function outputJson(file, data, options = {}) {
      const str = stringify(data, options);
      await outputFile(file, str, options);
    }
    module2.exports = outputJson;
  }
});

// node_modules/fs-extra/lib/json/output-json-sync.js
var require_output_json_sync = __commonJS({
  "node_modules/fs-extra/lib/json/output-json-sync.js"(exports2, module2) {
    "use strict";
    var { stringify } = require_utils2();
    var { outputFileSync } = require_output_file();
    function outputJsonSync(file, data, options) {
      const str = stringify(data, options);
      outputFileSync(file, str, options);
    }
    module2.exports = outputJsonSync;
  }
});

// node_modules/fs-extra/lib/json/index.js
var require_json = __commonJS({
  "node_modules/fs-extra/lib/json/index.js"(exports2, module2) {
    "use strict";
    var u = require_universalify().fromPromise;
    var jsonFile = require_jsonfile2();
    jsonFile.outputJson = u(require_output_json());
    jsonFile.outputJsonSync = require_output_json_sync();
    jsonFile.outputJSON = jsonFile.outputJson;
    jsonFile.outputJSONSync = jsonFile.outputJsonSync;
    jsonFile.writeJSON = jsonFile.writeJson;
    jsonFile.writeJSONSync = jsonFile.writeJsonSync;
    jsonFile.readJSON = jsonFile.readJson;
    jsonFile.readJSONSync = jsonFile.readJsonSync;
    module2.exports = jsonFile;
  }
});

// node_modules/fs-extra/lib/move/move.js
var require_move = __commonJS({
  "node_modules/fs-extra/lib/move/move.js"(exports2, module2) {
    "use strict";
    var fs3 = require_graceful_fs();
    var path3 = require("path");
    var copy = require_copy2().copy;
    var remove = require_remove().remove;
    var mkdirp = require_mkdirs().mkdirp;
    var pathExists = require_path_exists().pathExists;
    var stat5 = require_stat();
    function move(src, dest, opts, cb) {
      if (typeof opts === "function") {
        cb = opts;
        opts = {};
      }
      opts = opts || {};
      const overwrite = opts.overwrite || opts.clobber || false;
      stat5.checkPaths(src, dest, "move", opts, (err, stats) => {
        if (err) return cb(err);
        const { srcStat, isChangingCase = false } = stats;
        stat5.checkParentPaths(src, srcStat, dest, "move", (err2) => {
          if (err2) return cb(err2);
          if (isParentRoot(dest)) return doRename(src, dest, overwrite, isChangingCase, cb);
          mkdirp(path3.dirname(dest), (err3) => {
            if (err3) return cb(err3);
            return doRename(src, dest, overwrite, isChangingCase, cb);
          });
        });
      });
    }
    function isParentRoot(dest) {
      const parent = path3.dirname(dest);
      const parsedPath = path3.parse(parent);
      return parsedPath.root === parent;
    }
    function doRename(src, dest, overwrite, isChangingCase, cb) {
      if (isChangingCase) return rename(src, dest, overwrite, cb);
      if (overwrite) {
        return remove(dest, (err) => {
          if (err) return cb(err);
          return rename(src, dest, overwrite, cb);
        });
      }
      pathExists(dest, (err, destExists) => {
        if (err) return cb(err);
        if (destExists) return cb(new Error("dest already exists."));
        return rename(src, dest, overwrite, cb);
      });
    }
    function rename(src, dest, overwrite, cb) {
      fs3.rename(src, dest, (err) => {
        if (!err) return cb();
        if (err.code !== "EXDEV") return cb(err);
        return moveAcrossDevice(src, dest, overwrite, cb);
      });
    }
    function moveAcrossDevice(src, dest, overwrite, cb) {
      const opts = {
        overwrite,
        errorOnExist: true
      };
      copy(src, dest, opts, (err) => {
        if (err) return cb(err);
        return remove(src, cb);
      });
    }
    module2.exports = move;
  }
});

// node_modules/fs-extra/lib/move/move-sync.js
var require_move_sync = __commonJS({
  "node_modules/fs-extra/lib/move/move-sync.js"(exports2, module2) {
    "use strict";
    var fs3 = require_graceful_fs();
    var path3 = require("path");
    var copySync = require_copy2().copySync;
    var removeSync = require_remove().removeSync;
    var mkdirpSync = require_mkdirs().mkdirpSync;
    var stat5 = require_stat();
    function moveSync(src, dest, opts) {
      opts = opts || {};
      const overwrite = opts.overwrite || opts.clobber || false;
      const { srcStat, isChangingCase = false } = stat5.checkPathsSync(src, dest, "move", opts);
      stat5.checkParentPathsSync(src, srcStat, dest, "move");
      if (!isParentRoot(dest)) mkdirpSync(path3.dirname(dest));
      return doRename(src, dest, overwrite, isChangingCase);
    }
    function isParentRoot(dest) {
      const parent = path3.dirname(dest);
      const parsedPath = path3.parse(parent);
      return parsedPath.root === parent;
    }
    function doRename(src, dest, overwrite, isChangingCase) {
      if (isChangingCase) return rename(src, dest, overwrite);
      if (overwrite) {
        removeSync(dest);
        return rename(src, dest, overwrite);
      }
      if (fs3.existsSync(dest)) throw new Error("dest already exists.");
      return rename(src, dest, overwrite);
    }
    function rename(src, dest, overwrite) {
      try {
        fs3.renameSync(src, dest);
      } catch (err) {
        if (err.code !== "EXDEV") throw err;
        return moveAcrossDevice(src, dest, overwrite);
      }
    }
    function moveAcrossDevice(src, dest, overwrite) {
      const opts = {
        overwrite,
        errorOnExist: true
      };
      copySync(src, dest, opts);
      return removeSync(src);
    }
    module2.exports = moveSync;
  }
});

// node_modules/fs-extra/lib/move/index.js
var require_move2 = __commonJS({
  "node_modules/fs-extra/lib/move/index.js"(exports2, module2) {
    "use strict";
    var u = require_universalify().fromCallback;
    module2.exports = {
      move: u(require_move()),
      moveSync: require_move_sync()
    };
  }
});

// node_modules/fs-extra/lib/index.js
var require_lib = __commonJS({
  "node_modules/fs-extra/lib/index.js"(exports2, module2) {
    "use strict";
    module2.exports = {
      // Export promiseified graceful-fs:
      ...require_fs(),
      // Export extra methods:
      ...require_copy2(),
      ...require_empty(),
      ...require_ensure(),
      ...require_json(),
      ...require_mkdirs(),
      ...require_move2(),
      ...require_output_file(),
      ...require_path_exists(),
      ...require_remove()
    };
  }
});

// node_modules/builder-util-runtime/out/CancellationToken.js
var require_CancellationToken = __commonJS({
  "node_modules/builder-util-runtime/out/CancellationToken.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.CancellationError = exports2.CancellationToken = void 0;
    var events_1 = require("events");
    var CancellationToken = class extends events_1.EventEmitter {
      get cancelled() {
        return this._cancelled || this._parent != null && this._parent.cancelled;
      }
      set parent(value) {
        this.removeParentCancelHandler();
        this._parent = value;
        this.parentCancelHandler = () => this.cancel();
        this._parent.onCancel(this.parentCancelHandler);
      }
      // babel cannot compile ... correctly for super calls
      constructor(parent) {
        super();
        this.parentCancelHandler = null;
        this._parent = null;
        this._cancelled = false;
        if (parent != null) {
          this.parent = parent;
        }
      }
      cancel() {
        this._cancelled = true;
        this.emit("cancel");
      }
      onCancel(handler) {
        if (this.cancelled) {
          handler();
        } else {
          this.once("cancel", handler);
        }
      }
      createPromise(callback) {
        if (this.cancelled) {
          return Promise.reject(new CancellationError());
        }
        const finallyHandler = () => {
          if (cancelHandler != null) {
            try {
              this.removeListener("cancel", cancelHandler);
              cancelHandler = null;
            } catch (_ignore) {
            }
          }
        };
        let cancelHandler = null;
        return new Promise((resolve6, reject) => {
          let addedCancelHandler = null;
          cancelHandler = () => {
            try {
              if (addedCancelHandler != null) {
                addedCancelHandler();
                addedCancelHandler = null;
              }
            } finally {
              reject(new CancellationError());
            }
          };
          if (this.cancelled) {
            cancelHandler();
            return;
          }
          this.onCancel(cancelHandler);
          callback(resolve6, reject, (callback2) => {
            addedCancelHandler = callback2;
          });
        }).then((it) => {
          finallyHandler();
          return it;
        }).catch((e) => {
          finallyHandler();
          throw e;
        });
      }
      removeParentCancelHandler() {
        const parent = this._parent;
        if (parent != null && this.parentCancelHandler != null) {
          parent.removeListener("cancel", this.parentCancelHandler);
          this.parentCancelHandler = null;
        }
      }
      dispose() {
        try {
          this.removeParentCancelHandler();
        } finally {
          this.removeAllListeners();
          this._parent = null;
        }
      }
    };
    exports2.CancellationToken = CancellationToken;
    var CancellationError = class extends Error {
      constructor() {
        super("cancelled");
      }
    };
    exports2.CancellationError = CancellationError;
  }
});

// node_modules/builder-util-runtime/out/error.js
var require_error = __commonJS({
  "node_modules/builder-util-runtime/out/error.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.newError = newError;
    function newError(message, code) {
      const error = new Error(message);
      error.code = code;
      return error;
    }
  }
});

// node_modules/builder-util-runtime/node_modules/debug/node_modules/ms/index.js
var require_ms = __commonJS({
  "node_modules/builder-util-runtime/node_modules/debug/node_modules/ms/index.js"(exports2, module2) {
    var s = 1e3;
    var m = s * 60;
    var h = m * 60;
    var d = h * 24;
    var w = d * 7;
    var y = d * 365.25;
    module2.exports = function(val, options) {
      options = options || {};
      var type = typeof val;
      if (type === "string" && val.length > 0) {
        return parse(val);
      } else if (type === "number" && isFinite(val)) {
        return options.long ? fmtLong(val) : fmtShort(val);
      }
      throw new Error(
        "val is not a non-empty string or a valid number. val=" + JSON.stringify(val)
      );
    };
    function parse(str) {
      str = String(str);
      if (str.length > 100) {
        return;
      }
      var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
        str
      );
      if (!match) {
        return;
      }
      var n = parseFloat(match[1]);
      var type = (match[2] || "ms").toLowerCase();
      switch (type) {
        case "years":
        case "year":
        case "yrs":
        case "yr":
        case "y":
          return n * y;
        case "weeks":
        case "week":
        case "w":
          return n * w;
        case "days":
        case "day":
        case "d":
          return n * d;
        case "hours":
        case "hour":
        case "hrs":
        case "hr":
        case "h":
          return n * h;
        case "minutes":
        case "minute":
        case "mins":
        case "min":
        case "m":
          return n * m;
        case "seconds":
        case "second":
        case "secs":
        case "sec":
        case "s":
          return n * s;
        case "milliseconds":
        case "millisecond":
        case "msecs":
        case "msec":
        case "ms":
          return n;
        default:
          return void 0;
      }
    }
    function fmtShort(ms) {
      var msAbs = Math.abs(ms);
      if (msAbs >= d) {
        return Math.round(ms / d) + "d";
      }
      if (msAbs >= h) {
        return Math.round(ms / h) + "h";
      }
      if (msAbs >= m) {
        return Math.round(ms / m) + "m";
      }
      if (msAbs >= s) {
        return Math.round(ms / s) + "s";
      }
      return ms + "ms";
    }
    function fmtLong(ms) {
      var msAbs = Math.abs(ms);
      if (msAbs >= d) {
        return plural(ms, msAbs, d, "day");
      }
      if (msAbs >= h) {
        return plural(ms, msAbs, h, "hour");
      }
      if (msAbs >= m) {
        return plural(ms, msAbs, m, "minute");
      }
      if (msAbs >= s) {
        return plural(ms, msAbs, s, "second");
      }
      return ms + " ms";
    }
    function plural(ms, msAbs, n, name) {
      var isPlural = msAbs >= n * 1.5;
      return Math.round(ms / n) + " " + name + (isPlural ? "s" : "");
    }
  }
});

// node_modules/builder-util-runtime/node_modules/debug/src/common.js
var require_common = __commonJS({
  "node_modules/builder-util-runtime/node_modules/debug/src/common.js"(exports2, module2) {
    function setup(env) {
      createDebug.debug = createDebug;
      createDebug.default = createDebug;
      createDebug.coerce = coerce;
      createDebug.disable = disable;
      createDebug.enable = enable;
      createDebug.enabled = enabled;
      createDebug.humanize = require_ms();
      createDebug.destroy = destroy;
      Object.keys(env).forEach((key) => {
        createDebug[key] = env[key];
      });
      createDebug.names = [];
      createDebug.skips = [];
      createDebug.formatters = {};
      function selectColor(namespace) {
        let hash = 0;
        for (let i = 0; i < namespace.length; i++) {
          hash = (hash << 5) - hash + namespace.charCodeAt(i);
          hash |= 0;
        }
        return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
      }
      createDebug.selectColor = selectColor;
      function createDebug(namespace) {
        let prevTime;
        let enableOverride = null;
        let namespacesCache;
        let enabledCache;
        function debug(...args) {
          if (!debug.enabled) {
            return;
          }
          const self2 = debug;
          const curr = Number(/* @__PURE__ */ new Date());
          const ms = curr - (prevTime || curr);
          self2.diff = ms;
          self2.prev = prevTime;
          self2.curr = curr;
          prevTime = curr;
          args[0] = createDebug.coerce(args[0]);
          if (typeof args[0] !== "string") {
            args.unshift("%O");
          }
          let index = 0;
          args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
            if (match === "%%") {
              return "%";
            }
            index++;
            const formatter = createDebug.formatters[format];
            if (typeof formatter === "function") {
              const val = args[index];
              match = formatter.call(self2, val);
              args.splice(index, 1);
              index--;
            }
            return match;
          });
          createDebug.formatArgs.call(self2, args);
          const logFn = self2.log || createDebug.log;
          logFn.apply(self2, args);
        }
        debug.namespace = namespace;
        debug.useColors = createDebug.useColors();
        debug.color = createDebug.selectColor(namespace);
        debug.extend = extend;
        debug.destroy = createDebug.destroy;
        Object.defineProperty(debug, "enabled", {
          enumerable: true,
          configurable: false,
          get: () => {
            if (enableOverride !== null) {
              return enableOverride;
            }
            if (namespacesCache !== createDebug.namespaces) {
              namespacesCache = createDebug.namespaces;
              enabledCache = createDebug.enabled(namespace);
            }
            return enabledCache;
          },
          set: (v) => {
            enableOverride = v;
          }
        });
        if (typeof createDebug.init === "function") {
          createDebug.init(debug);
        }
        return debug;
      }
      function extend(namespace, delimiter) {
        const newDebug = createDebug(this.namespace + (typeof delimiter === "undefined" ? ":" : delimiter) + namespace);
        newDebug.log = this.log;
        return newDebug;
      }
      function enable(namespaces) {
        createDebug.save(namespaces);
        createDebug.namespaces = namespaces;
        createDebug.names = [];
        createDebug.skips = [];
        const split = (typeof namespaces === "string" ? namespaces : "").trim().replace(/\s+/g, ",").split(",").filter(Boolean);
        for (const ns of split) {
          if (ns[0] === "-") {
            createDebug.skips.push(ns.slice(1));
          } else {
            createDebug.names.push(ns);
          }
        }
      }
      function matchesTemplate(search, template) {
        let searchIndex = 0;
        let templateIndex = 0;
        let starIndex = -1;
        let matchIndex = 0;
        while (searchIndex < search.length) {
          if (templateIndex < template.length && (template[templateIndex] === search[searchIndex] || template[templateIndex] === "*")) {
            if (template[templateIndex] === "*") {
              starIndex = templateIndex;
              matchIndex = searchIndex;
              templateIndex++;
            } else {
              searchIndex++;
              templateIndex++;
            }
          } else if (starIndex !== -1) {
            templateIndex = starIndex + 1;
            matchIndex++;
            searchIndex = matchIndex;
          } else {
            return false;
          }
        }
        while (templateIndex < template.length && template[templateIndex] === "*") {
          templateIndex++;
        }
        return templateIndex === template.length;
      }
      function disable() {
        const namespaces = [
          ...createDebug.names,
          ...createDebug.skips.map((namespace) => "-" + namespace)
        ].join(",");
        createDebug.enable("");
        return namespaces;
      }
      function enabled(name) {
        for (const skip of createDebug.skips) {
          if (matchesTemplate(name, skip)) {
            return false;
          }
        }
        for (const ns of createDebug.names) {
          if (matchesTemplate(name, ns)) {
            return true;
          }
        }
        return false;
      }
      function coerce(val) {
        if (val instanceof Error) {
          return val.stack || val.message;
        }
        return val;
      }
      function destroy() {
        console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
      }
      createDebug.enable(createDebug.load());
      return createDebug;
    }
    module2.exports = setup;
  }
});

// node_modules/builder-util-runtime/node_modules/debug/src/browser.js
var require_browser = __commonJS({
  "node_modules/builder-util-runtime/node_modules/debug/src/browser.js"(exports2, module2) {
    exports2.formatArgs = formatArgs;
    exports2.save = save;
    exports2.load = load;
    exports2.useColors = useColors;
    exports2.storage = localstorage();
    exports2.destroy = /* @__PURE__ */ (() => {
      let warned = false;
      return () => {
        if (!warned) {
          warned = true;
          console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
        }
      };
    })();
    exports2.colors = [
      "#0000CC",
      "#0000FF",
      "#0033CC",
      "#0033FF",
      "#0066CC",
      "#0066FF",
      "#0099CC",
      "#0099FF",
      "#00CC00",
      "#00CC33",
      "#00CC66",
      "#00CC99",
      "#00CCCC",
      "#00CCFF",
      "#3300CC",
      "#3300FF",
      "#3333CC",
      "#3333FF",
      "#3366CC",
      "#3366FF",
      "#3399CC",
      "#3399FF",
      "#33CC00",
      "#33CC33",
      "#33CC66",
      "#33CC99",
      "#33CCCC",
      "#33CCFF",
      "#6600CC",
      "#6600FF",
      "#6633CC",
      "#6633FF",
      "#66CC00",
      "#66CC33",
      "#9900CC",
      "#9900FF",
      "#9933CC",
      "#9933FF",
      "#99CC00",
      "#99CC33",
      "#CC0000",
      "#CC0033",
      "#CC0066",
      "#CC0099",
      "#CC00CC",
      "#CC00FF",
      "#CC3300",
      "#CC3333",
      "#CC3366",
      "#CC3399",
      "#CC33CC",
      "#CC33FF",
      "#CC6600",
      "#CC6633",
      "#CC9900",
      "#CC9933",
      "#CCCC00",
      "#CCCC33",
      "#FF0000",
      "#FF0033",
      "#FF0066",
      "#FF0099",
      "#FF00CC",
      "#FF00FF",
      "#FF3300",
      "#FF3333",
      "#FF3366",
      "#FF3399",
      "#FF33CC",
      "#FF33FF",
      "#FF6600",
      "#FF6633",
      "#FF9900",
      "#FF9933",
      "#FFCC00",
      "#FFCC33"
    ];
    function useColors() {
      if (typeof window !== "undefined" && window.process && (window.process.type === "renderer" || window.process.__nwjs)) {
        return true;
      }
      if (typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
        return false;
      }
      let m;
      return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || // Is firebug? http://stackoverflow.com/a/398120/376773
      typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || // Is firefox >= v31?
      // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
      typeof navigator !== "undefined" && navigator.userAgent && (m = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(m[1], 10) >= 31 || // Double check webkit in userAgent just in case we are in a worker
      typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
    }
    function formatArgs(args) {
      args[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + args[0] + (this.useColors ? "%c " : " ") + "+" + module2.exports.humanize(this.diff);
      if (!this.useColors) {
        return;
      }
      const c = "color: " + this.color;
      args.splice(1, 0, c, "color: inherit");
      let index = 0;
      let lastC = 0;
      args[0].replace(/%[a-zA-Z%]/g, (match) => {
        if (match === "%%") {
          return;
        }
        index++;
        if (match === "%c") {
          lastC = index;
        }
      });
      args.splice(lastC, 0, c);
    }
    exports2.log = console.debug || console.log || (() => {
    });
    function save(namespaces) {
      try {
        if (namespaces) {
          exports2.storage.setItem("debug", namespaces);
        } else {
          exports2.storage.removeItem("debug");
        }
      } catch (error) {
      }
    }
    function load() {
      let r;
      try {
        r = exports2.storage.getItem("debug") || exports2.storage.getItem("DEBUG");
      } catch (error) {
      }
      if (!r && typeof process !== "undefined" && "env" in process) {
        r = process.env.DEBUG;
      }
      return r;
    }
    function localstorage() {
      try {
        return localStorage;
      } catch (error) {
      }
    }
    module2.exports = require_common()(exports2);
    var { formatters } = module2.exports;
    formatters.j = function(v) {
      try {
        return JSON.stringify(v);
      } catch (error) {
        return "[UnexpectedJSONParseError]: " + error.message;
      }
    };
  }
});

// node_modules/builder-util-runtime/node_modules/debug/src/node.js
var require_node = __commonJS({
  "node_modules/builder-util-runtime/node_modules/debug/src/node.js"(exports2, module2) {
    var tty = require("tty");
    var util = require("util");
    exports2.init = init;
    exports2.log = log;
    exports2.formatArgs = formatArgs;
    exports2.save = save;
    exports2.load = load;
    exports2.useColors = useColors;
    exports2.destroy = util.deprecate(
      () => {
      },
      "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."
    );
    exports2.colors = [6, 2, 3, 4, 5, 1];
    try {
      const supportsColor = require("supports-color");
      if (supportsColor && (supportsColor.stderr || supportsColor).level >= 2) {
        exports2.colors = [
          20,
          21,
          26,
          27,
          32,
          33,
          38,
          39,
          40,
          41,
          42,
          43,
          44,
          45,
          56,
          57,
          62,
          63,
          68,
          69,
          74,
          75,
          76,
          77,
          78,
          79,
          80,
          81,
          92,
          93,
          98,
          99,
          112,
          113,
          128,
          129,
          134,
          135,
          148,
          149,
          160,
          161,
          162,
          163,
          164,
          165,
          166,
          167,
          168,
          169,
          170,
          171,
          172,
          173,
          178,
          179,
          184,
          185,
          196,
          197,
          198,
          199,
          200,
          201,
          202,
          203,
          204,
          205,
          206,
          207,
          208,
          209,
          214,
          215,
          220,
          221
        ];
      }
    } catch (error) {
    }
    exports2.inspectOpts = Object.keys(process.env).filter((key) => {
      return /^debug_/i.test(key);
    }).reduce((obj, key) => {
      const prop = key.substring(6).toLowerCase().replace(/_([a-z])/g, (_, k) => {
        return k.toUpperCase();
      });
      let val = process.env[key];
      if (/^(yes|on|true|enabled)$/i.test(val)) {
        val = true;
      } else if (/^(no|off|false|disabled)$/i.test(val)) {
        val = false;
      } else if (val === "null") {
        val = null;
      } else {
        val = Number(val);
      }
      obj[prop] = val;
      return obj;
    }, {});
    function useColors() {
      return "colors" in exports2.inspectOpts ? Boolean(exports2.inspectOpts.colors) : tty.isatty(process.stderr.fd);
    }
    function formatArgs(args) {
      const { namespace: name, useColors: useColors2 } = this;
      if (useColors2) {
        const c = this.color;
        const colorCode = "\x1B[3" + (c < 8 ? c : "8;5;" + c);
        const prefix = `  ${colorCode};1m${name} \x1B[0m`;
        args[0] = prefix + args[0].split("\n").join("\n" + prefix);
        args.push(colorCode + "m+" + module2.exports.humanize(this.diff) + "\x1B[0m");
      } else {
        args[0] = getDate() + name + " " + args[0];
      }
    }
    function getDate() {
      if (exports2.inspectOpts.hideDate) {
        return "";
      }
      return (/* @__PURE__ */ new Date()).toISOString() + " ";
    }
    function log(...args) {
      return process.stderr.write(util.formatWithOptions(exports2.inspectOpts, ...args) + "\n");
    }
    function save(namespaces) {
      if (namespaces) {
        process.env.DEBUG = namespaces;
      } else {
        delete process.env.DEBUG;
      }
    }
    function load() {
      return process.env.DEBUG;
    }
    function init(debug) {
      debug.inspectOpts = {};
      const keys = Object.keys(exports2.inspectOpts);
      for (let i = 0; i < keys.length; i++) {
        debug.inspectOpts[keys[i]] = exports2.inspectOpts[keys[i]];
      }
    }
    module2.exports = require_common()(exports2);
    var { formatters } = module2.exports;
    formatters.o = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util.inspect(v, this.inspectOpts).split("\n").map((str) => str.trim()).join(" ");
    };
    formatters.O = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util.inspect(v, this.inspectOpts);
    };
  }
});

// node_modules/builder-util-runtime/node_modules/debug/src/index.js
var require_src = __commonJS({
  "node_modules/builder-util-runtime/node_modules/debug/src/index.js"(exports2, module2) {
    if (typeof process === "undefined" || process.type === "renderer" || process.browser === true || process.__nwjs) {
      module2.exports = require_browser();
    } else {
      module2.exports = require_node();
    }
  }
});

// node_modules/builder-util-runtime/out/ProgressCallbackTransform.js
var require_ProgressCallbackTransform = __commonJS({
  "node_modules/builder-util-runtime/out/ProgressCallbackTransform.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ProgressCallbackTransform = void 0;
    var stream_1 = require("stream");
    var ProgressCallbackTransform = class extends stream_1.Transform {
      constructor(total, cancellationToken, onProgress) {
        super();
        this.total = total;
        this.cancellationToken = cancellationToken;
        this.onProgress = onProgress;
        this.start = Date.now();
        this.transferred = 0;
        this.delta = 0;
        this.nextUpdate = this.start + 1e3;
      }
      _transform(chunk, encoding, callback) {
        if (this.cancellationToken.cancelled) {
          callback(new Error("cancelled"), null);
          return;
        }
        this.transferred += chunk.length;
        this.delta += chunk.length;
        const now = Date.now();
        if (now >= this.nextUpdate && this.transferred !== this.total) {
          this.nextUpdate = now + 1e3;
          this.onProgress({
            total: this.total,
            delta: this.delta,
            transferred: this.transferred,
            percent: this.transferred / this.total * 100,
            bytesPerSecond: Math.round(this.transferred / ((now - this.start) / 1e3))
          });
          this.delta = 0;
        }
        callback(null, chunk);
      }
      _flush(callback) {
        if (this.cancellationToken.cancelled) {
          callback(new Error("cancelled"));
          return;
        }
        this.onProgress({
          total: this.total,
          delta: this.delta,
          transferred: this.total,
          percent: 100,
          bytesPerSecond: Math.round(this.transferred / ((Date.now() - this.start) / 1e3))
        });
        this.delta = 0;
        callback(null);
      }
    };
    exports2.ProgressCallbackTransform = ProgressCallbackTransform;
  }
});

// node_modules/builder-util-runtime/out/httpExecutor.js
var require_httpExecutor = __commonJS({
  "node_modules/builder-util-runtime/out/httpExecutor.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.DigestTransform = exports2.HttpExecutor = exports2.HttpError = void 0;
    exports2.addSensitiveRedirectHeader = addSensitiveRedirectHeader;
    exports2.addSensitiveFieldPattern = addSensitiveFieldPattern;
    exports2.createHttpError = createHttpError;
    exports2.parseJson = parseJson;
    exports2.configureRequestOptionsFromUrl = configureRequestOptionsFromUrl;
    exports2.configureRequestUrl = configureRequestUrl;
    exports2.safeGetHeader = safeGetHeader;
    exports2.configureRequestOptions = configureRequestOptions;
    exports2.isSensitiveFieldName = isSensitiveFieldName;
    exports2.hashSensitiveValue = hashSensitiveValue;
    exports2.safeStringifyJson = safeStringifyJson;
    var crypto_1 = require("crypto");
    var debug_1 = require_src();
    var fs_1 = require("fs");
    var stream_1 = require("stream");
    var url_1 = require("url");
    var CancellationToken_1 = require_CancellationToken();
    var error_1 = require_error();
    var ProgressCallbackTransform_1 = require_ProgressCallbackTransform();
    var debug = (0, debug_1.default)("electron-builder");
    var normalizeName = (name) => name.toLowerCase().replace(/[-_]/g, "");
    var SENSITIVE_REDIRECT_HEADERS = /* @__PURE__ */ new Set(["authorization", "proxyauthorization", "privatetoken", "xapikey", "xauthtoken", "xaccesstoken", "xgitlabtoken", "cookie", "xcsrftoken"]);
    var SENSITIVE_FIELD_PATTERNS = ["token", "password", "secret", "authorization", "credential", "apikey", "passphrase", "auth"];
    var SENSITIVE_FIELD_SUFFIXES = ["key"];
    function addSensitiveRedirectHeader(header) {
      SENSITIVE_REDIRECT_HEADERS.add(normalizeName(header));
    }
    function addSensitiveFieldPattern(pattern) {
      SENSITIVE_FIELD_PATTERNS.push(pattern.toLowerCase().replace(/[-_]/g, ""));
    }
    function createHttpError(response, description = null) {
      return new HttpError(response.statusCode || -1, `${response.statusCode} ${response.statusMessage}` + (description == null ? "" : "\n" + JSON.stringify(description, null, "  ")) + "\nHeaders: " + safeStringifyJson(response.headers), description);
    }
    var HTTP_STATUS_CODES = /* @__PURE__ */ new Map([
      [429, "Too many requests"],
      [400, "Bad request"],
      [403, "Forbidden"],
      [404, "Not found"],
      [405, "Method not allowed"],
      [406, "Not acceptable"],
      [408, "Request timeout"],
      [413, "Request entity too large"],
      [500, "Internal server error"],
      [502, "Bad gateway"],
      [503, "Service unavailable"],
      [504, "Gateway timeout"],
      [505, "HTTP version not supported"]
    ]);
    var HttpError = class extends Error {
      constructor(statusCode, message = `HTTP error: ${HTTP_STATUS_CODES.get(statusCode) || statusCode}`, description = null) {
        super(message);
        this.statusCode = statusCode;
        this.description = description;
        this.name = "HttpError";
        this.code = `HTTP_ERROR_${statusCode}`;
      }
      isServerError() {
        return this.statusCode >= 500 && this.statusCode <= 599;
      }
    };
    exports2.HttpError = HttpError;
    function parseJson(result) {
      return result.then((it) => it == null || it.length === 0 ? null : JSON.parse(it));
    }
    var HttpExecutor = class _HttpExecutor {
      constructor() {
        this.maxRedirects = 10;
      }
      request(options, cancellationToken = new CancellationToken_1.CancellationToken(), data) {
        configureRequestOptions(options);
        const json = data == null ? void 0 : JSON.stringify(data);
        const encodedData = json ? Buffer.from(json) : void 0;
        if (encodedData != null) {
          if (debug.enabled) {
            debug(safeStringifyJson(data));
          }
          const { headers, ...opts } = options;
          options = {
            method: "post",
            headers: {
              "Content-Type": "application/json",
              "Content-Length": encodedData.length,
              ...headers
            },
            ...opts
          };
        }
        return this.doApiRequest(options, cancellationToken, (it) => it.end(encodedData));
      }
      doApiRequest(options, cancellationToken, requestProcessor, redirectCount = 0) {
        if (debug.enabled) {
          const { headers: _headers, auth: _auth, ...safeOptions } = options;
          debug(`Request: ${safeStringifyJson(safeOptions)}`);
        }
        return cancellationToken.createPromise((resolve6, reject, onCancel) => {
          const request = this.createRequest(options, (response) => {
            try {
              this.handleResponse(response, options, cancellationToken, resolve6, reject, redirectCount, requestProcessor);
            } catch (e) {
              reject(e);
            }
          });
          this.addErrorAndTimeoutHandlers(request, reject, options.timeout);
          this.addRedirectHandlers(request, options, reject, redirectCount, (options2) => {
            this.doApiRequest(options2, cancellationToken, requestProcessor, redirectCount).then(resolve6).catch(reject);
          });
          requestProcessor(request, reject);
          onCancel(() => request.abort());
        });
      }
      // noinspection JSUnusedLocalSymbols
      // eslint-disable-next-line
      addRedirectHandlers(request, options, reject, redirectCount, handler) {
      }
      addErrorAndTimeoutHandlers(request, reject, timeout = 60 * 1e3) {
        this.addTimeOutHandler(request, reject, timeout);
        request.on("error", reject);
        request.on("aborted", () => {
          reject(new Error("Request has been aborted by the server"));
        });
      }
      handleResponse(response, options, cancellationToken, resolve6, reject, redirectCount, requestProcessor) {
        var _a;
        if (debug.enabled) {
          const { headers: _headers, auth: _auth, ...safeOptions } = options;
          debug(`Response: ${response.statusCode} ${response.statusMessage}, request options: ${safeStringifyJson(safeOptions)}`);
        }
        if (response.statusCode === 404) {
          reject(createHttpError(response, `method: ${options.method || "GET"} url: ${options.protocol || "https:"}//${options.hostname}${options.port ? `:${options.port}` : ""}${options.path}

Please double check that your authentication token is correct. Due to security reasons, actual status maybe not reported, but 404.
`));
          return;
        } else if (response.statusCode === 204) {
          resolve6();
          return;
        }
        const code = (_a = response.statusCode) !== null && _a !== void 0 ? _a : 0;
        const shouldRedirect = code >= 300 && code < 400;
        const redirectUrl = safeGetHeader(response, "location");
        if (shouldRedirect && redirectUrl != null) {
          if (redirectCount > this.maxRedirects) {
            reject(this.createMaxRedirectError());
            return;
          }
          this.doApiRequest(_HttpExecutor.prepareRedirectUrlOptions(redirectUrl, options), cancellationToken, requestProcessor, redirectCount).then(resolve6).catch(reject);
          return;
        }
        response.setEncoding("utf8");
        let data = "";
        response.on("error", reject);
        response.on("data", (chunk) => data += chunk);
        response.on("end", () => {
          try {
            if (response.statusCode != null && response.statusCode >= 400) {
              const contentType = safeGetHeader(response, "content-type");
              const isJson = contentType != null && (Array.isArray(contentType) ? contentType.find((it) => it.includes("json")) != null : contentType.includes("json"));
              reject(createHttpError(response, `method: ${options.method || "GET"} url: ${options.protocol || "https:"}//${options.hostname}${options.port ? `:${options.port}` : ""}${options.path}

          Data:
          ${isJson ? safeStringifyJson(JSON.parse(data)) : data}
          `));
            } else {
              resolve6(data.length === 0 ? null : data);
            }
          } catch (e) {
            reject(e);
          }
        });
      }
      async downloadToBuffer(url, options) {
        return await options.cancellationToken.createPromise((resolve6, reject, onCancel) => {
          const responseChunks = [];
          const requestOptions = {
            headers: options.headers || void 0,
            // because PrivateGitHubProvider requires HttpExecutor.prepareRedirectUrlOptions logic, so, we need to redirect manually
            redirect: "manual"
          };
          configureRequestUrl(url, requestOptions);
          configureRequestOptions(requestOptions);
          this.doDownload(requestOptions, {
            destination: null,
            options,
            onCancel,
            callback: (error) => {
              if (error == null) {
                resolve6(Buffer.concat(responseChunks));
              } else {
                reject(error);
              }
            },
            responseHandler: (response, callback) => {
              let receivedLength = 0;
              response.on("data", (chunk) => {
                receivedLength += chunk.length;
                if (receivedLength > 524288e3) {
                  callback(new Error("Maximum allowed size is 500 MB"));
                  return;
                }
                responseChunks.push(chunk);
              });
              response.on("end", () => {
                callback(null);
              });
            }
          }, 0);
        });
      }
      doDownload(requestOptions, options, redirectCount) {
        const request = this.createRequest(requestOptions, (response) => {
          if (response.statusCode >= 400) {
            options.callback(new Error(`Cannot download "${requestOptions.protocol || "https:"}//${requestOptions.hostname}${requestOptions.path}", status ${response.statusCode}: ${response.statusMessage}`));
            return;
          }
          response.on("error", options.callback);
          const redirectUrl = safeGetHeader(response, "location");
          if (redirectUrl != null) {
            if (redirectCount < this.maxRedirects) {
              this.doDownload(_HttpExecutor.prepareRedirectUrlOptions(redirectUrl, requestOptions), options, redirectCount++);
            } else {
              options.callback(this.createMaxRedirectError());
            }
            return;
          }
          if (options.responseHandler == null) {
            configurePipes(options, response);
          } else {
            options.responseHandler(response, options.callback);
          }
        });
        this.addErrorAndTimeoutHandlers(request, options.callback, requestOptions.timeout);
        this.addRedirectHandlers(request, requestOptions, options.callback, redirectCount, (requestOptions2) => {
          this.doDownload(requestOptions2, options, redirectCount++);
        });
        request.end();
      }
      createMaxRedirectError() {
        return new Error(`Too many redirects (> ${this.maxRedirects})`);
      }
      addTimeOutHandler(request, callback, timeout) {
        request.on("socket", (socket) => {
          socket.setTimeout(timeout, () => {
            request.abort();
            callback(new Error("Request timed out"));
          });
        });
      }
      static prepareRedirectUrlOptions(redirectUrl, options) {
        const newOptions = configureRequestOptionsFromUrl(redirectUrl, { ...options });
        const headers = newOptions.headers;
        if (headers == null) {
          return newOptions;
        }
        const originalUrl = _HttpExecutor.reconstructOriginalUrl(options);
        const parsedRedirectUrl = parseUrl(redirectUrl, options);
        if (_HttpExecutor.isCrossOriginRedirect(originalUrl, parsedRedirectUrl)) {
          if (debug.enabled) {
            debug(`Cross-origin redirect (${originalUrl.host} \u2192 ${parsedRedirectUrl.host}): stripping sensitive headers`);
          }
          for (const key of Object.keys(headers)) {
            if (SENSITIVE_REDIRECT_HEADERS.has(normalizeName(key))) {
              delete headers[key];
            }
          }
        }
        return newOptions;
      }
      static reconstructOriginalUrl(options) {
        const protocol = options.protocol || "https:";
        if (!options.hostname) {
          throw new Error("Missing hostname in request options");
        }
        const hostname = options.hostname;
        const port = options.port ? `:${options.port}` : "";
        const path3 = options.path || "/";
        return new url_1.URL(`${protocol}//${hostname}${port}${path3}`);
      }
      static isCrossOriginRedirect(originalUrl, redirectUrl) {
        if (originalUrl.hostname.toLowerCase() !== redirectUrl.hostname.toLowerCase()) {
          return true;
        }
        if (originalUrl.protocol === "http:" && // This can be replaced with `!originalUrl.port`, but for the sake of clarity.
        ["80", ""].includes(originalUrl.port) && redirectUrl.protocol === "https:" && // This can be replaced with `!redirectUrl.port`, but for the sake of clarity.
        ["443", ""].includes(redirectUrl.port)) {
          return false;
        }
        if (originalUrl.protocol !== redirectUrl.protocol) {
          return true;
        }
        const originalPort = originalUrl.port;
        const redirectPort = redirectUrl.port;
        return originalPort !== redirectPort;
      }
      static async retryOnServerError(task, maxRetries = 3) {
        for (let attemptNumber = 0; ; attemptNumber++) {
          try {
            return await task();
          } catch (e) {
            if (attemptNumber < maxRetries && (e instanceof HttpError && e.isServerError() || e.code === "EPIPE")) {
              await new Promise((r) => setTimeout(r, 1e3 * (attemptNumber + 1)));
              continue;
            }
            throw e;
          }
        }
      }
    };
    exports2.HttpExecutor = HttpExecutor;
    function parseUrl(url, options) {
      try {
        return new url_1.URL(url);
      } catch {
        const hostname = options.hostname;
        const protocol = options.protocol || "https:";
        const port = options.port ? `:${options.port}` : "";
        const baseUrl = `${protocol}//${hostname}${port}`;
        return new url_1.URL(url, baseUrl);
      }
    }
    function configureRequestOptionsFromUrl(url, options) {
      const result = configureRequestOptions(options);
      const parsedUrl = parseUrl(url, options);
      configureRequestUrl(parsedUrl, result);
      return result;
    }
    function configureRequestUrl(url, options) {
      options.protocol = url.protocol;
      options.hostname = url.hostname;
      if (url.port) {
        options.port = url.port;
      } else if (options.port) {
        delete options.port;
      }
      options.path = url.pathname + url.search;
    }
    var DigestTransform = class extends stream_1.Transform {
      // noinspection JSUnusedGlobalSymbols
      get actual() {
        return this._actual;
      }
      constructor(expected, algorithm = "sha512", encoding = "base64") {
        super();
        this.expected = expected;
        this.algorithm = algorithm;
        this.encoding = encoding;
        this._actual = null;
        this.isValidateOnEnd = true;
        this.digester = (0, crypto_1.createHash)(algorithm);
      }
      // noinspection JSUnusedGlobalSymbols
      _transform(chunk, encoding, callback) {
        this.digester.update(chunk);
        callback(null, chunk);
      }
      // noinspection JSUnusedGlobalSymbols
      _flush(callback) {
        this._actual = this.digester.digest(this.encoding);
        if (this.isValidateOnEnd) {
          try {
            this.validate();
          } catch (e) {
            callback(e);
            return;
          }
        }
        callback(null);
      }
      validate() {
        if (this._actual == null) {
          throw (0, error_1.newError)("Not finished yet", "ERR_STREAM_NOT_FINISHED");
        }
        if (this._actual !== this.expected) {
          throw (0, error_1.newError)(`${this.algorithm} checksum mismatch, expected ${this.expected}, got ${this._actual}`, "ERR_CHECKSUM_MISMATCH");
        }
        return null;
      }
    };
    exports2.DigestTransform = DigestTransform;
    function checkSha2(sha2Header, sha2, callback) {
      if (sha2Header != null && sha2 != null && sha2Header !== sha2) {
        callback(new Error(`checksum mismatch: expected ${sha2} but got ${sha2Header} (X-Checksum-Sha2 header)`));
        return false;
      }
      return true;
    }
    function safeGetHeader(response, headerKey) {
      const value = response.headers[headerKey];
      if (value == null) {
        return null;
      } else if (Array.isArray(value)) {
        return value.length === 0 ? null : value[value.length - 1];
      } else {
        return value;
      }
    }
    function configurePipes(options, response) {
      if (!checkSha2(safeGetHeader(response, "X-Checksum-Sha2"), options.options.sha2, options.callback)) {
        return;
      }
      const streams = [];
      if (options.options.onProgress != null) {
        const contentLength = safeGetHeader(response, "content-length");
        if (contentLength != null) {
          streams.push(new ProgressCallbackTransform_1.ProgressCallbackTransform(parseInt(contentLength, 10), options.options.cancellationToken, options.options.onProgress));
        }
      }
      const sha512 = options.options.sha512;
      if (sha512 != null) {
        streams.push(new DigestTransform(sha512, "sha512", sha512.length === 128 && !sha512.includes("+") && !sha512.includes("Z") && !sha512.includes("=") ? "hex" : "base64"));
      } else if (options.options.sha2 != null) {
        streams.push(new DigestTransform(options.options.sha2, "sha256", "hex"));
      }
      const fileOut = (0, fs_1.createWriteStream)(options.destination);
      streams.push(fileOut);
      let lastStream = response;
      for (const stream of streams) {
        stream.on("error", (error) => {
          fileOut.close();
          if (!options.options.cancellationToken.cancelled) {
            options.callback(error);
          }
        });
        lastStream = lastStream.pipe(stream);
      }
      fileOut.on("finish", () => {
        ;
        fileOut.close(options.callback);
      });
    }
    function configureRequestOptions(options, token, method) {
      if (method != null) {
        options.method = method;
      }
      options.headers = { ...options.headers };
      const headers = options.headers;
      if (token != null) {
        ;
        headers.authorization = token.startsWith("Basic") || token.startsWith("Bearer") ? token : `token ${token}`;
      }
      if (headers["User-Agent"] == null) {
        headers["User-Agent"] = "electron-builder";
      }
      if (method == null || method === "GET" || headers["Cache-Control"] == null) {
        headers["Cache-Control"] = "no-cache";
      }
      if (options.protocol == null && process.versions.electron != null) {
        options.protocol = "https:";
      }
      return options;
    }
    function isSensitiveFieldName(name) {
      const normalized = normalizeName(name);
      return SENSITIVE_FIELD_PATTERNS.some((p) => normalized.includes(p)) || SENSITIVE_FIELD_SUFFIXES.some((s) => normalized.endsWith(s));
    }
    function hashSensitiveValue(value) {
      return `${(0, crypto_1.createHash)("sha256").update(value).digest("hex")} (sha256 hash)`;
    }
    function safeStringifyJson(data, skippedNames) {
      return JSON.stringify(data, (name, value) => {
        if (isSensitiveFieldName(name) || skippedNames != null && skippedNames.has(name)) {
          return typeof value === "string" ? hashSensitiveValue(value) : "<stripped sensitive data>";
        }
        return value;
      }, 2);
    }
  }
});

// node_modules/builder-util-runtime/out/MemoLazy.js
var require_MemoLazy = __commonJS({
  "node_modules/builder-util-runtime/out/MemoLazy.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.MemoLazy = void 0;
    var MemoLazy = class {
      constructor(selector, creator) {
        this.selector = selector;
        this.creator = creator;
        this.selected = void 0;
        this._value = void 0;
      }
      get hasValue() {
        return this._value !== void 0;
      }
      get value() {
        const selected = this.selector();
        if (this._value !== void 0 && equals(this.selected, selected)) {
          return this._value;
        }
        this.selected = selected;
        const result = this.creator(selected);
        this.value = result;
        return result;
      }
      set value(value) {
        this._value = value;
      }
    };
    exports2.MemoLazy = MemoLazy;
    function equals(firstValue, secondValue) {
      const isFirstObject = typeof firstValue === "object" && firstValue !== null;
      const isSecondObject = typeof secondValue === "object" && secondValue !== null;
      if (isFirstObject && isSecondObject) {
        const keys1 = Object.keys(firstValue);
        const keys2 = Object.keys(secondValue);
        return keys1.length === keys2.length && keys1.every((key) => equals(firstValue[key], secondValue[key]));
      }
      return firstValue === secondValue;
    }
  }
});

// node_modules/builder-util-runtime/out/publishOptions.js
var require_publishOptions = __commonJS({
  "node_modules/builder-util-runtime/out/publishOptions.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.githubUrl = githubUrl;
    exports2.githubTagPrefix = githubTagPrefix;
    exports2.getS3LikeProviderBaseUrl = getS3LikeProviderBaseUrl;
    function githubUrl(options, defaultHost = "github.com") {
      return `${options.protocol || "https"}://${options.host || defaultHost}`;
    }
    function githubTagPrefix(options) {
      var _a;
      if (options.tagNamePrefix) {
        return options.tagNamePrefix;
      }
      if ((_a = options.vPrefixedTagName) !== null && _a !== void 0 ? _a : true) {
        return "v";
      }
      return "";
    }
    function getS3LikeProviderBaseUrl(configuration) {
      const provider = configuration.provider;
      if (provider === "s3") {
        return s3Url(configuration);
      }
      if (provider === "spaces") {
        return spacesUrl(configuration);
      }
      throw new Error(`Not supported provider: ${provider}`);
    }
    function s3Url(options) {
      let url;
      if (options.accelerate == true) {
        url = `https://${options.bucket}.s3-accelerate.amazonaws.com`;
      } else if (options.endpoint != null) {
        url = `${options.endpoint}/${options.bucket}`;
      } else if (options.bucket.includes(".")) {
        if (options.region == null) {
          throw new Error(`Bucket name "${options.bucket}" includes a dot, but S3 region is missing`);
        }
        if (options.region === "us-east-1") {
          url = `https://s3.amazonaws.com/${options.bucket}`;
        } else {
          url = `https://s3-${options.region}.amazonaws.com/${options.bucket}`;
        }
      } else if (options.region === "cn-north-1") {
        url = `https://${options.bucket}.s3.${options.region}.amazonaws.com.cn`;
      } else {
        url = `https://${options.bucket}.s3.amazonaws.com`;
      }
      return appendPath(url, options.path);
    }
    function appendPath(url, p) {
      if (p != null && p.length > 0) {
        if (!p.startsWith("/")) {
          url += "/";
        }
        url += p;
      }
      return url;
    }
    function spacesUrl(options) {
      if (options.name == null) {
        throw new Error(`name is missing`);
      }
      if (options.region == null) {
        throw new Error(`region is missing`);
      }
      return appendPath(`https://${options.name}.${options.region}.digitaloceanspaces.com`, options.path);
    }
  }
});

// node_modules/builder-util-runtime/out/retry.js
var require_retry = __commonJS({
  "node_modules/builder-util-runtime/out/retry.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.retry = retry;
    var CancellationToken_1 = require_CancellationToken();
    async function retry(task, options) {
      var _a;
      const { retries: retryCount, interval, backoff = 0, attempt = 0, shouldRetry, cancellationToken = new CancellationToken_1.CancellationToken() } = options;
      try {
        return await task();
      } catch (error) {
        if (await Promise.resolve((_a = shouldRetry === null || shouldRetry === void 0 ? void 0 : shouldRetry(error)) !== null && _a !== void 0 ? _a : true) && retryCount > 0 && !cancellationToken.cancelled) {
          await new Promise((resolve6) => setTimeout(resolve6, interval + backoff * attempt));
          return await retry(task, { ...options, retries: retryCount - 1, attempt: attempt + 1 });
        } else {
          throw error;
        }
      }
    }
  }
});

// node_modules/builder-util-runtime/out/rfc2253Parser.js
var require_rfc2253Parser = __commonJS({
  "node_modules/builder-util-runtime/out/rfc2253Parser.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.parseDn = parseDn;
    function parseDn(seq) {
      let quoted = false;
      let key = null;
      let token = "";
      let nextNonSpace = 0;
      seq = seq.trim();
      const result = /* @__PURE__ */ new Map();
      for (let i = 0; i <= seq.length; i++) {
        if (i === seq.length) {
          if (key !== null) {
            result.set(key, token);
          }
          break;
        }
        const ch = seq[i];
        if (quoted) {
          if (ch === '"') {
            quoted = false;
            continue;
          }
        } else {
          if (ch === '"') {
            quoted = true;
            continue;
          }
          if (ch === "\\") {
            i++;
            const ord = parseInt(seq.slice(i, i + 2), 16);
            if (Number.isNaN(ord)) {
              token += seq[i];
            } else {
              i++;
              token += String.fromCharCode(ord);
            }
            continue;
          }
          if (key === null && ch === "=") {
            key = token;
            token = "";
            continue;
          }
          if (ch === "," || ch === ";" || ch === "+") {
            if (key !== null) {
              result.set(key, token);
            }
            key = null;
            token = "";
            continue;
          }
        }
        if (ch === " " && !quoted) {
          if (token.length === 0) {
            continue;
          }
          if (i > nextNonSpace) {
            let j = i;
            while (seq[j] === " ") {
              j++;
            }
            nextNonSpace = j;
          }
          if (nextNonSpace >= seq.length || seq[nextNonSpace] === "," || seq[nextNonSpace] === ";" || key === null && seq[nextNonSpace] === "=" || key !== null && seq[nextNonSpace] === "+") {
            i = nextNonSpace - 1;
            continue;
          }
        }
        token += ch;
      }
      return result;
    }
  }
});

// node_modules/builder-util-runtime/out/uuid.js
var require_uuid = __commonJS({
  "node_modules/builder-util-runtime/out/uuid.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.nil = exports2.UUID = void 0;
    var crypto_1 = require("crypto");
    var error_1 = require_error();
    var invalidName = "options.name must be either a string or a Buffer";
    var randomHost = (0, crypto_1.randomBytes)(16);
    randomHost[0] = randomHost[0] | 1;
    var hex2byte = {};
    var byte2hex = [];
    for (let i = 0; i < 256; i++) {
      const hex = (i + 256).toString(16).substr(1);
      hex2byte[hex] = i;
      byte2hex[i] = hex;
    }
    var UUID = class _UUID {
      constructor(uuid) {
        this.ascii = null;
        this.binary = null;
        const check = _UUID.check(uuid);
        if (!check) {
          throw new Error("not a UUID");
        }
        this.version = check.version;
        if (check.format === "ascii") {
          this.ascii = uuid;
        } else {
          this.binary = uuid;
        }
      }
      static v5(name, namespace) {
        return uuidNamed(name, "sha1", 80, namespace);
      }
      toString() {
        if (this.ascii == null) {
          this.ascii = stringify(this.binary);
        }
        return this.ascii;
      }
      inspect() {
        return `UUID v${this.version} ${this.toString()}`;
      }
      static check(uuid, offset = 0) {
        if (typeof uuid === "string") {
          uuid = uuid.toLowerCase();
          if (!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-([a-f0-9]{12})$/.test(uuid)) {
            return false;
          }
          if (uuid === "00000000-0000-0000-0000-000000000000") {
            return { version: void 0, variant: "nil", format: "ascii" };
          }
          return {
            version: (hex2byte[uuid[14] + uuid[15]] & 240) >> 4,
            variant: getVariant((hex2byte[uuid[19] + uuid[20]] & 224) >> 5),
            format: "ascii"
          };
        }
        if (Buffer.isBuffer(uuid)) {
          if (uuid.length < offset + 16) {
            return false;
          }
          let i = 0;
          for (; i < 16; i++) {
            if (uuid[offset + i] !== 0) {
              break;
            }
          }
          if (i === 16) {
            return { version: void 0, variant: "nil", format: "binary" };
          }
          return {
            version: (uuid[offset + 6] & 240) >> 4,
            variant: getVariant((uuid[offset + 8] & 224) >> 5),
            format: "binary"
          };
        }
        throw (0, error_1.newError)("Unknown type of uuid", "ERR_UNKNOWN_UUID_TYPE");
      }
      // read stringified uuid into a Buffer
      static parse(input) {
        const buffer = Buffer.allocUnsafe(16);
        let j = 0;
        for (let i = 0; i < 16; i++) {
          buffer[i] = hex2byte[input[j++] + input[j++]];
          if (i === 3 || i === 5 || i === 7 || i === 9) {
            j += 1;
          }
        }
        return buffer;
      }
    };
    exports2.UUID = UUID;
    UUID.OID = UUID.parse("6ba7b812-9dad-11d1-80b4-00c04fd430c8");
    function getVariant(bits) {
      switch (bits) {
        case 0:
        case 1:
        case 3:
          return "ncs";
        case 4:
        case 5:
          return "rfc4122";
        case 6:
          return "microsoft";
        default:
          return "future";
      }
    }
    var UuidEncoding;
    (function(UuidEncoding2) {
      UuidEncoding2[UuidEncoding2["ASCII"] = 0] = "ASCII";
      UuidEncoding2[UuidEncoding2["BINARY"] = 1] = "BINARY";
      UuidEncoding2[UuidEncoding2["OBJECT"] = 2] = "OBJECT";
    })(UuidEncoding || (UuidEncoding = {}));
    function uuidNamed(name, hashMethod, version, namespace, encoding = UuidEncoding.ASCII) {
      const hash = (0, crypto_1.createHash)(hashMethod);
      const nameIsNotAString = typeof name !== "string";
      if (nameIsNotAString && !Buffer.isBuffer(name)) {
        throw (0, error_1.newError)(invalidName, "ERR_INVALID_UUID_NAME");
      }
      hash.update(namespace);
      hash.update(name);
      const buffer = hash.digest();
      let result;
      switch (encoding) {
        case UuidEncoding.BINARY:
          buffer[6] = buffer[6] & 15 | version;
          buffer[8] = buffer[8] & 63 | 128;
          result = buffer;
          break;
        case UuidEncoding.OBJECT:
          buffer[6] = buffer[6] & 15 | version;
          buffer[8] = buffer[8] & 63 | 128;
          result = new UUID(buffer);
          break;
        default:
          result = byte2hex[buffer[0]] + byte2hex[buffer[1]] + byte2hex[buffer[2]] + byte2hex[buffer[3]] + "-" + byte2hex[buffer[4]] + byte2hex[buffer[5]] + "-" + byte2hex[buffer[6] & 15 | version] + byte2hex[buffer[7]] + "-" + byte2hex[buffer[8] & 63 | 128] + byte2hex[buffer[9]] + "-" + byte2hex[buffer[10]] + byte2hex[buffer[11]] + byte2hex[buffer[12]] + byte2hex[buffer[13]] + byte2hex[buffer[14]] + byte2hex[buffer[15]];
          break;
      }
      return result;
    }
    function stringify(buffer) {
      return byte2hex[buffer[0]] + byte2hex[buffer[1]] + byte2hex[buffer[2]] + byte2hex[buffer[3]] + "-" + byte2hex[buffer[4]] + byte2hex[buffer[5]] + "-" + byte2hex[buffer[6]] + byte2hex[buffer[7]] + "-" + byte2hex[buffer[8]] + byte2hex[buffer[9]] + "-" + byte2hex[buffer[10]] + byte2hex[buffer[11]] + byte2hex[buffer[12]] + byte2hex[buffer[13]] + byte2hex[buffer[14]] + byte2hex[buffer[15]];
    }
    exports2.nil = new UUID("00000000-0000-0000-0000-000000000000");
  }
});

// node_modules/sax/lib/sax.js
var require_sax = __commonJS({
  "node_modules/sax/lib/sax.js"(exports2) {
    (function(sax) {
      sax.parser = function(strict, opt) {
        return new SAXParser(strict, opt);
      };
      sax.SAXParser = SAXParser;
      sax.SAXStream = SAXStream;
      sax.createStream = createStream;
      sax.MAX_BUFFER_LENGTH = 64 * 1024;
      var buffers = [
        "comment",
        "sgmlDecl",
        "textNode",
        "tagName",
        "doctype",
        "procInstName",
        "procInstBody",
        "entity",
        "attribName",
        "attribValue",
        "cdata",
        "script"
      ];
      sax.EVENTS = [
        "text",
        "processinginstruction",
        "sgmldeclaration",
        "doctype",
        "comment",
        "opentagstart",
        "attribute",
        "opentag",
        "closetag",
        "opencdata",
        "cdata",
        "closecdata",
        "error",
        "end",
        "ready",
        "script",
        "opennamespace",
        "closenamespace"
      ];
      function SAXParser(strict, opt) {
        if (!(this instanceof SAXParser)) {
          return new SAXParser(strict, opt);
        }
        var parser = this;
        clearBuffers(parser);
        parser.q = parser.c = "";
        parser.bufferCheckPosition = sax.MAX_BUFFER_LENGTH;
        parser.encoding = null;
        parser.opt = opt || {};
        parser.opt.lowercase = parser.opt.lowercase || parser.opt.lowercasetags;
        parser.looseCase = parser.opt.lowercase ? "toLowerCase" : "toUpperCase";
        parser.opt.maxEntityCount = parser.opt.maxEntityCount || 512;
        parser.opt.maxEntityDepth = parser.opt.maxEntityDepth || 4;
        parser.entityCount = parser.entityDepth = 0;
        parser.tags = [];
        parser.closed = parser.closedRoot = parser.sawRoot = false;
        parser.tag = parser.error = null;
        parser.strict = !!strict;
        parser.noscript = !!(strict || parser.opt.noscript);
        parser.state = S.BEGIN;
        parser.strictEntities = parser.opt.strictEntities;
        parser.ENTITIES = parser.strictEntities ? Object.create(sax.XML_ENTITIES) : Object.create(sax.ENTITIES);
        parser.attribList = [];
        if (parser.opt.xmlns) {
          parser.ns = Object.create(rootNS);
        }
        if (parser.opt.unquotedAttributeValues === void 0) {
          parser.opt.unquotedAttributeValues = !strict;
        }
        parser.trackPosition = parser.opt.position !== false;
        if (parser.trackPosition) {
          parser.position = parser.line = parser.column = 0;
        }
        emit(parser, "onready");
      }
      if (!Object.create) {
        Object.create = function(o) {
          function F() {
          }
          F.prototype = o;
          var newf = new F();
          return newf;
        };
      }
      if (!Object.keys) {
        Object.keys = function(o) {
          var a = [];
          for (var i in o) if (o.hasOwnProperty(i)) a.push(i);
          return a;
        };
      }
      function checkBufferLength(parser) {
        var maxAllowed = Math.max(sax.MAX_BUFFER_LENGTH, 10);
        var maxActual = 0;
        for (var i = 0, l = buffers.length; i < l; i++) {
          var len = parser[buffers[i]].length;
          if (len > maxAllowed) {
            switch (buffers[i]) {
              case "textNode":
                closeText(parser);
                break;
              case "cdata":
                emitNode(parser, "oncdata", parser.cdata);
                parser.cdata = "";
                break;
              case "script":
                emitNode(parser, "onscript", parser.script);
                parser.script = "";
                break;
              default:
                error(parser, "Max buffer length exceeded: " + buffers[i]);
            }
          }
          maxActual = Math.max(maxActual, len);
        }
        var m = sax.MAX_BUFFER_LENGTH - maxActual;
        parser.bufferCheckPosition = m + parser.position;
      }
      function clearBuffers(parser) {
        for (var i = 0, l = buffers.length; i < l; i++) {
          parser[buffers[i]] = "";
        }
      }
      function flushBuffers(parser) {
        closeText(parser);
        if (parser.cdata !== "") {
          emitNode(parser, "oncdata", parser.cdata);
          parser.cdata = "";
        }
        if (parser.script !== "") {
          emitNode(parser, "onscript", parser.script);
          parser.script = "";
        }
      }
      SAXParser.prototype = {
        end: function() {
          end(this);
        },
        write,
        resume: function() {
          this.error = null;
          return this;
        },
        close: function() {
          return this.write(null);
        },
        flush: function() {
          flushBuffers(this);
        }
      };
      var Stream;
      try {
        Stream = require("stream").Stream;
      } catch (ex) {
        Stream = function() {
        };
      }
      if (!Stream) Stream = function() {
      };
      var streamWraps = sax.EVENTS.filter(function(ev) {
        return ev !== "error" && ev !== "end";
      });
      function createStream(strict, opt) {
        return new SAXStream(strict, opt);
      }
      function determineBufferEncoding(data, isEnd) {
        if (data.length >= 2) {
          if (data[0] === 255 && data[1] === 254) {
            return "utf-16le";
          }
          if (data[0] === 254 && data[1] === 255) {
            return "utf-16be";
          }
        }
        if (data.length >= 3 && data[0] === 239 && data[1] === 187 && data[2] === 191) {
          return "utf8";
        }
        if (data.length >= 4) {
          if (data[0] === 60 && data[1] === 0 && data[2] === 63 && data[3] === 0) {
            return "utf-16le";
          }
          if (data[0] === 0 && data[1] === 60 && data[2] === 0 && data[3] === 63) {
            return "utf-16be";
          }
          return "utf8";
        }
        return isEnd ? "utf8" : null;
      }
      function SAXStream(strict, opt) {
        if (!(this instanceof SAXStream)) {
          return new SAXStream(strict, opt);
        }
        Stream.apply(this);
        this._parser = new SAXParser(strict, opt);
        this.writable = true;
        this.readable = true;
        var me = this;
        this._parser.onend = function() {
          me.emit("end");
        };
        this._parser.onerror = function(er) {
          me.emit("error", er);
          me._parser.error = null;
        };
        this._decoder = null;
        this._decoderBuffer = null;
        streamWraps.forEach(function(ev) {
          Object.defineProperty(me, "on" + ev, {
            get: function() {
              return me._parser["on" + ev];
            },
            set: function(h) {
              if (!h) {
                me.removeAllListeners(ev);
                me._parser["on" + ev] = h;
                return h;
              }
              me.on(ev, h);
            },
            enumerable: true,
            configurable: false
          });
        });
      }
      SAXStream.prototype = Object.create(Stream.prototype, {
        constructor: {
          value: SAXStream
        }
      });
      SAXStream.prototype._decodeBuffer = function(data, isEnd) {
        if (this._decoderBuffer) {
          data = Buffer.concat([this._decoderBuffer, data]);
          this._decoderBuffer = null;
        }
        if (!this._decoder) {
          var encoding = determineBufferEncoding(data, isEnd);
          if (!encoding) {
            this._decoderBuffer = data;
            return "";
          }
          this._parser.encoding = encoding;
          this._decoder = new TextDecoder(encoding);
        }
        return this._decoder.decode(data, { stream: !isEnd });
      };
      SAXStream.prototype.write = function(data) {
        if (typeof Buffer === "function" && typeof Buffer.isBuffer === "function" && Buffer.isBuffer(data)) {
          data = this._decodeBuffer(data, false);
        } else if (this._decoderBuffer) {
          var remaining = this._decodeBuffer(Buffer.alloc(0), true);
          if (remaining) {
            this._parser.write(remaining);
            this.emit("data", remaining);
          }
        }
        this._parser.write(data.toString());
        this.emit("data", data);
        return true;
      };
      SAXStream.prototype.end = function(chunk) {
        if (chunk && chunk.length) {
          this.write(chunk);
        }
        if (this._decoderBuffer) {
          var finalChunk = this._decodeBuffer(Buffer.alloc(0), true);
          if (finalChunk) {
            this._parser.write(finalChunk);
            this.emit("data", finalChunk);
          }
        } else if (this._decoder) {
          var remaining = this._decoder.decode();
          if (remaining) {
            this._parser.write(remaining);
            this.emit("data", remaining);
          }
        }
        this._parser.end();
        return true;
      };
      SAXStream.prototype.on = function(ev, handler) {
        var me = this;
        if (!me._parser["on" + ev] && streamWraps.indexOf(ev) !== -1) {
          me._parser["on" + ev] = function() {
            var args = arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments);
            args.splice(0, 0, ev);
            me.emit.apply(me, args);
          };
        }
        return Stream.prototype.on.call(me, ev, handler);
      };
      var CDATAre = /^\[CDATA\[$/i;
      var DOCTYPEre = /^DOCTYPE$/i;
      var XML_NAMESPACE = "http://www.w3.org/XML/1998/namespace";
      var XMLNS_NAMESPACE = "http://www.w3.org/2000/xmlns/";
      var rootNS = { xml: XML_NAMESPACE, xmlns: XMLNS_NAMESPACE };
      var nameStart = /[:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/;
      var nameBody = /[:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u00B7\u0300-\u036F\u203F-\u2040.\d-]/;
      var entityStart = /[#:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/;
      var entityBody = /[#:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u00B7\u0300-\u036F\u203F-\u2040.\d-]/;
      function isWhitespace(c) {
        return c === " " || c === "\n" || c === "\r" || c === "	";
      }
      function isQuote(c) {
        return c === '"' || c === "'";
      }
      function isAttribEnd(c) {
        return c === ">" || isWhitespace(c);
      }
      function isMatch(regex, c) {
        return regex.test(c);
      }
      function notMatch(regex, c) {
        return !isMatch(regex, c);
      }
      var S = 0;
      sax.STATE = {
        BEGIN: S++,
        // leading byte order mark or whitespace
        BEGIN_WHITESPACE: S++,
        // leading whitespace
        TEXT: S++,
        // general stuff
        TEXT_ENTITY: S++,
        // &amp and such.
        OPEN_WAKA: S++,
        // <
        SGML_DECL: S++,
        // <!BLARG
        SGML_DECL_QUOTED: S++,
        // <!BLARG foo "bar
        DOCTYPE: S++,
        // <!DOCTYPE
        DOCTYPE_QUOTED: S++,
        // <!DOCTYPE "//blah
        DOCTYPE_DTD: S++,
        // <!DOCTYPE "//blah" [ ...
        DOCTYPE_DTD_QUOTED: S++,
        // <!DOCTYPE "//blah" [ "foo
        COMMENT_STARTING: S++,
        // <!-
        COMMENT: S++,
        // <!--
        COMMENT_ENDING: S++,
        // <!-- blah -
        COMMENT_ENDED: S++,
        // <!-- blah --
        CDATA: S++,
        // <![CDATA[ something
        CDATA_ENDING: S++,
        // ]
        CDATA_ENDING_2: S++,
        // ]]
        PROC_INST: S++,
        // <?hi
        PROC_INST_BODY: S++,
        // <?hi there
        PROC_INST_ENDING: S++,
        // <?hi "there" ?
        OPEN_TAG: S++,
        // <strong
        OPEN_TAG_SLASH: S++,
        // <strong /
        ATTRIB: S++,
        // <a
        ATTRIB_NAME: S++,
        // <a foo
        ATTRIB_NAME_SAW_WHITE: S++,
        // <a foo _
        ATTRIB_VALUE: S++,
        // <a foo=
        ATTRIB_VALUE_QUOTED: S++,
        // <a foo="bar
        ATTRIB_VALUE_CLOSED: S++,
        // <a foo="bar"
        ATTRIB_VALUE_UNQUOTED: S++,
        // <a foo=bar
        ATTRIB_VALUE_ENTITY_Q: S++,
        // <foo bar="&quot;"
        ATTRIB_VALUE_ENTITY_U: S++,
        // <foo bar=&quot
        CLOSE_TAG: S++,
        // </a
        CLOSE_TAG_SAW_WHITE: S++,
        // </a   >
        SCRIPT: S++,
        // <script> ...
        SCRIPT_ENDING: S++
        // <script> ... <
      };
      sax.XML_ENTITIES = Object.assign(/* @__PURE__ */ Object.create(null), {
        amp: "&",
        gt: ">",
        lt: "<",
        quot: '"',
        apos: "'"
      });
      sax.ENTITIES = Object.assign(/* @__PURE__ */ Object.create(null), {
        amp: "&",
        gt: ">",
        lt: "<",
        quot: '"',
        apos: "'",
        AElig: 198,
        Aacute: 193,
        Acirc: 194,
        Agrave: 192,
        Aring: 197,
        Atilde: 195,
        Auml: 196,
        Ccedil: 199,
        ETH: 208,
        Eacute: 201,
        Ecirc: 202,
        Egrave: 200,
        Euml: 203,
        Iacute: 205,
        Icirc: 206,
        Igrave: 204,
        Iuml: 207,
        Ntilde: 209,
        Oacute: 211,
        Ocirc: 212,
        Ograve: 210,
        Oslash: 216,
        Otilde: 213,
        Ouml: 214,
        THORN: 222,
        Uacute: 218,
        Ucirc: 219,
        Ugrave: 217,
        Uuml: 220,
        Yacute: 221,
        aacute: 225,
        acirc: 226,
        aelig: 230,
        agrave: 224,
        aring: 229,
        atilde: 227,
        auml: 228,
        ccedil: 231,
        eacute: 233,
        ecirc: 234,
        egrave: 232,
        eth: 240,
        euml: 235,
        iacute: 237,
        icirc: 238,
        igrave: 236,
        iuml: 239,
        ntilde: 241,
        oacute: 243,
        ocirc: 244,
        ograve: 242,
        oslash: 248,
        otilde: 245,
        ouml: 246,
        szlig: 223,
        thorn: 254,
        uacute: 250,
        ucirc: 251,
        ugrave: 249,
        uuml: 252,
        yacute: 253,
        yuml: 255,
        copy: 169,
        reg: 174,
        nbsp: 160,
        iexcl: 161,
        cent: 162,
        pound: 163,
        curren: 164,
        yen: 165,
        brvbar: 166,
        sect: 167,
        uml: 168,
        ordf: 170,
        laquo: 171,
        not: 172,
        shy: 173,
        macr: 175,
        deg: 176,
        plusmn: 177,
        sup1: 185,
        sup2: 178,
        sup3: 179,
        acute: 180,
        micro: 181,
        para: 182,
        middot: 183,
        cedil: 184,
        ordm: 186,
        raquo: 187,
        frac14: 188,
        frac12: 189,
        frac34: 190,
        iquest: 191,
        times: 215,
        divide: 247,
        OElig: 338,
        oelig: 339,
        Scaron: 352,
        scaron: 353,
        Yuml: 376,
        fnof: 402,
        circ: 710,
        tilde: 732,
        Alpha: 913,
        Beta: 914,
        Gamma: 915,
        Delta: 916,
        Epsilon: 917,
        Zeta: 918,
        Eta: 919,
        Theta: 920,
        Iota: 921,
        Kappa: 922,
        Lambda: 923,
        Mu: 924,
        Nu: 925,
        Xi: 926,
        Omicron: 927,
        Pi: 928,
        Rho: 929,
        Sigma: 931,
        Tau: 932,
        Upsilon: 933,
        Phi: 934,
        Chi: 935,
        Psi: 936,
        Omega: 937,
        alpha: 945,
        beta: 946,
        gamma: 947,
        delta: 948,
        epsilon: 949,
        zeta: 950,
        eta: 951,
        theta: 952,
        iota: 953,
        kappa: 954,
        lambda: 955,
        mu: 956,
        nu: 957,
        xi: 958,
        omicron: 959,
        pi: 960,
        rho: 961,
        sigmaf: 962,
        sigma: 963,
        tau: 964,
        upsilon: 965,
        phi: 966,
        chi: 967,
        psi: 968,
        omega: 969,
        thetasym: 977,
        upsih: 978,
        piv: 982,
        ensp: 8194,
        emsp: 8195,
        thinsp: 8201,
        zwnj: 8204,
        zwj: 8205,
        lrm: 8206,
        rlm: 8207,
        ndash: 8211,
        mdash: 8212,
        lsquo: 8216,
        rsquo: 8217,
        sbquo: 8218,
        ldquo: 8220,
        rdquo: 8221,
        bdquo: 8222,
        dagger: 8224,
        Dagger: 8225,
        bull: 8226,
        hellip: 8230,
        permil: 8240,
        prime: 8242,
        Prime: 8243,
        lsaquo: 8249,
        rsaquo: 8250,
        oline: 8254,
        frasl: 8260,
        euro: 8364,
        image: 8465,
        weierp: 8472,
        real: 8476,
        trade: 8482,
        alefsym: 8501,
        larr: 8592,
        uarr: 8593,
        rarr: 8594,
        darr: 8595,
        harr: 8596,
        crarr: 8629,
        lArr: 8656,
        uArr: 8657,
        rArr: 8658,
        dArr: 8659,
        hArr: 8660,
        forall: 8704,
        part: 8706,
        exist: 8707,
        empty: 8709,
        nabla: 8711,
        isin: 8712,
        notin: 8713,
        ni: 8715,
        prod: 8719,
        sum: 8721,
        minus: 8722,
        lowast: 8727,
        radic: 8730,
        prop: 8733,
        infin: 8734,
        ang: 8736,
        and: 8743,
        or: 8744,
        cap: 8745,
        cup: 8746,
        int: 8747,
        there4: 8756,
        sim: 8764,
        cong: 8773,
        asymp: 8776,
        ne: 8800,
        equiv: 8801,
        le: 8804,
        ge: 8805,
        sub: 8834,
        sup: 8835,
        nsub: 8836,
        sube: 8838,
        supe: 8839,
        oplus: 8853,
        otimes: 8855,
        perp: 8869,
        sdot: 8901,
        lceil: 8968,
        rceil: 8969,
        lfloor: 8970,
        rfloor: 8971,
        lang: 9001,
        rang: 9002,
        loz: 9674,
        spades: 9824,
        clubs: 9827,
        hearts: 9829,
        diams: 9830
      });
      Object.keys(sax.ENTITIES).forEach(function(key) {
        var e = sax.ENTITIES[key];
        var s2 = typeof e === "number" ? String.fromCharCode(e) : e;
        sax.ENTITIES[key] = s2;
      });
      for (var s in sax.STATE) {
        sax.STATE[sax.STATE[s]] = s;
      }
      S = sax.STATE;
      function emit(parser, event, data) {
        parser[event] && parser[event](data);
      }
      function getDeclaredEncoding(body) {
        var match = body && body.match(/(?:^|\s)encoding\s*=\s*(['"])([^'"]+)\1/i);
        return match ? match[2] : null;
      }
      function normalizeEncodingName(encoding) {
        if (!encoding) {
          return null;
        }
        return encoding.toLowerCase().replace(/[^a-z0-9]/g, "");
      }
      function encodingsMatch(detectedEncoding, declaredEncoding) {
        const detected = normalizeEncodingName(detectedEncoding);
        const declared = normalizeEncodingName(declaredEncoding);
        if (!detected || !declared) {
          return true;
        }
        if (declared === "utf16") {
          return detected === "utf16le" || detected === "utf16be";
        }
        return detected === declared;
      }
      function validateXmlDeclarationEncoding(parser, data) {
        if (!parser.strict || !parser.encoding || !data || data.name !== "xml") {
          return;
        }
        var declaredEncoding = getDeclaredEncoding(data.body);
        if (declaredEncoding && !encodingsMatch(parser.encoding, declaredEncoding)) {
          strictFail(
            parser,
            "XML declaration encoding " + declaredEncoding + " does not match detected stream encoding " + parser.encoding.toUpperCase()
          );
        }
      }
      function emitNode(parser, nodeType, data) {
        if (parser.textNode) closeText(parser);
        emit(parser, nodeType, data);
      }
      function closeText(parser) {
        parser.textNode = textopts(parser.opt, parser.textNode);
        if (parser.textNode) emit(parser, "ontext", parser.textNode);
        parser.textNode = "";
      }
      function textopts(opt, text) {
        if (opt.trim) text = text.trim();
        if (opt.normalize) text = text.replace(/\s+/g, " ");
        return text;
      }
      function error(parser, er) {
        closeText(parser);
        if (parser.trackPosition) {
          er += "\nLine: " + parser.line + "\nColumn: " + parser.column + "\nChar: " + parser.c;
        }
        er = new Error(er);
        parser.error = er;
        emit(parser, "onerror", er);
        return parser;
      }
      function end(parser) {
        if (parser.sawRoot && !parser.closedRoot)
          strictFail(parser, "Unclosed root tag");
        if (parser.state !== S.BEGIN && parser.state !== S.BEGIN_WHITESPACE && parser.state !== S.TEXT) {
          error(parser, "Unexpected end");
        }
        closeText(parser);
        parser.c = "";
        parser.closed = true;
        emit(parser, "onend");
        SAXParser.call(parser, parser.strict, parser.opt);
        return parser;
      }
      function strictFail(parser, message) {
        if (typeof parser !== "object" || !(parser instanceof SAXParser)) {
          throw new Error("bad call to strictFail");
        }
        if (parser.strict) {
          error(parser, message);
        }
      }
      function newTag(parser) {
        if (!parser.strict) parser.tagName = parser.tagName[parser.looseCase]();
        var parent = parser.tags[parser.tags.length - 1] || parser;
        var tag = parser.tag = { name: parser.tagName, attributes: {} };
        if (parser.opt.xmlns) {
          tag.ns = parent.ns;
        }
        parser.attribList.length = 0;
        emitNode(parser, "onopentagstart", tag);
      }
      function qname(name, attribute) {
        var i = name.indexOf(":");
        var qualName = i < 0 ? ["", name] : name.split(":");
        var prefix = qualName[0];
        var local = qualName[1];
        if (attribute && name === "xmlns") {
          prefix = "xmlns";
          local = "";
        }
        return { prefix, local };
      }
      function attrib(parser) {
        if (!parser.strict) {
          parser.attribName = parser.attribName[parser.looseCase]();
        }
        if (parser.attribList.indexOf(parser.attribName) !== -1 || parser.tag.attributes.hasOwnProperty(parser.attribName)) {
          parser.attribName = parser.attribValue = "";
          return;
        }
        if (parser.opt.xmlns) {
          var qn = qname(parser.attribName, true);
          var prefix = qn.prefix;
          var local = qn.local;
          if (prefix === "xmlns") {
            if (local === "xml" && parser.attribValue !== XML_NAMESPACE) {
              strictFail(
                parser,
                "xml: prefix must be bound to " + XML_NAMESPACE + "\nActual: " + parser.attribValue
              );
            } else if (local === "xmlns" && parser.attribValue !== XMLNS_NAMESPACE) {
              strictFail(
                parser,
                "xmlns: prefix must be bound to " + XMLNS_NAMESPACE + "\nActual: " + parser.attribValue
              );
            } else {
              var tag = parser.tag;
              var parent = parser.tags[parser.tags.length - 1] || parser;
              if (tag.ns === parent.ns) {
                tag.ns = Object.create(parent.ns);
              }
              tag.ns[local] = parser.attribValue;
            }
          }
          parser.attribList.push([parser.attribName, parser.attribValue]);
        } else {
          parser.tag.attributes[parser.attribName] = parser.attribValue;
          emitNode(parser, "onattribute", {
            name: parser.attribName,
            value: parser.attribValue
          });
        }
        parser.attribName = parser.attribValue = "";
      }
      function openTag(parser, selfClosing) {
        if (parser.opt.xmlns) {
          var tag = parser.tag;
          var qn = qname(parser.tagName);
          tag.prefix = qn.prefix;
          tag.local = qn.local;
          tag.uri = tag.ns[qn.prefix] || "";
          if (tag.prefix && !tag.uri) {
            strictFail(
              parser,
              "Unbound namespace prefix: " + JSON.stringify(parser.tagName)
            );
            tag.uri = qn.prefix;
          }
          var parent = parser.tags[parser.tags.length - 1] || parser;
          if (tag.ns && parent.ns !== tag.ns) {
            Object.keys(tag.ns).forEach(function(p) {
              emitNode(parser, "onopennamespace", {
                prefix: p,
                uri: tag.ns[p]
              });
            });
          }
          for (var i = 0, l = parser.attribList.length; i < l; i++) {
            var nv = parser.attribList[i];
            var name = nv[0];
            var value = nv[1];
            var qualName = qname(name, true);
            var prefix = qualName.prefix;
            var local = qualName.local;
            var uri = prefix === "" ? "" : tag.ns[prefix] || "";
            var a = {
              name,
              value,
              prefix,
              local,
              uri
            };
            if (prefix && prefix !== "xmlns" && !uri) {
              strictFail(
                parser,
                "Unbound namespace prefix: " + JSON.stringify(prefix)
              );
              a.uri = prefix;
            }
            parser.tag.attributes[name] = a;
            emitNode(parser, "onattribute", a);
          }
          parser.attribList.length = 0;
        }
        parser.tag.isSelfClosing = !!selfClosing;
        parser.sawRoot = true;
        parser.tags.push(parser.tag);
        emitNode(parser, "onopentag", parser.tag);
        if (!selfClosing) {
          if (!parser.noscript && parser.tagName.toLowerCase() === "script") {
            parser.state = S.SCRIPT;
          } else {
            parser.state = S.TEXT;
          }
          parser.tag = null;
          parser.tagName = "";
        }
        parser.attribName = parser.attribValue = "";
        parser.attribList.length = 0;
      }
      function closeTag(parser) {
        if (!parser.tagName) {
          strictFail(parser, "Weird empty close tag.");
          parser.textNode += "</>";
          parser.state = S.TEXT;
          return;
        }
        if (parser.script) {
          if (parser.tagName !== "script") {
            parser.script += "</" + parser.tagName + ">";
            parser.tagName = "";
            parser.state = S.SCRIPT;
            return;
          }
          emitNode(parser, "onscript", parser.script);
          parser.script = "";
        }
        var t = parser.tags.length;
        var tagName = parser.tagName;
        if (!parser.strict) {
          tagName = tagName[parser.looseCase]();
        }
        var closeTo = tagName;
        while (t--) {
          var close = parser.tags[t];
          if (close.name !== closeTo) {
            strictFail(parser, "Unexpected close tag");
          } else {
            break;
          }
        }
        if (t < 0) {
          strictFail(parser, "Unmatched closing tag: " + parser.tagName);
          parser.textNode += "</" + parser.tagName + ">";
          parser.state = S.TEXT;
          return;
        }
        parser.tagName = tagName;
        var s2 = parser.tags.length;
        while (s2-- > t) {
          var tag = parser.tag = parser.tags.pop();
          parser.tagName = parser.tag.name;
          emitNode(parser, "onclosetag", parser.tagName);
          var x = {};
          for (var i in tag.ns) {
            x[i] = tag.ns[i];
          }
          var parent = parser.tags[parser.tags.length - 1] || parser;
          if (parser.opt.xmlns && tag.ns !== parent.ns) {
            Object.keys(tag.ns).forEach(function(p) {
              var n = tag.ns[p];
              emitNode(parser, "onclosenamespace", { prefix: p, uri: n });
            });
          }
        }
        if (t === 0) parser.closedRoot = true;
        parser.tagName = parser.attribValue = parser.attribName = "";
        parser.attribList.length = 0;
        parser.state = S.TEXT;
      }
      function parseEntity(parser) {
        var entity = parser.entity;
        var entityLC = entity.toLowerCase();
        var num;
        var numStr = "";
        if (parser.ENTITIES[entity]) {
          return parser.ENTITIES[entity];
        }
        if (parser.ENTITIES[entityLC]) {
          return parser.ENTITIES[entityLC];
        }
        entity = entityLC;
        if (entity.charAt(0) === "#") {
          if (entity.charAt(1) === "x") {
            entity = entity.slice(2);
            num = parseInt(entity, 16);
            numStr = num.toString(16);
          } else {
            entity = entity.slice(1);
            num = parseInt(entity, 10);
            numStr = num.toString(10);
          }
        }
        entity = entity.replace(/^0+/, "");
        if (isNaN(num) || numStr.toLowerCase() !== entity || num < 0 || num > 1114111 || !isXmlChar(num)) {
          strictFail(parser, "Invalid character entity");
          return "&" + parser.entity + ";";
        }
        return String.fromCodePoint(num);
      }
      function isXmlChar(num) {
        return num === 9 || num === 10 || num === 13 || num >= 32 && num <= 55295 || num >= 57344 && num <= 65533 || num >= 65536 && num <= 1114111;
      }
      function beginWhiteSpace(parser, c) {
        if (c === "<") {
          parser.state = S.OPEN_WAKA;
          parser.startTagPosition = parser.position;
        } else if (!isWhitespace(c)) {
          strictFail(parser, "Non-whitespace before first tag.");
          parser.textNode = c;
          parser.state = S.TEXT;
        }
      }
      function charAt(chunk, i) {
        var result = "";
        if (i < chunk.length) {
          result = chunk.charAt(i);
        }
        return result;
      }
      function write(chunk) {
        var parser = this;
        if (this.error) {
          throw this.error;
        }
        if (parser.closed) {
          return error(
            parser,
            "Cannot write after close. Assign an onready handler."
          );
        }
        if (chunk === null) {
          return end(parser);
        }
        if (typeof chunk === "object") {
          chunk = chunk.toString();
        }
        var i = 0;
        var c = "";
        while (true) {
          c = charAt(chunk, i++);
          parser.c = c;
          if (!c) {
            break;
          }
          if (parser.trackPosition) {
            parser.position++;
            if (c === "\n") {
              parser.line++;
              parser.column = 0;
            } else {
              parser.column++;
            }
          }
          switch (parser.state) {
            case S.BEGIN:
              parser.state = S.BEGIN_WHITESPACE;
              if (c === "\uFEFF") {
                continue;
              }
              beginWhiteSpace(parser, c);
              continue;
            case S.BEGIN_WHITESPACE:
              beginWhiteSpace(parser, c);
              continue;
            case S.TEXT:
              if (parser.sawRoot && !parser.closedRoot) {
                var starti = i - 1;
                while (c && c !== "<" && c !== "&") {
                  c = charAt(chunk, i++);
                  if (c && parser.trackPosition) {
                    parser.position++;
                    if (c === "\n") {
                      parser.line++;
                      parser.column = 0;
                    } else {
                      parser.column++;
                    }
                  }
                }
                parser.textNode += chunk.substring(starti, i - 1);
              }
              if (c === "<" && !(parser.sawRoot && parser.closedRoot && !parser.strict)) {
                parser.state = S.OPEN_WAKA;
                parser.startTagPosition = parser.position;
              } else {
                if (!isWhitespace(c) && (!parser.sawRoot || parser.closedRoot)) {
                  strictFail(parser, "Text data outside of root node.");
                }
                if (c === "&") {
                  parser.state = S.TEXT_ENTITY;
                } else {
                  parser.textNode += c;
                }
              }
              continue;
            case S.SCRIPT:
              if (c === "<") {
                parser.state = S.SCRIPT_ENDING;
              } else {
                parser.script += c;
              }
              continue;
            case S.SCRIPT_ENDING:
              if (c === "/") {
                parser.state = S.CLOSE_TAG;
              } else {
                parser.script += "<" + c;
                parser.state = S.SCRIPT;
              }
              continue;
            case S.OPEN_WAKA:
              if (c === "!") {
                parser.state = S.SGML_DECL;
                parser.sgmlDecl = "";
              } else if (isWhitespace(c)) {
              } else if (isMatch(nameStart, c)) {
                parser.state = S.OPEN_TAG;
                parser.tagName = c;
              } else if (c === "/") {
                parser.state = S.CLOSE_TAG;
                parser.tagName = "";
              } else if (c === "?") {
                parser.state = S.PROC_INST;
                parser.procInstName = parser.procInstBody = "";
              } else {
                strictFail(parser, "Unencoded <");
                if (parser.startTagPosition + 1 < parser.position) {
                  var pad = parser.position - parser.startTagPosition;
                  c = new Array(pad).join(" ") + c;
                }
                parser.textNode += "<" + c;
                parser.state = S.TEXT;
              }
              continue;
            case S.SGML_DECL:
              if (parser.sgmlDecl + c === "--") {
                parser.state = S.COMMENT;
                parser.comment = "";
                parser.sgmlDecl = "";
                continue;
              }
              if (parser.doctype && parser.doctype !== true && parser.sgmlDecl) {
                parser.state = S.DOCTYPE_DTD;
                parser.doctype += "<!" + parser.sgmlDecl + c;
                parser.sgmlDecl = "";
              } else if (CDATAre.test(parser.sgmlDecl + c)) {
                emitNode(parser, "onopencdata");
                parser.state = S.CDATA;
                parser.sgmlDecl = "";
                parser.cdata = "";
              } else if (DOCTYPEre.test(parser.sgmlDecl + c)) {
                parser.state = S.DOCTYPE;
                if (parser.doctype || parser.sawRoot) {
                  strictFail(
                    parser,
                    "Inappropriately located doctype declaration"
                  );
                }
                parser.doctype = "";
                parser.sgmlDecl = "";
              } else if (c === ">") {
                emitNode(parser, "onsgmldeclaration", parser.sgmlDecl);
                parser.sgmlDecl = "";
                parser.state = S.TEXT;
              } else if (isQuote(c)) {
                parser.state = S.SGML_DECL_QUOTED;
                parser.sgmlDecl += c;
              } else {
                parser.sgmlDecl += c;
              }
              continue;
            case S.SGML_DECL_QUOTED:
              if (c === parser.q) {
                parser.state = S.SGML_DECL;
                parser.q = "";
              }
              parser.sgmlDecl += c;
              continue;
            case S.DOCTYPE:
              if (c === ">") {
                parser.state = S.TEXT;
                emitNode(parser, "ondoctype", parser.doctype);
                parser.doctype = true;
              } else {
                parser.doctype += c;
                if (c === "[") {
                  parser.state = S.DOCTYPE_DTD;
                } else if (isQuote(c)) {
                  parser.state = S.DOCTYPE_QUOTED;
                  parser.q = c;
                }
              }
              continue;
            case S.DOCTYPE_QUOTED:
              parser.doctype += c;
              if (c === parser.q) {
                parser.q = "";
                parser.state = S.DOCTYPE;
              }
              continue;
            case S.DOCTYPE_DTD:
              if (c === "]") {
                parser.doctype += c;
                parser.state = S.DOCTYPE;
              } else if (c === "<") {
                parser.state = S.OPEN_WAKA;
                parser.startTagPosition = parser.position;
              } else if (isQuote(c)) {
                parser.doctype += c;
                parser.state = S.DOCTYPE_DTD_QUOTED;
                parser.q = c;
              } else {
                parser.doctype += c;
              }
              continue;
            case S.DOCTYPE_DTD_QUOTED:
              parser.doctype += c;
              if (c === parser.q) {
                parser.state = S.DOCTYPE_DTD;
                parser.q = "";
              }
              continue;
            case S.COMMENT:
              if (c === "-") {
                parser.state = S.COMMENT_ENDING;
              } else {
                parser.comment += c;
              }
              continue;
            case S.COMMENT_ENDING:
              if (c === "-") {
                parser.state = S.COMMENT_ENDED;
                parser.comment = textopts(parser.opt, parser.comment);
                if (parser.comment) {
                  emitNode(parser, "oncomment", parser.comment);
                }
                parser.comment = "";
              } else {
                parser.comment += "-" + c;
                parser.state = S.COMMENT;
              }
              continue;
            case S.COMMENT_ENDED:
              if (c !== ">") {
                strictFail(parser, "Malformed comment");
                parser.comment += "--" + c;
                parser.state = S.COMMENT;
              } else if (parser.doctype && parser.doctype !== true) {
                parser.state = S.DOCTYPE_DTD;
              } else {
                parser.state = S.TEXT;
              }
              continue;
            case S.CDATA:
              var starti = i - 1;
              while (c && c !== "]") {
                c = charAt(chunk, i++);
                if (c && parser.trackPosition) {
                  parser.position++;
                  if (c === "\n") {
                    parser.line++;
                    parser.column = 0;
                  } else {
                    parser.column++;
                  }
                }
              }
              parser.cdata += chunk.substring(starti, i - 1);
              if (c === "]") {
                parser.state = S.CDATA_ENDING;
              }
              continue;
            case S.CDATA_ENDING:
              if (c === "]") {
                parser.state = S.CDATA_ENDING_2;
              } else {
                parser.cdata += "]" + c;
                parser.state = S.CDATA;
              }
              continue;
            case S.CDATA_ENDING_2:
              if (c === ">") {
                if (parser.cdata) {
                  emitNode(parser, "oncdata", parser.cdata);
                }
                emitNode(parser, "onclosecdata");
                parser.cdata = "";
                parser.state = S.TEXT;
              } else if (c === "]") {
                parser.cdata += "]";
              } else {
                parser.cdata += "]]" + c;
                parser.state = S.CDATA;
              }
              continue;
            case S.PROC_INST:
              if (c === "?") {
                parser.state = S.PROC_INST_ENDING;
              } else if (isWhitespace(c)) {
                parser.state = S.PROC_INST_BODY;
              } else {
                parser.procInstName += c;
              }
              continue;
            case S.PROC_INST_BODY:
              if (!parser.procInstBody && isWhitespace(c)) {
                continue;
              } else if (c === "?") {
                parser.state = S.PROC_INST_ENDING;
              } else {
                parser.procInstBody += c;
              }
              continue;
            case S.PROC_INST_ENDING:
              if (c === ">") {
                const procInstEndData = {
                  name: parser.procInstName,
                  body: parser.procInstBody
                };
                validateXmlDeclarationEncoding(parser, procInstEndData);
                emitNode(parser, "onprocessinginstruction", procInstEndData);
                parser.procInstName = parser.procInstBody = "";
                parser.state = S.TEXT;
              } else {
                parser.procInstBody += "?" + c;
                parser.state = S.PROC_INST_BODY;
              }
              continue;
            case S.OPEN_TAG:
              if (isMatch(nameBody, c)) {
                parser.tagName += c;
              } else {
                newTag(parser);
                if (c === ">") {
                  openTag(parser);
                } else if (c === "/") {
                  parser.state = S.OPEN_TAG_SLASH;
                } else {
                  if (!isWhitespace(c)) {
                    strictFail(parser, "Invalid character in tag name");
                  }
                  parser.state = S.ATTRIB;
                }
              }
              continue;
            case S.OPEN_TAG_SLASH:
              if (c === ">") {
                openTag(parser, true);
                closeTag(parser);
              } else {
                strictFail(
                  parser,
                  "Forward-slash in opening tag not followed by >"
                );
                parser.state = S.ATTRIB;
              }
              continue;
            case S.ATTRIB:
              if (isWhitespace(c)) {
                continue;
              } else if (c === ">") {
                openTag(parser);
              } else if (c === "/") {
                parser.state = S.OPEN_TAG_SLASH;
              } else if (isMatch(nameStart, c)) {
                parser.attribName = c;
                parser.attribValue = "";
                parser.state = S.ATTRIB_NAME;
              } else {
                strictFail(parser, "Invalid attribute name");
              }
              continue;
            case S.ATTRIB_NAME:
              if (c === "=") {
                parser.state = S.ATTRIB_VALUE;
              } else if (c === ">") {
                strictFail(parser, "Attribute without value");
                parser.attribValue = parser.attribName;
                attrib(parser);
                openTag(parser);
              } else if (isWhitespace(c)) {
                parser.state = S.ATTRIB_NAME_SAW_WHITE;
              } else if (isMatch(nameBody, c)) {
                parser.attribName += c;
              } else {
                strictFail(parser, "Invalid attribute name");
              }
              continue;
            case S.ATTRIB_NAME_SAW_WHITE:
              if (c === "=") {
                parser.state = S.ATTRIB_VALUE;
              } else if (isWhitespace(c)) {
                continue;
              } else {
                strictFail(parser, "Attribute without value");
                parser.tag.attributes[parser.attribName] = "";
                parser.attribValue = "";
                emitNode(parser, "onattribute", {
                  name: parser.attribName,
                  value: ""
                });
                parser.attribName = "";
                if (c === ">") {
                  openTag(parser);
                } else if (isMatch(nameStart, c)) {
                  parser.attribName = c;
                  parser.state = S.ATTRIB_NAME;
                } else {
                  strictFail(parser, "Invalid attribute name");
                  parser.state = S.ATTRIB;
                }
              }
              continue;
            case S.ATTRIB_VALUE:
              if (isWhitespace(c)) {
                continue;
              } else if (isQuote(c)) {
                parser.q = c;
                parser.state = S.ATTRIB_VALUE_QUOTED;
              } else {
                if (!parser.opt.unquotedAttributeValues) {
                  error(parser, "Unquoted attribute value");
                }
                parser.state = S.ATTRIB_VALUE_UNQUOTED;
                parser.attribValue = c;
              }
              continue;
            case S.ATTRIB_VALUE_QUOTED:
              if (c !== parser.q) {
                if (c === "&") {
                  parser.state = S.ATTRIB_VALUE_ENTITY_Q;
                } else {
                  parser.attribValue += c;
                }
                continue;
              }
              attrib(parser);
              parser.q = "";
              parser.state = S.ATTRIB_VALUE_CLOSED;
              continue;
            case S.ATTRIB_VALUE_CLOSED:
              if (isWhitespace(c)) {
                parser.state = S.ATTRIB;
              } else if (c === ">") {
                openTag(parser);
              } else if (c === "/") {
                parser.state = S.OPEN_TAG_SLASH;
              } else if (isMatch(nameStart, c)) {
                strictFail(parser, "No whitespace between attributes");
                parser.attribName = c;
                parser.attribValue = "";
                parser.state = S.ATTRIB_NAME;
              } else {
                strictFail(parser, "Invalid attribute name");
              }
              continue;
            case S.ATTRIB_VALUE_UNQUOTED:
              if (!isAttribEnd(c)) {
                if (c === "&") {
                  parser.state = S.ATTRIB_VALUE_ENTITY_U;
                } else {
                  parser.attribValue += c;
                }
                continue;
              }
              attrib(parser);
              if (c === ">") {
                openTag(parser);
              } else {
                parser.state = S.ATTRIB;
              }
              continue;
            case S.CLOSE_TAG:
              if (!parser.tagName) {
                if (isWhitespace(c)) {
                  continue;
                } else if (notMatch(nameStart, c)) {
                  if (parser.script) {
                    parser.script += "</" + c;
                    parser.state = S.SCRIPT;
                  } else {
                    strictFail(parser, "Invalid tagname in closing tag.");
                  }
                } else {
                  parser.tagName = c;
                }
              } else if (c === ">") {
                closeTag(parser);
              } else if (isMatch(nameBody, c)) {
                parser.tagName += c;
              } else if (parser.script) {
                parser.script += "</" + parser.tagName + c;
                parser.tagName = "";
                parser.state = S.SCRIPT;
              } else {
                if (!isWhitespace(c)) {
                  strictFail(parser, "Invalid tagname in closing tag");
                }
                parser.state = S.CLOSE_TAG_SAW_WHITE;
              }
              continue;
            case S.CLOSE_TAG_SAW_WHITE:
              if (isWhitespace(c)) {
                continue;
              }
              if (c === ">") {
                closeTag(parser);
              } else {
                strictFail(parser, "Invalid characters in closing tag");
              }
              continue;
            case S.TEXT_ENTITY:
            case S.ATTRIB_VALUE_ENTITY_Q:
            case S.ATTRIB_VALUE_ENTITY_U:
              var returnState;
              var buffer;
              switch (parser.state) {
                case S.TEXT_ENTITY:
                  returnState = S.TEXT;
                  buffer = "textNode";
                  break;
                case S.ATTRIB_VALUE_ENTITY_Q:
                  returnState = S.ATTRIB_VALUE_QUOTED;
                  buffer = "attribValue";
                  break;
                case S.ATTRIB_VALUE_ENTITY_U:
                  returnState = S.ATTRIB_VALUE_UNQUOTED;
                  buffer = "attribValue";
                  break;
              }
              if (c === ";") {
                var parsedEntity = parseEntity(parser);
                if (parser.opt.unparsedEntities && !Object.values(sax.XML_ENTITIES).includes(parsedEntity)) {
                  if ((parser.entityCount += 1) > parser.opt.maxEntityCount) {
                    error(
                      parser,
                      "Parsed entity count exceeds max entity count"
                    );
                  }
                  if ((parser.entityDepth += 1) > parser.opt.maxEntityDepth) {
                    error(
                      parser,
                      "Parsed entity depth exceeds max entity depth"
                    );
                  }
                  parser.entity = "";
                  parser.state = returnState;
                  parser.write(parsedEntity);
                  parser.entityDepth -= 1;
                } else {
                  parser[buffer] += parsedEntity;
                  parser.entity = "";
                  parser.state = returnState;
                }
              } else if (isMatch(parser.entity.length ? entityBody : entityStart, c)) {
                parser.entity += c;
              } else {
                strictFail(parser, "Invalid character in entity name");
                parser[buffer] += "&" + parser.entity + c;
                parser.entity = "";
                parser.state = returnState;
              }
              continue;
            default: {
              throw new Error(parser, "Unknown state: " + parser.state);
            }
          }
        }
        if (parser.position >= parser.bufferCheckPosition) {
          checkBufferLength(parser);
        }
        return parser;
      }
      if (!String.fromCodePoint) {
        ;
        (function() {
          var stringFromCharCode = String.fromCharCode;
          var floor = Math.floor;
          var fromCodePoint = function() {
            var MAX_SIZE = 16384;
            var codeUnits = [];
            var highSurrogate;
            var lowSurrogate;
            var index = -1;
            var length = arguments.length;
            if (!length) {
              return "";
            }
            var result = "";
            while (++index < length) {
              var codePoint = Number(arguments[index]);
              if (!isFinite(codePoint) || // `NaN`, `+Infinity`, or `-Infinity`
              codePoint < 0 || // not a valid Unicode code point
              codePoint > 1114111 || // not a valid Unicode code point
              floor(codePoint) !== codePoint) {
                throw RangeError("Invalid code point: " + codePoint);
              }
              if (codePoint <= 65535) {
                codeUnits.push(codePoint);
              } else {
                codePoint -= 65536;
                highSurrogate = (codePoint >> 10) + 55296;
                lowSurrogate = codePoint % 1024 + 56320;
                codeUnits.push(highSurrogate, lowSurrogate);
              }
              if (index + 1 === length || codeUnits.length > MAX_SIZE) {
                result += stringFromCharCode.apply(null, codeUnits);
                codeUnits.length = 0;
              }
            }
            return result;
          };
          if (Object.defineProperty) {
            Object.defineProperty(String, "fromCodePoint", {
              value: fromCodePoint,
              configurable: true,
              writable: true
            });
          } else {
            String.fromCodePoint = fromCodePoint;
          }
        })();
      }
    })(typeof exports2 === "undefined" ? exports2.sax = {} : exports2);
  }
});

// node_modules/builder-util-runtime/out/xml.js
var require_xml = __commonJS({
  "node_modules/builder-util-runtime/out/xml.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.XElement = void 0;
    exports2.parseXml = parseXml;
    var sax = require_sax();
    var error_1 = require_error();
    var XElement = class {
      constructor(name) {
        this.name = name;
        this.value = "";
        this.attributes = null;
        this.isCData = false;
        this.elements = null;
        if (!name) {
          throw (0, error_1.newError)("Element name cannot be empty", "ERR_XML_ELEMENT_NAME_EMPTY");
        }
        if (!isValidName(name)) {
          throw (0, error_1.newError)(`Invalid element name: ${name}`, "ERR_XML_ELEMENT_INVALID_NAME");
        }
      }
      attribute(name) {
        const result = this.attributes === null ? null : this.attributes[name];
        if (result == null) {
          throw (0, error_1.newError)(`No attribute "${name}"`, "ERR_XML_MISSED_ATTRIBUTE");
        }
        return result;
      }
      removeAttribute(name) {
        if (this.attributes !== null) {
          delete this.attributes[name];
        }
      }
      element(name, ignoreCase = false, errorIfMissed = null) {
        const result = this.elementOrNull(name, ignoreCase);
        if (result === null) {
          throw (0, error_1.newError)(errorIfMissed || `No element "${name}"`, "ERR_XML_MISSED_ELEMENT");
        }
        return result;
      }
      elementOrNull(name, ignoreCase = false) {
        if (this.elements === null) {
          return null;
        }
        for (const element of this.elements) {
          if (isNameEquals(element, name, ignoreCase)) {
            return element;
          }
        }
        return null;
      }
      getElements(name, ignoreCase = false) {
        if (this.elements === null) {
          return [];
        }
        return this.elements.filter((it) => isNameEquals(it, name, ignoreCase));
      }
      elementValueOrEmpty(name, ignoreCase = false) {
        const element = this.elementOrNull(name, ignoreCase);
        return element === null ? "" : element.value;
      }
    };
    exports2.XElement = XElement;
    var NAME_REG_EXP = new RegExp(/^[A-Za-z_][:A-Za-z0-9_-]*$/i);
    function isValidName(name) {
      return NAME_REG_EXP.test(name);
    }
    function isNameEquals(element, name, ignoreCase) {
      const elementName = element.name;
      return elementName === name || ignoreCase === true && elementName.length === name.length && elementName.toLowerCase() === name.toLowerCase();
    }
    function parseXml(data) {
      let rootElement = null;
      const parser = sax.parser(true, {});
      const elements = [];
      parser.onopentag = (saxElement) => {
        const element = new XElement(saxElement.name);
        element.attributes = saxElement.attributes;
        if (rootElement === null) {
          rootElement = element;
        } else {
          const parent = elements[elements.length - 1];
          if (parent.elements == null) {
            parent.elements = [];
          }
          parent.elements.push(element);
        }
        elements.push(element);
      };
      parser.onclosetag = () => {
        elements.pop();
      };
      parser.ontext = (text) => {
        if (elements.length > 0) {
          elements[elements.length - 1].value = text;
        }
      };
      parser.oncdata = (cdata) => {
        const element = elements[elements.length - 1];
        element.value = cdata;
        element.isCData = true;
      };
      parser.onerror = (err) => {
        throw err;
      };
      parser.write(data);
      return rootElement;
    }
  }
});

// node_modules/builder-util-runtime/out/objects.js
var require_objects = __commonJS({
  "node_modules/builder-util-runtime/out/objects.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.mapToObject = mapToObject;
    exports2.isValidKey = isValidKey;
    exports2.asArray = asArray;
    exports2.deepAssign = deepAssign;
    exports2.objectToArgs = objectToArgs;
    function mapToObject(map) {
      const obj = {};
      for (const [key, value] of map) {
        if (!isValidKey(key)) {
          continue;
        }
        if (value instanceof Map) {
          obj[key] = mapToObject(value);
        } else {
          obj[key] = value;
        }
      }
      return obj;
    }
    function isValidKey(key) {
      const protectedProperties = ["__proto__", "prototype", "constructor"];
      if (protectedProperties.includes(key)) {
        return false;
      }
      return ["string", "number", "symbol", "boolean"].includes(typeof key) || key === null;
    }
    function asArray(v) {
      if (v == null) {
        return [];
      } else if (Array.isArray(v)) {
        return v;
      } else {
        return [v];
      }
    }
    function isObject(x) {
      if (Array.isArray(x)) {
        return false;
      }
      const type = typeof x;
      return type === "object" || type === "function";
    }
    function assignKey(target, from, key) {
      const value = from[key];
      if (value === void 0) {
        return;
      }
      const prevValue = target[key];
      if (prevValue == null || value == null || !isObject(prevValue) || !isObject(value)) {
        if (Array.isArray(prevValue) && Array.isArray(value)) {
          target[key] = Array.from(new Set(prevValue.concat(value)));
        } else {
          target[key] = value;
        }
      } else {
        target[key] = assign(prevValue, value);
      }
    }
    function assign(to, from) {
      if (to !== from) {
        for (const key of Object.getOwnPropertyNames(from)) {
          if (isValidKey(key)) {
            assignKey(to, from, key);
          }
        }
      }
      return to;
    }
    function deepAssign(target, ...objects) {
      for (const o of objects) {
        if (o != null) {
          assign(target, o);
        }
      }
      return target;
    }
    var SAFE_FLAG_NAME_RE = /^[a-zA-Z][a-zA-Z0-9-]*$/;
    var UNSAFE_VALUE_RE = /[\0\r\n]/;
    function objectToArgs(obj) {
      const args = Object.entries(obj).reduce((args2, [name, value]) => {
        if (!isValidKey(name) || value == null) {
          return args2;
        }
        if (!SAFE_FLAG_NAME_RE.test(name)) {
          throw new Error(`objectToArgs: unsafe flag name rejected: ${JSON.stringify(name)}`);
        }
        if (UNSAFE_VALUE_RE.test(value)) {
          throw new Error(`objectToArgs: value for --${name} contains a null byte or newline`);
        }
        return args2.concat([`--${name}`, value]);
      }, []);
      return Object.freeze(args);
    }
  }
});

// node_modules/builder-util-runtime/out/index.js
var require_out = __commonJS({
  "node_modules/builder-util-runtime/out/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.CURRENT_APP_PACKAGE_FILE_NAME = exports2.CURRENT_APP_INSTALLER_FILE_NAME = exports2.objectToArgs = exports2.deepAssign = exports2.asArray = exports2.mapToObject = exports2.isValidKey = exports2.XElement = exports2.parseXml = exports2.UUID = exports2.parseDn = exports2.retry = exports2.githubTagPrefix = exports2.githubUrl = exports2.getS3LikeProviderBaseUrl = exports2.ProgressCallbackTransform = exports2.MemoLazy = exports2.safeStringifyJson = exports2.safeGetHeader = exports2.parseJson = exports2.isSensitiveFieldName = exports2.HttpExecutor = exports2.hashSensitiveValue = exports2.HttpError = exports2.DigestTransform = exports2.createHttpError = exports2.configureRequestUrl = exports2.configureRequestOptionsFromUrl = exports2.configureRequestOptions = exports2.newError = exports2.CancellationToken = exports2.CancellationError = void 0;
    var CancellationToken_1 = require_CancellationToken();
    Object.defineProperty(exports2, "CancellationError", { enumerable: true, get: function() {
      return CancellationToken_1.CancellationError;
    } });
    Object.defineProperty(exports2, "CancellationToken", { enumerable: true, get: function() {
      return CancellationToken_1.CancellationToken;
    } });
    var error_1 = require_error();
    Object.defineProperty(exports2, "newError", { enumerable: true, get: function() {
      return error_1.newError;
    } });
    var httpExecutor_1 = require_httpExecutor();
    Object.defineProperty(exports2, "configureRequestOptions", { enumerable: true, get: function() {
      return httpExecutor_1.configureRequestOptions;
    } });
    Object.defineProperty(exports2, "configureRequestOptionsFromUrl", { enumerable: true, get: function() {
      return httpExecutor_1.configureRequestOptionsFromUrl;
    } });
    Object.defineProperty(exports2, "configureRequestUrl", { enumerable: true, get: function() {
      return httpExecutor_1.configureRequestUrl;
    } });
    Object.defineProperty(exports2, "createHttpError", { enumerable: true, get: function() {
      return httpExecutor_1.createHttpError;
    } });
    Object.defineProperty(exports2, "DigestTransform", { enumerable: true, get: function() {
      return httpExecutor_1.DigestTransform;
    } });
    Object.defineProperty(exports2, "HttpError", { enumerable: true, get: function() {
      return httpExecutor_1.HttpError;
    } });
    Object.defineProperty(exports2, "hashSensitiveValue", { enumerable: true, get: function() {
      return httpExecutor_1.hashSensitiveValue;
    } });
    Object.defineProperty(exports2, "HttpExecutor", { enumerable: true, get: function() {
      return httpExecutor_1.HttpExecutor;
    } });
    Object.defineProperty(exports2, "isSensitiveFieldName", { enumerable: true, get: function() {
      return httpExecutor_1.isSensitiveFieldName;
    } });
    Object.defineProperty(exports2, "parseJson", { enumerable: true, get: function() {
      return httpExecutor_1.parseJson;
    } });
    Object.defineProperty(exports2, "safeGetHeader", { enumerable: true, get: function() {
      return httpExecutor_1.safeGetHeader;
    } });
    Object.defineProperty(exports2, "safeStringifyJson", { enumerable: true, get: function() {
      return httpExecutor_1.safeStringifyJson;
    } });
    var MemoLazy_1 = require_MemoLazy();
    Object.defineProperty(exports2, "MemoLazy", { enumerable: true, get: function() {
      return MemoLazy_1.MemoLazy;
    } });
    var ProgressCallbackTransform_1 = require_ProgressCallbackTransform();
    Object.defineProperty(exports2, "ProgressCallbackTransform", { enumerable: true, get: function() {
      return ProgressCallbackTransform_1.ProgressCallbackTransform;
    } });
    var publishOptions_1 = require_publishOptions();
    Object.defineProperty(exports2, "getS3LikeProviderBaseUrl", { enumerable: true, get: function() {
      return publishOptions_1.getS3LikeProviderBaseUrl;
    } });
    Object.defineProperty(exports2, "githubUrl", { enumerable: true, get: function() {
      return publishOptions_1.githubUrl;
    } });
    Object.defineProperty(exports2, "githubTagPrefix", { enumerable: true, get: function() {
      return publishOptions_1.githubTagPrefix;
    } });
    var retry_1 = require_retry();
    Object.defineProperty(exports2, "retry", { enumerable: true, get: function() {
      return retry_1.retry;
    } });
    var rfc2253Parser_1 = require_rfc2253Parser();
    Object.defineProperty(exports2, "parseDn", { enumerable: true, get: function() {
      return rfc2253Parser_1.parseDn;
    } });
    var uuid_1 = require_uuid();
    Object.defineProperty(exports2, "UUID", { enumerable: true, get: function() {
      return uuid_1.UUID;
    } });
    var xml_1 = require_xml();
    Object.defineProperty(exports2, "parseXml", { enumerable: true, get: function() {
      return xml_1.parseXml;
    } });
    Object.defineProperty(exports2, "XElement", { enumerable: true, get: function() {
      return xml_1.XElement;
    } });
    var objects_1 = require_objects();
    Object.defineProperty(exports2, "isValidKey", { enumerable: true, get: function() {
      return objects_1.isValidKey;
    } });
    Object.defineProperty(exports2, "mapToObject", { enumerable: true, get: function() {
      return objects_1.mapToObject;
    } });
    Object.defineProperty(exports2, "asArray", { enumerable: true, get: function() {
      return objects_1.asArray;
    } });
    Object.defineProperty(exports2, "deepAssign", { enumerable: true, get: function() {
      return objects_1.deepAssign;
    } });
    Object.defineProperty(exports2, "objectToArgs", { enumerable: true, get: function() {
      return objects_1.objectToArgs;
    } });
    exports2.CURRENT_APP_INSTALLER_FILE_NAME = "installer.exe";
    exports2.CURRENT_APP_PACKAGE_FILE_NAME = "package.7z";
  }
});

// node_modules/js-yaml/lib/common.js
var require_common2 = __commonJS({
  "node_modules/js-yaml/lib/common.js"(exports2, module2) {
    "use strict";
    function isNothing(subject) {
      return typeof subject === "undefined" || subject === null;
    }
    function isObject(subject) {
      return typeof subject === "object" && subject !== null;
    }
    function toArray(sequence) {
      if (Array.isArray(sequence)) return sequence;
      else if (isNothing(sequence)) return [];
      return [sequence];
    }
    function extend(target, source) {
      if (source) {
        const sourceKeys = Object.keys(source);
        for (let index = 0, length = sourceKeys.length; index < length; index += 1) {
          const key = sourceKeys[index];
          target[key] = source[key];
        }
      }
      return target;
    }
    function repeat(string, count) {
      let result = "";
      for (let cycle = 0; cycle < count; cycle += 1) {
        result += string;
      }
      return result;
    }
    function isNegativeZero(number) {
      return number === 0 && Number.NEGATIVE_INFINITY === 1 / number;
    }
    module2.exports.isNothing = isNothing;
    module2.exports.isObject = isObject;
    module2.exports.toArray = toArray;
    module2.exports.repeat = repeat;
    module2.exports.isNegativeZero = isNegativeZero;
    module2.exports.extend = extend;
  }
});

// node_modules/js-yaml/lib/exception.js
var require_exception = __commonJS({
  "node_modules/js-yaml/lib/exception.js"(exports2, module2) {
    "use strict";
    function formatError(exception, compact) {
      let where = "";
      const message = exception.reason || "(unknown reason)";
      if (!exception.mark) return message;
      if (exception.mark.name) {
        where += 'in "' + exception.mark.name + '" ';
      }
      where += "(" + (exception.mark.line + 1) + ":" + (exception.mark.column + 1) + ")";
      if (!compact && exception.mark.snippet) {
        where += "\n\n" + exception.mark.snippet;
      }
      return message + " " + where;
    }
    function YAMLException(reason, mark) {
      Error.call(this);
      this.name = "YAMLException";
      this.reason = reason;
      this.mark = mark;
      this.message = formatError(this, false);
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
      } else {
        this.stack = new Error().stack || "";
      }
    }
    YAMLException.prototype = Object.create(Error.prototype);
    YAMLException.prototype.constructor = YAMLException;
    YAMLException.prototype.toString = function toString(compact) {
      return this.name + ": " + formatError(this, compact);
    };
    module2.exports = YAMLException;
  }
});

// node_modules/js-yaml/lib/snippet.js
var require_snippet = __commonJS({
  "node_modules/js-yaml/lib/snippet.js"(exports2, module2) {
    "use strict";
    var common = require_common2();
    function getLine(buffer, lineStart, lineEnd, position, maxLineLength) {
      let head = "";
      let tail = "";
      const maxHalfLength = Math.floor(maxLineLength / 2) - 1;
      if (position - lineStart > maxHalfLength) {
        head = " ... ";
        lineStart = position - maxHalfLength + head.length;
      }
      if (lineEnd - position > maxHalfLength) {
        tail = " ...";
        lineEnd = position + maxHalfLength - tail.length;
      }
      return {
        str: head + buffer.slice(lineStart, lineEnd).replace(/\t/g, "\u2192") + tail,
        pos: position - lineStart + head.length
        // relative position
      };
    }
    function padStart(string, max) {
      return common.repeat(" ", max - string.length) + string;
    }
    function makeSnippet(mark, options) {
      options = Object.create(options || null);
      if (!mark.buffer) return null;
      if (!options.maxLength) options.maxLength = 79;
      if (typeof options.indent !== "number") options.indent = 1;
      if (typeof options.linesBefore !== "number") options.linesBefore = 3;
      if (typeof options.linesAfter !== "number") options.linesAfter = 2;
      const re = /\r?\n|\r|\0/g;
      const lineStarts = [0];
      const lineEnds = [];
      let match;
      let foundLineNo = -1;
      while (match = re.exec(mark.buffer)) {
        lineEnds.push(match.index);
        lineStarts.push(match.index + match[0].length);
        if (mark.position <= match.index && foundLineNo < 0) {
          foundLineNo = lineStarts.length - 2;
        }
      }
      if (foundLineNo < 0) foundLineNo = lineStarts.length - 1;
      let result = "";
      const lineNoLength = Math.min(mark.line + options.linesAfter, lineEnds.length).toString().length;
      const maxLineLength = options.maxLength - (options.indent + lineNoLength + 3);
      for (let i = 1; i <= options.linesBefore; i++) {
        if (foundLineNo - i < 0) break;
        const line2 = getLine(
          mark.buffer,
          lineStarts[foundLineNo - i],
          lineEnds[foundLineNo - i],
          mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo - i]),
          maxLineLength
        );
        result = common.repeat(" ", options.indent) + padStart((mark.line - i + 1).toString(), lineNoLength) + " | " + line2.str + "\n" + result;
      }
      const line = getLine(mark.buffer, lineStarts[foundLineNo], lineEnds[foundLineNo], mark.position, maxLineLength);
      result += common.repeat(" ", options.indent) + padStart((mark.line + 1).toString(), lineNoLength) + " | " + line.str + "\n";
      result += common.repeat("-", options.indent + lineNoLength + 3 + line.pos) + "^\n";
      for (let i = 1; i <= options.linesAfter; i++) {
        if (foundLineNo + i >= lineEnds.length) break;
        const line2 = getLine(
          mark.buffer,
          lineStarts[foundLineNo + i],
          lineEnds[foundLineNo + i],
          mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo + i]),
          maxLineLength
        );
        result += common.repeat(" ", options.indent) + padStart((mark.line + i + 1).toString(), lineNoLength) + " | " + line2.str + "\n";
      }
      return result.replace(/\n$/, "");
    }
    module2.exports = makeSnippet;
  }
});

// node_modules/js-yaml/lib/type.js
var require_type = __commonJS({
  "node_modules/js-yaml/lib/type.js"(exports2, module2) {
    "use strict";
    var YAMLException = require_exception();
    var TYPE_CONSTRUCTOR_OPTIONS = [
      "kind",
      "multi",
      "resolve",
      "construct",
      "instanceOf",
      "predicate",
      "represent",
      "representName",
      "defaultStyle",
      "styleAliases"
    ];
    var YAML_NODE_KINDS = [
      "scalar",
      "sequence",
      "mapping"
    ];
    function compileStyleAliases(map) {
      const result = {};
      if (map !== null) {
        Object.keys(map).forEach(function(style) {
          map[style].forEach(function(alias) {
            result[String(alias)] = style;
          });
        });
      }
      return result;
    }
    function Type(tag, options) {
      options = options || {};
      Object.keys(options).forEach(function(name) {
        if (TYPE_CONSTRUCTOR_OPTIONS.indexOf(name) === -1) {
          throw new YAMLException('Unknown option "' + name + '" is met in definition of "' + tag + '" YAML type.');
        }
      });
      this.options = options;
      this.tag = tag;
      this.kind = options["kind"] || null;
      this.resolve = options["resolve"] || function() {
        return true;
      };
      this.construct = options["construct"] || function(data) {
        return data;
      };
      this.instanceOf = options["instanceOf"] || null;
      this.predicate = options["predicate"] || null;
      this.represent = options["represent"] || null;
      this.representName = options["representName"] || null;
      this.defaultStyle = options["defaultStyle"] || null;
      this.multi = options["multi"] || false;
      this.styleAliases = compileStyleAliases(options["styleAliases"] || null);
      if (YAML_NODE_KINDS.indexOf(this.kind) === -1) {
        throw new YAMLException('Unknown kind "' + this.kind + '" is specified for "' + tag + '" YAML type.');
      }
    }
    module2.exports = Type;
  }
});

// node_modules/js-yaml/lib/schema.js
var require_schema = __commonJS({
  "node_modules/js-yaml/lib/schema.js"(exports2, module2) {
    "use strict";
    var YAMLException = require_exception();
    var Type = require_type();
    function compileList(schema, name) {
      const result = [];
      schema[name].forEach(function(currentType) {
        let newIndex = result.length;
        result.forEach(function(previousType, previousIndex) {
          if (previousType.tag === currentType.tag && previousType.kind === currentType.kind && previousType.multi === currentType.multi) {
            newIndex = previousIndex;
          }
        });
        result[newIndex] = currentType;
      });
      return result;
    }
    function compileMap() {
      const result = {
        scalar: {},
        sequence: {},
        mapping: {},
        fallback: {},
        multi: {
          scalar: [],
          sequence: [],
          mapping: [],
          fallback: []
        }
      };
      function collectType(type) {
        if (type.multi) {
          result.multi[type.kind].push(type);
          result.multi["fallback"].push(type);
        } else {
          result[type.kind][type.tag] = result["fallback"][type.tag] = type;
        }
      }
      for (let index = 0, length = arguments.length; index < length; index += 1) {
        arguments[index].forEach(collectType);
      }
      return result;
    }
    function Schema(definition) {
      return this.extend(definition);
    }
    Schema.prototype.extend = function extend(definition) {
      let implicit = [];
      let explicit = [];
      if (definition instanceof Type) {
        explicit.push(definition);
      } else if (Array.isArray(definition)) {
        explicit = explicit.concat(definition);
      } else if (definition && (Array.isArray(definition.implicit) || Array.isArray(definition.explicit))) {
        if (definition.implicit) implicit = implicit.concat(definition.implicit);
        if (definition.explicit) explicit = explicit.concat(definition.explicit);
      } else {
        throw new YAMLException("Schema.extend argument should be a Type, [ Type ], or a schema definition ({ implicit: [...], explicit: [...] })");
      }
      implicit.forEach(function(type) {
        if (!(type instanceof Type)) {
          throw new YAMLException("Specified list of YAML types (or a single Type object) contains a non-Type object.");
        }
        if (type.loadKind && type.loadKind !== "scalar") {
          throw new YAMLException("There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.");
        }
        if (type.multi) {
          throw new YAMLException("There is a multi type in the implicit list of a schema. Multi tags can only be listed as explicit.");
        }
      });
      explicit.forEach(function(type) {
        if (!(type instanceof Type)) {
          throw new YAMLException("Specified list of YAML types (or a single Type object) contains a non-Type object.");
        }
      });
      const result = Object.create(Schema.prototype);
      result.implicit = (this.implicit || []).concat(implicit);
      result.explicit = (this.explicit || []).concat(explicit);
      result.compiledImplicit = compileList(result, "implicit");
      result.compiledExplicit = compileList(result, "explicit");
      result.compiledTypeMap = compileMap(result.compiledImplicit, result.compiledExplicit);
      return result;
    };
    module2.exports = Schema;
  }
});

// node_modules/js-yaml/lib/type/str.js
var require_str = __commonJS({
  "node_modules/js-yaml/lib/type/str.js"(exports2, module2) {
    "use strict";
    var Type = require_type();
    module2.exports = new Type("tag:yaml.org,2002:str", {
      kind: "scalar",
      construct: function(data) {
        return data !== null ? data : "";
      }
    });
  }
});

// node_modules/js-yaml/lib/type/seq.js
var require_seq = __commonJS({
  "node_modules/js-yaml/lib/type/seq.js"(exports2, module2) {
    "use strict";
    var Type = require_type();
    module2.exports = new Type("tag:yaml.org,2002:seq", {
      kind: "sequence",
      construct: function(data) {
        return data !== null ? data : [];
      }
    });
  }
});

// node_modules/js-yaml/lib/type/map.js
var require_map = __commonJS({
  "node_modules/js-yaml/lib/type/map.js"(exports2, module2) {
    "use strict";
    var Type = require_type();
    module2.exports = new Type("tag:yaml.org,2002:map", {
      kind: "mapping",
      construct: function(data) {
        return data !== null ? data : {};
      }
    });
  }
});

// node_modules/js-yaml/lib/schema/failsafe.js
var require_failsafe = __commonJS({
  "node_modules/js-yaml/lib/schema/failsafe.js"(exports2, module2) {
    "use strict";
    var Schema = require_schema();
    module2.exports = new Schema({
      explicit: [
        require_str(),
        require_seq(),
        require_map()
      ]
    });
  }
});

// node_modules/js-yaml/lib/type/null.js
var require_null = __commonJS({
  "node_modules/js-yaml/lib/type/null.js"(exports2, module2) {
    "use strict";
    var Type = require_type();
    function resolveYamlNull(data) {
      if (data === null) return true;
      const max = data.length;
      return max === 1 && data === "~" || max === 4 && (data === "null" || data === "Null" || data === "NULL");
    }
    function constructYamlNull() {
      return null;
    }
    function isNull(object) {
      return object === null;
    }
    module2.exports = new Type("tag:yaml.org,2002:null", {
      kind: "scalar",
      resolve: resolveYamlNull,
      construct: constructYamlNull,
      predicate: isNull,
      represent: {
        canonical: function() {
          return "~";
        },
        lowercase: function() {
          return "null";
        },
        uppercase: function() {
          return "NULL";
        },
        camelcase: function() {
          return "Null";
        },
        empty: function() {
          return "";
        }
      },
      defaultStyle: "lowercase"
    });
  }
});

// node_modules/js-yaml/lib/type/bool.js
var require_bool = __commonJS({
  "node_modules/js-yaml/lib/type/bool.js"(exports2, module2) {
    "use strict";
    var Type = require_type();
    function resolveYamlBoolean(data) {
      if (data === null) return false;
      const max = data.length;
      return max === 4 && (data === "true" || data === "True" || data === "TRUE") || max === 5 && (data === "false" || data === "False" || data === "FALSE");
    }
    function constructYamlBoolean(data) {
      return data === "true" || data === "True" || data === "TRUE";
    }
    function isBoolean(object) {
      return Object.prototype.toString.call(object) === "[object Boolean]";
    }
    module2.exports = new Type("tag:yaml.org,2002:bool", {
      kind: "scalar",
      resolve: resolveYamlBoolean,
      construct: constructYamlBoolean,
      predicate: isBoolean,
      represent: {
        lowercase: function(object) {
          return object ? "true" : "false";
        },
        uppercase: function(object) {
          return object ? "TRUE" : "FALSE";
        },
        camelcase: function(object) {
          return object ? "True" : "False";
        }
      },
      defaultStyle: "lowercase"
    });
  }
});

// node_modules/js-yaml/lib/type/int.js
var require_int = __commonJS({
  "node_modules/js-yaml/lib/type/int.js"(exports2, module2) {
    "use strict";
    var common = require_common2();
    var Type = require_type();
    function isHexCode(c) {
      return c >= 48 && c <= 57 || c >= 65 && c <= 70 || c >= 97 && c <= 102;
    }
    function isOctCode(c) {
      return c >= 48 && c <= 55;
    }
    function isDecCode(c) {
      return c >= 48 && c <= 57;
    }
    function resolveYamlInteger(data) {
      if (data === null) return false;
      const max = data.length;
      let index = 0;
      let hasDigits = false;
      if (!max) return false;
      let ch = data[index];
      if (ch === "-" || ch === "+") {
        ch = data[++index];
      }
      if (ch === "0") {
        if (index + 1 === max) return true;
        ch = data[++index];
        if (ch === "b") {
          index++;
          for (; index < max; index++) {
            ch = data[index];
            if (ch !== "0" && ch !== "1") return false;
            hasDigits = true;
          }
          return hasDigits && isFinite(parseYamlInteger(data));
        }
        if (ch === "x") {
          index++;
          for (; index < max; index++) {
            if (!isHexCode(data.charCodeAt(index))) return false;
            hasDigits = true;
          }
          return hasDigits && isFinite(parseYamlInteger(data));
        }
        if (ch === "o") {
          index++;
          for (; index < max; index++) {
            if (!isOctCode(data.charCodeAt(index))) return false;
            hasDigits = true;
          }
          return hasDigits && isFinite(parseYamlInteger(data));
        }
      }
      for (; index < max; index++) {
        if (!isDecCode(data.charCodeAt(index))) {
          return false;
        }
        hasDigits = true;
      }
      if (!hasDigits) return false;
      return isFinite(parseYamlInteger(data));
    }
    function parseYamlInteger(data) {
      let value = data;
      let sign = 1;
      let ch = value[0];
      if (ch === "-" || ch === "+") {
        if (ch === "-") sign = -1;
        value = value.slice(1);
        ch = value[0];
      }
      if (value === "0") return 0;
      if (ch === "0") {
        if (value[1] === "b") return sign * parseInt(value.slice(2), 2);
        if (value[1] === "x") return sign * parseInt(value.slice(2), 16);
        if (value[1] === "o") return sign * parseInt(value.slice(2), 8);
      }
      return sign * parseInt(value, 10);
    }
    function constructYamlInteger(data) {
      return parseYamlInteger(data);
    }
    function isInteger(object) {
      return Object.prototype.toString.call(object) === "[object Number]" && (object % 1 === 0 && !common.isNegativeZero(object));
    }
    module2.exports = new Type("tag:yaml.org,2002:int", {
      kind: "scalar",
      resolve: resolveYamlInteger,
      construct: constructYamlInteger,
      predicate: isInteger,
      represent: {
        binary: function(obj) {
          return obj >= 0 ? "0b" + obj.toString(2) : "-0b" + obj.toString(2).slice(1);
        },
        octal: function(obj) {
          return obj >= 0 ? "0o" + obj.toString(8) : "-0o" + obj.toString(8).slice(1);
        },
        decimal: function(obj) {
          return obj.toString(10);
        },
        hexadecimal: function(obj) {
          return obj >= 0 ? "0x" + obj.toString(16).toUpperCase() : "-0x" + obj.toString(16).toUpperCase().slice(1);
        }
      },
      defaultStyle: "decimal",
      styleAliases: {
        binary: [2, "bin"],
        octal: [8, "oct"],
        decimal: [10, "dec"],
        hexadecimal: [16, "hex"]
      }
    });
  }
});

// node_modules/js-yaml/lib/type/float.js
var require_float = __commonJS({
  "node_modules/js-yaml/lib/type/float.js"(exports2, module2) {
    "use strict";
    var common = require_common2();
    var Type = require_type();
    var YAML_FLOAT_PATTERN = new RegExp(
      // 2.5e4, 2.5 and integers
      "^(?:[-+]?(?:[0-9]+)(?:\\.[0-9]*)?(?:[eE][-+]?[0-9]+)?|\\.[0-9]+(?:[eE][-+]?[0-9]+)?|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$"
    );
    var YAML_FLOAT_SPECIAL_PATTERN = new RegExp(
      "^(?:[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$"
    );
    function resolveYamlFloat(data) {
      if (data === null) return false;
      if (!YAML_FLOAT_PATTERN.test(data)) {
        return false;
      }
      if (isFinite(parseFloat(data, 10))) {
        return true;
      }
      return YAML_FLOAT_SPECIAL_PATTERN.test(data);
    }
    function constructYamlFloat(data) {
      let value = data.toLowerCase();
      const sign = value[0] === "-" ? -1 : 1;
      if ("+-".indexOf(value[0]) >= 0) {
        value = value.slice(1);
      }
      if (value === ".inf") {
        return sign === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
      } else if (value === ".nan") {
        return NaN;
      }
      return sign * parseFloat(value, 10);
    }
    var SCIENTIFIC_WITHOUT_DOT = /^[-+]?[0-9]+e/;
    function representYamlFloat(object, style) {
      if (isNaN(object)) {
        switch (style) {
          case "lowercase":
            return ".nan";
          case "uppercase":
            return ".NAN";
          case "camelcase":
            return ".NaN";
        }
      } else if (Number.POSITIVE_INFINITY === object) {
        switch (style) {
          case "lowercase":
            return ".inf";
          case "uppercase":
            return ".INF";
          case "camelcase":
            return ".Inf";
        }
      } else if (Number.NEGATIVE_INFINITY === object) {
        switch (style) {
          case "lowercase":
            return "-.inf";
          case "uppercase":
            return "-.INF";
          case "camelcase":
            return "-.Inf";
        }
      } else if (common.isNegativeZero(object)) {
        return "-0.0";
      }
      const res = object.toString(10);
      return SCIENTIFIC_WITHOUT_DOT.test(res) ? res.replace("e", ".e") : res;
    }
    function isFloat(object) {
      return Object.prototype.toString.call(object) === "[object Number]" && (object % 1 !== 0 || common.isNegativeZero(object));
    }
    module2.exports = new Type("tag:yaml.org,2002:float", {
      kind: "scalar",
      resolve: resolveYamlFloat,
      construct: constructYamlFloat,
      predicate: isFloat,
      represent: representYamlFloat,
      defaultStyle: "lowercase"
    });
  }
});

// node_modules/js-yaml/lib/schema/json.js
var require_json2 = __commonJS({
  "node_modules/js-yaml/lib/schema/json.js"(exports2, module2) {
    "use strict";
    module2.exports = require_failsafe().extend({
      implicit: [
        require_null(),
        require_bool(),
        require_int(),
        require_float()
      ]
    });
  }
});

// node_modules/js-yaml/lib/schema/core.js
var require_core = __commonJS({
  "node_modules/js-yaml/lib/schema/core.js"(exports2, module2) {
    "use strict";
    module2.exports = require_json2();
  }
});

// node_modules/js-yaml/lib/type/timestamp.js
var require_timestamp = __commonJS({
  "node_modules/js-yaml/lib/type/timestamp.js"(exports2, module2) {
    "use strict";
    var Type = require_type();
    var YAML_DATE_REGEXP = new RegExp(
      "^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$"
    );
    var YAML_TIMESTAMP_REGEXP = new RegExp(
      "^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$"
    );
    function resolveYamlTimestamp(data) {
      if (data === null) return false;
      if (YAML_DATE_REGEXP.exec(data) !== null) return true;
      if (YAML_TIMESTAMP_REGEXP.exec(data) !== null) return true;
      return false;
    }
    function constructYamlTimestamp(data) {
      let fraction = 0;
      let delta = null;
      let match = YAML_DATE_REGEXP.exec(data);
      if (match === null) match = YAML_TIMESTAMP_REGEXP.exec(data);
      if (match === null) throw new Error("Date resolve error");
      const year = +match[1];
      const month = +match[2] - 1;
      const day = +match[3];
      if (!match[4]) {
        return new Date(Date.UTC(year, month, day));
      }
      const hour = +match[4];
      const minute = +match[5];
      const second = +match[6];
      if (match[7]) {
        fraction = match[7].slice(0, 3);
        while (fraction.length < 3) {
          fraction += "0";
        }
        fraction = +fraction;
      }
      if (match[9]) {
        const tzHour = +match[10];
        const tzMinute = +(match[11] || 0);
        delta = (tzHour * 60 + tzMinute) * 6e4;
        if (match[9] === "-") delta = -delta;
      }
      const date = new Date(Date.UTC(year, month, day, hour, minute, second, fraction));
      if (delta) date.setTime(date.getTime() - delta);
      return date;
    }
    function representYamlTimestamp(object) {
      return object.toISOString();
    }
    module2.exports = new Type("tag:yaml.org,2002:timestamp", {
      kind: "scalar",
      resolve: resolveYamlTimestamp,
      construct: constructYamlTimestamp,
      instanceOf: Date,
      represent: representYamlTimestamp
    });
  }
});

// node_modules/js-yaml/lib/type/merge.js
var require_merge = __commonJS({
  "node_modules/js-yaml/lib/type/merge.js"(exports2, module2) {
    "use strict";
    var Type = require_type();
    function resolveYamlMerge(data) {
      return data === "<<" || data === null;
    }
    module2.exports = new Type("tag:yaml.org,2002:merge", {
      kind: "scalar",
      resolve: resolveYamlMerge
    });
  }
});

// node_modules/js-yaml/lib/type/binary.js
var require_binary = __commonJS({
  "node_modules/js-yaml/lib/type/binary.js"(exports2, module2) {
    "use strict";
    var Type = require_type();
    var BASE64_MAP = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=\n\r";
    function resolveYamlBinary(data) {
      if (data === null) return false;
      let bitlen = 0;
      const max = data.length;
      const map = BASE64_MAP;
      for (let idx = 0; idx < max; idx++) {
        const code = map.indexOf(data.charAt(idx));
        if (code > 64) continue;
        if (code < 0) return false;
        bitlen += 6;
      }
      return bitlen % 8 === 0;
    }
    function constructYamlBinary(data) {
      const input = data.replace(/[\r\n=]/g, "");
      const max = input.length;
      const map = BASE64_MAP;
      let bits = 0;
      const result = [];
      for (let idx = 0; idx < max; idx++) {
        if (idx % 4 === 0 && idx) {
          result.push(bits >> 16 & 255);
          result.push(bits >> 8 & 255);
          result.push(bits & 255);
        }
        bits = bits << 6 | map.indexOf(input.charAt(idx));
      }
      const tailbits = max % 4 * 6;
      if (tailbits === 0) {
        result.push(bits >> 16 & 255);
        result.push(bits >> 8 & 255);
        result.push(bits & 255);
      } else if (tailbits === 18) {
        result.push(bits >> 10 & 255);
        result.push(bits >> 2 & 255);
      } else if (tailbits === 12) {
        result.push(bits >> 4 & 255);
      }
      return new Uint8Array(result);
    }
    function representYamlBinary(object) {
      let result = "";
      let bits = 0;
      const max = object.length;
      const map = BASE64_MAP;
      for (let idx = 0; idx < max; idx++) {
        if (idx % 3 === 0 && idx) {
          result += map[bits >> 18 & 63];
          result += map[bits >> 12 & 63];
          result += map[bits >> 6 & 63];
          result += map[bits & 63];
        }
        bits = (bits << 8) + object[idx];
      }
      const tail = max % 3;
      if (tail === 0) {
        result += map[bits >> 18 & 63];
        result += map[bits >> 12 & 63];
        result += map[bits >> 6 & 63];
        result += map[bits & 63];
      } else if (tail === 2) {
        result += map[bits >> 10 & 63];
        result += map[bits >> 4 & 63];
        result += map[bits << 2 & 63];
        result += map[64];
      } else if (tail === 1) {
        result += map[bits >> 2 & 63];
        result += map[bits << 4 & 63];
        result += map[64];
        result += map[64];
      }
      return result;
    }
    function isBinary(obj) {
      return Object.prototype.toString.call(obj) === "[object Uint8Array]";
    }
    module2.exports = new Type("tag:yaml.org,2002:binary", {
      kind: "scalar",
      resolve: resolveYamlBinary,
      construct: constructYamlBinary,
      predicate: isBinary,
      represent: representYamlBinary
    });
  }
});

// node_modules/js-yaml/lib/type/omap.js
var require_omap = __commonJS({
  "node_modules/js-yaml/lib/type/omap.js"(exports2, module2) {
    "use strict";
    var Type = require_type();
    var _hasOwnProperty = Object.prototype.hasOwnProperty;
    var _toString = Object.prototype.toString;
    function resolveYamlOmap(data) {
      if (data === null) return true;
      const objectKeys = {};
      const object = data;
      for (let index = 0, length = object.length; index < length; index += 1) {
        const pair = object[index];
        let pairHasKey = false;
        if (_toString.call(pair) !== "[object Object]") return false;
        let pairKey;
        for (pairKey in pair) {
          if (_hasOwnProperty.call(pair, pairKey)) {
            if (!pairHasKey) pairHasKey = true;
            else return false;
          }
        }
        if (!pairHasKey) return false;
        if (_hasOwnProperty.call(objectKeys, pairKey)) return false;
        Object.defineProperty(objectKeys, pairKey, { value: true });
      }
      return true;
    }
    function constructYamlOmap(data) {
      return data !== null ? data : [];
    }
    module2.exports = new Type("tag:yaml.org,2002:omap", {
      kind: "sequence",
      resolve: resolveYamlOmap,
      construct: constructYamlOmap
    });
  }
});

// node_modules/js-yaml/lib/type/pairs.js
var require_pairs = __commonJS({
  "node_modules/js-yaml/lib/type/pairs.js"(exports2, module2) {
    "use strict";
    var Type = require_type();
    var _toString = Object.prototype.toString;
    function resolveYamlPairs(data) {
      if (data === null) return true;
      const object = data;
      const result = new Array(object.length);
      for (let index = 0, length = object.length; index < length; index += 1) {
        const pair = object[index];
        if (_toString.call(pair) !== "[object Object]") return false;
        const keys = Object.keys(pair);
        if (keys.length !== 1) return false;
        result[index] = [keys[0], pair[keys[0]]];
      }
      return true;
    }
    function constructYamlPairs(data) {
      if (data === null) return [];
      const object = data;
      const result = new Array(object.length);
      for (let index = 0, length = object.length; index < length; index += 1) {
        const pair = object[index];
        const keys = Object.keys(pair);
        result[index] = [keys[0], pair[keys[0]]];
      }
      return result;
    }
    module2.exports = new Type("tag:yaml.org,2002:pairs", {
      kind: "sequence",
      resolve: resolveYamlPairs,
      construct: constructYamlPairs
    });
  }
});

// node_modules/js-yaml/lib/type/set.js
var require_set = __commonJS({
  "node_modules/js-yaml/lib/type/set.js"(exports2, module2) {
    "use strict";
    var Type = require_type();
    var _hasOwnProperty = Object.prototype.hasOwnProperty;
    function resolveYamlSet(data) {
      if (data === null) return true;
      const object = data;
      for (const key in object) {
        if (_hasOwnProperty.call(object, key)) {
          if (object[key] !== null) return false;
        }
      }
      return true;
    }
    function constructYamlSet(data) {
      return data !== null ? data : {};
    }
    module2.exports = new Type("tag:yaml.org,2002:set", {
      kind: "mapping",
      resolve: resolveYamlSet,
      construct: constructYamlSet
    });
  }
});

// node_modules/js-yaml/lib/schema/default.js
var require_default = __commonJS({
  "node_modules/js-yaml/lib/schema/default.js"(exports2, module2) {
    "use strict";
    module2.exports = require_core().extend({
      implicit: [
        require_timestamp(),
        require_merge()
      ],
      explicit: [
        require_binary(),
        require_omap(),
        require_pairs(),
        require_set()
      ]
    });
  }
});

// node_modules/js-yaml/lib/loader.js
var require_loader = __commonJS({
  "node_modules/js-yaml/lib/loader.js"(exports2, module2) {
    "use strict";
    var common = require_common2();
    var YAMLException = require_exception();
    var makeSnippet = require_snippet();
    var DEFAULT_SCHEMA = require_default();
    var _hasOwnProperty = Object.prototype.hasOwnProperty;
    var CONTEXT_FLOW_IN = 1;
    var CONTEXT_FLOW_OUT = 2;
    var CONTEXT_BLOCK_IN = 3;
    var CONTEXT_BLOCK_OUT = 4;
    var CHOMPING_CLIP = 1;
    var CHOMPING_STRIP = 2;
    var CHOMPING_KEEP = 3;
    var PATTERN_NON_PRINTABLE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;
    var PATTERN_NON_ASCII_LINE_BREAKS = /[\x85\u2028\u2029]/;
    var PATTERN_FLOW_INDICATORS = /[,\[\]{}]/;
    var PATTERN_TAG_HANDLE = /^(?:!|!!|![0-9A-Za-z-]+!)$/;
    var PATTERN_TAG_URI = /^(?:!|[^,\[\]{}])(?:%[0-9a-f]{2}|[0-9a-z\-#;/?:@&=+$,_.!~*'()\[\]])*$/i;
    function _class(obj) {
      return Object.prototype.toString.call(obj);
    }
    function isEol(c) {
      return c === 10 || c === 13;
    }
    function isWhiteSpace(c) {
      return c === 9 || c === 32;
    }
    function isWsOrEol(c) {
      return c === 9 || c === 32 || c === 10 || c === 13;
    }
    function isFlowIndicator(c) {
      return c === 44 || c === 91 || c === 93 || c === 123 || c === 125;
    }
    function fromHexCode(c) {
      if (c >= 48 && c <= 57) {
        return c - 48;
      }
      const lc = c | 32;
      if (lc >= 97 && lc <= 102) {
        return lc - 97 + 10;
      }
      return -1;
    }
    function escapedHexLen(c) {
      if (c === 120) {
        return 2;
      }
      if (c === 117) {
        return 4;
      }
      if (c === 85) {
        return 8;
      }
      return 0;
    }
    function fromDecimalCode(c) {
      if (c >= 48 && c <= 57) {
        return c - 48;
      }
      return -1;
    }
    function simpleEscapeSequence(c) {
      switch (c) {
        case 48:
          return "\0";
        case 97:
          return "\x07";
        case 98:
          return "\b";
        case 116:
          return "	";
        case 9:
          return "	";
        case 110:
          return "\n";
        case 118:
          return "\v";
        case 102:
          return "\f";
        case 114:
          return "\r";
        case 101:
          return "\x1B";
        case 32:
          return " ";
        case 34:
          return '"';
        case 47:
          return "/";
        case 92:
          return "\\";
        case 78:
          return "\x85";
        case 95:
          return "\xA0";
        case 76:
          return "\u2028";
        case 80:
          return "\u2029";
        default:
          return "";
      }
    }
    function charFromCodepoint(c) {
      if (c <= 65535) {
        return String.fromCharCode(c);
      }
      return String.fromCharCode(
        (c - 65536 >> 10) + 55296,
        (c - 65536 & 1023) + 56320
      );
    }
    function setProperty(object, key, value) {
      if (key === "__proto__") {
        Object.defineProperty(object, key, {
          configurable: true,
          enumerable: true,
          writable: true,
          value
        });
      } else {
        object[key] = value;
      }
    }
    var simpleEscapeCheck = new Array(256);
    var simpleEscapeMap = new Array(256);
    for (let i = 0; i < 256; i++) {
      simpleEscapeCheck[i] = simpleEscapeSequence(i) ? 1 : 0;
      simpleEscapeMap[i] = simpleEscapeSequence(i);
    }
    function State(input, options) {
      this.input = input;
      this.filename = options["filename"] || null;
      this.schema = options["schema"] || DEFAULT_SCHEMA;
      this.onWarning = options["onWarning"] || null;
      this.legacy = options["legacy"] || false;
      this.json = options["json"] || false;
      this.listener = options["listener"] || null;
      this.maxDepth = typeof options["maxDepth"] === "number" ? options["maxDepth"] : 100;
      this.maxTotalMergeKeys = typeof options["maxTotalMergeKeys"] === "number" ? options["maxTotalMergeKeys"] : 1e4;
      this.implicitTypes = this.schema.compiledImplicit;
      this.typeMap = this.schema.compiledTypeMap;
      this.length = input.length;
      this.position = 0;
      this.line = 0;
      this.lineStart = 0;
      this.lineIndent = 0;
      this.depth = 0;
      this.totalMergeKeys = 0;
      this.firstTabInLine = -1;
      this.documents = [];
      this.anchorMapTransactions = [];
    }
    function generateError(state, message) {
      const mark = {
        name: state.filename,
        buffer: state.input.slice(0, -1),
        // omit trailing \0
        position: state.position,
        line: state.line,
        column: state.position - state.lineStart
      };
      mark.snippet = makeSnippet(mark);
      return new YAMLException(message, mark);
    }
    function throwError(state, message) {
      throw generateError(state, message);
    }
    function throwWarning(state, message) {
      if (state.onWarning) {
        state.onWarning.call(null, generateError(state, message));
      }
    }
    function storeAnchor(state, name, value) {
      const transactions = state.anchorMapTransactions;
      if (transactions.length !== 0) {
        const transaction = transactions[transactions.length - 1];
        if (!_hasOwnProperty.call(transaction, name)) {
          transaction[name] = {
            existed: _hasOwnProperty.call(state.anchorMap, name),
            value: state.anchorMap[name]
          };
        }
      }
      state.anchorMap[name] = value;
    }
    function beginAnchorTransaction(state) {
      state.anchorMapTransactions.push(/* @__PURE__ */ Object.create(null));
    }
    function commitAnchorTransaction(state) {
      const transaction = state.anchorMapTransactions.pop();
      const transactions = state.anchorMapTransactions;
      if (transactions.length === 0) return;
      const parent = transactions[transactions.length - 1];
      const names = Object.keys(transaction);
      for (let index = 0, length = names.length; index < length; index += 1) {
        const name = names[index];
        if (!_hasOwnProperty.call(parent, name)) {
          parent[name] = transaction[name];
        }
      }
    }
    function rollbackAnchorTransaction(state) {
      const transaction = state.anchorMapTransactions.pop();
      const names = Object.keys(transaction);
      for (let index = names.length - 1; index >= 0; index -= 1) {
        const entry = transaction[names[index]];
        if (entry.existed) {
          state.anchorMap[names[index]] = entry.value;
        } else {
          delete state.anchorMap[names[index]];
        }
      }
    }
    function snapshotState(state) {
      return {
        position: state.position,
        line: state.line,
        lineStart: state.lineStart,
        lineIndent: state.lineIndent,
        firstTabInLine: state.firstTabInLine,
        tag: state.tag,
        anchor: state.anchor,
        kind: state.kind,
        result: state.result
      };
    }
    function restoreState(state, snapshot) {
      state.position = snapshot.position;
      state.line = snapshot.line;
      state.lineStart = snapshot.lineStart;
      state.lineIndent = snapshot.lineIndent;
      state.firstTabInLine = snapshot.firstTabInLine;
      state.tag = snapshot.tag;
      state.anchor = snapshot.anchor;
      state.kind = snapshot.kind;
      state.result = snapshot.result;
    }
    var directiveHandlers = {
      YAML: function handleYamlDirective(state, name, args) {
        if (state.version !== null) {
          throwError(state, "duplication of %YAML directive");
        }
        if (args.length !== 1) {
          throwError(state, "YAML directive accepts exactly one argument");
        }
        const match = /^([0-9]+)\.([0-9]+)$/.exec(args[0]);
        if (match === null) {
          throwError(state, "ill-formed argument of the YAML directive");
        }
        const major = parseInt(match[1], 10);
        const minor = parseInt(match[2], 10);
        if (major !== 1) {
          throwError(state, "unacceptable YAML version of the document");
        }
        state.version = args[0];
        state.checkLineBreaks = minor < 2;
        if (minor !== 1 && minor !== 2) {
          throwWarning(state, "unsupported YAML version of the document");
        }
      },
      TAG: function handleTagDirective(state, name, args) {
        let prefix;
        if (args.length !== 2) {
          throwError(state, "TAG directive accepts exactly two arguments");
        }
        const handle = args[0];
        prefix = args[1];
        if (!PATTERN_TAG_HANDLE.test(handle)) {
          throwError(state, "ill-formed tag handle (first argument) of the TAG directive");
        }
        if (_hasOwnProperty.call(state.tagMap, handle)) {
          throwError(state, 'there is a previously declared suffix for "' + handle + '" tag handle');
        }
        if (!PATTERN_TAG_URI.test(prefix)) {
          throwError(state, "ill-formed tag prefix (second argument) of the TAG directive");
        }
        try {
          prefix = decodeURIComponent(prefix);
        } catch (err) {
          throwError(state, "tag prefix is malformed: " + prefix);
        }
        state.tagMap[handle] = prefix;
      }
    };
    function captureSegment(state, start, end, checkJson) {
      if (start < end) {
        const _result = state.input.slice(start, end);
        if (checkJson) {
          for (let _position = 0, _length = _result.length; _position < _length; _position += 1) {
            const _character = _result.charCodeAt(_position);
            if (!(_character === 9 || _character >= 32 && _character <= 1114111)) {
              throwError(state, "expected valid JSON character");
            }
          }
        } else if (PATTERN_NON_PRINTABLE.test(_result)) {
          throwError(state, "the stream contains non-printable characters");
        }
        state.result += _result;
      }
    }
    function chargeMergeWork(state) {
      state.totalMergeKeys++;
      if (state.maxTotalMergeKeys !== -1 && state.totalMergeKeys > state.maxTotalMergeKeys) {
        throwError(state, "merge keys exceeded maxTotalMergeKeys (" + state.maxTotalMergeKeys + ")");
      }
    }
    function mergeMappings(state, destination, source, overridableKeys) {
      if (!common.isObject(source)) {
        throwError(state, "cannot merge mappings; the provided source object is unacceptable");
      }
      chargeMergeWork(state);
      const sourceKeys = Object.keys(source);
      for (let index = 0, quantity = sourceKeys.length; index < quantity; index += 1) {
        const key = sourceKeys[index];
        chargeMergeWork(state);
        if (!_hasOwnProperty.call(destination, key)) {
          setProperty(destination, key, source[key]);
          overridableKeys[key] = true;
        }
      }
    }
    function storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, startLine, startLineStart, startPos) {
      if (Array.isArray(keyNode)) {
        keyNode = Array.prototype.slice.call(keyNode);
        for (let index = 0, quantity = keyNode.length; index < quantity; index += 1) {
          if (Array.isArray(keyNode[index])) {
            throwError(state, "nested arrays are not supported inside keys");
          }
          if (typeof keyNode === "object" && _class(keyNode[index]) === "[object Object]") {
            keyNode[index] = "[object Object]";
          }
        }
      }
      if (typeof keyNode === "object" && _class(keyNode) === "[object Object]") {
        keyNode = "[object Object]";
      }
      keyNode = String(keyNode);
      if (_result === null) {
        _result = {};
      }
      if (keyTag === "tag:yaml.org,2002:merge") {
        if (Array.isArray(valueNode)) {
          if (valueNode.length > 100) {
            throwError(state, "abnormal merge sequence size");
          }
          for (let index = 0, quantity = valueNode.length; index < quantity; index += 1) {
            mergeMappings(state, _result, valueNode[index], overridableKeys);
          }
        } else {
          mergeMappings(state, _result, valueNode, overridableKeys);
        }
      } else {
        if (!state.json && !_hasOwnProperty.call(overridableKeys, keyNode) && _hasOwnProperty.call(_result, keyNode)) {
          state.line = startLine || state.line;
          state.lineStart = startLineStart || state.lineStart;
          state.position = startPos || state.position;
          throwError(state, "duplicated mapping key");
        }
        setProperty(_result, keyNode, valueNode);
        delete overridableKeys[keyNode];
      }
      return _result;
    }
    function readLineBreak(state) {
      const ch = state.input.charCodeAt(state.position);
      if (ch === 10) {
        state.position++;
      } else if (ch === 13) {
        state.position++;
        if (state.input.charCodeAt(state.position) === 10) {
          state.position++;
        }
      } else {
        throwError(state, "a line break is expected");
      }
      state.line += 1;
      state.lineStart = state.position;
      state.firstTabInLine = -1;
    }
    function skipSeparationSpace(state, allowComments, checkIndent) {
      let lineBreaks = 0;
      let ch = state.input.charCodeAt(state.position);
      while (ch !== 0) {
        while (isWhiteSpace(ch)) {
          if (ch === 9 && state.firstTabInLine === -1) {
            state.firstTabInLine = state.position;
          }
          ch = state.input.charCodeAt(++state.position);
        }
        if (allowComments && ch === 35) {
          do {
            ch = state.input.charCodeAt(++state.position);
          } while (ch !== 10 && ch !== 13 && ch !== 0);
        }
        if (isEol(ch)) {
          readLineBreak(state);
          ch = state.input.charCodeAt(state.position);
          lineBreaks++;
          state.lineIndent = 0;
          while (ch === 32) {
            state.lineIndent++;
            ch = state.input.charCodeAt(++state.position);
          }
        } else {
          break;
        }
      }
      if (checkIndent !== -1 && lineBreaks !== 0 && state.lineIndent < checkIndent) {
        throwWarning(state, "deficient indentation");
      }
      return lineBreaks;
    }
    function testDocumentSeparator(state) {
      let _position = state.position;
      let ch = state.input.charCodeAt(_position);
      if ((ch === 45 || ch === 46) && ch === state.input.charCodeAt(_position + 1) && ch === state.input.charCodeAt(_position + 2)) {
        _position += 3;
        ch = state.input.charCodeAt(_position);
        if (ch === 0 || isWsOrEol(ch)) {
          return true;
        }
      }
      return false;
    }
    function writeFoldedLines(state, count) {
      if (count === 1) {
        state.result += " ";
      } else if (count > 1) {
        state.result += common.repeat("\n", count - 1);
      }
    }
    function readPlainScalar(state, nodeIndent, withinFlowCollection) {
      let captureStart;
      let captureEnd;
      let hasPendingContent;
      let _line;
      let _lineStart;
      let _lineIndent;
      const _kind = state.kind;
      const _result = state.result;
      let ch = state.input.charCodeAt(state.position);
      if (isWsOrEol(ch) || isFlowIndicator(ch) || ch === 35 || ch === 38 || ch === 42 || ch === 33 || ch === 124 || ch === 62 || ch === 39 || ch === 34 || ch === 37 || ch === 64 || ch === 96) {
        return false;
      }
      if (ch === 63 || ch === 45) {
        const following = state.input.charCodeAt(state.position + 1);
        if (isWsOrEol(following) || withinFlowCollection && isFlowIndicator(following)) {
          return false;
        }
      }
      state.kind = "scalar";
      state.result = "";
      captureStart = captureEnd = state.position;
      hasPendingContent = false;
      while (ch !== 0) {
        if (ch === 58) {
          const following = state.input.charCodeAt(state.position + 1);
          if (isWsOrEol(following) || withinFlowCollection && isFlowIndicator(following)) {
            break;
          }
        } else if (ch === 35) {
          const preceding = state.input.charCodeAt(state.position - 1);
          if (isWsOrEol(preceding)) {
            break;
          }
        } else if (state.position === state.lineStart && testDocumentSeparator(state) || withinFlowCollection && isFlowIndicator(ch)) {
          break;
        } else if (isEol(ch)) {
          _line = state.line;
          _lineStart = state.lineStart;
          _lineIndent = state.lineIndent;
          skipSeparationSpace(state, false, -1);
          if (state.lineIndent >= nodeIndent) {
            hasPendingContent = true;
            ch = state.input.charCodeAt(state.position);
            continue;
          } else {
            state.position = captureEnd;
            state.line = _line;
            state.lineStart = _lineStart;
            state.lineIndent = _lineIndent;
            break;
          }
        }
        if (hasPendingContent) {
          captureSegment(state, captureStart, captureEnd, false);
          writeFoldedLines(state, state.line - _line);
          captureStart = captureEnd = state.position;
          hasPendingContent = false;
        }
        if (!isWhiteSpace(ch)) {
          captureEnd = state.position + 1;
        }
        ch = state.input.charCodeAt(++state.position);
      }
      captureSegment(state, captureStart, captureEnd, false);
      if (state.result) {
        return true;
      }
      state.kind = _kind;
      state.result = _result;
      return false;
    }
    function readSingleQuotedScalar(state, nodeIndent) {
      let captureStart;
      let captureEnd;
      let ch = state.input.charCodeAt(state.position);
      if (ch !== 39) {
        return false;
      }
      state.kind = "scalar";
      state.result = "";
      state.position++;
      captureStart = captureEnd = state.position;
      while ((ch = state.input.charCodeAt(state.position)) !== 0) {
        if (ch === 39) {
          captureSegment(state, captureStart, state.position, true);
          ch = state.input.charCodeAt(++state.position);
          if (ch === 39) {
            captureStart = state.position;
            state.position++;
            captureEnd = state.position;
          } else {
            return true;
          }
        } else if (isEol(ch)) {
          captureSegment(state, captureStart, captureEnd, true);
          writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
          captureStart = captureEnd = state.position;
        } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
          throwError(state, "unexpected end of the document within a single quoted scalar");
        } else {
          state.position++;
          if (!isWhiteSpace(ch)) {
            captureEnd = state.position;
          }
        }
      }
      throwError(state, "unexpected end of the stream within a single quoted scalar");
    }
    function readDoubleQuotedScalar(state, nodeIndent) {
      let captureStart;
      let captureEnd;
      let tmp;
      let ch = state.input.charCodeAt(state.position);
      if (ch !== 34) {
        return false;
      }
      state.kind = "scalar";
      state.result = "";
      state.position++;
      captureStart = captureEnd = state.position;
      while ((ch = state.input.charCodeAt(state.position)) !== 0) {
        if (ch === 34) {
          captureSegment(state, captureStart, state.position, true);
          state.position++;
          return true;
        } else if (ch === 92) {
          captureSegment(state, captureStart, state.position, true);
          ch = state.input.charCodeAt(++state.position);
          if (isEol(ch)) {
            skipSeparationSpace(state, false, nodeIndent);
          } else if (ch < 256 && simpleEscapeCheck[ch]) {
            state.result += simpleEscapeMap[ch];
            state.position++;
          } else if ((tmp = escapedHexLen(ch)) > 0) {
            let hexLength = tmp;
            let hexResult = 0;
            for (; hexLength > 0; hexLength--) {
              ch = state.input.charCodeAt(++state.position);
              if ((tmp = fromHexCode(ch)) >= 0) {
                hexResult = (hexResult << 4) + tmp;
              } else {
                throwError(state, "expected hexadecimal character");
              }
            }
            state.result += charFromCodepoint(hexResult);
            state.position++;
          } else {
            throwError(state, "unknown escape sequence");
          }
          captureStart = captureEnd = state.position;
        } else if (isEol(ch)) {
          captureSegment(state, captureStart, captureEnd, true);
          writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
          captureStart = captureEnd = state.position;
        } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
          throwError(state, "unexpected end of the document within a double quoted scalar");
        } else {
          state.position++;
          if (!isWhiteSpace(ch)) {
            captureEnd = state.position;
          }
        }
      }
      throwError(state, "unexpected end of the stream within a double quoted scalar");
    }
    function readFlowCollection(state, nodeIndent) {
      let readNext = true;
      let _line;
      let _lineStart;
      let _pos;
      const _tag = state.tag;
      let _result;
      const _anchor = state.anchor;
      let terminator;
      let isPair;
      let isExplicitPair;
      let isMapping;
      const overridableKeys = /* @__PURE__ */ Object.create(null);
      let keyNode;
      let keyTag;
      let valueNode;
      let ch = state.input.charCodeAt(state.position);
      if (ch === 91) {
        terminator = 93;
        isMapping = false;
        _result = [];
      } else if (ch === 123) {
        terminator = 125;
        isMapping = true;
        _result = {};
      } else {
        return false;
      }
      if (state.anchor !== null) {
        storeAnchor(state, state.anchor, _result);
      }
      ch = state.input.charCodeAt(++state.position);
      while (ch !== 0) {
        skipSeparationSpace(state, true, nodeIndent);
        ch = state.input.charCodeAt(state.position);
        if (ch === terminator) {
          state.position++;
          state.tag = _tag;
          state.anchor = _anchor;
          state.kind = isMapping ? "mapping" : "sequence";
          state.result = _result;
          return true;
        } else if (!readNext) {
          throwError(state, "missed comma between flow collection entries");
        } else if (ch === 44) {
          throwError(state, "expected the node content, but found ','");
        }
        keyTag = keyNode = valueNode = null;
        isPair = isExplicitPair = false;
        if (ch === 63) {
          const following = state.input.charCodeAt(state.position + 1);
          if (isWsOrEol(following)) {
            isPair = isExplicitPair = true;
            state.position++;
            skipSeparationSpace(state, true, nodeIndent);
          }
        }
        _line = state.line;
        _lineStart = state.lineStart;
        _pos = state.position;
        composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
        keyTag = state.tag;
        keyNode = state.result;
        skipSeparationSpace(state, true, nodeIndent);
        ch = state.input.charCodeAt(state.position);
        if ((isExplicitPair || state.line === _line) && ch === 58) {
          isPair = true;
          ch = state.input.charCodeAt(++state.position);
          skipSeparationSpace(state, true, nodeIndent);
          composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
          valueNode = state.result;
        }
        if (isMapping) {
          storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _line, _lineStart, _pos);
        } else if (isPair) {
          _result.push(storeMappingPair(state, null, overridableKeys, keyTag, keyNode, valueNode, _line, _lineStart, _pos));
        } else {
          _result.push(keyNode);
        }
        skipSeparationSpace(state, true, nodeIndent);
        ch = state.input.charCodeAt(state.position);
        if (ch === 44) {
          readNext = true;
          ch = state.input.charCodeAt(++state.position);
        } else {
          readNext = false;
        }
      }
      throwError(state, "unexpected end of the stream within a flow collection");
    }
    function readBlockScalar(state, nodeIndent) {
      let folding;
      let chomping = CHOMPING_CLIP;
      let didReadContent = false;
      let detectedIndent = false;
      let textIndent = nodeIndent;
      let emptyLines = 0;
      let atMoreIndented = false;
      let tmp;
      let ch = state.input.charCodeAt(state.position);
      if (ch === 124) {
        folding = false;
      } else if (ch === 62) {
        folding = true;
      } else {
        return false;
      }
      state.kind = "scalar";
      state.result = "";
      while (ch !== 0) {
        ch = state.input.charCodeAt(++state.position);
        if (ch === 43 || ch === 45) {
          if (CHOMPING_CLIP === chomping) {
            chomping = ch === 43 ? CHOMPING_KEEP : CHOMPING_STRIP;
          } else {
            throwError(state, "repeat of a chomping mode identifier");
          }
        } else if ((tmp = fromDecimalCode(ch)) >= 0) {
          if (tmp === 0) {
            throwError(state, "bad explicit indentation width of a block scalar; it cannot be less than one");
          } else if (!detectedIndent) {
            textIndent = nodeIndent + tmp - 1;
            detectedIndent = true;
          } else {
            throwError(state, "repeat of an indentation width identifier");
          }
        } else {
          break;
        }
      }
      if (isWhiteSpace(ch)) {
        do {
          ch = state.input.charCodeAt(++state.position);
        } while (isWhiteSpace(ch));
        if (ch === 35) {
          do {
            ch = state.input.charCodeAt(++state.position);
          } while (!isEol(ch) && ch !== 0);
        }
      }
      while (ch !== 0) {
        readLineBreak(state);
        state.lineIndent = 0;
        ch = state.input.charCodeAt(state.position);
        while ((!detectedIndent || state.lineIndent < textIndent) && ch === 32) {
          state.lineIndent++;
          ch = state.input.charCodeAt(++state.position);
        }
        if (!detectedIndent && state.lineIndent > textIndent) {
          textIndent = state.lineIndent;
        }
        if (isEol(ch)) {
          emptyLines++;
          continue;
        }
        if (!detectedIndent && textIndent === 0) {
          throwError(state, "missing indentation for block scalar");
        }
        if (state.lineIndent < textIndent) {
          if (chomping === CHOMPING_KEEP) {
            state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
          } else if (chomping === CHOMPING_CLIP) {
            if (didReadContent) {
              state.result += "\n";
            }
          }
          break;
        }
        if (folding) {
          if (isWhiteSpace(ch)) {
            atMoreIndented = true;
            state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
          } else if (atMoreIndented) {
            atMoreIndented = false;
            state.result += common.repeat("\n", emptyLines + 1);
          } else if (emptyLines === 0) {
            if (didReadContent) {
              state.result += " ";
            }
          } else {
            state.result += common.repeat("\n", emptyLines);
          }
        } else {
          state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
        }
        didReadContent = true;
        detectedIndent = true;
        emptyLines = 0;
        const captureStart = state.position;
        while (!isEol(ch) && ch !== 0) {
          ch = state.input.charCodeAt(++state.position);
        }
        captureSegment(state, captureStart, state.position, false);
      }
      return true;
    }
    function readBlockSequence(state, nodeIndent) {
      const _tag = state.tag;
      const _anchor = state.anchor;
      const _result = [];
      let detected = false;
      if (state.firstTabInLine !== -1) return false;
      if (state.anchor !== null) {
        storeAnchor(state, state.anchor, _result);
      }
      let ch = state.input.charCodeAt(state.position);
      while (ch !== 0) {
        if (state.firstTabInLine !== -1) {
          state.position = state.firstTabInLine;
          throwError(state, "tab characters must not be used in indentation");
        }
        if (ch !== 45) {
          break;
        }
        const following = state.input.charCodeAt(state.position + 1);
        if (!isWsOrEol(following)) {
          break;
        }
        detected = true;
        state.position++;
        if (skipSeparationSpace(state, true, -1)) {
          if (state.lineIndent <= nodeIndent) {
            _result.push(null);
            ch = state.input.charCodeAt(state.position);
            continue;
          }
        }
        const _line = state.line;
        composeNode(state, nodeIndent, CONTEXT_BLOCK_IN, false, true);
        _result.push(state.result);
        skipSeparationSpace(state, true, -1);
        ch = state.input.charCodeAt(state.position);
        if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0) {
          throwError(state, "bad indentation of a sequence entry");
        } else if (state.lineIndent < nodeIndent) {
          break;
        }
      }
      if (detected) {
        state.tag = _tag;
        state.anchor = _anchor;
        state.kind = "sequence";
        state.result = _result;
        return true;
      }
      return false;
    }
    function readBlockMapping(state, nodeIndent, flowIndent) {
      let allowCompact;
      let _keyLine;
      let _keyLineStart;
      let _keyPos;
      const _tag = state.tag;
      const _anchor = state.anchor;
      const _result = {};
      const overridableKeys = /* @__PURE__ */ Object.create(null);
      let keyTag = null;
      let keyNode = null;
      let valueNode = null;
      let atExplicitKey = false;
      let detected = false;
      if (state.firstTabInLine !== -1) return false;
      if (state.anchor !== null) {
        storeAnchor(state, state.anchor, _result);
      }
      let ch = state.input.charCodeAt(state.position);
      while (ch !== 0) {
        if (!atExplicitKey && state.firstTabInLine !== -1) {
          state.position = state.firstTabInLine;
          throwError(state, "tab characters must not be used in indentation");
        }
        const following = state.input.charCodeAt(state.position + 1);
        const _line = state.line;
        if ((ch === 63 || ch === 58) && isWsOrEol(following)) {
          if (ch === 63) {
            if (atExplicitKey) {
              storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
              keyTag = keyNode = valueNode = null;
            }
            detected = true;
            atExplicitKey = true;
            allowCompact = true;
          } else if (atExplicitKey) {
            atExplicitKey = false;
            allowCompact = true;
          } else {
            throwError(state, "incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line");
          }
          state.position += 1;
          ch = following;
        } else {
          _keyLine = state.line;
          _keyLineStart = state.lineStart;
          _keyPos = state.position;
          if (!composeNode(state, flowIndent, CONTEXT_FLOW_OUT, false, true)) {
            break;
          }
          if (state.line === _line) {
            ch = state.input.charCodeAt(state.position);
            while (isWhiteSpace(ch)) {
              ch = state.input.charCodeAt(++state.position);
            }
            if (ch === 58) {
              ch = state.input.charCodeAt(++state.position);
              if (!isWsOrEol(ch)) {
                throwError(state, "a whitespace character is expected after the key-value separator within a block mapping");
              }
              if (atExplicitKey) {
                storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
                keyTag = keyNode = valueNode = null;
              }
              detected = true;
              atExplicitKey = false;
              allowCompact = false;
              keyTag = state.tag;
              keyNode = state.result;
            } else if (detected) {
              throwError(state, "can not read an implicit mapping pair; a colon is missed");
            } else {
              state.tag = _tag;
              state.anchor = _anchor;
              return true;
            }
          } else if (detected) {
            throwError(state, "can not read a block mapping entry; a multiline key may not be an implicit key");
          } else {
            state.tag = _tag;
            state.anchor = _anchor;
            return true;
          }
        }
        if (state.line === _line || state.lineIndent > nodeIndent) {
          if (atExplicitKey) {
            _keyLine = state.line;
            _keyLineStart = state.lineStart;
            _keyPos = state.position;
          }
          if (composeNode(state, nodeIndent, CONTEXT_BLOCK_OUT, true, allowCompact)) {
            if (atExplicitKey) {
              keyNode = state.result;
            } else {
              valueNode = state.result;
            }
          }
          if (!atExplicitKey) {
            storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _keyLine, _keyLineStart, _keyPos);
            keyTag = keyNode = valueNode = null;
          }
          skipSeparationSpace(state, true, -1);
          ch = state.input.charCodeAt(state.position);
        }
        if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0) {
          throwError(state, "bad indentation of a mapping entry");
        } else if (state.lineIndent < nodeIndent) {
          break;
        }
      }
      if (atExplicitKey) {
        storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
      }
      if (detected) {
        state.tag = _tag;
        state.anchor = _anchor;
        state.kind = "mapping";
        state.result = _result;
      }
      return detected;
    }
    function readTagProperty(state) {
      let isVerbatim = false;
      let isNamed = false;
      let tagHandle;
      let tagName;
      let ch = state.input.charCodeAt(state.position);
      if (ch !== 33) return false;
      if (state.tag !== null) {
        throwError(state, "duplication of a tag property");
      }
      ch = state.input.charCodeAt(++state.position);
      if (ch === 60) {
        isVerbatim = true;
        ch = state.input.charCodeAt(++state.position);
      } else if (ch === 33) {
        isNamed = true;
        tagHandle = "!!";
        ch = state.input.charCodeAt(++state.position);
      } else {
        tagHandle = "!";
      }
      let _position = state.position;
      if (isVerbatim) {
        do {
          ch = state.input.charCodeAt(++state.position);
        } while (ch !== 0 && ch !== 62);
        if (state.position < state.length) {
          tagName = state.input.slice(_position, state.position);
          ch = state.input.charCodeAt(++state.position);
        } else {
          throwError(state, "unexpected end of the stream within a verbatim tag");
        }
      } else {
        while (ch !== 0 && !isWsOrEol(ch)) {
          if (ch === 33) {
            if (!isNamed) {
              tagHandle = state.input.slice(_position - 1, state.position + 1);
              if (!PATTERN_TAG_HANDLE.test(tagHandle)) {
                throwError(state, "named tag handle cannot contain such characters");
              }
              isNamed = true;
              _position = state.position + 1;
            } else {
              throwError(state, "tag suffix cannot contain exclamation marks");
            }
          }
          ch = state.input.charCodeAt(++state.position);
        }
        tagName = state.input.slice(_position, state.position);
        if (PATTERN_FLOW_INDICATORS.test(tagName)) {
          throwError(state, "tag suffix cannot contain flow indicator characters");
        }
      }
      if (tagName && !PATTERN_TAG_URI.test(tagName)) {
        throwError(state, "tag name cannot contain such characters: " + tagName);
      }
      try {
        tagName = decodeURIComponent(tagName);
      } catch (err) {
        throwError(state, "tag name is malformed: " + tagName);
      }
      if (isVerbatim) {
        state.tag = tagName;
      } else if (_hasOwnProperty.call(state.tagMap, tagHandle)) {
        state.tag = state.tagMap[tagHandle] + tagName;
      } else if (tagHandle === "!") {
        state.tag = "!" + tagName;
      } else if (tagHandle === "!!") {
        state.tag = "tag:yaml.org,2002:" + tagName;
      } else {
        throwError(state, 'undeclared tag handle "' + tagHandle + '"');
      }
      return true;
    }
    function readAnchorProperty(state) {
      let ch = state.input.charCodeAt(state.position);
      if (ch !== 38) return false;
      if (state.anchor !== null) {
        throwError(state, "duplication of an anchor property");
      }
      ch = state.input.charCodeAt(++state.position);
      const _position = state.position;
      while (ch !== 0 && !isWsOrEol(ch) && !isFlowIndicator(ch)) {
        ch = state.input.charCodeAt(++state.position);
      }
      if (state.position === _position) {
        throwError(state, "name of an anchor node must contain at least one character");
      }
      state.anchor = state.input.slice(_position, state.position);
      return true;
    }
    function readAlias(state) {
      let ch = state.input.charCodeAt(state.position);
      if (ch !== 42) return false;
      ch = state.input.charCodeAt(++state.position);
      const _position = state.position;
      while (ch !== 0 && !isWsOrEol(ch) && !isFlowIndicator(ch)) {
        ch = state.input.charCodeAt(++state.position);
      }
      if (state.position === _position) {
        throwError(state, "name of an alias node must contain at least one character");
      }
      const alias = state.input.slice(_position, state.position);
      if (!_hasOwnProperty.call(state.anchorMap, alias)) {
        throwError(state, 'unidentified alias "' + alias + '"');
      }
      state.result = state.anchorMap[alias];
      skipSeparationSpace(state, true, -1);
      return true;
    }
    function tryReadBlockMappingFromProperty(state, propertyStart, nodeIndent, flowIndent) {
      const fallbackState = snapshotState(state);
      beginAnchorTransaction(state);
      restoreState(state, propertyStart);
      state.tag = null;
      state.anchor = null;
      state.kind = null;
      state.result = null;
      if (readBlockMapping(state, nodeIndent, flowIndent) && state.kind === "mapping") {
        commitAnchorTransaction(state);
        return true;
      }
      rollbackAnchorTransaction(state);
      restoreState(state, fallbackState);
      return false;
    }
    function composeNode(state, parentIndent, nodeContext, allowToSeek, allowCompact) {
      let allowBlockScalars;
      let allowBlockCollections;
      let indentStatus = 1;
      let atNewLine = false;
      let hasContent = false;
      let propertyStart = null;
      let type;
      let flowIndent;
      let blockIndent;
      if (state.depth >= state.maxDepth) {
        throwError(state, "nesting exceeded maxDepth (" + state.maxDepth + ")");
      }
      state.depth += 1;
      if (state.listener !== null) {
        state.listener("open", state);
      }
      state.tag = null;
      state.anchor = null;
      state.kind = null;
      state.result = null;
      const allowBlockStyles = allowBlockScalars = allowBlockCollections = CONTEXT_BLOCK_OUT === nodeContext || CONTEXT_BLOCK_IN === nodeContext;
      if (allowToSeek) {
        if (skipSeparationSpace(state, true, -1)) {
          atNewLine = true;
          if (state.lineIndent > parentIndent) {
            indentStatus = 1;
          } else if (state.lineIndent === parentIndent) {
            indentStatus = 0;
          } else if (state.lineIndent < parentIndent) {
            indentStatus = -1;
          }
        }
      }
      if (indentStatus === 1) {
        while (true) {
          const ch = state.input.charCodeAt(state.position);
          const propertyState = snapshotState(state);
          if (atNewLine && (ch === 33 && state.tag !== null || ch === 38 && state.anchor !== null)) {
            break;
          }
          if (!readTagProperty(state) && !readAnchorProperty(state)) {
            break;
          }
          if (propertyStart === null) {
            propertyStart = propertyState;
          }
          if (skipSeparationSpace(state, true, -1)) {
            atNewLine = true;
            allowBlockCollections = allowBlockStyles;
            if (state.lineIndent > parentIndent) {
              indentStatus = 1;
            } else if (state.lineIndent === parentIndent) {
              indentStatus = 0;
            } else if (state.lineIndent < parentIndent) {
              indentStatus = -1;
            }
          } else {
            allowBlockCollections = false;
          }
        }
      }
      if (allowBlockCollections) {
        allowBlockCollections = atNewLine || allowCompact;
      }
      if (indentStatus === 1 || CONTEXT_BLOCK_OUT === nodeContext) {
        if (CONTEXT_FLOW_IN === nodeContext || CONTEXT_FLOW_OUT === nodeContext) {
          flowIndent = parentIndent;
        } else {
          flowIndent = parentIndent + 1;
        }
        blockIndent = state.position - state.lineStart;
        if (indentStatus === 1) {
          if (allowBlockCollections && (readBlockSequence(state, blockIndent) || readBlockMapping(state, blockIndent, flowIndent)) || readFlowCollection(state, flowIndent)) {
            hasContent = true;
          } else {
            const ch = state.input.charCodeAt(state.position);
            if (propertyStart !== null && allowBlockStyles && !allowBlockCollections && ch !== 124 && ch !== 62 && tryReadBlockMappingFromProperty(
              state,
              propertyStart,
              propertyStart.position - propertyStart.lineStart,
              flowIndent
            )) {
              hasContent = true;
            } else if (allowBlockScalars && readBlockScalar(state, flowIndent) || readSingleQuotedScalar(state, flowIndent) || readDoubleQuotedScalar(state, flowIndent)) {
              hasContent = true;
            } else if (readAlias(state)) {
              hasContent = true;
              if (state.tag !== null || state.anchor !== null) {
                throwError(state, "alias node should not have any properties");
              }
            } else if (readPlainScalar(state, flowIndent, CONTEXT_FLOW_IN === nodeContext)) {
              hasContent = true;
              if (state.tag === null) {
                state.tag = "?";
              }
            }
            if (state.anchor !== null) {
              storeAnchor(state, state.anchor, state.result);
            }
          }
        } else if (indentStatus === 0) {
          hasContent = allowBlockCollections && readBlockSequence(state, blockIndent);
        }
      }
      if (state.tag === null) {
        if (state.anchor !== null) {
          storeAnchor(state, state.anchor, state.result);
        }
      } else if (state.tag === "?") {
        if (state.result !== null && state.kind !== "scalar") {
          throwError(state, 'unacceptable node kind for !<?> tag; it should be "scalar", not "' + state.kind + '"');
        }
        for (let typeIndex = 0, typeQuantity = state.implicitTypes.length; typeIndex < typeQuantity; typeIndex += 1) {
          type = state.implicitTypes[typeIndex];
          if (type.resolve(state.result)) {
            state.result = type.construct(state.result);
            state.tag = type.tag;
            if (state.anchor !== null) {
              storeAnchor(state, state.anchor, state.result);
            }
            break;
          }
        }
      } else if (state.tag !== "!") {
        if (_hasOwnProperty.call(state.typeMap[state.kind || "fallback"], state.tag)) {
          type = state.typeMap[state.kind || "fallback"][state.tag];
        } else {
          type = null;
          const typeList = state.typeMap.multi[state.kind || "fallback"];
          for (let typeIndex = 0, typeQuantity = typeList.length; typeIndex < typeQuantity; typeIndex += 1) {
            if (state.tag.slice(0, typeList[typeIndex].tag.length) === typeList[typeIndex].tag) {
              type = typeList[typeIndex];
              break;
            }
          }
        }
        if (!type) {
          throwError(state, "unknown tag !<" + state.tag + ">");
        }
        if (state.result !== null && type.kind !== state.kind) {
          throwError(state, "unacceptable node kind for !<" + state.tag + '> tag; it should be "' + type.kind + '", not "' + state.kind + '"');
        }
        if (!type.resolve(state.result, state.tag)) {
          throwError(state, "cannot resolve a node with !<" + state.tag + "> explicit tag");
        } else {
          state.result = type.construct(state.result, state.tag);
          if (state.anchor !== null) {
            storeAnchor(state, state.anchor, state.result);
          }
        }
      }
      if (state.listener !== null) {
        state.listener("close", state);
      }
      state.depth -= 1;
      return state.tag !== null || state.anchor !== null || hasContent;
    }
    function readDocument(state) {
      const documentStart = state.position;
      let hasDirectives = false;
      let ch;
      state.version = null;
      state.checkLineBreaks = state.legacy;
      state.tagMap = /* @__PURE__ */ Object.create(null);
      state.anchorMap = /* @__PURE__ */ Object.create(null);
      while ((ch = state.input.charCodeAt(state.position)) !== 0) {
        skipSeparationSpace(state, true, -1);
        ch = state.input.charCodeAt(state.position);
        if (state.lineIndent > 0 || ch !== 37) {
          break;
        }
        hasDirectives = true;
        ch = state.input.charCodeAt(++state.position);
        let _position = state.position;
        while (ch !== 0 && !isWsOrEol(ch)) {
          ch = state.input.charCodeAt(++state.position);
        }
        const directiveName = state.input.slice(_position, state.position);
        const directiveArgs = [];
        if (directiveName.length < 1) {
          throwError(state, "directive name must not be less than one character in length");
        }
        while (ch !== 0) {
          while (isWhiteSpace(ch)) {
            ch = state.input.charCodeAt(++state.position);
          }
          if (ch === 35) {
            do {
              ch = state.input.charCodeAt(++state.position);
            } while (ch !== 0 && !isEol(ch));
            break;
          }
          if (isEol(ch)) break;
          _position = state.position;
          while (ch !== 0 && !isWsOrEol(ch)) {
            ch = state.input.charCodeAt(++state.position);
          }
          directiveArgs.push(state.input.slice(_position, state.position));
        }
        if (ch !== 0) readLineBreak(state);
        if (_hasOwnProperty.call(directiveHandlers, directiveName)) {
          directiveHandlers[directiveName](state, directiveName, directiveArgs);
        } else {
          throwWarning(state, 'unknown document directive "' + directiveName + '"');
        }
      }
      skipSeparationSpace(state, true, -1);
      if (state.lineIndent === 0 && state.input.charCodeAt(state.position) === 45 && state.input.charCodeAt(state.position + 1) === 45 && state.input.charCodeAt(state.position + 2) === 45) {
        state.position += 3;
        skipSeparationSpace(state, true, -1);
      } else if (hasDirectives) {
        throwError(state, "directives end mark is expected");
      }
      composeNode(state, state.lineIndent - 1, CONTEXT_BLOCK_OUT, false, true);
      skipSeparationSpace(state, true, -1);
      if (state.checkLineBreaks && PATTERN_NON_ASCII_LINE_BREAKS.test(state.input.slice(documentStart, state.position))) {
        throwWarning(state, "non-ASCII line breaks are interpreted as content");
      }
      state.documents.push(state.result);
      if (state.position === state.lineStart && testDocumentSeparator(state)) {
        if (state.input.charCodeAt(state.position) === 46) {
          state.position += 3;
          skipSeparationSpace(state, true, -1);
        }
        return;
      }
      if (state.position < state.length - 1) {
        throwError(state, "end of the stream or a document separator is expected");
      }
    }
    function loadDocuments(input, options) {
      input = String(input);
      options = options || {};
      if (input.length !== 0) {
        if (input.charCodeAt(input.length - 1) !== 10 && input.charCodeAt(input.length - 1) !== 13) {
          input += "\n";
        }
        if (input.charCodeAt(0) === 65279) {
          input = input.slice(1);
        }
      }
      const state = new State(input, options);
      const nullpos = input.indexOf("\0");
      if (nullpos !== -1) {
        state.position = nullpos;
        throwError(state, "null byte is not allowed in input");
      }
      state.input += "\0";
      while (state.input.charCodeAt(state.position) === 32) {
        state.lineIndent += 1;
        state.position += 1;
      }
      while (state.position < state.length - 1) {
        readDocument(state);
      }
      return state.documents;
    }
    function loadAll(input, iterator, options) {
      if (iterator !== null && typeof iterator === "object" && typeof options === "undefined") {
        options = iterator;
        iterator = null;
      }
      const documents = loadDocuments(input, options);
      if (typeof iterator !== "function") {
        return documents;
      }
      for (let index = 0, length = documents.length; index < length; index += 1) {
        iterator(documents[index]);
      }
    }
    function load(input, options) {
      const documents = loadDocuments(input, options);
      if (documents.length === 0) {
        return void 0;
      } else if (documents.length === 1) {
        return documents[0];
      }
      throw new YAMLException("expected a single document in the stream, but found more");
    }
    module2.exports.loadAll = loadAll;
    module2.exports.load = load;
  }
});

// node_modules/js-yaml/lib/dumper.js
var require_dumper = __commonJS({
  "node_modules/js-yaml/lib/dumper.js"(exports2, module2) {
    "use strict";
    var common = require_common2();
    var YAMLException = require_exception();
    var DEFAULT_SCHEMA = require_default();
    var _toString = Object.prototype.toString;
    var _hasOwnProperty = Object.prototype.hasOwnProperty;
    var CHAR_BOM = 65279;
    var CHAR_TAB = 9;
    var CHAR_LINE_FEED = 10;
    var CHAR_CARRIAGE_RETURN = 13;
    var CHAR_SPACE = 32;
    var CHAR_EXCLAMATION = 33;
    var CHAR_DOUBLE_QUOTE = 34;
    var CHAR_SHARP = 35;
    var CHAR_PERCENT = 37;
    var CHAR_AMPERSAND = 38;
    var CHAR_SINGLE_QUOTE = 39;
    var CHAR_ASTERISK = 42;
    var CHAR_COMMA = 44;
    var CHAR_MINUS = 45;
    var CHAR_COLON = 58;
    var CHAR_EQUALS = 61;
    var CHAR_GREATER_THAN = 62;
    var CHAR_QUESTION = 63;
    var CHAR_COMMERCIAL_AT = 64;
    var CHAR_LEFT_SQUARE_BRACKET = 91;
    var CHAR_RIGHT_SQUARE_BRACKET = 93;
    var CHAR_GRAVE_ACCENT = 96;
    var CHAR_LEFT_CURLY_BRACKET = 123;
    var CHAR_VERTICAL_LINE = 124;
    var CHAR_RIGHT_CURLY_BRACKET = 125;
    var ESCAPE_SEQUENCES = {};
    ESCAPE_SEQUENCES[0] = "\\0";
    ESCAPE_SEQUENCES[7] = "\\a";
    ESCAPE_SEQUENCES[8] = "\\b";
    ESCAPE_SEQUENCES[9] = "\\t";
    ESCAPE_SEQUENCES[10] = "\\n";
    ESCAPE_SEQUENCES[11] = "\\v";
    ESCAPE_SEQUENCES[12] = "\\f";
    ESCAPE_SEQUENCES[13] = "\\r";
    ESCAPE_SEQUENCES[27] = "\\e";
    ESCAPE_SEQUENCES[34] = '\\"';
    ESCAPE_SEQUENCES[92] = "\\\\";
    ESCAPE_SEQUENCES[133] = "\\N";
    ESCAPE_SEQUENCES[160] = "\\_";
    ESCAPE_SEQUENCES[8232] = "\\L";
    ESCAPE_SEQUENCES[8233] = "\\P";
    var DEPRECATED_BOOLEANS_SYNTAX = [
      "y",
      "Y",
      "yes",
      "Yes",
      "YES",
      "on",
      "On",
      "ON",
      "n",
      "N",
      "no",
      "No",
      "NO",
      "off",
      "Off",
      "OFF"
    ];
    var DEPRECATED_BASE60_SYNTAX = /^[-+]?[0-9_]+(?::[0-9_]+)+(?:\.[0-9_]*)?$/;
    function compileStyleMap(schema, map) {
      if (map === null) return {};
      const result = {};
      const keys = Object.keys(map);
      for (let index = 0, length = keys.length; index < length; index += 1) {
        let tag = keys[index];
        let style = String(map[tag]);
        if (tag.slice(0, 2) === "!!") {
          tag = "tag:yaml.org,2002:" + tag.slice(2);
        }
        const type = schema.compiledTypeMap["fallback"][tag];
        if (type && _hasOwnProperty.call(type.styleAliases, style)) {
          style = type.styleAliases[style];
        }
        result[tag] = style;
      }
      return result;
    }
    function encodeHex(character) {
      let handle;
      let length;
      const string = character.toString(16).toUpperCase();
      if (character <= 255) {
        handle = "x";
        length = 2;
      } else if (character <= 65535) {
        handle = "u";
        length = 4;
      } else if (character <= 4294967295) {
        handle = "U";
        length = 8;
      } else {
        throw new YAMLException("code point within a string may not be greater than 0xFFFFFFFF");
      }
      return "\\" + handle + common.repeat("0", length - string.length) + string;
    }
    var QUOTING_TYPE_SINGLE = 1;
    var QUOTING_TYPE_DOUBLE = 2;
    function State(options) {
      this.schema = options["schema"] || DEFAULT_SCHEMA;
      this.indent = Math.max(1, options["indent"] || 2);
      this.noArrayIndent = options["noArrayIndent"] || false;
      this.skipInvalid = options["skipInvalid"] || false;
      this.flowLevel = common.isNothing(options["flowLevel"]) ? -1 : options["flowLevel"];
      this.styleMap = compileStyleMap(this.schema, options["styles"] || null);
      this.sortKeys = options["sortKeys"] || false;
      this.lineWidth = options["lineWidth"] || 80;
      this.noRefs = options["noRefs"] || false;
      this.noCompatMode = options["noCompatMode"] || false;
      this.condenseFlow = options["condenseFlow"] || false;
      this.quotingType = options["quotingType"] === '"' ? QUOTING_TYPE_DOUBLE : QUOTING_TYPE_SINGLE;
      this.forceQuotes = options["forceQuotes"] || false;
      this.replacer = typeof options["replacer"] === "function" ? options["replacer"] : null;
      this.implicitTypes = this.schema.compiledImplicit;
      this.explicitTypes = this.schema.compiledExplicit;
      this.tag = null;
      this.result = "";
      this.duplicates = [];
      this.usedDuplicates = null;
    }
    function indentString(string, spaces) {
      const ind = common.repeat(" ", spaces);
      let position = 0;
      let result = "";
      const length = string.length;
      while (position < length) {
        let line;
        const next = string.indexOf("\n", position);
        if (next === -1) {
          line = string.slice(position);
          position = length;
        } else {
          line = string.slice(position, next + 1);
          position = next + 1;
        }
        if (line.length && line !== "\n") result += ind;
        result += line;
      }
      return result;
    }
    function generateNextLine(state, level) {
      return "\n" + common.repeat(" ", state.indent * level);
    }
    function testImplicitResolving(state, str) {
      for (let index = 0, length = state.implicitTypes.length; index < length; index += 1) {
        const type = state.implicitTypes[index];
        if (type.resolve(str)) {
          return true;
        }
      }
      return false;
    }
    function isWhitespace(c) {
      return c === CHAR_SPACE || c === CHAR_TAB;
    }
    function isPrintable(c) {
      return c >= 32 && c <= 126 || c >= 161 && c <= 55295 && c !== 8232 && c !== 8233 || c >= 57344 && c <= 65533 && c !== CHAR_BOM || c >= 65536 && c <= 1114111;
    }
    function isNsCharOrWhitespace(c) {
      return isPrintable(c) && c !== CHAR_BOM && // - b-char
      c !== CHAR_CARRIAGE_RETURN && c !== CHAR_LINE_FEED;
    }
    function isPlainSafe(c, prev, inblock) {
      const cIsNsCharOrWhitespace = isNsCharOrWhitespace(c);
      const cIsNsChar = cIsNsCharOrWhitespace && !isWhitespace(c);
      return (
        // ns-plain-safe
        (inblock ? cIsNsCharOrWhitespace : cIsNsCharOrWhitespace && // - c-flow-indicator
        c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET) && // ns-plain-char
        c !== CHAR_SHARP && // false on '#'
        !(prev === CHAR_COLON && !cIsNsChar) || // false on ': '
        isNsCharOrWhitespace(prev) && !isWhitespace(prev) && c === CHAR_SHARP || // change to true on '[^ ]#'
        prev === CHAR_COLON && cIsNsChar
      );
    }
    function isPlainSafeFirst(c) {
      return isPrintable(c) && c !== CHAR_BOM && !isWhitespace(c) && // - s-white
      // - (c-indicator ::=
      // “-” | “?” | “:” | “,” | “[” | “]” | “{” | “}”
      c !== CHAR_MINUS && c !== CHAR_QUESTION && c !== CHAR_COLON && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET && // | “#” | “&” | “*” | “!” | “|” | “=” | “>” | “'” | “"”
      c !== CHAR_SHARP && c !== CHAR_AMPERSAND && c !== CHAR_ASTERISK && c !== CHAR_EXCLAMATION && c !== CHAR_VERTICAL_LINE && c !== CHAR_EQUALS && c !== CHAR_GREATER_THAN && c !== CHAR_SINGLE_QUOTE && c !== CHAR_DOUBLE_QUOTE && // | “%” | “@” | “`”)
      c !== CHAR_PERCENT && c !== CHAR_COMMERCIAL_AT && c !== CHAR_GRAVE_ACCENT;
    }
    function isPlainSafeLast(c) {
      return !isWhitespace(c) && c !== CHAR_COLON;
    }
    function codePointAt(string, pos) {
      const first = string.charCodeAt(pos);
      let second;
      if (first >= 55296 && first <= 56319 && pos + 1 < string.length) {
        second = string.charCodeAt(pos + 1);
        if (second >= 56320 && second <= 57343) {
          return (first - 55296) * 1024 + second - 56320 + 65536;
        }
      }
      return first;
    }
    function needIndentIndicator(string) {
      const leadingSpaceRe = /^\n* /;
      return leadingSpaceRe.test(string);
    }
    var STYLE_PLAIN = 1;
    var STYLE_SINGLE = 2;
    var STYLE_LITERAL = 3;
    var STYLE_FOLDED = 4;
    var STYLE_DOUBLE = 5;
    function chooseScalarStyle(string, singleLineOnly, indentPerLevel, lineWidth, testAmbiguousType, quotingType, forceQuotes, inblock) {
      let i;
      let char = 0;
      let prevChar = null;
      let hasLineBreak = false;
      let hasFoldableLine = false;
      const shouldTrackWidth = lineWidth !== -1;
      let previousLineBreak = -1;
      let plain = isPlainSafeFirst(codePointAt(string, 0)) && isPlainSafeLast(codePointAt(string, string.length - 1));
      if (singleLineOnly || forceQuotes) {
        for (i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
          char = codePointAt(string, i);
          if (!isPrintable(char)) {
            return STYLE_DOUBLE;
          }
          plain = plain && isPlainSafe(char, prevChar, inblock);
          prevChar = char;
        }
      } else {
        for (i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
          char = codePointAt(string, i);
          if (char === CHAR_LINE_FEED) {
            hasLineBreak = true;
            if (shouldTrackWidth) {
              hasFoldableLine = hasFoldableLine || // Foldable line = too long, and not more-indented.
              i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ";
              previousLineBreak = i;
            }
          } else if (!isPrintable(char)) {
            return STYLE_DOUBLE;
          }
          plain = plain && isPlainSafe(char, prevChar, inblock);
          prevChar = char;
        }
        hasFoldableLine = hasFoldableLine || shouldTrackWidth && (i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ");
      }
      if (!hasLineBreak && !hasFoldableLine) {
        if (plain && !forceQuotes && !testAmbiguousType(string)) {
          return STYLE_PLAIN;
        }
        return quotingType === QUOTING_TYPE_DOUBLE ? STYLE_DOUBLE : STYLE_SINGLE;
      }
      if (indentPerLevel > 9 && needIndentIndicator(string)) {
        return STYLE_DOUBLE;
      }
      if (!forceQuotes) {
        return hasFoldableLine ? STYLE_FOLDED : STYLE_LITERAL;
      }
      return quotingType === QUOTING_TYPE_DOUBLE ? STYLE_DOUBLE : STYLE_SINGLE;
    }
    function writeScalar(state, string, level, iskey, inblock) {
      state.dump = (function() {
        if (string.length === 0) {
          return state.quotingType === QUOTING_TYPE_DOUBLE ? '""' : "''";
        }
        if (!state.noCompatMode) {
          if (DEPRECATED_BOOLEANS_SYNTAX.indexOf(string) !== -1 || DEPRECATED_BASE60_SYNTAX.test(string)) {
            return state.quotingType === QUOTING_TYPE_DOUBLE ? '"' + string + '"' : "'" + string + "'";
          }
        }
        const indent = state.indent * Math.max(1, level);
        const lineWidth = state.lineWidth === -1 ? -1 : Math.max(Math.min(state.lineWidth, 40), state.lineWidth - indent);
        const singleLineOnly = iskey || // No block styles in flow mode.
        state.flowLevel > -1 && level >= state.flowLevel;
        function testAmbiguity(string2) {
          return testImplicitResolving(state, string2);
        }
        switch (chooseScalarStyle(
          string,
          singleLineOnly,
          state.indent,
          lineWidth,
          testAmbiguity,
          state.quotingType,
          state.forceQuotes && !iskey,
          inblock
        )) {
          case STYLE_PLAIN:
            return string;
          case STYLE_SINGLE:
            return "'" + string.replace(/'/g, "''") + "'";
          case STYLE_LITERAL:
            return "|" + blockHeader(string, state.indent) + dropEndingNewline(indentString(string, indent));
          case STYLE_FOLDED:
            return ">" + blockHeader(string, state.indent) + dropEndingNewline(indentString(foldString(string, lineWidth), indent));
          case STYLE_DOUBLE:
            return '"' + escapeString(string, lineWidth) + '"';
          default:
            throw new YAMLException("impossible error: invalid scalar style");
        }
      })();
    }
    function blockHeader(string, indentPerLevel) {
      const indentIndicator = needIndentIndicator(string) ? String(indentPerLevel) : "";
      const clip = string[string.length - 1] === "\n";
      const keep = clip && (string[string.length - 2] === "\n" || string === "\n");
      const chomp = keep ? "+" : clip ? "" : "-";
      return indentIndicator + chomp + "\n";
    }
    function dropEndingNewline(string) {
      return string[string.length - 1] === "\n" ? string.slice(0, -1) : string;
    }
    function foldString(string, width) {
      const lineRe = /(\n+)([^\n]*)/g;
      let result = (function() {
        let nextLF = string.indexOf("\n");
        nextLF = nextLF !== -1 ? nextLF : string.length;
        lineRe.lastIndex = nextLF;
        return foldLine(string.slice(0, nextLF), width);
      })();
      let prevMoreIndented = string[0] === "\n" || string[0] === " ";
      let moreIndented;
      let match;
      while (match = lineRe.exec(string)) {
        const prefix = match[1];
        const line = match[2];
        moreIndented = line[0] === " ";
        result += prefix + (!prevMoreIndented && !moreIndented && line !== "" ? "\n" : "") + foldLine(line, width);
        prevMoreIndented = moreIndented;
      }
      return result;
    }
    function foldLine(line, width) {
      if (line === "" || line[0] === " ") return line;
      const breakRe = / [^ ]/g;
      let match;
      let start = 0;
      let end;
      let curr = 0;
      let next = 0;
      let result = "";
      while (match = breakRe.exec(line)) {
        next = match.index;
        if (next - start > width) {
          end = curr > start ? curr : next;
          result += "\n" + line.slice(start, end);
          start = end + 1;
        }
        curr = next;
      }
      result += "\n";
      if (line.length - start > width && curr > start) {
        result += line.slice(start, curr) + "\n" + line.slice(curr + 1);
      } else {
        result += line.slice(start);
      }
      return result.slice(1);
    }
    function escapeString(string) {
      let result = "";
      let char = 0;
      for (let i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
        char = codePointAt(string, i);
        const escapeSeq = ESCAPE_SEQUENCES[char];
        if (!escapeSeq && isPrintable(char)) {
          result += string[i];
          if (char >= 65536) result += string[i + 1];
        } else {
          result += escapeSeq || encodeHex(char);
        }
      }
      return result;
    }
    function writeFlowSequence(state, level, object) {
      let _result = "";
      const _tag = state.tag;
      for (let index = 0, length = object.length; index < length; index += 1) {
        let value = object[index];
        if (state.replacer) {
          value = state.replacer.call(object, String(index), value);
        }
        if (writeNode(state, level, value, false, false) || typeof value === "undefined" && writeNode(state, level, null, false, false)) {
          if (_result !== "") _result += "," + (!state.condenseFlow ? " " : "");
          _result += state.dump;
        }
      }
      state.tag = _tag;
      state.dump = "[" + _result + "]";
    }
    function writeBlockSequence(state, level, object, compact) {
      let _result = "";
      const _tag = state.tag;
      for (let index = 0, length = object.length; index < length; index += 1) {
        let value = object[index];
        if (state.replacer) {
          value = state.replacer.call(object, String(index), value);
        }
        if (writeNode(state, level + 1, value, true, true, false, true) || typeof value === "undefined" && writeNode(state, level + 1, null, true, true, false, true)) {
          if (!compact || _result !== "") {
            _result += generateNextLine(state, level);
          }
          if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
            _result += "-";
          } else {
            _result += "- ";
          }
          _result += state.dump;
        }
      }
      state.tag = _tag;
      state.dump = _result || "[]";
    }
    function writeFlowMapping(state, level, object) {
      let _result = "";
      const _tag = state.tag;
      const objectKeyList = Object.keys(object);
      for (let index = 0, length = objectKeyList.length; index < length; index += 1) {
        let pairBuffer = "";
        if (_result !== "") pairBuffer += ", ";
        if (state.condenseFlow) pairBuffer += '"';
        const objectKey = objectKeyList[index];
        let objectValue = object[objectKey];
        if (state.replacer) {
          objectValue = state.replacer.call(object, objectKey, objectValue);
        }
        if (!writeNode(state, level, objectKey, false, false)) {
          continue;
        }
        if (state.dump.length > 1024) pairBuffer += "? ";
        pairBuffer += state.dump + (state.condenseFlow ? '"' : "") + ":" + (state.condenseFlow ? "" : " ");
        if (!writeNode(state, level, objectValue, false, false)) {
          continue;
        }
        pairBuffer += state.dump;
        _result += pairBuffer;
      }
      state.tag = _tag;
      state.dump = "{" + _result + "}";
    }
    function writeBlockMapping(state, level, object, compact) {
      let _result = "";
      const _tag = state.tag;
      const objectKeyList = Object.keys(object);
      if (state.sortKeys === true) {
        objectKeyList.sort();
      } else if (typeof state.sortKeys === "function") {
        objectKeyList.sort(state.sortKeys);
      } else if (state.sortKeys) {
        throw new YAMLException("sortKeys must be a boolean or a function");
      }
      for (let index = 0, length = objectKeyList.length; index < length; index += 1) {
        let pairBuffer = "";
        if (!compact || _result !== "") {
          pairBuffer += generateNextLine(state, level);
        }
        const objectKey = objectKeyList[index];
        let objectValue = object[objectKey];
        if (state.replacer) {
          objectValue = state.replacer.call(object, objectKey, objectValue);
        }
        if (!writeNode(state, level + 1, objectKey, true, true, true)) {
          continue;
        }
        const explicitPair = state.tag !== null && state.tag !== "?" || state.dump && state.dump.length > 1024;
        if (explicitPair) {
          if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
            pairBuffer += "?";
          } else {
            pairBuffer += "? ";
          }
        }
        pairBuffer += state.dump;
        if (explicitPair) {
          pairBuffer += generateNextLine(state, level);
        }
        if (!writeNode(state, level + 1, objectValue, true, explicitPair)) {
          continue;
        }
        if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
          pairBuffer += ":";
        } else {
          pairBuffer += ": ";
        }
        pairBuffer += state.dump;
        _result += pairBuffer;
      }
      state.tag = _tag;
      state.dump = _result || "{}";
    }
    function detectType(state, object, explicit) {
      const typeList = explicit ? state.explicitTypes : state.implicitTypes;
      for (let index = 0, length = typeList.length; index < length; index += 1) {
        const type = typeList[index];
        if ((type.instanceOf || type.predicate) && (!type.instanceOf || typeof object === "object" && object instanceof type.instanceOf) && (!type.predicate || type.predicate(object))) {
          if (explicit) {
            if (type.multi && type.representName) {
              state.tag = type.representName(object);
            } else {
              state.tag = type.tag;
            }
          } else {
            state.tag = "?";
          }
          if (type.represent) {
            const style = state.styleMap[type.tag] || type.defaultStyle;
            let _result;
            if (_toString.call(type.represent) === "[object Function]") {
              _result = type.represent(object, style);
            } else if (_hasOwnProperty.call(type.represent, style)) {
              _result = type.represent[style](object, style);
            } else {
              throw new YAMLException("!<" + type.tag + '> tag resolver accepts not "' + style + '" style');
            }
            state.dump = _result;
          }
          return true;
        }
      }
      return false;
    }
    function writeNode(state, level, object, block, compact, iskey, isblockseq) {
      state.tag = null;
      state.dump = object;
      if (!detectType(state, object, false)) {
        detectType(state, object, true);
      }
      const type = _toString.call(state.dump);
      const inblock = block;
      if (block) {
        block = state.flowLevel < 0 || state.flowLevel > level;
      }
      const objectOrArray = type === "[object Object]" || type === "[object Array]";
      let duplicateIndex;
      let duplicate;
      if (objectOrArray) {
        duplicateIndex = state.duplicates.indexOf(object);
        duplicate = duplicateIndex !== -1;
      }
      if (state.tag !== null && state.tag !== "?" || duplicate || state.indent !== 2 && level > 0) {
        compact = false;
      }
      if (duplicate && state.usedDuplicates[duplicateIndex]) {
        state.dump = "*ref_" + duplicateIndex;
      } else {
        if (objectOrArray && duplicate && !state.usedDuplicates[duplicateIndex]) {
          state.usedDuplicates[duplicateIndex] = true;
        }
        if (type === "[object Object]") {
          if (block && Object.keys(state.dump).length !== 0) {
            writeBlockMapping(state, level, state.dump, compact);
            if (duplicate) {
              state.dump = "&ref_" + duplicateIndex + state.dump;
            }
          } else {
            writeFlowMapping(state, level, state.dump);
            if (duplicate) {
              state.dump = "&ref_" + duplicateIndex + " " + state.dump;
            }
          }
        } else if (type === "[object Array]") {
          if (block && state.dump.length !== 0) {
            if (state.noArrayIndent && !isblockseq && level > 0) {
              writeBlockSequence(state, level - 1, state.dump, compact);
            } else {
              writeBlockSequence(state, level, state.dump, compact);
            }
            if (duplicate) {
              state.dump = "&ref_" + duplicateIndex + state.dump;
            }
          } else {
            writeFlowSequence(state, level, state.dump);
            if (duplicate) {
              state.dump = "&ref_" + duplicateIndex + " " + state.dump;
            }
          }
        } else if (type === "[object String]") {
          if (state.tag !== "?") {
            writeScalar(state, state.dump, level, iskey, inblock);
          }
        } else if (type === "[object Undefined]") {
          return false;
        } else {
          if (state.skipInvalid) return false;
          throw new YAMLException("unacceptable kind of an object to dump " + type);
        }
        if (state.tag !== null && state.tag !== "?") {
          let tagStr = encodeURI(
            state.tag[0] === "!" ? state.tag.slice(1) : state.tag
          ).replace(/!/g, "%21");
          if (state.tag[0] === "!") {
            tagStr = "!" + tagStr;
          } else if (tagStr.slice(0, 18) === "tag:yaml.org,2002:") {
            tagStr = "!!" + tagStr.slice(18);
          } else {
            tagStr = "!<" + tagStr + ">";
          }
          state.dump = tagStr + " " + state.dump;
        }
      }
      return true;
    }
    function getDuplicateReferences(object, state) {
      const objects = [];
      const duplicatesIndexes = [];
      inspectNode(object, objects, duplicatesIndexes);
      const length = duplicatesIndexes.length;
      for (let index = 0; index < length; index += 1) {
        state.duplicates.push(objects[duplicatesIndexes[index]]);
      }
      state.usedDuplicates = new Array(length);
    }
    function inspectNode(object, objects, duplicatesIndexes) {
      if (object !== null && typeof object === "object") {
        const index = objects.indexOf(object);
        if (index !== -1) {
          if (duplicatesIndexes.indexOf(index) === -1) {
            duplicatesIndexes.push(index);
          }
        } else {
          objects.push(object);
          if (Array.isArray(object)) {
            for (let i = 0, length = object.length; i < length; i += 1) {
              inspectNode(object[i], objects, duplicatesIndexes);
            }
          } else {
            const objectKeyList = Object.keys(object);
            for (let i = 0, length = objectKeyList.length; i < length; i += 1) {
              inspectNode(object[objectKeyList[i]], objects, duplicatesIndexes);
            }
          }
        }
      }
    }
    function dump(input, options) {
      options = options || {};
      const state = new State(options);
      if (!state.noRefs) getDuplicateReferences(input, state);
      let value = input;
      if (state.replacer) {
        value = state.replacer.call({ "": value }, "", value);
      }
      if (writeNode(state, 0, value, true, true)) return state.dump + "\n";
      return "";
    }
    module2.exports.dump = dump;
  }
});

// node_modules/js-yaml/index.js
var require_js_yaml = __commonJS({
  "node_modules/js-yaml/index.js"(exports2, module2) {
    "use strict";
    var loader = require_loader();
    var dumper = require_dumper();
    function renamed(from, to) {
      return function() {
        throw new Error("Function yaml." + from + " is removed in js-yaml 4. Use yaml." + to + " instead, which is now safe by default.");
      };
    }
    module2.exports.Type = require_type();
    module2.exports.Schema = require_schema();
    module2.exports.FAILSAFE_SCHEMA = require_failsafe();
    module2.exports.JSON_SCHEMA = require_json2();
    module2.exports.CORE_SCHEMA = require_core();
    module2.exports.DEFAULT_SCHEMA = require_default();
    module2.exports.load = loader.load;
    module2.exports.loadAll = loader.loadAll;
    module2.exports.dump = dumper.dump;
    module2.exports.YAMLException = require_exception();
    module2.exports.types = {
      binary: require_binary(),
      float: require_float(),
      map: require_map(),
      null: require_null(),
      pairs: require_pairs(),
      set: require_set(),
      timestamp: require_timestamp(),
      bool: require_bool(),
      int: require_int(),
      merge: require_merge(),
      omap: require_omap(),
      seq: require_seq(),
      str: require_str()
    };
    module2.exports.safeLoad = renamed("safeLoad", "load");
    module2.exports.safeLoadAll = renamed("safeLoadAll", "loadAll");
    module2.exports.safeDump = renamed("safeDump", "dump");
  }
});

// node_modules/lazy-val/out/main.js
var require_main = __commonJS({
  "node_modules/lazy-val/out/main.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Lazy = void 0;
    var Lazy = class {
      constructor(creator) {
        this._value = null;
        this.creator = creator;
      }
      get hasValue() {
        return this.creator == null;
      }
      get value() {
        if (this.creator == null) {
          return this._value;
        }
        const result = this.creator();
        this.value = result;
        return result;
      }
      set value(value) {
        this._value = value;
        this.creator = null;
      }
    };
    exports2.Lazy = Lazy;
  }
});

// node_modules/semver/internal/constants.js
var require_constants = __commonJS({
  "node_modules/semver/internal/constants.js"(exports2, module2) {
    "use strict";
    var SEMVER_SPEC_VERSION = "2.0.0";
    var MAX_LENGTH = 256;
    var MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || /* istanbul ignore next */
    9007199254740991;
    var MAX_SAFE_COMPONENT_LENGTH = 16;
    var MAX_SAFE_BUILD_LENGTH = MAX_LENGTH - 6;
    var RELEASE_TYPES = [
      "major",
      "premajor",
      "minor",
      "preminor",
      "patch",
      "prepatch",
      "prerelease"
    ];
    module2.exports = {
      MAX_LENGTH,
      MAX_SAFE_COMPONENT_LENGTH,
      MAX_SAFE_BUILD_LENGTH,
      MAX_SAFE_INTEGER,
      RELEASE_TYPES,
      SEMVER_SPEC_VERSION,
      FLAG_INCLUDE_PRERELEASE: 1,
      FLAG_LOOSE: 2
    };
  }
});

// node_modules/semver/internal/debug.js
var require_debug = __commonJS({
  "node_modules/semver/internal/debug.js"(exports2, module2) {
    "use strict";
    var debug = typeof process === "object" && process.env && process.env.NODE_DEBUG && /\bsemver\b/i.test(process.env.NODE_DEBUG) ? (...args) => console.error("SEMVER", ...args) : () => {
    };
    module2.exports = debug;
  }
});

// node_modules/semver/internal/re.js
var require_re = __commonJS({
  "node_modules/semver/internal/re.js"(exports2, module2) {
    "use strict";
    var {
      MAX_SAFE_COMPONENT_LENGTH,
      MAX_SAFE_BUILD_LENGTH,
      MAX_LENGTH
    } = require_constants();
    var debug = require_debug();
    exports2 = module2.exports = {};
    var re = exports2.re = [];
    var safeRe = exports2.safeRe = [];
    var src = exports2.src = [];
    var safeSrc = exports2.safeSrc = [];
    var t = exports2.t = {};
    var R = 0;
    var LETTERDASHNUMBER = "[a-zA-Z0-9-]";
    var safeRegexReplacements = [
      ["\\s", 1],
      ["\\d", MAX_LENGTH],
      [LETTERDASHNUMBER, MAX_SAFE_BUILD_LENGTH]
    ];
    var makeSafeRegex = (value) => {
      for (const [token, max] of safeRegexReplacements) {
        value = value.split(`${token}*`).join(`${token}{0,${max}}`).split(`${token}+`).join(`${token}{1,${max}}`);
      }
      return value;
    };
    var createToken = (name, value, isGlobal) => {
      const safe = makeSafeRegex(value);
      const index = R++;
      debug(name, index, value);
      t[name] = index;
      src[index] = value;
      safeSrc[index] = safe;
      re[index] = new RegExp(value, isGlobal ? "g" : void 0);
      safeRe[index] = new RegExp(safe, isGlobal ? "g" : void 0);
    };
    createToken("NUMERICIDENTIFIER", "0|[1-9]\\d*");
    createToken("NUMERICIDENTIFIERLOOSE", "\\d+");
    createToken("NONNUMERICIDENTIFIER", `\\d*[a-zA-Z-]${LETTERDASHNUMBER}*`);
    createToken("MAINVERSION", `(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})`);
    createToken("MAINVERSIONLOOSE", `(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})`);
    createToken("PRERELEASEIDENTIFIER", `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIER]})`);
    createToken("PRERELEASEIDENTIFIERLOOSE", `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIERLOOSE]})`);
    createToken("PRERELEASE", `(?:-(${src[t.PRERELEASEIDENTIFIER]}(?:\\.${src[t.PRERELEASEIDENTIFIER]})*))`);
    createToken("PRERELEASELOOSE", `(?:-?(${src[t.PRERELEASEIDENTIFIERLOOSE]}(?:\\.${src[t.PRERELEASEIDENTIFIERLOOSE]})*))`);
    createToken("BUILDIDENTIFIER", `${LETTERDASHNUMBER}+`);
    createToken("BUILD", `(?:\\+(${src[t.BUILDIDENTIFIER]}(?:\\.${src[t.BUILDIDENTIFIER]})*))`);
    createToken("FULLPLAIN", `v?${src[t.MAINVERSION]}${src[t.PRERELEASE]}?${src[t.BUILD]}?`);
    createToken("FULL", `^${src[t.FULLPLAIN]}$`);
    createToken("LOOSEPLAIN", `[v=\\s]*${src[t.MAINVERSIONLOOSE]}${src[t.PRERELEASELOOSE]}?${src[t.BUILD]}?`);
    createToken("LOOSE", `^${src[t.LOOSEPLAIN]}$`);
    createToken("GTLT", "((?:<|>)?=?)");
    createToken("XRANGEIDENTIFIERLOOSE", `${src[t.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`);
    createToken("XRANGEIDENTIFIER", `${src[t.NUMERICIDENTIFIER]}|x|X|\\*`);
    createToken("XRANGEPLAIN", `[v=\\s]*(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:${src[t.PRERELEASE]})?${src[t.BUILD]}?)?)?`);
    createToken("XRANGEPLAINLOOSE", `[v=\\s]*(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:${src[t.PRERELEASELOOSE]})?${src[t.BUILD]}?)?)?`);
    createToken("XRANGE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAIN]}$`);
    createToken("XRANGELOOSE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("COERCEPLAIN", `${"(^|[^\\d])(\\d{1,"}${MAX_SAFE_COMPONENT_LENGTH}})(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?`);
    createToken("COERCE", `${src[t.COERCEPLAIN]}(?:$|[^\\d])`);
    createToken("COERCEFULL", src[t.COERCEPLAIN] + `(?:${src[t.PRERELEASE]})?(?:${src[t.BUILD]})?(?:$|[^\\d])`);
    createToken("COERCERTL", src[t.COERCE], true);
    createToken("COERCERTLFULL", src[t.COERCEFULL], true);
    createToken("LONETILDE", "(?:~>?)");
    createToken("TILDETRIM", `(\\s*)${src[t.LONETILDE]}\\s+`, true);
    exports2.tildeTrimReplace = "$1~";
    createToken("TILDE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAIN]}$`);
    createToken("TILDELOOSE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("LONECARET", "(?:\\^)");
    createToken("CARETTRIM", `(\\s*)${src[t.LONECARET]}\\s+`, true);
    exports2.caretTrimReplace = "$1^";
    createToken("CARET", `^${src[t.LONECARET]}${src[t.XRANGEPLAIN]}$`);
    createToken("CARETLOOSE", `^${src[t.LONECARET]}${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("COMPARATORLOOSE", `^${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]})$|^$`);
    createToken("COMPARATOR", `^${src[t.GTLT]}\\s*(${src[t.FULLPLAIN]})$|^$`);
    createToken("COMPARATORTRIM", `(\\s*)${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]}|${src[t.XRANGEPLAIN]})`, true);
    exports2.comparatorTrimReplace = "$1$2$3";
    createToken("HYPHENRANGE", `^\\s*(${src[t.XRANGEPLAIN]})\\s+-\\s+(${src[t.XRANGEPLAIN]})\\s*$`);
    createToken("HYPHENRANGELOOSE", `^\\s*(${src[t.XRANGEPLAINLOOSE]})\\s+-\\s+(${src[t.XRANGEPLAINLOOSE]})\\s*$`);
    createToken("STAR", "(<|>)?=?\\s*\\*");
    createToken("GTE0", "^\\s*>=\\s*0\\.0\\.0\\s*$");
    createToken("GTE0PRE", "^\\s*>=\\s*0\\.0\\.0-0\\s*$");
  }
});

// node_modules/semver/internal/parse-options.js
var require_parse_options = __commonJS({
  "node_modules/semver/internal/parse-options.js"(exports2, module2) {
    "use strict";
    var looseOption = Object.freeze({ loose: true });
    var emptyOpts = Object.freeze({});
    var parseOptions = (options) => {
      if (!options) {
        return emptyOpts;
      }
      if (typeof options !== "object") {
        return looseOption;
      }
      return options;
    };
    module2.exports = parseOptions;
  }
});

// node_modules/semver/internal/identifiers.js
var require_identifiers = __commonJS({
  "node_modules/semver/internal/identifiers.js"(exports2, module2) {
    "use strict";
    var numeric = /^[0-9]+$/;
    var compareIdentifiers = (a, b) => {
      if (typeof a === "number" && typeof b === "number") {
        return a === b ? 0 : a < b ? -1 : 1;
      }
      const anum = numeric.test(a);
      const bnum = numeric.test(b);
      if (anum && bnum) {
        a = +a;
        b = +b;
      }
      return a === b ? 0 : anum && !bnum ? -1 : bnum && !anum ? 1 : a < b ? -1 : 1;
    };
    var rcompareIdentifiers = (a, b) => compareIdentifiers(b, a);
    module2.exports = {
      compareIdentifiers,
      rcompareIdentifiers
    };
  }
});

// node_modules/semver/classes/semver.js
var require_semver = __commonJS({
  "node_modules/semver/classes/semver.js"(exports2, module2) {
    "use strict";
    var debug = require_debug();
    var { MAX_LENGTH, MAX_SAFE_INTEGER } = require_constants();
    var { safeRe: re, t } = require_re();
    var parseOptions = require_parse_options();
    var { compareIdentifiers } = require_identifiers();
    var SemVer = class _SemVer {
      constructor(version, options) {
        options = parseOptions(options);
        if (version instanceof _SemVer) {
          if (version.loose === !!options.loose && version.includePrerelease === !!options.includePrerelease) {
            return version;
          } else {
            version = version.version;
          }
        } else if (typeof version !== "string") {
          throw new TypeError(`Invalid version. Must be a string. Got type "${typeof version}".`);
        }
        if (version.length > MAX_LENGTH) {
          throw new TypeError(
            `version is longer than ${MAX_LENGTH} characters`
          );
        }
        debug("SemVer", version, options);
        this.options = options;
        this.loose = !!options.loose;
        this.includePrerelease = !!options.includePrerelease;
        const m = version.trim().match(options.loose ? re[t.LOOSE] : re[t.FULL]);
        if (!m) {
          throw new TypeError(`Invalid Version: ${version}`);
        }
        this.raw = version;
        this.major = +m[1];
        this.minor = +m[2];
        this.patch = +m[3];
        if (this.major > MAX_SAFE_INTEGER || this.major < 0) {
          throw new TypeError("Invalid major version");
        }
        if (this.minor > MAX_SAFE_INTEGER || this.minor < 0) {
          throw new TypeError("Invalid minor version");
        }
        if (this.patch > MAX_SAFE_INTEGER || this.patch < 0) {
          throw new TypeError("Invalid patch version");
        }
        if (!m[4]) {
          this.prerelease = [];
        } else {
          this.prerelease = m[4].split(".").map((id) => {
            if (/^[0-9]+$/.test(id)) {
              const num = +id;
              if (num >= 0 && num < MAX_SAFE_INTEGER) {
                return num;
              }
            }
            return id;
          });
        }
        this.build = m[5] ? m[5].split(".") : [];
        this.format();
      }
      format() {
        this.version = `${this.major}.${this.minor}.${this.patch}`;
        if (this.prerelease.length) {
          this.version += `-${this.prerelease.join(".")}`;
        }
        return this.version;
      }
      toString() {
        return this.version;
      }
      compare(other) {
        debug("SemVer.compare", this.version, this.options, other);
        if (!(other instanceof _SemVer)) {
          if (typeof other === "string" && other === this.version) {
            return 0;
          }
          other = new _SemVer(other, this.options);
        }
        if (other.version === this.version) {
          return 0;
        }
        return this.compareMain(other) || this.comparePre(other);
      }
      compareMain(other) {
        if (!(other instanceof _SemVer)) {
          other = new _SemVer(other, this.options);
        }
        if (this.major < other.major) {
          return -1;
        }
        if (this.major > other.major) {
          return 1;
        }
        if (this.minor < other.minor) {
          return -1;
        }
        if (this.minor > other.minor) {
          return 1;
        }
        if (this.patch < other.patch) {
          return -1;
        }
        if (this.patch > other.patch) {
          return 1;
        }
        return 0;
      }
      comparePre(other) {
        if (!(other instanceof _SemVer)) {
          other = new _SemVer(other, this.options);
        }
        if (this.prerelease.length && !other.prerelease.length) {
          return -1;
        } else if (!this.prerelease.length && other.prerelease.length) {
          return 1;
        } else if (!this.prerelease.length && !other.prerelease.length) {
          return 0;
        }
        let i = 0;
        do {
          const a = this.prerelease[i];
          const b = other.prerelease[i];
          debug("prerelease compare", i, a, b);
          if (a === void 0 && b === void 0) {
            return 0;
          } else if (b === void 0) {
            return 1;
          } else if (a === void 0) {
            return -1;
          } else if (a === b) {
            continue;
          } else {
            return compareIdentifiers(a, b);
          }
        } while (++i);
      }
      compareBuild(other) {
        if (!(other instanceof _SemVer)) {
          other = new _SemVer(other, this.options);
        }
        let i = 0;
        do {
          const a = this.build[i];
          const b = other.build[i];
          debug("build compare", i, a, b);
          if (a === void 0 && b === void 0) {
            return 0;
          } else if (b === void 0) {
            return 1;
          } else if (a === void 0) {
            return -1;
          } else if (a === b) {
            continue;
          } else {
            return compareIdentifiers(a, b);
          }
        } while (++i);
      }
      // preminor will bump the version up to the next minor release, and immediately
      // down to pre-release. premajor and prepatch work the same way.
      inc(release, identifier, identifierBase) {
        if (release.startsWith("pre")) {
          if (!identifier && identifierBase === false) {
            throw new Error("invalid increment argument: identifier is empty");
          }
          if (identifier) {
            const match = `-${identifier}`.match(this.options.loose ? re[t.PRERELEASELOOSE] : re[t.PRERELEASE]);
            if (!match || match[1] !== identifier) {
              throw new Error(`invalid identifier: ${identifier}`);
            }
          }
        }
        switch (release) {
          case "premajor":
            this.prerelease.length = 0;
            this.patch = 0;
            this.minor = 0;
            this.major++;
            this.inc("pre", identifier, identifierBase);
            break;
          case "preminor":
            this.prerelease.length = 0;
            this.patch = 0;
            this.minor++;
            this.inc("pre", identifier, identifierBase);
            break;
          case "prepatch":
            this.prerelease.length = 0;
            this.inc("patch", identifier, identifierBase);
            this.inc("pre", identifier, identifierBase);
            break;
          // If the input is a non-prerelease version, this acts the same as
          // prepatch.
          case "prerelease":
            if (this.prerelease.length === 0) {
              this.inc("patch", identifier, identifierBase);
            }
            this.inc("pre", identifier, identifierBase);
            break;
          case "release":
            if (this.prerelease.length === 0) {
              throw new Error(`version ${this.raw} is not a prerelease`);
            }
            this.prerelease.length = 0;
            break;
          case "major":
            if (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) {
              this.major++;
            }
            this.minor = 0;
            this.patch = 0;
            this.prerelease = [];
            break;
          case "minor":
            if (this.patch !== 0 || this.prerelease.length === 0) {
              this.minor++;
            }
            this.patch = 0;
            this.prerelease = [];
            break;
          case "patch":
            if (this.prerelease.length === 0) {
              this.patch++;
            }
            this.prerelease = [];
            break;
          // This probably shouldn't be used publicly.
          // 1.0.0 'pre' would become 1.0.0-0 which is the wrong direction.
          case "pre": {
            const base = Number(identifierBase) ? 1 : 0;
            if (this.prerelease.length === 0) {
              this.prerelease = [base];
            } else {
              let i = this.prerelease.length;
              while (--i >= 0) {
                if (typeof this.prerelease[i] === "number") {
                  this.prerelease[i]++;
                  i = -2;
                }
              }
              if (i === -1) {
                if (identifier === this.prerelease.join(".") && identifierBase === false) {
                  throw new Error("invalid increment argument: identifier already exists");
                }
                this.prerelease.push(base);
              }
            }
            if (identifier) {
              let prerelease = [identifier, base];
              if (identifierBase === false) {
                prerelease = [identifier];
              }
              if (compareIdentifiers(this.prerelease[0], identifier) === 0) {
                if (isNaN(this.prerelease[1])) {
                  this.prerelease = prerelease;
                }
              } else {
                this.prerelease = prerelease;
              }
            }
            break;
          }
          default:
            throw new Error(`invalid increment argument: ${release}`);
        }
        this.raw = this.format();
        if (this.build.length) {
          this.raw += `+${this.build.join(".")}`;
        }
        return this;
      }
    };
    module2.exports = SemVer;
  }
});

// node_modules/semver/functions/parse.js
var require_parse = __commonJS({
  "node_modules/semver/functions/parse.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var parse = (version, options, throwErrors = false) => {
      if (version instanceof SemVer) {
        return version;
      }
      try {
        return new SemVer(version, options);
      } catch (er) {
        if (!throwErrors) {
          return null;
        }
        throw er;
      }
    };
    module2.exports = parse;
  }
});

// node_modules/semver/functions/valid.js
var require_valid = __commonJS({
  "node_modules/semver/functions/valid.js"(exports2, module2) {
    "use strict";
    var parse = require_parse();
    var valid = (version, options) => {
      const v = parse(version, options);
      return v ? v.version : null;
    };
    module2.exports = valid;
  }
});

// node_modules/semver/functions/clean.js
var require_clean = __commonJS({
  "node_modules/semver/functions/clean.js"(exports2, module2) {
    "use strict";
    var parse = require_parse();
    var clean = (version, options) => {
      const s = parse(version.trim().replace(/^[=v]+/, ""), options);
      return s ? s.version : null;
    };
    module2.exports = clean;
  }
});

// node_modules/semver/functions/inc.js
var require_inc = __commonJS({
  "node_modules/semver/functions/inc.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var inc = (version, release, options, identifier, identifierBase) => {
      if (typeof options === "string") {
        identifierBase = identifier;
        identifier = options;
        options = void 0;
      }
      try {
        return new SemVer(
          version instanceof SemVer ? version.version : version,
          options
        ).inc(release, identifier, identifierBase).version;
      } catch (er) {
        return null;
      }
    };
    module2.exports = inc;
  }
});

// node_modules/semver/functions/diff.js
var require_diff = __commonJS({
  "node_modules/semver/functions/diff.js"(exports2, module2) {
    "use strict";
    var parse = require_parse();
    var diff = (version1, version2) => {
      const v1 = parse(version1, null, true);
      const v2 = parse(version2, null, true);
      const comparison = v1.compare(v2);
      if (comparison === 0) {
        return null;
      }
      const v1Higher = comparison > 0;
      const highVersion = v1Higher ? v1 : v2;
      const lowVersion = v1Higher ? v2 : v1;
      const highHasPre = !!highVersion.prerelease.length;
      const lowHasPre = !!lowVersion.prerelease.length;
      if (lowHasPre && !highHasPre) {
        if (!lowVersion.patch && !lowVersion.minor) {
          return "major";
        }
        if (lowVersion.compareMain(highVersion) === 0) {
          if (lowVersion.minor && !lowVersion.patch) {
            return "minor";
          }
          return "patch";
        }
      }
      const prefix = highHasPre ? "pre" : "";
      if (v1.major !== v2.major) {
        return prefix + "major";
      }
      if (v1.minor !== v2.minor) {
        return prefix + "minor";
      }
      if (v1.patch !== v2.patch) {
        return prefix + "patch";
      }
      return "prerelease";
    };
    module2.exports = diff;
  }
});

// node_modules/semver/functions/major.js
var require_major = __commonJS({
  "node_modules/semver/functions/major.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var major = (a, loose) => new SemVer(a, loose).major;
    module2.exports = major;
  }
});

// node_modules/semver/functions/minor.js
var require_minor = __commonJS({
  "node_modules/semver/functions/minor.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var minor = (a, loose) => new SemVer(a, loose).minor;
    module2.exports = minor;
  }
});

// node_modules/semver/functions/patch.js
var require_patch = __commonJS({
  "node_modules/semver/functions/patch.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var patch = (a, loose) => new SemVer(a, loose).patch;
    module2.exports = patch;
  }
});

// node_modules/semver/functions/prerelease.js
var require_prerelease = __commonJS({
  "node_modules/semver/functions/prerelease.js"(exports2, module2) {
    "use strict";
    var parse = require_parse();
    var prerelease = (version, options) => {
      const parsed = parse(version, options);
      return parsed && parsed.prerelease.length ? parsed.prerelease : null;
    };
    module2.exports = prerelease;
  }
});

// node_modules/semver/functions/compare.js
var require_compare = __commonJS({
  "node_modules/semver/functions/compare.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var compare = (a, b, loose) => new SemVer(a, loose).compare(new SemVer(b, loose));
    module2.exports = compare;
  }
});

// node_modules/semver/functions/rcompare.js
var require_rcompare = __commonJS({
  "node_modules/semver/functions/rcompare.js"(exports2, module2) {
    "use strict";
    var compare = require_compare();
    var rcompare = (a, b, loose) => compare(b, a, loose);
    module2.exports = rcompare;
  }
});

// node_modules/semver/functions/compare-loose.js
var require_compare_loose = __commonJS({
  "node_modules/semver/functions/compare-loose.js"(exports2, module2) {
    "use strict";
    var compare = require_compare();
    var compareLoose = (a, b) => compare(a, b, true);
    module2.exports = compareLoose;
  }
});

// node_modules/semver/functions/compare-build.js
var require_compare_build = __commonJS({
  "node_modules/semver/functions/compare-build.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var compareBuild = (a, b, loose) => {
      const versionA = new SemVer(a, loose);
      const versionB = new SemVer(b, loose);
      return versionA.compare(versionB) || versionA.compareBuild(versionB);
    };
    module2.exports = compareBuild;
  }
});

// node_modules/semver/functions/sort.js
var require_sort = __commonJS({
  "node_modules/semver/functions/sort.js"(exports2, module2) {
    "use strict";
    var compareBuild = require_compare_build();
    var sort = (list, loose) => list.sort((a, b) => compareBuild(a, b, loose));
    module2.exports = sort;
  }
});

// node_modules/semver/functions/rsort.js
var require_rsort = __commonJS({
  "node_modules/semver/functions/rsort.js"(exports2, module2) {
    "use strict";
    var compareBuild = require_compare_build();
    var rsort = (list, loose) => list.sort((a, b) => compareBuild(b, a, loose));
    module2.exports = rsort;
  }
});

// node_modules/semver/functions/gt.js
var require_gt = __commonJS({
  "node_modules/semver/functions/gt.js"(exports2, module2) {
    "use strict";
    var compare = require_compare();
    var gt = (a, b, loose) => compare(a, b, loose) > 0;
    module2.exports = gt;
  }
});

// node_modules/semver/functions/lt.js
var require_lt = __commonJS({
  "node_modules/semver/functions/lt.js"(exports2, module2) {
    "use strict";
    var compare = require_compare();
    var lt = (a, b, loose) => compare(a, b, loose) < 0;
    module2.exports = lt;
  }
});

// node_modules/semver/functions/eq.js
var require_eq = __commonJS({
  "node_modules/semver/functions/eq.js"(exports2, module2) {
    "use strict";
    var compare = require_compare();
    var eq = (a, b, loose) => compare(a, b, loose) === 0;
    module2.exports = eq;
  }
});

// node_modules/semver/functions/neq.js
var require_neq = __commonJS({
  "node_modules/semver/functions/neq.js"(exports2, module2) {
    "use strict";
    var compare = require_compare();
    var neq = (a, b, loose) => compare(a, b, loose) !== 0;
    module2.exports = neq;
  }
});

// node_modules/semver/functions/gte.js
var require_gte = __commonJS({
  "node_modules/semver/functions/gte.js"(exports2, module2) {
    "use strict";
    var compare = require_compare();
    var gte = (a, b, loose) => compare(a, b, loose) >= 0;
    module2.exports = gte;
  }
});

// node_modules/semver/functions/lte.js
var require_lte = __commonJS({
  "node_modules/semver/functions/lte.js"(exports2, module2) {
    "use strict";
    var compare = require_compare();
    var lte = (a, b, loose) => compare(a, b, loose) <= 0;
    module2.exports = lte;
  }
});

// node_modules/semver/functions/cmp.js
var require_cmp = __commonJS({
  "node_modules/semver/functions/cmp.js"(exports2, module2) {
    "use strict";
    var eq = require_eq();
    var neq = require_neq();
    var gt = require_gt();
    var gte = require_gte();
    var lt = require_lt();
    var lte = require_lte();
    var cmp = (a, op, b, loose) => {
      switch (op) {
        case "===":
          if (typeof a === "object") {
            a = a.version;
          }
          if (typeof b === "object") {
            b = b.version;
          }
          return a === b;
        case "!==":
          if (typeof a === "object") {
            a = a.version;
          }
          if (typeof b === "object") {
            b = b.version;
          }
          return a !== b;
        case "":
        case "=":
        case "==":
          return eq(a, b, loose);
        case "!=":
          return neq(a, b, loose);
        case ">":
          return gt(a, b, loose);
        case ">=":
          return gte(a, b, loose);
        case "<":
          return lt(a, b, loose);
        case "<=":
          return lte(a, b, loose);
        default:
          throw new TypeError(`Invalid operator: ${op}`);
      }
    };
    module2.exports = cmp;
  }
});

// node_modules/semver/functions/coerce.js
var require_coerce = __commonJS({
  "node_modules/semver/functions/coerce.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var parse = require_parse();
    var { safeRe: re, t } = require_re();
    var coerce = (version, options) => {
      if (version instanceof SemVer) {
        return version;
      }
      if (typeof version === "number") {
        version = String(version);
      }
      if (typeof version !== "string") {
        return null;
      }
      options = options || {};
      let match = null;
      if (!options.rtl) {
        match = version.match(options.includePrerelease ? re[t.COERCEFULL] : re[t.COERCE]);
      } else {
        const coerceRtlRegex = options.includePrerelease ? re[t.COERCERTLFULL] : re[t.COERCERTL];
        let next;
        while ((next = coerceRtlRegex.exec(version)) && (!match || match.index + match[0].length !== version.length)) {
          if (!match || next.index + next[0].length !== match.index + match[0].length) {
            match = next;
          }
          coerceRtlRegex.lastIndex = next.index + next[1].length + next[2].length;
        }
        coerceRtlRegex.lastIndex = -1;
      }
      if (match === null) {
        return null;
      }
      const major = match[2];
      const minor = match[3] || "0";
      const patch = match[4] || "0";
      const prerelease = options.includePrerelease && match[5] ? `-${match[5]}` : "";
      const build = options.includePrerelease && match[6] ? `+${match[6]}` : "";
      return parse(`${major}.${minor}.${patch}${prerelease}${build}`, options);
    };
    module2.exports = coerce;
  }
});

// node_modules/semver/internal/lrucache.js
var require_lrucache = __commonJS({
  "node_modules/semver/internal/lrucache.js"(exports2, module2) {
    "use strict";
    var LRUCache = class {
      constructor() {
        this.max = 1e3;
        this.map = /* @__PURE__ */ new Map();
      }
      get(key) {
        const value = this.map.get(key);
        if (value === void 0) {
          return void 0;
        } else {
          this.map.delete(key);
          this.map.set(key, value);
          return value;
        }
      }
      delete(key) {
        return this.map.delete(key);
      }
      set(key, value) {
        const deleted = this.delete(key);
        if (!deleted && value !== void 0) {
          if (this.map.size >= this.max) {
            const firstKey = this.map.keys().next().value;
            this.delete(firstKey);
          }
          this.map.set(key, value);
        }
        return this;
      }
    };
    module2.exports = LRUCache;
  }
});

// node_modules/semver/classes/range.js
var require_range = __commonJS({
  "node_modules/semver/classes/range.js"(exports2, module2) {
    "use strict";
    var SPACE_CHARACTERS = /\s+/g;
    var Range = class _Range {
      constructor(range, options) {
        options = parseOptions(options);
        if (range instanceof _Range) {
          if (range.loose === !!options.loose && range.includePrerelease === !!options.includePrerelease) {
            return range;
          } else {
            return new _Range(range.raw, options);
          }
        }
        if (range instanceof Comparator) {
          this.raw = range.value;
          this.set = [[range]];
          this.formatted = void 0;
          return this;
        }
        this.options = options;
        this.loose = !!options.loose;
        this.includePrerelease = !!options.includePrerelease;
        this.raw = range.trim().replace(SPACE_CHARACTERS, " ");
        this.set = this.raw.split("||").map((r) => this.parseRange(r.trim())).filter((c) => c.length);
        if (!this.set.length) {
          throw new TypeError(`Invalid SemVer Range: ${this.raw}`);
        }
        if (this.set.length > 1) {
          const first = this.set[0];
          this.set = this.set.filter((c) => !isNullSet(c[0]));
          if (this.set.length === 0) {
            this.set = [first];
          } else if (this.set.length > 1) {
            for (const c of this.set) {
              if (c.length === 1 && isAny(c[0])) {
                this.set = [c];
                break;
              }
            }
          }
        }
        this.formatted = void 0;
      }
      get range() {
        if (this.formatted === void 0) {
          this.formatted = "";
          for (let i = 0; i < this.set.length; i++) {
            if (i > 0) {
              this.formatted += "||";
            }
            const comps = this.set[i];
            for (let k = 0; k < comps.length; k++) {
              if (k > 0) {
                this.formatted += " ";
              }
              this.formatted += comps[k].toString().trim();
            }
          }
        }
        return this.formatted;
      }
      format() {
        return this.range;
      }
      toString() {
        return this.range;
      }
      parseRange(range) {
        const memoOpts = (this.options.includePrerelease && FLAG_INCLUDE_PRERELEASE) | (this.options.loose && FLAG_LOOSE);
        const memoKey = memoOpts + ":" + range;
        const cached = cache.get(memoKey);
        if (cached) {
          return cached;
        }
        const loose = this.options.loose;
        const hr = loose ? re[t.HYPHENRANGELOOSE] : re[t.HYPHENRANGE];
        range = range.replace(hr, hyphenReplace(this.options.includePrerelease));
        debug("hyphen replace", range);
        range = range.replace(re[t.COMPARATORTRIM], comparatorTrimReplace);
        debug("comparator trim", range);
        range = range.replace(re[t.TILDETRIM], tildeTrimReplace);
        debug("tilde trim", range);
        range = range.replace(re[t.CARETTRIM], caretTrimReplace);
        debug("caret trim", range);
        let rangeList = range.split(" ").map((comp) => parseComparator(comp, this.options)).join(" ").split(/\s+/).map((comp) => replaceGTE0(comp, this.options));
        if (loose) {
          rangeList = rangeList.filter((comp) => {
            debug("loose invalid filter", comp, this.options);
            return !!comp.match(re[t.COMPARATORLOOSE]);
          });
        }
        debug("range list", rangeList);
        const rangeMap = /* @__PURE__ */ new Map();
        const comparators = rangeList.map((comp) => new Comparator(comp, this.options));
        for (const comp of comparators) {
          if (isNullSet(comp)) {
            return [comp];
          }
          rangeMap.set(comp.value, comp);
        }
        if (rangeMap.size > 1 && rangeMap.has("")) {
          rangeMap.delete("");
        }
        const result = [...rangeMap.values()];
        cache.set(memoKey, result);
        return result;
      }
      intersects(range, options) {
        if (!(range instanceof _Range)) {
          throw new TypeError("a Range is required");
        }
        return this.set.some((thisComparators) => {
          return isSatisfiable(thisComparators, options) && range.set.some((rangeComparators) => {
            return isSatisfiable(rangeComparators, options) && thisComparators.every((thisComparator) => {
              return rangeComparators.every((rangeComparator) => {
                return thisComparator.intersects(rangeComparator, options);
              });
            });
          });
        });
      }
      // if ANY of the sets match ALL of its comparators, then pass
      test(version) {
        if (!version) {
          return false;
        }
        if (typeof version === "string") {
          try {
            version = new SemVer(version, this.options);
          } catch (er) {
            return false;
          }
        }
        for (let i = 0; i < this.set.length; i++) {
          if (testSet(this.set[i], version, this.options)) {
            return true;
          }
        }
        return false;
      }
    };
    module2.exports = Range;
    var LRU = require_lrucache();
    var cache = new LRU();
    var parseOptions = require_parse_options();
    var Comparator = require_comparator();
    var debug = require_debug();
    var SemVer = require_semver();
    var {
      safeRe: re,
      t,
      comparatorTrimReplace,
      tildeTrimReplace,
      caretTrimReplace
    } = require_re();
    var { FLAG_INCLUDE_PRERELEASE, FLAG_LOOSE } = require_constants();
    var isNullSet = (c) => c.value === "<0.0.0-0";
    var isAny = (c) => c.value === "";
    var isSatisfiable = (comparators, options) => {
      let result = true;
      const remainingComparators = comparators.slice();
      let testComparator = remainingComparators.pop();
      while (result && remainingComparators.length) {
        result = remainingComparators.every((otherComparator) => {
          return testComparator.intersects(otherComparator, options);
        });
        testComparator = remainingComparators.pop();
      }
      return result;
    };
    var parseComparator = (comp, options) => {
      comp = comp.replace(re[t.BUILD], "");
      debug("comp", comp, options);
      comp = replaceCarets(comp, options);
      debug("caret", comp);
      comp = replaceTildes(comp, options);
      debug("tildes", comp);
      comp = replaceXRanges(comp, options);
      debug("xrange", comp);
      comp = replaceStars(comp, options);
      debug("stars", comp);
      return comp;
    };
    var isX = (id) => !id || id.toLowerCase() === "x" || id === "*";
    var replaceTildes = (comp, options) => {
      return comp.trim().split(/\s+/).map((c) => replaceTilde(c, options)).join(" ");
    };
    var replaceTilde = (comp, options) => {
      const r = options.loose ? re[t.TILDELOOSE] : re[t.TILDE];
      return comp.replace(r, (_, M, m, p, pr) => {
        debug("tilde", comp, _, M, m, p, pr);
        let ret;
        if (isX(M)) {
          ret = "";
        } else if (isX(m)) {
          ret = `>=${M}.0.0 <${+M + 1}.0.0-0`;
        } else if (isX(p)) {
          ret = `>=${M}.${m}.0 <${M}.${+m + 1}.0-0`;
        } else if (pr) {
          debug("replaceTilde pr", pr);
          ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
        } else {
          ret = `>=${M}.${m}.${p} <${M}.${+m + 1}.0-0`;
        }
        debug("tilde return", ret);
        return ret;
      });
    };
    var replaceCarets = (comp, options) => {
      return comp.trim().split(/\s+/).map((c) => replaceCaret(c, options)).join(" ");
    };
    var replaceCaret = (comp, options) => {
      debug("caret", comp, options);
      const r = options.loose ? re[t.CARETLOOSE] : re[t.CARET];
      const z = options.includePrerelease ? "-0" : "";
      return comp.replace(r, (_, M, m, p, pr) => {
        debug("caret", comp, _, M, m, p, pr);
        let ret;
        if (isX(M)) {
          ret = "";
        } else if (isX(m)) {
          ret = `>=${M}.0.0${z} <${+M + 1}.0.0-0`;
        } else if (isX(p)) {
          if (M === "0") {
            ret = `>=${M}.${m}.0${z} <${M}.${+m + 1}.0-0`;
          } else {
            ret = `>=${M}.${m}.0${z} <${+M + 1}.0.0-0`;
          }
        } else if (pr) {
          debug("replaceCaret pr", pr);
          if (M === "0") {
            if (m === "0") {
              ret = `>=${M}.${m}.${p}-${pr} <${M}.${m}.${+p + 1}-0`;
            } else {
              ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
            }
          } else {
            ret = `>=${M}.${m}.${p}-${pr} <${+M + 1}.0.0-0`;
          }
        } else {
          debug("no pr");
          if (M === "0") {
            if (m === "0") {
              ret = `>=${M}.${m}.${p}${z} <${M}.${m}.${+p + 1}-0`;
            } else {
              ret = `>=${M}.${m}.${p}${z} <${M}.${+m + 1}.0-0`;
            }
          } else {
            ret = `>=${M}.${m}.${p} <${+M + 1}.0.0-0`;
          }
        }
        debug("caret return", ret);
        return ret;
      });
    };
    var replaceXRanges = (comp, options) => {
      debug("replaceXRanges", comp, options);
      return comp.split(/\s+/).map((c) => replaceXRange(c, options)).join(" ");
    };
    var replaceXRange = (comp, options) => {
      comp = comp.trim();
      const r = options.loose ? re[t.XRANGELOOSE] : re[t.XRANGE];
      return comp.replace(r, (ret, gtlt, M, m, p, pr) => {
        debug("xRange", comp, ret, gtlt, M, m, p, pr);
        const xM = isX(M);
        const xm = xM || isX(m);
        const xp = xm || isX(p);
        const anyX = xp;
        if (gtlt === "=" && anyX) {
          gtlt = "";
        }
        pr = options.includePrerelease ? "-0" : "";
        if (xM) {
          if (gtlt === ">" || gtlt === "<") {
            ret = "<0.0.0-0";
          } else {
            ret = "*";
          }
        } else if (gtlt && anyX) {
          if (xm) {
            m = 0;
          }
          p = 0;
          if (gtlt === ">") {
            gtlt = ">=";
            if (xm) {
              M = +M + 1;
              m = 0;
              p = 0;
            } else {
              m = +m + 1;
              p = 0;
            }
          } else if (gtlt === "<=") {
            gtlt = "<";
            if (xm) {
              M = +M + 1;
            } else {
              m = +m + 1;
            }
          }
          if (gtlt === "<") {
            pr = "-0";
          }
          ret = `${gtlt + M}.${m}.${p}${pr}`;
        } else if (xm) {
          ret = `>=${M}.0.0${pr} <${+M + 1}.0.0-0`;
        } else if (xp) {
          ret = `>=${M}.${m}.0${pr} <${M}.${+m + 1}.0-0`;
        }
        debug("xRange return", ret);
        return ret;
      });
    };
    var replaceStars = (comp, options) => {
      debug("replaceStars", comp, options);
      return comp.trim().replace(re[t.STAR], "");
    };
    var replaceGTE0 = (comp, options) => {
      debug("replaceGTE0", comp, options);
      return comp.trim().replace(re[options.includePrerelease ? t.GTE0PRE : t.GTE0], "");
    };
    var hyphenReplace = (incPr) => ($0, from, fM, fm, fp, fpr, fb, to, tM, tm, tp, tpr) => {
      if (isX(fM)) {
        from = "";
      } else if (isX(fm)) {
        from = `>=${fM}.0.0${incPr ? "-0" : ""}`;
      } else if (isX(fp)) {
        from = `>=${fM}.${fm}.0${incPr ? "-0" : ""}`;
      } else if (fpr) {
        from = `>=${from}`;
      } else {
        from = `>=${from}${incPr ? "-0" : ""}`;
      }
      if (isX(tM)) {
        to = "";
      } else if (isX(tm)) {
        to = `<${+tM + 1}.0.0-0`;
      } else if (isX(tp)) {
        to = `<${tM}.${+tm + 1}.0-0`;
      } else if (tpr) {
        to = `<=${tM}.${tm}.${tp}-${tpr}`;
      } else if (incPr) {
        to = `<${tM}.${tm}.${+tp + 1}-0`;
      } else {
        to = `<=${to}`;
      }
      return `${from} ${to}`.trim();
    };
    var testSet = (set, version, options) => {
      for (let i = 0; i < set.length; i++) {
        if (!set[i].test(version)) {
          return false;
        }
      }
      if (version.prerelease.length && !options.includePrerelease) {
        for (let i = 0; i < set.length; i++) {
          debug(set[i].semver);
          if (set[i].semver === Comparator.ANY) {
            continue;
          }
          if (set[i].semver.prerelease.length > 0) {
            const allowed = set[i].semver;
            if (allowed.major === version.major && allowed.minor === version.minor && allowed.patch === version.patch) {
              return true;
            }
          }
        }
        return false;
      }
      return true;
    };
  }
});

// node_modules/semver/classes/comparator.js
var require_comparator = __commonJS({
  "node_modules/semver/classes/comparator.js"(exports2, module2) {
    "use strict";
    var ANY = /* @__PURE__ */ Symbol("SemVer ANY");
    var Comparator = class _Comparator {
      static get ANY() {
        return ANY;
      }
      constructor(comp, options) {
        options = parseOptions(options);
        if (comp instanceof _Comparator) {
          if (comp.loose === !!options.loose) {
            return comp;
          } else {
            comp = comp.value;
          }
        }
        comp = comp.trim().split(/\s+/).join(" ");
        debug("comparator", comp, options);
        this.options = options;
        this.loose = !!options.loose;
        this.parse(comp);
        if (this.semver === ANY) {
          this.value = "";
        } else {
          this.value = this.operator + this.semver.version;
        }
        debug("comp", this);
      }
      parse(comp) {
        const r = this.options.loose ? re[t.COMPARATORLOOSE] : re[t.COMPARATOR];
        const m = comp.match(r);
        if (!m) {
          throw new TypeError(`Invalid comparator: ${comp}`);
        }
        this.operator = m[1] !== void 0 ? m[1] : "";
        if (this.operator === "=") {
          this.operator = "";
        }
        if (!m[2]) {
          this.semver = ANY;
        } else {
          this.semver = new SemVer(m[2], this.options.loose);
        }
      }
      toString() {
        return this.value;
      }
      test(version) {
        debug("Comparator.test", version, this.options.loose);
        if (this.semver === ANY || version === ANY) {
          return true;
        }
        if (typeof version === "string") {
          try {
            version = new SemVer(version, this.options);
          } catch (er) {
            return false;
          }
        }
        return cmp(version, this.operator, this.semver, this.options);
      }
      intersects(comp, options) {
        if (!(comp instanceof _Comparator)) {
          throw new TypeError("a Comparator is required");
        }
        if (this.operator === "") {
          if (this.value === "") {
            return true;
          }
          return new Range(comp.value, options).test(this.value);
        } else if (comp.operator === "") {
          if (comp.value === "") {
            return true;
          }
          return new Range(this.value, options).test(comp.semver);
        }
        options = parseOptions(options);
        if (options.includePrerelease && (this.value === "<0.0.0-0" || comp.value === "<0.0.0-0")) {
          return false;
        }
        if (!options.includePrerelease && (this.value.startsWith("<0.0.0") || comp.value.startsWith("<0.0.0"))) {
          return false;
        }
        if (this.operator.startsWith(">") && comp.operator.startsWith(">")) {
          return true;
        }
        if (this.operator.startsWith("<") && comp.operator.startsWith("<")) {
          return true;
        }
        if (this.semver.version === comp.semver.version && this.operator.includes("=") && comp.operator.includes("=")) {
          return true;
        }
        if (cmp(this.semver, "<", comp.semver, options) && this.operator.startsWith(">") && comp.operator.startsWith("<")) {
          return true;
        }
        if (cmp(this.semver, ">", comp.semver, options) && this.operator.startsWith("<") && comp.operator.startsWith(">")) {
          return true;
        }
        return false;
      }
    };
    module2.exports = Comparator;
    var parseOptions = require_parse_options();
    var { safeRe: re, t } = require_re();
    var cmp = require_cmp();
    var debug = require_debug();
    var SemVer = require_semver();
    var Range = require_range();
  }
});

// node_modules/semver/functions/satisfies.js
var require_satisfies = __commonJS({
  "node_modules/semver/functions/satisfies.js"(exports2, module2) {
    "use strict";
    var Range = require_range();
    var satisfies = (version, range, options) => {
      try {
        range = new Range(range, options);
      } catch (er) {
        return false;
      }
      return range.test(version);
    };
    module2.exports = satisfies;
  }
});

// node_modules/semver/ranges/to-comparators.js
var require_to_comparators = __commonJS({
  "node_modules/semver/ranges/to-comparators.js"(exports2, module2) {
    "use strict";
    var Range = require_range();
    var toComparators = (range, options) => new Range(range, options).set.map((comp) => comp.map((c) => c.value).join(" ").trim().split(" "));
    module2.exports = toComparators;
  }
});

// node_modules/semver/ranges/max-satisfying.js
var require_max_satisfying = __commonJS({
  "node_modules/semver/ranges/max-satisfying.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var Range = require_range();
    var maxSatisfying = (versions, range, options) => {
      let max = null;
      let maxSV = null;
      let rangeObj = null;
      try {
        rangeObj = new Range(range, options);
      } catch (er) {
        return null;
      }
      versions.forEach((v) => {
        if (rangeObj.test(v)) {
          if (!max || maxSV.compare(v) === -1) {
            max = v;
            maxSV = new SemVer(max, options);
          }
        }
      });
      return max;
    };
    module2.exports = maxSatisfying;
  }
});

// node_modules/semver/ranges/min-satisfying.js
var require_min_satisfying = __commonJS({
  "node_modules/semver/ranges/min-satisfying.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var Range = require_range();
    var minSatisfying = (versions, range, options) => {
      let min = null;
      let minSV = null;
      let rangeObj = null;
      try {
        rangeObj = new Range(range, options);
      } catch (er) {
        return null;
      }
      versions.forEach((v) => {
        if (rangeObj.test(v)) {
          if (!min || minSV.compare(v) === 1) {
            min = v;
            minSV = new SemVer(min, options);
          }
        }
      });
      return min;
    };
    module2.exports = minSatisfying;
  }
});

// node_modules/semver/ranges/min-version.js
var require_min_version = __commonJS({
  "node_modules/semver/ranges/min-version.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var Range = require_range();
    var gt = require_gt();
    var minVersion = (range, loose) => {
      range = new Range(range, loose);
      let minver = new SemVer("0.0.0");
      if (range.test(minver)) {
        return minver;
      }
      minver = new SemVer("0.0.0-0");
      if (range.test(minver)) {
        return minver;
      }
      minver = null;
      for (let i = 0; i < range.set.length; ++i) {
        const comparators = range.set[i];
        let setMin = null;
        comparators.forEach((comparator) => {
          const compver = new SemVer(comparator.semver.version);
          switch (comparator.operator) {
            case ">":
              if (compver.prerelease.length === 0) {
                compver.patch++;
              } else {
                compver.prerelease.push(0);
              }
              compver.raw = compver.format();
            /* fallthrough */
            case "":
            case ">=":
              if (!setMin || gt(compver, setMin)) {
                setMin = compver;
              }
              break;
            case "<":
            case "<=":
              break;
            /* istanbul ignore next */
            default:
              throw new Error(`Unexpected operation: ${comparator.operator}`);
          }
        });
        if (setMin && (!minver || gt(minver, setMin))) {
          minver = setMin;
        }
      }
      if (minver && range.test(minver)) {
        return minver;
      }
      return null;
    };
    module2.exports = minVersion;
  }
});

// node_modules/semver/ranges/valid.js
var require_valid2 = __commonJS({
  "node_modules/semver/ranges/valid.js"(exports2, module2) {
    "use strict";
    var Range = require_range();
    var validRange = (range, options) => {
      try {
        return new Range(range, options).range || "*";
      } catch (er) {
        return null;
      }
    };
    module2.exports = validRange;
  }
});

// node_modules/semver/ranges/outside.js
var require_outside = __commonJS({
  "node_modules/semver/ranges/outside.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var Comparator = require_comparator();
    var { ANY } = Comparator;
    var Range = require_range();
    var satisfies = require_satisfies();
    var gt = require_gt();
    var lt = require_lt();
    var lte = require_lte();
    var gte = require_gte();
    var outside = (version, range, hilo, options) => {
      version = new SemVer(version, options);
      range = new Range(range, options);
      let gtfn, ltefn, ltfn, comp, ecomp;
      switch (hilo) {
        case ">":
          gtfn = gt;
          ltefn = lte;
          ltfn = lt;
          comp = ">";
          ecomp = ">=";
          break;
        case "<":
          gtfn = lt;
          ltefn = gte;
          ltfn = gt;
          comp = "<";
          ecomp = "<=";
          break;
        default:
          throw new TypeError('Must provide a hilo val of "<" or ">"');
      }
      if (satisfies(version, range, options)) {
        return false;
      }
      for (let i = 0; i < range.set.length; ++i) {
        const comparators = range.set[i];
        let high = null;
        let low = null;
        comparators.forEach((comparator) => {
          if (comparator.semver === ANY) {
            comparator = new Comparator(">=0.0.0");
          }
          high = high || comparator;
          low = low || comparator;
          if (gtfn(comparator.semver, high.semver, options)) {
            high = comparator;
          } else if (ltfn(comparator.semver, low.semver, options)) {
            low = comparator;
          }
        });
        if (high.operator === comp || high.operator === ecomp) {
          return false;
        }
        if ((!low.operator || low.operator === comp) && ltefn(version, low.semver)) {
          return false;
        } else if (low.operator === ecomp && ltfn(version, low.semver)) {
          return false;
        }
      }
      return true;
    };
    module2.exports = outside;
  }
});

// node_modules/semver/ranges/gtr.js
var require_gtr = __commonJS({
  "node_modules/semver/ranges/gtr.js"(exports2, module2) {
    "use strict";
    var outside = require_outside();
    var gtr = (version, range, options) => outside(version, range, ">", options);
    module2.exports = gtr;
  }
});

// node_modules/semver/ranges/ltr.js
var require_ltr = __commonJS({
  "node_modules/semver/ranges/ltr.js"(exports2, module2) {
    "use strict";
    var outside = require_outside();
    var ltr = (version, range, options) => outside(version, range, "<", options);
    module2.exports = ltr;
  }
});

// node_modules/semver/ranges/intersects.js
var require_intersects = __commonJS({
  "node_modules/semver/ranges/intersects.js"(exports2, module2) {
    "use strict";
    var Range = require_range();
    var intersects = (r1, r2, options) => {
      r1 = new Range(r1, options);
      r2 = new Range(r2, options);
      return r1.intersects(r2, options);
    };
    module2.exports = intersects;
  }
});

// node_modules/semver/ranges/simplify.js
var require_simplify = __commonJS({
  "node_modules/semver/ranges/simplify.js"(exports2, module2) {
    "use strict";
    var satisfies = require_satisfies();
    var compare = require_compare();
    module2.exports = (versions, range, options) => {
      const set = [];
      let first = null;
      let prev = null;
      const v = versions.sort((a, b) => compare(a, b, options));
      for (const version of v) {
        const included = satisfies(version, range, options);
        if (included) {
          prev = version;
          if (!first) {
            first = version;
          }
        } else {
          if (prev) {
            set.push([first, prev]);
          }
          prev = null;
          first = null;
        }
      }
      if (first) {
        set.push([first, null]);
      }
      const ranges = [];
      for (const [min, max] of set) {
        if (min === max) {
          ranges.push(min);
        } else if (!max && min === v[0]) {
          ranges.push("*");
        } else if (!max) {
          ranges.push(`>=${min}`);
        } else if (min === v[0]) {
          ranges.push(`<=${max}`);
        } else {
          ranges.push(`${min} - ${max}`);
        }
      }
      const simplified = ranges.join(" || ");
      const original = typeof range.raw === "string" ? range.raw : String(range);
      return simplified.length < original.length ? simplified : range;
    };
  }
});

// node_modules/semver/ranges/subset.js
var require_subset = __commonJS({
  "node_modules/semver/ranges/subset.js"(exports2, module2) {
    "use strict";
    var Range = require_range();
    var Comparator = require_comparator();
    var { ANY } = Comparator;
    var satisfies = require_satisfies();
    var compare = require_compare();
    var subset = (sub, dom, options = {}) => {
      if (sub === dom) {
        return true;
      }
      sub = new Range(sub, options);
      dom = new Range(dom, options);
      let sawNonNull = false;
      OUTER: for (const simpleSub of sub.set) {
        for (const simpleDom of dom.set) {
          const isSub = simpleSubset(simpleSub, simpleDom, options);
          sawNonNull = sawNonNull || isSub !== null;
          if (isSub) {
            continue OUTER;
          }
        }
        if (sawNonNull) {
          return false;
        }
      }
      return true;
    };
    var minimumVersionWithPreRelease = [new Comparator(">=0.0.0-0")];
    var minimumVersion = [new Comparator(">=0.0.0")];
    var simpleSubset = (sub, dom, options) => {
      if (sub === dom) {
        return true;
      }
      if (sub.length === 1 && sub[0].semver === ANY) {
        if (dom.length === 1 && dom[0].semver === ANY) {
          return true;
        } else if (options.includePrerelease) {
          sub = minimumVersionWithPreRelease;
        } else {
          sub = minimumVersion;
        }
      }
      if (dom.length === 1 && dom[0].semver === ANY) {
        if (options.includePrerelease) {
          return true;
        } else {
          dom = minimumVersion;
        }
      }
      const eqSet = /* @__PURE__ */ new Set();
      let gt, lt;
      for (const c of sub) {
        if (c.operator === ">" || c.operator === ">=") {
          gt = higherGT(gt, c, options);
        } else if (c.operator === "<" || c.operator === "<=") {
          lt = lowerLT(lt, c, options);
        } else {
          eqSet.add(c.semver);
        }
      }
      if (eqSet.size > 1) {
        return null;
      }
      let gtltComp;
      if (gt && lt) {
        gtltComp = compare(gt.semver, lt.semver, options);
        if (gtltComp > 0) {
          return null;
        } else if (gtltComp === 0 && (gt.operator !== ">=" || lt.operator !== "<=")) {
          return null;
        }
      }
      for (const eq of eqSet) {
        if (gt && !satisfies(eq, String(gt), options)) {
          return null;
        }
        if (lt && !satisfies(eq, String(lt), options)) {
          return null;
        }
        for (const c of dom) {
          if (!satisfies(eq, String(c), options)) {
            return false;
          }
        }
        return true;
      }
      let higher, lower;
      let hasDomLT, hasDomGT;
      let needDomLTPre = lt && !options.includePrerelease && lt.semver.prerelease.length ? lt.semver : false;
      let needDomGTPre = gt && !options.includePrerelease && gt.semver.prerelease.length ? gt.semver : false;
      if (needDomLTPre && needDomLTPre.prerelease.length === 1 && lt.operator === "<" && needDomLTPre.prerelease[0] === 0) {
        needDomLTPre = false;
      }
      for (const c of dom) {
        hasDomGT = hasDomGT || c.operator === ">" || c.operator === ">=";
        hasDomLT = hasDomLT || c.operator === "<" || c.operator === "<=";
        if (gt) {
          if (needDomGTPre) {
            if (c.semver.prerelease && c.semver.prerelease.length && c.semver.major === needDomGTPre.major && c.semver.minor === needDomGTPre.minor && c.semver.patch === needDomGTPre.patch) {
              needDomGTPre = false;
            }
          }
          if (c.operator === ">" || c.operator === ">=") {
            higher = higherGT(gt, c, options);
            if (higher === c && higher !== gt) {
              return false;
            }
          } else if (gt.operator === ">=" && !satisfies(gt.semver, String(c), options)) {
            return false;
          }
        }
        if (lt) {
          if (needDomLTPre) {
            if (c.semver.prerelease && c.semver.prerelease.length && c.semver.major === needDomLTPre.major && c.semver.minor === needDomLTPre.minor && c.semver.patch === needDomLTPre.patch) {
              needDomLTPre = false;
            }
          }
          if (c.operator === "<" || c.operator === "<=") {
            lower = lowerLT(lt, c, options);
            if (lower === c && lower !== lt) {
              return false;
            }
          } else if (lt.operator === "<=" && !satisfies(lt.semver, String(c), options)) {
            return false;
          }
        }
        if (!c.operator && (lt || gt) && gtltComp !== 0) {
          return false;
        }
      }
      if (gt && hasDomLT && !lt && gtltComp !== 0) {
        return false;
      }
      if (lt && hasDomGT && !gt && gtltComp !== 0) {
        return false;
      }
      if (needDomGTPre || needDomLTPre) {
        return false;
      }
      return true;
    };
    var higherGT = (a, b, options) => {
      if (!a) {
        return b;
      }
      const comp = compare(a.semver, b.semver, options);
      return comp > 0 ? a : comp < 0 ? b : b.operator === ">" && a.operator === ">=" ? b : a;
    };
    var lowerLT = (a, b, options) => {
      if (!a) {
        return b;
      }
      const comp = compare(a.semver, b.semver, options);
      return comp < 0 ? a : comp > 0 ? b : b.operator === "<" && a.operator === "<=" ? b : a;
    };
    module2.exports = subset;
  }
});

// node_modules/semver/index.js
var require_semver2 = __commonJS({
  "node_modules/semver/index.js"(exports2, module2) {
    "use strict";
    var internalRe = require_re();
    var constants = require_constants();
    var SemVer = require_semver();
    var identifiers = require_identifiers();
    var parse = require_parse();
    var valid = require_valid();
    var clean = require_clean();
    var inc = require_inc();
    var diff = require_diff();
    var major = require_major();
    var minor = require_minor();
    var patch = require_patch();
    var prerelease = require_prerelease();
    var compare = require_compare();
    var rcompare = require_rcompare();
    var compareLoose = require_compare_loose();
    var compareBuild = require_compare_build();
    var sort = require_sort();
    var rsort = require_rsort();
    var gt = require_gt();
    var lt = require_lt();
    var eq = require_eq();
    var neq = require_neq();
    var gte = require_gte();
    var lte = require_lte();
    var cmp = require_cmp();
    var coerce = require_coerce();
    var Comparator = require_comparator();
    var Range = require_range();
    var satisfies = require_satisfies();
    var toComparators = require_to_comparators();
    var maxSatisfying = require_max_satisfying();
    var minSatisfying = require_min_satisfying();
    var minVersion = require_min_version();
    var validRange = require_valid2();
    var outside = require_outside();
    var gtr = require_gtr();
    var ltr = require_ltr();
    var intersects = require_intersects();
    var simplifyRange = require_simplify();
    var subset = require_subset();
    module2.exports = {
      parse,
      valid,
      clean,
      inc,
      diff,
      major,
      minor,
      patch,
      prerelease,
      compare,
      rcompare,
      compareLoose,
      compareBuild,
      sort,
      rsort,
      gt,
      lt,
      eq,
      neq,
      gte,
      lte,
      cmp,
      coerce,
      Comparator,
      Range,
      satisfies,
      toComparators,
      maxSatisfying,
      minSatisfying,
      minVersion,
      validRange,
      outside,
      gtr,
      ltr,
      intersects,
      simplifyRange,
      subset,
      SemVer,
      re: internalRe.re,
      src: internalRe.src,
      tokens: internalRe.t,
      SEMVER_SPEC_VERSION: constants.SEMVER_SPEC_VERSION,
      RELEASE_TYPES: constants.RELEASE_TYPES,
      compareIdentifiers: identifiers.compareIdentifiers,
      rcompareIdentifiers: identifiers.rcompareIdentifiers
    };
  }
});

// node_modules/lodash.isequal/index.js
var require_lodash = __commonJS({
  "node_modules/lodash.isequal/index.js"(exports2, module2) {
    var LARGE_ARRAY_SIZE = 200;
    var HASH_UNDEFINED = "__lodash_hash_undefined__";
    var COMPARE_PARTIAL_FLAG = 1;
    var COMPARE_UNORDERED_FLAG = 2;
    var MAX_SAFE_INTEGER = 9007199254740991;
    var argsTag = "[object Arguments]";
    var arrayTag = "[object Array]";
    var asyncTag = "[object AsyncFunction]";
    var boolTag = "[object Boolean]";
    var dateTag = "[object Date]";
    var errorTag = "[object Error]";
    var funcTag = "[object Function]";
    var genTag = "[object GeneratorFunction]";
    var mapTag = "[object Map]";
    var numberTag = "[object Number]";
    var nullTag = "[object Null]";
    var objectTag = "[object Object]";
    var promiseTag = "[object Promise]";
    var proxyTag = "[object Proxy]";
    var regexpTag = "[object RegExp]";
    var setTag = "[object Set]";
    var stringTag = "[object String]";
    var symbolTag = "[object Symbol]";
    var undefinedTag = "[object Undefined]";
    var weakMapTag = "[object WeakMap]";
    var arrayBufferTag = "[object ArrayBuffer]";
    var dataViewTag = "[object DataView]";
    var float32Tag = "[object Float32Array]";
    var float64Tag = "[object Float64Array]";
    var int8Tag = "[object Int8Array]";
    var int16Tag = "[object Int16Array]";
    var int32Tag = "[object Int32Array]";
    var uint8Tag = "[object Uint8Array]";
    var uint8ClampedTag = "[object Uint8ClampedArray]";
    var uint16Tag = "[object Uint16Array]";
    var uint32Tag = "[object Uint32Array]";
    var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;
    var reIsHostCtor = /^\[object .+?Constructor\]$/;
    var reIsUint = /^(?:0|[1-9]\d*)$/;
    var typedArrayTags = {};
    typedArrayTags[float32Tag] = typedArrayTags[float64Tag] = typedArrayTags[int8Tag] = typedArrayTags[int16Tag] = typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] = typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] = typedArrayTags[uint32Tag] = true;
    typedArrayTags[argsTag] = typedArrayTags[arrayTag] = typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] = typedArrayTags[dataViewTag] = typedArrayTags[dateTag] = typedArrayTags[errorTag] = typedArrayTags[funcTag] = typedArrayTags[mapTag] = typedArrayTags[numberTag] = typedArrayTags[objectTag] = typedArrayTags[regexpTag] = typedArrayTags[setTag] = typedArrayTags[stringTag] = typedArrayTags[weakMapTag] = false;
    var freeGlobal = typeof global == "object" && global && global.Object === Object && global;
    var freeSelf = typeof self == "object" && self && self.Object === Object && self;
    var root = freeGlobal || freeSelf || Function("return this")();
    var freeExports = typeof exports2 == "object" && exports2 && !exports2.nodeType && exports2;
    var freeModule = freeExports && typeof module2 == "object" && module2 && !module2.nodeType && module2;
    var moduleExports = freeModule && freeModule.exports === freeExports;
    var freeProcess = moduleExports && freeGlobal.process;
    var nodeUtil = (function() {
      try {
        return freeProcess && freeProcess.binding && freeProcess.binding("util");
      } catch (e) {
      }
    })();
    var nodeIsTypedArray = nodeUtil && nodeUtil.isTypedArray;
    function arrayFilter(array, predicate) {
      var index = -1, length = array == null ? 0 : array.length, resIndex = 0, result = [];
      while (++index < length) {
        var value = array[index];
        if (predicate(value, index, array)) {
          result[resIndex++] = value;
        }
      }
      return result;
    }
    function arrayPush(array, values) {
      var index = -1, length = values.length, offset = array.length;
      while (++index < length) {
        array[offset + index] = values[index];
      }
      return array;
    }
    function arraySome(array, predicate) {
      var index = -1, length = array == null ? 0 : array.length;
      while (++index < length) {
        if (predicate(array[index], index, array)) {
          return true;
        }
      }
      return false;
    }
    function baseTimes(n, iteratee) {
      var index = -1, result = Array(n);
      while (++index < n) {
        result[index] = iteratee(index);
      }
      return result;
    }
    function baseUnary(func) {
      return function(value) {
        return func(value);
      };
    }
    function cacheHas(cache, key) {
      return cache.has(key);
    }
    function getValue(object, key) {
      return object == null ? void 0 : object[key];
    }
    function mapToArray(map) {
      var index = -1, result = Array(map.size);
      map.forEach(function(value, key) {
        result[++index] = [key, value];
      });
      return result;
    }
    function overArg(func, transform) {
      return function(arg) {
        return func(transform(arg));
      };
    }
    function setToArray(set) {
      var index = -1, result = Array(set.size);
      set.forEach(function(value) {
        result[++index] = value;
      });
      return result;
    }
    var arrayProto = Array.prototype;
    var funcProto = Function.prototype;
    var objectProto = Object.prototype;
    var coreJsData = root["__core-js_shared__"];
    var funcToString = funcProto.toString;
    var hasOwnProperty = objectProto.hasOwnProperty;
    var maskSrcKey = (function() {
      var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || "");
      return uid ? "Symbol(src)_1." + uid : "";
    })();
    var nativeObjectToString = objectProto.toString;
    var reIsNative = RegExp(
      "^" + funcToString.call(hasOwnProperty).replace(reRegExpChar, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$"
    );
    var Buffer2 = moduleExports ? root.Buffer : void 0;
    var Symbol2 = root.Symbol;
    var Uint8Array2 = root.Uint8Array;
    var propertyIsEnumerable = objectProto.propertyIsEnumerable;
    var splice = arrayProto.splice;
    var symToStringTag = Symbol2 ? Symbol2.toStringTag : void 0;
    var nativeGetSymbols = Object.getOwnPropertySymbols;
    var nativeIsBuffer = Buffer2 ? Buffer2.isBuffer : void 0;
    var nativeKeys = overArg(Object.keys, Object);
    var DataView = getNative(root, "DataView");
    var Map2 = getNative(root, "Map");
    var Promise2 = getNative(root, "Promise");
    var Set2 = getNative(root, "Set");
    var WeakMap = getNative(root, "WeakMap");
    var nativeCreate = getNative(Object, "create");
    var dataViewCtorString = toSource(DataView);
    var mapCtorString = toSource(Map2);
    var promiseCtorString = toSource(Promise2);
    var setCtorString = toSource(Set2);
    var weakMapCtorString = toSource(WeakMap);
    var symbolProto = Symbol2 ? Symbol2.prototype : void 0;
    var symbolValueOf = symbolProto ? symbolProto.valueOf : void 0;
    function Hash(entries) {
      var index = -1, length = entries == null ? 0 : entries.length;
      this.clear();
      while (++index < length) {
        var entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }
    function hashClear() {
      this.__data__ = nativeCreate ? nativeCreate(null) : {};
      this.size = 0;
    }
    function hashDelete(key) {
      var result = this.has(key) && delete this.__data__[key];
      this.size -= result ? 1 : 0;
      return result;
    }
    function hashGet(key) {
      var data = this.__data__;
      if (nativeCreate) {
        var result = data[key];
        return result === HASH_UNDEFINED ? void 0 : result;
      }
      return hasOwnProperty.call(data, key) ? data[key] : void 0;
    }
    function hashHas(key) {
      var data = this.__data__;
      return nativeCreate ? data[key] !== void 0 : hasOwnProperty.call(data, key);
    }
    function hashSet(key, value) {
      var data = this.__data__;
      this.size += this.has(key) ? 0 : 1;
      data[key] = nativeCreate && value === void 0 ? HASH_UNDEFINED : value;
      return this;
    }
    Hash.prototype.clear = hashClear;
    Hash.prototype["delete"] = hashDelete;
    Hash.prototype.get = hashGet;
    Hash.prototype.has = hashHas;
    Hash.prototype.set = hashSet;
    function ListCache(entries) {
      var index = -1, length = entries == null ? 0 : entries.length;
      this.clear();
      while (++index < length) {
        var entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }
    function listCacheClear() {
      this.__data__ = [];
      this.size = 0;
    }
    function listCacheDelete(key) {
      var data = this.__data__, index = assocIndexOf(data, key);
      if (index < 0) {
        return false;
      }
      var lastIndex = data.length - 1;
      if (index == lastIndex) {
        data.pop();
      } else {
        splice.call(data, index, 1);
      }
      --this.size;
      return true;
    }
    function listCacheGet(key) {
      var data = this.__data__, index = assocIndexOf(data, key);
      return index < 0 ? void 0 : data[index][1];
    }
    function listCacheHas(key) {
      return assocIndexOf(this.__data__, key) > -1;
    }
    function listCacheSet(key, value) {
      var data = this.__data__, index = assocIndexOf(data, key);
      if (index < 0) {
        ++this.size;
        data.push([key, value]);
      } else {
        data[index][1] = value;
      }
      return this;
    }
    ListCache.prototype.clear = listCacheClear;
    ListCache.prototype["delete"] = listCacheDelete;
    ListCache.prototype.get = listCacheGet;
    ListCache.prototype.has = listCacheHas;
    ListCache.prototype.set = listCacheSet;
    function MapCache(entries) {
      var index = -1, length = entries == null ? 0 : entries.length;
      this.clear();
      while (++index < length) {
        var entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }
    function mapCacheClear() {
      this.size = 0;
      this.__data__ = {
        "hash": new Hash(),
        "map": new (Map2 || ListCache)(),
        "string": new Hash()
      };
    }
    function mapCacheDelete(key) {
      var result = getMapData(this, key)["delete"](key);
      this.size -= result ? 1 : 0;
      return result;
    }
    function mapCacheGet(key) {
      return getMapData(this, key).get(key);
    }
    function mapCacheHas(key) {
      return getMapData(this, key).has(key);
    }
    function mapCacheSet(key, value) {
      var data = getMapData(this, key), size = data.size;
      data.set(key, value);
      this.size += data.size == size ? 0 : 1;
      return this;
    }
    MapCache.prototype.clear = mapCacheClear;
    MapCache.prototype["delete"] = mapCacheDelete;
    MapCache.prototype.get = mapCacheGet;
    MapCache.prototype.has = mapCacheHas;
    MapCache.prototype.set = mapCacheSet;
    function SetCache(values) {
      var index = -1, length = values == null ? 0 : values.length;
      this.__data__ = new MapCache();
      while (++index < length) {
        this.add(values[index]);
      }
    }
    function setCacheAdd(value) {
      this.__data__.set(value, HASH_UNDEFINED);
      return this;
    }
    function setCacheHas(value) {
      return this.__data__.has(value);
    }
    SetCache.prototype.add = SetCache.prototype.push = setCacheAdd;
    SetCache.prototype.has = setCacheHas;
    function Stack(entries) {
      var data = this.__data__ = new ListCache(entries);
      this.size = data.size;
    }
    function stackClear() {
      this.__data__ = new ListCache();
      this.size = 0;
    }
    function stackDelete(key) {
      var data = this.__data__, result = data["delete"](key);
      this.size = data.size;
      return result;
    }
    function stackGet(key) {
      return this.__data__.get(key);
    }
    function stackHas(key) {
      return this.__data__.has(key);
    }
    function stackSet(key, value) {
      var data = this.__data__;
      if (data instanceof ListCache) {
        var pairs = data.__data__;
        if (!Map2 || pairs.length < LARGE_ARRAY_SIZE - 1) {
          pairs.push([key, value]);
          this.size = ++data.size;
          return this;
        }
        data = this.__data__ = new MapCache(pairs);
      }
      data.set(key, value);
      this.size = data.size;
      return this;
    }
    Stack.prototype.clear = stackClear;
    Stack.prototype["delete"] = stackDelete;
    Stack.prototype.get = stackGet;
    Stack.prototype.has = stackHas;
    Stack.prototype.set = stackSet;
    function arrayLikeKeys(value, inherited) {
      var isArr = isArray(value), isArg = !isArr && isArguments(value), isBuff = !isArr && !isArg && isBuffer(value), isType = !isArr && !isArg && !isBuff && isTypedArray(value), skipIndexes = isArr || isArg || isBuff || isType, result = skipIndexes ? baseTimes(value.length, String) : [], length = result.length;
      for (var key in value) {
        if ((inherited || hasOwnProperty.call(value, key)) && !(skipIndexes && // Safari 9 has enumerable `arguments.length` in strict mode.
        (key == "length" || // Node.js 0.10 has enumerable non-index properties on buffers.
        isBuff && (key == "offset" || key == "parent") || // PhantomJS 2 has enumerable non-index properties on typed arrays.
        isType && (key == "buffer" || key == "byteLength" || key == "byteOffset") || // Skip index properties.
        isIndex(key, length)))) {
          result.push(key);
        }
      }
      return result;
    }
    function assocIndexOf(array, key) {
      var length = array.length;
      while (length--) {
        if (eq(array[length][0], key)) {
          return length;
        }
      }
      return -1;
    }
    function baseGetAllKeys(object, keysFunc, symbolsFunc) {
      var result = keysFunc(object);
      return isArray(object) ? result : arrayPush(result, symbolsFunc(object));
    }
    function baseGetTag(value) {
      if (value == null) {
        return value === void 0 ? undefinedTag : nullTag;
      }
      return symToStringTag && symToStringTag in Object(value) ? getRawTag(value) : objectToString(value);
    }
    function baseIsArguments(value) {
      return isObjectLike(value) && baseGetTag(value) == argsTag;
    }
    function baseIsEqual(value, other, bitmask, customizer, stack) {
      if (value === other) {
        return true;
      }
      if (value == null || other == null || !isObjectLike(value) && !isObjectLike(other)) {
        return value !== value && other !== other;
      }
      return baseIsEqualDeep(value, other, bitmask, customizer, baseIsEqual, stack);
    }
    function baseIsEqualDeep(object, other, bitmask, customizer, equalFunc, stack) {
      var objIsArr = isArray(object), othIsArr = isArray(other), objTag = objIsArr ? arrayTag : getTag(object), othTag = othIsArr ? arrayTag : getTag(other);
      objTag = objTag == argsTag ? objectTag : objTag;
      othTag = othTag == argsTag ? objectTag : othTag;
      var objIsObj = objTag == objectTag, othIsObj = othTag == objectTag, isSameTag = objTag == othTag;
      if (isSameTag && isBuffer(object)) {
        if (!isBuffer(other)) {
          return false;
        }
        objIsArr = true;
        objIsObj = false;
      }
      if (isSameTag && !objIsObj) {
        stack || (stack = new Stack());
        return objIsArr || isTypedArray(object) ? equalArrays(object, other, bitmask, customizer, equalFunc, stack) : equalByTag(object, other, objTag, bitmask, customizer, equalFunc, stack);
      }
      if (!(bitmask & COMPARE_PARTIAL_FLAG)) {
        var objIsWrapped = objIsObj && hasOwnProperty.call(object, "__wrapped__"), othIsWrapped = othIsObj && hasOwnProperty.call(other, "__wrapped__");
        if (objIsWrapped || othIsWrapped) {
          var objUnwrapped = objIsWrapped ? object.value() : object, othUnwrapped = othIsWrapped ? other.value() : other;
          stack || (stack = new Stack());
          return equalFunc(objUnwrapped, othUnwrapped, bitmask, customizer, stack);
        }
      }
      if (!isSameTag) {
        return false;
      }
      stack || (stack = new Stack());
      return equalObjects(object, other, bitmask, customizer, equalFunc, stack);
    }
    function baseIsNative(value) {
      if (!isObject(value) || isMasked(value)) {
        return false;
      }
      var pattern = isFunction(value) ? reIsNative : reIsHostCtor;
      return pattern.test(toSource(value));
    }
    function baseIsTypedArray(value) {
      return isObjectLike(value) && isLength(value.length) && !!typedArrayTags[baseGetTag(value)];
    }
    function baseKeys(object) {
      if (!isPrototype(object)) {
        return nativeKeys(object);
      }
      var result = [];
      for (var key in Object(object)) {
        if (hasOwnProperty.call(object, key) && key != "constructor") {
          result.push(key);
        }
      }
      return result;
    }
    function equalArrays(array, other, bitmask, customizer, equalFunc, stack) {
      var isPartial = bitmask & COMPARE_PARTIAL_FLAG, arrLength = array.length, othLength = other.length;
      if (arrLength != othLength && !(isPartial && othLength > arrLength)) {
        return false;
      }
      var stacked = stack.get(array);
      if (stacked && stack.get(other)) {
        return stacked == other;
      }
      var index = -1, result = true, seen = bitmask & COMPARE_UNORDERED_FLAG ? new SetCache() : void 0;
      stack.set(array, other);
      stack.set(other, array);
      while (++index < arrLength) {
        var arrValue = array[index], othValue = other[index];
        if (customizer) {
          var compared = isPartial ? customizer(othValue, arrValue, index, other, array, stack) : customizer(arrValue, othValue, index, array, other, stack);
        }
        if (compared !== void 0) {
          if (compared) {
            continue;
          }
          result = false;
          break;
        }
        if (seen) {
          if (!arraySome(other, function(othValue2, othIndex) {
            if (!cacheHas(seen, othIndex) && (arrValue === othValue2 || equalFunc(arrValue, othValue2, bitmask, customizer, stack))) {
              return seen.push(othIndex);
            }
          })) {
            result = false;
            break;
          }
        } else if (!(arrValue === othValue || equalFunc(arrValue, othValue, bitmask, customizer, stack))) {
          result = false;
          break;
        }
      }
      stack["delete"](array);
      stack["delete"](other);
      return result;
    }
    function equalByTag(object, other, tag, bitmask, customizer, equalFunc, stack) {
      switch (tag) {
        case dataViewTag:
          if (object.byteLength != other.byteLength || object.byteOffset != other.byteOffset) {
            return false;
          }
          object = object.buffer;
          other = other.buffer;
        case arrayBufferTag:
          if (object.byteLength != other.byteLength || !equalFunc(new Uint8Array2(object), new Uint8Array2(other))) {
            return false;
          }
          return true;
        case boolTag:
        case dateTag:
        case numberTag:
          return eq(+object, +other);
        case errorTag:
          return object.name == other.name && object.message == other.message;
        case regexpTag:
        case stringTag:
          return object == other + "";
        case mapTag:
          var convert = mapToArray;
        case setTag:
          var isPartial = bitmask & COMPARE_PARTIAL_FLAG;
          convert || (convert = setToArray);
          if (object.size != other.size && !isPartial) {
            return false;
          }
          var stacked = stack.get(object);
          if (stacked) {
            return stacked == other;
          }
          bitmask |= COMPARE_UNORDERED_FLAG;
          stack.set(object, other);
          var result = equalArrays(convert(object), convert(other), bitmask, customizer, equalFunc, stack);
          stack["delete"](object);
          return result;
        case symbolTag:
          if (symbolValueOf) {
            return symbolValueOf.call(object) == symbolValueOf.call(other);
          }
      }
      return false;
    }
    function equalObjects(object, other, bitmask, customizer, equalFunc, stack) {
      var isPartial = bitmask & COMPARE_PARTIAL_FLAG, objProps = getAllKeys(object), objLength = objProps.length, othProps = getAllKeys(other), othLength = othProps.length;
      if (objLength != othLength && !isPartial) {
        return false;
      }
      var index = objLength;
      while (index--) {
        var key = objProps[index];
        if (!(isPartial ? key in other : hasOwnProperty.call(other, key))) {
          return false;
        }
      }
      var stacked = stack.get(object);
      if (stacked && stack.get(other)) {
        return stacked == other;
      }
      var result = true;
      stack.set(object, other);
      stack.set(other, object);
      var skipCtor = isPartial;
      while (++index < objLength) {
        key = objProps[index];
        var objValue = object[key], othValue = other[key];
        if (customizer) {
          var compared = isPartial ? customizer(othValue, objValue, key, other, object, stack) : customizer(objValue, othValue, key, object, other, stack);
        }
        if (!(compared === void 0 ? objValue === othValue || equalFunc(objValue, othValue, bitmask, customizer, stack) : compared)) {
          result = false;
          break;
        }
        skipCtor || (skipCtor = key == "constructor");
      }
      if (result && !skipCtor) {
        var objCtor = object.constructor, othCtor = other.constructor;
        if (objCtor != othCtor && ("constructor" in object && "constructor" in other) && !(typeof objCtor == "function" && objCtor instanceof objCtor && typeof othCtor == "function" && othCtor instanceof othCtor)) {
          result = false;
        }
      }
      stack["delete"](object);
      stack["delete"](other);
      return result;
    }
    function getAllKeys(object) {
      return baseGetAllKeys(object, keys, getSymbols);
    }
    function getMapData(map, key) {
      var data = map.__data__;
      return isKeyable(key) ? data[typeof key == "string" ? "string" : "hash"] : data.map;
    }
    function getNative(object, key) {
      var value = getValue(object, key);
      return baseIsNative(value) ? value : void 0;
    }
    function getRawTag(value) {
      var isOwn = hasOwnProperty.call(value, symToStringTag), tag = value[symToStringTag];
      try {
        value[symToStringTag] = void 0;
        var unmasked = true;
      } catch (e) {
      }
      var result = nativeObjectToString.call(value);
      if (unmasked) {
        if (isOwn) {
          value[symToStringTag] = tag;
        } else {
          delete value[symToStringTag];
        }
      }
      return result;
    }
    var getSymbols = !nativeGetSymbols ? stubArray : function(object) {
      if (object == null) {
        return [];
      }
      object = Object(object);
      return arrayFilter(nativeGetSymbols(object), function(symbol) {
        return propertyIsEnumerable.call(object, symbol);
      });
    };
    var getTag = baseGetTag;
    if (DataView && getTag(new DataView(new ArrayBuffer(1))) != dataViewTag || Map2 && getTag(new Map2()) != mapTag || Promise2 && getTag(Promise2.resolve()) != promiseTag || Set2 && getTag(new Set2()) != setTag || WeakMap && getTag(new WeakMap()) != weakMapTag) {
      getTag = function(value) {
        var result = baseGetTag(value), Ctor = result == objectTag ? value.constructor : void 0, ctorString = Ctor ? toSource(Ctor) : "";
        if (ctorString) {
          switch (ctorString) {
            case dataViewCtorString:
              return dataViewTag;
            case mapCtorString:
              return mapTag;
            case promiseCtorString:
              return promiseTag;
            case setCtorString:
              return setTag;
            case weakMapCtorString:
              return weakMapTag;
          }
        }
        return result;
      };
    }
    function isIndex(value, length) {
      length = length == null ? MAX_SAFE_INTEGER : length;
      return !!length && (typeof value == "number" || reIsUint.test(value)) && (value > -1 && value % 1 == 0 && value < length);
    }
    function isKeyable(value) {
      var type = typeof value;
      return type == "string" || type == "number" || type == "symbol" || type == "boolean" ? value !== "__proto__" : value === null;
    }
    function isMasked(func) {
      return !!maskSrcKey && maskSrcKey in func;
    }
    function isPrototype(value) {
      var Ctor = value && value.constructor, proto = typeof Ctor == "function" && Ctor.prototype || objectProto;
      return value === proto;
    }
    function objectToString(value) {
      return nativeObjectToString.call(value);
    }
    function toSource(func) {
      if (func != null) {
        try {
          return funcToString.call(func);
        } catch (e) {
        }
        try {
          return func + "";
        } catch (e) {
        }
      }
      return "";
    }
    function eq(value, other) {
      return value === other || value !== value && other !== other;
    }
    var isArguments = baseIsArguments(/* @__PURE__ */ (function() {
      return arguments;
    })()) ? baseIsArguments : function(value) {
      return isObjectLike(value) && hasOwnProperty.call(value, "callee") && !propertyIsEnumerable.call(value, "callee");
    };
    var isArray = Array.isArray;
    function isArrayLike(value) {
      return value != null && isLength(value.length) && !isFunction(value);
    }
    var isBuffer = nativeIsBuffer || stubFalse;
    function isEqual(value, other) {
      return baseIsEqual(value, other);
    }
    function isFunction(value) {
      if (!isObject(value)) {
        return false;
      }
      var tag = baseGetTag(value);
      return tag == funcTag || tag == genTag || tag == asyncTag || tag == proxyTag;
    }
    function isLength(value) {
      return typeof value == "number" && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
    }
    function isObject(value) {
      var type = typeof value;
      return value != null && (type == "object" || type == "function");
    }
    function isObjectLike(value) {
      return value != null && typeof value == "object";
    }
    var isTypedArray = nodeIsTypedArray ? baseUnary(nodeIsTypedArray) : baseIsTypedArray;
    function keys(object) {
      return isArrayLike(object) ? arrayLikeKeys(object) : baseKeys(object);
    }
    function stubArray() {
      return [];
    }
    function stubFalse() {
      return false;
    }
    module2.exports = isEqual;
  }
});

// node_modules/electron-updater/out/DownloadedUpdateHelper.js
var require_DownloadedUpdateHelper = __commonJS({
  "node_modules/electron-updater/out/DownloadedUpdateHelper.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.DownloadedUpdateHelper = void 0;
    exports2.createTempUpdateFile = createTempUpdateFile;
    var crypto_1 = require("crypto");
    var fs_1 = require("fs");
    var isEqual = require_lodash();
    var fs_extra_1 = require_lib();
    var path3 = require("path");
    var DownloadedUpdateHelper = class {
      constructor(cacheDir) {
        this.cacheDir = cacheDir;
        this._file = null;
        this._packageFile = null;
        this.versionInfo = null;
        this.fileInfo = null;
        this._downloadedFileInfo = null;
      }
      get downloadedFileInfo() {
        return this._downloadedFileInfo;
      }
      get file() {
        return this._file;
      }
      get packageFile() {
        return this._packageFile;
      }
      get cacheDirForPendingUpdate() {
        return path3.join(this.cacheDir, "pending");
      }
      async validateDownloadedPath(updateFile, updateInfo, fileInfo, logger) {
        if (this.versionInfo != null && this.file === updateFile && this.fileInfo != null) {
          if (isEqual(this.versionInfo, updateInfo) && isEqual(this.fileInfo.info, fileInfo.info) && await (0, fs_extra_1.pathExists)(updateFile)) {
            return updateFile;
          } else {
            return null;
          }
        }
        const cachedUpdateFile = await this.getValidCachedUpdateFile(fileInfo, logger);
        if (cachedUpdateFile === null) {
          return null;
        }
        logger.info(`Update has already been downloaded to ${updateFile}).`);
        this._file = cachedUpdateFile;
        return cachedUpdateFile;
      }
      async setDownloadedFile(downloadedFile, packageFile, versionInfo, fileInfo, updateFileName, isSaveCache) {
        this._file = downloadedFile;
        this._packageFile = packageFile;
        this.versionInfo = versionInfo;
        this.fileInfo = fileInfo;
        this._downloadedFileInfo = {
          fileName: updateFileName,
          sha512: fileInfo.info.sha512,
          isAdminRightsRequired: fileInfo.info.isAdminRightsRequired === true
        };
        if (isSaveCache) {
          await (0, fs_extra_1.outputJson)(this.getUpdateInfoFile(), this._downloadedFileInfo);
        }
      }
      async clear() {
        this._file = null;
        this._packageFile = null;
        this.versionInfo = null;
        this.fileInfo = null;
        await this.cleanCacheDirForPendingUpdate();
      }
      async cleanCacheDirForPendingUpdate() {
        try {
          await (0, fs_extra_1.emptyDir)(this.cacheDirForPendingUpdate);
        } catch (_ignore) {
        }
      }
      /**
       * Returns "update-info.json" which is created in the update cache directory's "pending" subfolder after the first update is downloaded.  If the update file does not exist then the cache is cleared and recreated.  If the update file exists then its properties are validated.
       * @param fileInfo
       * @param logger
       */
      async getValidCachedUpdateFile(fileInfo, logger) {
        const updateInfoFilePath = this.getUpdateInfoFile();
        const doesUpdateInfoFileExist = await (0, fs_extra_1.pathExists)(updateInfoFilePath);
        if (!doesUpdateInfoFileExist) {
          return null;
        }
        let cachedInfo;
        try {
          cachedInfo = await (0, fs_extra_1.readJson)(updateInfoFilePath);
        } catch (error) {
          let message = `No cached update info available`;
          if (error.code !== "ENOENT") {
            await this.cleanCacheDirForPendingUpdate();
            message += ` (error on read: ${error.message})`;
          }
          logger.info(message);
          return null;
        }
        const cachedFileName = cachedInfo === null || cachedInfo === void 0 ? void 0 : cachedInfo.fileName;
        const isCachedInfoFileNameValid = typeof cachedFileName === "string" && cachedFileName.length > 0 && path3.basename(cachedFileName) === cachedFileName;
        if (!isCachedInfoFileNameValid) {
          logger.warn(`Cached update info is corrupted: invalid fileName, directory for cached update will be cleaned`);
          await this.cleanCacheDirForPendingUpdate();
          return null;
        }
        if (fileInfo.info.sha512 !== cachedInfo.sha512) {
          logger.info(`Cached update sha512 checksum doesn't match the latest available update. New update must be downloaded. Cached: ${cachedInfo.sha512}, expected: ${fileInfo.info.sha512}. Directory for cached update will be cleaned`);
          await this.cleanCacheDirForPendingUpdate();
          return null;
        }
        const updateFile = path3.join(this.cacheDirForPendingUpdate, cachedFileName);
        if (!await (0, fs_extra_1.pathExists)(updateFile)) {
          logger.info("Cached update file doesn't exist");
          return null;
        }
        const sha512 = await hashFile(updateFile);
        if (fileInfo.info.sha512 !== sha512) {
          logger.warn(`Sha512 checksum doesn't match the latest available update. New update must be downloaded. Cached: ${sha512}, expected: ${fileInfo.info.sha512}`);
          await this.cleanCacheDirForPendingUpdate();
          return null;
        }
        this._downloadedFileInfo = cachedInfo;
        return updateFile;
      }
      getUpdateInfoFile() {
        return path3.join(this.cacheDirForPendingUpdate, "update-info.json");
      }
    };
    exports2.DownloadedUpdateHelper = DownloadedUpdateHelper;
    function hashFile(file, algorithm = "sha512", encoding = "base64", options) {
      return new Promise((resolve6, reject) => {
        const hash = (0, crypto_1.createHash)(algorithm);
        hash.on("error", reject).setEncoding(encoding);
        (0, fs_1.createReadStream)(file, {
          ...options,
          highWaterMark: 1024 * 1024
          /* better to use more memory but hash faster */
        }).on("error", reject).on("end", () => {
          hash.end();
          resolve6(hash.read());
        }).pipe(hash, { end: false });
      });
    }
    async function createTempUpdateFile(name, cacheDir, log) {
      let nameCounter = 0;
      let result = path3.join(cacheDir, name);
      for (let i = 0; i < 3; i++) {
        try {
          await (0, fs_extra_1.unlink)(result);
          return result;
        } catch (e) {
          if (e.code === "ENOENT") {
            return result;
          }
          log.warn(`Error on remove temp update file: ${e}`);
          result = path3.join(cacheDir, `${nameCounter++}-${name}`);
        }
      }
      return result;
    }
  }
});

// node_modules/electron-updater/out/AppAdapter.js
var require_AppAdapter = __commonJS({
  "node_modules/electron-updater/out/AppAdapter.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.getAppCacheDir = getAppCacheDir;
    var path3 = require("path");
    var os_1 = require("os");
    function getAppCacheDir() {
      const homedir = (0, os_1.homedir)();
      let result;
      if (process.platform === "win32") {
        result = process.env["LOCALAPPDATA"] || path3.join(homedir, "AppData", "Local");
      } else if (process.platform === "darwin") {
        result = path3.join(homedir, "Library", "Caches");
      } else {
        result = process.env["XDG_CACHE_HOME"] || path3.join(homedir, ".cache");
      }
      return result;
    }
  }
});

// node_modules/electron-updater/out/ElectronAppAdapter.js
var require_ElectronAppAdapter = __commonJS({
  "node_modules/electron-updater/out/ElectronAppAdapter.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ElectronAppAdapter = void 0;
    var path3 = require("path");
    var AppAdapter_1 = require_AppAdapter();
    var ElectronAppAdapter = class {
      constructor(app2 = require("electron").app) {
        this.app = app2;
      }
      whenReady() {
        return this.app.whenReady();
      }
      get version() {
        return this.app.getVersion();
      }
      get name() {
        return this.app.getName();
      }
      get isPackaged() {
        return this.app.isPackaged === true;
      }
      get appUpdateConfigPath() {
        return this.isPackaged ? path3.join(process.resourcesPath, "app-update.yml") : path3.join(this.app.getAppPath(), "dev-app-update.yml");
      }
      get userDataPath() {
        return this.app.getPath("userData");
      }
      get baseCachePath() {
        return (0, AppAdapter_1.getAppCacheDir)();
      }
      quit() {
        this.app.quit();
      }
      relaunch() {
        this.app.relaunch();
      }
      onQuit(handler) {
        this.app.once("quit", (_, exitCode) => handler(exitCode));
      }
    };
    exports2.ElectronAppAdapter = ElectronAppAdapter;
  }
});

// node_modules/electron-updater/out/electronHttpExecutor.js
var require_electronHttpExecutor = __commonJS({
  "node_modules/electron-updater/out/electronHttpExecutor.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ElectronHttpExecutor = exports2.NET_SESSION_NAME = void 0;
    exports2.getNetSession = getNetSession;
    var builder_util_runtime_1 = require_out();
    exports2.NET_SESSION_NAME = "electron-updater";
    function getNetSession() {
      return require("electron").session.fromPartition(exports2.NET_SESSION_NAME, {
        cache: false
      });
    }
    var ElectronHttpExecutor = class extends builder_util_runtime_1.HttpExecutor {
      constructor(proxyLoginCallback) {
        super();
        this.proxyLoginCallback = proxyLoginCallback;
        this.cachedSession = null;
      }
      async download(url, destination, options) {
        return await options.cancellationToken.createPromise((resolve6, reject, onCancel) => {
          const requestOptions = {
            headers: options.headers || void 0,
            redirect: "manual"
          };
          (0, builder_util_runtime_1.configureRequestUrl)(url, requestOptions);
          (0, builder_util_runtime_1.configureRequestOptions)(requestOptions);
          this.doDownload(requestOptions, {
            destination,
            options,
            onCancel,
            callback: (error) => {
              if (error == null) {
                resolve6(destination);
              } else {
                reject(error);
              }
            },
            responseHandler: null
          }, 0);
        });
      }
      createRequest(options, callback) {
        if (options.headers && options.headers.Host) {
          options.host = options.headers.Host;
          delete options.headers.Host;
        }
        if (this.cachedSession == null) {
          this.cachedSession = getNetSession();
        }
        const request = require("electron").net.request({
          ...options,
          session: this.cachedSession
        });
        request.on("response", callback);
        if (this.proxyLoginCallback != null) {
          request.on("login", this.proxyLoginCallback);
        }
        return request;
      }
      addRedirectHandlers(request, options, reject, redirectCount, handler) {
        request.on("redirect", (statusCode, method, redirectUrl) => {
          request.abort();
          if (redirectCount > this.maxRedirects) {
            reject(this.createMaxRedirectError());
          } else {
            handler(builder_util_runtime_1.HttpExecutor.prepareRedirectUrlOptions(redirectUrl, options));
          }
        });
      }
    };
    exports2.ElectronHttpExecutor = ElectronHttpExecutor;
  }
});

// node_modules/electron-updater/out/util.js
var require_util = __commonJS({
  "node_modules/electron-updater/out/util.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.newBaseUrl = newBaseUrl;
    exports2.newUrlFromBase = newUrlFromBase;
    exports2.getChannelFilename = getChannelFilename;
    var url_1 = require("url");
    function newBaseUrl(url) {
      const result = new url_1.URL(url);
      if (!result.pathname.endsWith("/")) {
        result.pathname += "/";
      }
      return result;
    }
    function newUrlFromBase(pathname, baseUrl, addRandomQueryToAvoidCaching = false) {
      const result = new url_1.URL(pathname, baseUrl);
      const search = baseUrl.search;
      if (search != null && search.length !== 0) {
        result.search = search;
      } else if (addRandomQueryToAvoidCaching) {
        result.search = `noCache=${Date.now().toString(32)}`;
      }
      return result;
    }
    function getChannelFilename(channel) {
      return `${channel}.yml`;
    }
  }
});

// node_modules/lodash.escaperegexp/index.js
var require_lodash2 = __commonJS({
  "node_modules/lodash.escaperegexp/index.js"(exports2, module2) {
    var INFINITY = 1 / 0;
    var symbolTag = "[object Symbol]";
    var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;
    var reHasRegExpChar = RegExp(reRegExpChar.source);
    var freeGlobal = typeof global == "object" && global && global.Object === Object && global;
    var freeSelf = typeof self == "object" && self && self.Object === Object && self;
    var root = freeGlobal || freeSelf || Function("return this")();
    var objectProto = Object.prototype;
    var objectToString = objectProto.toString;
    var Symbol2 = root.Symbol;
    var symbolProto = Symbol2 ? Symbol2.prototype : void 0;
    var symbolToString = symbolProto ? symbolProto.toString : void 0;
    function baseToString(value) {
      if (typeof value == "string") {
        return value;
      }
      if (isSymbol(value)) {
        return symbolToString ? symbolToString.call(value) : "";
      }
      var result = value + "";
      return result == "0" && 1 / value == -INFINITY ? "-0" : result;
    }
    function isObjectLike(value) {
      return !!value && typeof value == "object";
    }
    function isSymbol(value) {
      return typeof value == "symbol" || isObjectLike(value) && objectToString.call(value) == symbolTag;
    }
    function toString(value) {
      return value == null ? "" : baseToString(value);
    }
    function escapeRegExp(string) {
      string = toString(string);
      return string && reHasRegExpChar.test(string) ? string.replace(reRegExpChar, "\\$&") : string;
    }
    module2.exports = escapeRegExp;
  }
});

// node_modules/electron-updater/out/providers/Provider.js
var require_Provider = __commonJS({
  "node_modules/electron-updater/out/providers/Provider.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Provider = void 0;
    exports2.findFile = findFile;
    exports2.parseUpdateInfo = parseUpdateInfo;
    exports2.getFileList = getFileList;
    exports2.resolveFiles = resolveFiles;
    var builder_util_runtime_1 = require_out();
    var js_yaml_1 = require_js_yaml();
    var url_1 = require("url");
    var util_1 = require_util();
    var escapeRegExp = require_lodash2();
    var Provider = class {
      constructor(runtimeOptions) {
        this.runtimeOptions = runtimeOptions;
        this.requestHeaders = null;
        this.executor = runtimeOptions.executor;
      }
      // By default, the blockmap file is in the same directory as the main file
      // But some providers may have a different blockmap file, so we need to override this method
      getBlockMapFiles(baseUrl, oldVersion, newVersion, oldBlockMapFileBaseUrl = null) {
        const newBlockMapUrl = (0, util_1.newUrlFromBase)(`${baseUrl.pathname}.blockmap`, baseUrl);
        const oldBlockMapUrl = (0, util_1.newUrlFromBase)(`${baseUrl.pathname.replace(new RegExp(escapeRegExp(newVersion), "g"), oldVersion)}.blockmap`, oldBlockMapFileBaseUrl ? new url_1.URL(oldBlockMapFileBaseUrl) : baseUrl);
        return [oldBlockMapUrl, newBlockMapUrl];
      }
      get isUseMultipleRangeRequest() {
        return this.runtimeOptions.isUseMultipleRangeRequest !== false;
      }
      getChannelFilePrefix() {
        if (this.runtimeOptions.platform === "linux") {
          const arch = process.env["TEST_UPDATER_ARCH"] || process.arch;
          const archSuffix = arch === "x64" ? "" : `-${arch}`;
          return "-linux" + archSuffix;
        } else {
          return this.runtimeOptions.platform === "darwin" ? "-mac" : "";
        }
      }
      // due to historical reasons for windows we use channel name without platform specifier
      getDefaultChannelName() {
        return this.getCustomChannelName("latest");
      }
      getCustomChannelName(channel) {
        return `${channel}${this.getChannelFilePrefix()}`;
      }
      get fileExtraDownloadHeaders() {
        return null;
      }
      setRequestHeaders(value) {
        this.requestHeaders = value;
      }
      /**
       * Method to perform API request only to resolve update info, but not to download update.
       */
      httpRequest(url, headers, cancellationToken) {
        return this.executor.request(this.createRequestOptions(url, headers), cancellationToken);
      }
      createRequestOptions(url, headers) {
        const result = {};
        if (this.requestHeaders == null) {
          if (headers != null) {
            result.headers = headers;
          }
        } else {
          result.headers = headers == null ? this.requestHeaders : { ...this.requestHeaders, ...headers };
        }
        (0, builder_util_runtime_1.configureRequestUrl)(url, result);
        return result;
      }
    };
    exports2.Provider = Provider;
    function findFile(files, extension, not) {
      var _a;
      if (files.length === 0) {
        throw (0, builder_util_runtime_1.newError)("No files provided", "ERR_UPDATER_NO_FILES_PROVIDED");
      }
      const filteredFiles = files.filter((it) => it.url.pathname.toLowerCase().endsWith(`.${extension.toLowerCase()}`));
      const result = (_a = filteredFiles.find((it) => [it.url.pathname, it.info.url].some((n) => n.includes(process.arch)))) !== null && _a !== void 0 ? _a : filteredFiles.shift();
      if (result) {
        return result;
      } else if (not == null) {
        return files[0];
      } else {
        return files.find((fileInfo) => !not.some((ext) => fileInfo.url.pathname.toLowerCase().endsWith(`.${ext.toLowerCase()}`)));
      }
    }
    function parseUpdateInfo(rawData, channelFile, channelFileUrl) {
      if (rawData == null) {
        throw (0, builder_util_runtime_1.newError)(`Cannot parse update info from ${channelFile} in the latest release artifacts (${channelFileUrl}): rawData: null`, "ERR_UPDATER_INVALID_UPDATE_INFO");
      }
      let result;
      try {
        result = (0, js_yaml_1.load)(rawData);
      } catch (e) {
        throw (0, builder_util_runtime_1.newError)(`Cannot parse update info from ${channelFile} in the latest release artifacts (${channelFileUrl}): ${e.stack || e.message}, rawData: ${rawData}`, "ERR_UPDATER_INVALID_UPDATE_INFO");
      }
      return result;
    }
    function getFileList(updateInfo) {
      const files = updateInfo.files;
      if (files != null && files.length > 0) {
        return files;
      }
      if (updateInfo.path != null) {
        return [
          {
            url: updateInfo.path,
            sha2: updateInfo.sha2,
            sha512: updateInfo.sha512
          }
        ];
      } else {
        throw (0, builder_util_runtime_1.newError)(`No files provided: ${(0, builder_util_runtime_1.safeStringifyJson)(updateInfo)}`, "ERR_UPDATER_NO_FILES_PROVIDED");
      }
    }
    function resolveFiles(updateInfo, baseUrl, pathTransformer = (p) => p) {
      const files = getFileList(updateInfo);
      const result = files.map((fileInfo) => {
        if (fileInfo.sha2 == null && fileInfo.sha512 == null) {
          throw (0, builder_util_runtime_1.newError)(`Update info doesn't contain nor sha256 neither sha512 checksum: ${(0, builder_util_runtime_1.safeStringifyJson)(fileInfo)}`, "ERR_UPDATER_NO_CHECKSUM");
        }
        return {
          url: (0, util_1.newUrlFromBase)(pathTransformer(fileInfo.url), baseUrl),
          info: fileInfo
        };
      });
      const packages = updateInfo.packages;
      const packageInfo = packages == null ? null : packages[process.arch] || packages.ia32;
      if (packageInfo != null) {
        ;
        result[0].packageInfo = {
          ...packageInfo,
          path: (0, util_1.newUrlFromBase)(pathTransformer(packageInfo.path), baseUrl).href
        };
      }
      return result;
    }
  }
});

// node_modules/electron-updater/out/providers/GenericProvider.js
var require_GenericProvider = __commonJS({
  "node_modules/electron-updater/out/providers/GenericProvider.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.GenericProvider = void 0;
    var builder_util_runtime_1 = require_out();
    var util_1 = require_util();
    var Provider_1 = require_Provider();
    var GenericProvider = class extends Provider_1.Provider {
      constructor(configuration, updater, runtimeOptions) {
        super(runtimeOptions);
        this.configuration = configuration;
        this.updater = updater;
        this.baseUrl = (0, util_1.newBaseUrl)(this.configuration.url);
      }
      get channel() {
        const result = this.updater.channel || this.configuration.channel;
        return result == null ? this.getDefaultChannelName() : this.getCustomChannelName(result);
      }
      async getLatestVersion() {
        const channelFile = (0, util_1.getChannelFilename)(this.channel);
        const channelUrl = (0, util_1.newUrlFromBase)(channelFile, this.baseUrl, this.updater.isAddNoCacheQuery);
        for (let attemptNumber = 0; ; attemptNumber++) {
          try {
            return (0, Provider_1.parseUpdateInfo)(await this.httpRequest(channelUrl), channelFile, channelUrl);
          } catch (e) {
            if (e instanceof builder_util_runtime_1.HttpError && e.statusCode === 404) {
              throw (0, builder_util_runtime_1.newError)(`Cannot find channel "${channelFile}" update info: ${e.stack || e.message}`, "ERR_UPDATER_CHANNEL_FILE_NOT_FOUND");
            } else if (e.code === "ECONNREFUSED") {
              if (attemptNumber < 3) {
                await new Promise((resolve6, reject) => {
                  try {
                    setTimeout(resolve6, 1e3 * attemptNumber);
                  } catch (e2) {
                    reject(e2);
                  }
                });
                continue;
              }
            }
            throw e;
          }
        }
      }
      resolveFiles(updateInfo) {
        return (0, Provider_1.resolveFiles)(updateInfo, this.baseUrl);
      }
    };
    exports2.GenericProvider = GenericProvider;
  }
});

// node_modules/electron-updater/out/providers/BitbucketProvider.js
var require_BitbucketProvider = __commonJS({
  "node_modules/electron-updater/out/providers/BitbucketProvider.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.BitbucketProvider = void 0;
    var builder_util_runtime_1 = require_out();
    var util_1 = require_util();
    var Provider_1 = require_Provider();
    var BitbucketProvider = class extends Provider_1.Provider {
      constructor(configuration, updater, runtimeOptions) {
        super({
          ...runtimeOptions,
          isUseMultipleRangeRequest: false
        });
        this.configuration = configuration;
        this.updater = updater;
        const { owner, slug } = configuration;
        this.baseUrl = (0, util_1.newBaseUrl)(`https://api.bitbucket.org/2.0/repositories/${owner}/${slug}/downloads`);
      }
      get channel() {
        return this.updater.channel || this.configuration.channel || "latest";
      }
      async getLatestVersion() {
        const cancellationToken = new builder_util_runtime_1.CancellationToken();
        const channelFile = (0, util_1.getChannelFilename)(this.getCustomChannelName(this.channel));
        const channelUrl = (0, util_1.newUrlFromBase)(channelFile, this.baseUrl, this.updater.isAddNoCacheQuery);
        try {
          const updateInfo = await this.httpRequest(channelUrl, void 0, cancellationToken);
          return (0, Provider_1.parseUpdateInfo)(updateInfo, channelFile, channelUrl);
        } catch (e) {
          throw (0, builder_util_runtime_1.newError)(`Unable to find latest version on ${this.toString()}, please ensure release exists: ${e.stack || e.message}`, "ERR_UPDATER_LATEST_VERSION_NOT_FOUND");
        }
      }
      resolveFiles(updateInfo) {
        return (0, Provider_1.resolveFiles)(updateInfo, this.baseUrl);
      }
      toString() {
        const { owner, slug } = this.configuration;
        return `Bitbucket (owner: ${owner}, slug: ${slug}, channel: ${this.channel})`;
      }
    };
    exports2.BitbucketProvider = BitbucketProvider;
  }
});

// node_modules/electron-updater/out/providers/GitHubProvider.js
var require_GitHubProvider = __commonJS({
  "node_modules/electron-updater/out/providers/GitHubProvider.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.GitHubProvider = exports2.BaseGitHubProvider = void 0;
    exports2.computeReleaseNotes = computeReleaseNotes;
    var builder_util_runtime_1 = require_out();
    var semver = require_semver2();
    var url_1 = require("url");
    var util_1 = require_util();
    var Provider_1 = require_Provider();
    var hrefRegExp = /\/tag\/(v?[^/]+)$/;
    var BaseGitHubProvider = class extends Provider_1.Provider {
      constructor(options, defaultHost, runtimeOptions) {
        super({
          ...runtimeOptions,
          /* because GitHib uses S3 */
          isUseMultipleRangeRequest: false
        });
        this.options = options;
        this.baseUrl = (0, util_1.newBaseUrl)((0, builder_util_runtime_1.githubUrl)(options, defaultHost));
        const apiHost = defaultHost === "github.com" ? "api.github.com" : defaultHost;
        this.baseApiUrl = (0, util_1.newBaseUrl)((0, builder_util_runtime_1.githubUrl)(options, apiHost));
      }
      computeGithubBasePath(result) {
        const host = this.options.host;
        return host && !["github.com", "api.github.com"].includes(host) ? `/api/v3${result}` : result;
      }
    };
    exports2.BaseGitHubProvider = BaseGitHubProvider;
    var GitHubProvider = class extends BaseGitHubProvider {
      constructor(options, updater, runtimeOptions) {
        super(options, "github.com", runtimeOptions);
        this.options = options;
        this.updater = updater;
      }
      get channel() {
        const result = this.updater.channel || this.options.channel;
        return result == null ? this.getDefaultChannelName() : this.getCustomChannelName(result);
      }
      async getLatestVersion() {
        var _a, _b, _c, _d, _e;
        const cancellationToken = new builder_util_runtime_1.CancellationToken();
        const feedXml = await this.httpRequest((0, util_1.newUrlFromBase)(`${this.basePath}.atom`, this.baseUrl), {
          accept: "application/xml, application/atom+xml, text/xml, */*"
        }, cancellationToken);
        const feed = (0, builder_util_runtime_1.parseXml)(feedXml);
        let latestRelease = feed.element("entry", false, `No published versions on GitHub`);
        let tag = null;
        try {
          if (this.updater.allowPrerelease) {
            const currentChannel = ((_a = this.updater) === null || _a === void 0 ? void 0 : _a.channel) || ((_b = semver.prerelease(this.updater.currentVersion)) === null || _b === void 0 ? void 0 : _b[0]) || null;
            if (currentChannel === null) {
              tag = hrefRegExp.exec(latestRelease.element("link").attribute("href"))[1];
            } else {
              for (const element of feed.getElements("entry")) {
                const hrefElement = hrefRegExp.exec(element.element("link").attribute("href"));
                if (hrefElement === null) {
                  continue;
                }
                const hrefTag = hrefElement[1];
                if (!semver.valid(hrefTag)) {
                  continue;
                }
                const hrefChannel = ((_c = semver.prerelease(hrefTag)) === null || _c === void 0 ? void 0 : _c[0]) || null;
                const shouldFetchVersion = !currentChannel || ["alpha", "beta"].includes(currentChannel);
                const isCustomChannel = hrefChannel !== null && !["alpha", "beta"].includes(String(hrefChannel));
                const channelMismatch = currentChannel === "beta" && hrefChannel === "alpha";
                if (shouldFetchVersion && !isCustomChannel && !channelMismatch) {
                  tag = hrefTag;
                  latestRelease = element;
                  break;
                }
                const isNextPreRelease = hrefChannel && hrefChannel === currentChannel;
                if (isNextPreRelease) {
                  tag = hrefTag;
                  latestRelease = element;
                  break;
                }
              }
            }
          } else {
            tag = await this.getLatestTagName(cancellationToken);
            for (const element of feed.getElements("entry")) {
              const hrefMatch = hrefRegExp.exec(element.element("link").attribute("href"));
              if (hrefMatch == null) {
                continue;
              }
              if (hrefMatch[1] === tag) {
                latestRelease = element;
                break;
              }
            }
          }
        } catch (e) {
          throw (0, builder_util_runtime_1.newError)(`Cannot parse releases feed: ${e.stack || e.message},
XML:
${feedXml}`, "ERR_UPDATER_INVALID_RELEASE_FEED");
        }
        if (tag == null) {
          throw (0, builder_util_runtime_1.newError)(`No published versions on GitHub`, "ERR_UPDATER_NO_PUBLISHED_VERSIONS");
        }
        let rawData;
        let channelFile = "";
        let channelFileUrl = "";
        const fetchData = async (channelName) => {
          channelFile = (0, util_1.getChannelFilename)(channelName);
          channelFileUrl = (0, util_1.newUrlFromBase)(this.getBaseDownloadPath(String(tag), channelFile), this.baseUrl);
          const requestOptions = this.createRequestOptions(channelFileUrl);
          try {
            return await this.executor.request(requestOptions, cancellationToken);
          } catch (e) {
            if (e instanceof builder_util_runtime_1.HttpError && e.statusCode === 404) {
              throw (0, builder_util_runtime_1.newError)(`Cannot find ${channelFile} in the latest release artifacts (${channelFileUrl}): ${e.stack || e.message}`, "ERR_UPDATER_CHANNEL_FILE_NOT_FOUND");
            }
            throw e;
          }
        };
        try {
          let channel = this.channel;
          if (this.updater.allowPrerelease && ((_d = semver.prerelease(tag)) === null || _d === void 0 ? void 0 : _d[0])) {
            channel = this.getCustomChannelName(String((_e = semver.prerelease(tag)) === null || _e === void 0 ? void 0 : _e[0]));
          }
          rawData = await fetchData(channel);
        } catch (e) {
          if (this.updater.allowPrerelease) {
            rawData = await fetchData(this.getDefaultChannelName());
          } else {
            throw e;
          }
        }
        const result = (0, Provider_1.parseUpdateInfo)(rawData, channelFile, channelFileUrl);
        if (result.releaseName == null) {
          result.releaseName = latestRelease.elementValueOrEmpty("title");
        }
        if (result.releaseNotes == null) {
          result.releaseNotes = computeReleaseNotes(this.updater.currentVersion, this.updater.fullChangelog, feed, latestRelease);
        }
        return {
          tag,
          ...result
        };
      }
      async getLatestTagName(cancellationToken) {
        const options = this.options;
        const url = options.host == null || options.host === "github.com" ? (0, util_1.newUrlFromBase)(`${this.basePath}/latest`, this.baseUrl) : new url_1.URL(`${this.computeGithubBasePath(`/repos/${options.owner}/${options.repo}/releases`)}/latest`, this.baseApiUrl);
        try {
          const rawData = await this.httpRequest(url, { Accept: "application/json" }, cancellationToken);
          if (rawData == null) {
            return null;
          }
          const releaseInfo = JSON.parse(rawData);
          return releaseInfo.tag_name;
        } catch (e) {
          throw (0, builder_util_runtime_1.newError)(`Unable to find latest version on GitHub (${url}), please ensure a production release exists: ${e.stack || e.message}`, "ERR_UPDATER_LATEST_VERSION_NOT_FOUND");
        }
      }
      get basePath() {
        return `/${this.options.owner}/${this.options.repo}/releases`;
      }
      resolveFiles(updateInfo) {
        return (0, Provider_1.resolveFiles)(updateInfo, this.baseUrl, (p) => this.getBaseDownloadPath(updateInfo.tag, p.replace(/ /g, "-")));
      }
      getBaseDownloadPath(tag, fileName) {
        return `${this.basePath}/download/${tag}/${fileName}`;
      }
    };
    exports2.GitHubProvider = GitHubProvider;
    function getNoteValue(parent) {
      const result = parent.elementValueOrEmpty("content");
      return result === "No content." ? "" : result;
    }
    function computeReleaseNotes(currentVersion, isFullChangelog, feed, latestRelease) {
      if (!isFullChangelog) {
        return getNoteValue(latestRelease);
      }
      const releaseVersionRegExp = /\/tag\/v?([^/]+)$/;
      let latestVersion = void 0;
      try {
        latestVersion = releaseVersionRegExp.exec(latestRelease.element("link").attribute("href"))[1];
        latestVersion = semver.valid(latestVersion) ? latestVersion : void 0;
      } catch {
      }
      if (latestVersion == null) {
        return null;
      }
      const releaseNotes = [];
      for (const release of feed.getElements("entry")) {
        let versionRelease;
        try {
          const match = releaseVersionRegExp.exec(release.element("link").attribute("href"));
          if (!match) {
            continue;
          }
          versionRelease = match[1];
        } catch {
          continue;
        }
        if (!semver.valid(versionRelease)) {
          continue;
        }
        const isGreaterThanCurrent = semver.gt(versionRelease, currentVersion.raw);
        const isLessOrEqualThanLatest = semver.lte(versionRelease, latestVersion);
        if (isGreaterThanCurrent && isLessOrEqualThanLatest) {
          releaseNotes.push({
            version: versionRelease,
            note: getNoteValue(release)
          });
        }
      }
      return releaseNotes.sort((a, b) => semver.rcompare(a.version, b.version));
    }
  }
});

// node_modules/electron-updater/out/providers/GitLabProvider.js
var require_GitLabProvider = __commonJS({
  "node_modules/electron-updater/out/providers/GitLabProvider.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.GitLabProvider = void 0;
    var builder_util_runtime_1 = require_out();
    var url_1 = require("url");
    var escapeRegExp = require_lodash2();
    var util_1 = require_util();
    var Provider_1 = require_Provider();
    var GitLabProvider = class extends Provider_1.Provider {
      /**
       * Normalizes filenames by replacing spaces and underscores with dashes.
       *
       * This is a workaround to handle filename formatting differences between tools:
       * - electron-builder formats filenames like "test file.txt" as "test-file.txt"
       * - GitLab may provide asset URLs using underscores, such as "test_file.txt"
       *
       * Because of this mismatch, we can't reliably extract the correct filename from
       * the asset path without normalization. This function ensures consistent matching
       * across different filename formats by converting all spaces and underscores to dashes.
       *
       * @param filename The filename to normalize
       * @returns The normalized filename with spaces and underscores replaced by dashes
       */
      normalizeFilename(filename) {
        return filename.replace(/ |_/g, "-");
      }
      constructor(options, updater, runtimeOptions) {
        super({
          ...runtimeOptions,
          // GitLab might not support multiple range requests efficiently
          isUseMultipleRangeRequest: false
        });
        this.options = options;
        this.updater = updater;
        this.cachedLatestVersion = null;
        const defaultHost = "gitlab.com";
        const host = options.host || defaultHost;
        this.baseApiUrl = (0, util_1.newBaseUrl)(`https://${host}/api/v4`);
      }
      createRequestOptions(url, headers) {
        const result = super.createRequestOptions(url, headers);
        result.redirect = "manual";
        return result;
      }
      get channel() {
        const result = this.updater.channel || this.options.channel;
        return result == null ? this.getDefaultChannelName() : this.getCustomChannelName(result);
      }
      async getLatestVersion() {
        const cancellationToken = new builder_util_runtime_1.CancellationToken();
        const latestReleaseUrl = (0, util_1.newUrlFromBase)(`projects/${this.options.projectId}/releases/permalink/latest`, this.baseApiUrl);
        const header = { Accept: "application/json", ...this.setAuthHeaderForToken(this.options.token || null) };
        let releaseResponse;
        try {
          releaseResponse = await this.httpRequest(latestReleaseUrl, header, cancellationToken);
        } catch (e) {
          throw (0, builder_util_runtime_1.newError)(`Unable to find latest release on GitLab (${latestReleaseUrl}): ${e.stack || e.message}`, "ERR_UPDATER_LATEST_VERSION_NOT_FOUND");
        }
        if (!releaseResponse) {
          throw (0, builder_util_runtime_1.newError)("No published releases on GitLab", "ERR_UPDATER_NO_PUBLISHED_VERSIONS");
        }
        let latestRelease;
        try {
          latestRelease = JSON.parse(releaseResponse);
        } catch (e) {
          throw (0, builder_util_runtime_1.newError)(`Unable to parse latest release response from GitLab (${latestReleaseUrl}): response was not valid JSON: ${e.stack || e.message}`, "ERR_UPDATER_LATEST_VERSION_NOT_FOUND");
        }
        if (latestRelease.upcoming_release) {
          throw (0, builder_util_runtime_1.newError)("Latest GitLab release is scheduled but not yet published", "ERR_UPDATER_LATEST_VERSION_NOT_FOUND");
        }
        const tag = latestRelease.tag_name;
        let rawData = null;
        let channelFile = "";
        let channelFileUrl = null;
        const fetchChannelData = async (channelName) => {
          channelFile = (0, util_1.getChannelFilename)(channelName);
          const channelAsset = latestRelease.assets.links.find((asset) => asset.name === channelFile);
          if (!channelAsset) {
            throw (0, builder_util_runtime_1.newError)(`Cannot find ${channelFile} in the latest release assets`, "ERR_UPDATER_CHANNEL_FILE_NOT_FOUND");
          }
          channelFileUrl = new url_1.URL(channelAsset.direct_asset_url);
          const authHeaders = this.setAuthHeaderForToken(this.options.token || null);
          const headers = Object.keys(authHeaders).length ? authHeaders : void 0;
          try {
            const result2 = await this.httpRequest(channelFileUrl, headers, cancellationToken);
            if (!result2) {
              throw (0, builder_util_runtime_1.newError)(`Empty response from ${channelFileUrl}`, "ERR_UPDATER_CHANNEL_FILE_NOT_FOUND");
            }
            return result2;
          } catch (e) {
            if (e instanceof builder_util_runtime_1.HttpError && e.statusCode === 404) {
              throw (0, builder_util_runtime_1.newError)(`Cannot find ${channelFile} in the latest release artifacts (${channelFileUrl}): ${e.stack || e.message}`, "ERR_UPDATER_CHANNEL_FILE_NOT_FOUND");
            }
            throw e;
          }
        };
        try {
          rawData = await fetchChannelData(this.channel);
        } catch (e) {
          if (this.channel !== this.getDefaultChannelName()) {
            rawData = await fetchChannelData(this.getDefaultChannelName());
          } else {
            throw e;
          }
        }
        if (!rawData) {
          throw (0, builder_util_runtime_1.newError)(`Unable to parse channel data from ${channelFile}`, "ERR_UPDATER_INVALID_UPDATE_INFO");
        }
        const result = (0, Provider_1.parseUpdateInfo)(rawData, channelFile, channelFileUrl);
        if (result.releaseName == null) {
          result.releaseName = latestRelease.name;
        }
        if (result.releaseNotes == null) {
          result.releaseNotes = latestRelease.description || null;
        }
        const gitlabUpdateInfo = {
          tag,
          assets: this.convertAssetsToMap(latestRelease.assets),
          ...result
        };
        this.cachedLatestVersion = gitlabUpdateInfo;
        return gitlabUpdateInfo;
      }
      /**
       * Utility function to convert GitlabReleaseAsset to Map<string, string>
       * Maps asset names to their download URLs
       */
      convertAssetsToMap(assets) {
        const assetsMap = /* @__PURE__ */ new Map();
        for (const asset of assets.links) {
          assetsMap.set(this.normalizeFilename(asset.name), asset.direct_asset_url);
        }
        return assetsMap;
      }
      /**
       * Find blockmap file URL in assets map for a specific filename
       */
      findBlockMapInAssets(assets, filename) {
        const possibleBlockMapNames = [`${filename}.blockmap`, `${this.normalizeFilename(filename)}.blockmap`];
        for (const blockMapName of possibleBlockMapNames) {
          const assetUrl = assets.get(blockMapName);
          if (assetUrl) {
            return new url_1.URL(assetUrl);
          }
        }
        return null;
      }
      async fetchReleaseInfoByVersion(version) {
        const cancellationToken = new builder_util_runtime_1.CancellationToken();
        const possibleReleaseIds = [`v${version}`, version];
        for (const releaseId of possibleReleaseIds) {
          const releaseUrl = (0, util_1.newUrlFromBase)(`projects/${this.options.projectId}/releases/${encodeURIComponent(releaseId)}`, this.baseApiUrl);
          try {
            const header = { Accept: "application/json", ...this.setAuthHeaderForToken(this.options.token || null) };
            const releaseResponse = await this.httpRequest(releaseUrl, header, cancellationToken);
            if (releaseResponse) {
              const release = JSON.parse(releaseResponse);
              return release;
            }
          } catch (e) {
            if (e instanceof builder_util_runtime_1.HttpError && e.statusCode === 404) {
              continue;
            }
            throw (0, builder_util_runtime_1.newError)(`Unable to find release ${releaseId} on GitLab (${releaseUrl}): ${e.stack || e.message}`, "ERR_UPDATER_RELEASE_NOT_FOUND");
          }
        }
        throw (0, builder_util_runtime_1.newError)(`Unable to find release with version ${version} (tried: ${possibleReleaseIds.join(", ")}) on GitLab`, "ERR_UPDATER_RELEASE_NOT_FOUND");
      }
      setAuthHeaderForToken(token) {
        const headers = {};
        if (token != null) {
          if (token.startsWith("Bearer")) {
            headers.authorization = token;
          } else {
            headers["PRIVATE-TOKEN"] = token;
          }
        }
        return headers;
      }
      /**
       * Get version info for blockmap files, using cache when possible
       */
      async getVersionInfoForBlockMap(version) {
        if (this.cachedLatestVersion && this.cachedLatestVersion.version === version) {
          return this.cachedLatestVersion.assets;
        }
        const versionInfo = await this.fetchReleaseInfoByVersion(version);
        if (versionInfo && versionInfo.assets) {
          return this.convertAssetsToMap(versionInfo.assets);
        }
        return null;
      }
      /**
       * Find blockmap URLs from version assets
       */
      async findBlockMapUrlsFromAssets(oldVersion, newVersion, baseFilename) {
        let newBlockMapUrl = null;
        let oldBlockMapUrl = null;
        const newVersionAssets = await this.getVersionInfoForBlockMap(newVersion);
        if (newVersionAssets) {
          newBlockMapUrl = this.findBlockMapInAssets(newVersionAssets, baseFilename);
        }
        const oldVersionAssets = await this.getVersionInfoForBlockMap(oldVersion);
        if (oldVersionAssets) {
          const oldFilename = baseFilename.replace(new RegExp(escapeRegExp(newVersion), "g"), oldVersion);
          oldBlockMapUrl = this.findBlockMapInAssets(oldVersionAssets, oldFilename);
        }
        return [oldBlockMapUrl, newBlockMapUrl];
      }
      async getBlockMapFiles(baseUrl, oldVersion, newVersion, oldBlockMapFileBaseUrl = null) {
        if (this.options.uploadTarget === "project_upload") {
          const baseFilename = baseUrl.pathname.split("/").pop() || "";
          const [oldBlockMapUrl, newBlockMapUrl] = await this.findBlockMapUrlsFromAssets(oldVersion, newVersion, baseFilename);
          if (!newBlockMapUrl) {
            throw (0, builder_util_runtime_1.newError)(`Cannot find blockmap file for ${newVersion} in GitLab assets`, "ERR_UPDATER_BLOCKMAP_FILE_NOT_FOUND");
          }
          if (!oldBlockMapUrl) {
            throw (0, builder_util_runtime_1.newError)(`Cannot find blockmap file for ${oldVersion} in GitLab assets`, "ERR_UPDATER_BLOCKMAP_FILE_NOT_FOUND");
          }
          return [oldBlockMapUrl, newBlockMapUrl];
        } else {
          return super.getBlockMapFiles(baseUrl, oldVersion, newVersion, oldBlockMapFileBaseUrl);
        }
      }
      resolveFiles(updateInfo) {
        return (0, Provider_1.getFileList)(updateInfo).map((fileInfo) => {
          const possibleNames = [
            fileInfo.url,
            // Original filename
            this.normalizeFilename(fileInfo.url)
            // Normalized filename (spaces/underscores → dashes)
          ];
          const matchingAssetName = possibleNames.find((name) => updateInfo.assets.has(name));
          const assetUrl = matchingAssetName ? updateInfo.assets.get(matchingAssetName) : void 0;
          if (!assetUrl) {
            throw (0, builder_util_runtime_1.newError)(`Cannot find asset "${fileInfo.url}" in GitLab release assets. Available assets: ${Array.from(updateInfo.assets.keys()).join(", ")}`, "ERR_UPDATER_ASSET_NOT_FOUND");
          }
          return {
            url: new url_1.URL(assetUrl),
            info: fileInfo
          };
        });
      }
      toString() {
        return `GitLab (projectId: ${this.options.projectId}, channel: ${this.channel})`;
      }
    };
    exports2.GitLabProvider = GitLabProvider;
  }
});

// node_modules/electron-updater/out/providers/KeygenProvider.js
var require_KeygenProvider = __commonJS({
  "node_modules/electron-updater/out/providers/KeygenProvider.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.KeygenProvider = void 0;
    var builder_util_runtime_1 = require_out();
    var util_1 = require_util();
    var Provider_1 = require_Provider();
    var KeygenProvider = class extends Provider_1.Provider {
      constructor(configuration, updater, runtimeOptions) {
        super({
          ...runtimeOptions,
          isUseMultipleRangeRequest: false
        });
        this.configuration = configuration;
        this.updater = updater;
        this.defaultHostname = "api.keygen.sh";
        const host = this.configuration.host || this.defaultHostname;
        this.baseUrl = (0, util_1.newBaseUrl)(`https://${host}/v1/accounts/${this.configuration.account}/artifacts?product=${this.configuration.product}`);
      }
      get channel() {
        return this.updater.channel || this.configuration.channel || "stable";
      }
      async getLatestVersion() {
        const cancellationToken = new builder_util_runtime_1.CancellationToken();
        const channelFile = (0, util_1.getChannelFilename)(this.getCustomChannelName(this.channel));
        const channelUrl = (0, util_1.newUrlFromBase)(channelFile, this.baseUrl, this.updater.isAddNoCacheQuery);
        try {
          const updateInfo = await this.httpRequest(channelUrl, {
            Accept: "application/vnd.api+json",
            "Keygen-Version": "1.1"
          }, cancellationToken);
          return (0, Provider_1.parseUpdateInfo)(updateInfo, channelFile, channelUrl);
        } catch (e) {
          throw (0, builder_util_runtime_1.newError)(`Unable to find latest version on ${this.toString()}, please ensure release exists: ${e.stack || e.message}`, "ERR_UPDATER_LATEST_VERSION_NOT_FOUND");
        }
      }
      resolveFiles(updateInfo) {
        return (0, Provider_1.resolveFiles)(updateInfo, this.baseUrl);
      }
      toString() {
        const { account, product, platform: platform2 } = this.configuration;
        return `Keygen (account: ${account}, product: ${product}, platform: ${platform2}, channel: ${this.channel})`;
      }
    };
    exports2.KeygenProvider = KeygenProvider;
  }
});

// node_modules/electron-updater/out/providers/PrivateGitHubProvider.js
var require_PrivateGitHubProvider = __commonJS({
  "node_modules/electron-updater/out/providers/PrivateGitHubProvider.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.PrivateGitHubProvider = void 0;
    var builder_util_runtime_1 = require_out();
    var js_yaml_1 = require_js_yaml();
    var path3 = require("path");
    var url_1 = require("url");
    var util_1 = require_util();
    var GitHubProvider_1 = require_GitHubProvider();
    var Provider_1 = require_Provider();
    var PrivateGitHubProvider = class extends GitHubProvider_1.BaseGitHubProvider {
      constructor(options, updater, token, runtimeOptions) {
        super(options, "api.github.com", runtimeOptions);
        this.updater = updater;
        this.token = token;
      }
      createRequestOptions(url, headers) {
        const result = super.createRequestOptions(url, headers);
        result.redirect = "manual";
        return result;
      }
      async getLatestVersion() {
        const cancellationToken = new builder_util_runtime_1.CancellationToken();
        const channelFile = (0, util_1.getChannelFilename)(this.getDefaultChannelName());
        const releaseInfo = await this.getLatestVersionInfo(cancellationToken);
        const asset = releaseInfo.assets.find((it) => it.name === channelFile);
        if (asset == null) {
          throw (0, builder_util_runtime_1.newError)(`Cannot find ${channelFile} in the release ${releaseInfo.html_url || releaseInfo.name}`, "ERR_UPDATER_CHANNEL_FILE_NOT_FOUND");
        }
        const url = new url_1.URL(asset.url);
        let result;
        try {
          result = (0, js_yaml_1.load)(await this.httpRequest(url, this.configureHeaders("application/octet-stream"), cancellationToken));
        } catch (e) {
          if (e instanceof builder_util_runtime_1.HttpError && e.statusCode === 404) {
            throw (0, builder_util_runtime_1.newError)(`Cannot find ${channelFile} in the latest release artifacts (${url}): ${e.stack || e.message}`, "ERR_UPDATER_CHANNEL_FILE_NOT_FOUND");
          }
          throw e;
        }
        ;
        result.assets = releaseInfo.assets;
        return result;
      }
      get fileExtraDownloadHeaders() {
        return this.configureHeaders("application/octet-stream");
      }
      configureHeaders(accept) {
        return {
          accept,
          authorization: `token ${this.token}`
        };
      }
      async getLatestVersionInfo(cancellationToken) {
        const allowPrerelease = this.updater.allowPrerelease;
        let basePath = this.basePath;
        if (!allowPrerelease) {
          basePath = `${basePath}/latest`;
        }
        const url = (0, util_1.newUrlFromBase)(basePath, this.baseUrl);
        try {
          const version = JSON.parse(await this.httpRequest(url, this.configureHeaders("application/vnd.github.v3+json"), cancellationToken));
          if (allowPrerelease) {
            const candidates = version.filter((it) => !it.draft);
            return candidates.find((it) => it.prerelease) || candidates[0];
          } else {
            return version;
          }
        } catch (e) {
          throw (0, builder_util_runtime_1.newError)(`Unable to find latest version on GitHub (${url}), please ensure a production release exists: ${e.stack || e.message}`, "ERR_UPDATER_LATEST_VERSION_NOT_FOUND");
        }
      }
      get basePath() {
        return this.computeGithubBasePath(`/repos/${this.options.owner}/${this.options.repo}/releases`);
      }
      resolveFiles(updateInfo) {
        return (0, Provider_1.getFileList)(updateInfo).map((it) => {
          const name = path3.posix.basename(it.url).replace(/ /g, "-");
          const asset = updateInfo.assets.find((it2) => it2 != null && it2.name === name);
          if (asset == null) {
            throw (0, builder_util_runtime_1.newError)(`Cannot find asset "${name}" in: ${JSON.stringify(updateInfo.assets, null, 2)}`, "ERR_UPDATER_ASSET_NOT_FOUND");
          }
          return {
            url: new url_1.URL(asset.url),
            info: it
          };
        });
      }
    };
    exports2.PrivateGitHubProvider = PrivateGitHubProvider;
  }
});

// node_modules/electron-updater/out/providerFactory.js
var require_providerFactory = __commonJS({
  "node_modules/electron-updater/out/providerFactory.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.isUrlProbablySupportMultiRangeRequests = isUrlProbablySupportMultiRangeRequests;
    exports2.createClient = createClient;
    var builder_util_runtime_1 = require_out();
    var BitbucketProvider_1 = require_BitbucketProvider();
    var GenericProvider_1 = require_GenericProvider();
    var GitHubProvider_1 = require_GitHubProvider();
    var GitLabProvider_1 = require_GitLabProvider();
    var KeygenProvider_1 = require_KeygenProvider();
    var PrivateGitHubProvider_1 = require_PrivateGitHubProvider();
    function isUrlProbablySupportMultiRangeRequests(url) {
      return !url.includes("s3.amazonaws.com");
    }
    function createClient(data, updater, runtimeOptions) {
      if (typeof data === "string") {
        throw (0, builder_util_runtime_1.newError)("Please pass PublishConfiguration object", "ERR_UPDATER_INVALID_PROVIDER_CONFIGURATION");
      }
      const provider = data.provider;
      switch (provider) {
        case "github": {
          const githubOptions = data;
          const token = (githubOptions.private ? process.env["GH_TOKEN"] || process.env["GITHUB_TOKEN"] : null) || githubOptions.token;
          if (token == null) {
            return new GitHubProvider_1.GitHubProvider(githubOptions, updater, runtimeOptions);
          } else {
            return new PrivateGitHubProvider_1.PrivateGitHubProvider(githubOptions, updater, token, runtimeOptions);
          }
        }
        case "bitbucket":
          return new BitbucketProvider_1.BitbucketProvider(data, updater, runtimeOptions);
        case "gitlab":
          return new GitLabProvider_1.GitLabProvider(data, updater, runtimeOptions);
        case "keygen":
          return new KeygenProvider_1.KeygenProvider(data, updater, runtimeOptions);
        case "s3":
        case "spaces":
          return new GenericProvider_1.GenericProvider({
            provider: "generic",
            url: (0, builder_util_runtime_1.getS3LikeProviderBaseUrl)(data),
            channel: data.channel || null
          }, updater, {
            ...runtimeOptions,
            // https://github.com/minio/minio/issues/5285#issuecomment-350428955
            isUseMultipleRangeRequest: false
          });
        case "generic": {
          const options = data;
          return new GenericProvider_1.GenericProvider(options, updater, {
            ...runtimeOptions,
            isUseMultipleRangeRequest: options.useMultipleRangeRequest !== false && isUrlProbablySupportMultiRangeRequests(options.url)
          });
        }
        case "custom": {
          const options = data;
          const constructor = options.updateProvider;
          if (!constructor) {
            throw (0, builder_util_runtime_1.newError)("Custom provider not specified", "ERR_UPDATER_INVALID_PROVIDER_CONFIGURATION");
          }
          return new constructor(options, updater, runtimeOptions);
        }
        default:
          throw (0, builder_util_runtime_1.newError)(`Unsupported provider: ${provider}`, "ERR_UPDATER_UNSUPPORTED_PROVIDER");
      }
    }
  }
});

// node_modules/electron-updater/out/differentialDownloader/downloadPlanBuilder.js
var require_downloadPlanBuilder = __commonJS({
  "node_modules/electron-updater/out/differentialDownloader/downloadPlanBuilder.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.OperationKind = void 0;
    exports2.computeOperations = computeOperations;
    var OperationKind;
    (function(OperationKind2) {
      OperationKind2[OperationKind2["COPY"] = 0] = "COPY";
      OperationKind2[OperationKind2["DOWNLOAD"] = 1] = "DOWNLOAD";
    })(OperationKind || (exports2.OperationKind = OperationKind = {}));
    function computeOperations(oldBlockMap, newBlockMap, logger) {
      const nameToOldBlocks = buildBlockFileMap(oldBlockMap.files);
      const nameToNewBlocks = buildBlockFileMap(newBlockMap.files);
      let lastOperation = null;
      const blockMapFile = newBlockMap.files[0];
      const operations = [];
      const name = blockMapFile.name;
      const oldEntry = nameToOldBlocks.get(name);
      if (oldEntry == null) {
        throw new Error(`no file ${name} in old blockmap`);
      }
      const newFile = nameToNewBlocks.get(name);
      let changedBlockCount = 0;
      const { checksumToOffset: checksumToOldOffset, checksumToOldSize } = buildChecksumMap(nameToOldBlocks.get(name), oldEntry.offset, logger);
      let newOffset = blockMapFile.offset;
      for (let i = 0; i < newFile.checksums.length; newOffset += newFile.sizes[i], i++) {
        const blockSize = newFile.sizes[i];
        const checksum = newFile.checksums[i];
        let oldOffset = checksumToOldOffset.get(checksum);
        if (oldOffset != null && checksumToOldSize.get(checksum) !== blockSize) {
          logger.warn(`Checksum ("${checksum}") matches, but size differs (old: ${checksumToOldSize.get(checksum)}, new: ${blockSize})`);
          oldOffset = void 0;
        }
        if (oldOffset === void 0) {
          changedBlockCount++;
          if (lastOperation != null && lastOperation.kind === OperationKind.DOWNLOAD && lastOperation.end === newOffset) {
            lastOperation.end += blockSize;
          } else {
            lastOperation = {
              kind: OperationKind.DOWNLOAD,
              start: newOffset,
              end: newOffset + blockSize
              // oldBlocks: null,
            };
            validateAndAdd(lastOperation, operations, checksum, i);
          }
        } else {
          if (lastOperation != null && lastOperation.kind === OperationKind.COPY && lastOperation.end === oldOffset) {
            lastOperation.end += blockSize;
          } else {
            lastOperation = {
              kind: OperationKind.COPY,
              start: oldOffset,
              end: oldOffset + blockSize
              // oldBlocks: [checksum]
            };
            validateAndAdd(lastOperation, operations, checksum, i);
          }
        }
      }
      if (changedBlockCount > 0) {
        logger.info(`File${blockMapFile.name === "file" ? "" : " " + blockMapFile.name} has ${changedBlockCount} changed blocks`);
      }
      return operations;
    }
    var isValidateOperationRange = process.env["DIFFERENTIAL_DOWNLOAD_PLAN_BUILDER_VALIDATE_RANGES"] === "true";
    function validateAndAdd(operation, operations, checksum, index) {
      if (isValidateOperationRange && operations.length !== 0) {
        const lastOperation = operations[operations.length - 1];
        if (lastOperation.kind === operation.kind && operation.start < lastOperation.end && operation.start > lastOperation.start) {
          const min = [lastOperation.start, lastOperation.end, operation.start, operation.end].reduce((p, v) => p < v ? p : v);
          throw new Error(`operation (block index: ${index}, checksum: ${checksum}, kind: ${OperationKind[operation.kind]}) overlaps previous operation (checksum: ${checksum}):
abs: ${lastOperation.start} until ${lastOperation.end} and ${operation.start} until ${operation.end}
rel: ${lastOperation.start - min} until ${lastOperation.end - min} and ${operation.start - min} until ${operation.end - min}`);
        }
      }
      operations.push(operation);
    }
    function buildChecksumMap(file, fileOffset, logger) {
      const checksumToOffset = /* @__PURE__ */ new Map();
      const checksumToSize = /* @__PURE__ */ new Map();
      let offset = fileOffset;
      for (let i = 0; i < file.checksums.length; i++) {
        const checksum = file.checksums[i];
        const size = file.sizes[i];
        const existing = checksumToSize.get(checksum);
        if (existing === void 0) {
          checksumToOffset.set(checksum, offset);
          checksumToSize.set(checksum, size);
        } else if (logger.debug != null) {
          const sizeExplanation = existing === size ? "(same size)" : `(size: ${existing}, this size: ${size})`;
          logger.debug(`${checksum} duplicated in blockmap ${sizeExplanation}, it doesn't lead to broken differential downloader, just corresponding block will be skipped)`);
        }
        offset += size;
      }
      return { checksumToOffset, checksumToOldSize: checksumToSize };
    }
    function buildBlockFileMap(list) {
      const result = /* @__PURE__ */ new Map();
      for (const item of list) {
        result.set(item.name, item);
      }
      return result;
    }
  }
});

// node_modules/electron-updater/out/differentialDownloader/DataSplitter.js
var require_DataSplitter = __commonJS({
  "node_modules/electron-updater/out/differentialDownloader/DataSplitter.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.DataSplitter = void 0;
    exports2.copyData = copyData;
    var builder_util_runtime_1 = require_out();
    var fs_1 = require("fs");
    var stream_1 = require("stream");
    var downloadPlanBuilder_1 = require_downloadPlanBuilder();
    var CRLF_HEADER_LIST_END = Buffer.from("\r\n\r\n");
    var LF_HEADER_LIST_END = Buffer.from("\n\n");
    var HEADER_LIST_END_CARRY = CRLF_HEADER_LIST_END.length - 1;
    var CRLF_DELIMITER_PREFIX_LENGTH = "\r\n--".length;
    var LF_DELIMITER_PREFIX_LENGTH = "\n--".length;
    function findHeaderListEnd(data) {
      const crlf = data.indexOf(CRLF_HEADER_LIST_END);
      const lf = data.indexOf(LF_HEADER_LIST_END);
      if (lf !== -1 && (crlf === -1 || lf < crlf)) {
        return { end: lf + LF_HEADER_LIST_END.length, lineFeedOnly: true };
      }
      if (crlf !== -1) {
        return { end: crlf + CRLF_HEADER_LIST_END.length, lineFeedOnly: false };
      }
      return null;
    }
    var ReadState;
    (function(ReadState2) {
      ReadState2[ReadState2["INIT"] = 0] = "INIT";
      ReadState2[ReadState2["HEADER"] = 1] = "HEADER";
      ReadState2[ReadState2["BODY"] = 2] = "BODY";
    })(ReadState || (ReadState = {}));
    function copyData(task, out, oldFileFd, reject, resolve6) {
      const readStream = (0, fs_1.createReadStream)("", {
        fd: oldFileFd,
        autoClose: false,
        start: task.start,
        // end is inclusive
        end: task.end - 1
      });
      readStream.on("error", reject);
      readStream.once("end", resolve6);
      readStream.pipe(out, {
        end: false
      });
    }
    var DataSplitter = class extends stream_1.Writable {
      constructor(out, options, partIndexToTaskIndex, boundary, partIndexToLength, finishHandler, grandTotalBytes, onProgress) {
        super();
        this.out = out;
        this.options = options;
        this.partIndexToTaskIndex = partIndexToTaskIndex;
        this.partIndexToLength = partIndexToLength;
        this.finishHandler = finishHandler;
        this.grandTotalBytes = grandTotalBytes;
        this.onProgress = onProgress;
        this.start = Date.now();
        this.nextUpdate = this.start + 1e3;
        this.transferred = 0;
        this.delta = 0;
        this.partIndex = -1;
        this.headerListTail = null;
        this.readState = ReadState.INIT;
        this.ignoreByteCount = 0;
        this.remainingPartDataCount = 0;
        this.actualPartLength = 0;
        this.boundaryTextLength = boundary.length;
        this.boundaryLength = boundary.length + 4;
        this.ignoreByteCount = this.boundaryLength - 2;
      }
      get isFinished() {
        return this.partIndex === this.partIndexToLength.length;
      }
      // noinspection JSUnusedGlobalSymbols
      _write(data, encoding, callback) {
        if (this.isFinished) {
          console.error(`Trailing ignored data: ${data.length} bytes`);
          return;
        }
        this.handleData(data).then(() => {
          if (this.onProgress) {
            const now = Date.now();
            if ((now >= this.nextUpdate || this.transferred === this.grandTotalBytes) && this.grandTotalBytes && (now - this.start) / 1e3) {
              this.nextUpdate = now + 1e3;
              this.onProgress({
                total: this.grandTotalBytes,
                delta: this.delta,
                transferred: this.transferred,
                percent: this.transferred / this.grandTotalBytes * 100,
                bytesPerSecond: Math.round(this.transferred / ((now - this.start) / 1e3))
              });
              this.delta = 0;
            }
          }
          callback();
        }).catch(callback);
      }
      async handleData(chunk) {
        let start = 0;
        if (this.ignoreByteCount !== 0 && this.remainingPartDataCount !== 0) {
          throw (0, builder_util_runtime_1.newError)("Internal error", "ERR_DATA_SPLITTER_BYTE_COUNT_MISMATCH");
        }
        if (this.ignoreByteCount > 0) {
          const toIgnore = Math.min(this.ignoreByteCount, chunk.length);
          this.ignoreByteCount -= toIgnore;
          start = toIgnore;
        } else if (this.remainingPartDataCount > 0) {
          const toRead = Math.min(this.remainingPartDataCount, chunk.length);
          this.remainingPartDataCount -= toRead;
          await this.processPartData(chunk, 0, toRead);
          start = toRead;
        }
        if (start === chunk.length) {
          return;
        }
        if (this.readState === ReadState.HEADER) {
          const headerListEnd = this.searchHeaderListEnd(chunk, start);
          if (headerListEnd === -1) {
            return;
          }
          start = headerListEnd;
          this.readState = ReadState.BODY;
        }
        while (true) {
          if (this.readState === ReadState.BODY) {
            this.readState = ReadState.INIT;
          } else {
            this.partIndex++;
            let taskIndex = this.partIndexToTaskIndex.get(this.partIndex);
            if (taskIndex == null) {
              if (this.isFinished) {
                taskIndex = this.options.end;
              } else {
                throw (0, builder_util_runtime_1.newError)("taskIndex is null", "ERR_DATA_SPLITTER_TASK_INDEX_IS_NULL");
              }
            }
            const prevTaskIndex = this.partIndex === 0 ? this.options.start : this.partIndexToTaskIndex.get(this.partIndex - 1) + 1;
            if (prevTaskIndex < taskIndex) {
              await this.copyExistingData(prevTaskIndex, taskIndex);
            } else if (prevTaskIndex > taskIndex) {
              throw (0, builder_util_runtime_1.newError)("prevTaskIndex must be < taskIndex", "ERR_DATA_SPLITTER_TASK_INDEX_ASSERT_FAILED");
            }
            if (this.isFinished) {
              this.onPartEnd();
              this.finishHandler();
              return;
            }
            start = this.searchHeaderListEnd(chunk, start);
            if (start === -1) {
              this.readState = ReadState.HEADER;
              return;
            }
          }
          const partLength = this.partIndexToLength[this.partIndex];
          const end = start + partLength;
          const effectiveEnd = Math.min(end, chunk.length);
          await this.processPartStarted(chunk, start, effectiveEnd);
          this.remainingPartDataCount = partLength - (effectiveEnd - start);
          if (this.remainingPartDataCount > 0) {
            return;
          }
          start = end + this.boundaryLength;
          if (start >= chunk.length) {
            this.ignoreByteCount = this.boundaryLength - (chunk.length - end);
            return;
          }
        }
      }
      copyExistingData(index, end) {
        return new Promise((resolve6, reject) => {
          const w = () => {
            if (index === end) {
              resolve6();
              return;
            }
            const task = this.options.tasks[index];
            if (task.kind !== downloadPlanBuilder_1.OperationKind.COPY) {
              reject(new Error("Task kind must be COPY"));
              return;
            }
            copyData(task, this.out, this.options.oldFileFd, reject, () => {
              index++;
              w();
            });
          };
          w();
        });
      }
      searchHeaderListEnd(chunk, readOffset) {
        const tail = this.headerListTail;
        const carried = tail == null ? 0 : tail.length;
        const data = tail == null ? chunk.subarray(readOffset) : Buffer.concat([tail, chunk.subarray(readOffset)]);
        const found = findHeaderListEnd(data);
        if (found != null) {
          this.headerListTail = null;
          this.boundaryLength = this.boundaryTextLength + (found.lineFeedOnly ? LF_DELIMITER_PREFIX_LENGTH : CRLF_DELIMITER_PREFIX_LENGTH);
          return readOffset + found.end - carried;
        }
        this.headerListTail = Buffer.from(data.subarray(Math.max(0, data.length - HEADER_LIST_END_CARRY)));
        return -1;
      }
      onPartEnd() {
        const expectedLength = this.partIndexToLength[this.partIndex - 1];
        if (this.actualPartLength !== expectedLength) {
          throw (0, builder_util_runtime_1.newError)(`Expected length: ${expectedLength} differs from actual: ${this.actualPartLength}`, "ERR_DATA_SPLITTER_LENGTH_MISMATCH");
        }
        this.actualPartLength = 0;
      }
      processPartStarted(data, start, end) {
        if (this.partIndex !== 0) {
          this.onPartEnd();
        }
        return this.processPartData(data, start, end);
      }
      processPartData(data, start, end) {
        this.actualPartLength += end - start;
        this.transferred += end - start;
        this.delta += end - start;
        const out = this.out;
        if (out.write(start === 0 && data.length === end ? data : data.slice(start, end))) {
          return Promise.resolve();
        } else {
          return new Promise((resolve6, reject) => {
            out.on("error", reject);
            out.once("drain", () => {
              out.removeListener("error", reject);
              resolve6();
            });
          });
        }
      }
    };
    exports2.DataSplitter = DataSplitter;
  }
});

// node_modules/electron-updater/out/differentialDownloader/multipleRangeDownloader.js
var require_multipleRangeDownloader = __commonJS({
  "node_modules/electron-updater/out/differentialDownloader/multipleRangeDownloader.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.executeTasksUsingMultipleRangeRequests = executeTasksUsingMultipleRangeRequests;
    exports2.checkIsRangesSupported = checkIsRangesSupported;
    var builder_util_runtime_1 = require_out();
    var DataSplitter_1 = require_DataSplitter();
    var downloadPlanBuilder_1 = require_downloadPlanBuilder();
    function executeTasksUsingMultipleRangeRequests(differentialDownloader, tasks, out, oldFileFd, reject) {
      const w = (taskOffset) => {
        if (taskOffset >= tasks.length) {
          if (differentialDownloader.fileMetadataBuffer != null) {
            out.write(differentialDownloader.fileMetadataBuffer);
          }
          out.end();
          return;
        }
        const nextOffset = taskOffset + 1e3;
        doExecuteTasks(differentialDownloader, {
          tasks,
          start: taskOffset,
          end: Math.min(tasks.length, nextOffset),
          oldFileFd
        }, out, () => w(nextOffset), reject);
      };
      return w;
    }
    function doExecuteTasks(differentialDownloader, options, out, resolve6, reject) {
      let ranges = "bytes=";
      let partCount = 0;
      let grandTotalBytes = 0;
      const partIndexToTaskIndex = /* @__PURE__ */ new Map();
      const partIndexToLength = [];
      for (let i = options.start; i < options.end; i++) {
        const task = options.tasks[i];
        if (task.kind === downloadPlanBuilder_1.OperationKind.DOWNLOAD) {
          ranges += `${task.start}-${task.end - 1}, `;
          partIndexToTaskIndex.set(partCount, i);
          partCount++;
          partIndexToLength.push(task.end - task.start);
          grandTotalBytes += task.end - task.start;
        }
      }
      if (partCount <= 1) {
        const w = (index) => {
          if (index >= options.end) {
            resolve6();
            return;
          }
          const task = options.tasks[index++];
          if (task.kind === downloadPlanBuilder_1.OperationKind.COPY) {
            (0, DataSplitter_1.copyData)(task, out, options.oldFileFd, reject, () => w(index));
          } else {
            const requestOptions2 = differentialDownloader.createRequestOptions();
            requestOptions2.headers.Range = `bytes=${task.start}-${task.end - 1}`;
            const request2 = differentialDownloader.httpExecutor.createRequest(requestOptions2, (response) => {
              response.on("error", reject);
              if (!checkIsRangesSupported(response, reject)) {
                return;
              }
              response.pipe(out, {
                end: false
              });
              response.once("end", () => w(index));
            });
            differentialDownloader.httpExecutor.addErrorAndTimeoutHandlers(request2, reject);
            request2.end();
          }
        };
        w(options.start);
        return;
      }
      const requestOptions = differentialDownloader.createRequestOptions();
      requestOptions.headers.Range = ranges.substring(0, ranges.length - 2);
      const request = differentialDownloader.httpExecutor.createRequest(requestOptions, (response) => {
        if (!checkIsRangesSupported(response, reject)) {
          return;
        }
        const contentType = (0, builder_util_runtime_1.safeGetHeader)(response, "content-type");
        const m = /^multipart\/.+?\s*;\s*boundary=(?:"([^"]+)"|([^\s";]+))\s*$/i.exec(contentType);
        if (m == null) {
          reject(new Error(`Content-Type "multipart/byteranges" is expected, but got "${contentType}"`));
          return;
        }
        let isBatchFinished = false;
        let watchdog = null;
        const onBatchFinished = () => {
          isBatchFinished = true;
          if (watchdog != null) {
            clearTimeout(watchdog);
            watchdog = null;
          }
          resolve6();
        };
        const dicer = new DataSplitter_1.DataSplitter(out, options, partIndexToTaskIndex, m[1] || m[2], partIndexToLength, onBatchFinished, grandTotalBytes, differentialDownloader.options.onProgress);
        dicer.on("error", reject);
        response.pipe(dicer);
        response.on("end", () => {
          if (isBatchFinished) {
            return;
          }
          watchdog = setTimeout(() => {
            watchdog = null;
            if (isBatchFinished) {
              return;
            }
            request.abort();
            reject(new Error("Response ends without calling any handlers"));
          }, 1e4);
        });
      });
      differentialDownloader.httpExecutor.addErrorAndTimeoutHandlers(request, reject);
      request.end();
    }
    function checkIsRangesSupported(response, reject) {
      if (response.statusCode >= 400) {
        reject((0, builder_util_runtime_1.createHttpError)(response));
        return false;
      }
      if (response.statusCode !== 206) {
        const acceptRanges = (0, builder_util_runtime_1.safeGetHeader)(response, "accept-ranges");
        if (acceptRanges == null || acceptRanges === "none") {
          reject(new Error(`Server doesn't support Accept-Ranges (response code ${response.statusCode})`));
          return false;
        }
      }
      return true;
    }
  }
});

// node_modules/electron-updater/out/differentialDownloader/ProgressDifferentialDownloadCallbackTransform.js
var require_ProgressDifferentialDownloadCallbackTransform = __commonJS({
  "node_modules/electron-updater/out/differentialDownloader/ProgressDifferentialDownloadCallbackTransform.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ProgressDifferentialDownloadCallbackTransform = void 0;
    var stream_1 = require("stream");
    var OperationKind;
    (function(OperationKind2) {
      OperationKind2[OperationKind2["COPY"] = 0] = "COPY";
      OperationKind2[OperationKind2["DOWNLOAD"] = 1] = "DOWNLOAD";
    })(OperationKind || (OperationKind = {}));
    var ProgressDifferentialDownloadCallbackTransform = class extends stream_1.Transform {
      constructor(progressDifferentialDownloadInfo, cancellationToken, onProgress) {
        super();
        this.progressDifferentialDownloadInfo = progressDifferentialDownloadInfo;
        this.cancellationToken = cancellationToken;
        this.onProgress = onProgress;
        this.start = Date.now();
        this.transferred = 0;
        this.delta = 0;
        this.expectedBytes = 0;
        this.index = 0;
        this.operationType = OperationKind.COPY;
        this.nextUpdate = this.start + 1e3;
      }
      _transform(chunk, encoding, callback) {
        if (this.cancellationToken.cancelled) {
          callback(new Error("cancelled"), null);
          return;
        }
        if (this.operationType == OperationKind.COPY) {
          callback(null, chunk);
          return;
        }
        this.transferred += chunk.length;
        this.delta += chunk.length;
        const now = Date.now();
        if (now >= this.nextUpdate && this.transferred !== this.expectedBytes && this.transferred !== this.progressDifferentialDownloadInfo.grandTotal) {
          this.nextUpdate = now + 1e3;
          this.onProgress({
            total: this.progressDifferentialDownloadInfo.grandTotal,
            delta: this.delta,
            transferred: this.transferred,
            percent: this.transferred / this.progressDifferentialDownloadInfo.grandTotal * 100,
            bytesPerSecond: Math.round(this.transferred / ((now - this.start) / 1e3))
          });
          this.delta = 0;
        }
        callback(null, chunk);
      }
      beginFileCopy() {
        this.operationType = OperationKind.COPY;
      }
      beginRangeDownload() {
        this.operationType = OperationKind.DOWNLOAD;
        this.expectedBytes += this.progressDifferentialDownloadInfo.expectedByteCounts[this.index++];
      }
      endRangeDownload() {
        if (this.transferred !== this.progressDifferentialDownloadInfo.grandTotal) {
          this.onProgress({
            total: this.progressDifferentialDownloadInfo.grandTotal,
            delta: this.delta,
            transferred: this.transferred,
            percent: this.transferred / this.progressDifferentialDownloadInfo.grandTotal * 100,
            bytesPerSecond: Math.round(this.transferred / ((Date.now() - this.start) / 1e3))
          });
        }
      }
      // Called when we are 100% done with the connection/download
      _flush(callback) {
        if (this.cancellationToken.cancelled) {
          callback(new Error("cancelled"));
          return;
        }
        this.onProgress({
          total: this.progressDifferentialDownloadInfo.grandTotal,
          delta: this.delta,
          transferred: this.transferred,
          percent: 100,
          bytesPerSecond: Math.round(this.transferred / ((Date.now() - this.start) / 1e3))
        });
        this.delta = 0;
        this.transferred = 0;
        callback(null);
      }
    };
    exports2.ProgressDifferentialDownloadCallbackTransform = ProgressDifferentialDownloadCallbackTransform;
  }
});

// node_modules/electron-updater/out/differentialDownloader/DifferentialDownloader.js
var require_DifferentialDownloader = __commonJS({
  "node_modules/electron-updater/out/differentialDownloader/DifferentialDownloader.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.DifferentialDownloader = void 0;
    var builder_util_runtime_1 = require_out();
    var fs_extra_1 = require_lib();
    var fs_1 = require("fs");
    var DataSplitter_1 = require_DataSplitter();
    var url_1 = require("url");
    var downloadPlanBuilder_1 = require_downloadPlanBuilder();
    var multipleRangeDownloader_1 = require_multipleRangeDownloader();
    var ProgressDifferentialDownloadCallbackTransform_1 = require_ProgressDifferentialDownloadCallbackTransform();
    var DifferentialDownloader = class {
      // noinspection TypeScriptAbstractClassConstructorCanBeMadeProtected
      constructor(blockAwareFileInfo, httpExecutor, options) {
        this.blockAwareFileInfo = blockAwareFileInfo;
        this.httpExecutor = httpExecutor;
        this.options = options;
        this.fileMetadataBuffer = null;
        this.logger = options.logger;
      }
      createRequestOptions() {
        const result = {
          headers: {
            ...this.options.requestHeaders,
            accept: "*/*"
          }
        };
        (0, builder_util_runtime_1.configureRequestUrl)(this.options.newUrl, result);
        (0, builder_util_runtime_1.configureRequestOptions)(result);
        return result;
      }
      doDownload(oldBlockMap, newBlockMap) {
        if (oldBlockMap.version !== newBlockMap.version) {
          throw new Error(`version is different (${oldBlockMap.version} - ${newBlockMap.version}), full download is required`);
        }
        const logger = this.logger;
        const operations = (0, downloadPlanBuilder_1.computeOperations)(oldBlockMap, newBlockMap, logger);
        if (logger.debug != null) {
          logger.debug(JSON.stringify(operations, null, 2));
        }
        let downloadSize = 0;
        let copySize = 0;
        for (const operation of operations) {
          const length = operation.end - operation.start;
          if (operation.kind === downloadPlanBuilder_1.OperationKind.DOWNLOAD) {
            downloadSize += length;
          } else {
            copySize += length;
          }
        }
        const newSize = this.blockAwareFileInfo.size;
        if (downloadSize + copySize + (this.fileMetadataBuffer == null ? 0 : this.fileMetadataBuffer.length) !== newSize) {
          throw new Error(`Internal error, size mismatch: downloadSize: ${downloadSize}, copySize: ${copySize}, newSize: ${newSize}`);
        }
        logger.info(`Full: ${formatBytes(newSize)}, To download: ${formatBytes(downloadSize)} (${Math.round(downloadSize / (newSize / 100))}%)`);
        return this.downloadFile(operations);
      }
      downloadFile(tasks) {
        const fdList = [];
        const closeFiles = () => {
          return Promise.all(fdList.map((openedFile) => {
            return (0, fs_extra_1.close)(openedFile.descriptor).catch((e) => {
              this.logger.error(`cannot close file "${openedFile.path}": ${e}`);
            });
          }));
        };
        return this.doDownloadFile(tasks, fdList).then(closeFiles).catch((e) => {
          return closeFiles().catch((closeFilesError) => {
            try {
              this.logger.error(`cannot close files: ${closeFilesError}`);
            } catch (errorOnLog) {
              try {
                console.error(errorOnLog);
              } catch (_ignored) {
              }
            }
            throw e;
          }).then(() => {
            throw e;
          });
        });
      }
      async doDownloadFile(tasks, fdList) {
        const oldFileFd = await (0, fs_extra_1.open)(this.options.oldFile, "r");
        fdList.push({ descriptor: oldFileFd, path: this.options.oldFile });
        const newFileFd = await (0, fs_extra_1.open)(this.options.newFile, "w");
        fdList.push({ descriptor: newFileFd, path: this.options.newFile });
        const fileOut = (0, fs_1.createWriteStream)(this.options.newFile, { fd: newFileFd });
        await new Promise((resolve6, reject) => {
          const streams = [];
          let downloadInfoTransform = void 0;
          if (!this.options.isUseMultipleRangeRequest && this.options.onProgress) {
            const expectedByteCounts = [];
            let grandTotalBytes = 0;
            for (const task of tasks) {
              if (task.kind === downloadPlanBuilder_1.OperationKind.DOWNLOAD) {
                expectedByteCounts.push(task.end - task.start);
                grandTotalBytes += task.end - task.start;
              }
            }
            const progressDifferentialDownloadInfo = {
              expectedByteCounts,
              grandTotal: grandTotalBytes
            };
            downloadInfoTransform = new ProgressDifferentialDownloadCallbackTransform_1.ProgressDifferentialDownloadCallbackTransform(progressDifferentialDownloadInfo, this.options.cancellationToken, this.options.onProgress);
            streams.push(downloadInfoTransform);
          }
          const digestTransform = new builder_util_runtime_1.DigestTransform(this.blockAwareFileInfo.sha512);
          digestTransform.isValidateOnEnd = false;
          streams.push(digestTransform);
          fileOut.on("finish", () => {
            ;
            fileOut.close(() => {
              fdList.splice(1, 1);
              try {
                digestTransform.validate();
              } catch (e) {
                reject(e);
                return;
              }
              resolve6(void 0);
            });
          });
          streams.push(fileOut);
          let lastStream = null;
          for (const stream of streams) {
            stream.on("error", reject);
            if (lastStream == null) {
              lastStream = stream;
            } else {
              lastStream = lastStream.pipe(stream);
            }
          }
          const firstStream = streams[0];
          let w;
          if (this.options.isUseMultipleRangeRequest) {
            w = (0, multipleRangeDownloader_1.executeTasksUsingMultipleRangeRequests)(this, tasks, firstStream, oldFileFd, reject);
            w(0);
            return;
          }
          let downloadOperationCount = 0;
          let actualUrl = null;
          this.logger.info(`Differential download: ${this.options.newUrl}`);
          const requestOptions = this.createRequestOptions();
          requestOptions.redirect = "manual";
          w = (index) => {
            var _a, _b;
            if (index >= tasks.length) {
              if (this.fileMetadataBuffer != null) {
                firstStream.write(this.fileMetadataBuffer);
              }
              firstStream.end();
              return;
            }
            const operation = tasks[index++];
            if (operation.kind === downloadPlanBuilder_1.OperationKind.COPY) {
              if (downloadInfoTransform) {
                downloadInfoTransform.beginFileCopy();
              }
              (0, DataSplitter_1.copyData)(operation, firstStream, oldFileFd, reject, () => w(index));
              return;
            }
            const range = `bytes=${operation.start}-${operation.end - 1}`;
            requestOptions.headers.range = range;
            (_b = (_a = this.logger) === null || _a === void 0 ? void 0 : _a.debug) === null || _b === void 0 ? void 0 : _b.call(_a, `download range: ${range}`);
            if (downloadInfoTransform) {
              downloadInfoTransform.beginRangeDownload();
            }
            const request = this.httpExecutor.createRequest(requestOptions, (response) => {
              response.on("error", reject);
              response.on("aborted", () => {
                reject(new Error("response has been aborted by the server"));
              });
              if (response.statusCode >= 400) {
                reject((0, builder_util_runtime_1.createHttpError)(response));
              }
              response.pipe(firstStream, {
                end: false
              });
              response.once("end", () => {
                if (downloadInfoTransform) {
                  downloadInfoTransform.endRangeDownload();
                }
                if (++downloadOperationCount === 100) {
                  downloadOperationCount = 0;
                  setTimeout(() => w(index), 1e3);
                } else {
                  w(index);
                }
              });
            });
            request.on("redirect", (statusCode, method, redirectUrl) => {
              this.logger.info(`Redirect to ${removeQuery(redirectUrl)}`);
              actualUrl = redirectUrl;
              (0, builder_util_runtime_1.configureRequestUrl)(new url_1.URL(actualUrl), requestOptions);
              request.followRedirect();
            });
            this.httpExecutor.addErrorAndTimeoutHandlers(request, reject);
            request.end();
          };
          w(0);
        });
      }
      async readRemoteBytes(start, endInclusive) {
        const buffer = Buffer.allocUnsafe(endInclusive + 1 - start);
        const requestOptions = this.createRequestOptions();
        requestOptions.headers.range = `bytes=${start}-${endInclusive}`;
        let position = 0;
        await this.request(requestOptions, (chunk) => {
          chunk.copy(buffer, position);
          position += chunk.length;
        });
        if (position !== buffer.length) {
          throw new Error(`Received data length ${position} is not equal to expected ${buffer.length}`);
        }
        return buffer;
      }
      request(requestOptions, dataHandler) {
        return new Promise((resolve6, reject) => {
          const request = this.httpExecutor.createRequest(requestOptions, (response) => {
            if (!(0, multipleRangeDownloader_1.checkIsRangesSupported)(response, reject)) {
              return;
            }
            response.on("error", reject);
            response.on("aborted", () => {
              reject(new Error("response has been aborted by the server"));
            });
            response.on("data", dataHandler);
            response.on("end", () => resolve6());
          });
          this.httpExecutor.addErrorAndTimeoutHandlers(request, reject);
          request.end();
        });
      }
    };
    exports2.DifferentialDownloader = DifferentialDownloader;
    function formatBytes(value, symbol = " KB") {
      return new Intl.NumberFormat("en").format((value / 1024).toFixed(2)) + symbol;
    }
    function removeQuery(url) {
      const index = url.indexOf("?");
      return index < 0 ? url : url.substring(0, index);
    }
  }
});

// node_modules/electron-updater/out/differentialDownloader/GenericDifferentialDownloader.js
var require_GenericDifferentialDownloader = __commonJS({
  "node_modules/electron-updater/out/differentialDownloader/GenericDifferentialDownloader.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.GenericDifferentialDownloader = void 0;
    var DifferentialDownloader_1 = require_DifferentialDownloader();
    var GenericDifferentialDownloader = class extends DifferentialDownloader_1.DifferentialDownloader {
      download(oldBlockMap, newBlockMap) {
        return this.doDownload(oldBlockMap, newBlockMap);
      }
    };
    exports2.GenericDifferentialDownloader = GenericDifferentialDownloader;
  }
});

// node_modules/electron-updater/out/types.js
var require_types = __commonJS({
  "node_modules/electron-updater/out/types.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.UpdaterSignal = exports2.UPDATE_DOWNLOADED = exports2.DOWNLOAD_PROGRESS = exports2.CancellationToken = void 0;
    exports2.addHandler = addHandler;
    var builder_util_runtime_1 = require_out();
    Object.defineProperty(exports2, "CancellationToken", { enumerable: true, get: function() {
      return builder_util_runtime_1.CancellationToken;
    } });
    exports2.DOWNLOAD_PROGRESS = "download-progress";
    exports2.UPDATE_DOWNLOADED = "update-downloaded";
    var UpdaterSignal = class {
      constructor(emitter) {
        this.emitter = emitter;
      }
      /**
       * Emitted when an authenticating proxy is [asking for user credentials](https://github.com/electron/electron/blob/master/docs/api/client-request.md#event-login).
       */
      login(handler) {
        addHandler(this.emitter, "login", handler);
      }
      progress(handler) {
        addHandler(this.emitter, exports2.DOWNLOAD_PROGRESS, handler);
      }
      updateDownloaded(handler) {
        addHandler(this.emitter, exports2.UPDATE_DOWNLOADED, handler);
      }
      updateCancelled(handler) {
        addHandler(this.emitter, "update-cancelled", handler);
      }
    };
    exports2.UpdaterSignal = UpdaterSignal;
    var isLogEvent = false;
    function addHandler(emitter, event, handler) {
      if (isLogEvent) {
        emitter.on(event, (...args) => {
          console.log("%s %s", event, args);
          handler(...args);
        });
      } else {
        emitter.on(event, handler);
      }
    }
  }
});

// node_modules/electron-updater/out/AppUpdater.js
var require_AppUpdater = __commonJS({
  "node_modules/electron-updater/out/AppUpdater.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.NoOpLogger = exports2.AppUpdater = void 0;
    var builder_util_runtime_1 = require_out();
    var crypto_1 = require("crypto");
    var os_1 = require("os");
    var events_1 = require("events");
    var fs_extra_1 = require_lib();
    var js_yaml_1 = require_js_yaml();
    var lazy_val_1 = require_main();
    var path3 = require("path");
    var semver_1 = require_semver2();
    var DownloadedUpdateHelper_1 = require_DownloadedUpdateHelper();
    var ElectronAppAdapter_1 = require_ElectronAppAdapter();
    var electronHttpExecutor_1 = require_electronHttpExecutor();
    var GenericProvider_1 = require_GenericProvider();
    var providerFactory_1 = require_providerFactory();
    var zlib_1 = require("zlib");
    var GenericDifferentialDownloader_1 = require_GenericDifferentialDownloader();
    var types_1 = require_types();
    var AppUpdater = class _AppUpdater extends events_1.EventEmitter {
      /**
       * Get the update channel. Doesn't return `channel` from the update configuration, only if was previously set.
       */
      get channel() {
        return this._channel;
      }
      /**
       * Set the update channel. Overrides `channel` in the update configuration.
       *
       * `allowDowngrade` will be automatically set to `true`. If this behavior is not suitable for you, simple set `allowDowngrade` explicitly after.
       */
      set channel(value) {
        if (this._channel != null) {
          if (typeof value !== "string") {
            throw (0, builder_util_runtime_1.newError)(`Channel must be a string, but got: ${value}`, "ERR_UPDATER_INVALID_CHANNEL");
          } else if (value.length === 0) {
            throw (0, builder_util_runtime_1.newError)(`Channel must be not an empty string`, "ERR_UPDATER_INVALID_CHANNEL");
          }
        }
        this._channel = value;
        this.allowDowngrade = true;
      }
      /**
       *  Shortcut for explicitly adding auth tokens to request headers
       */
      addAuthHeader(token) {
        this.requestHeaders = Object.assign({}, this.requestHeaders, {
          authorization: token
        });
      }
      // noinspection JSMethodCanBeStatic,JSUnusedGlobalSymbols
      get netSession() {
        return (0, electronHttpExecutor_1.getNetSession)();
      }
      /**
       * The logger. You can pass [electron-log](https://github.com/megahertz/electron-log), [winston](https://github.com/winstonjs/winston) or another logger with the following interface: `{ info(), warn(), error() }`.
       * Set it to `null` if you would like to disable a logging feature.
       */
      get logger() {
        return this._logger;
      }
      set logger(value) {
        this._logger = value == null ? new NoOpLogger() : value;
      }
      // noinspection JSUnusedGlobalSymbols
      /**
       * test only
       * @private
       */
      set updateConfigPath(value) {
        this.clientPromise = null;
        this._appUpdateConfigPath = value;
        this.configOnDisk = new lazy_val_1.Lazy(() => this.loadUpdateConfig());
      }
      /**
       * Allows developer to override default logic for determining if an update is supported.
       * The default logic compares the `UpdateInfo` minimum system version against the `os.release()` with `semver` package
       */
      get isUpdateSupported() {
        return this._isUpdateSupported;
      }
      set isUpdateSupported(value) {
        if (value) {
          this._isUpdateSupported = value;
        }
      }
      /**
       * Allows developer to override default logic for determining if the user is below the rollout threshold.
       * The default logic compares the staging percentage with numerical representation of user ID.
       * An override can define custom logic, or bypass it if needed.
       */
      get isUserWithinRollout() {
        return this._isUserWithinRollout;
      }
      set isUserWithinRollout(value) {
        if (value) {
          this._isUserWithinRollout = value;
        }
      }
      constructor(options, app2) {
        super();
        this.autoDownload = true;
        this.autoInstallOnAppQuit = true;
        this.autoRunAppAfterInstall = true;
        this.allowPrerelease = false;
        this.fullChangelog = false;
        this.allowDowngrade = false;
        this.disableWebInstaller = false;
        this.disableDifferentialDownload = false;
        this.forceDevUpdateConfig = false;
        this.previousBlockmapBaseUrlOverride = null;
        this._channel = null;
        this.downloadedUpdateHelper = null;
        this.requestHeaders = null;
        this._logger = console;
        this.signals = new types_1.UpdaterSignal(this);
        this._appUpdateConfigPath = null;
        this._isUpdateSupported = (updateInfo) => this.checkIfUpdateSupported(updateInfo);
        this._isUserWithinRollout = (updateInfo) => this.isStagingMatch(updateInfo);
        this.clientPromise = null;
        this.stagingUserIdPromise = new lazy_val_1.Lazy(() => this.getOrCreateStagingUserId());
        this.configOnDisk = new lazy_val_1.Lazy(() => this.loadUpdateConfig());
        this.checkForUpdatesPromise = null;
        this.downloadPromise = null;
        this.updateInfoAndProvider = null;
        this._testOnlyOptions = null;
        this.on("error", (error) => {
          this._logger.error(`Error: ${error.stack || error.message}`);
        });
        if (app2 == null) {
          this.app = new ElectronAppAdapter_1.ElectronAppAdapter();
          this.httpExecutor = new electronHttpExecutor_1.ElectronHttpExecutor((authInfo, callback) => this.emit("login", authInfo, callback));
        } else {
          this.app = app2;
          this.httpExecutor = null;
        }
        const currentVersionString = this.app.version;
        const currentVersion = (0, semver_1.parse)(currentVersionString);
        if (currentVersion == null) {
          throw (0, builder_util_runtime_1.newError)(`App version is not a valid semver version: "${currentVersionString}"`, "ERR_UPDATER_INVALID_VERSION");
        }
        this.currentVersion = currentVersion;
        this.allowPrerelease = hasPrereleaseComponents(currentVersion);
        if (options != null) {
          this.setFeedURL(options);
          if (typeof options !== "string" && options.requestHeaders) {
            this.requestHeaders = options.requestHeaders;
          }
        }
      }
      //noinspection JSMethodCanBeStatic,JSUnusedGlobalSymbols
      getFeedURL() {
        return "Deprecated. Do not use it.";
      }
      /**
       * Configure update provider. If value is `string`, [GenericServerOptions](https://www.electron.build/publish#genericserveroptions) will be set with value as `url`.
       * @param options If you want to override configuration in the `app-update.yml`.
       */
      setFeedURL(options) {
        const runtimeOptions = this.createProviderRuntimeOptions();
        let provider;
        if (typeof options === "string") {
          provider = new GenericProvider_1.GenericProvider({ provider: "generic", url: options }, this, {
            ...runtimeOptions,
            isUseMultipleRangeRequest: (0, providerFactory_1.isUrlProbablySupportMultiRangeRequests)(options)
          });
        } else {
          provider = (0, providerFactory_1.createClient)(options, this, runtimeOptions);
        }
        this.clientPromise = Promise.resolve(provider);
      }
      /**
       * Asks the server whether there is an update.
       * @returns null if the updater is disabled, otherwise info about the latest version
       */
      checkForUpdates() {
        if (!this.isUpdaterActive()) {
          return Promise.resolve(null);
        }
        let checkForUpdatesPromise = this.checkForUpdatesPromise;
        if (checkForUpdatesPromise != null) {
          this._logger.info("Checking for update (already in progress)");
          return checkForUpdatesPromise;
        }
        const nullizePromise = () => this.checkForUpdatesPromise = null;
        this._logger.info("Checking for update");
        checkForUpdatesPromise = this.doCheckForUpdates().then((it) => {
          nullizePromise();
          return it;
        }).catch((e) => {
          nullizePromise();
          this.emit("error", e, `Cannot check for updates: ${(e.stack || e).toString()}`);
          throw e;
        });
        this.checkForUpdatesPromise = checkForUpdatesPromise;
        return checkForUpdatesPromise;
      }
      isUpdaterActive() {
        const isEnabled = this.app.isPackaged || this.forceDevUpdateConfig;
        if (!isEnabled) {
          this._logger.info("Skip checkForUpdates because application is not packed and dev update config is not forced");
          return false;
        }
        return true;
      }
      // noinspection JSUnusedGlobalSymbols
      checkForUpdatesAndNotify(downloadNotification) {
        return this.checkForUpdates().then((it) => {
          if (!(it === null || it === void 0 ? void 0 : it.downloadPromise)) {
            if (this._logger.debug != null) {
              this._logger.debug("checkForUpdatesAndNotify called, downloadPromise is null");
            }
            return it;
          }
          void it.downloadPromise.then(() => {
            const notificationContent = _AppUpdater.formatDownloadNotification(it.updateInfo.version, this.app.name, downloadNotification);
            new (require("electron")).Notification(notificationContent).show();
          });
          return it;
        });
      }
      static formatDownloadNotification(version, appName, downloadNotification) {
        if (downloadNotification == null) {
          downloadNotification = {
            title: "A new update is ready to install",
            body: `{appName} version {version} has been downloaded and will be automatically installed on exit`
          };
        }
        downloadNotification = {
          title: downloadNotification.title.replace("{appName}", appName).replace("{version}", version),
          body: downloadNotification.body.replace("{appName}", appName).replace("{version}", version)
        };
        return downloadNotification;
      }
      async isStagingMatch(updateInfo) {
        const rawStagingPercentage = updateInfo.stagingPercentage;
        let stagingPercentage = rawStagingPercentage;
        if (stagingPercentage == null) {
          return true;
        }
        stagingPercentage = parseInt(stagingPercentage, 10);
        if (isNaN(stagingPercentage)) {
          this._logger.warn(`Staging percentage is NaN: ${rawStagingPercentage}`);
          return true;
        }
        stagingPercentage = stagingPercentage / 100;
        const stagingUserId = await this.stagingUserIdPromise.value;
        const val = builder_util_runtime_1.UUID.parse(stagingUserId).readUInt32BE(12);
        const percentage = val / 4294967295;
        this._logger.info(`Staging percentage: ${stagingPercentage}, percentage: ${percentage}, user id: ${stagingUserId}`);
        return percentage < stagingPercentage;
      }
      computeFinalHeaders(headers) {
        if (this.requestHeaders != null) {
          Object.assign(headers, this.requestHeaders);
        }
        return headers;
      }
      async isUpdateAvailable(updateInfo) {
        const latestVersion = (0, semver_1.parse)(updateInfo.version);
        if (latestVersion == null) {
          throw (0, builder_util_runtime_1.newError)(`This file could not be downloaded, or the latest version (from update server) does not have a valid semver version: "${updateInfo.version}"`, "ERR_UPDATER_INVALID_VERSION");
        }
        const currentVersion = this.currentVersion;
        if ((0, semver_1.eq)(latestVersion, currentVersion)) {
          return false;
        }
        if (!await Promise.resolve(this.isUpdateSupported(updateInfo))) {
          return false;
        }
        const isUserWithinRollout = await Promise.resolve(this.isUserWithinRollout(updateInfo));
        if (!isUserWithinRollout) {
          return false;
        }
        const isLatestVersionNewer = (0, semver_1.gt)(latestVersion, currentVersion);
        const isLatestVersionOlder = (0, semver_1.lt)(latestVersion, currentVersion);
        if (isLatestVersionNewer) {
          return true;
        }
        return this.allowDowngrade && isLatestVersionOlder;
      }
      checkIfUpdateSupported(updateInfo) {
        const minimumSystemVersion = updateInfo === null || updateInfo === void 0 ? void 0 : updateInfo.minimumSystemVersion;
        const currentOSVersion = (0, os_1.release)();
        if (minimumSystemVersion) {
          try {
            if ((0, semver_1.lt)(currentOSVersion, minimumSystemVersion)) {
              this._logger.info(`Current OS version ${currentOSVersion} is less than the minimum OS version required ${minimumSystemVersion} for version ${currentOSVersion}`);
              return false;
            }
          } catch (e) {
            this._logger.warn(`Failed to compare current OS version(${currentOSVersion}) with minimum OS version(${minimumSystemVersion}): ${(e.message || e).toString()}`);
          }
        }
        return true;
      }
      async getUpdateInfoAndProvider() {
        await this.app.whenReady();
        if (this.clientPromise == null) {
          this.clientPromise = this.configOnDisk.value.then((it) => (0, providerFactory_1.createClient)(it, this, this.createProviderRuntimeOptions()));
        }
        const client = await this.clientPromise;
        const stagingUserId = await this.stagingUserIdPromise.value;
        client.setRequestHeaders(this.computeFinalHeaders({ "x-user-staging-id": stagingUserId }));
        return {
          info: await client.getLatestVersion(),
          provider: client
        };
      }
      createProviderRuntimeOptions() {
        return {
          isUseMultipleRangeRequest: true,
          platform: this._testOnlyOptions == null ? process.platform : this._testOnlyOptions.platform,
          executor: this.httpExecutor
        };
      }
      async doCheckForUpdates() {
        this.emit("checking-for-update");
        const result = await this.getUpdateInfoAndProvider();
        const updateInfo = result.info;
        if (!await this.isUpdateAvailable(updateInfo)) {
          this._logger.info(`Update for version ${this.currentVersion.format()} is not available (latest version: ${updateInfo.version}, downgrade is ${this.allowDowngrade ? "allowed" : "disallowed"}).`);
          this.emit("update-not-available", updateInfo);
          return {
            isUpdateAvailable: false,
            versionInfo: updateInfo,
            updateInfo
          };
        }
        this.updateInfoAndProvider = result;
        this.onUpdateAvailable(updateInfo);
        const cancellationToken = new builder_util_runtime_1.CancellationToken();
        return {
          isUpdateAvailable: true,
          versionInfo: updateInfo,
          updateInfo,
          cancellationToken,
          downloadPromise: this.autoDownload ? this.downloadUpdate(cancellationToken) : null
        };
      }
      onUpdateAvailable(updateInfo) {
        this._logger.info(`Found version ${updateInfo.version} (url: ${(0, builder_util_runtime_1.asArray)(updateInfo.files).map((it) => it.url).join(", ")})`);
        this.emit("update-available", updateInfo);
      }
      /**
       * Start downloading update manually. You can use this method if `autoDownload` option is set to `false`.
       * @returns {Promise<Array<string>>} Paths to downloaded files.
       */
      downloadUpdate(cancellationToken = new builder_util_runtime_1.CancellationToken()) {
        const updateInfoAndProvider = this.updateInfoAndProvider;
        if (updateInfoAndProvider == null) {
          const error = new Error("Please check update first");
          this.dispatchError(error);
          return Promise.reject(error);
        }
        if (this.downloadPromise != null) {
          this._logger.info("Downloading update (already in progress)");
          return this.downloadPromise.then(toDownloadedFilesArray);
        }
        this._logger.info(`Downloading update from ${(0, builder_util_runtime_1.asArray)(updateInfoAndProvider.info.files).map((it) => it.url).join(", ")}`);
        const errorHandler = (e) => {
          if (!(e instanceof builder_util_runtime_1.CancellationError)) {
            try {
              this.dispatchError(e);
            } catch (nestedError) {
              this._logger.warn(`Cannot dispatch error event: ${nestedError.stack || nestedError}`);
            }
          }
          return e;
        };
        this.downloadPromise = this.doDownloadUpdate({
          updateInfoAndProvider,
          requestHeaders: this.computeRequestHeaders(updateInfoAndProvider.provider),
          cancellationToken,
          disableWebInstaller: this.disableWebInstaller,
          disableDifferentialDownload: this.disableDifferentialDownload
        }).catch((e) => {
          throw errorHandler(e);
        }).finally(() => {
          this.downloadPromise = null;
        });
        return this.downloadPromise.then(toDownloadedFilesArray);
      }
      dispatchError(e) {
        this.emit("error", e, (e.stack || e).toString());
      }
      dispatchUpdateDownloaded(event) {
        this.emit(types_1.UPDATE_DOWNLOADED, event);
      }
      async loadUpdateConfig() {
        if (this._appUpdateConfigPath == null) {
          this._appUpdateConfigPath = this.app.appUpdateConfigPath;
        }
        return (0, js_yaml_1.load)(await (0, fs_extra_1.readFile)(this._appUpdateConfigPath, "utf-8"));
      }
      computeRequestHeaders(provider) {
        const fileExtraDownloadHeaders = provider.fileExtraDownloadHeaders;
        if (fileExtraDownloadHeaders != null) {
          const requestHeaders = this.requestHeaders;
          return requestHeaders == null ? fileExtraDownloadHeaders : {
            ...fileExtraDownloadHeaders,
            ...requestHeaders
          };
        }
        return this.computeFinalHeaders({ accept: "*/*" });
      }
      async getOrCreateStagingUserId() {
        const file = path3.join(this.app.userDataPath, ".updaterId");
        try {
          const id2 = await (0, fs_extra_1.readFile)(file, "utf-8");
          if (builder_util_runtime_1.UUID.check(id2)) {
            return id2;
          } else {
            this._logger.warn(`Staging user id file exists, but content was invalid: ${id2}`);
          }
        } catch (e) {
          if (e.code !== "ENOENT") {
            this._logger.warn(`Couldn't read staging user ID, creating a blank one: ${e}`);
          }
        }
        const id = builder_util_runtime_1.UUID.v5((0, crypto_1.randomBytes)(4096), builder_util_runtime_1.UUID.OID);
        this._logger.info(`Generated new staging user ID: ${id}`);
        try {
          await (0, fs_extra_1.outputFile)(file, id);
        } catch (e) {
          this._logger.warn(`Couldn't write out staging user ID: ${e}`);
        }
        return id;
      }
      /** @internal */
      get isAddNoCacheQuery() {
        const headers = this.requestHeaders;
        if (headers == null) {
          return true;
        }
        for (const headerName of Object.keys(headers)) {
          const s = headerName.toLowerCase();
          if (s === "authorization" || s === "private-token") {
            return false;
          }
        }
        return true;
      }
      async getOrCreateDownloadHelper() {
        let result = this.downloadedUpdateHelper;
        if (result == null) {
          const dirName = (await this.configOnDisk.value).updaterCacheDirName;
          const logger = this._logger;
          if (dirName == null) {
            logger.error("updaterCacheDirName is not specified in app-update.yml Was app build using at least electron-builder 20.34.0?");
          }
          const cacheDir = path3.join(this.app.baseCachePath, dirName || this.app.name);
          if (logger.debug != null) {
            logger.debug(`updater cache dir: ${cacheDir}`);
          }
          result = new DownloadedUpdateHelper_1.DownloadedUpdateHelper(cacheDir);
          this.downloadedUpdateHelper = result;
        }
        return result;
      }
      async executeDownload(taskOptions) {
        const fileInfo = taskOptions.fileInfo;
        const downloadOptions = {
          headers: taskOptions.downloadUpdateOptions.requestHeaders,
          cancellationToken: taskOptions.downloadUpdateOptions.cancellationToken,
          sha2: fileInfo.info.sha2,
          sha512: fileInfo.info.sha512
        };
        if (this.listenerCount(types_1.DOWNLOAD_PROGRESS) > 0) {
          downloadOptions.onProgress = (it) => this.emit(types_1.DOWNLOAD_PROGRESS, it);
        }
        const updateInfo = taskOptions.downloadUpdateOptions.updateInfoAndProvider.info;
        const version = updateInfo.version;
        const packageInfo = fileInfo.packageInfo;
        function getCacheUpdateFileName() {
          const urlPath = decodeURIComponent(taskOptions.fileInfo.url.pathname);
          if (urlPath.toLowerCase().endsWith(`.${taskOptions.fileExtension.toLowerCase()}`)) {
            return path3.basename(urlPath);
          } else {
            return path3.basename(taskOptions.fileInfo.info.url);
          }
        }
        const downloadedUpdateHelper = await this.getOrCreateDownloadHelper();
        const cacheDir = downloadedUpdateHelper.cacheDirForPendingUpdate;
        await (0, fs_extra_1.mkdir)(cacheDir, { recursive: true });
        const updateFileName = getCacheUpdateFileName();
        let updateFile = path3.join(cacheDir, updateFileName);
        const packageFile = packageInfo == null ? null : path3.join(cacheDir, `package-${version}${path3.extname(packageInfo.path) || ".7z"}`);
        const pendingBlockMapFile = path3.join(cacheDir, "current.blockmap");
        const cachedBlockMapFile = path3.join(downloadedUpdateHelper.cacheDir, "current.blockmap");
        const done = async (isSaveCache) => {
          await downloadedUpdateHelper.setDownloadedFile(updateFile, packageFile, updateInfo, fileInfo, updateFileName, isSaveCache);
          await taskOptions.done({
            ...updateInfo,
            downloadedFile: updateFile
          });
          if (await (0, fs_extra_1.pathExists)(pendingBlockMapFile)) {
            await (0, fs_extra_1.copyFile)(pendingBlockMapFile, cachedBlockMapFile);
          } else if (!taskOptions.downloadUpdateOptions.disableDifferentialDownload) {
            await (0, fs_extra_1.remove)(cachedBlockMapFile);
          }
          return packageFile == null ? { updateFile } : { updateFile, packageFile };
        };
        const log = this._logger;
        const cachedUpdateFile = await downloadedUpdateHelper.validateDownloadedPath(updateFile, updateInfo, fileInfo, log);
        if (cachedUpdateFile != null) {
          updateFile = cachedUpdateFile;
          return await done(false);
        }
        const removeFileIfAny = async () => {
          await downloadedUpdateHelper.clear().catch(() => {
          });
          return await (0, fs_extra_1.unlink)(updateFile).catch(() => {
          });
        };
        await (0, fs_extra_1.remove)(pendingBlockMapFile);
        const tempUpdateFile = await (0, DownloadedUpdateHelper_1.createTempUpdateFile)(`temp-${updateFileName}`, cacheDir, log);
        try {
          await taskOptions.task(tempUpdateFile, downloadOptions, packageFile, removeFileIfAny);
          await (0, builder_util_runtime_1.retry)(() => (0, fs_extra_1.rename)(tempUpdateFile, updateFile), {
            retries: 60,
            interval: 500,
            shouldRetry: (error) => {
              if (error instanceof Error && /^EBUSY:/.test(error.message)) {
                return true;
              }
              log.warn(`Cannot rename temp file to final file: ${error.message || error.stack}`);
              return false;
            }
          });
        } catch (e) {
          await removeFileIfAny();
          if (e instanceof builder_util_runtime_1.CancellationError) {
            log.info("cancelled");
            this.emit("update-cancelled", updateInfo);
          } else if (e.code === "ERR_CHECKSUM_MISMATCH") {
            log.warn(`sha512 checksum mismatch after full download of ${updateFileName}: the downloaded file is corrupted or the published update metadata does not match the uploaded file`);
          }
          throw e;
        }
        log.info(`New version ${version} has been downloaded to ${updateFile}`);
        return await done(true);
      }
      async differentialDownloadInstaller(fileInfo, downloadUpdateOptions, installerPath, provider, oldInstallerFileName) {
        let isOldBlockMapFromCache = false;
        try {
          if (this._testOnlyOptions != null && !this._testOnlyOptions.isUseDifferentialDownload) {
            return true;
          }
          const provider2 = downloadUpdateOptions.updateInfoAndProvider.provider;
          const blockmapFileUrls = await provider2.getBlockMapFiles(fileInfo.url, this.app.version, downloadUpdateOptions.updateInfoAndProvider.info.version, this.previousBlockmapBaseUrlOverride);
          this._logger.info(`Download block maps (old: "${blockmapFileUrls[0]}", new: ${blockmapFileUrls[1]})`);
          const downloadBlockMap = async (url) => {
            const data = await this.httpExecutor.downloadToBuffer(url, {
              headers: downloadUpdateOptions.requestHeaders,
              cancellationToken: downloadUpdateOptions.cancellationToken
            });
            if (data == null || data.length === 0) {
              throw new Error(`Blockmap "${url.href}" is empty`);
            }
            try {
              return JSON.parse((0, zlib_1.gunzipSync)(data).toString());
            } catch (e) {
              throw new Error(`Cannot parse blockmap "${url.href}", error: ${e}`);
            }
          };
          const downloadOptions = {
            newUrl: fileInfo.url,
            oldFile: path3.join(this.downloadedUpdateHelper.cacheDir, oldInstallerFileName),
            logger: this._logger,
            newFile: installerPath,
            isUseMultipleRangeRequest: provider2.isUseMultipleRangeRequest,
            requestHeaders: downloadUpdateOptions.requestHeaders,
            cancellationToken: downloadUpdateOptions.cancellationToken
          };
          if (this.listenerCount(types_1.DOWNLOAD_PROGRESS) > 0) {
            downloadOptions.onProgress = (it) => this.emit(types_1.DOWNLOAD_PROGRESS, it);
          }
          const saveBlockMapToCacheDir = async (blockMapData, cacheDir) => {
            const blockMapFile = path3.join(cacheDir, "current.blockmap");
            await (0, fs_extra_1.outputFile)(blockMapFile, (0, zlib_1.gzipSync)(JSON.stringify(blockMapData)));
          };
          const getBlockMapFromCacheDir = async (cacheDir) => {
            const blockMapFile = path3.join(cacheDir, "current.blockmap");
            try {
              if (await (0, fs_extra_1.pathExists)(blockMapFile)) {
                return JSON.parse((0, zlib_1.gunzipSync)(await (0, fs_extra_1.readFile)(blockMapFile)).toString());
              }
            } catch (e) {
              this._logger.warn(`Cannot parse blockmap "${blockMapFile}", error: ${e}`);
            }
            return null;
          };
          const newBlockMapData = await downloadBlockMap(blockmapFileUrls[1]);
          await saveBlockMapToCacheDir(newBlockMapData, this.downloadedUpdateHelper.cacheDirForPendingUpdate);
          let oldBlockMapData = await getBlockMapFromCacheDir(this.downloadedUpdateHelper.cacheDir);
          isOldBlockMapFromCache = oldBlockMapData != null;
          if (oldBlockMapData == null) {
            this._logger.info(`No cached blockmap for the old installer, downloading it from "${blockmapFileUrls[0]}"`);
            oldBlockMapData = await downloadBlockMap(blockmapFileUrls[0]);
          }
          await new GenericDifferentialDownloader_1.GenericDifferentialDownloader(fileInfo.info, this.httpExecutor, downloadOptions).download(oldBlockMapData, newBlockMapData);
          return false;
        } catch (e) {
          if (e.code === "ERR_CHECKSUM_MISMATCH") {
            this._logger.warn(`sha512 checksum mismatch after differential download (old blockmap ${isOldBlockMapFromCache ? "was read from the local cache" : "was downloaded from the server"}): cached "${oldInstallerFileName}" is likely out of sync with the old blockmap, e.g. because one of them was replaced or evicted independently of the other`);
          }
          this._logger.error(`Cannot download differentially, fallback to full download: ${e.stack || e}`);
          if (this._testOnlyOptions != null) {
            throw e;
          }
          return true;
        }
      }
    };
    exports2.AppUpdater = AppUpdater;
    function hasPrereleaseComponents(version) {
      const versionPrereleaseComponent = (0, semver_1.prerelease)(version);
      return versionPrereleaseComponent != null && versionPrereleaseComponent.length > 0;
    }
    var NoOpLogger = class {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      info(message) {
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      warn(message) {
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      error(message) {
      }
    };
    exports2.NoOpLogger = NoOpLogger;
    function toDownloadedFilesArray({ updateFile, packageFile }) {
      return packageFile == null ? [updateFile] : [updateFile, packageFile];
    }
  }
});

// node_modules/electron-updater/out/BaseUpdater.js
var require_BaseUpdater = __commonJS({
  "node_modules/electron-updater/out/BaseUpdater.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.BaseUpdater = void 0;
    var child_process_1 = require("child_process");
    var path3 = require("path");
    var AppUpdater_1 = require_AppUpdater();
    var BaseUpdater = class extends AppUpdater_1.AppUpdater {
      constructor(options, app2) {
        super(options, app2);
        this.quitAndInstallCalled = false;
        this.quitHandlerAdded = false;
      }
      quitAndInstall(isSilent = false, isForceRunAfter = false) {
        this._logger.info(`Install on explicit quitAndInstall`);
        const isInstalled = this.install(isSilent, isSilent ? isForceRunAfter : this.autoRunAppAfterInstall);
        if (isInstalled) {
          setImmediate(() => {
            require("electron").autoUpdater.emit("before-quit-for-update");
            this.app.quit();
          });
        } else {
          this.quitAndInstallCalled = false;
        }
      }
      executeDownload(taskOptions) {
        return super.executeDownload({
          ...taskOptions,
          done: (event) => {
            this.dispatchUpdateDownloaded(event);
            this.addQuitHandler();
            return Promise.resolve();
          }
        });
      }
      get installerPath() {
        return this.downloadedUpdateHelper == null ? null : this.downloadedUpdateHelper.file;
      }
      // must be sync (because quit even handler is not async)
      install(isSilent = false, isForceRunAfter = false) {
        if (this.quitAndInstallCalled) {
          this._logger.warn("install call ignored: quitAndInstallCalled is set to true");
          return false;
        }
        const downloadedUpdateHelper = this.downloadedUpdateHelper;
        const installerPath = this.installerPath;
        const downloadedFileInfo = downloadedUpdateHelper == null ? null : downloadedUpdateHelper.downloadedFileInfo;
        if (installerPath == null || downloadedFileInfo == null) {
          this.dispatchError(new Error("No update filepath provided, can't quit and install"));
          return false;
        }
        this.quitAndInstallCalled = true;
        try {
          this._logger.info(`Install: isSilent: ${isSilent}, isForceRunAfter: ${isForceRunAfter}`);
          return this.doInstall({
            isSilent,
            isForceRunAfter,
            isAdminRightsRequired: downloadedFileInfo.isAdminRightsRequired
          });
        } catch (e) {
          this.dispatchError(e);
          return false;
        }
      }
      addQuitHandler() {
        if (this.quitHandlerAdded || !this.autoInstallOnAppQuit) {
          return;
        }
        this.quitHandlerAdded = true;
        this.app.onQuit((exitCode) => {
          if (this.quitAndInstallCalled) {
            this._logger.info("Update installer has already been triggered. Quitting application.");
            return;
          }
          if (!this.autoInstallOnAppQuit) {
            this._logger.info("Update will not be installed on quit because autoInstallOnAppQuit is set to false.");
            return;
          }
          if (exitCode !== 0) {
            this._logger.info(`Update will be not installed on quit because application is quitting with exit code ${exitCode}`);
            return;
          }
          this._logger.info("Auto install update on quit");
          this.install(true, false);
        });
      }
      /**
       * Strips relative-path entries from a PATH string.
       * Prevents PATH-poisoning where a writable directory earlier in PATH shadows
       * a trusted package manager binary.
       */
      sanitizeEnvPath(envPath) {
        return envPath.split(path3.delimiter).filter((dir) => path3.isAbsolute(dir)).join(path3.delimiter);
      }
      spawnSyncLog(cmd, args = [], env = {}) {
        var _a;
        this._logger.info(`Executing: ${cmd} with args: ${args}`);
        const mergedEnv = { ...process.env, ...env };
        const response = (0, child_process_1.spawnSync)(cmd, args, {
          env: { ...mergedEnv, PATH: this.sanitizeEnvPath((_a = mergedEnv.PATH) !== null && _a !== void 0 ? _a : "") },
          encoding: "utf-8",
          shell: true
        });
        const { error, status, stdout, stderr } = response;
        if (error != null) {
          this._logger.error(stderr);
          throw error;
        } else if (status != null && status !== 0) {
          this._logger.error(stderr);
          throw new Error(`Command ${cmd} exited with code ${status}`);
        }
        return stdout.trim();
      }
      /**
       * This handles both node 8 and node 10 way of emitting error when spawning a process
       *   - node 8: Throws the error
       *   - node 10: Emit the error(Need to listen with on)
       */
      // https://github.com/electron-userland/electron-builder/issues/1129
      // Node 8 sends errors: https://nodejs.org/dist/latest-v8.x/docs/api/errors.html#errors_common_system_errors
      async spawnLog(cmd, args = [], env = void 0, stdio = "ignore") {
        this._logger.info(`Executing: ${cmd} with args: ${args}`);
        return new Promise((resolve6, reject) => {
          try {
            const params = { stdio, env, detached: true };
            const p = (0, child_process_1.spawn)(cmd, args, params);
            p.on("error", (error) => {
              reject(error);
            });
            p.unref();
            if (p.pid !== void 0) {
              resolve6(true);
            }
          } catch (error) {
            reject(error);
          }
        });
      }
    };
    exports2.BaseUpdater = BaseUpdater;
  }
});

// node_modules/electron-updater/out/differentialDownloader/FileWithEmbeddedBlockMapDifferentialDownloader.js
var require_FileWithEmbeddedBlockMapDifferentialDownloader = __commonJS({
  "node_modules/electron-updater/out/differentialDownloader/FileWithEmbeddedBlockMapDifferentialDownloader.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.FileWithEmbeddedBlockMapDifferentialDownloader = void 0;
    var fs_extra_1 = require_lib();
    var DifferentialDownloader_1 = require_DifferentialDownloader();
    var zlib_1 = require("zlib");
    var FileWithEmbeddedBlockMapDifferentialDownloader = class extends DifferentialDownloader_1.DifferentialDownloader {
      async download() {
        const packageInfo = this.blockAwareFileInfo;
        const fileSize = packageInfo.size;
        const offset = fileSize - (packageInfo.blockMapSize + 4);
        this.fileMetadataBuffer = await this.readRemoteBytes(offset, fileSize - 1);
        const newBlockMap = readBlockMap(this.fileMetadataBuffer.slice(0, this.fileMetadataBuffer.length - 4));
        await this.doDownload(await readEmbeddedBlockMapData(this.options.oldFile), newBlockMap);
      }
    };
    exports2.FileWithEmbeddedBlockMapDifferentialDownloader = FileWithEmbeddedBlockMapDifferentialDownloader;
    function readBlockMap(data) {
      return JSON.parse((0, zlib_1.inflateRawSync)(data).toString());
    }
    async function readEmbeddedBlockMapData(file) {
      const fd = await (0, fs_extra_1.open)(file, "r");
      try {
        const fileSize = (await (0, fs_extra_1.fstat)(fd)).size;
        const sizeBuffer = Buffer.allocUnsafe(4);
        await (0, fs_extra_1.read)(fd, sizeBuffer, 0, sizeBuffer.length, fileSize - sizeBuffer.length);
        const dataBuffer = Buffer.allocUnsafe(sizeBuffer.readUInt32BE(0));
        await (0, fs_extra_1.read)(fd, dataBuffer, 0, dataBuffer.length, fileSize - sizeBuffer.length - dataBuffer.length);
        await (0, fs_extra_1.close)(fd);
        return readBlockMap(dataBuffer);
      } catch (e) {
        await (0, fs_extra_1.close)(fd);
        throw e;
      }
    }
  }
});

// node_modules/electron-updater/out/AppImageUpdater.js
var require_AppImageUpdater = __commonJS({
  "node_modules/electron-updater/out/AppImageUpdater.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.AppImageUpdater = void 0;
    var builder_util_runtime_1 = require_out();
    var child_process_1 = require("child_process");
    var fs_extra_1 = require_lib();
    var fs_1 = require("fs");
    var path3 = require("path");
    var BaseUpdater_1 = require_BaseUpdater();
    var FileWithEmbeddedBlockMapDifferentialDownloader_1 = require_FileWithEmbeddedBlockMapDifferentialDownloader();
    var Provider_1 = require_Provider();
    var types_1 = require_types();
    var AppImageUpdater = class extends BaseUpdater_1.BaseUpdater {
      constructor(options, app2) {
        super(options, app2);
      }
      isUpdaterActive() {
        if (process.env["APPIMAGE"] == null && !this.forceDevUpdateConfig) {
          if (process.env["SNAP"] == null) {
            this._logger.warn("APPIMAGE env is not defined, current application is not an AppImage");
          } else {
            this._logger.info("SNAP env is defined, updater is disabled");
          }
          return false;
        }
        return super.isUpdaterActive();
      }
      /*** @private */
      doDownloadUpdate(downloadUpdateOptions) {
        const provider = downloadUpdateOptions.updateInfoAndProvider.provider;
        const fileInfo = (0, Provider_1.findFile)(provider.resolveFiles(downloadUpdateOptions.updateInfoAndProvider.info), "AppImage", ["rpm", "deb", "pacman"]);
        return this.executeDownload({
          fileExtension: "AppImage",
          fileInfo,
          downloadUpdateOptions,
          task: async (updateFile, downloadOptions) => {
            const oldFile = process.env["APPIMAGE"];
            if (oldFile == null) {
              throw (0, builder_util_runtime_1.newError)("APPIMAGE env is not defined", "ERR_UPDATER_OLD_FILE_NOT_FOUND");
            }
            if (downloadUpdateOptions.disableDifferentialDownload || await this.downloadDifferential(fileInfo, oldFile, updateFile, provider, downloadUpdateOptions)) {
              await this.httpExecutor.download(fileInfo.url, updateFile, downloadOptions);
            }
            await (0, fs_extra_1.chmod)(updateFile, 493);
          }
        });
      }
      async downloadDifferential(fileInfo, oldFile, updateFile, provider, downloadUpdateOptions) {
        try {
          const downloadOptions = {
            newUrl: fileInfo.url,
            oldFile,
            logger: this._logger,
            newFile: updateFile,
            isUseMultipleRangeRequest: provider.isUseMultipleRangeRequest,
            requestHeaders: downloadUpdateOptions.requestHeaders,
            cancellationToken: downloadUpdateOptions.cancellationToken
          };
          if (this.listenerCount(types_1.DOWNLOAD_PROGRESS) > 0) {
            downloadOptions.onProgress = (it) => this.emit(types_1.DOWNLOAD_PROGRESS, it);
          }
          await new FileWithEmbeddedBlockMapDifferentialDownloader_1.FileWithEmbeddedBlockMapDifferentialDownloader(fileInfo.info, this.httpExecutor, downloadOptions).download();
          return false;
        } catch (e) {
          this._logger.error(`Cannot download differentially, fallback to full download: ${e.stack || e}`);
          return process.platform === "linux";
        }
      }
      doInstall(options) {
        const appImageFile = process.env["APPIMAGE"];
        if (appImageFile == null) {
          throw (0, builder_util_runtime_1.newError)("APPIMAGE env is not defined", "ERR_UPDATER_OLD_FILE_NOT_FOUND");
        }
        if (!path3.isAbsolute(appImageFile) || appImageFile.includes("\0")) {
          throw (0, builder_util_runtime_1.newError)(`APPIMAGE env is not a valid absolute path: "${appImageFile}"`, "ERR_UPDATER_OLD_FILE_NOT_FOUND");
        }
        (0, fs_1.unlinkSync)(appImageFile);
        let destination;
        const existingBaseName = path3.basename(appImageFile);
        const installerPath = this.installerPath;
        if (installerPath == null) {
          this.dispatchError(new Error("No update filepath provided, can't quit and install"));
          return false;
        }
        if (path3.basename(installerPath) === existingBaseName || !/\d+\.\d+\.\d+/.test(existingBaseName)) {
          destination = appImageFile;
        } else {
          destination = path3.join(path3.dirname(appImageFile), path3.basename(installerPath));
        }
        (0, child_process_1.execFileSync)("mv", ["-f", installerPath, destination]);
        if (destination !== appImageFile) {
          this.emit("appimage-filename-updated", destination);
        }
        const env = {
          ...process.env,
          APPIMAGE_SILENT_INSTALL: "true"
        };
        if (options.isForceRunAfter) {
          this.spawnLog(destination, [], env);
        } else {
          env.APPIMAGE_EXIT_AFTER_INSTALL = "true";
          (0, child_process_1.execFileSync)(destination, [], { env });
        }
        return true;
      }
    };
    exports2.AppImageUpdater = AppImageUpdater;
  }
});

// node_modules/electron-updater/out/LinuxUpdater.js
var require_LinuxUpdater = __commonJS({
  "node_modules/electron-updater/out/LinuxUpdater.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.LinuxUpdater = void 0;
    var BaseUpdater_1 = require_BaseUpdater();
    var SAFE_PM_REGEX = /^[a-zA-Z0-9_-]+$/;
    var LinuxUpdater = class extends BaseUpdater_1.BaseUpdater {
      constructor(options, app2) {
        super(options, app2);
      }
      /**
       * Returns true if the current process is running as root.
       */
      isRunningAsRoot() {
        var _a;
        return ((_a = process.getuid) === null || _a === void 0 ? void 0 : _a.call(process)) === 0;
      }
      /**
       * Sanitizes the installer path for use with shell:true spawn calls.
       * Backslash-escapes metacharacters that have special meaning in POSIX shell.
       * Note: paths containing single-quotes (') are not supported.
       */
      get installerPath() {
        const raw = super.installerPath;
        if (raw == null) {
          return null;
        }
        return raw.replace(/\\/g, "\\\\").replace(/([`$!" ;|&()<>])/g, "\\$1").replace(/[\n\r]/g, "");
      }
      runCommandWithSudoIfNeeded(commandWithArgs) {
        if (this.isRunningAsRoot()) {
          this._logger.info("Running as root, no need to use sudo");
          return this.spawnSyncLog(commandWithArgs[0], commandWithArgs.slice(1));
        }
        const { name } = this.app;
        const safeName = name.replace(/["`$\\!\n\r;|&<>(){}*?[\]#~]/g, "");
        const installComment = `"${safeName} would like to update"`;
        const sudo = this.sudoWithArgs(installComment);
        this._logger.info(`Running as non-root user, using sudo to install: ${sudo}`);
        let wrapper = `"`;
        if (/pkexec/i.test(sudo[0]) || sudo[0] === "sudo") {
          wrapper = "";
        }
        return this.spawnSyncLog(sudo[0], [...sudo.length > 1 ? sudo.slice(1) : [], `${wrapper}/bin/bash`, "-c", `'${commandWithArgs.join(" ")}'${wrapper}`]);
      }
      sudoWithArgs(installComment) {
        const sudo = this.determineSudoCommand();
        const command = [sudo];
        if (/kdesudo/i.test(sudo)) {
          command.push("--comment", installComment);
          command.push("-c");
        } else if (/gksudo/i.test(sudo)) {
          command.push("--message", installComment);
        } else if (/pkexec/i.test(sudo)) {
          command.push("--disable-internal-agent");
        }
        return command;
      }
      hasCommand(cmd) {
        try {
          this.spawnSyncLog(`command`, ["-v", cmd]);
          return true;
        } catch {
          return false;
        }
      }
      determineSudoCommand() {
        const sudos = ["gksudo", "kdesudo", "pkexec", "beesu"];
        for (const sudo of sudos) {
          if (this.hasCommand(sudo)) {
            return sudo;
          }
        }
        return "sudo";
      }
      /**
       * Detects the package manager to use based on the available commands.
       * Allows overriding the default behavior by setting the ELECTRON_BUILDER_LINUX_PACKAGE_MANAGER environment variable.
       * If the environment variable is set, it will be used directly. (This is useful for testing each package manager logic path.)
       * Otherwise, it checks for the presence of the specified package manager commands in the order provided.
       * @param pms - An array of package manager commands to check for, in priority order.
       * @returns The detected package manager command or "unknown" if none are found.
       */
      detectPackageManager(pms) {
        var _a;
        let availablePMs = pms;
        const pmOverride = (_a = process.env.ELECTRON_BUILDER_LINUX_PACKAGE_MANAGER) === null || _a === void 0 ? void 0 : _a.trim();
        if (pmOverride) {
          if (!SAFE_PM_REGEX.test(pmOverride)) {
            this._logger.warn(`ELECTRON_BUILDER_LINUX_PACKAGE_MANAGER "${pmOverride}" contains unsafe characters. Ignoring override.`);
          } else {
            availablePMs = [pmOverride];
          }
        }
        for (const pm of availablePMs) {
          if (this.hasCommand(pm)) {
            return pm;
          }
        }
        const searchList = pmOverride ? `ELECTRON_BUILDER_LINUX_PACKAGE_MANAGER override "${pmOverride}", ` : "";
        const defaultPM = pms[0];
        this._logger.warn(`No package manager found in the list: ${searchList}${pms.join(", ")}. Utilizing default: ${defaultPM}`);
        return defaultPM;
      }
    };
    exports2.LinuxUpdater = LinuxUpdater;
  }
});

// node_modules/electron-updater/out/DebUpdater.js
var require_DebUpdater = __commonJS({
  "node_modules/electron-updater/out/DebUpdater.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.DebUpdater = void 0;
    var Provider_1 = require_Provider();
    var types_1 = require_types();
    var LinuxUpdater_1 = require_LinuxUpdater();
    var DebUpdater = class _DebUpdater extends LinuxUpdater_1.LinuxUpdater {
      constructor(options, app2) {
        super(options, app2);
      }
      /*** @private */
      doDownloadUpdate(downloadUpdateOptions) {
        const provider = downloadUpdateOptions.updateInfoAndProvider.provider;
        const fileInfo = (0, Provider_1.findFile)(provider.resolveFiles(downloadUpdateOptions.updateInfoAndProvider.info), "deb", ["AppImage", "rpm", "pacman"]);
        return this.executeDownload({
          fileExtension: "deb",
          fileInfo,
          downloadUpdateOptions,
          task: async (updateFile, downloadOptions) => {
            if (this.listenerCount(types_1.DOWNLOAD_PROGRESS) > 0) {
              downloadOptions.onProgress = (it) => this.emit(types_1.DOWNLOAD_PROGRESS, it);
            }
            await this.httpExecutor.download(fileInfo.url, updateFile, downloadOptions);
          }
        });
      }
      doInstall(options) {
        const installerPath = this.installerPath;
        if (installerPath == null) {
          this.dispatchError(new Error("No update filepath provided, can't quit and install"));
          return false;
        }
        if (!this.hasCommand("dpkg") && !this.hasCommand("apt")) {
          this.dispatchError(new Error("Neither dpkg nor apt command found. Cannot install .deb package."));
          return false;
        }
        const priorityList = ["dpkg", "apt"];
        const packageManager = this.detectPackageManager(priorityList);
        try {
          _DebUpdater.installWithCommandRunner(packageManager, installerPath, this.runCommandWithSudoIfNeeded.bind(this), this._logger);
        } catch (error) {
          this.dispatchError(error);
          return false;
        }
        if (options.isForceRunAfter) {
          this.app.relaunch();
        }
        return true;
      }
      static installWithCommandRunner(packageManager, installerPath, commandRunner, logger) {
        var _a;
        if (packageManager === "dpkg") {
          try {
            commandRunner(["dpkg", "-i", installerPath]);
          } catch (error) {
            logger.warn((_a = error.message) !== null && _a !== void 0 ? _a : error);
            logger.warn("dpkg installation failed, trying to fix broken dependencies with apt-get");
            commandRunner(["apt-get", "install", "-f", "-y"]);
          }
        } else if (packageManager === "apt") {
          logger.warn("Using apt to install a local .deb. This may fail for unsigned packages unless properly configured.");
          commandRunner([
            "apt",
            "install",
            "-y",
            "--allow-unauthenticated",
            // needed for unsigned .debs
            "--allow-downgrades",
            // allow lower version installs
            "--allow-change-held-packages",
            installerPath
          ]);
        } else {
          throw new Error(`Package manager ${packageManager} not supported`);
        }
      }
    };
    exports2.DebUpdater = DebUpdater;
  }
});

// node_modules/electron-updater/out/PacmanUpdater.js
var require_PacmanUpdater = __commonJS({
  "node_modules/electron-updater/out/PacmanUpdater.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.PacmanUpdater = void 0;
    var types_1 = require_types();
    var Provider_1 = require_Provider();
    var LinuxUpdater_1 = require_LinuxUpdater();
    var PacmanUpdater = class _PacmanUpdater extends LinuxUpdater_1.LinuxUpdater {
      constructor(options, app2) {
        super(options, app2);
      }
      /*** @private */
      doDownloadUpdate(downloadUpdateOptions) {
        const provider = downloadUpdateOptions.updateInfoAndProvider.provider;
        const fileInfo = (0, Provider_1.findFile)(provider.resolveFiles(downloadUpdateOptions.updateInfoAndProvider.info), "pacman", ["AppImage", "deb", "rpm"]);
        return this.executeDownload({
          fileExtension: "pacman",
          fileInfo,
          downloadUpdateOptions,
          task: async (updateFile, downloadOptions) => {
            if (this.listenerCount(types_1.DOWNLOAD_PROGRESS) > 0) {
              downloadOptions.onProgress = (it) => this.emit(types_1.DOWNLOAD_PROGRESS, it);
            }
            await this.httpExecutor.download(fileInfo.url, updateFile, downloadOptions);
          }
        });
      }
      doInstall(options) {
        const installerPath = this.installerPath;
        if (installerPath == null) {
          this.dispatchError(new Error("No update filepath provided, can't quit and install"));
          return false;
        }
        try {
          _PacmanUpdater.installWithCommandRunner(installerPath, this.runCommandWithSudoIfNeeded.bind(this), this._logger);
        } catch (error) {
          this.dispatchError(error);
          return false;
        }
        if (options.isForceRunAfter) {
          this.app.relaunch();
        }
        return true;
      }
      static installWithCommandRunner(installerPath, commandRunner, logger) {
        var _a;
        try {
          commandRunner(["pacman", "-U", "--noconfirm", installerPath]);
        } catch (error) {
          logger.warn((_a = error.message) !== null && _a !== void 0 ? _a : error);
          logger.warn("pacman installation failed, attempting to update package database and retry");
          try {
            commandRunner(["pacman", "-Sy", "--noconfirm"]);
            commandRunner(["pacman", "-U", "--noconfirm", installerPath]);
          } catch (retryError) {
            logger.error("Retry after pacman -Sy failed");
            throw retryError;
          }
        }
      }
    };
    exports2.PacmanUpdater = PacmanUpdater;
  }
});

// node_modules/electron-updater/out/RpmUpdater.js
var require_RpmUpdater = __commonJS({
  "node_modules/electron-updater/out/RpmUpdater.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.RpmUpdater = void 0;
    var types_1 = require_types();
    var Provider_1 = require_Provider();
    var LinuxUpdater_1 = require_LinuxUpdater();
    var RpmUpdater = class _RpmUpdater extends LinuxUpdater_1.LinuxUpdater {
      constructor(options, app2) {
        super(options, app2);
      }
      /*** @private */
      doDownloadUpdate(downloadUpdateOptions) {
        const provider = downloadUpdateOptions.updateInfoAndProvider.provider;
        const fileInfo = (0, Provider_1.findFile)(provider.resolveFiles(downloadUpdateOptions.updateInfoAndProvider.info), "rpm", ["AppImage", "deb", "pacman"]);
        return this.executeDownload({
          fileExtension: "rpm",
          fileInfo,
          downloadUpdateOptions,
          task: async (updateFile, downloadOptions) => {
            if (this.listenerCount(types_1.DOWNLOAD_PROGRESS) > 0) {
              downloadOptions.onProgress = (it) => this.emit(types_1.DOWNLOAD_PROGRESS, it);
            }
            await this.httpExecutor.download(fileInfo.url, updateFile, downloadOptions);
          }
        });
      }
      doInstall(options) {
        const installerPath = this.installerPath;
        if (installerPath == null) {
          this.dispatchError(new Error("No update filepath provided, can't quit and install"));
          return false;
        }
        const priorityList = ["zypper", "dnf", "yum", "rpm"];
        const packageManager = this.detectPackageManager(priorityList);
        try {
          _RpmUpdater.installWithCommandRunner(packageManager, installerPath, this.runCommandWithSudoIfNeeded.bind(this), this._logger);
        } catch (error) {
          this.dispatchError(error);
          return false;
        }
        if (options.isForceRunAfter) {
          this.app.relaunch();
        }
        return true;
      }
      static installWithCommandRunner(packageManager, installerPath, commandRunner, logger) {
        if (packageManager === "zypper") {
          return commandRunner(["zypper", "--non-interactive", "--no-refresh", "install", "--allow-unsigned-rpm", "-f", installerPath]);
        }
        if (packageManager === "dnf") {
          return commandRunner(["dnf", "install", "--nogpgcheck", "-y", installerPath]);
        }
        if (packageManager === "yum") {
          return commandRunner(["yum", "install", "--nogpgcheck", "-y", installerPath]);
        }
        if (packageManager === "rpm") {
          logger.warn("Installing with rpm only (no dependency resolution).");
          return commandRunner(["rpm", "-Uvh", "--replacepkgs", "--replacefiles", "--nodeps", installerPath]);
        }
        throw new Error(`Package manager ${packageManager} not supported`);
      }
    };
    exports2.RpmUpdater = RpmUpdater;
  }
});

// node_modules/electron-updater/out/MacUpdater.js
var require_MacUpdater = __commonJS({
  "node_modules/electron-updater/out/MacUpdater.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.MacUpdater = void 0;
    var builder_util_runtime_1 = require_out();
    var fs_extra_1 = require_lib();
    var fs_1 = require("fs");
    var path3 = require("path");
    var http_1 = require("http");
    var AppUpdater_1 = require_AppUpdater();
    var Provider_1 = require_Provider();
    var child_process_1 = require("child_process");
    var crypto_1 = require("crypto");
    var MacUpdater = class _MacUpdater extends AppUpdater_1.AppUpdater {
      constructor(options, app2) {
        super(options, app2);
        this.nativeUpdater = require("electron").autoUpdater;
        this.squirrelDownloadedUpdate = false;
        this.nativeUpdater.on("error", (it) => {
          this._logger.warn(it);
          this.emit("error", it);
        });
        this.nativeUpdater.on("update-downloaded", () => {
          this.squirrelDownloadedUpdate = true;
          this.debug("nativeUpdater.update-downloaded");
        });
      }
      /** Filters update files to the appropriate architecture.
       * On arm64 Macs (including Rosetta), arm64 files are preferred when available.
       * On x64 Macs, arm64 files are excluded. */
      static filterFilesForArch(files, isArm64Mac) {
        const isArm64File = (file) => {
          var _a;
          return file.url.pathname.includes("arm64") || ((_a = file.info.url) === null || _a === void 0 ? void 0 : _a.includes("arm64"));
        };
        if (isArm64Mac && files.some(isArm64File)) {
          return files.filter((file) => isArm64Mac === isArm64File(file));
        }
        return files.filter((file) => !isArm64File(file));
      }
      debug(message) {
        if (this._logger.debug != null) {
          this._logger.debug(message);
        }
      }
      closeServerIfExists() {
        if (this.server) {
          this.debug("Closing proxy server");
          this.server.close((err) => {
            if (err) {
              this.debug("proxy server wasn't already open, probably attempted closing again as a safety check before quit");
            }
          });
        }
      }
      async doDownloadUpdate(downloadUpdateOptions) {
        let files = downloadUpdateOptions.updateInfoAndProvider.provider.resolveFiles(downloadUpdateOptions.updateInfoAndProvider.info);
        const log = this._logger;
        const sysctlRosettaInfoKey = "sysctl.proc_translated";
        let isRosetta = false;
        try {
          this.debug("Checking for macOS Rosetta environment");
          const result = (0, child_process_1.execFileSync)("sysctl", [sysctlRosettaInfoKey], { encoding: "utf8" });
          isRosetta = result.includes(`${sysctlRosettaInfoKey}: 1`);
          log.info(`Checked for macOS Rosetta environment (isRosetta=${isRosetta})`);
        } catch (e) {
          log.warn(`sysctl shell command to check for macOS Rosetta environment failed: ${e}`);
        }
        let isArm64Mac = false;
        try {
          this.debug("Checking for arm64 in uname");
          const result = (0, child_process_1.execFileSync)("uname", ["-a"], { encoding: "utf8" });
          const isArm = result.includes("ARM");
          log.info(`Checked 'uname -a': arm64=${isArm}`);
          isArm64Mac = isArm64Mac || isArm;
        } catch (e) {
          log.warn(`uname shell command to check for arm64 failed: ${e}`);
        }
        isArm64Mac = isArm64Mac || process.arch === "arm64" || isRosetta;
        files = _MacUpdater.filterFilesForArch(files, isArm64Mac);
        const zipFileInfo = (0, Provider_1.findFile)(files, "zip", ["pkg", "dmg"]);
        if (zipFileInfo == null) {
          throw (0, builder_util_runtime_1.newError)(`ZIP file not provided: ${(0, builder_util_runtime_1.safeStringifyJson)(files)}`, "ERR_UPDATER_ZIP_FILE_NOT_FOUND");
        }
        const provider = downloadUpdateOptions.updateInfoAndProvider.provider;
        const CURRENT_MAC_APP_ZIP_FILE_NAME = "update.zip";
        return this.executeDownload({
          fileExtension: "zip",
          fileInfo: zipFileInfo,
          downloadUpdateOptions,
          task: async (destinationFile, downloadOptions) => {
            const cachedUpdateFilePath = path3.join(this.downloadedUpdateHelper.cacheDir, CURRENT_MAC_APP_ZIP_FILE_NAME);
            const canDifferentialDownload = () => {
              if (!(0, fs_extra_1.pathExistsSync)(cachedUpdateFilePath)) {
                log.info("Unable to locate previous update.zip for differential download (is this first install?), falling back to full download");
                return false;
              }
              return !downloadUpdateOptions.disableDifferentialDownload;
            };
            let differentialDownloadFailed = true;
            if (canDifferentialDownload()) {
              differentialDownloadFailed = await this.differentialDownloadInstaller(zipFileInfo, downloadUpdateOptions, destinationFile, provider, CURRENT_MAC_APP_ZIP_FILE_NAME);
            }
            if (differentialDownloadFailed) {
              await this.httpExecutor.download(zipFileInfo.url, destinationFile, downloadOptions);
            }
          },
          done: async (event) => {
            if (!downloadUpdateOptions.disableDifferentialDownload) {
              try {
                const cachedUpdateFilePath = path3.join(this.downloadedUpdateHelper.cacheDir, CURRENT_MAC_APP_ZIP_FILE_NAME);
                await (0, fs_extra_1.copyFile)(event.downloadedFile, cachedUpdateFilePath);
              } catch (error) {
                this._logger.warn(`Unable to copy file for caching for future differential downloads: ${error.message}`);
              }
            }
            return this.updateDownloaded(zipFileInfo, event);
          }
        });
      }
      async updateDownloaded(zipFileInfo, event) {
        var _a;
        const downloadedFile = event.downloadedFile;
        const updateFileSize = (_a = zipFileInfo.info.size) !== null && _a !== void 0 ? _a : (await (0, fs_extra_1.stat)(downloadedFile)).size;
        const log = this._logger;
        const logContext = `fileToProxy=${zipFileInfo.url.href}`;
        this.closeServerIfExists();
        this.debug(`Creating proxy server for native Squirrel.Mac (${logContext})`);
        this.server = (0, http_1.createServer)();
        this.debug(`Proxy server for native Squirrel.Mac is created (${logContext})`);
        this.server.on("close", () => {
          log.info(`Proxy server for native Squirrel.Mac is closed (${logContext})`);
        });
        const getServerUrl = (s) => {
          const address = s.address();
          if (typeof address === "string") {
            return address;
          }
          return `http://127.0.0.1:${address === null || address === void 0 ? void 0 : address.port}`;
        };
        return await new Promise((resolve6, reject) => {
          const pass = (0, crypto_1.randomBytes)(64).toString("base64").replace(/\//g, "_").replace(/\+/g, "-");
          const authInfo = Buffer.from(`autoupdater:${pass}`, "ascii");
          const fileUrl = `/${(0, crypto_1.randomBytes)(64).toString("hex")}.zip`;
          this.server.on("request", (request, response) => {
            const requestUrl = request.url;
            log.info(`${requestUrl} requested`);
            if (requestUrl === "/") {
              if (!request.headers.authorization || request.headers.authorization.indexOf("Basic ") === -1) {
                response.statusCode = 401;
                response.statusMessage = "Invalid Authentication Credentials";
                response.end();
                log.warn("No authenthication info");
                return;
              }
              const base64Credentials = request.headers.authorization.split(" ")[1];
              const credentials = Buffer.from(base64Credentials, "base64").toString("ascii");
              const [username, password] = credentials.split(":");
              if (username !== "autoupdater" || password !== pass) {
                response.statusCode = 401;
                response.statusMessage = "Invalid Authentication Credentials";
                response.end();
                log.warn("Invalid authenthication credentials");
                return;
              }
              const data = Buffer.from(`{ "url": "${getServerUrl(this.server)}${fileUrl}" }`);
              response.writeHead(200, { "Content-Type": "application/json", "Content-Length": data.length });
              response.end(data);
              return;
            }
            if (!requestUrl.startsWith(fileUrl)) {
              log.warn(`${requestUrl} requested, but not supported`);
              response.writeHead(404);
              response.end();
              return;
            }
            log.info(`${fileUrl} requested by Squirrel.Mac, pipe ${downloadedFile}`);
            let errorOccurred = false;
            response.on("finish", () => {
              if (!errorOccurred) {
                this.nativeUpdater.removeListener("error", reject);
                resolve6([]);
              }
            });
            const readStream = (0, fs_1.createReadStream)(downloadedFile);
            readStream.on("error", (error) => {
              try {
                response.end();
              } catch (e) {
                log.warn(`cannot end response: ${e}`);
              }
              errorOccurred = true;
              this.nativeUpdater.removeListener("error", reject);
              reject(new Error(`Cannot pipe "${downloadedFile}": ${error}`));
            });
            response.writeHead(200, {
              "Content-Type": "application/zip",
              "Content-Length": updateFileSize
            });
            readStream.pipe(response);
          });
          this.debug(`Proxy server for native Squirrel.Mac is starting to listen (${logContext})`);
          this.server.listen(0, "127.0.0.1", () => {
            this.debug(`Proxy server for native Squirrel.Mac is listening (address=${getServerUrl(this.server)}, ${logContext})`);
            this.nativeUpdater.setFeedURL({
              url: getServerUrl(this.server),
              headers: {
                "Cache-Control": "no-cache",
                Authorization: `Basic ${authInfo.toString("base64")}`
              }
            });
            this.dispatchUpdateDownloaded(event);
            if (this.autoInstallOnAppQuit) {
              this.nativeUpdater.once("error", reject);
              this.nativeUpdater.checkForUpdates();
            } else {
              resolve6([]);
            }
          });
        });
      }
      handleUpdateDownloaded() {
        if (this.autoRunAppAfterInstall) {
          this.nativeUpdater.quitAndInstall();
        } else {
          this.app.quit();
        }
        this.closeServerIfExists();
      }
      quitAndInstall() {
        if (this.squirrelDownloadedUpdate) {
          this.handleUpdateDownloaded();
        } else {
          this.nativeUpdater.on("update-downloaded", () => this.handleUpdateDownloaded());
          if (!this.autoInstallOnAppQuit) {
            this.nativeUpdater.checkForUpdates();
          }
        }
      }
    };
    exports2.MacUpdater = MacUpdater;
  }
});

// node_modules/electron-updater/out/windowsExecutableCodeSignatureVerifier.js
var require_windowsExecutableCodeSignatureVerifier = __commonJS({
  "node_modules/electron-updater/out/windowsExecutableCodeSignatureVerifier.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.verifySignature = verifySignature;
    var builder_util_runtime_1 = require_out();
    var child_process_1 = require("child_process");
    var os3 = require("os");
    var path3 = require("path");
    function preparePowerShellExec(command, timeout) {
      const executable = `set "PSModulePath=" & chcp 65001 >NUL & powershell.exe`;
      const args = ["-NoProfile", "-NonInteractive", "-InputFormat", "None", "-Command", command];
      const options = {
        shell: true,
        timeout
      };
      return [executable, args, options];
    }
    function verifySignature(publisherNames, unescapedTempUpdateFile, logger) {
      return new Promise((resolve6, reject) => {
        const tempUpdateFile = unescapedTempUpdateFile.replace(/'/g, "''");
        logger.info(`Verifying signature ${tempUpdateFile}`);
        (0, child_process_1.execFile)(...preparePowerShellExec(`"Get-AuthenticodeSignature -LiteralPath '${tempUpdateFile}' | ConvertTo-Json -Compress"`, 20 * 1e3), (error, stdout, stderr) => {
          var _a;
          try {
            if (error != null || stderr) {
              handleError(logger, error, stderr, reject);
              resolve6(null);
              return;
            }
            const data = parseOut(stdout);
            if (data.Status === 0) {
              try {
                const normlaizedUpdateFilePath = path3.normalize(data.Path);
                const normalizedTempUpdateFile = path3.normalize(unescapedTempUpdateFile);
                logger.info(`LiteralPath: ${normlaizedUpdateFilePath}. Update Path: ${normalizedTempUpdateFile}`);
                if (normlaizedUpdateFilePath !== normalizedTempUpdateFile) {
                  handleError(logger, new Error(`LiteralPath of ${normlaizedUpdateFilePath} is different than ${normalizedTempUpdateFile}`), stderr, reject);
                  resolve6(null);
                  return;
                }
              } catch (error2) {
                logger.warn(`Unable to verify LiteralPath of update asset due to missing data.Path. Skipping this step of validation. Message: ${(_a = error2.message) !== null && _a !== void 0 ? _a : error2.stack}`);
              }
              const subject = (0, builder_util_runtime_1.parseDn)(data.SignerCertificate.Subject);
              let match = false;
              for (const name of publisherNames) {
                const dn = (0, builder_util_runtime_1.parseDn)(name);
                if (dn.size) {
                  const allKeys = Array.from(dn.keys());
                  match = allKeys.every((key) => {
                    return dn.get(key) === subject.get(key);
                  });
                } else if (name === subject.get("CN")) {
                  logger.warn(`Signature validated using only CN ${name}. Please add your full Distinguished Name (DN) to publisherNames configuration`);
                  match = true;
                }
                if (match) {
                  resolve6(null);
                  return;
                }
              }
            }
            const result = `publisherNames: ${publisherNames.join(" | ")}, raw info: ` + JSON.stringify(data, (name, value) => name === "RawData" ? void 0 : value, 2);
            logger.warn(`Sign verification failed, installer signed with incorrect certificate: ${result}`);
            resolve6(result);
          } catch (e) {
            handleError(logger, e, null, reject);
            resolve6(null);
            return;
          }
        });
      });
    }
    function parseOut(out) {
      const data = JSON.parse(out);
      delete data.PrivateKey;
      delete data.IsOSBinary;
      delete data.SignatureType;
      const signerCertificate = data.SignerCertificate;
      if (signerCertificate != null) {
        delete signerCertificate.Archived;
        delete signerCertificate.Extensions;
        delete signerCertificate.Handle;
        delete signerCertificate.HasPrivateKey;
        delete signerCertificate.SubjectName;
      }
      return data;
    }
    function handleError(logger, error, stderr, reject) {
      if (isOldWin6()) {
        logger.warn(`Cannot execute Get-AuthenticodeSignature: ${error || stderr}. Ignoring signature validation due to unsupported powershell version. Please upgrade to powershell 3 or higher.`);
        return;
      }
      try {
        (0, child_process_1.execFileSync)(...preparePowerShellExec("ConvertTo-Json test", 10 * 1e3));
      } catch (testError) {
        logger.warn(`Cannot execute ConvertTo-Json: ${testError.message}. Ignoring signature validation due to unsupported powershell version. Please upgrade to powershell 3 or higher.`);
        return;
      }
      if (error != null) {
        reject(error);
      }
      if (stderr) {
        reject(new Error(`Cannot execute Get-AuthenticodeSignature, stderr: ${stderr}. Failing signature validation due to unknown stderr.`));
      }
    }
    function isOldWin6() {
      const winVersion = os3.release();
      return winVersion.startsWith("6.") && !winVersion.startsWith("6.3");
    }
  }
});

// node_modules/electron-updater/out/NsisUpdater.js
var require_NsisUpdater = __commonJS({
  "node_modules/electron-updater/out/NsisUpdater.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.NsisUpdater = void 0;
    var builder_util_runtime_1 = require_out();
    var path3 = require("path");
    var BaseUpdater_1 = require_BaseUpdater();
    var FileWithEmbeddedBlockMapDifferentialDownloader_1 = require_FileWithEmbeddedBlockMapDifferentialDownloader();
    var types_1 = require_types();
    var Provider_1 = require_Provider();
    var fs_extra_1 = require_lib();
    var windowsExecutableCodeSignatureVerifier_1 = require_windowsExecutableCodeSignatureVerifier();
    var url_1 = require("url");
    var NsisUpdater = class extends BaseUpdater_1.BaseUpdater {
      constructor(options, app2) {
        super(options, app2);
        this._verifyUpdateCodeSignature = (publisherNames, unescapedTempUpdateFile) => (0, windowsExecutableCodeSignatureVerifier_1.verifySignature)(publisherNames, unescapedTempUpdateFile, this._logger);
      }
      /**
       * The verifyUpdateCodeSignature. You can pass [win-verify-signature](https://github.com/beyondkmp/win-verify-trust) or another custom verify function: ` (publisherName: string[], path: string) => Promise<string | null>`.
       * The default verify function uses [windowsExecutableCodeSignatureVerifier](https://github.com/electron-userland/electron-builder/blob/master/packages/electron-updater/src/windowsExecutableCodeSignatureVerifier.ts)
       */
      get verifyUpdateCodeSignature() {
        return this._verifyUpdateCodeSignature;
      }
      set verifyUpdateCodeSignature(value) {
        if (value) {
          this._verifyUpdateCodeSignature = value;
        }
      }
      /*** @private */
      doDownloadUpdate(downloadUpdateOptions) {
        const provider = downloadUpdateOptions.updateInfoAndProvider.provider;
        const fileInfo = (0, Provider_1.findFile)(provider.resolveFiles(downloadUpdateOptions.updateInfoAndProvider.info), "exe");
        return this.executeDownload({
          fileExtension: "exe",
          downloadUpdateOptions,
          fileInfo,
          task: async (destinationFile, downloadOptions, packageFile, removeTempDirIfAny) => {
            const packageInfo = fileInfo.packageInfo;
            const isWebInstaller = packageInfo != null && packageFile != null;
            if (isWebInstaller && downloadUpdateOptions.disableWebInstaller) {
              throw (0, builder_util_runtime_1.newError)(`Unable to download new version ${downloadUpdateOptions.updateInfoAndProvider.info.version}. Web Installers are disabled`, "ERR_UPDATER_WEB_INSTALLER_DISABLED");
            }
            if (!isWebInstaller && !downloadUpdateOptions.disableWebInstaller) {
              this._logger.warn("disableWebInstaller is set to false, you should set it to true if you do not plan on using a web installer. This will default to true in a future version.");
            }
            if (isWebInstaller || downloadUpdateOptions.disableDifferentialDownload || await this.differentialDownloadInstaller(fileInfo, downloadUpdateOptions, destinationFile, provider, builder_util_runtime_1.CURRENT_APP_INSTALLER_FILE_NAME)) {
              await this.httpExecutor.download(fileInfo.url, destinationFile, downloadOptions);
            }
            const signatureVerificationStatus = await this.verifySignature(destinationFile);
            if (signatureVerificationStatus != null) {
              await removeTempDirIfAny();
              throw (0, builder_util_runtime_1.newError)(`New version ${downloadUpdateOptions.updateInfoAndProvider.info.version} is not signed by the application owner: ${signatureVerificationStatus}`, "ERR_UPDATER_INVALID_SIGNATURE");
            }
            if (isWebInstaller) {
              if (await this.differentialDownloadWebPackage(downloadUpdateOptions, packageInfo, packageFile, provider)) {
                try {
                  await this.httpExecutor.download(new url_1.URL(packageInfo.path), packageFile, {
                    headers: downloadUpdateOptions.requestHeaders,
                    cancellationToken: downloadUpdateOptions.cancellationToken,
                    sha512: packageInfo.sha512
                  });
                } catch (e) {
                  try {
                    await (0, fs_extra_1.unlink)(packageFile);
                  } catch (_ignored) {
                  }
                  throw e;
                }
              }
            }
          }
        });
      }
      // $certificateInfo = (Get-AuthenticodeSignature 'xxx\yyy.exe'
      // | where {$_.Status.Equals([System.Management.Automation.SignatureStatus]::Valid) -and $_.SignerCertificate.Subject.Contains("CN=siemens.com")})
      // | Out-String ; if ($certificateInfo) { exit 0 } else { exit 1 }
      async verifySignature(tempUpdateFile) {
        let publisherName;
        try {
          publisherName = (await this.configOnDisk.value).publisherName;
          if (publisherName == null) {
            return null;
          }
        } catch (e) {
          if (e.code === "ENOENT") {
            return null;
          }
          throw e;
        }
        return await this._verifyUpdateCodeSignature(Array.isArray(publisherName) ? publisherName : [publisherName], tempUpdateFile);
      }
      doInstall(options) {
        const installerPath = this.installerPath;
        if (installerPath == null) {
          this.dispatchError(new Error("No update filepath provided, can't quit and install"));
          return false;
        }
        const args = ["--updated"];
        if (options.isSilent) {
          args.push("/S");
        }
        if (options.isForceRunAfter) {
          args.push("--force-run");
        }
        if (this.installDirectory) {
          args.push(`/D=${this.installDirectory}`);
        }
        const packagePath = this.downloadedUpdateHelper == null ? null : this.downloadedUpdateHelper.packageFile;
        if (packagePath != null) {
          args.push(`--package-file=${packagePath}`);
        }
        const callUsingElevation = () => {
          this.spawnLog(path3.join(process.resourcesPath, "elevate.exe"), [installerPath].concat(args)).catch((e) => this.dispatchError(e));
        };
        if (options.isAdminRightsRequired) {
          this._logger.info("isAdminRightsRequired is set to true, run installer using elevate.exe");
          callUsingElevation();
          return true;
        }
        this.spawnLog(installerPath, args).catch((e) => {
          const errorCode2 = e.code;
          this._logger.info(`Cannot run installer: error code: ${errorCode2}, error message: "${e.message}", will be executed again using elevate if EACCES, and will try to use electron.shell.openItem if ENOENT`);
          if (errorCode2 === "UNKNOWN" || errorCode2 === "EACCES") {
            callUsingElevation();
          } else if (errorCode2 === "ENOENT") {
            require("electron").shell.openPath(installerPath).catch((err) => this.dispatchError(err));
          } else {
            this.dispatchError(e);
          }
        });
        return true;
      }
      async differentialDownloadWebPackage(downloadUpdateOptions, packageInfo, packagePath, provider) {
        if (packageInfo.blockMapSize == null) {
          return true;
        }
        try {
          const downloadOptions = {
            newUrl: new url_1.URL(packageInfo.path),
            oldFile: path3.join(this.downloadedUpdateHelper.cacheDir, builder_util_runtime_1.CURRENT_APP_PACKAGE_FILE_NAME),
            logger: this._logger,
            newFile: packagePath,
            requestHeaders: this.requestHeaders,
            isUseMultipleRangeRequest: provider.isUseMultipleRangeRequest,
            cancellationToken: downloadUpdateOptions.cancellationToken
          };
          if (this.listenerCount(types_1.DOWNLOAD_PROGRESS) > 0) {
            downloadOptions.onProgress = (it) => this.emit(types_1.DOWNLOAD_PROGRESS, it);
          }
          await new FileWithEmbeddedBlockMapDifferentialDownloader_1.FileWithEmbeddedBlockMapDifferentialDownloader(packageInfo, this.httpExecutor, downloadOptions).download();
        } catch (e) {
          this._logger.error(`Cannot download differentially, fallback to full download: ${e.stack || e}`);
          return process.platform === "win32";
        }
        return false;
      }
    };
    exports2.NsisUpdater = NsisUpdater;
  }
});

// node_modules/electron-updater/out/main.js
var require_main2 = __commonJS({
  "node_modules/electron-updater/out/main.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = exports2 && exports2.__exportStar || function(m, exports3) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports3, p)) __createBinding(exports3, m, p);
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.NsisUpdater = exports2.MacUpdater = exports2.RpmUpdater = exports2.PacmanUpdater = exports2.DebUpdater = exports2.AppImageUpdater = exports2.Provider = exports2.NoOpLogger = exports2.AppUpdater = exports2.BaseUpdater = void 0;
    var fs_extra_1 = require_lib();
    var path3 = require("path");
    var BaseUpdater_1 = require_BaseUpdater();
    Object.defineProperty(exports2, "BaseUpdater", { enumerable: true, get: function() {
      return BaseUpdater_1.BaseUpdater;
    } });
    var AppUpdater_1 = require_AppUpdater();
    Object.defineProperty(exports2, "AppUpdater", { enumerable: true, get: function() {
      return AppUpdater_1.AppUpdater;
    } });
    Object.defineProperty(exports2, "NoOpLogger", { enumerable: true, get: function() {
      return AppUpdater_1.NoOpLogger;
    } });
    var Provider_1 = require_Provider();
    Object.defineProperty(exports2, "Provider", { enumerable: true, get: function() {
      return Provider_1.Provider;
    } });
    var AppImageUpdater_1 = require_AppImageUpdater();
    Object.defineProperty(exports2, "AppImageUpdater", { enumerable: true, get: function() {
      return AppImageUpdater_1.AppImageUpdater;
    } });
    var DebUpdater_1 = require_DebUpdater();
    Object.defineProperty(exports2, "DebUpdater", { enumerable: true, get: function() {
      return DebUpdater_1.DebUpdater;
    } });
    var PacmanUpdater_1 = require_PacmanUpdater();
    Object.defineProperty(exports2, "PacmanUpdater", { enumerable: true, get: function() {
      return PacmanUpdater_1.PacmanUpdater;
    } });
    var RpmUpdater_1 = require_RpmUpdater();
    Object.defineProperty(exports2, "RpmUpdater", { enumerable: true, get: function() {
      return RpmUpdater_1.RpmUpdater;
    } });
    var MacUpdater_1 = require_MacUpdater();
    Object.defineProperty(exports2, "MacUpdater", { enumerable: true, get: function() {
      return MacUpdater_1.MacUpdater;
    } });
    var NsisUpdater_1 = require_NsisUpdater();
    Object.defineProperty(exports2, "NsisUpdater", { enumerable: true, get: function() {
      return NsisUpdater_1.NsisUpdater;
    } });
    __exportStar(require_types(), exports2);
    var _autoUpdater;
    function doLoadAutoUpdater() {
      if (process.platform === "win32") {
        _autoUpdater = new (require_NsisUpdater()).NsisUpdater();
      } else if (process.platform === "darwin") {
        _autoUpdater = new (require_MacUpdater()).MacUpdater();
      } else {
        _autoUpdater = new (require_AppImageUpdater()).AppImageUpdater();
        try {
          const identity = path3.join(process.resourcesPath, "package-type");
          if (!(0, fs_extra_1.existsSync)(identity)) {
            return _autoUpdater;
          }
          const fileType = (0, fs_extra_1.readFileSync)(identity).toString().trim();
          switch (fileType) {
            case "deb":
              _autoUpdater = new (require_DebUpdater()).DebUpdater();
              break;
            case "rpm":
              _autoUpdater = new (require_RpmUpdater()).RpmUpdater();
              break;
            case "pacman":
              _autoUpdater = new (require_PacmanUpdater()).PacmanUpdater();
              break;
            default:
              break;
          }
        } catch (error) {
          console.warn("Unable to detect 'package-type' for autoUpdater (rpm/deb/pacman support). If you'd like to expand support, please consider contributing to electron-builder", error.message);
        }
      }
      return _autoUpdater;
    }
    Object.defineProperty(exports2, "autoUpdater", {
      enumerable: true,
      get: () => {
        return _autoUpdater || doLoadAutoUpdater();
      }
    });
  }
});

// electron/main.ts
var import_electron = require("electron");
var import_electron_updater = __toESM(require_main2(), 1);
var import_fs2 = __toESM(require("fs"), 1);
var import_os2 = __toESM(require("os"), 1);
var import_path2 = __toESM(require("path"), 1);

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
function withinWindow(fact, trigger, window2) {
  return fact?.observedAt !== void 0 && trigger.observedAt >= fact.observedAt && trigger.observedAt - fact.observedAt <= window2;
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

// src/lib/vocabLogic.ts
var REVIEW_INTERVAL_STEPS = [1, 3, 7, 14];
function normalizeWordKey(word) {
  return word.trim().toLowerCase().replace(/\s+/g, " ");
}
function normalizeSubject(subject) {
  const trimmed = subject?.trim();
  return trimmed ? trimmed : "\u672A\u5206\u7C7B";
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
        source: item.source ?? "Agent",
        subject: item.subject ?? "\u672A\u5206\u7C7B"
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
    "# Joel Study Hub \u5355\u8BCD\u5E93",
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
var AGENT_GUIDE_CONTENT = `# Joel Study Hub \u2014 AI Agent Integration Guide

Joel Study Hub is a blank, local-first Windows desktop study client designed to be populated directly by your local AI Agent.
**You (the AI Agent) interact with Joel Study Hub exclusively through local files in the data directory.**
There is no preset content, no login, no cloud database, and no HTTP API required on Windows. The app watches this directory in real time (\`chokidar\`) and refreshes the UI automatically.

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
  "subject": "<any subject or course name>",
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
      "hint": "<optional hint shown when clicking Hint>",
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
- \`subject\`: Any subject/course string defined by the Agent (defaults to \`"\u672A\u5206\u7C7B"\` if omitted). Subject filter tabs in the UI appear dynamically based on the subjects actually present in your files.
- \`pass_rate\`: Number 0\u2013100 (defaults to \`80\` if omitted).
- \`glossary\`: Optional key-value map of domain phrases (lowercase recommended). Click-to-translate prioritizes \`glossary\` with **longest-phrase match first**.
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
      "subject": "<any subject or course name>"
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
  "subject": "<any subject or course name>",
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
      "subject": "<any subject or course name>",
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
var updaterInitialized = false;
function getAutoUpdater() {
  return import_electron_updater.default.autoUpdater;
}
function readRepoUrlFromAppUpdateYml() {
  try {
    const resourcesPath = process.resourcesPath;
    if (!resourcesPath) return { hasConfig: false };
    const ymlPath = import_path2.default.join(resourcesPath, "app-update.yml");
    if (!import_fs2.default.existsSync(ymlPath)) return { hasConfig: false };
    const raw = import_fs2.default.readFileSync(ymlPath, "utf-8");
    const ownerMatch = raw.match(/^\s*owner:\s*['"]?([^\s'"#]+)['"]?/m);
    const repoMatch = raw.match(/^\s*repo:\s*['"]?([^\s'"#]+)['"]?/m);
    if (ownerMatch?.[1] && repoMatch?.[1]) {
      return {
        hasConfig: true,
        repoUrl: `https://github.com/${ownerMatch[1]}/${repoMatch[1]}/releases`
      };
    }
    return { hasConfig: true };
  } catch {
    return { hasConfig: false };
  }
}
var updateState = {
  currentVersion: "1.0.0",
  isPackaged: false,
  isPortable: false,
  supported: false,
  phase: "idle"
};
function emitUpdateState(patch) {
  updateState = { ...updateState, ...patch };
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("studyhub:update-status", updateState);
  }
  return updateState;
}
function initAutoUpdater() {
  if (updaterInitialized) return;
  updaterInitialized = true;
  const isPackaged = Boolean(import_electron.app.isPackaged);
  const isPortable = Boolean(process.env.PORTABLE_EXECUTABLE_FILE);
  const { hasConfig, repoUrl } = readRepoUrlFromAppUpdateYml();
  const supported = isPackaged && !isPortable && hasConfig;
  let unsupportedMsg;
  if (!isPackaged) {
    unsupportedMsg = "\u5F53\u524D\u4E3A\u5F00\u53D1\u6E90\u7801\u8FD0\u884C\u6A21\u5F0F\uFF1B\u901A\u8FC7 GitHub Releases \u5B89\u88C5 Windows \u5B89\u88C5\u7248\u540E\u5373\u53EF\u5728\u5E94\u7528\u5185\u4E00\u952E\u5347\u7EA7\u3002";
  } else if (isPortable) {
    unsupportedMsg = "\u4FBF\u643A\u7248\uFF08Portable\uFF09\u4E0D\u652F\u6301\u539F\u5730\u81EA\u52A8\u8986\u76D6\u5347\u7EA7\uFF0C\u8BF7\u4F7F\u7528\u5B89\u88C5\u7248\uFF08Setup.exe\uFF09\u6216\u524D\u5F80 GitHub Releases \u4E0B\u8F7D\u65B0\u7248\u3002";
  } else if (!hasConfig) {
    unsupportedMsg = "\u5F53\u524D\u5B89\u88C5\u5305\u672A\u5305\u542B GitHub Releases \u66F4\u65B0\u914D\u7F6E\uFF08app-update.yml\uFF09\uFF0C\u8BF7\u901A\u8FC7 GitHub Actions \u53D1\u5E03\u7684\u5B89\u88C5\u7248\u8FDB\u884C\u81EA\u52A8\u5347\u7EA7\u3002";
  }
  updateState = {
    currentVersion: import_electron.app.getVersion(),
    isPackaged,
    isPortable,
    supported,
    phase: supported ? "idle" : "unsupported",
    message: unsupportedMsg,
    repoUrl
  };
  if (!supported) return;
  const autoUpdater = getAutoUpdater();
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.disableWebInstaller = true;
  autoUpdater.on("checking-for-update", () => {
    emitUpdateState({
      phase: "checking",
      percent: void 0,
      transferred: void 0,
      total: void 0,
      bytesPerSecond: void 0,
      message: "\u6B63\u5728\u8FDE\u63A5 GitHub Releases \u68C0\u67E5\u6700\u65B0\u7248\u672C\u2026"
    });
  });
  autoUpdater.on("update-available", (info) => {
    emitUpdateState({
      phase: "available",
      latestVersion: info.version,
      message: `\u53D1\u73B0\u65B0\u7248\u672C v${info.version}\uFF0C\u70B9\u51FB\u4E0B\u65B9\u6309\u94AE\u5373\u53EF\u76F4\u63A5\u4E0B\u8F7D\u5E76\u5347\u7EA7\u3002`
    });
  });
  autoUpdater.on("update-not-available", (info) => {
    emitUpdateState({
      phase: "not-available",
      latestVersion: info.version,
      message: `\u5F53\u524D\u5DF2\u662F\u6700\u65B0\u7248\u672C (v${import_electron.app.getVersion()})\u3002`
    });
  });
  autoUpdater.on("download-progress", (progress) => {
    emitUpdateState({
      phase: "downloading",
      percent: Math.round(progress.percent),
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond,
      message: `\u6B63\u5728\u4E0B\u8F7D\u66F4\u65B0\u5305 (${Math.round(progress.percent)}%)\u2026`
    });
  });
  autoUpdater.on("update-downloaded", (info) => {
    emitUpdateState({
      phase: "downloaded",
      latestVersion: info.version,
      percent: 100,
      message: `v${info.version} \u5DF2\u4E0B\u8F7D\u5E76\u5B8C\u6210 SHA-512 \u6821\u9A8C\uFF0C\u70B9\u51FB\u300C\u7ACB\u5373\u91CD\u542F\u5E76\u5B89\u88C5\u300D\u5B8C\u6210\u5347\u7EA7\u3002`
    });
  });
  autoUpdater.on("error", (err) => {
    const rawMsg = err instanceof Error ? err.message : String(err);
    emitUpdateState({
      phase: "error",
      message: `\u68C0\u67E5\u6216\u4E0B\u8F7D\u66F4\u65B0\u5931\u8D25\uFF1A${rawMsg}`
    });
  });
}
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
  initAutoUpdater();
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
  import_electron.ipcMain.handle("studyhub:getUpdateState", () => updateState);
  import_electron.ipcMain.handle("studyhub:checkForUpdates", async () => {
    if (!updateState.supported) {
      return updateState;
    }
    if (updateState.phase === "checking" || updateState.phase === "downloading") {
      return updateState;
    }
    try {
      emitUpdateState({
        phase: "checking",
        message: "\u6B63\u5728\u8FDE\u63A5 GitHub Releases \u68C0\u67E5\u6700\u65B0\u7248\u672C\u2026"
      });
      await getAutoUpdater().checkForUpdates();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      emitUpdateState({ phase: "error", message: `\u68C0\u67E5\u66F4\u65B0\u5931\u8D25\uFF1A${msg}` });
    }
    return updateState;
  });
  import_electron.ipcMain.handle("studyhub:downloadUpdate", async () => {
    if (!updateState.supported) {
      return updateState;
    }
    if (updateState.phase === "downloading") {
      return updateState;
    }
    try {
      emitUpdateState({
        phase: "downloading",
        percent: 0,
        transferred: 0,
        total: 0,
        bytesPerSecond: 0,
        message: "\u6B63\u5728\u4ECE GitHub Releases \u4E0B\u8F7D\u66F4\u65B0\u5305\u2026"
      });
      await getAutoUpdater().downloadUpdate();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      emitUpdateState({ phase: "error", message: `\u4E0B\u8F7D\u66F4\u65B0\u5931\u8D25\uFF1A${msg}` });
    }
    return updateState;
  });
  import_electron.ipcMain.handle("studyhub:quitAndInstall", () => {
    if (!updateState.supported || updateState.phase !== "downloaded") {
      return { ok: false };
    }
    setImmediate(() => {
      getAutoUpdater().quitAndInstall(false, true);
    });
    return { ok: true };
  });
  import_electron.ipcMain.handle("studyhub:openReleasesPage", async () => {
    const url = updateState.repoUrl;
    if (!url || !url.startsWith("https://github.com/")) {
      return { ok: false, error: "\u672A\u914D\u7F6E GitHub Releases \u4ED3\u5E93\u5730\u5740" };
    }
    await import_electron.shell.openExternal(url);
    return { ok: true };
  });
}
async function createMainWindow() {
  mainWindow = new import_electron.BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: "Joel Study Hub",
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

sax/lib/sax.js:
  (*! http://mths.be/fromcodepoint v0.1.0 by @mathias *)

chokidar/index.js:
  (*! chokidar - MIT License (c) 2012 Paul Miller (paulmillr.com) *)
*/
