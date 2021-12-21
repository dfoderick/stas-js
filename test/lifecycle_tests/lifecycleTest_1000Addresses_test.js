const expect = require("chai").expect
const utils = require('../utils/test_utils')
const bsv = require('bsv')
require('dotenv').config()

const {
  contract,
  issue,
  transfer,
  split,
  merge,
  mergeSplit,
  redeem
} = require('../../index')

const {
  getTransaction,
  getFundsFromFaucet,
  broadcast,
  SATS_PER_BITCOIN
} = require('../../index').utils

describe('regression, testnet', function () {
  it("Full Life Cycle Test With 1000 Issuance Addresses", async function () {

    const issuerPrivateKey = bsv.PrivateKey()
    const fundingPrivateKey = bsv.PrivateKey()

    const alicePrivateKey = bsv.PrivateKey()
    const aliceAddr = alicePrivateKey.toAddress(process.env.NETWORK).toString()

    const bobPrivateKey = bsv.PrivateKey()
    const bobAddr = bobPrivateKey.toAddress(process.env.NETWORK).toString()

    const davePrivateKey = bsv.PrivateKey()
    const daveAddr = davePrivateKey.toAddress(process.env.NETWORK).toString()

    const contractUtxos = await getFundsFromFaucet(issuerPrivateKey.toAddress(process.env.NETWORK).toString())
    const fundingUtxos = await getFundsFromFaucet(fundingPrivateKey.toAddress(process.env.NETWORK).toString())

    const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(issuerPrivateKey.publicKey.toBuffer()).toString('hex')
    const supply = 100000
    const symbol = 'TAALT'
    const schema = utils.schema(publicKeyHash, symbol, supply)

    const contractHex = contract(
      issuerPrivateKey,
      contractUtxos,
      fundingUtxos,
      fundingPrivateKey,
      schema,
      supply
    )
    const contractTxid = await broadcast(contractHex)
    console.log(`Contract TX:     ${contractTxid}`)
    const contractTx = await getTransaction(contractTxid)


    const issueInfo = add1000Addresses()
    const issueHex = issue(
      issuerPrivateKey,
      issueInfo,
      utils.getUtxo(contractTxid, contractTx, 0),
      utils.getUtxo(contractTxid, contractTx, 1),
      fundingPrivateKey,
      true,
      symbol,
      2
    )
    const issueTxid = await broadcast(issueHex)
    const issueTx = await getTransaction(issueTxid)
    const tokenId = await utils.getToken(issueTxid)
    console.log(`issueTxid:        ${issueTxid}`)
    console.log(`Token ID:        ${tokenId}`)
    await new Promise(r => setTimeout(r, 5000))
    let response = await utils.getTokenResponse(tokenId)  //token issuance fails
    console.log(response.symbol)
  })
})

  function add1000Addresses() {

    let issueInfo = []
    for (i = 0; i < 1000; i++) {
      const privateKey = bsv.PrivateKey()
      const addr = privateKey.toAddress(process.env.NETWORK).toString()
      issueInfo.push({
        addr: addr,
        satoshis: 100,
        data: "data " + i
      })
    };
    return issueInfo

  }