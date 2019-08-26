const fileSystem = require('fs')

class FileBasedDB {
  constructor(filePath, wordSize = 64){ //
    this.filePath = filePath
    this.fd = fileSystem.openSync(filePath, 'a+')
    this._setWordSize(wordSize)
  }
  // constructor(filePath, wordSize = 64){ //
  //   this.filePath = filePath
  //   this.fd = fileSystem.openSync(filePath, 'a+')
  //   this._setWordSize(wordSize)
  // }
  // static open(filePath, wordSize){
  //   fileSystem.openSync(filePath, 'r+')
  //   return new this(filePath, wordSize)
  // }

  async get(_index){
    let index = _index + 1 // shift 1 because index zero holds meta-data (leafLength and wordSize)
    let wordSize = await this._getWordSize()
    var indexToFirstByte = index*wordSize
    var chunk = Buffer.alloc(wordSize)
    return new Promise((resolve, reject)=>{
      fileSystem.read(this.fd, chunk, 0, wordSize, indexToFirstByte, (e, r)=>{
        if(e){
          reject(e)
        }else{
          if(chunk.equals(Buffer.alloc(wordSize))){
            resolve(null)
          }else{
            resolve(chunk)
          }
        }
      })
    })
  }
  async set(index, value){
    let wordSize = await this._getWordSize()
    if(value == undefined || Buffer.alloc(wordSize).equals(value)){
      throw new Error('cannot set node to an empty buffer')
    }
    return new Promise((resolve, reject)=>{
      fileSystem.write(this.fd, value, 0, wordSize, ((index + 1) * wordSize), (e, r) => { 
        if(e){
          reject(e)
        }else{
          resolve(r)
        }
      })
    })
  }
  // async getLeafLength(){ //only supports 4byte size, but should eventually support 8byte
  //   let lengthBuffer = await this.get(-1)
  //   // let wordSize = await this._getWordSize()
  //   return lengthBuffer ? lengthBuffer.readUInt32BE(0) : 0
  //   // return lengthBuffer ? lengthBuffer.readUInt32BE(wordSize - 4) : 0
  // }
  async getLeafLength(){
    var leafLengthBuffer = Buffer.alloc(4)
    return new Promise((resolve, reject)=>{
      fileSystem.read(this.fd, leafLengthBuffer, 0, 4, 12, (e, r)=>{
        if(e){
          reject(e)
        }else{
          resolve(leafLengthBuffer.readUInt32BE(0))
        }
      })
    })
  }

  async setLeafLength(leafLength){ // to do: deallocate the deleted part of the file
    // let wordSize = await this._getWordSize()
    let lengthBuffer = Buffer.alloc(4)
    lengthBuffer.writeUInt32BE(leafLength, 0)
    return new Promise((resolve, reject)=>{
      fileSystem.write(this.fd, lengthBuffer, 0, 4, 0, (e, r) => { 
        if(e){
          reject(e)
        }else{
          fileSystem.fsync(this.fd, (e, r) => { 
            if(e){
              reject(e)
            }else{
              resolve(r)
            }
          })
        }
      })
    })
  }

  _setWordSize(wordSize){
    let wordSizeBuffer = Buffer.alloc(8)
    wordSizeBuffer.writeUInt32BE(wordSize, 4)
    fileSystem.writeSync(this.fd, wordSizeBuffer, 0, 8, 0)
  }

  async _getWordSize(){
    let self = this
// return 64
    if (!this._wordSize){
      var wordSizeBuffer = Buffer.alloc(4)
      return new Promise((resolve, reject)=>{
        fileSystem.read(this.fd, wordSizeBuffer, 0, 4, 4, (e, r)=>{
          if(e){
            reject(e)
          }else{
            if(wordSizeBuffer.equals(Buffer.alloc(4))){
              reject(new Error("Db has undefined wordSize" + wordSizeBuffer))
            }else{
              self._wordSize = wordSizeBuffer.readUInt32BE(0)
              return resolve(self._wordSize)
            }
          }
        })
      })
    }
    return this._wordSize
  }
}

module.exports = FileBasedDB
