const Util = require('ethereumjs-util')

const keccak = Util.keccak
const encode = (input) => {
  return input === "0x0" ? Util.rlp.encode(Buffer.from([])) : Util.rlp.encode(input)
}
const decode = Util.rlp.decode
const toBuffer = (input) => { 
  return input === "0x0" ? Buffer.from([]) : Util.toBuffer(input) 
}
const toHex = (input)=>{
  let output = ''
  if(input instanceof Array){
    output = toHex(encode(input))
  }else{
    output = Util.bufferToHex(input)
  }

  if(output.length == 2){
    return '0x0'
  } else if(output[2] == '0'){
    return output.substring(0, 2) + output.substring(3, output.length)
  }
  return output
}
const toWord = (input) => {
  return Util.setLengthLeft(toBuffer(input), 32)
}

const mappingAt = (...keys) => { // first key is mapping's position
  keys[0] = toWord(keys[0])
  return toHex(keys.reduce((positionAccumulator, key)=>{
    return keccak(Buffer.concat([toWord(key) ,positionAccumulator]))
  }))
}

module.exports = { keccak, encode, decode, toBuffer, toHex, toWord, mappingAt }
