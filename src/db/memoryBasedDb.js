const WORD_SIZE = 64

class MemoryBasedDb {
  constructor(...args){
    if(args[0] == undefined || typeof args[0] == 'number'){
      this.nodes = args[1] || {} // i.e. { 3 : <buffer 4d 89 b8 0e 7f 98 ...>, 7 : <buffer 73 6d 26 a2 6c 9c ...> }
      this.leafLength = args[0] || 0
    }else if(typeof arg[0] == 'object'){
      this.nodes = args[0].nodes
      this.leafLength = args[0].leafLength
    }else if(typeof arg[0] == 'string'){
      let obj = JSON.parse(arg[0])
      this.length = parseInt(obj.length)
      let indexes = Object.keys(obj.nodes)
      for (var i = 0; i < indexes.length; i++) {
        if(typeof obj.nodes[i] == 'string'){
          obj.nodes[i] = obj.nodes[i] === '0x0' ? Buffer.from([]) : Buffer.from(obj.nodes[i].slice(2), 'hex')
        }
      }
      this.nodes = obj.nodes
    }else{
      throw new Error('MemoryBasedDb constructor arguments not recognized')
    }
  }

  toJson(){
    let indexes = Object.keys(this.nodes)
    for (var i = 0; i < indexes.length; i++) {
      this.nodes[i] = '0x' + this.nodes[i].toString('hex')
    }
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
