const ProviderEngine = require('../index.js')
const TorRpcSubprovider = require('../subproviders/tor.js')
const Web3 = require('web3')
const createPayload = require('../util/create-payload.js')

var engine = new ProviderEngine()
var web3 = new Web3(engine)

// data source
engine.addProvider(new TorRpcSubprovider({
  // rpcUrl: 'http://api.zmok.io/mainnet/YOUR-APP-ID',
  rpcUrl: 'http://zmok2uls65q5ceoxcarpjpa5hlpjxsmeqyapfy3l42ofklmrdbcs4cqd.onion/mainnet/YOUR-APP-ID',
  torProxyUrl: 'socks5h://127.0.0.1:9150'
}))

// log new blocks
engine.on('block', function(block){
  console.log('================================')
  console.log('BLOCK CHANGED:', '#'+ block.number.toString('hex'), '0x'+block.hash.toString('hex'))
  console.log('================================')
})

// network connectivity error
engine.on('error', function(err){
  // report connectivity errors
  console.error(err.stack)
})

// start polling for blocks
engine.start()

engine.sendAsync(createPayload({
  method: 'eth_blockNumber',
  params: [],
}), function(err, response){
  if (err) {
    console.log(err)
  }

  console.log(response)
})
