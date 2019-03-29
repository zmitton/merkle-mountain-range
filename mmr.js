const Position = require('./Position')
const { Lock } = require('semaphore-async-await')
const { keccakAndSum } = require('js-sha3')

// class PeakTree{
//   constructor()
// }


class MMR{
  constructor(db, hash){
    this.db  = db
    this.hash = hash || keccakAndSum // default for ethereum
    this.lock = new Lock(1)
  }
  // async getPeakTreeNode(){}
  // async bagRoot(){}

  async get(leafIndex){ // _should_ drill down into the tree for the specified leaf
    // verifying each hash as is goes. Functionally deals with missing nodes
    // by recursivly getting the hash of their children instead
    await this.lock.acquire()
    let leafLength = await this.db.getLeafLength()
    nodeLength = MMR.getNodeLength(leafLength)
    let position = MMR.getPosition(leafIndex)
    let localPeak = MMR.localPeak(position.i, nodeLength)
    this.walk(localPeak,)

    // let leaf = await this.getNode(MMR.getPosition(leafIndex))
    this.lock.release()
    return leaf
  }
  async getNode(position){
    let node = await this.db.get(position.i)
    if(node){
      return node
    }else{
      if(position.h == 0){
        throw new Error("Missing nodes in DB")
      }else{
        let leftChild = await this.getNode(MMR.leftChild(position))
        let rightChild = await this.getNode(MMR.rightChild(position))
        return this.hash(leftChild, rightChild)
      }
    }
  }

  async put(value, leafIndex){ // separate into put and append
    await this.lock.acquire()
    let nodeIndex, peak
    let nodeLength = await this.getNodeLength() // next index is the current length

    if(leafIndex == undefined || MMR.getPosition(leafIndex).i >= nodeLength){
      nodeIndex = nodeLength
      peak = MMR.newPeak(nodeIndex)
    }else{
      nodeIndex = MMR.getPosition(leafIndex).i
      if(nodeIndex > nodeLength){ throw new Error('cannot add leaf #'+ leafIndex + " yet") } 
      peak = MMR.localPeak(nodeIndex, nodeLength)
    }

    let mountainBranchNodes = MMR.moutainBranchNodes(peak, new Position(nodeIndex))
    // console.log("FROM APAPEND ", mountainBranchNodes)
    await this.db.write(value, nodeIndex)
    await this._hashUp(mountainBranchNodes)
    this.lock.release()
  }

  async root(){
    let peaks = MMR.peakPositions(this.getNodeLength())
  }



  async getNodeLength(){ // caching
    if(!this._nodeLength){ // dirty length
      let leafLength = await this.getLeafLength()
      this._nodeLength = MMR.getNodeLength(leafLength)
    }
    return this._nodeLength
  }
  async getLeafLength(){ // caching
    if(!this._leafLength){// dirty length
      this._leafLength = this.db.getLeafLength()
    }
    return this._leafLength
  }
  async _setLeafLength(leafLength){ // must be called during semaphore
    await this.db.setLeafLength(leafLength)
    this._leafLength = leafLength
    this._nodeLength = MMR.getNodeLength(leafLength)
  }
  // async nodeLength(){
  //   // return this.db.nodeLength()
  //   let length = await this.db.nodeLength()
  //   if(!MMR._isValidNodeLength(length)){ // leave this check only though testing
  //     throw new Error("isCorrupt length for tree " + length)
  //   }
  //   return length
  // }
  // async leafLength(){
  //   let nodeLength = await this._nodeLength()
  //   return MMR.getLeafIndex(nodeLength - 1) + 1
  // }

  async _hashUp(positionPairs){
    // console.log("NODE PAIRS LENGTH ",positionPairs.length)
    for (var i = positionPairs.length - 1; i >= 0 ; i--) {
      // console.log("NODE PAIRS ",positionPairs, "i", i)
      // console.log("NODE PAIRS [i]", i)
      let leftValue = await this.db.read(positionPairs[i][0].i)
      let rightValue = await this.db.read(positionPairs[i][1].i)
      let writeIndex = MMR.parentPosition(positionPairs[i][0]).i
      await this.db.write(this.hash(leftValue, rightValue), writeIndex)
    }
  }

  static getNodeLength(leafLength){ 
    
  }

  static getPosition(leafIndex){
    if(leafIndex == undefined){ return new Position(-1) } //check needed?
    let nodeIndex = 0
    let exponent = this._logFloor(leafIndex + 1)
    while(exponent >= 0){
      if(leafIndex >= 2**exponent){
        nodeIndex += 2**(exponent+1)-1
        leafIndex -= 2**exponent
      }
      exponent--
    }
    return new Position(nodeIndex, 0)
  }
  static leftChildPosition(position){
    return new Position(position.i - 2**position.h, position.h - 1, false)
  }
  static rightChildPosition(position){
    return new Position(position.i - 1, position.h - 1, true)
  }
  static siblingPosition(position){
    let multiplier = position.r ? -1 : 1
    return new Position (position.i + multiplier * (2**(position.h + 1) - 1), position.h, !position.r)
  }
  static parentPosition(position){
    if(position.r){
      return new Position(position.i + 1, position.h + 1)
    }else{
      return new Position(position.i + 2**(position.h + 1), position.h + 1)
    }
  }

