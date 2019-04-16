const { keccak256 } = require('js-sha3')
const { toWord, toBuffer } = require( './utils')
const Bn = require('bignumber.js')

let ethereumFlyClientHash = (a, b) => {
  // let hashA = getHash(a.slice(0,32))
  // let hashB = getHash(b.slice(0,32))
  let diffA = new Bn('0x' + a.slice(32).toString('hex'))
  let diffB = new Bn('0x' + b.slice(32).toString('hex'))

  // deciding against rlp because 1: no need to deserialize. 2:saves need fixed length anyway
  // 3: adds dependency. 4: may increase storage allocation requirement 
  // instead difficulty will use a uint256 fixed - problem solved
  let finalHash = Buffer.from(keccak256(Buffer.concat([a, b])),'hex')
  let finalDifficulty = toWord('0x' + diffA.plus(diffB).toString(16))
  // console.log("finalDifficulty ", finalDifficulty)
  return Buffer.concat([finalHash, finalDifficulty])
}

let keccak256Only = (a, b) => {
  return Buffer.from(keccak256(Buffer.concat([a, b])),'hex')
}



module.exports  = { ethereumFlyClientHash, keccak256Only }
