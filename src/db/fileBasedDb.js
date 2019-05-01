const WORD_SIZE = 64
const fileSystem = require('fs')
// const Bn = require('bignumber.js') // todo: use bignumber.js to support more than 4 billion leaves
// let _numberToBytes32 = (input) => {
//   let str = input.toString(16).padStart(64, '0')
//   return Buffer.from(str, 'hex')
// }
// let _bytes32ToNumber = (input) => {
//   let str = input.toString(16).padStart(64, '0')
//   return Buffer.from(str, 'hex')
// }

class FileBasedDB {
  constructor(filePath){
    this.filePath = filePath
    this.fd = fileSystem.openSync(filePath, 'a+')
  }

  async get(_index){
    let index = _index + 1 // shift 1 because index zero holds lenght data
    var indexToFirstByte = index*WORD_SIZE
    var chunk = Buffer.alloc(WORD_SIZE)
    return new Promise((resolve, reject)=>{
      fileSystem.read(this.fd, chunk, 0, WORD_SIZE, indexToFirstByte, (e, r)=>{
        if(e){
          reject(e)
        }else{
          if(chunk.equals(Buffer.alloc(WORD_SIZE))){
            resolve(null)
          }else{
            resolve(chunk)
          }
        }
      })
    })
  }
  async set(index, value){
    let self = this
    if(value == undefined){ value = Buffer.alloc(WORD_SIZE) }
    return new Promise((resolve, reject)=>{
      fileSystem.write(self.fd, value, 0, WORD_SIZE, ((index + 1) * WORD_SIZE), (e, r) => { 
        if(e){
          reject(e)
        }else{
          resolve(r)
        }
      })
    })
  }

  async getLeafLength(){
    let lengthBuffer = await this.get(-1)
    return lengthBuffer ? lengthBuffer.readUInt32BE(WORD_SIZE - 4) : 0
  }
  async setLeafLength(leafLength){ // to do: deallocate the deleted part of the file
    let lengthBuffer = Buffer.alloc(WORD_SIZE)
    lengthBuffer.writeUInt32BE(leafLength, WORD_SIZE - 4)
    return this.set(-1, lengthBuffer)
  }
}


module.exports = FileBasedDB






