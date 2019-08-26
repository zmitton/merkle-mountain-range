const { Lock }      = require('semaphore-async-await')
const Position      = require('./position')
const MemoryBasedDb = require('./db/memoryBasedDb')

class MMR{
  constructor(hashingFunction, db = new MemoryBasedDb()){
    this.digest = hashingFunction
    this.db  = db
    this.lock = new Lock(1)
  }
  async get(leafIndex){
    let leafValue
    await this.lock.acquire()
    try{
      let leafLength = await this.getLeafLength()
      if(leafIndex >= leafLength){ throw new Error('Leaf not in tree') }
      let leafPosition = MMR.getNodePosition(leafIndex)
      let localPeakPosition = MMR.localPeakPosition(leafIndex, leafLength)
      let localPeakValue = await this._getNodeValue(localPeakPosition)
      leafValue = await this._verifyPath(localPeakPosition, localPeakValue, leafPosition)
    }finally{
      this.lock.release()
    }
    return leafValue
  }
  async append(value, leafIndex){
    await this.lock.acquire()
    try{
      let leafLength = await this.getLeafLength()
      if(leafIndex == undefined || leafIndex == leafLength){
        let nodePosition = MMR.getNodePosition(leafLength)
        let mountainPositions = MMR.mountainPositions(MMR.localPeakPosition(leafLength, leafLength), nodePosition.i)
        await this.db.set(nodePosition.i, value)
        await this._hashUp(mountainPositions)
        await this._setLeafLength(leafLength + 1)
      } else{
        throw new Error('Can only append to end of MMR (leaf '+leafLength+'). Index '+leafIndex+' given.')
      }
    }finally{
      this.lock.release()
    }
  }
  async appendMany(values, startLeafIndex){
    if(startLeafIndex == undefined){
      startLeafIndex = await this.getLeafLength()
    }
    for (let i = 0; i < values.length; i++) {
      await this.append(values[i], startLeafIndex + i)
    }
  }
  async getRoot(leafIndex){
    let peakValues = []
    await this.lock.acquire()
    try{
      if(leafIndex == undefined){
        leafIndex = await this.getLeafLength() - 1
      }
      let peakPositions = MMR.peakPositions(leafIndex)
      for (let i = 0; i < peakPositions.length; i++) {
        peakValues.push(await this._getNodeValue(peakPositions[i]))
      }
    }finally{
      this.lock.release()
    }
    // note: a single peak differs from its MMR root in that it gets hashed a second time
    return this.digest(...peakValues) 
  }
  async getNodeLength(){ return  MMR.getNodePosition(await this.getLeafLength()).i }
  async getLeafLength(){ // caching
    if(this._leafLength == undefined){ // dirty length
      this._leafLength = await this.db.getLeafLength()
    }
    return this._leafLength
  }
  async delete(leafIndex){ // logically deletes everything after (and including) leafIndex
    await this.lock.acquire()
    try{
      let leafLength = await this.getLeafLength()
      if(leafIndex < leafLength){
        await this._setLeafLength(leafIndex)
      }
    }finally{
      this.lock.release()
    }
  }
  async getProof(leafIndexes, referenceTreeLength){ // returns a sparse MMR containing the leaves specified
    let proofMmr
    await this.lock.acquire()
    try{
      referenceTreeLength = referenceTreeLength || await this.getLeafLength()

      let positions = MMR.proofPositions(leafIndexes, referenceTreeLength)
      let nodes = {}

      let nodeIndexes = Object.keys(positions)
      await Promise.all(nodeIndexes.map( async (i) => {
        let nodeValue = await this._getNodeValue(positions[i])
        nodes[i] = nodeValue
      }))
      proofMmr = new MMR(this.digest, new MemoryBasedDb(referenceTreeLength, nodes))

    }finally{
      this.lock.release()
      return proofMmr
    }
  }

  async _getNodeValue(position){
    // caller's responsibility to request a position within leafLength
    let nodeValue = await this.db.get(position.i)
    if(nodeValue){
      return nodeValue
    }else if(position.h > 0){ // implied node
      let leftChildValue = await this._getNodeValue(MMR.leftChildPosition(position))
      let rightChildValue = await this._getNodeValue(MMR.rightChildPosition(position))
      return this.digest(leftChildValue, rightChildValue)
    }else{
      throw new Error('Missing node in db')
    }
  }
  async _verifyPath(currentPosition, currentValue, leafPosition) { // verifies as it walks
    if (currentPosition.i == leafPosition.i) { // base case
      return currentValue
    } else {
      let leftChildPosition = MMR.leftChildPosition(currentPosition)
      let rightChildPosition = MMR.rightChildPosition(currentPosition)
      let leftValue = await this._getNodeValue(leftChildPosition)
      let rightValue = await this._getNodeValue(rightChildPosition)
      if (!currentValue.equals(this.digest(leftValue, rightValue))) {
        throw new Error('Hash mismatch of node #' + currentPosition.i + ' and its children')
      }
      if (leafPosition.i > currentPosition.i - 2 ** currentPosition.h - currentPosition.h + 1) { //umm yeah, check this line
        return this._verifyPath(rightChildPosition, rightValue, leafPosition)
      } else {
        return this._verifyPath(leftChildPosition, leftValue, leafPosition)
      }
    }
  }
  async _setLeafLength(leafLength){
    await this.db.setLeafLength(leafLength)
    this._leafLength = leafLength
  }
  async _hashUp(positionPairs){
    for (let i = positionPairs.length - 1; i >= 0 ; i--) {
      let leftValue = await this._getNodeValue(positionPairs[i][0])
      let rightValue = await this._getNodeValue(positionPairs[i][1])
      let writeIndex = MMR.parentIndex(positionPairs[i][0])
      await this.db.set(writeIndex, this.digest(leftValue, rightValue))
    }
  }


