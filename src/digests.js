const { keccak256 } = require('js-sha3')
const  shajs  = require('sha.js')
const Bn = require('bignumber.js')

// for variable difficulty used in flyClient
let hashAndSum = (hashingFunction, ...nodeValues) => { 
  let _numberToBytes32 = (input) => {
    let str = input.toString(16).padStart(64, '0')
    return Buffer.from(str, 'hex')
  }
  let diffucultySum = new Bn(0)
  for (let i = 0; i < nodeValues.length; i++) {
    let currentDifficulty = new Bn('0x' + nodeValues[i].slice(32).toString('hex'))
    diffucultySum = diffucultySum.plus(currentDifficulty)
  }
  let finalHash = Buffer.from(hashingFunction(Buffer.concat(nodeValues)), 'hex')
  let difficultySumBytes = _numberToBytes32(diffucultySum)

  return Buffer.concat([finalHash, difficultySumBytes])
}
let keccak256FlyHash = (...nodeValues) => {
  return hashAndSum(keccak256, ...nodeValues)
}
let sha256FlyHash = (...nodeValues) => {
  let sha256 = (x) => { return shajs('sha256').update(x).digest('hex') }
  return hashAndSum(sha256, ...nodeValues)
}
let keccak = (a, b) => {
  return Buffer.from(keccak256(Buffer.concat([a, b])),'hex')
}

module.exports  = { keccak256FlyHash, sha256FlyHash, keccak, shajs, hashAndSum }
