const expect = require('chai').expect
const utils = require('../utils/test_utils')
const bsv = require('bsv')
require('dotenv').config()

const {
  contract,
  issue,
  split,
  merge,
  mergeWithCallback
} = require('../../index')

const {
  bitcoinToSatoshis,
  getTransaction,
  getFundsFromFaucet,
  broadcast
} = require('../../index').utils

const { sighash } = require('../../lib/stas')

let issuerPrivateKey
let fundingPrivateKey
let bobPrivateKey
let alicePrivateKey
let bobAddr
let aliceAddr
let contractUtxos
let fundingUtxos
let publicKeyHash
let splitTxid
let splitTx
let splitTxObj
let contractTxid
let contractTx
let issueTx
let issueTxid
const wait = 5000

const bobSignatureCallback = (tx, i, script, satoshis) => {
  return bsv.Transaction.sighash.sign(tx, bobPrivateKey, sighash, i, script, satoshis)
}
const paymentSignatureCallback = (tx, i, script, satoshis) => {
  return bsv.Transaction.sighash.sign(tx, fundingPrivateKey, sighash, i, script, satoshis)
}

beforeEach(async () => {
  await setup()
})

it('Merge - Successful Merge With Fee', async () => {
  const mergeHex = merge(
    bobPrivateKey,
    utils.getMergeUtxo(splitTxObj),
    aliceAddr,
    utils.getUtxo(splitTxid, splitTx, 2),
    fundingPrivateKey
  )
  const mergeTxid = await broadcast(mergeHex)
  await new Promise(resolve => setTimeout(resolve, wait))
  const tokenIdMerge = await utils.getToken(mergeTxid)
  const response = await utils.getTokenResponse(tokenIdMerge)
  expect(response.symbol).to.equal('TAALT')
  expect(response.contract_txs).to.contain(contractTxid)
  expect(response.issuance_txs).to.contain(issueTxid)
  expect(await utils.getVoutAmount(mergeTxid, 0)).to.equal(0.00007)
  console.log('Alice Balance ' + (await utils.getTokenBalance(aliceAddr)))
  console.log('Bob Balance ' + (await utils.getTokenBalance(bobAddr)))
  expect(await utils.getTokenBalance(aliceAddr)).to.equal(7000)
  expect(await utils.getTokenBalance(bobAddr)).to.equal(3000)
})

it('Merge - Successful Merge With Fee 2', async () => {
  const mergeHex = merge(
    bobPrivateKey,
    utils.getMergeUtxo(splitTxObj),
    bobAddr,
    utils.getUtxo(splitTxid, splitTx, 2),
    fundingPrivateKey
  )
  const mergeTxid = await broadcast(mergeHex)
  await new Promise(resolve => setTimeout(resolve, wait))
  const tokenIdMerge = await utils.getToken(mergeTxid)
  const response = await utils.getTokenResponse(tokenIdMerge)
  expect(response.symbol).to.equal('TAALT')
  expect(response.contract_txs).to.contain(contractTxid)
  expect(response.issuance_txs).to.contain(issueTxid)
  expect(await utils.getVoutAmount(mergeTxid, 0)).to.equal(0.00007)
  console.log('Alice Balance ' + (await utils.getTokenBalance(aliceAddr)))
  console.log('Bob Balance ' + (await utils.getTokenBalance(bobAddr)))
  expect(await utils.getTokenBalance(aliceAddr)).to.equal(0)
  expect(await utils.getTokenBalance(bobAddr)).to.equal(10000)
})

// no fee disabled in tests
it('Merge - Merge With No Fee', async () => {
  const mergeHex = merge(
    bobPrivateKey,
    utils.getMergeUtxo(splitTxObj),
    aliceAddr,
    null,
    null
  )
  const mergeTxid = await broadcast(mergeHex)
  const tokenIdMerge = await utils.getToken(mergeTxid)
  const response = await utils.getTokenResponse(tokenIdMerge)
  expect(response.symbol).to.equal('TAALT')
  expect(response.contract_txs).to.contain(contractTxid)
  expect(response.issuance_txs).to.contain(issueTxid)
  console.log('Alice Balance ' + (await utils.getTokenBalance(aliceAddr)))
  console.log('Bob Balance ' + (await utils.getTokenBalance(bobAddr)))
  expect(await utils.getVoutAmount(mergeTxid, 0)).to.equal(0.00007)
  expect(await utils.getTokenBalance(aliceAddr)).to.equal(7000)
  expect(await utils.getTokenBalance(bobAddr)).to.equal(3000)
})

it('Merge - Successful Merge With Callback And Fee', async () => {
  const mergeHex = mergeWithCallback(
    bobPrivateKey.publicKey,
    utils.getMergeUtxo(splitTxObj),
    aliceAddr,
    utils.getUtxo(splitTxid, splitTx, 2),
    fundingPrivateKey.publicKey,
    bobSignatureCallback,
    paymentSignatureCallback
  )
  const mergeTxid = await broadcast(mergeHex)
  await new Promise(resolve => setTimeout(resolve, wait))
  const tokenIdMerge = await utils.getToken(mergeTxid)
  const response = await utils.getTokenResponse(tokenIdMerge)
  expect(response.symbol).to.equal('TAALT')
  expect(response.contract_txs).to.contain(contractTxid)
  expect(response.issuance_txs).to.contain(issueTxid)
  expect(await utils.getVoutAmount(mergeTxid, 0)).to.equal(0.00007)
  console.log('Alice Balance ' + (await utils.getTokenBalance(aliceAddr)))
  console.log('Bob Balance ' + (await utils.getTokenBalance(bobAddr)))
  expect(await utils.getTokenBalance(aliceAddr)).to.equal(7000)
  expect(await utils.getTokenBalance(bobAddr)).to.equal(3000)
})

