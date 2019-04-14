const Position = require('./Position')
const { Lock } = require('semaphore-async-await')
const { keccakAndSum } = require('js-sha3')

class MMR{
  constructor(db, hash){
    this.db  = db
    this.hash = hash || keccakAndSum // default for ethereum
    this.lock = new Lock(1)
  }
  async get(leafIndex){
    await this.lock.acquire()
    let leafLength = await this.getLeafLength()
    let leafPosition = MMR.getNodePosition(leafIndex)
    let localPeakPosition = MMR.localPeakPosition(leafIndex, leafLength)
    let localPeakValue = await this._getNode(localPeakPosition)
    let leafValue = await this._verifyPath(localPeakPosition, localPeakValue, leafPosition)
    this.lock.release()
    return leafValue
  }
  async _getNode(position){
    let nodeLength = await this.nodeLength()
    let node = await this.db.get(position.i)
    if(position.i < nodeLength){
      if(node){
        return node
      }else if(position.h > 0){ // implied node
        let leftChildValue = await this._getNode(MMR.leftChildPosition(position))
        let rightChildValue = await this._getNode(MMR.rightChildPosition(position))
        return this.hash(leftChildValue, rightChildValue)
      }
    }
    throw new Error("Missing nodes in DB")
  }

  async put(value, leafIndex){
    await this.lock.acquire()
    let leafLength = await this.getLeafLength()
    if(leafIndex == undefined){ leafIndex = leafLength } // append to the end
    let nodeIndex = MMR.getNodePosition(leafIndex).i
    await this._setLeafLength(leafIndex) // in case of shutdown in the middle
    await this._put(value, nodeIndex, MMR.localPeakPosition(leafIndex, leafLength))
    await this._setLeafLength(leafLength)
    this.lock.release()
  }

