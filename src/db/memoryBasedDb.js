const rlp = require('rlp')
const Bn = require('bignumber.js')

class MemoryBasedDb {
  constructor(...args){
    if(args[0] == undefined || typeof args[0] == 'number'){
      this.leafLength = args[0] || 0
      this.nodes = args[1] || {} // i.e. { 3 : <buffer 4d 89 b8 0e 7f 98 ...>, 7 : <buffer 73 6d 26 a2 6c 9c ...> }
    // }else if(typeof arg[0] == 'object'){
    //   this.nodes = args[0].nodes
    //   this.leafLength = args[0].leafLength
    // }else if(typeof arg[0] == 'string'){
    //   let obj = JSON.parse(arg[0])
    //   this.length = parseInt(obj.length)
    //   let indexes = Object.keys(obj.nodes)
    //   for (var i = 0; i < indexes.length; i++) {
    //     if(typeof obj.nodes[i] == 'string'){
    //       obj.nodes[i] = obj.nodes[i] === '0x0' ? Buffer.from([]) : Buffer.from(obj.nodes[i].slice(2), 'hex')
    //     }
    //   }
    //   this.nodes = obj.nodes
    // }else{
    //   throw new Error('MemoryBasedDb constructor arguments not recognized')
    }
  }
  static fromSerialized(inputBytes){
    let arr = rlp.decode(inputBytes)
    // console.log("GGGGG", arr)
    let db = Object.create(this.prototype)
    db.leafLength = new Bn('0x' + arr[0].toString('hex')).toNumber()
    db.nodes = {}
    for (var i = 0; i < arr[1].length; i++) {
      db.nodes[new Bn('0x' + arr[1][i][0].toString('hex')).toNumber()] = arr[1][i][1]
    }
    return db
  }

  async get(index){
    return this.nodes[index]
  }
  async set(value, index){
    this.nodes[index] = value
  }
  async getLeafLength(){
    return this.leafLength
  }
  async setLeafLength(leafLength){
    return this.leafLength = leafLength
  }
  async getNodes(){
    return this.nodes
  }

  // async serialize(){
  //   let numToBuf = (num) => {
  //    let str = num.toString(16)
  //    return str.length % 2 == 0 ? Buffer.from(str, 'hex') : Buffer.from('0' + str, 'hex')
  //   }
  //   let bufferedNodes = []
  //   let indexes = Object.keys(this.nodes)
  //   for (var i = 0; i < indexes.length; i++) {
  //     let bufferedKey = 
  //     bufferedNodes.push([numToBuf(parseInt(indexes[i])), this.nodes[indexes[i]]])
  //   }
  //   return rlp.encode([this.leafLength, bufferedNodes])
  // }
}

module.exports = MemoryBasedDb
