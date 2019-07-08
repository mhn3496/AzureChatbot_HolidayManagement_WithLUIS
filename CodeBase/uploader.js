// require modules
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const request = require('request');

// bot configuration
var kuduApi = 'https://nlmgmtbot.scm.azurewebsites.net/api/zip/site/wwwroot';
var userName = '$nlmgmtbot';
var password = 'd8nl6lxwqlbuDp86guJmvWahZPjZABchHeqfLNhQJKa6GJmXcQB8lTp96auL';
const zipFileName = 'naglmbot.zip';

const currentPath = path.resolve(__dirname + '/../');
const packagePath = currentPath + '/' + zipFileName;

// create a file to stream archive data to.
var output = fs.createWriteStream(packagePath);
var archive = archiver('zip');

// listen for all archive data to be written
// 'close' event is fired only when a file descriptor is involved
output.on('close', function() {
  console.log(archive.pointer() + ' total bytes compressedcd');
  console.log('Compression completed');
  console.log('Uploading the compressed package..');
  uploadZip(() => {
    console.log('Package has been published.');
  }, packagePath);
});

// pipe archive data to the file
archive.pipe(output);

// append files from a glob pattern (ignore node_modules)
archive.glob('**/*', { ignore: ['**/node_modules/**'], dot: true });

console.log('Compressing the package...');
archive.finalize();

function uploadZip(callback, zipPath) {
  fs.createReadStream(zipPath)
    .pipe(
      request.put(kuduApi, {
        auth: {
          username: userName,
          password: password,
          sendImmediately: true
        },
        headers: {
          'Content-Type': 'applicaton/zip'
        }
      })
    )
    .on('response', function(resp) {
      if (resp.statusCode >= 200 && resp.statusCode < 300) {
        fs.unlink(zipPath, callback);
      } else if (resp.statusCode >= 400) {
        callback(resp);
      }
    })
    .on('error', function(err) {
      callback(err);
    });
}
