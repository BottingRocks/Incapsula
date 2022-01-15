const pkg = require('../package.json')
const dashify = require('dashify')
const fetch = require('node-fetch')
const crypto = require('crypto')
const fs = require('fs')
const { info } = require('console')

const {
  PACKAGE_NAME = pkg.name,
  PACKAGE_VERSION = pkg.version,
  KEYGEN_ACCOUNT_ID,
  KEYGEN_PRODUCT_ID,
  KEYGEN_PRODUCT_TOKEN,
} = process.env

if (!KEYGEN_ACCOUNT_ID) {
  console.error('env var KEYGEN_ACCOUNT_ID is required')

  process.exit(1)
}

if (!KEYGEN_PRODUCT_ID) {
  console.error('env var KEYGEN_PRODUCT_ID is required')

  process.exit(1)
}

if (!KEYGEN_PRODUCT_TOKEN) {
  console.error('env var KEYGEN_PRODUCT_TOKEN is required')

  process.exit(1)
}

async function createRelease({ filename, filetype, filesize, version, digest }) {
  const res = await fetch(`https://api.keygen.sh/v1/accounts/${KEYGEN_ACCOUNT_ID}/releases`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${KEYGEN_PRODUCT_TOKEN}`,
      'Content-Type': 'application/vnd.api+json',
      'Accept': 'application/vnd.api+json',
    },
    body: JSON.stringify({
      data: {
        type: 'release',
        attributes: {
          metadata: { digest },
          channel: 'stable',
          platform: 'npm',
          filename,
          filetype,
          filesize,
          version,
        },
        relationships: {
          product: {
            data: { type: 'product', id: KEYGEN_PRODUCT_ID }
          }
        }
      }
    })
  })

  const { data, errors } = await res.json()
  if (errors) {
    throw new Error(`failed to create release for ${filename}`, errors)
  }

  return data
}

function getTarballPathForPackage() {
  return `dist/${dashify(PACKAGE_NAME)}-${PACKAGE_VERSION}.tgz`
}

async function getDigestForPath(path) {
  return new Promise(resolve => {
    const shasum = crypto.createHash('sha512')
    const stream = fs.createReadStream(path)

    stream.on('data', d => shasum.update(d))
    stream.on('end', () => resolve(shasum.digest('base64')))
  })
}

async function uploadArtifactForRelease({ releaseId, size, type, blob }) {
  const res = await fetch(`https://api.keygen.sh/v1/accounts/${KEYGEN_ACCOUNT_ID}/releases/${releaseId}/artifact`, {
    redirect: 'manual',
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${KEYGEN_PRODUCT_TOKEN}`,
      'Content-Type': 'application/vnd.api+json',
      'Accept': 'application/vnd.api+json',
    }
  })

  const { data, errors } = await res.json();

  if (errors) {
    console.log(errors)
    throw new Error(`failed to create artifact for release ${releaseId}`)
  }

  // Upload to S3
  const url = res.headers.get('location')
  const s3 = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Length': size,
      'Content-Type': type,
    },
    body: blob,
  })

  if (s3.status !== 200) {
    throw new Error(`failed to upload artifact to ${url}`)
  }

  return data
}

async function publishTarballForPackage() {
  const path = getTarballPathForPackage()
  const digest = await getDigestForPath(path)
  const stat = fs.statSync(path)
  const filesize = stat.size
  const filename = `${PACKAGE_NAME}/${PACKAGE_VERSION}.tgz`
  const filetype = 'tgz'
  const version = PACKAGE_VERSION

  const release = await createRelease({ filename, filetype, filesize, version, digest })
  const artifact = await uploadArtifactForRelease({
    releaseId: release.id,
    type: 'application/tar+gzip',
    size: filesize,
    blob: fs.createReadStream(path),
  })

  return {
    artifact,
    release,
  }
}

async function getManifestForPackage() {
  const res = await fetch(`https://api.keygen.sh/v1/accounts/${KEYGEN_ACCOUNT_ID}/artifacts/${PACKAGE_NAME}`, {
    redirect: 'manual',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${KEYGEN_PRODUCT_TOKEN}`,
      'Accept': 'application/json',
    }
  })

  // Manifest hasn't been uploaded yet
  if (res.status === 404) {
    return null
  }

  const { errors } = await res.json()
  if (errors) {
    throw new Error(`failed to retrieve manifest for ${PACKAGE_NAME}`)
  }

  // Fetch from S3
  const url = res.headers.get('location')
  const s3 = await fetch(url)

  if (s3.status !== 200) {
    throw new Error(`failed to retrieve manifest from ${url}`)
  }

  return s3.json()
}

async function publishManifestForPackage() {
  const path = getTarballPathForPackage(PACKAGE_NAME, PACKAGE_VERSION)
  const digest = await getDigestForPath(path)

  // Attempt to merge previous manifest's versions to ensure we maintain history
  const prev = await getManifestForPackage(PACKAGE_NAME)
  const next = {
    name: PACKAGE_NAME,
    'dist-tags': {
      latest: PACKAGE_VERSION,
    },
    versions: Object.assign({}, prev?.versions, {
      [PACKAGE_VERSION]: {
        dist: {
          tarball: `https://api.keygen.sh/v1/accounts/${KEYGEN_ACCOUNT_ID}/artifacts/${PACKAGE_NAME}/${PACKAGE_VERSION}.tgz`,
          integrity: `sha512-${digest}`,
        }
      },
    })
  }

  const manifest = Buffer.from(JSON.stringify(next))
  const version = PACKAGE_VERSION
  const filename = PACKAGE_NAME
  const filesize = manifest.byteLength
  const filetype = 'json'

  const release = await createRelease({ filename, filetype, filesize, version })
  const artifact = await uploadArtifactForRelease({
    releaseId: release.id,
    type: 'application/json',
    size: filesize,
    blob: manifest,
  })

  return {
    artifact,
    release,
  }
}

async function main() {
  await publishTarballForPackage()
  await publishManifestForPackage()
}

main()
