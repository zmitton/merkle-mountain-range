const WORD_SIZE = 64

class MemoryBasedDb extends Array {
  constructor(leafLength){
    super(0)
    Object.defineProperty(this, 'leafLength', { value: leafLength, writable: true })
  }

  async get(index){
    return this[index]
  }
  async set(index, value){
    this[index] = value
  }
  async getLeafLength(){
    return this.leafLength
  }
  async setLeafLength(leafLength){
    return this.leafLength = leafLength
  }
}

module.exports = MemoryBasedDb
