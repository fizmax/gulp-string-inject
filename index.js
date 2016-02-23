/**
 * Created by Oleg Galaburda on 23.02.16.
 */
var os = require('os');
var fs = require('fs');
var path = require('path');
var through = require('through2');
var async = require('async');
var vfs = require('vinyl-fs');
var uglify = require('gulp-uglify')();
var stripComments = require('gulp-strip-comments')();

const PLUGIN_NAME = 'gulp-string-inject';

var Mode = {
  DEFAULT: 'default',
  UGLIFY: 'uglify',
  STRIP_COMMENTS: 'stripComments'
};

function jobInitContent(content) {
  //console.log(' -- add jobInitContent');
  return function(callback) {
    //console.log(' -> exec jobInitContent');
    callback(null, content);
  };
}

function jobRead(filePath) {
  //console.log(' -- add jobRead');
  return function(content, callback) {
    //console.log(' -> exec jobRead');
    var data = fs.readFileSync(filePath, 'utf8');
    callback(null, content, data.toString('utf8'));
  }
}

function jobReadUglify(filePath) {
  //console.log(' -- add jobReadUglify');
  return function(content, callback) {
    //console.log(' -> exec jobReadUglify', os.tmpdir());
    vfs.src(filePath)
      .pipe(uglify)
      .pipe(vfs.dest(os.tmpdir()))
      .pipe(through.obj(function(file, enc, cb) {
        var data = file.contents.toString('utf8');
        //console.log('del tmp:', file.path);
        fs.unlink(file.path);
        callback(null, content, data);
        cb(null, file);
      }));
  }
}

function jobReadStripComments(filePath) {
  //console.log(' -- add jobReadStripComments');
  return function(content, callback) {
    //console.log(' -> exec jobReadStripComments');
    vfs.src(filePath)
      .pipe(stripComments)
      .pipe(vfs.dest(os.tmpdir()))
      .pipe(through.obj(function(file, enc, cb) {
        var data = file.contents.toString('utf8');
        //console.log('del tmp:', file.path);
        fs.unlink(file.path);
        callback(null, content, data);
        cb(null, file);
      }));
  }
}
function jobWriteContent(marker) {
  //console.log(' -- add jobWriteContent');
  return function(content, data, callback) {
    //console.log(' -> exec jobWriteContent');
    content = content.replace(marker, JSON.stringify(data));
    callback(null, content);
  };
}

function jobSaveContent(file) {
  //console.log(' -- add jobSaveContent');
  return function(content, callback) {
    //console.log(' -> exec jobSaveContent');
    file.contents = new Buffer(content, 'utf8');
    callback(null);
  };
}

function jobQuit(file, gulpCallback) {
  //console.log(' -- add jobQuit');
  return function(callback) {
    //console.log(' -> exec jobQuit');
    callback(null);
    gulpCallback(null, file);
  };
}

function gulpStringInject(mode) {

  return through.obj(function(file, enc, cb) {
    var list = null;
    if (file.isNull()) {
      // return empty file
      return cb(null, file);
    }
    var baseDir = path.dirname(file.path);
    var index = 0;
    var content = file.contents.toString('utf8');

    var jobs = [jobInitContent(content)];
    var rgx = /\{\$\=\s*([^\}]+)\}/g;
    while (list = rgx.exec(content)) {
      var filePath = baseDir + '/' + list[1];
      index = list.index;
      switch (mode) {
        case Mode.STRIP_COMMENTS:
          jobs.push(jobReadStripComments(filePath));
          break;
        case Mode.UGLIFY:
          jobs.push(jobReadUglify(filePath));
          break;
        default:
        case Mode.DEFAULT:
          jobs.push(jobRead(filePath));
          break;
      }
      jobs.push(jobWriteContent(list[0]));
      break;
    }
    jobs.push(jobSaveContent(file));
    jobs.push(jobQuit(file, cb));
    async.waterfall(jobs);
  });

}

gulpStringInject.DEFAULT = Mode.DEFAULT;
gulpStringInject.UGLIFY = Mode.UGLIFY;
gulpStringInject.STRIP_COMMENTS = Mode.STRIP_COMMENTS;

module.exports = gulpStringInject;
