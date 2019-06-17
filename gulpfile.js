const {src, dest, series} = require('gulp')
const git = require('gulp-git-streamed')
const bump = require('gulp-bump')
const color = require('gulp-color')
const semver = require('semver')
const fs = require('fs')

let version

let status = () => {
  return git.status({quiet: true}, (_, stdout) => {
    if (stdout.indexOf('nothing to commit') === -1) {
      console.log(color('Please, commit all files before publishing a new version\n', 'RED'))
      console.log(color(stdout, 'YELLOW'))
      process.exit(-1)
    }
  })
}

let getPackageJson = () => {
  return JSON.parse(fs.readFileSync('./package.json', 'utf8'));
}

let initVersion = (cb) => {
  version = semver.inc(getPackageJson().version, process.argv[3])
  cb()
}

let upgradePackageJson = () => {
  return src('./package.json')
    .pipe(bump({version: version}))
    .pipe(dest('./'))
}

let commit = () => {
  return src('./package.json')
    .pipe(git.commit(`package.json upgraded to version ${version}`))
}

let tag = () => {
  return src('.')
    .pipe(git.tag(version, `New version ${version}`))
    .on('error', (error) => {
      console.log(color(`Error creating tag ${version}: ${error}\n`, 'RED'))
      return revert()
    })
}

let push = () => {
  return src('.')
    .pipe(git.push('origin', null, {args: '--follow-tags'}))
    .on('error', (error) => {
      console.log(color(`Error creating tag ${version}: ${error}\n`, 'RED'))
      return revert()
    })
}

let revert = () => {
  console.log(color('Reverting changes...', 'YELLOW'))
  return src('./package.json')
    .pipe(git.reset('HEAD~1', {args: '--hard'}))
}

exports.default = series(status, initVersion, upgradePackageJson, commit, tag, push)
