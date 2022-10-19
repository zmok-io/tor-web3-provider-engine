# TOR Web3 ProviderEngine

Web3 ProviderEngine enhanced with TOR SOCKS5 proxy.

### TOR SOCKS5 proxy
Use shared proxy: `socks5h://api.zmok.io:9150`

Or better, run own proxy inside a Docker container.
Setup the proxy server at the first time:

```sh
docker run -d --restart=always --name tor-socks-proxy -p 127.0.0.1:9150:9150/tcp peterdavehello/tor-socks-proxy:latest
```

### Composable

Built to be modular - works via a stack of 'sub-providers' which are like normal web3 providers but only handle a subset of rpc methods.

The subproviders can emit new rpc requests in order to handle their own;  e.g. `eth_call` may trigger `eth_getAccountBalance`, `eth_getCode`, and others.
The provider engine also handles caching of rpc request results.

```js
const ProviderEngine = require('tor-web3-provider-engine')
const CacheSubprovider = require('tor-web3-provider-engine/subproviders/cache.js')
const FixtureSubprovider = require('tor-web3-provider-engine/subproviders/fixture.js')
const FilterSubprovider = require('tor-web3-provider-engine/subproviders/filters.js')
const VmSubprovider = require('tor-web3-provider-engine/subproviders/vm.js')
const HookedWalletSubprovider = require('tor-web3-provider-engine/subproviders/hooked-wallet.js')
const NonceSubprovider = require('tor-web3-provider-engine/subproviders/nonce-tracker.js')
const RpcSubprovider = require('tor-web3-provider-engine/subproviders/rpc.js')
const TorRpcSubprovider = require('tor-web3-provider-engine/subproviders/tor.js')

var engine = new ProviderEngine()
var web3 = new Web3(engine)

// static results
engine.addProvider(new FixtureSubprovider({
  web3_clientVersion: 'ProviderEngine/v0.0.0/javascript',
  net_listening: true,
  eth_hashrate: '0x00',
  eth_mining: false,
  eth_syncing: true,
}))

// cache layer
engine.addProvider(new CacheSubprovider())

// filters
engine.addProvider(new FilterSubprovider())

// pending nonce
engine.addProvider(new NonceSubprovider())

// vm
engine.addProvider(new VmSubprovider())

// id mgmt
engine.addProvider(new HookedWalletSubprovider({
  getAccounts: function(cb){ ... },
  approveTransaction: function(cb){ ... },
  signTransaction: function(cb){ ... },
}))

// TOR RPC data source
engine.addProvider(new TorRpcSubprovider({
  // rpcUrl: 'http://api.zmok.io/mainnet/YOUR-APP-ID',
  rpcUrl: 'http://zmok2uls65q5ceoxcarpjpa5hlpjxsmeqyapfy3l42ofklmrdbcs4cqd.onion/mainnet/YOUR-APP-ID',
  torProxyUrl: 'socks5h://api.zmok.io:9150'
}))

// log new blocks
engine.on('block', function(block){
  console.log('================================')
  console.log('BLOCK CHANGED:', '#'+block.number.toString('hex'), '0x'+block.hash.toString('hex'))
  console.log('================================')
})

// network connectivity error
engine.on('error', function(err){
  // report connectivity errors
  console.error(err.stack)
})

// start polling for blocks
engine.start()
```

When importing in webpack:
```js
import * as Web3ProviderEngine  from 'tor-web3-provider-engine';
import * as TorRpcSource  from 'tor-web3-provider-engine/subproviders/tor';
import * as HookedWalletSubprovider from 'tor-web3-provider-engine/subproviders/hooked-wallet';
```

### Built For Zero-Clients

The [Ethereum JSON RPC](https://github.com/ethereum/wiki/wiki/JSON-RPC) was not designed to have one node service many clients.
However a smaller, lighter subset of the JSON RPC can be used to provide the blockchain data that an Ethereum 'zero-client' node would need to function.
We handle as many types of requests locally as possible, and just let data lookups fallback to some data source ( hosted rpc, blockchain api, etc ).
Categorically, we don’t want / can’t have the following types of RPC calls go to the network:
* id mgmt + tx signing (requires private data)
* filters (requires a stateful data api)
* vm (expensive, hard to scale)

## Running tests

```bash
yarn test
```