  static leftChildPosition(position){
    if(position.h <= 0){ throw new Error('Height 0 does not have child')}
    return new Position(position.i - 2**position.h, position.h - 1, false)
  }
  static rightChildPosition(position){
    if (position.h <= 0) { throw new Error('Height 0 does not have child') }
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
  static peakPositions(leafIndex){
    let currentPosition = this.godPeakFromLeafIndex(leafIndex)
    let peakPositions = []
    while(leafIndex >= 0){
      currentPosition = this.leftChildPosition(currentPosition)
      if(leafIndex >= 2**currentPosition.h - 1){
        peakPositions.push(currentPosition)
        currentPosition = this.siblingPosition(currentPosition)
        leafIndex -= 2**currentPosition.h // leafIndex becomes a kindof accumulator
      }
    }
    return peakPositions
  }
  static localPeakPosition(leafIndex, leafLength){
    let lastLeafIndex = leafLength <= leafIndex  ? leafIndex : leafLength - 1
    return MMR._localPeakPosition(leafIndex, MMR.peakPositions(lastLeafIndex))
  }
  static _localPeakPosition(leafIndex, peakPositions){
    for (let i = 0; i < peakPositions.length; i++) {
      let currentRange = 2**(peakPositions[i].h)
      if(leafIndex < currentRange){
        return peakPositions[i]
      }else{
        leafIndex -= currentRange
      }
    }
  }
  static mountainPositions(currentPosition, targetNodeIndex){ // positions to hash after appending
    let mountainPositions = []
    while (currentPosition.h > 0) {
      let children = [this.leftChildPosition(currentPosition), this.rightChildPosition(currentPosition)]
      mountainPositions.push(children)
      if(targetNodeIndex > currentPosition.i - 2**currentPosition.h - currentPosition.h + 1){
        currentPosition = children[1]
      }else{
        currentPosition = children[0]
      }
    }
    return mountainPositions
  }
  static godPeakFromLeafIndex(leafIndex){ // imaginary peak that is above all nodes
    let peakHeight = 0
    while(2**peakHeight <= leafIndex + 1){ peakHeight++ }
    return new Position(2**(peakHeight + 1) - 2, peakHeight, false)
  }
  static getNodePosition(leafIndex){
    let currentPosition = this.godPeakFromLeafIndex(leafIndex)
    let accumulator = 0
    while(currentPosition.h > 0){
      let serviceRange = 2**(currentPosition.h - 1)
      if(leafIndex >= accumulator + serviceRange){
        currentPosition = this.rightChildPosition(currentPosition)
        accumulator += serviceRange
      }else{
        currentPosition = this.leftChildPosition(currentPosition)
      }
    }
    return currentPosition
  }
  static proofPositions(leafIndexes, referenceTreeLength){
    let positions = {}
    let finalPeakPositions = MMR.peakPositions(referenceTreeLength - 1)
    // add peak positions
    for (let i = 0; i < finalPeakPositions.length; i++) { // log(n)/2
      positions[finalPeakPositions[i].i] = finalPeakPositions[i]
    }
    //add local mountain proof positions for each leaf
    for (let i = 0; i < leafIndexes.length; i++) { // k*2log(n)
      let nodePosition = MMR.getNodePosition(leafIndexes[i])
      let finalLocalPeak = MMR._localPeakPosition(leafIndexes[i], finalPeakPositions)
      // positions[finalLocalPeak.i] = finalLocalPeak // ?? should already have all peaks
      let mountainPositions = MMR.mountainPositions(finalLocalPeak, nodePosition.i)
      for (let j = 0; j < mountainPositions.length; j++) {
        positions[mountainPositions[j][0].i] = mountainPositions[j][0]
        positions[mountainPositions[j][1].i] = mountainPositions[j][1]
      }
    }
    // find implied positions (ones which can be calculated based on child positions that are present)
    let positionIndexes = Object.keys(positions)
    let impliedIndexes = []
    for (let j = 0; j < positionIndexes.length; j++) { // k*log(n)
      if(positions[positionIndexes[j]].h > 0){
        let hasLeftChild = MMR._hasPosition(positions, MMR.leftChildPosition(positions[positionIndexes[j]]))
        let hasRightChild = MMR._hasPosition(positions, MMR.rightChildPosition(positions[positionIndexes[j]]))
        if(hasLeftChild && hasRightChild){
          impliedIndexes.push(positionIndexes[j]) // don't remove them yet because recursion will be slower
        }
      }
    }
    // finally remove implied nodes
    for (var i = 0; i < impliedIndexes.length; i++) { // k*log(n)
      impliedIndexes[i]
      delete positions[impliedIndexes[i]]
    }
    return positions
  }
  static _hasPosition(nodes, position){
    let has = !!nodes[position.i]
    if (!has && position.h > 0){
      if(MMR._hasPosition(nodes, MMR.leftChildPosition(position))
        && MMR._hasPosition(nodes, MMR.rightChildPosition(position))
      ){
        has = true
      }
    }
    return has
  }
}

module.exports = MMR
