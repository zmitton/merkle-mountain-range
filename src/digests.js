const { keccak256 } = require('js-sha3')
const { toWord } = require( './utils')
const Bn = require('bignumber.js')

let keccak256FlyHash = (...nodeValues) => {
  // deciding against rlp because 1: no need to deserialize. 2:saves need fixed length anyway
  // 3: adds dependency. 4: may increase storage allocation requirement 
  // instead difficulty will use a uint256 fixed - problem solved
  let diffucultySum = new Bn(0)
  for (let i = 0; i < nodeValues.length; i++) {
    let currentDifficulty = new Bn('0x' + nodeValues[i].slice(32).toString('hex'))
    diffucultySum = diffucultySum.plus(currentDifficulty)
  }
  let finalHash = Buffer.from(keccak256(Buffer.concat(nodeValues)), 'hex')
  let difficultySumBytes = toWord('0x' + diffucultySum.toString(16))
  return Buffer.concat([finalHash, difficultySumBytes])
}


let keccak = (a, b) => {
  return Buffer.from(keccak256(Buffer.concat([a, b])),'hex')
}


module.exports  = { keccak256FlyHash, keccak }
