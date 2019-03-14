// const DB = require('./db')
const Node = require('./node')
const { Lock } = require('semaphore-async-await')
const { keccak256 } = require('js-sha3')


class MMR{
  constructor(db, hashingFunction){
    this.db  = db
    this.hashingFunction = hashingFunction || keccak256
    this.lock = new Lock(1)
  }

  async get(n){
    let index = MMR.get(n)

    await this.lock.acquire()
    let leaf = await this.db.read(index)
    this.lock.release()
    return leaf
  }
  async put(value, n){
    // semtake
    // if(!n){ n = this.LeafLength() } // requiring n for now
    await this.lock.acquire()
    await this._put(value, MMR.get(n))
    this.lock.release()
    // semleave
  }

  async _put(value, i){
    let length = await this.db.nodeLength()
    let nodePairs = MMR.relevantNodes(length, i)
    await this.db.write(value, i)
    console.log("HHHHH", nodePairs, length, i)
    return this._hashUp(nodePairs)
  }

  async root(){ // merklizes the peaks // not working right yyet!
//consider semephore here // maybe not
//seriously consider MMR.root(length) function that returns indices
    let length = await this.db.nodeLength()
    console.log("L ",length)
    let currentRow = await this.db.readBatch(MMR.peakIndices(length))
    // let currentRow = await this.peaks(length)
    console.log("currntRow ", currentRow)


    while(currentRow.length > 1) {


// for (var i = 0; i < currentRow.length; i++) {
//   console.log(currentRow[i].toString(16))
// }


      let parentRow = []
      for (var i = 1; i < currentRow.length; i += 2) {
        let hash = await this._hash(currentRow[i-1],currentRow[i])
        parentRow.push(hash)
      }
      if(currentRow.length % 2 == 1) { parentRow.push(currentRow[currentRow.length-1])}
      currentRow = parentRow
    }
    return currentRow[0]
  }

//   async peaks(length){
// //consider semephore here
//     // let length = this.db.nodeLength()
//     return this.db.readBatch(MMR.peakIndices(length))

//   }

  async _hashUp(nodePairs){
    for (var i = 0; i < nodePairs.length; i++) {
      let leftChild = await this.db.read(nodePairs[i][0].i)
      let rightChild = await this.db.read(nodePairs[i][1].i)
      await this.db.write(this._hash(leftChild, rightChild))

    }
  }

  _hash(a, b) {
    if(b){
      return Buffer.from(this.hashingFunction(Buffer.concat([a, b])),'hex')
    }else{
      return Buffer.from(this.hashingFunction(a),'hex')
    }
  }


  print(){

  }

  // static bagProof(length){}
  // static localPeakProof(length){}


  static relevantNodes(length, i){ // indexes to hash after update (at the end ONLY)
    let nodes = []
    let node = new Node(i || length)

    while(node.r || node.i + 1 < length){
      if(node.r){
        nodes.push([this.siblingNode(node), node])
      }else{
        nodes.push([node, this.siblingNode(node)])
      }
      node = this.parentNode(node)
    }
    return nodes
  }

  static get(n){
    let index = 0
    let exponent = this.logFloor(n + 1)
    while(exponent >= 0){
      if(n >= 2**exponent){
        index += 2**(exponent+1)-1
        n -= 2**exponent
      }
      exponent--
    }
    return index
  }

  static localPeak(leafIndex, length){ // 2log(n)+ log(log(n))
  //might need a method like this that takes the localPeak i
    let peakNodes = MMR.peakNodes(length)
    for (var i = 0; i < peakNodes.length; i++) {
      if(leafIndex * 2 <= peakNodes[i].i){
        return peakNodes[i]
      }
    }
  }
  static localPeakPath(localPeak, nodeIndex){ //
  // assume local peak is correct for n
    let nodePath = [localPeak]
    for (let h = localPeak.h ; h > 0; h--) {
      if(nodePath[nodePath.length-1].i - nodeIndex < 2**h){
        nodePath.push(MMR.rightChildNode(nodePath[nodePath.length-1]))
      } else{
        nodePath.push(MMR.leftChildNode(nodePath[nodePath.length-1]))
      }
    }
    return nodePath // untested
  }
  // static leftSib(i, h){ //must have one
  //   return i + 1 - 2**(this.height(i) + 1)
  // }
  // static rightSib(i, h){ //must have one
  //   return i + 2**(this.height(i) + 1) - 1
  // }
  // static leftChild(i){ //must have one
  //   return i - 2**this.height(i)
  // }
  // static rightChild(i){ //must have one
  //   return i - 1;
  // }
  static leftChildNode(node){
    return new Node(node.i - 2**node.h, node.h - 1, false)
  }
  static rightChildNode(node){
    return new Node(node.i - 1, node.h - 1, true)
  }
  static siblingNode(node){
    let multiplier = node.r ? -1 : 1
    return new Node (node.i + multiplier * (2**(node.h + 1) - 1), node.h, !node.r)
  }
  static parentNode(node){
    if(node.r){
      return new Node(node.i + 1, node.h + 1)
    }else{
      return new Node(node.i + 2**(node.h + 1), node.h + 1)
    }
  }


  static rightness(i){ // use by Node. clean this up
    let ph = this.peakHeight(i+1)
    while(ph > - 2){
      if(2**(ph+2) - 2 == i){
        return false
      }
      if(2**(ph+2) - 2 < i){
        i = i - (2**(ph+2) - 1)
      } 
      if(2**(ph+2) - 2 == i){
        return true
      }
      ph--
    }
  }
  static _isCorrupt(length){ // final node should always be "Left"
    return this.rightness(length-1)
  }

  static peakIndices(length){
    if(length == 0){ return [] }
    let h = this.peakHeight(length)
    let is = [2**(h+1)-2]
    while(h > 0){
      h--
      let np = is[is.length-1] + 2**(h+1)-1
      if(length > np){
        is.push(np)
      }
    }
    return is
  }
  static peakNodes(length){ // 2log(n)
    if(length == 0){ return [] }
    let peak = this.peakNode(length)
    let currentH = peak.h
    let peakNodes = [thisPeak]
    while(currentPeak > 0){
      currentPeak--
      let nextPeakI = peakNodes[peakNodes.length - 1].i + 2**(currentPeak + 1) - 1
      if(length > nextPeakI){
        peakNodes.push(new Node(nextPeakI, currentPeak, true))
      }
    }
    return peakNodes
  }


  static peakHeight(length){ 
    return this.logFloor(length + 1) - 1
  }

  static logFloor(num){ 
    let exp = 0
    while(2**exp <= num){ exp++ }
    return exp - 1
  }
  static height(i){ 
    let ph = this.peakHeight(i + 1)
    while(ph > - 2){
      if(2**(ph+2) - 2 < i){
        i = i - (2**(ph+2) - 1)
      } 
      if(2**(ph+2) - 2 == i){
        return ph + 1
      }
      ph--
    }
  }
//not in use
  static peak(length){
    let peakHeight = this.logFloor(length + 1) - 1
    return new Node((2**peakHeight + 1) - 2, peakHeight, false)
  }
}

module.exports = MMR
