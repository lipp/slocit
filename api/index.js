const {parse} = require('url')
const {join} = require('path')
const {promisify} = require('util')
const exec = promisify(require('child_process').exec)
const rimraf = promisify(require('rimraf'))
const readFile = promisify(require('fs').readFile)
const uuid = require('uuid')

const clone = async ({user, repo, branch}, dir) => {
  await exec(`git clone https://github.com/${user}/${repo} ${dir} --depth 1 --branch ${branch} -q`)
  await exec(`cd ${dir} && git checkout ${branch}`)
  const {stdout} = await exec(`cd ${dir} && git rev-parse HEAD`)
  return stdout.trim()
}

const sloc = async dir => {
  const tmpPath = uuid.v1()
  const slocPath = join(__dirname, 'node_modules', '.bin', 'sloc')
  try {
    await exec(`${slocPath} ${dir} -f json > ${tmpPath}`)
    const result = await readFile(tmpPath)
    return JSON.parse(result)
  } finally {
    await rimraf(tmpPath)
  }
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
    const path = join(__dirname, uuid.v1())
    const hash = await clone(repoFromUrl(req.url), path)
    const result = await processRepo(path)
    await rimraf(path)
    return {
      result,
      hash,
      dt: Date.now() - tStart
    }
  } catch (err) {
    return {
      error: err.toString(),
      dt: Date.now() - tStart      
    }
  }
}
