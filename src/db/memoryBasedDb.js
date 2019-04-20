const WORD_SIZE = 64

class MemoryBasedDb {
  constructor(leafLength = 0){
    this.nodes = {}
    this.leafLength = leafLength
  }

  async get(index){
    return this.nodes[index]
  }
  async set(index, value){
    this.nodes[index] = value
  }
  async getLeafLength(){
    return this.leafLength
  }
  async setLeafLength(leafLength){
    return this.leafLength = leafLength
  }
}

module.exports = MemoryBasedDb
