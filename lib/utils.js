const axios = require('axios')
const bsv = require('bsv')
require('dotenv').config()

const BN = bsv.crypto.BN

const MIN_SYMBOL_SIZE = 1
const MAX_SYMBOL_SIZE = 128

// the amount of satoshis in a bitcoin
const SATS_PER_BITCOIN = 1e8

// numberToLESM converts a number into a little endian byte slice representation,
// using the minimum number of bytes possible, in sign magnitude format.
function numberToLESM (num) {
  if (num === 0) {
    return 'OP_0'
  }
  if (num === 1) {
    return 'OP_1'
  }
  const n = bsv.crypto.BN.fromNumber(num)
  return n.toSM({ endian: 'little' }).toString('hex')
}

// replaceAll is used for node versions < 15, where the STRING.replaceAll function is built in.
function replaceAll (string, search, replace) {
  const pieces = string.split(search)
  return pieces.join(replace)
}

// getTransaction gets a bitcoin transaction from Taalnet.
async function getTransaction (txid) {
  const url = `https://${process.env.API_NETWORK}.whatsonchain.com/v1/bsv/${process.env.API_NETWORK2}/tx/hash/${txid}`

  const response = await axios({
    method: 'get',
    url,
    auth: {
      username: process.env.API_USERNAME,
      password: process.env.API_PASSWORD
    }
  })

  return response.data
}

// getRawTransaction gets a bitcoin transaction from Taalnet in raw / hex format.
async function getRawTransaction (txid) {
  const url = `https://${process.env.API_NETWORK}.whatsonchain.com/v1/bsv/${process.env.API_NETWORK2}/tx/${txid}/hex`

  const response = await axios({
    method: 'get',
    url,
    auth: {
      username: process.env.API_USERNAME,
      password: process.env.API_PASSWORD
    }
  })

  return response.data
}

// getFundsFromFaucet gets satoshis from the Taalnet faucet.
async function getFundsFromFaucet (address) {
  const url = `https://taalnet.whatsonchain.com/faucet/send/${address}`

  const response = await axios.get(url, {
    auth: {
      username: process.env.API_USERNAME,
      password: process.env.API_PASSWORD
    }
  })

  const txid = response.data

  // Check this is a valid hex string
  if (!txid.match(/^[0-9a-fA-F]{64}$/)) {
    throw new Error(`Failed to get funds: ${txid}`)
  }

  const faucetTx = await getTransaction(txid)

  let vout = 0
  if (faucetTx.vout[0].value !== 0.01) {
    vout = 1
  }
  return [{
    txid,
    vout,
    scriptPubKey: faucetTx.vout[vout].scriptPubKey.hex,
    amount: bitcoinToSatoshis(faucetTx.vout[vout].value)
  }]
}

// broadcast will send a transaction to Taalnet.
async function broadcast (tx) {
  if (Buffer.isBuffer(tx)) {
    tx = tx.toString('hex')
  }
  const url = `https://${process.env.API_NETWORK}.whatsonchain.com/v1/bsv/${process.env.API_NETWORK2}/tx/raw`

  const response = await axios({
    method: 'post',
    url,
    auth: {
      username: process.env.API_USERNAME,
      password: process.env.API_PASSWORD
    },
    data: {
      txhex: tx
    }
  })

  let txid = response.data

  if (txid[0] === '"') {
    txid = txid.slice(1)
  }

  if (txid.slice(-1) === '\n') {
    txid = txid.slice(0, -1)
  }

  if (txid.slice(-1) === '"') {
    txid = txid.slice(0, -1)
  }

  // Check this is a valid hex string
  if (!txid.match(/^[0-9a-fA-F]{64}$/)) {
    throw new Error(`Failed to broadcast: ${txid}`)
  }

  return txid
}
// now decode addr to pubKeyHash
function addressToPubkeyhash (addr) {
  const address = bsv.Address.fromString(addr)
  return address.hashBuffer.toString('hex')
}

function reverseEndian (str) {
  const num = new BN(str, 'hex')
  const buf = num.toBuffer()
  return buf.toString('hex').match(/.{2}/g).reverse().join('')
}

function bitcoinToSatoshis (amount) {
  return Math.round(amount * SATS_PER_BITCOIN)
}

module.exports = {
  numberToLESM,
  replaceAll,
  getTransaction,
  getRawTransaction,
  getFundsFromFaucet,
  broadcast,
  addressToPubkeyhash,
  reverseEndian,
  bitcoinToSatoshis,
  SATS_PER_BITCOIN,
  MIN_SYMBOL_SIZE,
  MAX_SYMBOL_SIZE
}
