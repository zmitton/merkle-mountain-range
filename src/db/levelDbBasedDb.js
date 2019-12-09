const fileSystem = require('fs')
const Level = require('level')
// const rlp = require('rlp')

class LevelDbBasedDb{
  constructor(levelDb, keyPrefix){ 
    // Returns wrapper for existing and ALREADY OPEN db 
    // Warning: There are not any checks that the db exists or is formated correctly (i.e. binary)
    this.levelDb = levelDb
    this.keyPrefix = keyPrefix || Buffer.alloc(0)
  }

  // Unused key (outside normal range) to store the leafLength data 
  static LEAF_LENGTH_KEY = Buffer.from('FFFFFFFFF','hex')

  static async openOrCreate(filePath, keyPrefix, options = {}){
    let db = Object.create(this.prototype)
    options.keyEncoding = 'binary'
    options.valueEncoding = 'binary'
    db.levelDb = await Level(filePath, options)
    // adding 4 bytes here as hack to support 8 byte indexes (instead of 4)
    db.keyPrefix = Buffer.concat([Buffer.alloc(4), keyPrefix || Buffer.alloc(0)])

    if(!(await db._dbExists())){
      await db.setLeafLength(0)
    }
    return db
  }

  async get(index){
    let value = null
    let indexBuffer = Buffer.alloc(4)
    indexBuffer.writeUInt32BE(index, 0)
    let key = Buffer.concat([this.keyPrefix, indexBuffer])
    try{
      value = await this.levelDb.get(key)
    }catch{}
    return value
  }
  async set(value, index){
    let indexBuffer = Buffer.alloc(4)
    indexBuffer.writeUInt32BE(index, 0)
    let key = Buffer.concat([this.keyPrefix, indexBuffer])
    return this.levelDb.put(key, value)
  }
  async getLeafLength(){
    let value = null
    let key = Buffer.concat([this.keyPrefix, LevelDbBasedDb.LEAF_LENGTH_KEY])
    try{
      let leafLengthBuffer = await this.levelDb.get(key)
      value = leafLengthBuffer.readUInt32BE(0)
    }catch{}
    return value
  }
  async setLeafLength(leafLength){
    let key = Buffer.concat([this.keyPrefix, LevelDbBasedDb.LEAF_LENGTH_KEY])
    let lengthBuffer = Buffer.alloc(4)
    lengthBuffer.writeUInt32BE(leafLength, 0)
    return this.levelDb.put(key, lengthBuffer)
  }
  async _dbExists(){
    return !!(await this.getLeafLength())
  }
}

module.exports = LevelDbBasedDb
