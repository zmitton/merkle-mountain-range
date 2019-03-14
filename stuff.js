// By "stuff" I mean the very specific _verb_ (not the highly abstract noun)

const { keccak256 } = require('js-sha3')
const Rpc = require('isomorphic-rpc')
const EthObject = require('eth-object')
const { encode, toBuffer, toHex } = require('./utils')
// const MMR = require('./mmr')
const MMR = require('./mmr')
const DB = require('./fileDb')
// const sem = require('semaphore')
// const { promisfy } = require('promisfy')

var bh = async (currentBlockNum) => {
  var resp = await rpc.eth_getBlockByNumber(currentBlockNum, false)
  if(resp.number != currentBlockNum){ throw new Error('wrnog block num')}
  var thisHash =  Buffer.from(keccak256(EthObject.Header.fromRpc(resp).buffer),'hex')
  return thisHash
}

var put = async (currentBlockNum, total)=>{
  console.log("QQQQQ: ",toHex(currentBlockNum))
  var resp = await rpc.eth_getBlockByNumber(toHex(currentBlockNum), false)
  var header = EthObject.Header.fromRpc(resp)
  var thisHash =  Buffer.from(keccak256(header.buffer),'hex')
  await r.put(thisHash, parseInt(resp.number) )
  if(currentBlockNum >= total){
    return 
  }
  return put(parseInt(currentBlockNum) + 1, total)
}



var dump = (p, pos)=>{
  var position = pos || 0
  var chunk = Buffer.alloc(32)
  fs.open(p, 'a+', (e,fd)=>{
    fs.stat(p, (e,s)=>{
      fs.read(fd, chunk, 0, 32, position, (e, r)=>{
        console.log(chunk)
        if(position < s.size){
          dump(p, position+32)
        }
      })
    })
  })
}




var rpc = new Rpc('http://localhost:8545')

// dump('file0')

// var hashStub = (a, b) => {
//   return '(' + a + ',' + b + ')'
// }



r = new MMR(new DB('eth-set'), keccak256)

// put(0,7000000)
put(0,3)
/*
put(0, 50)
r.append(buf())
r.length().then(console.log)
r._size().then(console.log)


*/
// puts()

var buf = () => { return Buffer.from(keccak256(Math.random().toString()),'hex') }