// no fee disabled in tests
it('Merge - Successful Merge With Callback And No Fee', async () => {
  const mergeHex = mergeWithCallback(
    bobPrivateKey.publicKey,
    utils.getMergeUtxo(splitTxObj),
    aliceAddr,
    null,
    null,
    bobSignatureCallback,
    null
  )
  const mergeTxid = await broadcast(mergeHex)
  const tokenIdMerge = await utils.getToken(mergeTxid)
  const response = await utils.getTokenResponse(tokenIdMerge)
  expect(response.symbol).to.equal('TAALT')
  expect(response.contract_txs).to.contain(contractTxid)
  expect(response.issuance_txs).to.contain(issueTxid)
  expect(await utils.getVoutAmount(mergeTxid, 0)).to.equal(0.00007)
  console.log('Alice Balance ' + (await utils.getTokenBalance(aliceAddr)))
  console.log('Bob Balance ' + (await utils.getTokenBalance(bobAddr)))
  expect(await utils.getTokenBalance(aliceAddr)).to.equal(7000)
  expect(await utils.getTokenBalance(bobAddr)).to.equal(3000)
})

it('Merge - Incorrect Owner Private Key Throws Error', async () => {
  const incorrectPrivateKey = bsv.PrivateKey()
  const mergeHex = merge(
    incorrectPrivateKey,
    utils.getMergeUtxo(splitTxObj),
    aliceAddr,
    utils.getUtxo(splitTxid, splitTx, 2),
    fundingPrivateKey
  )
  try {
    await broadcast(mergeHex)
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.response.data).to.contain('mandatory-script-verify-flag-failed (Script failed an OP_EQUALVERIFY operation)')
  }
})

it('Merge - Incorrect Funding Private Key Throws Error', async () => {
  const incorrectPrivateKey = bsv.PrivateKey()
  const mergeHex = merge(
    bobPrivateKey,
    utils.getMergeUtxo(splitTxObj),
    aliceAddr,
    utils.getUtxo(splitTxid, splitTx, 2),
    incorrectPrivateKey
  )
  try {
    await broadcast(mergeHex)
    expect(false).toBeTruthy()
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.response.data).to.contain('mandatory-script-verify-flag-failed (Script failed an OP_EQUALVERIFY operation)')
  }
})

async function setup () {
  issuerPrivateKey = bsv.PrivateKey()
  fundingPrivateKey = bsv.PrivateKey()
  bobPrivateKey = bsv.PrivateKey()
  alicePrivateKey = bsv.PrivateKey()
  bobAddr = bobPrivateKey.toAddress(process.env.NETWORK).toString()
  aliceAddr = alicePrivateKey.toAddress(process.env.NETWORK).toString()
  contractUtxos = await getFundsFromFaucet(issuerPrivateKey.toAddress(process.env.NETWORK).toString())
  fundingUtxos = await getFundsFromFaucet(fundingPrivateKey.toAddress(process.env.NETWORK).toString())
  publicKeyHash = bsv.crypto.Hash.sha256ripemd160(issuerPrivateKey.publicKey.toBuffer()).toString('hex')
  const symbol = 'TAALT'
  const supply = 10000
  const schema = utils.schema(publicKeyHash, symbol, supply)

  const contractHex = contract(
    issuerPrivateKey,
    contractUtxos,
    fundingUtxos,
    fundingPrivateKey,
    schema,
    supply
  )
  contractTxid = await broadcast(contractHex)
  contractTx = await getTransaction(contractTxid)

  const issueHex = issue(
    issuerPrivateKey,
    utils.getIssueInfo(aliceAddr, 7000, bobAddr, 3000),
    utils.getUtxo(contractTxid, contractTx, 0),
    utils.getUtxo(contractTxid, contractTx, 1),
    fundingPrivateKey,
    true,
    symbol,
    2
  )
  issueTxid = await broadcast(issueHex)
  issueTx = await getTransaction(issueTxid)

  const issueOutFundingVout = issueTx.vout.length - 1

  const bobAmount1 = issueTx.vout[0].value / 2
  const bobAmount2 = issueTx.vout[0].value - bobAmount1
  const splitDestinations = []
  splitDestinations[0] = { address: bobAddr, amount: bitcoinToSatoshis(bobAmount1) }
  splitDestinations[1] = { address: bobAddr, amount: bitcoinToSatoshis(bobAmount2) }

  const splitHex = split(
    alicePrivateKey,
    utils.getUtxo(issueTxid, issueTx, 0),
    splitDestinations,
    utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
    fundingPrivateKey
  )
  splitTxid = await broadcast(splitHex)
  splitTx = await getTransaction(splitTxid)
  splitTxObj = new bsv.Transaction(splitHex)
}