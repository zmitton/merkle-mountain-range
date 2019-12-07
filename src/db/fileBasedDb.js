const fileSystem = require('fs')
// The fist 16 bytes of any fileBasedDb (`.mmr`) file contain the wordSize and the leafLength respectively. For 
// instance 0000 0000 0000 0040 0000 0000 0000 03e8 is a db with wordsize 64 and leafLength 1000.

class FileBasedDB {
  constructor(){
    throw new Error('Please use the static `create` and `open` methods to construct a FileBasedDB')
  }
  static create(filePath, wordSize = 64){// throws if file already exists
    return this.openOrCreate(filePath, 'ax+', wordSize)
  }
  static open(filePath){// throws if file does not exist
    return this.openOrCreate(filePath, 'r+')
  }
  static openOrCreate(filePath, fileSystemFlags, wordSize){
    let db = Object.create(this.prototype)
    db.filePath = filePath
    db.fd = fileSystem.openSync(filePath, fileSystemFlags)
    if(wordSize){
      db._setWordSize(wordSize)
    }
    return db
  }

  async get(_index){
    let index = _index + 1 // shift 1 because index zero holds meta-data (wordSize and leafLength)
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
  async set(value, index){
    let wordSize = await this._getWordSize()
    if(value == undefined || Buffer.alloc(wordSize).equals(value)){
      throw new Error('Can not set nodeValue as an empty buffer')
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
  async getNodes(){
    let wordSize = await this._getWordSize()
    let stats = fs.statSync(this.filePath)
    let nodeLength = (stats.size - wordSize) / wordSize

    let nodes = {}
    for (var i = 0; i < nodeLength; i++) {
      node[i] = await this.get(i)
    }
    return nodes
  }
  _setWordSize(wordSize){
    if(!wordSize || wordSize < 16){
      throw new Error('Wordsize of' + wordSize + 'not supported for FileBasedDB')
    }
    let wordSizeBuffer = Buffer.alloc(16)
    wordSizeBuffer.writeUInt32BE(wordSize, 4)
    fileSystem.writeSync(this.fd, wordSizeBuffer, 0, 16, 0)
  }
  async _getWordSize(){
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
              this._wordSize = wordSizeBuffer.readUInt32BE(0)
              resolve(this._wordSize)
            }
          }
        })
      })
    }
    return this._wordSize
  }
}

module.exports = FileBasedDB
