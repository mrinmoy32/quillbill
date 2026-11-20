// Picks the config file for this build. CLIENT_ENV comes from client/.env (or the CI pipeline).
import dev from './dev.config.js'
import local from './local.config.js'
import prod from './prod.config.js'

const all = { local, dev, prod }
const env = import.meta.env.CLIENT_ENV || 'local'

if (!all[env]) throw new Error(`CLIENT_ENV must be one of ${Object.keys(all).join(', ')}; got "${env}"`)

export const config = {
  ...all[env],
  env,
  version: __APP_VERSION__, // from the root VERSION file
  build: __BUILD_SHA__, // git commit, set by CI
}
