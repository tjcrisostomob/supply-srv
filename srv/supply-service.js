const cds = require('@sap/cds')

// Registration point for the service handlers. CAP picks this file up by naming
// convention, because it sits next to supply-service.cds. Guards and actions are
// wired in from T-09 onward; the rules themselves live in srv/lib as pure
// modules, so this file only ever delegates (constitution 3).
module.exports = class SupplyService extends cds.ApplicationService {
  async init () {
    return super.init()
  }
}
