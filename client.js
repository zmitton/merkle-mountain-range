const {keccak256} = require('js-sha3')
const Rpc = require('isomorphic-rpc')
const EthObject = require('eth-object')
const { encode, toBuffer, toHex } = require('./utils')
const MMR = require('./mmr')
const sem = require('semaphore')
// const { promisfy } = require('promisfy')

var rpc = new Rpc('http://localhost:8545')

var db = 'file0'


mmr = new MMR()


var bh = async (currentBlockNum) => {
  var resp = await rpc.eth_getBlockByNumber(currentBlockNum, false)
  if(resp.number != currentBlockNum){ throw new Error('wrnog block num')}
  var thisHash =  Buffer.from(keccak256(EthObject.Header.fromRpc(resp).buffer),'hex')
  return thisHash
}


var put = async (currentBlockNum = '0x0')=>{
  console.log("QQQQQ: ",toHex(currentBlockNum))
  var resp = await rpc.eth_getBlockByNumber(toHex(currentBlockNum), false)
  var header = EthObject.Header.fromRpc(resp)
  var thisHash =  Buffer.from(keccak256(header.buffer),'hex')
    if(mmr.length > 0 && mmr.length != MMR.get(currentBlockNum) ){
      throw new Error('length isnt right ' + mmr.length +" " + currentBlockNum) 
    }
    if(MMR._isCorrupt(mmr.length)){ throw new Error('is corrupt')}
    mmr.put(thisHash)
    
    if(mmr.length < 250){
      setTimeout(()=>{
        put(parseInt(currentBlockNum) + 1)
      }, 2)
    }
}

// put()





var a = Buffer.from('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','hex')
var b = Buffer.from('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb','hex')
var c = Buffer.from('cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc','hex')

var x


var dump = (p, position)=>{
  var chunk = Buffer.from('0000000000000000000000000000000000000000000000000000000000000000','hex')
  fs.open(p, 'a+', (e,fd)=>{
    fs.stat(p, (e,s)=>{
      // console.log(s.size)
      fs.read(fd, chunk, 0, 32, position, (e, r)=>{
        console.log(chunk)
        if(position < s.size){
          dump(p, position+32)
        }
      })
    })
  })
}
dump('file0', 0)


var append = (p, buf)=>{
  return new Promise((resolve, reject)=>{
    fs.stat(p, (e,s)=>{
      console.log(s.size)
      fs.write(db, buf, 0, 32, s.size, (e, r)=>{
        console.log(r)
        fs.close(fd, (e,r)=>{
          if(e){
            reject(e)
          }else{
            resolve(r)
          }
        })
      })
    })
  })
}
append('file0', a)


var size = async () => {
  return new Promise((resolve, reject)=>{
    fs.stat(db, (e,s) => {
      if(e){
        reject(e)
      }else{
        resolve(s.size)
      }
    })
  })
}

var get = async (i)=>{
  let s = await size()
  if(s % 32 != 0 ){ throw new Error("db size not divis by 32 " + s) }
  let length = Math.round(s/32)
  if(MMR._isCorrupt(length)){ throw new Error("isCorrupt " + length) }
  
  return new Promise((resolve, reject)=>{
    fs.open(path, (e,fd) => {
      if(e){
        reject(e)
      }else{
        resolve(s.size)
      }
    })
  })
}


Buffer.alloc(6)

// // Buffer.concat([Buffer.from(keccak256(b),'hex'), Buffer.from(keccak256(b1),'hex')])


// var a = [Buffer.from('12','hex'), Buffer.from('34','hex'), Buffer.from('56','hex')]
// var name = "file0"

// fs.writeFileSync(name, a)

// // fs.readFile(name, {encoding: Buffer}, console.log)
// // fs.read(fd, buffer, offset, length, position, callback)
// fs.stat('file0', console.log) 
// // has stat.size which is the num bytes
// // todo: see if this number changes as writeStream is open



// // rs = fs.createReadStream('file0')
// console.log(rs.read(32)) // read 32 bytes chunk of data


// // doesnt seem to know when a files size has changed


// //check data nodeIndex:
// // 0 : d4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3
// // 1 : 88e96d4537bea4d9c05d12549907b32561d3bf31f45aae734cdc119f13406cb6
// // 2 : 637721b0b7ee670e6a7b6076c0324f981874fb4d8a2001eb0bd9d1efb77fe73c










