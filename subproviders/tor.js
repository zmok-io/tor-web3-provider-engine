const xhr = process.browser ? /* require('xhr') */ require('request') : require('request')
const https= require('http')
const axios = require('axios')
const inherits = require('util').inherits
const createPayload = require('../util/create-payload.js')
const Subprovider = require('./subprovider.js')
const { ethErrors, serializeError } = require('eth-rpc-errors')
const { SocksProxyAgent } = require('socks-proxy-agent');

module.exports = TorRpcSource

inherits(TorRpcSource, Subprovider)

function TorRpcSource(opts) {
  const self = this
  self.rpcUrl = opts.rpcUrl
	self.torProxyUrl = opts.torProxyUrl
}

TorRpcSource.prototype.handleRequest = function(payload, next, end){
  const self = this
  const targetUrl = self.rpcUrl
	const torProxyUrl = self.torProxyUrl

  // overwrite id to conflict with other concurrent users
  const sanitizedPayload = sanitizePayload(payload)
  const newPayload = createPayload(sanitizedPayload)

	const agent = new SocksProxyAgent(torProxyUrl)

  axios({
    httpAgent: agent,
    httpsAgent: agent,
		url:targetUrl,
    method:'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    timeout: 20000,
    data: JSON.stringify(newPayload),
  })
  .then(function(res) {
    // console.log("res.status: " + res.status)
    // console.log(res)
    // check for error code
    switch (res.status) {
      case 405:
        return end(ethErrors.rpc.methodNotFound())
      case 504: // Gateway timeout
        return (function(){
          let msg = `Gateway timeout. The request took too long to process. `
          msg += `This can happen when querying logs over too wide a block range.`
          const err = new Error(msg)
          return end(serializeError(err))
        })()
      case 429: // Too many requests (rate limiting)
        return (function(){
          const err = new Error(`Too Many Requests`)
          return end(serializeError(err))
        })()
      default:
        // console.log(res)
        if (res.status != 200) {
          const msg = 'Unknown Error: ' + res.data
          const err = new Error(msg)
          return end(serializeError(err))
        }
    }

    // parse response
    let data = res.data

    if (data.error) return end(data.error)

    end(null, data.result)
  })
  .catch((err) => {
    console.error(err.stack)
    return end(serializeError(err))
  });
}

// drops any non-standard params
function sanitizePayload (payload) {
  return {
    id: payload.id,
    jsonrpc: payload.jsonrpc,
    method: payload.method,
    params: payload.params,
  }
}
