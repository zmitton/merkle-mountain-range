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
    if(leafIndex >= leafLength){ throw new Error('Leaf not in tree') }// or `return null` (not sure whats best here)
    let leafPosition = MMR.getNodePosition(leafIndex)
    let localPeakPosition = MMR.localPeakPosition(leafIndex, leafLength)
    let localPeakValue = await this._getNodeValue(localPeakPosition)
    let leafValue = await this._verifyPath(localPeakPosition, localPeakValue, leafPosition)
    this.lock.release()
    return leafValue
  }
  async _verifyPath(currentPosition, currentValue, leafPosition){ // verifies as it walks
    if(currentPosition.i == leafPosition.i){ // base case
      return currentValue
    }else{
      let leftChildPosition = MMR.leftChildPosition(currentPosition)
      let rightChildPosition = MMR.rightChildPosition(currentPosition)
      let leftValue = await this._getNodeValue(leftChildPosition)
      let rightValue = await this._getNodeValue(rightChildPosition)
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
  async append(value, leafIndex){
    await this.lock.acquire()
    let leafLength = await this.getLeafLength()
    if(leafIndex == undefined || leafIndex == leafLength){
      let nodePosition = MMR.getNodePosition(leafIndex)
      await this._put(value, nodePosition, MMR.localPeakPosition(leafIndex, leafLength))
      await this._setLeafLength(leafIndex + 1)
    } else{
      throw new Error('Can only append to end of MMR')
    }
    this.lock.release()
  }
  async _put(value, nodePosition, localPeakPosition){ // separate into put and append. needs work
    let mountainPositions = MMR.mountainPositions(localPeakPosition, nodePosition.i)
    await this.db.set(nodePosition.i, value)
    await this._hashUp(mountainPositions)
  }
  async getRoot(leafIndex){
    await this.lock.acquire()
    if(leafIndex == undefined){
      leafIndex = await this.getLeafLength() - 1
    }
    let peakPositions = MMR.peakPositions(leafIndex)
    let peakValues = Buffer.alloc(0)
    for (var i = 0; i < peakPositions.length; i++) {
      let currentPeakValue = await this._getNodeValue(peakPositions[i])
      peakValues = Buffer.concat([peakValues, currentPeakValue]
    }
    this.lock.release()
    return this.hash(peakValues) // note: a single peak will differ from its MMR root (it'll get hashed a second time)
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
    // when they shouldnt. i.e. and even `get`
    // `get` checks the leafLength beforehand so all nodes will be within nodeLength
    await this.lock.acquire()
    let leafLength = await this.getLeafLength()
    if(leafIndex < leafLength){
      await this._setLeafLength(leafIndex)
    }
    this.lock.release()
  }
  async getProof(leafIndices){
    let leafLength = await this.getLeafLength()
    let finalPeakPositions = MMR.peakPositions(leafLength - 1)
    let proofMmr = new MMR(new MemoryBasedDb(leafLength), this.hash)
    let nodes = proofMmr.db.nodes
    let positions = {}

    for (let i = 0; i < leafIndices.length; i++) {
      //add bag portion for each
      let momentaryPeakPositions = MMR.peakPositions(leafIndices[i])
      for (let j = 0; j < momentaryPeakPositions.length; j++) {
        nodes[momentaryPeakPositions[j].i] = true
        positions[momentaryPeakPositions[j].i] = momentaryPeakPositions[j]
      }
      //add final local peak for each
      let finalLocalPeak = MMR._localPeakPosition(leafIndices[i], finalPeakPositions)
      nodes[finalLocalPeak.i] = true
      positions[finalLocalPeak.i] = finalLocalPeak
      //add mountain proof nodes for each (includes the leaf itself)
      let nodePosition = MMR.getNodePosition(leafIndices[i])
      let mountainPositions = MMR.mountainPositions(finalLocalPeak, nodePosition.i)
      for (let j = 0; j < mountainPositions.length; j++) {
        nodes[mountainPositions[j][0].i] = true
        nodes[mountainPositions[j][1].i] = true
        positions[mountainPositions[j][0].i] = mountainPositions[j][0]
        positions[mountainPositions[j][1].i] = mountainPositions[j][1]
      }
    }
    //clean damathafuckinproof
    //removes all implied nodes (ones which can be calculated besd on other nodes that are present)
    let positionIndices = Object.keys(positions)
    positionIndices.forEach((i) => {
      if(positions[i].h > 0){
        let hasLeftChild = await proofMmr._hasNode(MMR.leftChildPosition(positions[i]),proofDb)
        let hasRightChild = await proofMmr._hasNode(MMR.rightChildPosition(positions[i]),proofDb)
        if(hasLeftChild && hasRightChild){
          delete positions[i]
        }
      }
    })
    nodes = {} // reset nodes

    let self = this
    let reducedIndices = Object.keys(positions)
    await Promise.all(reducedIndices.map( async (i)=>{
      let nodeValue = await self._getNodeValue(position[i])
      nodes[position.i] = nodeValue
    }))
    // await proofMmr.db.setLeafLength(leafLength)
    return JSON.parse({nodes: proofMmr.db.nodes, leafLength: leafLength})
  }
  async _getNodeValue(position){
    // its the public function's responsibility to NOT request positions outside leafLength
    let nodeValue = await this.db.get(position.i)
    if(nodeValue){
      return nodeValue
    }else if(position.h > 0){ // implied node
      let leftChildValue = await this._getNodeValue(MMR.leftChildPosition(position))
      let rightChildValue = await this._getNodeValue(MMR.rightChildPosition(position))
      return this.hash(leftChildValue, rightChildValue)
    }
  }
  async _hasNode(position){
    try{
      let node = await this._getNodeValue(position.i)
      return !!node
    } catch(){
      return false
    }
  }
  async _setLeafLength(leafLength){ // must be called during semaphore
    await this.db.setLeafLength(leafLength)
    this._leafLength = leafLength
    this._nodeLength = MMR.getNodeLength(leafLength)
  }
  async _hashUp(positionPairs){
    for (var i = positionPairs.length - 1; i >= 0 ; i--) {
      let leftValue = await this._getNodeValue(positionPairs[i][0].i) // this will verify before each 
      let rightValue = await this._getNodeValue(positionPairs[i][1].i) // same
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
    //so if this took leaf length, it could do 3 seperate steps
    // 1-get peaks; 2-get local peak; 3-traverse from local peak
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
}

module.exports = MMR
