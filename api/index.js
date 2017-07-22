const {parse} = require('url')
const {Clone} = require('nodegit')
const {join} = require('path')
const {promisify} = require('util')
const exec = promisify(require('child_process').exec)
const rimraf = promisify(require('rimraf'))
const uuid = require('uuid')

const sloc = async dir => {
  const slocPath = join(__dirname, 'node_modules', '.bin', 'sloc')
  const {stdout} = await exec(`${slocPath} ${dir} -f json`)
  return JSON.parse(stdout)
}

const processRepo = async dir => {
  const slocCounts = await sloc(dir)
  return slocCounts.summary
}

const repoFromUrl = url => {
  const {pathname} = parse(url)
  const parts = pathname.split('/').slice(1)
  if (parts.length < 2) {
    throw new Error('invalid repo url')
  }
  return {
    user: parts[0],
    repo: parts[1],
    branch: parts[2] || 'master'
  }
}

module.exports = async (req, res) => {
  const tStart = Date.now()
  try {
    const {user, repo, branch} = repoFromUrl(req.url)
    const path = join(__dirname, uuid.v1())
    await Clone(`https://github.com/${user}/${repo}`, path, {checkoutBranch: branch})
    const result = await processRepo(path)
    await rimraf(path)
    return {
      result,
      dt: Date.now() - tStart
    }
  } catch (err) {
    return {
      error: err,
      dt: Date.now() - tStart      
    }
  }
}