  // print(){}
  // static bagProof(length){}
  // static localPeakProof(length){}


  static peakHeight(nodeIndex){ 
    return this._logFloor(nodeIndex + 2) - 1
  }
  static rightness(nodeIndex){ // use by Node. clean this up
    let peakHeight = this.peakHeight(nodeIndex)
    while(peakHeight > -2){
      if(2**(peakHeight + 2) - 2 == nodeIndex){
        return false
      }
      if(2**(peakHeight + 2) - 2 < nodeIndex){
        nodeIndex = nodeIndex - (2**(peakHeight+2) - 1)
      } 
      if(2**(peakHeight + 2) - 2 == nodeIndex){
        return true
      }
      peakHeight--
    }
  }

// nodeLength
  static peakPositions(nodeLength){ // 2log(n) // working
    if(nodeLength == 0){ return [] } // should actually work fine without this line
    let currentPeak = this.firstPeak(nodeLength)
    let peakPositions = []
    while(currentPeak.h >= 0){
      peakPositions.push(currentPeak)
      currentPeak = this.siblingPosition(currentPeak)
      while(currentPeak.i >= nodeLength && currentPeak.h >= 0){
        currentPeak = this.leftChildPosition(currentPeak)
      }
    }
    return peakPositions
  }
  // static localPeak(leafIndex, nodeLength){ /// draft, if needed, rename the other to _localPeak
  //   return this._localPeak(this.getPosition(leafIndex), nodeLength)
  // }
  static localPeak(nodeIndex, nodeLength){ // 2log(n)+ log(log(n)) // unchecked
    //deosnt catch erronious data watch out. i.e. this._localPeak(7,7) give wrong answer
    let currentPeak = this.firstPeak(nodeLength)
    while(currentPeak.h >= 0 && currentPeak.i < nodeIndex){
      currentPeak = this.siblingPosition(currentPeak)
      while(currentPeak.i >= nodeLength && currentPeak.h >= 0){
        currentPeak = this.leftChildPosition(currentPeak)
      }
    }
    return currentPeak
  }


  static newPeak(nodeLength){ // peaknode()[O2logn] + O(1)
  // the local peak will exist for the next appended item
    let peaks = this.peakPositions(nodeLength)
    let currentPeak = new Position(nodeLength, 0, false) // rightness unknown
    for (var i = peaks.length - 1; i >= 0; i--) { // average of 1 iteration here
      if(currentPeak.h < peaks[i].h){
        return currentPeak
      }else{
        currentPeak = new Position(currentPeak.i + 1, currentPeak.h + 1, false)
      }
    }
    return currentPeak
  }

  static moutainBranchNodes(currentNode, targetNode){ // indexes to hash after appending
    // console.log("newPEak ", currentNode, "nodeindex ", targetNode.i, "\n\n")
    let mountainBranchNodes = []
    while (currentNode.h > 0) {
      // console.log("\n\n", currentNode.i, " BRANCH NODES\n", mountainBranchNodes)
      let children = [this.leftChildPosition(currentNode), this.rightChildPosition(currentNode)]
      // console.log("CHILDREN\n", children)
      mountainBranchNodes.push(children)
      if(targetNode.i > currentNode.i - 2**currentNode.h - currentNode.h + 1){
        currentNode = children[1]
      }else{
      // console.log("CHILD 0\n", children[0])
        currentNode = children[0]
      }
    }
      // console.log("BRANCH NODES RETURNING\n", mountainBranchNodes)

    return mountainBranchNodes
  }





  static _logFloor(num){ 
    let exp = 0
    while(2**exp <= num){ exp++ }
    return exp - 1
  }
  static _isValidNodeLength(nodeLength){ // final node should always be "Left"
    return !this.rightness(nodeLength-1)
  }
  static firstPeak(length){
    if(length == 0){ return new Position(-1, -1) }
    let peakHeight = this._logFloor(length + 1) - 1
    return new Position(2**(peakHeight + 1) - 2, peakHeight, false)
  }
//not in use but totally works
  static height(nodeIndex){ //great
    let peakHeight = this.peakHeight(nodeIndex)
    while(peakHeight > -2){
      if(2**(peakHeight + 2) - 2 < nodeIndex){
        nodeIndex = nodeIndex - (2**(peakHeight+2) - 1)
      } 
      if(2**(peakHeight + 2) - 2 == nodeIndex){
        return peakHeight + 1
      }
      peakHeight--
    }
  }

}

module.exports = MMR