  async _put(value, nodeIndex, localPeakPosition){ // separate into put and append. needs work
    let mountainPositions = MMR.mountainPositions(localPeakPosition, nodeIndex)
    await this.db.set(nodeIndex, value)
    await this._hashUp(mountainPositions)
  }
  async getRoot(leafIndex){
    await this.lock.acquire()
    if(leafIndex == undefined){ leafIndex = await this.getLeafLength() - 1 }
    let peakPositions = MMR.peakPositions(leafIndex)
    let peakValues = Buffer.alloc(0)
    for (var i = 0; i < peakPositions.length; i++) {
      let currentPeakValue = await this._getNode(peakPositions[i])
      peakValues = Buffer.concat([peakValues, currentPeakValue]
    }
    this.lock.release()
    return this.hash(peakValues) // note: a single peak will differ from its MMR root (it'll get hashed a second time)
  }
  // async verifyRoot(inputRoot, leafIndex) {
  //   if(leafIndex == undefined){ leafIndex = await this.getLeafLength() - 1 }
  //   let root = await this.getRoot(leafIndex)
  //   return root.equals(inputRoot)
  // }
  async _verifyPath(currentPosition, currentValue, leafPosition){ // verifies as it walks
    if(currentPosition.i == leafPosition.i){ // base case
      return currentValue
    }else{
      let leftChildPosition = MMR.leftChildPosition(currentPosition)
      let rightChildPosition = MMR.rightChildPosition(currentPosition)
      let leftValue = await this._getNode(leftChildPosition)
      let rightValue = await this._getNode(rightChildPosition)
      if(!currentValue.equals(this.hash(leftValue, rightValue))){
        throw new Error('Hash mismatch of node #' + currentPosition.i ' and its children')
      }
      if(leafPosition.i > currentPosition.i - 2**currentPosition.h - currentPosition.h + 1){ //umm yeah, check this line
        return this._verifyPath(rightChildPosition, rightValue, leafPosition)
      }else{
        return this._verifyPath(leftChildPosition, leftValue, leafPosition)
      }
    }
  }

  async getNodeLength(){ // caching
    if(this._nodeLength == undefined){ // dirty length
      let leafLength = await this.getLeafLength()
      this._nodeLength = MMR.getNodeLength(leafLength)
    }
    return this._nodeLength
  }
  async getLeafLength(){ // caching
    if(this._leafLength == undefined){// dirty length
      this._leafLength = this.db.getLeafLength()
    }
    return this._leafLength
  }
  async delete(leafIndex){ // logically deletes everything after (and including) leafIndex
    // work on this though, because if the indices are still present other functions may return values 
    // when they shouldnt. i.e. `__hasNode` and even `get`
    // added the check to `_getNode` so I think this should be fine
    await this.lock.acquire()
    let leafLength = await this.getLeafLength()
    if(leafIndex < leafLength){
      await this._setLeafLength(leafIndex)
    }
    this.lock.release()
  }
  async _setLeafLength(leafLength){ // must be called during semaphore
    await this.db.setLeafLength(leafLength)
    this._leafLength = leafLength
    this._nodeLength = MMR.getNodeLength(leafLength)
  }
  async _hashUp(positionPairs){
    for (var i = positionPairs.length - 1; i >= 0 ; i--) {
      let leftValue = await this._getNode(positionPairs[i][0].i)
      let rightValue = await this._getNode(positionPairs[i][1].i)
      let writeIndex = MMR.parentIndex(positionPairs[i][0])
      await this.db.set(writeIndex, this.hash(leftValue, rightValue))
    }
  }



  static getNodeLength(leafLength){
    return this.getNodePosition(leafLength).i
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
  static parentIndex(position){
    if(position.r){
      return position.i + 1
    }else{
      return position.i + 2**(position.h + 1)
    }
  }

  static peakPositions(leafIndex){ // leafIndex gets used as a kindof accumulator
    let currentPosition = this.superUmbrellaPeakFromLeafIndex(leafIndex)
    let peakPositions = []
    while(leafIndex >= 0){
      currentPosition = this.leftChildPosition(currentPosition)
      if(leafIndex >= 2**currentPosition.h - 1){
        peakPositions.push(currentPosition)
        currentPosition = this.siblingPosition(currentPosition)
        leafIndex -= 2**currentPosition.h
      }
    }
    return peakPositions
  }
  static localPeakPosition(leafIndex, leafLength){
    let lastLeafIndex = leafIndex >= leafLength ? leafIndex : leafLength - 1
    return MMR._localPeakPosition(leafIndex, MMR.peakPositions(lastLeafIndex))
  }
  static _localPeakPosition(leafIndex, peakPositions){
    for (var i = 0; i < peakPositions.length; i++) {
      let currentRange = 2**(peakPositions[i].h - 1)
      if(leafIndex <= currentRange - 1){
        return peakPositions[i]
      }else{
        leafPosition -= currentRange
      }
    }
  }

  static mountainPositions(currentPosition, targetIndex){ // positions to hash after appending
    let mountainPositions = []
    while (currentPosition.h > 0) {
      let children = [this.leftChildPosition(currentPosition), this.rightChildPosition(currentPosition)]
      mountainPositions.push(children)
      if(targetIndex > currentPosition.i - 2**currentPosition.h - currentPosition.h + 1){
        currentPosition = children[1]
      }else{
        currentPosition = children[0]
      }
    }
    return mountainPositions
  }

  static superUmbrellaPeakFromLeafIndex(leafIndex){ //hopeuflly easy to change to super-umbrella too
    let peakHeight = 0
    while(2**peakHeight <= leafIndex + 1){ peakHeight++ }
    return [2**(peakHeight + 1) - 2, peakHeight, false]
  }

  static getNodePosition(leafIndex){ //leafIndex >= 2**exponent
    let currentPosition = this.superUmbrellaPeakFromLeafIndex(leafIndex) // would work using super-umbrella
    let accumulator = 0
    while(currentPosition.h > 0){
      let serviceRange = 2**(currentPosition.h - 1)
      if(leafIndex >= accumulator + serviceRange){ // can be switched to while loop if using super-umbrella
        currentPosition = this.rightChildPosition(currentPosition)
        accumulator += serviceRange
      }else{
        currentPosition = this.leftChildPosition(currentPosition)
      }
    }
    return currentPosition
  }



  async getProof(leafIndices){
    let leafLength = await this.getLeafLength()
    // let mmr = new MMR(new MemoryBasedDb(leafLength), this.hash)
    // let proofNodes = {}
    let peakPositions = MMR.peakPositions(leafLength - 1)
    for (var i = 0; i < leafIndices.length; i++) {
      let currentProofPositions = MMR.getProofPositions(leafIndices[i], peakPositions)
      for (var i = 0; i < currentProofPositions.length; i++) {
        proofNodes[currentProofPositions[i].i] = await this._getNode(currentProofPositions)
      }
    }

    leafIndices.forEach((leafIndex)=>{
      let peakPositions = MMR.peakPositions(leafIndex)
      await Promise.all(peakPositions.map((peakPosition)=>{
        return this.db.get(peakPosition.i).then((value)=>{
          return mmr.db.set(peakPosition.i, value)
        })
      }))
    })
    await Promise.all(leafIndices.map((leafIndex)=>{
      return MMR.getProof(leafIndex)
    })

    await Promise.all(leafIndices.map((leafIndex)=>{
      return MMR.getProof(leafIndex)
    })

    await proofDb.getIndices()

    // let proofDb = {}
  }

  static getProofPositions(leafIndex){
    let leafLength = await this.getLeafLength()
    let proofDb = new MemoryBasedDb(leafLength)
  }


  async _removeImpledNodes(){
    let indices = this.db.getIndices()
    this.db.getIndices((key, position)=>{
      if(position.h > 0){
        if(this._hasNode(MMR.leftChildPosition(position),proofDb) 
          && this._hasNode(MMR.rightChildPosition(position),proofDb)
        ){
          delete proofDb[key]
        }
      }
    })
  }
  async _hasNode(position){
    try{
      let node = await this._getNode(position.i)
      return !!node
    } catch(){
      return false
    }
  }


  async print(){
    // json string
  }
  // async getBagPositions(proofDb, leafIndex){}
  // async getLocalMountainPositions(leafIndex){ // but does this func work?
  //   let leafLength = await this.db.getLeafLength()
  //   // let nodeLength = MMR.getNodeLength(leafLength)

  //   let targetPosition = MMR.getNodePosition(leafIndex)
  //   let localPeakPosition = MMR.localPeakPosition(leafIndex, leafLength)
  //   let leaf = await this._verifyPath(localPeakPosition, targetPosition)
  //   // return proofDb
  // }




// think i can get rid of the rest soon

  // async _hasNode(position){
  //   let node = await this.db.get(position.i)
  //   if(node){
  //     return true
  //   }else if(position.h > 0){ // implied node
  //     let hasLeftNode = await this._hasNode(MMR.leftChildPosition(position))
  //     let hasRightNode = await this._hasNode(MMR.rightChildPosition(position))
  //     return hasLeftNode && hasRightNode
  //   }else{
  //     return false
  //   }
  // }

  // static localPeakPosition(leafIndex, leafLength){ // nonexistent index will return the peak that comes with it
  //   let lastLeafIndex = leafIndex >= leafLength ? leafIndex : leafLength - 1
  //   let currentPosition = this.leftChildPosition(this.superUmbrellaPeakFromLeafIndex(lastLeafIndex))
  //   let accumulator = 2**currentPosition.h
  //   while(leafIndex >= accumulator){
  //     accumulator += 2**currentPosition.h
  //     currentPosition = this.siblingPosition(currentPosition)
  //     currentPosition = this.leftChildPosition(currentPosition)
  //   }
  //   return currentPosition
  // }

  // async put(value, leafIndex){
  //   await this.lock.acquire()
  //   let leafLength = await this.getLeafLength()
  //   if(leafIndex == undefined || leafIndex == leafLength){ // 'append' 
  //     let nodeIndex = await this.getNodeLength()
  //     await this._put(value, nodeIndex, MMR.firstLeftParentPosition(leafLength))
  //     await this._setLeafLength(leafLength)
  //   }else if(leafIndex < leafLength){
  //     let nodeIndex = MMR.getNodePosition(leafIndex).i
  //     await this._setLeafLength(leafIndex) // in case of shutdown in the middle
  //     await this._put(value, nodeIndex, MMR.localPeakPosition(leafIndex, leafLength))
  //     await this._setLeafLength(leafLength)
  //   }else{
  //     throw new Error('Can not add leaf #'+ leafIndex + ' until leaf #' + (leafIndex -1))
  //   }
  //   this.lock.release()
  // }

  // static firstLeftParentPosition(leafIndex){
  //   let peakPositions = this.peakPositions(leafIndex)
  //   let currentHeight = 0
  //   let currentIndex = peakPositions[peakPositions.length - 1].i + 1 // last index + 1
  //   for (var i = peakPositions.length - 1; i >= 0; i--) { // average of only <2 iterations here
  //     if(currentHeight < peakPositions[i].h){
  //       return new Position(currentIndex, currentHeight, false)
  //     }else{
  //       currentHeight++
  //       currentIndex++
  //     }
  //   }
  //   return new Position(currentIndex, currentHeight, false)
  // }


  // async _getLeaf(leafIndex){ //not sure if this should be get or _get
  //   await this.lock.acquire()
  //   let leaf = await this._getNode(MMR.getNodePosition(leafIndex))
  //   this.lock.release()
  //   return leaf
  // }

  // async append(value){
  //   await this.lock.acquire()
  //   let leafIndex = await this.getLeafLength() // next index is the current length
  //   await this._put(value, leafIndex)
  //   // await this._put(value, nodeIndex, MMR.firstLeftParentPosition(leafIndex))
  //   // await this._setLeafLength(leafIndex + mountainPositions.length)
  //   this.lock.release()
  // }
  // static superUmbrellaPeakFromNodeIndex(nodeIndex){
  //   let peakHeight = 0
  //   while(2**(peakHeight + 1) <= nodeIndex + 2){ peakHeight++ } //change nodeIndex+1 to nodeIndex for super-umbrella
  //   return [2**(peakHeight + 1) - 2, peakHeight, false]
  // }
  // static positionFromNodeIndex(nodeIndex){
  //   let currentPosition = this.superUmbrellaPeakFromNodeIndex(nodeIndex) // should work fine using super-umbrella
  //   while(currentPosition.i > nodeIndex){
  //     currentPosition = this.rightChildPosition(currentPosition)
  //     if(currentPosition.i > nodeIndex){
  //       currentPosition = this.siblingPosition(currentPosition)
  //     }
  //   }
  //   return currentPosition
  // }
// and these

  // static peakPositions(nodeIndex){ 
  //   let currentPosition = this.superUmbrellaPeakFromNodeIndex(nodeIndex)
  //   let peakPositions = []
  //   while(currentPosition.h >= 0){
  //     currentPosition = this.leftChildPosition(currentPosition)
  //     if(currentPosition.i <= nodeIndex){
  //       peakPositions.push(currentPosition)
  //       currentPosition = this.siblingPosition(currentPosition)
  //     }
  //   }
  //   return peakPositions
  // }
  // static firstLeftParentPosition(nodeIndex){
  //   let peaks = this.peakPositions(nodeIndex)
  //   // let currentPeak = new Position(nodeLength, 0, false) // rightness unknown
  //   let currentHeight = 0
  //   let currentIndex = peakPositions[peakPositions.length - 1].i + 1 // last index + 1
  //   for (var i = peaks.length - 1; i >= 0; i--) { // average of 1 iteration here
  //     if(currentHeight < peaks[i].h){
  //       return new Position(currentIndex, currentHeight, false)
  //     }else{
  //       currentHeight++
  //       currentIndex++
  //     }
  //   }
  //   return new Position(currentIndex, currentHeight, false)
  // }
//whats the fuckin holdup on these 2?

  // static mountainPositions(localPeakPosition, leafIndex){ // new one that I tried and didnt work
  //   let mountainPositions = []
  //   while (localPeakPosition.h > 0){
  //     let leftChild = this.leftChildPosition(localPeakPosition)
  //     let rightChild = this.rightChildPosition(localPeakPosition)
  //     mountainPositions.push([leftChild, rightChild])
  //     if(targetIndex > localPeakPosition.i/2 - 2**(localPeakPosition.h-1) - localPeakPosition.h ){//dont know how this works
  //     // if(targetIndex > localPeakPosition.i - 2**localPeakPosition.h - localPeakPosition.h + 1){//dont know how this works
  //       localPeakPosition = rightChild
  //     }else{
  //       localPeakPosition = leftChild
  //     }
  //   }
  //   return mountainPositions
  // }
  // static peakPositions(nodeLength){ // old one used nodeLength so we need to keep it for now
  //   let currentPosition = this.superUmbrellaPeakFromNodeIndex(nodeLength - 1)
  //   let peakPositions = []
  //   while(currentPosition.h >= 0){
  //     currentPosition = this.leftChildPosition(currentPosition)
  //     if(currentPosition.i < nodeLength){
  //       peakPositions.push(currentPosition)
  //       currentPosition = this.siblingPosition(currentPosition)
  //     }
  //   }
  //   return peakPositions
  // }
  // static firstPeakPosition(nodeIndex){ 
  //   let peakHeight = 0
  //   while(2**peakHeight <= nodeIndex + 2){ peakHeight++ }
  //   peakHeight -= 2
  //   return [2**(peakHeight + 1) - 2, peakHeight, false]
  // }
// // class Position{ constructor(...args){ return [...args] } }
  // static localPeakPosition(nodeIndex, nodeLength){ // 2log(n)+ log(log(n)) // unchecked
  //   //deosnt catch erronious data watch out. i.e. this._localPeakPosition(7,7) give wrong answer
  //   let currentPeak = this.firstPeakPosition(nodeLength - 1) // remove `firstPeakPos` dependency
  //   while(currentPeak.h >= 0 && currentPeak.i < nodeIndex){
  //     currentPeak = this.siblingPosition(currentPeak)
  //     while(currentPeak.i >= nodeLength && currentPeak.h >= 0){
  //       currentPeak = this.leftChildPosition(currentPeak)
  //     }
  //   }
  //   return currentPeak
  // }
  // static peakPositions(nodeLength){ // 2log(n) // working
  //   if(nodeLength == 0){ return [] } // should actually work fine without this line
  //   let currentPeak = this.firstPeakPosition(nodeLength - 1)
  //   let peakPositions = []
  //   while(currentPeak.h >= 0){
  //     peakPositions.push(currentPeak)
  //     currentPeak = this.siblingPosition(currentPeak)
  //     while(currentPeak.i >= nodeLength && currentPeak.h >= 0){
  //       currentPeak = this.leftChildPosition(currentPeak)
  //     }
  //   }
  //   return peakPositions
  // }
  // static peakPositions(nodeLength){ // actually wont work. will add an extra peak at the bottom
  //   if(nodeLength == 0){ return [] } 
  //   let currentPosition = this.superUmbrellaPeakFromNodeIndex(nodeLength - 1)
  //   if(currentPosition.i == nodeLength){ return [currentPosition]}
  //   let peakPositions = []
  //   while(currentPosition.h >= 0){
  //     while(currentPosition.i >= nodeLength){
  //       currentPosition = this.leftChildPosition(currentPosition)
  //     }
  //     peakPositions.push(currentPosition)
  //     currentPosition = this.siblingPosition(currentPosition)
  //   }
  //   return peakPositions
  // }
  // static umbrellaPeakFromLeafIndex(leafIndex){ //hopeuflly easy to change to super-umbrella too
  //   let peakHeight = 0
  //   while(2**peakHeight <= leafIndex){ peakHeight++ }
  //   return new Position(2**(peakHeight + 1) - 2, peakHeight, false)
  // }
  // static umbrellaPeakFromNodeIndex(nodeIndex){
  //   let peakHeight = 0
  //   while(2**(peakHeight + 1) <= nodeIndex + 1){ peakHeight++ } //change nodeIndex+1 to nodeIndex for super-umbrella
  //   return new Position(2**(peakHeight + 1) - 2, peakHeight, false)
  // }
  // static parentIndex(position){
  //   if(position.r){
  //     return new Position(position.i + 1, position.h + 1)
  //   }else{
  //     return new Position(position.i + 2**(position.h + 1), position.h + 1)
  //   }
  // }
  // static _logFloor(num){ 
  //   let exp = 0
  //   while(2**exp <= num){ exp++ }
  //   return exp - 1
  // }
  // static rightness(nodeIndex){ // use by Node. clean this up
  //   let peakHeight = this.firstPeakPosition(nodeIndex).h
  //   while(peakHeight > -2){
  //     if(2**(peakHeight + 2) - 2 == nodeIndex){
  //       return false
  //     }
  //     if(2**(peakHeight + 2) - 2 < nodeIndex){
  //       nodeIndex = nodeIndex - (2**(peakHeight+2) - 1)
  //     } 
  //     if(2**(peakHeight + 2) - 2 == nodeIndex){
  //       return true
  //     }
  //     peakHeight--
  //   }
  // }
// //actually it is in use by Position class
//   static height(nodeIndex){ //great
//     let firstPeak = this.firstPeakPosition(nodeIndex)
//     let currentHeight = firstPeak.h
//     while(currentHeight > -2){
//       if(2**(currentHeight + 2) - 2 < nodeIndex){
//         nodeIndex = nodeIndex - (2**(currentHeight+2) - 1)
//       } 
//       if(2**(currentHeight + 2) - 2 == nodeIndex){
//         return currentHeight + 1
//       }
//       currentHeight--
//     }
//   }
  // static getNodePosition(leafIndex){ // works for lengths as well
  //   if(leafIndex == undefined){ return new Position(-1) } //check needed?
  //   let nodeIndex = 0
  //   let exponent = this._logFloor(leafIndex + 1)
  //   while(exponent >= 0){
  //     if(leafIndex >= 2**exponent){
  //       nodeIndex += 2**(exponent+1)-1
  //       leafIndex -= 2**exponent
  //     }
  //     exponent--
  //   }
  //   return new Position(nodeIndex, 0)
  // }
  // static peakHeight(nodeIndex){ 
  //   return this._logFloor(nodeIndex + 2) - 1
  // }
  // static _isValidNodeLength(nodeLength){ // final node should always be "Left"
  //   return !this.rightness(nodeLength-1)
  // }
  // print(){}
  // static bagProof(length){}
  // static localPeakProof(length){}
  // async getPeakTreeNode(){}
  // async bagRoot(){}
}

module.exports = MMR
