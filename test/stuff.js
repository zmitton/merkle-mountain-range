// By "stuff" I mean the very specific _verb_ (not the highly abstract noun)

const { keccak256 } = require('js-sha3')
const { ethereumFlyClientHash } = require('./hashingFunctions')
const Rpc = require('isomorphic-rpc')
const EthObject = require('eth-object')
const { encode, toBuffer, toHex, keccak, toWord } = require('./utils')
// const MMR = require('./mmr')
const MMR = require('./mmr')
const FileBasedDB = require('./db/fileBasedDb')
const MemDB = require('./memoryDb')
const { Lock } = require('semaphore-async-await')

// const sem = require('semaphore')
// const { promisfy } = require('promisfy')

var bh = async (currentBlockNum) => {
  var resp = await rpc.eth_getBlockByNumber(currentBlockNum, false)
  if(resp.number != currentBlockNum){ throw new Error('wrnog block num')}
  var blockHeader =  EthObject.Header.fromRpc(resp)
  return blockHeader
}

var put = async (currentBlockNum, total)=>{
  // console.log("QQQQQ: ",toHex(currentBlockNum))
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


let dumbHash = (_a, _b) => {
  let a = _a ? _a.toString('hex').slice(0,2) : 'undefined'
  let b = _b ? _b.toString('hex').slice(0,2) : 'undefined'
  return 'H(' + a + ',' + b + ')'
}

// r = new MMR(new FileBasedDB('eth-set'), keccak256)



// put(0,7000000)
// put(0,3)
/*
put(0, 50)
r.append(buf())
r.nodeLength().then(console.log)
r._size().then(console.log)
rpc.eth_getBlockByNumber('0x3',false).then((r)=>{console.log(r.hash)}); 0
keccak256(Buffer.concat([Buffer.from('b495a1d7e6663152ae92708da4843337b958146015a2802f4193a410044698c9','hex'), Buffer.from('3d6122660cc824376f11ee842f83addc3525e2dd6756b9bcf0affa6aa88cf741','hex')]))

r.put(h[0]); 0
r.put(h[0], 0); 0
r.put(h[2], 2); 0
r.put(h[1], 1); 0

*/
// puts()

var buf = () => { return Buffer.from(keccak256(Math.random().toString()),'hex') }


var hashes = async (_h) => {
  let blocknums = []
  for (var i = 0; i < 8 ; i++) {
    blocknums[i] = i
  }
  await Promise.all(blocknums.map(async (blockNum) => {
    let blockHeader = await bh(toHex(blockNum))
    let blockHash = Buffer.from(keccak256(blockHeader.buffer),'hex')
    let difficulty = toWord(blockHeader[7])
    // console.log("blockHash, difficulty", blockHash, difficulty)
    _h[blockNum] = Buffer.concat([blockHash, difficulty])
  }))
}

let h = []
hashes(h)



var putBlockHash = async (currentBlockNum, total)=>{
  // console.log("QQQQQ: ",toHex(currentBlockNum))
  var resp = await rpc.eth_getBlockByNumber(toHex(currentBlockNum), false)
  var header = EthObject.Header.fromRpc(resp)
  var thisHash =  Buffer.from(keccak256(header.buffer),'hex')
  await r.put(thisHash, parseInt(resp.number) )
  if(currentBlockNum >= total){
    return 
  }
  return put(parseInt(currentBlockNum) + 1, total)
}

// r = new MMR(new MemDB(), ethereumFlyClientHash)
r = new MMR(new FileBasedDB('etc-set'), ethereumFlyClientHash)

var fill1000 = async () => {
  var startTime = Date.now()
  var i = 0
  let resp
  let blockNum
    resp = await rpc.eth_getBlockByNumber(toHex(i), false)
  do{
    if(resp){
      let header = EthObject.Header.fromRpc(resp)
      let blockHash = Buffer.from(keccak256(header.buffer),'hex')
      let difficulty = toWord(header[7])
      let nodeValue = Buffer.concat([blockHash, difficulty])
      await r.put(nodeValue, i)
      // console.log("PUT ", i, "\t", nodeValue.toString('hex'))
    }
    // console.log("RESP::: ", resp)
    i++
    resp = await rpc.eth_getBlockByNumber(toHex(i), false)
  // }while(resp)
  }while(i <= 1000)
  console.log((Date.now() - startTime)/1000/1000)
}


// r.get(2).then((resp)=>{console.log(resp.toString('hex'))});0
//  0.006065
//  0.004642
//  0.002771






